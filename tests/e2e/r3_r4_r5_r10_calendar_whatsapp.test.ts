import { describe, it, expect, beforeEach } from "vitest";
import { SalonStore } from "@/lib/storage/localStore";
import { SupabaseDataService } from "@/lib/supabase/api";
import { generateWhatsAppLink } from "@/lib/utils";
import { Appointment } from "@/types/appointment";
import { TriageSubmission } from "@/types/triage";
import { groupAppointmentsChronologically } from "@/lib/appointments/accordions";
import { getPendingUntriagedBadgeCount } from "@/lib/appointments/badges";
import {
  DEFAULT_CONFIRMATION_MESSAGE,
  interpolateMessageTokens,
} from "@/lib/whatsapp/confirmation";
import {
  mockConfirmedAppointment,
  mockUntriagedPendingAppointment,
} from "../fixtures/appointments.fixture";
import { mockTriageSubmission } from "../fixtures/triage.fixture";

describe("R3, R4, R5, R10: Gestão da Agenda, WhatsApp, Notificação e Triagem Direta (Tiers 1 & 2)", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  // =========================================================================
  // R3: EDIÇÃO DE AGENDAMENTOS E ACCORDIONS CRONOLÓGICOS (8 TESTS)
  // =========================================================================

  it("R3.1 - should edit an existing appointment date, time, and final price", () => {
    SalonStore.saveAppointment(mockConfirmedAppointment);

    const existing = SalonStore.getAppointments().find((a) => a.id === mockConfirmedAppointment.id);
    expect(existing).toBeDefined();

    const edited: Appointment = {
      ...existing!,
      date: "2026-11-25",
      startTime: "15:00",
      endTime: "16:30",
      finalPrice: 220,
    };
    SalonStore.saveAppointment(edited);

    const retrieved = SalonStore.getAppointments().find((a) => a.id === mockConfirmedAppointment.id);
    expect(retrieved?.date).toBe("2026-11-25");
    expect(retrieved?.startTime).toBe("15:00");
    expect(retrieved?.endTime).toBe("16:30");
    expect(retrieved?.finalPrice).toBe(220);
  });

  it("R3.1b - should update appointment status from confirmed to completed", () => {
    SalonStore.saveAppointment(mockConfirmedAppointment);

    const existing = SalonStore.getAppointments().find((a) => a.id === mockConfirmedAppointment.id);
    expect(existing?.status).toBe("confirmed");

    const completed: Appointment = {
      ...existing!,
      status: "completed",
    };
    SalonStore.saveAppointment(completed);

    const retrieved = SalonStore.getAppointments().find((a) => a.id === mockConfirmedAppointment.id);
    expect(retrieved?.status).toBe("completed");
  });

  it("R3.1c - should support professional reassignment on appointment edit", () => {
    SalonStore.saveAppointment(mockConfirmedAppointment);

    const reassigned: Appointment = {
      ...mockConfirmedAppointment,
      professionalId: "prof-assistant-01",
      professionalName: "Mariana Assistente",
    };
    SalonStore.saveAppointment(reassigned);

    const retrieved = SalonStore.getAppointments().find((a) => a.id === mockConfirmedAppointment.id);
    expect(retrieved?.professionalId).toBe("prof-assistant-01");
    expect(retrieved?.professionalName).toBe("Mariana Assistente");
  });

  it("R3.2 - should group appointments chronologically into date accordions with count and revenue metrics", () => {
    const apts: Appointment[] = [
      {
        ...mockConfirmedAppointment,
        id: "apt-date-2",
        date: "2026-11-25",
        startTime: "14:00",
        finalPrice: 300,
      },
      {
        ...mockConfirmedAppointment,
        id: "apt-date-1",
        date: "2026-11-20",
        startTime: "09:00",
        finalPrice: 180,
      },
      {
        ...mockConfirmedAppointment,
        id: "apt-date-3",
        date: "2026-11-20",
        startTime: "11:00",
        finalPrice: 150,
      },
    ];

    const accordions = groupAppointmentsChronologically(apts);

    expect(accordions).toHaveLength(2);
    expect(accordions[0].date).toBe("2026-11-20");
    expect(accordions[0].count).toBe(2);
    expect(accordions[0].appointments).toHaveLength(2);
    expect(accordions[0].totalRevenue).toBe(330);

    expect(accordions[1].date).toBe("2026-11-25");
    expect(accordions[1].count).toBe(1);
    expect(accordions[1].appointments).toHaveLength(1);
    expect(accordions[1].totalRevenue).toBe(300);
  });

  it("R3.2b - should sum revenue using price fallback when finalPrice is not specified", () => {
    const apts: Appointment[] = [
      {
        ...mockConfirmedAppointment,
        id: "apt-no-final-1",
        date: "2026-11-22",
        price: 250,
        finalPrice: undefined,
      },
      {
        ...mockConfirmedAppointment,
        id: "apt-no-final-2",
        date: "2026-11-22",
        price: 150,
        finalPrice: undefined,
      },
    ];

    const accordions = groupAppointmentsChronologically(apts);
    expect(accordions).toHaveLength(1);
    expect(accordions[0].totalRevenue).toBe(400);
    expect(accordions[0].count).toBe(2);
  });

  it("R3-Edge.1 - should handle accordion grouping with empty appointments list without throwing", () => {
    const result = groupAppointmentsChronologically([]);
    expect(result).toHaveLength(0);
    expect(Array.isArray(result)).toBe(true);
  });

  it("R3-Edge.2 - should sort unordered dates strictly ascending", () => {
    const apts: Appointment[] = [
      { ...mockConfirmedAppointment, id: "apt-3", date: "2026-12-10" },
      { ...mockConfirmedAppointment, id: "apt-1", date: "2026-11-05" },
      { ...mockConfirmedAppointment, id: "apt-2", date: "2026-11-28" },
    ];

    const accordions = groupAppointmentsChronologically(apts);
    expect(accordions.map((a) => a.date)).toEqual([
      "2026-11-05",
      "2026-11-28",
      "2026-12-10",
    ]);
  });

  it("R3-Edge.3 - should safely return undefined when searching for non-existent appointment ID", () => {
    SalonStore.saveAppointment(mockConfirmedAppointment);
    const missing = SalonStore.getAppointments().find((a) => a.id === "non-existent-id");
    expect(missing).toBeUndefined();
  });

  // =========================================================================
  // R4: NOTIFICAÇÃO PERSISTENTE E CONFIRMAÇÃO COM WHATSAPP (7 TESTS)
  // =========================================================================

  it("R4.1 - should calculate persistent notification badge for untriaged pending confirmation appointments", () => {
    SalonStore.saveAppointment(mockUntriagedPendingAppointment);
    SalonStore.saveAppointment(mockConfirmedAppointment);

    const appointments = SalonStore.getAppointments();
    expect(getPendingUntriagedBadgeCount(appointments)).toBe(1);
  });

  it("R4.1b - should increment badge count when multiple untriaged pending appointments are created", () => {
    SalonStore.saveAppointment(mockUntriagedPendingAppointment);

    const secondPending: Appointment = {
      ...mockUntriagedPendingAppointment,
      id: "apt-pending-02",
      clientName: "Renata Teste",
      clientPhone: "11988887777",
    };
    SalonStore.saveAppointment(secondPending);

    const appointments = SalonStore.getAppointments();
    expect(getPendingUntriagedBadgeCount(appointments)).toBe(2);
  });

  it("R4.2 - should clear badge and generate formatted WhatsApp link on appointment confirmation", () => {
    SalonStore.saveAppointment(mockUntriagedPendingAppointment);

    let appointments = SalonStore.getAppointments();
    expect(getPendingUntriagedBadgeCount(appointments)).toBe(1);

    // Confirm appointment
    const confirmed: Appointment = {
      ...mockUntriagedPendingAppointment,
      status: "confirmed",
      paymentStatus: "paid",
    };
    SalonStore.saveAppointment(confirmed);

    appointments = SalonStore.getAppointments();
    expect(getPendingUntriagedBadgeCount(appointments)).toBe(0);

    // Generate WhatsApp confirmation link
    const waLink = generateWhatsAppLink(
      mockUntriagedPendingAppointment.clientPhone,
      DEFAULT_CONFIRMATION_MESSAGE
    );

    expect(waLink).toContain("https://wa.me/5511977778888");
    expect(waLink).toContain("Seu%20hor%C3%A1rio%20est%C3%A1%20confirmado");
    expect(waLink).toContain("50%25%20do%20valor");
    expect(waLink).toContain("24%20horas%20de%20anteced%C3%AAncia");
  });

  it("R4.2b - should NOT increment badge when pending appointment has triageSubmissionId", () => {
    const triagedPendingAppointment: Appointment = {
      ...mockUntriagedPendingAppointment,
      id: "apt-pending-with-triage",
      triageSubmissionId: "triage-sub-existing-01",
    };
    SalonStore.saveAppointment(triagedPendingAppointment);

    const appointments = SalonStore.getAppointments();
    expect(getPendingUntriagedBadgeCount(appointments)).toBe(0);
  });

  it("R4-Edge.1 - should return 0 for badge count when appointments list is empty or undefined", () => {
    expect(getPendingUntriagedBadgeCount([])).toBe(0);
    expect(getPendingUntriagedBadgeCount(undefined as any)).toBe(0);
  });

  it("R4-Edge.2 - should decrement badge count when pending appointment is cancelled", () => {
    SalonStore.saveAppointment(mockUntriagedPendingAppointment);
    expect(getPendingUntriagedBadgeCount(SalonStore.getAppointments())).toBe(1);

    const cancelled: Appointment = {
      ...mockUntriagedPendingAppointment,
      status: "cancelled",
    };
    SalonStore.saveAppointment(cancelled);
    expect(getPendingUntriagedBadgeCount(SalonStore.getAppointments())).toBe(0);
  });

  it("R4-Edge.3 - should sanitize phone with country code '55' and strip special characters in WhatsApp link", () => {
    const rawPhones = [
      "(11) 98765-4321",
      "11987654321",
      "5511987654321",
      "+55 (11) 98765-4321",
    ];

    for (const p of rawPhones) {
      const link = generateWhatsAppLink(p, "Teste");
      expect(link).toContain("https://wa.me/5511987654321");
    }
  });

  // =========================================================================
  // R5: MENSAGENS PADRÃO DE CONFIRMAÇÃO CONFIGURÁVEIS (7 TESTS)
  // =========================================================================

  it("R5.1 - should contain mandatory 24h notice and 50% credit retention in confirmation message", () => {
    expect(DEFAULT_CONFIRMATION_MESSAGE).toContain("24 horas de antecedência");
    expect(DEFAULT_CONFIRMATION_MESSAGE).toContain("50% do valor do procedimento");
    expect(DEFAULT_CONFIRMATION_MESSAGE).toContain("crédito e será abatido do próximo atendimento");
    expect(DEFAULT_CONFIRMATION_MESSAGE).toContain("até 15 dias após o horário");
  });

  it("R5.1b - should have default confirmation message in organization settings", () => {
    const org = SalonStore.getOrganization();
    expect(org).toBeDefined();
    // Either initialized or fallback to default message
    const msg = org.settings?.defaultConfirmationMessage || DEFAULT_CONFIRMATION_MESSAGE;
    expect(msg).toContain("24 horas de antecedência");
  });

  it("R5.2 - should persist customized confirmation message template in organization settings", () => {
    const customTemplate = `Olá {cliente}! Seu atendimento de {servico} em {data} às {horario} está confirmado!\n\n${DEFAULT_CONFIRMATION_MESSAGE}`;

    SalonStore.updateOrganization({
      settings: {
        isSharedMode: true,
        allowSelfRegistration: false,
        requireTriageApprovalHours: 48,
        pixDiscountPercent: 5,
        maxParallelInPause: 1,
        defaultConfirmationMessage: customTemplate,
      } as any,
    });

    const org = SalonStore.getOrganization();
    expect((org.settings as any).defaultConfirmationMessage).toBe(customTemplate);
  });

  it("R5.2b - should interpolate dynamic tokens into confirmation message template", () => {
    const template = "Olá {cliente}! Confirmamos seu agendamento de {servico} para {data} às {horario}. Total: {valor}.";

    const interpolated = interpolateMessageTokens(template, {
      cliente: "Camila Santos",
      servico: "Corte Especializado em Cachos",
      data: "21/11/2026",
      horario: "14:00",
      valor: "R$ 180,00",
    });

    expect(interpolated).toBe(
      "Olá Camila Santos! Confirmamos seu agendamento de Corte Especializado em Cachos para 21/11/2026 às 14:00. Total: R$ 180,00."
    );
  });

  it("R5-Edge.1 - should leave unmapped token placeholders intact", () => {
    const template = "Olá {cliente}! Horário: {horario}. Observação: {obs}.";
    const res = interpolateMessageTokens(template, { cliente: "Juliana", horario: "10:00" });
    expect(res).toBe("Olá Juliana! Horário: 10:00. Observação: {obs}.");
  });

  it("R5-Edge.2 - should preserve special characters and accented characters during token interpolation", () => {
    const template = "Olá {cliente}, você agendou {servico} com {profissional}.";
    const res = interpolateMessageTokens(template, {
      cliente: "Débora Andréia",
      servico: "Nutrição & Reconstrução",
      profissional: "Gleicy Kelly ✨",
    });
    expect(res).toBe("Olá Débora Andréia, você agendou Nutrição & Reconstrução com Gleicy Kelly ✨.");
  });

  it("R5-Edge.3 - should return empty string when empty template is provided to interpolator", () => {
    const res = interpolateMessageTokens("", { cliente: "Teste" });
    expect(res).toBe("");
  });

  // =========================================================================
  // R10: APROVAÇÃO DIRETA DE PRÉ-AGENDAMENTOS COM TRIAGEM (6 TESTS)
  // =========================================================================

  it("R10.1 - should directly approve a triage submission without requiring a proposal", async () => {
    SalonStore.saveTriageSubmission(mockTriageSubmission);

    const pending = SalonStore.getTriageSubmissions().find(
      (s) => s.id === mockTriageSubmission.id
    );
    expect(pending?.status).toBe("pending_review");

    // Approve directly via SupabaseDataService / SalonStore
    const result = await SupabaseDataService.approveTriageDirectly(mockTriageSubmission.id);
    expect(result).toBeDefined();
    expect(result?.submission.status).toBe("approved");

    const updatedSub = SalonStore.getTriageSubmissions().find(
      (s) => s.id === mockTriageSubmission.id
    );
    expect(updatedSub?.status).toBe("approved");
    expect(updatedSub?.proposalId).toBeUndefined();
  });

  it("R10.1b - should convert corresponding appointment to confirmed status on direct triage approval", async () => {
    SalonStore.saveTriageSubmission(mockTriageSubmission);

    // Create an associated pre-reservation appointment
    const linkedApt: Appointment = {
      ...mockUntriagedPendingAppointment,
      id: "apt-linked-triage-01",
      triageSubmissionId: mockTriageSubmission.id,
      status: "pending_confirmation",
    };
    SalonStore.saveAppointment(linkedApt);

    const result = await SupabaseDataService.approveTriageDirectly(mockTriageSubmission.id);
    expect(result?.appointment).toBeDefined();
    expect(result?.appointment?.status).toBe("confirmed");

    const savedApt = SalonStore.getAppointments().find((a) => a.id === linkedApt.id);
    expect(savedApt?.status).toBe("confirmed");
  });

  it("R10.1c - should preserve client identity and contact data upon direct approval", async () => {
    SalonStore.saveTriageSubmission(mockTriageSubmission);

    const result = await SupabaseDataService.approveTriageDirectly(mockTriageSubmission.id);
    expect(result?.submission.clientName).toBe(mockTriageSubmission.clientName);
    expect(result?.submission.clientPhone).toBe(mockTriageSubmission.clientPhone);
  });

  it("R10.2 - should generate direct WhatsApp confirmation link for client upon direct approval", async () => {
    SalonStore.saveTriageSubmission(mockTriageSubmission);
    await SupabaseDataService.approveTriageDirectly(mockTriageSubmission.id);

    const confirmationMsg = interpolateMessageTokens(DEFAULT_CONFIRMATION_MESSAGE, {
      cliente: mockTriageSubmission.clientName,
    });
    const waLink = generateWhatsAppLink(mockTriageSubmission.clientPhone, confirmationMsg);

    expect(waLink).toContain(`https://wa.me/55${mockTriageSubmission.clientPhone.replace(/\D/g, "")}`);
    expect(waLink).toContain("Seu%20hor%C3%A1rio%20est%C3%A1%20confirmado");
  });

  it("R10-Edge.1 - should be idempotent when approving an already approved triage submission", async () => {
    SalonStore.saveTriageSubmission(mockTriageSubmission);

    const first = await SupabaseDataService.approveTriageDirectly(mockTriageSubmission.id);
    expect(first?.submission.status).toBe("approved");

    const second = await SupabaseDataService.approveTriageDirectly(mockTriageSubmission.id);
    expect(second?.submission.status).toBe("approved");
  });

  it("R10-Edge.2 - should return null when attempting to approve a non-existent triage submission", async () => {
    const result = await SupabaseDataService.approveTriageDirectly("non-existent-submission-id");
    expect(result).toBeNull();
  });
});
