import { z } from "zod";

export const analyzeCaseModel = z.object({
  fileIds: z.array(z.string().min(1)).optional(),
  instructions: z.string().max(2000).optional(),
});

export type analyzeCaseInput = z.infer<typeof analyzeCaseModel>;

export const caseAnalysisSchema = z.object({
  summary: z.string().describe("A concise summary of the case based on the documents."),
  hints: z
    .array(
      z.object({
        title: z.string().describe("Short hint title."),
        detail: z.string().describe("Actionable explanation for the lawyer."),
        severity: z.enum(["info", "warning", "critical"]).default("info"),
      }),
    )
    .describe("Actionable hints the lawyer should consider."),
});

export type CaseAnalysisOutput = z.infer<typeof caseAnalysisSchema>;
