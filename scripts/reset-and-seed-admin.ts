import crypto from "crypto";
import { pool } from "../src/config/db.js";
import { auth } from "../src/lib/auth.js";

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

const ADMIN_EMAIL = "mostafa@casepilot.com";
const ADMIN_NAME = "Mostafa (Super Admin)";

const genPassword = () =>
  crypto.randomBytes(18).toString("base64").replace(/[+/=]/g, "") + "A1!";

const run = async () => {
  const list = TABLES.map((t) => `"${t}"`).join(", ");
  console.log(`[reset] TRUNCATE ${list} RESTART IDENTITY CASCADE`);
  await pool.query(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`);

  const password = genPassword();
  console.log(`[reset] creating admin via better-auth signUpEmail`);
  await auth.api.signUpEmail({
    body: {
      name: ADMIN_NAME,
      email: ADMIN_EMAIL,
      password,
      nationalNumber: "SUPERADMIN-0001",
      barLicenseNumber: "SUPERADMIN-0001",
    },
  });

  console.log(`[reset] promoting ${ADMIN_EMAIL} to role=admin`);
  const { rowCount } = await pool.query(
    `UPDATE "user" SET role = 'admin', "emailVerified" = true WHERE email = $1`,
    [ADMIN_EMAIL],
  );
  if (rowCount !== 1) {
    throw new Error(`expected to update 1 row, updated ${rowCount}`);
  }

  console.log("\n========================================");
  console.log("  SUPER ADMIN CREDENTIALS");
  console.log("========================================");
  console.log(`  Email:    ${ADMIN_EMAIL}`);
  console.log(`  Password: ${password}`);
  console.log("========================================\n");
  console.log("Save this password now — it will not be shown again.");

  await pool.end();
};

run().catch(async (err) => {
  console.error("[reset] failed:", err);
  await pool.end();
  process.exit(1);
});
