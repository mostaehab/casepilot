import { z } from "zod";

export const createTeamModel = z.object({
  name: z.string().min(3, "Team name is required"),
  description: z.string().optional(),
});

export type createTeamInput = z.infer<typeof createTeamModel>;

export const updateTeamModel = z.object({
  name: z.string().min(3, "Team name is required").optional(),
  description: z.string().optional(),
});

export type updateTeamInput = z.infer<typeof updateTeamModel>;

export const inviteMemberModel = z.object({
  email: z.string().email("Invalid email address"),
  role: z.enum(["lawyer", "assistant"], "Role is required"),
});

export type inviteMemberInput = z.infer<typeof inviteMemberModel>;

export const updateMemberRoleModel = z.object({
  role: z.enum(["lawyer", "assistant"], "Role is required"),
});

export type updateMemberRoleInput = z.infer<typeof updateMemberRoleModel>;
