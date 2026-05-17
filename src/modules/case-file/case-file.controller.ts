import { Request, Response } from "express";
import { caseFileService } from "./case-file.service.js";
import { asyncHandler } from "../../middlewares/asyncHandler.js";
import { badRequest } from "../../lib/errors.js";

export const caseFileController = {
  uploadFile: asyncHandler(async (req: Request, res: Response) => {
    if (!req.file) {
      throw badRequest("No file uploaded");
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
  }),

  listFiles: asyncHandler(async (req: Request, res: Response) => {
    const data = await caseFileService.listFiles(
      req.params.caseId as string,
      req.user.id,
    );
    res.status(200).json({ status: "success", data });
  }),

  downloadFile: asyncHandler(async (req: Request, res: Response) => {
    const { file, stream, contentType, size } =
      await caseFileService.downloadFile(
        req.params.fileId as string,
        req.user.id,
      );

    res.setHeader(
      "Content-Type",
      contentType ?? file.file_type ?? "application/octet-stream",
    );
    if (size) {
      res.setHeader("Content-Length", String(size));
    }
    const disposition = req.query.download === "1" ? "attachment" : "inline";
    res.setHeader(
      "Content-Disposition",
      `${disposition}; filename="${encodeURIComponent(file.file_name)}"`,
    );

    const { Readable } = await import("node:stream");
    Readable.fromWeb(stream as any).pipe(res);
  }),

  deleteFile: asyncHandler(async (req: Request, res: Response) => {
    await caseFileService.deleteFile(
      req.params.fileId as string,
      req.user.id,
    );
    res
      .status(200)
      .json({ status: "success", message: "File deleted successfully" });
  }),

  // ---- Admin overrides ----

  adminDeleteFile: asyncHandler(async (req: Request, res: Response) => {
    await caseFileService.adminDeleteFile(req.params.fileId as string);
    res
      .status(200)
      .json({ status: "success", message: "File deleted by admin" });
  }),
};
