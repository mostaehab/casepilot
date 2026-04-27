import { Request, Response } from "express";
import { authService } from "./auth.service.js";
import { fromNodeHeaders } from "better-auth/node";

export const authController = {
  login: async (req: Request, res: Response) => {
    try {
      const loginDetails = await authService.login(req.body);

      res.status(200).json({
        status: "success",
        message: "Login successful",
        data: loginDetails,
      });
    } catch (error: any) {
      res.status(400).json({
        status: "error",
        message: error.message || "An unknown error occurred",
      });
    }
  },

  register: async (req: Request, res: Response) => {
    try {
      const user = await authService.register(req.body);

      res.status(201).json({
        status: "success",
        message: "User registered successfully",
        data: user,
      });
    } catch (error: any) {
      res.status(400).json({
        status: "error",
        message: error.message || "An unknown error occurred",
      });
    }
  },

  logout: async (req: Request, res: Response) => {
    try {
      await authService.logout(fromNodeHeaders(req.headers));

      res.status(200).json({
        status: "success",
        message: "Logged out successfully",
      });
    } catch (error: any) {
      res.status(400).json({
        status: "error",
        message: error.message || "An unknown error occurred",
      });
    }
  },

  getCurrentUser: async (req: Request, res: Response) => {
    try {
      const user = await authService.getCurrentUser(
        fromNodeHeaders(req.headers),
      );

      if (!user) {
        return res
          .status(404)
          .json({ status: "error", message: "User not found" });
      }

      res.status(200).json({
        status: "success",
        message: "User retrieved successfully",
        data: user,
      });
    } catch (error: any) {
      res.status(400).json({
        status: "error",
        message: error.message || "An unknown error occurred",
      });
    }
  },

  changePassword: async (req: Request, res: Response) => {
    try {
      await authService.changePassword(req.body, fromNodeHeaders(req.headers));

      res.status(200).json({
        status: "success",
        message: "Password changed successfully",
      });
    } catch (error: any) {
      res.status(400).json({
        status: "error",
        message: error.message || "An unknown error occurred",
      });
    }
  },

  forgetPassword: async (req: Request, res: Response) => {
    try {
      const { email } = req.body;
      const message = await authService.forgetPassword(email);

      res.status(200).json({
        status: "success",
        message,
      });
    } catch (error: any) {
      res.status(400).json({
        status: "error",
        message: error.message || "An unknown error occurred",
      });
    }
  },

  resetPassword: async (req: Request, res: Response) => {
    try {
      await authService.resetPassword(req.body);

      res.status(200).json({
        status: "success",
        message: "Password reset successfully",
      });
    } catch (error: any) {
      res.status(400).json({
        status: "error",
        message: error.message || "An unknown error occurred",
      });
    }
  },
};
