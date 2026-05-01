import { Request, Response } from "express";
import { userService } from "./user.service.js";

export const userController = {
  getUserById: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      if (!id || Array.isArray(id)) {
        return res
          .status(400)
          .json({ status: "error", message: "User ID is required" });
      }
      const user = await userService.findUserById(id);
      res.status(200).json({ status: "success", data: user });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "An unknown error occurred";
      res.status(404).json({ status: "error", message: errorMessage });
    }
  },

  getAllUsers: async (req: Request, res: Response) => {
    try {
      const { data, pagination } = await userService.findAllUsers(req.query);
      res.status(200).json({ status: "success", data, pagination });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "An unknown error occurred";
      res.status(500).json({ status: "error", message: errorMessage });
    }
  },

  updateUserById: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      if (!id || Array.isArray(id)) {
        return res
          .status(400)
          .json({ status: "error", message: "User ID is required" });
      }
      const updatedUser = await userService.updateUserById(id, req.body);
      res.status(200).json({
        status: "success",
        message: "User updated successfully",
        data: updatedUser,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "An unknown error occurred";
      res.status(500).json({ status: "error", message: errorMessage });
    }
  },

  deleteUserById: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      if (!id || Array.isArray(id)) {
        return res
          .status(400)
          .json({ status: "error", message: "User ID is required" });
      }
      await userService.deleteUserById(id);
      res
        .status(200)
        .json({ status: "success", message: "User deactivated successfully" });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "An unknown error occurred";
      res.status(500).json({ status: "error", message: errorMessage });
    }
  },

  // ---- Admin overrides ----

  adminRestoreUser: async (req: Request, res: Response) => {
    try {
      const data = await userService.adminRestoreUser(req.params.id as string);
      res.status(200).json({
        status: "success",
        message: "User restored",
        data,
      });
    } catch (error: any) {
      res.status(400).json({
        status: "error",
        message: error.message || "An unknown error occurred",
      });
    }
  },

  adminHardDeleteUser: async (req: Request, res: Response) => {
    try {
      await userService.adminHardDeleteUser(
        req.params.id as string,
        req.user.id,
      );
      res.status(200).json({
        status: "success",
        message: "User permanently deleted",
      });
    } catch (error: any) {
      res.status(400).json({
        status: "error",
        message: error.message || "An unknown error occurred",
      });
    }
  },

  adminUpdateUserRole: async (req: Request, res: Response) => {
    try {
      const data = await userService.adminUpdateUserRole(
        req.params.id as string,
        req.body.role,
      );
      res.status(200).json({
        status: "success",
        message: "User role updated",
        data,
      });
    } catch (error: any) {
      res.status(400).json({
        status: "error",
        message: error.message || "An unknown error occurred",
      });
    }
  },
};
