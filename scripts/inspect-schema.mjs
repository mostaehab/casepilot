import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

const connectionString = process.env.DATABASE_URL?.replace(
  "channel_binding=require",
  "channel_binding=prefer",
);

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

const { rows: tables } = await pool.query(`
  SELECT table_name
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_type = 'BASE TABLE'
  ORDER BY table_name;
`);

for (const { table_name } of tables) {
  const { rows } = await pool.query(
    `
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = $1
    ORDER BY ordinal_position;
  `,
    [table_name],
  );
  console.log(`\n=== ${table_name} ===`);
  for (const c of rows) {
    console.log(
      `  ${c.column_name.padEnd(28)} ${c.data_type.padEnd(28)} null=${c.is_nullable} default=${c.column_default ?? ""}`,
    );
  }
  const { rows: countRows } = await pool.query(
    `SELECT COUNT(*)::int AS n FROM "${table_name}"`,
  );
  console.log(`  rows: ${countRows[0].n}`);
}

await pool.end();
