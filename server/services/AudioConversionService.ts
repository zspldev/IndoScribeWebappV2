import ffmpeg from 'fluent-ffmpeg';
import { Readable } from 'stream';
import { promises as fs } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

export interface AudioMetadata {
  duration: number;
  sampleRate: number;
  channels: number;
  format: string;
}

export interface ConversionResult {
  buffer: Buffer;
  metadata: AudioMetadata;
}

export async function convertToLinear16Wav(
  inputBuffer: Buffer,
  originalFilename: string
): Promise<ConversionResult> {
  const timestamp = Date.now();
  const safeFilename = originalFilename.replace(/[^a-zA-Z0-9._-]/g, '_');
  const inputPath = join(tmpdir(), `input_${timestamp}_${safeFilename}`);
  const outputPath = join(tmpdir(), `output_${timestamp}.wav`);

  try {
    await fs.writeFile(inputPath, inputBuffer);

    const originalMetadata = await extractMetadataFromFile(inputPath);

    await new Promise<void>((resolve, reject) => {
      ffmpeg(inputPath)
        .toFormat('wav')
        .audioCodec('pcm_s16le')
        .audioChannels(1)
        .audioFrequency(16000)
        .on('error', (err) => {
          console.error('FFmpeg conversion error:', err);
          reject(new Error(`Audio conversion failed: ${err.message}`));
        })
        .on('end', () => {
          resolve();
        })
        .save(outputPath);
    });

    const buffer = await fs.readFile(outputPath);
    console.log(`FFmpeg conversion complete: ${buffer.length} bytes`);

    let duration = originalMetadata.duration;
    if (!duration || isNaN(duration) || duration <= 0) {
      const outputMetadata = await extractMetadataFromFile(outputPath);
      duration = outputMetadata.duration;
    }
    if (!duration || isNaN(duration) || duration <= 0) {
      duration = buffer.length / (16000 * 2);
    }

    const metadata: AudioMetadata = {
      duration,
      sampleRate: 16000,
      channels: 1,
      format: 'LINEAR16',
    };

    return {
      buffer,
      metadata,
    };
  } finally {
    try { await fs.unlink(inputPath); } catch (e) {}
    try { await fs.unlink(outputPath); } catch (e) {}
  }
}

function extractMetadataFromFile(filePath: string): Promise<AudioMetadata> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, data) => {
      if (err) {
        console.error('FFprobe error:', err);
        resolve({ duration: 0, sampleRate: 0, channels: 0, format: 'unknown' });
        return;
      }

      const audioStream = data.streams.find(s => s.codec_type === 'audio');
      if (!audioStream) {
        resolve({ duration: 0, sampleRate: 0, channels: 0, format: 'unknown' });
        return;
      }

      const dur = Number(data.format.duration);
      const sr = Number(audioStream.sample_rate);
      const ch = Number(audioStream.channels);
      resolve({
        duration: isNaN(dur) ? 0 : dur,
        sampleRate: isNaN(sr) ? 0 : sr,
        channels: isNaN(ch) ? 0 : ch,
        format: audioStream.codec_name || 'unknown',
      });
    });
  });
}

export async function extractAudioMetadata(
  inputBuffer: Buffer,
  mimeType: string
): Promise<AudioMetadata> {
  const timestamp = Date.now();
  const inputPath = join(tmpdir(), `probe_${timestamp}.audio`);

  try {
    await fs.writeFile(inputPath, inputBuffer);
    return await extractMetadataFromFile(inputPath);
  } finally {
    try { await fs.unlink(inputPath); } catch (e) {}
  }
}

export function getMimeTypeFromFilename(filename: string): string {
  const ext = filename.toLowerCase().split('.').pop();
  const mimeTypes: Record<string, string> = {
    'mp3': 'audio/mpeg',
    'wav': 'audio/wav',
    'm4a': 'audio/mp4',
    'ogg': 'audio/ogg',
    'flac': 'audio/flac',
  };
  return mimeTypes[ext || ''] || 'audio/unknown';
}
