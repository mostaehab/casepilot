import { pool } from "../../config/db.js";
import type { CaseAnalysisOutput } from "./ai.validation.js";

export const aiRepository = {
  createAnalysis: async (input: {
    caseId: string;
    requestedBy: string;
    model: string;
    fileIds: string[];
  }) => {
    const query = `
      INSERT INTO "case_analysis" (case_id, requested_by, model, file_ids, status)
      VALUES ($1, $2, $3, $4::jsonb, 'pending')
      RETURNING *
    `;
    const values = [
      input.caseId,
      input.requestedBy,
      input.model,
      JSON.stringify(input.fileIds),
    ];
    const { rows } = await pool.query(query, values);
    return rows[0];
  },

  markComplete: async (id: string, result: CaseAnalysisOutput) => {
    const query = `
      UPDATE "case_analysis"
      SET status = 'completed',
          summary = $2,
          hints = $3::jsonb,
          completed_at = NOW()
      WHERE id = $1
      RETURNING *
    `;
    const { rows } = await pool.query(query, [
      id,
      result.summary,
      JSON.stringify(result.hints),
    ]);
    return rows[0];
  },

  markFailed: async (id: string, error: string) => {
    const query = `
      UPDATE "case_analysis"
      SET status = 'failed',
          error = $2,
          completed_at = NOW()
      WHERE id = $1
      RETURNING *
    `;
    const { rows } = await pool.query(query, [id, error]);
    return rows[0];
  },

  findById: async (id: string) => {
    const { rows } = await pool.query(
      `SELECT * FROM "case_analysis" WHERE id = $1`,
      [id],
    );
    return rows[0];
  },

  findByCaseId: async (caseId: string) => {
    const { rows } = await pool.query(
      `SELECT * FROM "case_analysis" WHERE case_id = $1 ORDER BY created_at DESC`,
      [caseId],
    );
    return rows;
  },
};
