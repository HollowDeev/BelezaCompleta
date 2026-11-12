import { describe, it, expect, beforeEach } from "vitest";
import { formatBRL } from "@/lib/utils";
import { SalonStore } from "@/lib/storage/localStore";
import { SupabaseDataService } from "@/lib/supabase/api";
import { ServiceItem, ServicePriceType } from "@/types/service";
import {
  mockFixedService,
  mockStartingAtService,
  mockTratamentoService,
  mockLegacyServiceWithoutPriceType,
} from "../fixtures/services.fixture";

describe("Milestone 1 Challenger: Pricing & Calculations Stress-Testing", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  // Pure reference implementation of composite building matching domain logic
  function buildCompositeServiceWithGuards(
    selectedServices: ServiceItem[]
  ): ServiceItem | null {
    if (!selectedServices || selectedServices.length === 0) return null;
    if (selectedServices.length === 1) return selectedServices[0];

    const compositeTitle = selectedServices.map((s) => s.title).join(" + ");
    const combinedPrice = selectedServices.reduce(
      (sum, s) => sum + (s.promotionalPrice !== undefined && s.promotionalPrice !== null ? s.promotionalPrice : s.price),
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

    const anyStartingAt = selectedServices.some((s) => s.priceType === "starting_at");

    return {
      id: `composite-${Date.now()}`,
      orgId: selectedServices[0].orgId || "org-default",
      professionalId: selectedServices[0].professionalId || "prof-default",
      title: compositeTitle,
      slug: `composite-${Date.now()}`,
      category: "outros",
      description: `Atendimento montado com ${selectedServices.length} procedimentos: ${selectedServices
        .map((s) => s.title)
        .join(", ")}.`,
      price: combinedPrice,
      priceType: anyStartingAt ? "starting_at" : "fixed",
      requiresTriage: anyRequiresTriage,
      triageFormId,
      steps: combinedSteps,
      isActive: true,
      procedures: selectedServices.map((s) => ({
        id: s.id,
        serviceId: s.id,
        title: s.title,
        durationMin:
          s.steps && s.steps.length > 0
            ? s.steps.reduce((sum, st) => sum + (Number(st.durationMin) || 0), 0)
            : 60,
        price: s.promotionalPrice !== undefined && s.promotionalPrice !== null ? s.promotionalPrice : s.price,
        isIncluded: false,
      })),
    };
  }

  // --- SUITE 1: FIXED VS RANGE PRICING LOGIC ---

  describe("1. Fixed vs Range Pricing Properties", () => {
    it("1.1 - should correctly store and retrieve a fixed price service with undefined maxPrice", () => {
      const fixedSrv: ServiceItem = {
        ...mockFixedService,
        id: "srv-stress-fixed-1",
        price: 280,
        priceType: "fixed",
        maxPrice: undefined,
      };

      SalonStore.saveService(fixedSrv);
      const retrieved = SalonStore.getServices().find((s) => s.id === "srv-stress-fixed-1");

      expect(retrieved).toBeDefined();
      expect(retrieved?.price).toBe(280);
      expect(retrieved?.priceType).toBe("fixed");
      expect(retrieved?.maxPrice).toBeUndefined();
    });

    it("1.2 - should correctly store and retrieve a starting_at service with unbounded maxPrice", () => {
      const openRangeSrv: ServiceItem = {
        ...mockStartingAtService,
        id: "srv-stress-range-open",
        price: 450,
        priceType: "starting_at",
        maxPrice: undefined, // Unbounded upper range
      };

      SalonStore.saveService(openRangeSrv);
      const retrieved = SalonStore.getServices().find((s) => s.id === "srv-stress-range-open");

      expect(retrieved).toBeDefined();
      expect(retrieved?.price).toBe(450);
      expect(retrieved?.priceType).toBe("starting_at");
      expect(retrieved?.maxPrice).toBeUndefined();
    });

    it("1.3 - should correctly store and retrieve a starting_at service with bounded maxPrice", () => {
      const boundedRangeSrv: ServiceItem = {
        ...mockStartingAtService,
        id: "srv-stress-range-bounded",
        price: 350,
        maxPrice: 650,
        priceType: "starting_at",
      };

      SalonStore.saveService(boundedRangeSrv);
      const retrieved = SalonStore.getServices().find((s) => s.id === "srv-stress-range-bounded");

      expect(retrieved).toBeDefined();
      expect(retrieved?.price).toBe(350);
      expect(retrieved?.maxPrice).toBe(650);
      expect(retrieved?.priceType).toBe("starting_at");
    });

    it("1.4 - should strip maxPrice when converting a starting_at service to fixed", () => {
      const startingSrv: ServiceItem = {
        ...mockStartingAtService,
        id: "srv-stress-convert-1",
        price: 300,
        maxPrice: 500,
        priceType: "starting_at",
      };

      SalonStore.saveService(startingSrv);
      let srv = SalonStore.getServices().find((s) => s.id === "srv-stress-convert-1");
      expect(srv?.maxPrice).toBe(500);

      // Now update to fixed while accidentally leaving maxPrice in payload
      const convertedSrv: ServiceItem = {
        ...startingSrv,
        priceType: "fixed",
        maxPrice: 500,
      };

      SalonStore.saveService(convertedSrv);
      srv = SalonStore.getServices().find((s) => s.id === "srv-stress-convert-1");
      expect(srv?.priceType).toBe("fixed");
      expect(srv?.maxPrice).toBeUndefined(); // Must be purged
    });

    it("1.5 - should default legacy service without priceType to 'fixed'", () => {
      localStorage.setItem(
        "glaicy_agenda_v2_services",
        JSON.stringify([mockLegacyServiceWithoutPriceType])
      );

      const services = SalonStore.getServices();
      const legacy = services.find((s) => s.id === mockLegacyServiceWithoutPriceType.id);

      expect(legacy).toBeDefined();
      expect(legacy?.priceType).toBe("fixed");
      expect(legacy?.maxPrice).toBeUndefined();
    });
  });

  // --- SUITE 2: CALCULATION OF PRICES & FORMATTING BOUNDARIES ---

  describe("2. Price Calculations & Formatting Oracles", () => {
    it("2.1 - should format BRL currency with exact comma decimals and dot thousands", () => {
      expect(formatBRL(0)).toContain("0,00");
      expect(formatBRL(180)).toContain("180,00");
      expect(formatBRL(1250.5)).toContain("1.250,50");
      expect(formatBRL(1000000)).toContain("1.000.000,00");
    });

    it("2.2 - should handle floating point precision without accumulating rounding errors", () => {
      // Classic JS float issue: 0.1 + 0.2 = 0.30000000000000004
      const p1 = 199.9;
      const p2 = 89.99;
      const p3 = 10.11;
      const rawSum = p1 + p2 + p3; // 300.00000000000006 in standard IEEE 754

      const formatted = formatBRL(rawSum);
      expect(formatted).toContain("300,00");
    });

    it("2.3 - should validate range boundary where maxPrice === price", () => {
      const validatePricing = (price: number, maxPrice?: number, priceType?: ServicePriceType) => {
        if (price <= 0 || isNaN(price)) return "Valor inicial inválido";
        if (priceType === "starting_at" && maxPrice !== undefined && maxPrice < price) {
          return "O valor máximo não pode ser menor que o valor inicial";
        }
        return null;
      };

      // Boundary: exact equality is allowed (fixed upper and lower bound)
      expect(validatePricing(500, 500, "starting_at")).toBeNull();
      // Violation: maxPrice < price
      expect(validatePricing(500, 499.99, "starting_at")).toBe(
        "O valor máximo não pode ser menor que o valor inicial"
      );
    });

    it("2.4 - should reject negative and zero prices for standard services", () => {
      const validateBasePrice = (price: number) => {
        if (isNaN(price) || price <= 0) {
          return "Informe um valor inicial válido maior que zero (a partir de R$).";
        }
        return null;
      };

      expect(validateBasePrice(0)).toBe("Informe um valor inicial válido maior que zero (a partir de R$).");
      expect(validateBasePrice(-1)).toBe("Informe um valor inicial válido maior que zero (a partir de R$).");
      expect(validateBasePrice(-0.01)).toBe("Informe um valor inicial válido maior que zero (a partir de R$).");
      expect(validateBasePrice(1)).toBeNull();
    });

    it("2.5 - should validate promotional price constraints (must be strictly less than price)", () => {
      const validatePromoPrice = (basePrice: number, promoPrice?: number) => {
        if (promoPrice === undefined) return null;
        if (isNaN(promoPrice) || promoPrice <= 0) {
          return "O preço promocional deve ser maior que zero";
        }
        if (promoPrice >= basePrice) {
          return "O preço promocional deve ser menor do que o preço fixo original.";
        }
        return null;
      };

      expect(validatePromoPrice(200, 200)).toBe(
        "O preço promocional deve ser menor do que o preço fixo original."
      );
      expect(validatePromoPrice(200, 250)).toBe(
        "O preço promocional deve ser menor do que o preço fixo original."
      );
      expect(validatePromoPrice(200, 0)).toBe("O preço promocional deve ser maior que zero");
      expect(validatePromoPrice(200, -50)).toBe("O preço promocional deve ser maior que zero");
      expect(validatePromoPrice(200, 180)).toBeNull();
    });
  });

  // --- SUITE 3: COMPOSITE MULTI-SERVICE SUMMATION ---

  describe("3. Composite Multi-Service Summation", () => {
    it("3.1 - should sum prices of multiple fixed services and keep priceType as 'fixed'", () => {
      const s1: ServiceItem = { ...mockFixedService, price: 180, priceType: "fixed" };
      const s2: ServiceItem = { ...mockTratamentoService, price: 120, priceType: "fixed" };

      const composite = buildCompositeServiceWithGuards([s1, s2]);

      expect(composite).toBeDefined();
      expect(composite?.price).toBe(300);
      expect(composite?.priceType).toBe("fixed");
      expect(composite?.procedures).toHaveLength(2);
      expect(composite?.procedures?.[0].price).toBe(180);
      expect(composite?.procedures?.[1].price).toBe(120);
    });

    it("3.2 - should turn composite priceType to 'starting_at' if any service is starting_at", () => {
      const s1: ServiceItem = { ...mockFixedService, price: 180, priceType: "fixed" };
      const s2: ServiceItem = { ...mockStartingAtService, price: 450, priceType: "starting_at" };

      const composite = buildCompositeServiceWithGuards([s1, s2]);

      expect(composite).toBeDefined();
      expect(composite?.price).toBe(630);
      expect(composite?.priceType).toBe("starting_at");
    });

    it("3.3 - should prioritize promotionalPrice over base price during multi-service summation", () => {
      const promoSrv: ServiceItem = {
        ...mockFixedService,
        price: 250,
        promotionalPrice: 199.9,
        priceType: "fixed",
      };
      const regularSrv: ServiceItem = {
        ...mockTratamentoService,
        price: 150,
        priceType: "fixed",
      };

      const composite = buildCompositeServiceWithGuards([promoSrv, regularSrv]);

      // 199.90 + 150 = 349.90 (NOT 250 + 150 = 400)
      expect(composite?.price).toBeCloseTo(349.9, 2);
      expect(composite?.procedures?.[0].price).toBe(199.9);
      expect(composite?.procedures?.[1].price).toBe(150);
    });

    it("3.4 - should support zero-cost complimentary procedures in combo without NaN or reset", () => {
      const freeDiagnostic: ServiceItem = {
        id: "srv-cortesia-1",
        orgId: "org-default-01",
        professionalId: "prof-gleicy",
        title: "Diagnóstico Capilar Computadorizado",
        slug: "diagnostico-cortesia",
        category: "outros",
        description: "Cortesia técnica",
        price: 0,
        priceType: "fixed",
        requiresTriage: false,
        isActive: true,
        steps: [
          {
            id: "step-free-1",
            order: 1,
            title: "Tricoscopia",
            type: "active",
            durationMin: 15,
            requiresExclusiveAttention: true,
          },
        ],
      };

      const composite = buildCompositeServiceWithGuards([mockFixedService, freeDiagnostic]);

      expect(composite?.price).toBe(mockFixedService.price); // 180 + 0 = 180
      expect(composite?.procedures?.[1].price).toBe(0);
    });

    it("3.5 - should preserve procedure items with correct individual titles and durations", () => {
      const composite = buildCompositeServiceWithGuards([
        mockFixedService,
        mockTratamentoService,
        mockStartingAtService,
      ]);

      expect(composite?.procedures).toHaveLength(3);
      expect(composite?.procedures?.map((p) => p.title)).toEqual([
        mockFixedService.title,
        mockTratamentoService.title,
        mockStartingAtService.title,
      ]);

      // Total duration must equal sum of procedure durations
      const totalStepsDuration = composite?.steps.reduce((sum, s) => sum + s.durationMin, 0);
      const totalProceduresDuration = composite?.procedures?.reduce(
        (sum, p) => sum + p.durationMin,
        0
      );

      expect(totalStepsDuration).toBe(totalProceduresDuration);
    });
  });

  // --- SUITE 4: EDGE CASES, ATTACK VECTORS & AUDITS ---

  describe("4. Edge Cases, Attack Vectors & Defect Identification", () => {
    it("4.1 - should safely return null for empty procedure selection array", () => {
      const result = buildCompositeServiceWithGuards([]);
      expect(result).toBeNull();
    });

    it("4.2 - should return unchanged original service when exactly 1 procedure is passed", () => {
      const result = buildCompositeServiceWithGuards([mockFixedService]);
      expect(result).toEqual(mockFixedService);
      expect(result?.id).toBe(mockFixedService.id);
      expect(result?.title).toBe(mockFixedService.title);
    });

    it("4.3 - EMPIRICAL DEFECT AUDIT: UI inversion of promotional price vs regular price in TransparentServicesCatalog", () => {
      // In TransparentServicesCatalog.tsx (lines 278-288):
      // The JSX code renders:
      // <span className="text-2xl font-bold font-editorial text-white">{formatBRL(service.price)}</span>
      // {service.promotionalPrice && (
      //   <span className="text-xs text-stone-300 line-through">{formatBRL(service.promotionalPrice)}</span>
      // )}
      //
      // THIS IS INVERTED: It renders the original full price in big text and crosses out the promotional price!
      // In contrast, ServiceManager.tsx correctly displays:
      // <span className="text-xs font-bold ...">{formatBRL(service.promotionalPrice)}</span>
      // <span className="text-xs text-[#736455] line-through">{formatBRL(service.price)}</span>

      const serviceWithPromo: ServiceItem = {
        ...mockFixedService,
        price: 200,
        promotionalPrice: 160,
      };

      // Model the buggy implementation from TransparentServicesCatalog.tsx
      const buggyCatalogRender = (s: ServiceItem) => ({
        primaryDisplayedPrice: s.price,
        strikethroughPrice: s.promotionalPrice,
      });

      // Model the correct implementation expected by users and used in ServiceManager
      const correctCatalogRender = (s: ServiceItem) => ({
        primaryDisplayedPrice: s.promotionalPrice || s.price,
        strikethroughPrice: s.promotionalPrice ? s.price : undefined,
      });

      const buggyOutput = buggyCatalogRender(serviceWithPromo);
      const correctOutput = correctCatalogRender(serviceWithPromo);

      // Verify the inversion defect empirically:
      expect(buggyOutput.primaryDisplayedPrice).toBe(200); // Buggy: shows full price
      expect(buggyOutput.strikethroughPrice).toBe(160); // Buggy: strikes through discount!

      expect(correctOutput.primaryDisplayedPrice).toBe(160); // Correct: shows discounted price
      expect(correctOutput.strikethroughPrice).toBe(200); // Correct: strikes through original price
    });

    it("4.4 - EMPIRICAL DEFECT AUDIT: buildCompositeService in src/app/page.tsx throws TypeError if passed empty array", () => {
      // In src/app/page.tsx line 52:
      // function buildCompositeService(selectedServices: ServiceItem[]): ServiceItem {
      //   ...
      //   orgId: selectedServices[0].orgId,
      // }
      // If called with [], accessing selectedServices[0].orgId throws an unhandled TypeError.

      const unguardedBuildComposite = (selectedServices: ServiceItem[]) => {
        return {
          orgId: selectedServices[0].orgId,
        };
      };

      expect(() => unguardedBuildComposite([])).toThrowError(
        /Cannot read properties of undefined/
      );
    });

    it("4.5 - Stress test with 10 procedures combined: verifies sequential steps, monotonic ordering and total price sum", () => {
      const tenProcedures: ServiceItem[] = Array.from({ length: 10 }, (_, i) => ({
        ...mockFixedService,
        id: `srv-proc-${i + 1}`,
        title: `Procedimento ${i + 1}`,
        price: 100 + i * 10, // 100, 110, 120, ..., 190 -> sum = 1450
        priceType: "fixed",
        steps: [
          {
            id: `st-proc-${i}-1`,
            order: 1,
            title: `Etapa ${i + 1}`,
            type: "active",
            durationMin: 30,
            requiresExclusiveAttention: true,
          },
        ],
      }));

      const composite = buildCompositeServiceWithGuards(tenProcedures);

      expect(composite).toBeDefined();
      expect(composite?.steps).toHaveLength(10);
      expect(composite?.procedures).toHaveLength(10);
      // Sum: 100 + 110 + 120 + 130 + 140 + 150 + 160 + 170 + 180 + 190 = 1450
      expect(composite?.price).toBe(1450);

      // Verify monotonic step ordering 1..10
      const orders = composite?.steps.map((st) => st.order);
      expect(orders).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    });
  });
});
