import { pool } from "../../config/db.js";
import {
  createCaseEventInput,
  updateCaseEventInput,
} from "./case-event.validation.js";

export const caseEventRepository = {
  createEvent: async (
    caseId: string,
    createdBy: string,
    input: createCaseEventInput,
  ) => {
    const query = `
      INSERT INTO "case_event" (
        case_id, title, description, event_type, event_date, all_day, created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    const values = [
      caseId,
      input.title,
      input.description ?? null,
      input.eventType,
      input.eventDate,
      input.allDay,
      createdBy,
    ];
    const { rows } = await pool.query(query, values);
    return rows[0];
  },

  findEventById: async (id: string) => {
    const query = `SELECT * FROM "case_event" WHERE id = $1`;
    const { rows } = await pool.query(query, [id]);
    return rows[0];
  },

  findEventsByCaseId: async (caseId: string) => {
    const query = `
      SELECT ce.*, u.name AS creator_name
      FROM "case_event" ce
      JOIN "user" u ON ce.created_by = u.id
      WHERE ce.case_id = $1
      ORDER BY ce.event_date ASC
    `;
    const { rows } = await pool.query(query, [caseId]);
    return rows;
  },

  findUpcomingEventsForUser: async (userId: string, limit: number) => {
    const query = `
      SELECT DISTINCT ce.*, c.title AS case_title, c.case_number,
             u.name AS creator_name
      FROM "case_event" ce
      JOIN "case" c ON ce.case_id = c.id
      JOIN "user" u ON ce.created_by = u.id
      LEFT JOIN "team_member" tm
        ON tm.team_id = c.team_id AND tm.user_id = $1 AND tm.status = 'active'
      LEFT JOIN "case_assignment" ca
        ON ca.case_id = c.id AND ca.user_id = $1
      WHERE ce.completed = false
        AND ce.event_date >= NOW()
        AND c.status NOT IN ('closed', 'archived')
        AND (c.owner_id = $1 OR tm.user_id = $1 OR ca.user_id = $1)
      ORDER BY ce.event_date ASC
      LIMIT $2
    `;
    const { rows } = await pool.query(query, [userId, limit]);
    return rows;
  },

  updateEvent: async (id: string, input: updateCaseEventInput) => {
    const sets: string[] = [];
    const values: unknown[] = [];
    const push = (column: string, value: unknown) => {
      values.push(value);
      sets.push(`${column} = $${values.length}`);
    };

    if (input.title !== undefined) push("title", input.title);
    if (input.description !== undefined) push("description", input.description);
    if (input.eventType !== undefined) push("event_type", input.eventType);
    if (input.eventDate !== undefined) push("event_date", input.eventDate);
    if (input.allDay !== undefined) push("all_day", input.allDay);
    if (input.completed !== undefined) push("completed", input.completed);

    if (sets.length === 0) {
      const { rows } = await pool.query(
        `SELECT * FROM "case_event" WHERE id = $1`,
        [id],
      );
      return rows[0];
    }

    sets.push(`updated_at = NOW()`);
    values.push(id);
    const query = `
      UPDATE "case_event" SET ${sets.join(", ")}
      WHERE id = $${values.length}
      RETURNING *
    `;
    const { rows } = await pool.query(query, values);
    return rows[0];
  },

  deleteEvent: async (id: string) => {
    await pool.query(`DELETE FROM "case_event" WHERE id = $1`, [id]);
  },
};
