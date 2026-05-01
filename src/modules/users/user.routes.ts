import { Router } from "express";
import { userController } from "./user.controller.js";
import {
  adminProtected,
  userProtected,
} from "../../middlewares/roles.middleware.js";
import { validate } from "../../middlewares/validate.js";
import {
  updateUserModel,
  updateUserRoleModel,
} from "./user.validation.js";

const router = Router();

router.get("/", adminProtected, userController.getAllUsers);

// ---- Admin-only routes ----
router.patch(
  "/admin/:id/restore",
  adminProtected,
  userController.adminRestoreUser,
);
router.patch(
  "/admin/:id/role",
  adminProtected,
  validate(updateUserRoleModel),
  userController.adminUpdateUserRole,
);
router.delete(
  "/admin/:id",
  adminProtected,
  userController.adminHardDeleteUser,
);

router.use(userProtected);

router
  .get("/:id", userController.getUserById)
  .patch("/:id", validate(updateUserModel), userController.updateUserById)
  .patch("/deactivate/:id", userController.deleteUserById);

export default router;
