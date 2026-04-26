import { Request, Response } from "express";
import { teamService } from "./team.service.js";

export const teamController = {
  createTeam: async (req: Request, res: Response) => {
    try {
      const team = await teamService.createTeam(req.body, req.user.id);
      res.status(201).json({
        status: "success",
        message: "Team created successfully",
        data: team,
      });
    } catch (error: any) {
      res.status(400).json({
        status: "error",
        message: error.message || "An unknown error occurred",
      });
    }
  },

  getTeamById: async (req: Request, res: Response) => {
    try {
      const team = await teamService.getTeamById(req.params.id as string);
      res.status(200).json({
        status: "success",
        data: team,
      });
    } catch (error: any) {
      res.status(404).json({
        status: "error",
        message: error.message || "An unknown error occurred",
      });
    }
  },

  getMyTeam: async (req: Request, res: Response) => {
    try {
      const team = await teamService.getMyTeam(req.user.id);
      res.status(200).json({
        status: "success",
        data: team,
      });
    } catch (error: any) {
      res.status(404).json({
        status: "error",
        message: error.message || "An unknown error occurred",
      });
    }
  },

  getMyMemberships: async (req: Request, res: Response) => {
    try {
      const teams = await teamService.getTeamsForUser(req.user.id);
      res.status(200).json({
        status: "success",
        data: teams,
      });
    } catch (error: any) {
      res.status(400).json({
        status: "error",
        message: error.message || "An unknown error occurred",
      });
    }
  },

  updateTeam: async (req: Request, res: Response) => {
    try {
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
    } catch (error: any) {
      res.status(400).json({
        status: "error",
        message: error.message || "An unknown error occurred",
      });
    }
  },

  deleteTeam: async (req: Request, res: Response) => {
    try {
      await teamService.deleteTeam(req.params.id as string, req.user.id);
      res.status(200).json({
        status: "success",
        message: "Team deleted successfully",
      });
    } catch (error: any) {
      res.status(400).json({
        status: "error",
        message: error.message || "An unknown error occurred",
      });
    }
  },

  inviteMember: async (req: Request, res: Response) => {
    try {
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
    } catch (error: any) {
      res.status(400).json({
        status: "error",
        message: error.message || "An unknown error occurred",
      });
    }
  },

  acceptInvite: async (req: Request, res: Response) => {
    try {
      const member = await teamService.acceptInvite(
        req.params.id as string,
        req.user.id,
      );
      res.status(200).json({
        status: "success",
        message: "Invitation accepted",
        data: member,
      });
    } catch (error: any) {
      res.status(400).json({
        status: "error",
        message: error.message || "An unknown error occurred",
      });
    }
  },

  updateMemberRole: async (req: Request, res: Response) => {
    try {
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
    } catch (error: any) {
      res.status(400).json({
        status: "error",
        message: error.message || "An unknown error occurred",
      });
    }
  },

  removeMember: async (req: Request, res: Response) => {
    try {
      await teamService.removeMember(
        req.params.id as string,
        req.params.userId as string,
        req.user.id,
      );
      res.status(200).json({
        status: "success",
        message: "Member removed",
      });
    } catch (error: any) {
      res.status(400).json({
        status: "error",
        message: error.message || "An unknown error occurred",
      });
    }
  },
};
