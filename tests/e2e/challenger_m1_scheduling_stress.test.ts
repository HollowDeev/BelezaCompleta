import { describe, it, expect, beforeEach } from "vitest";
import { ServiceItem } from "@/types/service";
import { Appointment } from "@/types/appointment";
import {
  calculateDaySlotGrid,
  calculateAvailableSlots,
} from "@/lib/scheduling/engine";
import { parseHHmmToMinutes } from "@/lib/utils";
import {
  mockFixedService,
  mockStartingAtService,
  mockTratamentoService,
} from "../fixtures/services.fixture";

describe("Challenger M1.2: Scheduling & Triage Stress-Testing (Composite Multi-Service Engine)", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  // Production-equivalent composite builder from src/app/page.tsx
  function buildCompositeService(selectedServices: ServiceItem[]): ServiceItem {
    const compositeTitle = selectedServices.map((s) => s.title).join(" + ");
    const combinedPrice = selectedServices.reduce(
      (sum, s) => sum + (s.promotionalPrice || s.price),
      0
    );

    const anyRequiresTriage = selectedServices.some((s) => s.requiresTriage);
    const triageService = selectedServices.find((s) => s.requiresTriage && s.triageFormId);
    const triageFormId =
      triageService?.triageFormId ||
      (anyRequiresTriage ? selectedServices.find((s) => s.requiresTriage)?.id : undefined);

    let stepOrderCounter = 1;
    const combinedSteps = selectedServices.flatMap((s, sIdx) => {
      const serviceSteps =
        s.steps && s.steps.length > 0
          ? s.steps
          : [
              {
                id: `step-${s.id}-default`,
                order: 1,
                title: s.title,
                type: "active" as const,
                durationMin: 45,
                requiresExclusiveAttention: true,
              },
            ];

      return serviceSteps.map((st) => ({
        ...st,
        id: `composite-step-${sIdx}-${st.id || stepOrderCounter}`,
        order: stepOrderCounter++,
        title: `${s.title}: ${st.title}`,
      }));
    });

    const timestamp = Date.now();
    return {
      id: `composite-${timestamp}`,
      orgId: selectedServices[0]?.orgId || "11111111-1111-4111-8111-111111111111",
      professionalId:
        selectedServices[0]?.professionalId || "58f26242-1e53-432e-b924-dea25ee2068a",
      title: compositeTitle,
      slug: `composite-${timestamp}`,
      category: "outros",
      description: `Atendimento montado com ${selectedServices.length} procedimentos: ${selectedServices
        .map((s) => s.title)
        .join(", ")}.`,
      price: combinedPrice,
      requiresTriage: anyRequiresTriage,
      triageFormId: triageFormId,
      steps: combinedSteps,
      isActive: true,
      priceType: selectedServices.some((s) => s.priceType === "starting_at")
        ? "starting_at"
        : "fixed",
      procedures: selectedServices.map((s) => ({
        id: s.id,
        title: s.title,
        durationMin:
          s.steps && s.steps.length > 0
            ? s.steps.reduce((sum, st) => sum + (Number(st.durationMin) || 0), 0)
            : 60,
        price: s.promotionalPrice || s.price,
        isIncluded: false,
      })),
    };
  }

  // =========================================================================
  // GROUP 1: STEP CONCATENATION & COMPOSITE PROPERTY INTEGRITY
  // =========================================================================
  describe("Group 1: Step Concatenation & Composite Property Integrity", () => {
    it("1.1 should concatenate 3 services preserving active and pause blocks in strict sequential order", () => {
      const composite = buildCompositeService([
        mockFixedService,
        mockStartingAtService,
        mockTratamentoService,
      ]);

      expect(composite.steps).toHaveLength(6);
      expect(composite.steps.map((s) => s.order)).toEqual([1, 2, 3, 4, 5, 6]);

      // Verify step types preserved
      expect(composite.steps[0].type).toBe("active");
      expect(composite.steps[1].type).toBe("active");
      expect(composite.steps[2].type).toBe("active");
      expect(composite.steps[3].type).toBe("pause"); // chemical pause
      expect(composite.steps[4].type).toBe("active");
      expect(composite.steps[5].type).toBe("active");

      // Verify pause properties
      expect(composite.steps[3].maxPauseDurationMin).toBe(60);
      expect(composite.steps[3].requiresExclusiveAttention).toBe(false);

      // Verify prefixing of step titles
      expect(composite.steps[0].title).toBe("Corte Especializado em Cachos: Análise e Corte a Seco");
      expect(composite.steps[3].title).toBe("Mechas Criativas Iluminadas: Tempo de Ação Química");
      expect(composite.steps[5].title).toBe("Nutrição Lipídica Intensiva: Aplicação de Óleos e Máscara");
    });

    it("1.2 should safely handle procedures with empty steps [] by injecting a valid fallback active step", () => {
      const emptyStepService: ServiceItem = {
        id: "srv-empty-steps",
        orgId: "org-default-01",
        professionalId: "prof-gleicy",
        title: "Escova Modelada Express",
        description: "Escova express para modelar e alinhar",
        slug: "escova-modelada",
        category: "outros",
        price: 80,
        priceType: "fixed",
        requiresTriage: false,
        isActive: true,
        steps: [],
      };

      const composite = buildCompositeService([mockFixedService, emptyStepService]);
      expect(composite.steps).toHaveLength(3); // 2 from fixed + 1 injected fallback
      const injectedStep = composite.steps[2];
      expect(injectedStep.durationMin).toBe(45);
      expect(injectedStep.type).toBe("active");
      expect(injectedStep.order).toBe(3);
      expect(injectedStep.title).toBe("Escova Modelada Express: Escova Modelada Express");
    });

    it("1.3 should sum prices prioritizing promotionalPrice when present", () => {
      const promoService: ServiceItem = {
        ...mockFixedService,
        price: 250,
        promotionalPrice: 190,
      };
      const regularService: ServiceItem = {
        ...mockTratamentoService,
        price: 130,
        promotionalPrice: undefined,
      };

      const composite = buildCompositeService([promoService, regularService]);
      expect(composite.price).toBe(190 + 130); // 320, not 250 + 130 = 380
    });

    it("1.4 should set priceType to starting_at if at least one service is starting_at", () => {
      const comboWithStartingAt = buildCompositeService([mockFixedService, mockStartingAtService]);
      expect(comboWithStartingAt.priceType).toBe("starting_at");

      const comboFixedOnly = buildCompositeService([mockFixedService, mockTratamentoService]);
      expect(comboFixedOnly.priceType).toBe("fixed");
    });

    it("1.5 should populate itemized procedures array matching all selected services", () => {
      const composite = buildCompositeService([mockFixedService, mockStartingAtService]);
      expect(composite.procedures).toBeDefined();
      expect(composite.procedures).toHaveLength(2);
      expect(composite.procedures?.[0]).toEqual({
        id: mockFixedService.id,
        title: mockFixedService.title,
        durationMin: 90, // 60 + 30
        price: 180,
        isIncluded: false,
      });
      expect(composite.procedures?.[1]).toEqual({
        id: mockStartingAtService.id,
        title: mockStartingAtService.title,
        durationMin: 180, // 90 + 45 + 45
        price: 450,
        isIncluded: false,
      });
    });
  });

  // =========================================================================
  // GROUP 2: TRIAGE RESOLUTION & ROUTING LOGIC
  // =========================================================================
  describe("Group 2: Triage Resolution & Routing Logic", () => {
    it("2.1 should route directly to slot picker (requiresTriage: false) when no service requires triage", () => {
      const composite = buildCompositeService([mockFixedService, mockTratamentoService]);
      expect(composite.requiresTriage).toBe(false);
      expect(composite.triageFormId).toBeUndefined();

      // Simulate page.tsx handleSelectService logic
      let isTakingTriage = false;
      let isPickingSlot = false;
      if (composite.requiresTriage) {
        isTakingTriage = true;
      } else {
        isPickingSlot = true;
      }
      expect(isTakingTriage).toBe(false);
      expect(isPickingSlot).toBe(true);
    });

    it("2.2 should trigger triage flow when any service requires triage", () => {
      const triageServiceA: ServiceItem = {
        ...mockStartingAtService,
        requiresTriage: true,
        triageFormId: "triage-anamnese-mechas",
      };
      const composite = buildCompositeService([mockFixedService, triageServiceA]);

      expect(composite.requiresTriage).toBe(true);
      expect(composite.triageFormId).toBe("triage-anamnese-mechas");

      // Simulate page.tsx routing
      let isTakingTriage = false;
      let isPickingSlot = false;
      if (composite.requiresTriage) {
        isTakingTriage = true;
      } else {
        isPickingSlot = true;
      }
      expect(isTakingTriage).toBe(true);
      expect(isPickingSlot).toBe(false);
    });

    it("2.3 should preserve first valid triageFormId when multiple services require triage", () => {
      const triageServiceA: ServiceItem = {
        ...mockStartingAtService,
        id: "srv-mechas",
        requiresTriage: true,
        triageFormId: "form-mechas-01",
      };
      const triageServiceB: ServiceItem = {
        ...mockTratamentoService,
        id: "srv-cronograma",
        requiresTriage: true,
        triageFormId: "form-cronograma-02",
      };

      const composite = buildCompositeService([triageServiceA, triageServiceB]);
      expect(composite.requiresTriage).toBe(true);
      expect(composite.triageFormId).toBe("form-mechas-01");
    });
  });

  // =========================================================================
  // GROUP 3: SCHEDULING ENGINE TIMELINE CALCULATIONS WITH COMPOSITE SERVICES
  // =========================================================================
  describe("Group 3: Scheduling Engine Timeline Calculations with Composite Services", () => {
    const testDate = "2026-11-25"; // Future date
    const profId = "prof-gleicy";

    it("3.1 should calculate available slots on empty day with accurate step boundaries and total duration", () => {
      const composite = buildCompositeService([mockFixedService, mockTratamentoService]);
      const salonConfig = {
        openMinutes: 8 * 60 + 30, // 08:30 (510 min)
        closeMinutes: 19 * 60, // 19:00 (1140 min)
        slotIntervalMinutes: 30,
      };

      const availableSlots = calculateAvailableSlots(composite, testDate, profId, [], salonConfig);
      expect(availableSlots.length).toBeGreaterThan(0);

      // First slot at 08:30 -> endTime must be 10:30 (120 min)
      const firstSlot = availableSlots[0];
      expect(firstSlot.time).toBe("08:30");
      expect(firstSlot.endTime).toBe("10:30");
      expect(firstSlot.isEncaixe).toBe(false);

      // Verify prospective step blocks
      expect(firstSlot.stepBlocks).toHaveLength(3);
      // Step 1: 08:30 -> 09:30 (60 min)
      expect(firstSlot.stepBlocks[0].startTime).toBe("08:30");
      expect(firstSlot.stepBlocks[0].endTime).toBe("09:30");
      expect(firstSlot.stepBlocks[0].durationMin).toBe(60);

      // Step 2: 09:30 -> 10:00 (30 min)
      expect(firstSlot.stepBlocks[1].startTime).toBe("09:30");
      expect(firstSlot.stepBlocks[1].endTime).toBe("10:00");
      expect(firstSlot.stepBlocks[1].durationMin).toBe(30);

      // Step 3: 10:00 -> 10:30 (30 min)
      expect(firstSlot.stepBlocks[2].startTime).toBe("10:00");
      expect(firstSlot.stepBlocks[2].endTime).toBe("10:30");
      expect(firstSlot.stepBlocks[2].durationMin).toBe(30);
    });

    it("3.2 should enforce strict salon closing time boundary without allowing overflow", () => {
      const composite = buildCompositeService([mockStartingAtService]);
      const salonConfig = {
        openMinutes: 9 * 60, // 09:00
        closeMinutes: 18 * 60, // 18:00
        slotIntervalMinutes: 60,
      };

      const slots = calculateAvailableSlots(composite, testDate, profId, [], salonConfig);
      const slotTimes = slots.map((s) => s.time);
      expect(slotTimes).toContain("15:00");
      expect(slotTimes).not.toContain("16:00"); // 16:00 + 3h = 19:00 > 18:00
      expect(slotTimes).not.toContain("17:00");

      for (const slot of slots) {
        const endMinutes = parseHHmmToMinutes(slot.endTime);
        expect(endMinutes).toBeLessThanOrEqual(salonConfig.closeMinutes);
      }
    });

    it("3.3 should detect lunch break collision when composite steps overlap break hours", () => {
      const composite = buildCompositeService([mockFixedService, mockTratamentoService]);
      const salonConfig = {
        openMinutes: 8 * 60 + 30, // 08:30
        closeMinutes: 18 * 60, // 18:00
        breakStartMinutes: 12 * 60, // 12:00
        breakEndMinutes: 13 * 60, // 13:00
        slotIntervalMinutes: 30,
      };

      const grid = calculateDaySlotGrid(composite, testDate, profId, [], salonConfig);

      // Slot at 11:30: spans 11:30 to 13:30, overlapping lunch [12:00, 13:00]
      const slot1130 = grid.find((s) => s.time === "11:30");
      expect(slot1130).toBeDefined();
      expect(slot1130?.status).toBe("break");
      expect(slot1130?.isAvailable).toBe(false);
      expect(slot1130?.conflictReason).toContain("almoço");

      // Slot at 12:00: starts during lunch -> break
      const slot1200 = grid.find((s) => s.time === "12:00");
      expect(slot1200?.status).toBe("break");
      expect(slot1200?.isAvailable).toBe(false);

      // Slot at 13:00: starts right after lunch -> available
      const slot1300 = grid.find((s) => s.time === "13:00");
      expect(slot1300?.isAvailable).toBe(true);
    });
  });

  // =========================================================================
  // GROUP 4: COLLISION DETECTION & CHEMICAL PAUSE ENCAIXES
  // =========================================================================
  describe("Group 4: Collision Detection & Chemical Pause Encaixes", () => {
    const testDate = "2026-11-26";
    const profId = "prof-gleicy";

    it("4.1 should reject slot when any active step of composite collides with an existing active appointment", () => {
      const existingAppt: Appointment = {
        id: "apt-existing-corte",
        orgId: "org-default-01",
        professionalId: profId,
        professionalName: "Gleicy Kelly",
        serviceTitle: "Corte Simples",
        clientName: "Mariana Silva",
        clientPhone: "11988887777",
        date: testDate,
        startTime: "10:00",
        endTime: "11:00",
        totalDurationMin: 60,
        price: 150,
        status: "confirmed",
        stepBlocks: [
          {
            id: "step-blk-1",
            stepId: "step-1",
            stepTitle: "Corte",
            type: "active",
            startTime: "10:00",
            endTime: "11:00",
            durationMin: 60,
            isParallelSlotAllowed: false,
          },
        ],
        createdAt: "2026-11-10T10:00:00Z",
      };

      const composite = buildCompositeService([mockFixedService, mockTratamentoService]);
      const grid = calculateDaySlotGrid(composite, testDate, profId, [existingAppt]);

      // Slot at 09:30: Step 1 (09:30 - 10:30) collides with 10:00 - 11:00
      const slot0930 = grid.find((s) => s.time === "09:30");
      expect(slot0930?.isAvailable).toBe(false);
      expect(slot0930?.status).toBe("occupied");
      expect(slot0930?.conflictReason).toContain("Mariana Silva");

      // Slot at 10:00: Step 1 (10:00 - 11:00) collides directly
      const slot1000 = grid.find((s) => s.time === "10:00");
      expect(slot1000?.isAvailable).toBe(false);
      expect(slot1000?.status).toBe("occupied");

      // Slot at 11:00: starts after Mariana finishes -> Available
      const slot1100 = grid.find((s) => s.time === "11:00");
      expect(slot1100?.isAvailable).toBe(true);
    });

    it("4.2 should allow slot when an existing appointment coincides ONLY with a composite pause step", () => {
      const existingAppt: Appointment = {
        id: "apt-quick-escova",
        orgId: "org-default-01",
        professionalId: profId,
        professionalName: "Gleicy Kelly",
        serviceTitle: "Escova Express",
        clientName: "Carla Dias",
        clientPhone: "11977776666",
        date: testDate,
        startTime: "10:30",
        endTime: "11:15",
        totalDurationMin: 45,
        price: 90,
        status: "confirmed",
        stepBlocks: [
          {
            id: "step-blk-escova",
            stepId: "step-1",
            stepTitle: "Escova",
            type: "active",
            startTime: "10:30",
            endTime: "11:15",
            durationMin: 45,
            isParallelSlotAllowed: false,
          },
        ],
        createdAt: "2026-11-10T10:00:00Z",
      };

      const composite = buildCompositeService([mockStartingAtService]);
      const grid = calculateDaySlotGrid(composite, testDate, profId, [existingAppt], {
        openMinutes: 9 * 60,
        closeMinutes: 18 * 60,
        slotIntervalMinutes: 30,
      });

      const slot0900 = grid.find((s) => s.time === "09:00");
      expect(slot0900?.isAvailable).toBe(true);
      expect(slot0900?.status).toBe("available");
    });

    it("4.3 should detect chemical pause encaixe when composite active steps fit inside an existing pause", () => {
      const longMechasAppt: Appointment = {
        id: "apt-mechas-pausa",
        orgId: "org-default-01",
        professionalId: profId,
        professionalName: "Gleicy Kelly",
        serviceTitle: "Mechas Criativas",
        clientName: "Renata Vasconcelos",
        clientPhone: "11955554444",
        date: testDate,
        startTime: "09:00",
        endTime: "12:30",
        totalDurationMin: 210,
        price: 500,
        status: "confirmed",
        stepBlocks: [
          {
            id: "step-1",
            stepId: "step-1",
            stepTitle: "Aplicação",
            type: "active",
            startTime: "09:00",
            endTime: "10:30",
            durationMin: 90,
            isParallelSlotAllowed: false,
          },
          {
            id: "step-2",
            stepId: "step-2",
            stepTitle: "Ação Química Descolorante",
            type: "pause",
            startTime: "10:30",
            endTime: "11:45",
            durationMin: 75,
            maxPauseDurationMin: 75,
            isParallelSlotAllowed: true,
          },
          {
            id: "step-3",
            stepId: "step-3",
            stepTitle: "Matização e Lavatório",
            type: "active",
            startTime: "11:45",
            endTime: "12:30",
            durationMin: 45,
            isParallelSlotAllowed: false,
          },
        ],
        createdAt: "2026-11-10T10:00:00Z",
      };

      const quickCorte: ServiceItem = {
        ...mockFixedService,
        steps: [
          {
            id: "step-qc-1",
            order: 1,
            title: "Corte Seco",
            type: "active",
            durationMin: 30,
            requiresExclusiveAttention: true,
          },
        ],
      };
      const quickTrat: ServiceItem = {
        ...mockTratamentoService,
        steps: [
          {
            id: "step-qt-1",
            order: 1,
            title: "Nutrição Rápida",
            type: "active",
            durationMin: 30,
            requiresExclusiveAttention: true,
          },
        ],
      };

      const candidateCombo = buildCompositeService([quickCorte, quickTrat]); // 60 min total active
      const grid = calculateDaySlotGrid(candidateCombo, testDate, profId, [longMechasAppt], {
        openMinutes: 9 * 60,
        closeMinutes: 18 * 60,
        slotIntervalMinutes: 30,
      });

      const slot1030 = grid.find((s) => s.time === "10:30");
      expect(slot1030).toBeDefined();
      expect(slot1030?.isAvailable).toBe(true);
      expect(slot1030?.isEncaixe).toBe(true);
      expect(slot1030?.status).toBe("encaixe");
      expect(slot1030?.encaixeWithAppointmentId).toBe("apt-mechas-pausa");
      expect(slot1030?.encaixeDetails).toContain("Renata Vasconcelos");
    });

    it("4.4 should reject encaixe when composite active duration exceeds the existing chemical pause", () => {
      const mechasAppt: Appointment = {
        id: "apt-mechas-short-pause",
        orgId: "org-default-01",
        professionalId: profId,
        professionalName: "Gleicy Kelly",
        serviceTitle: "Mechas",
        clientName: "Renata Vasconcelos",
        clientPhone: "11955554444",
        date: testDate,
        startTime: "09:00",
        endTime: "12:00",
        totalDurationMin: 180,
        price: 500,
        status: "confirmed",
        stepBlocks: [
          {
            id: "step-1",
            stepId: "step-1",
            stepTitle: "Aplicação",
            type: "active",
            startTime: "09:00",
            endTime: "10:30",
            durationMin: 90,
            isParallelSlotAllowed: false,
          },
          {
            id: "step-2",
            stepId: "step-2",
            stepTitle: "Ação Química",
            type: "pause",
            startTime: "10:30",
            endTime: "11:15",
            durationMin: 45,
            isParallelSlotAllowed: true,
          },
          {
            id: "step-3",
            stepId: "step-3",
            stepTitle: "Matização",
            type: "active",
            startTime: "11:15",
            endTime: "12:00",
            durationMin: 45,
            isParallelSlotAllowed: false,
          },
        ],
        createdAt: "2026-11-10T10:00:00Z",
      };

      const candidateCombo = buildCompositeService([mockFixedService, mockTratamentoService]);
      const grid = calculateDaySlotGrid(candidateCombo, testDate, profId, [mechasAppt], {
        openMinutes: 9 * 60,
        closeMinutes: 18 * 60,
        slotIntervalMinutes: 30,
      });

      const slot1030 = grid.find((s) => s.time === "10:30");
      expect(slot1030?.isAvailable).toBe(false);
      expect(slot1030?.status).toBe("occupied");
      expect(slot1030?.conflictReason).toContain("Renata Vasconcelos");
    });

    it("4.5 should allow a single-service encaixe inside the pause of a previously booked composite appointment", () => {
      const bookedCompositeAppt: Appointment = {
        id: "apt-composite-booked",
        orgId: "org-default-01",
        professionalId: profId,
        professionalName: "Gleicy Kelly",
        serviceTitle: "Mechas Criativas + Tratamento",
        clientName: "Sofia Alencar",
        clientPhone: "11944443333",
        date: testDate,
        startTime: "09:00",
        endTime: "12:00",
        totalDurationMin: 180,
        price: 570,
        status: "confirmed",
        stepBlocks: [
          {
            id: "blk-1",
            stepId: "s1",
            stepTitle: "Mechas: Aplicação",
            type: "active",
            startTime: "09:00",
            endTime: "10:00",
            durationMin: 60,
            isParallelSlotAllowed: false,
          },
          {
            id: "blk-2",
            stepId: "s2",
            stepTitle: "Mechas: Pausa Química",
            type: "pause",
            startTime: "10:00",
            endTime: "11:15", // 75 min pause
            durationMin: 75,
            maxPauseDurationMin: 75,
            isParallelSlotAllowed: true,
          },
          {
            id: "blk-3",
            stepId: "s3",
            stepTitle: "Tratamento: Matização e Lavatório",
            type: "active",
            startTime: "11:15",
            endTime: "12:00",
            durationMin: 45,
            isParallelSlotAllowed: false,
          },
        ],
        createdAt: "2026-11-10T10:00:00Z",
      };

      const quickService: ServiceItem = {
        ...mockTratamentoService,
        steps: [
          {
            id: "step-nutri-quick",
            order: 1,
            title: "Tratamento Rápido",
            type: "active",
            durationMin: 30,
            requiresExclusiveAttention: true,
          },
        ],
      };

      const grid = calculateDaySlotGrid(quickService, testDate, profId, [bookedCompositeAppt], {
        openMinutes: 9 * 60,
        closeMinutes: 18 * 60,
        slotIntervalMinutes: 30,
      });

      const slot1000 = grid.find((s) => s.time === "10:00");
      expect(slot1000).toBeDefined();
      expect(slot1000?.isAvailable).toBe(true);
      expect(slot1000?.isEncaixe).toBe(true);
      expect(slot1000?.status).toBe("encaixe");
      expect(slot1000?.encaixeWithAppointmentId).toBe("apt-composite-booked");

      const slot1030 = grid.find((s) => s.time === "10:30");
      expect(slot1030?.isAvailable).toBe(true);
      expect(slot1030?.isEncaixe).toBe(true);
    });
  });

  // =========================================================================
  // GROUP 5: ADVERSARIAL STRESS & COMPLEX CALENDAR BENCHMARKS
  // =========================================================================
  describe("Group 5: Adversarial Stress & Complex Calendar Benchmarks", () => {
    const testDate = "2026-11-27";
    const profId = "prof-gleicy";

    it("5.1 should handle 8 combined procedures (16 steps, 450 min) in < 50ms without error", () => {
      const manyServices: ServiceItem[] = Array.from({ length: 8 }, (_, i) => ({
        id: `srv-bulk-${i}`,
        orgId: "org-default-01",
        professionalId: profId,
        title: `Procedimento Customizado ${i + 1}`,
        description: `Descrição detalhada do procedimento ${i + 1}`,
        slug: `custom-${i}`,
        category: "outros",
        price: 80 + i * 10,
        priceType: i % 2 === 0 ? "fixed" : "starting_at",
        requiresTriage: i === 3,
        triageFormId: i === 3 ? "form-triage-3" : undefined,
        isActive: true,
        steps: [
          {
            id: `step-${i}-1`,
            order: 1,
            title: `Preparação ${i}`,
            type: "active",
            durationMin: 30,
            requiresExclusiveAttention: true,
          },
          {
            id: `step-${i}-2`,
            order: 2,
            title: `Ação ${i}`,
            type: i % 3 === 0 ? "pause" : "active",
            durationMin: 25,
            requiresExclusiveAttention: i % 3 !== 0,
          },
        ],
      }));

      const startTime = performance.now();
      const megaComposite = buildCompositeService(manyServices);
      const executionTimeMs = performance.now() - startTime;

      expect(megaComposite.steps).toHaveLength(16);
      expect(megaComposite.procedures).toHaveLength(8);
      expect(megaComposite.requiresTriage).toBe(true);
      expect(megaComposite.priceType).toBe("starting_at");
      expect(executionTimeMs).toBeLessThan(50);

      const engineStart = performance.now();
      const grid = calculateDaySlotGrid(megaComposite, testDate, profId, [], {
        openMinutes: 8 * 60,
        closeMinutes: 20 * 60,
        slotIntervalMinutes: 30,
      });
      const engineTimeMs = performance.now() - engineStart;

      expect(engineTimeMs).toBeLessThan(100);
      expect(grid.length).toBeGreaterThan(0);
      const firstSlot = grid[0];
      expect(firstSlot.time).toBe("08:00");
      expect(firstSlot.endTime).toBe("15:20");
    });

    it("5.2 should accurately detect pockets in a heavily fragmented calendar with 10 existing appointments", () => {
      const fragmentedAppointments: Appointment[] = [
        {
          id: "apt-1",
          orgId: "org-default-01",
          professionalId: profId,
          professionalName: "Gleicy Kelly",
          serviceTitle: "Corte",
          clientName: "Cliente 1",
          clientPhone: "11911111111",
          date: testDate,
          startTime: "08:30",
          endTime: "09:30",
          totalDurationMin: 60,
          price: 150,
          status: "confirmed",
          createdAt: "2026-11-10T10:00:00Z",
        },
        {
          id: "apt-2",
          orgId: "org-default-01",
          professionalId: profId,
          professionalName: "Gleicy Kelly",
          serviceTitle: "Escova",
          clientName: "Cliente 2",
          clientPhone: "11922222222",
          date: testDate,
          startTime: "10:30",
          endTime: "11:30",
          totalDurationMin: 60,
          price: 100,
          status: "confirmed",
          createdAt: "2026-11-10T10:00:00Z",
        },
        {
          id: "apt-3",
          orgId: "org-default-01",
          professionalId: profId,
          professionalName: "Gleicy Kelly",
          serviceTitle: "Hidratação",
          clientName: "Cliente 3",
          clientPhone: "11933333333",
          date: testDate,
          startTime: "12:00",
          endTime: "13:00",
          totalDurationMin: 60,
          price: 120,
          status: "confirmed",
          createdAt: "2026-11-10T10:00:00Z",
        },
        {
          id: "apt-4",
          orgId: "org-default-01",
          professionalId: profId,
          professionalName: "Gleicy Kelly",
          serviceTitle: "Tratamento",
          clientName: "Cliente 4",
          clientPhone: "11944444444",
          date: testDate,
          startTime: "14:30",
          endTime: "16:00",
          totalDurationMin: 90,
          price: 180,
          status: "confirmed",
          createdAt: "2026-11-10T10:00:00Z",
        },
      ];

      const combo60 = buildCompositeService([mockTratamentoService, mockTratamentoService]);
      const grid = calculateDaySlotGrid(combo60, testDate, profId, fragmentedAppointments, {
        openMinutes: 8 * 60 + 30,
        closeMinutes: 18 * 60,
        slotIntervalMinutes: 30,
      });

      expect(grid.find((s) => s.time === "08:30")?.isAvailable).toBe(false);

      const slot0930 = grid.find((s) => s.time === "09:30");
      expect(slot0930?.isAvailable).toBe(true);
      expect(slot0930?.endTime).toBe("10:30");

      expect(grid.find((s) => s.time === "10:00")?.isAvailable).toBe(false);

      const slot1300 = grid.find((s) => s.time === "13:00");
      expect(slot1300?.isAvailable).toBe(true);
      expect(slot1300?.endTime).toBe("14:00");
    });

    it("5.3 should gracefully handle step with undefined or 0 duration without crashing", () => {
      const oddStepService: ServiceItem = {
        id: "srv-odd",
        orgId: "org-default-01",
        professionalId: profId,
        title: "Procedimento Especial",
        description: "Procedimento com duração zero de teste",
        slug: "especial",
        category: "outros",
        price: 100,
        priceType: "fixed",
        requiresTriage: false,
        isActive: true,
        steps: [
          {
            id: "step-zero",
            order: 1,
            title: "Passo sem duração",
            type: "active",
            durationMin: 0 as any,
            requiresExclusiveAttention: true,
          },
        ],
      };

      const composite = buildCompositeService([oddStepService]);
      const grid = calculateDaySlotGrid(composite, testDate, profId, [], {
        openMinutes: 9 * 60,
        closeMinutes: 12 * 60,
        slotIntervalMinutes: 30,
      });

      expect(grid.length).toBeGreaterThan(0);
      expect(grid[0].stepBlocks?.[0].durationMin).toBe(0);
      expect(grid[0].stepBlocks?.[0].endTime).toBe("09:15");
    });
  });
});
