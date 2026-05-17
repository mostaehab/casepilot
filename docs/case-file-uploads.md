# Case File Uploads — Frontend Guide

This document explains how to upload, list, and delete files for a case from the frontend.

> Files are stored in **Vercel Blob**. We use a *presigned client upload* pattern: the browser uploads the file **directly** to Vercel Blob, not through our API server. Our API only issues short-lived upload tokens and records metadata after the upload completes.

---

## 1. Why this pattern

The naive alternative — POST a `multipart/form-data` request to our API — has problems:

- The file has to flow **through** our serverless function (slow, memory-heavy, hits Vercel's request size limits).
- Long uploads block one of our function instances.
- We pay for the bandwidth twice (in + out).

With presigned uploads:

```
[Browser] ──token req──▶ [Our API]      (auth + validation, no file body)
[Browser] ──upload────▶ [Vercel Blob]   (the file, directly)
[Vercel Blob] ──webhook──▶ [Our API]    (insert DB row with file metadata)
```

The browser only sees one function call (`upload()`), which transparently handles all three legs.

---

## 2. Install

```bash
npm install @vercel/blob
```

This adds the **client** entry point, which you import as `@vercel/blob/client`. (The non-client entry point is server-only — don't import it in browser code.)

---

## 3. Authentication

All requests assume the user is signed in. The API expects a **session cookie** named whatever `better-auth` issues on login — typically `__Secure-better-auth.session_token` in production, `better-auth.session_token` in development.

That means:

- The browser must have already logged in via `POST /api/auth/login` (or similar) on the **same origin** as the API.
- `fetch` and `@vercel/blob/client` must send credentials. The `upload()` helper does this automatically.
- If the user is not signed in, the upload will fail with `401 Unauthorized` returned from our `onBeforeGenerateToken` callback.

If your frontend is hosted on a different origin from the API, configure CORS + `credentials: "include"` accordingly. CasePilot's CORS origins are set via the `CORS_ORIGINS` env var on the API.

---

## 4. Upload a file

```ts
import { upload } from "@vercel/blob/client";

async function uploadCaseFile(caseId: string, file: File) {
  const blob = await upload(file.name, file, {
    access: "public",
    handleUploadUrl: `/api/cases/${caseId}/files`,
  });

  // blob.url   → the permanent public URL of the file
  // blob.pathname → the storage path (e.g. "contract-abc123.pdf")
  return blob;
}
```

### What this call does, step by step

1. Calls `POST /api/cases/{caseId}/files` with a small JSON body asking for a token.
2. Our API:
   - Looks up the user's session from the cookie.
   - Confirms they have access to that case (owner, active team member, or assignee).
   - Returns a Vercel Blob client token scoped to allowed content types + max size.
3. The browser uploads the file directly to Vercel Blob using that token.
4. When Vercel finishes the upload, it calls back to the **same** URL (`POST /api/cases/{caseId}/files`) with a `blob.upload-completed` body. Our API verifies the webhook signature and inserts the file metadata into the `case_file` table.
5. `upload()` resolves on the client with the final blob info.

By the time the promise resolves, the database row already exists.

### Progress / cancellation

```ts
const controller = new AbortController();

const blob = await upload(file.name, file, {
  access: "public",
  handleUploadUrl: `/api/cases/${caseId}/files`,
  onUploadProgress: ({ loaded, total, percentage }) => {
    console.log(`${percentage}% (${loaded}/${total})`);
  },
  abortSignal: controller.signal,
});

// To cancel mid-upload:
// controller.abort();
```

### Multiple files

Call `upload()` once per file. They can run in parallel:

```ts
await Promise.all(files.map((f) => uploadCaseFile(caseId, f)));
```

---

## 5. Constraints

Enforced server-side in `onBeforeGenerateToken`. The browser will see a client-side error from `upload()` if these are violated (before any bytes are sent to Vercel Blob).

| Constraint | Value |
| --- | --- |
| **Max size** | 10 MB |
| **Allowed types** | `application/pdf`, `application/msword`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document` (`.docx`), `application/vnd.ms-excel`, `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` (`.xlsx`), `image/jpeg`, `image/png`, `image/heic`, `image/heif`, `text/plain`, `text/csv` |
| **Filename** | A random suffix is appended automatically to prevent collisions. The original name is preserved as a prefix. |

To change these, edit `src/modules/case-file/case-file.controller.ts` (constants at the top).

---

## 6. List files for a case

```ts
async function listCaseFiles(caseId: string) {
  const res = await fetch(`/api/cases/${caseId}/files`, {
    credentials: "include",
  });
  const { data } = await res.json();
  return data;
}
```

Returns:

```json
{
  "status": "success",
  "data": [
    {
      "id": "...",
      "case_id": "...",
      "uploaded_by": "...",
      "file_name": "contract-abc123.pdf",
      "file_url": "https://...blob.vercel-storage.com/...",
      "file_type": "application/pdf",
      "file_size": null,
      "uploaded_at": "2026-05-17T...",
      "uploader_name": "Mostafa Ehab"
    }
  ]
}
```

Render the file by linking directly to `file_url` — it's publicly accessible. (See §9 for caveats.)

---

## 7. Delete a file

```ts
async function deleteCaseFile(fileId: string) {
  const res = await fetch(`/api/cases/${caseId}/files/${fileId}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) throw new Error((await res.json()).message);
}
```

Allowed for the **case owner** or the **file uploader**. Anyone else gets `403`. The file is removed from Vercel Blob *and* the DB.

---

## 8. Error handling

| Source | Status / message | Meaning |
| --- | --- | --- |
| Token phase | `401 Not signed in` | Session cookie missing or expired. Prompt re-login. |
| Token phase | `403 You do not have access to this case` | User has no relationship with this case. |
| Token phase | `404 Case not found` | Bad `caseId`. |
| Client (`@vercel/blob/client`) | Thrown error mentioning content type | File type not in allowlist. |
| Client (`@vercel/blob/client`) | Thrown error mentioning size | File over 10 MB. |
| Delete | `403 Only the case owner or uploader can delete this file` | Insufficient permission. |
| Delete | `404 File not found` | Stale `fileId`. |

Wrap calls in `try/catch` — `upload()` throws on any failure.

```ts
try {
  await uploadCaseFile(caseId, file);
} catch (err) {
  console.error(err);
  // Show toast etc.
}
```

---

## 9. Important caveats

1. **`access: "public"` means the URL is world-readable.** Anyone with the URL can download the file forever. For now this is acceptable because URLs contain a hard-to-guess random suffix, but for truly confidential legal documents you should plan to migrate to private blobs + a signed download endpoint. Don't expose `file_url` in publicly-cached HTML or search results.
2. **The completion webhook runs out-of-band.** In our setup, by the time `upload()` resolves the DB row is already there — but if the webhook ever fails (rare), the file would exist in Blob without a DB record. There's no automated reconciliation today. If you see a blob URL with no matching `case_file` row, the upload completed but the webhook didn't.
3. **Local development.** Vercel Blob's completion webhook cannot reach `localhost`. While developing the frontend against a local API, the file will upload but no `case_file` row will be created. Either point the frontend at the deployed API (`https://casepilot-navy.vercel.app`), or use a tunnel (e.g. `ngrok`) for the API.
4. **CORS.** If your frontend origin differs from the API origin, ensure it's listed in the API's `CORS_ORIGINS` env var. The browser sends the session cookie cross-origin only with `credentials: "include"`.
5. **No file size returned today.** `blob.size` from `upload()` isn't currently propagated into the `case_file.file_size` column (the webhook doesn't include it). If you need this in the UI, derive it client-side from the `File` object before upload, or we can extend the webhook handler.

---

## 10. Reference

- Server route: `src/modules/case-file/case-file.routes.ts`
- Server logic: `src/modules/case-file/case-file.controller.ts`, `case-file.service.ts`
- Vercel Blob client docs: <https://vercel.com/docs/storage/vercel-blob/client-upload>
