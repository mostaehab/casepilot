import { betterAuth } from "better-auth";
import dotenv from "dotenv";
import { Pool } from "pg";
import { ROLES } from "./roles";

dotenv.config();

export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET!,
  baseURL: process.env.BETTER_AUTH_URL,
  database: new Pool({
    connectionString: process.env.DATABASE_URL?.replace(
      "channel_binding=require",
      "channel_binding=prefer",
    ),
    ssl: { rejectUnauthorized: false },
  }),
  emailAndPassword: {
    enabled: true,
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
