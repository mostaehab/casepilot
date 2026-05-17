import { teamRepository } from "../team/team.repository.js";
import { userRepository } from "../users/user.repository.js";
import { caseRepository } from "./case.repository.js";
import { createCaseInput, updateCaseInput } from "./case.validation.js";
import { buildPaginationMeta, buildQuery } from "../../utils/query.js";
import { conflict, forbidden, notFound } from "../../lib/errors.js";

const caseQueryConfig = {
  filterable: {
    status: { column: "c.status", operators: ["eq", "in"] as const },
    priority: { column: "c.priority", operators: ["eq", "in"] as const },
    type: { column: "c.type", operators: ["eq", "ilike"] as const },
    teamId: { column: "c.team_id", operators: ["eq"] as const },
    ownerId: { column: "c.owner_id", operators: ["eq"] as const },
  },
  sortable: {
    createdAt: "c.created_at",
    updatedAt: "c.updated_at",
    nextHearingDate: "c.next_hearing_date",
    title: "c.title",
  },
  searchable: ["c.title", "c.description", "c.client_name", "c.case_number"],
  defaultSort: { column: "c.created_at", direction: "DESC" as const },
  defaultLimit: 10,
  maxLimit: 100,
};

const canAccessCase = async (
  caseId: string,
  userId: string,
): Promise<boolean> => {
  const c = await caseRepository.findCaseById(caseId);
  if (!c) return false;

  if (c.owner_id === userId) return true;

  const assignment = await caseRepository.findAssignmentByCaseAndUser(
    caseId,
    userId,
  );
  if (assignment) return true;

  if (c.team_id) {
    const member = await teamRepository.findMemberByTeamAndUser(
      c.team_id,
      userId,
    );
    if (member && member.status === "active") return true;
  }

  return false;
};

export const caseService = {
  createCase: async (input: createCaseInput, ownerId: string) => {
    const teamId = input.teamId?.trim() || undefined;

    if (teamId) {
      const team = await teamRepository.findTeamById(teamId);
      if (!team) {
        throw notFound("Team not found");
      }
      const isOwner = team.owner_id === ownerId;
      const member = await teamRepository.findMemberByTeamAndUser(
        teamId,
        ownerId,
      );
      const isActiveMember = member && member.status === "active";
      if (!isOwner && !isActiveMember) {
        throw forbidden("You are not a member of this team");
      }
    }

    return await caseRepository.createCase({ ...input, teamId }, ownerId);
  },

  getAllCases: async (reqQuery: any) => {
    const built = buildQuery(reqQuery, caseQueryConfig);
    const { rows, total } = await caseRepository.findAllCases(built);
    return {
      data: rows,
      pagination: buildPaginationMeta(built.page, built.limit, total),
    };
  },

  getUpcomingCases: async (userId: string, limit: number = 5) => {
    return await caseRepository.findUpcomingCases(userId, limit);
  },

  getCaseById: async (id: string, requesterId: string) => {
    const c = await caseRepository.findCaseById(id);
    if (!c) {
      throw notFound("Case not found");
    }
    const allowed = await canAccessCase(id, requesterId);
    if (!allowed) {
      throw forbidden("You do not have access to this case");
    }
    const assignments = await caseRepository.findAssignmentsByCaseId(id);
    return { ...c, assignments };
  },

  getMyCases: async (ownerId: string) => {
    return await caseRepository.findCasesByOwnerId(ownerId);
  },

  getCasesByTeam: async (teamId: string, requesterId: string) => {
    const team = await teamRepository.findTeamById(teamId);
    if (!team) {
      throw notFound("Team not found");
    }
    const isOwner = team.owner_id === requesterId;
    const member = await teamRepository.findMemberByTeamAndUser(
      teamId,
      requesterId,
    );
    const isActiveMember = member && member.status === "active";
    if (!isOwner && !isActiveMember) {
      throw forbidden("You are not a member of this team");
    }
    return await caseRepository.findCasesByTeamId(teamId);
  },

  getAssignedCases: async (userId: string) => {
    return await caseRepository.findCasesAssignedToUser(userId);
  },

  updateCase: async (
    id: string,
    input: updateCaseInput,
    requesterId: string,
  ) => {
    const c = await caseRepository.findCaseById(id);
    if (!c) {
      throw notFound("Case not found");
    }
    if (c.owner_id !== requesterId) {
      throw forbidden("Only the case owner can update the case");
    }

    if (input.teamId) {
      const team = await teamRepository.findTeamById(input.teamId);
      if (!team) {
        throw notFound("Team not found");
      }
      if (team.owner_id !== requesterId) {
        const member = await teamRepository.findMemberByTeamAndUser(
          input.teamId,
          requesterId,
        );
        if (!member || member.status !== "active") {
          throw forbidden("You are not a member of this team");
        }
      }
    }

    return await caseRepository.updateCase(id, input);
  },

  updateCaseStatus: async (id: string, status: string, requesterId: string) => {
    const c = await caseRepository.findCaseById(id);
    if (!c) {
      throw notFound("Case not found");
    }

    const allowed = await canAccessCase(id, requesterId);
    if (!allowed) {
      throw forbidden("You do not have access to this case");
    }

    return await caseRepository.updateCaseStatus(id, status);
  },

  deleteCase: async (id: string, requesterId: string) => {
    const c = await caseRepository.findCaseById(id);
    if (!c) {
      throw notFound("Case not found");
    }
    if (c.owner_id !== requesterId) {
      throw forbidden("Only the case owner can delete the case");
    }
    await caseRepository.deleteCase(id);
  },

  assignUser: async (caseId: string, userId: string, requesterId: string) => {
    const c = await caseRepository.findCaseById(caseId);
    if (!c) {
      throw notFound("Case not found");
    }
    if (c.owner_id !== requesterId) {
      throw forbidden("Only the case owner can assign members");
    }

    if (!c.team_id) {
      throw conflict("Case must belong to a team to assign members");
    }

    const isTeamOwner = c.team_id && userId === c.owner_id;
    const member = await teamRepository.findMemberByTeamAndUser(
      c.team_id,
      userId,
    );
    if (!isTeamOwner && (!member || member.status !== "active")) {
      throw forbidden("User is not an active member of the team");
    }

    const existing = await caseRepository.findAssignmentByCaseAndUser(
      caseId,
      userId,
    );
    if (existing) {
      throw conflict("User is already assigned to this case");
    }

    return await caseRepository.assignUser(caseId, userId, requesterId);
  },

  unassignUser: async (caseId: string, userId: string, requesterId: string) => {
    const c = await caseRepository.findCaseById(caseId);
    if (!c) {
      throw notFound("Case not found");
    }
    if (c.owner_id !== requesterId) {
      throw forbidden("Only the case owner can unassign members");
    }

    const assignment = await caseRepository.findAssignmentByCaseAndUser(
      caseId,
      userId,
    );
    if (!assignment) {
      throw notFound("Assignment not found");
    }

    await caseRepository.unassignUser(caseId, userId);
  },

  // ---- Admin overrides ----

  adminUpdateCase: async (id: string, input: updateCaseInput) => {
    const c = await caseRepository.findCaseById(id);
    if (!c) {
      throw notFound("Case not found");
    }
    if (input.teamId) {
      const team = await teamRepository.findTeamById(input.teamId);
      if (!team) {
        throw notFound("Team not found");
      }
    }
    return await caseRepository.updateCase(id, input);
  },

  adminDeleteCase: async (id: string) => {
    const c = await caseRepository.findCaseById(id);
    if (!c) {
      throw notFound("Case not found");
    }
    await caseRepository.deleteCase(id);
  },

  adminTransferOwnership: async (id: string, newOwnerId: string) => {
    const c = await caseRepository.findCaseById(id);
    if (!c) {
      throw notFound("Case not found");
    }
    const newOwner = await userRepository.findUserById(newOwnerId);
    if (!newOwner) {
      throw notFound("New owner not found");
    }
    if (c.owner_id === newOwnerId) {
      throw conflict("User is already the case owner");
    }
    return await caseRepository.transferCaseOwnership(id, newOwnerId);
  },
};
