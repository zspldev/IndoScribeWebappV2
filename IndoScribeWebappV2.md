# IndoScribe V2 — Feature & Change Log

This document tracks all new features, architectural changes, and improvements introduced in V2 of the IndoScribe web application. V2 is built on top of the V1 codebase with significant structural and feature changes.

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
DOCX export now automatically adds a diagonal, centered, full-page VML watermark based on the user's plan. Admins never get a watermark. The watermark is applied server-side — users cannot control this.

**Watermark text:** `Created by IndoScribe`

**Plan behaviour:**
- Starter plan (`docx_watermark` feature): every page shows a diagonal gray "Created by IndoScribe" watermark centered on the page
- Basic / Professional / Enterprise (`docx_no_watermark` feature): clean document, no watermark

**Implementation (`server/routes.ts` — `injectDocxDiagonalWatermark()`):**
- The `docx` library generates the file in memory; a placeholder empty header (`Header` with an empty `Paragraph`) is injected first to ensure Word creates `word/header1.xml` in the archive.
- After generation, **JSZip** post-processes the raw `.docx` binary.
- `word/header1.xml` is replaced with a full VML XML watermark shape:
  - `<v:shape>` with `style="rotation:315; mso-position-horizontal:center; mso-position-vertical:center; width:407pt; height:204pt"`
  - `<v:textpath>` containing the watermark text in gray (`#CCCCCC`), 20pt
  - The shape is wrapped in a `<w:pict>` element inside a paragraph with an absolute anchor
- Result: diagonal watermark centered on every page of the document

**Font mapping improvement:**
- DOCX export uses `getDocxFontName(scriptFamily, script)` helper function
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
- Diagonal watermark drawn via `doc.save()` → `translate(w/2, h/2)` → `rotate(-45)` → text at **20pt**, `#999999`, **45% fill opacity** → `doc.restore()`
- After `doc.restore()`, text cursor is explicitly reset: `doc.x = leftMargin; doc.y = topMargin` — pdfkit's `restore()` resets the PDF graphics state but does NOT reset the internal text cursor; skipping this reset caused content to render at the wrong position
- Watermark `text()` call uses `width: 1200` (positioned at −600) to prevent any word-wrapping of the watermark string; `lineBreak: false` prevents newline breaks
- A `doc.on("pageAdded", drawWatermark)` listener applies the watermark to every subsequent page

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

### 7. Bug Fixes & Technical Patches

**Status:** Complete

---

#### 7a. DOCX Watermark — Replaced Text Header with VML Diagonal Watermark

**Problem:** The original DOCX watermark was a plain centered italic text in the page header. It was not diagonal, not centered on the page body, and did not look like a professional watermark.

**Fix:** Replaced the `Header` text approach entirely with JSZip post-processing that injects a Word VML watermark shape directly into `word/header1.xml`. See Section 5 for full details.

---

#### 7b. PDF Generation — Fontkit GPOS Null-Anchor Crash

**Problem:** Generating PDFs with `NotoSansDevanagari-Regular.ttf` (and potentially other Noto fonts) crashed with:
```
TypeError: Cannot read properties of null (reading 'xCoordinate')
    at GPOSProcessor.getAnchor (fontkit/dist/main.cjs)
```
The font's GPOS (glyph positioning) table contains mark anchor records where the anchor object is null. Fontkit's `GPOSProcessor.getAnchor()` did not guard against this.

**Fix:** One-line null guard added to `node_modules/fontkit/dist/main.cjs` at the top of `getAnchor()`:
```js
getAnchor(anchor) {
    if (!anchor) return { x: 0, y: 0 };  // ← added
    // TODO: contour point, device tables
    let x = anchor.xCoordinate;
    ...
```
Returning `{ x: 0, y: 0 }` for null anchors is safe — it means the mark glyph is positioned with zero offset relative to its base, which is the correct default.

> **Important:** This patch is applied directly to the bundled `node_modules/fontkit/dist/main.cjs`. It will be lost if `npm install` is re-run and must be reapplied manually.

---

#### 7c. PDF Generation — Text Cursor Not Reset After Watermark Drawing

**Problem:** After drawing the watermark using pdfkit's coordinate transform (`doc.save()` / `translate` / `rotate` / `doc.restore()`), the internal text cursor (`doc.x`, `doc.y`) was left at an off-page position (e.g. `x = −200`, `y = 13`). Content written after the watermark started rendering from the wrong position — partially or entirely off the visible page area.

**Root cause:** `doc.restore()` in pdfkit restores the PDF graphics state (transform matrix, fill color, etc.) but does **not** reset pdfkit's JavaScript-level text cursor properties (`doc.x`, `doc.y`).

**Fix:** Explicitly reset the cursor after every `drawWatermark()` call:
```ts
doc.restore();
doc.x = leftMargin;   // ← added
doc.y = topMargin;    // ← added
```

---

### 8. Navigation & UX Improvements

**Status:** Complete

**Plan name as upgrade link:**
- The user's current plan name in the Dashboard and NewProject page headers is now a **clickable link** that navigates to `/upgrade` (the plan selection/upgrade page).
- Admin users see the plan name as static non-clickable text.

**Plan management — raw SQL workaround:**
- `updateUserPlan()` in `server/storage.ts` uses a raw SQL query instead of Drizzle ORM's `update()`.
- Reason: Drizzle ORM has a column-mapping bug with the `plans` table that caused incorrect field binding when using the ORM abstraction.

---

### Architecture Notes

**No `db:push`:** Drizzle's `db:push` command is unreliable in this environment. All schema changes are applied manually via `executeSql` in the Replit code execution sandbox. The `shared/schema.ts` Drizzle definitions serve as type-safe documentation and are kept in sync with the actual DB.

**Font strategy:** Noto Sans fonts are stored in `server/fonts/` (not committed to git for size reasons). The `languages.font_file` column maps each language to its font. PDFKit registers the font by path; DOCX uses the font's PostScript name.

**Session cookies:** Sessions persist in DB via `connect-pg-simple`. `Cache-Control: no-store` is set on all auth endpoints to prevent stale plan feature responses.

---

### 9. Document Translation Feature

**Status:** Complete

**Summary:**
Added a full document translation workflow. Users upload a `.txt` or `.docx` file, select source and target languages, and receive a translated version. The feature is plan-gated (`document_translation` feature key) and integrated into the Dashboard as a second tab.

**New database table (`shared/schema.ts`):**
- `document_translations` — columns: `id`, `userId`, `filename`, `fileType` (`txt`|`docx`), `originalText`, `translatedText`, `sourceLanguageCode`, `targetLanguageCode`, `wordCount`, `status`, `createdAt`
- Insert/select schemas generated via `drizzle-zod`

**Backend (`server/storage.ts`):**
- 5 new methods added to `IStorage`: `createDocumentTranslation`, `getDocumentTranslation`, `getDocumentTranslationsByUser`, `updateDocumentTranslation`, `deleteDocumentTranslation`

**Backend routes (`server/routes.ts`):**
- `POST /api/document-translations` — accepts multipart upload (`.txt`/`.docx`, max 5 MB), extracts text (txt: direct read; docx: `mammoth` library), calls Sarvam AI translate API, stores result. Guarded by `document_translation` feature.
- `GET /api/document-translations` — returns all translations for the authenticated user
- `GET /api/document-translations/:id` — returns single record
- `DELETE /api/document-translations/:id` — deletes record (owner-only)
- `GET /api/document-translations/:id/download?field=original|translated` — server-side download endpoint (kept but superseded by client-side generation; see Section 10)

**New dependency:** `mammoth` (server-side `.docx` → plain text extraction)

**Plan feature assignment:**
- `document_translation` key added to `PLAN_FEATURES` constant in `AdminDashboard.tsx`
- Added directly to Basic (id=2) and Professional (id=3) plan features in DB via SQL

**Frontend (`client/src/pages/TranslateDocument.tsx`):**
- Full page component with drag-and-drop file upload zone
- Language pair selectors (Source / Target) populated from `/api/languages`
- Side-by-side original and translated text panels
- Recent Translations history sidebar (last 10 records)
- Download buttons for original and translated files (see Section 10)
- Word count display, status badges, error handling
- Premium badge shown; feature-gated redirect if plan lacks `document_translation`

---

### 10. Dashboard Redesign — Two-Tab Layout

**Status:** Complete

**Summary:**
The Dashboard was redesigned to surface both Transcription and Translation workflows from a single page, replacing the separate "Translate Doc" navigation button.

**Changes (`client/src/pages/Dashboard.tsx`):**
- Replaced single projects list with two toggle-button tabs:
  - **Transcription Projects** (orange active state) — existing project cards
  - **Translation Projects** (purple active state) — document translation history cards
- "New Transcription" button replaces the old "New Project" label
- "Translate Doc" nav button removed from the top navigation bar
- Translation tab shows cards with filename, language pair, date, word count, status, and a link to open the TranslateDocument page
- Active tab persists in component state

---

### 11. Client-Side Document Download

**Status:** Complete

**Summary:**
Document translation downloads (original and translated files) are generated entirely in the browser — no server round-trip. This avoids a browser-navigation issue where visiting `/api/...` URLs triggered the Wouter SPA router and showed a 404 page instead of downloading the file.

**Root cause of original bug:**
The Replit pike proxy serves the React SPA for all routes. Navigating the browser to `/api/document-translations/:id/download` caused Wouter to handle the URL and render its 404 page, even though the Express handler returned 200. A `fetch` + blob approach also triggered Vite HMR reload confusion.

**Fix (`client/src/pages/TranslateDocument.tsx`):**
- Replaced `downloadFromServer()` with two client-side functions:
  - `triggerBlobDownload(blob, filename)` — creates an object URL, clicks a hidden `<a>`, then revokes the URL after 1 second
  - `downloadFile(dt, field)` — builds the file in memory:
    - `.txt`: wraps the text string in a `Blob` with `text/plain;charset=utf-8`
    - `.docx`: uses the `docx` npm package (`Document`, `Paragraph`, `TextRun`, `Packer`) to build a Word document in-browser, then calls `Packer.toBlob(doc)` — the browser-safe API (vs `Packer.toBuffer()` which is Node.js only)
- Filename pattern: `translated-<basename>.<ext>` / `original-<basename>.<ext>`

**Key fix detail:** `Packer.toBuffer()` fails silently in the browser (throws internally); `Packer.toBlob()` is the correct browser API and returns a `Promise<Blob>` directly.

---

### 12. Privacy Policy & EULA on Registration

**Status:** Complete

**Summary:**
The registration form consent checkbox now links to the full Privacy Policy & EULA document displayed in a scrollable in-app modal. Users can click "I Accept" in the modal to automatically tick the consent checkbox.

**Files:**
- `client/public/privacy-policy.pdf` — Privacy Policy + EULA document (IndoScribe v1.0, effective May 3 2026, by Zapurzaa Systems Pvt. Ltd.) copied from `attached_assets/` to the public folder so it is served statically by Express/Vite
- `client/src/pages/Register.tsx` — updated:
  - Added `showPolicy` state
  - Consent label text changed to "I have read and agree to the **Privacy Policy & EULA**…" where the bold text is a `<button>` that sets `showPolicy(true)`
  - Added `Dialog` (shadcn) with:
    - Header: "Privacy Policy & End-User License Agreement"
    - Body: full-height `<iframe src="/privacy-policy.pdf" />` — browser's native PDF viewer
    - Footer: explanatory note + **"I Accept"** button that sets `consentAccepted(true)` and closes the dialog

**Document content:**
- Section 1–12: Privacy Policy (data collection, GDPR basis, data sharing, retention, security, user rights, children's privacy)
- EULA: license grant, permitted use, restrictions, IP, data responsibility, termination, disclaimers, limitation of liability, indemnification, governing law (Maharashtra, India)

---

### 13. About Modal

**Status:** Complete

**Summary:**
Added an "About IndoScribe" modal accessible from the footer on all authenticated pages. All content is driven by a single JSON config file — no code change needed to update app details.

**New file: `client/src/config/about.json`**
```json
{
  "appName": "IndoScribe",
  "tagline": "Professional Audio Transcription & Translation for Indian Languages",
  "version": "0.1.0",
  "releaseDate": "2026-05-03",
  "stage": "Beta",
  "company": { "name": "Zapurzaa Systems Pvt. Ltd.", "url": "https://www.zapurzaasystems.com", "country": "India" },
  "support": { "email": "operations@zapurzaasystems.com", "hours": "Mon–Fri, 10am–6pm IST" },
  "legal": { "copyrightYear": "2026", "privacyPolicyUrl": "/privacy-policy.pdf" },
  "platform": "Web"
}
```

**Updated: `client/src/components/Footer.tsx`**
- Footer now shows: `© 2026, Zapurzaa Systems · About`
- Clicking **About** opens a `Dialog` with:
  - App name + Beta badge
  - Tagline
  - Rows: Version, Release Date, Platform
  - Clickable Company link (opens zapurzaasystems.com in new tab)
  - Clickable Support email (`mailto:`)
  - Support Hours
  - Privacy & EULA link (opens `/privacy-policy.pdf` in new tab)
  - Close button
- Footer is shown on all routes except `/` (landing) and `/login`

**To update app info:** edit `client/src/config/about.json` only — no component changes required.

---

### 14. Progressive Web App (PWA) Support

**Status:** Complete

**Summary:**
The app is now installable as a PWA on Android and iOS. Users see an "Add to Home Screen" prompt on Android automatically; on iOS they use the Safari share menu. Once installed, the app opens full-screen with the IndoScribe icon and no browser chrome.

**Note:** The service worker and manifest are only active in the production build — they are inactive in the Vite dev server.

**Icons generated (`client/public/icons/`):**

| File | Size | Usage |
|---|---|---|
| `icon-192.png` | 192×192 | Android home screen / Chrome |
| `icon-512.png` | 512×512 | High-res / splash screen |
| `apple-touch-icon.png` | 180×180 | iPhone / iPad home screen |

Source: `client/src/assets/images/indoscribe-icon.png` (1024×1024 PNG), resized using ImageMagick.

**`client/index.html` — added meta tags:**
```html
<meta name="theme-color" content="#FF9933" />
<meta name="description" content="Professional audio transcription and translation for Indian languages." />
<meta name="mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="default" />
<meta name="apple-mobile-web-app-title" content="IndoScribe" />
<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
<link rel="manifest" href="/manifest.webmanifest" />
```

**`vite.config.ts` — added `vite-plugin-pwa`:**
- `registerType: "autoUpdate"` — service worker updates silently in background
- Manifest: `display: "standalone"`, `orientation: "portrait"`, `theme_color: "#FF9933"`, `start_url: "/"`
- Workbox config:
  - Precaches all `.js`, `.css`, `.html`, `.png`, `.svg`, `.woff2` assets
  - `navigateFallback: "/index.html"` for client-side routing
  - `navigateFallbackDenylist: [/^\/api\//]` — API routes always hit the server live
  - Runtime caching for Google Fonts (`CacheFirst`, 1-year expiry)
- Build outputs: `dist/public/sw.js` + `dist/public/workbox-*.js` + `dist/public/manifest.webmanifest`

**New dev dependency:** `vite-plugin-pwa`

**Offline behaviour:** Core transcription and translation features require the Sarvam AI API and are not available offline. The app shell (navigation, UI) loads from cache; all `/api/*` calls go to the live server.

---

### 15. Deployment Fixes

**Status:** Complete

**Two separate issues were identified and fixed before a successful production deployment.**

---

#### 15a. Wrong Output Filename in Deployment Run Command

**Problem:** The `.replit` `[deployment]` section was configured to run `node ./dist/index.cjs`, but the esbuild step in the `build` script outputs `dist/index.js` (`--format=esm`). Deployment crashed immediately with:
```
Error: Cannot find module '/home/runner/workspace/dist/index.cjs'
```

**Fix:** Updated the deployment run command to `node ./dist/index.js` via `deployConfig()`.

---

#### 15b. Vite Dev Server Running in Production

**Problem:** After fixing the filename, the deployed app returned 500 Internal Server Error. Production logs showed:
```
Re-optimizing dependencies because vite config has changed
Pre-transform error: Failed to load url /src/main.tsx — Does the file exist?
```

**Root cause:** `server/index.ts` checks `app.get("env") === "development"` to decide whether to run the Vite dev middleware or serve the built static files. Express's `app.get("env")` defaults to `process.env.NODE_ENV || "development"`. The deployment run command did not set `NODE_ENV`, so the server started in development mode — launching the Vite middleware instead of `serveStatic()`. The Vite middleware then failed because `client/src/main.tsx` doesn't exist in the production container.

**Fix:** Changed the deployment run command to explicitly set the environment variable:
```
bash -c "NODE_ENV=production node ./dist/index.js"
```

**Current deployment config (`.replit`):**
```toml
[deployment]
deploymentTarget = "autoscale"
build = ["npm", "run", "build"]
run = ["bash", "-c", "NODE_ENV=production node ./dist/index.js"]
```

**Production URL:** `https://indoscribe.replit.app`
