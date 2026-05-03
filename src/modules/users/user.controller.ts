import { Request, Response } from "express";
import { userService } from "./user.service.js";
import { asyncHandler } from "../../middlewares/asyncHandler.js";
import { badRequest } from "../../lib/errors.js";

const requireId = (id: unknown): string => {
  if (typeof id !== "string" || !id) throw badRequest("User ID is required");
  return id;
};

export const userController = {
  getUserById: asyncHandler(async (req: Request, res: Response) => {
    const id = requireId(req.params.id);
    const user = await userService.findUserById(id);
    res.status(200).json({ status: "success", data: user });
  }),

  getAllUsers: asyncHandler(async (req: Request, res: Response) => {
    const { data, pagination } = await userService.findAllUsers(req.query);
    res.status(200).json({ status: "success", data, pagination });
  }),

  updateUserById: asyncHandler(async (req: Request, res: Response) => {
    const id = requireId(req.params.id);
    const updatedUser = await userService.updateUserById(id, req.body);
    res.status(200).json({
      status: "success",
      message: "User updated successfully",
      data: updatedUser,
    });
  }),

  deleteUserById: asyncHandler(async (req: Request, res: Response) => {
    const id = requireId(req.params.id);
    await userService.deleteUserById(id);
    res
      .status(200)
      .json({ status: "success", message: "User deactivated successfully" });
  }),

  // ---- Admin overrides ----

  adminRestoreUser: asyncHandler(async (req: Request, res: Response) => {
    const data = await userService.adminRestoreUser(req.params.id as string);
    res
      .status(200)
      .json({ status: "success", message: "User restored", data });
  }),

  adminHardDeleteUser: asyncHandler(async (req: Request, res: Response) => {
    await userService.adminHardDeleteUser(
      req.params.id as string,
      req.user.id,
    );
    res
      .status(200)
      .json({ status: "success", message: "User permanently deleted" });
  }),

  adminUpdateUserRole: asyncHandler(async (req: Request, res: Response) => {
    const data = await userService.adminUpdateUserRole(
      req.params.id as string,
      req.body.role,
    );
    res
      .status(200)
      .json({ status: "success", message: "User role updated", data });
  }),
};
