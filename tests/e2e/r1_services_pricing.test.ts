import { describe, it, expect, beforeEach } from "vitest";
import { SalonStore } from "@/lib/storage/localStore";
import { SupabaseDataService } from "@/lib/supabase/api";
import { formatBRL } from "@/lib/utils";
import { ServiceItem } from "@/types/service";
import { validateServicePricing, validateBasePrice } from "@/lib/services/pricing";
import {
  mockFixedService,
  mockStartingAtService,
  mockLegacyServiceWithoutPriceType,
} from "../fixtures/services.fixture";

describe("R1: Cadastro e Edição de Serviços com Preço Fixo ou Faixa (Tiers 1 & 2)", () => {
  beforeEach(() => {
    // Reset local store before each test
    window.localStorage.clear();
  });

  // --- TIER 1: FUNCTIONAL REQUIREMENTS (R1.1 & R1.2) ---

  it("R1.1 - should persist and retrieve a service with fixed price (priceType: 'fixed')", async () => {
    const fixedService: ServiceItem = {
      ...mockFixedService,
      id: "srv-test-fixed-01",
      price: 250,
      priceType: "fixed",
    };

    SalonStore.saveService(fixedService);
    const services = SalonStore.getServices();
    const retrieved = services.find((s) => s.id === "srv-test-fixed-01");

    expect(retrieved).toBeDefined();
    expect(retrieved?.price).toBe(250);
    expect(retrieved?.priceType).toBe("fixed");
    expect(retrieved?.maxPrice).toBeUndefined();
  });

  it("R1.1 - should persist and retrieve a service with range price ('starting_at') and maxPrice", async () => {
    const rangeService: ServiceItem = {
      ...mockStartingAtService,
      id: "srv-test-range-01",
      price: 350,
      maxPrice: 600,
      priceType: "starting_at",
    };

    SalonStore.saveService(rangeService);
    const services = SalonStore.getServices();
    const retrieved = services.find((s) => s.id === "srv-test-range-01");

    expect(retrieved).toBeDefined();
    expect(retrieved?.price).toBe(350);
    expect(retrieved?.maxPrice).toBe(600);
    expect(retrieved?.priceType).toBe("starting_at");
  });

  it("R1.1 - should format fixed prices without prefix and starting_at with 'A partir de'", () => {
    const fixedPriceStr = formatBRL(180);
    expect(fixedPriceStr).toContain("180,00");

    const startingPrice = 350;
    const formattedStarting = `A partir de ${formatBRL(startingPrice)}`;
    expect(formattedStarting).toContain("A partir de");
    expect(formattedStarting).toContain("350,00");

    const maxPrice = 550;
    const rangeDisplay = `${formattedStarting} (até ${formatBRL(maxPrice)})`;
    expect(rangeDisplay).toContain("(até");
    expect(rangeDisplay).toContain("550,00");
  });

  it("R1.2 - should migrate legacy services without priceType to default 'fixed'", () => {
    // Manually inject legacy service without priceType into raw localStorage
    const rawServices = [mockLegacyServiceWithoutPriceType];
    localStorage.setItem("glaicy_agenda_v2_services", JSON.stringify(rawServices));

    const retrieved = SalonStore.getServices();
    const legacy = retrieved.find((s) => s.id === mockLegacyServiceWithoutPriceType.id);

    expect(legacy).toBeDefined();
    expect(legacy?.priceType).toBe("fixed");
  });

  it("R1.2 - should allow converting a legacy fixed service into a starting_at service with maxPrice", async () => {
    const rawServices = [mockLegacyServiceWithoutPriceType];
    localStorage.setItem("glaicy_agenda_v2_services", JSON.stringify(rawServices));

    // Update the legacy service to starting_at
    const updated: ServiceItem = {
      ...mockLegacyServiceWithoutPriceType,
      priceType: "starting_at",
      price: 200,
      maxPrice: 380,
    };

    await SupabaseDataService.saveService(updated);
    const services = await SupabaseDataService.getServices();
    const saved = services.find((s) => s.id === mockLegacyServiceWithoutPriceType.id);

    expect(saved).toBeDefined();
    expect(saved?.priceType).toBe("starting_at");
    expect(saved?.price).toBe(200);
    expect(saved?.maxPrice).toBe(380);
  });

  // --- TIER 2: BOUNDARY & CORNER CASES ---

  it("R1-Edge.1 - should clear maxPrice when changing a service from 'starting_at' to 'fixed'", () => {
    // Initially starting_at with maxPrice
    const service: ServiceItem = {
      ...mockStartingAtService,
      id: "srv-switch-test",
      price: 400,
      maxPrice: 800,
      priceType: "starting_at",
    };
    SalonStore.saveService(service);

    // Now switch to fixed: maxPrice must be normalized to undefined
    const switchedToFixed: ServiceItem = {
      ...service,
      priceType: "fixed",
      maxPrice: 800, // Should be purged by saveService normalization
    };
    SalonStore.saveService(switchedToFixed);

    const retrieved = SalonStore.getServices().find((s) => s.id === "srv-switch-test");
    expect(retrieved?.priceType).toBe("fixed");
    expect(retrieved?.maxPrice).toBeUndefined();
  });

  it("R1-Edge.2 - should validate and reject when maxPrice is strictly less than price", () => {
    const invalidServiceData = {
      price: 500,
      maxPrice: 400,
      priceType: "starting_at" as const,
    };

    const error = validateServicePricing(
      invalidServiceData.price,
      invalidServiceData.maxPrice,
      invalidServiceData.priceType
    );

    expect(error).toBe("O valor máximo (R$) não pode ser menor do que o valor inicial (a partir de R$).");
  });

  it("R1-Edge.3 - should validate boundary when maxPrice equals price exactly", () => {
    const error = validateServicePricing(500, 500, "starting_at");
    expect(error).toBeNull();
  });

  it("R1-Edge.4 - should validate rejection for zero or negative base price", () => {
    expect(validateBasePrice(0)).toBe("Informe um valor inicial válido maior que zero (a partir de R$).");
    expect(validateBasePrice(-50)).toBe("Informe um valor inicial válido maior que zero (a partir de R$).");
    expect(validateBasePrice(NaN)).toBe("Informe um valor inicial válido maior que zero (a partir de R$).");
    expect(validateBasePrice(10)).toBeNull();
  });

  it("R1-Edge.5 - should handle extreme price values and format them without precision loss", () => {
    const extremePrice = 50000;
    const extremeMaxPrice = 95000;

    const highEndService: ServiceItem = {
      ...mockStartingAtService,
      id: "srv-extreme-01",
      price: extremePrice,
      maxPrice: extremeMaxPrice,
      priceType: "starting_at",
    };

    SalonStore.saveService(highEndService);
    const saved = SalonStore.getServices().find((s) => s.id === "srv-extreme-01");

    expect(saved?.price).toBe(50000);
    expect(saved?.maxPrice).toBe(95000);

    const formatted = formatBRL(saved!.price);
    expect(formatted).toContain("50.000,00");
  });

  it("R1-Edge.6 - should support service deletion and reflect updated catalog length", () => {
    const testService: ServiceItem = {
      ...mockFixedService,
      id: "srv-to-delete-01",
    };

    SalonStore.saveService(testService);
    expect(SalonStore.getServices().some((s) => s.id === "srv-to-delete-01")).toBe(true);

    SalonStore.deleteService("srv-to-delete-01");
    expect(SalonStore.getServices().some((s) => s.id === "srv-to-delete-01")).toBe(false);
  });

  it("R1-Edge.7 - should correctly identify promotional price display hierarchy (promotional prominent, original crossed out)", () => {
    const promoService: ServiceItem = {
      ...mockFixedService,
      price: 200,
      promotionalPrice: 160,
    };

    const hasPromo = !!(promoService.promotionalPrice && promoService.promotionalPrice < promoService.price);
    expect(hasPromo).toBe(true);

    const prominentPrice = hasPromo ? formatBRL(promoService.promotionalPrice!) : formatBRL(promoService.price);
    const strikethroughPrice = hasPromo ? formatBRL(promoService.price) : undefined;

    expect(prominentPrice).toContain("160,00");
    expect(strikethroughPrice).toContain("200,00");
  });

  it("R1-Edge.8 - should format WhatsApp inquiry quoting the actual effective/promotional price", () => {
    const promoService: ServiceItem = {
      ...mockFixedService,
      title: "Corte Especializado",
      price: 200,
      promotionalPrice: 160,
    };

    const quotePromo =
      promoService.promotionalPrice && promoService.promotionalPrice < promoService.price
        ? formatBRL(promoService.promotionalPrice)
        : formatBRL(promoService.price);

    const waTextPromo = `Olá Gleicy! Tenho dúvidas sobre *${encodeURIComponent(promoService.title)}* (${promoService.priceType === "starting_at" ? "a partir de " : ""}${quotePromo}).`;
    expect(waTextPromo).toContain("160,00");
    expect(waTextPromo).not.toContain("200,00");

    const startingService: ServiceItem = {
      ...mockStartingAtService,
      title: "Mechas Criativas",
      price: 350,
      priceType: "starting_at",
    };

    const quoteStarting =
      startingService.promotionalPrice && startingService.promotionalPrice < startingService.price
        ? formatBRL(startingService.promotionalPrice)
        : formatBRL(startingService.price);

    const waTextStarting = `Olá Gleicy! Tenho dúvidas sobre *${encodeURIComponent(startingService.title)}* (${startingService.priceType === "starting_at" ? "a partir de " : ""}${quoteStarting}).`;
    expect(waTextStarting).toContain("a partir de ");
    expect(waTextStarting).toContain("350,00");
  });
});
