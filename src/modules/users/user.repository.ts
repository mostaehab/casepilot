import { pool } from "../../config/db.js";
import { updateUserInput } from "./user.validation.js";

export const userRepository = {
  findAllUsers: async () => {
    const query = `SELECT id, name, email, role, is_active, created_at, updated_at FROM "user"`;
    const { rows } = await pool.query(query);
    return rows;
  },

  findUserByEmail: async (email: string) => {
    const query = `SELECT * FROM "user" WHERE email = $1`;
    const values = [email];
    const { rows } = await pool.query(query, values);
    return rows[0];
  },

  findUserById: async (id: string) => {
    const query = `SELECT * FROM "user" WHERE id = $1`;
    const values = [id];
    const { rows } = await pool.query(query, values);
    return rows[0];
  },

  updateUserById: async (id: string, input: updateUserInput) => {
    const { name, email } = input;
    const query = `UPDATE "user" SET name = $1, email = $2 WHERE id = $3 RETURNING name, email, role`;
    const values = [name, email, id];
    const { rows } = await pool.query(query, values);
    return rows[0];
  },

  deleteUserById: async (id: string) => {
    const query = `UPDATE "user" SET is_active = false WHERE id = $1`;
    const values = [id];
    await pool.query(query, values);
  },
};
