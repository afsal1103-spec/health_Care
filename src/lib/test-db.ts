import { query } from './db';

async function testConnection() {
  try {
    const result = await query('SELECT NOW()');
    console.log('Database connected successfully:', result.rows[0]);
  } catch (error) {
    console.error('Database connection failed:', error);
  }
}

testConnection();