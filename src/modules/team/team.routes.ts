import { Router } from "express";
import { teamController } from "./team.controller.js";
import {
  adminProtected,
  userProtected,
} from "../../middlewares/roles.middleware.js";
import { validate } from "../../middlewares/validate.js";
import {
  createTeamModel,
  inviteMemberModel,
  transferTeamModel,
  updateMemberRoleModel,
  updateTeamModel,
} from "./team.validation.js";

const router = Router();

// ---- Admin-only routes (gated independently before the userProtected guard) ----
router.delete(
  "/admin/:id",
  adminProtected,
  teamController.adminDeleteTeam,
);
router.post(
  "/admin/:id/transfer",
  adminProtected,
  validate(transferTeamModel),
  teamController.adminTransferOwnership,
);
router.delete(
  "/admin/:id/members/:userId",
  adminProtected,
  teamController.adminRemoveMember,
);

router.use(userProtected);

router.get("/", teamController.getAllTeams);
router.post("/", validate(createTeamModel), teamController.createTeam);
router.get("/me", teamController.getMyTeam);
router.get("/memberships", teamController.getMyMemberships);
router.get("/:id", teamController.getTeamById);
router.patch("/:id", validate(updateTeamModel), teamController.updateTeam);
router.delete("/:id", teamController.deleteTeam);

router.post(
  "/:id/members",
  validate(inviteMemberModel),
  teamController.inviteMember,
);
router.post("/:id/members/accept", teamController.acceptInvite);
router.patch(
  "/:id/members/:userId",
  validate(updateMemberRoleModel),
  teamController.updateMemberRole,
);
router.delete("/:id/members/:userId", teamController.removeMember);

export default router;
