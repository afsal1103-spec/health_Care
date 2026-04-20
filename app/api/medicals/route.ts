import { NextRequest, NextResponse } from "next/server";
import { query, toCamelCase } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get("search") || "";
    
    let sql = "SELECT * FROM medicals";
    const params: any[] = [];

    if (search) {
      sql += " WHERE name ILIKE $1 OR address ILIKE $1";
      params.push(`%${search}%`);
    }

    sql += " ORDER BY name ASC";
    const result = await query(sql, params);
    return NextResponse.json(toCamelCase(result.rows));
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch medicals" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, contact, address, latitude, longitude } = body;

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const result = await query(
      "INSERT INTO medicals (name, contact, address, latitude, longitude, is_approved) VALUES ($1, $2, $3, $4, $5, FALSE) RETURNING *",
      [name, contact, address, latitude, longitude]
    );

    return NextResponse.json(toCamelCase(result.rows[0]));
  } catch (error) {
    return NextResponse.json({ error: "Failed to create medical" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, is_approved } = body;

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    const result = await query(
      "UPDATE medicals SET is_approved = $1 WHERE id = $2 RETURNING *",
      [is_approved, id]
    );

    if (result.rowCount === 0) {
      return NextResponse.json({ error: "Medical not found" }, { status: 404 });
    }

    return NextResponse.json(toCamelCase(result.rows[0]));
  } catch (error) {
    return NextResponse.json({ error: "Failed to update medical" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });
    
    await query("DELETE FROM medicals WHERE id = $1", [id]);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete medical" }, { status: 500 });
  }
}
