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

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('Starting migration...');

    // 1. Update doctors table
    console.log('Updating doctors table...');
    await client.query(`
      ALTER TABLE doctors 
      ADD COLUMN IF NOT EXISTS doctor_registration_number TEXT,
      ADD COLUMN IF NOT EXISTS star_ratings DECIMAL(3,2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'pending',
      ADD COLUMN IF NOT EXISTS address TEXT,
      ADD COLUMN IF NOT EXISTS upi_id TEXT,
      ADD COLUMN IF NOT EXISTS account_details JSONB,
      ADD COLUMN IF NOT EXISTS gender TEXT,
      ADD COLUMN IF NOT EXISTS age INTEGER;
    `);

    // 2. Update patients table
    console.log('Updating patients table...');
    await client.query(`
      ALTER TABLE patients 
      ADD COLUMN IF NOT EXISTS diagnosis TEXT,
      ADD COLUMN IF NOT EXISTS symptoms TEXT,
      ADD COLUMN IF NOT EXISTS current_medications TEXT,
      ADD COLUMN IF NOT EXISTS prescription_upload TEXT,
      ADD COLUMN IF NOT EXISTS upi_id TEXT,
      ADD COLUMN IF NOT EXISTS account_details JSONB,
      ADD COLUMN IF NOT EXISTS gender TEXT,
      ADD COLUMN IF NOT EXISTS age INTEGER;
    `);

    // 3. Update appointments table
    console.log('Updating appointments table...');
    await client.query(`
      ALTER TABLE appointments 
      ADD COLUMN IF NOT EXISTS appointment_code TEXT UNIQUE,
      ADD COLUMN IF NOT EXISTS is_video_consultation BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS meeting_link TEXT,
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
    `);

    // 4. Update consultations table
    console.log('Updating consultations table...');
    await client.query(`
      ALTER TABLE consultations 
      ADD COLUMN IF NOT EXISTS appointment_id INTEGER REFERENCES appointments(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS diagnosis TEXT NOT NULL DEFAULT 'Not specified',
      ADD COLUMN IF NOT EXISTS symptoms_observed TEXT,
      ADD COLUMN IF NOT EXISTS blood_pressure TEXT,
      ADD COLUMN IF NOT EXISTS heart_rate INTEGER,
      ADD COLUMN IF NOT EXISTS temperature DECIMAL(5,2),
      ADD COLUMN IF NOT EXISTS weight DECIMAL(5,2),
      ADD COLUMN IF NOT EXISTS diabetes_reading DECIMAL(5,2),
      ADD COLUMN IF NOT EXISTS notes TEXT,
      ADD COLUMN IF NOT EXISTS follow_up_date DATE;
    `);

    // 5. Update transactions table
    console.log('Updating transactions table...');
    await client.query(`
      ALTER TABLE transactions 
      ADD COLUMN IF NOT EXISTS appointment_id INTEGER REFERENCES appointments(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS consultation_id INTEGER REFERENCES consultations(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS manual_utr TEXT,
      ADD COLUMN IF NOT EXISTS payment_proof_url TEXT,
      ADD COLUMN IF NOT EXISTS metadata JSONB,
      ADD COLUMN IF NOT EXISTS medical_id INTEGER REFERENCES medicals(id) ON DELETE SET NULL;
    `);

    // Clean up Razorpay columns if they exist (optional, keeping for flexibility)
    console.log('Cleaning up Razorpay columns (if needed)...');
    // await client.query(`ALTER TABLE transactions DROP COLUMN IF EXISTS razorpay_order_id, DROP COLUMN IF EXISTS razorpay_payment_id, DROP COLUMN IF EXISTS razorpay_signature;`);

    // Fix status check constraint
    console.log('Updating appointments status constraint...');
    try {
      await client.query(`ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_status_check;`);
      await client.query(`
        ALTER TABLE appointments 
        ADD CONSTRAINT appointments_status_check 
        CHECK (status IN ('pending', 'accepted', 'rejected', 'cancelled', 'completed', 'altered', 'confirmed'));
      `);
    } catch (e) {
      console.log('Note: Could not update status constraint, it might not exist or already be correct.');
    }

    // 6. Create/Update medicals table (managed by superadmin)
    console.log('Creating/Updating medicals table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS medicals (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        contact TEXT,
        address TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    await client.query(`
      ALTER TABLE medicals 
      ADD COLUMN IF NOT EXISTS latitude DECIMAL(10,8),
      ADD COLUMN IF NOT EXISTS longitude DECIMAL(11,8),
      ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS upi_id TEXT,
      ADD COLUMN IF NOT EXISTS account_details JSONB;
    `);

    // 7. Update medicalists table
    console.log('Updating medicalists table...');
    await client.query(`
      ALTER TABLE medicalists 
      ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
      ADD COLUMN IF NOT EXISTS medical_id INTEGER REFERENCES medicals(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS upi_id TEXT,
      ADD COLUMN IF NOT EXISTS account_details JSONB;
    `);

    // 5. Cleanup roles (optional but good for consistency)
    console.log('Cleaning up roles...');
    // We'll keep the existing roles for now to avoid breaking existing data, 
    // but the app logic will only use patient, doctor, and superadmin.

    console.log('Migration completed successfully.');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
