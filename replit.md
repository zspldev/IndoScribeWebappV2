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
- **Pages:** Landing, Register, Dashboard, Project Creation, Project Editor, Admin Dashboard.
- **Branding:** Saffron orange (#FF9933) and deep purple (#6B21A8) color scheme.
- **Typography:** Google Fonts CDN for Noto Sans Devanagari.

### Backend
The backend is an Express.js REST API developed with TypeScript, utilizing session-based authentication with `connect-pg-simple` and `bcryptjs` for password hashing.

**API Endpoints:**
- **Authentication:** Register, Login, Logout, Get Current User.
- **Projects:** CRUD operations for projects, audio upload, transcription initiation, audio streaming, DOCX export.
- **Translations:** List, Create/Retranslate, Update translated text.
- **Plans:** Public listing of plans, Admin CRUD for plans.
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
DOCX export functionality supports source-only, translation-only, or bilingual modes. It uses language-specific fonts (Noto Sans Devanagari for Devanagari, Calibri for Latin) and supports full Markdown formatting.

## External Dependencies

- **Database**: Replit built-in PostgreSQL (via `DATABASE_URL`)
- **Audio Storage**: AWS S3 (optional; falls back to in-database base64 storage)
- **Authentication**: `bcryptjs`, `connect-pg-simple`, `express-session`
- **Speech Recognition**: Sarvam AI STT (primary, requires `SARVAM_API_KEY`), Google Speech-to-Text (optional fallback)
- **Audio Processing**: `ffmpeg`, `fluent-ffmpeg`
- **Document Generation**: `docx` library
- **UI Libraries**: `@radix-ui/*`, `lucide-react`, `shadcn/ui`
- **Validation**: `Zod`, `@hookform/resolvers`
- **AWS SDK**: `@aws-sdk/client-s3`, `@aws-sdk/lib-storage` (optional, for S3 audio storage)
- **Translation**: Sarvam AI Translate API