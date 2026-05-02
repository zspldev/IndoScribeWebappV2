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

**Tables:**
`users`, `projects`, `languages`, `transcriptions`, `provider_config`, `formatting_commands_db`, `usage_log`, `system_settings`, `session`, `plans`, `translations_text`, `language_groups`, `language_group_languages`

**Seed data applied to local DB:**
- Plans: Starter (120 min, 14-day trial), Basic (600 min), Professional (1500 min), Enterprise (5000 min)
- Languages: 23 total (English + 22 Indian scheduled languages)
- Language Groups: Starter Group (English, Hindi, Marathi), Extended Group (+ 8 major scripts)
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
Added a fully functional Plans management section in the Admin Dashboard. Admins can create, edit, delete, and configure plans with fine-grained feature toggles and language group assignment — all without touching the database directly.

**What changed:**
- `shared/schema.ts` — Added `features` JSONB column (string array) and `language_group_id` FK to the `plans` table.
- `server/storage.ts` — Added `deletePlan(id)` method and language group CRUD methods to `IStorage`.
- `server/routes.ts` — Added plan CRUD routes and language group admin routes.
- `client/src/pages/AdminDashboard.tsx` — Rebuilt `PlansTab` with full CRUD + language group dropdown.

**11 features defined (keys stored in DB):**

| Key | Label | Group |
|---|---|---|
| `audio_upload` | Upload Audio Files | Input |
| `live_recording` | Live Microphone Recording | Input |
| `formatting_commands` | Formatting Commands (109) | Editor |
| `rich_text_editor` | Rich Text Editor (TipTap) | Editor |
| `translation` | Translation | Editor |
| `project_history` | Project History | Editor |
| `docx_export` | DOCX Export (gate) | Export |
| `docx_watermark` | DOCX with Watermark (Starter) | Export |
| `docx_no_watermark` | DOCX Clean (Basic+) | Export |
| `pdf_watermark` | PDF with Watermark (Starter) | Export |
| `pdf_no_watermark` | PDF Clean (Basic+) | Export |

**Default feature assignments:**
- Starter: Input + Editor + `docx_export` + `docx_watermark` + `pdf_watermark`
- Basic: Input + Editor + Translation + `docx_export` + `docx_no_watermark` + `pdf_no_watermark`
- Professional: All Basic features + `formatting_commands`
- Enterprise: Same as Professional

---

### 3. Language Group Management System

**Status:** Complete

**Summary:**
Replaced individual language feature flags (`english`, `hindi`, `marathi`) with a proper language group system. Admins manage named groups of languages; each plan is assigned one group. The `/api/languages` endpoint now returns only the languages in the user's plan group.

**Database tables added:**
- `language_groups` — Named groups with description
- `language_group_languages` — Junction table (group ↔ language many-to-many)
- `languages.script_family` — Script family key used for font mapping
- `languages.font_file` — Filename of the Noto font for this script
- `plans.language_group_id` — FK to assigned language group

**Languages seeded (23 total):**

| Language | Code | Script | Font |
|---|---|---|---|
| English | en-IN | Latin | (Calibri) |
| Hindi | hi-IN | Devanagari | NotoSansDevanagari |
| Marathi | mr-IN | Devanagari | NotoSansDevanagari |
| Gujarati | gu-IN | Gujarati | NotoSansGujarati |
| Bengali | bn-IN | Bengali | NotoSansBengali |
| Tamil | ta-IN | Tamil | NotoSansTamil |
| Telugu | te-IN | Telugu | NotoSansTelugu |
| Kannada | kn-IN | Kannada | NotoSansKannada |
| Malayalam | ml-IN | Malayalam | NotoSansMalayalam |
| Punjabi | pa-IN | Gurmukhi | NotoSansGurmukhi |
| Odia | or-IN | Odia | NotoSansBengali |
| Assamese | as-IN | Bengali | NotoSansBengali |
| Urdu | ur-IN | Perso-Arabic | (Latin fallback) |
| Sanskrit | sa-IN | Devanagari | NotoSansDevanagari |
| Konkani | kok-IN | Devanagari | NotoSansDevanagari |
| Maithili | mai-IN | Devanagari | NotoSansDevanagari |
| Sindhi | sd-IN | Perso-Arabic | (Latin fallback) |
| Bodo | brx-IN | Devanagari | NotoSansDevanagari |
| Kashmiri | ks-IN | Perso-Arabic | (Latin fallback) |
| Manipuri | mni-IN | Meitei | (Latin fallback) |
| Nepali | ne-IN | Devanagari | NotoSansDevanagari |
| Santali | sat-IN | Ol Chiki | (Latin fallback) |
| Dogri | doi-IN | Devanagari | NotoSansDevanagari |

**Default language groups:**
- **Starter Group** (id=1): English, Hindi, Marathi — assigned to Starter plan
- **Extended Group** (id=2): English + 8 major scripts (+ Bengali, Gujarati, Tamil, Telugu, Kannada, Malayalam, Punjabi, Odia) — assigned to Basic/Professional/Enterprise

**Admin UI (`AdminDashboard.tsx`):**
- New "Lang Groups" sidebar tab with `LanguageGroupsTab` component
- Full CRUD: create/edit/delete groups, checkbox-based language assignment
- Plans tab now shows assigned group and includes a language group dropdown in the edit form
- Feature toggles updated (removed `english`/`hindi`/`marathi`, added 4 export keys)

**Backend (`server/routes.ts`):**
- `GET /api/languages` — now filters by authenticated user's plan group; admins see all active languages
- `GET /api/admin/languages` — unfiltered list for admin use (used by LanguageGroupsTab checkboxes)
- `GET /api/admin/language-groups` — returns all groups with their language arrays
- `POST /api/admin/language-groups` — create group (with optional `languageIds`)
- `PUT /api/admin/language-groups/:id` — update name, description, and language membership
- `DELETE /api/admin/language-groups/:id` — delete group (cascades junction rows)

**Frontend (`NewProject.tsx`):**
- Removed `langFeatureMap` and per-feature filtering
- Language dropdown now simply shows all languages returned by `/api/languages` (already plan-filtered server-side)

---

### 4. Plan Feature Enforcement — End-to-End

**Status:** Complete

**Summary:**
Plan feature flags are enforced on both the backend (API routes reject disallowed actions) and the frontend (UI elements hidden/disabled based on the user's plan).

**Backend (`server/routes.ts`):**
- `userHasFeature(userId, featureKey)` helper reads the user's plan `features` JSONB array; admin users bypass all checks.
- `POST /api/projects/:id/upload` — guarded by `audio_upload`
- `POST /api/projects/:id/translations` — guarded by `translation`
- `GET /api/projects/:id/docx` — guarded by `docx_export`
- `GET /api/projects/:id/pdf` — guarded by `pdf_watermark` OR `pdf_no_watermark`

**Auth responses (`server/auth.ts`):**
- `planFeatures: string[]` added to all three auth endpoints (`/register`, `/login`, `/me`) so the frontend always has the current feature list.

**Frontend gating:**

| Page | Feature key | What changes |
|---|---|---|
| `NewProject.tsx` | `audio_upload` | File upload dropzone hidden |
| `NewProject.tsx` | `live_recording` | AudioRecorder hidden |
| `NewProject.tsx` | `formatting_commands` | Voice Commands Guide button hidden |
| `ProjectEditor.tsx` | `translation` | Translation sidebar card hidden |
| `ProjectEditor.tsx` | `docx_export` | Export DOCX button disabled |
| `ProjectEditor.tsx` | `pdf_watermark`/`pdf_no_watermark` | PDF export button shown/hidden |
| `ProjectEditor.tsx` | `rich_text_editor` | Formatting toolbar buttons hidden |
| `Dashboard.tsx` | `project_history` | Projects list replaced with "not available" message |

**Admin bypass:** `user.role === "admin"` always passes all feature checks on both backend and frontend.

---

### 5. DOCX Export with Watermark (Plan-Controlled)

**Status:** Complete

**Summary:**
DOCX export now automatically adds a header watermark based on the user's plan. Admins never get a watermark. The watermark is applied server-side — users cannot control this.

**Watermark text:** `Created by IndoScribe`

**Plan behaviour:**
- Starter plan (`docx_watermark` feature): every page header shows "Created by IndoScribe" in light gray italic
- Basic / Professional / Enterprise (`docx_no_watermark` feature): clean document, no watermark

**Implementation (`server/routes.ts`):**
- Checks `docx_watermark` feature for the requesting user
- If true, creates a `Header` (from the `docx` package) with centered, gray, italic watermark text
- Passes the header as `sections[0].headers.default` in the `Document` constructor

**Font mapping improvement:**
- DOCX export now uses `getDocxFontName(scriptFamily, script)` helper function
- Maps script families to proper Noto font names: `devanagari → "Noto Sans Devanagari"`, `bengali → "Noto Sans Bengali"`, etc.
- Falls back to `"Calibri"` for Latin and unsupported scripts

---

### 6. PDF Export with Devanagari Font Support

**Status:** Complete

**Summary:**
Added PDF export using `pdfkit`. PDFs support all script families via downloaded Noto fonts. Like DOCX, watermark is plan-controlled server-side.

**New dependency:** `pdfkit` + `@types/pdfkit`

**Fonts downloaded to `server/fonts/`:**
| File | Script |
|---|---|
| NotoSansDevanagari-Regular.ttf | Hindi, Marathi, Sanskrit, Nepali, etc. |
| NotoSansBengali-Regular.ttf | Bengali, Assamese, Odia |
| NotoSansGujarati-Regular.ttf | Gujarati |
| NotoSansTamil-Regular.ttf | Tamil |
| NotoSansTelugu-Regular.ttf | Telugu |
| NotoSansKannada-Regular.ttf | Kannada |
| NotoSansMalayalam-Regular.ttf | Malayalam |
| NotoSansGurmukhi-Regular.ttf | Punjabi |

**Service:** `server/services/PdfExportService.ts`
- `generatePdf(text, fontFile, addWatermark)` — async, returns `Buffer`
- Registers and applies the appropriate Noto font if `fontFile` is set
- Diagonal watermark (48pt, 6% opacity, −45°) added via pdfkit's `rotate()` + `text()` on every page via `doc.on("pageAdded", ...)` callback

**Route:** `GET /api/projects/:id/pdf`
- Parameters: `mode` (source/translation/both), `translationLang`
- Auth: requires login; `pdf_watermark` OR `pdf_no_watermark` feature required
- Starter users get watermarked PDF; Basic+ users get clean PDF

**Frontend (`ProjectEditor.tsx`):**
- `canExportPdf = hasFeature("pdf_watermark") || hasFeature("pdf_no_watermark")`
- "Download PDF" button appears below the DOCX button when `canExportPdf` is true
- Shares the `exportMode` and `activeTranslationLang` controls with DOCX export
- `isExportingPdf` state shows loading spinner during generation

---

### Architecture Notes

**No `db:push`:** Drizzle's `db:push` command is unreliable in this environment. All schema changes are applied manually via `executeSql` in the Replit code execution sandbox. The `shared/schema.ts` Drizzle definitions serve as type-safe documentation and are kept in sync with the actual DB.

**Font strategy:** Noto Sans fonts are stored in `server/fonts/` (not committed to git for size reasons). The `languages.font_file` column maps each language to its font. PDFKit registers the font by path; DOCX uses the font's PostScript name.

**Session cookies:** Sessions persist in DB via `connect-pg-simple`. `Cache-Control: no-store` is set on all auth endpoints to prevent stale plan feature responses.
