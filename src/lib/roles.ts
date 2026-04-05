export const ROLES = {
  ADMIN: "admin",
  LAWYER: "lawyer",
  ASSISTANT: "assistant",
};

export type Role = (typeof ROLES)[keyof typeof ROLES];
