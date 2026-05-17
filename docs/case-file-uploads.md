# Case File Uploads — Frontend Implementation Guide

This is a step-by-step guide for the frontend team to implement upload / list / download / delete of files attached to a case.

> Files are stored in **Vercel Blob** with **private access**. The browser POSTs a `multipart/form-data` request to the API; the API uploads to Blob and writes the DB row. To view a file, the browser hits a download endpoint that streams the content back through the API — `file_url` returned by the list endpoint is **not** directly fetchable.

---

## 1. Endpoints at a glance

| Method | Path                                          | What it does                            | Auth |
|--------|-----------------------------------------------|-----------------------------------------|------|
| POST   | `/api/cases/:caseId/files`                    | Upload a single file                    | yes  |
| GET    | `/api/cases/:caseId/files`                    | List all files attached to a case       | yes  |
| GET    | `/api/cases/:caseId/files/:fileId/download`   | Stream a file's content (inline / attach)| yes |
| DELETE | `/api/cases/:caseId/files/:fileId`            | Delete a file (owner or uploader)       | yes  |

All endpoints require the user's session cookie. `fetch` calls must include `credentials: "include"` if the frontend is on a different origin.

---

## 2. Constraints (enforced server-side)

| Constraint | Value |
|---|---|
| Max size | **50 MB** |
| Allowed types | PDF, DOC/DOCX, XLS/XLSX, JPEG, PNG, HEIC/HEIF, TXT, CSV |
| Original filename | Preserved in `file_name`; storage path gets a random suffix |

Exact MIME strings:
```
application/pdf
application/msword
application/vnd.openxmlformats-officedocument.wordprocessingml.document
application/vnd.ms-excel
application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
image/jpeg
image/png
image/heic
image/heif
text/plain
text/csv
```

It's recommended to mirror these in the `<input accept="...">` attribute *and* validate client-side before sending, so users get instant feedback. The server will reject with `400 Unsupported file type: <mime>` if you skip that.

---

## 3. Minimal upload — `fetch`

```ts
export async function uploadCaseFile(caseId: string, file: File) {
  const form = new FormData();
  form.append("file", file);

  const res = await fetch(`/api/cases/${caseId}/files`, {
    method: "POST",
    body: form,
    credentials: "include",
  });

  const json = await res.json();
  if (!res.ok) throw new Error(json.message ?? "Upload failed");
  return json.data as CaseFile;
}
```

`Content-Type` is **not** set manually — the browser sets it (with the multipart boundary) when you pass a `FormData`.

`CaseFile` shape:
```ts
type CaseFile = {
  id: string;
  case_id: string;
  uploaded_by: string;
  file_name: string;       // original filename
  file_url: string;        // public Vercel Blob URL
  file_type: string;       // MIME type
  file_size: number;       // bytes
  uploaded_at: string;     // ISO timestamp
};
```

---

## 4. Upload with progress — `XMLHttpRequest`

`fetch` does not expose request upload progress. Use `XMLHttpRequest` when you need a progress bar:

```ts
export function uploadCaseFileWithProgress(
  caseId: string,
  file: File,
  onProgress: (pct: number) => void,
  signal?: AbortSignal,
): Promise<CaseFile> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `/api/cases/${caseId}/files`);
    xhr.withCredentials = true;

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };

    xhr.onload = () => {
      let body: any;
      try { body = JSON.parse(xhr.responseText); } catch { body = {}; }
      if (xhr.status >= 200 && xhr.status < 300) resolve(body.data);
      else reject(new Error(body.message ?? `Upload failed (${xhr.status})`));
    };

    xhr.onerror = () => reject(new Error("Network error"));
    xhr.onabort = () => reject(new DOMException("Aborted", "AbortError"));

    signal?.addEventListener("abort", () => xhr.abort());

    const form = new FormData();
    form.append("file", file);
    xhr.send(form);
  });
}
```

Usage:
```ts
const controller = new AbortController();
const file = await uploadCaseFileWithProgress(
  caseId,
  file,
  (pct) => setProgress(pct),
  controller.signal,
);
// to cancel: controller.abort();
```

---

## 5. React hook example

```tsx
import { useState, useCallback } from "react";

type UploadState =
  | { status: "idle" }
  | { status: "uploading"; progress: number }
  | { status: "success"; file: CaseFile }
  | { status: "error"; message: string };

export function useCaseFileUpload(caseId: string) {
  const [state, setState] = useState<UploadState>({ status: "idle" });
  const [controller, setController] = useState<AbortController | null>(null);

  const upload = useCallback(async (file: File) => {
    const ctrl = new AbortController();
    setController(ctrl);
    setState({ status: "uploading", progress: 0 });
    try {
      const data = await uploadCaseFileWithProgress(
        caseId,
        file,
        (progress) => setState({ status: "uploading", progress }),
        ctrl.signal,
      );
      setState({ status: "success", file: data });
      return data;
    } catch (err: any) {
      setState({ status: "error", message: err.message });
      throw err;
    } finally {
      setController(null);
    }
  }, [caseId]);

  const cancel = useCallback(() => controller?.abort(), [controller]);

  return { state, upload, cancel };
}
```

Component:
```tsx
function FileUploader({ caseId, onUploaded }: { caseId: string; onUploaded: (f: CaseFile) => void }) {
  const { state, upload, cancel } = useCaseFileUpload(caseId);

  return (
    <div>
      <input
        type="file"
        accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.heic,.heif,.txt,.csv"
        disabled={state.status === "uploading"}
        onChange={async (e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          try { onUploaded(await upload(f)); } catch {}
        }}
      />
      {state.status === "uploading" && (
        <>
          <progress value={state.progress} max={100} />
          <button onClick={cancel}>Cancel</button>
        </>
      )}
      {state.status === "error" && <p style={{ color: "red" }}>{state.message}</p>}
    </div>
  );
}
```

---

## 6. Listing files

```ts
export async function listCaseFiles(caseId: string): Promise<CaseFile[]> {
  const res = await fetch(`/api/cases/${caseId}/files`, {
    credentials: "include",
  });
  const { data } = await res.json();
  return data;
}
```

The list response includes one extra field beyond `CaseFile`:
```ts
type CaseFileListItem = CaseFile & { uploader_name: string };
```

Files are returned ordered by `uploaded_at DESC`.

---

## 7. Deleting a file

```ts
export async function deleteCaseFile(caseId: string, fileId: string) {
  const res = await fetch(`/api/cases/${caseId}/files/${fileId}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) throw new Error((await res.json()).message);
}
```

Only the **case owner** or **the user who uploaded the file** can delete it. Anyone else gets `403`.

---

## 8. Rendering / downloading files

The blob store is **private** — `file_url` returned by the list endpoint is **not** directly fetchable from the browser. Use the download endpoint instead:

```
GET /api/cases/:caseId/files/:fileId/download           // inline (default)
GET /api/cases/:caseId/files/:fileId/download?download=1 // forced download
```

This endpoint authenticates the user (same session-cookie rules as everything else), then streams the file content back with the correct `Content-Type`.

```ts
function downloadUrl(caseId: string, fileId: string, forceDownload = false) {
  const q = forceDownload ? "?download=1" : "";
  return `/api/cases/${caseId}/files/${fileId}/download${q}`;
}
```

```tsx
{files.map((f) => (
  <a
    key={f.id}
    href={downloadUrl(caseId, f.id, true)}
    target="_blank"
    rel="noopener noreferrer"
  >
    {f.file_name}
  </a>
))}
```

Embedding in the page:

```tsx
// Images
<img src={downloadUrl(caseId, f.id)} alt={f.file_name} />

// PDFs (inline viewer)
<iframe src={downloadUrl(caseId, f.id)} title={f.file_name} />
```

> The endpoint requires the session cookie. If your frontend is on a different origin from the API, `<img>` / `<iframe>` will still send cookies as long as the session cookie is `SameSite=None; Secure` (it is in production) — but `<img crossOrigin>` must **not** be set, otherwise the cookie is dropped. If you need to fetch the bytes via JS (e.g. for a blob URL), use `fetch(downloadUrl, { credentials: "include" })`.

---

## 9. Multiple files

There is no batch endpoint. Upload one file at a time, in parallel:

```ts
const results = await Promise.allSettled(
  files.map((f) => uploadCaseFile(caseId, f))
);

for (const r of results) {
  if (r.status === "rejected") console.error(r.reason);
}
```

`Promise.allSettled` is the right choice — you want partial successes, not all-or-nothing.

---

## 10. Errors

| Status | Message                                                  | What to show the user                          |
|--------|----------------------------------------------------------|------------------------------------------------|
| 400    | `No file uploaded`                                       | "Pick a file first."                           |
| 400    | `Unsupported file type: <mime>`                          | "That file type isn't allowed."                |
| 400    | multer `File too large`                                  | "File exceeds the 50 MB limit."                |
| 401    | `Unauthorized: No active session`                        | Redirect to login.                             |
| 403    | `You do not have access to this case`                    | "You can't add files to this case."            |
| 403    | `Only the case owner or uploader can delete this file`   | Hide / disable the delete button accordingly.  |
| 404    | `Case not found` / `File not found` / `File not found in storage` | Refresh the page; the resource is gone.        |

All non-2xx responses use this shape:
```json
{ "status": "error", "message": "..." }
```

---

## 11. Pre-flight client-side validation (recommended)

Mirror the server constraints so users get fast feedback instead of waiting for the upload to fail:

```ts
const ALLOWED_MIME = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "image/jpeg", "image/png", "image/heic", "image/heif",
  "text/plain", "text/csv",
]);
const MAX_BYTES = 50 * 1024 * 1024;

export function validateForUpload(file: File): string | null {
  if (file.size > MAX_BYTES) return "File exceeds the 50 MB limit.";
  if (!ALLOWED_MIME.has(file.type)) return `File type "${file.type}" isn't allowed.`;
  return null;
}
```

---

## 12. CORS / cookies notes

If the frontend and API live on the **same** origin (e.g. both on `casepilot.app`), nothing extra is needed.

If they live on **different** origins:

1. Every `fetch` / `XMLHttpRequest` to the API must set `credentials: "include"` (`withCredentials = true` for XHR).
2. The frontend origin must be in the API's `CORS_ORIGINS` env var.
3. The session cookie must be `SameSite=None; Secure` — the API already issues it that way in production.

---

## 13. Reference

- Endpoint reference: `docs/api.md` § "Case Files"
- Server routes:    `src/modules/case-file/case-file.routes.ts`
- Server logic:     `src/modules/case-file/case-file.controller.ts`, `case-file.service.ts`
