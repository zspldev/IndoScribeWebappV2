const SARVAM_TRANSLATE_URL = "https://api.sarvam.ai/translate";

const LANGUAGE_CODE_MAP: Record<string, string> = {
  "en-IN": "en-IN",
  "hi-IN": "hi-IN",
  "mr-IN": "mr-IN",
  "en": "en-IN",
  "hi": "hi-IN",
  "mr": "mr-IN",
};

export function isSarvamTranslateConfigured(): boolean {
  return !!process.env.SARVAM_API_KEY;
}

export async function translateText(
  inputText: string,
  sourceLanguageCode: string,
  targetLanguageCode: string
): Promise<string> {
  const apiKey = process.env.SARVAM_API_KEY;
  if (!apiKey) {
    throw new Error("SARVAM_API_KEY is not configured");
  }

  const sourceLang = LANGUAGE_CODE_MAP[sourceLanguageCode] || sourceLanguageCode;
  const targetLang = LANGUAGE_CODE_MAP[targetLanguageCode] || targetLanguageCode;

  if (sourceLang === targetLang) {
    throw new Error("Source and target languages cannot be the same");
  }

  const chunks = splitTextForTranslation(inputText);
  const translatedChunks: string[] = [];

  for (const chunk of chunks) {
    if (!chunk.trim()) {
      translatedChunks.push(chunk);
      continue;
    }

    const result = await translateChunk(chunk, sourceLang, targetLang, apiKey);
    translatedChunks.push(result);
  }

  return translatedChunks.join("\n\n");
}

const MAX_CHUNK_CHARS = 900;

function splitTextForTranslation(text: string): string[] {
  const paragraphs = text.split(/\n\s*\n/);
  const chunks: string[] = [];
  let currentChunk = "";

  for (const para of paragraphs) {
    // If this paragraph alone exceeds the limit, break it into sentences first
    const paraChunks = para.length > MAX_CHUNK_CHARS ? splitLongParagraph(para) : [para];

    for (const piece of paraChunks) {
      const separator = currentChunk ? "\n\n" : "";
      if ((currentChunk + separator + piece).length > MAX_CHUNK_CHARS && currentChunk) {
        chunks.push(currentChunk.trim());
        currentChunk = piece;
      } else {
        currentChunk = currentChunk ? currentChunk + "\n\n" + piece : piece;
      }
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks.length > 0 ? chunks : [text];
}

function splitLongParagraph(para: string): string[] {
  // Split at sentence boundaries (., !, ?, |) first
  const sentences = para.split(/(?<=[.!?।])\s+/);
  const pieces: string[] = [];
  let current = "";

  for (const sentence of sentences) {
    // If a single sentence exceeds the limit, split it by words
    const parts = sentence.length > MAX_CHUNK_CHARS ? splitByWords(sentence) : [sentence];

    for (const part of parts) {
      const separator = current ? " " : "";
      if ((current + separator + part).length > MAX_CHUNK_CHARS && current) {
        pieces.push(current.trim());
        current = part;
      } else {
        current = current ? current + " " + part : part;
      }
    }
  }

  if (current.trim()) pieces.push(current.trim());
  return pieces.length > 0 ? pieces : [para.substring(0, MAX_CHUNK_CHARS)];
}

function splitByWords(text: string): string[] {
  const words = text.split(/\s+/);
  const pieces: string[] = [];
  let current = "";

  for (const word of words) {
    if ((current + " " + word).length > MAX_CHUNK_CHARS && current) {
      pieces.push(current.trim());
      current = word;
    } else {
      current = current ? current + " " + word : word;
    }
  }

  if (current.trim()) pieces.push(current.trim());
  return pieces;
}

async function translateChunk(
  text: string,
  sourceLang: string,
  targetLang: string,
  apiKey: string
): Promise<string> {
  const response = await fetch(SARVAM_TRANSLATE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-subscription-key": apiKey,
    },
    body: JSON.stringify({
      input: text,
      source_language_code: sourceLang,
      target_language_code: targetLang,
      mode: "formal",
      enable_preprocessing: true,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Sarvam Translate API error:", response.status, errorText);
    throw new Error(`Translation failed (${response.status}): ${errorText}`);
  }

  const result = (await response.json()) as any;
  return result.translated_text || "";
}
