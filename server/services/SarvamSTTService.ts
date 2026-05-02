import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

const SARVAM_API_URL = "https://api.sarvam.ai/speech-to-text";
const MAX_CHUNK_DURATION = 25;

const LANGUAGE_CODE_MAP: Record<string, string> = {
  "en-IN": "en-IN",
  "hi-IN": "hi-IN",
  "mr-IN": "mr-IN",
  "en": "en-IN",
  "hi": "hi-IN",
  "mr": "mr-IN",
};

export function isSarvamConfigured(): boolean {
  return !!process.env.SARVAM_API_KEY;
}

async function transcribeChunk(
  chunkBuffer: Buffer,
  languageCode: string,
  filename: string,
  apiKey: string
): Promise<string> {
  const sarvamLangCode = LANGUAGE_CODE_MAP[languageCode] || languageCode;

  const blob = new Blob([chunkBuffer], { type: "audio/wav" });
  const formData = new FormData();
  formData.append("file", blob, filename);
  formData.append("language_code", sarvamLangCode);
  formData.append("model", "saarika:v2.5");

  const response = await fetch(SARVAM_API_URL, {
    method: "POST",
    headers: {
      "api-subscription-key": apiKey,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Sarvam API error:", response.status, errorText);
    throw new Error(`Sarvam STT failed (${response.status}): ${errorText}`);
  }

  const result = (await response.json()) as any;
  return result.transcript || "";
}

function getAudioDuration(audioBuffer: Buffer): number {
  const tmpFile = path.join(os.tmpdir(), `sarvam-dur-${Date.now()}.wav`);
  try {
    fs.writeFileSync(tmpFile, audioBuffer);
    const output = execSync(
      `ffprobe -v quiet -show_entries format=duration -of csv=p=0 "${tmpFile}"`,
      { encoding: "utf-8", timeout: 10000 }
    ).trim();
    return parseFloat(output) || 0;
  } finally {
    try { fs.unlinkSync(tmpFile); } catch {}
  }
}

function splitAudioIntoChunks(audioBuffer: Buffer, chunkDuration: number): Buffer[] {
  const timestamp = Date.now();
  const tmpInput = path.join(os.tmpdir(), `sarvam-input-${timestamp}.wav`);
  const tmpPrefix = `sarvam-chunk-${timestamp}`;
  const tmpOutputDir = os.tmpdir();

  try {
    fs.writeFileSync(tmpInput, audioBuffer);

    execSync(
      `ffmpeg -y -i "${tmpInput}" -f segment -segment_time ${chunkDuration} -ar 16000 -ac 1 -acodec pcm_s16le "${path.join(tmpOutputDir, tmpPrefix)}-%03d.wav"`,
      { encoding: "utf-8", timeout: 120000, stdio: "pipe" }
    );

    const chunkFiles: string[] = [];
    for (let i = 0; i < 999; i++) {
      const chunkPath = path.join(tmpOutputDir, `${tmpPrefix}-${String(i).padStart(3, "0")}.wav`);
      if (fs.existsSync(chunkPath)) {
        chunkFiles.push(chunkPath);
      } else {
        break;
      }
    }

    const chunks = chunkFiles.map(f => fs.readFileSync(f));

    chunkFiles.forEach(f => { try { fs.unlinkSync(f); } catch {} });

    return chunks;
  } finally {
    try { fs.unlinkSync(tmpInput); } catch {}
  }
}

export async function transcribeWithSarvam(
  audioBuffer: Buffer,
  languageCode: string,
  filename: string = "audio.wav"
): Promise<{ transcript: string; detectedLanguage?: string }> {
  const apiKey = process.env.SARVAM_API_KEY;
  if (!apiKey) {
    throw new Error("SARVAM_API_KEY not configured");
  }

  const duration = getAudioDuration(audioBuffer);
  console.log(`[Sarvam] Audio duration: ${duration.toFixed(1)}s`);

  if (duration <= 30) {
    const transcript = await transcribeChunk(audioBuffer, languageCode, filename, apiKey);
    return { transcript };
  }

  console.log(`[Sarvam] Audio > 30s, splitting into ${MAX_CHUNK_DURATION}s chunks...`);
  const chunks = splitAudioIntoChunks(audioBuffer, MAX_CHUNK_DURATION);
  console.log(`[Sarvam] Split into ${chunks.length} chunks`);

  const transcripts: string[] = [];
  for (let i = 0; i < chunks.length; i++) {
    console.log(`[Sarvam] Transcribing chunk ${i + 1}/${chunks.length}...`);
    try {
      const text = await transcribeChunk(chunks[i], languageCode, `chunk-${i}.wav`, apiKey);
      if (text.trim()) {
        transcripts.push(text.trim());
      }
      console.log(`[Sarvam] Chunk ${i + 1} done: ${text.length} chars`);
    } catch (err: any) {
      console.error(`[Sarvam] Chunk ${i + 1} failed:`, err.message);
    }
  }

  const fullTranscript = transcripts.join(" ");
  console.log(`[Sarvam] Combined transcript: ${fullTranscript.length} chars from ${transcripts.length} successful chunks`);

  return { transcript: fullTranscript };
}
