import { Router } from "express";
import { caseEventController } from "./case-event.controller.js";
import {
  adminProtected,
  userProtected,
} from "../../middlewares/roles.middleware.js";
import { validate } from "../../middlewares/validate.js";
import {
  createCaseEventModel,
  updateCaseEventModel,
} from "./case-event.validation.js";

const router = Router({ mergeParams: true });

router.delete(
  "/admin/:eventId",
  adminProtected,
  caseEventController.adminDeleteEvent,
);

router.use(userProtected);

router.post(
  "/",
  validate(createCaseEventModel),
  caseEventController.createEvent,
);
router.get("/", caseEventController.listEvents);
router.get("/:eventId", caseEventController.getEvent);
router.patch(
  "/:eventId",
  validate(updateCaseEventModel),
  caseEventController.updateEvent,
);
router.delete("/:eventId", caseEventController.deleteEvent);

export default router;
