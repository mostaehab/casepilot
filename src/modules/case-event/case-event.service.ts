import { caseRepository } from "../case/case.repository.js";
import { teamRepository } from "../team/team.repository.js";
import { caseEventRepository } from "./case-event.repository.js";
import {
  createCaseEventInput,
  updateCaseEventInput,
} from "./case-event.validation.js";
import { forbidden, notFound } from "../../lib/errors.js";

const canAccessCase = async (caseId: string, userId: string) => {
  const c = await caseRepository.findCaseById(caseId);
  if (!c) return { allowed: false, case: null };

  if (c.owner_id === userId) return { allowed: true, case: c };

  const assignment = await caseRepository.findAssignmentByCaseAndUser(
    caseId,
    userId,
  );
  if (assignment) return { allowed: true, case: c };

  if (c.team_id) {
    const member = await teamRepository.findMemberByTeamAndUser(
      c.team_id,
      userId,
    );
    if (member && member.status === "active")
      return { allowed: true, case: c };
  }

  return { allowed: false, case: c };
};

export const caseEventService = {
  createEvent: async (
    caseId: string,
    requesterId: string,
    input: createCaseEventInput,
  ) => {
    const { allowed, case: c } = await canAccessCase(caseId, requesterId);
    if (!c) {
      throw notFound("Case not found");
    }
    if (!allowed) {
      throw forbidden("You do not have access to this case");
    }
    return await caseEventRepository.createEvent(caseId, requesterId, input);
  },

  listEvents: async (caseId: string, requesterId: string) => {
    const { allowed, case: c } = await canAccessCase(caseId, requesterId);
    if (!c) {
      throw notFound("Case not found");
    }
    if (!allowed) {
      throw forbidden("You do not have access to this case");
    }
    return await caseEventRepository.findEventsByCaseId(caseId);
  },

  getEvent: async (eventId: string, requesterId: string) => {
    const event = await caseEventRepository.findEventById(eventId);
    if (!event) {
      throw notFound("Event not found");
    }
    const { allowed, case: c } = await canAccessCase(
      event.case_id,
      requesterId,
    );
    if (!c) {
      throw notFound("Case not found");
    }
    if (!allowed) {
      throw forbidden("You do not have access to this case");
    }
    return event;
  },

  getUpcomingEvents: async (userId: string, limit: number) => {
    return await caseEventRepository.findUpcomingEventsForUser(userId, limit);
  },

  updateEvent: async (
    eventId: string,
    requesterId: string,
    input: updateCaseEventInput,
  ) => {
    const event = await caseEventRepository.findEventById(eventId);
    if (!event) {
      throw notFound("Event not found");
    }
    const c = await caseRepository.findCaseById(event.case_id);
    if (!c) {
      throw notFound("Case not found");
    }
    const isOwner = c.owner_id === requesterId;
    const isCreator = event.created_by === requesterId;
    if (!isOwner && !isCreator) {
      throw forbidden(
        "Only the case owner or event creator can update this event",
      );
    }
    return await caseEventRepository.updateEvent(eventId, input);
  },

  deleteEvent: async (eventId: string, requesterId: string) => {
    const event = await caseEventRepository.findEventById(eventId);
    if (!event) {
      throw notFound("Event not found");
    }
    const c = await caseRepository.findCaseById(event.case_id);
    if (!c) {
      throw notFound("Case not found");
    }
    const isOwner = c.owner_id === requesterId;
    const isCreator = event.created_by === requesterId;
    if (!isOwner && !isCreator) {
      throw forbidden(
        "Only the case owner or event creator can delete this event",
      );
    }
    await caseEventRepository.deleteEvent(eventId);
  },

  // ---- Admin overrides ----

  adminDeleteEvent: async (eventId: string) => {
    const event = await caseEventRepository.findEventById(eventId);
    if (!event) {
      throw notFound("Event not found");
    }
    await caseEventRepository.deleteEvent(eventId);
  },
};
