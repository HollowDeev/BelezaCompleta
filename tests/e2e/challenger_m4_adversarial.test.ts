import { describe, it, expect, beforeEach } from "vitest";
import { SalonStore } from "@/lib/storage/localStore";
import { SupabaseDataService } from "@/lib/supabase/api";
import { LuxuryProposal, ProposalItem } from "@/types/proposal";
import { Appointment, AppointmentProcedureItem } from "@/types/appointment";
import {
  generateProposalAccessLink,
  generateProposalWhatsAppMessage,
} from "@/lib/proposals/sharing";
import { generateWhatsAppLink, formatBRL } from "@/lib/utils";
import {
  calculateProceduresBill,
  calculateProceduresDuration,
} from "@/lib/appointments/billing";
import { mockLuxuryProposal, mockManualProposal } from "../fixtures/proposals.fixture";
import { mockMultiProcedureAppointment } from "../fixtures/appointments.fixture";

describe("Challenger M4: Adversarial Stress-Tests (R7, R8)", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  // =========================================================================
  // 1. PHONE NORMALIZATION & CLIENT PORTAL MATCHING STRESS (10 TESTS)
  // =========================================================================
  describe("1. Phone Normalization & Client Portal Matching Stress", () => {
    it("CH-PH-01: should match proposals across all standard Brazilian phone formats", async () => {
      const prop: LuxuryProposal = {
        ...mockManualProposal,
        id: "prop-ph-01",
        clientPhone: "11987654321",
      };
      SalonStore.saveProposal(prop);

      const queryFormats = [
        "11987654321", // Clean digits
        "(11) 98765-4321", // Standard masked
        "11 98765 4321", // Spaces only
        "11-98765-4321", // Dashes only
        "+55 11 98765-4321", // E.164 with formatting
        "+5511987654321", // E.164 clean
        "5511987654321", // Country code prefix without plus
        "+55 11 9 8765 4321", // Mixed spaces
        "(11)987654321", // Parenthesis without spaces
      ];

      for (const format of queryFormats) {
        const results = SalonStore.getProposalsByClientPhone(format);
        expect(
          results.some((p) => p.id === "prop-ph-01"),
          `Failed to find proposal with query format: "${format}"`
        ).toBe(true);
      }
    });

    it("CH-PH-02: should match appointments across all standard Brazilian phone formats", async () => {
      const apt: Appointment = {
        ...mockMultiProcedureAppointment,
        id: "apt-ph-02",
        clientPhone: "11987654321",
      };
      SalonStore.saveAppointment(apt);

      const queryFormats = [
        "11987654321",
        "(11) 98765-4321",
        "11 98765 4321",
        "+55 11 98765-4321",
        "+5511987654321",
        "5511987654321",
      ];

      for (const format of queryFormats) {
        const results = await SupabaseDataService.getAppointmentsByClientPhone(format);
        expect(
          results.some((a) => a.id === "apt-ph-02"),
          `Failed to find appointment with query format: "${format}"`
        ).toBe(true);
      }
    });

    it("CH-PH-03: should match when stored with country code +55 and queried with local digits", async () => {
      const prop: LuxuryProposal = {
        ...mockManualProposal,
        id: "prop-ph-03",
        clientPhone: "+55 (11) 97777-6666",
      };
      SalonStore.saveProposal(prop);

      const results = SalonStore.getProposalsByClientPhone("11977776666");
      expect(results.some((p) => p.id === "prop-ph-03")).toBe(true);

      const apt: Appointment = {
        ...mockMultiProcedureAppointment,
        id: "apt-ph-03",
        clientPhone: "+55 (11) 97777-6666",
      };
      SalonStore.saveAppointment(apt);

      const aptResults = SalonStore.getAppointmentsByClientPhone("11977776666");
      expect(aptResults.some((a) => a.id === "apt-ph-03")).toBe(true);
    });

    it("CH-PH-04: should properly handle Area Code 55 (DDD 55 - Rio Grande do Sul) without stripping DDD", async () => {
      // In Brazil, DDD 55 is Santa Maria / RS. An 11-digit mobile is e.g. (55) 99123-4567 -> clean: 55991234567
      const propRS: LuxuryProposal = {
        ...mockManualProposal,
        id: "prop-rs-01",
        clientName: "Cliente Gaúcha",
        clientPhone: "(55) 99123-4567",
      };
      SalonStore.saveProposal(propRS);

      // Query with local 11 digits: 55991234567 (must NOT slice DDD 55)
      const resultsLocal = SalonStore.getProposalsByClientPhone("55991234567");
      expect(resultsLocal.some((p) => p.id === "prop-rs-01")).toBe(true);

      // Query with international format: +55 (55) 99123-4567 (13 digits: 5555991234567) -> slices country code 55, retains DDD 55
      const resultsIntl = SalonStore.getProposalsByClientPhone("+55 55 99123-4567");
      expect(resultsIntl.some((p) => p.id === "prop-rs-01")).toBe(true);
    });

    it("CH-PH-05: should match 10-digit landline numbers with and without country code", async () => {
      const propLandline: LuxuryProposal = {
        ...mockManualProposal,
        id: "prop-landline-01",
        clientPhone: "(11) 3456-7890", // 10 digits
      };
      SalonStore.saveProposal(propLandline);

      // Query with 10 digits
      const res1 = SalonStore.getProposalsByClientPhone("1134567890");
      expect(res1.some((p) => p.id === "prop-landline-01")).toBe(true);

      // Query with country code: +55 11 3456-7890 (12 digits)
      const res2 = SalonStore.getProposalsByClientPhone("+55 11 3456-7890");
      expect(res2.some((p) => p.id === "prop-landline-01")).toBe(true);
    });

    it("CH-PH-06: should isolate clients and prevent cross-contamination between similar numbers", async () => {
      const clientA: LuxuryProposal = {
        ...mockManualProposal,
        id: "prop-client-a",
        clientName: "Cliente A",
        clientPhone: "11988887771",
      };
      const clientB: LuxuryProposal = {
        ...mockManualProposal,
        id: "prop-client-b",
        clientName: "Cliente B",
        clientPhone: "11988887772",
      };
      SalonStore.saveProposal(clientA);
      SalonStore.saveProposal(clientB);

      const resultsA = SalonStore.getProposalsByClientPhone("11988887771");
      expect(resultsA).toHaveLength(1);
      expect(resultsA[0].id).toBe("prop-client-a");

      const resultsB = SalonStore.getProposalsByClientPhone("11988887772");
      expect(resultsB).toHaveLength(1);
      expect(resultsB[0].id).toBe("prop-client-b");
    });

    it("CH-PH-07: should safely return empty array for empty, whitespace or non-digit query inputs", () => {
      SalonStore.saveProposal(mockManualProposal);

      expect(SalonStore.getProposalsByClientPhone("")).toEqual([]);
      expect(SalonStore.getProposalsByClientPhone("   ")).toEqual([]);
      expect(SalonStore.getProposalsByClientPhone("---()")).toEqual([]);
      expect(SalonStore.getAppointmentsByClientPhone("")).toEqual([]);
      expect(SalonStore.getAppointmentsByClientPhone("   ")).toEqual([]);
      expect(SalonStore.getAppointmentsByClientPhone("---()")).toEqual([]);
    });

    it("CH-PH-08: should safely handle null or undefined input in getAppointmentsByClientPhone and localStore", () => {
      SalonStore.saveProposal(mockManualProposal);

      // localStore handles (phone || "")
      expect(SalonStore.getProposalsByClientPhone(undefined as any)).toEqual([]);
      expect(SalonStore.getProposalsByClientPhone(null as any)).toEqual([]);
      expect(SalonStore.getAppointmentsByClientPhone(undefined as any)).toEqual([]);
      expect(SalonStore.getAppointmentsByClientPhone(null as any)).toEqual([]);
    });

    it("CH-PH-08b: exposes vulnerability in SupabaseDataService.getProposalsByClientPhone on undefined input", async () => {
      // SupabaseDataService.getProposalsByClientPhone lacks (phone || "") defensive check:
      // Line 773: let cleanPhone = phone.replace(/\D/g, "");
      // When called with undefined, it throws TypeError: Cannot read properties of undefined
      await expect(async () => {
        await SupabaseDataService.getProposalsByClientPhone(undefined as any);
      }).rejects.toThrow("Cannot read properties of undefined");
    });

    it("CH-PH-09: should return all proposals and appointments when client has multiple records", async () => {
      const phone = "11955556666";

      const prop1: LuxuryProposal = { ...mockManualProposal, id: "prop-multi-1", clientPhone: phone, status: "sent" };
      const prop2: LuxuryProposal = { ...mockManualProposal, id: "prop-multi-2", clientPhone: phone, status: "approved" };
      SalonStore.saveProposal(prop1);
      SalonStore.saveProposal(prop2);

      const apt1: Appointment = { ...mockMultiProcedureAppointment, id: "apt-multi-1", clientPhone: phone };
      const apt2: Appointment = { ...mockMultiProcedureAppointment, id: "apt-multi-2", clientPhone: phone };
      SalonStore.saveAppointment(apt1);
      SalonStore.saveAppointment(apt2);

      const retrievedProps = SalonStore.getProposalsByClientPhone(phone);
      expect(retrievedProps).toHaveLength(2);
      expect(retrievedProps.map((p) => p.id)).toContain("prop-multi-1");
      expect(retrievedProps.map((p) => p.id)).toContain("prop-multi-2");

      const retrievedApts = SalonStore.getAppointmentsByClientPhone(phone);
      expect(retrievedApts).toHaveLength(2);
      expect(retrievedApts.map((a) => a.id)).toContain("apt-multi-1");
      expect(retrievedApts.map((a) => a.id)).toContain("apt-multi-2");
    });

    it("CH-PH-10: should verify generateWhatsAppLink correctly normalizes +55 country code", () => {
      const link1 = generateWhatsAppLink("11988887777", "Olá!");
      expect(link1).toBe("https://wa.me/5511988887777?text=Ol%C3%A1!");

      const link2 = generateWhatsAppLink("+55 (11) 98888-7777", "Teste");
      expect(link2).toBe("https://wa.me/5511988887777?text=Teste");

      const link3 = generateWhatsAppLink("5511988887777", "Oi");
      expect(link3).toBe("https://wa.me/5511988887777?text=Oi");
    });
  });

  // =========================================================================
  // 2. FIRST-ACCESS TRACKING (first_viewed_at) STRESS (5 TESTS)
  // =========================================================================
  describe("2. First-Access Tracking (first_viewed_at) Stress", () => {
    it("CH-FA-01: unviewed proposal has null or undefined firstViewedAt / first_viewed_at", () => {
      const freshProp: LuxuryProposal = {
        ...mockManualProposal,
        id: "prop-unviewed-stress",
        firstViewedAt: undefined,
        first_viewed_at: undefined,
      };
      SalonStore.saveProposal(freshProp);

      const loaded = SalonStore.getProposalById("prop-unviewed-stress");
      expect(loaded?.firstViewedAt).toBeUndefined();
      expect((loaded as any)?.first_viewed_at).toBeUndefined();
    });

    it("CH-FA-02: first access records valid ISO 8601 timestamp in both fields", async () => {
      const prop: LuxuryProposal = {
        ...mockManualProposal,
        id: "prop-view-stamp-test",
        firstViewedAt: undefined,
        first_viewed_at: undefined,
      };
      SalonStore.saveProposal(prop);

      const before = Date.now();
      const updated = await SupabaseDataService.recordProposalFirstView("prop-view-stamp-test");
      const after = Date.now();

      expect(updated).not.toBeNull();
      expect(updated?.firstViewedAt).toBeDefined();
      expect((updated as any)?.first_viewed_at).toBeDefined();
      expect(updated?.firstViewedAt).toBe((updated as any)?.first_viewed_at);

      const stamp = new Date(updated!.firstViewedAt!).getTime();
      expect(stamp).toBeGreaterThanOrEqual(before - 1000);
      expect(stamp).toBeLessThanOrEqual(after + 1000);
    });

    it("CH-FA-03: idempotency - multiple consecutive calls NEVER overwrite the initial timestamp", async () => {
      const prop: LuxuryProposal = {
        ...mockManualProposal,
        id: "prop-idempotency-stress",
        firstViewedAt: undefined,
        first_viewed_at: undefined,
      };
      SalonStore.saveProposal(prop);

      const initial = await SupabaseDataService.recordProposalFirstView("prop-idempotency-stress");
      const initialTimestamp = initial?.firstViewedAt;
      expect(initialTimestamp).toBeDefined();

      // Call 5 times with small delays
      for (let i = 0; i < 5; i++) {
        await new Promise((r) => setTimeout(r, 10));
        const subsequent = await SupabaseDataService.recordProposalFirstView("prop-idempotency-stress");
        expect(subsequent?.firstViewedAt).toBe(initialTimestamp);
        expect((subsequent as any)?.first_viewed_at).toBe(initialTimestamp);
      }

      // Confirm in storage
      const persisted = SalonStore.getProposalById("prop-idempotency-stress");
      expect(persisted?.firstViewedAt).toBe(initialTimestamp);
    });

    it("CH-FA-04: recordProposalFirstView on non-existent ID safely returns null", async () => {
      const result = await SupabaseDataService.recordProposalFirstView("prop-fake-id-9999");
      expect(result).toBeNull();
    });

    it("CH-FA-05: recording first view preserves all existing proposal data intact", async () => {
      const prop: LuxuryProposal = {
        ...mockManualProposal,
        id: "prop-preserve-data",
        title: "PROPOSTA INTACTA",
        totalWithDiscount: 299,
        pixTotal: 284.05,
        items: [
          {
            id: "it-1",
            serviceTitle: "Corte Especial",
            originalPrice: 200,
            specialPrice: 199,
            durationMin: 60,
          },
        ],
        status: "sent",
        firstViewedAt: undefined,
      };
      SalonStore.saveProposal(prop);

      await SupabaseDataService.recordProposalFirstView("prop-preserve-data");

      const reloaded = SalonStore.getProposalById("prop-preserve-data");
      expect(reloaded?.title).toBe("PROPOSTA INTACTA");
      expect(reloaded?.totalWithDiscount).toBe(299);
      expect(reloaded?.pixTotal).toBe(284.05);
      expect(reloaded?.items).toHaveLength(1);
      expect(reloaded?.items[0].serviceTitle).toBe("Corte Especial");
      expect(reloaded?.status).toBe("sent");
      expect(reloaded?.firstViewedAt).toBeDefined();
    });
  });

  // =========================================================================
  // 3. STANDALONE MANUAL PROPOSAL CREATION & LIFECYCLE (5 TESTS)
  // =========================================================================
  describe("3. Standalone Manual Proposal Creation & Lifecycle", () => {
    it("CH-MP-01: creates standalone manual proposal without triage submission", async () => {
      const standalone: LuxuryProposal = {
        ...mockManualProposal,
        id: "prop-standalone-stress-1",
        triageSubmissionId: undefined,
        clientName: "Juliana Paes",
        clientPhone: "11999991111",
        status: "sent",
      };

      SalonStore.saveProposal(standalone);

      const fetched = SalonStore.getProposalById("prop-standalone-stress-1");
      expect(fetched).toBeDefined();
      expect(fetched?.triageSubmissionId).toBeUndefined();
      expect(fetched?.clientName).toBe("Juliana Paes");
      expect(fetched?.items).toHaveLength(2);
    });

    it("CH-MP-02: direct approval of standalone manual proposal creates confirmed appointment", () => {
      const standalone: LuxuryProposal = {
        ...mockManualProposal,
        id: "prop-standalone-approval",
        triageSubmissionId: undefined,
        clientName: "Carla Perez",
        clientPhone: "11988882222",
        schedulingDetails: {
          status: "accepted_original",
          originalDate: "2026-11-29",
          originalTime: "10:30",
          totalDurationMin: 120,
        },
        status: "sent",
      };
      SalonStore.saveProposal(standalone);

      const approvalResult = SalonStore.approveProposal("prop-standalone-approval", {
        chosenDate: "2026-11-29",
        chosenTime: "10:30",
      });

      expect(approvalResult.proposal.status).toBe("approved");
      expect(approvalResult.proposal.approvedAt).toBeDefined();

      // Verified: appointment was created
      expect(approvalResult.appointment).toBeDefined();
      expect(approvalResult.appointment?.status).toBe("confirmed");
      expect(approvalResult.appointment?.date).toBe("2026-11-29");
      expect(approvalResult.appointment?.startTime).toBe("10:30");
      expect(approvalResult.appointment?.clientName).toBe("Carla Perez");
      expect(approvalResult.appointment?.clientPhone).toBe("11988882222");
      expect(approvalResult.appointment?.proposalId).toBe("prop-standalone-approval");
      expect(approvalResult.appointment?.triageSubmissionId).toBeUndefined();

      // Stored in appointments list
      const savedApts = SalonStore.getAppointments();
      const match = savedApts.find((a) => a.proposalId === "prop-standalone-approval");
      expect(match).toBeDefined();
      expect(match?.status).toBe("confirmed");
    });

    it("CH-MP-03: approval maps proposal items into appointment procedures with isIncluded flags intact", () => {
      const mixedItems: ProposalItem[] = [
        {
          id: "it-ch-1",
          serviceTitle: "Mechas Criativas",
          originalPrice: 400,
          specialPrice: 350,
          durationMin: 120,
          isIncluded: false,
        },
        {
          id: "it-ch-2",
          serviceTitle: "Matização Cortesia",
          originalPrice: 150,
          specialPrice: 0,
          durationMin: 30,
          isIncluded: true,
        },
      ];

      const prop: LuxuryProposal = {
        ...mockManualProposal,
        id: "prop-mixed-procedures",
        items: mixedItems,
        schedulingDetails: {
          status: "accepted_original",
          originalDate: "2026-12-05",
          originalTime: "09:00",
        },
      };
      SalonStore.saveProposal(prop);

      const { appointment } = SalonStore.approveProposal("prop-mixed-procedures", {
        chosenDate: "2026-12-05",
        chosenTime: "09:00",
      });

      expect(appointment?.procedures).toBeDefined();
      expect(appointment?.procedures).toHaveLength(2);
      expect(appointment?.procedures?.[0].title).toBe("Mechas Criativas");
      expect(appointment?.procedures?.[0].isIncluded).toBe(false);
      expect(appointment?.procedures?.[1].title).toBe("Matização Cortesia");
      expect(appointment?.procedures?.[1].isIncluded).toBe(true);
    });

    it("CH-MP-04: approveProposal uses fallback originalDate/Time when options are omitted", () => {
      const prop: LuxuryProposal = {
        ...mockManualProposal,
        id: "prop-no-options-approval",
        schedulingDetails: {
          status: "accepted_original",
          originalDate: "2026-12-10",
          originalTime: "15:00",
          confirmedDate: "2026-12-10",
          confirmedTime: "15:00",
          totalDurationMin: 90,
        },
      };
      SalonStore.saveProposal(prop);

      const { appointment } = SalonStore.approveProposal("prop-no-options-approval");
      expect(appointment?.date).toBe("2026-12-10");
      expect(appointment?.startTime).toBe("15:00");
    });

    it("CH-MP-05: throws explicit error when attempting to approve non-existent proposal", () => {
      expect(() => {
        SalonStore.approveProposal("prop-does-not-exist");
      }).toThrow("Proposta não encontrada");
    });
  });

  // =========================================================================
  // 4. WHATSAPP MESSAGE FORMATTING & URL SANITIZATION (5 TESTS)
  // =========================================================================
  describe("4. WhatsApp Message Formatting & URL Sanitization", () => {
    it("CH-WA-01: generates rich message with client name, values, valid URLs and portal guidance", () => {
      const msg = generateProposalWhatsAppMessage(mockManualProposal, "https://glaicyagenda.com.br");

      expect(msg).toContain("Olá, Renata Vasconcelos! ✨");
      expect(msg).toContain(mockManualProposal.title);
      expect(msg).toContain("https://glaicyagenda.com.br/proposta/prop-manual-01");
      expect(msg).toContain("https://glaicyagenda.com.br/meus-agendamentos");
      expect(msg).toContain(formatBRL(mockManualProposal.totalWithDiscount));
      expect(msg).toContain(formatBRL(mockManualProposal.pixTotal));
      expect(msg).toContain("10% de desconto");
      expect(msg).not.toContain("NaN");
      expect(msg).not.toContain("undefined");
    });

    it("CH-WA-02: handles zero total or 0% Pix discount cleanly without NaN", () => {
      const zeroProp: LuxuryProposal = {
        ...mockManualProposal,
        id: "prop-zero-value",
        clientName: "VIP Cortesia",
        totalWithDiscount: 0,
        pixTotal: 0,
        pixDiscountPercent: 0,
      };

      const msg = generateProposalWhatsAppMessage(zeroProp, "https://glaicyagenda.com.br");
      expect(msg).toContain("VIP Cortesia");
      expect(msg).toContain(formatBRL(0));
      expect(msg).toContain("(0% de desconto)");
      expect(msg).not.toContain("NaN");
    });

    it("CH-WA-03: defaults pixDiscountPercent to 5% when undefined/null", () => {
      const undefinedPixProp: LuxuryProposal = {
        ...mockManualProposal,
        id: "prop-undef-pix",
        pixDiscountPercent: undefined as any,
      };

      const msg = generateProposalWhatsAppMessage(undefinedPixProp);
      expect(msg).toContain("(5% de desconto)");
      expect(msg).not.toContain("undefined%");
    });

    it("CH-WA-04: strips multiple trailing slashes from origin cleanly", () => {
      const link1 = generateProposalAccessLink("prop-123", "https://app.gleicyronha.com.br/");
      expect(link1).toBe("https://app.gleicyronha.com.br/proposta/prop-123");

      const link2 = generateProposalAccessLink("prop-123", "https://app.gleicyronha.com.br///");
      expect(link2).toBe("https://app.gleicyronha.com.br/proposta/prop-123");

      const msg = generateProposalWhatsAppMessage(mockManualProposal, "https://app.gleicyronha.com.br///");
      expect(msg).toContain("https://app.gleicyronha.com.br/proposta/prop-manual-01");
      expect(msg).toContain("https://app.gleicyronha.com.br/meus-agendamentos");
      expect(msg).not.toContain("///");
    });

    it("CH-WA-05: correctly formats client names with Portuguese accents & special characters", () => {
      const accentedProp: LuxuryProposal = {
        ...mockManualProposal,
        clientName: "Érica & Conceição Müller",
      };

      const msg = generateProposalWhatsAppMessage(accentedProp);
      expect(msg).toContain("Olá, Érica & Conceição Müller! ✨");

      const waLink = generateWhatsAppLink("11988887777", msg);
      expect(waLink).toContain("https://wa.me/5511988887777?text=");
      expect(decodeURIComponent(waLink)).toContain("Érica & Conceição Müller");
    });
  });

  // =========================================================================
  // 5. DIRECT MULTI-PROCEDURE BILLING & SCHEDULING (R8) (5 TESTS)
  // =========================================================================
  describe("5. Direct Multi-Procedure Billing & Scheduling (R8)", () => {
    it("CH-R8-01: calculates billing and duration correctly for diverse procedures", () => {
      const procedures: AppointmentProcedureItem[] = [
        { title: "Corte", durationMin: 60, price: 180, isIncluded: false },
        { title: "Ozonioterapia", durationMin: 45, price: 120, isIncluded: false },
        { title: "Finalização Cortesia", durationMin: 30, price: 80, isIncluded: true },
        { title: "Diagnóstico Capilar", durationMin: 15, price: 0, isIncluded: true },
      ];

      // Bill: 180 + 120 + 0 + 0 = 300
      expect(calculateProceduresBill(procedures)).toBe(300);
      // Duration: 60 + 45 + 30 + 15 = 150 min
      expect(calculateProceduresDuration(procedures)).toBe(150);
    });

    it("CH-R8-02: returns 0 duration and 0 bill for empty procedures array", () => {
      expect(calculateProceduresBill([])).toBe(0);
      expect(calculateProceduresDuration([])).toBe(0);
    });

    it("CH-R8-03: returns 0 bill when all procedures are marked as included/cortesia", () => {
      const allIncluded: AppointmentProcedureItem[] = [
        { title: "Item 1", durationMin: 30, price: 100, isIncluded: true },
        { title: "Item 2", durationMin: 30, price: 200, isIncluded: true },
      ];

      expect(calculateProceduresBill(allIncluded)).toBe(0);
      expect(calculateProceduresDuration(allIncluded)).toBe(60);
    });

    it("CH-R8-04: supports custom final price override (discount, surcharge, courtesy 0)", () => {
      const procedures: AppointmentProcedureItem[] = [
        { title: "Serviço A", durationMin: 60, price: 250, isIncluded: false },
        { title: "Serviço B", durationMin: 60, price: 250, isIncluded: false },
      ];
      // Calculated bill: 500
      expect(calculateProceduresBill(procedures)).toBe(500);

      // Scenario A: Discount to 450
      const aptDiscount: Appointment = {
        ...mockMultiProcedureAppointment,
        id: "apt-override-discount",
        procedures,
        price: 450,
        finalPrice: 450,
      };
      SalonStore.saveAppointment(aptDiscount);
      expect(SalonStore.getAppointments().find((a) => a.id === "apt-override-discount")?.finalPrice).toBe(450);

      // Scenario B: Surcharge to 550
      const aptSurcharge: Appointment = {
        ...mockMultiProcedureAppointment,
        id: "apt-override-surcharge",
        procedures,
        price: 550,
        finalPrice: 550,
      };
      SalonStore.saveAppointment(aptSurcharge);
      expect(SalonStore.getAppointments().find((a) => a.id === "apt-override-surcharge")?.finalPrice).toBe(550);

      // Scenario C: Total courtesy override to 0
      const aptZero: Appointment = {
        ...mockMultiProcedureAppointment,
        id: "apt-override-zero",
        procedures,
        price: 0,
        finalPrice: 0,
      };
      SalonStore.saveAppointment(aptZero);
      expect(SalonStore.getAppointments().find((a) => a.id === "apt-override-zero")?.finalPrice).toBe(0);
    });

    it("CH-R8-05: persists multi-procedure appointment and retrieves with procedures integrity", async () => {
      const customApt: Appointment = {
        ...mockMultiProcedureAppointment,
        id: "apt-full-integrity",
        clientName: "Valéria Silva",
        clientPhone: "11944445555",
        procedures: [
          { title: "Mechas Criativas", durationMin: 120, price: 450, isIncluded: false },
          { title: "Nutrição", durationMin: 30, price: 120, isIncluded: true },
        ],
        totalDurationMin: 150,
        price: 450,
        finalPrice: 450,
      };

      SalonStore.saveAppointment(customApt);

      const found = await SupabaseDataService.getAppointmentsByClientPhone("11944445555");
      expect(found).toHaveLength(1);
      const apt = found[0];
      expect(apt.id).toBe("apt-full-integrity");
      expect(apt.clientName).toBe("Valéria Silva");
      expect(apt.procedures).toHaveLength(2);
      expect(apt.procedures?.[0].title).toBe("Mechas Criativas");
      expect(apt.procedures?.[0].isIncluded).toBe(false);
      expect(apt.procedures?.[1].title).toBe("Nutrição");
      expect(apt.procedures?.[1].isIncluded).toBe(true);
      expect(apt.totalDurationMin).toBe(150);
      expect(apt.finalPrice).toBe(450);
    });
  });
});
