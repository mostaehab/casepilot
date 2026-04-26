import { Router } from "express";
import { teamController } from "./team.controller.js";
import { userProtected } from "../../middlewares/roles.middleware.js";
import { validate } from "../../middlewares/validate.js";
import {
  createTeamModel,
  inviteMemberModel,
  updateMemberRoleModel,
  updateTeamModel,
} from "./team.validation.js";

const router = Router();

router.use(userProtected);

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
