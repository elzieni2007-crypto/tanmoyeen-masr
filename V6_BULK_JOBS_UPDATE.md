# Tanmoyeen Masr V6 – Bulk Jobs

- Added `jobs-bulk-2026-09-30.js` containing the 34 opportunities from the 30 Sep–8 Oct 2026 consolidated list.
- Added an admin button in the Import Jobs tab to bulk-load them into `pending_jobs` with duplicate protection.
- Fixed the approval flow to use the `approveJob` Firebase callable because Firestore rules no longer allow direct client creation in `jobs`.
- Added `approveJob` callable restricted to `elzieni2007@gmail.com`.
- Bulk import does NOT auto-publish; review pending jobs and approve them.
- Firebase deployment is still required before callable approval/notifications work in production.
