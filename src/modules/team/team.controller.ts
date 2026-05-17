import { Request, Response } from "express";
import { teamService } from "./team.service.js";
import { asyncHandler } from "../../middlewares/asyncHandler.js";

export const teamController = {
  getAllTeams: asyncHandler(async (req: Request, res: Response) => {
    const { data, pagination } = await teamService.getAllTeams(req.query);
    res.status(200).json({ status: "success", data, pagination });
  }),

  createTeam: asyncHandler(async (req: Request, res: Response) => {
    const team = await teamService.createTeam(req.body, req.user.id);
    res.status(201).json({
      status: "success",
      message: "Team created successfully",
      data: team,
    });
  }),

  getTeamById: asyncHandler(async (req: Request, res: Response) => {
    const team = await teamService.getTeamById(
      req.params.id as string,
      req.user.id,
      req.user.role,
    );
    res.status(200).json({ status: "success", data: team });
  }),

  getMyTeam: asyncHandler(async (req: Request, res: Response) => {
    const team = await teamService.getMyTeam(req.user.id);
    res.status(200).json({ status: "success", data: team });
  }),

  getMyMemberships: asyncHandler(async (req: Request, res: Response) => {
    const teams = await teamService.getTeamsForUser(req.user.id);
    res.status(200).json({ status: "success", data: teams });
  }),

  updateTeam: asyncHandler(async (req: Request, res: Response) => {
    const team = await teamService.updateTeam(
      req.params.id as string,
      req.body,
      req.user.id,
    );
    res.status(200).json({
      status: "success",
      message: "Team updated successfully",
      data: team,
    });
  }),

  deleteTeam: asyncHandler(async (req: Request, res: Response) => {
    await teamService.deleteTeam(req.params.id as string, req.user.id);
    res
      .status(200)
      .json({ status: "success", message: "Team deleted successfully" });
  }),

  inviteMember: asyncHandler(async (req: Request, res: Response) => {
    const member = await teamService.inviteMember(
      req.params.id as string,
      req.body,
      req.user.id,
    );
    res.status(201).json({
      status: "success",
      message: "Invitation sent successfully",
      data: member,
    });
  }),

  acceptInvite: asyncHandler(async (req: Request, res: Response) => {
    const member = await teamService.acceptInvite(
      req.params.id as string,
      req.user.id,
    );
    res.status(200).json({
      status: "success",
      message: "Invitation accepted",
      data: member,
    });
  }),

  cancelInvitation: asyncHandler(async (req: Request, res: Response) => {
    await teamService.cancelInvitation(
      req.params.id as string,
      req.params.userId as string,
      req.user.id,
    );
    res
      .status(200)
      .json({ status: "success", message: "Invitation cancelled" });
  }),

  updateMemberRole: asyncHandler(async (req: Request, res: Response) => {
    const member = await teamService.updateMemberRole(
      req.params.id as string,
      req.params.userId as string,
      req.body.role,
      req.user.id,
    );
    res.status(200).json({
      status: "success",
      message: "Member role updated",
      data: member,
    });
  }),

  removeMember: asyncHandler(async (req: Request, res: Response) => {
    await teamService.removeMember(
      req.params.id as string,
      req.params.userId as string,
      req.user.id,
    );
    res.status(200).json({ status: "success", message: "Member removed" });
  }),

  // ---- Admin overrides ----

  adminDeleteTeam: asyncHandler(async (req: Request, res: Response) => {
    await teamService.adminDeleteTeam(req.params.id as string);
    res
      .status(200)
      .json({ status: "success", message: "Team deleted by admin" });
  }),

  adminTransferOwnership: asyncHandler(async (req: Request, res: Response) => {
    const data = await teamService.adminTransferOwnership(
      req.params.id as string,
      req.body.newOwnerId,
    );
    res.status(200).json({
      status: "success",
      message: "Team ownership transferred",
      data,
    });
  }),

  adminRemoveMember: asyncHandler(async (req: Request, res: Response) => {
    await teamService.adminRemoveMember(
      req.params.id as string,
      req.params.userId as string,
    );
    res
      .status(200)
      .json({ status: "success", message: "Member removed by admin" });
  }),
};
