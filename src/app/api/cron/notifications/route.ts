import { NextRequest, NextResponse } from "next/server";
import { SupabaseDataService } from "@/lib/supabase/api";
import { WhatsAppEventEngine } from "@/lib/whatsapp/eventEngine";
import { EvolutionWhatsAppService } from "@/lib/whatsapp/evolutionClient";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    // 1. Verifica se a API do WhatsApp está conectada antes de processar a fila
    const connState = await EvolutionWhatsAppService.getConnectionState();
    if (connState.state !== "open") {
      return NextResponse.json({
        status: "skipped",
        reason: "WhatsApp instance is not connected (state: " + connState.state + ")",
      });
    }

    const appointments = await SupabaseDataService.getAppointments();
    const now = new Date();

    const remindersSent: string[] = [];
    const followupsSent: string[] = [];

    for (const apt of appointments) {
      if (!apt.clientPhone) continue;

      const notes = apt.notes || "";

      // 1. Lembrete 24h antes do agendamento
      const isConfirmed = apt.status === "confirmed" || apt.status === "pending_confirmation";
      const reminderAlreadySent = notes.includes("[wa_reminder_24h_sent]");

      if (isConfirmed && !reminderAlreadySent && apt.date) {
        try {
          const startTime = apt.startTime || "09:00";
          const aptDate = new Date(`${apt.date}T${startTime}`);
          const diffHours = (aptDate.getTime() - now.getTime()) / (1000 * 60 * 60);

          // Janela entre 18h e 30h de antecedência (~24h antes)
          if (diffHours >= 18 && diffHours <= 30) {
            const res = await WhatsAppEventEngine.send24hAppointmentReminder(apt);
            if (res.success) {
              const updatedNotes = notes ? `${notes}\n[wa_reminder_24h_sent]` : "[wa_reminder_24h_sent]";
              await SupabaseDataService.saveAppointment({
                ...apt,
                notes: updatedNotes,
              });
              remindersSent.push(apt.id);
            }
          }
        } catch (e) {
          console.warn("Erro ao calcular lembrete 24h para apt:", apt.id, e);
        }
      }

      // 2. Mensagem pós-atendimento 1h30 após o término
      const isCompleted = apt.status === "completed";
      const followupAlreadySent = notes.includes("[wa_followup_sent]");

      if (isCompleted && !followupAlreadySent && apt.date) {
        try {
          const endTime = apt.endTime || apt.startTime || "17:00";
          const aptEndDate = new Date(`${apt.date}T${endTime}`);
          const diffMinutes = (now.getTime() - aptEndDate.getTime()) / (1000 * 60);

          // Janela entre 75 minutos (1h15) e 240 minutos (4h) após a conclusão
          if (diffMinutes >= 75 && diffMinutes <= 240) {
            const res = await WhatsAppEventEngine.sendPostCareFollowup(apt);
            if (res.success) {
              const updatedNotes = notes ? `${notes}\n[wa_followup_sent]` : "[wa_followup_sent]";
              await SupabaseDataService.saveAppointment({
                ...apt,
                notes: updatedNotes,
              });
              followupsSent.push(apt.id);
            }
          }
        } catch (e) {
          console.warn("Erro ao calcular pós-atendimento para apt:", apt.id, e);
        }
      }
    }

    return NextResponse.json({
      status: "success",
      remindersSentCount: remindersSent.length,
      followupsSentCount: followupsSent.length,
      remindersSent,
      followupsSent,
      timestamp: now.toISOString(),
    });
  } catch (error: any) {
    console.error("Erro no cron de notificações WhatsApp:", error);
    return NextResponse.json(
      { status: "error", message: error.message },
      { status: 500 }
    );
  }
}
