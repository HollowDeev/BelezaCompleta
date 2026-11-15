import { describe, it, expect, vi, beforeEach } from "vitest";
import { EvolutionWhatsAppService } from "@/lib/whatsapp/evolutionClient";
import { WhatsAppTriageBot } from "@/lib/whatsapp/triageBot";
import { WhatsAppEventEngine } from "@/lib/whatsapp/eventEngine";
import type { LuxuryProposal, Appointment } from "@/types";

describe("EvolutionWhatsAppService", () => {
  it("sanitizes phones correctly for standard Brazilian numbers", () => {
    expect(EvolutionWhatsAppService.sanitizePhone("11999998888")).toBe("5511999998888");
    expect(EvolutionWhatsAppService.sanitizePhone("(11) 99999-8888")).toBe("5511999998888");
    expect(EvolutionWhatsAppService.sanitizePhone("+55 (11) 99999-8888")).toBe("5511999998888");
    expect(EvolutionWhatsAppService.sanitizePhone("5511999998888")).toBe("5511999998888");
    expect(EvolutionWhatsAppService.sanitizePhone("")).toBe("");
  });
});

describe("WhatsAppTriageBot (Deterministic Pre-Triage)", () => {
  const testPhone = "5511988887777";

  it("sends welcome and main menu on first interaction", () => {
    const res = WhatsAppTriageBot.processIncomingMessage(testPhone, "Olá boa tarde");
    expect(res.reply).toBeDefined();
    expect(res.reply).toContain("Espaço Gleicy Ronha");
    expect(res.reply).toContain("1️⃣");
    expect(res.reply).toContain("4️⃣");
  });

  it("handles option 1 (Agendamento & Triagem Online)", () => {
    const res = WhatsAppTriageBot.processIncomingMessage(testPhone, "1");
    expect(res.reply).toBeDefined();
    expect(res.reply).toContain("https://gleicyronha.com.br");
    expect(res.reply).toContain("Triagem Capilar Online");
  });

  it("handles option 2 (Mechas, Cachos e Tratamentos)", () => {
    const res = WhatsAppTriageBot.processIncomingMessage(testPhone, "2");
    expect(res.reply).toBeDefined();
    expect(res.reply).toContain("Mechas, Cachos e Tratamentos Especializados");
    expect(res.reply).toContain("teste de mecha");
  });

  it("handles option 3 (Localização e Horários)", () => {
    const res = WhatsAppTriageBot.processIncomingMessage(testPhone, "3");
    expect(res.reply).toBeDefined();
    expect(res.reply).toContain("Salto - SP");
    expect(res.reply).toContain("Terça a Sábado");
  });

  it("handles option 4 (Falar com a Gleicy e silenciar bot)", () => {
    const res = WhatsAppTriageBot.processIncomingMessage(testPhone, "4");
    expect(res.reply).toBeDefined();
    expect(res.reply).toContain("Atendimento Direto com a Gleicy");
    expect(res.shouldNotifyGleicy).toBe(true);

    // Próxima mensagem do cliente durante o atendimento manual deve manter silêncio
    const followUp = WhatsAppTriageBot.processIncomingMessage(testPhone, "Minha raiz está muito crescida");
    expect(followUp.reply).toBeUndefined();
  });

  it("allows returning to menu at any time by typing 'menu'", () => {
    const res = WhatsAppTriageBot.processIncomingMessage(testPhone, "menu");
    expect(res.reply).toBeDefined();
    expect(res.reply).toContain("1️⃣");
    expect(res.reply).toContain("4️⃣");
  });
});

describe("WhatsAppEventEngine", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("formats and dispatches proposal notifications with direct link", async () => {
    const sendSpy = vi
      .spyOn(EvolutionWhatsAppService, "sendTextMessage")
      .mockResolvedValue({ success: true, messageId: "msg-123" });

    const proposal: LuxuryProposal = {
      id: "prop-xyz-456",
      clientName: "Beatriz Oliveira",
      clientPhone: "11977776666",
      triageSubmissionId: "sub-1",
      hairCharacteristics: { curlPattern: "3A", density: "Média", porosity: "Alta", length: "Médio" },
      hairDiagnostic: "Necessidade de nutrição e corte a seco",
      procedures: [],
      investmentConditions: { pixDiscountPercent: 5, maxInstallments: 3 },
      validUntil: "2026-12-01",
      createdAt: "2026-11-15",
    };

    const result = await WhatsAppEventEngine.sendProposalNotification(proposal);
    expect(result.success).toBe(true);
    expect(sendSpy).toHaveBeenCalledOnce();

    const [sentPhone, sentText] = sendSpy.mock.calls[0];
    expect(sentPhone).toBe("11977776666");
    expect(sentText).toContain("Beatriz");
    expect(sentText).toContain("/proposta/prop-xyz-456");
  });

  it("formats and dispatches 24h appointment reminders", async () => {
    const sendSpy = vi
      .spyOn(EvolutionWhatsAppService, "sendTextMessage")
      .mockResolvedValue({ success: true, messageId: "msg-456" });

    const apt: Appointment = {
      id: "apt-1",
      clientName: "Carla Mendes",
      clientPhone: "11955554444",
      serviceTitle: "Corte Especializado de Cachos",
      date: "2026-11-20",
      startTime: "14:00",
      totalDurationMin: 60,
      price: 180,
      status: "confirmed",
      paymentMethod: "pix",
      paymentStatus: "paid",
    };

    const result = await WhatsAppEventEngine.send24hAppointmentReminder(apt);
    expect(result.success).toBe(true);
    expect(sendSpy).toHaveBeenCalledOnce();

    const [sentPhone, sentText] = sendSpy.mock.calls[0];
    expect(sentPhone).toBe("11955554444");
    expect(sentText).toContain("Carla");
    expect(sentText).toContain("20/11/2026 às 14:00");
    expect(sentText).toContain("Corte Especializado de Cachos");
  });

  it("formats and dispatches post-care follow-up messages requesting feedback and photo", async () => {
    const sendSpy = vi
      .spyOn(EvolutionWhatsAppService, "sendTextMessage")
      .mockResolvedValue({ success: true, messageId: "msg-789" });

    const apt: Appointment = {
      id: "apt-2",
      clientName: "Daniela Costa",
      clientPhone: "11944443333",
      serviceTitle: "Tratamento de Alta Reconstrução",
      date: "2026-11-15",
      startTime: "10:00",
      totalDurationMin: 90,
      price: 250,
      status: "completed",
      paymentMethod: "credit_card",
      paymentStatus: "paid",
    };

    const result = await WhatsAppEventEngine.sendPostCareFollowup(apt);
    expect(result.success).toBe(true);
    expect(sendSpy).toHaveBeenCalledOnce();

    const [sentPhone, sentText] = sendSpy.mock.calls[0];
    expect(sentPhone).toBe("11944443333");
    expect(sentText).toContain("Daniela");
    expect(sentText).toContain("fotinho do seu cabelo");
  });
});
