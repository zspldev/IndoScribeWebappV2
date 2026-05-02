/**
 * Service for managing Google Cloud Storage operations
 * Handles temporary audio file uploads for transcription
 */

import { Storage } from '@google-cloud/storage';

let storageClient: Storage | null = null;

/**
 * Get or create GCS storage client using same service account as Speech-to-Text
 */
export function getStorageClient(): Storage {
  if (!storageClient) {
    // Use same service account credentials as Speech-to-Text
    const credentials = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    
    if (!credentials) {
      throw new Error('GOOGLE_APPLICATION_CREDENTIALS environment variable not set');
    }

    // Parse JSON credentials from environment variable (not a file path)
    const credentialsJson = JSON.parse(credentials);

    storageClient = new Storage({
      credentials: credentialsJson,
    });

    console.log('Google Cloud Storage client initialized');
  }

  return storageClient;
}

/**
 * Upload audio buffer to GCS bucket
 * @param buffer - Audio file buffer (WAV format)
 * @param filename - Original filename for reference
 * @returns GCS URI (gs://bucket/filename)
 */
export async function uploadAudioToGCS(
  buffer: Buffer,
  filename: string
): Promise<string> {
  const bucketName = process.env.GCS_BUCKET_NAME;
  
  if (!bucketName) {
    throw new Error('GCS_BUCKET_NAME environment variable not set');
  }

  const storage = getStorageClient();
  const bucket = storage.bucket(bucketName);

  // Generate unique filename with timestamp to avoid collisions
  const timestamp = Date.now();
  const gcsFilename = `audio_${timestamp}_${filename.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
  const file = bucket.file(gcsFilename);

  try {
    console.log(`Uploading ${buffer.length} bytes to gs://${bucketName}/${gcsFilename}`);

    // Upload buffer to GCS
    await file.save(buffer, {
      metadata: {
        contentType: 'audio/wav',
      },
      resumable: false, // For small files, don't use resumable uploads
    });

    const gcsUri = `gs://${bucketName}/${gcsFilename}`;
    console.log(`Successfully uploaded to ${gcsUri}`);

    return gcsUri;
  } catch (error) {
    console.error('Error uploading to GCS:', error);
    throw new Error(`Failed to upload audio to GCS: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Delete audio file from GCS bucket
 * @param gcsUri - Full GCS URI (gs://bucket/filename)
 */
export async function deleteAudioFromGCS(gcsUri: string): Promise<void> {
  try {
    // Extract bucket and filename from URI
    const match = gcsUri.match(/^gs:\/\/([^\/]+)\/(.+)$/);
    if (!match) {
      console.error(`Invalid GCS URI format: ${gcsUri}`);
      return;
    }

    const [, bucketName, filename] = match;
    const storage = getStorageClient();
    const bucket = storage.bucket(bucketName);
    const file = bucket.file(filename);

    console.log(`Deleting ${gcsUri}`);
    await file.delete();
    console.log(`Successfully deleted ${gcsUri}`);
  } catch (error) {
    // Don't throw on cleanup errors, just log them
    console.error(`Error deleting from GCS (${gcsUri}):`, error);
  }
}
