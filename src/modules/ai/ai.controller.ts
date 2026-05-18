import { Request, Response } from "express";
import { aiService } from "./ai.service.js";
import { asyncHandler } from "../../middlewares/asyncHandler.js";

export const aiController = {
  analyzeCase: asyncHandler(async (req: Request, res: Response) => {
    const data = await aiService.analyzeCase(
      req.params.caseId as string,
      req.user.id,
      req.body,
    );
    res.status(201).json({
      status: "success",
      message: "Case analyzed successfully",
      data,
    });
  }),

  listAnalyses: asyncHandler(async (req: Request, res: Response) => {
    const data = await aiService.listAnalysesForCase(
      req.params.caseId as string,
      req.user.id,
    );
    res.status(200).json({ status: "success", data });
  }),

  getAnalysis: asyncHandler(async (req: Request, res: Response) => {
    const data = await aiService.getAnalysis(
      req.params.analysisId as string,
      req.user.id,
    );
    res.status(200).json({ status: "success", data });
  }),
};
