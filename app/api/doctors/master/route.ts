import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const search = (searchParams.get("search") || "").trim();
    const sortByParam = (searchParams.get("sortBy") || "name").toLowerCase();
    const orderParam = (searchParams.get("order") || "asc").toLowerCase();
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const pageSize = Math.max(
      1,
      Math.min(100, parseInt(searchParams.get("pageSize") || "10", 10)),
    );
    const offset = (page - 1) * pageSize;

    const sortCols: Record<string, string> = {
      name: "d.name",
      specialist: "d.specialist",
      consultationfee: "d.consultation_fee",
      rating: "d.rating",
      experienceyears: "d.experience_years",
    };
    const sortCol = sortCols[sortByParam] || "d.name";
    const order = orderParam === "desc" ? "DESC" : "ASC";

    const params: any[] = [];
    let where = "WHERE d.is_available = true AND u.is_active = true";

    if (search) {
      params.push(`%${search}%`);
      params.push(`%${search}%`);
      where += ` AND (d.name ILIKE $${params.length - 1} OR d.specialist ILIKE $${params.length})`;
    }

    params.push(pageSize);
    params.push(offset);

    const sql = `
      SELECT
        d.id,
        d.name,
        d.specialist,
        d.education,
        COALESCE(d.experience_years, 0)        AS "experienceYears",
        COALESCE(d.consultation_fee, 0)        AS "consultationFee",
        d.rating,
        d.available_days                       AS "availableDays",
        d.available_time_start                 AS "availableTimeStart",
        d.available_time_end                   AS "availableTimeEnd",
        COUNT(*) OVER()                        AS total_count
      FROM doctors d
      JOIN users u ON u.id = d.user_id
      ${where}
      ORDER BY ${sortCol} ${order}
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `;

    const res = await query(sql, params);
    const rows = res.rows || [];
    const total = rows.length > 0 ? parseInt(rows[0].total_count, 10) : 0;

    const items = rows.map((r: any) => {
      // available_days comes back as a real JS array from pg JSONB — no parsing needed
      const availableDays = Array.isArray(r.availableDays)
        ? r.availableDays
        : (() => {
            try {
              return JSON.parse(r.availableDays || "[]");
            } catch {
              return [];
            }
          })();

      return {
        id: r.id,
        name: r.name,
        specialist: r.specialist ?? null,
        education: r.education ?? null,
        experienceYears:
          r.experienceYears != null ? parseInt(r.experienceYears, 10) : 0,
        consultationFee:
          r.consultationFee != null ? parseFloat(r.consultationFee) : 0,
        rating: r.rating != null ? parseFloat(r.rating) : null,
        availableDays,
        availableTimeStart: r.availableTimeStart ?? null,
        availableTimeEnd: r.availableTimeEnd ?? null,
      };
    });

    return NextResponse.json({ items, total, page, pageSize });
  } catch (error) {
    console.error("Error fetching doctors master:", error);
    return NextResponse.json(
      { error: "Failed to fetch doctors" },
      { status: 500 },
    );
  }
}
