import { pool } from "../../config/db.js";
import { BuiltQuery } from "../../utils/query.js";
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

  findAllCases: async (q: BuiltQuery) => {
    const dataQuery = `
      SELECT c.*, u.name AS owner_name, u.email AS owner_email,
             t.name AS team_name
      FROM "case" c
      JOIN "user" u ON c.owner_id = u.id
      LEFT JOIN "team" t ON c.team_id = t.id
      ${q.where}
      ${q.orderBy}
      ${q.pagination}
    `;
    const countQuery = `SELECT COUNT(*)::int AS total FROM "case" c ${q.where}`;

    const [dataResult, countResult] = await Promise.all([
      pool.query(dataQuery, q.values),
      pool.query(countQuery, q.whereValues),
    ]);

    return {
      rows: dataResult.rows,
      total: countResult.rows[0].total as number,
    };
  },

  findUpcomingCases: async (userId: string, limit: number) => {
    const query = `
      SELECT DISTINCT c.*, u.name AS owner_name, u.email AS owner_email,
             t.name AS team_name
      FROM "case" c
      JOIN "user" u ON c.owner_id = u.id
      LEFT JOIN "team" t ON c.team_id = t.id
      LEFT JOIN "team_member" tm
        ON tm.team_id = c.team_id AND tm.user_id = $1 AND tm.status = 'active'
      LEFT JOIN "case_assignment" ca
        ON ca.case_id = c.id AND ca.user_id = $1
      WHERE c.next_hearing_date IS NOT NULL
        AND c.next_hearing_date >= NOW()
        AND c.status NOT IN ('closed', 'archived')
        AND (c.owner_id = $1 OR tm.user_id = $1 OR ca.user_id = $1)
      ORDER BY c.next_hearing_date ASC
      LIMIT $2
    `;
    const { rows } = await pool.query(query, [userId, limit]);
    return rows;
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

  findAccessibleCases: async (userId: string) => {
    const query = `
      SELECT DISTINCT c.*, u.name AS owner_name, u.email AS owner_email,
             t.name AS team_name
      FROM "case" c
      JOIN "user" u ON c.owner_id = u.id
      LEFT JOIN "team" t ON c.team_id = t.id
      LEFT JOIN "team_member" tm
        ON tm.team_id = c.team_id AND tm.user_id = $1 AND tm.status = 'active'
      LEFT JOIN "case_assignment" ca
        ON ca.case_id = c.id AND ca.user_id = $1
      WHERE c.owner_id = $1 OR tm.user_id = $1 OR ca.user_id = $1
      ORDER BY c.created_at DESC
    `;
    const { rows } = await pool.query(query, [userId]);
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
    const sets: string[] = [];
    const values: unknown[] = [];
    const push = (column: string, value: unknown) => {
      values.push(value);
      sets.push(`${column} = $${values.length}`);
    };

    if (input.title !== undefined) push("title", input.title);
    if (input.caseNumber !== undefined) push("case_number", input.caseNumber);
    if (input.description !== undefined) push("description", input.description);
    if (input.type !== undefined) push("type", input.type);
    if (input.priority !== undefined) push("priority", input.priority);
    if (input.status !== undefined) push("status", input.status);
    if (input.courtName !== undefined) push("court_name", input.courtName);
    if (input.filingDate !== undefined) push("filing_date", input.filingDate);
    if (input.nextHearingDate !== undefined)
      push("next_hearing_date", input.nextHearingDate);
    if (input.clientName !== undefined) push("client_name", input.clientName);
    if (input.clientPhone !== undefined) push("client_phone", input.clientPhone);
    if (input.clientNationalNumber !== undefined)
      push("client_national_number", input.clientNationalNumber);
    if (input.teamId !== undefined) push("team_id", input.teamId);

    if (sets.length === 0) {
      const { rows } = await pool.query(
        `SELECT * FROM "case" WHERE id = $1`,
        [id],
      );
      return rows[0];
    }

    sets.push(`updated_at = NOW()`);
    values.push(id);
    const query = `
      UPDATE "case" SET ${sets.join(", ")}
      WHERE id = $${values.length}
      RETURNING *
    `;
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

  transferCaseOwnership: async (id: string, newOwnerId: string) => {
    const query = `UPDATE "case" SET owner_id = $1, updated_at = NOW() WHERE id = $2 RETURNING *`;
    const { rows } = await pool.query(query, [newOwnerId, id]);
    return rows[0];
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
