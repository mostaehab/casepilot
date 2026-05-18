export const SYSTEM_PROMPT = `You are CasePilot's legal case analyst.

You assist lawyers by analyzing the documents attached to a case.

For every analysis you must produce:
1. A concise, neutral summary of the case based ONLY on the attached documents.
2. A list of actionable hints the lawyer should consider — missing evidence, weak points, deadlines, contradictions, or strategic angles.

Rules:
- Never invent facts. If something is unclear or missing, say so in a hint.
- Cite the document name when a hint depends on a specific document.
- Keep the summary under 250 words.
- Hints must be specific and actionable, not generic legal advice.
- Respond strictly in the structured schema requested.`;

export const buildUserPrompt = (input: {
  caseTitle: string;
  caseDescription?: string | null;
  instructions?: string;
  fileNames: string[];
}) => {
  const parts: string[] = [];
  parts.push(`Case title: ${input.caseTitle}`);
  if (input.caseDescription) {
    parts.push(`Case description: ${input.caseDescription}`);
  }
  parts.push(
    `Attached documents (${input.fileNames.length}): ${input.fileNames.join(", ")}`,
  );
  if (input.instructions) {
    parts.push(`Additional instructions from the lawyer: ${input.instructions}`);
  }
  parts.push("Analyze the attached documents and return the structured result.");
  return parts.join("\n\n");
};
