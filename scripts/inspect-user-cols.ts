import { pool } from "../src/config/db.js";

const { rows } = await pool.query(
  `SELECT column_name FROM information_schema.columns WHERE table_name = 'user' AND table_schema = 'public' ORDER BY ordinal_position`,
);
console.log(rows.map((r) => r.column_name).join("\n"));
await pool.end();
