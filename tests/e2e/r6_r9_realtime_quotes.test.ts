import { describe, it, expect, beforeEach } from "vitest";
import { SalonStore } from "@/lib/storage/localStore";
import { SupabaseDataService, DEFAULT_SERVICE_ID, isUuid } from "@/lib/supabase/api";
import { calculateAvailableSlots, buildDayTimeline } from "@/lib/scheduling/engine";
import { Appointment } from "@/types/appointment";
import { LuxuryProposal } from "@/types/proposal";
import { mockLuxuryProposal } from "../fixtures/proposals.fixture";
import { mockFixedService } from "../fixtures/services.fixture";
import { mockUncommittedQuoteAppointment } from "../fixtures/appointments.fixture";

describe("R6, R9: Correção de Bugs Realtime, Efetivação do Agendamento e Orçamentos sem Compromisso (Tiers 1 & 2)", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  // =========================================================================
  // R6: CORREÇÃO DE BUGS: EFETIVAÇÃO E SINCRONIZAÇÃO EM TEMPO REAL (8 TESTS)
  // =========================================================================

  it("R6.1 - should resolve appointment date from chosenDate when client selects date in proposal approval", async () => {
    SalonStore.saveProposal(mockLuxuryProposal);

    await SupabaseDataService.approveProposal(mockLuxuryProposal.id, {
      chosenDate: "2026-11-30",
      chosenTime: "10:30",
    });

    const approvedProposal = SalonStore.getProposalById(mockLuxuryProposal.id);
    expect(approvedProposal?.status).toBe("approved");
    expect(approvedProposal?.approvedAt).toBeDefined();

    // Verify appointment was created and persisted with chosen date
    const appointments = SalonStore.getAppointments();
    const createdApt = appointments.find((a) => a.proposalId === mockLuxuryProposal.id);

    expect(createdApt).toBeDefined();
    expect(createdApt?.date).toBe("2026-11-30");
    expect(createdApt?.startTime).toBe("10:30");
    expect(createdApt?.status).toBe("confirmed");
    expect(createdApt?.paymentStatus).toBe("paid");
  });

  it("R6.1b - should preserve proposal procedures and service details when creating confirmed appointment", async () => {
    const proposalCustomService: LuxuryProposal = {
      ...mockLuxuryProposal,
      id: "prop-custom-srv-01",
      title: "PROPOSTA DE TRANSFORMAÇÃO EXCLUSIVA",
      subtitle: "Mechas Mel & Iluminação",
      items: [
        {
          id: "item-custom",
          serviceTitle: "Combo Transformação Completa",
          originalPrice: 850,
        },
      ],
    };
    SalonStore.saveProposal(proposalCustomService);

    await SupabaseDataService.approveProposal("prop-custom-srv-01", {
      chosenDate: "2026-12-15",
      chosenTime: "13:00",
    });

    const apt = SalonStore.getAppointments().find(
      (a) => a.proposalId === "prop-custom-srv-01"
    );
    expect(apt).toBeDefined();
    expect(apt?.serviceTitle).toBe("Combo Transformação Completa");
    expect(apt?.status).toBe("confirmed");
  });

  it("R6.1c - should mark proposal approved and record approval timestamp", async () => {
    SalonStore.saveProposal(mockLuxuryProposal);

    await SupabaseDataService.approveProposal(mockLuxuryProposal.id, {
      chosenDate: "2026-11-29",
      chosenTime: "09:00",
    });

    const proposal = SalonStore.getProposalById(mockLuxuryProposal.id);
    expect(proposal?.status).toBe("approved");
    expect(proposal?.approvedAt).toBeDefined();
    expect(new Date(proposal!.approvedAt!).getTime()).toBeLessThanOrEqual(Date.now());
  });

  it("R6.1d - should map valid UUID service_id and procedures from proposal items", async () => {
    const proposalWithProcedures: LuxuryProposal = {
      ...mockLuxuryProposal,
      id: "prop-proc-01",
      title: "PROPOSTA MECHAS & TRATAMENTO",
      subtitle: "Iluminação Personalizada",
      items: [
        {
          id: "item-p1",
          serviceTitle: "Mechas Criativas",
          durationMin: 180,
          originalPrice: 650,
          specialPrice: 600,
          isIncluded: true,
        },
        {
          id: "item-p2",
          serviceTitle: "Tratamento Reconstrutor",
          durationMin: 45,
          originalPrice: 200,
          specialPrice: 180,
          isIncluded: true,
        },
      ],
    };
    SalonStore.saveProposal(proposalWithProcedures);

    await SupabaseDataService.approveProposal("prop-proc-01", {
      chosenDate: "2026-12-20",
      chosenTime: "09:30",
    });

    const apt = SalonStore.getAppointments().find((a) => a.proposalId === "prop-proc-01");
    expect(apt).toBeDefined();
    expect(apt?.serviceId).toBeDefined();
    expect(isUuid(apt?.serviceId)).toBe(true);
    expect(apt?.serviceId).toBe(DEFAULT_SERVICE_ID);
    expect(apt?.procedures).toBeDefined();
    expect(apt?.procedures?.length).toBe(2);
    expect(apt?.procedures?.[0].title).toBe("Mechas Criativas");
    expect(apt?.procedures?.[0].price).toBe(600);
    expect(apt?.procedures?.[1].title).toBe("Tratamento Reconstrutor");
    expect(apt?.procedures?.[1].price).toBe(180);
  });

  it("R6.1e - should throw when proposal to approve does not exist", async () => {
    await expect(
      SupabaseDataService.approveProposal("non-existent-prop-999")
    ).rejects.toThrow("Proposta não encontrada");
  });

  it("R6.2 - should broadcast proposal_approved event on syncBus in fallback/offline mode", async () => {
    SalonStore.saveProposal(mockLuxuryProposal);

    let eventFired = false;
    let eventPayload: any = null;

    const listener = (event: any) => {
      eventFired = true;
      eventPayload = event.detail;
    };

    window.addEventListener("glaicy_realtime_sync", listener);

    try {
      await SupabaseDataService.approveProposal(mockLuxuryProposal.id, {
        chosenDate: "2026-11-28",
        chosenTime: "14:00",
      });

      expect(eventFired).toBe(true);
      expect(eventPayload?.type).toBe("proposal_approved");
      expect(eventPayload?.id).toBe(mockLuxuryProposal.id);
    } finally {
      window.removeEventListener("glaicy_realtime_sync", listener);
    }
  });

  it("R6.2b - should persist cross-tab sync ping to localStorage on proposal approval", async () => {
    SalonStore.saveProposal(mockLuxuryProposal);

    await SupabaseDataService.approveProposal(mockLuxuryProposal.id, {
      chosenDate: "2026-11-28",
      chosenTime: "14:00",
    });

    const ping = localStorage.getItem("glaicy_sync_ping");
    expect(ping).toBeDefined();
    const parsedPing = JSON.parse(ping!);
    expect(parsedPing.type).toBe("proposal_approved");
    expect(parsedPing.id).toBe(mockLuxuryProposal.id);
  });

  it("R6-Edge.1 - should throw error when approving a non-existent proposal ID", () => {
    expect(() => {
      SalonStore.approveProposal("non-existent-prop-999");
    }).toThrow("Proposta não encontrada");
  });

  it("R6-Edge.2 - should fallback date to clientChosenDate and originalDate when confirmedDate is absent", async () => {
    const proposalWithOriginalOnly: LuxuryProposal = {
      ...mockLuxuryProposal,
      id: "prop-original-only-01",
      schedulingDetails: {
        status: "accepted_original",
        originalDate: "2026-12-10",
        originalTime: "11:00",
      },
    };
    SalonStore.saveProposal(proposalWithOriginalOnly);

    await SupabaseDataService.approveProposal("prop-original-only-01");

    const createdApt = SalonStore.getAppointments().find(
      (a) => a.proposalId === "prop-original-only-01"
    );
    expect(createdApt).toBeDefined();
    expect(createdApt?.date).toBe("2026-12-10");
    expect(createdApt?.startTime).toBe("11:00");
  });

  it("R6-Edge.3 - should override suggested dates when custom chosenDate and chosenTime are provided", async () => {
    const proposalWithSuggested: LuxuryProposal = {
      ...mockLuxuryProposal,
      id: "prop-override-date-01",
      schedulingDetails: {
        status: "suggested_alternative",
        originalDate: "2026-12-01",
        originalTime: "09:00",
        suggestedDateStart: "2026-12-05",
        suggestedTime: "10:00",
      },
    };
    SalonStore.saveProposal(proposalWithSuggested);

    await SupabaseDataService.approveProposal("prop-override-date-01", {
      chosenDate: "2026-12-08",
      chosenTime: "16:00",
    });

    const createdApt = SalonStore.getAppointments().find(
      (a) => a.proposalId === "prop-override-date-01"
    );
    expect(createdApt?.date).toBe("2026-12-08");
    expect(createdApt?.startTime).toBe("16:00");
  });

  // =========================================================================
  // R9: CRIAÇÃO DE ORÇAMENTOS SEM COMPROMISSO (7 TESTS)
  // =========================================================================

  it("R9.1 - should save uncommitted quote appointment with status 'uncommitted_quote'", () => {
    SalonStore.saveAppointment(mockUncommittedQuoteAppointment);

    const saved = SalonStore.getAppointments().find(
      (a) => a.id === mockUncommittedQuoteAppointment.id
    );
    expect(saved).toBeDefined();
    expect(saved?.status).toBe("uncommitted_quote");
    expect(saved?.isUncommittedQuote).toBe(true);
  });

  it("R9.1b - should NOT block time slot in calculateAvailableSlots when quote has isUncommittedQuote: true", () => {
    const targetDate = "2026-11-22";
    const profId = "prof-gleicy";
    const appointmentsWithQuote: Appointment[] = [mockUncommittedQuoteAppointment];

    const slotsWithQuote = calculateAvailableSlots(
      mockFixedService,
      targetDate,
      profId,
      appointmentsWithQuote,
      {
        openMinutes: 8 * 60,
        closeMinutes: 18 * 60,
        slotIntervalMinutes: 60,
        maxParallelInPause: 1,
      }
    );

    // 14:00 slot must remain available
    const slotAt14WithQuote = slotsWithQuote.find((s) => s.time === "14:00");
    expect(slotAt14WithQuote).toBeDefined();
  });

  it("R9.1c - should exclude uncommitted quotes from buildDayTimeline", () => {
    const targetDate = "2026-11-22";
    const profId = "prof-gleicy";

    const timeline = buildDayTimeline(
      [mockUncommittedQuoteAppointment],
      profId,
      targetDate
    );

    // Timeline must not contain blocks from the uncommitted quote
    const quoteBlocks = timeline.filter((b) => b.appointmentId === mockUncommittedQuoteAppointment.id);
    expect(quoteBlocks).toHaveLength(0);
  });

  it("R9.1d - should allow scheduling concurrent appointment during pause when concurrent quote is uncommitted", () => {
    const targetDate = "2026-11-22";
    const profId = "prof-gleicy";

    // Uncommitted quote concurrent with existing pause
    const quoteInPause: Appointment = {
      ...mockUncommittedQuoteAppointment,
      id: "apt-quote-in-pause",
      date: targetDate,
      startTime: "10:00",
      isUncommittedQuote: true,
      status: "uncommitted_quote",
    };

    const slots = calculateAvailableSlots(
      mockFixedService,
      targetDate,
      profId,
      [quoteInPause],
      {
        openMinutes: 8 * 60,
        closeMinutes: 18 * 60,
        slotIntervalMinutes: 60,
        maxParallelInPause: 1,
      }
    );

    const slotAt10 = slots.find((s) => s.time === "10:00");
    expect(slotAt10).toBeDefined();
  });

  it("R9-Edge.1 - should block time slot when appointment is regular confirmed", () => {
    const targetDate = "2026-11-22";
    const profId = "prof-gleicy";

    const confirmedBlockingApt: Appointment = {
      ...mockUncommittedQuoteAppointment,
      id: "apt-confirmed-blocking",
      status: "confirmed",
      isUncommittedQuote: false,
      scheduledSteps: [
        {
          id: "step-blk-mechas",
          stepId: "step-1",
          stepTitle: "Aplicação",
          type: "active",
          startTime: "14:00",
          endTime: "17:00",
          durationMin: 180,
          isParallelSlotAllowed: false,
        },
      ],
    };

    const slots = calculateAvailableSlots(
      mockFixedService,
      targetDate,
      profId,
      [confirmedBlockingApt],
      {
        openMinutes: 8 * 60,
        closeMinutes: 18 * 60,
        slotIntervalMinutes: 60,
        maxParallelInPause: 1,
      }
    );

    const slotAt14 = slots.find((s) => s.time === "14:00");
    expect(slotAt14).toBeUndefined();
  });

  it("R9-Edge.2 - should immediately block slot when converting quote from uncommitted to confirmed", () => {
    const targetDate = "2026-11-22";
    const profId = "prof-gleicy";

    // Initially uncommitted
    const quoteApt: Appointment = {
      ...mockUncommittedQuoteAppointment,
      date: targetDate,
      startTime: "11:00",
      status: "uncommitted_quote",
      isUncommittedQuote: true,
      stepBlocks: [
        {
          id: "step-q-1",
          stepId: "step-1",
          stepTitle: "Procedimento",
          type: "active",
          startTime: "11:00",
          endTime: "13:00",
          durationMin: 120,
          isParallelSlotAllowed: false,
        },
      ],
    };

    let slots = calculateAvailableSlots(
      mockFixedService,
      targetDate,
      profId,
      [quoteApt],
      { openMinutes: 8 * 60, closeMinutes: 18 * 60, slotIntervalMinutes: 60, maxParallelInPause: 1 }
    );
    expect(slots.find((s) => s.time === "11:00")).toBeDefined();

    // Now converted to confirmed
    const convertedApt: Appointment = {
      ...quoteApt,
      status: "confirmed",
      isUncommittedQuote: false,
    };

    slots = calculateAvailableSlots(
      mockFixedService,
      targetDate,
      profId,
      [convertedApt],
      { openMinutes: 8 * 60, closeMinutes: 18 * 60, slotIntervalMinutes: 60, maxParallelInPause: 1 }
    );
    expect(slots.find((s) => s.time === "11:00")).toBeUndefined();
  });

  it("R9-Edge.3 - should not block slot even if multiple uncommitted quotes exist at same time", () => {
    const targetDate = "2026-11-22";
    const profId = "prof-gleicy";

    const quote1: Appointment = { ...mockUncommittedQuoteAppointment, id: "q1", startTime: "15:00" };
    const quote2: Appointment = { ...mockUncommittedQuoteAppointment, id: "q2", startTime: "15:00" };
    const quote3: Appointment = { ...mockUncommittedQuoteAppointment, id: "q3", startTime: "15:00" };

    const slots = calculateAvailableSlots(
      mockFixedService,
      targetDate,
      profId,
      [quote1, quote2, quote3],
      { openMinutes: 8 * 60, closeMinutes: 18 * 60, slotIntervalMinutes: 60, maxParallelInPause: 1 }
    );

    const slotAt15 = slots.find((s) => s.time === "15:00");
    expect(slotAt15).toBeDefined();
  });

  it("R9.1e - should exclude uncommitted quotes from active calendar views", () => {
    const targetDate = "2026-11-22";

    const regularConfirmedApt: Appointment = {
      ...mockUncommittedQuoteAppointment,
      id: "apt-confirmed-active",
      clientName: "Cliente Confirmada",
      date: targetDate,
      startTime: "09:00",
      endTime: "10:30",
      status: "confirmed",
      isUncommittedQuote: false,
      price: 350,
    };

    const quoteApt: Appointment = {
      ...mockUncommittedQuoteAppointment,
      id: "apt-quote-uncommitted",
      clientName: "Cliente Orçamento",
      date: targetDate,
      startTime: "14:00",
      endTime: "15:30",
      status: "uncommitted_quote",
      isUncommittedQuote: true,
      price: 500,
    };

    const allApts = [regularConfirmedApt, quoteApt];

    // Filter simulating CalendarMasterView / DayOperationView
    const activeAppointments = allApts.filter(
      (a) =>
        a.date === targetDate &&
        a.status !== "cancelled" &&
        a.status !== "pending_proposal" &&
        a.status !== "uncommitted_quote" &&
        !a.isUncommittedQuote
    );

    expect(activeAppointments).toHaveLength(1);
    expect(activeAppointments[0].id).toBe("apt-confirmed-active");

    const totalActiveRevenue = activeAppointments.reduce((sum, a) => sum + a.price, 0);
    expect(totalActiveRevenue).toBe(350);
  });

  it("R9.1f - should convert uncommitted quote to confirmed appointment with isUncommittedQuote: false upon proposal approval and make it visible in calendar filters", async () => {
    // 1. Arrange: Existing appointment created as an uncommitted quote
    const quoteApt: Appointment = {
      ...mockUncommittedQuoteAppointment,
      id: "apt-quote-convert-01",
      date: "2026-11-25",
      startTime: "14:00",
      status: "uncommitted_quote",
      isUncommittedQuote: true,
      proposalId: "prop-quote-convert-01",
    };
    SalonStore.saveAppointment(quoteApt);

    // Initial state check: uncommitted quote is excluded from active calendar filters
    let allApts = SalonStore.getAppointments();
    let visibleApts = allApts.filter(
      (a) =>
        a.date === "2026-11-25" &&
        a.status !== "cancelled" &&
        a.status !== "pending_proposal" &&
        a.status !== "uncommitted_quote" &&
        !a.isUncommittedQuote
    );
    expect(visibleApts).toHaveLength(0);

    // Proposal linked to this uncommitted quote
    const proposal: LuxuryProposal = {
      ...mockLuxuryProposal,
      id: "prop-quote-convert-01",
      schedulingDetails: {
        status: "accepted_original",
        originalDate: "2026-11-25",
        originalTime: "14:00",
      },
    };
    SalonStore.saveProposal(proposal);

    // 2. Act: Client approves proposal
    await SupabaseDataService.approveProposal("prop-quote-convert-01", {
      chosenDate: "2026-11-25",
      chosenTime: "14:00",
    });

    // 3. Assert: Appointment converted to confirmed and isUncommittedQuote reset to false
    allApts = SalonStore.getAppointments();
    const converted = allApts.find((a) => a.id === "apt-quote-convert-01");

    expect(converted).toBeDefined();
    expect(converted?.status).toBe("confirmed");
    expect(converted?.paymentStatus).toBe("paid");
    expect(converted?.isUncommittedQuote).toBe(false);

    // Verify calendar visibility: now passes calendar filter
    visibleApts = allApts.filter(
      (a) =>
        a.date === "2026-11-25" &&
        a.status !== "cancelled" &&
        a.status !== "pending_proposal" &&
        a.status !== "uncommitted_quote" &&
        !a.isUncommittedQuote
    );
    expect(visibleApts).toHaveLength(1);
    expect(visibleApts[0].id).toBe("apt-quote-convert-01");
  });
});
