import { pool } from "../../config/db.js";

export const caseFileRepository = {
  createFile: async (input: {
    caseId: string;
    uploadedBy: string;
    fileName: string;
    fileUrl: string;
    fileType?: string;
    fileSize?: number;
  }) => {
    const query = `
      INSERT INTO "case_file" (case_id, uploaded_by, file_name, file_url, file_type, file_size)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    const values = [
      input.caseId,
      input.uploadedBy,
      input.fileName,
      input.fileUrl,
      input.fileType || null,
      input.fileSize || null,
    ];
    const { rows } = await pool.query(query, values);
    return rows[0];
  },

  findFileById: async (id: string) => {
    const query = `SELECT * FROM "case_file" WHERE id = $1`;
    const { rows } = await pool.query(query, [id]);
    return rows[0];
  },

  findFilesByCaseId: async (caseId: string) => {
    const query = `
      SELECT cf.*, u.name AS uploader_name
      FROM "case_file" cf
      JOIN "user" u ON cf.uploaded_by = u.id
      WHERE cf.case_id = $1
      ORDER BY cf.uploaded_at DESC
    `;
    const { rows } = await pool.query(query, [caseId]);
    return rows;
  },

  deleteFile: async (id: string) => {
    await pool.query(`DELETE FROM "case_file" WHERE id = $1`, [id]);
  },
};
