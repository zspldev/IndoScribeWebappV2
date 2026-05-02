# Speaker Diarization — Sarvam AI Research Summary

## What is Speaker Diarization?

Speaker diarization identifies "who spoke when" in a multi-person audio recording. The output labels each segment of speech with a speaker identifier (e.g., Speaker 1, Speaker 2) along with timestamps.

## Sarvam API: Diarization Support

### Availability

- Diarization is available **only via the Batch API** (not the REST API)
- The REST API handles short audio (up to 30 seconds) — no diarization support
- The Batch API handles audio **up to 1 hour** per file, up to 20 files per job

### Two Batch API Endpoints with Diarization

| Endpoint | Model | What It Does |
|---|---|---|
| `speech_to_text_job` | Saarika v2.5 | Transcription + diarization in the original language |
| `speech_to_text_translate_job` | Saaras v2.5 | Transcription + diarization + translation to English |

### Pricing

| Service | Cost |
|---|---|
| Speech to Text (no diarization) | Rs 30/hour |
| Speech to Text with Diarization | Rs 45/hour |
| Speech to Text & Translate (no diarization) | Rs 30/hour |
| Speech to Text, Translate & Diarization | Rs 45/hour |

### Supported Languages

Hindi, Bengali, Tamil, Telugu, Gujarati, Kannada, Malayalam, Marathi, Punjabi, Odia, English (Indian accent) — 11 languages total.

### Supported Audio Formats

WAV, MP3, AAC, AIFF, OGG, OPUS, FLAC, MP4/M4A, AMR, WMA, WebM, PCM.

### Speaker Limit

Up to **8 speakers** per audio file.

## API Request Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `model` | string | Yes | `saarika:v2.5` (transcribe only) or `saaras:v2.5` (transcribe + translate) |
| `language_code` | string | No | BCP-47 code (e.g., `hi-IN`). Auto-detected if omitted |
| `with_diarization` | boolean | No | Set `true` to enable speaker identification |
| `num_speakers` | integer | No | Hint for expected number of speakers (improves accuracy) |
| `prompt` | string | No | Context hint (e.g., "Official meeting", "Doctor-patient conversation") |

## API Response Format

### Without Diarization

```json
{
  "request_id": "abc123",
  "transcript": "Full combined transcript as a single string",
  "language_code": "hi-IN"
}
```

### With Diarization

```json
{
  "request_id": "abc123",
  "transcript": "Full combined transcript without speaker labels",
  "language_code": "hi-IN",
  "diarized_transcript": {
    "entries": [
      {
        "transcript": "Good morning, please have a seat.",
        "start_time_seconds": 0.5,
        "end_time_seconds": 3.2,
        "speaker_id": "speaker 1"
      },
      {
        "transcript": "Thank you doctor. I have been having headaches.",
        "start_time_seconds": 3.5,
        "end_time_seconds": 7.8,
        "speaker_id": "speaker 2"
      },
      {
        "transcript": "How long has this been going on?",
        "start_time_seconds": 8.1,
        "end_time_seconds": 10.4,
        "speaker_id": "speaker 1"
      }
    ]
  }
}
```

### Response Fields

| Field | Type | Description |
|---|---|---|
| `transcript` | string | Full combined transcript (no speaker labels) |
| `language_code` | string | Detected or specified language |
| `diarized_transcript.entries` | array | Speaker-segmented transcript |
| `entries[].transcript` | string | Text spoken in this segment |
| `entries[].start_time_seconds` | float | When this segment starts (seconds) |
| `entries[].end_time_seconds` | float | When this segment ends (seconds) |
| `entries[].speaker_id` | string | Speaker label (e.g., "speaker 1", "speaker 2") |

## Job-Based Workflow

Diarization uses an asynchronous job-based flow:

```
1. Create Job      →  client.speech_to_text_job.create_job(...)
2. Upload Files    →  job.upload_files(file_paths=[...])
3. Start Job       →  job.start()
4. Wait/Poll       →  job.wait_until_complete()
5. Get Results     →  job.get_file_results()
6. Download Output →  job.download_outputs(output_dir="./output")
```

### Webhook Alternative (Instead of Polling)

For production use, webhooks avoid polling overhead:

```
job = client.speech_to_text_job.create_job(
    model="saarika:v2.5",
    with_diarization=True,
    callback=BulkJobCallbackParams(
        url="https://your-server.com/webhook",
        auth_token="your-secret-token"
    )
)
```

Webhook payload on completion:

```json
{
  "job_id": "job_12345",
  "job_state": "COMPLETED",
  "results": {
    "transcripts": [...],
    "metadata": {...}
  },
  "error_message": null
}
```

Webhook server must respond with HTTP 200 within 30 seconds. Validated via `X-SARVAM-JOB-CALLBACK-TOKEN` header.

## Code Examples

### Python (Synchronous)

```python
from sarvamai import SarvamAI

client = SarvamAI(api_subscription_key="YOUR_API_KEY")

job = client.speech_to_text_job.create_job(
    language_code="hi-IN",
    model="saarika:v2.5",
    with_diarization=True,
    num_speakers=2
)

job.upload_files(file_paths=["meeting.mp3"])
job.start()
job.wait_until_complete()

file_results = job.get_file_results()
for f in file_results['successful']:
    print(f"Transcribed: {f['file_name']}")

job.download_outputs(output_dir="./output")
```

### JavaScript

```javascript
const response = await fetch('https://api.sarvam.ai/speech-to-text', {
  method: 'POST',
  headers: {
    'Content-Type': 'multipart/form-data',
    'api-subscription-key': 'YOUR_API_KEY'
  },
  body: formData  // includes file, model, with_diarization=true, num_speakers
});
```

## Key Differences from Current IndoScribe Pro STT

| Aspect | Current (REST API) | Diarization (Batch API) |
|---|---|---|
| Max audio length | 30 seconds per chunk | 1 hour per file |
| Processing | Synchronous, immediate | Asynchronous, job-based |
| Speaker identification | No | Yes (up to 8 speakers) |
| Timestamps | No | Yes (per segment) |
| Chunking needed | Yes (we split into ~25s chunks) | No (handles full files natively) |
| Files per request | 1 | Up to 20 |

## Implementation Considerations for IndoScribe Pro

### What Would Change

1. **New project option**: "Single speaker" vs "Conversation (multiple speakers)" toggle at project creation
2. **Backend**: New service using Batch API instead of REST API when diarization is selected
3. **Polling/webhook**: Job status polling or webhook endpoint for async completion
4. **Data model**: Store `diarized_transcript.entries` array with speaker IDs and timestamps
5. **Editor UI**: Color-coded speaker segments, speaker renaming (e.g., "speaker 1" to "Dr. Sharma")
6. **DOCX export**: Speaker-labeled formatting with optional color coding
7. **Audio sync**: Clicking a transcript segment could jump to that timestamp in the audio player

### What Would NOT Change

- Same Sarvam API key (universal across all Sarvam services)
- Same supported languages (Saarika v2.5 for all 11 languages)
- Same audio upload flow and format support
- Same project-based workflow

## References

- Batch API docs: https://docs.sarvam.ai/api-reference-docs/api-guides-tutorials/speech-to-text/batch-api
- Pricing: https://docs.sarvam.ai/api-reference-docs/getting-started/pricing
- Saarika model: https://docs.sarvam.ai/api-reference-docs/getting-started/models/saarika
- Dashboard: https://dashboard.sarvam.ai
