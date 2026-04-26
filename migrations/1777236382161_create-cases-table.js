/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const up = (pgm) => {
  pgm.createTable("case", {
    id: {
      type: "text",
      primaryKey: true,
      default: pgm.func("gen_random_uuid()::text"),
    },
    case_number: { type: "text", unique: true },
    title: { type: "text", notNull: true },
    description: { type: "text" },
    type: { type: "text" },
    priority: { type: "text", notNull: true, default: "medium" },
    status: { type: "text", notNull: true, default: "open" },
    court_name: { type: "text" },
    filing_date: { type: "date" },
    next_hearing_date: { type: "timestamptz" },
    client_name: { type: "text" },
    client_phone: { type: "text" },
    client_national_number: { type: "text" },
    team_id: {
      type: "text",
      references: '"team"',
      onDelete: "SET NULL",
    },
    owner_id: {
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

  pgm.createTable("case_assignment", {
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
    user_id: {
      type: "text",
      notNull: true,
      references: '"user"',
      onDelete: "CASCADE",
    },
    assigned_by: {
      type: "text",
      notNull: true,
      references: '"user"',
    },
    assigned_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("NOW()"),
    },
  });

  pgm.addConstraint("case_assignment", "case_assignment_case_user_unique", {
    unique: ["case_id", "user_id"],
  });

  pgm.createTable("case_file", {
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
    uploaded_by: {
      type: "text",
      notNull: true,
      references: '"user"',
    },
    file_name: { type: "text", notNull: true },
    file_url: { type: "text", notNull: true },
    file_type: { type: "text" },
    file_size: { type: "integer" },
    uploaded_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("NOW()"),
    },
  });

  pgm.createIndex("case", "team_id");
  pgm.createIndex("case", "owner_id");
  pgm.createIndex("case", "status");
  pgm.createIndex("case_assignment", "case_id");
  pgm.createIndex("case_assignment", "user_id");
  pgm.createIndex("case_file", "case_id");
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  pgm.dropTable("case_file");
  pgm.dropTable("case_assignment");
  pgm.dropTable("case");
};
