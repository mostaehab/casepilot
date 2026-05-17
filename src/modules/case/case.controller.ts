import { Request, Response } from "express";
import { caseService } from "./case.service.js";
import { asyncHandler } from "../../middlewares/asyncHandler.js";

export const caseController = {
  createCase: asyncHandler(async (req: Request, res: Response) => {
    const created = await caseService.createCase(req.body, req.user.id);
    res.status(201).json({
      status: "success",
      message: "Case created successfully",
      data: created,
    });
  }),

  getCaseById: asyncHandler(async (req: Request, res: Response) => {
    const data = await caseService.getCaseById(
      req.params.id as string,
      req.user.id,
    );
    res.status(200).json({ status: "success", data });
  }),

  getAllCases: asyncHandler(async (req: Request, res: Response) => {
    const { data, pagination } = await caseService.getAllCases(req.query);
    res.status(200).json({ status: "success", data, pagination });
  }),

  getMyCases: asyncHandler(async (req: Request, res: Response) => {
    const data = await caseService.getMyCases(req.user.id);
    res.status(200).json({ status: "success", data });
  }),

  getCasesByTeam: asyncHandler(async (req: Request, res: Response) => {
    const data = await caseService.getCasesByTeam(
      req.params.teamId as string,
      req.user.id,
    );
    res.status(200).json({ status: "success", data });
  }),

  getAssignedCases: asyncHandler(async (req: Request, res: Response) => {
    const data = await caseService.getAssignedCases(req.user.id);
    res.status(200).json({ status: "success", data });
  }),

  getUpcomingCases: asyncHandler(async (req: Request, res: Response) => {
    const parsed = parseInt(String(req.query.limit ?? ""), 10);
    const limit = Math.min(50, Math.max(1, Number.isNaN(parsed) ? 5 : parsed));
    const data = await caseService.getUpcomingCases(req.user.id, limit);
    res.status(200).json({ status: "success", data });
  }),

  updateCase: asyncHandler(async (req: Request, res: Response) => {
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
  }),

  updateCaseStatus: asyncHandler(async (req: Request, res: Response) => {
    const data = await caseService.updateCaseStatus(
      req.params.id as string,
      req.body.status,
      req.user.id,
    );
    res
      .status(200)
      .json({ status: "success", message: "Case status updated", data });
  }),

  deleteCase: asyncHandler(async (req: Request, res: Response) => {
    await caseService.deleteCase(req.params.id as string, req.user.id);
    res
      .status(200)
      .json({ status: "success", message: "Case deleted successfully" });
  }),

  assignUser: asyncHandler(async (req: Request, res: Response) => {
    const data = await caseService.assignUser(
      req.params.id as string,
      req.body.userId,
      req.user.id,
    );
    res
      .status(201)
      .json({ status: "success", message: "User assigned to case", data });
  }),

  unassignUser: asyncHandler(async (req: Request, res: Response) => {
    await caseService.unassignUser(
      req.params.id as string,
      req.params.userId as string,
      req.user.id,
    );
    res
      .status(200)
      .json({ status: "success", message: "User unassigned from case" });
  }),

  // ---- Admin overrides ----

  adminUpdateCase: asyncHandler(async (req: Request, res: Response) => {
    const data = await caseService.adminUpdateCase(
      req.params.id as string,
      req.body,
    );
    res
      .status(200)
      .json({ status: "success", message: "Case updated by admin", data });
  }),

  adminDeleteCase: asyncHandler(async (req: Request, res: Response) => {
    await caseService.adminDeleteCase(req.params.id as string);
    res
      .status(200)
      .json({ status: "success", message: "Case deleted by admin" });
  }),

  adminTransferOwnership: asyncHandler(async (req: Request, res: Response) => {
    const data = await caseService.adminTransferOwnership(
      req.params.id as string,
      req.body.newOwnerId,
    );
    res.status(200).json({
      status: "success",
      message: "Case ownership transferred",
      data,
    });
  }),
};
