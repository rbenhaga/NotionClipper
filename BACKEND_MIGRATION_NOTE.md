## Backend migration status

- The desktop app now targets the NotionClipperWeb backend (`BACKEND_API_URL` without a `/api` suffix, endpoints under `/api/*`).  
- The legacy backend implementation previously stored under `backend/` has been removed from this repository; NotionClipperWeb hosts the backend going forward.  
- Client code has been aligned to normalize backend URLs with an explicit `/api` prefix to avoid mismatched base paths.
