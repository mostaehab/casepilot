import { pool } from "../src/config/db.js";

const TABLES = [
  "case_file",
  "case_assignment",
  "case",
  "team_member",
  "team",
  "session",
  "account",
  "verification",
  "user",
];

const run = async () => {
  const list = TABLES.map((t) => `"${t}"`).join(", ");
  console.log(`[wipe] TRUNCATE ${list} RESTART IDENTITY CASCADE`);
  await pool.query(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`);
  console.log("[wipe] done");
  await pool.end();
};

run().catch(async (err) => {
  console.error("[wipe] failed:", err);
  await pool.end();
  process.exit(1);
});
