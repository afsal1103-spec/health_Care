import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

type Recipient = {
  upiId: string;
  accountName: string;
};

function buildQrCodeUrl(upiId: string, accountName: string, amount: number) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=upi://pay?pa=${upiId}&pn=${encodeURIComponent(
    accountName,
  )}&am=${amount}&cu=INR`;
}

async function resolveRecipient(
  type: string,
  doctorId?: number | null,
  medicalId?: number | null,
): Promise<Recipient> {
  if (type === "consultation" && doctorId) {
    const docResult = await query("SELECT upi_id, name FROM doctors WHERE id = $1", [doctorId]);
    if (docResult.rows[0]?.upi_id) {
      return {
        upiId: docResult.rows[0].upi_id,
        accountName: docResult.rows[0].name,
      };
    }
    throw new Error("Doctor has not set up their payment details yet.");
  }

  if (type === "medical" && medicalId) {
    const medResult = await query("SELECT upi_id, name FROM medicals WHERE id = $1", [medicalId]);
    if (medResult.rows[0]?.upi_id) {
      return {
        upiId: medResult.rows[0].upi_id,
        accountName: medResult.rows[0].name,
      };
    }
    throw new Error("Medical store has not set up their payment details yet.");
  }

  return {
    upiId: "healthcare-pay@okicici",
    accountName: "HealthCare+ Services",
  };
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.userType !== "patient") {
      return NextResponse.json(
        { error: "Unauthorized. Please login as a patient." },
        { status: 401 },
      );
    }

    const { searchParams } = new URL(request.url);
    const transactionId = searchParams.get("transactionId");
    const appointmentId = searchParams.get("appointmentId");

    if (!transactionId && !appointmentId) {
      return NextResponse.json(
        { error: "transactionId or appointmentId is required" },
        { status: 400 },
      );
    }

    const patientId = session.user.roleDetails?.id;
    if (!patientId) {
      return NextResponse.json({ error: "Patient profile not found" }, { status: 404 });
    }

    let txResult;
    if (transactionId) {
      txResult = await query(
        `SELECT id, transaction_code, type, amount, doctor_id, medical_id, appointment_id, payment_status
         FROM transactions
         WHERE id = $1 AND patient_id = $2
         ORDER BY created_at DESC
         LIMIT 1`,
        [transactionId, patientId],
      );
    } else {
      txResult = await query(
        `SELECT id, transaction_code, type, amount, doctor_id, medical_id, appointment_id, payment_status
         FROM transactions
         WHERE appointment_id = $1 AND patient_id = $2
         ORDER BY created_at DESC
         LIMIT 1`,
        [appointmentId, patientId],
      );
    }

    if (!txResult.rows.length) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    }

    const tx = txResult.rows[0];
    const recipient = await resolveRecipient(tx.type, tx.doctor_id, tx.medical_id);
    const qrCodeUrl = buildQrCodeUrl(recipient.upiId, recipient.accountName, Number(tx.amount));

    return NextResponse.json({
      manual: true,
      transactionId: tx.id,
      transactionCode: tx.transaction_code,
      amount: Number(tx.amount),
      paymentStatus: tx.payment_status,
      upiId: recipient.upiId,
      accountName: recipient.accountName,
      qrCodeUrl,
      appointmentId: tx.appointment_id,
      type: tx.type,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.userType !== "patient") {
      return NextResponse.json(
        { error: "Unauthorized. Please login as a patient." },
        { status: 401 },
      );
    }

    const body = await request.json();
    const { type, amount, patientId, doctorId, appointmentId, medicalId, description } = body;
    const resolvedPatientId = patientId || session.user.roleDetails?.id;

    if (!type || !amount || !resolvedPatientId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (session.user.roleDetails?.id !== parseInt(String(resolvedPatientId), 10)) {
      return NextResponse.json(
        { error: "Unauthorized. You can only create transactions for your own account." },
        { status: 403 },
      );
    }

    const patientCheck = await query("SELECT upi_id FROM patients WHERE id = $1", [resolvedPatientId]);
    if (!patientCheck.rows[0]?.upi_id) {
      return NextResponse.json(
        {
          error:
            "Your profile is incomplete. Please add your UPI ID in Profile Settings before making payments.",
          redirect: "/dashboard/profile",
        },
        { status: 403 },
      );
    }

    // Reuse existing unpaid transaction for same appointment to avoid duplicates.
    if (appointmentId) {
      const existingTx = await query(
        `SELECT id, transaction_code, amount, type, doctor_id, medical_id, payment_status
         FROM transactions
         WHERE appointment_id = $1
           AND patient_id = $2
           AND payment_status IN ('pending', 'verification_pending')
         ORDER BY created_at DESC
         LIMIT 1`,
        [appointmentId, resolvedPatientId],
      );

      if (existingTx.rows.length) {
        const existing = existingTx.rows[0];
        const recipient = await resolveRecipient(
          existing.type,
          existing.doctor_id,
          existing.medical_id,
        );
        return NextResponse.json({
          manual: true,
          transactionId: existing.id,
          transactionCode: existing.transaction_code,
          amount: Number(existing.amount),
          paymentStatus: existing.payment_status,
          upiId: recipient.upiId,
          accountName: recipient.accountName,
          qrCodeUrl: buildQrCodeUrl(
            recipient.upiId,
            recipient.accountName,
            Number(existing.amount),
          ),
        });
      }
    }

    const recipient = await resolveRecipient(type, doctorId || null, medicalId || null);

    const transactionCode = `TRX-${Date.now()}`;
    const transResult = await query(
      `INSERT INTO transactions 
      (transaction_code, patient_id, doctor_id, appointment_id, medical_id, type, amount, payment_status, transaction_date, description) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', CURRENT_DATE, $8) 
      RETURNING id`,
      [
        transactionCode,
        resolvedPatientId,
        doctorId || null,
        appointmentId || null,
        medicalId || null,
        type,
        amount,
        description || "",
      ],
    );
    const transactionId = transResult.rows[0].id;

    return NextResponse.json({
      manual: true,
      transactionId,
      transactionCode,
      amount,
      paymentStatus: "pending",
      upiId: recipient.upiId,
      accountName: recipient.accountName,
      qrCodeUrl: buildQrCodeUrl(recipient.upiId, recipient.accountName, Number(amount)),
    });
  } catch (error: any) {
    console.error("Checkout create error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.userType !== "patient") {
      return NextResponse.json(
        { error: "Unauthorized. Please login as a patient." },
        { status: 401 },
      );
    }

    const body = await request.json();
    const { transactionId, manualUtr, paymentProofUrl } = body;

    if (!transactionId || !manualUtr) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const transactionCheck = await query(
      "SELECT patient_id, payment_status FROM transactions WHERE id = $1",
      [transactionId],
    );
    if (transactionCheck.rowCount === 0) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    }

    const tx = transactionCheck.rows[0];
    if (tx.patient_id !== session.user.roleDetails?.id) {
      return NextResponse.json(
        { error: "Unauthorized. This transaction does not belong to you." },
        { status: 403 },
      );
    }

    if (tx.payment_status === "paid") {
      return NextResponse.json({ error: "Transaction is already paid" }, { status: 409 });
    }

    await query(
      "UPDATE transactions SET manual_utr = $1, payment_proof_url = $2, payment_status = 'verification_pending' WHERE id = $3",
      [manualUtr.trim(), paymentProofUrl || null, transactionId],
    );

    return NextResponse.json({
      success: true,
      message: "Payment submitted for verification",
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
