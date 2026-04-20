import { NextRequest, NextResponse } from "next/server";
import { query, toCamelCase } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

async function ensureAdmin() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.userType !== "superadmin") {
    return null;
  }
  return session;
}

export async function GET(request: NextRequest) {
  try {
    const session = await ensureAdmin();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await query(
      `SELECT t.*, p.name as patient_name 
       FROM transactions t 
       JOIN patients p ON t.patient_id = p.id 
       WHERE t.payment_status IN ('verification_pending', 'paid', 'rejected')
       ORDER BY t.created_at DESC`,
    );
    return NextResponse.json(toCamelCase(result.rows));
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await ensureAdmin();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { id, status } = body;

    if (!id || !status) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (!["paid", "rejected"].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const txResult = await query(
      "SELECT appointment_id, payment_status FROM transactions WHERE id = $1",
      [id],
    );

    if (!txResult.rows.length) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    }

    const currentStatus = txResult.rows[0].payment_status;
    if (currentStatus !== "verification_pending") {
      return NextResponse.json(
        { error: "Only verification_pending transactions can be reviewed." },
        { status: 409 },
      );
    }

    await query("UPDATE transactions SET payment_status = $1 WHERE id = $2", [status, id]);

    const appointmentId = txResult.rows[0].appointment_id;
    if (appointmentId) {
      if (status === "paid") {
        await query(
          "UPDATE appointments SET status = 'confirmed', updated_at = NOW() WHERE id = $1 AND status IN ('pending', 'accepted', 'altered')",
          [appointmentId],
        );
      } else {
        await query(
          "UPDATE appointments SET status = 'pending', notes = COALESCE(notes, '') || ' | Payment rejected by admin', updated_at = NOW() WHERE id = $1",
          [appointmentId],
        );
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
