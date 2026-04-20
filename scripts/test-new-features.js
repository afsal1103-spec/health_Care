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
  console.log(' Healthcare System - New Features Test');
  console.log('==============================================\n');

  // ── 1. MEDICALS TABLE EXTENSIONS ──────────────────────────────────────────
  await test('Medicals: Check new columns (latitude, longitude, is_approved)', async () => {
    const cols = ['latitude', 'longitude', 'is_approved'];
    for (const col of cols) {
      const r = await q(
        "SELECT COUNT(*) AS c FROM information_schema.columns WHERE table_name='medicals' AND column_name=$1",
        [col]
      );
      if (parseInt(r.rows[0].c) === 0) throw new Error(`Column ${col} missing in medicals table`);
    }
    return 'All new columns exist';
  });

  // ── 2. MEDICALISTS TABLE EXTENSIONS ────────────────────────────────────────
  await test('Medicalists: Check approval_status and medical_id', async () => {
    const cols = ['approval_status', 'medical_id'];
    for (const col of cols) {
      const r = await q(
        "SELECT COUNT(*) AS c FROM information_schema.columns WHERE table_name='medicalists' AND column_name=$1",
        [col]
      );
      if (parseInt(r.rows[0].c) === 0) throw new Error(`Column ${col} missing in medicalists table`);
    }
    return 'All new columns exist';
  });

  // ── 3. TRANSACTIONS TABLE EXTENSIONS ───────────────────────────────────────
  await test('Transactions: Check Razorpay and Medical ID columns', async () => {
    const cols = ['razorpay_order_id', 'razorpay_payment_id', 'razorpay_signature', 'medical_id'];
    for (const col of cols) {
      const r = await q(
        "SELECT COUNT(*) AS c FROM information_schema.columns WHERE table_name='transactions' AND column_name=$1",
        [col]
      );
      if (parseInt(r.rows[0].c) === 0) throw new Error(`Column ${col} missing in transactions table`);
    }
    return 'All Razorpay/Medical columns exist';
  });

  // ── 4. APPOINTMENTS MASTER VIEW ────────────────────────────────────────────
  await test('Appointments: Master view query check', async () => {
    const r = await q(`
      SELECT a.*, p.name as patient_name, d.name as doctor_name 
      FROM appointments a 
      JOIN patients p ON a.patient_id = p.id 
      JOIN doctors d ON a.doctor_id = d.id 
      LIMIT 1
    `);
    return `Query successful, found ${r.rows.length} row(s)`;
  });

  // ── 5. MEDICALIST VERIFICATION QUERY ───────────────────────────────────────
  await test('Medicalists: Admin verification query check', async () => {
    const r = await q(`
      SELECT m.*, u.email, med.name as medical_name 
      FROM medicalists m 
      JOIN users u ON m.user_id = u.id 
      LEFT JOIN medicals med ON m.medical_id = med.id
      LIMIT 1
    `);
    return `Query successful, found ${r.rows.length} row(s)`;
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
