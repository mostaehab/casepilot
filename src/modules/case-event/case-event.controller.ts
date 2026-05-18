import { Request, Response } from "express";
import { caseEventService } from "./case-event.service.js";
import { asyncHandler } from "../../middlewares/asyncHandler.js";

export const caseEventController = {
  createEvent: asyncHandler(async (req: Request, res: Response) => {
    const data = await caseEventService.createEvent(
      req.params.caseId as string,
      req.user.id,
      req.body,
    );
    res.status(201).json({
      status: "success",
      message: "Event created successfully",
      data,
    });
  }),

  listEvents: asyncHandler(async (req: Request, res: Response) => {
    const data = await caseEventService.listEvents(
      req.params.caseId as string,
      req.user.id,
    );
    res.status(200).json({ status: "success", data });
  }),

  getEvent: asyncHandler(async (req: Request, res: Response) => {
    const data = await caseEventService.getEvent(
      req.params.eventId as string,
      req.user.id,
    );
    res.status(200).json({ status: "success", data });
  }),

  getUpcomingEvents: asyncHandler(async (req: Request, res: Response) => {
    const parsed = parseInt(String(req.query.limit ?? ""), 10);
    const limit = Math.min(50, Math.max(1, Number.isNaN(parsed) ? 10 : parsed));
    const data = await caseEventService.getUpcomingEvents(req.user.id, limit);
    res.status(200).json({ status: "success", data });
  }),

  updateEvent: asyncHandler(async (req: Request, res: Response) => {
    const data = await caseEventService.updateEvent(
      req.params.eventId as string,
      req.user.id,
      req.body,
    );
    res.status(200).json({
      status: "success",
      message: "Event updated successfully",
      data,
    });
  }),

  deleteEvent: asyncHandler(async (req: Request, res: Response) => {
    await caseEventService.deleteEvent(
      req.params.eventId as string,
      req.user.id,
    );
    res
      .status(200)
      .json({ status: "success", message: "Event deleted successfully" });
  }),

  // ---- Admin overrides ----

  adminDeleteEvent: asyncHandler(async (req: Request, res: Response) => {
    await caseEventService.adminDeleteEvent(req.params.eventId as string);
    res
      .status(200)
      .json({ status: "success", message: "Event deleted by admin" });
  }),
};
