import { NextResponse } from "next/server";
import { EvolutionWhatsAppService } from "@/lib/whatsapp/evolutionClient";

export async function POST() {
  try {
    const result = await EvolutionWhatsAppService.disconnectInstance();
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
