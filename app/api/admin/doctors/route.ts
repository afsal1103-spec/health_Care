import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { query, transaction } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const search = (searchParams.get("search") || "").trim();
  const sortByParam = (searchParams.get("sortBy") || "id").toLowerCase();
  const orderParam = (searchParams.get("order") || "desc").toLowerCase();
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const pageSize = Math.max(
    1,
    Math.min(100, parseInt(searchParams.get("pageSize") || "10", 10)),
  );
  const offset = (page - 1) * pageSize;

  const sortCols: Record<string, string> = {
    id: " d.id ",
    name: " d.name ",
    specialist: " d.specialist ",
    education: " d.education ",
    email: " u.email ",
    status: " d.approval_status ",
  };
  const sortCol = sortCols[sortByParam] || " d.id ";
  const order = orderParam === "asc" ? "ASC" : "DESC";

  const statusFilter = searchParams.get("status") || "";

  const params: (string | number)[] = [];
  let where = " WHERE u.is_active = true ";

  if (statusFilter) {
    params.push(statusFilter);
    where += ` AND d.approval_status = $${params.length} `;
  }

  if (search) {
    params.push(`%${search}%`);
    params.push(`%${search}%`);
    params.push(`%${search}%`);
    params.push(`%${search}%`);
    where += ` AND (d.name ILIKE $${params.length - 3} OR d.specialist ILIKE $${params.length - 2} OR d.education ILIKE $${params.length - 1} OR u.email ILIKE $${params.length}) `;
  }
  params.push(pageSize);
  params.push(offset);

  const sql = `
    SELECT d.id, d.name, d.specialist, d.education, d.doctor_registration_number, d.approval_status, u.email, COUNT(*) OVER() AS total_count
    FROM doctors d
    JOIN users u ON u.id = d.user_id
    ${where}
    ORDER BY ${sortCol} ${order}
    LIMIT $${params.length - 1} OFFSET $${params.length}
  `;
  const res = await query(sql, params);
  const rows = res.rows || [];
  const total = rows[0]?.total_count ? parseInt(rows[0].total_count, 10) : 0;
  return NextResponse.json({
    items: rows.map((r) => ({
      id: r.id,
      name: r.name,
      specialist: r.specialist,
      education: r.education,
      email: r.email,
      doctorRegistrationNumber: r.doctor_registration_number,
      approvalStatus: r.approval_status,
    })),
    total,
    page,
    pageSize,
  });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { id, status } = body;
  if (!id || !status) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }
  try {
    await query("UPDATE doctors SET approval_status = $1 WHERE id = $2", [
      status,
      id,
    ]);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating doctor status:", error);
    return NextResponse.json(
      { error: "Failed to update doctor status" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    name,
    email,
    mobileNo,
    specialist,
    education,
    doctorRegistrationNumber,
    address,
    password = "changeme123",
  } = body;
  if (!name || !email || !specialist || !education) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }
  const hashed = await bcrypt.hash(password, 10);
  try {
    await transaction(async (client) => {
      const userRes = await client.query(
        "INSERT INTO users (email, password, user_type, is_active) VALUES ($1,$2,$3,true) RETURNING id",
        [email, hashed, "doctor"],
      );
      const userId = userRes.rows[0].id;
      await client.query(
        "INSERT INTO doctors (user_id, name, specialist, contact, education, doctor_registration_number, address, consultation_fee, available_days, available_time_start, available_time_end, is_available, approval_status) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,true,'approved')",
        [
          userId,
          name,
          specialist,
          mobileNo || "",
          education,
          doctorRegistrationNumber || "",
          address || "",
          500,
          '["Monday","Tuesday","Wednesday","Thursday","Friday"]',
          "09:00:00",
          "17:00:00",
        ],
      );
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error creating doctor:", error);
    return NextResponse.json(
      { error: "Failed to create doctor" },
      { status: 500 },
    );
  }
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const { id, name, specialist, education, email, doctorRegistrationNumber, address } = body;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  try {
    await transaction(async (client) => {
      if (email) {
        await client.query(
          "UPDATE users SET email = $1 WHERE id = (SELECT user_id FROM doctors WHERE id = $2)",
          [email, id],
        );
      }
      await client.query(
        "UPDATE doctors SET name = $1, specialist = $2, education = $3, doctor_registration_number = $4, address = $5 WHERE id = $6",
        [name, specialist, education, doctorRegistrationNumber, address, id],
      );
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating doctor:", error);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  try {
    await query(
      "UPDATE users SET is_active = false WHERE id = (SELECT user_id FROM doctors WHERE id = $1)",
      [id],
    );
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
