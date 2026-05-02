import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { Readable } from "stream";

let s3Client: S3Client | null = null;

function getS3Client(): S3Client {
  if (!s3Client) {
    const region = process.env.AWS_REGION;
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

    if (!region || !accessKeyId || !secretAccessKey) {
      throw new Error("AWS credentials not configured (AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY)");
    }

    s3Client = new S3Client({
      region,
      credentials: { accessKeyId, secretAccessKey },
    });
  }
  return s3Client;
}

function getBucket(): string {
  const bucket = process.env.AWS_S3_BUCKET;
  if (!bucket) throw new Error("AWS_S3_BUCKET not configured");
  return bucket;
}

export function generateS3Key(projectId: number, filename: string): string {
  const timestamp = Date.now();
  const sanitized = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `audio/${projectId}/${timestamp}_${sanitized}`;
}

export async function uploadAudioToS3(buffer: Buffer, s3Key: string): Promise<string> {
  const client = getS3Client();
  const bucket = getBucket();

  await client.send(new PutObjectCommand({
    Bucket: bucket,
    Key: s3Key,
    Body: buffer,
    ContentType: "audio/wav",
  }));

  return s3Key;
}

export async function downloadAudioFromS3(s3Key: string): Promise<Buffer> {
  const client = getS3Client();
  const bucket = getBucket();

  const response = await client.send(new GetObjectCommand({
    Bucket: bucket,
    Key: s3Key,
  }));

  if (!response.Body) throw new Error("Empty response from S3");

  const stream = response.Body as Readable;
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

export async function deleteAudioFromS3(s3Key: string): Promise<void> {
  try {
    const client = getS3Client();
    const bucket = getBucket();

    await client.send(new DeleteObjectCommand({
      Bucket: bucket,
      Key: s3Key,
    }));
  } catch (error) {
    console.error("Error deleting from S3:", error);
  }
}

export function isS3Configured(): boolean {
  return !!(process.env.AWS_S3_BUCKET && process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY && process.env.AWS_REGION);
}
