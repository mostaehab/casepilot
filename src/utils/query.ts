export type FilterOp =
  | "eq"
  | "neq"
  | "lt"
  | "lte"
  | "gt"
  | "gte"
  | "in"
  | "like"
  | "ilike";

const OP_SQL: Record<FilterOp, string> = {
  eq: "=",
  neq: "!=",
  lt: "<",
  lte: "<=",
  gt: ">",
  gte: ">=",
  in: "IN",
  like: "LIKE",
  ilike: "ILIKE",
};

const OP_ALIAS: Record<string, FilterOp> = {
  eq: "eq",
  neq: "neq",
  ne: "neq",
  lt: "lt",
  lte: "lte",
  gt: "gt",
  gte: "gte",
  in: "in",
  like: "like",
  ilike: "ilike",
};

export interface FilterableField {
  /** Fully-qualified column name, e.g. `"c.status"` or `"\"isActive\""` */
  column: string;
  /** Allowed operators. Default: `["eq"]`. */
  operators?: readonly FilterOp[];
  /** Optional value coercer (e.g. parse boolean / int / date). */
  parse?: (v: string) => unknown;
}

export interface QueryConfig {
  /** Map of `?key=value` filter keys to column definitions. */
  filterable?: Record<string, FilterableField>;
  /** Map of `?sort=key` aliases to column names. */
  sortable?: Record<string, string>;
  /** Columns scanned by `?q=` (ILIKE OR'd together). */
  searchable?: string[];
  /** Used when `?sort` is absent. */
  defaultSort?: { column: string; direction?: "ASC" | "DESC" };
  defaultLimit?: number;
  maxLimit?: number;
}

export interface BuiltQuery {
  /** `WHERE ...` (with prefix) or empty string. */
  where: string;
  /** `ORDER BY ...` (with prefix) or empty string. */
  orderBy: string;
  /** `LIMIT $n OFFSET $m` (with prefix) or empty string. */
  pagination: string;
  /** Params for the WHERE clause only (use with COUNT queries). */
  whereValues: unknown[];
  /** Params for WHERE + LIMIT + OFFSET (use with the data query). */
  values: unknown[];
  page: number;
  limit: number;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const RESERVED = new Set(["page", "limit", "sort", "q"]);

const KEY_RE = /^([^[\]]+)(?:\[([^\]]+)\])?$/;

export const buildQuery = (
  reqQuery: Record<string, unknown> = {},
  config: QueryConfig = {},
): BuiltQuery => {
  const conditions: string[] = [];
  const whereValues: unknown[] = [];

  for (const rawKey of Object.keys(reqQuery)) {
    if (RESERVED.has(rawKey)) continue;
    const match = rawKey.match(KEY_RE);
    if (!match) continue;

    const field = match[1];
    const opAlias = (match[2] || "eq").toLowerCase();
    const def = config.filterable?.[field];
    if (!def) continue;

    const op = OP_ALIAS[opAlias];
    if (!op) continue;
    const allowed = def.operators ?? ["eq"];
    if (!allowed.includes(op)) continue;

    const raw = reqQuery[rawKey];
    if (raw === undefined || raw === null || raw === "") continue;

    if (op === "in") {
      const arr = Array.isArray(raw) ? raw : String(raw).split(",");
      const items = arr.map((v) => String(v).trim()).filter(Boolean);
      if (!items.length) continue;
      const placeholders = items
        .map((v) => {
          whereValues.push(def.parse ? def.parse(v) : v);
          return `$${whereValues.length}`;
        })
        .join(", ");
      conditions.push(`${def.column} IN (${placeholders})`);
      continue;
    }

    const value = def.parse ? def.parse(String(raw)) : raw;
    if (op === "like" || op === "ilike") {
      whereValues.push(`%${value}%`);
    } else {
      whereValues.push(value);
    }
    conditions.push(`${def.column} ${OP_SQL[op]} $${whereValues.length}`);
  }

  const q = reqQuery.q;
  if (q && typeof q === "string" && config.searchable?.length) {
    whereValues.push(`%${q}%`);
    const idx = whereValues.length;
    const parts = config.searchable.map((col) => `${col} ILIKE $${idx}`);
    conditions.push(`(${parts.join(" OR ")})`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  let orderBy = "";
  if (reqQuery.sort && config.sortable) {
    const fields = String(reqQuery.sort)
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const parts: string[] = [];
    for (const f of fields) {
      const dir = f.startsWith("-") ? "DESC" : "ASC";
      const name = f.replace(/^[-+]/, "");
      const col = config.sortable[name];
      if (col) parts.push(`${col} ${dir}`);
    }
    if (parts.length) orderBy = `ORDER BY ${parts.join(", ")}`;
  }
  if (!orderBy && config.defaultSort) {
    orderBy = `ORDER BY ${config.defaultSort.column} ${config.defaultSort.direction ?? "ASC"}`;
  }

  const defaultLimit = config.defaultLimit ?? 10;
  const maxLimit = config.maxLimit ?? 100;
  const page = Math.max(1, parseInt(String(reqQuery.page ?? ""), 10) || 1);
  const limit = Math.min(
    maxLimit,
    Math.max(1, parseInt(String(reqQuery.limit ?? ""), 10) || defaultLimit),
  );
  const offset = (page - 1) * limit;

  const pagination = `LIMIT $${whereValues.length + 1} OFFSET $${whereValues.length + 2}`;
  const values = [...whereValues, limit, offset];

  return { where, orderBy, pagination, whereValues, values, page, limit };
};

export const buildPaginationMeta = (
  page: number,
  limit: number,
  total: number,
): PaginationMeta => ({
  page,
  limit,
  total,
  totalPages: total === 0 ? 0 : Math.ceil(total / limit),
});

const TRUE_SET = new Set(["1", "true", "yes", "on", "t"]);
const FALSE_SET = new Set(["0", "false", "no", "off", "f"]);

export const parsers = {
  bool: (v: string) => {
    const s = v.toLowerCase();
    if (TRUE_SET.has(s)) return true;
    if (FALSE_SET.has(s)) return false;
    return v;
  },
  int: (v: string) => {
    const n = parseInt(v, 10);
    return Number.isNaN(n) ? v : n;
  },
  date: (v: string) => {
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? v : d.toISOString();
  },
};
