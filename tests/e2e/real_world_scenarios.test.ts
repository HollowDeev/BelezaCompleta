import { describe, it, expect, beforeEach } from "vitest";
import { SalonStore } from "@/lib/storage/localStore";
import { SupabaseDataService } from "@/lib/supabase/api";
import { calculateAvailableSlots } from "@/lib/scheduling/engine";
import { generateWhatsAppLink, formatBRL } from "@/lib/utils";
import { groupAppointmentsChronologically } from "@/lib/appointments/accordions";
import { ServiceItem } from "@/types/service";
import { Appointment, AppointmentProcedureItem } from "@/types/appointment";
import { LuxuryProposal } from "@/types/proposal";
import { TriageSubmission } from "@/types/triage";
import {
  mockFixedService,
  mockStartingAtService,
  mockTratamentoService,
} from "../fixtures/services.fixture";

describe("Tier 4: Cenários Reais de Ponta a Ponta no GlaicyAgenda (Real-World Journeys)", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("Scenario 1: Montar combo + Triagem + Aprovação Direta (R10) + Confirmação WhatsApp com Política 24h/50% (R4/R5)", async () => {
    // 1. Cliente monta combo: "Mechas Criativas Iluminadas" + "Nutrição Lipídica Intensiva"
    const selectedServices = [mockStartingAtService, mockTratamentoService];
    const comboTitle = selectedServices.map((s) => s.title).join(" + ");
    const comboPrice = selectedServices.reduce((sum, s) => sum + s.price, 0); // 450 + 120 = 570
    const comboDuration = selectedServices.reduce(
      (sum, s) => sum + s.steps.reduce((stSum, st) => stSum + st.durationMin, 0),
      0
    ); // (90 + 45 + 45) + (30) = 210 min

    expect(comboTitle).toBe(
      "Mechas Criativas Iluminadas + Nutrição Lipídica Intensiva"
    );
    expect(comboPrice).toBe(570);
    expect(comboDuration).toBe(210);

    // 2. Cliente preenche e envia triagem para o combo
    const triageSub: TriageSubmission = {
      id: "triage-real-01",
      orgId: "org-default-01",
      formId: "form-mechas-01",
      serviceId: "srv-combo-mechas-nutri",
      serviceTitle: comboTitle,
      clientName: "Carolina Viana",
      clientPhone: "11981234567",
      preferredDate: "2026-11-28",
      preferredTimeSlot: "10:00",
      answers: [
        {
          questionId: "q1",
          questionTitle: "Histórico de químicas",
          answerText: "Cabelo natural sem química",
        },
      ],
      photos: {
        currentHairLength: "https://example.com/photos/length.jpg",
      },
      status: "pending_review",
      submittedAt: new Date().toISOString(),
    };
    SalonStore.saveTriageSubmission(triageSub);

    expect(
      SalonStore.getTriageSubmissions().some((s) => s.id === "triage-real-01")
    ).toBe(true);

    // 3. Profissional analisa e faz aprovação direta (R10.1) sem criar proposta
    const approvedSub: TriageSubmission = {
      ...triageSub,
      status: "approved",
      reviewedAt: new Date().toISOString(),
    };
    SalonStore.saveTriageSubmission(approvedSub);

    // 4. Cria agendamento correspondente diretamente na agenda
    const appointment: Appointment = {
      id: "apt-carolina-combo",
      orgId: triageSub.orgId,
      professionalId: "prof-gleicy",
      professionalName: "Gleicy Kelly",
      serviceId: triageSub.serviceId,
      serviceTitle: triageSub.serviceTitle,
      clientName: triageSub.clientName,
      clientPhone: triageSub.clientPhone,
      date: triageSub.preferredDate!,
      startTime: triageSub.preferredTimeSlot!,
      endTime: "13:30",
      totalDurationMin: comboDuration,
      price: comboPrice,
      finalPrice: comboPrice,
      paymentStatus: "paid",
      status: "confirmed",
      triageSubmissionId: triageSub.id,
      createdAt: new Date().toISOString(),
    };
    SalonStore.saveAppointment(appointment);

    // Verifica que triagem está aprovada e agendamento está confirmado
    const verifiedSub = SalonStore.getTriageSubmissions().find(
      (s) => s.id === "triage-real-01"
    );
    expect(verifiedSub?.status).toBe("approved");
    expect(verifiedSub?.proposalId).toBeUndefined();

    const verifiedApt = SalonStore.getAppointments().find(
      (a) => a.id === "apt-carolina-combo"
    );
    expect(verifiedApt?.status).toBe("confirmed");
    expect(verifiedApt?.finalPrice).toBe(570);

    // 5. Gera link do WhatsApp de confirmação com a mensagem oficial (R5.2)
    const confirmationMsg = `Olá Carolina Viana! Seu atendimento de Mechas Criativas Iluminadas + Nutrição Lipídica Intensiva no dia 28/11/2026 às 10:00 está confirmado!

Caso precise remarcar ou cancelar, solicitamos que nos avise com, no mínimo, 24 horas de antecedência. Esse prazo é importante para que possamos reorganizar nossa agenda e disponibilizar o horário para outra cliente.

Em caso de cancelamento sem aviso prévio de 24 horas ou cancelamento próximo ao horário agendado, será cobrado o equivalente a 50% do valor do procedimento reservado.

Esse valor não é perdido: ele ficará como crédito e será abatido do próximo atendimento, desde que o novo agendamento seja realizado e utilizado em até 15 dias após o horário originalmente reservado.`;

    const waLink = generateWhatsAppLink(triageSub.clientPhone, confirmationMsg);
    expect(waLink).toContain("https://wa.me/5511981234567");
    expect(waLink).toContain("24%20horas%20de%20anteced%C3%AAncia");
    expect(waLink).toContain("50%25%20do%20valor");
  });

  it("Scenario 2: Proposta manual com desconto -> Compartilhamento -> Primeiro acesso -> Aprovação realtime -> Accordions -> Edição", async () => {
    // 1. Profissional cria proposta manual com múltiplos procedimentos e desconto
    const manualProposal: LuxuryProposal = {
      id: "prop-e2e-jessica",
      orgId: "org-default-01",
      professionalId: "prof-gleicy",
      clientName: "Jéssica Andrade",
      clientPhone: "11976543210",
      title: "PROPOSTA PERSONALIZADA",
      subtitle: "Transformação Morena Iluminada",
      projectOverview: "Jéssica, preparamos uma proposta exclusiva com técnica suave.",
      desiredResults: ["Contraste suave", "Preservação da curvatura"],
      chosenTechnique: "Morena iluminada sem descoloração agressiva",
      maintenanceGuidance: "Retoque a cada 5 meses",
      includedItems: ["Tratamento acidificante", "Finalização"],
      differentials: [],
      technicalCommitment: "Saúde capilar em primeiro lugar",
      items: [
        {
          id: "it-1",
          serviceTitle: "Morena Iluminada",
          originalPrice: 480,
          specialPrice: 420,
          durationMin: 150,
        },
        {
          id: "it-2",
          serviceTitle: "Corte das Pontas",
          originalPrice: 120,
          specialPrice: 80,
          durationMin: 30,
        },
      ],
      totalOriginal: 600,
      totalWithDiscount: 500,
      pixDiscountPercent: 5,
      pixTotal: 475,
      creditCardTerms: "Até 3x sem juros",
      schedulingDetails: {
        status: "suggested_alternative",
        originalDate: "2026-11-29",
        originalTime: "14:00",
        confirmedDate: "2026-11-29",
        confirmedTime: "14:00",
        totalDurationMin: 180,
      },
      status: "sent",
      expiresAt: "2026-12-05T23:59:59Z",
      createdAt: new Date().toISOString(),
    };
    await SupabaseDataService.saveProposal(manualProposal);

    // 2. Cliente recebe link de acesso e abre a proposta (R7.4: First Access Tracking)
    let propCheck = await SupabaseDataService.getProposalById("prop-e2e-jessica");
    expect((propCheck as any)?.first_viewed_at).toBeUndefined();

    // Registra primeiro acesso
    await SupabaseDataService.recordProposalFirstView("prop-e2e-jessica");
    propCheck = await SupabaseDataService.getProposalById("prop-e2e-jessica");
    const initialViewedAt = propCheck?.first_viewed_at || propCheck?.firstViewedAt;
    expect(initialViewedAt).toBeDefined();

    // 3. Cliente aprova a proposta escolhendo dia 29/11 às 14:00
    let realtimePingReceived = false;
    const syncListener = (ev: any) => {
      if (ev.detail?.type === "proposal_approved" && ev.detail?.id === "prop-e2e-jessica") {
        realtimePingReceived = true;
      }
    };
    window.addEventListener("glaicy_realtime_sync", syncListener);

    try {
      await SupabaseDataService.approveProposal("prop-e2e-jessica", {
        chosenDate: "2026-11-29",
        chosenTime: "14:00",
      });
      expect(realtimePingReceived).toBe(true);
    } finally {
      window.removeEventListener("glaicy_realtime_sync", syncListener);
    }

    // 4. Agendamento foi efetivado na agenda
    const appointments = SalonStore.getAppointments();
    const createdApt = appointments.find((a) => a.proposalId === "prop-e2e-jessica");
    expect(createdApt).toBeDefined();
    expect(createdApt?.date).toBe("2026-11-29");
    expect(createdApt?.startTime).toBe("14:00");
    expect(createdApt?.status).toBe("confirmed");

    // 5. Visualização em Accordions: exibe o agendamento no grupo cronológico do dia 29/11
    const accordions = groupAppointmentsChronologically(SalonStore.getAppointments());
    const day29Accordion = accordions.find((acc) => acc.date === "2026-11-29");
    expect(day29Accordion).toBeDefined();
    expect(day29Accordion?.count).toBeGreaterThanOrEqual(1);

    // 6. Profissional ajusta horário do agendamento para 14:30 na visão diária (R3.1)
    const editedApt: Appointment = {
      ...createdApt!,
      startTime: "14:30",
      endTime: "17:30",
    };
    SalonStore.saveAppointment(editedApt);

    const reChecked = SalonStore.getAppointments().find(
      (a) => a.id === createdApt?.id
    );
    expect(reChecked?.startTime).toBe("14:30");
  });

  it("Scenario 3: Solicitação de orçamento sem compromisso (R9) concorrente com agendamento efetivo", () => {
    const saturdayDate = "2026-11-28";
    const profId = "prof-gleicy";

    // 1. Cliente 1 envia solicitação de orçamento sem compromisso para Sábado às 14:00
    const quoteAppointment: Appointment = {
      id: "apt-orcamento-livre",
      orgId: "org-default-01",
      professionalId: profId,
      professionalName: "Gleicy Kelly",
      serviceId: mockStartingAtService.id,
      serviceTitle: mockStartingAtService.title,
      clientName: "Paula Orçamento",
      clientPhone: "11911112222",
      date: saturdayDate,
      startTime: "14:00",
      endTime: "17:00",
      totalDurationMin: 180,
      price: 450,
      finalPrice: 450,
      paymentStatus: "pending",
      status: "uncommitted_quote",
      isUncommittedQuote: true,
      createdAt: new Date().toISOString(),
    };
    SalonStore.saveAppointment(quoteAppointment);

    // 2. Cliente 2 consulta os horários disponíveis para o mesmo sábado
    const existingApts = SalonStore.getAppointments();
    const availableSlots = calculateAvailableSlots(
      mockFixedService,
      saturdayDate,
      profId,
      existingApts,
      {
        openMinutes: 8 * 60,
        closeMinutes: 19 * 60,
        slotIntervalMinutes: 60,
        maxParallelInPause: 1,
      }
    );

    // Como o orçamento NÃO bloqueia horário, o slot das 14:00 DEVE estar livre
    const slot14 = availableSlots.find((s) => s.time === "14:00");
    expect(slot14).toBeDefined();

    // 3. Cliente 2 agenda com sucesso para as 14:00
    const realAppointment: Appointment = {
      id: "apt-real-confirmado",
      orgId: "org-default-01",
      professionalId: profId,
      professionalName: "Gleicy Kelly",
      serviceId: mockFixedService.id,
      serviceTitle: mockFixedService.title,
      clientName: "Mariana Confirmada",
      clientPhone: "11933334444",
      date: saturdayDate,
      startTime: "14:00",
      endTime: "15:30",
      totalDurationMin: 90,
      price: 180,
      finalPrice: 180,
      paymentStatus: "paid",
      status: "confirmed",
      isUncommittedQuote: false,
      scheduledSteps: [
        {
          id: "step-1",
          stepId: "st-1",
          stepTitle: "Corte",
          type: "active",
          startTime: "14:00",
          endTime: "15:30",
          durationMin: 90,
          isParallelSlotAllowed: false,
        },
      ],
      createdAt: new Date().toISOString(),
    };
    SalonStore.saveAppointment(realAppointment);

    // 4. Agora, com o agendamento real confirmado de Mariana, o slot das 14:00 passa a ficar bloqueado
    const updatedApts = SalonStore.getAppointments();
    const newAvailableSlots = calculateAvailableSlots(
      mockFixedService,
      saturdayDate,
      profId,
      updatedApts,
      {
        openMinutes: 8 * 60,
        closeMinutes: 19 * 60,
        slotIntervalMinutes: 60,
        maxParallelInPause: 1,
      }
    );

    const slot14AfterConfirm = newAvailableSlots.find((s) => s.time === "14:00");
    expect(slot14AfterConfirm).toBeUndefined();
  });
});
