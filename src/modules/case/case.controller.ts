import { Request, Response } from "express";
import { caseService } from "./case.service.js";

export const caseController = {
  createCase: async (req: Request, res: Response) => {
    try {
      const created = await caseService.createCase(req.body, req.user.id);
      res.status(201).json({
        status: "success",
        message: "Case created successfully",
        data: created,
      });
    } catch (error: any) {
      res.status(400).json({
        status: "error",
        message: error.message || "An unknown error occurred",
      });
    }
  },

  getCaseById: async (req: Request, res: Response) => {
    try {
      const data = await caseService.getCaseById(
        req.params.id as string,
        req.user.id,
      );
      if (!data) {
        return res
          .status(404)
          .json({ status: "error", message: "Case not found" });
      }
      res.status(200).json({ status: "success", data });
    } catch (error: any) {
      res.status(404).json({
        status: "error",
        message: error.message || "An unknown error occurred",
      });
    }
  },

  getMyCases: async (req: Request, res: Response) => {
    try {
      const data = await caseService.getMyCases(req.user.id);
      if (!data || data.length === 0) {
        return res
          .status(404)
          .json({ status: "error", message: "No cases found for the user" });
      }
      res.status(200).json({ status: "success", data });
    } catch (error: any) {
      res.status(400).json({
        status: "error",
        message: error.message || "An unknown error occurred",
      });
    }
  },

  getCasesByTeam: async (req: Request, res: Response) => {
    try {
      const data = await caseService.getCasesByTeam(
        req.params.teamId as string,
        req.user.id,
      );
      if (!data || data.length === 0) {
        return res
          .status(404)
          .json({ status: "error", message: "No cases found for this team" });
      }
      res.status(200).json({ status: "success", data });
    } catch (error: any) {
      res.status(400).json({
        status: "error",
        message: error.message || "An unknown error occurred",
      });
    }
  },

  getAssignedCases: async (req: Request, res: Response) => {
    try {
      const data = await caseService.getAssignedCases(req.user.id);
      if (!data || data.length === 0) {
        return res
          .status(404)
          .json({ status: "error", message: "No assigned cases found" });
      }
      res.status(200).json({ status: "success", data });
    } catch (error: any) {
      res.status(400).json({
        status: "error",
        message: error.message || "An unknown error occurred",
      });
    }
  },

  updateCase: async (req: Request, res: Response) => {
    try {
      const data = await caseService.updateCase(
        req.params.id as string,
        req.body,
        req.user.id,
      );
      res.status(200).json({
        status: "success",
        message: "Case updated successfully",
        data,
      });
    } catch (error: any) {
      res.status(400).json({
        status: "error",
        message: error.message || "An unknown error occurred",
      });
    }
  },

  updateCaseStatus: async (req: Request, res: Response) => {
    try {
      const data = await caseService.updateCaseStatus(
        req.params.id as string,
        req.body.status,
        req.user.id,
      );
      res.status(200).json({
        status: "success",
        message: "Case status updated",
        data,
      });
    } catch (error: any) {
      res.status(400).json({
        status: "error",
        message: error.message || "An unknown error occurred",
      });
    }
  },

  deleteCase: async (req: Request, res: Response) => {
    try {
      await caseService.deleteCase(req.params.id as string, req.user.id);
      res.status(200).json({
        status: "success",
        message: "Case deleted successfully",
      });
    } catch (error: any) {
      res.status(400).json({
        status: "error",
        message: error.message || "An unknown error occurred",
      });
    }
  },

  assignUser: async (req: Request, res: Response) => {
    try {
      const data = await caseService.assignUser(
        req.params.id as string,
        req.body.userId,
        req.user.id,
      );
      res.status(201).json({
        status: "success",
        message: "User assigned to case",
        data,
      });
    } catch (error: any) {
      res.status(400).json({
        status: "error",
        message: error.message || "An unknown error occurred",
      });
    }
  },

  unassignUser: async (req: Request, res: Response) => {
    try {
      await caseService.unassignUser(
        req.params.id as string,
        req.params.userId as string,
        req.user.id,
      );
      res.status(200).json({
        status: "success",
        message: "User unassigned from case",
      });
    } catch (error: any) {
      res.status(400).json({
        status: "error",
        message: error.message || "An unknown error occurred",
      });
    }
  },
};
