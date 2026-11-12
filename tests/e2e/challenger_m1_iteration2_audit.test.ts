import { describe, it, expect, beforeEach } from "vitest";
import { ServiceItem } from "@/types/service";
import { buildCompositeService } from "@/lib/services/composite";
import { formatBRL } from "@/lib/utils";
import { mockFixedService, mockStartingAtService } from "../fixtures/services.fixture";

describe("Challenger M1.4: Empirical Stress-Test & Defect Verification (Milestone 1 Iteration 2)", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  // --- DEFECT A VERIFICATION: PROMOTIONAL PRICE HIERARCHY ---
  describe("Defect A: Promotional Price Display Hierarchy Oracle", () => {
    // Model exact rendering condition from TransparentServicesCatalog.tsx (lines 283-298)
    function resolveCatalogPriceDisplay(service: ServiceItem) {
      if (service.priceType === "starting_at") {
        return {
          mode: "starting_at",
          primary: formatBRL(service.price),
          rangeUpper:
            service.maxPrice && service.maxPrice > service.price
              ? formatBRL(service.maxPrice)
              : undefined,
        };
      } else if (service.promotionalPrice && service.promotionalPrice < service.price) {
        return {
          mode: "promotional",
          primary: formatBRL(service.promotionalPrice),
          strikethrough: formatBRL(service.price),
        };
      } else {
        return {
          mode: "fixed",
          primary: formatBRL(service.price),
          strikethrough: undefined,
        };
      }
    }

    it("A.1 - renders promotional price as prominent and original price as strikethrough when promotionalPrice < price", () => {
      const srv: ServiceItem = {
        ...mockFixedService,
        id: "srv-promo-1",
        title: "Corte Especializado",
        price: 200,
        promotionalPrice: 160,
        priceType: "fixed",
      };

      const display = resolveCatalogPriceDisplay(srv);
      expect(display.mode).toBe("promotional");
      expect(display.primary).toContain("160,00");
      expect(display.strikethrough).toContain("200,00");
    });

    it("A.2 - gracefully handles data entry error where promotionalPrice >= price without showing inverted discount", () => {
      const srvInverted: ServiceItem = {
        ...mockFixedService,
        id: "srv-promo-inv",
        title: "Inverted Promo",
        price: 150,
        promotionalPrice: 180, // Error: promo is higher than original price
        priceType: "fixed",
      };

      const display = resolveCatalogPriceDisplay(srvInverted);
      expect(display.mode).toBe("fixed");
      expect(display.primary).toContain("150,00");
      expect(display.strikethrough).toBeUndefined();
    });

    it("A.3 - gracefully handles identical promotionalPrice === price without redundant strikethrough", () => {
      const srvEqual: ServiceItem = {
        ...mockFixedService,
        id: "srv-promo-eq",
        title: "Equal Price",
        price: 150,
        promotionalPrice: 150,
        priceType: "fixed",
      };

      const display = resolveCatalogPriceDisplay(srvEqual);
      expect(display.mode).toBe("fixed");
      expect(display.primary).toContain("150,00");
      expect(display.strikethrough).toBeUndefined();
    });

    it("A.4 - correctly identifies starting_at pricing without promotional strikethrough", () => {
      const srvStarting: ServiceItem = {
        ...mockStartingAtService,
        id: "srv-start-1",
        title: "Mechas Criativas",
        price: 350,
        maxPrice: 650,
        priceType: "starting_at",
      };

      const display = resolveCatalogPriceDisplay(srvStarting);
      expect(display.mode).toBe("starting_at");
      expect(display.primary).toContain("350,00");
      expect(display.rangeUpper).toContain("650,00");
    });
  });

  // --- DEFECT B VERIFICATION: WHATSAPP INQUIRY TEXT ---
  describe("Defect B: WhatsApp Inquiry Message Generation Oracle", () => {
    // Model exact URL computation from TransparentServicesCatalog.tsx (lines 366-374)
    function buildWhatsAppUrl(service: ServiceItem, whatsappNumber: string = "5511999999999") {
      const quotePrice =
        service.promotionalPrice && service.promotionalPrice < service.price
          ? formatBRL(service.promotionalPrice)
          : formatBRL(service.price);

      return `https://wa.me/${whatsappNumber}?text=Olá%20Gleicy!%20Tenho%20dúvidas%20sobre%20*${encodeURIComponent(
        service.title
      )}*%20(${service.priceType === "starting_at" ? "a partir de " : ""}${quotePrice}).`;
    }

    it("B.1 - WhatsApp URL quotes the promotional price when promotion is active", () => {
      const srvPromo: ServiceItem = {
        ...mockFixedService,
        id: "srv-promo-wa",
        title: "Corte Especializado",
        price: 200,
        promotionalPrice: 160,
        priceType: "fixed",
      };

      const url = buildWhatsAppUrl(srvPromo);
      expect(url).toContain("160,00");
      expect(url).not.toContain("200,00");
    });

    it("B.2 - WhatsApp URL includes 'a partir de ' prefix for range services", () => {
      const srvStarting: ServiceItem = {
        ...mockStartingAtService,
        id: "srv-start-wa",
        title: "Morena Iluminada",
        price: 380,
        priceType: "starting_at",
      };

      const url = buildWhatsAppUrl(srvStarting);
      expect(url).toContain("a partir de ");
      expect(url).toContain("380,00");
    });

    it("B.3 - WhatsApp URL properly percent-encodes titles with accents and symbols", () => {
      const srvComplex: ServiceItem = {
        ...mockFixedService,
        id: "srv-complex-wa",
        title: "Spa Capilar & Nutrição Profunda / Reconstrução",
        price: 220,
        promotionalPrice: 190,
        priceType: "fixed",
      };

      const url = buildWhatsAppUrl(srvComplex);
      expect(url).toContain(encodeURIComponent("Spa Capilar & Nutrição Profunda / Reconstrução"));
      expect(url).toContain("190,00");
    });

    it("B.4 - WhatsApp URL ignores invalid promotional price where promo >= price", () => {
      const srvInverted: ServiceItem = {
        ...mockFixedService,
        id: "srv-inv-wa",
        title: "Teste",
        price: 100,
        promotionalPrice: 120,
        priceType: "fixed",
      };

      const url = buildWhatsAppUrl(srvInverted);
      expect(url).toContain("100,00");
      expect(url).not.toContain("120,00");
    });
  });

  // --- DEFECT C VERIFICATION: COMPOSITE SERVICE DEFENSIVE GUARDS ---
  describe("Defect C: Defensive Guards & Edge Cases in buildCompositeService", () => {
    it("C.1 - returns null safely when passed empty array []", () => {
      expect(buildCompositeService([])).toBeNull();
    });

    it("C.2 - returns null safely when passed null or undefined as any", () => {
      expect(buildCompositeService(null as any)).toBeNull();
      expect(buildCompositeService(undefined as any)).toBeNull();
    });

    it("C.3 - returns exact single service reference without mutation when array length is 1", () => {
      const single: ServiceItem = {
        ...mockFixedService,
        id: "srv-single-1",
        title: "Procedimento Único",
        price: 150,
        priceType: "fixed",
      };

      const result = buildCompositeService([single]);
      expect(result).toBe(single);
    });

    it("C.4 - sums promotional price when available, falling back to regular price", () => {
      const s1: ServiceItem = {
        ...mockFixedService,
        id: "s1",
        title: "Serviço 1 Promo",
        price: 200,
        promotionalPrice: 160,
        priceType: "fixed",
      };

      const s2: ServiceItem = {
        ...mockFixedService,
        id: "s2",
        title: "Serviço 2 Regular",
        price: 100,
        promotionalPrice: undefined,
        priceType: "fixed",
      };

      const composite = buildCompositeService([s1, s2]);
      expect(composite?.price).toBe(260); // 160 + 100
      expect(composite?.title).toBe("Serviço 1 Promo + Serviço 2 Regular");
    });

    it("C.5 - handles composite with 5 procedures including missing steps, custom triage, and mixed pricing types", () => {
      const procedures: ServiceItem[] = [
        {
          ...mockFixedService,
          id: "p1",
          title: "Corte",
          price: 180,
          promotionalPrice: 150,
          priceType: "fixed",
          steps: [
            {
              id: "st1",
              order: 1,
              title: "Corte a seco",
              type: "active",
              durationMin: 45,
              requiresExclusiveAttention: true,
            },
          ],
        },
        {
          ...mockFixedService,
          id: "p2",
          title: "Tratamento",
          price: 120,
          promotionalPrice: undefined,
          priceType: "fixed",
          steps: [], // empty steps: must generate fallback step
        },
        {
          ...mockFixedService,
          id: "p3",
          title: "Avaliação",
          price: 0,
          promotionalPrice: undefined,
          priceType: "fixed",
          requiresTriage: true,
          triageFormId: "tf-specialized",
        },
        {
          ...mockStartingAtService,
          id: "p4",
          title: "Mechas",
          price: 350,
          maxPrice: 600,
          priceType: "starting_at",
        },
        {
          ...mockFixedService,
          id: "p5",
          title: "Finalização",
          price: 80,
          promotionalPrice: undefined,
          priceType: "fixed",
        },
      ];

      const composite = buildCompositeService(procedures);
      expect(composite).toBeDefined();

      // Price: 150 (p1) + 120 (p2) + 0 (p3) + 350 (p4) + 80 (p5) = 700
      expect(composite?.price).toBe(700);

      // Price type: starting_at because p4 is starting_at
      expect(composite?.priceType).toBe("starting_at");

      // Triage: true and specialized form preserved
      expect(composite?.requiresTriage).toBe(true);
      expect(composite?.triageFormId).toBe("tf-specialized");

      // Procedures list
      expect(composite?.procedures).toHaveLength(5);

      // Sequential monotonic steps order 1..N
      expect(composite?.steps.length).toBeGreaterThanOrEqual(5);
      const orders = composite?.steps.map((st) => st.order);
      const expectedOrders = composite?.steps.map((_, idx) => idx + 1);
      expect(orders).toEqual(expectedOrders);
    });

    it("C.6 - Page handler simulation: aborts cleanly when input is empty without throwing", () => {
      let selectedState: ServiceItem | null = null;
      let modalOpen = true;

      const handleConfirmMultiServices = (selectedServices: ServiceItem[]) => {
        if (!selectedServices || selectedServices.length === 0) return;

        if (selectedServices.length === 1) {
          selectedState = selectedServices[0];
          modalOpen = false;
          return;
        }

        const compositeService = buildCompositeService(selectedServices);
        if (!compositeService) return;
        modalOpen = false;
        selectedState = compositeService;
      };

      // Empty invocation
      expect(() => handleConfirmMultiServices([])).not.toThrow();
      expect(selectedState).toBeNull();
      expect(modalOpen).toBe(true);

      // Null invocation
      expect(() => handleConfirmMultiServices(null as any)).not.toThrow();
      expect(selectedState).toBeNull();
      expect(modalOpen).toBe(true);

      // Multi-service invocation
      const validItems = [
        { ...mockFixedService, id: "m1", title: "Corte", price: 100 },
        { ...mockFixedService, id: "m2", title: "Escova", price: 80 },
      ];
      handleConfirmMultiServices(validItems);
      expect(modalOpen).toBe(false);
      expect(selectedState).not.toBeNull();
      expect((selectedState as any)?.price).toBe(180);
    });
  });
});
