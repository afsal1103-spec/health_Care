import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query, toCamelCase } from "@/lib/db";
import { ensureMedicalistSchema, resolveMedicalistContext } from "@/lib/medicalist";

function buildQrCodeUrl(upiId: string, accountName: string, amount: number) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=upi://pay?pa=${upiId}&pn=${encodeURIComponent(
    accountName,
  )}&am=${amount}&cu=INR`;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unexpected error";
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.userType !== "medicalist") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await ensureMedicalistSchema();
    const context = await resolveMedicalistContext(session.user.id as string);

    const result = await query(
      `SELECT t.id, t.transaction_code, t.amount, t.payment_status, t.created_at, t.manual_utr,
              p.id AS patient_id, p.name AS patient_name
       FROM transactions t
       JOIN patients p ON t.patient_id = p.id
       WHERE t.medical_id = $1
         AND t.type = 'medical'
       ORDER BY t.created_at DESC
       LIMIT 40`,
      [context.medicalId],
    );

    const rows = toCamelCase(result.rows) as Array<Record<string, unknown>>;
    const decoratedRows = rows.map((row) => {
      const status = String(row.paymentStatus || "");
      const amount = Number(row.amount || 0);
      return {
        ...row,
        qrCodeUrl:
          context.upiId && (status === "pending" || status === "rejected")
            ? buildQrCodeUrl(context.upiId, context.medicalName, amount)
            : null,
      };
    });

    const summary = {
      pending: decoratedRows.filter((row: any) => row.paymentStatus === "pending").length,
      verificationPending: decoratedRows.filter((row: any) => row.paymentStatus === "verification_pending")
        .length,
      paid: decoratedRows.filter((row: any) => row.paymentStatus === "paid").length,
    };

    return NextResponse.json({
      medical: {
        id: context.medicalId,
        name: context.medicalName,
        upiId: context.upiId,
      },
      summary,
      payments: decoratedRows,
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

