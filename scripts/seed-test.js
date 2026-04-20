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
});

async function seed() {
  const client = await pool.connect();
  try {
    console.log('Clearing existing data for a clean test...');
    await client.query('TRUNCATE appointments, prescriptions, consultations, patients, doctors, medicals, users RESTART IDENTITY CASCADE');

    const hashedReq = await bcrypt.hash('Password@123', 10);

    // 1. Create Super Admin
    console.log('Creating Super Admin...');
    await client.query(
      "INSERT INTO users (email, password, user_type, is_active) VALUES ($1, $2, $3, true)",
      ['admin@test.com', hashedReq, 'superadmin']
    );

    // 2. Create Approved Doctor
    console.log('Creating Approved Doctor...');
    const docRes = await client.query(
      "INSERT INTO users (email, password, user_type, is_active) VALUES ($1, $2, $3, true) RETURNING id",
      ['doctor@test.com', hashedReq, 'doctor']
    );
    await client.query(
      `INSERT INTO doctors (user_id, name, specialist, contact, education, doctor_registration_number, consultation_fee, available_days, available_time_start, available_time_end, is_available, approval_status, star_ratings) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true, 'approved', 4.8)`,
      [docRes.rows[0].id, 'Arun Kumar', 'Neurologist', '9876543210', 'MBBS, MD (Neurology)', 'REG12345', 800, '["Monday","Tuesday","Wednesday","Thursday","Friday"]', '09:00:00', '17:00:00']
    );

    // 3. Create Pending Doctor
    console.log('Creating Pending Doctor...');
    const pendingRes = await client.query(
      "INSERT INTO users (email, password, user_type, is_active) VALUES ($1, $2, $3, true) RETURNING id",
      ['pending@test.com', hashedReq, 'doctor']
    );
    await client.query(
      `INSERT INTO doctors (user_id, name, specialist, contact, education, doctor_registration_number, consultation_fee, available_days, available_time_start, available_time_end, is_available, approval_status) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true, 'pending')`,
      [pendingRes.rows[0].id, 'Suresh Raina', 'Cardiologist', '9876543211', 'MBBS, MD (Cardio)', 'REG99999', 1000, '["Monday","Wednesday","Friday"]', '10:00:00', '16:00:00']
    );

    // 4. Create Patient
    console.log('Creating Patient...');
    const patRes = await client.query(
      "INSERT INTO users (email, password, user_type, is_active) VALUES ($1, $2, $3, true) RETURNING id",
      ['patient@test.com', hashedReq, 'patient']
    );
    await client.query(
      `INSERT INTO patients (user_id, name, mobile_no, address, diagnosis, symptoms, current_medications) 
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [patRes.rows[0].id, 'John Doe', '9000011111', '123 Main St, City', 'Hypertension', 'Headache, Dizziness', 'Amlodipine 5mg']
    );

    // 5. Create Medical Store
    console.log('Creating Medical Store...');
    await client.query(
      "INSERT INTO medicals (name, contact, address) VALUES ($1, $2, $3)",
      ['HealthPlus Pharmacy', '044-22334455', 'Opposite City Hospital']
    );

    console.log('Test seeding completed successfully!');
    console.log('Login Details (Password for all: Password@123):');
    console.log('- Admin: admin@test.com');
    console.log('- Doctor (Approved): doctor@test.com');
    console.log('- Doctor (Pending): pending@test.com (Cannot login until approved)');
    console.log('- Patient: patient@test.com');

  } catch (err) {
    console.error('Seed failed:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
