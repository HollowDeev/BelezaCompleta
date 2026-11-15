import { NextRequest, NextResponse } from "next/server";
import { EvolutionWhatsAppService } from "@/lib/whatsapp/evolutionClient";
import { WhatsAppTriageBot } from "@/lib/whatsapp/triageBot";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ status: "invalid_body" }, { status: 400 });
    }

    const event = body.event || body.type;
    const data = body.data || body;

    // Trata mensagens recebidas (MESSAGES_UPSERT ou messages.upsert)
    if (event === "messages.upsert" || event === "MESSAGES_UPSERT") {
      const messageObj = data?.message || data?.messages?.[0]?.message;
      const key = data?.key || data?.messages?.[0]?.key;

      if (!key || !messageObj) {
        return NextResponse.json({ status: "ignored_no_message" });
      }

      // Se a mensagem foi enviada pelo próprio número (Gleicy/Bot), ignoramos
      if (key.fromMe) {
        // Se a Gleicy respondeu manualmente pelo WhatsApp dela, ativa human takeover
        const recipientJid = key.remoteJid || "";
        const cleanRecipient = recipientJid.replace(/@.*$/, "");
        if (cleanRecipient && !recipientJid.endsWith("@g.us")) {
          WhatsAppTriageBot.setHumanTakeover(cleanRecipient);
        }
        return NextResponse.json({ status: "ignored_from_me" });
      }

      const remoteJid: string = key.remoteJid || "";

      // Ignora mensagens de grupos (@g.us), status/broadcast e chamadas
      if (!remoteJid.endsWith("@s.whatsapp.net")) {
        return NextResponse.json({ status: "ignored_non_individual" });
      }

      const senderPhone = remoteJid.replace(/@.*$/, "");

      // Extrai o texto da mensagem (pode ser texto direto, texto estendido, ou legenda de mídia)
      const text =
        messageObj.conversation ||
        messageObj.extendedTextMessage?.text ||
        messageObj.imageMessage?.caption ||
        messageObj.videoMessage?.caption ||
        "";

      if (!text.trim()) {
        return NextResponse.json({ status: "ignored_empty_text" });
      }

      // Processa com a inteligência determinística do bot de pré-triagem
      const result = WhatsAppTriageBot.processIncomingMessage(senderPhone, text);

      if (result.reply) {
        // Envia resposta automática pelo WhatsApp via Evolution API
        await EvolutionWhatsAppService.sendTextMessage(senderPhone, result.reply);
      }

      return NextResponse.json({ status: "processed", replied: !!result.reply });
    }

    // Tratamento de atualização de conexão
    if (event === "connection.update" || event === "CONNECTION_UPDATE") {
      console.log("[WhatsApp Webhook] Connection Update:", data?.state || data?.status);
      return NextResponse.json({ status: "connection_logged" });
    }

    return NextResponse.json({ status: "unhandled_event" });
  } catch (error: any) {
    console.error("[WhatsApp Webhook] Error:", error);
    return NextResponse.json({ status: "error", message: error.message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ status: "ok", service: "Gleicy Agenda WhatsApp Webhook" });
}
