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
  pgm.createTable("team", {
    id: {
      type: "text",
      primaryKey: true,
      default: pgm.func("gen_random_uuid()::text"),
    },
    name: { type: "text", notNull: true },
    description: { type: "text" },
    owner_id: {
      type: "text",
      notNull: true,
      references: '"user"',
      onDelete: "CASCADE",
    },
    created_at: {
      type: "timestamptz",
      default: pgm.func("NOW()"),
    },
    updated_at: {
      type: "timestamptz",
      default: pgm.func("NOW()"),
    },
  });

  pgm.createTable("team_member", {
    id: {
      type: "text",
      primaryKey: true,
      default: pgm.func("gen_random_uuid()::text"),
    },
    team_id: {
      type: "text",
      notNull: true,
      references: '"team"',
      onDelete: "CASCADE",
    },
    user_id: {
      type: "text",
      notNull: true,
      references: '"user"',
      onDelete: "CASCADE",
    },
    invited_by: {
      type: "text",
      notNull: true,
      references: '"user"',
    },
    role: { type: "text", notNull: true },
    status: { type: "text", notNull: true, default: "pending" },
    joined_at: { type: "timestamptz" },
    created_at: {
      type: "timestamptz",
      default: pgm.func("NOW()"),
    },
  });

  pgm.addConstraint("team_member", "team_member_team_user_unique", {
    unique: ["team_id", "user_id"],
  });

  pgm.createIndex("team", "owner_id");
  pgm.createIndex("team_member", "team_id");
  pgm.createIndex("team_member", "user_id");
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  pgm.dropTable("team_member");
  pgm.dropTable("team");
};
