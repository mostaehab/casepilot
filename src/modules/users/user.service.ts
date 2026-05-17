import { buildPaginationMeta, buildQuery } from "../../utils/query.js";
import { conflict, forbidden, notFound } from "../../lib/errors.js";
import { userRepository } from "./user.repository.js";
import { updateUserInput } from "./user.validation.js";

const ensureSelfOrAdmin = (
  targetId: string,
  requesterId: string,
  requesterRole: string,
) => {
  if (requesterRole !== "admin" && targetId !== requesterId) {
    throw forbidden("You can only access your own account");
  }
};

const userQueryConfig = {
  filterable: {
    role: { column: '"user".role', operators: ["eq", "in"] as const },
    isActive: { column: '"user".is_active', operators: ["eq"] as const },
  },
  sortable: {
    createdAt: '"user".created_at',
    updatedAt: '"user".updated_at',
    name: '"user".name',
    email: '"user".email',
  },
  searchable: ['"user".name', '"user".email'],
  defaultSort: { column: '"user".created_at', direction: "DESC" as const },
  defaultLimit: 10,
  maxLimit: 100,
};

export const userService = {
  findUserById: async (
    id: string,
    requesterId: string,
    requesterRole: string,
  ) => {
    ensureSelfOrAdmin(id, requesterId, requesterRole);
    const user = await userRepository.findUserById(id);
    if (!user) {
      throw notFound("User not found");
    }
    return user;
  },

  findAllUsers: async (reqQuery: any) => {
    const built = buildQuery(reqQuery, userQueryConfig);
    const { rows, total } = await userRepository.findAllUsers(built);
    return {
      data: rows,
      pagination: buildPaginationMeta(built.page, built.limit, total),
    };
  },

  updateUserById: async (
    id: string,
    input: updateUserInput,
    requesterId: string,
    requesterRole: string,
  ) => {
    ensureSelfOrAdmin(id, requesterId, requesterRole);
    const user = await userRepository.findUserById(id);
    if (!user) {
      throw notFound("User not found");
    }
    return await userRepository.updateUserById(id, input);
  },

  deleteUserById: async (
    id: string,
    requesterId: string,
    requesterRole: string,
  ) => {
    ensureSelfOrAdmin(id, requesterId, requesterRole);
    const user = await userRepository.findUserById(id);
    if (!user) {
      throw notFound("User not found");
    }
    await userRepository.deleteUserById(id);
  },

  // ---- Admin overrides ----

  adminRestoreUser: async (id: string) => {
    const user = await userRepository.findUserById(id);
    if (!user) {
      throw notFound("User not found");
    }
    return await userRepository.setUserActive(id, true);
  },

  adminHardDeleteUser: async (id: string, requesterId: string) => {
    if (id === requesterId) {
      throw conflict("You cannot delete your own admin account");
    }
    const user = await userRepository.findUserById(id);
    if (!user) {
      throw notFound("User not found");
    }
    await userRepository.hardDeleteUser(id);
  },

  adminUpdateUserRole: async (id: string, role: string) => {
    const user = await userRepository.findUserById(id);
    if (!user) {
      throw notFound("User not found");
    }
    return await userRepository.updateUserRole(id, role);
  },
};
