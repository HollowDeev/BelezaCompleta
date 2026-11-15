import { NextResponse } from "next/server";
import { EvolutionWhatsAppService } from "@/lib/whatsapp/evolutionClient";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const result = await EvolutionWhatsAppService.getOrConnectInstance();
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { success: false, state: "close", error: error.message },
      { status: 500 }
    );
  }
}
