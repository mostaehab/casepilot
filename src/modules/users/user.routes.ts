import { Router } from "express";
import { userController } from "./user.controller.js";
import { adminProtected } from "../../middlewares/roles.middleware.js";
const router = Router();

router
  .get("/:id", userController.getUserById)
  .patch("/:id", userController.updateUserById)
  .patch("/deactivate/:id", userController.deleteUserById);

router.get("/", adminProtected, userController.getAllUsers);

export default router;
