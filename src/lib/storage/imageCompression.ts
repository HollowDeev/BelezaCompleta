/**
 * Utilitário de compressão de imagens no cliente (navegador).
 * Converte imagens da câmera/galeria (que podem ter 5MB a 15MB)
 * para WebP ou JPEG otimizado (~150KB a 250KB) mantendo nitidez visual
 * adequada para triagem e visualização de procedimentos estéticos.
 */

export interface CompressionOptions {
  maxDimension?: number;
  quality?: number;
  mimeType?: "image/webp" | "image/jpeg";
}

export async function compressImageFile(
  file: File,
  options: CompressionOptions = {}
): Promise<{ blob: Blob; dataUrl: string; width: number; height: number; originalSize: number; compressedSize: number }> {
  const {
    maxDimension = 1400,
    quality = 0.8,
    mimeType = "image/webp"
  } = options;

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => reject(new Error("Erro ao ler o arquivo de imagem."));

    reader.onload = (event) => {
      const img = new Image();

      img.onerror = () => reject(new Error("Erro ao carregar a imagem na memória."));

      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Redimensionamento proporcional
        if (width > height && width > maxDimension) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else if (height > maxDimension) {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Não foi possível criar o contexto 2D do Canvas."));
          return;
        }

        // Desenhar com interpolação suave
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, 0, 0, width, height);

        // Tentar WebP primeiro; se o browser não suportar, fallback para JPEG
        let targetType = mimeType;
        let dataUrl = canvas.toDataURL(targetType, quality);
        if (!dataUrl.startsWith(`data:${targetType}`)) {
          targetType = "image/jpeg";
          dataUrl = canvas.toDataURL(targetType, quality);
        }

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error("Erro ao gerar o Blob da imagem compactada."));
              return;
            }

            resolve({
              blob,
              dataUrl,
              width,
              height,
              originalSize: file.size,
              compressedSize: blob.size,
            });
          },
          targetType,
          quality
        );
      };

      img.src = event.target?.result as string;
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Converte um DataURL (Base64) em um Blob pronto para envio via FormData
 */
export function dataUrlToBlob(dataUrl: string): Blob {
  const arr = dataUrl.split(",");
  const mime = arr[0].match(/:(.*?);/)?.[1] || "image/jpeg";
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
}
