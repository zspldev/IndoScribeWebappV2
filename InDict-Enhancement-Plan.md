# InDict Enhancement Plan

## Overview

This document outlines the plan and estimates for enhancing the existing InDict application with new features including streaming audio input, rich text editing, and additional helpful functionality.

---

## Feature 1: Dual Audio Input Options

### Current State
- File upload only (MP3, WAV, M4A)
- Maximum 50MB file size
- Maximum 8 hours duration

### Proposed Enhancement

Provide two clear input options on the home page:

#### Option A: Live Recording (Streaming Audio)
- Record audio directly in the browser
- Maximum duration: 1 hour
- Real-time audio capture using MediaRecorder API
- Visual waveform/timer during recording
- Pause/Resume/Stop controls

#### Option B: File Upload (Existing)
- Keep current functionality
- Upload pre-recorded audio files
- Formats: MP3, WAV, M4A

### Technical Implementation

```
┌─────────────────────────────────────────────────┐
│           Select Input Method                    │
│  ┌───────────────────┐  ┌───────────────────┐   │
│  │  🎙️ Record Audio  │  │  📁 Upload File   │   │
│  │                   │  │                   │   │
│  │  Record directly  │  │  Upload existing  │   │
│  │  in browser       │  │  audio file       │   │
│  │  (up to 1 hour)   │  │  (MP3/WAV/M4A)    │   │
│  └───────────────────┘  └───────────────────┘   │
└─────────────────────────────────────────────────┘
```

#### Streaming Audio Technical Details

| Component | Technology | Purpose |
|-----------|------------|---------|
| Audio Capture | MediaRecorder API | Browser-native recording |
| Audio Format | WebM/Opus or WAV | Browser-compatible format |
| Visualization | Web Audio API | Waveform display |
| Timer | React state | Duration tracking |
| Storage | Blob → FormData | Send to server |

#### UI Components Needed

1. **Recording Panel**
   - Start/Pause/Resume/Stop buttons
   - Recording timer (MM:SS format)
   - Audio level indicator
   - Waveform visualization (optional)

2. **Recording States**
   - Idle → Recording → Paused → Stopped
   - Clear visual indicators for each state

3. **Pre-upload Preview**
   - Playback recorded audio before submitting
   - Re-record option
   - Confirm and proceed button

### Complexity Assessment

| Aspect | Difficulty | Notes |
|--------|------------|-------|
| MediaRecorder API | Medium | Well-supported in modern browsers |
| Audio visualization | Medium | Optional, enhances UX |
| Pause/Resume | Low | Built into MediaRecorder |
| Browser compatibility | Medium | Safari has some quirks |
| Server integration | Low | Same as file upload after recording |

### Estimate

| Task | Time |
|------|------|
| Recording UI component | 4-6 hours |
| MediaRecorder integration | 3-4 hours |
| Audio preview/playback | 2-3 hours |
| Timer and controls | 2 hours |
| Browser compatibility testing | 2-3 hours |
| Integration with existing flow | 2-3 hours |
| **Total** | **15-21 hours (2-3 days)** |

---

## Feature 2: Language Selection (Continue Existing)

### Current State
- Three language options: English, Hindi, Marathi
- Required before upload
- Determines formatting commands applied

### Proposed Enhancement
- Keep existing functionality unchanged
- Add to both input paths (recording and upload)
- Consider adding "Auto-detect" as 4th option (future)

### Estimate

| Task | Time |
|------|------|
| Integrate with recording flow | 1 hour |
| **Total** | **1 hour** |

---

## Feature 3: Rich Text Editor

### Current State
- Plain textarea for editing transcription
- Basic features: undo/redo, find/replace
- Markdown-based formatting (converted on DOCX export)
- No visual formatting during editing

### Proposed Enhancement

Replace textarea with a full Rich Text Editor that shows formatting visually.

#### Editor Capabilities

| Feature | Current | Proposed |
|---------|---------|----------|
| Bold/Italic/Underline | Markdown syntax | Visual + toolbar buttons |
| Headings | Markdown syntax | Visual + dropdown |
| Strikethrough | Markdown syntax | Visual + button |
| Page breaks | Text marker | Visual separator |
| Font size | Single control | Inline formatting |
| Undo/Redo | ✅ | ✅ Enhanced |
| Find/Replace | ✅ | ✅ Keep |
| Word count | ✅ | ✅ Keep |

#### Recommended Editor Libraries

| Library | Pros | Cons | Recommendation |
|---------|------|------|----------------|
| **TipTap** | Modern, extensible, React-native | Learning curve | ⭐ Best choice |
| Slate.js | Highly customizable | Complex setup | Good alternative |
| Quill | Easy setup, mature | Less flexible | Simple option |
| Draft.js | Facebook-backed | Older, complex | Not recommended |

#### TipTap Implementation

```typescript
// Example TipTap setup
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'

const editor = useEditor({
  extensions: [
    StarterKit,
    Underline,
  ],
  content: transcribedText,
})
```

#### Editor UI Design

```
┌─────────────────────────────────────────────────────────────┐
│ Toolbar                                                      │
│ ┌────┬────┬────┬────┬────┬─────────┬────────┬──────────────┐│
│ │ B  │ I  │ U  │ S  │ H1 │ H2 │ H3 │ Page ⊟ │ Undo │ Redo ││
│ └────┴────┴────┴────┴────┴─────────┴────────┴──────────────┘│
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  This is **bold text** and this is *italic*.                │
│                                                              │
│  ## Heading Example                                          │
│                                                              │
│  Regular paragraph with __underlined__ words.               │
│                                                              │
│  ─────────── PAGE BREAK ───────────                         │
│                                                              │
│  Content after page break...                                │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│ Words: 45 │ Characters: 312 │ Lines: 8 │ Page Breaks: 1    │
└─────────────────────────────────────────────────────────────┘
```

#### Migration Strategy

1. Keep existing Markdown parsing for DOCX export
2. TipTap can output HTML or Markdown
3. Convert TipTap output → Markdown → existing DOCX generator
4. Or: Convert TipTap output → HTML → DOCX directly

### Complexity Assessment

| Aspect | Difficulty | Notes |
|--------|------------|-------|
| TipTap setup | Low | Good documentation |
| Custom extensions | Medium | Page breaks, custom formatting |
| Toolbar component | Medium | Custom design to match app |
| DOCX integration | Medium | May need to update parser |
| Undo/Redo | Low | Built into TipTap |
| Hindi/Marathi support | Low | Unicode, just works |

### Estimate

| Task | Time |
|------|------|
| TipTap installation and setup | 2-3 hours |
| Custom toolbar component | 4-5 hours |
| Page break extension | 2-3 hours |
| Integrate with existing editor page | 3-4 hours |
| Update DOCX export pipeline | 3-4 hours |
| Devanagari font testing | 1-2 hours |
| Bug fixes and polish | 3-4 hours |
| **Total** | **18-25 hours (3-4 days)** |

---

## Feature 4: Additional Helpful Functionality

Based on the app's purpose and user workflow, here are recommended additions:

### 4.1 Audio Playback During Editing (High Value)

**Description:** Play back the original audio while editing the transcription to verify accuracy.

**Features:**
- Audio player embedded in editor page
- Play/Pause/Seek controls
- Playback speed control (0.5x, 1x, 1.5x, 2x)
- Keyboard shortcuts for playback

**Estimate:** 4-6 hours

---

### 4.2 Auto-Save (High Value)

**Description:** Automatically save edits periodically to prevent data loss.

**Features:**
- Save every 30 seconds while editing
- "Last saved" timestamp display
- Manual save button
- Unsaved changes warning on page exit

**Estimate:** 2-3 hours

---

### 4.3 Transcription History (Medium Value)

**Description:** Keep a list of past transcriptions for reference.

**Features:**
- List of all transcriptions on home page
- Date, language, duration, status
- Quick actions: view, edit, download, delete
- Search/filter capability

**Estimate:** 6-8 hours

---

### 4.4 Keyboard Shortcuts (Medium Value)

**Description:** Speed up editing with keyboard shortcuts.

**Shortcuts:**
| Action | Shortcut |
|--------|----------|
| Bold | Ctrl+B |
| Italic | Ctrl+I |
| Underline | Ctrl+U |
| Heading 1 | Ctrl+1 |
| Heading 2 | Ctrl+2 |
| Heading 3 | Ctrl+3 |
| Save | Ctrl+S |
| Undo | Ctrl+Z |
| Redo | Ctrl+Y |
| Find | Ctrl+F |
| Play/Pause audio | Space (when not in editor) |

**Estimate:** 2-3 hours

---

### 4.5 Export Format Options (Low-Medium Value)

**Description:** Additional export formats beyond DOCX.

**Formats:**
- PDF export
- Plain text (.txt)
- Markdown (.md)
- Copy to clipboard

**Estimate:** 4-6 hours

---

### 4.6 Dark Mode Toggle (Low Value, Nice to Have)

**Description:** Allow users to switch between light and dark themes.

**Features:**
- Toggle in header
- Persist preference in localStorage
- Already partially implemented in app

**Estimate:** 1-2 hours

---

## Summary: Total Estimates

### Core Features (Requested)

| Feature | Estimate | Priority |
|---------|----------|----------|
| 1. Streaming Audio Input | 15-21 hours | High |
| 2. Language Selection (existing) | 1 hour | High |
| 3. Rich Text Editor | 18-25 hours | High |
| **Subtotal** | **34-47 hours** | |

### Additional Features (Recommended)

| Feature | Estimate | Priority |
|---------|----------|----------|
| 4.1 Audio Playback | 4-6 hours | High |
| 4.2 Auto-Save | 2-3 hours | High |
| 4.3 Transcription History | 6-8 hours | Medium |
| 4.4 Keyboard Shortcuts | 2-3 hours | Medium |
| 4.5 Export Formats | 4-6 hours | Low-Medium |
| 4.6 Dark Mode | 1-2 hours | Low |
| **Subtotal** | **19-28 hours** | |

### Grand Total

| Scope | Hours | Days (8hr/day) |
|-------|-------|----------------|
| Core Features Only | 34-47 hours | 4-6 days |
| Core + High Priority Additions | 40-56 hours | 5-7 days |
| All Features | 53-75 hours | 7-10 days |

---

## Recommended Implementation Order

### Phase 1: Core (Week 1)
1. ✅ Language Selection integration (1 hour)
2. 🎙️ Streaming Audio Input (2-3 days)
3. ✏️ Rich Text Editor (3-4 days)

### Phase 2: Enhancements (Week 2)
4. 🔊 Audio Playback during editing
5. 💾 Auto-Save
6. ⌨️ Keyboard Shortcuts

### Phase 3: Polish (Optional)
7. 📋 Transcription History
8. 📄 Export Format Options
9. 🌙 Dark Mode

---

## Dependencies and Considerations

### New NPM Packages Required

```json
{
  "@tiptap/react": "^2.x",
  "@tiptap/starter-kit": "^2.x",
  "@tiptap/extension-underline": "^2.x",
  "@tiptap/extension-placeholder": "^2.x"
}
```

### Browser Compatibility

| Feature | Chrome | Firefox | Safari | Edge |
|---------|--------|---------|--------|------|
| MediaRecorder | ✅ | ✅ | ⚠️ Partial | ✅ |
| Web Audio API | ✅ | ✅ | ✅ | ✅ |
| TipTap Editor | ✅ | ✅ | ✅ | ✅ |

**Safari Note:** MediaRecorder has limited codec support. May need to use WAV format instead of WebM for Safari compatibility.

### Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Safari recording issues | Medium | Fallback to WAV format |
| Large audio files from recording | Low | Implement chunked upload |
| TipTap learning curve | Low | Good documentation available |
| DOCX export changes | Medium | Keep existing parser, extend it |

---

## Questions for Review

1. Should streaming audio support pause/resume, or just start/stop?
2. For the Rich Text Editor, do you want inline font size changes or just global?
3. Should transcription history be stored indefinitely or have a retention limit?
4. Do you want audio playback synchronized with transcript (click word to seek)?
5. Any specific keyboard shortcuts you prefer?

---

*Document created: Ready for review. Implementation will begin only upon approval.*
