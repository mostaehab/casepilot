# AI Case Analysis — Frontend Implementation Guide

A step-by-step guide for the frontend team to integrate the AI module: trigger an analysis of a case's documents, then read back the structured summary + hints.

> Analyses are produced by **Claude Sonnet 4.6** via the **Vercel AI Gateway**. The model reads the documents already attached to the case (Vercel Blob storage, private) and returns a summary plus an array of actionable hints. Each run is persisted in the `case_analysis` table and can be fetched later.

---

## 1. Endpoints at a glance

| Method | Path                                                  | What it does                                              | Auth |
|--------|-------------------------------------------------------|-----------------------------------------------------------|------|
| POST   | `/api/cases/:caseId/ai/analyze`                       | Run a new analysis over some/all of the case's documents  | yes  |
| GET    | `/api/cases/:caseId/ai/analyses`                      | List all past analyses for the case (newest first)        | yes  |
| GET    | `/api/cases/:caseId/ai/analyses/:analysisId`          | Fetch one analysis by id                                  | yes  |

All endpoints require the user's session cookie. `fetch` calls must include `credentials: "include"` if the frontend is on a different origin.

Access rules mirror the rest of the case API: the user must be the case **owner**, a case **assignee**, or an **active member** of the case's team. Otherwise the server returns `403`.

---

## 2. Trigger an analysis

### Request

```
POST /api/cases/:caseId/ai/analyze
Content-Type: application/json
```

```ts
type AnalyzeCaseRequest = {
  fileIds?: string[];    // optional — defaults to ALL files attached to the case
  instructions?: string; // optional — extra guidance for the model (max 2000 chars)
};
```

If `fileIds` is omitted or empty, every file currently on the case is sent to the model. Pass `fileIds` to limit the analysis to a subset (e.g. only contracts, only the documents the lawyer cares about right now).

### Response (201)

```json
{
  "status": "success",
  "message": "Case analyzed successfully",
  "data": {
    "id": "f0b7…",
    "case_id": "…",
    "requested_by": "…",
    "model": "anthropic/claude-sonnet-4.6",
    "status": "completed",
    "summary": "The plaintiff seeks…",
    "hints": [
      {
        "title": "Missing expert report",
        "detail": "No medical report is attached although the complaint cites injury severity.",
        "severity": "warning"
      }
    ],
    "file_ids": ["fid_1", "fid_2"],
    "error": null,
    "created_at": "2026-05-18T10:31:02.000Z",
    "completed_at": "2026-05-18T10:31:38.000Z"
  }
}
```

### TypeScript types

```ts
export type HintSeverity = "info" | "warning" | "critical";

export type CaseAnalysisHint = {
  title: string;
  detail: string;
  severity: HintSeverity;
};

export type CaseAnalysis = {
  id: string;
  case_id: string;
  requested_by: string;
  model: string;
  status: "pending" | "completed" | "failed";
  summary: string | null;
  hints: CaseAnalysisHint[] | null;
  file_ids: string[] | null;
  error: string | null;
  created_at: string;
  completed_at: string | null;
};
```

> ⚠️ **The call is synchronous.** The HTTP request stays open for the entire model round-trip — typically **10–60 seconds**, depending on the number and size of documents. Plan your UI accordingly (spinner, skeleton, disabled button). Set a generous `fetch` timeout / `AbortController` rather than the browser default.

### Client example — minimal

```ts
export async function analyzeCase(
  caseId: string,
  body: AnalyzeCaseRequest = {},
  signal?: AbortSignal,
): Promise<CaseAnalysis> {
  const res = await fetch(`/api/cases/${caseId}/ai/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body),
    signal,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message ?? "Analysis failed");
  return json.data as CaseAnalysis;
}
```

---

## 3. React hook example

```tsx
import { useState, useCallback, useRef } from "react";

type AnalyzeState =
  | { status: "idle" }
  | { status: "running" }
  | { status: "success"; analysis: CaseAnalysis }
  | { status: "error"; message: string };

export function useCaseAnalysis(caseId: string) {
  const [state, setState] = useState<AnalyzeState>({ status: "idle" });
  const controllerRef = useRef<AbortController | null>(null);

  const run = useCallback(
    async (body: AnalyzeCaseRequest = {}) => {
      const ctrl = new AbortController();
      controllerRef.current = ctrl;
      setState({ status: "running" });
      try {
        const analysis = await analyzeCase(caseId, body, ctrl.signal);
        setState({ status: "success", analysis });
        return analysis;
      } catch (err: any) {
        if (err.name === "AbortError") {
          setState({ status: "idle" });
          return null;
        }
        setState({ status: "error", message: err.message });
        throw err;
      } finally {
        controllerRef.current = null;
      }
    },
    [caseId],
  );

  const cancel = useCallback(() => controllerRef.current?.abort(), []);

  return { state, run, cancel };
}
```

Component:

```tsx
function AnalyzeButton({ caseId }: { caseId: string }) {
  const { state, run, cancel } = useCaseAnalysis(caseId);

  if (state.status === "running") {
    return (
      <div>
        <Spinner /> Analyzing case documents…
        <button onClick={cancel}>Cancel</button>
      </div>
    );
  }

  return (
    <>
      <button onClick={() => run()}>Analyze case</button>
      {state.status === "success" && <AnalysisView analysis={state.analysis} />}
      {state.status === "error" && <p className="text-red-500">{state.message}</p>}
    </>
  );
}
```

---

## 4. Rendering the result

```tsx
function AnalysisView({ analysis }: { analysis: CaseAnalysis }) {
  return (
    <section>
      <h2>Summary</h2>
      <p>{analysis.summary}</p>

      <h2>Hints ({analysis.hints?.length ?? 0})</h2>
      <ul>
        {analysis.hints?.map((h, i) => (
          <li key={i} className={`hint hint-${h.severity}`}>
            <strong>{h.title}</strong>
            <p>{h.detail}</p>
          </li>
        ))}
      </ul>

      <small>
        Model: {analysis.model} • Finished{" "}
        {new Date(analysis.completed_at!).toLocaleString()}
      </small>
    </section>
  );
}
```

Suggested severity styling:

| Severity   | Use for                                  | Suggested color |
|------------|------------------------------------------|-----------------|
| `info`     | Generic observations                     | neutral / blue  |
| `warning`  | Missing evidence, soft contradictions    | amber           |
| `critical` | Hard contradictions, missed deadlines    | red             |

---

## 5. Listing past analyses

```ts
export async function listCaseAnalyses(caseId: string): Promise<CaseAnalysis[]> {
  const res = await fetch(`/api/cases/${caseId}/ai/analyses`, {
    credentials: "include",
  });
  const { data } = await res.json();
  return data;
}
```

Returned newest first (`created_at DESC`). Each row has the same `CaseAnalysis` shape as the analyze response. Use it for a "previous analyses" sidebar or history dropdown.

### Single analysis by id

```ts
export async function getCaseAnalysis(
  caseId: string,
  analysisId: string,
): Promise<CaseAnalysis> {
  const res = await fetch(
    `/api/cases/${caseId}/ai/analyses/${analysisId}`,
    { credentials: "include" },
  );
  const { data } = await res.json();
  return data;
}
```

---

## 6. UX recommendations

- **Disable the button while running** and show progress affordance (spinner / shimmer). 10–60s is long enough that users will mash the button otherwise.
- **Allow cancel.** Use an `AbortController` (see the hook above). The server-side run keeps going but the user can move on.
- **Show file count before running.** "Analyze 7 documents" reads better than a blind action.
- **Optional file picker.** Let the user uncheck irrelevant attachments and pass `fileIds` — fewer documents = faster + cheaper.
- **Cache the latest result.** After an analysis completes, surface it on the case page and skip re-running unless the user explicitly hits "Re-analyze" or new files are uploaded.
- **Persist & paginate history.** Past analyses are valuable audit trails; show them in a collapsible panel.

---

## 7. Errors

All non-2xx responses follow the standard envelope:

```json
{ "status": "error", "message": "..." }
```

| Status | Message                                  | What to show the user                                              |
|--------|------------------------------------------|--------------------------------------------------------------------|
| 400    | `No documents to analyze`                | "Add at least one file to this case before analyzing."             |
| 400    | Validation error from zod                | Highlight the field; almost always `instructions` over the 2000-char limit. |
| 401    | `Unauthorized: No active session`        | Redirect to login.                                                 |
| 403    | `You do not have access to this case`    | "You don't have permission to analyze this case."                  |
| 404    | `Case not found` / `Analysis not found`  | Refresh the page; the resource is gone.                            |
| 500    | Any model / gateway failure              | "Couldn't analyze the case. Please try again." (also stored in `case_analysis.error`) |

> If the model call fails mid-flight, the `case_analysis` row is marked `status: "failed"` with the error message in the `error` column. The HTTP response is still 5xx — the persisted row is for debugging, not for the UI to consume directly.

---

## 8. Supported file types

The model is fed each attached file based on its MIME type:

| MIME                                | How it's sent to the model           |
|-------------------------------------|--------------------------------------|
| `application/pdf`                   | Native PDF input                     |
| `image/jpeg`, `image/png`, `image/heic`, `image/heif` | Native image input  |
| `text/plain`, `text/csv`            | Inline UTF-8 text                    |
| `application/vnd.openxmlformats-officedocument.wordprocessingml.document` (`.docx`) | Server-extracted text via `mammoth` |
| `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` (`.xlsx`), `application/vnd.ms-excel` (`.xls`) | Server-extracted CSV per sheet via SheetJS (`xlsx`) |
| `application/msword` (`.doc` legacy binary) | **Not read** — no pure-JS extractor; sent as a placeholder. Re-save the file as `.docx` for analysis. |

Extracted text is truncated at **200,000 characters per file** to keep prompts manageable; truncation is marked in the text sent to the model.

---

## 9. CORS / cookies notes

Same rules as the rest of the API:

1. Every call must use `credentials: "include"` (or `withCredentials = true` for XHR).
2. The frontend origin must be in the API's `CORS_ORIGINS` env var.
3. The session cookie must be `SameSite=None; Secure` — issued that way in production.

---

## 10. Reference

- Endpoint reference (to be added): `docs/api.md` § "AI — Case Analysis"
- Server routes:    `src/modules/ai/ai.routes.ts`
- Server logic:     `src/modules/ai/ai.controller.ts`, `ai.service.ts`
- Output schema:    `src/modules/ai/ai.validation.ts`
- System prompt:    `src/modules/ai/ai.prompts.ts`
