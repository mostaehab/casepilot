import { Request, Response } from "express";
import { caseFileService } from "./case-file.service.js";

export const caseFileController = {
  uploadFile: async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          status: "error",
          message: "No file uploaded",
        });
      }

      const data = await caseFileService.uploadFile(
        req.params.caseId as string,
        req.file,
        req.user.id,
      );

      res.status(201).json({
        status: "success",
        message: "File uploaded successfully",
        data,
      });
    } catch (error: any) {
      res.status(400).json({
        status: "error",
        message: error.message || "An unknown error occurred",
      });
    }
  },

  listFiles: async (req: Request, res: Response) => {
    try {
      const data = await caseFileService.listFiles(
        req.params.caseId as string,
        req.user.id,
      );
      res.status(200).json({ status: "success", data });
    } catch (error: any) {
      res.status(400).json({
        status: "error",
        message: error.message || "An unknown error occurred",
      });
    }
  },

  deleteFile: async (req: Request, res: Response) => {
    try {
      await caseFileService.deleteFile(
        req.params.fileId as string,
        req.user.id,
      );
      res.status(200).json({
        status: "success",
        message: "File deleted successfully",
      });
    } catch (error: any) {
      res.status(400).json({
        status: "error",
        message: error.message || "An unknown error occurred",
      });
    }
  },
};
