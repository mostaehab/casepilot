/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
export const up = (pgm) => {
  pgm.createTable("case_analysis", {
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
    requested_by: {
      type: "text",
      notNull: true,
      references: '"user"',
      onDelete: "RESTRICT",
    },
    model: { type: "text", notNull: true },
    status: { type: "text", notNull: true, default: "pending" },
    summary: { type: "text" },
    hints: { type: "jsonb" },
    file_ids: { type: "jsonb" },
    error: { type: "text" },
    created_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("NOW()"),
    },
    completed_at: { type: "timestamptz" },
  });

  pgm.createIndex("case_analysis", "case_id");
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
export const down = (pgm) => {
  pgm.dropTable("case_analysis");
};
