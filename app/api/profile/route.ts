import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { query, toCamelCase } from "@/lib/db";
import { ensureProfileImageColumns, getProfileTarget } from "@/lib/profile-utils";

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Internal server error";
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = Number(session.user.id);
    const target = getProfileTarget(session.user.userType);
    if (!target) {
      return NextResponse.json({ error: "Invalid user type" }, { status: 400 });
    }

    await ensureProfileImageColumns();

    const result =
      target.table === "users"
        ? await query(
            "SELECT id, email, profile_image FROM users WHERE id = $1",
            [userId],
          )
        : await query(
            `SELECT * FROM ${target.table} WHERE ${target.idColumn} = $1`,
            [userId],
          );
    
    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    return NextResponse.json(toCamelCase(result.rows[0]));
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const userId = Number(session.user.id);
    const userType = session.user.userType;

    await ensureProfileImageColumns();

    if (userType === "patient") {
      await query(
        "UPDATE patients SET name = $1, mobile_no = $2, address = $3, upi_id = $4, gender = $5, age = $6, profile_image = $7 WHERE user_id = $8",
        [body.name, body.mobileNo, body.address, body.upiId || null, body.gender, body.age, body.profileImage || null, userId]
      );
    } else if (userType === "doctor") {
      await query(
        "UPDATE doctors SET name = $1, contact = $2, address = $3, upi_id = $4, gender = $5, age = $6, profile_image = $7 WHERE user_id = $8",
        [body.name, body.contact, body.address, body.upiId || null, body.gender, body.age, body.profileImage || null, userId]
      );
    } else if (userType === "medicalist") {
      await query(
        "UPDATE medicalists SET name = $1, contact = $2, upi_id = $3, profile_image = $4 WHERE user_id = $5",
        [body.name, body.contact, body.upiId || null, body.profileImage || null, userId]
      );
    } else if (userType === "superadmin") {
      await query("UPDATE users SET profile_image = $1 WHERE id = $2", [
        body.profileImage || null,
        userId,
      ]);
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
