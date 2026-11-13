import { NextRequest, NextResponse } from "next/server";
import { uploadToR2, isR2Configured } from "@/lib/storage/r2Client";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const folder = (formData.get("folder") as "triages" | "procedures" | "general") || "triages";

    if (!file) {
      return NextResponse.json(
        { error: "Nenhum arquivo enviado." },
        { status: 400 }
      );
    }

    // Se o R2 não estiver configurado ainda em produção/dev, retorna aviso claro com modo fallback
    if (!isR2Configured) {
      return NextResponse.json(
        {
          error: "Cloudflare R2 ainda não configurado no servidor. Configure as variáveis CLOUDFLARE_R2_*.",
          configured: false
        },
        { status: 503 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const result = await uploadToR2(
      buffer,
      file.name || "image.webp",
      file.type || "image/webp",
      folder
    );

    return NextResponse.json({
      success: true,
      url: result.url,
      key: result.key,
    });
  } catch (error: any) {
    console.error("Erro no upload R2:", error);
    return NextResponse.json(
      { error: error?.message || "Falha interna ao processar upload." },
      { status: 500 }
    );
  }
}
