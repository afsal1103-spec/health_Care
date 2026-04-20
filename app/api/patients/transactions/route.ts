import { NextRequest, NextResponse } from "next/server";
import { query, toCamelCase } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.userType !== "patient") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const patientId = session.user.roleDetails?.id;
    if (!patientId) {
      return NextResponse.json({ error: "Patient profile not found" }, { status: 404 });
    }

    const result = await query(`
      SELECT t.*, 
             d.name as doctor_name,
             m.name as medical_name,
             a.appointment_date,
             a.appointment_time
      FROM transactions t 
      LEFT JOIN doctors d ON t.doctor_id = d.id 
      LEFT JOIN medicals m ON t.medical_id = m.id
      LEFT JOIN appointments a ON t.appointment_id = a.id
      WHERE t.patient_id = $1 
      ORDER BY t.created_at DESC
    `, [patientId]);

    return NextResponse.json(toCamelCase(result.rows));
  } catch (error: any) {
    console.error("Fetch patient transactions error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
