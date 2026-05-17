import { Router } from "express";
import { caseFileController } from "./case-file.controller.js";
import {
  adminProtected,
  userProtected,
} from "../../middlewares/roles.middleware.js";

const router = Router({ mergeParams: true });

router.delete(
  "/admin/:fileId",
  adminProtected,
  caseFileController.adminDeleteFile,
);

// Presigned upload: handles both client-token requests and Vercel Blob
// completion webhooks. Auth is enforced inside onBeforeGenerateToken
// (the webhook itself is verified by Vercel Blob's signature).
router.post("/", caseFileController.handleUpload);

router.use(userProtected);

router.get("/", caseFileController.listFiles);
router.delete("/:fileId", caseFileController.deleteFile);

export default router;
