import { z } from "zod";

export const uploadFileQueryModel = z.object({
  caseId: z.string().min(1, "Case ID is required"),
});

export type uploadFileQueryInput = z.infer<typeof uploadFileQueryModel>;
