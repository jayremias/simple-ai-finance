import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { S3Error } from '../errors/S3Error';
import { env } from './env';

const s3 = new S3Client({
  region: env.AWS_REGION,
  credentials: {
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
  },
  ...(env.S3_ENDPOINT
    ? {
        endpoint: env.S3_ENDPOINT,
        forcePathStyle: true, // required for MinIO
      }
    : {}),
});

export async function getPresignedUploadUrl(key: string): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: env.S3_RECEIPT_BUCKET,
    Key: key,
  });
  return getSignedUrl(s3, command, { expiresIn: 300 }); // 5 minutes
}

export async function getObject(key: string): Promise<Buffer> {
  const command = new GetObjectCommand({
    Bucket: env.S3_RECEIPT_BUCKET,
    Key: key,
  });
  const response = await s3.send(command);
  if (!response.Body) {
    throw new S3Error('OBJECT_NOT_FOUND', `S3 object not found: ${key}`);
  }
  const bytes = await response.Body.transformToByteArray();
  return Buffer.from(bytes);
}
