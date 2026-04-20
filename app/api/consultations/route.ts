import { NextRequest, NextResponse } from "next/server";
import { query, transaction, toCamelCase } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.userType !== "doctor") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      appointment_id,
      patient_id,
      diagnosis,
      symptoms_observed,
      blood_pressure,
      heart_rate,
      temperature,
      weight,
      diabetes_reading,
      notes,
      follow_up_required,
      follow_up_date,
      prescriptions,
    } = body;

    if (!patient_id || !diagnosis) {
      return NextResponse.json(
        { error: "patient_id and diagnosis are required" },
        { status: 400 },
      );
    }

    // Resolve doctor id from session
    const doctorResult = await query(
      "SELECT id, consultation_fee FROM doctors WHERE user_id = $1",
      [session.user.id],
    );

    if (doctorResult.rows.length === 0) {
      return NextResponse.json({ error: "Doctor not found" }, { status: 404 });
    }

    const doctor_id = doctorResult.rows[0].id;
    const consultationFee = parseFloat(
      doctorResult.rows[0].consultation_fee ?? 500,
    );

    const result = await transaction(async (client) => {
      // ── Insert consultation ───────────────────────────────────────────────
      const consultationResult = await client.query(
        `INSERT INTO consultations
           (appointment_id, patient_id, doctor_id, consultation_date,
            diagnosis, symptoms_observed,
            blood_pressure, heart_rate, temperature, weight, diabetes_reading,
            notes, follow_up_required, follow_up_date)
         VALUES ($1,$2,$3,CURRENT_DATE,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
         RETURNING *`,
        [
          appointment_id || null,
          patient_id,
          doctor_id,
          diagnosis,
          symptoms_observed || null,
          blood_pressure || null,
          heart_rate ? parseInt(heart_rate, 10) : null,
          temperature ? parseFloat(temperature) : null,
          weight ? parseFloat(weight) : null,
          diabetes_reading ? parseFloat(diabetes_reading) : null,
          notes || null,
          follow_up_required ?? false,
          follow_up_date || null,
        ],
      );

      const consultation = consultationResult.rows[0];
      const consultationId = consultation.id;

      // ── Insert prescriptions ──────────────────────────────────────────────
      const validPrescriptions = (prescriptions || []).filter(
        (p: any) => p && p.medication_name && p.medication_name.trim(),
      );

      for (let i = 0; i < validPrescriptions.length; i++) {
        const rx = validPrescriptions[i];
        const prescriptionCode = `RX-${String(consultationId).padStart(6, "0")}-${String(i + 1).padStart(3, "0")}`;
        await client.query(
          `INSERT INTO prescriptions
             (consultation_id, prescription_code, medication_name, dosage, duration, instructions, is_active)
           VALUES ($1,$2,$3,$4,$5,$6,true)`,
          [
            consultationId,
            prescriptionCode,
            rx.medication_name.trim(),
            rx.dosage || null,
            rx.duration || null,
            rx.instructions || null,
          ],
        );
      }

      // ── Mark appointment as completed ─────────────────────────────────────
      if (appointment_id) {
        await client.query(
          "UPDATE appointments SET status = 'completed', updated_at = NOW() WHERE id = $1",
          [appointment_id],
        );
      }

      // ── Create transaction / billing record ───────────────────────────────
      const transactionCode = `TXN-${String(consultationId).padStart(6, "0")}`;
      await client.query(
        `INSERT INTO transactions
           (transaction_code, patient_id, doctor_id, appointment_id, consultation_id,
            type, amount, payment_status, transaction_date, description)
         VALUES ($1,$2,$3,$4,$5,'consultation',$6,'pending',CURRENT_DATE,$7)`,
        [
          transactionCode,
          patient_id,
          doctor_id,
          appointment_id || null,
          consultationId,
          consultationFee,
          `Consultation: ${diagnosis.substring(0, 80)}`,
        ],
      );

      return consultation;
    });

    return NextResponse.json({
      success: true,
      consultation_id: result.id,
      message: "Consultation recorded successfully",
    });
  } catch (error) {
    console.error("Error creating consultation:", error);
    return NextResponse.json(
      { error: "Failed to create consultation" },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get("patientId");
    const period = searchParams.get("period");

    let sql = `
      SELECT
        c.id,
        c.appointment_id,
        c.patient_id,
        c.doctor_id,
        c.consultation_date,
        c.diagnosis,
        c.symptoms_observed,
        c.blood_pressure,
        c.heart_rate,
        c.temperature,
        c.weight,
        c.diabetes_reading,
        c.notes,
        c.follow_up_required,
        c.follow_up_date,
        c.created_at,
        p.name        AS patient_name,
        d.name        AS doctor_name,
        d.specialist  AS doctor_specialist
      FROM consultations c
      JOIN patients p ON c.patient_id = p.id
      JOIN doctors  d ON c.doctor_id  = d.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (patientId) {
      params.push(parseInt(patientId, 10));
      sql += ` AND c.patient_id = $${params.length}`;
    }

    if (period) {
      const now = new Date();
      const start = new Date(now);
      switch (period) {
        case "week":
          start.setDate(now.getDate() - 7);
          break;
        case "month":
          start.setMonth(now.getMonth() - 1);
          break;
        case "year":
          start.setFullYear(now.getFullYear() - 1);
          break;
      }
      params.push(start.toISOString().split("T")[0]);
      sql += ` AND c.consultation_date >= $${params.length}`;
    }

    // Scope by user type
    if (session.user.userType === "patient") {
      const patientRes = await query(
        "SELECT id FROM patients WHERE user_id = $1",
        [session.user.id],
      );
      if (patientRes.rows.length > 0) {
        params.push(patientRes.rows[0].id);
        sql += ` AND c.patient_id = $${params.length}`;
      }
    } else if (session.user.userType === "doctor") {
      const doctorRes = await query(
        "SELECT id FROM doctors WHERE user_id = $1",
        [session.user.id],
      );
      if (doctorRes.rows.length > 0) {
        params.push(doctorRes.rows[0].id);
        sql += ` AND c.doctor_id = $${params.length}`;
      }
    }

    sql += " ORDER BY c.consultation_date DESC, c.created_at DESC";

    const result = await query(sql, params);
    const consultations = toCamelCase(result.rows) as Array<Record<string, any>>;

    // Attach prescriptions to each consultation
    for (const consultation of consultations) {
      const rxResult = await query(
        "SELECT * FROM prescriptions WHERE consultation_id = $1 AND is_active = true ORDER BY id",
        [consultation.id],
      );
      consultation.prescriptions = toCamelCase(rxResult.rows);
    }

    return NextResponse.json(consultations);
  } catch (error) {
    console.error("Error fetching consultations:", error);
    return NextResponse.json(
      { error: "Failed to fetch consultations" },
      { status: 500 },
    );
  }
}
