# IndoScribe Pro — Version 1 Documentation

**Product:** IndoScribe Pro  
**Version:** V1  
**Repository:** https://github.com/zspldev/IndoScribeWebappV1  
**Developed by:** Zapurzaa Systems  
**Last Updated:** April 2026

---

## Table of Contents

1. [Product Overview](#1-product-overview)
2. [User Roles & Access](#2-user-roles--access)
3. [Plans & Billing](#3-plans--billing)
4. [Trial Period & Access Control](#4-trial-period--access-control)
5. [Application Pages & Features](#5-application-pages--features)
6. [Audio Processing & Transcription](#6-audio-processing--transcription)
7. [Translation](#7-translation)
8. [Formatting Commands](#8-formatting-commands)
9. [Document Export (DOCX)](#9-document-export-docx)
10. [Admin Dashboard](#10-admin-dashboard)
11. [System Architecture](#11-system-architecture)
12. [API Reference](#12-api-reference)
13. [Database Schema](#13-database-schema)
14. [Infrastructure & External Services](#14-infrastructure--external-services)
15. [Environment Variables & Secrets](#15-environment-variables--secrets)
16. [Known Limits & Constraints](#16-known-limits--constraints)
17. [Admin Account](#17-admin-account)

---

## 1. Product Overview

IndoScribe Pro is a professional web-based audio transcription application specializing in Indian languages — **English, Hindi, and Marathi**. It provides a complete workflow for converting audio recordings into formatted, editable text documents, with optional translation between supported languages.

**Core workflow:**
1. User registers and logs in
2. Creates a project and selects the source language
3. Uploads an audio file (MP3, WAV, M4A, WebM, OGG)
4. Initiates AI transcription (Sarvam AI primary, Google STT fallback)
5. Reviews and edits the transcribed text in a rich editor
6. Optionally translates into another Indian language
7. Exports the final document as a formatted DOCX file

**Key capabilities:**
- AI transcription for English, Hindi, and Marathi audio
- Real-time text editing with rich formatting
- 109 voice formatting commands (spoken commands convert to Markdown)
- Bilingual DOCX export (source + translation side by side)
- Plan-based minutes billing with configurable trial periods
- Full admin control over users, plans, providers, and settings

---

## 2. User Roles & Access

| Role | Description |
|------|-------------|
| `user` | Standard account. Subject to plan minutes limits and trial period. |
| `admin` | Full access. Bypasses trial restrictions. Can manage users, plans, providers, commands, and settings. |

**Admin exemptions:**
- Admins are never blocked by trial expiry
- Admins can transcribe and translate regardless of plan or date
- Admin role is set directly in the database; there is no self-registration as admin

---

## 3. Plans & Billing

Plans are stored in the `plans` table and control how many minutes a user can transcribe. As of V1, there are three plans:

| ID | Plan Name | Monthly Price | Annual Price | Minutes | Days Limit |
|----|-----------|--------------|-------------|---------|-----------|
| 1 | Starter | Free | Free | 120 | 14 days |
| 2 | Basic | Rs 2,900 | Rs 29,000 | 1,200 | Unlimited |
| 3 | Complimentary | Free | Free | 600 | Unlimited |

**How billing works:**
- Each transcription deducts minutes from the user's plan allocation (`total_minutes_transcribed` on the user record)
- Minutes are measured in audio duration, not processing time
- When `minutes_remaining` reaches 0, transcription is blocked
- Translation does not consume minutes — only transcription does
- Plan assignment is done by admin from the Users tab in Admin Dashboard

**Plans table columns:**

| Column | Type | Description |
|--------|------|-------------|
| `id` | integer | Auto-increment primary key |
| `plan_name` | varchar(100) | Unique plan name |
| `monthly_price` | numeric | Monthly price in INR |
| `annual_price` | numeric | Annual price in INR |
| `total_minutes` | integer | Total transcription minutes allowed |
| `days_limit` | integer | Trial duration in days (NULL = unlimited) |
| `is_active` | boolean | Whether plan appears in admin lists |
| `description` | text | Human-readable description |
| `created_at` | timestamp | Record creation time |
| `updated_at` | timestamp | Record last update time |

---

## 4. Trial Period & Access Control

The trial system is **plan-driven**. Each plan's `days_limit` column controls the time restriction for that plan.

**How it works:**
- At registration, `trial_ends_at` is set on the user record as `created_at + days_limit days`
- If a plan has `days_limit = NULL`, no time restriction is enforced — only the minutes limit applies
- After trial expiry, certain operations are blocked while others remain available

**Blocked after trial expiry:**
- Starting new transcriptions (Sarvam AI / Google STT) — these cost money
- Requesting new translations (Sarvam Translate) — these cost money

**Always allowed (free operations):**
- Opening and viewing existing projects
- Editing transcribed or translated text manually
- Exporting to DOCX

**Enforcement:**
- Backend: Returns HTTP 403 with an error message if trial is expired
- Frontend: Disables transcribe/translate buttons and shows an expired banner in ProjectEditor
- Dashboard navbar shows plan name and trial end date; shows "Trial Expired" in red when expired

**Admin override:**
- Users with `role = 'admin'` always receive `isTrialExpired: false` regardless of date

---

## 5. Application Pages & Features

### Landing Page (`/`)
- Marketing page for new visitors
- Call-to-action: "Get Started Free (120 min audio | 14 days)"
- Links to Register and Login

### Register Page (`/register`)
- New user self-registration
- Fields: Full name, Email, Password, Mobile (optional), Workplace, Professional group, Privacy consent
- New users are assigned the Starter plan (ID 1) by default
- `trial_ends_at` is set at registration based on plan's `days_limit`

### Login Page (`/login`)
- Session-based authentication
- Admins are redirected to `/admin` after login
- Regular users are redirected to `/dashboard`

### Dashboard (`/dashboard`)
- Lists all projects for the logged-in user
- Shows plan name, minutes remaining, and trial end date in navbar
- "New Project" button — disabled if trial expired
- Project cards show status, language, creation date

### New Project Page (`/projects/new`)
- Create a new transcription project
- Fields: Project title, Source language (English / Hindi / Marathi)
- Includes a collapsible **Voice Commands Guide** — a reference panel showing all 109 formatting commands filtered by selected language, with search

### Project Editor (`/projects/:id`)
- Main workspace for a project
- **Left panel:** Audio upload, transcription controls, translation controls
- **Center panel:** Editable rich-text transcription editor
- **Right panel (when translated):** Editable translation editor
- Trial expired banner is shown if applicable; transcribe/translate buttons disabled
- Auto-saves edits
- DOCX export with mode selection: source only, translation only, or bilingual

### Admin Dashboard (`/admin`)
- Restricted to `role = 'admin'` users only
- Six tabs: Overview, Users, Plans, Commands, Providers, Settings

---

## 6. Audio Processing & Transcription

### Supported Formats
| Format | Max Size | Max Duration |
|--------|----------|-------------|
| MP3 | 25 MB | 30 minutes |
| WAV | 25 MB | 30 minutes |
| M4A | 25 MB | 30 minutes |
| WebM | 25 MB | 30 minutes |
| OGG | 25 MB | 30 minutes |

### Processing Pipeline
1. Audio uploaded to server
2. Stored in AWS S3 (`indoscribe-pro-audio` bucket) — falls back to database storage if S3 unavailable
3. Converted to **LINEAR16 WAV** (16kHz, mono) using ffmpeg
4. Audio longer than 30 seconds is **chunked** for processing
5. Sent to Sarvam AI STT (Saarika v2.5) — falls back to Google STT if Sarvam fails
6. Raw transcript returned, then passed through formatting command processor
7. Formatted transcript stored in `projects.formatted_transcript`

### STT Providers

**Primary: Sarvam AI (Saarika v2.5)**
- Best accuracy for Hindi and Marathi
- Supports code-mixed Indian English
- Configured per language in the Providers tab

**Fallback: Google Cloud Speech-to-Text**
- Used when Sarvam is unavailable or fails
- Requires `GOOGLE_APPLICATION_CREDENTIALS` or `GOOGLE_CLOUD_API_KEY`

### Audio Storage
- AWS S3 bucket: `indoscribe-pro-audio` (Mumbai region)
- S3 objects have a **15-day auto-deletion lifecycle policy**
- Audio is streamed to the client via `/api/projects/:id/audio` — not served directly from S3

---

## 7. Translation

### Supported Language Pairs
Any combination of:
- English (en-IN)
- Hindi (hi-IN)
- Marathi (mr-IN)

Source and target must be different languages.

### Translation Provider
**Sarvam AI Translate (mayura:v1)**
- API limit: **1,000 characters per request**
- The service automatically splits long text into chunks of ≤ 900 characters before sending

### Chunking Strategy (3-level)
1. **Paragraph level** — Split at blank lines; combine paragraphs up to 900 chars
2. **Sentence level** — If a paragraph exceeds 900 chars, split at sentence endings (`.`, `!`, `?`, `।`)
3. **Word level** — If a sentence exceeds 900 chars, split at word boundaries

Chunks are reassembled and stored as the translated content.

### Translation Storage
- Stored in the `translations_text` table
- One row per project per target language (unique constraint)
- Retranslation overwrites the existing row
- Users can manually edit translated text after translation

---

## 8. Formatting Commands

IndoScribe Pro includes **109 language-specific voice formatting commands** that convert spoken phrases into Markdown formatting during transcription.

### Command Categories

| Category | Example Spoken Command | Output |
|----------|----------------------|--------|
| Formatting | "bold start" | `**` |
| Punctuation | "full stop" | `.` |
| Structure | "new paragraph" | `\n\n` |
| Headings | "heading one" | `# ` |
| Lists | "bullet point" | `- ` |

### Language Support
Commands are available for English, Hindi, and Marathi, loaded from a JSON configuration file by `FormattingCommandService`.

### Admin Management
Admins can view, search, filter, enable/disable, edit, add, and delete commands from the **Commands tab** in Admin Dashboard. Changes take effect immediately via a reload mechanism.

### User Reference
The **Voice Commands Guide** in the New Project page provides a read-only, searchable reference of all active commands, filtered by the selected language.

---

## 9. Document Export (DOCX)

Projects can be exported as `.docx` files with full formatting.

### Export Modes
| Mode | Content |
|------|---------|
| Source only | Transcription/edited text only |
| Translation only | Translated text only |
| Bilingual | Source and translation in parallel |

### Typography
| Script | Font |
|--------|------|
| Devanagari (Hindi, Marathi) | Noto Sans Devanagari |
| Latin (English) | Calibri |

### Markdown Support
The `MarkdownParser` converts Markdown formatting in the text to proper DOCX styles:
- Headings (H1–H3)
- Bold and italic text
- Bullet and numbered lists
- Tables
- Horizontal rules

---

## 10. Admin Dashboard

Accessible only to users with `role = 'admin'`.

### Overview Tab
- Total users, active projects, total minutes transcribed, estimated cost in INR

### Users Tab
- List of all registered users
- Per user: name, role badge, plan badge, active status, minutes used/remaining
- Inline actions: Toggle active/inactive, change plan assignment

### Plans Tab
- View all plans with: name, minutes, days limit, monthly price, annual price
- Displays "Unlimited" for plans with no days limit

### Commands Tab
- Full CRUD for formatting commands
- Search by phrase, filter by language (English / Hindi / Marathi)
- Toggle active/inactive per command
- Inline edit, add new command, delete with confirmation

### Providers Tab
- Configure primary and fallback STT provider per language
- Settings: provider name, API configuration

### Settings Tab
- System-level key-value configuration stored in `system_settings` table

---

## 11. System Architecture

### Technology Stack

**Frontend:**
| Technology | Version | Purpose |
|-----------|---------|---------|
| React | 18+ | UI framework |
| TypeScript | — | Type safety |
| Vite | — | Build tool and dev server |
| Wouter | — | Client-side routing |
| shadcn/ui | — | UI component library |
| Tailwind CSS | — | Styling |
| TanStack Query | v5 | Server state management |
| Zod | — | Schema validation |

**Backend:**
| Technology | Version | Purpose |
|-----------|---------|---------|
| Node.js | — | Runtime |
| Express.js | — | HTTP server and API |
| TypeScript | — | Type safety |
| Drizzle ORM | — | Database queries and schema |
| bcryptjs | — | Password hashing |
| express-session | — | Session management |
| connect-pg-simple | — | Session storage in PostgreSQL |
| multer | — | File upload handling |
| fluent-ffmpeg | — | Audio conversion |
| docx | — | DOCX document generation |

### Branding
- Primary colour: Saffron orange `#FF9933`
- Secondary colour: Deep purple `#6B21A8`
- Devanagari font: Noto Sans Devanagari (Google Fonts CDN)

### Project Structure

```
/
├── client/                   # React frontend
│   └── src/
│       ├── pages/            # Page components
│       │   ├── Landing.tsx
│       │   ├── Register.tsx
│       │   ├── Dashboard.tsx
│       │   ├── NewProject.tsx
│       │   ├── ProjectEditor.tsx
│       │   ├── AdminDashboard.tsx
│       │   └── Home.tsx
│       ├── components/       # Reusable UI components
│       ├── lib/              # Auth context, API client
│       └── hooks/            # Custom React hooks
├── server/                   # Express backend
│   ├── routes.ts             # All API routes
│   ├── auth.ts               # Auth routes (register/login/me/logout)
│   ├── storage.ts            # Database access layer
│   ├── seed-admin.ts         # Admin user bootstrapping
│   └── services/
│       ├── SarvamSTTService.ts
│       ├── SarvamTranslateService.ts
│       ├── GCSService.ts
│       ├── S3AudioService.ts
│       ├── FormattingCommandService.ts
│       └── MarkdownParser.ts
├── shared/
│   └── schema.ts             # Drizzle ORM schema + Zod types
└── IndoScribeWebappV1.md     # This document
```

---

## 12. API Reference

All endpoints are prefixed with `/api`. Authentication is session-based.

### Authentication

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | None | Register new user |
| POST | `/api/auth/login` | None | Login |
| POST | `/api/auth/logout` | Session | Logout |
| GET | `/api/auth/me` | Session | Get current user info |

### Languages

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/languages` | None | List active languages |

### Projects

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/projects` | User | List user's projects |
| POST | `/api/projects` | User | Create new project |
| GET | `/api/projects/:id` | User | Get project details |
| PUT | `/api/projects/:id` | User | Update project |
| POST | `/api/projects/:id/upload` | User | Upload audio file |
| POST | `/api/projects/:id/transcribe` | User | Start transcription |
| GET | `/api/projects/:id/audio` | User | Stream audio |
| GET | `/api/projects/:id/docx` | User | Export DOCX |

### Translations

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/projects/:id/translations` | User | List translations for project |
| POST | `/api/projects/:id/translations` | User | Create or retranslate |
| PUT | `/api/translations/:id` | User | Update translated text |

### Plans (Public)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/plans` | None | List all active plans |

### Commands

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/commands/active` | User | List active commands (for voice guide) |

### Admin — Users

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/admin/users` | Admin | List all users with plan info |
| PUT | `/api/admin/users/:id` | Admin | Update user (plan, active status) |

### Admin — Stats

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/admin/stats` | Admin | Usage statistics |

### Admin — Providers

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/admin/providers` | Admin | List STT provider configs |
| POST | `/api/admin/providers` | Admin | Create/update provider config |

### Admin — Settings

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/admin/settings/:key` | Admin | Get a system setting |
| PUT | `/api/admin/settings/:key` | Admin | Update a system setting |

### Admin — Plans

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/admin/plans` | Admin | Create a new plan |
| PUT | `/api/admin/plans/:id` | Admin | Update a plan |

### Admin — Commands

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/admin/commands` | Admin | List all formatting commands |
| POST | `/api/admin/commands` | Admin | Add a new command |
| PUT | `/api/admin/commands/:id` | Admin | Update a command |
| DELETE | `/api/admin/commands/:id` | Admin | Delete a command |
| POST | `/api/admin/commands/reload` | Admin | Reload commands from config |

---

## 13. Database Schema

**Database:** AWS RDS PostgreSQL (Mumbai / ap-south-1 region)  
**ORM:** Drizzle ORM  
**Connection:** `AWS_RDS_DATABASE_URL` environment variable

> **Critical rule:** All schema changes must be made via direct SQL scripts using `AWS_RDS_DATABASE_URL`. Drizzle migration commands (`db:push`) and the `DATABASE_URL` (Neon) variable must never be used.

### Table: `users`

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | integer | NO | auto | Primary key |
| email | varchar(255) | NO | — | Unique login identifier |
| password_hash | varchar(255) | NO | — | bcrypt hash |
| full_name | varchar(255) | NO | — | Display name |
| mobile | varchar(20) | YES | — | Phone number |
| workplace | varchar(255) | NO | 'Organization/Freelance' | Organisation name |
| professional_group | varchar(255) | YES | — | Profession category |
| role | varchar(20) | NO | 'user' | 'user' or 'admin' |
| is_active | boolean | NO | true | Account enabled flag |
| plan_id | integer | YES | 1 | FK → plans.id |
| project_limit | integer | NO | 5 | Max projects allowed |
| trial_projects_remaining | integer | NO | 5 | Legacy field |
| total_projects_completed | integer | NO | 0 | Completed project count |
| total_minutes_transcribed | numeric(10,2) | NO | 0 | Cumulative minutes used |
| consent_accepted | boolean | NO | false | Privacy consent flag |
| consent_date | timestamp | YES | — | When consent was given |
| trial_ends_at | timestamp | YES | — | Trial expiry date (set at registration) |
| created_at | timestamp | NO | now() | Registration timestamp |
| updated_at | timestamp | NO | now() | Last update timestamp |

### Table: `plans`

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | integer | NO | auto | Primary key |
| plan_name | varchar(100) | NO | — | Unique plan name |
| monthly_price | numeric(10,2) | NO | 0 | Price per month (INR) |
| annual_price | numeric(10,2) | NO | 0 | Price per year (INR) |
| total_minutes | integer | NO | 0 | Transcription minutes included |
| days_limit | integer | YES | NULL | Trial duration in days; NULL = unlimited |
| is_active | boolean | NO | true | Whether plan is usable |
| description | text | YES | — | Plan description |
| created_at | timestamp | NO | now() | — |
| updated_at | timestamp | NO | now() | — |

### Table: `projects`

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | integer | NO | Primary key |
| user_id | integer | NO | FK → users.id |
| title | varchar(255) | NO | Project name |
| language_code | varchar(10) | NO | Source language (en-IN, hi-IN, mr-IN) |
| status | varchar(30) | NO | created / uploading / transcribing / transcribed / error |
| audio_filename | varchar(255) | YES | Original filename |
| audio_duration_seconds | integer | YES | Audio length |
| audio_data | text | YES | Base64 audio fallback (if S3 not used) |
| audio_s3_key | varchar(500) | YES | S3 object key |
| sample_rate | integer | YES | Audio sample rate |
| audio_channels | integer | YES | Mono/stereo |
| raw_transcript | text | YES | Raw STT output |
| formatted_transcript | text | YES | After formatting commands applied |
| edited_content | text | YES | User-edited version |
| stt_provider | varchar(50) | YES | 'sarvam' or 'google' |
| stt_job_id | varchar(255) | YES | Async job reference |
| stt_cost_inr | numeric(10,4) | YES | Estimated cost |
| exported_at | timestamp | YES | Last DOCX export time |
| created_at | timestamp | NO | — |
| updated_at | timestamp | NO | — |

### Table: `translations_text`

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | integer | NO | Primary key |
| project_id | integer | NO | FK → projects.id |
| source_language_code | varchar(10) | NO | Original language |
| target_language_code | varchar(10) | NO | Translation language |
| translated_content | text | YES | AI-generated translation |
| edited_content | text | YES | User-edited translation |
| status | varchar(30) | NO | pending / completed / error |
| created_at | timestamp | NO | — |
| updated_at | timestamp | NO | — |

> Unique constraint: one row per `(project_id, target_language_code)`.

### Table: `languages`

| Column | Type | Description |
|--------|------|-------------|
| id | integer | Primary key |
| name | varchar(100) | Display name (English, Hindi, Marathi) |
| code | varchar(10) | Language code (en-IN, hi-IN, mr-IN) |
| script | varchar(50) | Writing script (Latin, Devanagari) |
| is_active | boolean | Whether language is available |
| created_at | timestamp | — |

### Table: `provider_config`

| Column | Type | Description |
|--------|------|-------------|
| id | integer | Primary key |
| language_code | varchar(10) | Language this config applies to |
| primary_provider | varchar(50) | Main STT provider name |
| fallback_provider | varchar(50) | Fallback STT provider name |
| provider_settings | jsonb | Provider-specific config |
| is_active | boolean | Whether config is active |
| updated_by | integer | FK → users.id |
| updated_at | timestamp | — |

### Table: `formatting_commands_db`

| Column | Type | Description |
|--------|------|-------------|
| id | integer | Primary key |
| language_code | varchar(10) | Language this command applies to |
| command_type | varchar(50) | Category (formatting, punctuation, etc.) |
| spoken_form | varchar(255) | What the user says |
| output | varchar(255) | What it converts to |
| is_active | boolean | Whether command is active |
| created_at | timestamp | — |

### Table: `usage_log`

| Column | Type | Description |
|--------|------|-------------|
| id | integer | Primary key |
| user_id | integer | FK → users.id |
| project_id | integer | FK → projects.id |
| action | varchar(50) | Action type (transcribe, translate, export) |
| provider | varchar(50) | Service used |
| duration_seconds | integer | Audio duration |
| character_count | integer | Text character count |
| cost_inr | numeric(10,4) | Estimated cost |
| created_at | timestamp | — |

### Table: `system_settings`

| Column | Type | Description |
|--------|------|-------------|
| key | varchar(100) | Primary key — setting name |
| value | jsonb | Setting value |
| updated_by | integer | FK → users.id |
| updated_at | timestamp | — |

### Table: `session`

Managed automatically by `connect-pg-simple` for Express session storage.

| Column | Type | Description |
|--------|------|-------------|
| sid | varchar | Session ID (primary key) |
| sess | json | Session data |
| expire | timestamp | Expiry time |

---

## 14. Infrastructure & External Services

### AWS RDS PostgreSQL
- **Region:** Mumbai (ap-south-1)
- **Purpose:** Primary application database
- **Connection:** via `AWS_RDS_DATABASE_URL`

### AWS S3
- **Bucket:** `indoscribe-pro-audio`
- **Region:** Mumbai (ap-south-1)
- **Purpose:** Audio file storage
- **Lifecycle:** Files auto-deleted after 15 days
- **Access:** Server-side only (never exposed directly to browser)

### Sarvam AI
- **STT:** Saarika v2.5 — primary speech-to-text provider
- **Translate:** mayura:v1 — translation service (1,000 char/request limit)
- **API Key:** `SARVAM_API_KEY`

### Google Cloud
- **STT:** Google Speech-to-Text — fallback transcription provider
- **Auth:** `GOOGLE_APPLICATION_CREDENTIALS` (service account JSON path) or `GOOGLE_CLOUD_API_KEY`

---

## 15. Environment Variables & Secrets

| Variable | Required | Description |
|----------|----------|-------------|
| `AWS_RDS_DATABASE_URL` | YES | PostgreSQL connection string (primary DB) |
| `AWS_ACCESS_KEY_ID` | YES | AWS credentials for S3 access |
| `AWS_SECRET_ACCESS_KEY` | YES | AWS credentials for S3 access |
| `AWS_REGION` | YES | AWS region (ap-south-1) |
| `AWS_S3_BUCKET` | YES | S3 bucket name (indoscribe-pro-audio) |
| `SESSION_SECRET` | YES | Secret for signing Express sessions |
| `SARVAM_API_KEY` | YES | API key for Sarvam AI (STT + Translate) |
| `GOOGLE_APPLICATION_CREDENTIALS` | Optional | Path to Google service account JSON |
| `GOOGLE_CLOUD_API_KEY` | Optional | Alternative Google API key |
| `DATABASE_URL` | UNUSED | Neon DB — not used, do not connect |
| `PGDATABASE`, `PGHOST`, `PGPASSWORD`, `PGPORT`, `PGUSER` | UNUSED | Neon DB variables — not used |

---

## 16. Known Limits & Constraints

| Area | Limit | Notes |
|------|-------|-------|
| Audio file size | 25 MB | Per upload |
| Audio duration | 30 minutes | Per project |
| Sarvam Translate | 1,000 chars/request | Handled automatically by chunking |
| Supported audio formats | MP3, WAV, M4A, WebM, OGG | Other formats rejected |
| Supported languages | English, Hindi, Marathi | Only these three |
| S3 audio retention | 15 days | Files auto-deleted by S3 lifecycle |
| Session storage | PostgreSQL `session` table | connect-pg-simple |
| Translation chunking max | 900 chars/chunk | Buffer below 1,000 char API limit |

---

## 17. Admin Account

| Field | Value |
|-------|-------|
| Email / Username | `ispadmin` |
| Default Password | `adminmdk` |
| Role | admin |
| Organisation | Zapurzaa Systems |

The admin account is created automatically on first server start via `seed-admin.ts`. If the account already exists, seeding is skipped.

To reset the admin password, run the following against the AWS RDS database:

```sql
UPDATE users
SET password_hash = '<bcrypt_hash_of_new_password>'
WHERE email = 'ispadmin';
```

Use Node.js to generate the hash:
```bash
node -e "const bcrypt = require('bcryptjs'); bcrypt.hash('newpassword', 10).then(h => console.log(h));"
```

---

*End of IndoScribe Pro V1 Documentation*
