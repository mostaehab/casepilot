import { teamRepository } from "../team/team.repository.js";
import { caseRepository } from "./case.repository.js";
import {
  createCaseInput,
  updateCaseInput,
} from "./case.validation.js";

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
    if (input.teamId) {
      const team = await teamRepository.findTeamById(input.teamId);
      if (!team) {
        throw new Error("Team not found");
      }
      const isOwner = team.owner_id === ownerId;
      const member = await teamRepository.findMemberByTeamAndUser(
        input.teamId,
        ownerId,
      );
      const isActiveMember = member && member.status === "active";
      if (!isOwner && !isActiveMember) {
        throw new Error("You are not a member of this team");
      }
    }

    return await caseRepository.createCase(input, ownerId);
  },

  getCaseById: async (id: string, requesterId: string) => {
    const c = await caseRepository.findCaseById(id);
    if (!c) {
      throw new Error("Case not found");
    }
    const allowed = await canAccessCase(id, requesterId);
    if (!allowed) {
      throw new Error("You do not have access to this case");
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
      throw new Error("Team not found");
    }
    const isOwner = team.owner_id === requesterId;
    const member = await teamRepository.findMemberByTeamAndUser(
      teamId,
      requesterId,
    );
    const isActiveMember = member && member.status === "active";
    if (!isOwner && !isActiveMember) {
      throw new Error("You are not a member of this team");
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
      throw new Error("Case not found");
    }
    if (c.owner_id !== requesterId) {
      throw new Error("Only the case owner can update the case");
    }

    if (input.teamId) {
      const team = await teamRepository.findTeamById(input.teamId);
      if (!team) {
        throw new Error("Team not found");
      }
      if (team.owner_id !== requesterId) {
        const member = await teamRepository.findMemberByTeamAndUser(
          input.teamId,
          requesterId,
        );
        if (!member || member.status !== "active") {
          throw new Error("You are not a member of this team");
        }
      }
    }

    return await caseRepository.updateCase(id, input);
  },

  updateCaseStatus: async (
    id: string,
    status: string,
    requesterId: string,
  ) => {
    const c = await caseRepository.findCaseById(id);
    if (!c) {
      throw new Error("Case not found");
    }

    const allowed = await canAccessCase(id, requesterId);
    if (!allowed) {
      throw new Error("You do not have access to this case");
    }

    return await caseRepository.updateCaseStatus(id, status);
  },

  deleteCase: async (id: string, requesterId: string) => {
    const c = await caseRepository.findCaseById(id);
    if (!c) {
      throw new Error("Case not found");
    }
    if (c.owner_id !== requesterId) {
      throw new Error("Only the case owner can delete the case");
    }
    await caseRepository.deleteCase(id);
  },

  assignUser: async (
    caseId: string,
    userId: string,
    requesterId: string,
  ) => {
    const c = await caseRepository.findCaseById(caseId);
    if (!c) {
      throw new Error("Case not found");
    }
    if (c.owner_id !== requesterId) {
      throw new Error("Only the case owner can assign members");
    }

    if (!c.team_id) {
      throw new Error("Case must belong to a team to assign members");
    }

    const isTeamOwner = c.team_id && userId === c.owner_id;
    const member = await teamRepository.findMemberByTeamAndUser(
      c.team_id,
      userId,
    );
    if (!isTeamOwner && (!member || member.status !== "active")) {
      throw new Error("User is not an active member of the team");
    }

    const existing = await caseRepository.findAssignmentByCaseAndUser(
      caseId,
      userId,
    );
    if (existing) {
      throw new Error("User is already assigned to this case");
    }

    return await caseRepository.assignUser(caseId, userId, requesterId);
  },

  unassignUser: async (
    caseId: string,
    userId: string,
    requesterId: string,
  ) => {
    const c = await caseRepository.findCaseById(caseId);
    if (!c) {
      throw new Error("Case not found");
    }
    if (c.owner_id !== requesterId) {
      throw new Error("Only the case owner can unassign members");
    }

    const assignment = await caseRepository.findAssignmentByCaseAndUser(
      caseId,
      userId,
    );
    if (!assignment) {
      throw new Error("Assignment not found");
    }

    await caseRepository.unassignUser(caseId, userId);
  },
};
