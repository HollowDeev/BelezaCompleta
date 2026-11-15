/**
 * Mecanismo de Disparo de Eventos Automatizados do WhatsApp
 * - Notificação imediata de Proposta Comercial
 * - Lembrete de Confirmação 24h antes do Agendamento
 * - Mensagem Pós-Atendimento 1h30 após o procedimento pedindo avaliação e foto
 */

import { EvolutionWhatsAppService } from "./evolutionClient";
import type { LuxuryProposal, Appointment } from "@/types";

export class WhatsAppEventEngine {
  private static getBaseUrl(): string {
    if (typeof window !== "undefined") {
      return window.location.origin;
    }
    return (
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.APP_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://gleicyronha.com.br")
    );
  }

  /**
   * Dispara a proposta comercial assim que a Gleicy cria ou atualiza
   */
  public static async sendProposalNotification(
    proposal: LuxuryProposal
  ): Promise<{ success: boolean; error?: string }> {
    if (!proposal.clientPhone) {
      return { success: false, error: "Cliente sem telefone cadastrado" };
    }

    const appUrl = this.getBaseUrl();
    const proposalLink = `${appUrl}/proposta/${proposal.id}`;

    const clientFirstName = (proposal.clientName || "Querida").split(" ")[0];

    const message =
      `Olá, ${clientFirstName}! ✨ Tudo bem? Aqui é da equipe do Espaço Gleicy Ronha.\n\n` +
      `A Gleicy analisou a sua triagem capilar com muito carinho e preparou uma *Proposta Personalizada* especialmente para você e a saúde do seu cabelo! 💖\n\n` +
      `👉 *Acesse sua proposta no link abaixo:*\n` +
      `${proposalLink}\n\n` +
      `Lá você pode ver todos os detalhes do diagnóstico, tratamentos indicados e opções de valores.\n` +
      `Se tiver qualquer dúvida ou quiser ajustar algum detalhe, é só responder por aqui! 🥰`;

    return await EvolutionWhatsAppService.sendTextMessage(proposal.clientPhone, message);
  }

  /**
   * Envia lembrete de confirmação 24 horas antes do agendamento
   */
  public static async send24hAppointmentReminder(
    appointment: Appointment
  ): Promise<{ success: boolean; error?: string }> {
    if (!appointment.clientPhone) {
      return { success: false, error: "Agendamento sem telefone" };
    }

    const clientFirstName = (appointment.clientName || "Cliente").split(" ")[0];
    const serviceName = appointment.serviceTitle || (appointment as any).serviceName || "Atendimento Personalizado";
    const appointmentDate = appointment.date;
    const appointmentTime = appointment.startTime || (appointment as any).time || "horário agendado";

    // Formata data DD/MM/AAAA se vier em AAAA-MM-DD
    let dateFormatted = appointmentDate;
    if (appointmentDate && appointmentDate.includes("-")) {
      const parts = appointmentDate.split("-");
      if (parts.length === 3) {
        dateFormatted = `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
    }

    const message =
      `Olá, ${clientFirstName}! 🌸\n\n` +
      `Lembramos que o seu agendamento no *Espaço Gleicy Ronha* é amanhã, *dia ${dateFormatted} às ${appointmentTime}*!\n\n` +
      `💇‍♀️ *Procedimento:* ${serviceName}\n` +
      `📍 *Local:* Salto - SP\n\n` +
      `Por favor, confirme se você comparecerá respondendo com:\n` +
      `👉 *1* para *Confirmar Presença*\n` +
      `Ou caso precise de um reagendamento com antecedência, nos avise por aqui.\n\n` +
      `Estamos muito ansiosas para cuidar de você e dos seus cabelos! ✨`;

    return await EvolutionWhatsAppService.sendTextMessage(appointment.clientPhone, message);
  }

  /**
   * Envia mensagem de pós-atendimento 1h30 após o término do atendimento
   */
  public static async sendPostCareFollowup(
    appointment: Appointment
  ): Promise<{ success: boolean; error?: string }> {
    if (!appointment.clientPhone) {
      return { success: false, error: "Agendamento sem telefone" };
    }

    const clientFirstName = (appointment.clientName || "Querida").split(" ")[0];

    const message =
      `Oi, ${clientFirstName}! 🥰 Tudo bem?\n\n` +
      `Passando para saber como você está se sentindo com o seu novo visual! Amamos cuidar de você hoje no *Espaço Gleicy Ronha*! ✨💖\n\n` +
      `Como ficou o resultado final? Se puder tirar uma *fotinho do seu cabelo* agora e me mandar aqui, a Gleicy vai amar ver e acompanhar a evolução dos seus fios! 📸✨\n\n` +
      `Qualquer dúvida sobre os cuidados diários em casa, estamos sempre à disposição. Um beijo carinhoso! 🌿`;

    return await EvolutionWhatsAppService.sendTextMessage(appointment.clientPhone, message);
  }
}
