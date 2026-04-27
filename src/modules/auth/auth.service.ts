import { userRepository } from "../users/user.repository.js";
import {
  loginInput,
  registerInput,
  changePasswordInput,
  resetPasswordInput,
} from "./auth.validation.js";
import { auth } from "../../lib/auth.js";

export const authService = {
  login: async (input: loginInput) => {
    const { email, password } = input;

    try {
      const { headers, response } = await auth.api.signInEmail({
        body: { email, password },
        returnHeaders: true,
      });

      const user = await userRepository.findUserById(response.user.id);

      return {
        headers,
        token: response.token,
        user,
      };
    } catch (error: any) {
      throw new Error(error.message ?? "Invalid email or password");
    }
  },

  register: async (input: registerInput) => {
    const { email, password, name, nationalNumber, barLicenseNumber } = input;

    const existingUser = await userRepository.findUserByEmail(email);

    if (existingUser) {
      throw new Error("User with this email already exists");
    }

    try {
      const { headers, response } = await auth.api.signUpEmail({
        body: {
          name,
          email,
          password,
          nationalNumber,
          barLicenseNumber,
        },
        returnHeaders: true,
      });

      return { headers, user: response.user };
    } catch (error: any) {
      throw new Error(error.message ?? "Failed to register user");
    }
  },

  logout: async (headers: Headers) => {
    try {
      const { headers: responseHeaders } = await auth.api.signOut({
        headers,
        returnHeaders: true,
      });
      return { headers: responseHeaders };
    } catch (error: any) {
      throw new Error(error.message ?? "Logout failed");
    }
  },

  getCurrentUser: async (headers: Headers) => {
    try {
      const session = await auth.api.getSession({ headers });

      if (!session) {
        throw new Error("No active session");
      }

      const user = await userRepository.findUserById(session.user.id);

      return user;
    } catch (error: any) {
      throw new Error(error.message ?? "Invalid session");
    }
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
    } catch (error: any) {
      throw new Error(error.message ?? "Failed to change password");
    }
  },

  forgetPassword: async (email: string) => {
    try {
      const user = await userRepository.findUserByEmail(email);

      if (!user) {
        throw new Error("User not found");
      }

      await auth.api.requestPasswordReset({
        body: {
          email,
          redirectTo: `${process.env.FRONTEND_URL}/reset-password`,
        },
      });

      return "Password reset instructions sent to your email";
    } catch (error: any) {
      throw new Error(error.message ?? "Failed to send reset email");
    }
  },

  resetPassword: async (input: resetPasswordInput) => {
    const { token, newPassword } = input;

    try {
      await auth.api.resetPassword({
        body: {
          token,
          newPassword,
        },
      });
    } catch (error: any) {
      throw new Error(error.message ?? "Failed to reset password");
    }
  },
};
