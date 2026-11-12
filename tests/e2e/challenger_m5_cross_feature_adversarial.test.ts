import { describe, it, expect, beforeEach } from "vitest";
import { SalonStore } from "@/lib/storage/localStore";
import { SupabaseDataService } from "@/lib/supabase/api";
import { buildDayTimeline, validateProposalScheduleFeasibility } from "@/lib/scheduling/engine";
import {
  calculateProceduresBill,
  calculateProceduresDuration,
} from "@/lib/appointments/billing";
import { groupAppointmentsChronologically } from "@/lib/appointments/accordions";
import {
  generateProposalAccessLink,
  generateProposalWhatsAppMessage,
} from "@/lib/proposals/sharing";
import { formatBRL, generateWhatsAppLink } from "@/lib/utils";
import { Appointment, AppointmentProcedureItem, ScheduledStepBlock } from "@/types/appointment";
import { LuxuryProposal, ProposalTechnicalStep } from "@/types/proposal";
import { TriageSubmission } from "@/types/triage";
import { ServiceItem } from "@/types/service";
import { mockManualProposal } from "../fixtures/proposals.fixture";

describe("Challenger M5: Cross-Feature Adversarial Stress & Integration Hardening", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  // =========================================================================
  // SCENARIO 1: Direct Triage Approval (R10) & Step Blocks / Pre-Reservation Collision
  // =========================================================================
  describe("Scenario 1: Direct Triage Approval, Step Blocks, Pre-Reservation & Collision Handling", () => {
    const multiStepService: ServiceItem = {
      id: "srv-mechas-com-pausa",
      orgId: "org-test-1",
      professionalId: "pro-gleicy-1",
      title: "Mechas Criativas com Pausa Ativa",
      slug: "mechas-criativas-pausa",
      category: "mechas",
      description: "Serviço com pausa química monitorada",
      price: 550,
      promotionalPrice: 480,
      requiresTriage: true,
      isActive: true,
      steps: [
        {
          id: "step-descoloracao",
          order: 1,
          title: "Aplicação e Descoloração",
          durationMin: 60,
          type: "active",
          requiresExclusiveAttention: true,
        },
        {
          id: "step-pausa-quimica",
          order: 2,
          title: "Tempo de Pausa Química",
          durationMin: 60,
          maxPauseDurationMin: 75,
          type: "pause",
          requiresExclusiveAttention: false,
        },
        {
          id: "step-lavatorio-glossing",
          order: 3,
          title: "Lavatório e Tonalização",
          durationMin: 45,
          type: "active",
          requiresExclusiveAttention: true,
        },
      ],
    };

    it("CH-CF-01: Direct triage approval computes step blocks sequentially and sets pause flags accurately", async () => {
      // 1. Setup pre-reservation and submission
      const preRes = SalonStore.createPreReservation({
        orgId: "org-test-1",
        professionalId: "pro-gleicy-1",
        serviceId: multiStepService.id,
        serviceName: multiStepService.title,
        clientName: "Mariana Albuquerque",
        clientPhone: "11999887766",
        requestedDate: "2026-11-20",
        preferredPeriod: "manha",
        status: "pending",
      });

      const submission: TriageSubmission = {
        id: "sub-mariana-01",
        orgId: "org-test-1",
        formId: "form-mechas",
        serviceId: multiStepService.id,
        serviceTitle: multiStepService.title,
        clientName: "Mariana Albuquerque",
        clientPhone: "11999887766",
        preferredDate: "2026-11-20",
        preferredTimeSlot: "09:00",
        preReservationId: preRes.id,
        status: "pending_review",
        answers: [],
        photos: {},
        submittedAt: new Date().toISOString(),
      };
      SalonStore.saveTriageSubmission(submission);

      // 2. Perform direct approval block calculation simulation
      const srv = multiStepService;
      const totalDuration = srv.steps.reduce((sum, s) => sum + s.durationMin, 0); // 60 + 60 + 45 = 165 min
      expect(totalDuration).toBe(165);

      const time = "09:00";
      const [h, m] = time.split(":").map(Number);
      const startMinutes = h * 60 + m; // 540 min
      const endMinutes = startMinutes + totalDuration; // 705 min = 11:45
      const endTimeStr = `${String(Math.floor(endMinutes / 60)).padStart(2, "0")}:${String(endMinutes % 60).padStart(2, "0")}`;
      expect(endTimeStr).toBe("11:45");

      let cursor = startMinutes;
      const blocks: ScheduledStepBlock[] = srv.steps.map((st) => {
        const stepStart = cursor;
        const stepEnd = cursor + st.durationMin;
        cursor = stepEnd;
        return {
          id: `blk-${st.id}`,
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

      // Verify block transitions
      expect(blocks[0].startTime).toBe("09:00");
      expect(blocks[0].endTime).toBe("10:00");
      expect(blocks[0].type).toBe("active");
      expect(blocks[0].isParallelSlotAllowed).toBe(false);

      expect(blocks[1].startTime).toBe("10:00");
      expect(blocks[1].endTime).toBe("11:00");
      expect(blocks[1].type).toBe("pause");
      expect(blocks[1].isParallelSlotAllowed).toBe(true);

      expect(blocks[2].startTime).toBe("11:00");
      expect(blocks[2].endTime).toBe("11:45");
      expect(blocks[2].type).toBe("active");
      expect(blocks[2].isParallelSlotAllowed).toBe(false);

      // 3. Persist appointment and convert pre-reservation
      const savedApt: Appointment = {
        id: "apt-approved-mariana",
        orgId: "org-test-1",
        professionalId: "pro-gleicy-1",
        professionalName: "Gleicy Ronha",
        serviceId: multiStepService.id,
        serviceTitle: multiStepService.title,
        clientName: submission.clientName,
        clientPhone: submission.clientPhone,
        date: "2026-11-20",
        startTime: time,
        endTime: endTimeStr,
        totalDurationMin: totalDuration,
        status: "confirmed",
        price: 480,
        paymentStatus: "pending",
        stepBlocks: blocks,
        triageSubmissionId: submission.id,
        createdAt: new Date().toISOString(),
      };

      await SupabaseDataService.saveAppointment(savedApt);
      await SupabaseDataService.approveTriageDirectly(submission.id);
      await SupabaseDataService.updatePreReservationStatus(
        submission.preReservationId!,
        "converted",
        undefined,
        savedApt.id
      );

      // 4. Verify DB/Store State
      const storedSub = SalonStore.getTriageSubmissions().find((s) => s.id === submission.id);
      expect(storedSub?.status).toBe("approved");

      const storedPreRes = SalonStore.getPreReservations("org-test-1").find((p) => p.id === preRes.id);
      expect(storedPreRes?.status).toBe("converted");
      expect(storedPreRes?.convertedAppointmentId).toBe("apt-approved-mariana");

      // 5. Collision verification:
      // Active step conflict
      const haircutSteps: ProposalTechnicalStep[] = [
        { id: "cut-1", title: "Corte", durationMin: 45, type: "active", isPrimordial: true },
      ];
      const conflictResult = validateProposalScheduleFeasibility({
        date: "2026-11-20",
        startTime: "09:15",
        technicalSteps: haircutSteps,
        existingAppointments: [savedApt],
      });
      expect(conflictResult.isFeasible).toBe(false);

      // Encaixe during chemical pause
      const encaixeSteps: ProposalTechnicalStep[] = [
        { id: "escova-1", title: "Escova Express", durationMin: 30, type: "active", isPrimordial: true },
      ];
      const encaixeResult = validateProposalScheduleFeasibility({
        date: "2026-11-20",
        startTime: "10:15",
        technicalSteps: encaixeSteps,
        existingAppointments: [savedApt],
      });
      expect(encaixeResult.isFeasible).toBe(true);
    });

    it("CH-CF-01B: handles existing pre-appointment update without creating duplicate appointments", async () => {
      // If a pending appointment already existed linked to triage submission
      const existingPreApt: Appointment = {
        id: "apt-pre-existing-01",
        orgId: "org-1",
        professionalId: "pro-1",
        professionalName: "Gleicy Ronha",
        serviceId: "srv-basic",
        serviceTitle: "Atendimento Inicial",
        clientName: "Juliana Santos",
        clientPhone: "11988880000",
        date: "2026-11-22",
        startTime: "14:00",
        endTime: "15:00",
        totalDurationMin: 60,
        status: "pending_confirmation",
        price: 150,
        triageSubmissionId: "sub-juliana-02",
        createdAt: new Date().toISOString(),
      };
      SalonStore.saveAppointment(existingPreApt);

      const submission: TriageSubmission = {
        id: "sub-juliana-02",
        orgId: "org-1",
        formId: "form-1",
        serviceId: "srv-basic",
        serviceTitle: "Atendimento Inicial",
        clientName: "Juliana Santos",
        clientPhone: "11988880000",
        status: "pending_review",
        answers: [],
        photos: {},
        submittedAt: new Date().toISOString(),
      };
      SalonStore.saveTriageSubmission(submission);

      // Call approveTriageDirectly
      const approvalResult = await SupabaseDataService.approveTriageDirectly("sub-juliana-02");
      expect(approvalResult).not.toBeNull();
      expect(approvalResult?.submission.status).toBe("approved");
      expect(approvalResult?.appointment?.status).toBe("confirmed");

      // Verify no duplicate appointments were created
      const allJulianaApts = SalonStore.getAppointments().filter((a) => a.clientPhone === "11988880000");
      expect(allJulianaApts).toHaveLength(1);
      expect(allJulianaApts[0].status).toBe("confirmed");
    });
  });

  // =========================================================================
  // SCENARIO 2: Uncommitted Quote (R9) Exclusion from Timeline & Revenue Views
  // =========================================================================
  describe("Scenario 2: Uncommitted Quote (R9) Absolute Exclusion from Schedule & Financial Views", () => {
    it("CH-CF-02: uncommitted quote does not occupy timeline, does not generate collisions, and is excluded from all revenues", () => {
      const regularApt: Appointment = {
        id: "apt-regular-client",
        orgId: "org-1",
        professionalId: "pro-1",
        professionalName: "Gleicy Ronha",
        serviceId: "srv-corte",
        serviceTitle: "Corte Bordado",
        clientName: "Renata Faria",
        clientPhone: "11988881111",
        date: "2026-11-25",
        startTime: "14:00",
        endTime: "15:00",
        totalDurationMin: 60,
        status: "confirmed",
        price: 180,
        createdAt: new Date().toISOString(),
      };

      const uncommittedQuoteApt: Appointment = {
        id: "apt-quote-heavy",
        orgId: "org-1",
        professionalId: "pro-1",
        professionalName: "Gleicy Ronha",
        serviceId: "srv-mechas-mega",
        serviceTitle: "Mega Hair & Mechas Luxo (Orçamento)",
        clientName: "Cliente Apenas Cotando",
        clientPhone: "11999990000",
        date: "2026-11-25",
        startTime: "14:00", // Exact same slot as Renata!
        endTime: "18:00",
        totalDurationMin: 240,
        status: "uncommitted_quote",
        isUncommittedQuote: true,
        price: 4500, // Very high price to detect any leakage in revenue
        createdAt: new Date().toISOString(),
      };

      const aptList = [regularApt, uncommittedQuoteApt];

      // 1. Scheduling Engine Timeline Verification
      const timelineBlocks = buildDayTimeline(aptList, "all", "2026-11-25");
      expect(timelineBlocks).toHaveLength(1);
      expect(timelineBlocks[0].appointmentId).toBe("apt-regular-client");
      expect(timelineBlocks.some((b) => b.appointmentId === "apt-quote-heavy")).toBe(false);

      // 2. Collision Test: Booking a new appointment at 15:30 (where the uncommitted quote would overlap)
      const slotCheck = validateProposalScheduleFeasibility({
        date: "2026-11-25",
        startTime: "15:30",
        technicalSteps: [{ id: "step-1", title: "Hidratação", durationMin: 60, type: "active", isPrimordial: true }],
        existingAppointments: aptList,
      });
      // Slot 15:30 is completely available because uncommittedQuote is ignored!
      expect(slotCheck.isFeasible).toBe(true);

      // 3. Calendar Accordion View Revenue Verification
      const validAppointments = aptList.filter(
        (a) =>
          a.status !== "cancelled" &&
          a.status !== "pending_proposal" &&
          a.status !== "uncommitted_quote" &&
          !a.isUncommittedQuote
      );
      expect(validAppointments).toHaveLength(1);

      const accordionGroups = groupAppointmentsChronologically(validAppointments);
      expect(accordionGroups).toHaveLength(1);
      expect(accordionGroups[0].count).toBe(1);
      // Revenue must be exactly R$ 180, not R$ 4680!
      expect(accordionGroups[0].totalRevenue).toBe(180);

      // 4. Day View Revenue Calculation Simulation
      const todayAppointments = aptList.filter(
        (a) =>
          a.date === "2026-11-25" &&
          a.status !== "cancelled" &&
          a.status !== "pending_proposal" &&
          a.status !== "uncommitted_quote" &&
          !a.isUncommittedQuote
      );
      const dayRevenue = todayAppointments.reduce((sum, a) => sum + a.price, 0);
      expect(dayRevenue).toBe(180);

      // 5. Pending Confirmations Check: uncommitted quotes must not trigger badge
      const pendingBadges = aptList.filter(
        (a) => a.status === "pending_confirmation" && !a.triageSubmissionId && !a.isUncommittedQuote
      );
      expect(pendingBadges).toHaveLength(0);
    });

    it("CH-CF-02B: converting uncommitted quote to confirmed activates timeline slot and includes in revenue", () => {
      const quote: Appointment = {
        id: "apt-quote-convertible",
        orgId: "org-1",
        professionalId: "pro-1",
        professionalName: "Gleicy Ronha",
        serviceTitle: "Protocolo Renovação",
        clientName: "Aline Castro",
        clientPhone: "11977771234",
        date: "2026-12-01",
        startTime: "10:00",
        endTime: "12:00",
        totalDurationMin: 120,
        status: "uncommitted_quote",
        isUncommittedQuote: true,
        price: 400,
        createdAt: new Date().toISOString(),
      };
      SalonStore.saveAppointment(quote);

      // Before conversion: 0 blocks in timeline
      expect(buildDayTimeline(SalonStore.getAppointments(), "all", "2026-12-01")).toHaveLength(0);

      // Convert quote to confirmed
      const confirmedApt: Appointment = {
        ...quote,
        status: "confirmed",
        isUncommittedQuote: false,
      };
      SalonStore.saveAppointment(confirmedApt);

      // After conversion: timeline block is active
      const timeline = buildDayTimeline(SalonStore.getAppointments(), "all", "2026-12-01");
      expect(timeline).toHaveLength(1);
      expect(timeline[0].appointmentId).toBe("apt-quote-convertible");

      // Revenue includes R$ 400
      const dayApts = SalonStore.getAppointments().filter(
        (a) => a.date === "2026-12-01" && a.status !== "uncommitted_quote" && !a.isUncommittedQuote
      );
      expect(dayApts.reduce((sum, a) => sum + a.price, 0)).toBe(400);
    });
  });

  // =========================================================================
  // SCENARIO 3: Client Phone Portal (/meus-agendamentos) Isolation
  // =========================================================================
  describe("Scenario 3: Client Phone Portal Cross-Client Isolation & Formatting Robustness", () => {
    it("CH-CF-03: isolates clients with same subscriber number in different DDDs (11 vs 21)", async () => {
      // Client 1: São Paulo (DDD 11)
      const clientSP_Apt: Appointment = {
        id: "apt-client-sp",
        orgId: "org-1",
        professionalId: "pro-1",
        professionalName: "Gleicy Ronha",
        serviceTitle: "Mechas São Paulo",
        clientName: "Paula São Paulo",
        clientPhone: "(11) 98765-4321",
        date: "2026-11-28",
        startTime: "10:00",
        endTime: "12:00",
        totalDurationMin: 120,
        status: "confirmed",
        price: 350,
        createdAt: new Date().toISOString(),
      };

      // Client 2: Rio de Janeiro (DDD 21 - identical subscriber number!)
      const clientRJ_Apt: Appointment = {
        id: "apt-client-rj",
        orgId: "org-1",
        professionalId: "pro-1",
        professionalName: "Gleicy Ronha",
        serviceTitle: "Mechas Rio",
        clientName: "Renata Rio",
        clientPhone: "(21) 98765-4321",
        date: "2026-11-29",
        startTime: "14:00",
        endTime: "16:00",
        totalDurationMin: 120,
        status: "confirmed",
        price: 400,
        createdAt: new Date().toISOString(),
      };

      // Client 3: International formatted SP number
      const clientSP_Prop: LuxuryProposal = {
        ...mockManualProposal,
        id: "prop-client-sp",
        clientName: "Paula São Paulo",
        clientPhone: "+55 (11) 98765-4321",
        title: "Proposta Personalizada SP",
        subtitle: "Tratamento Exclusivo",
        status: "sent",
        items: [],
        differentials: [],
        totalOriginal: 500,
        totalWithDiscount: 450,
        pixDiscountPercent: 5,
        pixTotal: 427.5,
        createdAt: new Date().toISOString(),
      };

      SalonStore.saveAppointment(clientSP_Apt);
      SalonStore.saveAppointment(clientRJ_Apt);
      SalonStore.saveProposal(clientSP_Prop);

      // Search DDD 11 with messy formatting: " +55 11 98765-4321 "
      const resultsSP_Apts = SalonStore.getAppointmentsByClientPhone(" +55 11 98765-4321 ");
      const resultsSP_Props = SalonStore.getProposalsByClientPhone(" +55 11 98765-4321 ");

      // MUST find SP appointment and proposal
      expect(resultsSP_Apts.some((a) => a.id === "apt-client-sp")).toBe(true);
      expect(resultsSP_Props.some((p) => p.id === "prop-client-sp")).toBe(true);

      // CRITICAL: MUST NOT leak RJ appointment to DDD 11 query!
      expect(resultsSP_Apts.some((a) => a.id === "apt-client-rj")).toBe(false);

      // Search DDD 21 with clean digits: "21987654321"
      const resultsRJ_Apts = SalonStore.getAppointmentsByClientPhone("21987654321");
      expect(resultsRJ_Apts.some((a) => a.id === "apt-client-rj")).toBe(true);
      expect(resultsRJ_Apts.some((a) => a.id === "apt-client-sp")).toBe(false);

      // Garbage search: empty or non-numeric query MUST return empty list
      expect(SalonStore.getAppointmentsByClientPhone("")).toHaveLength(0);
      expect(SalonStore.getAppointmentsByClientPhone("###---")).toHaveLength(0);
      expect(SalonStore.getProposalsByClientPhone("")).toHaveLength(0);
    });

    it("CH-CF-03B: prevents cross-leakage between adjacent numbers in same DDD (11988887777 vs 11988887778)", () => {
      const aptA: Appointment = {
        id: "apt-user-a",
        orgId: "org-1",
        professionalId: "pro-1",
        professionalName: "Gleicy Ronha",
        serviceTitle: "Corte A",
        clientName: "User A",
        clientPhone: "11988887777",
        date: "2026-12-02",
        startTime: "10:00",
        endTime: "11:00",
        totalDurationMin: 60,
        status: "confirmed",
        price: 150,
        createdAt: new Date().toISOString(),
      };

      const aptB: Appointment = {
        id: "apt-user-b",
        orgId: "org-1",
        professionalId: "pro-1",
        professionalName: "Gleicy Ronha",
        serviceTitle: "Corte B",
        clientName: "User B",
        clientPhone: "11988887778",
        date: "2026-12-02",
        startTime: "11:00",
        endTime: "12:00",
        totalDurationMin: 60,
        status: "confirmed",
        price: 150,
        createdAt: new Date().toISOString(),
      };

      SalonStore.saveAppointment(aptA);
      SalonStore.saveAppointment(aptB);

      const searchA = SalonStore.getAppointmentsByClientPhone("11988887777");
      expect(searchA.some((a) => a.id === "apt-user-a")).toBe(true);
      expect(searchA.some((a) => a.id === "apt-user-b")).toBe(false);

      const searchB = SalonStore.getAppointmentsByClientPhone("(11) 98888-7778");
      expect(searchB.some((a) => a.id === "apt-user-b")).toBe(true);
      expect(searchB.some((a) => a.id === "apt-user-a")).toBe(false);
    });
  });

  // =========================================================================
  // SCENARIO 4: Standalone Manual Proposal Creation (R7) Edge Cases
  // =========================================================================
  describe("Scenario 4: Standalone Manual Proposals, Instant Access Logging & WhatsApp Sharing", () => {
    it("CH-CF-04: creates autonomous proposal without triage, tracks first view idempotently, and formats WhatsApp sharing", async () => {
      // 1. Create Standalone Proposal
      const manualProp: LuxuryProposal = {
        ...mockManualProposal,
        id: "prop-manual-vip-001",
        orgId: "org-1",
        professionalId: "pro-gleicy-1",
        clientName: "Camila Guimarães",
        clientPhone: "(11) 99123-4567",
        clientEmail: "camila@vip.com",
        title: "Protocolo VIP Alisamento Orgânico",
        subtitle: "Reconstrução Térmica e Hidratação",
        status: "sent",
        items: [
          {
            id: "item-1",
            serviceTitle: "Alisamento Orgânico Taninoplastia",
            originalPrice: 650,
            serviceGroup: "Alisamentos",
            isIncluded: false,
          },
          {
            id: "item-2",
            serviceTitle: "Ampola Fusio-Dose Kérastase",
            originalPrice: 150,
            serviceGroup: "Tratamento",
            isIncluded: true, // Bonus/incluso item!
          },
        ],
        differentials: [
          { id: "diff-1", title: "Produtos Naturais", description: "100% livres de formol" },
          { id: "diff-2", title: "Secagem Rápida", description: "Menor tempo de calor" },
        ],
        totalOriginal: 800,
        totalWithDiscount: 650,
        pixDiscountPercent: 5,
        pixTotal: 617.5,
        schedulingDetails: {
          status: "accepted_original",
          originalDate: "2026-12-05",
          originalTime: "13:30",
          confirmedDate: "2026-12-05",
          confirmedTime: "13:30",
          clientChosenDate: "2026-12-05",
          clientChosenTime: "13:30",
          totalDurationMin: 180,
          technicalSteps: [],
        },
        firstViewedAt: undefined,
        createdAt: new Date().toISOString(),
      };

      SalonStore.saveProposal(manualProp);

      // 2. WhatsApp Sharing Link Generation
      const accessLink = generateProposalAccessLink(manualProp.id);
      expect(accessLink).toContain(`/proposta/${manualProp.id}`);

      const waMsg = generateProposalWhatsAppMessage(manualProp);
      expect(waMsg).toContain("Camila Guimarães");
      expect(waMsg).toContain("Protocolo VIP Alisamento Orgânico");
      expect(waMsg).toContain(formatBRL(650));
      expect(waMsg).toContain(accessLink);

      const waUrl = generateWhatsAppLink(manualProp.clientPhone, waMsg);
      expect(waUrl).toContain("https://wa.me/5511991234567");

      // 3. First Access Tracking Stress (idempotent, single timestamp)
      const propBefore = SalonStore.getProposalById(manualProp.id);
      expect(propBefore?.firstViewedAt).toBeUndefined();

      // Client opens link for the 1st time
      const viewedResult1 = SalonStore.recordProposalFirstView(manualProp.id);
      expect(viewedResult1).not.toBeNull();
      expect(viewedResult1?.firstViewedAt).toBeDefined();
      const firstTimestamp = viewedResult1!.firstViewedAt!;

      // Client refreshes link 10 times
      for (let i = 0; i < 10; i++) {
        const reView = SalonStore.recordProposalFirstView(manualProp.id);
        expect(reView?.firstViewedAt).toBe(firstTimestamp);
      }

      // 4. Client Approves Proposal -> Generates Confirmed Appointment without Triage
      await SupabaseDataService.approveProposal(manualProp.id, {
        chosenDate: "2026-12-05",
        chosenTime: "13:30",
      });

      const updatedProp = SalonStore.getProposalById(manualProp.id);
      expect(updatedProp?.status).toBe("approved");

      const apt = SalonStore.getAppointments().find((a) => a.proposalId === manualProp.id);
      expect(apt).toBeDefined();
      expect(apt?.status).toBe("confirmed");
      expect(apt?.clientName).toBe("Camila Guimarães");
      expect(apt?.date).toBe("2026-12-05");
      expect(apt?.startTime).toBe("13:30");
      expect(apt?.price).toBe(650);
    });

    it("CH-CF-04B: retrieves multiple proposals and appointments for client portal sorted by date", () => {
      const prop1: LuxuryProposal = {
        ...mockManualProposal,
        id: "prop-cli-multi-1",
        orgId: "org-1",
        professionalId: "pro-1",
        clientName: "Vanessa Lins",
        clientPhone: "11987659999",
        title: "Proposta Antiga",
        subtitle: "Novembro",
        status: "approved",
        items: [],
        differentials: [],
        totalOriginal: 300,
        totalWithDiscount: 300,
        createdAt: "2026-11-01T10:00:00Z",
      };

      const prop2: LuxuryProposal = {
        ...mockManualProposal,
        id: "prop-cli-multi-2",
        orgId: "org-1",
        professionalId: "pro-1",
        clientName: "Vanessa Lins",
        clientPhone: "11987659999",
        title: "Proposta Recente",
        subtitle: "Dezembro",
        status: "sent",
        items: [],
        differentials: [],
        totalOriginal: 500,
        totalWithDiscount: 500,
        createdAt: "2026-12-01T10:00:00Z",
      };

      SalonStore.saveProposal(prop1);
      SalonStore.saveProposal(prop2);

      const clientProposals = SalonStore.getProposalsByClientPhone("11987659999");
      expect(clientProposals).toHaveLength(2);
      expect(clientProposals.some((p) => p.id === "prop-cli-multi-1")).toBe(true);
      expect(clientProposals.some((p) => p.id === "prop-cli-multi-2")).toBe(true);
    });
  });

  // =========================================================================
  // SCENARIO 5: Multi-Procedure Builder (R8) Price Override vs Procedure Calculation
  // =========================================================================
  describe("Scenario 5: Multi-Procedure Builder Overridden Price vs Itemized Breakdown", () => {
    it("CH-CF-05: preserves overridden total price while retaining itemized procedure breakdown and durations", () => {
      const procedures: AppointmentProcedureItem[] = [
        {
          id: "proc-1",
          title: "Mechas Blonde Expert",
          durationMin: 120,
          price: 500,
          isIncluded: false,
        },
        {
          id: "proc-2",
          title: "Tratamento Reconstrutor SOS",
          durationMin: 30,
          price: 180,
          isIncluded: true, // Incluso como cortesia / avulso sem custo
        },
        {
          id: "proc-3",
          title: "Tonalização Personalizada",
          durationMin: 30,
          price: 150,
          isIncluded: false,
        },
      ];

      // 1. Test calculation engine functions
      const calculatedBill = calculateProceduresBill(procedures);
      // 500 + 0 (included) + 150 = 650
      expect(calculatedBill).toBe(650);

      const calculatedDuration = calculateProceduresDuration(procedures);
      // 120 + 30 + 30 = 180 min
      expect(calculatedDuration).toBe(180);

      // 2. Professional overrides final price to R$ 580 (e.g. customized package price)
      const overriddenPrice = 580;

      const multiApt: Appointment = {
        id: "apt-multi-override-1",
        orgId: "org-1",
        professionalId: "pro-1",
        professionalName: "Gleicy Ronha",
        serviceTitle: "Mechas Blonde Expert + Tratamento SOS + Tonalização",
        clientName: "Beatriz Nogueira",
        clientPhone: "11988887777",
        date: "2026-11-30",
        startTime: "14:00",
        endTime: "17:00",
        totalDurationMin: calculatedDuration,
        status: "confirmed",
        price: overriddenPrice,
        finalPrice: overriddenPrice,
        procedures: procedures,
        createdAt: new Date().toISOString(),
      };

      SalonStore.saveAppointment(multiApt);

      // 3. Verify retrieved appointment
      const saved = SalonStore.getAppointments().find((a) => a.id === "apt-multi-override-1");
      expect(saved).toBeDefined();
      expect(saved?.price).toBe(580);
      expect(saved?.finalPrice).toBe(580);
      expect(saved?.totalDurationMin).toBe(180);
      expect(saved?.procedures).toHaveLength(3);

      // Procedure 2 must remain marked as isIncluded: true
      expect(saved?.procedures![1].isIncluded).toBe(true);
      expect(saved?.procedures![1].price).toBe(180);

      // 4. Verify Accordions & Financial Aggregation uses overridden finalPrice
      const accordions = groupAppointmentsChronologically([saved!]);
      expect(accordions).toHaveLength(1);
      expect(accordions[0].totalRevenue).toBe(580); // Accurately reflects R$ 580, not 650 or 830!

      // 5. Client Portal (/meus-agendamentos) query check
      const clientApts = SalonStore.getAppointmentsByClientPhone("11988887777");
      expect(clientApts).toHaveLength(1);
      const clientViewApt = clientApts[0];
      expect(clientViewApt.price).toBe(580); // Displays Investimento Total: R$ 580,00
      expect(clientViewApt.procedures).toHaveLength(3);
      // Itemized view accurately tags proc-2 as included
      expect(clientViewApt.procedures![1].isIncluded).toBe(true);
    });

    it("CH-CF-05B: handles edge case where all procedures are marked as included with zero bill", () => {
      const allIncludedProcs: AppointmentProcedureItem[] = [
        { id: "p1", title: "Procedimento Cortesia 1", durationMin: 45, price: 100, isIncluded: true },
        { id: "p2", title: "Procedimento Cortesia 2", durationMin: 30, price: 80, isIncluded: true },
      ];

      expect(calculateProceduresBill(allIncludedProcs)).toBe(0);
      expect(calculateProceduresDuration(allIncludedProcs)).toBe(75);

      const complimentaryApt: Appointment = {
        id: "apt-complimentary-01",
        orgId: "org-1",
        professionalId: "pro-1",
        professionalName: "Gleicy Ronha",
        serviceTitle: "Cortesias",
        clientName: "Cliente Cortesia",
        clientPhone: "11999995555",
        date: "2026-12-03",
        startTime: "16:00",
        endTime: "17:15",
        totalDurationMin: 75,
        status: "confirmed",
        price: 0,
        finalPrice: 0,
        procedures: allIncludedProcs,
        createdAt: new Date().toISOString(),
      };

      const accordions = groupAppointmentsChronologically([complimentaryApt]);
      expect(accordions[0].totalRevenue).toBe(0);
      expect(accordions[0].count).toBe(1);
    });
  });
});
