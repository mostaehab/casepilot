import { Router } from "express";
import multer from "multer";
import { caseFileController } from "./case-file.controller.js";
import {
  adminProtected,
  userProtected,
} from "../../middlewares/roles.middleware.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
});

const router = Router({ mergeParams: true });

router.delete(
  "/admin/:fileId",
  adminProtected,
  caseFileController.adminDeleteFile,
);

router.use(userProtected);

router.post("/", upload.single("file"), caseFileController.uploadFile);
router.get("/", caseFileController.listFiles);
router.delete("/:fileId", caseFileController.deleteFile);

export default router;
