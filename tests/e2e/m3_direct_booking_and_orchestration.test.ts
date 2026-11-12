import { describe, it, expect, beforeEach } from "vitest";
import { SalonStore } from "@/lib/storage/localStore";
import { SupabaseDataService } from "@/lib/supabase/api";
import { generateWhatsAppLink, formatBRL } from "@/lib/utils";
import { Appointment } from "@/types/appointment";
import { groupAppointmentsChronologically } from "@/lib/appointments/accordions";
import { getPendingUntriagedBadgeCount } from "@/lib/appointments/badges";
import {
  DEFAULT_CONFIRMATION_MESSAGE,
  interpolateMessageTokens,
} from "@/lib/whatsapp/confirmation";
import { mockConfirmedAppointment } from "../fixtures/appointments.fixture";
import { mockTriageSubmission } from "../fixtures/triage.fixture";

describe("Milestone 3: Direct Booking, Multi-view Edits, WhatsApp and Direct Triage Verification", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("M3-1: Direct booking without triage sets pending_confirmation and reflects on badge count", async () => {
    // Initial badge count
    const initialBadge = getPendingUntriagedBadgeCount(SalonStore.getAppointments());
    expect(initialBadge).toBe(0);

    // Simulate booking a direct appointment from client catalogue
    const directApt: Appointment = {
      id: "apt-direct-001",
      orgId: "org-gleicy-ronha",
      professionalId: "user-gleicy-ronha",
      professionalName: "Gleicy Ronha",
      serviceId: "srv-corte-especializado",
      serviceTitle: "Corte Especializado em Cachos",
      clientName: "Larissa Manoela",
      clientPhone: "11999998888",
      date: "2026-11-20",
      startTime: "10:00",
      endTime: "11:30",
      totalDurationMin: 90,
      status: "pending_confirmation", // Set as per Task 3 in SlotPicker
      price: 180,
      paymentStatus: "pending",
      stepBlocks: [],
      notes: "Agendamento direto pelo catálogo da cliente",
      createdAt: new Date().toISOString(),
    };

    await SupabaseDataService.saveAppointment(directApt);

    const appointments = SalonStore.getAppointments();
    const saved = appointments.find((a) => a.id === directApt.id);
    expect(saved).toBeDefined();
    expect(saved?.status).toBe("pending_confirmation");
    expect(saved?.triageSubmissionId).toBeUndefined();

    // Badge count should be incremented to 1
    const badge = getPendingUntriagedBadgeCount(appointments);
    expect(badge).toBe(1);
  });

  it("M3-2: Confirming appointment updates status to confirmed and clears badge count", async () => {
    const directApt: Appointment = {
      id: "apt-direct-002",
      orgId: "org-gleicy-ronha",
      professionalId: "user-gleicy-ronha",
      professionalName: "Gleicy Ronha",
      serviceId: "srv-nutricao",
      serviceTitle: "Nutrição Profunda & Definição",
      clientName: "Beatriz Oliveira",
      clientPhone: "(11) 98765-4321",
      date: "2026-11-21",
      startTime: "14:00",
      endTime: "15:30",
      totalDurationMin: 90,
      status: "pending_confirmation",
      price: 220,
      paymentStatus: "pending",
      stepBlocks: [],
      createdAt: new Date().toISOString(),
    };

    await SupabaseDataService.saveAppointment(directApt);
    expect(getPendingUntriagedBadgeCount(SalonStore.getAppointments())).toBe(1);

    // Confirm handler action
    const confirmedApt: Appointment = {
      ...directApt,
      status: "confirmed",
    };
    await SupabaseDataService.saveAppointment(confirmedApt);

    const updated = SalonStore.getAppointments();
    expect(getPendingUntriagedBadgeCount(updated)).toBe(0);
    const retrieved = updated.find((a) => a.id === directApt.id);
    expect(retrieved?.status).toBe("confirmed");

    // WhatsApp link generation using custom template containing {cliente}
    const templateWithTokens = `Olá {cliente}! Seu agendamento de {servico} para {data} às {horario} está confirmado!\n\n${DEFAULT_CONFIRMATION_MESSAGE}`;
    const waLink = generateWhatsAppLink(
      directApt.clientPhone,
      interpolateMessageTokens(templateWithTokens, {
        cliente: directApt.clientName,
        servico: directApt.serviceTitle,
        data: directApt.date,
        horario: directApt.startTime,
        valor: formatBRL(directApt.price),
      })
    );
    expect(waLink).toContain("https://wa.me/5511987654321");
    expect(waLink).toContain(encodeURIComponent("Olá Beatriz Oliveira!"));
    expect(waLink).toContain("50%25%20do%20valor");
  });

  it("M3-3: Editing appointment preserves original ID and modifies time/date without duplicate entries", async () => {
    await SupabaseDataService.saveAppointment(mockConfirmedAppointment);
    const existing = SalonStore.getAppointments().find((a) => a.id === mockConfirmedAppointment.id);
    expect(existing).toBeDefined();

    // Edit appointment as NewAppointmentModal would
    const editedApt: Appointment = {
      ...mockConfirmedAppointment,
      date: "2026-11-28",
      startTime: "16:00",
      endTime: "17:30",
      notes: "Cliente solicitou reagendamento para final da tarde",
    };

    await SupabaseDataService.saveAppointment(editedApt);

    const list = SalonStore.getAppointments();
    const matches = list.filter((a) => a.id === mockConfirmedAppointment.id);
    expect(matches).toHaveLength(1);
    expect(matches[0].date).toBe("2026-11-28");
    expect(matches[0].startTime).toBe("16:00");
    expect(matches[0].notes).toBe("Cliente solicitou reagendamento para final da tarde");
  });

  it("M3-4: Chronological accordions group appointments sorted ascending and compute daily revenue", () => {
    const apt1: Appointment = {
      ...mockConfirmedAppointment,
      id: "apt-acc-1",
      date: "2026-11-25",
      startTime: "09:00",
      price: 250,
      finalPrice: 250,
    };
    const apt2: Appointment = {
      ...mockConfirmedAppointment,
      id: "apt-acc-2",
      date: "2026-11-20",
      startTime: "14:00",
      price: 180,
      finalPrice: 180,
    };
    const apt3: Appointment = {
      ...mockConfirmedAppointment,
      id: "apt-acc-3",
      date: "2026-11-20",
      startTime: "16:00",
      price: 120,
      finalPrice: 120,
    };

    const groups = groupAppointmentsChronologically([apt1, apt2, apt3]);

    expect(groups).toHaveLength(2);
    // Order must be strictly ascending
    expect(groups[0].date).toBe("2026-11-20");
    expect(groups[0].count).toBe(2);
    expect(groups[0].totalRevenue).toBe(300);
    expect(groups[0].appointments).toHaveLength(2);

    expect(groups[1].date).toBe("2026-11-25");
    expect(groups[1].count).toBe(1);
    expect(groups[1].totalRevenue).toBe(250);
  });

  it("M3-5: Direct triage approval converts submission status to approved and creates/confirms appointment", async () => {
    await SupabaseDataService.saveTriageSubmission(mockTriageSubmission);

    const initialSub = SalonStore.getTriageSubmissions().find((s) => s.id === mockTriageSubmission.id);
    expect(initialSub?.status).toBe("pending_review");

    // Simulate direct approval flow from TriageReviewQueue and Dashboard
    const totalDuration = 90;
    const directApt: Appointment = {
      id: `apt-approved-${Date.now()}`,
      orgId: mockTriageSubmission.orgId,
      professionalId: "58f26242-1e53-432e-b924-dea25ee2068a",
      professionalName: "Gleicy Ronha",
      serviceId: mockTriageSubmission.serviceId,
      serviceTitle: mockTriageSubmission.serviceTitle,
      clientName: mockTriageSubmission.clientName,
      clientPhone: mockTriageSubmission.clientPhone,
      clientEmail: mockTriageSubmission.clientEmail,
      date: mockTriageSubmission.preferredDate || "2026-11-22",
      startTime: "10:00",
      endTime: "11:30",
      totalDurationMin: totalDuration,
      status: "confirmed",
      price: 200,
      paymentStatus: "pending",
      stepBlocks: [],
      triageSubmissionId: mockTriageSubmission.id,
      notes: "Triagem aprovada diretamente sem proposta comercial.",
      createdAt: new Date().toISOString(),
    };

    await SupabaseDataService.saveAppointment(directApt);
    const approvalResult = await SupabaseDataService.approveTriageDirectly(mockTriageSubmission.id);

    expect(approvalResult).toBeDefined();
    expect(approvalResult?.submission.status).toBe("approved");

    const savedApt = SalonStore.getAppointments().find((a) => a.triageSubmissionId === mockTriageSubmission.id);
    expect(savedApt).toBeDefined();
    expect(savedApt?.status).toBe("confirmed");
    expect(savedApt?.clientName).toBe(mockTriageSubmission.clientName);

    // Verify WhatsApp confirmation link can be composed
    const waLink = generateWhatsAppLink(
      mockTriageSubmission.clientPhone,
      interpolateMessageTokens(DEFAULT_CONFIRMATION_MESSAGE, {
        cliente: mockTriageSubmission.clientName,
        servico: mockTriageSubmission.serviceTitle,
        data: directApt.date,
        horario: directApt.startTime,
        valor: formatBRL(directApt.price),
      })
    );
    expect(waLink).toContain(`https://wa.me/55${mockTriageSubmission.clientPhone.replace(/\D/g, "")}`);
    expect(waLink).toContain("24%20horas%20de%20anteced%C3%AAncia");
  });

  it("M3-6: Custom confirmation message template correctly interpolates custom text and tokens", () => {
    const customTemplate =
      "Querida {cliente}! Seu procedimento {servico} foi confirmado para {data} às {horario}. Total: {valor}. Lembre-se da nossa política de 24h.";

    const result = interpolateMessageTokens(customTemplate, {
      cliente: "Juliana Paes",
      servico: "Mechas Iluminadas Chocolate",
      data: "2026-12-05",
      horario: "09:30",
      valor: "R$ 450,00",
    });

    expect(result).toBe(
      "Querida Juliana Paes! Seu procedimento Mechas Iluminadas Chocolate foi confirmado para 2026-12-05 às 09:30. Total: R$ 450,00. Lembre-se da nossa política de 24h."
    );
  });
});
