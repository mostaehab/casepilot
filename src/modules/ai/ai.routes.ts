import { Router } from "express";
import { aiController } from "./ai.controller.js";
import { userProtected } from "../../middlewares/roles.middleware.js";
import { validate } from "../../middlewares/validate.js";
import { analyzeCaseModel } from "./ai.validation.js";

const router = Router({ mergeParams: true });

router.use(userProtected);

router.post("/analyze", validate(analyzeCaseModel), aiController.analyzeCase);
router.get("/analyses", aiController.listAnalyses);
router.get("/analyses/:analysisId", aiController.getAnalysis);

export default router;
