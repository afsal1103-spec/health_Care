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

async function ensurePatient(email, { name, mobile_no, address, diagnosis }) {
  const userId = await ensureUser(email, 'Patient@123', 'patient');
  const res = await q('SELECT p.id FROM patients p WHERE p.user_id = $1', [userId]);
  if (res.rows.length > 0) {
    await q('UPDATE patients SET address = $1, diagnosis = $2 WHERE user_id = $3', [address, diagnosis, userId]);
    return res.rows[0].id;
  }
  const ins = await q(
    'INSERT INTO patients (user_id, name, mobile_no, address, diagnosis) VALUES ($1, $2, $3, $4, $5) RETURNING id',
    [userId, name, mobile_no, address, diagnosis]
  );
  return ins.rows[0].id;
}

const areas = [
  { name: 'Industrial Zone A', disease: 'Asthma' },
  { name: 'Old City Slum B', disease: 'Typhoid' },
  { name: 'Marshy Area C', disease: 'Dengue' },
  { name: 'Traffic Hub D', disease: 'Migraine' },
  { name: 'Textile Cluster E', disease: 'Skin Allergy' },
  { name: 'Residential Park F', disease: 'Flu' },
  { name: 'Coastal Belt G', disease: 'Dehydration' },
  { name: 'River Side H', disease: 'Cholera' },
  { name: 'Highland I', disease: 'Hypoxia' },
  { name: 'Construction Site J', disease: 'Eye Infection' },
];

async function main() {
  console.log('Seeding ML test data (40 patients)...');
  
  let patientCount = 0;
  for (const area of areas) {
    console.log(`Seeding 4 patients for ${area.name} with ${area.disease}...`);
    for (let i = 1; i <= 4; i++) {
      const email = `test.patient.${area.name.replace(/\s+/g, '').toLowerCase()}.${i}@example.com`;
      const name = `Patient ${area.name} ${i}`;
      const mobile_no = `90000${patientCount.toString().padStart(5, '0')}`;
      
      await ensurePatient(email, {
        name,
        mobile_no,
        address: area.name,
        diagnosis: area.disease
      });
      patientCount++;
    }
  }

  console.log(`Seed complete. Total patients seeded: ${patientCount}`);
  await pool.end();
}

main().catch(async (e) => {
  console.error(e);
  if (pool) await pool.end();
  process.exit(1);
});
