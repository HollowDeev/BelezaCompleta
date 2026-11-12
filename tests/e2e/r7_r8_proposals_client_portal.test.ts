import { describe, it, expect, beforeEach } from "vitest";
import { SalonStore } from "@/lib/storage/localStore";
import { SupabaseDataService } from "@/lib/supabase/api";
import { LuxuryProposal } from "@/types/proposal";
import { Appointment, AppointmentProcedureItem } from "@/types/appointment";
import { generateProposalAccessLink, generateProposalWhatsAppMessage } from "@/lib/proposals/sharing";
import {
  calculateProceduresBill,
  calculateProceduresDuration,
} from "@/lib/appointments/billing";
import { mockLuxuryProposal, mockManualProposal } from "../fixtures/proposals.fixture";
import { mockMultiProcedureAppointment } from "../fixtures/appointments.fixture";

describe("R7, R8: Propostas Manuais, Portal da Cliente e Agendamento Múltiplo Direto (Tiers 1 & 2)", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  // =========================================================================
  // R7: PROPOSTAS MANUAIS, PORTAL DA CLIENTE E PRIMEIRO ACESSO (8 TESTS)
  // =========================================================================

  it("R7.1 - should allow professional to create a manual commercial proposal with custom items and pricing", async () => {
    await SupabaseDataService.saveProposal(mockManualProposal);

    const saved = await SupabaseDataService.getProposalById(mockManualProposal.id);
    expect(saved).toBeDefined();
    expect(saved?.clientName).toBe("Renata Vasconcelos");
    expect(saved?.items).toHaveLength(2);
    expect(saved?.totalOriginal).toBe(300);
    expect(saved?.totalWithDiscount).toBe(250);
    expect(saved?.pixDiscountPercent).toBe(10);
    expect(saved?.pixTotal).toBe(225);
    expect(saved?.status).toBe("sent");
  });

  it("R7.2 - should lookup client proposals by phone number via client portal", async () => {
    SalonStore.saveProposal(mockManualProposal); // phone: 11966665555
    SalonStore.saveProposal(mockLuxuryProposal); // phone: 11988887777

    // Lookup proposals for Renata (11966665555)
    const renataProposals = await SupabaseDataService.getProposalsByClientPhone("11966665555");
    expect(renataProposals).toHaveLength(1);
    expect(renataProposals[0].id).toBe(mockManualProposal.id);

    // Lookup proposals for Isabela (11988887777)
    const isabelaProposals = await SupabaseDataService.getProposalsByClientPhone("11988887777");
    expect(isabelaProposals).toHaveLength(1);
    expect(isabelaProposals[0].id).toBe(mockLuxuryProposal.id);
  });

  it("R7.3 - should generate access link for proposal sharing using modular generator", () => {
    const baseUrl = "https://glaicyagenda.com.br";
    const accessLink = generateProposalAccessLink(mockManualProposal.id, baseUrl);
    expect(accessLink).toBe("https://glaicyagenda.com.br/proposta/prop-manual-01");
  });

  it("R7.4 - should track first access timestamp when client views proposal for the first time", async () => {
    const unviewedProp: LuxuryProposal = {
      ...mockManualProposal,
      id: "prop-first-view-test",
      clientPhone: "11977770001", // Distinct phone isolates R7.4 from R7.2
      firstViewedAt: undefined,
      first_viewed_at: undefined,
    };
    SalonStore.saveProposal(unviewedProp);

    // Initial state: not yet viewed
    let current = SalonStore.getProposalById("prop-first-view-test");
    expect(current?.first_viewed_at || current?.firstViewedAt).toBeUndefined();

    // First view occurs
    await SupabaseDataService.recordProposalFirstView("prop-first-view-test");

    current = SalonStore.getProposalById("prop-first-view-test");
    const firstViewedAt = current?.first_viewed_at || current?.firstViewedAt;
    expect(firstViewedAt).toBeDefined();
  });

  it("R7.4b - should be idempotent and not overwrite first_viewed_at on subsequent views", async () => {
    const unviewedProp: LuxuryProposal = {
      ...mockManualProposal,
      id: "prop-idempotent-view",
      clientPhone: "11977770002",
      firstViewedAt: undefined,
      first_viewed_at: undefined,
    };
    SalonStore.saveProposal(unviewedProp);

    await SupabaseDataService.recordProposalFirstView("prop-idempotent-view");
    const initialViewTime = (SalonStore.getProposalById("prop-idempotent-view") as any)?.firstViewedAt;
    expect(initialViewTime).toBeDefined();

    // Simulate subsequent view after a delay
    await new Promise((r) => setTimeout(r, 10));
    await SupabaseDataService.recordProposalFirstView("prop-idempotent-view");

    const secondViewTime = (SalonStore.getProposalById("prop-idempotent-view") as any)?.firstViewedAt;
    expect(secondViewTime).toBe(initialViewTime);
  });

  it("R7.4c - should return null when recording first view on a non-existent proposal", async () => {
    const result = await SupabaseDataService.recordProposalFirstView("non-existent-proposal-id");
    expect(result).toBeNull();
  });

  it("R7-Edge.1 - should lookup phone numbers formatted with spaces, dashes, or 55 prefix", async () => {
    SalonStore.saveProposal(mockLuxuryProposal); // phone: 11988887777

    const variants = [
      "(11) 98888-7777",
      "11 98888-7777",
      "11988887777",
      "+55 11 98888-7777",
      "5511988887777",
    ];

    for (const v of variants) {
      const results = await SupabaseDataService.getProposalsByClientPhone(v);
      expect(results.length).toBeGreaterThanOrEqual(1);
      expect(results[0].id).toBe(mockLuxuryProposal.id);
    }
  });

  it("R7-Edge.2 - should return empty list when phone number has no matching proposals", async () => {
    SalonStore.saveProposal(mockManualProposal);

    const results = await SupabaseDataService.getProposalsByClientPhone("11900000000");
    expect(results).toEqual([]);
  });

  // =========================================================================
  // R8: AGENDAMENTO DIRETO COM MÚLTIPLOS PROCEDIMENTOS E VALORES (7 TESTS)
  // =========================================================================

  it("R8.1 - should create a direct appointment with multiple itemized procedures", () => {
    SalonStore.saveAppointment(mockMultiProcedureAppointment);

    const saved = SalonStore.getAppointments().find(
      (a) => a.id === mockMultiProcedureAppointment.id
    );
    expect(saved).toBeDefined();
    expect(saved?.procedures).toHaveLength(3);
    expect(saved?.procedures?.[0].title).toBe("Corte Especializado em Cachos");
    expect(saved?.procedures?.[1].title).toBe("Nutrição Lipídica Intensiva");
    expect(saved?.procedures?.[2].title).toBe("Avaliação Capilar com Tricoscópio");
  });

  it("R8.2 - should calculate final price excluding procedures marked with isIncluded: true", () => {
    const procedures: AppointmentProcedureItem[] = [
      {
        title: "Mechas Criativas",
        durationMin: 120,
        price: 500,
        isIncluded: false, // cobrado
      },
      {
        title: "Matização Personalizada",
        durationMin: 30,
        price: 150,
        isIncluded: true, // incluso no pacote
      },
      {
        title: "Tratamento Reconstrutor",
        durationMin: 30,
        price: 180,
        isIncluded: false, // cobrado
      },
    ];

    // Bill = 500 + 0 (included) + 180 = 680
    expect(calculateProceduresBill(procedures)).toBe(680);
  });

  it("R8.2b - should calculate total duration summing all procedure durations", () => {
    const procedures: AppointmentProcedureItem[] = [
      { title: "Mechas Criativas", durationMin: 120, price: 500, isIncluded: false },
      { title: "Matização Personalizada", durationMin: 30, price: 150, isIncluded: true },
      { title: "Tratamento Reconstrutor", durationMin: 30, price: 180, isIncluded: false },
    ];

    expect(calculateProceduresDuration(procedures)).toBe(180);
  });

  it("R8.2c - should persist and retrieve appointment with procedures list intact", () => {
    SalonStore.saveAppointment(mockMultiProcedureAppointment);

    const retrieved = SalonStore.getAppointments().find((a) => a.id === mockMultiProcedureAppointment.id);
    expect(retrieved?.procedures).toBeDefined();
    expect(retrieved?.procedures).toHaveLength(3);
    expect(retrieved?.procedures?.[1].isIncluded).toBe(false);
    expect(retrieved?.procedures?.[2].isIncluded).toBe(true);
  });

  it("R8-Edge.1 - should calculate final price 0 when all procedures are marked isIncluded: true", () => {
    const allIncludedProcedures: AppointmentProcedureItem[] = [
      {
        title: "Revisão e Avaliação",
        durationMin: 30,
        price: 80,
        isIncluded: true,
      },
      {
        title: "Retoque de Franja Cortesia",
        durationMin: 15,
        price: 50,
        isIncluded: true,
      },
    ];

    expect(calculateProceduresBill(allIncludedProcedures)).toBe(0);
    expect(calculateProceduresDuration(allIncludedProcedures)).toBe(45);
  });

  it("R8-Edge.2 - should handle direct appointment with empty procedures array gracefully", () => {
    const emptyProceduresApt: Appointment = {
      ...mockMultiProcedureAppointment,
      id: "apt-empty-proc-01",
      procedures: [],
      finalPrice: 0,
      totalDurationMin: 60,
    };

    SalonStore.saveAppointment(emptyProceduresApt);
    const saved = SalonStore.getAppointments().find((a) => a.id === "apt-empty-proc-01");

    expect(saved).toBeDefined();
    expect(saved?.procedures).toEqual([]);
    expect(calculateProceduresBill(saved?.procedures || [])).toBe(0);
    expect(calculateProceduresDuration(saved?.procedures || [])).toBe(0);
  });

  it("R8-Edge.3 - should safely treat negative prices as zero in bill calculation", () => {
    const proceduresWithNegative: AppointmentProcedureItem[] = [
      { title: "Corte", durationMin: 60, price: 180, isIncluded: false },
      { title: "Desconto Irregular", durationMin: 0, price: -50, isIncluded: false },
    ];

    // Negative price is bounded to 0 to prevent bill tampering
    expect(calculateProceduresBill(proceduresWithNegative)).toBe(180);
  });

  // =========================================================================
  // R7/R8 EXTENDED COVERAGE: WHATSAPP SHARING, PORTAL LOOKUP, CUSTOM PRICING
  // =========================================================================

  it("R7.3b - should generate rich WhatsApp message with client name, values, link and portal instructions", () => {
    const origin = "https://glaicyagenda.com.br";
    const message = generateProposalWhatsAppMessage(mockManualProposal, origin);

    expect(message).toContain("Renata Vasconcelos");
    expect(message).toContain(mockManualProposal.title);
    expect(message).toContain("https://glaicyagenda.com.br/proposta/prop-manual-01");
    expect(message).toContain("https://glaicyagenda.com.br/meus-agendamentos");
    expect(message).toContain("250"); // total with discount
    expect(message).toContain("225"); // Pix total
    expect(message).toContain("10%"); // Pix discount percent
  });

  it("R7.2b - should lookup client appointments by phone number across formatting variations", async () => {
    const apt1: Appointment = {
      ...mockMultiProcedureAppointment,
      id: "apt-phone-lookup-1",
      clientName: "Carolina Mendes",
      clientPhone: "11977778888",
    };
    SalonStore.saveAppointment(apt1);

    const variations = [
      "11977778888",
      "(11) 97777-8888",
      "11 97777-8888",
      "+55 11 97777-8888",
      "5511977778888",
    ];

    for (const v of variations) {
      const results = await SupabaseDataService.getAppointmentsByClientPhone(v);
      expect(results.length).toBeGreaterThanOrEqual(1);
      expect(results.some((a) => a.id === "apt-phone-lookup-1")).toBe(true);
    }

    const notFound = await SupabaseDataService.getAppointmentsByClientPhone("11900009999");
    expect(notFound).toEqual([]);
  });

  it("R7.1b - should persist manual proposal with no triage submission and retrieve via portal", async () => {
    const standaloneProposal: LuxuryProposal = {
      ...mockManualProposal,
      id: "prop-standalone-01",
      triageSubmissionId: undefined,
      clientName: "Beatriz Lima",
      clientPhone: "11955554444",
      status: "sent",
    };

    await SupabaseDataService.saveProposal(standaloneProposal);

    const foundById = await SupabaseDataService.getProposalById("prop-standalone-01");
    expect(foundById).toBeDefined();
    expect(foundById?.clientName).toBe("Beatriz Lima");
    expect(foundById?.triageSubmissionId).toBeUndefined();

    const foundByPhone = await SupabaseDataService.getProposalsByClientPhone("(11) 95555-4444");
    expect(foundByPhone.some((p) => p.id === "prop-standalone-01")).toBe(true);
  });

  it("R8.2d - should support custom final price override different from calculated bill sum", () => {
    const procedures: AppointmentProcedureItem[] = [
      { title: "Mechas Criativas", durationMin: 120, price: 500, isIncluded: false },
      { title: "Matização", durationMin: 30, price: 150, isIncluded: true },
      { title: "Tratamento", durationMin: 30, price: 150, isIncluded: false },
    ];

    const calculatedSum = calculateProceduresBill(procedures);
    expect(calculatedSum).toBe(650); // 500 + 0 + 150

    // Professional overrides price to 580 (special discount)
    const aptWithDiscount: Appointment = {
      ...mockMultiProcedureAppointment,
      id: "apt-custom-discount",
      procedures,
      price: 580,
      finalPrice: 580,
    };

    SalonStore.saveAppointment(aptWithDiscount);
    const saved = SalonStore.getAppointments().find((a) => a.id === "apt-custom-discount");
    expect(saved?.price).toBe(580);
    expect(saved?.finalPrice).toBe(580);
    expect(saved?.procedures).toHaveLength(3);
  });
});
