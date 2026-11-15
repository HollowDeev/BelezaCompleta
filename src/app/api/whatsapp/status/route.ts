import { NextResponse } from "next/server";
import { EvolutionWhatsAppService } from "@/lib/whatsapp/evolutionClient";

export async function GET() {
  try {
    const status = await EvolutionWhatsAppService.getConnectionState();
    return NextResponse.json(status);
  } catch (error: any) {
    return NextResponse.json(
      { instanceName: "gleicy-salon", state: "close", error: error.message },
      { status: 500 }
    );
  }
}
