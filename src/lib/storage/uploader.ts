import { dataUrlToBlob } from "./imageCompression";

/**
 * Envia uma foto (arquivo ou dataUrl/base64) para o endpoint de upload (Cloudflare R2).
 * Se o Cloudflare R2 não estiver configurado no servidor, retorna o próprio dataUrl
 * para manter compatibilidade com desenvolvimento offline / fallback.
 */
export async function uploadImageToStorage(
  source: File | Blob | string,
  fileName: string = "photo.webp",
  folder: "triages" | "procedures" | "general" = "triages"
): Promise<string> {
  try {
    let blob: Blob;

    if (typeof source === "string") {
      // Se já for uma URL HTTP/HTTPS externa (R2 ou CDN), não precisa reenviar
      if (source.startsWith("http://") || source.startsWith("https://")) {
        return source;
      }
      blob = dataUrlToBlob(source);
    } else {
      blob = source;
    }

    const formData = new FormData();
    formData.append("file", blob, fileName);
    formData.append("folder", folder);

    const response = await fetch("/api/storage/upload", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      console.warn("Storage upload responded with status:", response.status, errData);
      // Se R2 não estiver configurado (503), e tínhamos dataUrl, fallback para manter a foto utilizável
      if (typeof source === "string") {
        return source;
      }
      throw new Error(errData?.error || "Falha no envio da imagem para o armazenamento.");
    }

    const data = await response.json();
    if (data?.url) {
      return data.url;
    }

    if (typeof source === "string") return source;
    throw new Error("URL não retornada pelo servidor de armazenamento.");
  } catch (error) {
    console.error("Erro em uploadImageToStorage:", error);
    // Se for string base64, fallback seguro
    if (typeof source === "string") {
      return source;
    }
    throw error;
  }
}
