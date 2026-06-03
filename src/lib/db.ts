import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.warn("WARNING: DATABASE_URL is not set. Ensure it is configured in .env.local or your environment variables.");
}

// Create a single database pool instance
const pool = new Pool({
  connectionString,
  ssl: connectionString?.includes('neon.tech') || connectionString?.includes('vercel-storage.com')
    ? { rejectUnauthorized: false } 
    : undefined,
  max: 10, // pool size limit
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

// Reusable query helper
export async function query(text: string, params?: any[]) {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    // Useful for debugging database response times
    // console.log('executed query', { text, duration, rows: res.rowCount });
    return res;
  } catch (error) {
    console.error('Database query error:', { text, error });
    throw error;
  }
}

export default pool;
