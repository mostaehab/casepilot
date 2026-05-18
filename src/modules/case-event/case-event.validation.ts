import { z } from "zod";

const caseEventTypeEnum = z.enum([
  "hearing",
  "deadline",
  "filing",
  "meeting",
  "reminder",
  "other",
]);

export const createCaseEventModel = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  eventType: caseEventTypeEnum.default("deadline"),
  eventDate: z.iso.datetime(),
  allDay: z.boolean().default(false),
});

export type createCaseEventInput = z.infer<typeof createCaseEventModel>;

export const updateCaseEventModel = z.object({
  title: z.string().min(1, "Title is required").optional(),
  description: z.string().nullable().optional(),
  eventType: caseEventTypeEnum.optional(),
  eventDate: z.iso.datetime().optional(),
  allDay: z.boolean().optional(),
  completed: z.boolean().optional(),
});

export type updateCaseEventInput = z.infer<typeof updateCaseEventModel>;
