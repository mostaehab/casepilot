import { Request, Response } from "express";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { caseFileService } from "./case-file.service.js";
import { asyncHandler } from "../../middlewares/asyncHandler.js";
import { auth } from "../../lib/auth.js";
import { fromNodeHeaders } from "better-auth/node";
import { forbidden, notFound, unauthorized } from "../../lib/errors.js";

const ALLOWED_CONTENT_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "image/jpeg",
  "image/png",
  "image/heic",
  "image/heif",
  "text/plain",
  "text/csv",
];

const MAX_BYTES = 50 * 1024 * 1024; // 50 MB

export const caseFileController = {
  handleUpload: asyncHandler(async (req: Request, res: Response) => {
    const body = req.body as HandleUploadBody;
    const caseId = req.params.caseId as string;

    const jsonResponse = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async () => {
        const session = await auth.api.getSession({
          headers: fromNodeHeaders(req.headers),
        });
        if (!session?.user) {
          throw unauthorized("Not signed in");
        }

        const { allowed, case: c } = await caseFileService.canAccessCase(
          caseId,
          session.user.id,
        );
        if (!c) throw notFound("Case not found");
        if (!allowed) throw forbidden("You do not have access to this case");

        return {
          allowedContentTypes: ALLOWED_CONTENT_TYPES,
          maximumSizeInBytes: MAX_BYTES,
          addRandomSuffix: true,
          // Explicit 1-hour validity. handleUpload's default *should* be 1 h,
          // but generateClientTokenFromReadWriteToken falls back to 30 s if
          // validUntil isn't passed through — small enough that any clock
          // skew between this function and Vercel Blob's edge marks the
          // token expired on arrival. Setting it explicitly removes the risk.
          validUntil: Date.now() + 60 * 60 * 1000,
          tokenPayload: JSON.stringify({
            caseId,
            uploaderId: session.user.id,
          }),
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        const payload = tokenPayload ? JSON.parse(tokenPayload) : {};
        await caseFileService.recordUploadedFile({
          caseId: payload.caseId,
          uploaderId: payload.uploaderId,
          fileName: blob.pathname.split("/").pop() ?? blob.pathname,
          fileUrl: blob.url,
          fileType: blob.contentType,
        });
      },
    });

    res.status(200).json(jsonResponse);
  }),

  listFiles: asyncHandler(async (req: Request, res: Response) => {
    const data = await caseFileService.listFiles(
      req.params.caseId as string,
      req.user.id,
    );
    res.status(200).json({ status: "success", data });
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
