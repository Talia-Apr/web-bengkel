import mysql from "mysql2/promise";

const globalForDb = globalThis as unknown as {
  pool: mysql.Pool | undefined;
};

// Gunakan uri jika ada DATABASE_URL, jika tidak pakai config lama (untuk lokal)
const pool =
  globalForDb.pool ??
  mysql.createPool(
    process.env.DATABASE_URL 
      ? { 
          uri: process.env.DATABASE_URL,
          ssl: { rejectUnauthorized: false } // WAJIB untuk Aiven di Vercel
        }
      : {
          host: process.env.DB_HOST || "localhost",
          user: process.env.DB_USER || "root",
          password: process.env.DB_PASSWORD || "",
          database: process.env.DB_NAME || "app_bengkel",
        }
  );

if (process.env.NODE_ENV !== "production") {
  globalForDb.pool = pool;
}

export default pool;