# IndoScribe Pro - Professional Audio Transcription Application

## Overview
IndoScribe Pro is a professional web-based audio transcription application specializing in Indian languages (English, Hindi, Marathi). It aims to provide a comprehensive solution for audio-to-text conversion with advanced editing and translation capabilities. Key features include user authentication, role-based access (Admin/User), a plan-based billing system with minutes tracking (including a Starter plan with 120 free minutes) and a 14-day trial period from registration, a rich text editor with 109 language-specific formatting commands, and DOCX export with Devanagari support. The application emphasizes a project-based workflow and leverages AI for transcription and translation, focusing on accuracy and user experience.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
The frontend is built with React 18+ (TypeScript), Vite, Wouter for routing, shadcn/ui components, Tailwind CSS for styling, TanStack Query v5 for server state management, and Zod for validation. The design uses a saffron orange and deep purple branding scheme.

**Key Features:**
- **User Interface:** React components, shadcn/ui, Tailwind CSS.
- **Pages:** Landing, Register, **SelectPlan**, Dashboard, Project Creation, Project Editor, Admin Dashboard.
- **Branding:** Saffron orange (#FF9933) and deep purple (#6B21A8) color scheme.
- **Typography:** Google Fonts CDN for Noto Sans Devanagari.

### Backend
The backend is an Express.js REST API developed with TypeScript, utilizing session-based authentication with `connect-pg-simple` and `bcryptjs` for password hashing.

**API Endpoints:**
- **Authentication:** Register, Login, Logout, Get Current User.
- **Projects:** CRUD operations for projects, audio upload, transcription initiation, audio streaming, DOCX export.
- **Translations:** List, Create/Retranslate, Update translated text.
- **Plans:** Public listing of active plans (`GET /api/plans`), self-service plan selection (`PATCH /api/users/me/plan`), Admin CRUD for plans.
- **Admin:** User management, usage statistics, STT provider configuration, system settings, formatting command management.

### Data Storage
The application uses Replit's built-in PostgreSQL database, managed with Drizzle ORM. Audio files are stored in AWS S3 if configured (`AWS_S3_BUCKET`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`), otherwise audio is stored as base64 in the database.

**Database Tables:**
`users`, `projects`, `languages`, `transcriptions`, `provider_config`, `formatting_commands_db`, `usage_log`, `system_settings`, `session`, `plans`, `translations_text`.

**Database Connection:** Uses the `DATABASE_URL` environment variable (Replit PostgreSQL). Schema changes are applied via `npm run db:push` (Drizzle Kit).

### Audio Processing & Transcription
Supports MP3, WAV, M4A, WebM, OGG up to 25MB and 30 minutes. Audio is converted to LINEAR16 WAV (16kHz mono) using ffmpeg. Sarvam AI STT (Saarika v2.5) is the primary provider, with Google STT as a fallback. Audio files longer than 30 seconds are chunked for processing.

### Text Preprocessing & Formatting
Includes 109 language-specific formatting commands for English, Hindi, and Marathi, which convert spoken commands into Markdown syntax. A MarkdownParser handles conversion to richly formatted DOCX output.

### Trial Period & Access Control
The trial period is now **plan-driven** via the `days_limit` column in the `plans` table. Each plan defines its own time limit: Starter = 14 days, Basic and above = NULL (unlimited). The `trial_ends_at` column in the users table stores the expiry date (calculated as `created_at + days_limit days`). If a plan has no `days_limit`, no time restriction is enforced — only the minutes limit applies. After the trial expires:
- **Blocked:** New transcriptions (Sarvam AI / Google STT) and new translations (Sarvam Translate) — these cost money.
- **Allowed:** Opening existing projects, editing transcribed/translated text, exporting to DOCX — these are free operations.
- The trial status is enforced both on the backend (API returns 403) and frontend (buttons disabled, banner shown).
- Dashboard navbar shows: `{planName} plan; Ends on {date}` next to username. When expired, shows "Trial Expired" in red.
- ProjectEditor shows a trial expired banner and disables transcribe/translate buttons.

### Document Generation
DOCX and PDF export functionality supports source-only, translation-only, or bilingual modes. It uses language-specific fonts (Noto Sans Devanagari for Devanagari, Calibri for Latin) and supports full Markdown formatting.

**Plan-based watermarking:**
- Starter plan users receive watermarked exports (`docx_watermark` / `pdf_watermark` features on plan).
- Basic plan and above receive clean exports (`docx_no_watermark` / `pdf_no_watermark`).

**DOCX watermark implementation (`server/routes.ts` → `injectDocxDiagonalWatermark`):**
- After the `docx` library generates the file, JSZip post-processes the raw `.docx` archive.
- `word/header1.xml` is replaced with full VML XML: `<v:shape>` with `rotation:315`, `mso-position-horizontal:center`, `mso-position-vertical:center`.
- The watermark text "Created by IndoScribe" appears diagonally centered on every page.

**PDF watermark implementation (`server/services/PdfExportService.ts`):**
- Uses pdfkit 0.18.0 to generate PDFs with optional diagonal watermarks.
- Watermark is drawn via `doc.save()` → `translate(w/2, h/2)` → `rotate(-45)` → text at 20pt, `#999999`, 45% fill opacity → `doc.restore()`.
- After `doc.restore()`, the text cursor is explicitly reset to `doc.x = leftMargin; doc.y = topMargin` because pdfkit's `restore()` restores the PDF graphics state but does NOT reset pdfkit's internal text cursor.
- A `pageAdded` event listener calls `drawWatermark()` on every new page.

**Fontkit GPOS null-anchor patch (`node_modules/fontkit/dist/main.cjs` line 9990):**
- `NotoSansDevanagari-Regular.ttf` has GPOS table entries where some mark anchors are null records.
- Fontkit's `GPOSProcessor.getAnchor()` crashed with `Cannot read properties of null ('xCoordinate')` when processing these.
- Fixed with a one-line null guard: `if (!anchor) return { x: 0, y: 0 };` at the top of `getAnchor()`.
- **Note:** This patch is applied directly to the bundled `node_modules/fontkit/dist/main.cjs` and will be lost if `npm install` is re-run. The fix must be reapplied manually after any clean install.

### Navigation & UX
- Dashboard and NewProject headers display the user's current plan name as a clickable link that navigates to `/upgrade` (plan upgrade page).
- Admin users see the plan name as static text (non-clickable), since admins are not on a billable plan.

### Plan Management
- Plans table: id=1 Starter (30 min, 14-day trial, watermarked exports), id=2 Basic (600 min, no watermark), id=3 Professional (1500 min, no watermark).
- `updateUserPlan` in `server/storage.ts` uses raw SQL to bypass a Drizzle ORM column-mapping bug with the `plans` table.
- Plan features are stored as a `text[]` array in the `plans.features` column and checked at export time.

## External Dependencies

- **Database**: Replit built-in PostgreSQL (via `DATABASE_URL`)
- **Audio Storage**: AWS S3 (optional; falls back to in-database base64 storage)
- **Authentication**: `bcryptjs`, `connect-pg-simple`, `express-session`
- **Speech Recognition**: Sarvam AI STT (primary, requires `SARVAM_API_KEY`), Google Speech-to-Text (optional fallback)
- **Audio Processing**: `ffmpeg`, `fluent-ffmpeg`
- **Document Generation**: `docx` library (DOCX), `pdfkit` + `fontkit` (PDF)
- **Archive Processing**: `jszip` (used for DOCX watermark post-processing)
- **UI Libraries**: `@radix-ui/*`, `lucide-react`, `shadcn/ui`
- **Validation**: `Zod`, `@hookform/resolvers`
- **AWS SDK**: `@aws-sdk/client-s3`, `@aws-sdk/lib-storage` (optional, for S3 audio storage)
- **Translation**: Sarvam AI Translate API

## Key Files Reference

| File | Purpose |
|------|---------|
| `server/routes.ts` | API routes + `injectDocxDiagonalWatermark()` helper for DOCX VML watermarks |
| `server/services/PdfExportService.ts` | PDF generation with diagonal watermark, cursor reset, fontkit dependency |
| `server/storage.ts` | Data access layer; `updateUserPlan` uses raw SQL |
| `node_modules/fontkit/dist/main.cjs` | Patched at line ~9990 with null guard in `getAnchor()` |
| `client/src/pages/Dashboard.tsx` | Dashboard with plan name → `/upgrade` link |
| `client/src/pages/NewProject.tsx` | New project page with plan name → `/upgrade` link |
| `client/src/lib/auth.tsx` | Session management with sessionStorage session boundary detection |
| `shared/schema.ts` | Drizzle ORM data model and Zod schemas |