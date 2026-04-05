import { Router } from "express";
import { userController } from "./user.controller";
import { adminProtected } from "../../middlewares/roles.middleware";
const router = Router();

router
  .get("/:id", userController.getUserById)
  .patch("/:id", userController.updateUserById)
  .patch("/deactivate/:id", userController.deleteUserById);

router.get("/", adminProtected, userController.getAllUsers);

export default router;
