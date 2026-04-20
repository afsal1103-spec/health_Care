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
        if (
          (val.startsWith('"') && val.endsWith('"')) ||
          (val.startsWith("'") && val.endsWith("'"))
        ) {
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

function toTitleCase(str) {
  return str
    .replace(/[._\-]/g, ' ')
    .replace(/\b\w/g, function (c) { return c.toUpperCase(); });
}

async function fixOrphanPatients() {
  const res = await q(
    "SELECT u.id, u.email FROM users u " +
    "LEFT JOIN patients p ON p.user_id = u.id " +
    "WHERE u.user_type = 'patient' AND u.is_active = true AND p.id IS NULL"
  );
  console.log('Orphan patients found:', res.rows.length);
  for (const u of res.rows) {
    const name = toTitleCase(u.email.split('@')[0]);
    await q(
      'INSERT INTO patients (user_id, name, mobile_no, address) VALUES ($1, $2, $3, $4)',
      [u.id, name, '9000000000', 'Not specified']
    );
    console.log('  Created patient profile for:', u.email);
  }
}

async function fixOrphanDoctors() {
  const res = await q(
    "SELECT u.id, u.email FROM users u " +
    "LEFT JOIN doctors d ON d.user_id = u.id " +
    "WHERE u.user_type = 'doctor' AND u.is_active = true AND d.id IS NULL"
  );
  console.log('Orphan doctors found:', res.rows.length);
  for (const u of res.rows) {
    const name = 'Dr. ' + toTitleCase(u.email.split('@')[0]);
    await q(
      "INSERT INTO doctors " +
      "(user_id, name, specialist, contact, education, consultation_fee, " +
      " available_days, available_time_start, available_time_end, is_available) " +
      "VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9, true)",
      [
        u.id,
        name,
        'General Physician',
        '9000000000',
        'MBBS',
        500,
        '["Monday","Tuesday","Wednesday","Thursday","Friday"]',
        '09:00:00',
        '17:00:00',
      ]
    );
    console.log('  Created doctor profile for:', u.email);
  }
}

async function fixOrphanReceptionists() {
  const res = await q(
    "SELECT u.id, u.email FROM users u " +
    "LEFT JOIN receptionists r ON r.user_id = u.id " +
    "WHERE u.user_type = 'receptionist' AND u.is_active = true AND r.id IS NULL"
  );
  console.log('Orphan receptionists found:', res.rows.length);
  for (const u of res.rows) {
    const name = toTitleCase(u.email.split('@')[0]);
    await q(
      'INSERT INTO receptionists (user_id, name, contact, shift_timing) VALUES ($1, $2, $3, $4)',
      [u.id, name, '9000000000', 'Morning']
    );
    console.log('  Created receptionist profile for:', u.email);
  }
}

async function fixOrphanMedicalists() {
  const res = await q(
    "SELECT u.id, u.email FROM users u " +
    "LEFT JOIN medicalists m ON m.user_id = u.id " +
    "WHERE u.user_type = 'medicalist' AND u.is_active = true AND m.id IS NULL"
  );
  console.log('Orphan medicalists found:', res.rows.length);
  for (const u of res.rows) {
    const name = toTitleCase(u.email.split('@')[0]);
    await q(
      'INSERT INTO medicalists (user_id, name, contact, department) VALUES ($1, $2, $3, $4)',
      [u.id, name, '9000000000', 'Pharmacy']
    );
    console.log('  Created medicalist profile for:', u.email);
  }
}

async function verifyAll() {
  console.log('\n--- Verification ---');

  const patients = await q(
    "SELECT u.id, u.email, p.name FROM users u " +
    "JOIN patients p ON p.user_id = u.id " +
    "WHERE u.user_type = 'patient' AND u.is_active = true"
  );
  console.log('Patients with profiles:', patients.rows.length);
  patients.rows.forEach(function(r) { console.log('  ', r.id, r.email, '->', r.name); });

  const doctors = await q(
    "SELECT u.id, u.email, d.name, d.specialist FROM users u " +
    "JOIN doctors d ON d.user_id = u.id " +
    "WHERE u.user_type = 'doctor' AND u.is_active = true"
  );
  console.log('Doctors with profiles:', doctors.rows.length);
  doctors.rows.forEach(function(r) { console.log('  ', r.id, r.email, '->', r.name, '/', r.specialist); });

  const recs = await q(
    "SELECT u.id, u.email, r.name FROM users u " +
    "JOIN receptionists r ON r.user_id = u.id " +
    "WHERE u.user_type = 'receptionist' AND u.is_active = true"
  );
  console.log('Receptionists with profiles:', recs.rows.length);
  recs.rows.forEach(function(r) { console.log('  ', r.id, r.email, '->', r.name); });

  const meds = await q(
    "SELECT u.id, u.email, m.name FROM users u " +
    "JOIN medicalists m ON m.user_id = u.id " +
    "WHERE u.user_type = 'medicalist' AND u.is_active = true"
  );
  console.log('Medicalists with profiles:', meds.rows.length);
  meds.rows.forEach(function(r) { console.log('  ', r.id, r.email, '->', r.name); });

  const stillOrphan = await q(
    "SELECT u.id, u.email, u.user_type FROM users u " +
    "LEFT JOIN patients p ON p.user_id = u.id AND u.user_type = 'patient' " +
    "LEFT JOIN doctors d ON d.user_id = u.id AND u.user_type = 'doctor' " +
    "LEFT JOIN receptionists r ON r.user_id = u.id AND u.user_type = 'receptionist' " +
    "LEFT JOIN medicalists m ON m.user_id = u.id AND u.user_type = 'medicalist' " +
    "WHERE u.is_active = true " +
    "  AND u.user_type != 'superadmin' " +
    "  AND p.id IS NULL AND d.id IS NULL AND r.id IS NULL AND m.id IS NULL"
  );
  if (stillOrphan.rows.length === 0) {
    console.log('\n[OK] No orphan users remaining!');
  } else {
    console.log('\n[WARN] Still orphaned:', stillOrphan.rows.length);
    stillOrphan.rows.forEach(function(r) { console.log('  ', r.id, r.email, r.user_type); });
  }
}

async function main() {
  console.log('=== Fix Orphan Users ===\n');
  try {
    await fixOrphanPatients();
    await fixOrphanDoctors();
    await fixOrphanReceptionists();
    await fixOrphanMedicalists();
    await verifyAll();
    console.log('\nDone!');
  } catch (e) {
    console.error('ERROR:', e.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
