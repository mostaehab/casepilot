import { pool } from "../../config/db.js";
import { createTeamInput, updateTeamInput } from "./team.validation.js";

export const teamRepository = {
  // ---- Team operations ----

  createTeam: async (input: createTeamInput, ownerId: string) => {
    const { name, description } = input;
    const query = `INSERT INTO "team" (name, description, owner_id) VALUES ($1, $2, $3) RETURNING *`;
    const values = [name, description || null, ownerId];
    const { rows } = await pool.query(query, values);
    return rows[0];
  },

  findTeamById: async (id: string) => {
    const query = `
      SELECT t.*, u.name AS owner_name, u.email AS owner_email
      FROM "team" t
      JOIN "user" u ON t.owner_id = u.id
      WHERE t.id = $1
    `;
    const values = [id];
    const { rows } = await pool.query(query, values);
    return rows[0];
  },

  findTeamByOwnerId: async (ownerId: string) => {
    const query = `SELECT * FROM "team" WHERE owner_id = $1`;
    const values = [ownerId];
    const { rows } = await pool.query(query, values);
    return rows[0];
  },

  updateTeam: async (id: string, input: updateTeamInput) => {
    const { name, description } = input;
    const query = `UPDATE "team" SET name = COALESCE($1, name), description = COALESCE($2, description), updated_at = NOW() WHERE id = $3 RETURNING *`;
    const values = [name || null, description || null, id];
    const { rows } = await pool.query(query, values);
    return rows[0];
  },

  deleteTeam: async (id: string) => {
    await pool.query(`DELETE FROM "team_member" WHERE team_id = $1`, [id]);
    await pool.query(`DELETE FROM "team" WHERE id = $1`, [id]);
  },

  // ---- Member operations ----

  addMember: async (
    teamId: string,
    userId: string,
    invitedBy: string,
    role: string,
  ) => {
    const query = `
      INSERT INTO "team_member" (team_id, user_id, invited_by, role, status)
      VALUES ($1, $2, $3, $4, 'pending')
      RETURNING *
    `;
    const values = [teamId, userId, invitedBy, role];
    const { rows } = await pool.query(query, values);
    return rows[0];
  },

  findMembersByTeamId: async (teamId: string) => {
    const query = `
      SELECT tm.*, u.name, u.email
      FROM "team_member" tm
      JOIN "user" u ON tm.user_id = u.id
      WHERE tm.team_id = $1 AND tm.status != 'removed'
    `;
    const values = [teamId];
    const { rows } = await pool.query(query, values);
    return rows;
  },

  findMemberByTeamAndUser: async (teamId: string, userId: string) => {
    const query = `SELECT * FROM "team_member" WHERE team_id = $1 AND user_id = $2`;
    const values = [teamId, userId];
    const { rows } = await pool.query(query, values);
    return rows[0];
  },

  updateMemberRole: async (teamId: string, userId: string, role: string) => {
    const query = `UPDATE "team_member" SET role = $1 WHERE team_id = $2 AND user_id = $3 RETURNING *`;
    const values = [role, teamId, userId];
    const { rows } = await pool.query(query, values);
    return rows[0];
  },

  updateMemberStatus: async (
    teamId: string,
    userId: string,
    status: string,
  ) => {
    const query = `
      UPDATE "team_member" SET status = $1, joined_at = ${status === "active" ? "NOW()" : "joined_at"}
      WHERE team_id = $2 AND user_id = $3 RETURNING *
    `;
    const values = [status, teamId, userId];
    const { rows } = await pool.query(query, values);
    return rows[0];
  },

  removeMember: async (teamId: string, userId: string) => {
    const query = `UPDATE "team_member" SET status = 'removed' WHERE team_id = $1 AND user_id = $2 RETURNING *`;
    const values = [teamId, userId];
    const { rows } = await pool.query(query, values);
    return rows[0];
  },

  findTeamsByUserId: async (userId: string) => {
    const query = `
      SELECT t.*, tm.role AS member_role, tm.status
      FROM "team" t
      JOIN "team_member" tm ON t.id = tm.team_id
      WHERE tm.user_id = $1 AND tm.status != 'removed'
    `;
    const values = [userId];
    const { rows } = await pool.query(query, values);
    return rows;
  },
};
