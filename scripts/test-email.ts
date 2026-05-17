import { emailService } from "../src/lib/email.js";

const to = process.argv[2] ?? process.env.SMTP_USER;
if (!to) {
  console.error("Usage: tsx scripts/test-email.ts <recipient>");
  process.exit(1);
}

const FRONTEND_URL = process.env.FRONTEND_URL ?? "http://localhost:3000";

const run = async () => {
  console.log(`[test] sending three test emails to ${to}`);

  console.log("[test] 1/3 verification email…");
  await emailService.sendVerificationEmail(
    to,
    "Test User",
    `${FRONTEND_URL}/verify?token=test-verification-token-123`,
  );

  console.log("[test] 2/3 password reset email…");
  await emailService.sendPasswordResetEmail(
    to,
    "Test User",
    `${FRONTEND_URL}/reset-password?token=test-reset-token-456`,
  );

  console.log("[test] 3/3 team invite email…");
  await emailService.sendTeamInviteEmail(
    to,
    "Test User",
    "Acme Legal",
    "Mostafa",
    "lawyer",
    "test-team-id-789",
  );

  console.log("[test] done — check the inbox (and spam folder).");
};

run().catch((err) => {
  console.error("[test] failed:", err);
  process.exit(1);
});
