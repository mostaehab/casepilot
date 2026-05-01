import { z } from "zod";

const caseStatusEnum = z.enum([
  "open",
  "in_progress",
  "on_hold",
  "closed",
  "archived",
]);

const casePriorityEnum = z.enum(["low", "medium", "high", "urgent"]);

export const createCaseModel = z.object({
  title: z.string().min(3, "Title is required"),
  caseNumber: z.string().optional(),
  description: z.string().optional(),
  type: z.string().optional(),
  priority: casePriorityEnum.default("medium"),
  status: caseStatusEnum.default("open"),
  courtName: z.string().optional(),
  filingDate: z.iso.date().optional(),
  nextHearingDate: z.iso.datetime().optional(),
  clientName: z.string().optional(),
  clientPhone: z.string().optional(),
  clientNationalNumber: z.string().optional(),
  teamId: z.string().optional(),
});

export type createCaseInput = z.infer<typeof createCaseModel>;

export const updateCaseModel = z.object({
  title: z.string().min(3, "Title is required").optional(),
  caseNumber: z.string().optional(),
  description: z.string().optional(),
  type: z.string().optional(),
  priority: casePriorityEnum.optional(),
  status: caseStatusEnum.optional(),
  courtName: z.string().optional(),
  filingDate: z.iso.date().optional(),
  nextHearingDate: z.iso.datetime().optional(),
  clientName: z.string().optional(),
  clientPhone: z.string().optional(),
  clientNationalNumber: z.string().optional(),
  teamId: z.string().nullable().optional(),
});

export type updateCaseInput = z.infer<typeof updateCaseModel>;

export const updateCaseStatusModel = z.object({
  status: caseStatusEnum,
});

export type updateCaseStatusInput = z.infer<typeof updateCaseStatusModel>;

export const assignCaseModel = z.object({
  userId: z.string().min(1, "User ID is required"),
});

export type assignCaseInput = z.infer<typeof assignCaseModel>;

export const transferCaseModel = z.object({
  newOwnerId: z.string().min(1, "New owner ID is required"),
});

export type transferCaseInput = z.infer<typeof transferCaseModel>;
