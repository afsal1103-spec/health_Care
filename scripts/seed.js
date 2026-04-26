/* eslint-disable */
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env.local');
  if (fs.existsSync(envPath)) {
    const text = fs.readFileSync(envPath, 'utf8');
    text.split(/\r?\n/).forEach((line) => {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if (m) {
        const key = m[1];
        let val = m[2];
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        if (!process.env[key]) process.env[key] = val;
      }
    });
  }
}

loadEnv();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5433', 10),
  database: process.env.DB_NAME || 'healthcare_system',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'your_password',
  max: 5,
});

async function q(sql, params) {
  const client = await pool.connect();
  try {
    return await client.query(sql, params);
  } finally {
    client.release();
  }
}

async function ensureUser(email, passwordPlain, userType) {
  const res = await q('SELECT id, user_type FROM users WHERE email = $1', [email]);
  if (res.rows.length > 0) {
    return res.rows[0].id;
  }
  const hash = await bcrypt.hash(passwordPlain, 10);
  const ins = await q(
    'INSERT INTO users (email, password, user_type, is_active) VALUES ($1, $2, $3, true) RETURNING id',
    [email, hash, userType]
  );
  return ins.rows[0].id;
}

async function ensurePatient(email, { name, mobile_no = '9876543210', address = 'Chennai', gender = 'Female', age = 28 }) {
  const userId = await ensureUser(email, 'Patient@123', 'patient');
  const res = await q('SELECT p.id FROM patients p WHERE p.user_id = $1', [userId]);
  if (res.rows.length > 0) {
    // Update missing fields if patient exists
    await q('UPDATE patients SET gender = $1, age = $2 WHERE user_id = $3', [gender, age, userId]);
    return res.rows[0].id;
  }
  const ins = await q(
    'INSERT INTO patients (user_id, name, mobile_no, address, gender, age) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
    [userId, name, mobile_no, address, gender, age]
  );
  return ins.rows[0].id;
}

async function ensureDoctor(email, { name, specialist = 'General Physician', contact = '9876500000', education = 'MBBS', fee = 500 }) {
  const userId = await ensureUser(email, 'Doctor@123', 'doctor');
  const res = await q('SELECT d.id FROM doctors d WHERE d.user_id = $1', [userId]);
  if (res.rows.length > 0) {
    await q("UPDATE doctors SET approval_status = 'approved' WHERE user_id = $1", [userId]);
    return res.rows[0].id;
  }
  const ins = await q(
    `INSERT INTO doctors (
      user_id, name, specialist, contact, education, consultation_fee,
      available_days, available_time_start, available_time_end, is_available, approval_status
    ) VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9, true, 'approved') RETURNING id`,
    [userId, name, specialist, contact, education, fee, '["Monday","Tuesday","Wednesday","Thursday","Friday"]', '09:00:00', '17:00:00']
  );
  return ins.rows[0].id;
}

async function ensureMedicalist(email, { name, contact = '9876598765', department = 'Pharmacy' }) {
  const userId = await ensureUser(email, 'Medical@123', 'medicalist');
  const res = await q('SELECT m.id, m.medical_id FROM medicalists m WHERE m.user_id = $1', [userId]);
  
  let medicalistId;
  let medicalId;

  if (res.rows.length > 0) {
    medicalistId = res.rows[0].id;
    medicalId = res.rows[0].medical_id;
  } else {
    const ins = await q(
      'INSERT INTO medicalists (user_id, name, contact, department, upi_id) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      [userId, name, contact, department, 'medical@upi']
    );
    medicalistId = ins.rows[0].id;
  }

  // Ensure a medical record exists and is linked
  if (!medicalId) {
    const medRes = await q(
      'INSERT INTO medicals (name, contact, address, is_approved, upi_id) VALUES ($1, $2, $3, true, $4) RETURNING id',
      [name + " Pharmacy", contact, "Seed Address", 'medical@upi']
    );
    medicalId = medRes.rows[0].id;
    await q('UPDATE medicalists SET medical_id = $1 WHERE id = $2', [medicalId, medicalistId]);
  }

  return { medicalistId, medicalId };
}

async function seedInventory(medicalId) {
  const medicines = [
    { name: 'Paracetamol', price: 5, qty: 100 },
    { name: 'Amoxicillin', price: 15, qty: 50 },
    { name: 'Cetirizine', price: 8, qty: 80 },
    { name: 'Ibuprofen', price: 12, qty: 60 },
    { name: 'Azithromycin', price: 45, qty: 30 },
  ];

  for (const med of medicines) {
    await q(
      `INSERT INTO medical_inventory (medical_id, medicine_name, unit_price, quantity, low_stock_threshold)
       VALUES ($1, $2, $3, $4, 10)
       ON CONFLICT (medical_id, medicine_name) DO UPDATE 
       SET unit_price = EXCLUDED.unit_price, quantity = EXCLUDED.quantity`,
      [medicalId, med.name, med.price, med.qty]
    );
  }
}

async function seedAppointments(patientId, doctorId) {
  // Create 3 appointments today with different times if not exists
  const times = ['10:00:00', '11:30:00', '15:00:00'];
  for (const t of times) {
    const check = await q(
      `SELECT id FROM appointments 
       WHERE patient_id = $1 AND doctor_id = $2 AND appointment_date = CURRENT_DATE AND appointment_time = $3`,
      [patientId, doctorId, t]
    );
    if (check.rows.length === 0) {
      await q(
        `INSERT INTO appointments 
          (patient_id, doctor_id, booked_by, booked_by_user_id, appointment_date, appointment_time, symptoms, disease_category, priority, notes, status)
         VALUES ($1, $2, 'system', NULL, CURRENT_DATE, $3, 'headache', 'Neurology', 'medium', 'seed data', 'pending')`,
        [patientId, doctorId, t]
      );
    }
  }
}

async function seedConsultation(patientId, doctorId) {
  const exists = await q(
    'SELECT id FROM consultations WHERE patient_id = $1 AND doctor_id = $2 ORDER BY id DESC LIMIT 1',
    [patientId, doctorId]
  );
  if (exists.rows.length === 0) {
    const ins = await q(
      `INSERT INTO consultations
       (patient_id, doctor_id, consultation_date, diagnosis, symptoms_observed, follow_up_required)
       VALUES ($1, $2, CURRENT_DATE, 'Migraine', 'Throbbing headache', false)
       RETURNING id`,
      [patientId, doctorId]
    );
    const cid = ins.rows[0].id;
    await q(
      `INSERT INTO prescriptions
       (consultation_id, prescription_code, medication_name, dosage, duration, instructions, is_active)
       VALUES ($1, 'RX-000001', 'Paracetamol', '500mg', '5 days', 'After food', true)`,
      [cid]
    );
  }
}

async function seedTransactions(patientId, doctorId) {
  const tx = await q(
    'SELECT id FROM transactions WHERE patient_id = $1 ORDER BY id DESC LIMIT 1',
    [patientId]
  );
  if (tx.rows.length === 0) {
    await q(
      `INSERT INTO transactions
       (transaction_code, patient_id, doctor_id, type, amount, payment_status, payment_method, description, transaction_date)
       VALUES ('TX-000001', $1, $2, 'consultation', 800, 'paid', 'cash', 'Consultation fee', CURRENT_DATE)`,
      [patientId, doctorId]
    );
  }
}

async function ensureSuperAdmin(email, passwordPlain) {
  const userId = await ensureUser(email, passwordPlain, 'superadmin');
  return userId;
}

async function main() {
  console.log('Seeding database...');
  
  // 1. Seed Super Admin
  await ensureSuperAdmin('admin@healthcare.com', 'Admin@123');

  const patientId = await ensurePatient('jane.patient@example.com', { name: 'Jane Patient' });
  const doctorId = await ensureDoctor('dr.arun@example.com', { name: 'Dr. Arun Kumar', specialist: 'Neurologist', education: 'MBBS, MD', fee: 800 });
  const { medicalId } = await ensureMedicalist('pharma.raj@example.com', { name: 'Rajesh Kumar' });

  await seedInventory(medicalId);
  await seedAppointments(patientId, doctorId);
  await seedConsultation(patientId, doctorId);
  await seedTransactions(patientId, doctorId);

  console.log('Seed complete.');
  await pool.end();
}

main().catch(async (e) => {
  console.error(e);
  await pool.end();
  process.exit(1);
});

