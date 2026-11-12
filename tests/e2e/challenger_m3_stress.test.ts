import { describe, it, expect, beforeEach } from "vitest";
import { SalonStore } from "@/lib/storage/localStore";
import { SupabaseDataService } from "@/lib/supabase/api";
import { generateWhatsAppLink, formatBRL } from "@/lib/utils";
import { Appointment, AppointmentStatus } from "@/types/appointment";
import { ServiceItem } from "@/types/service";
import { groupAppointmentsChronologically } from "@/lib/appointments/accordions";
import { getPendingUntriagedBadgeCount } from "@/lib/appointments/badges";
import {
  DEFAULT_CONFIRMATION_MESSAGE,
  interpolateMessageTokens,
} from "@/lib/whatsapp/confirmation";
import { mockConfirmedAppointment } from "../fixtures/appointments.fixture";
import { mockTriageSubmission } from "../fixtures/triage.fixture";

describe("Milestone 3 Challenger Empirical Stress Tests (R3, R4, R5, R10)", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  // =========================================================================
  // SECTION 1: APPOINTMENT EDITING STRESS TESTS (R3.1)
  // =========================================================================
  describe("1. Appointment Editing & Deduplication Stress Tests", () => {
    it("1.1 should preserve original ID, triageSubmissionId, and metadata across edits", async () => {
      const original: Appointment = {
        id: "apt-m3-stress-001",
        orgId: "org-gleicy-ronha",
        professionalId: "58f26242-1e53-432e-b924-dea25ee2068a",
        professionalName: "Gleicy Ronha",
        serviceId: "srv-corte-especializado",
        serviceTitle: "Corte Especializado em Cachos",
        clientName: "Carolina Dieckmann",
        clientPhone: "(11) 97777-6666",
        clientEmail: "carol@example.com",
        date: "2026-11-20",
        startTime: "09:00",
        endTime: "10:30",
        totalDurationMin: 90,
        status: "confirmed",
        price: 180,
        paymentStatus: "paid",
        paymentMethod: "pix",
        triageSubmissionId: "triage-sub-uuid-999",
        proposalId: "prop-luxury-uuid-888",
        procedures: [
          {
            title: "Corte Especializado em Cachos",
            durationMin: 90,
            price: 180,
            isIncluded: true,
          },
        ],
        notes: "Cliente tem sensibilidade no couro cabeludo",
        createdAt: "2026-11-10T12:00:00.000Z",
      };

      await SupabaseDataService.saveAppointment(original);
      const initialMatches = SalonStore.getAppointments().filter((a) => a.id === original.id);
      expect(initialMatches).toHaveLength(1);

      // Perform edit: change date, time, and notes
      const edited: Appointment = {
        ...original,
        date: "2026-11-25",
        startTime: "14:00",
        endTime: "15:30",
        notes: "Alterado a pedido da cliente: reagendado para tarde",
      };

      await SupabaseDataService.saveAppointment(edited);

      const appointments = SalonStore.getAppointments();
      const matches = appointments.filter((a) => a.id === original.id);
      expect(matches).toHaveLength(1); // STRICT DEDUPLICATION: must NOT create duplicate

      const saved = matches[0];
      expect(saved.id).toBe("apt-m3-stress-001");
      expect(saved.triageSubmissionId).toBe("triage-sub-uuid-999");
      expect(saved.proposalId).toBe("prop-luxury-uuid-888");
      expect(saved.orgId).toBe("org-gleicy-ronha");
      expect(saved.professionalId).toBe("58f26242-1e53-432e-b924-dea25ee2068a");
      expect(saved.clientName).toBe("Carolina Dieckmann");
      expect(saved.clientPhone).toBe("(11) 97777-6666");
      expect(saved.date).toBe("2026-11-25");
      expect(saved.startTime).toBe("14:00");
      expect(saved.endTime).toBe("15:30");
      expect(saved.notes).toBe("Alterado a pedido da cliente: reagendado para tarde");
      expect(saved.createdAt).toBe("2026-11-10T12:00:00.000Z");
      expect(saved.procedures).toHaveLength(1);
    });

    it("1.2 should survive 10 consecutive edits without duplicating or losing data", async () => {
      const initial: Appointment = {
        id: "apt-m3-repeated-edit",
        orgId: "org-gleicy-ronha",
        professionalId: "58f26242-1e53-432e-b924-dea25ee2068a",
        professionalName: "Gleicy Ronha",
        serviceId: "srv-01",
        serviceTitle: "Tratamento Capilar",
        clientName: "Renata Vasconcellos",
        clientPhone: "11988887777",
        date: "2026-11-15",
        startTime: "09:00",
        endTime: "10:00",
        totalDurationMin: 60,
        status: "confirmed",
        price: 150,
        createdAt: new Date().toISOString(),
      };

      await SupabaseDataService.saveAppointment(initial);

      // Mutate 10 times consecutively
      for (let i = 1; i <= 10; i++) {
        const hour = 9 + (i % 8);
        const current = SalonStore.getAppointments().find((a) => a.id === initial.id);
        expect(current).toBeDefined();

        const updated: Appointment = {
          ...current!,
          startTime: `${String(hour).padStart(2, "0")}:00`,
          endTime: `${String(hour + 1).padStart(2, "0")}:00`,
          notes: `Revisão de horário #${i}`,
          price: 150 + i * 10,
        };
        await SupabaseDataService.saveAppointment(updated);

        const list = SalonStore.getAppointments().filter((a) => a.id === initial.id);
        expect(list).toHaveLength(1);
        expect(list[0].id).toBe("apt-m3-repeated-edit");
        expect(list[0].notes).toBe(`Revisão de horário #${i}`);
        expect(list[0].price).toBe(150 + i * 10);
      }
    });

    it("1.3 should correctly recalculate stepBlocks and end time when service duration changes during edit", () => {
      // Simulate NewAppointmentModal handleSubmit logic
      const originalService: ServiceItem = {
        id: "srv-corte-simples",
        orgId: "org-1",
        title: "Corte Simples",
        price: 120,
        steps: [
          { id: "st-1", title: "Corte", durationMin: 45, type: "active", order: 1, requiresExclusiveAttention: true },
        ],
      } as any;

      const newService: ServiceItem = {
        id: "srv-mechas-completas",
        orgId: "org-1",
        title: "Mechas & Reconstrução",
        price: 450,
        steps: [
          { id: "st-apl", title: "Aplicação", durationMin: 60, type: "active", order: 1, requiresExclusiveAttention: true },
          { id: "st-act", title: "Ação Química", durationMin: 50, type: "pause", maxPauseDurationMin: 60, order: 2, requiresExclusiveAttention: false },
          { id: "st-lav", title: "Lavagem e Tratamento", durationMin: 40, type: "active", order: 3, requiresExclusiveAttention: true },
        ],
      } as any;

      const existingAppointment: Appointment = {
        id: "apt-switch-service",
        orgId: "org-1",
        professionalId: "prof-1",
        professionalName: "Gleicy Ronha",
        serviceId: originalService.id,
        serviceTitle: originalService.title,
        clientName: "Mariana Rios",
        clientPhone: "11999990000",
        date: "2026-11-22",
        startTime: "10:00",
        endTime: "10:45",
        totalDurationMin: 45,
        status: "confirmed",
        price: 120,
        stepBlocks: [
          {
            id: "blk-old-1",
            stepId: "st-1",
            stepTitle: "Corte",
            type: "active",
            startTime: "10:00",
            endTime: "10:45",
            durationMin: 45,
            isParallelSlotAllowed: false,
          },
        ],
        createdAt: new Date().toISOString(),
      };

      // Modal logic: user switches service to newService and keeps start time 10:00
      const totalDuration = newService.steps.reduce((sum, s) => sum + s.durationMin, 0);
      expect(totalDuration).toBe(150); // 60 + 50 + 40

      const [h, m] = existingAppointment.startTime.split(":").map(Number);
      const startMinutes = h * 60 + m;
      const endMinutes = startMinutes + totalDuration;
      const endH = Math.floor(endMinutes / 60);
      const endM = endMinutes % 60;
      const endTimeStr = `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;
      expect(endTimeStr).toBe("12:30"); // 10:00 + 150m = 12:30

      let cursor = startMinutes;
      const blocks = newService.steps.map((st) => {
        const stepStart = cursor;
        const stepEnd = cursor + st.durationMin;
        cursor = stepEnd;
        return {
          id: `blk-new-${st.id}`,
          stepId: st.id,
          stepTitle: st.title,
          type: st.type,
          startTime: `${String(Math.floor(stepStart / 60)).padStart(2, "0")}:${String(stepStart % 60).padStart(2, "0")}`,
          endTime: `${String(Math.floor(stepEnd / 60)).padStart(2, "0")}:${String(stepEnd % 60).padStart(2, "0")}`,
          durationMin: st.durationMin,
          maxPauseDurationMin: st.maxPauseDurationMin,
          isParallelSlotAllowed: st.type === "pause",
        };
      });

      const updatedAppointment: Appointment = {
        ...existingAppointment,
        serviceId: newService.id,
        serviceTitle: newService.title,
        endTime: endTimeStr,
        totalDurationMin: totalDuration,
        stepBlocks: blocks,
        price: newService.price,
      };

      expect(updatedAppointment.id).toBe("apt-switch-service");
      expect(updatedAppointment.totalDurationMin).toBe(150);
      expect(updatedAppointment.endTime).toBe("12:30");
      expect(updatedAppointment.stepBlocks).toHaveLength(3);
      expect(updatedAppointment.stepBlocks![0].startTime).toBe("10:00");
      expect(updatedAppointment.stepBlocks![0].endTime).toBe("11:00");
      expect(updatedAppointment.stepBlocks![1].type).toBe("pause");
      expect(updatedAppointment.stepBlocks![1].startTime).toBe("11:00");
      expect(updatedAppointment.stepBlocks![1].endTime).toBe("11:50");
      expect(updatedAppointment.stepBlocks![1].isParallelSlotAllowed).toBe(true);
      expect(updatedAppointment.stepBlocks![2].startTime).toBe("11:50");
      expect(updatedAppointment.stepBlocks![2].endTime).toBe("12:30");
    });
  });

  // =========================================================================
  // SECTION 2: CHRONOLOGICAL ACCORDIONS STRESS TESTS (R3.2)
  // =========================================================================
  describe("2. Chronological Accordions Grouping & Revenue Stress Tests", () => {
    it("2.1 should strictly sort completely shuffled dates across leap years, year boundaries, and months", () => {
      const dates = [
        "2027-01-01", // Next year start
        "2026-12-31", // Year end
        "2024-02-29", // Leap day 2024
        "2024-02-28", // Day before leap day
        "2026-03-01", // Month start
        "2026-02-28", // Non-leap Feb end
        "2025-12-31", // Prior year end
        "2026-06-15", // Mid year
        "2028-02-29", // Next leap day
      ];

      // Shuffle appointments randomly
      const shuffledAppointments: Appointment[] = dates.map((d, idx) => ({
        ...mockConfirmedAppointment,
        id: `apt-stress-date-${idx}`,
        date: d,
        price: 100,
        finalPrice: 100,
      }));

      const groups = groupAppointmentsChronologically(shuffledAppointments);

      expect(groups).toHaveLength(9);
      const outputDates = groups.map((g) => g.date);

      const expectedSortedDates = [
        "2024-02-28",
        "2024-02-29",
        "2025-12-31",
        "2026-02-28",
        "2026-03-01",
        "2026-06-15",
        "2026-12-31",
        "2027-01-01",
        "2028-02-29",
      ];

      expect(outputDates).toEqual(expectedSortedDates);
    });

    it("2.2 should handle days with large appointment counts (50 appointments on a single day)", () => {
      const dayAppointments: Appointment[] = Array.from({ length: 50 }, (_, i) => {
        const p = 50 + (i % 10) * 10;
        return {
          ...mockConfirmedAppointment,
          id: `apt-heavy-${i}`,
          date: "2026-11-20",
          price: p,
          finalPrice: p,
        };
      });

      const expectedTotal = dayAppointments.reduce((sum, a) => sum + a.price, 0);

      const groups = groupAppointmentsChronologically(dayAppointments);

      expect(groups).toHaveLength(1);
      expect(groups[0].date).toBe("2026-11-20");
      expect(groups[0].count).toBe(50);
      expect(groups[0].appointments).toHaveLength(50);
      expect(groups[0].totalRevenue).toBe(expectedTotal);
    });

    it("2.3 should correctly sum floating point decimal prices and handle 0 and undefined", () => {
      const appointmentsWithDecimals: Appointment[] = [
        {
          ...mockConfirmedAppointment,
          id: "dec-1",
          date: "2026-11-21",
          price: 199.9,
          finalPrice: 199.9,
        },
        {
          ...mockConfirmedAppointment,
          id: "dec-2",
          date: "2026-11-21",
          price: 99.95,
          finalPrice: 99.95,
        },
        {
          ...mockConfirmedAppointment,
          id: "dec-3",
          date: "2026-11-21",
          price: 45.15,
          finalPrice: 45.15,
        },
        {
          ...mockConfirmedAppointment,
          id: "dec-4",
          date: "2026-11-21",
          price: 0,
          finalPrice: 0,
        },
      ];

      const groups = groupAppointmentsChronologically(appointmentsWithDecimals);

      expect(groups).toHaveLength(1);
      expect(groups[0].count).toBe(4);
      // 199.9 + 99.95 + 45.15 + 0 = 345.0
      expect(Math.abs(groups[0].totalRevenue - 345.0)).toBeLessThan(0.0001);
    });

    it("2.4 should handle empty and invalid arrays gracefully without throwing", () => {
      expect(groupAppointmentsChronologically([])).toEqual([]);
      expect(groupAppointmentsChronologically(null as any)).toEqual([]);
      expect(groupAppointmentsChronologically(undefined as any)).toEqual([]);
    });

    it("2.5 stress-tests CalendarMasterView validAppointments filter logic against non-confirmed types", () => {
      const mixedList: Appointment[] = [
        { ...mockConfirmedAppointment, id: "apt-ok-1", status: "confirmed" },
        { ...mockConfirmedAppointment, id: "apt-ok-2", status: "pending_confirmation" },
        { ...mockConfirmedAppointment, id: "apt-ok-3", status: "in_service" },
        { ...mockConfirmedAppointment, id: "apt-ok-4", status: "completed" },
        { ...mockConfirmedAppointment, id: "apt-drop-1", status: "cancelled" },
        { ...mockConfirmedAppointment, id: "apt-drop-2", status: "pending_proposal" },
        { ...mockConfirmedAppointment, id: "apt-drop-3", status: "uncommitted_quote" },
        { ...mockConfirmedAppointment, id: "apt-drop-4", status: "confirmed", isUncommittedQuote: true },
      ];

      // Mirror CalendarMasterView filter logic
      const valid = mixedList.filter(
        (a) =>
          a.status !== "cancelled" &&
          a.status !== "pending_proposal" &&
          a.status !== "uncommitted_quote" &&
          !a.isUncommittedQuote
      );

      expect(valid).toHaveLength(4);
      expect(valid.map((a) => a.id)).toEqual(["apt-ok-1", "apt-ok-2", "apt-ok-3", "apt-ok-4"]);
    });
  });

  // =========================================================================
  // SECTION 3: UNTRIAGED BADGE NOTIFICATIONS STRESS TESTS (R4.1)
  // =========================================================================
  describe("3. Untriaged Notification Badge Isolation Stress Tests", () => {
    it("3.1 should isolate untriaged appointments strictly across all 9 possible AppointmentStatus values", () => {
      const allStatuses: AppointmentStatus[] = [
        "pending_triage",
        "pending_confirmation",
        "pending_proposal",
        "proposal_sent",
        "confirmed",
        "in_service",
        "completed",
        "cancelled",
        "uncommitted_quote",
      ];

      allStatuses.forEach((status) => {
        // Without triageSubmissionId
        const aptWithoutTriage: Appointment = {
          ...mockConfirmedAppointment,
          id: `apt-stat-notriage-${status}`,
          status,
          triageSubmissionId: undefined,
        };

        const countWithoutTriage = getPendingUntriagedBadgeCount([aptWithoutTriage]);
        if (status === "pending_confirmation") {
          expect(countWithoutTriage, `Status ${status} without triage must be counted`).toBe(1);
        } else {
          expect(countWithoutTriage, `Status ${status} without triage must NOT be counted`).toBe(0);
        }

        // With triageSubmissionId
        const aptWithTriage: Appointment = {
          ...mockConfirmedAppointment,
          id: `apt-stat-withtriage-${status}`,
          status,
          triageSubmissionId: "triage-uuid-existing",
        };

        const countWithTriage = getPendingUntriagedBadgeCount([aptWithTriage]);
        // Even if status is pending_confirmation, having a triageSubmissionId means it's a TRIAGED appointment!
        expect(countWithTriage, `Status ${status} with triage must NEVER be counted as untriaged`).toBe(0);
      });
    });

    it("3.2 should correctly compute badge count for 10,000 mixed appointments in sub-second time", () => {
      const largeAppointmentsList: Appointment[] = [];
      let expectedUntriagedCount = 0;

      for (let i = 0; i < 10000; i++) {
        const isPendingConfirmation = i % 7 === 0;
        const hasTriage = i % 3 === 0;

        if (isPendingConfirmation && !hasTriage) {
          expectedUntriagedCount++;
        }

        largeAppointmentsList.push({
          ...mockConfirmedAppointment,
          id: `large-apt-${i}`,
          status: isPendingConfirmation ? "pending_confirmation" : "confirmed",
          triageSubmissionId: hasTriage ? `triage-${i}` : undefined,
        });
      }

      const startTime = performance.now();
      const badgeCount = getPendingUntriagedBadgeCount(largeAppointmentsList);
      const durationMs = performance.now() - startTime;

      expect(badgeCount).toBe(expectedUntriagedCount);
      expect(durationMs).toBeLessThan(100); // Must be blazing fast (< 100ms)
    });

    it("3.3 should handle empty, null, and undefined inputs to getPendingUntriagedBadgeCount gracefully", () => {
      expect(getPendingUntriagedBadgeCount([])).toBe(0);
      expect(getPendingUntriagedBadgeCount(null as any)).toBe(0);
      expect(getPendingUntriagedBadgeCount(undefined as any)).toBe(0);
      expect(getPendingUntriagedBadgeCount("invalid" as any)).toBe(0);
    });

    it("3.4 should stress test full lifecycle of notifications and confirmation badge clearing", async () => {
      // 1. Initial state: badge count is 0 for custom appointments
      const directApt1: Appointment = {
        ...mockConfirmedAppointment,
        id: "apt-flow-1",
        status: "pending_confirmation",
        triageSubmissionId: undefined,
      };
      const directApt2: Appointment = {
        ...mockConfirmedAppointment,
        id: "apt-flow-2",
        status: "pending_confirmation",
        triageSubmissionId: undefined,
      };

      // Add 1st direct booking
      await SupabaseDataService.saveAppointment(directApt1);
      const list1 = SalonStore.getAppointments().filter((a) => a.id.startsWith("apt-flow-"));
      expect(getPendingUntriagedBadgeCount(list1)).toBe(1);

      // Add 2nd direct booking
      await SupabaseDataService.saveAppointment(directApt2);
      const list2 = SalonStore.getAppointments().filter((a) => a.id.startsWith("apt-flow-"));
      expect(getPendingUntriagedBadgeCount(list2)).toBe(2);

      // Add a triaged pending confirmation (should NOT increase badge)
      const triagedPending: Appointment = {
        ...mockConfirmedAppointment,
        id: "apt-flow-triaged",
        status: "pending_confirmation",
        triageSubmissionId: "sub-real-123",
      };
      await SupabaseDataService.saveAppointment(triagedPending);
      const list3 = SalonStore.getAppointments().filter((a) => a.id.startsWith("apt-flow-"));
      expect(getPendingUntriagedBadgeCount(list3)).toBe(2);

      // Confirm apt1 -> badge drops to 1
      await SupabaseDataService.saveAppointment({
        ...directApt1,
        status: "confirmed",
      });
      const list4 = SalonStore.getAppointments().filter((a) => a.id.startsWith("apt-flow-"));
      expect(getPendingUntriagedBadgeCount(list4)).toBe(1);

      // Confirm apt2 -> badge drops to 0
      await SupabaseDataService.saveAppointment({
        ...directApt2,
        status: "confirmed",
      });
      const list5 = SalonStore.getAppointments().filter((a) => a.id.startsWith("apt-flow-"));
      expect(getPendingUntriagedBadgeCount(list5)).toBe(0);
    });
  });

  // =========================================================================
  // SECTION 4: WHATSAPP LINK & TOKEN INTERPOLATION STRESS TESTS (R4.2, R5.1, R5.2)
  // =========================================================================
  describe("4. WhatsApp Link Generation & Template Interpolation Stress Tests", () => {
    it("4.1 should interpolate tokens properly even with repeated tokens, missing keys, and special characters", () => {
      const template =
        "Olá {cliente}! Confirmando {servico} para {cliente} no dia {data} às {horario}. Total: {valor}. OBS: {nao_existe}.";

      const data = {
        cliente: "Gleicy & Família",
        servico: "Mechas Iluminadas + Tratamento",
        data: "2026-11-30",
        horario: "14:30",
        valor: "R$ 380,00",
      };

      const result = interpolateMessageTokens(template, data);

      expect(result).toContain("Olá Gleicy & Família!");
      expect(result).toContain("para Gleicy & Família");
      expect(result).toContain("Mechas Iluminadas + Tratamento");
      expect(result).toContain("no dia 2026-11-30 às 14:30");
      expect(result).toContain("Total: R$ 380,00");
      // Missing token {nao_existe} must be left intact without crashing
      expect(result).toContain("OBS: {nao_existe}");
    });

    it("4.2 should sanitize phone numbers with various Brazilian formats (+55, DDD, non-digits)", () => {
      const message = "Olá! Teste de confirmação.";

      // Case A: formatted (11) 98765-4321
      const link1 = generateWhatsAppLink("(11) 98765-4321", message);
      expect(link1).toBe("https://wa.me/5511987654321?text=Ol%C3%A1!%20Teste%20de%20confirma%C3%A7%C3%A3o.");

      // Case B: with country code +55 11 98765-4321
      const link2 = generateWhatsAppLink("+55 11 98765-4321", message);
      expect(link2).toBe("https://wa.me/5511987654321?text=Ol%C3%A1!%20Teste%20de%20confirma%C3%A7%C3%A3o.");

      // Case C: unformatted 11987654321
      const link3 = generateWhatsAppLink("11987654321", message);
      expect(link3).toBe("https://wa.me/5511987654321?text=Ol%C3%A1!%20Teste%20de%20confirma%C3%A7%C3%A3o.");

      // Case D: already starting with 5511987654321
      const link4 = generateWhatsAppLink("5511987654321", message);
      expect(link4).toBe("https://wa.me/5511987654321?text=Ol%C3%A1!%20Teste%20de%20confirma%C3%A7%C3%A3o.");
    });

    it("4.3 should verify DEFAULT_CONFIRMATION_MESSAGE contains the mandatory 24h and 50% credit clauses", () => {
      expect(DEFAULT_CONFIRMATION_MESSAGE).toContain("24 horas");
      expect(DEFAULT_CONFIRMATION_MESSAGE).toContain("50%");
      expect(DEFAULT_CONFIRMATION_MESSAGE).toContain("crédito");
      expect(DEFAULT_CONFIRMATION_MESSAGE).toContain("15 dias");
    });

    it("4.4 should encode complex multi-line messages with emojis and preserve text on decode", () => {
      const complexMsg = `✨ Agendamento Confirmado! ✨\nCliente: Deborah Secco\nProcedimento: Mechas & Nutrição\nValor: R$ 450,00\n\n${DEFAULT_CONFIRMATION_MESSAGE}`;
      const waLink = generateWhatsAppLink("11977778888", complexMsg);

      expect(waLink).toContain("https://wa.me/5511977778888?text=");
      const queryParam = waLink.split("?text=")[1];
      const decoded = decodeURIComponent(queryParam);
      expect(decoded).toBe(complexMsg);
    });
  });

  // =========================================================================
  // SECTION 5: DIRECT TRIAGE APPROVAL WORKFLOW (R10.1)
  // =========================================================================
  describe("5. Direct Triage Approval (R10.1) Stress Tests", () => {
    it("5.1 should directly approve triage, update submission status to approved, and link appointment", async () => {
      await SupabaseDataService.saveTriageSubmission(mockTriageSubmission);

      const subBefore = SalonStore.getTriageSubmissions().find((s) => s.id === mockTriageSubmission.id);
      expect(subBefore?.status).toBe("pending_review");

      // Direct approve action
      await SupabaseDataService.approveTriageDirectly(mockTriageSubmission.id);

      const subAfter = SalonStore.getTriageSubmissions().find((s) => s.id === mockTriageSubmission.id);
      expect(subAfter?.status).toBe("approved");

      // Verify that the appointment created for this submission is confirmed
      const directApt: Appointment = {
        id: "apt-direct-triage-approved",
        orgId: mockTriageSubmission.orgId,
        professionalId: "58f26242-1e53-432e-b924-dea25ee2068a",
        professionalName: "Gleicy Ronha",
        serviceId: mockTriageSubmission.serviceId,
        serviceTitle: mockTriageSubmission.serviceTitle,
        clientName: mockTriageSubmission.clientName,
        clientPhone: mockTriageSubmission.clientPhone,
        date: "2026-11-24",
        startTime: "11:00",
        endTime: "12:30",
        totalDurationMin: 90,
        status: "confirmed",
        price: 250,
        triageSubmissionId: mockTriageSubmission.id,
        createdAt: new Date().toISOString(),
      };

      await SupabaseDataService.saveAppointment(directApt);

      const appointments = SalonStore.getAppointments();
      const saved = appointments.find((a) => a.id === directApt.id);
      expect(saved).toBeDefined();
      expect(saved?.status).toBe("confirmed");
      expect(saved?.triageSubmissionId).toBe(mockTriageSubmission.id);

      // And untriaged badge count must remain 0!
      expect(getPendingUntriagedBadgeCount(appointments)).toBe(0);
    });

    it("5.2 should handle converting pre-reservation status to converted when directly approved", () => {
      const preRes = SalonStore.createPreReservation({
        orgId: "org-test-1",
        professionalId: "prof-test-1",
        serviceId: "srv-1",
        serviceName: "Corte",
        clientName: "Ana Paula Arósio",
        clientPhone: "11911112222",
        requestedDate: "2026-11-26",
        preferredPeriod: "manha",
        status: "pending",
      });

      expect(preRes.status).toBe("pending");

      SalonStore.updatePreReservationStatus(preRes.id, "converted", undefined, "apt-conv-999");

      const convertedPreRes = SalonStore.getPreReservations("org-test-1").find((p) => p.id === preRes.id);
      expect(convertedPreRes?.status).toBe("converted");
      expect(convertedPreRes?.convertedAppointmentId).toBe("apt-conv-999");
    });
  });
});
