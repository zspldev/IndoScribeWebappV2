# MoMApp - Meeting Minutes Application

## Project Overview

MoMApp is a web-based application that transforms meeting audio recordings into structured meeting minutes. The application supports Indian languages (English, Hindi, Marathi) with automatic language detection, speaker diarization, and AI-powered summarization to generate professional meeting minutes with summaries, topics discussed, and action items with due dates.

## Target Users

- Teams recording business meetings
- Organizations requiring meeting documentation for audit trails
- Professionals who need structured notes from recorded conversations

## Core Requirements

### Functional Requirements

1. **Audio Input**
   - Upload audio files (MP3, WAV, M4A formats)
   - Maximum file size: 100MB
   - Maximum duration: 2 hours per recording
   - Future: Real-time recording option (Phase 2)

2. **Language Support**
   - Automatic language detection (no manual selection required)
   - Supported languages: English, Hindi, Marathi
   - Handle code-switching (mixed language conversations)

3. **Speaker Diarization**
   - Identify different speakers in the audio
   - Label speakers (Speaker 1, Speaker 2, etc.)
   - Future: Named Entity Recognition to match speakers to names mentioned

4. **AI-Powered Meeting Minutes**
   - Generate meeting summary (2-3 paragraphs)
   - Extract topics discussed (bulleted list)
   - Identify action items with:
     - Task description
     - Assigned person (if mentioned)
     - Due date (if mentioned)
   - Full transcript with speaker labels

5. **Audio Storage**
   - Store original audio files for audit trail
   - Retrievable for playback and reference
   - Metadata: upload date, duration, file size, meeting title

6. **Export**
   - Download meeting minutes as DOCX
   - Proper formatting for Hindi/Marathi (Devanagari fonts)
   - Professional meeting minutes template

### Non-Functional Requirements

1. **No user authentication required** (Phase 1)
2. **Manual sharing** - Users download and share files themselves
3. **Responsive design** - Works on desktop and tablet browsers

## Technical Architecture

### Recommended Tech Stack

| Component | Technology | Rationale |
|-----------|------------|-----------|
| **Frontend** | React + TypeScript + Vite | Modern, fast development |
| **UI Components** | shadcn/ui + Tailwind CSS | Consistent, accessible design |
| **Backend** | Express.js + TypeScript | RESTful API, easy integration |
| **Database** | PostgreSQL (Neon) | Reliable, scalable |
| **Audio Storage** | Replit Object Storage | Cost-effective, scalable |
| **Transcription** | OpenAI Whisper API | Best auto-detection, cheapest |
| **Diarization** | AssemblyAI | Accurate speaker identification |
| **AI Summarization** | OpenAI GPT-4 | Best summarization quality |
| **State Management** | TanStack Query | Server state, caching |

### System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (React)                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐ │
│  │  Upload  │  │ Progress │  │  Editor  │  │  Minutes View    │ │
│  │   Page   │  │   Page   │  │   Page   │  │  (Summary/Items) │ │
│  └──────────┘  └──────────┘  └──────────┘  └──────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Backend (Express.js)                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │ Upload API   │  │ Meeting API  │  │ Processing Service   │   │
│  │ /api/upload  │  │ /api/meetings│  │ (Background Jobs)    │   │
│  └──────────────┘  └──────────────┘  └──────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
         │                    │                     │
         ▼                    ▼                     ▼
┌──────────────┐    ┌──────────────┐    ┌─────────────────────────┐
│   Object     │    │  PostgreSQL  │    │    External APIs        │
│   Storage    │    │   Database   │    │  ┌───────────────────┐  │
│  (Audio)     │    │  (Metadata)  │    │  │ OpenAI Whisper    │  │
└──────────────┘    └──────────────┘    │  │ AssemblyAI        │  │
                                        │  │ OpenAI GPT-4      │  │
                                        │  └───────────────────┘  │
                                        └─────────────────────────┘
```

### Processing Pipeline

```
Upload Audio
     │
     ▼
┌─────────────────┐
│ Store in Object │
│    Storage      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  AssemblyAI     │  ← Transcription + Speaker Diarization
│  Processing     │     + Language Detection
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  GPT-4          │  ← Generate Summary, Topics, Action Items
│  Summarization  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Store Results  │  ← Save to Database
│  in Database    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Display to     │
│  User           │
└─────────────────┘
```

## Data Model

### Meetings Table

```typescript
meetings: {
  id: serial primary key,
  title: varchar(255),                    // Meeting title (user-provided)
  audioUrl: text,                         // Object Storage URL
  audioFileName: varchar(255),            // Original file name
  audioDuration: integer,                 // Duration in seconds
  audioFileSize: integer,                 // Size in bytes
  detectedLanguage: varchar(10),          // 'en', 'hi', 'mr'
  status: varchar(50),                    // 'uploading', 'transcribing', 'summarizing', 'completed', 'failed'
  errorMessage: text,                     // Error details if failed
  createdAt: timestamp,
  updatedAt: timestamp
}
```

### Transcripts Table

```typescript
transcripts: {
  id: serial primary key,
  meetingId: integer references meetings(id),
  fullTranscript: text,                   // Complete transcript with speaker labels
  speakerCount: integer,                  // Number of identified speakers
  createdAt: timestamp
}
```

### Speakers Table

```typescript
speakers: {
  id: serial primary key,
  meetingId: integer references meetings(id),
  speakerLabel: varchar(50),              // 'Speaker 1', 'Speaker 2'
  speakerName: varchar(255),              // Identified name (from NER), nullable
  speakingDuration: integer               // Total speaking time in seconds
}
```

### Meeting Minutes Table

```typescript
meetingMinutes: {
  id: serial primary key,
  meetingId: integer references meetings(id),
  summary: text,                          // AI-generated summary
  createdAt: timestamp
}
```

### Topics Table

```typescript
topics: {
  id: serial primary key,
  meetingMinutesId: integer references meetingMinutes(id),
  topic: text,                            // Topic description
  orderIndex: integer                     // Display order
}
```

### Action Items Table

```typescript
actionItems: {
  id: serial primary key,
  meetingMinutesId: integer references meetingMinutes(id),
  description: text,                      // Action item description
  assignee: varchar(255),                 // Person responsible (nullable)
  dueDate: date,                          // Due date (nullable)
  orderIndex: integer                     // Display order
}
```

## API Endpoints

### Upload API

```
POST /api/meetings/upload
- Accepts: multipart/form-data (audio file + title)
- Returns: { meetingId, status: 'uploading' }

GET /api/meetings/:id/status
- Returns: { status, progress, errorMessage }
```

### Meetings API

```
GET /api/meetings
- Returns: List of all meetings with metadata

GET /api/meetings/:id
- Returns: Full meeting details including transcript and minutes

DELETE /api/meetings/:id
- Deletes meeting, audio, and all related data
```

### Download API

```
GET /api/meetings/:id/download/docx
- Returns: DOCX file with formatted meeting minutes

GET /api/meetings/:id/download/audio
- Returns: Original audio file
```

## User Interface

### Pages

1. **Home/Upload Page**
   - Meeting title input
   - Drag-and-drop audio upload
   - File type and size validation
   - Recent meetings list

2. **Processing Page**
   - Progress indicator (uploading → transcribing → summarizing)
   - Estimated time remaining
   - Cancel option

3. **Meeting Details Page**
   - Meeting metadata (title, date, duration)
   - Summary section
   - Topics discussed (expandable)
   - Action items table
   - Full transcript (collapsible, with speaker labels)
   - Download buttons (DOCX, Audio)

4. **Meetings List Page**
   - Table of all meetings
   - Search/filter by title or date
   - Status indicators
   - Quick actions (view, download, delete)

### UI Components

- Use shadcn/ui components consistently
- Support dark/light mode
- Responsive design (desktop + tablet)
- Loading states and progress indicators
- Error handling with clear messages

## Development Phases

### Phase 1: MVP (Weeks 1-3)

**Week 1: Foundation**
- [ ] Project setup (React + Express + PostgreSQL)
- [ ] Database schema and migrations
- [ ] Object Storage integration for audio files
- [ ] Basic upload API and UI

**Week 2: Transcription**
- [ ] AssemblyAI integration
- [ ] Speaker diarization processing
- [ ] Language detection
- [ ] Transcript storage and display

**Week 3: AI Summarization**
- [ ] OpenAI GPT-4 integration
- [ ] Meeting minutes generation (summary, topics, action items)
- [ ] DOCX export with formatting
- [ ] Polish UI and error handling

### Phase 2: Enhancements (Future)

- [ ] Real-time recording in browser
- [ ] Meeting playback with transcript sync
- [ ] Speaker name assignment/editing
- [ ] User accounts and meeting history
- [ ] Search across all transcripts
- [ ] Meeting templates customization

## External Service Configuration

### Required API Keys

1. **AssemblyAI API Key**
   - Used for: Transcription + Speaker Diarization
   - Pricing: ~$0.65/hour
   - Setup: https://www.assemblyai.com/

2. **OpenAI API Key**
   - Used for: GPT-4 summarization
   - Pricing: ~$0.10/hour of meeting
   - Setup: https://platform.openai.com/

### Environment Variables

```
DATABASE_URL=<PostgreSQL connection string>
ASSEMBLYAI_API_KEY=<AssemblyAI API key>
OPENAI_API_KEY=<OpenAI API key>
SESSION_SECRET=<Random session secret>
```

## Cost Estimates

### Per Meeting (1 hour)

| Service | Cost |
|---------|------|
| AssemblyAI (transcription + diarization) | $0.65 |
| OpenAI GPT-4 (summarization) | $0.10 |
| Object Storage (~100MB) | $0.002 |
| **Total per meeting** | **~$0.75** |

### Monthly Estimates

| Usage | Meetings | Monthly Cost |
|-------|----------|--------------|
| Light | 20 | ~$15 |
| Medium | 100 | ~$75 |
| Heavy | 500 | ~$375 |

## Success Criteria

1. User can upload audio and receive meeting minutes within 5 minutes (for 1-hour recording)
2. Speaker diarization correctly identifies 90%+ of speaker changes
3. Action items extracted with 80%+ accuracy when clearly stated in audio
4. DOCX export renders correctly in Microsoft Word
5. Hindi/Marathi text displays with proper Devanagari fonts

## Constraints and Limitations

1. Maximum 2-hour audio files (Phase 1)
2. No real-time transcription (Phase 1)
3. No user authentication (Phase 1)
4. English, Hindi, Marathi only (expandable later)
5. AssemblyAI speaker diarization limited to 10 speakers per meeting
