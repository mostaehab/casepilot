import { Request, Response } from "express";
import { userService } from "./user.service";

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

      if (!user) {
        return res
          .status(404)
          .json({ status: "error", message: "User not found" });
      }

      res.status(200).json({ user });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "An unknown error occurred";
      res.status(404).json({ status: "error", message: errorMessage });
    }
  },

  getAllUsers: async (req: Request, res: Response) => {
    try {
      const users = await userService.findAllUsers();
      if (!users || users.length === 0) {
        return res
          .status(404)
          .json({ status: "error", message: "No users found" });
      }
      res.status(200).json({ users });
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
      res.status(200).json({ user: updatedUser });
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
        .status(204)
        .json({ status: "success", message: "User deactivated successfully" });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "An unknown error occurred";
      res.status(500).json({ status: "error", message: errorMessage });
    }
  },
};
