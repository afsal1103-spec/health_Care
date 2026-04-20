import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query, toCamelCase } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.userType !== "patient") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const patientRes = await query("SELECT id FROM patients WHERE user_id = $1", [session.user.id]);
    if (patientRes.rows.length === 0) {
      return NextResponse.json({ error: "Patient profile not found" }, { status: 404 });
    }
    const patientId = patientRes.rows[0].id;

    // Get the latest consultation
    const consultationRes = await query(
      `SELECT c.*, d.name as doctor_name 
       FROM consultations c
       JOIN doctors d ON c.doctor_id = d.id
       WHERE c.patient_id = $1
       ORDER BY c.consultation_date DESC, c.id DESC
       LIMIT 1`,
      [patientId]
    );

    if (consultationRes.rows.length === 0) {
      return NextResponse.json(null);
    }

    const consultation = consultationRes.rows[0];
    const consultationData = toCamelCase(consultation) as Record<string, unknown>;

    // Get prescriptions for this consultation
    const prescriptionRes = await query(
      `SELECT medication_name, dosage, duration, instructions 
       FROM prescriptions 
       WHERE consultation_id = $1`,
      [consultation.id]
    );

    return NextResponse.json({
      ...consultationData,
      patientId,
      prescriptions: toCamelCase(prescriptionRes.rows)
    });
  } catch (error) {
    console.error("Latest consultation error:", error);
    return NextResponse.json({ error: "Failed to fetch consultation" }, { status: 500 });
  }
}
