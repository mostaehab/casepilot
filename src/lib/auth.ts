import { betterAuth } from "better-auth";
import dotenv from "dotenv";
import { ROLES } from "./roles.js";
import { emailService } from "./email.js";
import { pool } from "../config/db.js";

dotenv.config();

export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET!,
  baseURL: process.env.BETTER_AUTH_URL,
  database: pool,
  advanced: {
    useSecureCookies: process.env.NODE_ENV === "production",
    defaultCookieAttributes: {
      sameSite: "none",
      secure: true,
    },
  },
  trustedOrigins: (process.env.CORS_ORIGINS ?? "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
    sendResetPassword: async ({ user, url }) => {
      await emailService.sendPasswordResetEmail(user.email, user.name, url);
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      await emailService.sendVerificationEmail(user.email, user.name, url);
    },
  },

  user: {
    additionalFields: {
      role: {
        type: "string",
        required: true,
        defaultValue: ROLES.LAWYER,
        input: false,
      },
      nationalNumber: {
        type: "string",
        required: true,
      },
      barLicenseNumber: {
        type: "string",
        required: true,
      },
      isActive: {
        type: "boolean",
        required: true,
        defaultValue: true,
        input: false,
      },
    },
  },
});
