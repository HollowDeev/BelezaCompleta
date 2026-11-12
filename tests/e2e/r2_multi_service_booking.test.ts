import { describe, it, expect, beforeEach } from "vitest";
import { ServiceItem } from "@/types/service";
import { buildCompositeService } from "@/lib/services/composite";
import {
  mockFixedService,
  mockStartingAtService,
  mockTratamentoService,
} from "../fixtures/services.fixture";

describe("R2: Seleção de Múltiplos Procedimentos ('Montar o meu atendimento') (Tiers 1 & 2)", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  // --- TIER 1: FUNCTIONAL REQUIREMENTS (R2.1 & R2.2) ---

  it("R2.1 - should combine two non-triage services and calculate cumulative price and duration", () => {
    const selected = [mockFixedService, mockTratamentoService];
    const composite = buildCompositeService(selected);

    expect(composite).toBeDefined();
    expect(composite?.title).toBe(
      "Corte Especializado em Cachos + Nutrição Lipídica Intensiva"
    );
    // Price = 180 + 120 = 300
    expect(composite?.price).toBe(300);
    expect(composite?.priceType).toBe("fixed");
    expect(composite?.requiresTriage).toBe(false);

    // Duration = (60 + 30) + (30) = 120 min
    const totalDurationMin = composite?.steps.reduce(
      (sum, st) => sum + st.durationMin,
      0
    );
    expect(totalDurationMin).toBe(120);
    // Steps count = 2 + 1 = 3
    expect(composite?.steps).toHaveLength(3);
  });

  it("R2.2 - should flag requiresTriage: true when at least one procedure requires triage", () => {
    // mockStartingAtService has requiresTriage: true, mockFixedService has false
    const selected = [mockFixedService, mockStartingAtService];
    const composite = buildCompositeService(selected);

    expect(composite?.requiresTriage).toBe(true);
    expect(composite?.triageFormId).toBeDefined();
  });

  it("R2.2 - should set priceType: 'starting_at' if any procedure is starting_at", () => {
    const selected = [mockFixedService, mockStartingAtService];
    const composite = buildCompositeService(selected);

    expect(composite?.priceType).toBe("starting_at");
  });

  it("R2.2 - should preserve sequential step ordering across multiple procedures", () => {
    const selected = [mockFixedService, mockStartingAtService, mockTratamentoService];
    const composite = buildCompositeService(selected);

    expect(composite?.steps).toBeDefined();
    // mockFixedService has 2 steps, mockStartingAtService has 3 steps, mockTratamento has 1 step = 6 steps
    expect(composite?.steps).toHaveLength(6);

    // Verify order numbers are strictly sequential from 1 to 6
    const orders = composite?.steps.map((s) => s.order);
    expect(orders).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it("R2.2 - should preserve pause step types and pause duration tolerances in composite steps", () => {
    const selected = [mockFixedService, mockStartingAtService];
    const composite = buildCompositeService(selected);

    const pauseSteps = composite?.steps.filter((s) => s.type === "pause");
    expect(pauseSteps).toHaveLength(1);
    expect(pauseSteps?.[0].durationMin).toBe(45);
    expect(pauseSteps?.[0].maxPauseDurationMin).toBe(60);
    expect(pauseSteps?.[0].requiresExclusiveAttention).toBe(false);
  });

  // --- TIER 2: BOUNDARY & CORNER CASES ---

  it("R2-Edge.1 - should return original service untouched when only 1 procedure is selected", () => {
    const selected = [mockFixedService];
    const result = buildCompositeService(selected);

    expect(result).toEqual(mockFixedService);
    expect(result?.title).toBe(mockFixedService.title);
  });

  it("R2-Edge.2 - should return null when procedure array is empty", () => {
    const result = buildCompositeService([]);
    expect(result).toBeNull();
  });

  it("R2-Edge.3 - should prioritize promotionalPrice over regular price when summing totals", () => {
    const promoService: ServiceItem = {
      ...mockFixedService,
      price: 200,
      promotionalPrice: 160,
    };
    const regularService: ServiceItem = {
      ...mockTratamentoService,
      price: 120,
    };

    const composite = buildCompositeService([promoService, regularService]);
    // 160 (promo) + 120 = 280 (not 200 + 120 = 320)
    expect(composite?.price).toBe(280);
  });

  it("R2-Edge.4 - should support zero-cost complimentary procedures in combo", () => {
    const complimentaryProcedure: ServiceItem = {
      id: "srv-complimentary-eval",
      orgId: "org-default-01",
      professionalId: "prof-gleicy",
      title: "Avaliação Capilar com Tricoscópio",
      slug: "avaliacao-tricoscopio",
      category: "outros",
      description: "Cortesia de diagnóstico capilar digital",
      price: 0,
      priceType: "fixed",
      requiresTriage: false,
      isActive: true,
      steps: [
        {
          id: "step-eval-1",
          order: 1,
          title: "Análise Tricológica",
          type: "active",
          durationMin: 20,
          requiresExclusiveAttention: true,
        },
      ],
    };

    const composite = buildCompositeService([mockFixedService, complimentaryProcedure]);
    // Price remains 180 + 0 = 180
    expect(composite?.price).toBe(180);
    // Duration increases by 20 min: 90 + 20 = 110 min
    const totalDuration = composite?.steps.reduce((sum, s) => sum + s.durationMin, 0);
    expect(totalDuration).toBe(110);
  });

  it("R2-Edge.5 - should prefix individual step titles with service title for scheduling timeline clarity", () => {
    const selected = [mockFixedService, mockTratamentoService];
    const composite = buildCompositeService(selected);

    const stepTitles = composite?.steps.map((s) => s.title) || [];
    expect(stepTitles[0]).toContain("Corte Especializado em Cachos:");
    expect(stepTitles[2]).toContain("Nutrição Lipídica Intensiva:");
  });

  it("R2-Edge.6 - should set requiresTriage: false when all selected procedures do not require triage", () => {
    const nonTriageA = { ...mockFixedService, requiresTriage: false };
    const nonTriageB = { ...mockTratamentoService, requiresTriage: false };

    const composite = buildCompositeService([nonTriageA, nonTriageB]);
    expect(composite?.requiresTriage).toBe(false);
    expect(composite?.triageFormId).toBeUndefined();
  });
});
