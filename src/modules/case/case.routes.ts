import { Router } from "express";
import { caseController } from "./case.controller.js";
import caseFileRoutes from "../case-file/case-file.routes.js";
import {
  adminProtected,
  userProtected,
} from "../../middlewares/roles.middleware.js";
import { validate } from "../../middlewares/validate.js";
import {
  assignCaseModel,
  createCaseModel,
  transferCaseModel,
  updateCaseModel,
  updateCaseStatusModel,
} from "./case.validation.js";

const router = Router();

// ---- Admin-only routes ----
router.patch(
  "/admin/:id",
  adminProtected,
  validate(updateCaseModel),
  caseController.adminUpdateCase,
);
router.delete(
  "/admin/:id",
  adminProtected,
  caseController.adminDeleteCase,
);
router.post(
  "/admin/:id/transfer",
  adminProtected,
  validate(transferCaseModel),
  caseController.adminTransferOwnership,
);

router.use(userProtected);

router.use("/:caseId/files", caseFileRoutes);

router.post("/", validate(createCaseModel), caseController.createCase);
router.get("/me", caseController.getMyCases);
router.get("/assigned", caseController.getAssignedCases);
router.get("/team/:teamId", caseController.getCasesByTeam);
router.get("/:id", caseController.getCaseById);
router.patch("/:id", validate(updateCaseModel), caseController.updateCase);
router.patch(
  "/:id/status",
  validate(updateCaseStatusModel),
  caseController.updateCaseStatus,
);
router.delete("/:id", caseController.deleteCase);

router.post(
  "/:id/assignments",
  validate(assignCaseModel),
  caseController.assignUser,
);
router.delete("/:id/assignments/:userId", caseController.unassignUser);

export default router;
