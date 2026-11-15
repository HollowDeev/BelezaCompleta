import { NextRequest, NextResponse } from "next/server";
import { WhatsAppEventEngine } from "@/lib/whatsapp/eventEngine";
import type { LuxuryProposal } from "@/types";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const proposal: LuxuryProposal | undefined = body?.proposal;

    if (!proposal || !proposal.clientPhone) {
      return NextResponse.json(
        { success: false, error: "Dados da proposta ou telefone ausentes." },
        { status: 400 }
      );
    }

    const result = await WhatsAppEventEngine.sendProposalNotification(proposal);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Erro em /api/whatsapp/send-proposal:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
