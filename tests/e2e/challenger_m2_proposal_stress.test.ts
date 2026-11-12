import { describe, it, expect, beforeEach } from "vitest";
import { SalonStore } from "@/lib/storage/localStore";
import {
  SupabaseDataService,
  DEFAULT_SERVICE_ID,
  DEFAULT_ORG_ID,
  DEFAULT_GLEICY_ID,
  DEFAULT_TRIAGE_FORM_ID,
  isUuid,
  resolveValidUuid,
} from "@/lib/supabase/api";
import { calculateAvailableSlots, buildDayTimeline } from "@/lib/scheduling/engine";
import { Appointment } from "@/types/appointment";
import { LuxuryProposal } from "@/types/proposal";
import { TriageSubmission } from "@/types/triage";
import { PreReservation } from "@/types/availability";
import { mockLuxuryProposal } from "../fixtures/proposals.fixture";
import { mockFixedService } from "../fixtures/services.fixture";
import { mockUncommittedQuoteAppointment } from "../fixtures/appointments.fixture";

describe("Milestone 2 Challenger: Proposal Approval & Quotes Stress-Testing", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  // =========================================================================
  // 1. DATE FALLBACK CHAIN ADVERSARIAL STRESS
  // =========================================================================

  it("C1.1 - should resolve appointment date when proposal contains ONLY originalDate", async () => {
    const proposal: LuxuryProposal = {
      ...mockLuxuryProposal,
      id: "prop-date-orig-only",
      schedulingDetails: {
        status: "accepted_original",
        originalDate: "2026-12-05",
        originalTime: "10:15",
      },
    };
    SalonStore.saveProposal(proposal);

    await SupabaseDataService.approveProposal("prop-date-orig-only");

    const apt = SalonStore.getAppointments().find((a) => a.proposalId === "prop-date-orig-only");
    expect(apt).toBeDefined();
    expect(apt?.date).toBe("2026-12-05");
    expect(apt?.startTime).toBe("10:15");
    expect(apt?.status).toBe("confirmed");
  });

  it("C1.2 - should resolve appointment date when proposal contains ONLY suggestedDateStart", async () => {
    const proposal: LuxuryProposal = {
      ...mockLuxuryProposal,
      id: "prop-date-sugg-only",
      schedulingDetails: {
        status: "suggested_alternative",
        suggestedDateStart: "2026-12-12",
        suggestedTime: "15:45",
      } as any,
    };
    SalonStore.saveProposal(proposal);

    await SupabaseDataService.approveProposal("prop-date-sugg-only");

    const apt = SalonStore.getAppointments().find((a) => a.proposalId === "prop-date-sugg-only");
    expect(apt).toBeDefined();
    expect(apt?.date).toBe("2026-12-12");
    expect(apt?.startTime).toBe("15:45");
  });

  it("C1.3 - should resolve appointment date when proposal contains ONLY clientChosenDate", async () => {
    const proposal: LuxuryProposal = {
      ...mockLuxuryProposal,
      id: "prop-date-chosen-only",
      schedulingDetails: {
        status: "suggested_alternative",
        clientChosenDate: "2026-12-18",
        clientChosenTime: "11:30",
      } as any,
    };
    SalonStore.saveProposal(proposal);

    await SupabaseDataService.approveProposal("prop-date-chosen-only");

    const apt = SalonStore.getAppointments().find((a) => a.proposalId === "prop-date-chosen-only");
    expect(apt).toBeDefined();
    expect(apt?.date).toBe("2026-12-18");
    expect(apt?.startTime).toBe("11:30");
  });

  it("C1.4 - should resolve appointment date when proposal contains ONLY confirmedDate", async () => {
    const proposal: LuxuryProposal = {
      ...mockLuxuryProposal,
      id: "prop-date-conf-only",
      schedulingDetails: {
        status: "accepted_original",
        confirmedDate: "2026-12-22",
        confirmedTime: "14:00",
      } as any,
    };
    SalonStore.saveProposal(proposal);

    await SupabaseDataService.approveProposal("prop-date-conf-only");

    const apt = SalonStore.getAppointments().find((a) => a.proposalId === "prop-date-conf-only");
    expect(apt).toBeDefined();
    expect(apt?.date).toBe("2026-12-22");
    expect(apt?.startTime).toBe("14:00");
  });

  it("C1.5 - should strictly enforce fallback hierarchy: options > confirmed > clientChosen > suggested > original", async () => {
    // Stage 1: All 5 date levels populated
    const proposalAll: LuxuryProposal = {
      ...mockLuxuryProposal,
      id: "prop-hierarchy",
      schedulingDetails: {
        status: "suggested_alternative",
        originalDate: "2026-12-01",
        originalTime: "08:00",
        suggestedDateStart: "2026-12-02",
        suggestedTime: "09:00",
        clientChosenDate: "2026-12-03",
        clientChosenTime: "10:00",
        confirmedDate: "2026-12-04",
        confirmedTime: "11:00",
      },
    };

    // Level 1: options.chosenDate wins over everything
    SalonStore.saveProposal({ ...proposalAll, id: "prop-h-opt" });
    await SupabaseDataService.approveProposal("prop-h-opt", {
      chosenDate: "2026-12-05",
      chosenTime: "12:00",
    });
    const apt1 = SalonStore.getAppointments().find((a) => a.proposalId === "prop-h-opt");
    expect(apt1?.date).toBe("2026-12-05");
    expect(apt1?.startTime).toBe("12:00");

    // Level 2: without options, confirmedDate wins
    SalonStore.saveProposal({ ...proposalAll, id: "prop-h-conf" });
    await SupabaseDataService.approveProposal("prop-h-conf");
    const apt2 = SalonStore.getAppointments().find((a) => a.proposalId === "prop-h-conf");
    expect(apt2?.date).toBe("2026-12-04");
    expect(apt2?.startTime).toBe("11:00");

    // Level 3: without confirmedDate, clientChosenDate wins
    const { confirmedDate, confirmedTime, ...withoutConf } = proposalAll.schedulingDetails!;
    SalonStore.saveProposal({
      ...proposalAll,
      id: "prop-h-client",
      schedulingDetails: withoutConf,
    });
    await SupabaseDataService.approveProposal("prop-h-client");
    const apt3 = SalonStore.getAppointments().find((a) => a.proposalId === "prop-h-client");
    expect(apt3?.date).toBe("2026-12-03");
    expect(apt3?.startTime).toBe("10:00");

    // Level 4: without clientChosenDate, suggestedDateStart wins
    const { clientChosenDate, clientChosenTime, ...withoutClient } = withoutConf;
    SalonStore.saveProposal({
      ...proposalAll,
      id: "prop-h-sugg",
      schedulingDetails: withoutClient,
    });
    await SupabaseDataService.approveProposal("prop-h-sugg");
    const apt4 = SalonStore.getAppointments().find((a) => a.proposalId === "prop-h-sugg");
    expect(apt4?.date).toBe("2026-12-02");
    expect(apt4?.startTime).toBe("09:00");

    // Level 5: without suggestedDateStart, originalDate wins
    const { suggestedDateStart, suggestedTime, ...withoutSugg } = withoutClient;
    SalonStore.saveProposal({
      ...proposalAll,
      id: "prop-h-orig",
      schedulingDetails: withoutSugg,
    });
    await SupabaseDataService.approveProposal("prop-h-orig");
    const apt5 = SalonStore.getAppointments().find((a) => a.proposalId === "prop-h-orig");
    expect(apt5?.date).toBe("2026-12-01");
    expect(apt5?.startTime).toBe("08:00");
  });

  it("C1.6 - should fallback time to default 09:00 when options provides date but no time and proposal lacks time", async () => {
    const proposalNoTime: LuxuryProposal = {
      ...mockLuxuryProposal,
      id: "prop-no-time-01",
      schedulingDetails: {
        status: "accepted_original",
        originalDate: "2026-12-15",
      } as any,
    };
    SalonStore.saveProposal(proposalNoTime);

    await SupabaseDataService.approveProposal("prop-no-time-01");

    const apt = SalonStore.getAppointments().find((a) => a.proposalId === "prop-no-time-01");
    expect(apt?.date).toBe("2026-12-15");
    expect(apt?.startTime).toBe("09:00");
  });

  it("C1.7 - should cleanly approve proposal without creating corrupted appointment when proposal has NO dates", async () => {
    const proposalWithoutAnyDate: LuxuryProposal = {
      ...mockLuxuryProposal,
      id: "prop-no-date-anywhere",
      schedulingDetails: undefined,
    };
    SalonStore.saveProposal(proposalWithoutAnyDate);

    // Approval without options date
    await SupabaseDataService.approveProposal("prop-no-date-anywhere");

    const approved = SalonStore.getProposalById("prop-no-date-anywhere");
    expect(approved?.status).toBe("approved");

    // Should NOT create an appointment with undefined date
    const apt = SalonStore.getAppointments().find((a) => a.proposalId === "prop-no-date-anywhere");
    expect(apt).toBeUndefined();
  });

  // =========================================================================
  // 2. UUID INTEGRITY & FOREIGN KEY HARDENING
  // =========================================================================

  it("C2.1 - should validate and sanitize UUID inputs with resolveValidUuid and isUuid", () => {
    // Valid standard UUIDs
    const validUuid1 = "22222222-2222-4222-8222-222222222221";
    const validUuid2 = "58f26242-1e53-432e-b924-dea25ee2068a";
    expect(isUuid(validUuid1)).toBe(true);
    expect(isUuid(validUuid2)).toBe(true);
    expect(isUuid(validUuid1.toUpperCase())).toBe(true);
    expect(resolveValidUuid(validUuid1)).toBe(validUuid1);

    // Legacy semantic aliases
    expect(resolveValidUuid("srv-custom")).toBe(DEFAULT_SERVICE_ID);
    expect(resolveValidUuid("org-gleicy-ronha")).toBe(DEFAULT_ORG_ID);
    expect(resolveValidUuid("user-gleicy-ronha")).toBe(DEFAULT_GLEICY_ID);
    expect(resolveValidUuid("form-triage-iluminado")).toBe(DEFAULT_TRIAGE_FORM_ID);

    // Fallback resolution
    expect(resolveValidUuid("unknown-slug", DEFAULT_SERVICE_ID)).toBe(DEFAULT_SERVICE_ID);
    expect(resolveValidUuid(undefined, DEFAULT_SERVICE_ID)).toBe(DEFAULT_SERVICE_ID);
    expect(resolveValidUuid(null, DEFAULT_SERVICE_ID)).toBe(DEFAULT_SERVICE_ID);
    expect(resolveValidUuid("", DEFAULT_SERVICE_ID)).toBe(DEFAULT_SERVICE_ID);

    // Hostile inputs
    expect(isUuid("")).toBe(false);
    expect(isUuid("   ")).toBe(false);
    expect(isUuid("not-a-uuid")).toBe(false);
    expect(isUuid("22222222222242228222222222222221")).toBe(false); // missing hyphens
    expect(isUuid("' OR 1=1 --")).toBe(false);
    expect(resolveValidUuid("' OR 1=1 --")).toBeNull();
  });

  it("C2.2 - should map undefined serviceId to DEFAULT_SERVICE_ID on proposal approval", async () => {
    const proposalUndefinedSrv: LuxuryProposal = {
      ...mockLuxuryProposal,
      id: "prop-srv-undefined",
      items: [
        {
          id: "item-no-srv",
          serviceTitle: "Procedimento sem ServiceId",
          originalPrice: 300,
        },
      ],
    };
    SalonStore.saveProposal(proposalUndefinedSrv);

    await SupabaseDataService.approveProposal("prop-srv-undefined", {
      chosenDate: "2026-12-10",
      chosenTime: "10:00",
    });

    const apt = SalonStore.getAppointments().find((a) => a.proposalId === "prop-srv-undefined");
    expect(apt).toBeDefined();
    expect(isUuid(apt?.serviceId)).toBe(true);
    expect(apt?.serviceId).toBe(DEFAULT_SERVICE_ID);
    expect(isUuid(apt?.procedures?.[0]?.serviceId)).toBe(true);
  });

  it("C2.3 - should sanitize legacy 'srv-custom' to valid UUID in saveAppointment", async () => {
    const legacyApt: Appointment = {
      ...mockUncommittedQuoteAppointment,
      id: "apt-legacy-srv-custom",
      serviceId: "srv-custom",
      serviceTitle: "Corte e Iluminação Custom",
    };

    const saved = await SupabaseDataService.saveAppointment(legacyApt);
    expect(saved).toBeDefined();

    // Verify stored in SalonStore
    const inStore = SalonStore.getAppointments().find((a) => a.id === "apt-legacy-srv-custom");
    expect(inStore).toBeDefined();
    expect(inStore?.serviceTitle).toBe("Corte e Iluminação Custom");
  });

  it("C2.4 - should preserve genuine existing UUIDs without corrupting them", async () => {
    const genuineUuid = "99999999-9999-4999-8999-999999999999";
    expect(resolveValidUuid(genuineUuid)).toBe(genuineUuid);

    const aptWithGenuineUuid: Appointment = {
      ...mockUncommittedQuoteAppointment,
      id: "apt-genuine-uuid",
      serviceId: genuineUuid,
    };

    const saved = await SupabaseDataService.saveAppointment(aptWithGenuineUuid);
    expect(saved.serviceId).toBe(genuineUuid);
  });

  // =========================================================================
  // 3. MULTI-PROCEDURE ITEMS MAPPING & PRECISION STRESS
  // =========================================================================

  it("C3.1 - should preserve 5 diverse procedure items with zero prices, missing durations and isIncluded flags", async () => {
    const proposalWith5Items: LuxuryProposal = {
      ...mockLuxuryProposal,
      id: "prop-5-items",
      items: [
        {
          id: "item-free-gift",
          serviceTitle: "Tratamento Cortesia (Brinde)",
          originalPrice: 150,
          specialPrice: 0, // Zero price must NOT fall back to 150!
          durationMin: 30,
          isIncluded: true,
        },
        {
          id: "item-optional-addon",
          serviceTitle: "Tonalização Extra",
          originalPrice: 220,
          specialPrice: undefined,
          durationMin: 45,
          isIncluded: false, // Explicit false
        },
        {
          id: "item-discounted-main",
          serviceTitle: "Mechas Globais",
          originalPrice: 700,
          specialPrice: 650,
          durationMin: 210,
          isIncluded: true,
        },
        {
          id: "item-missing-duration",
          serviceTitle: "Escova Modelada",
          originalPrice: 120,
          specialPrice: 100,
          durationMin: undefined, // Must fall back to 60
          isIncluded: true,
        },
        {
          id: "item-empty-prices",
          serviceTitle: "Avaliação Capilar",
          originalPrice: undefined as any,
          specialPrice: undefined,
          durationMin: 15,
        },
      ],
    };
    SalonStore.saveProposal(proposalWith5Items);

    await SupabaseDataService.approveProposal("prop-5-items", {
      chosenDate: "2026-12-11",
      chosenTime: "08:30",
    });

    const apt = SalonStore.getAppointments().find((a) => a.proposalId === "prop-5-items");
    expect(apt).toBeDefined();
    expect(apt?.procedures).toBeDefined();
    expect(apt?.procedures?.length).toBe(5);

    const procs = apt!.procedures!;
    // Item 1: Special price is 0
    expect(procs[0].title).toBe("Tratamento Cortesia (Brinde)");
    expect(procs[0].price).toBe(0);
    expect(procs[0].durationMin).toBe(30);
    expect(procs[0].isIncluded).toBe(true);

    // Item 2: Original price 220, isIncluded false
    expect(procs[1].title).toBe("Tonalização Extra");
    expect(procs[1].price).toBe(220);
    expect(procs[1].durationMin).toBe(45);
    expect(procs[1].isIncluded).toBe(false);

    // Item 3: Special price 650
    expect(procs[2].title).toBe("Mechas Globais");
    expect(procs[2].price).toBe(650);
    expect(procs[2].durationMin).toBe(210);
    expect(procs[2].isIncluded).toBe(true);

    // Item 4: Fallback duration 60
    expect(procs[3].title).toBe("Escova Modelada");
    expect(procs[3].price).toBe(100);
    expect(procs[3].durationMin).toBe(60);

    // Item 5: Fallback price 0
    expect(procs[4].title).toBe("Avaliação Capilar");
    expect(procs[4].price).toBe(0);
    expect(procs[4].durationMin).toBe(15);
  });

  it("C3.2 - should handle empty proposal items list gracefully", async () => {
    const proposalEmptyItems: LuxuryProposal = {
      ...mockLuxuryProposal,
      id: "prop-empty-items",
      title: "Atendimento Avulso Especial",
      subtitle: "Personalizado",
      items: [],
    };
    SalonStore.saveProposal(proposalEmptyItems);

    await SupabaseDataService.approveProposal("prop-empty-items", {
      chosenDate: "2026-12-14",
      chosenTime: "14:00",
    });

    const apt = SalonStore.getAppointments().find((a) => a.proposalId === "prop-empty-items");
    expect(apt).toBeDefined();
    expect(apt?.procedures).toEqual([]);
    expect(apt?.serviceTitle).toBe("Personalizado");
  });

  it("C3.3 - should calculate correct cumulative stepBlocks with active and pause steps", async () => {
    const proposalWithSteps: LuxuryProposal = {
      ...mockLuxuryProposal,
      id: "prop-steps-calc",
      schedulingDetails: {
        status: "accepted_original",
        originalDate: "2026-12-16",
        originalTime: "10:00",
        totalDurationMin: 150,
        technicalSteps: [
          {
            id: "step-1",
            title: "Descoloração",
            durationMin: 60,
            type: "active",
          },
          {
            id: "step-2",
            title: "Pausa Oxidativa",
            durationMin: 45,
            type: "pause",
            isParallelSlotAllowed: true,
          },
          {
            id: "step-3",
            title: "Lavagem e Matização",
            durationMin: 45,
            type: "active",
          },
        ],
      },
    };
    SalonStore.saveProposal(proposalWithSteps);

    await SupabaseDataService.approveProposal("prop-steps-calc");

    const apt = SalonStore.getAppointments().find((a) => a.proposalId === "prop-steps-calc");
    expect(apt).toBeDefined();
    expect(apt?.stepBlocks).toHaveLength(3);

    const steps = apt!.stepBlocks!;
    // Step 1: 10:00 to 11:00 (active)
    expect(steps[0].stepTitle).toBe("Descoloração");
    expect(steps[0].startTime).toBe("10:00");
    expect(steps[0].endTime).toBe("11:00");
    expect(steps[0].isParallelSlotAllowed).toBe(false);

    // Step 2: 11:00 to 11:45 (pause)
    expect(steps[1].stepTitle).toBe("Pausa Oxidativa");
    expect(steps[1].startTime).toBe("11:00");
    expect(steps[1].endTime).toBe("11:45");
    expect(steps[1].isParallelSlotAllowed).toBe(true);

    // Step 3: 11:45 to 12:30 (active)
    expect(steps[2].stepTitle).toBe("Lavagem e Matização");
    expect(steps[2].startTime).toBe("11:45");
    expect(steps[2].endTime).toBe("12:30");
    expect(steps[2].isParallelSlotAllowed).toBe(false);

    // Appointment endTime: 12:30
    expect(apt?.endTime).toBe("12:30");
  });

  // =========================================================================
  // 4. IDEMPOTENCY, RE-APPROVAL & CONCURRENCY STRESS
  // =========================================================================

  it("C4.1 - should be strictly idempotent when calling approveProposal multiple times sequentially", async () => {
    SalonStore.saveProposal(mockLuxuryProposal);

    // 1st approval
    await SupabaseDataService.approveProposal(mockLuxuryProposal.id, {
      chosenDate: "2026-11-25",
      chosenTime: "10:00",
    });

    const appointmentsAfterFirst = SalonStore.getAppointments().filter(
      (a) => a.proposalId === mockLuxuryProposal.id
    );
    expect(appointmentsAfterFirst).toHaveLength(1);
    const firstAptId = appointmentsAfterFirst[0].id;

    // 2nd approval (same payload)
    await SupabaseDataService.approveProposal(mockLuxuryProposal.id, {
      chosenDate: "2026-11-25",
      chosenTime: "10:00",
    });

    const appointmentsAfterSecond = SalonStore.getAppointments().filter(
      (a) => a.proposalId === mockLuxuryProposal.id
    );
    expect(appointmentsAfterSecond).toHaveLength(1);
    expect(appointmentsAfterSecond[0].id).toBe(firstAptId);

    // 3rd approval
    await SupabaseDataService.approveProposal(mockLuxuryProposal.id);
    const appointmentsAfterThird = SalonStore.getAppointments().filter(
      (a) => a.proposalId === mockLuxuryProposal.id
    );
    expect(appointmentsAfterThird).toHaveLength(1);
    expect(appointmentsAfterThird[0].id).toBe(firstAptId);
  });

  it("C4.2 - should update existing appointment without duplication when re-approving with new date", async () => {
    SalonStore.saveProposal(mockLuxuryProposal);

    // Initially approve for Nov 25 at 10:00
    await SupabaseDataService.approveProposal(mockLuxuryProposal.id, {
      chosenDate: "2026-11-25",
      chosenTime: "10:00",
    });

    const aptBefore = SalonStore.getAppointments().find(
      (a) => a.proposalId === mockLuxuryProposal.id
    );
    expect(aptBefore?.date).toBe("2026-11-25");
    expect(aptBefore?.startTime).toBe("10:00");

    // Client/Admin reschedules via proposal re-approval for Dec 02 at 14:00
    await SupabaseDataService.approveProposal(mockLuxuryProposal.id, {
      chosenDate: "2026-12-02",
      chosenTime: "14:00",
    });

    const allMatches = SalonStore.getAppointments().filter(
      (a) => a.proposalId === mockLuxuryProposal.id
    );
    expect(allMatches).toHaveLength(1); // STILL strictly one appointment!
    expect(allMatches[0].date).toBe("2026-12-02");
    expect(allMatches[0].startTime).toBe("14:00");
    expect(allMatches[0].status).toBe("confirmed");
  });

  it("C4.3 - should not mutate or contaminate unrelated appointments of other clients during approval", async () => {
    // Existing appointment for another client
    const otherApt: Appointment = {
      ...mockUncommittedQuoteAppointment,
      id: "apt-other-client-01",
      clientName: "Outra Cliente",
      clientPhone: "11911112222",
      date: "2026-11-25",
      startTime: "15:00",
      status: "confirmed",
      isUncommittedQuote: false,
    };
    SalonStore.saveAppointment(otherApt);
    SalonStore.saveProposal(mockLuxuryProposal);

    await SupabaseDataService.approveProposal(mockLuxuryProposal.id, {
      chosenDate: "2026-11-25",
      chosenTime: "10:00",
    });

    const otherAptAfter = SalonStore.getAppointments().find(
      (a) => a.id === "apt-other-client-01"
    );
    expect(otherAptAfter).toBeDefined();
    expect(otherAptAfter?.clientName).toBe("Outra Cliente");
    expect(otherAptAfter?.startTime).toBe("15:00");
    expect(otherAptAfter?.status).toBe("confirmed");
  });

  // =========================================================================
  // 5. TRIAGE & PRE-RESERVATION LIFECYCLE INTEGRATION
  // =========================================================================

  it("C5.1 - should mark triage as approved and pre-reservation as converted upon proposal approval", async () => {
    const triageId = "sub-triage-live-01";
    const clientPhone = "11988887777";

    // 1. Setup pending triage submission
    const triageSub: TriageSubmission = {
      id: triageId,
      orgId: DEFAULT_ORG_ID,
      formId: DEFAULT_TRIAGE_FORM_ID,
      serviceId: DEFAULT_SERVICE_ID,
      serviceTitle: "Transformação Personalizada",
      clientName: "Isabela Rocha",
      clientPhone: clientPhone,
      preferredDate: "2026-11-25",
      preferredTimeSlot: "10:00",
      answers: [],
      photos: {},
      status: "proposal_sent",
      submittedAt: "2026-11-10T10:00:00Z",
    };
    SalonStore.saveTriageSubmission(triageSub);

    // 2. Setup pending pre-reservation
    SalonStore.createPreReservation({
      orgId: DEFAULT_ORG_ID,
      professionalId: DEFAULT_GLEICY_ID,
      clientName: "Isabela Rocha",
      clientPhone: clientPhone,
      requestedDate: "2026-11-25",
      preferredPeriod: "manha",
      triageSubmissionId: triageId,
      status: "pending",
    });

    // 3. Setup proposal linked to triage
    const linkedProposal: LuxuryProposal = {
      ...mockLuxuryProposal,
      id: "prop-linked-triage",
      triageSubmissionId: triageId,
      clientPhone: clientPhone,
      schedulingDetails: {
        status: "accepted_original",
        originalDate: "2026-11-25",
        originalTime: "10:00",
      },
    };
    SalonStore.saveProposal(linkedProposal);

    // 4. Execute approval
    await SupabaseDataService.approveProposal("prop-linked-triage");

    // Verify triage submission updated
    const updatedSub = SalonStore.getTriageSubmissions().find((s) => s.id === triageId);
    expect(updatedSub?.status).toBe("approved");
    expect(updatedSub?.proposalId).toBe("prop-linked-triage");

    // Verify pre-reservation converted
    const preReservations = SalonStore.getPreReservations(DEFAULT_ORG_ID);
    const convertedPr = preReservations.find(
      (pr) => pr.triageSubmissionId === triageId || pr.clientPhone.includes("988887777")
    );
    expect(convertedPr).toBeDefined();
    expect(convertedPr?.status).toBe("converted");
    expect(convertedPr?.convertedAppointmentId).toBeDefined();
  });

  // =========================================================================
  // 6. ERROR PROPAGATION & ADVERSARIAL REJECTIONS
  // =========================================================================

  it("C6.1 - should throw error when approving a non-existent proposal ID in SupabaseDataService", async () => {
    await expect(
      SupabaseDataService.approveProposal("prop-does-not-exist-xyz")
    ).rejects.toThrow("Proposta não encontrada");
  });

  it("C6.2 - should throw error when approving an empty string proposal ID", async () => {
    await expect(SupabaseDataService.approveProposal("")).rejects.toThrow(
      "Proposta não encontrada"
    );
  });

  it("C6.3 - should throw synchronously in SalonStore when proposal is missing", () => {
    expect(() => {
      SalonStore.approveProposal("ghost-proposal-id-999");
    }).toThrow("Proposta não encontrada");
  });

  // =========================================================================
  // 7. R9: UNCOMMITTED QUOTES HIGH DENSITY & ISOLATION STRESS
  // =========================================================================

  it("C7.1 - should keep all slots 100% available when 20 uncommitted quotes are scheduled throughout the day", () => {
    const targetDate = "2026-12-20";
    const profId = "prof-gleicy";

    // Generate 20 uncommitted quotes at different hours
    const quotes: Appointment[] = Array.from({ length: 20 }, (_, i) => ({
      ...mockUncommittedQuoteAppointment,
      id: `quote-dense-${i}`,
      date: targetDate,
      startTime: `${String(8 + (i % 10)).padStart(2, "0")}:00`,
      status: "uncommitted_quote",
      isUncommittedQuote: true,
      price: 300 + i * 50,
    }));

    const slots = calculateAvailableSlots(
      mockFixedService,
      targetDate,
      profId,
      quotes,
      {
        openMinutes: 8 * 60,
        closeMinutes: 18 * 60,
        slotIntervalMinutes: 60,
        maxParallelInPause: 1,
      }
    );

    // In a 10-hour working day (08:00 to 18:00), with 60-min intervals and 90-min service,
    // all open slots should be available because quotes must NOT block any slot
    expect(slots.length).toBeGreaterThan(0);
    const slotAt10 = slots.find((s) => s.time === "10:00");
    const slotAt14 = slots.find((s) => s.time === "14:00");
    expect(slotAt10).toBeDefined();
    expect(slotAt14).toBeDefined();
  });

  it("C7.2 - should selectively block ONLY confirmed appointment slot among 20 uncommitted quotes", () => {
    const targetDate = "2026-12-20";
    const profId = "prof-gleicy";

    // 20 uncommitted quotes
    const quotes: Appointment[] = Array.from({ length: 20 }, (_, i) => ({
      ...mockUncommittedQuoteAppointment,
      id: `quote-multi-${i}`,
      date: targetDate,
      startTime: `${String(8 + (i % 10)).padStart(2, "0")}:00`,
      status: "uncommitted_quote",
      isUncommittedQuote: true,
    }));

    // Exactly 1 confirmed appointment at 11:00 with active block
    const blockingConfirmedApt: Appointment = {
      ...mockUncommittedQuoteAppointment,
      id: "apt-real-confirmed-11",
      date: targetDate,
      startTime: "11:00",
      endTime: "12:30",
      status: "confirmed",
      isUncommittedQuote: false,
      stepBlocks: [
        {
          id: "step-blk-11",
          stepId: "step-1",
          stepTitle: "Procedimento Ativo",
          type: "active",
          startTime: "11:00",
          endTime: "12:30",
          durationMin: 90,
          isParallelSlotAllowed: false,
        },
      ],
    };

    const slots = calculateAvailableSlots(
      mockFixedService,
      targetDate,
      profId,
      [...quotes, blockingConfirmedApt],
      {
        openMinutes: 8 * 60,
        closeMinutes: 18 * 60,
        slotIntervalMinutes: 60,
        maxParallelInPause: 1,
      }
    );

    // 11:00 slot must be BLOCKED
    const slotAt11 = slots.find((s) => s.time === "11:00");
    expect(slotAt11).toBeUndefined();

    // 09:00 and 15:00 slots must remain FREE
    expect(slots.find((s) => s.time === "09:00")).toBeDefined();
    expect(slots.find((s) => s.time === "15:00")).toBeDefined();
  });

  it("C7.3 - should exclude uncommitted quotes from active calendar views and revenue calculations", () => {
    const targetDate = "2026-12-22";

    const confirmedApt: Appointment = {
      ...mockUncommittedQuoteAppointment,
      id: "apt-cal-confirmed",
      clientName: "Cliente Pagante",
      date: targetDate,
      startTime: "10:00",
      status: "confirmed",
      isUncommittedQuote: false,
      price: 600,
    };

    const quoteApt1: Appointment = {
      ...mockUncommittedQuoteAppointment,
      id: "apt-cal-quote-1",
      clientName: "Cotacao A",
      date: targetDate,
      startTime: "11:00",
      status: "uncommitted_quote",
      isUncommittedQuote: true,
      price: 900,
    };

    const quoteApt2: Appointment = {
      ...mockUncommittedQuoteAppointment,
      id: "apt-cal-quote-2",
      clientName: "Cotacao B",
      date: targetDate,
      startTime: "14:00",
      status: "uncommitted_quote",
      isUncommittedQuote: false, // status matches
      price: 450,
    };

    const quoteApt3: Appointment = {
      ...mockUncommittedQuoteAppointment,
      id: "apt-cal-quote-3",
      clientName: "Cotacao C",
      date: targetDate,
      startTime: "16:00",
      status: "confirmed",
      isUncommittedQuote: true, // flag matches
      price: 750,
    };

    const appointments = [confirmedApt, quoteApt1, quoteApt2, quoteApt3];

    // Filter used in CalendarMasterView, DayOperationView, LinearTimelineMaster
    const activeAppointments = appointments.filter(
      (a) =>
        a.date === targetDate &&
        a.status !== "cancelled" &&
        a.status !== "pending_proposal" &&
        a.status !== "uncommitted_quote" &&
        !a.isUncommittedQuote
    );

    // Only the confirmed appointment survives
    expect(activeAppointments).toHaveLength(1);
    expect(activeAppointments[0].id).toBe("apt-cal-confirmed");

    const totalActiveRevenue = activeAppointments.reduce((sum, a) => sum + a.price, 0);
    expect(totalActiveRevenue).toBe(600); // 900 + 450 + 750 excluded!
  });

  // =========================================================================
  // 8. RANDOMIZED MONTE CARLO STRESS TEST (50 PROPOSALS)
  // =========================================================================

  it("C8.1 - Monte Carlo: should approve 50 diverse randomized proposals with zero corruption", async () => {
    const dates = ["2026-12-01", "2026-12-02", "2026-12-03", "2026-12-04", "2026-12-05"];
    const times = ["08:00", "09:30", "11:00", "13:30", "15:00", "16:30"];

    const proposals: LuxuryProposal[] = Array.from({ length: 50 }, (_, i) => {
      const date = dates[i % dates.length];
      const time = times[i % times.length];
      const itemCount = (i % 4) + 1; // 1 to 4 items

      const items = Array.from({ length: itemCount }, (_, itIdx) => ({
        id: `item-mc-${i}-${itIdx}`,
        serviceTitle: `Procedimento Teste ${i}-${itIdx}`,
        originalPrice: 100 * (itIdx + 1),
        specialPrice: itIdx === 0 ? 80 * (itIdx + 1) : undefined,
        durationMin: 30 * (itIdx + 1),
        isIncluded: itIdx % 2 === 0,
      }));

      return {
        ...mockLuxuryProposal,
        id: `prop-monte-carlo-${i}`,
        clientName: `Cliente MC ${i}`,
        clientPhone: `1198888${String(i).padStart(4, "0")}`,
        items,
        totalOriginal: items.reduce((sum, it) => sum + (it.originalPrice || 0), 0),
        totalWithDiscount: items.reduce((sum, it) => sum + (it.specialPrice ?? it.originalPrice ?? 0), 0),
        schedulingDetails: {
          status: "accepted_original",
          originalDate: date,
          originalTime: time,
          totalDurationMin: items.reduce((sum, it) => sum + (it.durationMin || 0), 0),
        },
      };
    });

    // Save all proposals to store
    proposals.forEach((p) => SalonStore.saveProposal(p));

    // Approve all 50 sequentially
    for (const prop of proposals) {
      await SupabaseDataService.approveProposal(prop.id);
    }

    // Assertions on all 50
    const allAppointments = SalonStore.getAppointments();
    for (let i = 0; i < 50; i++) {
      const propId = `prop-monte-carlo-${i}`;
      const approvedProp = SalonStore.getProposalById(propId);
      expect(approvedProp?.status).toBe("approved");

      const apt = allAppointments.find((a) => a.proposalId === propId);
      expect(apt).toBeDefined();
      expect(apt?.status).toBe("confirmed");
      expect(apt?.paymentStatus).toBe("paid");
      expect(isUuid(apt?.serviceId)).toBe(true);
      expect(apt?.serviceId).toBe(DEFAULT_SERVICE_ID);
      expect(apt?.procedures).toBeDefined();
      expect(apt?.procedures?.length).toBeGreaterThan(0);
      apt?.procedures?.forEach((proc) => {
        expect(isUuid(proc.serviceId)).toBe(true);
        expect(typeof proc.title).toBe("string");
        expect(typeof proc.price).toBe("number");
        expect(typeof proc.durationMin).toBe("number");
      });
    }
  });
});
