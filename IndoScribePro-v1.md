# IndoScribePro v1 - Product Plan

**Document Version**: 1.0
**Date**: February 8, 2026
**Status**: Planning
**Base**: Evolved from InDict (existing codebase)

---

## 1. Product Vision

IndoScribePro is a professional audio transcription platform designed for Indian languages. It enables users to upload or record audio, transcribe it using best-in-class speech recognition providers, apply language-specific formatting commands, edit the output in a rich text editor, and export polished Word documents.

Version 1 is an MVP focused on individual users with a project-based trial model, usage tracking, and a provider-agnostic transcription architecture.

---

## 2. Version 1 Scope

### 2.1 What's IN (v1)

| Feature | Description |
|---------|-------------|
| **Transcription** | Upload (MP3, WAV, M4A, WebM, OGG) and streaming recording (up to 1 hour) |
| **Provider-Agnostic STT** | Google Cloud STT and Sarvam AI, configurable per language |
| **Formatting Commands** | 109 language-specific commands (English, Hindi, Marathi) with native and phonetic variants |
| **Rich Text Editor** | TipTap-based editor with toolbar, undo/redo, find/replace, audio playback |
| **DOCX Export** | Formatted Word document with Devanagari support |
| **User Authentication** | Registration, login, password management |
| **Role-Based Access** | Admin and User roles |
| **Admin Config** | Provider settings, formatting command management, user management, system settings |
| **Project Management** | Users can create, view, and manage their transcription projects |
| **Trial System** | Project-based trial (e.g., 5 free transcriptions per user) |
| **Usage Tracking** | Track minutes transcribed, projects completed, API costs per user |
| **DPDP Compliance** | Data stored in India (AWS RDS Mumbai), encryption, consent management |

### 2.2 What's OUT (deferred to v2+)

| Feature | Target Version |
|---------|---------------|
| Translation (cross-language) | v2 |
| Organization/Team accounts | v2 |
| Org Admin role | v2 |
| Automated billing (Razorpay/Stripe) | v2 |
| Punctuation restoration (indic-punct) | v2 |
| Spell check (Hunspell) | v2 |
| MoMApp (Meeting Minutes) | Separate product |

---

## 3. User Roles

### 3.1 Admin

| Capability | Description |
|------------|-------------|
| Provider Configuration | Set STT provider per language, manage API keys, configure fallback providers |
| Formatting Commands | Add/edit/delete formatting commands per language |
| User Management | View all users, activate/deactivate accounts, adjust trial limits |
| Usage Dashboard | View system-wide usage stats, API costs, active users |
| System Settings | Configure trial limits, max audio duration, file size limits |

### 3.2 User

| Capability | Description |
|------------|-------------|
| Registration & Login | Email/password registration, login, password reset |
| Create Projects | Upload audio or record, select language, start transcription |
| Edit Transcriptions | Use rich text editor with formatting toolbar |
| Export Documents | Download as formatted DOCX |
| View Projects | List of all their transcription projects with status |
| Usage Summary | View own usage (projects used, trial remaining) |

---

## 4. Technical Architecture

### 4.1 Stack (evolved from InDict)

| Layer | Technology |
|-------|-----------|
| Frontend | React 18+, TypeScript, Vite, TipTap Editor, Tailwind CSS, shadcn/ui |
| Backend | Express.js, TypeScript |
| Database | AWS RDS PostgreSQL (Mumbai region - ap-south-1) |
| ORM | Drizzle ORM |
| Auth | Session-based (express-session + connect-pg-simple) with bcrypt password hashing |
| STT Providers | Google Cloud Speech-to-Text, Sarvam AI |
| Audio Processing | ffmpeg (format conversion) |
| Document Export | docx library |

### 4.2 Provider-Agnostic Transcription Architecture

```
┌─────────────────────────────────────┐
│       TranscriptionService          │
│  (Common Interface)                 │
│                                     │
│  transcribe(audio, language, userId)│
│  getStatus(jobId)                   │
│  getResult(jobId)                   │
│  cancelJob(jobId)                   │
│  getProviderForLanguage(lang)       │
└──────────┬──────────────────────────┘
           │
     ┌─────┴───────┐
     ↓             ↓
┌──────────┐  ┌──────────┐
│  Google  │  │  Sarvam  │
│  Adapter │  │  Adapter │
└──────────┘  └──────────┘
```

**Each adapter implements:**
- `submitTranscription(audio, config)` → jobId
- `checkStatus(jobId)` → status object
- `fetchResult(jobId)` → transcript text
- `estimateCost(durationSeconds)` → cost in INR/USD

**Provider Configuration (stored in DB):**

| Field | Example |
|-------|---------|
| language_code | hi (Hindi) |
| primary_provider | sarvam |
| fallback_provider | google |
| provider_config | { model, sample_rate, etc. } |

### 4.3 Database Schema (AWS RDS PostgreSQL)

#### Core Tables

**users**
| Column | Type | Notes |
|--------|------|-------|
| id | serial PK | |
| email | varchar(255) | unique, not null |
| password_hash | varchar(255) | bcrypt hashed |
| full_name | varchar(255) | |
| role | enum('admin','user') | default 'user' |
| is_active | boolean | default true |
| trial_projects_remaining | integer | default 5 (configurable) |
| total_projects_completed | integer | default 0 |
| total_minutes_transcribed | decimal | default 0 |
| consent_accepted | boolean | DPDP consent |
| consent_date | timestamp | |
| created_at | timestamp | |
| updated_at | timestamp | |

**projects**
| Column | Type | Notes |
|--------|------|-------|
| id | serial PK | |
| user_id | FK → users | |
| title | varchar(255) | user-assigned or auto-generated |
| language_code | varchar(10) | e.g., 'hi', 'mr', 'en' |
| status | enum | 'created','uploading','transcribing','completed','failed','exported' |
| audio_filename | varchar(255) | original filename |
| audio_duration_seconds | integer | |
| audio_storage_key | varchar(500) | reference to audio storage |
| raw_transcript | text | unformatted STT output |
| formatted_transcript | text | after formatting commands applied |
| edited_content | text | user-edited content (auto-saved) |
| stt_provider | varchar(50) | 'google' or 'sarvam' |
| stt_job_id | varchar(255) | provider's job reference |
| stt_cost_inr | decimal | tracked cost |
| exported_at | timestamp | when DOCX was downloaded |
| created_at | timestamp | |
| updated_at | timestamp | |

**provider_config**
| Column | Type | Notes |
|--------|------|-------|
| id | serial PK | |
| language_code | varchar(10) | |
| primary_provider | varchar(50) | 'google' or 'sarvam' |
| fallback_provider | varchar(50) | nullable |
| provider_settings | jsonb | provider-specific config |
| is_active | boolean | |
| updated_by | FK → users | admin who last modified |
| updated_at | timestamp | |

**formatting_commands**
| Column | Type | Notes |
|--------|------|-------|
| id | serial PK | |
| language_code | varchar(10) | |
| command_type | varchar(50) | 'structure', 'punctuation', 'formatting' |
| spoken_form | varchar(255) | what user says |
| output | varchar(255) | what gets inserted |
| is_active | boolean | |
| created_at | timestamp | |

**usage_log**
| Column | Type | Notes |
|--------|------|-------|
| id | serial PK | |
| user_id | FK → users | |
| project_id | FK → projects | |
| action | varchar(50) | 'transcription', 'export', 'edit' |
| provider | varchar(50) | |
| duration_seconds | integer | for transcription actions |
| character_count | integer | for future translation tracking |
| cost_inr | decimal | calculated cost |
| created_at | timestamp | |

**system_settings**
| Column | Type | Notes |
|--------|------|-------|
| key | varchar(100) PK | e.g., 'trial_project_limit' |
| value | jsonb | e.g., 5 |
| updated_by | FK → users | |
| updated_at | timestamp | |

### 4.4 Audio Storage Strategy

| Option | Pros | Cons | Recommendation |
|--------|------|------|----------------|
| AWS S3 (Mumbai) | DPDP compliant, scalable, cheap | Extra AWS service | Recommended for v1 |
| Database (current) | Simple, no extra service | Bloats DB, slow for large files | Not recommended for production |
| Local filesystem | Simplest | Not scalable, no redundancy | Not recommended |

**Recommendation**: Store audio files in AWS S3 (ap-south-1), store only the S3 key/reference in the database. This keeps the database lean and audio access fast.

---

## 5. DPDP Act Compliance (India)

The Digital Personal Data Protection Act, 2023 requires:

| Requirement | Implementation |
|-------------|---------------|
| **Data localization** | AWS RDS + S3 in Mumbai region (ap-south-1) |
| **Informed consent** | Consent checkbox during registration with clear privacy notice |
| **Purpose limitation** | Data used only for transcription services; stated in privacy policy |
| **Data minimization** | Collect only email, name, password; audio deleted after configurable retention period |
| **Right to erasure** | User can request account + data deletion; admin can execute |
| **Security safeguards** | Encryption at rest (RDS), encryption in transit (TLS), bcrypt passwords |
| **Breach notification** | Logging and monitoring; admin dashboard alerts |
| **Data retention policy** | Configurable retention period; auto-cleanup of old audio files |

### Privacy Notice (to be shown at registration)

> IndoScribePro collects your email, name, and audio files solely for providing transcription services. Your data is stored securely in India (AWS Mumbai). You can request deletion of your account and all associated data at any time. Audio files are retained for [X] days after project completion and then permanently deleted.

---

## 6. Trial System

### How It Works

| Aspect | Details |
|--------|---------|
| **Default trial** | 5 free transcription projects |
| **What counts as 1 project** | One audio file uploaded/recorded → transcribed → available for editing and export |
| **Trial tracking** | `trial_projects_remaining` field on user record |
| **When trial expires** | User sees "Trial ended" message with contact info for continued access |
| **Admin override** | Admin can extend trial for any user (adjust remaining count) |

### User Experience

1. User registers → gets 5 free projects
2. Each completed transcription decrements the counter
3. Dashboard shows: "3 of 5 trial projects remaining"
4. At 0 remaining: transcription is blocked, but existing projects remain accessible for editing/export
5. Admin can grant more projects manually

---

## 7. Usage Tracking

Every transcription action is logged for future billing readiness:

| Metric | How Tracked |
|--------|-------------|
| **Audio minutes** | Duration of each uploaded/recorded file |
| **Projects completed** | Count of transcriptions reaching 'completed' status |
| **Provider used** | Which STT provider handled each job |
| **API cost** | Calculated from provider rates x duration |
| **Export count** | Number of DOCX downloads |

### Admin Dashboard Metrics

- Total users (active/inactive)
- Total projects (by status)
- Total minutes transcribed (by language, by provider)
- Total estimated API cost (by provider, by month)
- Trial conversion rate (users who exhausted trial)

---

## 8. API Endpoints (v1)

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/register | User registration |
| POST | /api/auth/login | User login |
| POST | /api/auth/logout | User logout |
| POST | /api/auth/forgot-password | Password reset request |
| POST | /api/auth/reset-password | Password reset execution |
| GET | /api/auth/me | Get current user profile |

### Projects (User)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/projects | List user's projects |
| POST | /api/projects | Create new project (upload audio) |
| GET | /api/projects/:id | Get project details |
| PATCH | /api/projects/:id | Update project (save edits) |
| DELETE | /api/projects/:id | Delete project |
| POST | /api/projects/:id/transcribe | Start transcription |
| GET | /api/projects/:id/status | Check transcription status |
| GET | /api/projects/:id/download | Download DOCX |

### Admin
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/admin/users | List all users |
| PATCH | /api/admin/users/:id | Update user (role, trial, active status) |
| GET | /api/admin/providers | List provider configurations |
| PUT | /api/admin/providers/:lang | Update provider config for language |
| GET | /api/admin/usage | Usage statistics dashboard |
| GET | /api/admin/settings | Get system settings |
| PUT | /api/admin/settings | Update system settings |
| GET | /api/admin/commands | List formatting commands |
| POST | /api/admin/commands | Add formatting command |
| PUT | /api/admin/commands/:id | Update formatting command |
| DELETE | /api/admin/commands/:id | Delete formatting command |

---

## 9. Frontend Pages (v1)

| Page | Route | Access | Description |
|------|-------|--------|-------------|
| Landing/Login | / | Public | Login form, registration link |
| Register | /register | Public | Registration with DPDP consent |
| Forgot Password | /forgot-password | Public | Password reset request |
| Dashboard | /dashboard | User | Project list, usage summary, trial status |
| New Project | /projects/new | User | Language selection, audio upload/record |
| Project Editor | /projects/:id | User | Transcription view, editor, export |
| Admin Dashboard | /admin | Admin | System stats, quick actions |
| Admin Users | /admin/users | Admin | User management |
| Admin Providers | /admin/providers | Admin | STT provider configuration |
| Admin Commands | /admin/commands | Admin | Formatting command management |
| Admin Settings | /admin/settings | Admin | System settings (trial limits, etc.) |

---

## 10. Migration Path (InDict → IndoScribePro)

### What Changes

| Component | Current (InDict) | New (IndoScribePro v1) |
|-----------|-------------------|------------------------|
| **Name/Branding** | InDict | IndoScribePro |
| **Database** | Replit Neon PostgreSQL | AWS RDS PostgreSQL (Mumbai) |
| **Auth** | None (single user) | Email/password with roles |
| **STT Provider** | Google Cloud only | Google + Sarvam (configurable) |
| **Audio Storage** | Base64 in DB | AWS S3 (Mumbai) |
| **Project Management** | Single transcription flow | Multi-project dashboard |
| **Trial System** | None | Project-based (5 free) |
| **Usage Tracking** | None | Full tracking with cost |
| **Admin Panel** | None | Full admin config |

### What Stays the Same

- React + Express + TypeScript stack
- TipTap rich text editor
- Formatting commands system (109 commands)
- DOCX export with Devanagari support
- Audio recording with pause/resume
- Workflow stepper UI pattern
- ffmpeg audio processing

### Migration Steps

1. Update branding (InDict → IndoScribePro)
2. Configure AWS RDS connection
3. Create new database schema (users, projects, etc.)
4. Migrate formatting commands to database
5. Implement authentication system
6. Build provider-agnostic transcription service
7. Add Sarvam AI adapter
8. Build project management (dashboard, CRUD)
9. Implement trial system
10. Build admin panel
11. Add usage tracking
12. Implement DPDP consent flow
13. Configure AWS S3 for audio storage
14. Testing and polish

---

## 11. Implementation Estimate

| Phase | Tasks | Estimated Time | Confidence |
|-------|-------|---------------|------------|
| **1. Foundation** | AWS RDS setup, schema, auth system | 2-3 hours | 90% |
| **2. Core** | Provider-agnostic STT, Sarvam adapter | 1-2 hours | 85% |
| **3. Projects** | Dashboard, project CRUD, workflow | 2-3 hours | 90% |
| **4. Admin** | Admin panel (users, providers, commands, settings) | 2-3 hours | 85% |
| **5. Trial & Tracking** | Trial logic, usage logging, cost tracking | 1 hour | 90% |
| **6. Compliance** | DPDP consent, data retention, S3 storage | 1-2 hours | 85% |
| **7. Polish** | Branding, testing, edge cases | 1-2 hours | 90% |
| **Total** | | **10-16 hours** | **Overall: 85%** |

---

## 12. Open Questions

1. **AWS RDS credentials**: Will need RDS endpoint, username, password, and database name to connect
2. **AWS S3 bucket**: Should we create a new S3 bucket for audio storage, or use an existing one?
3. **First admin account**: How should the initial admin account be created? (Seed script with your email?)
4. **Password requirements**: Any specific password policy? (Minimum length, complexity rules?)
5. **Audio retention**: How long should completed project audio files be retained before auto-deletion? (30 days? 90 days? Indefinite?)
6. **Trial limit**: Confirm 5 free projects as the default, or different number?
7. **Sarvam API key**: Do you already have a Sarvam AI account, or should we plan for sign-up?

---

## 13. Future Versions Roadmap

### Version 2 (planned)

- Translation feature (Sarvam Translate + Google Translate)
- Organization/Team accounts with Org Admin role
- Automated billing (Razorpay integration)
- Punctuation restoration (indic-punct)
- Spell check (Hunspell/phunspell)
- Enhanced usage analytics

### Version 3 (exploratory)

- Additional STT providers (Whisper, Azure)
- Custom vocabulary/glossary per user
- Collaboration features (shared projects)
- Mobile-responsive recording
- API access for enterprise integrations

---

*This document will be updated as decisions are made and implementation progresses.*
