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

describe("Adversarial Stress Suite — Milestone 4 (R7 & R8)", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  describe("1. Phone Normalization & Fuzzy Cross-Matching Stress Tests", () => {
    it("should match phone numbers with different national/international masks", async () => {
      const proposalWithMask: LuxuryProposal = {
        ...mockManualProposal,
        id: "prop-phone-mask-01",
        clientPhone: "(11) 98765-4321",
      };
      SalonStore.saveProposal(proposalWithMask);

      // Query variations
      const queryVariations = [
        "11987654321",
        "(11) 98765-4321",
        "11 98765-4321",
        "+55 11 98765-4321",
        "5511987654321",
        "+55 (11) 98765-4321",
      ];

      for (const query of queryVariations) {
        const found = await SupabaseDataService.getProposalsByClientPhone(query);
        expect(
          found.some((p) => p.id === "prop-phone-mask-01"),
          `Failed to find proposal with query: ${query}`
        ).toBe(true);
      }
    });

    it("should match stored phone with 55 prefix when queried without 55", async () => {
      const proposalWith55: LuxuryProposal = {
        ...mockManualProposal,
        id: "prop-phone-55-stored",
        clientPhone: "+5511987654321",
      };
      SalonStore.saveProposal(proposalWith55);

      const found = await SupabaseDataService.getProposalsByClientPhone("(11) 98765-4321");
      expect(found.some((p) => p.id === "prop-phone-55-stored")).toBe(true);
    });

    it("should correctly handle 10-digit landlines without stripping valid digits", async () => {
      const proposalLandline: LuxuryProposal = {
        ...mockManualProposal,
        id: "prop-landline-01",
        clientPhone: "(11) 3333-4444",
      };
      SalonStore.saveProposal(proposalLandline);

      const found = await SupabaseDataService.getProposalsByClientPhone("1133334444");
      expect(found.some((p) => p.id === "prop-landline-01")).toBe(true);
    });

    it("should return empty array for queries under non-matching or empty phone numbers", async () => {
      SalonStore.saveProposal(mockManualProposal);

      expect(await SupabaseDataService.getProposalsByClientPhone("")).toEqual([]);
      expect(await SupabaseDataService.getProposalsByClientPhone("   ")).toEqual([]);
      expect(await SupabaseDataService.getAppointmentsByClientPhone("")).toEqual([]);
      expect(await SupabaseDataService.getProposalsByClientPhone("19999999999")).toEqual([]);
    });
  });

  describe("2. First Viewed At Idempotency & Concurrency Stress Tests", () => {
    it("should strictly preserve the first timestamp even if viewed multiple times rapidly", async () => {
      const testProp: LuxuryProposal = {
        ...mockManualProposal,
        id: "prop-concurrency-view",
        firstViewedAt: undefined,
        first_viewed_at: undefined,
      };
      SalonStore.saveProposal(testProp);

      const res1 = await SupabaseDataService.recordProposalFirstView("prop-concurrency-view");
      const firstTimestamp = res1?.firstViewedAt;
      expect(firstTimestamp).toBeDefined();

      // Rapid successive calls
      await new Promise((r) => setTimeout(r, 20));
      const res2 = await SupabaseDataService.recordProposalFirstView("prop-concurrency-view");
      const res3 = await SupabaseDataService.recordProposalFirstView("prop-concurrency-view");

      expect(res2?.firstViewedAt).toBe(firstTimestamp);
      expect(res3?.firstViewedAt).toBe(firstTimestamp);

      const stored = SalonStore.getProposalById("prop-concurrency-view");
      expect(stored?.firstViewedAt).toBe(firstTimestamp);
    });

    it("should handle already-viewed proposal gracefully without modifying date", async () => {
      const preViewedTime = "2026-11-10T14:30:00.000Z";
      const preViewedProp: LuxuryProposal = {
        ...mockManualProposal,
        id: "prop-already-viewed",
        firstViewedAt: preViewedTime,
      };
      SalonStore.saveProposal(preViewedProp);

      const res = await SupabaseDataService.recordProposalFirstView("prop-already-viewed");
      expect(res?.firstViewedAt).toBe(preViewedTime);
    });
  });

  describe("3. Multi-Procedure Billing & Duration Calculation Stress Tests", () => {
    it("should handle zero prices, included procedures and fractional prices safely", () => {
      const procs: AppointmentProcedureItem[] = [
        { title: "Avaliação Gratuita", durationMin: 15, price: 0, isIncluded: true },
        { title: "Corte Principal", durationMin: 45, price: 150.5, isIncluded: false },
        { title: "Finalização Cortesia", durationMin: 20, price: 60, isIncluded: true },
        { title: "Tratamento Extra", durationMin: 30, price: 89.5, isIncluded: false },
      ];

      expect(calculateProceduresDuration(procs)).toBe(110);
      expect(calculateProceduresBill(procs)).toBe(240); // 150.5 + 89.5
    });

    it("should handle single procedure appointments seamlessly without error", () => {
      const single: AppointmentProcedureItem[] = [
        { title: "Design de Cachos", durationMin: 60, price: 220, isIncluded: false },
      ];

      expect(calculateProceduresDuration(single)).toBe(60);
      expect(calculateProceduresBill(single)).toBe(220);
    });

    it("should handle non-numeric inputs and show current duration summation behavior", () => {
      const invalidProcs: any[] = [
        { title: "Procedimento A", durationMin: 10, price: 100, isIncluded: false },
        { title: "Procedimento B", durationMin: "30", price: "50", isIncluded: false },
      ];

      // Duration parses strings safely: 10 + 30 = 40
      expect(calculateProceduresDuration(invalidProcs)).toBe(40);
      expect(calculateProceduresBill(invalidProcs)).toBe(150);
    });
  });

  describe("4. WhatsApp Message Generation Robustness", () => {
    it("should format WhatsApp message correctly with special characters and accented text", () => {
      const accentedProp: LuxuryProposal = {
        ...mockManualProposal,
        clientName: "Conceição d'Ávila",
        title: "Iluminação & Reconstrução Avançada ✨",
        totalWithDiscount: 450,
        pixTotal: 405,
        pixDiscountPercent: 10,
      };

      const msg = generateProposalWhatsAppMessage(accentedProp, "https://glaicyagenda.com.br/");

      expect(msg).toContain("Conceição d'Ávila");
      expect(msg).toContain("Iluminação & Reconstrução Avançada ✨");
      expect(msg).toContain("https://glaicyagenda.com.br/proposta/prop-manual-01");
      expect(msg).toContain("https://glaicyagenda.com.br/meus-agendamentos");
      expect(msg).not.toContain("https://glaicyagenda.com.br//"); // No double slashes
    });

    it("should fallback to default base origin if none provided", () => {
      const link = generateProposalAccessLink("prop-test-fallback", "");
      expect(link).toBe("http://localhost:3000/proposta/prop-test-fallback");
    });
  });
});
