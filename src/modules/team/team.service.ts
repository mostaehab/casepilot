import { buildPaginationMeta, buildQuery } from "../../utils/query.js";
import { userRepository } from "../users/user.repository.js";
import { teamRepository } from "./team.repository.js";
import {
  createTeamInput,
  inviteMemberInput,
  updateTeamInput,
} from "./team.validation.js";

const teamQueryConfig = {
  filterable: {
    ownerId: { column: "t.owner_id", operators: ["eq"] as const },
    name: { column: "t.name", operators: ["eq", "ilike"] as const },
  },
  sortable: {
    createdAt: "t.created_at",
    updatedAt: "t.updated_at",
    name: "t.name",
  },
  searchable: ["t.name", "t.description"],
  defaultSort: { column: "t.created_at", direction: "DESC" as const },
  defaultLimit: 10,
  maxLimit: 100,
};

export const teamService = {
  getAllTeams: async (reqQuery: any) => {
    const built = buildQuery(reqQuery, teamQueryConfig);
    const { rows, total } = await teamRepository.findAllTeams(built);
    return {
      data: rows,
      pagination: buildPaginationMeta(built.page, built.limit, total),
    };
  },

  createTeam: async (input: createTeamInput, ownerId: string) => {
    const existing = await teamRepository.findTeamByOwnerId(ownerId);
    if (existing) {
      throw new Error("You already own a team");
    }
    return await teamRepository.createTeam(input, ownerId);
  },

  getTeamById: async (id: string) => {
    const team = await teamRepository.findTeamById(id);
    if (!team) {
      throw new Error("Team not found");
    }
    const members = await teamRepository.findMembersByTeamId(id);
    return { ...team, members };
  },

  getMyTeam: async (ownerId: string) => {
    const team = await teamRepository.findTeamByOwnerId(ownerId);
    if (!team) {
      throw new Error("You don't own a team yet");
    }
    const members = await teamRepository.findMembersByTeamId(team.id);
    return { ...team, members };
  },

  getTeamsForUser: async (userId: string) => {
    return await teamRepository.findTeamsByUserId(userId);
  },

  updateTeam: async (
    id: string,
    input: updateTeamInput,
    requesterId: string,
  ) => {
    const team = await teamRepository.findTeamById(id);
    if (!team) {
      throw new Error("Team not found");
    }
    if (team.owner_id !== requesterId) {
      throw new Error("Only the team owner can update the team");
    }
    return await teamRepository.updateTeam(id, input);
  },

  deleteTeam: async (id: string, requesterId: string) => {
    const team = await teamRepository.findTeamById(id);
    if (!team) {
      throw new Error("Team not found");
    }
    if (team.owner_id !== requesterId) {
      throw new Error("Only the team owner can delete the team");
    }
    await teamRepository.deleteTeam(id);
  },

  inviteMember: async (
    teamId: string,
    input: inviteMemberInput,
    invitedBy: string,
  ) => {
    const team = await teamRepository.findTeamById(teamId);
    if (!team) {
      throw new Error("Team not found");
    }
    if (team.owner_id !== invitedBy) {
      throw new Error("Only the team owner can invite members");
    }

    const user = await userRepository.findUserByEmail(input.email);
    if (!user) {
      throw new Error("User not found");
    }

    if (user.id === team.owner_id) {
      throw new Error("Cannot invite the team owner");
    }

    const existing = await teamRepository.findMemberByTeamAndUser(
      teamId,
      user.id,
    );
    if (existing && existing.status !== "removed") {
      throw new Error("User is already a member of this team");
    }

    return await teamRepository.addMember(
      teamId,
      user.id,
      invitedBy,
      input.role,
    );
  },

  acceptInvite: async (teamId: string, userId: string) => {
    const member = await teamRepository.findMemberByTeamAndUser(teamId, userId);
    if (!member) {
      throw new Error("Invitation not found");
    }
    if (member.status !== "pending") {
      throw new Error("Invitation is no longer pending");
    }
    return await teamRepository.updateMemberStatus(teamId, userId, "active");
  },

  updateMemberRole: async (
    teamId: string,
    userId: string,
    role: string,
    requesterId: string,
  ) => {
    const team = await teamRepository.findTeamById(teamId);
    if (!team) {
      throw new Error("Team not found");
    }
    if (team.owner_id !== requesterId) {
      throw new Error("Only the team owner can change member roles");
    }

    const member = await teamRepository.findMemberByTeamAndUser(teamId, userId);
    if (!member) {
      throw new Error("Member not found");
    }

    return await teamRepository.updateMemberRole(teamId, userId, role);
  },

  removeMember: async (
    teamId: string,
    userId: string,
    requesterId: string,
  ) => {
    const team = await teamRepository.findTeamById(teamId);
    if (!team) {
      throw new Error("Team not found");
    }
    if (team.owner_id !== requesterId) {
      throw new Error("Only the team owner can remove members");
    }
    if (userId === team.owner_id) {
      throw new Error("Cannot remove the team owner");
    }

    const member = await teamRepository.findMemberByTeamAndUser(teamId, userId);
    if (!member) {
      throw new Error("Member not found");
    }

    await teamRepository.removeMember(teamId, userId);
  },

  // ---- Admin overrides ----

  adminDeleteTeam: async (teamId: string) => {
    const team = await teamRepository.findTeamById(teamId);
    if (!team) {
      throw new Error("Team not found");
    }
    await teamRepository.deleteTeam(teamId);
  },

  adminTransferOwnership: async (teamId: string, newOwnerId: string) => {
    const team = await teamRepository.findTeamById(teamId);
    if (!team) {
      throw new Error("Team not found");
    }
    const newOwner = await userRepository.findUserById(newOwnerId);
    if (!newOwner) {
      throw new Error("New owner not found");
    }
    if (team.owner_id === newOwnerId) {
      throw new Error("User is already the team owner");
    }
    return await teamRepository.transferTeamOwnership(teamId, newOwnerId);
  },

  adminRemoveMember: async (teamId: string, userId: string) => {
    const team = await teamRepository.findTeamById(teamId);
    if (!team) {
      throw new Error("Team not found");
    }
    if (userId === team.owner_id) {
      throw new Error("Cannot remove the team owner; transfer ownership first");
    }
    const member = await teamRepository.findMemberByTeamAndUser(teamId, userId);
    if (!member) {
      throw new Error("Member not found");
    }
    await teamRepository.hardRemoveMember(teamId, userId);
  },
};
