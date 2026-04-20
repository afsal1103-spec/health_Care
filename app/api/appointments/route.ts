import { NextRequest, NextResponse } from "next/server";
import { query, transaction, toCamelCase } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get("patientId");
    const doctorId = searchParams.get("doctorId");
    const date = searchParams.get("date");
    const appointmentCode = searchParams.get("appointmentCode");
    const id = searchParams.get("id");

    let sql = `
      SELECT
        a.*,
        p.name as patient_name,
        d.name as doctor_name,
        d.specialist as doctor_specialist,
        tx.payment_status,
        tx.id as transaction_id
      FROM appointments a
      JOIN patients p ON a.patient_id = p.id
      JOIN doctors d ON a.doctor_id = d.id
      LEFT JOIN LATERAL (
        SELECT t.id, t.payment_status
        FROM transactions t
        WHERE t.appointment_id = a.id
        ORDER BY t.created_at DESC
        LIMIT 1
      ) tx ON true
      WHERE 1=1
    `;
    const params: (string | number)[] = [];

    if (patientId) {
      sql += ` AND a.patient_id = $${params.length + 1}`;
      params.push(parseInt(patientId));
    }

    if (doctorId) {
      sql += ` AND a.doctor_id = $${params.length + 1}`;
      params.push(parseInt(doctorId));
    }

    if (date) {
      sql += ` AND a.appointment_date = $${params.length + 1}`;
      params.push(date);
    }

    if (appointmentCode) {
      sql += ` AND UPPER(a.appointment_code) = UPPER($${params.length + 1})`;
      params.push(appointmentCode.trim());
    }

    if (id) {
      sql += ` AND a.id = $${params.length + 1}`;
      params.push(parseInt(id, 10));
    }

    // Scope results by user type
    if (session.user.userType === "patient") {
      const patientResult = await query(
        "SELECT id FROM patients WHERE user_id = $1",
        [session.user.id],
      );
      if (patientResult.rows.length > 0) {
        sql += ` AND a.patient_id = $${params.length + 1}`;
        params.push(patientResult.rows[0].id);
      }
    } else if (session.user.userType === "doctor") {
      const doctorResult = await query(
        "SELECT id FROM doctors WHERE user_id = $1",
        [session.user.id],
      );
      if (doctorResult.rows.length > 0) {
        sql += ` AND a.doctor_id = $${params.length + 1}`;
        params.push(doctorResult.rows[0].id);
      }
    }

    sql += " ORDER BY a.appointment_date DESC, a.appointment_time DESC";

    const result = await query(sql, params);
    return NextResponse.json(toCamelCase(result.rows));
  } catch (error) {
    console.error("Error fetching appointments:", error);
    return NextResponse.json(
      { error: "Failed to fetch appointments" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    let { patient_id } = body;
    const {
      doctor_id,
      appointment_date,
      appointment_time,
      symptoms,
      disease_category,
      priority = "medium",
      notes,
      isVideoConsultation = false,
    } = body;

    // ── Auto-resolve patient_id from session for patient users ──────────────
    if (session.user.userType === "patient") {
      const patientResult = await query(
        "SELECT id FROM patients WHERE user_id = $1",
        [session.user.id],
      );
      if (patientResult.rows.length === 0) {
        return NextResponse.json(
          { error: "Patient profile not found for this account" },
          { status: 404 },
        );
      }
      patient_id = patientResult.rows[0].id;
    }

    // ── Validate required fields ─────────────────────────────────────────────
    if (!patient_id || !doctor_id || !appointment_date || !appointment_time) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: patient_id, doctor_id, appointment_date, appointment_time",
        },
        { status: 400 },
      );
    }

    // ── Check for slot conflict ──────────────────────────────────────────────
    const existing = await query(
      `SELECT id FROM appointments
       WHERE doctor_id = $1
         AND appointment_date = $2
         AND appointment_time = $3
         AND status NOT IN ('cancelled', 'rejected')`,
      [doctor_id, appointment_date, appointment_time],
    );

    if (existing.rows.length > 0) {
      return NextResponse.json(
        {
          error:
            "This time slot is already booked. Please choose another time.",
        },
        { status: 409 },
      );
    }

    // ── Determine who is booking ─────────────────────────────────────────────
    let booked_by = "system";
    let booked_by_user_id: number | null = null;

    if (session.user.userType === "patient") {
      booked_by = "patient";
      booked_by_user_id = parseInt(session.user.id as string, 10);
    }

    const result = await transaction(async (client) => {
      // ── Insert appointment ───────────────────────────────────────────────────
      const insertResult = await client.query(
        `INSERT INTO appointments
           (patient_id, doctor_id, booked_by, booked_by_user_id,
            appointment_date, appointment_time, symptoms, disease_category,
            priority, notes, status, is_video_consultation)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pending', $11)
         RETURNING id`,
        [
          patient_id,
          doctor_id,
          booked_by,
          booked_by_user_id,
          appointment_date,
          appointment_time,
          symptoms || null,
          disease_category || null,
          priority,
          notes || null,
          isVideoConsultation,
        ],
      );

      const appointmentId = insertResult.rows[0].id;
      const appointmentCode = `APT-${String(appointmentId).padStart(6, "0")}`;

      // Write the generated code back into the row
      await client.query(`UPDATE appointments SET appointment_code = $1 WHERE id = $2`, [
        appointmentCode,
        appointmentId,
      ]);

      return { appointmentId, appointmentCode };
    });

    // ── Mock Mobile Notification ─────────────────────────────────────────────
    const doctorRes = await query("SELECT contact, name FROM doctors WHERE id = $1", [doctor_id]);
    const patientRes = await query("SELECT name FROM patients WHERE id = $1", [patient_id]);
    
    if (doctorRes.rows.length > 0 && patientRes.rows.length > 0) {
      const doctor = doctorRes.rows[0];
      const patient = patientRes.rows[0];
      console.log(`[SMS NOTIFICATION] To: ${doctor.contact} (Dr. ${doctor.name})`);
      console.log(`Message: Patient ${patient.name} wants a consultation on ${appointment_date} at ${appointment_time}. 
Options: Accept, Reject, Alter.`);
    }

    return NextResponse.json({
      success: true,
      appointment_id: result.appointmentId,
      appointment_code: result.appointmentCode,
      patient_id: patient_id, // Added this
      message: "Appointment booked successfully. Waiting for doctor approval.",
    });
  } catch (error) {
    console.error("Error creating appointment:", error);
    return NextResponse.json(
      { error: "Failed to create appointment. Please try again." },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!["doctor", "superadmin"].includes(session.user.userType as string)) {
      return NextResponse.json(
        { error: "Only doctors/admins can update appointment status." },
        { status: 403 },
      );
    }

    const body = await request.json();
    const { id, status, newDate, newTime, notes } = body;

    if (!id || !status) {
      return NextResponse.json(
        { error: "Missing appointment id or status" },
        { status: 400 },
      );
    }

    const appointmentId = parseInt(id.toString(), 10);

    if (status === "accepted" || status === "altered") {
      const paymentCheck = await query(
        `SELECT payment_status
         FROM transactions
         WHERE appointment_id = $1
         ORDER BY created_at DESC
         LIMIT 1`,
        [appointmentId],
      );

      if (!paymentCheck.rows.length) {
        return NextResponse.json(
          { error: "Cannot process appointment before payment is initiated." },
          { status: 409 },
        );
      }

      const paymentStatus = paymentCheck.rows[0].payment_status;
      if (!["verification_pending", "paid"].includes(paymentStatus)) {
        return NextResponse.json(
          { error: "Payment must be submitted first (UTR verification pending)." },
          { status: 409 },
        );
      }
    }

    let sql = `UPDATE appointments SET status = $1, updated_at = NOW()`;
    const params: any[] = [status];

    if (status === 'altered' && newDate && newTime) {
      sql += `, appointment_date = $2, appointment_time = $3`;
      params.push(newDate, newTime);
    }

    if (notes) {
      params.push(notes);
      sql += `, notes = $${params.length}`;
    }

    // If accepted and it's video consultation, generate a mock meeting link
    if (status === 'accepted') {
      const check = await query("SELECT is_video_consultation FROM appointments WHERE id = $1", [appointmentId]);
      if (check.rows.length > 0 && check.rows[0].is_video_consultation) {
        const meetingLink = `https://telemedicine.video/meet/${Math.random().toString(36).substring(7)}`;
        sql += `, meeting_link = $${params.length + 1}`;
        params.push(meetingLink);
      }
    }

    params.push(appointmentId);
    sql += ` WHERE id = $${params.length}`;

    console.log("Executing PATCH query:", sql, params);
    await query(sql, params);

    return NextResponse.json({ success: true, message: `Appointment ${status} successfully` });
  } catch (error: any) {
    console.error("Error patching appointment:", error);
    return NextResponse.json(
      { error: "Failed to update appointment status", details: error.message },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { id, status, notes } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Missing appointment id" },
        { status: 400 },
      );
    }

    await query(
      `UPDATE appointments
       SET status = COALESCE($1, status),
           notes  = COALESCE($2, notes),
           updated_at = NOW()
       WHERE id = $3`,
      [status || null, notes || null, id],
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating appointment:", error);
    return NextResponse.json(
      { error: "Failed to update appointment" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Missing appointment id" },
        { status: 400 },
      );
    }

    await query(
      `UPDATE appointments SET status = 'cancelled', updated_at = NOW() WHERE id = $1`,
      [id],
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error cancelling appointment:", error);
    return NextResponse.json(
      { error: "Failed to cancel appointment" },
      { status: 500 },
    );
  }
}
