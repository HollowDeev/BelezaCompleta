import { describe, it, expect, beforeEach } from "vitest";
import { SalonStore } from "@/lib/storage/localStore";
import { SupabaseDataService } from "@/lib/supabase/api";
import { generateWhatsAppLink, formatBRL } from "@/lib/utils";
import { Appointment } from "@/types/appointment";
import { TriageSubmission } from "@/types/triage";
import { groupAppointmentsChronologically } from "@/lib/appointments/accordions";
import { getPendingUntriagedBadgeCount } from "@/lib/appointments/badges";
import {
  DEFAULT_CONFIRMATION_MESSAGE,
  interpolateMessageTokens,
} from "@/lib/whatsapp/confirmation";
import { mockConfirmedAppointment, mockUntriagedPendingAppointment } from "../fixtures/appointments.fixture";
import { mockTriageSubmission } from "../fixtures/triage.fixture";

describe("Reviewer 2 Challenger: M3 UX, State Management, WhatsApp & Accordion Edge-Cases", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  describe("1. Multi-view Editing & State Integrity", () => {
    it("preserves appointment metadata (orgId, professionalId, triageSubmissionId, proposalId) across edits", () => {
      const complexAppointment: Appointment = {
        ...mockConfirmedAppointment,
        id: "apt-meta-001",
        orgId: "org-custom-123",
        professionalId: "prof-debora",
        triageSubmissionId: "sub-12345",
        proposalId: "prop-9999",
        notes: "Observação original da cliente",
      };
      SalonStore.saveAppointment(complexAppointment);

      const existing = SalonStore.getAppointments().find((a) => a.id === complexAppointment.id);
      expect(existing).toBeDefined();

      // Simulate edit performed by NewAppointmentModal
      const edited: Appointment = {
        ...existing!,
        date: "2026-12-01",
        startTime: "11:00",
        endTime: "12:30",
        notes: "Horário ajustado a pedido da cliente",
      };
      SalonStore.saveAppointment(edited);

      const updated = SalonStore.getAppointments().find((a) => a.id === complexAppointment.id);
      expect(updated?.date).toBe("2026-12-01");
      expect(updated?.startTime).toBe("11:00");
      expect(updated?.orgId).toBe("org-custom-123");
      expect(updated?.professionalId).toBe("prof-debora");
      expect(updated?.triageSubmissionId).toBe("sub-12345");
      expect(updated?.proposalId).toBe("prop-9999");
      expect(updated?.notes).toBe("Horário ajustado a pedido da cliente");
    });

    it("does not mutate status to confirmed when editing a pending_confirmation appointment", () => {
      SalonStore.saveAppointment(mockUntriagedPendingAppointment);

      const existing = SalonStore.getAppointments().find((a) => a.id === mockUntriagedPendingAppointment.id);
      expect(existing?.status).toBe("pending_confirmation");

      // Edit without confirming
      const edited: Appointment = {
        ...existing!,
        startTime: "10:30",
      };
      SalonStore.saveAppointment(edited);

      const updated = SalonStore.getAppointments().find((a) => a.id === mockUntriagedPendingAppointment.id);
      expect(updated?.startTime).toBe("10:30");
      expect(updated?.status).toBe("pending_confirmation");
      // Badge count must still reflect 1
      expect(getPendingUntriagedBadgeCount(SalonStore.getAppointments())).toBe(1);
    });
  });

  describe("2. Chronological Accordions Stress & Boundary Conditions", () => {
    it("handles multiple appointments on the same date and orders days across years and months", () => {
      const dates = [
        "2027-01-15",
        "2026-11-20",
        "2026-12-31",
        "2026-11-20",
        "2026-11-05",
      ];
      const apts: Appointment[] = dates.map((d, i) => ({
        ...mockConfirmedAppointment,
        id: `apt-stress-${i}`,
        date: d,
        price: 100,
        finalPrice: 100,
      }));

      const accordions = groupAppointmentsChronologically(apts);
      expect(accordions.map((a) => a.date)).toEqual([
        "2026-11-05",
        "2026-11-20",
        "2026-12-31",
        "2027-01-15",
      ]);

      const nov20Group = accordions.find((a) => a.date === "2026-11-20");
      expect(nov20Group).toBeDefined();
      expect(nov20Group?.count).toBe(2);
      expect(nov20Group?.totalRevenue).toBe(200);
    });

    it("handles appointments with null, undefined or 0 price gracefully without NaN revenue", () => {
      const weirdApts: Appointment[] = [
        {
          ...mockConfirmedAppointment,
          id: "apt-zero",
          date: "2026-11-20",
          price: 0,
          finalPrice: 0,
        },
        {
          ...mockConfirmedAppointment,
          id: "apt-undef",
          date: "2026-11-20",
          price: undefined as any,
          finalPrice: undefined,
        },
      ];

      const accordions = groupAppointmentsChronologically(weirdApts);
      expect(accordions).toHaveLength(1);
      expect(accordions[0].totalRevenue).toBe(0);
      expect(Number.isNaN(accordions[0].totalRevenue)).toBe(false);
    });
  });

  describe("3. Persistent Badge Lifecycle & Untriaged Isolation", () => {
    it("accurately handles lifecycle: create direct -> badge 1 -> cancel -> badge 0", () => {
      SalonStore.saveAppointment(mockUntriagedPendingAppointment);
      expect(getPendingUntriagedBadgeCount(SalonStore.getAppointments())).toBe(1);

      // Cancel
      SalonStore.saveAppointment({
        ...mockUntriagedPendingAppointment,
        status: "cancelled",
      });
      expect(getPendingUntriagedBadgeCount(SalonStore.getAppointments())).toBe(0);
    });

    it("distinguishes triage submissions from direct bookings and does not badge triage pre-reservations", () => {
      const triageApt: Appointment = {
        ...mockUntriagedPendingAppointment,
        id: "apt-with-triage-sub",
        triageSubmissionId: "sub-9876",
        status: "pending_confirmation",
      };
      SalonStore.saveAppointment(triageApt);

      // Should be 0 because triage appointments are handled via triage queue, not untriaged direct badge
      expect(getPendingUntriagedBadgeCount(SalonStore.getAppointments())).toBe(0);

      // Adding an untriaged direct appointment
      const directApt: Appointment = {
        ...mockUntriagedPendingAppointment,
        id: "apt-direct-catalog",
        triageSubmissionId: undefined,
        status: "pending_confirmation",
      };
      SalonStore.saveAppointment(directApt);
      expect(getPendingUntriagedBadgeCount(SalonStore.getAppointments())).toBe(1);
    });
  });

  describe("4. WhatsApp Template Fallback, Tokens & URI Encoding", () => {
    it("contains exact required cancellation policy (24h, 50% retention, 15 days credit) in DEFAULT_CONFIRMATION_MESSAGE", () => {
      expect(DEFAULT_CONFIRMATION_MESSAGE).toContain("24 horas de antecedência");
      expect(DEFAULT_CONFIRMATION_MESSAGE).toContain("50% do valor do procedimento reservado");
      expect(DEFAULT_CONFIRMATION_MESSAGE).toContain("crédito e será abatido do próximo atendimento");
      expect(DEFAULT_CONFIRMATION_MESSAGE).toContain("até 15 dias após o horário originalmente reservado");
    });

    it("properly encodes full WhatsApp link containing special characters, quotes, accents, line breaks and 50%", () => {
      const msg = interpolateMessageTokens(DEFAULT_CONFIRMATION_MESSAGE, {
        cliente: "Ana Flávia & Família",
      });
      const link = generateWhatsAppLink("11999998888", msg);

      expect(link.startsWith("https://wa.me/5511999998888?text=")).toBe(true);
      // Ensure % is encoded as %25 so WhatsApp won't truncate URL
      expect(link).toContain("50%25");
      // Ensure line breaks are encoded as %0A
      expect(link).toContain("%0A");
      // Ensure accents are properly percent-encoded
      expect(link).toContain(encodeURIComponent("horário"));
    });

    it("correctly formats phone numbers with country code prefixes, spaces, parentheses and dashes", () => {
      const phones = [
        "+55 11 98888-7777",
        "(11) 98888-7777",
        "5511988887777",
        "11 988887777",
      ];
      for (const phone of phones) {
        const link = generateWhatsAppLink(phone, "Teste");
        expect(link).toContain("https://wa.me/5511988887777");
      }
    });

    it("safely handles custom templates with multiple occurrences of the same token", () => {
      const template = "Olá {cliente}! Lembrando que {cliente} tem agendamento de {servico}!";
      const res = interpolateMessageTokens(template, {
        cliente: "Carla",
        servico: "Corte Cachos",
      });
      expect(res).toBe("Olá Carla! Lembrando que Carla tem agendamento de Corte Cachos!");
    });
  });

  describe("5. Direct Triage Approval End-to-End Orchestration", () => {
    it("approves triage directly and associates appointment with triage submission", async () => {
      SalonStore.saveTriageSubmission(mockTriageSubmission);

      const pendingList = SalonStore.getTriageSubmissions();
      expect(pendingList.find((s) => s.id === mockTriageSubmission.id)?.status).toBe("pending_review");

      // Approve directly
      const result = await SupabaseDataService.approveTriageDirectly(mockTriageSubmission.id);
      expect(result).toBeDefined();
      expect(result?.submission.status).toBe("approved");

      const after = SalonStore.getTriageSubmissions().find((s) => s.id === mockTriageSubmission.id);
      expect(after?.status).toBe("approved");
    });
  });
});
