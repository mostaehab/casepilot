import { Router } from "express";
import { authController } from "./auth.controller.js";
import { userProtected } from "../../middlewares/roles.middleware.js";
import { validate } from "../../middlewares/validate.js";
import {
  loginModel,
  registerModel,
  changePasswordModel,
  resetPasswordModel,
  forgetPasswordModel,
} from "./auth.validation.js";

const router = Router();

router.post("/login", validate(loginModel), authController.login);
router.post("/register", validate(registerModel), authController.register);
router.post(
  "/forget-password",
  validate(forgetPasswordModel),
  authController.forgetPassword,
);
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
