import { describe, it, expect, beforeEach } from "vitest";
import { SalonStore } from "@/lib/storage/localStore";
import { SupabaseDataService, DEFAULT_SERVICE_ID, isUuid } from "@/lib/supabase/api";
import { calculateAvailableSlots, buildDayTimeline } from "@/lib/scheduling/engine";
import { Appointment } from "@/types/appointment";
import { LuxuryProposal } from "@/types/proposal";
import { mockLuxuryProposal } from "../fixtures/proposals.fixture";
import { mockFixedService } from "../fixtures/services.fixture";
import { mockUncommittedQuoteAppointment } from "../fixtures/appointments.fixture";

describe("Milestone 2 Iteration 2 Challenger: Proposal Approval & Quote Conversion Stress Suite", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  // =========================================================================
  // 1. CONVERTING UNCOMMITTED QUOTE TO CONFIRMED BOOKING & CALENDAR VISIBILITY
  // =========================================================================

  it("IT2.1 - Single uncommitted quote linked by proposalId: should convert to confirmed with isUncommittedQuote: false", async () => {
    const quoteApt: Appointment = {
      ...mockUncommittedQuoteAppointment,
      id: "apt-quote-it2-01",
      date: "2026-11-28",
      startTime: "10:00",
      status: "uncommitted_quote",
      isUncommittedQuote: true,
      proposalId: "prop-it2-01",
    };
    SalonStore.saveAppointment(quoteApt);

    const proposal: LuxuryProposal = {
      ...mockLuxuryProposal,
      id: "prop-it2-01",
      schedulingDetails: {
        status: "accepted_original",
        originalDate: "2026-11-28",
        originalTime: "10:00",
      },
    };
    SalonStore.saveProposal(proposal);

    // Act
    await SupabaseDataService.approveProposal("prop-it2-01");

    // Assert
    const appointments = SalonStore.getAppointments();
    const converted = appointments.find((a) => a.id === "apt-quote-it2-01");

    expect(converted).toBeDefined();
    expect(converted?.status).toBe("confirmed");
    expect(converted?.paymentStatus).toBe("paid");
    expect(converted?.isUncommittedQuote).toBe(false);
  });

  it("IT2.2 - Calendar Visibility: should make converted quote visible across ALL calendar filters", async () => {
    const targetDate = "2026-11-28";
    const quoteApt: Appointment = {
      ...mockUncommittedQuoteAppointment,
      id: "apt-quote-cal-01",
      date: targetDate,
      startTime: "14:00",
      price: 350,
      status: "uncommitted_quote",
      isUncommittedQuote: true,
      proposalId: "prop-cal-01",
    };
    SalonStore.saveAppointment(quoteApt);

    const proposal: LuxuryProposal = {
      ...mockLuxuryProposal,
      id: "prop-cal-01",
      schedulingDetails: {
        status: "accepted_original",
        originalDate: targetDate,
        originalTime: "14:00",
      },
    };
    SalonStore.saveProposal(proposal);

    // 1. Prior to approval: Verify exclusion in all calendar filters
    let apts = SalonStore.getAppointments();

    // CalendarMasterView / DayOperationView / LinearTimelineMaster filter
    const calendarMasterFilter = (a: Appointment) =>
      a.date === targetDate &&
      a.status !== "cancelled" &&
      a.status !== "pending_proposal" &&
      a.status !== "uncommitted_quote" &&
      !a.isUncommittedQuote;

    // DayOperationView 14-day projection filter scoped to this appointment
    const futureRevenueFilter = (a: Appointment) =>
      a.id === "apt-quote-cal-01" && a.status === "confirmed" && !a.isUncommittedQuote;

    expect(apts.filter(calendarMasterFilter)).toHaveLength(0);
    expect(apts.filter(futureRevenueFilter)).toHaveLength(0);

    // 2. Act: Approve proposal
    await SupabaseDataService.approveProposal("prop-cal-01");

    // 3. Post-approval: Verify inclusion in all calendar views
    apts = SalonStore.getAppointments();

    const activeApts = apts.filter(calendarMasterFilter);
    expect(activeApts).toHaveLength(1);
    expect(activeApts[0].id).toBe("apt-quote-cal-01");
    expect(activeApts[0].isUncommittedQuote).toBe(false);

    const activeRevenue = activeApts.reduce((sum, a) => sum + a.price, 0);
    expect(activeRevenue).toBe(350);

    const futureApts = apts.filter(futureRevenueFilter);
    expect(futureApts).toHaveLength(1);
    expect(futureApts[0].id).toBe("apt-quote-cal-01");
  });

  it("IT2.3 - Slot Engine Blocking: should transition from non-blocking to blocking slot in calculateAvailableSlots", async () => {
    const targetDate = "2026-11-29";
    const profId = "prof-gleicy";

    const quoteApt: Appointment = {
      ...mockUncommittedQuoteAppointment,
      id: "apt-quote-slot-01",
      date: targetDate,
      startTime: "10:00",
      endTime: "11:30",
      status: "uncommitted_quote",
      isUncommittedQuote: true,
      proposalId: "prop-slot-01",
      stepBlocks: [
        {
          id: "step-blk-1",
          stepId: "step-1",
          stepTitle: "Procedimento",
          type: "active",
          startTime: "10:00",
          endTime: "11:30",
          durationMin: 90,
          isParallelSlotAllowed: false,
        },
      ],
    };
    SalonStore.saveAppointment(quoteApt);

    const proposal: LuxuryProposal = {
      ...mockLuxuryProposal,
      id: "prop-slot-01",
      schedulingDetails: {
        status: "accepted_original",
        originalDate: targetDate,
        originalTime: "10:00",
      },
    };
    SalonStore.saveProposal(proposal);

    // Prior to approval: 10:00 slot is AVAILABLE because quote is uncommitted
    let slots = calculateAvailableSlots(
      mockFixedService,
      targetDate,
      profId,
      SalonStore.getAppointments(),
      {
        openMinutes: 8 * 60,
        closeMinutes: 18 * 60,
        slotIntervalMinutes: 60,
        maxParallelInPause: 1,
      }
    );
    expect(slots.find((s) => s.time === "10:00")).toBeDefined();

    // Act: Approve proposal
    await SupabaseDataService.approveProposal("prop-slot-01");

    // Post-approval: 10:00 slot is BLOCKED because quote converted to confirmed
    slots = calculateAvailableSlots(
      mockFixedService,
      targetDate,
      profId,
      SalonStore.getAppointments(),
      {
        openMinutes: 8 * 60,
        closeMinutes: 18 * 60,
        slotIntervalMinutes: 60,
        maxParallelInPause: 1,
      }
    );
    expect(slots.find((s) => s.time === "10:00")).toBeUndefined();
  });

  it("IT2.4 - Linkage via triageSubmissionId: should convert quote when linked only by triageSubmissionId", async () => {
    const triageId = "triage-quote-it2-99";
    const quoteApt: Appointment = {
      ...mockUncommittedQuoteAppointment,
      id: "apt-quote-triage-99",
      date: "2026-11-26",
      startTime: "15:00",
      status: "uncommitted_quote",
      isUncommittedQuote: true,
      triageSubmissionId: triageId,
      proposalId: undefined, // Not yet linked
    };
    SalonStore.saveAppointment(quoteApt);

    const proposal: LuxuryProposal = {
      ...mockLuxuryProposal,
      id: "prop-triage-it2-99",
      triageSubmissionId: triageId,
      schedulingDetails: {
        status: "accepted_original",
        originalDate: "2026-11-26",
        originalTime: "15:00",
      },
    };
    SalonStore.saveProposal(proposal);

    await SupabaseDataService.approveProposal("prop-triage-it2-99");

    const apts = SalonStore.getAppointments();
    const converted = apts.find((a) => a.id === "apt-quote-triage-99");

    expect(converted).toBeDefined();
    expect(converted?.status).toBe("confirmed");
    expect(converted?.proposalId).toBe("prop-triage-it2-99");
    expect(converted?.isUncommittedQuote).toBe(false);
  });

  it("IT2.5 - Date and Time Override: should shift quote date/time and mark confirmed with isUncommittedQuote: false", async () => {
    const quoteApt: Appointment = {
      ...mockUncommittedQuoteAppointment,
      id: "apt-quote-resched-01",
      date: "2026-11-20",
      startTime: "09:00",
      status: "uncommitted_quote",
      isUncommittedQuote: true,
      proposalId: "prop-resched-01",
    };
    SalonStore.saveAppointment(quoteApt);

    const proposal: LuxuryProposal = {
      ...mockLuxuryProposal,
      id: "prop-resched-01",
      schedulingDetails: {
        status: "suggested_alternative",
        originalDate: "2026-11-20",
        originalTime: "09:00",
      },
    };
    SalonStore.saveProposal(proposal);

    // Client accepts alternative date & time
    await SupabaseDataService.approveProposal("prop-resched-01", {
      chosenDate: "2026-11-27",
      chosenTime: "16:00",
    });

    const apts = SalonStore.getAppointments();
    const converted = apts.find((a) => a.id === "apt-quote-resched-01");

    expect(converted).toBeDefined();
    expect(converted?.date).toBe("2026-11-27");
    expect(converted?.startTime).toBe("16:00");
    expect(converted?.status).toBe("confirmed");
    expect(converted?.isUncommittedQuote).toBe(false);

    // Old date has 0 appointments; New date has 1 appointment
    const oldDayApts = apts.filter(
      (a) => a.date === "2026-11-20" && a.status === "confirmed" && !a.isUncommittedQuote
    );
    const newDayApts = apts.filter(
      (a) => a.date === "2026-11-27" && a.status === "confirmed" && !a.isUncommittedQuote
    );
    expect(oldDayApts).toHaveLength(0);
    expect(newDayApts).toHaveLength(1);
  });

  // =========================================================================
  // 2. CONVERTING REGULAR PROPOSALS (NEVER CARRIES UNCOMMITTED STATUS)
  // =========================================================================

  it("IT2.6 - Regular Proposal Creation: newly created appointment must have isUncommittedQuote: false explicitly", async () => {
    const proposal: LuxuryProposal = {
      ...mockLuxuryProposal,
      id: "prop-fresh-regular-01",
      schedulingDetails: {
        status: "accepted_original",
        originalDate: "2026-12-01",
        originalTime: "11:00",
      },
    };
    SalonStore.saveProposal(proposal);

    await SupabaseDataService.approveProposal("prop-fresh-regular-01");

    const apts = SalonStore.getAppointments();
    const createdApt = apts.find((a) => a.proposalId === "prop-fresh-regular-01");

    expect(createdApt).toBeDefined();
    expect(createdApt?.status).toBe("confirmed");
    expect(createdApt?.isUncommittedQuote).toBe(false);
  });

  it("IT2.7 - Regular Proposal with technical steps: stepBlocks generated correctly with isUncommittedQuote: false", async () => {
    const proposal: LuxuryProposal = {
      ...mockLuxuryProposal,
      id: "prop-steps-regular-02",
      schedulingDetails: {
        status: "accepted_original",
        originalDate: "2026-12-02",
        originalTime: "09:00",
        totalDurationMin: 120,
        technicalSteps: [
          {
            id: "step-1",
            title: "Aplicação",
            type: "active",
            durationMin: 45,
          },
          {
            id: "step-2",
            title: "Pausa Térmica",
            type: "pause",
            durationMin: 30,
          },
          {
            id: "step-3",
            title: "Finalização",
            type: "active",
            durationMin: 45,
          },
        ],
      },
    };
    SalonStore.saveProposal(proposal);

    await SupabaseDataService.approveProposal("prop-steps-regular-02");

    const apts = SalonStore.getAppointments();
    const createdApt = apts.find((a) => a.proposalId === "prop-steps-regular-02");

    expect(createdApt).toBeDefined();
    expect(createdApt?.isUncommittedQuote).toBe(false);
    expect(createdApt?.stepBlocks).toHaveLength(3);
    expect(createdApt?.stepBlocks?.[1].isParallelSlotAllowed).toBe(true);
  });

  // =========================================================================
  // 3. REPEAT APPROVALS & IDEMPOTENCE
  // =========================================================================

  it("IT2.8 - Idempotence: duplicate consecutive calls to approveProposal do NOT create duplicate appointments", async () => {
    const quoteApt: Appointment = {
      ...mockUncommittedQuoteAppointment,
      id: "apt-quote-idem-01",
      date: "2026-12-03",
      startTime: "13:00",
      status: "uncommitted_quote",
      isUncommittedQuote: true,
      proposalId: "prop-idem-01",
    };
    SalonStore.saveAppointment(quoteApt);

    const proposal: LuxuryProposal = {
      ...mockLuxuryProposal,
      id: "prop-idem-01",
      schedulingDetails: {
        status: "accepted_original",
        originalDate: "2026-12-03",
        originalTime: "13:00",
      },
    };
    SalonStore.saveProposal(proposal);

    // Call approveProposal 3 times consecutively
    await SupabaseDataService.approveProposal("prop-idem-01");
    await SupabaseDataService.approveProposal("prop-idem-01");
    await SupabaseDataService.approveProposal("prop-idem-01");

    const apts = SalonStore.getAppointments();
    const matching = apts.filter((a) => a.proposalId === "prop-idem-01");

    expect(matching).toHaveLength(1);
    expect(matching[0].id).toBe("apt-quote-idem-01");
    expect(matching[0].status).toBe("confirmed");
    expect(matching[0].isUncommittedQuote).toBe(false);
  });

  it("IT2.9 - Concurrent Approvals: Promise.all calls to approveProposal resolve safely without duplicates", async () => {
    const quoteApt: Appointment = {
      ...mockUncommittedQuoteAppointment,
      id: "apt-quote-concurrent-01",
      date: "2026-12-04",
      startTime: "14:00",
      status: "uncommitted_quote",
      isUncommittedQuote: true,
      proposalId: "prop-concurrent-01",
    };
    SalonStore.saveAppointment(quoteApt);

    const proposal: LuxuryProposal = {
      ...mockLuxuryProposal,
      id: "prop-concurrent-01",
      schedulingDetails: {
        status: "accepted_original",
        originalDate: "2026-12-04",
        originalTime: "14:00",
      },
    };
    SalonStore.saveProposal(proposal);

    // Fire 5 concurrent approvals
    await Promise.all([
      SupabaseDataService.approveProposal("prop-concurrent-01"),
      SupabaseDataService.approveProposal("prop-concurrent-01"),
      SupabaseDataService.approveProposal("prop-concurrent-01"),
      SupabaseDataService.approveProposal("prop-concurrent-01"),
      SupabaseDataService.approveProposal("prop-concurrent-01"),
    ]);

    const apts = SalonStore.getAppointments();
    const matching = apts.filter((a) => a.proposalId === "prop-concurrent-01");

    expect(matching).toHaveLength(1);
    expect(matching[0].status).toBe("confirmed");
    expect(matching[0].isUncommittedQuote).toBe(false);
  });

  // =========================================================================
  // 4. BATCH CONVERSIONS & HIGH-SCALE ADVERSARIAL STRESS
  // =========================================================================

  it("IT2.10 - High Scale Batch: 30 quotes + 20 regular proposals + 20 unapproved quotes", async () => {
    const targetDate = "2026-12-10";
    const allQuotes: Appointment[] = [];
    const allProposals: LuxuryProposal[] = [];

    // Group 1: 30 Uncommitted Quotes linked to Proposals to be approved
    for (let i = 0; i < 30; i++) {
      const qId = `apt-batch-quote-${i}`;
      const pId = `prop-batch-quote-${i}`;
      allQuotes.push({
        ...mockUncommittedQuoteAppointment,
        id: qId,
        date: targetDate,
        startTime: `${String(8 + Math.floor(i / 4)).padStart(2, "0")}:${String((i % 4) * 15).padStart(2, "0")}`,
        status: "uncommitted_quote",
        isUncommittedQuote: true,
        proposalId: pId,
        price: 200 + i * 5,
      });
      allProposals.push({
        ...mockLuxuryProposal,
        id: pId,
        schedulingDetails: {
          status: "accepted_original",
          originalDate: targetDate,
          originalTime: "09:00",
        },
      });
    }

    // Group 2: 20 Regular Proposals (no prior quotes) to be approved
    for (let i = 0; i < 20; i++) {
      const pId = `prop-batch-regular-${i}`;
      allProposals.push({
        ...mockLuxuryProposal,
        id: pId,
        totalWithDiscount: 300,
        schedulingDetails: {
          status: "accepted_original",
          originalDate: targetDate,
          originalTime: "10:00",
        },
      });
    }

    // Group 3: 20 Uncommitted Quotes that are NOT approved (should remain quotes)
    for (let i = 0; i < 20; i++) {
      allQuotes.push({
        ...mockUncommittedQuoteAppointment,
        id: `apt-batch-unapproved-${i}`,
        date: targetDate,
        startTime: "15:00",
        status: "uncommitted_quote",
        isUncommittedQuote: true,
        price: 500,
      });
    }

    // Save all to store
    allQuotes.forEach((q) => SalonStore.saveAppointment(q));
    allProposals.forEach((p) => SalonStore.saveProposal(p));

    // Act: Approve all 30 quotes and 20 regular proposals
    for (let i = 0; i < 30; i++) {
      await SupabaseDataService.approveProposal(`prop-batch-quote-${i}`);
    }
    for (let i = 0; i < 20; i++) {
      await SupabaseDataService.approveProposal(`prop-batch-regular-${i}`);
    }

    // Assert:
    const appointments = SalonStore.getAppointments();

    // 1. All 30 converted quotes must have isUncommittedQuote: false and status: confirmed
    for (let i = 0; i < 30; i++) {
      const q = appointments.find((a) => a.id === `apt-batch-quote-${i}`);
      expect(q?.status).toBe("confirmed");
      expect(q?.isUncommittedQuote).toBe(false);
    }

    // 2. All 20 regular proposals must have created appointments with isUncommittedQuote: false
    for (let i = 0; i < 20; i++) {
      const regularApt = appointments.find((a) => a.proposalId === `prop-batch-regular-${i}`);
      expect(regularApt).toBeDefined();
      expect(regularApt?.status).toBe("confirmed");
      expect(regularApt?.isUncommittedQuote).toBe(false);
    }

    // 3. All 20 untouched quotes must still have isUncommittedQuote: true and status: uncommitted_quote
    for (let i = 0; i < 20; i++) {
      const unapproved = appointments.find((a) => a.id === `apt-batch-unapproved-${i}`);
      expect(unapproved?.status).toBe("uncommitted_quote");
      expect(unapproved?.isUncommittedQuote).toBe(true);
    }

    // 4. Calendar filter visibility: Exactly 50 appointments visible, 20 invisible
    const visibleCalendar = appointments.filter(
      (a) =>
        a.date === targetDate &&
        a.status !== "cancelled" &&
        a.status !== "pending_proposal" &&
        a.status !== "uncommitted_quote" &&
        !a.isUncommittedQuote
    );
    expect(visibleCalendar).toHaveLength(50);
  });

  // =========================================================================
  // 5. EDGE CASES & STORE PARITY
  // =========================================================================

  it("IT2.11 - Flag Anomaly Resilience: should normalize isUncommittedQuote: false if quote had status: confirmed with lingering isUncommittedQuote: true", async () => {
    // Inconsistent state before approval
    const anomalousApt: Appointment = {
      ...mockUncommittedQuoteAppointment,
      id: "apt-anomalous-01",
      date: "2026-12-15",
      startTime: "11:00",
      status: "pending_confirmation",
      isUncommittedQuote: true, // Lingering flag
      proposalId: "prop-anomalous-01",
    };
    SalonStore.saveAppointment(anomalousApt);

    const proposal: LuxuryProposal = {
      ...mockLuxuryProposal,
      id: "prop-anomalous-01",
      schedulingDetails: {
        status: "accepted_original",
        originalDate: "2026-12-15",
        originalTime: "11:00",
      },
    };
    SalonStore.saveProposal(proposal);

    await SupabaseDataService.approveProposal("prop-anomalous-01");

    const apts = SalonStore.getAppointments();
    const repaired = apts.find((a) => a.id === "apt-anomalous-01");

    expect(repaired?.status).toBe("confirmed");
    expect(repaired?.isUncommittedQuote).toBe(false);
  });

  it("IT2.12 - Store Parity: SalonStore.approveProposal directly resets isUncommittedQuote: false", () => {
    const quoteApt: Appointment = {
      ...mockUncommittedQuoteAppointment,
      id: "apt-direct-store-01",
      date: "2026-12-16",
      startTime: "12:00",
      status: "uncommitted_quote",
      isUncommittedQuote: true,
      proposalId: "prop-direct-store-01",
    };
    SalonStore.saveAppointment(quoteApt);

    const proposal: LuxuryProposal = {
      ...mockLuxuryProposal,
      id: "prop-direct-store-01",
      schedulingDetails: {
        status: "accepted_original",
        originalDate: "2026-12-16",
        originalTime: "12:00",
      },
    };
    SalonStore.saveProposal(proposal);

    SalonStore.approveProposal("prop-direct-store-01", {
      chosenDate: "2026-12-16",
      chosenTime: "12:00",
    });

    const apts = SalonStore.getAppointments();
    const converted = apts.find((a) => a.id === "apt-direct-store-01");

    expect(converted?.status).toBe("confirmed");
    expect(converted?.isUncommittedQuote).toBe(false);
  });

  it("IT2.13 - Missing / empty options: should preserve existing quote date/time and set isUncommittedQuote: false", async () => {
    const quoteApt: Appointment = {
      ...mockUncommittedQuoteAppointment,
      id: "apt-quote-empty-opt",
      date: "2026-12-18",
      startTime: "10:30",
      status: "uncommitted_quote",
      isUncommittedQuote: true,
      proposalId: "prop-empty-opt",
    };
    SalonStore.saveAppointment(quoteApt);

    const proposal: LuxuryProposal = {
      ...mockLuxuryProposal,
      id: "prop-empty-opt",
      schedulingDetails: {
        status: "accepted_original",
        originalDate: "2026-12-18",
        originalTime: "10:30",
      },
    };
    SalonStore.saveProposal(proposal);

    // Call approveProposal without options (undefined)
    await SupabaseDataService.approveProposal("prop-empty-opt");

    const apts = SalonStore.getAppointments();
    const converted = apts.find((a) => a.id === "apt-quote-empty-opt");

    expect(converted?.date).toBe("2026-12-18");
    expect(converted?.startTime).toBe("10:30");
    expect(converted?.status).toBe("confirmed");
    expect(converted?.isUncommittedQuote).toBe(false);
  });

  it("IT2.14 - Multiple Procedures Preservation: quote with multiple procedures retains all procedures and service title", async () => {
    const quoteApt: Appointment = {
      ...mockUncommittedQuoteAppointment,
      id: "apt-quote-multi-proc",
      date: "2026-12-19",
      startTime: "11:00",
      status: "uncommitted_quote",
      isUncommittedQuote: true,
      proposalId: "prop-multi-proc",
      procedures: [
        {
          id: "proc-1",
          serviceId: DEFAULT_SERVICE_ID,
          title: "Tratamento Reconstrutor",
          durationMin: 60,
          price: 250,
          isIncluded: true,
        },
        {
          id: "proc-2",
          serviceId: DEFAULT_SERVICE_ID,
          title: "Corte a Laser",
          durationMin: 30,
          price: 150,
          isIncluded: false,
        },
      ],
    };
    SalonStore.saveAppointment(quoteApt);

    const proposal: LuxuryProposal = {
      ...mockLuxuryProposal,
      id: "prop-multi-proc",
      items: [
        {
          id: "item-1",
          serviceTitle: "Tratamento Reconstrutor",
          originalPrice: 250,
          durationMin: 60,
          isIncluded: true,
        },
        {
          id: "item-2",
          serviceTitle: "Corte a Laser",
          originalPrice: 150,
          durationMin: 30,
          isIncluded: false,
        },
      ],
      schedulingDetails: {
        status: "accepted_original",
        originalDate: "2026-12-19",
        originalTime: "11:00",
      },
    };
    SalonStore.saveProposal(proposal);

    await SupabaseDataService.approveProposal("prop-multi-proc");

    const apts = SalonStore.getAppointments();
    const converted = apts.find((a) => a.id === "apt-quote-multi-proc");

    expect(converted?.status).toBe("confirmed");
    expect(converted?.isUncommittedQuote).toBe(false);
    expect(converted?.procedures).toHaveLength(2);
    expect(converted?.procedures?.[0].title).toBe("Tratamento Reconstrutor");
    expect(converted?.procedures?.[1].title).toBe("Corte a Laser");
  });

  it("IT2.15 - Subsequent Cancellation: converted appointment can be cancelled and is excluded from calendar", async () => {
    const quoteApt: Appointment = {
      ...mockUncommittedQuoteAppointment,
      id: "apt-quote-cancel-01",
      date: "2026-12-21",
      startTime: "14:00",
      status: "uncommitted_quote",
      isUncommittedQuote: true,
      proposalId: "prop-cancel-01",
    };
    SalonStore.saveAppointment(quoteApt);

    const proposal: LuxuryProposal = {
      ...mockLuxuryProposal,
      id: "prop-cancel-01",
      schedulingDetails: {
        status: "accepted_original",
        originalDate: "2026-12-21",
        originalTime: "14:00",
      },
    };
    SalonStore.saveProposal(proposal);

    // 1. Convert to confirmed
    await SupabaseDataService.approveProposal("prop-cancel-01");

    let apts = SalonStore.getAppointments();
    let converted = apts.find((a) => a.id === "apt-quote-cancel-01");
    expect(converted?.status).toBe("confirmed");
    expect(converted?.isUncommittedQuote).toBe(false);

    // 2. Client or admin cancels appointment
    converted!.status = "cancelled";
    SalonStore.saveAppointment(converted!);

    apts = SalonStore.getAppointments();
    const visibleCalendar = apts.filter(
      (a) =>
        a.date === "2026-12-21" &&
        a.status !== "cancelled" &&
        a.status !== "pending_proposal" &&
        a.status !== "uncommitted_quote" &&
        !a.isUncommittedQuote
    );

    expect(visibleCalendar.find((a) => a.id === "apt-quote-cancel-01")).toBeUndefined();
  });

  it("IT2.16 - Page.tsx Direct Booking Guard: handleConfirmDirectBooking defensive check blocks uncommitted quote banner", () => {
    // Simulates the page.tsx guard logic:
    // if (!apt.isUncommittedQuote && apt.status !== "uncommitted_quote") { setConfirmedAppointment(saved); }
    let confirmedModalTriggered = false;
    const mockSetConfirmedAppointment = (saved: Appointment) => {
      confirmedModalTriggered = true;
    };

    const handleConfirmDirectBookingSimulation = (apt: Appointment) => {
      if (!apt.isUncommittedQuote && apt.status !== "uncommitted_quote") {
        mockSetConfirmedAppointment(apt);
      }
    };

    // Uncommitted quote: must NOT trigger confirmed banner
    const quoteApt: Appointment = {
      ...mockUncommittedQuoteAppointment,
      status: "uncommitted_quote",
      isUncommittedQuote: true,
    };
    handleConfirmDirectBookingSimulation(quoteApt);
    expect(confirmedModalTriggered).toBe(false);

    // Converted / confirmed appointment: MUST trigger confirmed banner
    const confirmedApt: Appointment = {
      ...quoteApt,
      status: "confirmed",
      isUncommittedQuote: false,
    };
    handleConfirmDirectBookingSimulation(confirmedApt);
    expect(confirmedModalTriggered).toBe(true);
  });
});
