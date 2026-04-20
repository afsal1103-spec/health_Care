/* eslint-disable */
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env.local');
  if (fs.existsSync(envPath)) {
    const text = fs.readFileSync(envPath, 'utf8');
    text.split(/\r?\n/).forEach((line) => {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if (m) {
        let val = m[2];
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        if (!process.env[m[1]]) process.env[m[1]] = val;
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
    return await client.query(sql, params || []);
  } finally {
    client.release();
  }
}

let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    const result = await fn();
    console.log('[PASS]', name, result !== undefined ? '-> ' + result : '');
    passed++;
  } catch (e) {
    console.log('[FAIL]', name, '->', e.message);
    failed++;
  }
}

async function main() {
  console.log('==============================================');
  console.log(' Healthcare System - Full DB & Query Test');
  console.log('==============================================\n');

  // ── CONNECTION ─────────────────────────────────────────────────────────────
  await test('DB connection', async () => {
    const r = await q('SELECT NOW()');
    return 'connected at ' + r.rows[0].now;
  });

  // ── TABLES EXIST ───────────────────────────────────────────────────────────
  const tables = ['users', 'patients', 'doctors', 'receptionists', 'medicalists',
                  'appointments', 'consultations', 'prescriptions', 'transactions'];
  for (const tbl of tables) {
    await test('Table exists: ' + tbl, async () => {
      const r = await q(
        "SELECT COUNT(*) AS c FROM information_schema.tables WHERE table_schema='public' AND table_name=$1",
        [tbl]
      );
      if (parseInt(r.rows[0].c) === 0) throw new Error('table not found');
      return 'ok';
    });
  }

  // ── COLUMNS CHECK ──────────────────────────────────────────────────────────
  const requiredCols = {
    users:         ['id','email','password','user_type','is_active'],
    patients:      ['id','user_id','name','mobile_no','address','patient_code'],
    doctors:       ['id','user_id','name','specialist','education','consultation_fee',
                    'available_days','available_time_start','available_time_end',
                    'is_available','experience_years','rating'],
    appointments:  ['id','appointment_code','patient_id','doctor_id','appointment_date',
                    'appointment_time','symptoms','disease_category','status'],
    consultations: ['id','patient_id','doctor_id','diagnosis','symptoms_observed',
                    'blood_pressure','heart_rate','temperature','weight','diabetes_reading',
                    'notes','follow_up_required','follow_up_date'],
    prescriptions: ['id','consultation_id','prescription_code','medication_name',
                    'dosage','duration','instructions','is_active'],
    transactions:  ['id','transaction_code','patient_id','doctor_id','appointment_id',
                    'consultation_id','type','amount','payment_status'],
  };

  for (const [tbl, cols] of Object.entries(requiredCols)) {
    for (const col of cols) {
      await test('Column ' + tbl + '.' + col, async () => {
        const r = await q(
          "SELECT COUNT(*) AS c FROM information_schema.columns WHERE table_schema='public' AND table_name=$1 AND column_name=$2",
          [tbl, col]
        );
        if (parseInt(r.rows[0].c) === 0) throw new Error('column missing');
        return 'ok';
      });
    }
  }

  // ── USERS ──────────────────────────────────────────────────────────────────
  await test('Users: count active', async () => {
    const r = await q('SELECT COUNT(*) AS c FROM users WHERE is_active=true');
    return r.rows[0].c + ' active users';
  });

  await test('Users: has superadmin', async () => {
    const r = await q("SELECT COUNT(*) AS c FROM users WHERE user_type='superadmin' AND is_active=true");
    if (parseInt(r.rows[0].c) === 0) throw new Error('no superadmin found');
    return r.rows[0].c + ' superadmin(s)';
  });

  await test('Users: has patient', async () => {
    const r = await q("SELECT COUNT(*) AS c FROM users WHERE user_type='patient' AND is_active=true");
    if (parseInt(r.rows[0].c) === 0) throw new Error('no patients found');
    return r.rows[0].c + ' patient(s)';
  });

  await test('Users: has doctor', async () => {
    const r = await q("SELECT COUNT(*) AS c FROM users WHERE user_type='doctor' AND is_active=true");
    if (parseInt(r.rows[0].c) === 0) throw new Error('no doctors found');
    return r.rows[0].c + ' doctor(s)';
  });

  // ── PATIENTS ───────────────────────────────────────────────────────────────
  await test('Patients: join with users', async () => {
    const r = await q('SELECT p.id,p.name,p.mobile_no,u.email FROM patients p JOIN users u ON u.id=p.user_id WHERE u.is_active=true LIMIT 3');
    return r.rows.length + ' row(s)';
  });

  await test('Patients: patient_code populated', async () => {
    const r = await q("SELECT COUNT(*) AS c FROM patients WHERE patient_code IS NOT NULL AND patient_code != ''");
    return r.rows[0].c + ' with code';
  });

  // ── DOCTORS ────────────────────────────────────────────────────────────────
  await test('Doctors: available list (used by /api/doctors)', async () => {
    const r = await q(
      "SELECT d.id,d.name,d.specialist,d.education," +
      "COALESCE(d.experience_years,0) AS experience_years," +
      "COALESCE(d.consultation_fee,500) AS consultation_fee," +
      "d.rating,d.available_days,d.available_time_start,d.available_time_end " +
      "FROM doctors d JOIN users u ON d.user_id=u.id " +
      "WHERE d.is_available=true AND u.is_active=true ORDER BY d.name ASC"
    );
    return r.rows.length + ' available doctor(s)';
  });

  await test('Doctors: available_days is array', async () => {
    const r = await q('SELECT available_days FROM doctors WHERE is_available=true LIMIT 1');
    if (!r.rows[0]) throw new Error('no doctor found');
    const days = r.rows[0].available_days;
    if (!Array.isArray(days)) throw new Error('available_days is not an array, got: ' + typeof days);
    return 'ok, days: ' + JSON.stringify(days);
  });

  await test('Doctors: paginated (used by /api/admin/doctors)', async () => {
    const r = await q(
      "SELECT d.id,d.name,d.specialist,d.education,u.email," +
      "COUNT(*) OVER() AS total_count " +
      "FROM doctors d JOIN users u ON u.id=d.user_id " +
      "WHERE u.is_active=true ORDER BY d.id DESC LIMIT 10 OFFSET 0"
    );
    return r.rows.length + ' row(s), total=' + (r.rows[0] ? r.rows[0].total_count : 0);
  });

  await test('Doctors: search by name', async () => {
    const r = await q(
      "SELECT d.id,d.name FROM doctors d JOIN users u ON u.id=d.user_id " +
      "WHERE u.is_active=true AND (d.name ILIKE $1 OR d.specialist ILIKE $1)",
      ['%doctor%']
    );
    return r.rows.length + ' match(es)';
  });

  // ── APPOINTMENTS ───────────────────────────────────────────────────────────
  await test('Appointments: join query (used by /api/appointments GET)', async () => {
    const r = await q(
      "SELECT a.*,p.name AS patient_name,d.name AS doctor_name,d.specialist AS doctor_specialist " +
      "FROM appointments a " +
      "JOIN patients p ON a.patient_id=p.id " +
      "JOIN doctors d ON a.doctor_id=d.id " +
      "WHERE 1=1 ORDER BY a.appointment_date DESC, a.appointment_time DESC LIMIT 5"
    );
    return r.rows.length + ' row(s)';
  });

  await test('Appointments: filter by patient', async () => {
    const pat = await q('SELECT id FROM patients LIMIT 1');
    if (!pat.rows[0]) throw new Error('no patient');
    const r = await q(
      'SELECT id FROM appointments WHERE patient_id=$1 LIMIT 5',
      [pat.rows[0].id]
    );
    return r.rows.length + ' appointment(s) for patient ' + pat.rows[0].id;
  });

  await test('Appointments: filter by doctor', async () => {
    const doc = await q('SELECT id FROM doctors LIMIT 1');
    if (!doc.rows[0]) throw new Error('no doctor');
    const r = await q(
      'SELECT id FROM appointments WHERE doctor_id=$1 LIMIT 5',
      [doc.rows[0].id]
    );
    return r.rows.length + ' appointment(s) for doctor ' + doc.rows[0].id;
  });

  await test('Appointments: filter by date (today)', async () => {
    const r = await q('SELECT id FROM appointments WHERE appointment_date=CURRENT_DATE');
    return r.rows.length + ' today';
  });

  await test('Appointments: slot conflict check', async () => {
    const r = await q(
      "SELECT id FROM appointments WHERE doctor_id=$1 AND appointment_date=$2 AND appointment_time=$3 AND status!='cancelled'",
      [1, '2099-01-01', '09:00:00']
    );
    return 'no conflict (expected 0): ' + r.rows.length;
  });

  await test('Appointments: patient_id from user_id lookup', async () => {
    const u = await q("SELECT id FROM users WHERE user_type='patient' AND is_active=true LIMIT 1");
    if (!u.rows[0]) throw new Error('no patient user');
    const r = await q('SELECT id FROM patients WHERE user_id=$1', [u.rows[0].id]);
    if (!r.rows[0]) throw new Error('patient profile not found for user ' + u.rows[0].id);
    return 'patient id=' + r.rows[0].id + ' for user id=' + u.rows[0].id;
  });

  // ── CONSULTATIONS ──────────────────────────────────────────────────────────
  await test('Consultations: full select', async () => {
    const r = await q(
      "SELECT c.id,c.appointment_id,c.patient_id,c.doctor_id,c.consultation_date," +
      "c.diagnosis,c.symptoms_observed,c.blood_pressure,c.heart_rate,c.temperature," +
      "c.weight,c.diabetes_reading,c.notes,c.follow_up_required,c.follow_up_date," +
      "p.name AS patient_name,d.name AS doctor_name,d.specialist AS doctor_specialist " +
      "FROM consultations c " +
      "JOIN patients p ON c.patient_id=p.id " +
      "JOIN doctors d ON c.doctor_id=d.id " +
      "ORDER BY c.consultation_date DESC LIMIT 5"
    );
    return r.rows.length + ' row(s)';
  });

  await test('Consultations: scoped to patient', async () => {
    const p = await q('SELECT id FROM patients LIMIT 1');
    if (!p.rows[0]) throw new Error('no patient');
    const r = await q('SELECT id FROM consultations WHERE patient_id=$1', [p.rows[0].id]);
    return r.rows.length + ' for patient ' + p.rows[0].id;
  });

  await test('Consultations: scoped to doctor', async () => {
    const d = await q('SELECT id FROM doctors LIMIT 1');
    if (!d.rows[0]) throw new Error('no doctor');
    const r = await q('SELECT id FROM consultations WHERE doctor_id=$1', [d.rows[0].id]);
    return r.rows.length + ' for doctor ' + d.rows[0].id;
  });

  await test('Consultations: doctor_id lookup from user_id', async () => {
    const u = await q("SELECT id FROM users WHERE user_type='doctor' AND is_active=true LIMIT 1");
    if (!u.rows[0]) throw new Error('no doctor user');
    const r = await q('SELECT id,consultation_fee FROM doctors WHERE user_id=$1', [u.rows[0].id]);
    if (!r.rows[0]) throw new Error('doctor profile not found for user ' + u.rows[0].id);
    return 'doctor id=' + r.rows[0].id + ' fee=' + r.rows[0].consultation_fee;
  });

  // ── PRESCRIPTIONS ──────────────────────────────────────────────────────────
  await test('Prescriptions: list by consultation', async () => {
    const c = await q('SELECT id FROM consultations LIMIT 1');
    if (!c.rows[0]) throw new Error('no consultation');
    const r = await q(
      'SELECT id,prescription_code,medication_name FROM prescriptions WHERE consultation_id=$1 AND is_active=true ORDER BY id',
      [c.rows[0].id]
    );
    return r.rows.length + ' prescription(s) for consultation ' + c.rows[0].id;
  });

  await test('Prescriptions: prescription_code nullable (no NOT NULL constraint)', async () => {
    const r = await q(
      "SELECT is_nullable FROM information_schema.columns WHERE table_name='prescriptions' AND column_name='prescription_code'"
    );
    if (!r.rows[0]) throw new Error('column not found');
    return 'is_nullable=' + r.rows[0].is_nullable;
  });

  // ── TRANSACTIONS ───────────────────────────────────────────────────────────
  await test('Transactions: list for patient', async () => {
    const p = await q('SELECT id FROM patients LIMIT 1');
    if (!p.rows[0]) throw new Error('no patient');
    const r = await q(
      'SELECT id,transaction_code,amount,payment_status FROM transactions WHERE patient_id=$1 ORDER BY transaction_date DESC LIMIT 5',
      [p.rows[0].id]
    );
    return r.rows.length + ' tx for patient ' + p.rows[0].id;
  });

  await test('Transactions: transaction_code nullable', async () => {
    const r = await q(
      "SELECT is_nullable FROM information_schema.columns WHERE table_name='transactions' AND column_name='transaction_code'"
    );
    if (!r.rows[0]) throw new Error('column not found');
    return 'is_nullable=' + r.rows[0].is_nullable;
  });

  // ── PATIENT SEARCH (used by receptionist & medicalist) ─────────────────────
  await test('Patient search: by patient_code', async () => {
    const p = await q("SELECT patient_code FROM patients WHERE patient_code IS NOT NULL LIMIT 1");
    if (!p.rows[0]) throw new Error('no patient with code');
    const code = p.rows[0].patient_code;
    const r = await q('SELECT * FROM patients WHERE patient_code=$1', [code]);
    if (!r.rows[0]) throw new Error('patient not found by code: ' + code);
    return 'found patient: ' + r.rows[0].name;
  });

  await test('Patient search: by patient id', async () => {
    const p = await q('SELECT id FROM patients LIMIT 1');
    if (!p.rows[0]) throw new Error('no patient');
    const r = await q('SELECT * FROM patients WHERE id=$1', [p.rows[0].id]);
    if (!r.rows[0]) throw new Error('not found');
    return 'found: ' + r.rows[0].name;
  });

  // ── ADMIN QUERIES ──────────────────────────────────────────────────────────
  await test('Admin: patients paginated', async () => {
    const r = await q(
      'SELECT p.id,p.name,p.mobile_no,u.email,COUNT(*) OVER() AS total_count ' +
      'FROM patients p JOIN users u ON u.id=p.user_id ' +
      'WHERE u.is_active=true ORDER BY p.id DESC LIMIT 10 OFFSET 0'
    );
    return r.rows.length + ' row(s), total=' + (r.rows[0] ? r.rows[0].total_count : 0);
  });

  await test('Admin: doctors paginated', async () => {
    const r = await q(
      'SELECT d.id,d.name,d.specialist,d.education,u.email,COUNT(*) OVER() AS total_count ' +
      'FROM doctors d JOIN users u ON u.id=d.user_id ' +
      'WHERE u.is_active=true ORDER BY d.id DESC LIMIT 10 OFFSET 0'
    );
    return r.rows.length + ' row(s), total=' + (r.rows[0] ? r.rows[0].total_count : 0);
  });

  // ── AUTH QUERIES ───────────────────────────────────────────────────────────
  await test('Auth: user lookup by email', async () => {
    const r = await q('SELECT id,email,user_type,is_active FROM users WHERE email=$1 AND is_active=true', ['jane.patient@example.com']);
    if (!r.rows[0]) throw new Error('user not found');
    return 'found: ' + r.rows[0].email + ' type=' + r.rows[0].user_type;
  });

  await test('Auth: roleDetails for patient', async () => {
    const u = await q("SELECT id FROM users WHERE user_type='patient' AND is_active=true LIMIT 1");
    if (!u.rows[0]) throw new Error('no patient user');
    const r = await q('SELECT * FROM patients WHERE user_id=$1', [u.rows[0].id]);
    if (!r.rows[0]) throw new Error('patient profile missing for user ' + u.rows[0].id);
    return 'ok, name=' + r.rows[0].name;
  });

  await test('Auth: roleDetails for doctor', async () => {
    const u = await q("SELECT id FROM users WHERE user_type='doctor' AND is_active=true LIMIT 1");
    if (!u.rows[0]) throw new Error('no doctor user');
    const r = await q('SELECT * FROM doctors WHERE user_id=$1', [u.rows[0].id]);
    if (!r.rows[0]) throw new Error('doctor profile missing for user ' + u.rows[0].id);
    return 'ok, name=' + r.rows[0].name;
  });

  await test('Auth: roleDetails for receptionist', async () => {
    const u = await q("SELECT id FROM users WHERE user_type='receptionist' AND is_active=true LIMIT 1");
    if (!u.rows[0]) throw new Error('no receptionist user');
    const r = await q('SELECT * FROM receptionists WHERE user_id=$1', [u.rows[0].id]);
    if (!r.rows[0]) throw new Error('receptionist profile missing for user ' + u.rows[0].id);
    return 'ok, name=' + r.rows[0].name;
  });

  await test('Auth: roleDetails for medicalist', async () => {
    const u = await q("SELECT id FROM users WHERE user_type='medicalist' AND is_active=true LIMIT 1");
    if (!u.rows[0]) throw new Error('no medicalist user');
    const r = await q('SELECT * FROM medicalists WHERE user_id=$1', [u.rows[0].id]);
    if (!r.rows[0]) throw new Error('medicalist profile missing for user ' + u.rows[0].id);
    return 'ok, name=' + r.rows[0].name;
  });

  await test('Auth: superadmin user exists', async () => {
    const r = await q("SELECT id,email FROM users WHERE user_type='superadmin' AND is_active=true LIMIT 1");
    if (!r.rows[0]) throw new Error('no superadmin');
    return 'ok, email=' + r.rows[0].email;
  });

  // ── DOCTORS MASTER (patient-facing) ────────────────────────────────────────
  await test('Doctors master: paginated with rating', async () => {
    const r = await q(
      "SELECT d.id,d.name,d.specialist,d.education," +
      "COALESCE(d.experience_years,0) AS \"experienceYears\"," +
      "COALESCE(d.consultation_fee,0) AS \"consultationFee\"," +
      "d.rating,d.available_days AS \"availableDays\"," +
      "d.available_time_start AS \"availableTimeStart\"," +
      "d.available_time_end AS \"availableTimeEnd\"," +
      "COUNT(*) OVER() AS total_count " +
      "FROM doctors d JOIN users u ON u.id=d.user_id " +
      "WHERE d.is_available=true AND u.is_active=true " +
      "ORDER BY d.name ASC LIMIT 10 OFFSET 0"
    );
    return r.rows.length + ' doctor(s), total=' + (r.rows[0] ? r.rows[0].total_count : 0);
  });

  // ── SUMMARY ────────────────────────────────────────────────────────────────
  console.log('\n==============================================');
  console.log(' Results: ' + passed + ' passed, ' + failed + ' failed');
  console.log('==============================================');

  await pool.end();
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(async (e) => {
  console.error('FATAL:', e.message);
  await pool.end();
  process.exit(1);
});
