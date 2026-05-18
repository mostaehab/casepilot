/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
export const up = (pgm) => {
  pgm.createTable("case_event", {
    id: {
      type: "text",
      primaryKey: true,
      default: pgm.func("gen_random_uuid()::text"),
    },
    case_id: {
      type: "text",
      notNull: true,
      references: '"case"',
      onDelete: "CASCADE",
    },
    title: { type: "text", notNull: true },
    description: { type: "text" },
    event_type: { type: "text", notNull: true, default: "deadline" },
    event_date: { type: "timestamptz", notNull: true },
    all_day: { type: "boolean", notNull: true, default: false },
    completed: { type: "boolean", notNull: true, default: false },
    created_by: {
      type: "text",
      notNull: true,
      references: '"user"',
      onDelete: "RESTRICT",
    },
    created_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("NOW()"),
    },
    updated_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("NOW()"),
    },
  });

  pgm.createIndex("case_event", "case_id");
  pgm.createIndex("case_event", "event_date");
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
export const down = (pgm) => {
  pgm.dropTable("case_event");
};
