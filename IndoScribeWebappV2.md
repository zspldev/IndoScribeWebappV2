# IndoScribe Pro V2 — Feature & Change Log

This document tracks all new features, architectural changes, and improvements introduced in V2 of the IndoScribe Pro web application. V2 is built on top of the V1 codebase with significant structural and feature changes.

---

## V2 Changes

### 1. Database: Migrated from AWS RDS to Local PostgreSQL

**Status:** Complete

**Summary:**
V2 removes the dependency on AWS RDS PostgreSQL and uses Replit's built-in PostgreSQL database exclusively.

**What changed:**
- `server/db.ts` now reads only from the `DATABASE_URL` environment variable (Replit's built-in PostgreSQL). The `AWS_RDS_DATABASE_URL` variable is no longer used or required.
- Removed `AWS-DB-Setup-Steps.md` (no longer relevant).
- Updated `replit.md` to reflect the new database setup.
- Schema is managed via Drizzle ORM and `npm run db:push`.

**Tables (unchanged from V1):**
`users`, `projects`, `languages`, `transcriptions`, `provider_config`, `formatting_commands_db`, `usage_log`, `system_settings`, `session`, `plans`, `translations_text`

**Seed data applied to local DB:**
- Plans: Starter (120 min, 14-day trial), Basic (600 min), Professional (1500 min), Enterprise (5000 min)
- Languages: English (en-IN), Hindi (hi-IN), Marathi (mr-IN)
- Admin user: `iswav2admin` / `adminmdk` (created on first boot via `seed-admin.ts`)

**Required environment variables:**
| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | YES | Replit PostgreSQL connection string (auto-provisioned) |
| `SARVAM_API_KEY` | YES | Sarvam AI speech-to-text and translation |
| `AWS_S3_BUCKET` | Optional | S3 audio storage (falls back to DB if absent) |
| `AWS_ACCESS_KEY_ID` | Optional | S3 credentials |
| `AWS_SECRET_ACCESS_KEY` | Optional | S3 credentials |
| `AWS_REGION` | Optional | S3 region |
| `GOOGLE_APPLICATION_CREDENTIALS` | Optional | Google STT fallback |

---

### 2. Admin: Plan Management with Feature Assignment

**Status:** Complete

**Summary:**
Added a fully functional Plans management section in the Admin Dashboard. Admins can create, edit, delete, and configure plans with fine-grained feature toggles — all without touching the database directly.

**What changed:**
- `shared/schema.ts` — Added `features` JSONB column (string array) to the `plans` table.
- `server/storage.ts` — Added `deletePlan(id)` method to `IStorage` and `DatabaseStorage`.
- `server/routes.ts` — Added `DELETE /api/admin/plans/:id` route (admin-only).
- `client/src/pages/AdminDashboard.tsx` — Rebuilt `PlansTab` with full CRUD:
  - **Create** plan via inline form with "Add Plan" button
  - **Edit** plan inline (expands card into form)
  - **Delete** plan with confirmation step
  - **Feature toggles** (Switch UI) grouped by category

**10 features defined (keys stored in DB):**

| Key | Label | Group |
|---|---|---|
| `audio_upload` | Upload Audio Files | Input |
| `live_recording` | Live Microphone Recording | Input |
| `english` | English Language | Languages |
| `hindi` | Hindi Language | Languages |
| `marathi` | Marathi Language | Languages |
| `formatting_commands` | Formatting Commands (109) | Editor |
| `rich_text_editor` | Rich Text Editor (TipTap) | Editor |
| `translation` | Translation | Output |
| `docx_export` | DOCX Export | Output |
| `project_history` | Project History | Output |

**Default feature assignments:**
- Starter: Input + Languages + Editor (no translation/export/history)
- Basic / Professional / Enterprise: All 10 features

---

### 3. Plan Feature Enforcement — End-to-End

**Status:** Complete

**Summary:**
Plan feature flags are now enforced on both the backend (API routes reject disallowed actions) and the frontend (UI elements are hidden/disabled based on the user's plan).

**Backend (`server/routes.ts`):**
- `userHasFeature(userId, featureKey)` helper reads the user's plan `features` JSONB array; admin users bypass all checks.
- `POST /api/projects/:id/upload` — guarded by `audio_upload`
- `POST /api/projects/:id/translations` — guarded by `translation`
- `GET /api/projects/:id/docx` — guarded by `docx_export`

**Auth responses (`server/auth.ts`):**
- `planFeatures: string[]` added to all three auth endpoints (`/register`, `/login`, `/me`) so the frontend always has the current feature list.

**Frontend types (`client/src/lib/auth.tsx`):**
- `planFeatures: string[]` added to `AuthUser` interface.

**Frontend gating:**

| Page | Feature key | What changes |
|---|---|---|
| `NewProject.tsx` | `english` / `hindi` / `marathi` | Language dropdown filtered to allowed languages only |
| `NewProject.tsx` | `audio_upload` | File upload dropzone hidden |
| `NewProject.tsx` | `live_recording` | AudioRecorder hidden |
| `NewProject.tsx` | `formatting_commands` | Voice Commands Guide button hidden |
| `ProjectEditor.tsx` | `translation` | Translation sidebar card hidden |
| `ProjectEditor.tsx` | `docx_export` | Export DOCX button disabled + message shown |
| `ProjectEditor.tsx` | `rich_text_editor` | Bold/Italic/Underline/Strikethrough/H1/H2/H3/Page-break toolbar buttons hidden |
| `Dashboard.tsx` | `project_history` | Projects list replaced with "not available" message |

**Admin bypass:** `user.role === "admin"` always passes all feature checks on both backend and frontend.
