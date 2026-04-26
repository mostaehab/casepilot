import { pool } from "../../config/db.js";
import { createCaseInput, updateCaseInput } from "./case.validation.js";

export const caseRepository = {
  // ---- Case operations ----

  createCase: async (input: createCaseInput, ownerId: string) => {
    const {
      title,
      caseNumber,
      description,
      type,
      priority,
      status,
      courtName,
      filingDate,
      nextHearingDate,
      clientName,
      clientPhone,
      clientNationalNumber,
      teamId,
    } = input;

    const query = `
      INSERT INTO "case" (
        title, case_number, description, type, priority, status,
        court_name, filing_date, next_hearing_date,
        client_name, client_phone, client_national_number,
        team_id, owner_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *
    `;
    const values = [
      title,
      caseNumber || null,
      description || null,
      type || null,
      priority,
      status,
      courtName || null,
      filingDate || null,
      nextHearingDate || null,
      clientName || null,
      clientPhone || null,
      clientNationalNumber || null,
      teamId || null,
      ownerId,
    ];
    const { rows } = await pool.query(query, values);
    return rows[0];
  },

  findCaseById: async (id: string) => {
    const query = `
      SELECT c.*, u.name AS owner_name, u.email AS owner_email,
             t.name AS team_name
      FROM "case" c
      JOIN "user" u ON c.owner_id = u.id
      LEFT JOIN "team" t ON c.team_id = t.id
      WHERE c.id = $1
    `;
    const { rows } = await pool.query(query, [id]);
    return rows[0];
  },

  findCasesByOwnerId: async (ownerId: string) => {
    const query = `SELECT * FROM "case" WHERE owner_id = $1 ORDER BY created_at DESC`;
    const { rows } = await pool.query(query, [ownerId]);
    return rows;
  },

  findCasesByTeamId: async (teamId: string) => {
    const query = `SELECT * FROM "case" WHERE team_id = $1 ORDER BY created_at DESC`;
    const { rows } = await pool.query(query, [teamId]);
    return rows;
  },

  findCasesAssignedToUser: async (userId: string) => {
    const query = `
      SELECT c.* FROM "case" c
      JOIN "case_assignment" ca ON c.id = ca.case_id
      WHERE ca.user_id = $1
      ORDER BY c.created_at DESC
    `;
    const { rows } = await pool.query(query, [userId]);
    return rows;
  },

  updateCase: async (id: string, input: updateCaseInput) => {
    const {
      title,
      caseNumber,
      description,
      type,
      priority,
      status,
      courtName,
      filingDate,
      nextHearingDate,
      clientName,
      clientPhone,
      clientNationalNumber,
      teamId,
    } = input;

    const query = `
      UPDATE "case" SET
        title = COALESCE($1, title),
        case_number = COALESCE($2, case_number),
        description = COALESCE($3, description),
        type = COALESCE($4, type),
        priority = COALESCE($5, priority),
        status = COALESCE($6, status),
        court_name = COALESCE($7, court_name),
        filing_date = COALESCE($8, filing_date),
        next_hearing_date = COALESCE($9, next_hearing_date),
        client_name = COALESCE($10, client_name),
        client_phone = COALESCE($11, client_phone),
        client_national_number = COALESCE($12, client_national_number),
        team_id = $13,
        updated_at = NOW()
      WHERE id = $14
      RETURNING *
    `;
    const values = [
      title || null,
      caseNumber || null,
      description || null,
      type || null,
      priority || null,
      status || null,
      courtName || null,
      filingDate || null,
      nextHearingDate || null,
      clientName || null,
      clientPhone || null,
      clientNationalNumber || null,
      teamId === undefined ? null : teamId,
      id,
    ];
    const { rows } = await pool.query(query, values);
    return rows[0];
  },

  updateCaseStatus: async (id: string, status: string) => {
    const query = `UPDATE "case" SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`;
    const { rows } = await pool.query(query, [status, id]);
    return rows[0];
  },

  deleteCase: async (id: string) => {
    await pool.query(`DELETE FROM "case" WHERE id = $1`, [id]);
  },

  // ---- Assignment operations ----

  assignUser: async (caseId: string, userId: string, assignedBy: string) => {
    const query = `
      INSERT INTO "case_assignment" (case_id, user_id, assigned_by)
      VALUES ($1, $2, $3)
      RETURNING *
    `;
    const { rows } = await pool.query(query, [caseId, userId, assignedBy]);
    return rows[0];
  },

  unassignUser: async (caseId: string, userId: string) => {
    await pool.query(
      `DELETE FROM "case_assignment" WHERE case_id = $1 AND user_id = $2`,
      [caseId, userId],
    );
  },

  findAssignmentsByCaseId: async (caseId: string) => {
    const query = `
      SELECT ca.*, u.name, u.email
      FROM "case_assignment" ca
      JOIN "user" u ON ca.user_id = u.id
      WHERE ca.case_id = $1
    `;
    const { rows } = await pool.query(query, [caseId]);
    return rows;
  },

  findAssignmentByCaseAndUser: async (caseId: string, userId: string) => {
    const query = `SELECT * FROM "case_assignment" WHERE case_id = $1 AND user_id = $2`;
    const { rows } = await pool.query(query, [caseId, userId]);
    return rows[0];
  },
};
