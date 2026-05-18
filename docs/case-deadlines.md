# Case Deadlines & Dates — Frontend Implementation Guide

This is a step-by-step guide for the frontend team to implement adding, listing, editing, and completing **deadlines and dates** on a case (hearings, filings, meetings, reminders, etc.).

> Each case can have any number of events. They live in a separate `case_event` table — independent from the `filing_date` / `next_hearing_date` columns on the case record itself, which remain the canonical "primary" dates on the case form. Use this feature when the user needs to track **multiple** dates per case.

---

## 1. Endpoints at a glance

| Method | Path                                          | What it does                                          | Auth |
|--------|-----------------------------------------------|-------------------------------------------------------|------|
| POST   | `/api/cases/:caseId/events`                   | Add a deadline / date to a case                       | yes  |
| GET    | `/api/cases/:caseId/events`                   | List all events on a case (ordered by `event_date ASC`) | yes  |
| GET    | `/api/cases/:caseId/events/:eventId`          | Get a single event                                    | yes  |
| PATCH  | `/api/cases/:caseId/events/:eventId`          | Update fields, including `completed`                  | yes  |
| DELETE | `/api/cases/:caseId/events/:eventId`          | Delete an event (owner or creator)                    | yes  |
| GET    | `/api/cases/events/upcoming?limit=10`         | Upcoming uncompleted events across all accessible cases | yes |

All endpoints require the user's session cookie. From a different origin, `fetch` must include `credentials: "include"`.

**Access rules**
- **Read / Create**: any user with access to the case — owner, assignee, or active team member.
- **Update / Delete**: only the **case owner** or the **user who created the event**.

---

## 2. Data shape

```ts
export type CaseEventType =
  | "hearing"
  | "deadline"
  | "filing"
  | "meeting"
  | "reminder"
  | "other";

export type CaseEvent = {
  id: string;
  case_id: string;
  title: string;
  description: string | null;
  event_type: CaseEventType;
  event_date: string;       // ISO timestamp (always UTC)
  all_day: boolean;         // true → render as a date, ignore time-of-day
  completed: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
};

// Returned by GET /cases/:caseId/events
export type CaseEventListItem = CaseEvent & {
  creator_name: string;
};

// Returned by GET /cases/events/upcoming — joins case info for display
export type UpcomingCaseEvent = CaseEventListItem & {
  case_title: string;
  case_number: string | null;
};
```

> **Why `all_day`?** A "deadline by EOD on the 14th" and "hearing at 10:00 AM on the 14th" are both stored as a single `timestamptz`. The `all_day` flag tells the UI whether to show the time. Pick `T00:00:00Z` (or any time you want) for all-day events — the server doesn't care about the time portion when `all_day = true`.

---

## 3. Constraints (enforced server-side)

| Field         | Required | Rules                                                                 |
|---------------|----------|-----------------------------------------------------------------------|
| `title`       | yes      | min 1 character                                                       |
| `eventDate`   | yes      | ISO datetime string (e.g. `2026-06-14T10:00:00.000Z`)                 |
| `eventType`   | no       | one of the six enum values. Defaults to `"deadline"`.                 |
| `description` | no       | string or omit; `null` to clear on update                             |
| `allDay`      | no       | boolean, defaults to `false`                                          |
| `completed`   | update only | boolean — used to mark an event done                                |

> Request fields are **camelCase** (`eventDate`, `allDay`). Response fields are **snake_case** (`event_date`, `all_day`). This mirrors the rest of the API.

---

## 4. Adding a deadline / date

```ts
type CreateEventBody = {
  title: string;
  description?: string;
  eventType?: CaseEventType;     // defaults to "deadline"
  eventDate: string;             // ISO datetime
  allDay?: boolean;              // defaults to false
};

export async function createCaseEvent(caseId: string, body: CreateEventBody) {
  const res = await fetch(`/api/cases/${caseId}/events`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    credentials: "include",
  });

  const json = await res.json();
  if (!res.ok) throw new Error(json.message ?? "Failed to add event");
  return json.data as CaseEvent;
}
```

### Examples

**A timed hearing**
```ts
await createCaseEvent(caseId, {
  title: "Initial hearing",
  eventType: "hearing",
  eventDate: "2026-06-14T10:00:00.000Z",
});
```

**An all-day filing deadline**
```ts
await createCaseEvent(caseId, {
  title: "File response brief",
  eventType: "filing",
  eventDate: "2026-06-20T00:00:00.000Z",
  allDay: true,
});
```

**A generic deadline with a note**
```ts
await createCaseEvent(caseId, {
  title: "Statute of limitations",
  description: "3-year limitation period expires.",
  eventDate: "2026-12-31T23:59:59.000Z",
  allDay: true,
});
```

### Converting a `<input type="date">` value to ISO

`<input type="date">` returns `"2026-06-14"`. Wrap it before sending:

```ts
function dateInputToIso(value: string, allDay: boolean): string {
  // For all-day events, anchor to UTC midnight.
  if (allDay) return `${value}T00:00:00.000Z`;
  // For timed events, prefer <input type="datetime-local"> and pass new Date(value).toISOString()
  return new Date(value).toISOString();
}
```

For `<input type="datetime-local">` the value is local time (`"2026-06-14T10:00"`). Use `new Date(value).toISOString()` to send UTC.

---

## 5. Listing events on a case

```ts
export async function listCaseEvents(caseId: string): Promise<CaseEventListItem[]> {
  const res = await fetch(`/api/cases/${caseId}/events`, {
    credentials: "include",
  });
  const { data } = await res.json();
  return data;
}
```

The list is returned in **chronological order** (`event_date ASC`) — past events first, then future. Group them client-side:

```ts
function groupEvents(events: CaseEventListItem[]) {
  const now = Date.now();
  return {
    overdue: events.filter((e) => !e.completed && new Date(e.event_date).getTime() < now),
    upcoming: events.filter((e) => !e.completed && new Date(e.event_date).getTime() >= now),
    done: events.filter((e) => e.completed),
  };
}
```

---

## 6. Marking an event complete / editing

`PATCH` accepts any subset of fields. Setting `completed: true` is how you mark a deadline as done.

```ts
type UpdateEventBody = Partial<CreateEventBody> & {
  description?: string | null; // explicit null clears it
  completed?: boolean;
};

export async function updateCaseEvent(
  caseId: string,
  eventId: string,
  body: UpdateEventBody,
) {
  const res = await fetch(`/api/cases/${caseId}/events/${eventId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    credentials: "include",
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message ?? "Failed to update event");
  return json.data as CaseEvent;
}

// Convenience helpers
export const completeEvent = (caseId: string, eventId: string) =>
  updateCaseEvent(caseId, eventId, { completed: true });

export const reopenEvent = (caseId: string, eventId: string) =>
  updateCaseEvent(caseId, eventId, { completed: false });
```

Only the case owner or the user who created the event can update. Anyone else gets `403`.

> `description` accepts `null` on update to clear an existing value. Omit the field entirely to leave it unchanged. All other fields keep their current value if omitted.

---

## 7. Deleting an event

```ts
export async function deleteCaseEvent(caseId: string, eventId: string) {
  const res = await fetch(`/api/cases/${caseId}/events/${eventId}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) throw new Error((await res.json()).message);
}
```

Owner-or-creator rule. Otherwise `403`.

---

## 8. Dashboard: upcoming across all cases

For a "What's coming up?" widget, use the cross-case endpoint instead of fetching events case by case:

```ts
export async function listUpcomingEvents(limit = 10): Promise<UpcomingCaseEvent[]> {
  const res = await fetch(`/api/cases/events/upcoming?limit=${limit}`, {
    credentials: "include",
  });
  const { data } = await res.json();
  return data;
}
```

**Server-side filtering applied automatically:**
- Only events the user can access (case owner, assignee, or active team member).
- Only events on cases whose status is **not** `closed` or `archived`.
- Only events with `event_date >= NOW()`.
- Only events with `completed = false`.
- Sorted by `event_date ASC`.
- `limit` is clamped to `[1, 50]`. Defaults to `10` when omitted.

> This is complementary to `GET /api/cases/upcoming` (which lists **cases** with an upcoming `next_hearing_date`). The new `/cases/events/upcoming` lists **events** across all those cases.

---

## 9. React example — events panel on a case page

```tsx
import { useEffect, useState } from "react";

export function CaseEventsPanel({ caseId }: { caseId: string }) {
  const [events, setEvents] = useState<CaseEventListItem[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    setLoading(true);
    try { setEvents(await listCaseEvents(caseId)); }
    finally { setLoading(false); }
  };

  useEffect(() => { refresh(); }, [caseId]);

  const onAdd = async (body: CreateEventBody) => {
    await createCaseEvent(caseId, body);
    await refresh();
  };

  const onToggle = async (e: CaseEvent) => {
    await updateCaseEvent(caseId, e.id, { completed: !e.completed });
    await refresh();
  };

  const onDelete = async (id: string) => {
    if (!confirm("Delete this event?")) return;
    await deleteCaseEvent(caseId, id);
    await refresh();
  };

  if (loading) return <p>Loading…</p>;

  const { overdue, upcoming, done } = groupEvents(events);

  return (
    <section>
      <h2>Deadlines & Dates</h2>
      <AddEventForm onSubmit={onAdd} />

      {overdue.length > 0 && <EventGroup label="Overdue" items={overdue} onToggle={onToggle} onDelete={onDelete} />}
      <EventGroup label="Upcoming" items={upcoming} onToggle={onToggle} onDelete={onDelete} />
      {done.length > 0 && <EventGroup label="Completed" items={done} onToggle={onToggle} onDelete={onDelete} />}
    </section>
  );
}

function EventGroup({
  label, items, onToggle, onDelete,
}: {
  label: string;
  items: CaseEventListItem[];
  onToggle: (e: CaseEvent) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div>
      <h3>{label} ({items.length})</h3>
      <ul>
        {items.map((e) => (
          <li key={e.id}>
            <input
              type="checkbox"
              checked={e.completed}
              onChange={() => onToggle(e)}
            />
            <strong>{e.title}</strong>
            <span> — {formatEventDate(e)}</span>
            <span> · {e.event_type}</span>
            {e.description && <p>{e.description}</p>}
            <small>added by {e.creator_name}</small>
            <button onClick={() => onDelete(e.id)}>Delete</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function formatEventDate(e: CaseEvent) {
  const d = new Date(e.event_date);
  if (e.all_day) {
    return d.toLocaleDateString(undefined, { dateStyle: "medium" });
  }
  return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}
```

The `AddEventForm` is a thin form over the `CreateEventBody` shape — title, type select, date input (toggle `allDay` to switch between `<input type="date">` and `<input type="datetime-local">`), optional description.

---

## 10. Errors

| Status | Message                                                          | What to show the user                              |
|--------|------------------------------------------------------------------|----------------------------------------------------|
| 400    | `Title is required`                                              | Inline form error on `title`.                      |
| 400    | (Zod) date / enum messages                                       | Inline form error on the offending field.          |
| 401    | `Unauthorized: No active session`                                | Redirect to login.                                 |
| 403    | `You do not have access to this case`                            | "You can't add events to this case."               |
| 403    | `Only the case owner or event creator can update this event`     | Hide / disable edit affordances when the user isn't either. |
| 403    | `Only the case owner or event creator can delete this event`     | Hide / disable the delete button.                  |
| 404    | `Case not found` / `Event not found`                             | Refresh the list; the resource is gone.            |

All non-2xx responses follow:
```json
{ "status": "error", "message": "..." }
```

---

## 11. Timezones & display

- The server stores and returns **`timestamptz` in UTC** (ISO 8601 with `Z` suffix).
- Always send ISO strings (`new Date(...).toISOString()`).
- Always format with `toLocaleString` / `toLocaleDateString` (or your i18n lib) to render in the user's locale.
- For `all_day` events, ignore the time portion when displaying — only show the date.

---

## 12. Pre-flight client-side validation (recommended)

Mirror the server contract for instant feedback:

```ts
const EVENT_TYPES = ["hearing", "deadline", "filing", "meeting", "reminder", "other"] as const;

export function validateNewEvent(body: Partial<CreateEventBody>): string | null {
  if (!body.title || body.title.trim().length < 1) return "Title is required.";
  if (!body.eventDate) return "Pick a date.";
  if (Number.isNaN(new Date(body.eventDate).getTime())) return "Invalid date.";
  if (body.eventType && !EVENT_TYPES.includes(body.eventType)) return "Invalid event type.";
  return null;
}
```

---

## 13. CORS / cookies notes

Same rules as everything else in the API:

1. Cross-origin `fetch` must use `credentials: "include"`.
2. The frontend origin must be in `CORS_ORIGINS`.
3. The session cookie is `SameSite=None; Secure` in production.

---

## 14. Reference

- Migration:        `migrations/1780000000000_create-case-event-table.js`
- Server routes:    `src/modules/case-event/case-event.routes.ts`
- Server logic:     `src/modules/case-event/case-event.controller.ts`, `case-event.service.ts`
- Validation:       `src/modules/case-event/case-event.validation.ts`
- Mounted in:       `src/modules/case/case.routes.ts`
