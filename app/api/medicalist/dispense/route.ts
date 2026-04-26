import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query, transaction, toCamelCase } from "@/lib/db";
import {
  ensureMedicalistSchema,
  normalizeMedicineName,
  resolveMedicalistContext,
} from "@/lib/medicalist";

type DispenseItemInput = {
  medicineName: string;
  quantity: number;
};

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unexpected error";
}

function buildQrCodeUrl(upiId: string, accountName: string, amount: number) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=upi://pay?pa=${upiId}&pn=${encodeURIComponent(
    accountName,
  )}&am=${amount}&cu=INR`;
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.userType !== "medicalist") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await ensureMedicalistSchema();
    const context = await resolveMedicalistContext(session.user.id as string);
    if (!context.upiId) {
      return NextResponse.json(
        {
          error: "Medicalist UPI ID is not configured. Update profile payment details first.",
        },
        { status: 409 },
      );
    }

    const body = await request.json();
    const patientId = Number(body?.patientId || 0);
    const consultationId = Number(body?.consultationId || 0);
    const items = Array.isArray(body?.items) ? (body.items as DispenseItemInput[]) : [];

    if (!Number.isFinite(patientId) || patientId <= 0) {
      return NextResponse.json({ error: "Valid patientId is required" }, { status: 400 });
    }
    if (!Number.isFinite(consultationId) || consultationId <= 0) {
      return NextResponse.json({ error: "Valid consultationId is required" }, { status: 400 });
    }
    if (!items.length) {
      return NextResponse.json({ error: "At least one medicine item is required" }, { status: 400 });
    }

    const normalizedItems = items
      .map((item) => ({
        medicineName: String(item.medicineName || "").trim(),
        quantity: Number(item.quantity || 0),
      }))
      .filter((item) => item.medicineName && Number.isFinite(item.quantity) && item.quantity > 0);

    if (!normalizedItems.length) {
      return NextResponse.json({ error: "No valid medicine quantities selected" }, { status: 400 });
    }

    const patientResult = await query("SELECT id, name FROM patients WHERE id = $1 LIMIT 1", [patientId]);
    if (!patientResult.rows.length) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }
    const patientName = String(patientResult.rows[0].name || "Patient");

    const consultationResult = await query(
      `SELECT id FROM consultations WHERE id = $1 AND patient_id = $2 LIMIT 1`,
      [consultationId, patientId],
    );
    if (!consultationResult.rows.length) {
      return NextResponse.json({ error: "Consultation not found for this patient" }, { status: 404 });
    }

    const prescriptionResult = await query(
      `SELECT medication_name
       FROM prescriptions
       WHERE consultation_id = $1 AND is_active = true`,
      [consultationId],
    );
    const allowedNames = new Set(
      prescriptionResult.rows.map((row) => normalizeMedicineName(String(row.medication_name || ""))),
    );

    for (const item of normalizedItems) {
      if (!allowedNames.has(normalizeMedicineName(item.medicineName))) {
        return NextResponse.json(
          { error: `${item.medicineName} is not part of the selected consultation prescription` },
          { status: 409 },
        );
      }
    }

    const itemNames = normalizedItems.map((item) => item.medicineName);
    const dispenseResult = await transaction(async (client) => {
      const inventoryRows = await client.query(
        `SELECT id, medicine_name, quantity, unit_price
         FROM medical_inventory
         WHERE medical_id = $1
           AND LOWER(medicine_name) = ANY(
             SELECT LOWER(x) FROM unnest($2::text[]) AS x
           )
         FOR UPDATE`,
        [context.medicalId, itemNames],
      );

      const inventoryMap = new Map<
        string,
        { id: number; quantity: number; unitPrice: number; medicineName: string }
      >();
      for (const row of inventoryRows.rows) {
        inventoryMap.set(normalizeMedicineName(String(row.medicine_name)), {
          id: Number(row.id),
          quantity: Number(row.quantity || 0),
          unitPrice: Number(row.unit_price || 0),
          medicineName: String(row.medicine_name),
        });
      }

      const billItems: Array<{
        medicineName: string;
        quantity: number;
        unitPrice: number;
        lineTotal: number;
        inventoryId: number;
      }> = [];

      for (const reqItem of normalizedItems) {
        const key = normalizeMedicineName(reqItem.medicineName);
        const stock = inventoryMap.get(key);
        if (!stock) {
          throw new Error(`${reqItem.medicineName} is not available in stock`);
        }
        if (stock.quantity < reqItem.quantity) {
          throw new Error(
            `${reqItem.medicineName} has only ${stock.quantity} in stock. Requested ${reqItem.quantity}.`,
          );
        }
        if (!Number.isFinite(stock.unitPrice) || stock.unitPrice <= 0) {
          throw new Error(`${reqItem.medicineName} does not have a valid unit price`);
        }

        const lineTotal = Number((reqItem.quantity * stock.unitPrice).toFixed(2));
        billItems.push({
          medicineName: stock.medicineName,
          quantity: reqItem.quantity,
          unitPrice: stock.unitPrice,
          lineTotal,
          inventoryId: stock.id,
        });
      }

      const amount = Number(
        billItems.reduce((sum, item) => sum + item.lineTotal, 0).toFixed(2),
      );
      if (amount <= 0) {
        throw new Error("Total amount must be greater than zero");
      }

      const code = `TRX-MED-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const transactionInsert = await client.query(
        `INSERT INTO transactions
         (transaction_code, patient_id, medical_id, consultation_id, type, amount, payment_status, payment_method, transaction_date, description)
         VALUES ($1, $2, $3, $4, 'medical', $5, 'pending', 'upi', CURRENT_DATE, $6)
         RETURNING id, transaction_code, amount, payment_status, created_at`,
        [
          code,
          patientId,
          context.medicalId,
          consultationId,
          amount,
          `Pharmacy medicines from ${context.medicalName}`,
        ],
      );
      const txRow = transactionInsert.rows[0];
      const transactionId = Number(txRow.id);

      for (const item of billItems) {
        await client.query(
          `INSERT INTO medical_transaction_items
           (transaction_id, medicine_name, quantity, unit_price, line_total)
           VALUES ($1, $2, $3, $4, $5)`,
          [transactionId, item.medicineName, item.quantity, item.unitPrice, item.lineTotal],
        );
        await client.query(
          `UPDATE medical_inventory
           SET quantity = quantity - $1, updated_at = NOW()
           WHERE id = $2`,
          [item.quantity, item.inventoryId],
        );
      }

      return {
        transaction: toCamelCase(txRow) as Record<string, unknown>,
        items: billItems,
      };
    });

    const amount = Number(dispenseResult.transaction.amount || 0);
    const qrCodeUrl = buildQrCodeUrl(context.upiId, context.medicalName, amount);

    return NextResponse.json({
      success: true,
      message: "Dispense bill created. Ask patient to scan and pay.",
      transaction: {
        ...dispenseResult.transaction,
        patientName,
        medicalName: context.medicalName,
      },
      items: dispenseResult.items,
      checkout: {
        manual: true,
        transactionId: Number(dispenseResult.transaction.id),
        transactionCode: String(dispenseResult.transaction.transactionCode || ""),
        amount,
        paymentStatus: String(dispenseResult.transaction.paymentStatus || "pending"),
        upiId: context.upiId,
        accountName: context.medicalName,
        qrCodeUrl,
      },
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

