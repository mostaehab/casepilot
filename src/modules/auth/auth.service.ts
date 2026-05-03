import { userRepository } from "../users/user.repository.js";
import {
  loginInput,
  registerInput,
  changePasswordInput,
  resetPasswordInput,
} from "./auth.validation.js";
import { auth } from "../../lib/auth.js";
import {
  AppError,
  conflict,
  notFound,
  unauthorized,
} from "../../lib/errors.js";

const wrapAuthError = (err: any, fallback: string, fallbackStatus = 400) => {
  if (err instanceof AppError) return err;
  const message =
    typeof err?.message === "string" && err.message ? err.message : fallback;
  const status =
    typeof err?.status === "number"
      ? err.status
      : typeof err?.statusCode === "number"
        ? err.statusCode
        : fallbackStatus;
  return new AppError(status, message);
};

export const authService = {
  login: async (input: loginInput) => {
    const { email, password } = input;
    try {
      const { headers, response } = await auth.api.signInEmail({
        body: { email, password },
        returnHeaders: true,
      });
      const user = await userRepository.findUserById(response.user.id);
      return { headers, token: response.token, user };
    } catch (err: any) {
      throw wrapAuthError(err, "Invalid email or password", 401);
    }
  },

  register: async (input: registerInput) => {
    const { email, password, name, nationalNumber, barLicenseNumber } = input;

    const existingUser = await userRepository.findUserByEmail(email);
    if (existingUser) {
      throw conflict("User with this email already exists");
    }

    try {
      const { headers, response } = await auth.api.signUpEmail({
        body: { name, email, password, nationalNumber, barLicenseNumber },
        returnHeaders: true,
      });
      return { headers, user: response.user };
    } catch (err: any) {
      throw wrapAuthError(err, "Failed to register user", 400);
    }
  },

  logout: async (headers: Headers) => {
    try {
      const { headers: responseHeaders } = await auth.api.signOut({
        headers,
        returnHeaders: true,
      });
      return { headers: responseHeaders };
    } catch (err: any) {
      throw wrapAuthError(err, "Logout failed", 400);
    }
  },

  getCurrentUser: async (headers: Headers) => {
    const session = await auth.api.getSession({ headers });
    if (!session) {
      throw unauthorized("No active session");
    }
    const user = await userRepository.findUserById(session.user.id);
    if (!user) {
      throw notFound("User not found");
    }
    return user;
  },

  changePassword: async (input: changePasswordInput, headers: Headers) => {
    const { oldPassword, newPassword } = input;
    try {
      await auth.api.changePassword({
        body: {
          currentPassword: oldPassword,
          newPassword,
          revokeOtherSessions: true,
        },
        headers,
      });
    } catch (err: any) {
      throw wrapAuthError(err, "Failed to change password", 400);
    }
  },

  forgetPassword: async (email: string) => {
    const user = await userRepository.findUserByEmail(email);
    if (!user) {
      // avoid leaking which emails exist
      return "If an account exists, password reset instructions have been sent";
    }

    try {
      await auth.api.requestPasswordReset({
        body: {
          email,
          redirectTo: `${process.env.FRONTEND_URL}/reset-password`,
        },
      });
      return "Password reset instructions sent to your email";
    } catch (err: any) {
      throw wrapAuthError(err, "Failed to send reset email", 400);
    }
  },

  resetPassword: async (input: resetPasswordInput) => {
    const { token, newPassword } = input;
    try {
      await auth.api.resetPassword({ body: { token, newPassword } });
    } catch (err: any) {
      throw wrapAuthError(err, "Failed to reset password", 400);
    }
  },
};

