/**
 * Script de Migração Automatizada: Supabase Storage / Base64 -> Cloudflare R2
 *
 * Como rodar:
 * node scripts/migrate-supabase-to-r2.mjs
 *
 * Requisitos:
 * Variáveis configuradas em .env ou .env.local:
 * - NEXT_PUBLIC_SUPABASE_URL
 * - NEXT_PUBLIC_SUPABASE_ANON_KEY (ou SUPABASE_SERVICE_ROLE_KEY)
 * - CLOUDFLARE_R2_ACCOUNT_ID
 * - CLOUDFLARE_R2_ACCESS_KEY_ID
 * - CLOUDFLARE_R2_SECRET_ACCESS_KEY
 * - CLOUDFLARE_R2_BUCKET_NAME
 * - NEXT_PUBLIC_CLOUDFLARE_R2_PUBLIC_URL
 */

import { createClient } from "@supabase/supabase-js";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const r2AccountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID;
const r2AccessKey = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
const r2SecretKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
const r2Bucket = process.env.CLOUDFLARE_R2_BUCKET_NAME || "glaicy-agenda-storage";
const r2PublicUrl = (process.env.NEXT_PUBLIC_CLOUDFLARE_R2_PUBLIC_URL || "").replace(/\/$/, "");

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Erro: Configure NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env.local");
  process.exit(1);
}

if (!r2AccountId || !r2AccessKey || !r2SecretKey) {
  console.error("❌ Erro: Configure as credenciais do Cloudflare R2 (CLOUDFLARE_R2_*) no .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${r2AccountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: r2AccessKey,
    secretAccessKey: r2SecretKey,
  },
});

async function uploadBufferToR2(buffer, key, contentType = "image/webp") {
  await r2.send(
    new PutObjectCommand({
      Bucket: r2Bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      CacheControl: "public, max-age=31536000, immutable",
    })
  );

  return r2PublicUrl
    ? `${r2PublicUrl}/${key}`
    : `https://${r2AccountId}.r2.cloudflarestorage.com/${r2Bucket}/${key}`;
}

async function migrateBase64OrRemote(dataString, keyPrefix) {
  if (!dataString) return null;

  // Se já for R2, não precisa migrar
  if (dataString.includes(".r2.") || (r2PublicUrl && dataString.startsWith(r2PublicUrl))) {
    return dataString;
  }

  try {
    let buffer;
    let contentType = "image/webp";

    if (dataString.startsWith("data:")) {
      const parts = dataString.split(",");
      const mimeMatch = parts[0].match(/:(.*?);/);
      if (mimeMatch) contentType = mimeMatch[1];
      buffer = Buffer.from(parts[1], "base64");
    } else if (dataString.startsWith("http")) {
      // Baixar imagem do Supabase Storage ou URL externa
      const res = await fetch(dataString);
      if (!res.ok) return dataString;
      const arrayBuffer = await res.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
      contentType = res.headers.get("content-type") || "image/jpeg";
    } else {
      return dataString;
    }

    const key = `${keyPrefix}-${Date.now()}.webp`;
    const newUrl = await uploadBufferToR2(buffer, key, contentType);
    console.log(`  -> Migrado com sucesso: ${newUrl}`);
    return newUrl;
  } catch (err) {
    console.warn(`  ⚠️ Falha ao migrar imagem (${keyPrefix}):`, err.message);
    return dataString;
  }
}

async function main() {
  console.log("🚀 Iniciando Migração para o Cloudflare R2...");

  // 1. Migrar Fotos de Triagens
  console.log("\n📦 1. Verificando fotos de Triagens (triage_submissions)...");
  const { data: triages, error: triageErr } = await supabase
    .from("triage_submissions")
    .select("id, photos");

  if (triageErr) {
    console.error("Erro ao buscar triagens:", triageErr.message);
  } else if (triages && triages.length > 0) {
    console.log(`Encontradas ${triages.length} submissões de triagem.`);
    let migratedCount = 0;

    for (const sub of triages) {
      if (!sub.photos || typeof sub.photos !== "object") continue;
      let changed = false;
      const updatedPhotos = { ...sub.photos };

      if (updatedPhotos.currentHairRoot && !updatedPhotos.currentHairRoot.includes(".r2.")) {
        const url = await migrateBase64OrRemote(updatedPhotos.currentHairRoot, `triages/${sub.id}-root`);
        if (url && url !== updatedPhotos.currentHairRoot) {
          updatedPhotos.currentHairRoot = url;
          changed = true;
        }
      }

      if (updatedPhotos.currentHairLength && !updatedPhotos.currentHairLength.includes(".r2.")) {
        const url = await migrateBase64OrRemote(updatedPhotos.currentHairLength, `triages/${sub.id}-length`);
        if (url && url !== updatedPhotos.currentHairLength) {
          updatedPhotos.currentHairLength = url;
          changed = true;
        }
      }

      if (updatedPhotos.inspirationDesired && !updatedPhotos.inspirationDesired.includes(".r2.")) {
        const url = await migrateBase64OrRemote(updatedPhotos.inspirationDesired, `triages/${sub.id}-inspiration`);
        if (url && url !== updatedPhotos.inspirationDesired) {
          updatedPhotos.inspirationDesired = url;
          changed = true;
        }
      }

      if (changed) {
        await supabase
          .from("triage_submissions")
          .update({ photos: updatedPhotos })
          .eq("id", sub.id);
        migratedCount++;
      }
    }
    console.log(`✅ Triagens atualizadas: ${migratedCount}`);
  }

  // 2. Migrar Fotos de Procedimentos / Serviços
  console.log("\n📦 2. Verificando fotos de Serviços (services)...");
  const { data: services, error: srvErr } = await supabase
    .from("services")
    .select("id, title, image_url");

  if (srvErr) {
    console.error("Erro ao buscar serviços:", srvErr.message);
  } else if (services && services.length > 0) {
    let srvMigrated = 0;
    for (const srv of services) {
      if (srv.image_url && (srv.image_url.startsWith("data:") || srv.image_url.includes("supabase.co"))) {
        const url = await migrateBase64OrRemote(srv.image_url, `procedures/srv-${srv.id}`);
        if (url && url !== srv.image_url) {
          await supabase
            .from("services")
            .update({ image_url: url })
            .eq("id", srv.id);
          srvMigrated++;
        }
      }
    }
    console.log(`✅ Serviços atualizados: ${srvMigrated}`);
  }

  console.log("\n🎉 Migração finalizada com sucesso!");
}

main().catch(console.error);
