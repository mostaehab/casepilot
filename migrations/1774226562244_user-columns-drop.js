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
  pgm.alterTable("user", (t) => {
    (t.dropColumn("name"), t.dropColumn("image"));
  });
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  pgm.alterTable("user", (t) => {
    t.addColumn("name", { type: "varchar(255)", notNull: true });
    t.addColumn("image", { type: "varchar(255)", notNull: true });
  });
};
