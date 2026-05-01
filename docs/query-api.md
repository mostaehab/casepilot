# Query API — filtering, sorting, pagination, search

Any list endpoint wired to `src/utils/query.ts` accepts a uniform set of query string parameters. Each endpoint declares an allowlist (filterable columns, sortable columns, searchable columns), so unknown params are silently ignored — they never reach the SQL.

## Common parameters

| Param        | Description                                                     | Example                       |
|--------------|-----------------------------------------------------------------|-------------------------------|
| `page`       | 1-based page index. Clamped to `>= 1`. Default `1`.             | `?page=2`                     |
| `limit`      | Page size. Clamped to `[1, maxLimit]`. Default `10`, max `100`. | `?limit=25`                   |
| `sort`       | Comma-separated sortable keys. Prefix `-` for DESC.             | `?sort=-createdAt,title`      |
| `q`          | Full-text-ish search across the endpoint's `searchable` cols.   | `?q=smith`                    |
| `<field>`    | Filter shorthand → `field = value`.                             | `?status=open`                |
| `<field>[op]`| Filter with operator (see below).                               | `?priority[in]=high,urgent`   |

### Operators

| Operator | SQL      | Notes                                                          |
|----------|----------|----------------------------------------------------------------|
| `eq`     | `=`      | Default if no `[op]` given.                                    |
| `neq`    | `!=`     | Alias: `ne`.                                                   |
| `lt`     | `<`      |                                                                |
| `lte`    | `<=`     |                                                                |
| `gt`     | `>`      |                                                                |
| `gte`    | `>=`     |                                                                |
| `in`     | `IN(…)`  | Comma-separated values, e.g. `?status[in]=open,closed`.        |
| `like`   | `LIKE`   | Value wrapped in `%…%` automatically.                          |
| `ilike`  | `ILIKE`  | Same wrapping; case-insensitive.                               |

Each filterable field declares its allowed operators — anything outside the allowlist is dropped.

### Response shape

```json
{
  "status": "success",
  "data": [ /* rows */ ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 42,
    "totalPages": 5
  }
}
```

---

## `GET /api/cases`

Auth: `userProtected`.

### Filters

| Field             | Operators                  | Notes                            |
|-------------------|----------------------------|----------------------------------|
| `status`          | `eq`, `neq`, `in`          |                                  |
| `priority`        | `eq`, `neq`, `in`          |                                  |
| `type`            | `eq`, `neq`, `in`          |                                  |
| `teamId`          | `eq`                       | Maps to `team_id`.               |
| `ownerId`         | `eq`                       | Maps to `owner_id`.              |
| `courtName`       | `eq`, `ilike`              | Maps to `court_name`.            |
| `filingDate`      | `eq`, `lt`, `lte`, `gt`, `gte` | Maps to `filing_date` (date).    |
| `nextHearingDate` | `eq`, `lt`, `lte`, `gt`, `gte` | Maps to `next_hearing_date`.     |

### Sort keys

`createdAt`, `updatedAt`, `filingDate`, `nextHearingDate`, `title`, `status`, `priority`. Default: `-createdAt`.

### Search (`q`)

`title`, `case_number`, `client_name`, `description`.

### Examples

```http
GET /api/cases?status=open&priority[in]=high,urgent&sort=-nextHearingDate&page=1&limit=20
GET /api/cases?q=smith&filingDate[gte]=2026-01-01&filingDate[lt]=2026-06-01
GET /api/cases?teamId=mock-team-3&sort=title
```

---

## `GET /api/teams`

Auth: `userProtected`.

### Filters

| Field     | Operators       | Notes                  |
|-----------|-----------------|------------------------|
| `ownerId` | `eq`            | Maps to `owner_id`.    |
| `name`    | `eq`, `ilike`   |                        |

### Sort keys

`createdAt`, `updatedAt`, `name`. Default: `-createdAt`.

### Search (`q`)

`name`, `description`.

### Examples

```http
GET /api/teams?sort=name
GET /api/teams?ownerId=mock-user-1
GET /api/teams?q=litigation&page=1&limit=20
GET /api/teams?name[ilike]=law&sort=-createdAt
```

---

## `GET /api/users`

Auth: `adminProtected`.

### Filters

| Field           | Operators            | Notes                              |
|-----------------|----------------------|------------------------------------|
| `role`          | `eq`, `neq`, `in`    |                                    |
| `isActive`      | `eq`                 | Maps to `is_active`. Coerced bool. |
| `emailVerified` | `eq`                 | Maps to `"emailVerified"`. Bool.   |

Boolean coercion: `1/true/yes/on/t` → `true`; `0/false/no/off/f` → `false`.

### Sort keys

`createdAt`, `updatedAt`, `name`, `email`. Default: `-createdAt`.

### Search (`q`)

`name`, `email`.

### Examples

```http
GET /api/users?role=lawyer&isActive=true&sort=name
GET /api/users?role[in]=admin,paralegal&q=hassan&page=1&limit=25
```

---

## Adding the query builder to a new endpoint

1. **Define a config** next to the service:

   ```ts
   import { buildQuery, buildPaginationMeta, parsers } from "../../utils/query.js";

   const teamQueryConfig = {
     filterable: {
       ownerId: { column: "owner_id", operators: ["eq"] as const },
       name:    { column: "name", operators: ["eq", "ilike"] as const },
     },
     sortable: { createdAt: "created_at", name: "name" },
     searchable: ["name", "description"],
     defaultSort: { column: "created_at", direction: "DESC" as const },
     defaultLimit: 10,
     maxLimit: 100,
   };
   ```

2. **Service** builds and forwards:

   ```ts
   findAllTeams: async (reqQuery: any) => {
     const built = buildQuery(reqQuery, teamQueryConfig);
     const { rows, total } = await teamRepository.findAllTeams(built);
     return { data: rows, pagination: buildPaginationMeta(built.page, built.limit, total) };
   }
   ```

3. **Repository** consumes a `BuiltQuery`:

   ```ts
   import { BuiltQuery } from "../../utils/query.js";

   findAllTeams: async (q: BuiltQuery) => {
     const dataQuery = `
       SELECT t.* FROM "team" t
       ${q.where}
       ${q.orderBy}
       ${q.pagination}
     `;
     const countQuery = `SELECT COUNT(*)::int AS total FROM "team" t ${q.where}`;
     const [d, c] = await Promise.all([
       pool.query(dataQuery, q.values),
       pool.query(countQuery, q.whereValues),
     ]);
     return { rows: d.rows, total: c.rows[0].total as number };
   }
   ```

4. **Controller** just hands `req.query` to the service:

   ```ts
   getAllTeams: async (req, res) => {
     const { data, pagination } = await teamService.findAllTeams(req.query);
     res.status(200).json({ status: "success", data, pagination });
   }
   ```

### Notes

- `column` is interpolated **as-is** into SQL — never let user input flow into it. Hard-code the table-qualified column (e.g. `c.status`, `"isActive"`).
- For camelCase Postgres columns, quote them in `column`: `'"emailVerified"'`.
- Use `parsers.bool` / `parsers.int` / `parsers.date` on `parse:` when the underlying column isn't text.
- `whereValues` is for the COUNT query; `values` (which is `whereValues + [limit, offset]`) is for the data query. Don't swap them.
- Joins/aliases are fine — just use the alias in `column` (e.g. `c.status`) and put the matching `FROM ... JOIN ...` in your repository SQL.
