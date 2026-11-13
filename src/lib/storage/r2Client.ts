import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const accountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID || "";
const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID || "";
const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || "";
export const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME || "glaicy-agenda-storage";
export const publicDomain = (process.env.NEXT_PUBLIC_CLOUDFLARE_R2_PUBLIC_URL || "").replace(/\/$/, "");

export const isR2Configured = Boolean(
  accountId &&
  accessKeyId &&
  secretAccessKey &&
  bucketName
);

export const r2Client = isR2Configured
  ? new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    })
  : null;

export interface UploadResult {
  url: string;
  key: string;
  bucket: string;
}

/**
 * Faz upload de um arquivo para o Cloudflare R2
 */
export async function uploadToR2(
  fileBuffer: Buffer | Uint8Array,
  fileName: string,
  contentType: string,
  folder: "triages" | "procedures" | "general" = "triages"
): Promise<UploadResult> {
  if (!r2Client || !isR2Configured) {
    throw new Error(
      "Cloudflare R2 não está configurado. Verifique as variáveis CLOUDFLARE_R2_* no .env"
    );
  }

  // Gera chave limpa e única: folder/ano-mes/uuid-name
  const timestamp = Date.now();
  const cleanName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
  const key = `${folder}/${timestamp}-${cleanName}`;

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    Body: fileBuffer,
    ContentType: contentType,
    CacheControl: "public, max-age=31536000, immutable", // 1 ano de cache no browser/CDN
  });

  await r2Client.send(command);

  // Se houver domínio público configurado (R2.dev ou custom domain), use-o; senão URL direta
  const url = publicDomain
    ? `${publicDomain}/${key}`
    : `https://${accountId}.r2.cloudflarestorage.com/${bucketName}/${key}`;

  return {
    url,
    key,
    bucket: bucketName,
  };
}
