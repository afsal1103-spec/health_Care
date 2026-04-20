import { NextRequest, NextResponse } from "next/server";
import { query, toCamelCase } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get("search") || "";
    
    let sql = `
      SELECT m.*, u.email, med.name as medical_name 
      FROM medicalists m 
      JOIN users u ON m.user_id = u.id 
      LEFT JOIN medicals med ON m.medical_id = med.id
    `;
    const params: any[] = [];

    if (search) {
      sql += " WHERE m.name ILIKE $1 OR u.email ILIKE $1";
      params.push(`%${search}%`);
    }

    sql += " ORDER BY m.created_at DESC";
    const result = await query(sql, params);
    return NextResponse.json(toCamelCase(result.rows));
  } catch (error) {
    console.error("Failed to fetch medicalists:", error);
    return NextResponse.json({ error: "Failed to fetch medicalists" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, approval_status } = body;

    if (!id || !approval_status) {
      return NextResponse.json({ error: "ID and status are required" }, { status: 400 });
    }

    const result = await query(
      "UPDATE medicalists SET approval_status = $1 WHERE id = $2 RETURNING *",
      [approval_status, id]
    );

    if (result.rowCount === 0) {
      return NextResponse.json({ error: "Medicalist not found" }, { status: 404 });
    }

    return NextResponse.json(toCamelCase(result.rows[0]));
  } catch (error) {
    console.error("Failed to update medicalist:", error);
    return NextResponse.json({ error: "Failed to update medicalist" }, { status: 500 });
  }
}
