import nodemailer, { Transporter } from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const APP_NAME = "CasePilot";
const FRONTEND_URL = process.env.FRONTEND_URL ?? "http://localhost:3000";
const FROM = process.env.SMTP_FROM ?? process.env.SMTP_USER ?? "";

let transporter: Transporter | null = null;
const getTransporter = (): Transporter | null => {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT ?? 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) return null;

  transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
  return transporter;
};

const layout = (title: string, body: string) => `
  <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; color: #111;">
    <h1 style="font-size: 22px; margin: 0 0 16px;">${title}</h1>
    ${body}
    <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;" />
    <p style="color: #888; font-size: 12px; margin: 0;">${APP_NAME}</p>
  </div>
`;

const button = (href: string, label: string) => `
  <p style="margin: 24px 0;">
    <a href="${href}" style="display: inline-block; background: #111; color: #fff; padding: 12px 20px; border-radius: 6px; text-decoration: none; font-weight: 600;">${label}</a>
  </p>
  <p style="color: #555; font-size: 13px;">Or paste this URL into your browser:<br/><span style="word-break: break-all;">${href}</span></p>
`;

const send = async (to: string, subject: string, html: string) => {
  const tx = getTransporter();
  if (!tx) {
    console.warn(
      `[email] SMTP not configured (SMTP_HOST/USER/PASS), skipping email to ${to}`,
    );
    return;
  }
  try {
    await tx.sendMail({ from: FROM, to, subject, html });
  } catch (err) {
    console.error(`[email] failed to send to ${to}:`, err);
  }
};

export const emailService = {
  sendVerificationEmail: async (
    to: string,
    name: string | null,
    url: string,
  ) => {
    const greeting = name ? `Hi ${name},` : "Hi,";
    const html = layout(
      `Verify your email`,
      `<p>${greeting}</p>
       <p>Welcome to ${APP_NAME}. Please confirm your email address to activate your account.</p>
       ${button(url, "Verify email")}
       <p style="color: #888; font-size: 12px;">If you didn't create this account, you can safely ignore this email.</p>`,
    );
    await send(to, `Verify your ${APP_NAME} email`, html);
  },

  sendPasswordResetEmail: async (
    to: string,
    name: string | null,
    url: string,
  ) => {
    const greeting = name ? `Hi ${name},` : "Hi,";
    const html = layout(
      `Reset your password`,
      `<p>${greeting}</p>
       <p>We received a request to reset your ${APP_NAME} password. Click the button below to choose a new one. This link expires in 1 hour.</p>
       ${button(url, "Reset password")}
       <p style="color: #888; font-size: 12px;">If you didn't request this, you can safely ignore this email — your password won't change.</p>`,
    );
    await send(to, `Reset your ${APP_NAME} password`, html);
  },

  sendTeamInviteEmail: async (
    to: string,
    inviteeName: string | null,
    teamName: string,
    inviterName: string,
    role: string,
    teamId: string,
  ) => {
    const greeting = inviteeName ? `Hi ${inviteeName},` : "Hi,";
    const acceptUrl = `${FRONTEND_URL}/teams/${teamId}/invitations`;
    const html = layout(
      `You've been invited to join ${teamName}`,
      `<p>${greeting}</p>
       <p><strong>${inviterName}</strong> invited you to join <strong>${teamName}</strong> on ${APP_NAME} as a <strong>${role}</strong>.</p>
       ${button(acceptUrl, "View invitation")}`,
    );
    await send(to, `${inviterName} invited you to ${teamName}`, html);
  },
};
