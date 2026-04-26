import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query, toCamelCase } from "@/lib/db";
import {
  ensureMedicalistSchema,
  estimateRecommendedQty,
  normalizeMedicineName,
  resolveMedicalistContext,
} from "@/lib/medicalist";

function parsePositiveInt(value: string | null): number | null {
  if (!value) return null;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unexpected error";
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.userType !== "medicalist") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await ensureMedicalistSchema();
    const context = await resolveMedicalistContext(session.user.id as string);

    const searchParams = request.nextUrl.searchParams;
    const patientId = parsePositiveInt(searchParams.get("patientId"));
    const consultationId = parsePositiveInt(searchParams.get("consultationId"));
    const search = (searchParams.get("search") || "").trim();

    const inventorySql = `
      SELECT id, medicine_name, unit_price, quantity, low_stock_threshold, updated_at
      FROM medical_inventory
      WHERE medical_id = $1
      ${search ? "AND medicine_name ILIKE $2" : ""}
      ORDER BY medicine_name ASC
      LIMIT 300
    `;
    const inventoryParams = search
      ? [context.medicalId, `%${search}%`]
      : [context.medicalId];

    const inventoryResult = await query(inventorySql, inventoryParams);
    const inventory = (toCamelCase(inventoryResult.rows) as Array<Record<string, unknown>>).map((row) => ({
      ...row,
      isLowStock: Number(row.quantity || 0) <= Number(row.lowStockThreshold || 0),
    }));

    let patient: Record<string, unknown> | null = null;
    let consultation: Record<string, unknown> | null = null;
    let prescriptions: Array<Record<string, unknown>> = [];

    if (patientId) {
      const patientResult = await query(
        `SELECT id, name, mobile_no, address, diagnosis, symptoms
         FROM patients
         WHERE id = $1
         LIMIT 1`,
        [patientId],
      );
      if (patientResult.rows.length) {
        patient = toCamelCase(patientResult.rows[0]) as Record<string, unknown>;
      }
    }

    if (patientId && consultationId) {
      const consultationResult = await query(
        `SELECT c.id, c.patient_id, c.consultation_date, c.diagnosis, c.notes, c.symptoms_observed,
                d.name as doctor_name, d.specialist as doctor_specialist
         FROM consultations c
         JOIN doctors d ON c.doctor_id = d.id
         WHERE c.id = $1 AND c.patient_id = $2
         LIMIT 1`,
        [consultationId, patientId],
      );
      if (consultationResult.rows.length) {
        consultation = toCamelCase(consultationResult.rows[0]) as Record<string, unknown>;
      }
    } else if (patientId) {
      const latestConsultationResult = await query(
        `SELECT c.id, c.patient_id, c.consultation_date, c.diagnosis, c.notes, c.symptoms_observed,
                d.name as doctor_name, d.specialist as doctor_specialist
         FROM consultations c
         JOIN doctors d ON c.doctor_id = d.id
         WHERE c.patient_id = $1
         ORDER BY c.consultation_date DESC, c.created_at DESC
         LIMIT 1`,
        [patientId],
      );
      if (latestConsultationResult.rows.length) {
        consultation = toCamelCase(latestConsultationResult.rows[0]) as Record<string, unknown>;
      }
    }

    if (consultation?.id) {
      const prescriptionResult = await query(
        `SELECT id, medication_name, dosage, duration, instructions
         FROM prescriptions
         WHERE consultation_id = $1 AND is_active = true
         ORDER BY id ASC`,
        [Number(consultation.id)],
      );
      prescriptions = toCamelCase(prescriptionResult.rows) as Array<Record<string, unknown>>;
    }

    const inventoryMap = new Map<string, { quantity: number; unitPrice: number }>();
    for (const item of inventory) {
      inventoryMap.set(normalizeMedicineName(String(item.medicineName || "")), {
        quantity: Number(item.quantity || 0),
        unitPrice: Number(item.unitPrice || 0),
      });
    }

    const prescriptionItems = prescriptions.map((item) => {
      const name = String(item.medicationName || "");
      const normalized = normalizeMedicineName(name);
      const stock = inventoryMap.get(normalized);
      const recommendedQty = estimateRecommendedQty(
        String(item.dosage || ""),
        String(item.duration || ""),
      );
      return {
        ...item,
        recommendedQty,
        stockQty: stock?.quantity || 0,
        unitPrice: stock?.unitPrice || 0,
      };
    });

    return NextResponse.json({
      medical: {
        id: context.medicalId,
        name: context.medicalName,
        upiId: context.upiId,
      },
      patient,
      consultation,
      prescriptionItems,
      inventory,
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.userType !== "medicalist") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await ensureMedicalistSchema();
    const context = await resolveMedicalistContext(session.user.id as string);
    const body = await request.json();

    const medicineName = String(body?.medicineName || "").trim();
    const quantity = Number(body?.quantity || 0);
    const unitPrice = Number(body?.unitPrice || 0);
    const lowStockThreshold = Number(body?.lowStockThreshold || 10);

    if (!medicineName) {
      return NextResponse.json({ error: "Medicine name is required" }, { status: 400 });
    }
    if (!Number.isFinite(quantity) || quantity <= 0) {
      return NextResponse.json({ error: "Quantity must be greater than 0" }, { status: 400 });
    }
    if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
      return NextResponse.json({ error: "Unit price must be greater than 0" }, { status: 400 });
    }

    const existing = await query(
      `SELECT id, quantity
       FROM medical_inventory
       WHERE medical_id = $1 AND LOWER(medicine_name) = LOWER($2)
       LIMIT 1`,
      [context.medicalId, medicineName],
    );

    if (existing.rows.length) {
      const row = existing.rows[0];
      const nextQty = Number(row.quantity || 0) + quantity;
      await query(
        `UPDATE medical_inventory
         SET quantity = $1,
             unit_price = $2,
             low_stock_threshold = $3,
             updated_at = NOW()
         WHERE id = $4`,
        [nextQty, unitPrice, Math.max(1, lowStockThreshold), row.id],
      );
    } else {
      await query(
        `INSERT INTO medical_inventory
         (medical_id, medicine_name, unit_price, quantity, low_stock_threshold)
         VALUES ($1, $2, $3, $4, $5)`,
        [context.medicalId, medicineName, unitPrice, quantity, Math.max(1, lowStockThreshold)],
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

