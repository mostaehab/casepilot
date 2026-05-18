import { generateObject } from "ai";
import { get } from "@vercel/blob";
import { caseRepository } from "../case/case.repository.js";
import { teamRepository } from "../team/team.repository.js";
import { caseFileRepository } from "../case-file/case-file.repository.js";
import { aiRepository } from "./ai.repository.js";
import {
  caseAnalysisSchema,
  type analyzeCaseInput,
} from "./ai.validation.js";
import { SYSTEM_PROMPT, buildUserPrompt } from "./ai.prompts.js";
import { badRequest, forbidden, notFound } from "../../lib/errors.js";

const MODEL = "anthropic/claude-sonnet-4.6";

const canAccessCase = async (caseId: string, userId: string) => {
  const c = await caseRepository.findCaseById(caseId);
  if (!c) return { allowed: false, case: null };
  if (c.owner_id === userId) return { allowed: true, case: c };

  const assignment = await caseRepository.findAssignmentByCaseAndUser(
    caseId,
    userId,
  );
  if (assignment) return { allowed: true, case: c };

  if (c.team_id) {
    const member = await teamRepository.findMemberByTeamAndUser(
      c.team_id,
      userId,
    );
    if (member && member.status === "active") return { allowed: true, case: c };
  }
  return { allowed: false, case: c };
};

const isPdf = (mime?: string | null) => mime === "application/pdf";
const isImage = (mime?: string | null) => !!mime && mime.startsWith("image/");
const isText = (mime?: string | null) =>
  mime === "text/plain" || mime === "text/csv";

const fetchFilePart = async (file: {
  file_url: string;
  file_name: string;
  file_type: string | null;
}) => {
  const result = await get(file.file_url, { access: "private" });
  if (!result || result.statusCode !== 200) {
    throw notFound(`File ${file.file_name} not found in storage`);
  }
  const buffer = Buffer.from(await new Response(result.stream as any).arrayBuffer());

  if (isPdf(file.file_type) || isImage(file.file_type)) {
    return {
      type: "file" as const,
      data: buffer,
      mediaType: file.file_type ?? "application/octet-stream",
      filename: file.file_name,
    };
  }
  if (isText(file.file_type)) {
    return {
      type: "text" as const,
      text: `--- ${file.file_name} ---\n${buffer.toString("utf8")}`,
    };
  }
  // Unsupported types (docx, xlsx, etc) — extraction TODO.
  return {
    type: "text" as const,
    text: `--- ${file.file_name} ---\n[Unsupported file type for analysis: ${file.file_type ?? "unknown"}]`,
  };
};

export const aiService = {
  analyzeCase: async (
    caseId: string,
    requesterId: string,
    input: analyzeCaseInput,
  ) => {
    const { allowed, case: c } = await canAccessCase(caseId, requesterId);
    if (!c) throw notFound("Case not found");
    if (!allowed) throw forbidden("You do not have access to this case");

    const allFiles = await caseFileRepository.findFilesByCaseId(caseId);
    const files = input.fileIds?.length
      ? allFiles.filter((f) => input.fileIds!.includes(f.id))
      : allFiles;

    if (!files.length) {
      throw badRequest("No documents to analyze");
    }

    const analysis = await aiRepository.createAnalysis({
      caseId,
      requestedBy: requesterId,
      model: MODEL,
      fileIds: files.map((f) => f.id),
    });

    try {
      const parts = await Promise.all(files.map(fetchFilePart));

      const { object } = await generateObject({
        model: MODEL,
        schema: caseAnalysisSchema,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: buildUserPrompt({
                  caseTitle: c.title,
                  caseDescription: c.description,
                  instructions: input.instructions,
                  fileNames: files.map((f) => f.file_name),
                }),
              },
              ...parts,
            ],
          },
        ],
      });

      return await aiRepository.markComplete(analysis.id, object);
    } catch (err: any) {
      await aiRepository.markFailed(
        analysis.id,
        err?.message ?? "Unknown analysis error",
      );
      throw err;
    }
  },

  getAnalysis: async (analysisId: string, requesterId: string) => {
    const analysis = await aiRepository.findById(analysisId);
    if (!analysis) throw notFound("Analysis not found");

    const { allowed } = await canAccessCase(analysis.case_id, requesterId);
    if (!allowed) throw forbidden("You do not have access to this analysis");
    return analysis;
  },

  listAnalysesForCase: async (caseId: string, requesterId: string) => {
    const { allowed, case: c } = await canAccessCase(caseId, requesterId);
    if (!c) throw notFound("Case not found");
    if (!allowed) throw forbidden("You do not have access to this case");
    return await aiRepository.findByCaseId(caseId);
  },
};
