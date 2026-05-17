// Smoke-test the case-file upload + download round-trip.
//
// Picks the most recently created case owned by the user identified by
// TEST_USER_EMAIL (env var, falls back to first row in `user` if unset),
// uploads a small PDF, downloads it via the service layer, and asserts
// the bytes match. Cleans up the uploaded file afterwards.
//
// Usage:
//   tsx scripts/test-case-file-download.ts
//   TEST_USER_EMAIL=foo@bar.com tsx scripts/test-case-file-download.ts

import dotenv from "dotenv";
// .env.local holds BLOB_READ_WRITE_TOKEN (vercel-pulled); plain .env is loaded
// by src/config/db.ts but doesn't include it.
dotenv.config({ path: ".env.local" });

import { pool } from "../src/config/db.js";
import { caseFileService } from "../src/modules/case-file/case-file.service.js";

const PDF_BYTES = Buffer.from(
  // Minimum-valid 1-page PDF
  "%PDF-1.1\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n" +
    "2 0 obj<</Type/Pages/Count 1/Kids[3 0 R]>>endobj\n" +
    "3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 100 100]>>endobj\n" +
    "xref\n0 4\n0000000000 65535 f\n0000000009 00000 n\n" +
    "0000000055 00000 n\n0000000102 00000 n\n" +
    "trailer<</Size 4/Root 1 0 R>>\nstartxref\n156\n%%EOF",
  "utf8",
);

const log = (msg: string) => console.log(`[test] ${msg}`);

const pickUserAndCase = async () => {
  const email = process.env.TEST_USER_EMAIL;

  if (email) {
    const userRow = await pool.query(
      `SELECT id, email FROM "user" WHERE email = $1`,
      [email],
    );
    if (userRow.rowCount === 0) throw new Error(`No user with email ${email}`);
    const user = userRow.rows[0];
    const caseRow = await pool.query(
      `SELECT id FROM "case" WHERE owner_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [user.id],
    );
    if (caseRow.rowCount === 0) {
      throw new Error(`User ${user.email} has no cases — create one first`);
    }
    return { userId: user.id, userEmail: user.email, caseId: caseRow.rows[0].id };
  }

  // Otherwise: first user who has any case
  const row = await pool.query(
    `SELECT u.id AS user_id, u.email, c.id AS case_id
       FROM "user" u
       JOIN "case" c ON c.owner_id = u.id
       ORDER BY c.created_at DESC
       LIMIT 1`,
  );
  if (row.rowCount === 0) throw new Error("No users with cases in DB");
  return {
    userId: row.rows[0].user_id,
    userEmail: row.rows[0].email,
    caseId: row.rows[0].case_id,
  };
};

const streamToBuffer = async (stream: ReadableStream): Promise<Buffer> => {
  const chunks: Buffer[] = [];
  const reader = stream.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(Buffer.from(value));
  }
  return Buffer.concat(chunks);
};

const run = async () => {
  const { userId, userEmail, caseId } = await pickUserAndCase();
  log(`using user ${userEmail} (${userId}), case ${caseId}`);

  const fakeFile = {
    originalname: "smoke-test.pdf",
    buffer: PDF_BYTES,
    mimetype: "application/pdf",
    size: PDF_BYTES.length,
  } as unknown as Express.Multer.File;

  log("uploading test PDF…");
  const uploaded = await caseFileService.uploadFile(caseId, fakeFile, userId);
  log(`  -> file id ${uploaded.id}, url ${uploaded.file_url}`);

  let downloadedBytes: Buffer | null = null;
  try {
    log("downloading via service.downloadFile…");
    const { stream, contentType, size, file } =
      await caseFileService.downloadFile(uploaded.id, userId);
    log(`  content-type=${contentType} size=${size} filename=${file.file_name}`);
    downloadedBytes = await streamToBuffer(stream);
    log(`  read ${downloadedBytes.length} bytes from stream`);

    if (downloadedBytes.length !== PDF_BYTES.length) {
      throw new Error(
        `byte length mismatch: uploaded ${PDF_BYTES.length}, downloaded ${downloadedBytes.length}`,
      );
    }
    if (!downloadedBytes.equals(PDF_BYTES)) {
      throw new Error("byte content mismatch");
    }
    if (contentType !== "application/pdf") {
      throw new Error(`content-type wrong: ${contentType}`);
    }
    log("PASS — bytes and metadata match");
  } finally {
    log("cleaning up test file…");
    try {
      await caseFileService.adminDeleteFile(uploaded.id);
    } catch (err) {
      log(`  cleanup failed (non-fatal): ${(err as Error).message}`);
    }
  }
};

run()
  .then(() => pool.end())
  .catch(async (err) => {
    console.error("[test] FAIL:", err);
    await pool.end();
    process.exit(1);
  });
