import { Pool, PoolClient, QueryResult } from "pg";

const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "5433"),
  database: process.env.DB_NAME || "healthcare_system",
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "your_password",
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on("error", (err) => {
  console.error("Unexpected error on idle client", err);
  process.exit(-1);
});

export async function query(
  text: string,
  params?: (string | number | boolean | null | undefined | Date)[],
): Promise<QueryResult> {
  const client = await pool.connect();
  try {
    const result = await client.query(text, params);
    return result;
  } catch (error) {
    console.error("Database query error:", error);
    throw error;
  } finally {
    client.release();
  }
}

export async function transaction<T>(
  callback: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export function toCamelCase(obj: unknown): unknown {
  if (Array.isArray(obj)) {
    return obj.map(toCamelCase);
  } else if (obj instanceof Date) {
    return obj.toISOString();
  } else if (obj !== null && typeof obj === "object") {
    return Object.keys(obj as Record<string, unknown>).reduce(
      (acc, key) => {
        const camelKey = key.replace(/_([a-z])/g, (_, letter) =>
          letter.toUpperCase(),
        );
        acc[camelKey] = toCamelCase((obj as Record<string, unknown>)[key]);
        return acc;
      },
      {} as Record<string, unknown>,
    );
  }
  return obj;
}

export default pool;
