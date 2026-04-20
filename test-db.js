const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

function loadEnv() {
  const envPath = path.join(__dirname, '.env.local');
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

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'healthcare_system',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'your_password',
};

async function test() {
  console.log('Testing connection with config:', { ...dbConfig, password: '****' });
  
  // Try port from env first, then 5432, then 5433
  const portsToTry = [parseInt(process.env.DB_PORT || '5432'), 5432, 5433];
  const uniquePorts = [...new Set(portsToTry)];

  for (const port of uniquePorts) {
    console.log(`\nAttempting connection on port ${port}...`);
    const pool = new Pool({ ...dbConfig, port });
    
    try {
      const result = await pool.query('SELECT NOW()');
      console.log(`✅ SUCCESS: Connected on port ${port}`);
      console.log('Current time from DB:', result.rows[0].now);
      await pool.end();
      return; // Exit if successful
    } catch (err) {
      console.log(`❌ FAILED: Port ${port} failed with error: ${err.message}`);
      await pool.end();
    }
  }

  console.log('\nAll connection attempts failed. Please check your PostgreSQL service and credentials.');
}

test();