import { query } from "@/lib/db";

export type MedicalistContext = {
  medicalistId: number;
  medicalistName: string;
  medicalId: number;
  medicalName: string;
  upiId: string | null;
};

let ensureMedicalistSchemaPromise: Promise<void> | null = null;

export async function ensureMedicalistSchema(): Promise<void> {
  if (ensureMedicalistSchemaPromise) {
    await ensureMedicalistSchemaPromise;
    return;
  }

  ensureMedicalistSchemaPromise = (async () => {
    await query("ALTER TABLE medicals ADD COLUMN IF NOT EXISTS upi_id TEXT");
    await query("ALTER TABLE medicalists ADD COLUMN IF NOT EXISTS medical_id INTEGER");
    await query("ALTER TABLE medicalists ADD COLUMN IF NOT EXISTS upi_id TEXT");
    await query("ALTER TABLE medicalists ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'pending'");
    await query("ALTER TABLE transactions ADD COLUMN IF NOT EXISTS medical_id INTEGER");
    await query("ALTER TABLE transactions ADD COLUMN IF NOT EXISTS manual_utr TEXT");
    await query("ALTER TABLE transactions ADD COLUMN IF NOT EXISTS payment_proof_url TEXT");
    await query("ALTER TABLE transactions ADD COLUMN IF NOT EXISTS transaction_date DATE DEFAULT CURRENT_DATE");

    await query(`
      CREATE TABLE IF NOT EXISTS medical_inventory (
        id SERIAL PRIMARY KEY,
        medical_id INTEGER NOT NULL REFERENCES medicals(id) ON DELETE CASCADE,
        medicine_name TEXT NOT NULL,
        unit_price NUMERIC(10,2) NOT NULL DEFAULT 0,
        quantity INTEGER NOT NULL DEFAULT 0,
        low_stock_threshold INTEGER NOT NULL DEFAULT 10,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (medical_id, medicine_name)
      )
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS medical_transaction_items (
        id SERIAL PRIMARY KEY,
        transaction_id INTEGER NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
        medicine_name TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        unit_price NUMERIC(10,2) NOT NULL,
        line_total NUMERIC(10,2) NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
  })();

  await ensureMedicalistSchemaPromise;
}

export async function resolveMedicalistContext(userId: string | number): Promise<MedicalistContext> {
  await ensureMedicalistSchema();

  const medicalistResult = await query(
    `SELECT id, name, contact, medical_id, upi_id
     FROM medicalists
     WHERE user_id = $1
     LIMIT 1`,
    [Number(userId)],
  );

  if (!medicalistResult.rows.length) {
    throw new Error("Medicalist profile not found");
  }

  const medicalist = medicalistResult.rows[0];
  let medicalId: number | null = medicalist.medical_id ? Number(medicalist.medical_id) : null;
  let medicalName = "";
  let medicalUpiId: string | null = null;

  if (medicalId) {
    const medicalRes = await query(
      "SELECT id, name, upi_id FROM medicals WHERE id = $1 LIMIT 1",
      [medicalId],
    );
    if (medicalRes.rows.length) {
      medicalName = medicalRes.rows[0].name;
      medicalUpiId = medicalRes.rows[0].upi_id || null;
    } else {
      medicalId = null;
    }
  }

  if (!medicalId) {
    const linkedByName = await query(
      `SELECT id, name, upi_id
       FROM medicals
       WHERE LOWER(name) = LOWER($1)
       ORDER BY is_approved DESC, id ASC
       LIMIT 1`,
      [medicalist.name],
    );

    if (linkedByName.rows.length) {
      medicalId = Number(linkedByName.rows[0].id);
      medicalName = linkedByName.rows[0].name;
      medicalUpiId = linkedByName.rows[0].upi_id || null;
    } else {
      const created = await query(
        `INSERT INTO medicals (name, contact, address, is_approved, upi_id)
         VALUES ($1, $2, $3, TRUE, $4)
         RETURNING id, name, upi_id`,
        [
          medicalist.name,
          medicalist.contact || "",
          "Auto linked from medicalist profile",
          medicalist.upi_id || null,
        ],
      );
      medicalId = Number(created.rows[0].id);
      medicalName = created.rows[0].name;
      medicalUpiId = created.rows[0].upi_id || null;
    }

    await query("UPDATE medicalists SET medical_id = $1 WHERE id = $2", [medicalId, medicalist.id]);
  }

  if (!medicalUpiId && medicalist.upi_id) {
    await query("UPDATE medicals SET upi_id = $1 WHERE id = $2", [medicalist.upi_id, medicalId]);
    medicalUpiId = medicalist.upi_id;
  }

  return {
    medicalistId: Number(medicalist.id),
    medicalistName: medicalist.name,
    medicalId: Number(medicalId),
    medicalName: medicalName || medicalist.name,
    upiId: medicalUpiId || medicalist.upi_id || null,
  };
}

export function normalizeMedicineName(name: string): string {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}

export function estimateRecommendedQty(dosage?: string | null, duration?: string | null): number {
  const dosageText = (dosage || "").toLowerCase();
  const durationText = (duration || "").toLowerCase();

  let dailyFrequency = 1;

  const pattern = dosageText.match(/(\d+)\s*-\s*(\d+)\s*-\s*(\d+)/);
  if (pattern) {
    dailyFrequency = Number(pattern[1]) + Number(pattern[2]) + Number(pattern[3]);
  } else {
    const numberMatch = dosageText.match(/(\d+)/);
    if (numberMatch) {
      dailyFrequency = Math.max(1, Number(numberMatch[1]));
    }
  }

  let durationDays = 5;
  const daysMatch = durationText.match(/(\d+)\s*day/);
  const weeksMatch = durationText.match(/(\d+)\s*week/);
  const monthsMatch = durationText.match(/(\d+)\s*month/);

  if (daysMatch) durationDays = Number(daysMatch[1]);
  else if (weeksMatch) durationDays = Number(weeksMatch[1]) * 7;
  else if (monthsMatch) durationDays = Number(monthsMatch[1]) * 30;

  const qty = dailyFrequency * durationDays;
  return Math.max(1, Math.min(120, qty));
}
