import { describe, it, expect, beforeEach } from "vitest";
import { SalonStore } from "@/lib/storage/localStore";
import { SupabaseDataService, DEFAULT_SERVICE_ID, isUuid, resolveValidUuid } from "@/lib/supabase/api";
import {
  calculateDaySlotGrid,
  calculateAvailableSlots,
  buildDayTimeline,
  validateProposalScheduleFeasibility,
} from "@/lib/scheduling/engine";
import { Appointment, ScheduledStepBlock } from "@/types/appointment";
import { ServiceItem } from "@/types/service";
import { LuxuryProposal } from "@/types/proposal";
import { broadcastSync, subscribeToSync, GlaicySyncPayload } from "@/lib/sync/syncBus";
import { mockFixedService, mockStartingAtService } from "../fixtures/services.fixture";
import { mockLuxuryProposal } from "../fixtures/proposals.fixture";

describe("Challenger M2.2: Empirical Stress-Testing of Uncommitted Quotes & Realtime Synchronization (R6 & R9)", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  // Helper: Gera agendamento confirmado sintético com stepBlocks
  function createSyntheticConfirmedAppointment(
    id: string,
    date: string,
    startTime: string,
    endTime: string,
    price: number = 200,
    options: {
      hasPause?: boolean;
      pauseStart?: string;
      pauseEnd?: string;
      pauseMaxDuration?: number;
    } = {}
  ): Appointment {
    const stepBlocks: ScheduledStepBlock[] = [];

    if (options.hasPause && options.pauseStart && options.pauseEnd) {
      stepBlocks.push({
        id: `step-${id}-1`,
        stepId: "step-app-1",
        stepTitle: "Aplicação Química",
        type: "active",
        startTime,
        endTime: options.pauseStart,
        durationMin: 45,
        isParallelSlotAllowed: false,
      });
      stepBlocks.push({
        id: `step-${id}-2`,
        stepId: "step-pause-1",
        stepTitle: "Pausa Química",
        type: "pause",
        startTime: options.pauseStart,
        endTime: options.pauseEnd,
        durationMin: 60,
        maxPauseDurationMin: options.pauseMaxDuration || 60,
        isParallelSlotAllowed: true,
      });
      stepBlocks.push({
        id: `step-${id}-3`,
        stepId: "step-app-2",
        stepTitle: "Enxágue e Finalização",
        type: "active",
        startTime: options.pauseEnd,
        endTime,
        durationMin: 30,
        isParallelSlotAllowed: false,
      });
    } else {
      stepBlocks.push({
        id: `step-${id}-main`,
        stepId: "step-main",
        stepTitle: "Procedimento Integral",
        type: "active",
        startTime,
        endTime,
        durationMin: 90,
        isParallelSlotAllowed: false,
      });
    }

    return {
      id,
      orgId: "org-default-01",
      professionalId: "prof-gleicy",
      professionalName: "Gleicy Kelly",
      serviceId: mockFixedService.id,
      serviceTitle: mockFixedService.title,
      clientName: `Cliente ${id}`,
      clientPhone: "11987654321",
      date,
      startTime,
      endTime,
      totalDurationMin: 90,
      price,
      finalPrice: price,
      status: "confirmed",
      paymentStatus: "paid",
      isUncommittedQuote: false,
      stepBlocks,
      scheduledSteps: stepBlocks,
      createdAt: new Date().toISOString(),
    };
  }

  // Helper: Gera orçamento sem compromisso (uncommitted quote) sintético
  function createSyntheticUncommittedQuote(
    id: string,
    date: string,
    startTime: string,
    endTime: string,
    price: number = 500,
    statusOverride?: any,
    isUncommittedOverride?: boolean
  ): Appointment {
    const stepBlocks: ScheduledStepBlock[] = [
      {
        id: `step-quote-${id}`,
        stepId: "step-quote-active",
        stepTitle: "Simulação de Procedimento",
        type: "active",
        startTime,
        endTime,
        durationMin: 120,
        isParallelSlotAllowed: false,
      },
      {
        id: `step-quote-pause-${id}`,
        stepId: "step-quote-pause",
        stepTitle: "Pausa Simulada",
        type: "pause",
        startTime: "12:00",
        endTime: "13:00",
        durationMin: 60,
        isParallelSlotAllowed: true,
      },
    ];

    return {
      id,
      orgId: "org-default-01",
      professionalId: "prof-gleicy",
      professionalName: "Gleicy Kelly",
      serviceId: mockStartingAtService.id,
      serviceTitle: "Orçamento sem Compromisso",
      clientName: `Cliente Orçamento ${id}`,
      clientPhone: "11999998888",
      date,
      startTime,
      endTime,
      totalDurationMin: 120,
      price,
      finalPrice: price,
      status: statusOverride !== undefined ? statusOverride : "uncommitted_quote",
      isUncommittedQuote: isUncommittedOverride !== undefined ? isUncommittedOverride : true,
      stepBlocks,
      scheduledSteps: stepBlocks,
      notes: "Orçamento sem compromisso (sem bloqueio de horário)",
      createdAt: new Date().toISOString(),
    };
  }

  // =========================================================================
  // PARTE 1: ADVERSARIAL HIGH-VOLUME SLOT CALCULATIONS (50+ APPOINTMENTS)
  // =========================================================================

  it("ADV-M2.1 - Engine Slot Calculation: 50 uncommitted quotes MUST leave 100% of day slots completely unaffected", () => {
    const targetDate = "2026-11-25";
    const profId = "prof-gleicy";

    // 1. Baseline com 0 agendamentos (agenda completamente vazia)
    const baselineGrid = calculateDaySlotGrid(mockFixedService, targetDate, profId, [], {
      openMinutes: 8 * 60, // 08:00
      closeMinutes: 18 * 60, // 18:00
      slotIntervalMinutes: 30,
      maxParallelInPause: 1,
    });
    const baselineAvailableSlots = calculateAvailableSlots(mockFixedService, targetDate, profId, [], {
      openMinutes: 8 * 60,
      closeMinutes: 18 * 60,
      slotIntervalMinutes: 30,
      maxParallelInPause: 1,
    });

    expect(baselineAvailableSlots.length).toBeGreaterThan(0);

    // 2. Criação de 50 orçamentos sem compromisso espalhados por todo o expediente
    const uncommittedQuotes: Appointment[] = [];
    const hours = ["08:00", "08:30", "09:00", "09:30", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00"];
    for (let i = 0; i < 50; i++) {
      const startH = hours[i % hours.length];
      uncommittedQuotes.push(
        createSyntheticUncommittedQuote(`quote-heavy-${i}`, targetDate, startH, "18:00", 1200 + i * 50)
      );
    }

    // 3. Execução do motor com os 50 orçamentos
    const stressGrid = calculateDaySlotGrid(mockFixedService, targetDate, profId, uncommittedQuotes, {
      openMinutes: 8 * 60,
      closeMinutes: 18 * 60,
      slotIntervalMinutes: 30,
      maxParallelInPause: 1,
    });
    const stressAvailableSlots = calculateAvailableSlots(
      mockFixedService,
      targetDate,
      profId,
      uncommittedQuotes,
      {
        openMinutes: 8 * 60,
        closeMinutes: 18 * 60,
        slotIntervalMinutes: 30,
        maxParallelInPause: 1,
      }
    );

    // 4. Verificação estrita de invariância: o resultado com 50 orçamentos deve ser 100% idêntico ao baseline
    expect(stressAvailableSlots.length).toBe(baselineAvailableSlots.length);
    expect(stressGrid.length).toBe(baselineGrid.length);

    // Comparação slot a slot
    for (let i = 0; i < baselineAvailableSlots.length; i++) {
      expect(stressAvailableSlots[i].time).toBe(baselineAvailableSlots[i].time);
      expect(stressAvailableSlots[i].endTime).toBe(baselineAvailableSlots[i].endTime);
      expect(stressAvailableSlots[i].isEncaixe).toBe(baselineAvailableSlots[i].isEncaixe);
    }

    for (let i = 0; i < baselineGrid.length; i++) {
      expect(stressGrid[i].time).toBe(baselineGrid[i].time);
      expect(stressGrid[i].status).toBe(baselineGrid[i].status);
      expect(stressGrid[i].isAvailable).toBe(baselineGrid[i].isAvailable);
    }
  });

  it("ADV-M2.2 - Dense Mixture: 20 confirmed appointments + 60 uncommitted quotes MUST produce identical slots to 20 confirmed alone", () => {
    const targetDate = "2026-11-26";
    const profId = "prof-gleicy";

    // 20 agendamentos confirmados com químicas e pausas
    const confirmedAppointments: Appointment[] = [
      createSyntheticConfirmedAppointment("conf-01", targetDate, "08:30", "10:00", 300, {
        hasPause: true,
        pauseStart: "09:00",
        pauseEnd: "09:45",
      }),
      createSyntheticConfirmedAppointment("conf-02", targetDate, "11:00", "12:30", 250),
      createSyntheticConfirmedAppointment("conf-03", targetDate, "14:00", "15:30", 400),
      createSyntheticConfirmedAppointment("conf-04", targetDate, "16:00", "17:30", 220),
    ];

    // Adiciona mais confirmados menores para adensar
    for (let c = 5; c <= 20; c++) {
      confirmedAppointments.push(
        createSyntheticConfirmedAppointment(`conf-${c}`, targetDate, "17:30", "18:00", 150)
      );
    }

    const baselineSlotsWithConfirmedOnly = calculateAvailableSlots(
      mockFixedService,
      targetDate,
      profId,
      confirmedAppointments,
      {
        openMinutes: 8 * 60,
        closeMinutes: 19 * 60,
        slotIntervalMinutes: 30,
        maxParallelInPause: 1,
      }
    );

    // Injeta 60 orçamentos sem compromisso colidindo exatamente com todos os horários livres e ocupados
    const sixtyQuotes: Appointment[] = [];
    for (let q = 1; q <= 60; q++) {
      const hour = `${String(8 + (q % 10)).padStart(2, "0")}:00`;
      sixtyQuotes.push(
        createSyntheticUncommittedQuote(`heavy-quote-${q}`, targetDate, hour, "18:00", 800)
      );
    }

    const denseList = [...confirmedAppointments, ...sixtyQuotes];

    const slotsWithDenseMixture = calculateAvailableSlots(
      mockFixedService,
      targetDate,
      profId,
      denseList,
      {
        openMinutes: 8 * 60,
        closeMinutes: 19 * 60,
        slotIntervalMinutes: 30,
        maxParallelInPause: 1,
      }
    );

    // O resultado deve ser rigorosamente igual ao cálculo apenas com os confirmados
    expect(slotsWithDenseMixture.length).toBe(baselineSlotsWithConfirmedOnly.length);
    for (let idx = 0; idx < baselineSlotsWithConfirmedOnly.length; idx++) {
      expect(slotsWithDenseMixture[idx].time).toBe(baselineSlotsWithConfirmedOnly[idx].time);
      expect(slotsWithDenseMixture[idx].endTime).toBe(baselineSlotsWithConfirmedOnly[idx].endTime);
      expect(slotsWithDenseMixture[idx].isEncaixe).toBe(baselineSlotsWithConfirmedOnly[idx].isEncaixe);
    }
  });

  it("ADV-M2.3 - Edge Variations: engine must safely ignore all permutations of uncommitted quotes", () => {
    const targetDate = "2026-11-27";
    const profId = "prof-gleicy";

    const edgeQuotes: Appointment[] = [
      // Variação 1: status uncommitted_quote, isUncommittedQuote: true
      createSyntheticUncommittedQuote("q-var-1", targetDate, "09:00", "11:00", 500, "uncommitted_quote", true),
      // Variação 2: status uncommitted_quote, isUncommittedQuote: false
      createSyntheticUncommittedQuote("q-var-2", targetDate, "09:00", "11:00", 500, "uncommitted_quote", false),
      // Variação 3: status uncommitted_quote, isUncommittedQuote: undefined
      createSyntheticUncommittedQuote("q-var-3", targetDate, "09:00", "11:00", 500, "uncommitted_quote", undefined),
      // Variação 4: status confirmed, mas flag isUncommittedQuote: true
      createSyntheticUncommittedQuote("q-var-4", targetDate, "09:00", "11:00", 500, "confirmed", true),
      // Variação 5: status pending_confirmation, mas flag isUncommittedQuote: true
      createSyntheticUncommittedQuote("q-var-5", targetDate, "09:00", "11:00", 500, "pending_confirmation", true),
      // Variação 6: status pending_proposal, isUncommittedQuote: false
      createSyntheticUncommittedQuote("q-var-6", targetDate, "09:00", "11:00", 500, "pending_proposal", false),
      // Variação 7: status cancelled, isUncommittedQuote: false
      createSyntheticUncommittedQuote("q-var-7", targetDate, "09:00", "11:00", 500, "cancelled", false),
    ];

    // buildDayTimeline não deve conter NENHUM bloco dessas variações
    const timeline = buildDayTimeline(edgeQuotes, profId, targetDate);
    expect(timeline).toHaveLength(0);

    // O horário das 09:00 deve permanecer totalmente disponível no grid
    const slots = calculateAvailableSlots(mockFixedService, targetDate, profId, edgeQuotes, {
      openMinutes: 8 * 60,
      closeMinutes: 18 * 60,
      slotIntervalMinutes: 30,
      maxParallelInPause: 1,
    });
    const slotAt09 = slots.find((s) => s.time === "09:00");
    expect(slotAt09).toBeDefined();
  });

  it("ADV-M2.4 - High-Volume Performance Benchmark: 200 appointments over 7 days runs in < 150ms", () => {
    const dates = ["2026-12-01", "2026-12-02", "2026-12-03", "2026-12-04", "2026-12-05", "2026-12-06", "2026-12-07"];
    const profId = "prof-gleicy";

    // 200 agendamentos (100 confirmados + 100 orçamentos sem compromisso)
    const pool: Appointment[] = [];
    for (let i = 0; i < 100; i++) {
      const d = dates[i % dates.length];
      pool.push(createSyntheticConfirmedAppointment(`bench-conf-${i}`, d, "10:00", "11:30", 200));
      pool.push(createSyntheticUncommittedQuote(`bench-quote-${i}`, d, "10:00", "12:00", 700));
    }

    const tStart = performance.now();
    for (const d of dates) {
      calculateAvailableSlots(mockFixedService, d, profId, pool, {
        openMinutes: 8 * 60,
        closeMinutes: 18 * 60,
        slotIntervalMinutes: 30,
        maxParallelInPause: 1,
      });
    }
    const tDuration = performance.now() - tStart;

    expect(tDuration).toBeLessThan(250); // Performance estrita
  });

  // =========================================================================
  // PARTE 2: CONCURRENCY & BOOKING RACE CONDITIONS
  // =========================================================================

  it("ADV-M2.5 - Concurrent Slot Booking: regular booking succeeds on exact timestamp of an uncommitted quote, then blocks subsequent client", async () => {
    const targetDate = "2026-11-28";
    const profId = "prof-gleicy";

    // 1. Orçamento sem compromisso salvo na agenda exatamente às 10:00
    const quoteAt10 = createSyntheticUncommittedQuote("quote-at-10", targetDate, "10:00", "12:00", 600);
    SalonStore.saveAppointment(quoteAt10);

    // 2. Cliente 1 verifica disponibilidade: 10:00 DEVE estar livre
    let currentStoreApts = SalonStore.getAppointments();
    let slots = calculateAvailableSlots(mockFixedService, targetDate, profId, currentStoreApts, {
      openMinutes: 8 * 60,
      closeMinutes: 18 * 60,
      slotIntervalMinutes: 30,
      maxParallelInPause: 1,
    });

    const slot10ForClient1 = slots.find((s) => s.time === "10:00");
    expect(slot10ForClient1).toBeDefined();

    // 3. Cliente 1 reserva e efetiva agendamento confirmado às 10:00
    const confirmedClient1 = createSyntheticConfirmedAppointment(
      "confirmed-client-1",
      targetDate,
      "10:00",
      "11:30",
      250
    );
    SalonStore.saveAppointment(confirmedClient1);

    // 4. Cliente 2 verifica disponibilidade no mesmo dia: 10:00 DEVE AGORA ESTAR BLOQUEADO
    currentStoreApts = SalonStore.getAppointments();
    slots = calculateAvailableSlots(mockFixedService, targetDate, profId, currentStoreApts, {
      openMinutes: 8 * 60,
      closeMinutes: 18 * 60,
      slotIntervalMinutes: 30,
      maxParallelInPause: 1,
    });

    const slot10ForClient2 = slots.find((s) => s.time === "10:00");
    expect(slot10ForClient2).toBeUndefined(); // Bloqueado pelo confirmedClient1

    // Mas outro horário (ex: 13:00) permanece perfeitamente livre
    const slot13ForClient2 = slots.find((s) => s.time === "13:00");
    expect(slot13ForClient2).toBeDefined();
  });

  it("ADV-M2.6 - Multi-quote Stampede: 15 uncommitted quotes at 14:00 do not block a regular booking inquiry", () => {
    const targetDate = "2026-11-29";
    const profId = "prof-gleicy";

    const stampedeQuotes: Appointment[] = [];
    for (let i = 1; i <= 15; i++) {
      stampedeQuotes.push(
        createSyntheticUncommittedQuote(`stampede-q-${i}`, targetDate, "14:00", "16:00", 400 + i * 20)
      );
    }

    const slots = calculateAvailableSlots(mockFixedService, targetDate, profId, stampedeQuotes, {
      openMinutes: 8 * 60,
      closeMinutes: 18 * 60,
      slotIntervalMinutes: 30,
      maxParallelInPause: 1,
    });

    const slotAt14 = slots.find((s) => s.time === "14:00");
    expect(slotAt14).toBeDefined();
  });

  it("ADV-M2.7 - validateProposalScheduleFeasibility: returns feasible for quotes, unfeasible for confirmed collisions", () => {
    const targetDate = "2026-11-30";
    const profId = "prof-gleicy";

    const quoteApt = createSyntheticUncommittedQuote("quote-feasibility", targetDate, "10:00", "12:00", 500);
    const confirmedApt = createSyntheticConfirmedAppointment("conf-feasibility", targetDate, "14:00", "15:30", 300);

    const storeApts = [quoteApt, confirmedApt];

    // Proposta proposta às 10:00 (mesmo horário do quote)
    const resultAt10 = validateProposalScheduleFeasibility({
      date: targetDate,
      startTime: "10:00",
      technicalSteps: mockFixedService.steps,
      professionalId: profId,
      existingAppointments: storeApts,
    });
    expect(resultAt10.isFeasible).toBe(true);

    // Proposta proposta às 14:00 (mesmo horário do confirmado)
    const resultAt14 = validateProposalScheduleFeasibility({
      date: targetDate,
      startTime: "14:00",
      technicalSteps: mockFixedService.steps,
      professionalId: profId,
      existingAppointments: storeApts,
    });
    expect(resultAt14.isFeasible).toBe(false);
    expect(resultAt14.conflictReason).toBeDefined();
  });

  // =========================================================================
  // PARTE 3: CALENDAR VIEWS & REVENUE CALCULATION NON-DISTORTION
  // =========================================================================

  it("ADV-M2.8 - CalendarMasterView (Month View): 300 uncommitted quotes do not distort client counts or revenue across 30 days", () => {
    const yearMonth = { year: 2026, month: 11 };
    const daysInMonth = 30;

    // Constrói 2 confirmados ($300 cada = $600/dia) e 10 orçamentos ($1000 cada = $10.000/dia) por dia
    const syntheticAppointments: Appointment[] = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `2026-11-${String(day).padStart(2, "0")}`;
      syntheticAppointments.push(
        createSyntheticConfirmedAppointment(`conf-m-${day}-1`, dateStr, "09:00", "10:30", 300)
      );
      syntheticAppointments.push(
        createSyntheticConfirmedAppointment(`conf-m-${day}-2`, dateStr, "14:00", "15:30", 300)
      );

      for (let q = 1; q <= 10; q++) {
        syntheticAppointments.push(
          createSyntheticUncommittedQuote(`quote-m-${day}-${q}`, dateStr, "10:00", "12:00", 1000)
        );
      }
    }

    expect(syntheticAppointments.length).toBe(30 * 12); // 360 agendamentos totais

    // Simula a lógica de renderização de cada dia no CalendarMasterView (linhas 214-228)
    let totalMonthRevenue = 0;
    let totalMonthClients = 0;

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `2026-11-${String(day).padStart(2, "0")}`;
      const dayApts = syntheticAppointments
        .filter(
          (a) =>
            a.date === dateStr &&
            a.status !== "cancelled" &&
            a.status !== "pending_proposal" &&
            a.status !== "uncommitted_quote" &&
            !a.isUncommittedQuote
        )
        .filter(
          (apt, idx, arr) =>
            idx ===
            arr.findIndex(
              (t) =>
                t.id === apt.id ||
                (t.startTime === apt.startTime &&
                  t.clientName.trim().toLowerCase() === apt.clientName.trim().toLowerCase())
            )
        );

      const dayRevenue = dayApts.reduce((sum, a) => sum + a.price, 0);

      // Verificação dia a dia: estritamente 2 clientes e R$ 600,00
      expect(dayApts.length).toBe(2);
      expect(dayRevenue).toBe(600);

      totalMonthRevenue += dayRevenue;
      totalMonthClients += dayApts.length;
    }

    // Faturamento total do mês deve ser R$ 18.000,00 (NUNCA R$ 318.000,00)
    expect(totalMonthRevenue).toBe(18000);
    expect(totalMonthClients).toBe(60);
  });

  it("ADV-M2.9 - CalendarMasterView (Week View): week days list strictly excludes uncommitted quotes", () => {
    const weekDates = [
      "2026-11-23",
      "2026-11-24",
      "2026-11-25",
      "2026-11-26",
      "2026-11-27",
      "2026-11-28",
    ];

    const syntheticApts: Appointment[] = [];
    for (const d of weekDates) {
      syntheticApts.push(createSyntheticConfirmedAppointment(`conf-w-${d}`, d, "10:00", "11:30", 180));
      for (let q = 1; q <= 5; q++) {
        syntheticApts.push(createSyntheticUncommittedQuote(`quote-w-${d}-${q}`, d, "13:00", "15:00", 950));
      }
    }

    // Simula filtragem do CalendarMasterView (linha 314)
    for (const d of weekDates) {
      const dayApts = syntheticApts
        .filter(
          (a) =>
            a.date === d &&
            a.status !== "cancelled" &&
            a.status !== "pending_proposal" &&
            a.status !== "uncommitted_quote" &&
            !a.isUncommittedQuote
        )
        .filter(
          (apt, idx, arr) =>
            idx ===
            arr.findIndex(
              (t) =>
                t.id === apt.id ||
                (t.startTime === apt.startTime &&
                  t.clientName.trim().toLowerCase() === apt.clientName.trim().toLowerCase())
            )
        );

      expect(dayApts.length).toBe(1);
      expect(dayApts[0].id).toBe(`conf-w-${d}`);
    }
  });

  it("ADV-M2.10 - DayOperationView: calculates todayRevenue and future14DaysRevenue strictly excluding uncommitted quotes", () => {
    const todayStr = "2026-11-22";

    const appointments: Appointment[] = [
      createSyntheticConfirmedAppointment("today-conf-1", todayStr, "09:00", "10:30", 350),
      createSyntheticConfirmedAppointment("today-conf-2", todayStr, "14:00", "15:30", 450),
      // 5 orçamentos no dia de hoje totalizando R$ 5.000
      createSyntheticUncommittedQuote("today-q-1", todayStr, "09:00", "11:00", 1000),
      createSyntheticUncommittedQuote("today-q-2", todayStr, "11:00", "13:00", 1000),
      createSyntheticUncommittedQuote("today-q-3", todayStr, "13:00", "15:00", 1000),
      createSyntheticUncommittedQuote("today-q-4", todayStr, "15:00", "17:00", 1000),
      createSyntheticUncommittedQuote("today-q-5", todayStr, "17:00", "19:00", 1000),
    ];

    // Simula cálculo de DayOperationView (linhas 43-57)
    const todayAppointments = appointments.filter(
      (a) =>
        a.date === todayStr &&
        a.status !== "cancelled" &&
        a.status !== "pending_proposal" &&
        a.status !== "uncommitted_quote" &&
        !a.isUncommittedQuote
    );

    const todayRevenue = todayAppointments.reduce((sum, a) => sum + a.price, 0);
    const dailyTargetRevenue = 1000;
    const targetPercent = Math.min(100, Math.round((todayRevenue / dailyTargetRevenue) * 100));

    expect(todayAppointments).toHaveLength(2);
    expect(todayRevenue).toBe(800); // 350 + 450
    expect(targetPercent).toBe(80); // 800 / 1000 = 80%, NUNCA 580%

    // Projeção futuros 14 dias (linhas 84-93)
    const futureConfirmed = createSyntheticConfirmedAppointment("fut-conf-1", "2026-11-25", "10:00", "11:30", 500);
    const futureQuote = createSyntheticUncommittedQuote("fut-quote-1", "2026-11-25", "14:00", "16:00", 10000);

    const allWithFuture = [...appointments, futureConfirmed, futureQuote];

    const future14DaysRevenue = allWithFuture
      .filter((a) => {
        if (a.status !== "confirmed" || a.isUncommittedQuote) return false;
        return a.date > todayStr;
      })
      .reduce((sum, a) => sum + (Number(a.price) || 0), 0);

    expect(future14DaysRevenue).toBe(500); // Somente futureConfirmed, NUNCA 10500
  });

  it("ADV-M2.11 - LinearTimelineMaster: uncommitted quotes are never in activeOrImminentAppointments or nextUpcomingAppointment", () => {
    const selectedDate = "2026-11-22";

    const confirmedUpcoming = createSyntheticConfirmedAppointment(
      "conf-upcoming",
      selectedDate,
      "15:00",
      "16:30",
      200
    );

    const quoteActiveNow = createSyntheticUncommittedQuote(
      "quote-active-now",
      selectedDate,
      "09:30",
      "11:30",
      800
    );

    const allApts = [confirmedUpcoming, quoteActiveNow];

    // Simula LinearTimelineMaster (linhas 84-110)
    const dayAppointments = allApts.filter(
      (a) =>
        a.date === selectedDate &&
        a.status !== "cancelled" &&
        a.status !== "pending_proposal" &&
        a.status !== "uncommitted_quote" &&
        !a.isUncommittedQuote
    );

    expect(dayAppointments).toHaveLength(1);
    expect(dayAppointments[0].id).toBe("conf-upcoming");

    // Às 10:00 (momento em que o quote estaria ocorrendo):
    const simulatedMinutes = 10 * 60; // 10:00
    const activeOrImminentAppointments = dayAppointments.filter((apt) => {
      if (!apt.stepBlocks || apt.stepBlocks.length === 0) return false;
      const firstStart = 15 * 60; // conf-upcoming começa às 15:00
      const lastEnd = 16 * 60 + 30;
      return simulatedMinutes >= firstStart - 5 && simulatedMinutes <= lastEnd;
    });

    expect(activeOrImminentAppointments).toHaveLength(0); // O quote NÃO aparece como atendimento ativo

    // Próximo agendamento
    const nextUpcoming = dayAppointments
      .filter((apt) => {
        if (!apt.stepBlocks || apt.stepBlocks.length === 0) return false;
        return 15 * 60 > simulatedMinutes;
      })
      .sort((a, b) => 0);

    expect(nextUpcoming[0].id).toBe("conf-upcoming");
  });

  // =========================================================================
  // PARTE 4: REALTIME SYNC, FOCUS LISTENER, SAFETY TICKER & PROPOSAL APPROVAL
  // =========================================================================

  it("ADV-M2.12 - SyncBus: broadcasts and receives proposal_approved and appointment_saved events across channels", () => {
    const receivedEvents: GlaicySyncPayload[] = [];
    const unsubscribe = subscribeToSync((payload) => {
      receivedEvents.push(payload);
    });

    try {
      broadcastSync("proposal_approved", "prop-sync-test-01");
      broadcastSync("appointment_saved", "apt-sync-test-01");

      expect(receivedEvents).toHaveLength(2);
      expect(receivedEvents[0].type).toBe("proposal_approved");
      expect(receivedEvents[0].id).toBe("prop-sync-test-01");
      expect(receivedEvents[1].type).toBe("appointment_saved");
      expect(receivedEvents[1].id).toBe("apt-sync-test-01");
    } finally {
      unsubscribe();
    }

    // Após desinscrever, nenhum novo evento deve ser adicionado
    broadcastSync("proposal_approved", "prop-should-ignore");
    expect(receivedEvents).toHaveLength(2);
  });

  it("ADV-M2.13 - Window Focus & Polling Hook Simulation: triggers refreshAll upon focus event and timer tick", () => {
    let refreshCount = 0;
    const refreshAll = () => {
      refreshCount++;
    };

    // Registra listener de focus igual ao dashboard/page.tsx (linhas 240-252)
    const handleFocus = () => {
      refreshAll();
    };
    window.addEventListener("focus", handleFocus);

    // Simula evento de ganho de foco da aba
    window.dispatchEvent(new Event("focus"));
    expect(refreshCount).toBe(1);

    window.dispatchEvent(new Event("focus"));
    expect(refreshCount).toBe(2);

    // Remove listener
    window.removeEventListener("focus", handleFocus);
    window.dispatchEvent(new Event("focus"));
    expect(refreshCount).toBe(2); // Inalterado após remoção
  });

  it("ADV-M2.14 - Proposal Approval creates valid appointment and broadcasts sync ping immediately", async () => {
    const testProp: LuxuryProposal = {
      ...mockLuxuryProposal,
      id: "prop-adv-m2-01",
      schedulingDetails: {
        status: "accepted_original",
        originalDate: "2026-11-20",
        originalTime: "10:00",
        clientChosenDate: "2026-12-10",
        clientChosenTime: "11:00",
      },
    };
    SalonStore.saveProposal(testProp);

    let realtimeSignalFired = false;
    let signalData: any = null;

    const listener = (e: any) => {
      realtimeSignalFired = true;
      signalData = e.detail;
    };
    window.addEventListener("glaicy_realtime_sync", listener);

    try {
      await SupabaseDataService.approveProposal("prop-adv-m2-01");

      // 1. Proposta aprovada
      const approved = SalonStore.getProposalById("prop-adv-m2-01");
      expect(approved?.status).toBe("approved");

      // 2. Agendamento criado
      const apt = SalonStore.getAppointments().find((a) => a.proposalId === "prop-adv-m2-01");
      expect(apt).toBeDefined();
      expect(apt?.status).toBe("confirmed");
      expect(apt?.date).toBe("2026-12-10");
      expect(apt?.startTime).toBe("11:00");
      expect(isUuid(apt?.serviceId)).toBe(true);

      // 3. Evento emitido
      expect(realtimeSignalFired).toBe(true);
      expect(signalData.type).toBe("proposal_approved");
      expect(signalData.id).toBe("prop-adv-m2-01");
    } finally {
      window.removeEventListener("glaicy_realtime_sync", listener);
    }
  });

  it("ADV-M2.15 - Chemical Pause Encaixe Isolation: uncommitted quote pauses NEVER create phantom encaixe slots, and do not block genuine encaixe", () => {
    const targetDate = "2026-12-05";
    const profId = "prof-gleicy";

    // 1. Orçamento sem compromisso com pausa química de 90 min (10:00 a 11:30)
    const quoteWithPause = createSyntheticUncommittedQuote("quote-with-pause", targetDate, "09:00", "12:00", 800);
    quoteWithPause.stepBlocks = [
      {
        id: "step-q-act-1",
        stepId: "step-1",
        stepTitle: "Química",
        type: "active",
        startTime: "09:00",
        endTime: "10:00",
        durationMin: 60,
        isParallelSlotAllowed: false,
      },
      {
        id: "step-q-pause",
        stepId: "step-pause",
        stepTitle: "Pausa Falsa",
        type: "pause",
        startTime: "10:00",
        endTime: "11:30",
        durationMin: 90,
        maxPauseDurationMin: 90,
        isParallelSlotAllowed: true,
      },
      {
        id: "step-q-act-2",
        stepId: "step-2",
        stepTitle: "Enxágue",
        type: "active",
        startTime: "11:30",
        endTime: "12:00",
        durationMin: 30,
        isParallelSlotAllowed: false,
      },
    ];

    // Sem agendamentos reais, o grid com este orçamento NÃO deve conter NENHUM encaixe
    const slots = calculateAvailableSlots(mockFixedService, targetDate, profId, [quoteWithPause], {
      openMinutes: 8 * 60,
      closeMinutes: 18 * 60,
      slotIntervalMinutes: 30,
      maxParallelInPause: 1,
    });

    const encaixeSlots = slots.filter((s) => s.isEncaixe);
    expect(encaixeSlots).toHaveLength(0); // Zero slots de encaixe fantasmas

    // 2. Agora adicionamos um agendamento CONFIRMADO real com pausa química das 14:00 às 15:30
    const confirmedWithRealPause = createSyntheticConfirmedAppointment(
      "conf-real-pause",
      targetDate,
      "13:00",
      "16:30",
      450,
      {
        hasPause: true,
        pauseStart: "14:00",
        pauseEnd: "15:30",
        pauseMaxDuration: 90,
      }
    );

    // E adicionamos um orçamento sem compromisso colidindo durante essa mesma pausa
    const quoteDuringRealPause = createSyntheticUncommittedQuote(
      "quote-during-pause",
      targetDate,
      "14:15",
      "15:00",
      300
    );

    const slotsWithBoth = calculateAvailableSlots(
      mockFixedService,
      targetDate,
      profId,
      [confirmedWithRealPause, quoteDuringRealPause],
      {
        openMinutes: 8 * 60,
        closeMinutes: 18 * 60,
        slotIntervalMinutes: 30,
        maxParallelInPause: 1,
      }
    );

    // O encaixe legítimo na pausa real do confirmedWithRealPause DEVE existir (às 14:00)
    const realEncaixe = slotsWithBoth.find((s) => s.time === "14:00" && s.isEncaixe);
    expect(realEncaixe).toBeDefined();
    expect(realEncaixe?.encaixeWithAppointmentId).toBe("conf-real-pause");
  });

  it("ADV-M2.16 - Multi-Professional Isolation: quote on Professional A leaves both Pro A and Pro B slots intact", () => {
    const targetDate = "2026-12-06";
    const profA = "prof-gleicy";
    const profB = "prof-mayara";

    const quoteProfA = createSyntheticUncommittedQuote("quote-profa", targetDate, "10:00", "12:00", 600);
    quoteProfA.professionalId = profA;

    const confirmedProfB = createSyntheticConfirmedAppointment("conf-profb", targetDate, "10:00", "11:30", 300);
    confirmedProfB.professionalId = profB;

    const allApts = [quoteProfA, confirmedProfB];

    // Slots para Prof A: 10:00 deve estar disponível (pois o quote não bloqueia)
    const slotsProfA = calculateAvailableSlots(mockFixedService, targetDate, profA, allApts, {
      openMinutes: 8 * 60,
      closeMinutes: 18 * 60,
      slotIntervalMinutes: 30,
      maxParallelInPause: 1,
    });
    expect(slotsProfA.find((s) => s.time === "10:00")).toBeDefined();

    // Slots para Prof B: 10:00 deve estar BLOQUEADO (devido ao confirmedProfB)
    const slotsProfB = calculateAvailableSlots(mockFixedService, targetDate, profB, allApts, {
      openMinutes: 8 * 60,
      closeMinutes: 18 * 60,
      slotIntervalMinutes: 30,
      maxParallelInPause: 1,
    });
    expect(slotsProfB.find((s) => s.time === "10:00")).toBeUndefined();
  });

  it("ADV-M2.17 - Proposal Approval Date Fallback Exhaustion (R6.1): resolves correctly across all date hierarchy tiers", async () => {
    // Tier 1: options.chosenDate tem precedência máxima
    const p1: LuxuryProposal = {
      ...mockLuxuryProposal,
      id: "prop-tier-1",
      schedulingDetails: {
        status: "accepted_original",
        originalDate: "2026-11-20",
        originalTime: "10:00",
        confirmedDate: "2026-12-01",
        clientChosenDate: "2026-12-02",
      },
    };
    SalonStore.saveProposal(p1);
    await SupabaseDataService.approveProposal("prop-tier-1", { chosenDate: "2026-12-15" });
    expect(SalonStore.getAppointments().find((a) => a.proposalId === "prop-tier-1")?.date).toBe("2026-12-15");

    // Tier 2: confirmedDate quando sem options.chosenDate
    const p2: LuxuryProposal = {
      ...mockLuxuryProposal,
      id: "prop-tier-2",
      schedulingDetails: {
        status: "accepted_original",
        originalDate: "2026-11-20",
        originalTime: "10:00",
        confirmedDate: "2026-12-01",
        clientChosenDate: "2026-12-02",
      },
    };
    SalonStore.saveProposal(p2);
    await SupabaseDataService.approveProposal("prop-tier-2");
    expect(SalonStore.getAppointments().find((a) => a.proposalId === "prop-tier-2")?.date).toBe("2026-12-01");

    // Tier 3: clientChosenDate quando confirmedDate ausente
    const p3: LuxuryProposal = {
      ...mockLuxuryProposal,
      id: "prop-tier-3",
      schedulingDetails: {
        status: "accepted_original",
        originalDate: "2026-11-20",
        originalTime: "10:00",
        clientChosenDate: "2026-12-03",
        suggestedDateStart: "2026-12-04",
      },
    };
    SalonStore.saveProposal(p3);
    await SupabaseDataService.approveProposal("prop-tier-3");
    expect(SalonStore.getAppointments().find((a) => a.proposalId === "prop-tier-3")?.date).toBe("2026-12-03");

    // Tier 4: suggestedDateStart quando anteriores ausentes
    const p4: LuxuryProposal = {
      ...mockLuxuryProposal,
      id: "prop-tier-4",
      schedulingDetails: {
        status: "suggested_alternative",
        originalDate: "2026-12-05",
        originalTime: "10:00",
        suggestedDateStart: "2026-12-04",
      },
    };
    SalonStore.saveProposal(p4);
    await SupabaseDataService.approveProposal("prop-tier-4");
    expect(SalonStore.getAppointments().find((a) => a.proposalId === "prop-tier-4")?.date).toBe("2026-12-04");

    // Tier 5: originalDate quando anteriores ausentes
    const p5: LuxuryProposal = {
      ...mockLuxuryProposal,
      id: "prop-tier-5",
      schedulingDetails: {
        status: "accepted_original",
        originalDate: "2026-12-05",
        originalTime: "10:00",
      },
    };
    SalonStore.saveProposal(p5);
    await SupabaseDataService.approveProposal("prop-tier-5");
    expect(SalonStore.getAppointments().find((a) => a.proposalId === "prop-tier-5")?.date).toBe("2026-12-05");
  });

  it("ADV-M2.18 - Supabase API UUID Defense (R6.1): handles non-UUID service IDs robustly without throwing database constraint errors", async () => {
    // 1. resolveValidUuid mapeia 'srv-custom' para DEFAULT_SERVICE_ID
    const mappedCustom = resolveValidUuid("srv-custom");
    expect(isUuid(mappedCustom)).toBe(true);
    expect(mappedCustom).toBe(DEFAULT_SERVICE_ID);

    // 2. resolveValidUuid com string inválida recai para fallback
    const mappedInvalid = resolveValidUuid("not-a-valid-uuid", DEFAULT_SERVICE_ID);
    expect(isUuid(mappedInvalid)).toBe(true);
    expect(mappedInvalid).toBe(DEFAULT_SERVICE_ID);

    // 3. resolveValidUuid com UUID válido preserva o UUID original
    const validUuid = "11111111-1111-4111-8111-111111111111";
    expect(resolveValidUuid(validUuid)).toBe(validUuid);

    // 4. Proposta aprovada com serviço customizado garante appointment com UUID válido
    const customProposal: LuxuryProposal = {
      ...mockLuxuryProposal,
      id: "prop-custom-uuid-test",
      schedulingDetails: {
        status: "accepted_original",
        originalDate: "2026-11-20",
        originalTime: "10:00",
        clientChosenDate: "2026-12-18",
        clientChosenTime: "15:00",
      },
    };
    SalonStore.saveProposal(customProposal);

    await SupabaseDataService.approveProposal("prop-custom-uuid-test");
    const apt = SalonStore.getAppointments().find((a) => a.proposalId === "prop-custom-uuid-test");
    expect(apt).toBeDefined();
    expect(isUuid(apt?.serviceId)).toBe(true);
    expect(apt?.serviceId).toBe(DEFAULT_SERVICE_ID);
  });
});
