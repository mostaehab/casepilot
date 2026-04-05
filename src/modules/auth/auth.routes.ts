import { Router } from "express";
import { authController } from "./auth.controller";
import { userProtected } from "../../middlewares/roles.middleware";
import { validate } from "../../middlewares/validate";
import {
  loginModel,
  registerModel,
  changePasswordModel,
  resetPasswordModel,
} from "./auth.validation";

const router = Router();

router.post("/login", validate(loginModel), authController.login);
router.post("/register", validate(registerModel), authController.register);
router.post("/forget-password", authController.forgetPassword);
router.post(
  "/reset-password",
  validate(resetPasswordModel),
  authController.resetPassword,
);
router.post("/logout", userProtected, authController.logout);
router.post(
  "/change-password",
  userProtected,
  validate(changePasswordModel),
  authController.changePassword,
);
router.get("/me", userProtected, authController.getCurrentUser);

export default router;
