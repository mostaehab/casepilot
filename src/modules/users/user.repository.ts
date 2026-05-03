import { pool } from "../../config/db.js";
import { BuiltQuery } from "../../utils/query.js";
import { updateUserInput } from "./user.validation.js";

export const userRepository = {
  findAllUsers: async (q: BuiltQuery) => {
    const dataQuery = `
      SELECT id, name, email, role, is_active, created_at, updated_at
      FROM "user"
      ${q.where}
      ${q.orderBy}
      ${q.pagination}
    `;
    const countQuery = `SELECT COUNT(*)::int AS total FROM "user" ${q.where}`;
    const [dataResult, countResult] = await Promise.all([
      pool.query(dataQuery, q.values),
      pool.query(countQuery, q.whereValues),
    ]);
    return {
      rows: dataResult.rows,
      total: countResult.rows[0].total as number,
    };
  },

  findUserByEmail: async (email: string) => {
    const query = `SELECT * FROM "user" WHERE email = $1`;
    const { rows } = await pool.query(query, [email]);
    return rows[0];
  },

  findUserById: async (id: string) => {
    const query = `SELECT * FROM "user" WHERE id = $1`;
    const { rows } = await pool.query(query, [id]);
    return rows[0];
  },

  updateUserById: async (id: string, input: updateUserInput) => {
    const { name, email } = input;
    const query = `UPDATE "user" SET name = $1, email = $2, updated_at = NOW() WHERE id = $3 RETURNING id, name, email, role`;
    const { rows } = await pool.query(query, [name, email, id]);
    return rows[0];
  },

  setUserActive: async (id: string, isActive: boolean) => {
    const query = `UPDATE "user" SET is_active = $1, updated_at = NOW() WHERE id = $2 RETURNING id, name, email, role, is_active`;
    const { rows } = await pool.query(query, [isActive, id]);
    return rows[0];
  },

  updateUserRole: async (id: string, role: string) => {
    const query = `UPDATE "user" SET role = $1, updated_at = NOW() WHERE id = $2 RETURNING id, name, email, role`;
    const { rows } = await pool.query(query, [role, id]);
    return rows[0];
  },

  hardDeleteUser: async (id: string) => {
    await pool.query(`DELETE FROM "user" WHERE id = $1`, [id]);
  },

  deleteUserById: async (id: string) => {
    await pool.query(
      `UPDATE "user" SET is_active = false, updated_at = NOW() WHERE id = $1`,
      [id],
    );
  },
};
