/**
 * Uploads a local file URI directly to an S3/MinIO pre-signed PUT URL.
 * The mobile client uploads directly to object storage — the API server
 * is never in the upload path.
 */
export async function uploadToS3(
  presignedUrl: string,
  fileUri: string,
  mimeType: string
): Promise<void> {
  const response = await fetch(fileUri);
  const blob = await response.blob();

  const uploadResponse = await fetch(presignedUrl, {
    method: 'PUT',
    body: blob,
    headers: {
      'Content-Type': mimeType,
    },
  });

  if (!uploadResponse.ok) {
    throw new Error(`S3 upload failed: ${uploadResponse.status} ${uploadResponse.statusText}`);
  }
}
