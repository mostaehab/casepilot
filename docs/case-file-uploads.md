# Case File Uploads — Frontend Guide

This document explains how to upload, list, and delete files for a case.

> Files are stored in **Vercel Blob**. The browser POSTs a `multipart/form-data` request to the API, which streams the file to Vercel Blob and records metadata in the DB. The browser never talks to Vercel Blob directly.

---

## 1. Authentication

All requests assume the user is signed in. The browser must send the session cookie (`fetch` with `credentials: "include"`).

If the user is not signed in, requests fail with `401`.

If your frontend is on a different origin from the API, configure CORS + `credentials: "include"` accordingly. CasePilot's CORS origins are set via the `CORS_ORIGINS` env var on the API.

---

## 2. Upload a file

```ts
async function uploadCaseFile(caseId: string, file: File) {
  const form = new FormData();
  form.append("file", file);

  const res = await fetch(`/api/cases/${caseId}/files`, {
    method: "POST",
    body: form,
    credentials: "include",
  });
  if (!res.ok) throw new Error((await res.json()).message);
  const { data } = await res.json();
  return data;
}
```

### Progress / cancellation

`fetch` does not expose upload progress. If you need a progress bar, use `XMLHttpRequest` instead:

```ts
function uploadWithProgress(caseId: string, file: File, onProgress: (pct: number) => void) {
  return new Promise<any>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `/api/cases/${caseId}/files`);
    xhr.withCredentials = true;
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve(JSON.parse(xhr.responseText).data);
      else reject(new Error(JSON.parse(xhr.responseText).message ?? "Upload failed"));
    };
    xhr.onerror = () => reject(new Error("Network error"));
    const form = new FormData();
    form.append("file", file);
    xhr.send(form);
  });
}
```

### Multiple files

Call the upload helper once per file. They can run in parallel:

```ts
await Promise.all(files.map((f) => uploadCaseFile(caseId, f)));
```

---

## 3. Constraints

Enforced server-side.

| Constraint | Value |
| --- | --- |
| **Max size** | 50 MB |
| **Allowed types** | `application/pdf`, `application/msword`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document` (`.docx`), `application/vnd.ms-excel`, `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` (`.xlsx`), `image/jpeg`, `image/png`, `image/heic`, `image/heif`, `text/plain`, `text/csv` |
| **Filename** | A random suffix is appended automatically to prevent collisions in storage. The original name is preserved in `file_name`. |

To change these, edit `src/modules/case-file/case-file.routes.ts` (size limit) and `src/modules/case-file/case-file.service.ts` (`ALLOWED_CONTENT_TYPES`).

---

## 4. List files for a case

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
      "file_name": "contract.pdf",
      "file_url": "https://...public.blob.vercel-storage.com/...",
      "file_type": "application/pdf",
      "file_size": 123456,
      "uploaded_at": "2026-05-17T...",
      "uploader_name": "Mostafa Ehab"
    }
  ]
}
```

Render the file by linking directly to `file_url` — it's publicly accessible. (See §7 for caveats.)

---

## 5. Delete a file

```ts
async function deleteCaseFile(caseId: string, fileId: string) {
  const res = await fetch(`/api/cases/${caseId}/files/${fileId}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) throw new Error((await res.json()).message);
}
```

Allowed for the **case owner** or the **file uploader**. Anyone else gets `403`. The file is removed from Vercel Blob *and* the DB.

---

## 6. Error handling

| Status / message | Meaning |
| --- | --- |
| `400 No file uploaded` | The `file` field was missing from the form. |
| `400 Unsupported file type: ...` | MIME type not in allowlist. |
| `400 File too large` (multer) | File exceeds 50 MB. |
| `401 Unauthorized` | Session cookie missing or expired. Prompt re-login. |
| `403 You do not have access to this case` | User has no relationship with this case. |
| `404 Case not found` | Bad `caseId`. |
| `403 Only the case owner or uploader can delete this file` | Insufficient permission. |
| `404 File not found` | Stale `fileId`. |

---

## 7. Important caveats

1. **`access: "public"` means the URL is world-readable.** Anyone with the URL can download the file forever. URLs contain a hard-to-guess random suffix, but for truly confidential legal documents you should plan to migrate to private blobs + a signed download endpoint. Don't expose `file_url` in publicly-cached HTML or search results.
2. **The file flows through our serverless function.** This is simple and avoids CORS/preflight issues with direct-to-Blob uploads, at the cost of using a function instance for the duration of the upload and counting against Vercel's request body size limits. For 50 MB max this is fine; for much larger files reconsider.
3. **Vercel Functions request body limit.** The 50 MB cap fits comfortably under Vercel's body size limit on Fluid Compute. If you raise the cap, verify your plan's limit first.

---

## 8. Reference

- Server route: `src/modules/case-file/case-file.routes.ts`
- Server logic: `src/modules/case-file/case-file.controller.ts`, `case-file.service.ts`
- Vercel Blob server SDK: <https://vercel.com/docs/storage/vercel-blob/using-blob-sdk>
