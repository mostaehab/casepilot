import { Router } from "express";
import rateLimit from "express-rate-limit";
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

const credentialLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    status: "error",
    message: "Too many attempts, please try again later",
  },
});

router.post(
  "/login",
  credentialLimiter,
  validate(loginModel),
  authController.login,
);
router.post(
  "/register",
  credentialLimiter,
  validate(registerModel),
  authController.register,
);
router.post(
  "/forget-password",
  credentialLimiter,
  validate(forgetPasswordModel),
  authController.forgetPassword,
);
router.post(
  "/reset-password",
  credentialLimiter,
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
