import { z } from "zod";

export const userModel = z.object({
  name: z.string().min(3, "Full name is required"),
  email: z.string().email("Invalid email address"),
  role: z
    .enum(["admin", "lawyer", "assistant"], "Role is required")
    .default("lawyer"),
  barLicenseNumber: z.string().min(1, "Bar license number is required"),
  nationalNumber: z.string().min(1, "National number is required"),
});

export type createUserInput = z.infer<typeof userModel>;

export const updateUserModel = z.object({
  name: z.string().min(3, "Full name is required"),
  email: z.string().email("Invalid email address"),
});

export type updateUserInput = z.infer<typeof updateUserModel>;
