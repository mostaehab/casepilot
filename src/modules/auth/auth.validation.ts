import { z } from "zod";

export const loginModel = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters long"),
});

export type loginInput = z.infer<typeof loginModel>;

export const registerModel = z.object({
  name: z.string().min(3, "Full name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters long"),
  barLicenseNumber: z.string().min(1, "Bar license number is required"),
  nationalNumber: z.string().min(1, "National number is required"),
});

export type registerInput = z.infer<typeof registerModel>;

export const changePasswordModel = z.object({
  oldPassword: z
    .string()
    .min(6, "Old password must be at least 6 characters long"),
  newPassword: z
    .string()
    .min(6, "New password must be at least 6 characters long"),
});

export const resetPasswordModel = z.object({
  token: z.string().min(1, "Reset token is required"),
  newPassword: z
    .string()
    .min(6, "New password must be at least 6 characters long"),
});

export type resetPasswordInput = z.infer<typeof resetPasswordModel>;

export type changePasswordInput = z.infer<typeof changePasswordModel>;
