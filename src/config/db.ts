import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

const connectionString = process.env.DATABASE_URL?.replace(
  "channel_binding=require",
  "channel_binding=prefer",
);

export const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
  max: Number(process.env.DB_POOL_MAX ?? 10),
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
  statement_timeout: 15_000,
  query_timeout: 15_000,
});

pool.on("error", (err) => {
  console.error("[db] idle client error:", err);
});
