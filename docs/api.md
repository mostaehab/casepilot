# CasePilot API Reference

Base URL: `http://localhost:3000` (dev) — all endpoints are prefixed with `/api`.

- **Auth**: cookie-based session (set by better-auth on login/register). Browser clients should send requests with `credentials: "include"`. The `Authorization: Bearer <token>` header is also accepted; `token` is returned in the login response body.
- **Content-Type**: `application/json` for everything except file uploads (`multipart/form-data`).
- **CORS**: origins are read from `CORS_ORIGINS` (comma-separated). Credentials are required.
- **Rate limits**:
  - `300 req / 15 min` per IP across `/api/*`.
  - `20 req / 15 min` per IP on the credential endpoints (`/auth/login`, `/auth/register`, `/auth/forget-password`, `/auth/reset-password`).
  - On limit exceeded → `429 Too Many Requests`.

## Response envelope

All responses use a uniform shape.

**Success**
```json
{ "status": "success", "message": "<optional>", "data": {/* ... */} }
```

List endpoints additionally include pagination:
```json
{
  "status": "success",
  "data": [ /* ... */ ],
  "pagination": { "page": 1, "limit": 10, "total": 42, "totalPages": 5 }
}
```

**Error**
```json
{ "status": "error", "message": "Human-readable reason", "code": "OPTIONAL_CODE" }
```

### Status codes

| Code | Meaning                                                |
|------|--------------------------------------------------------|
| 200  | Success                                                |
| 201  | Resource created                                       |
| 400  | Bad request — validation failed or malformed input     |
| 401  | Unauthorized — no/invalid session, bad credentials     |
| 403  | Forbidden — authenticated but not allowed              |
| 404  | Not found — resource missing or unknown route          |
| 409  | Conflict — duplicate, already exists, illegal state    |
| 429  | Too many requests                                      |
| 500  | Internal server error                                  |

Empty list endpoints return `200` with `data: []`. They do not return `404`.

## Health

### `GET /health`
Liveness probe. No auth.

**200**
```json
{ "status": "success", "message": "ok" }
```

---

## Auth — `/api/auth`

### `POST /auth/register`
Create a new account, send verification email, return session cookie.

**Body**
```json
{
  "name": "Jane Doe",                       // ≥ 3 chars
  "email": "jane@example.com",
  "password": "supersecret",                // ≥ 6 chars
  "barLicenseNumber": "BL-12345",
  "nationalNumber": "29801011234567"
}
```

**201**
```json
{
  "status": "success",
  "message": "User registered successfully",
  "data": {
    "id": "...",
    "email": "jane@example.com",
    "name": "Jane Doe",
    "emailVerified": false,
    "role": "lawyer"
  }
}
```

**Errors**: `400` validation, `409` email already exists.

### `POST /auth/login`
Email/password sign-in. Sets session cookie and returns a bearer token.

**Body**
```json
{ "email": "jane@example.com", "password": "supersecret" }
```

**200**
```json
{
  "status": "success",
  "message": "Login successful",
  "data": {
    "token": "eyJhbGciOi…",
    "user": { "id": "...", "email": "...", "role": "lawyer", "...": "..." }
  }
}
```

**Errors**: `400` validation, `401` invalid credentials.

### `POST /auth/logout`
Auth required. Clears session cookie.

**200** `{ "status": "success", "message": "Logged out successfully" }`

### `GET /auth/me`
Auth required. Returns the user record for the current session.

**200**
```json
{ "status": "success", "data": { "id": "...", "email": "...", "name": "...", "role": "lawyer", ... } }
```

**Errors**: `401` no session.

### `POST /auth/change-password`
Auth required. Revokes other sessions on success.

**Body**
```json
{ "oldPassword": "...", "newPassword": "..." }   // each ≥ 6 chars
```

**200** `{ "status": "success", "message": "Password changed successfully" }`

### `POST /auth/forget-password`
Sends a password-reset email if the address exists. Always returns 200 to avoid leaking which emails are registered.

**Body**
```json
{ "email": "jane@example.com" }
```

**200**
```json
{ "status": "success", "message": "If an account exists, password reset instructions have been sent" }
```

### `POST /auth/reset-password`
Consumes the token from the reset email.

**Body**
```json
{ "token": "<token-from-email>", "newPassword": "..." }
```

**200** `{ "status": "success", "message": "Password reset successfully" }`

**Errors**: `400` invalid/expired token.

---

## Users — `/api/users`

User records. Email/password and core profile data are managed by better-auth; `role` and `isActive` are extension fields.

### `GET /users` *(admin)*
Paginated user list.

**Query params** (uniform query API — see `docs/query-api.md`)

| Field      | Operators | Notes                                         |
|------------|-----------|-----------------------------------------------|
| `role`     | eq, in    | `lawyer` \| `assistant` \| `admin`            |
| `isActive` | eq        | `true` / `false`                              |
| `q`        | —         | searches `name`, `email`                      |
| `sort`     | —         | `createdAt`, `updatedAt`, `name`, `email`     |
| `page`     | —         | default `1`                                   |
| `limit`    | —         | default `10`, max `100`                       |

**200**
```json
{
  "status": "success",
  "data": [
    { "id": "...", "name": "...", "email": "...", "role": "lawyer", "is_active": true, "created_at": "...", "updated_at": "..." }
  ],
  "pagination": { "page": 1, "limit": 10, "total": 42, "totalPages": 5 }
}
```

### `GET /users/:id` *(auth)*
Returns full user row.

**200** `{ "status": "success", "data": { /* user */ } }`

**Errors**: `404` user not found.

### `PATCH /users/:id` *(auth)*
Update name + email.

**Body**
```json
{ "name": "Jane D.", "email": "jane.d@example.com" }
```

**200** `{ "status": "success", "message": "User updated successfully", "data": { ... } }`

### `PATCH /users/deactivate/:id` *(auth)*
Soft-delete: sets `is_active = false`.

**200** `{ "status": "success", "message": "User deactivated successfully" }`

### Admin

| Endpoint                                | Body                       | Effect                  |
|-----------------------------------------|----------------------------|-------------------------|
| `PATCH /users/admin/:id/restore`        | —                          | Sets `is_active = true` |
| `PATCH /users/admin/:id/role`           | `{ "role": "lawyer" \| "assistant" \| "admin" }` | Updates role |
| `DELETE /users/admin/:id`               | —                          | Hard-delete (forbidden if `id == current admin id` → 409) |

All return `200` with `message` and (where applicable) `data`. Errors: `401` no session, `403` not admin, `404` user not found, `409` self-delete.

---

## Teams — `/api/teams`

A team is owned by exactly one user. Members have a status of `pending` (newly invited) → `active` (accepted) → `removed`.

### `GET /teams` *(auth)*
Paginated team list.

**Query**

| Field     | Operators  | Notes                                |
|-----------|------------|--------------------------------------|
| `ownerId` | eq         |                                      |
| `name`    | eq, ilike  |                                      |
| `q`       | —          | searches `name`, `description`       |
| `sort`    | —          | `createdAt`, `updatedAt`, `name`     |
| `page`    | —          | default `1`                          |
| `limit`   | —          | default `10`, max `100`              |

**200** standard list envelope; rows include `owner_name`, `owner_email`.

### `POST /teams` *(auth)*
Create a team. The caller becomes the owner. A user can only own one team — second attempt returns `409`.

**Body**
```json
{ "name": "Mostafa Legal", "description": "..." }   // name ≥ 3 chars; description optional
```

**201** `{ "status": "success", "message": "Team created successfully", "data": { /* team */ } }`

### `GET /teams/me` *(auth)*
Returns the team owned by the caller, including its members.

**200**
```json
{
  "status": "success",
  "data": {
    "id": "...", "name": "...", "owner_id": "...",
    "members": [
      { "team_id": "...", "user_id": "...", "role": "assistant", "status": "active", "name": "...", "email": "..." }
    ]
  }
}
```

**Errors**: `404` no team owned.

### `GET /teams/memberships` *(auth)*
Returns every team the caller belongs to (owned + member).

**200** `{ "status": "success", "data": [ { "id": "...", "member_role": "owner|lawyer|assistant", "status": "active|pending", ... } ] }`

### `GET /teams/:id` *(auth)*
Returns one team with its members.

**Errors**: `404` not found.

### `PATCH /teams/:id` *(auth, owner-only)*
**Body**: any subset of `{ "name": "...", "description": "..." }`.

**200** `{ "status": "success", "message": "Team updated successfully", "data": { /* team */ } }`

**Errors**: `403` not owner, `404` not found.

### `DELETE /teams/:id` *(auth, owner-only)*
Cascades and removes all team members.

**200** `{ "status": "success", "message": "Team deleted successfully" }`

### Members

#### `POST /teams/:id/members` *(auth, owner-only)*
Invite an existing user (must already have an account). Sends an invitation email.

**Body**
```json
{ "email": "asst@example.com", "role": "lawyer" }   // role: "lawyer" | "assistant"
```

**201**
```json
{ "status": "success", "message": "Invitation sent successfully", "data": { "team_id": "...", "user_id": "...", "status": "pending", "role": "lawyer" } }
```

**Errors**: `403` not owner, `404` user with that email not registered, `409` already a member or trying to invite the owner.

#### `POST /teams/:id/members/accept` *(auth)*
Accept an invitation addressed to the caller. Status `pending` → `active`.

**200** `{ "status": "success", "message": "Invitation accepted", "data": { /* member */ } }`

**Errors**: `404` no pending invite, `409` invite no longer pending.

#### `DELETE /teams/:id/invitations/:userId` *(auth)*
Cancel a pending invitation. Allowed for the team owner (revoke) or the invited user (decline). Hard-deletes the row so the user can be cleanly re-invited.

**200** `{ "status": "success", "message": "Invitation cancelled" }`

**Errors**: `403` not owner and not the invited user, `404` no such invitation, `409` invitation already accepted/removed.

#### `PATCH /teams/:id/members/:userId` *(auth, owner-only)*
Change a member's role.

**Body**: `{ "role": "lawyer" | "assistant" }`

**200** `{ "status": "success", "message": "Member role updated", "data": { /* member */ } }`

#### `DELETE /teams/:id/members/:userId` *(auth, owner-only)*
Soft-removes (status → `removed`). Cannot remove the owner — `409`.

**200** `{ "status": "success", "message": "Member removed" }`

### Admin

| Endpoint                                       | Body                            | Effect                                              |
|------------------------------------------------|---------------------------------|-----------------------------------------------------|
| `DELETE /teams/admin/:id`                      | —                               | Hard-delete a team                                  |
| `POST /teams/admin/:id/transfer`               | `{ "newOwnerId": "<userId>" }`  | Transfer ownership (target must exist; not self)    |
| `DELETE /teams/admin/:id/members/:userId`      | —                               | Hard-remove a member (cannot remove owner — `409`)  |

---

## Cases — `/api/cases`

A case is owned by one user and may belong to a team. Access rules:
- The owner can always read/write.
- Active members of the case's team can read.
- Explicitly assigned users can read and update status.

### `POST /cases` *(auth)*
**Body**
```json
{
  "title": "ACME vs Smith",
  "caseNumber": "2025-001",                  // optional
  "description": "...",                       // optional
  "type": "civil",                            // optional
  "priority": "low|medium|high|urgent",       // default "medium"
  "status": "open|in_progress|on_hold|closed|archived",  // default "open"
  "courtName": "...",                         // optional
  "filingDate": "2025-01-15",                 // ISO date
  "nextHearingDate": "2025-03-04T10:00:00Z",  // ISO datetime
  "clientName": "...",
  "clientPhone": "...",
  "clientNationalNumber": "...",
  "teamId": "<teamId>"                        // optional; caller must be owner or active member
}
```

**201** `{ "status": "success", "message": "Case created successfully", "data": { /* case */ } }`

**Errors**: `400` validation, `404` team not found, `403` not a member of the team.

### `GET /cases/me` *(auth)*
Cases owned by the caller, ordered by `created_at DESC`.

**200** `{ "status": "success", "data": [ /* cases */ ] }`

### `GET /cases/assigned` *(auth)*
Cases the caller is explicitly assigned to.

### `GET /cases/team/:teamId` *(auth)*
All cases for a team. Caller must be team owner or active member — otherwise `403`.

### `GET /cases/:id` *(auth)*
Single case + its assignments.

**200**
```json
{
  "status": "success",
  "data": {
    "id": "...", "title": "...", "owner_id": "...", "team_id": "...",
    "owner_name": "...", "owner_email": "...", "team_name": "...",
    "assignments": [ { "case_id": "...", "user_id": "...", "name": "...", "email": "..." } ]
  }
}
```

**Errors**: `403` no access, `404` not found.

### `PATCH /cases/:id` *(auth, owner-only)*
Any subset of the create body. To clear `teamId`, send `null`.

**200** `{ "status": "success", "message": "Case updated successfully", "data": { /* case */ } }`

**Errors**: `403` not owner, `404`.

### `PATCH /cases/:id/status` *(auth)*
Anyone with case access can update status (owner, assignee, or active team member).

**Body**: `{ "status": "open|in_progress|on_hold|closed|archived" }`

**200** `{ "status": "success", "message": "Case status updated", "data": { /* case */ } }`

### `DELETE /cases/:id` *(auth, owner-only)*

**200** `{ "status": "success", "message": "Case deleted successfully" }`

### Assignments

#### `POST /cases/:id/assignments` *(auth, owner-only)*
Assign a team member to the case. Case must belong to a team.

**Body**: `{ "userId": "<userId>" }`

**201** `{ "status": "success", "message": "User assigned to case", "data": { /* assignment */ } }`

**Errors**: `403` not owner, `404` case not found, `409` user already assigned or case has no team, `403` user not an active team member.

#### `DELETE /cases/:id/assignments/:userId` *(auth, owner-only)*

**200** `{ "status": "success", "message": "User unassigned from case" }`

### Admin

| Endpoint                                  | Body                              | Effect                          |
|-------------------------------------------|-----------------------------------|---------------------------------|
| `PATCH /cases/admin/:id`                  | Same shape as `PATCH /cases/:id`  | Override-update the case        |
| `DELETE /cases/admin/:id`                 | —                                 | Hard-delete                     |
| `POST /cases/admin/:id/transfer`          | `{ "newOwnerId": "<userId>" }`    | Reassign ownership              |

---

## Case Files — `/api/cases/:caseId/files`

Files attached to a case, stored in Vercel Blob (URL is public). Access mirrors the case's access rules.

### `POST /cases/:caseId/files` *(auth)*
Multipart upload. Field name **`file`**, max size **10 MB**.

**Request** (`multipart/form-data`)
```
file: <binary>
```

**201**
```json
{
  "status": "success",
  "message": "File uploaded successfully",
  "data": {
    "id": "...",
    "case_id": "...",
    "uploaded_by": "...",
    "file_name": "contract.pdf",
    "file_url": "https://...vercel-blob.../...",
    "file_type": "application/pdf",
    "file_size": 218543,
    "uploaded_at": "..."
  }
}
```

**Errors**: `400` no file, `403` no access, `404` case not found, `413` file too large (multer default).

### `GET /cases/:caseId/files` *(auth)*
List files for the case.

**200**
```json
{
  "status": "success",
  "data": [
    { "id": "...", "file_name": "...", "file_url": "...", "uploader_name": "..." }
  ]
}
```

### `DELETE /cases/:caseId/files/:fileId` *(auth)*
Allowed for case owner or the uploader. Deletes from Blob then DB.

**200** `{ "status": "success", "message": "File deleted successfully" }`

**Errors**: `403` not owner/uploader, `404` file not found.

### Admin

| Endpoint                                          | Effect                       |
|---------------------------------------------------|------------------------------|
| `DELETE /cases/:caseId/files/admin/:fileId`       | Hard-delete bypassing perms  |

---

## Common error examples

```json
// 401
{ "status": "error", "message": "Unauthorized: No active session" }

// 403
{ "status": "error", "message": "Only the team owner can update the team" }

// 404
{ "status": "error", "message": "Team not found" }

// 409
{ "status": "error", "message": "User is already a member of this team" }

// 400 (validation)
{ "status": "error", "message": "Invalid email address" }

// 429
{ "status": "error", "message": "Too many attempts, please try again later" }
```

## Authentication notes

- The session cookie is set on `POST /auth/login` and `POST /auth/register`. Browsers must send `credentials: "include"` on every protected request and have the origin listed in `CORS_ORIGINS`.
- For non-browser clients, capture `data.token` from the login response and send `Authorization: Bearer <token>` on subsequent requests.
- Sign out by calling `POST /auth/logout` (clears the cookie server-side) or by discarding the bearer token client-side.
- Verification & reset emails are sent via SMTP — configure `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` in `.env`. If SMTP is not configured, sends are logged and skipped (auth flows still succeed).
