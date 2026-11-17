import { describe, it, expect } from "vitest";
import {
  isCampaignActive,
  getProgressiveDiscount,
  getServiceBlackFridayPrice,
  calculateCartBlackFridayTotal,
  BlackFridayPriceResult,
} from "@/lib/services/blackFridayPricing";
import {
  BlackFridayCampaign,
  BlackFridayCampaignRow,
  BlackFridayDiscountType,
} from "@/types/blackFriday";
import { ServiceItem } from "@/types/service";

// Test fixture helper for services
function createTestService(overrides: Partial<ServiceItem> = {}): ServiceItem {
  return {
    id: "srv-mechas-01",
    orgId: "org-gleicy-default",
    professionalId: "prof-gleicy",
    title: "Mechas Criativas & Design",
    slug: "mechas-criativas",
    category: "mechas",
    description: "Técnica exclusiva de clareamento com proteção capilar",
    price: 450,
    isActive: true,
    requiresTriage: false,
    steps: [
      {
        id: "step-1",
        title: "Aplicação e Descoloração",
        durationMin: 90,
        type: "active",
        order: 1,
      },
    ],
    ...overrides,
  };
}

// Test fixture helper for campaigns
function createMockCampaign(overrides: Partial<BlackFridayCampaign> = {}): BlackFridayCampaign {
  return {
    id: "camp-bf-2026",
    orgId: "org-gleicy-default",
    name: "Black Friday Oficial 2026",
    isActive: true,
    startsAt: "2026-11-01T00:00:00.000Z",
    endsAt: "2026-11-30T23:59:59.999Z",
    restrictSchedule: true,
    restrictedDates: ["2026-11-27", "2026-11-28"],
    servicesConfig: [
      { serviceId: "srv-mechas-01", discountType: "fixed", discountValue: 100 },
      { serviceId: "srv-nutricao-02", discountType: "percentage", discountValue: 20 },
      { serviceId: "srv-botox-03", discountType: "manual", blackPrice: 199.9 },
      { serviceId: "srv-combo-04", discountType: "progressive" },
    ],
    progressiveDiscount: {
      tiers: [
        { minServices: 2, discountPercent: 15 },
        { minServices: 3, discountPercent: 25 },
        { minServices: 4, discountPercent: 35 },
      ],
    },
    ...overrides,
  };
}

describe("Black Friday Pricing Engine (R2 Specification & Integrity)", () => {
  // ===========================================================================
  // 1. isCampaignActive
  // ===========================================================================
  describe("isCampaignActive", () => {
    it("returns false when campaign is null, undefined, or empty", () => {
      expect(isCampaignActive(null)).toBe(false);
      expect(isCampaignActive(undefined)).toBe(false);
      expect(isCampaignActive({} as any)).toBe(false);
    });

    it("returns false when campaign isActive is false", () => {
      const campaign = createMockCampaign({ isActive: false });
      expect(isCampaignActive(campaign)).toBe(false);
    });

    it("returns false when snake_case is_active is false", () => {
      const row: Partial<BlackFridayCampaignRow> = {
        is_active: false,
        starts_at: "2026-11-01T00:00:00Z",
        ends_at: "2026-11-30T23:59:59Z",
      };
      expect(isCampaignActive(row as any)).toBe(false);
    });

    it("returns true when campaign is active and within date window", () => {
      const campaign = createMockCampaign();
      expect(isCampaignActive(campaign, new Date("2026-11-15T12:00:00Z"))).toBe(true);
      expect(isCampaignActive(campaign, "2026-11-20T18:00:00Z")).toBe(true);
    });

    it("returns false when reference date is before startsAt", () => {
      const campaign = createMockCampaign();
      expect(isCampaignActive(campaign, "2026-10-31T23:59:59Z")).toBe(false);
    });

    it("returns false when reference date is after endsAt", () => {
      const campaign = createMockCampaign();
      expect(isCampaignActive(campaign, "2026-12-01T00:00:00Z")).toBe(false);
    });

    it("evaluates boundary dates inclusively", () => {
      const campaign = createMockCampaign();
      expect(isCampaignActive(campaign, "2026-11-01T00:00:00.000Z")).toBe(true);
      expect(isCampaignActive(campaign, "2026-11-30T23:59:59.999Z")).toBe(true);
    });

    it("handles open-ended campaigns (no startsAt or no endsAt)", () => {
      const noStart = createMockCampaign({ startsAt: null });
      expect(isCampaignActive(noStart, "2026-11-10T00:00:00Z")).toBe(true);

      const noEnd = createMockCampaign({ endsAt: null });
      expect(isCampaignActive(noEnd, "2030-01-01T00:00:00Z")).toBe(true);
    });

    it("handles invalid date strings gracefully without throwing", () => {
      const campaign = createMockCampaign();
      expect(isCampaignActive(campaign, "invalid-date-format")).toBe(false);
    });

    it("supports snake_case starts_at and ends_at from database rows", () => {
      const row: Partial<BlackFridayCampaignRow> = {
        is_active: true,
        starts_at: "2026-11-10T00:00:00Z",
        ends_at: "2026-11-20T00:00:00Z",
      };
      expect(isCampaignActive(row as any, "2026-11-15T00:00:00Z")).toBe(true);
      expect(isCampaignActive(row as any, "2026-11-25T00:00:00Z")).toBe(false);
    });
  });

  // ===========================================================================
  // 2. getProgressiveDiscount
  // ===========================================================================
  describe("getProgressiveDiscount", () => {
    it("returns 0 for 0, negative, or NaN service counts", () => {
      const campaign = createMockCampaign();
      expect(getProgressiveDiscount(0, campaign)).toBe(0);
      expect(getProgressiveDiscount(-2, campaign)).toBe(0);
      expect(getProgressiveDiscount(NaN, campaign)).toBe(0);
    });

    it("returns 0 when campaign has no progressive discount configuration", () => {
      const campaign = createMockCampaign({ progressiveDiscount: null });
      expect(getProgressiveDiscount(2, campaign)).toBe(0);
    });

    it("returns 0 when service count is below the lowest tier", () => {
      const campaign = createMockCampaign();
      // lowest tier is minServices: 2
      expect(getProgressiveDiscount(1, campaign)).toBe(0);
    });

    it("returns correct discount matching exact tier thresholds", () => {
      const campaign = createMockCampaign();
      expect(getProgressiveDiscount(2, campaign)).toBe(15);
      expect(getProgressiveDiscount(3, campaign)).toBe(25);
      expect(getProgressiveDiscount(4, campaign)).toBe(35);
    });

    it("matches highest qualifying tier when count is between tiers", () => {
      const campaign = createMockCampaign();
      // 5 services qualifies for tier 4 (35%)
      expect(getProgressiveDiscount(5, campaign)).toBe(35);
      expect(getProgressiveDiscount(10, campaign)).toBe(35);
    });

    it("properly sorts unordered tiers in campaign configuration", () => {
      const campaign = createMockCampaign({
        progressiveDiscount: {
          tiers: [
            { minServices: 4, discountPercent: 40 },
            { minServices: 2, discountPercent: 10 },
            { minServices: 3, discountPercent: 20 },
          ],
        },
      });

      expect(getProgressiveDiscount(1, campaign)).toBe(0);
      expect(getProgressiveDiscount(2, campaign)).toBe(10);
      expect(getProgressiveDiscount(3, campaign)).toBe(20);
      expect(getProgressiveDiscount(4, campaign)).toBe(40);
      expect(getProgressiveDiscount(5, campaign)).toBe(40);
    });

    it("clamps discount percentage between 0 and 100", () => {
      const campaign = createMockCampaign({
        progressiveDiscount: {
          tiers: [
            { minServices: 2, discountPercent: 150 },
            { minServices: 1, discountPercent: -20 },
          ],
        },
      });

      expect(getProgressiveDiscount(1, campaign)).toBe(0);
      expect(getProgressiveDiscount(2, campaign)).toBe(100);
    });

    it("supports snake_case database row format (min_services, discount_percent)", () => {
      const row: Partial<BlackFridayCampaignRow> = {
        is_active: true,
        progressive_discount: {
          tiers: [
            { min_services: 2, discount_percent: 18 },
            { min_services: 3, discount_percent: 30 },
          ],
        },
      };

      expect(getProgressiveDiscount(1, row as any)).toBe(0);
      expect(getProgressiveDiscount(2, row as any)).toBe(18);
      expect(getProgressiveDiscount(3, row as any)).toBe(30);
    });
  });

  // ===========================================================================
  // 3. getServiceBlackFridayPrice — 4 Discount Types & Boundaries
  // ===========================================================================
  describe("getServiceBlackFridayPrice", () => {
    const referenceDate = "2026-11-15T12:00:00Z";

    // --- Type 1: Fixed Discount (R$ off) ---
    describe("Type 1: Fixed Discount (R$ off)", () => {
      it("deducts exact fixed amount in R$", () => {
        const service = createTestService({ id: "srv-mechas-01", price: 450 });
        const campaign = createMockCampaign();

        const result = getServiceBlackFridayPrice(service, campaign, { referenceDate });
        expect(result.originalPrice).toBe(450);
        expect(result.finalPrice).toBe(350);
        expect(result.discountAmount).toBe(100);
        expect(result.discountType).toBe("fixed");
        expect(result.isPromotional).toBe(true);
        expect(result.discountPercent).toBeCloseTo(22.22, 2);
      });

      it("guarantees non-negative final price when fixed discount exceeds original price", () => {
        const service = createTestService({ id: "srv-mechas-01", price: 60 });
        const campaign = createMockCampaign({
          servicesConfig: [
            { serviceId: "srv-mechas-01", discountType: "fixed", discountValue: 100 },
          ],
        });

        const result = getServiceBlackFridayPrice(service, campaign, { referenceDate });
        expect(result.originalPrice).toBe(60);
        expect(result.finalPrice).toBe(0);
        expect(result.discountAmount).toBe(60);
        expect(result.finalPrice).toBeGreaterThanOrEqual(0);
        expect(result.isPromotional).toBe(true);
      });

      it("handles zero discount value", () => {
        const service = createTestService({ id: "srv-mechas-01", price: 200 });
        const campaign = createMockCampaign({
          servicesConfig: [
            { serviceId: "srv-mechas-01", discountType: "fixed", discountValue: 0 },
          ],
        });

        const result = getServiceBlackFridayPrice(service, campaign, { referenceDate });
        expect(result.originalPrice).toBe(200);
        expect(result.finalPrice).toBe(200);
        expect(result.discountAmount).toBe(0);
        expect(result.isPromotional).toBe(false);
      });
    });

    // --- Type 2: Percentage Discount (% off) ---
    describe("Type 2: Percentage Discount (% off)", () => {
      it("calculates exact proportional deduction", () => {
        const service = createTestService({ id: "srv-nutricao-02", price: 200 });
        const campaign = createMockCampaign();

        const result = getServiceBlackFridayPrice(service, campaign, { referenceDate });
        expect(result.originalPrice).toBe(200);
        expect(result.finalPrice).toBe(160);
        expect(result.discountAmount).toBe(40);
        expect(result.discountPercent).toBe(20);
        expect(result.discountType).toBe("percentage");
        expect(result.isPromotional).toBe(true);
      });

      it("handles 100% discount correctly (final price = 0)", () => {
        const service = createTestService({ id: "srv-nutricao-02", price: 150 });
        const campaign = createMockCampaign({
          servicesConfig: [
            { serviceId: "srv-nutricao-02", discountType: "percentage", discountValue: 100 },
          ],
        });

        const result = getServiceBlackFridayPrice(service, campaign, { referenceDate });
        expect(result.originalPrice).toBe(150);
        expect(result.finalPrice).toBe(0);
        expect(result.discountAmount).toBe(150);
        expect(result.discountPercent).toBe(100);
      });

      it("handles 0% discount without promotional status", () => {
        const service = createTestService({ id: "srv-nutricao-02", price: 150 });
        const campaign = createMockCampaign({
          servicesConfig: [
            { serviceId: "srv-nutricao-02", discountType: "percentage", discountValue: 0 },
          ],
        });

        const result = getServiceBlackFridayPrice(service, campaign, { referenceDate });
        expect(result.finalPrice).toBe(150);
        expect(result.discountAmount).toBe(0);
        expect(result.isPromotional).toBe(false);
      });

      it("clamps percentages over 100% to 100%", () => {
        const service = createTestService({ id: "srv-nutricao-02", price: 180 });
        const campaign = createMockCampaign({
          servicesConfig: [
            { serviceId: "srv-nutricao-02", discountType: "percentage", discountValue: 250 },
          ],
        });

        const result = getServiceBlackFridayPrice(service, campaign, { referenceDate });
        expect(result.finalPrice).toBe(0);
        expect(result.discountAmount).toBe(180);
        expect(result.discountPercent).toBe(100);
      });

      it("rounds fractional currency to 2 decimal places cleanly", () => {
        const service = createTestService({ id: "srv-nutricao-02", price: 149.9 });
        const campaign = createMockCampaign({
          servicesConfig: [
            { serviceId: "srv-nutricao-02", discountType: "percentage", discountValue: 33 },
          ],
        });

        const result = getServiceBlackFridayPrice(service, campaign, { referenceDate });
        // 149.9 * 0.33 = 49.467 -> rounded 49.47
        // final: 149.9 - 49.47 = 100.43
        expect(result.discountAmount).toBe(49.47);
        expect(result.finalPrice).toBe(100.43);
      });
    });

    // --- Type 3: Manual Direct Black Price ---
    describe("Type 3: Manual Direct Black Price", () => {
      it("assigns exact blackPrice as final price", () => {
        const service = createTestService({ id: "srv-botox-03", price: 380 });
        const campaign = createMockCampaign();

        const result = getServiceBlackFridayPrice(service, campaign, { referenceDate });
        expect(result.originalPrice).toBe(380);
        expect(result.finalPrice).toBe(199.9);
        expect(result.discountAmount).toBe(180.1);
        expect(result.discountType).toBe("manual");
        expect(result.isPromotional).toBe(true);
      });

      it("guarantees non-negative final price when manual price is 0 or negative", () => {
        const service = createTestService({ id: "srv-botox-03", price: 200 });
        const campaign = createMockCampaign({
          servicesConfig: [
            { serviceId: "srv-botox-03", discountType: "manual", blackPrice: -50 },
          ],
        });

        const result = getServiceBlackFridayPrice(service, campaign, { referenceDate });
        expect(result.finalPrice).toBe(0);
        expect(result.finalPrice).toBeGreaterThanOrEqual(0);
        expect(result.discountAmount).toBe(200);
      });

      it("handles manual price equal to or higher than original without false promotional status", () => {
        const service = createTestService({ id: "srv-botox-03", price: 200 });
        const campaign = createMockCampaign({
          servicesConfig: [
            { serviceId: "srv-botox-03", discountType: "manual", blackPrice: 200 },
          ],
        });

        const result = getServiceBlackFridayPrice(service, campaign, { referenceDate });
        expect(result.finalPrice).toBe(200);
        expect(result.discountAmount).toBe(0);
        expect(result.isPromotional).toBe(false);
      });
    });

    // --- Type 4: Progressive Discount ---
    describe("Type 4: Progressive Discount", () => {
      it("evaluates progressive discount with options.serviceCount", () => {
        const service = createTestService({ id: "srv-combo-04", price: 300 });
        const campaign = createMockCampaign();

        // Count = 1: below tier 2 -> 0%
        const r1 = getServiceBlackFridayPrice(service, campaign, {
          serviceCount: 1,
          referenceDate,
        });
        expect(r1.finalPrice).toBe(300);
        expect(r1.discountPercent).toBe(0);
        expect(r1.isPromotional).toBe(false);

        // Count = 2: tier 2 -> 15% off 300 = 45 off -> 255
        const r2 = getServiceBlackFridayPrice(service, campaign, {
          serviceCount: 2,
          referenceDate,
        });
        expect(r2.finalPrice).toBe(255);
        expect(r2.discountAmount).toBe(45);
        expect(r2.discountPercent).toBe(15);
        expect(r2.isPromotional).toBe(true);
        expect(r2.appliedTier?.minServices).toBe(2);

        // Count = 3: tier 3 -> 25% off 300 = 75 off -> 225
        const r3 = getServiceBlackFridayPrice(service, campaign, {
          serviceCount: 3,
          referenceDate,
        });
        expect(r3.finalPrice).toBe(225);
        expect(r3.discountAmount).toBe(75);
        expect(r3.discountPercent).toBe(25);
      });

      it("evaluates progressive discount using service.procedures length if serviceCount omitted", () => {
        const service = createTestService({
          id: "srv-combo-04",
          price: 400,
          procedures: [
            { id: "proc-1", title: "Corte", price: 100, isIncluded: true },
            { id: "proc-2", title: "Hidratação", price: 150, isIncluded: true },
            { id: "proc-3", title: "Escova", price: 150, isIncluded: true },
          ],
        });
        const campaign = createMockCampaign();

        // 3 procedures -> tier 3 (25% off 400 = 100 off -> 300)
        const result = getServiceBlackFridayPrice(service, campaign, { referenceDate });
        expect(result.finalPrice).toBe(300);
        expect(result.discountPercent).toBe(25);
        expect(result.discountAmount).toBe(100);
      });
    });

    // --- Fallbacks, Guards & Date Ranges ---
    describe("Fallbacks, Inactivity and Snake_Case Compatibility", () => {
      it("returns original price when campaign is inactive", () => {
        const service = createTestService({ id: "srv-mechas-01", price: 450 });
        const campaign = createMockCampaign({ isActive: false });

        const result = getServiceBlackFridayPrice(service, campaign, { referenceDate });
        expect(result.finalPrice).toBe(450);
        expect(result.discountAmount).toBe(0);
        expect(result.isPromotional).toBe(false);
      });

      it("returns original price when referenceDate is outside validity window", () => {
        const service = createTestService({ id: "srv-mechas-01", price: 450 });
        const campaign = createMockCampaign();

        const result = getServiceBlackFridayPrice(service, campaign, {
          referenceDate: "2026-10-15T00:00:00Z", // before startsAt
        });
        expect(result.finalPrice).toBe(450);
        expect(result.isPromotional).toBe(false);
      });

      it("bypasses date range check when ignoreDateRange is true", () => {
        const service = createTestService({ id: "srv-mechas-01", price: 450 });
        const campaign = createMockCampaign();

        const result = getServiceBlackFridayPrice(service, campaign, {
          referenceDate: "2026-10-15T00:00:00Z",
          ignoreDateRange: true,
        });
        expect(result.finalPrice).toBe(350);
        expect(result.discountAmount).toBe(100);
        expect(result.isPromotional).toBe(true);
      });

      it("returns original price when service is not in servicesConfig", () => {
        const service = createTestService({ id: "srv-unconfigured", price: 180 });
        const campaign = createMockCampaign();

        const result = getServiceBlackFridayPrice(service, campaign, { referenceDate });
        expect(result.finalPrice).toBe(180);
        expect(result.isPromotional).toBe(false);
      });

      it("seamlessly handles snake_case database row format", () => {
        const service = createTestService({ id: "srv-row-fixed", price: 300 });
        const row: Partial<BlackFridayCampaignRow> = {
          is_active: true,
          starts_at: "2026-11-01T00:00:00Z",
          ends_at: "2026-11-30T23:59:59Z",
          services_config: [
            {
              service_id: "srv-row-fixed",
              discount_type: "fixed",
              discount_value: 80,
            },
          ],
        };

        const result = getServiceBlackFridayPrice(service, row as any, { referenceDate });
        expect(result.finalPrice).toBe(220);
        expect(result.discountAmount).toBe(80);
        expect(result.discountType).toBe("fixed");
        expect(result.isPromotional).toBe(true);
      });
    });
  });

  // ===========================================================================
  // 4. calculateCartBlackFridayTotal
  // ===========================================================================
  describe("calculateCartBlackFridayTotal", () => {
    it("returns zeroes for empty services list", () => {
      const campaign = createMockCampaign();
      const cart = calculateCartBlackFridayTotal([], campaign);

      expect(cart.originalTotal).toBe(0);
      expect(cart.finalTotal).toBe(0);
      expect(cart.totalDiscount).toBe(0);
      expect(cart.appliedProgressivePercent).toBe(0);
      expect(cart.items).toHaveLength(0);
    });

    it("aggregates itemized discounts for multi-service cart with individual configurations", () => {
      const s1 = createTestService({ id: "srv-mechas-01", price: 450 }); // 100 off -> 350
      const s2 = createTestService({ id: "srv-nutricao-02", price: 200 }); // 20% off -> 160
      const s3 = createTestService({ id: "srv-botox-03", price: 380 }); // manual 199.9 -> 199.9
      const s4 = createTestService({ id: "srv-regular-unconfigured", price: 100 }); // no discount -> 100

      const campaign = createMockCampaign({
        progressiveDiscount: null, // individual discounts only
      });

      const cart = calculateCartBlackFridayTotal([s1, s2, s3, s4], campaign, {
        referenceDate: "2026-11-15T12:00:00Z",
      });

      // Original: 450 + 200 + 380 + 100 = 1130
      expect(cart.originalTotal).toBe(1130);
      // Final: 350 + 160 + 199.9 + 100 = 809.9
      expect(cart.finalTotal).toBe(809.9);
      // Discount: 1130 - 809.9 = 320.1
      expect(cart.totalDiscount).toBe(320.1);
      expect(cart.items).toHaveLength(4);
    });

    it("applies cart-level progressive discount to cart bundle", () => {
      const s1 = createTestService({ id: "srv-unconfigured-1", price: 200 });
      const s2 = createTestService({ id: "srv-unconfigured-2", price: 300 });

      // 2 services qualify for 15% tier in mock campaign
      const campaign = createMockCampaign({
        servicesConfig: [], // no individual discounts
      });

      const cart = calculateCartBlackFridayTotal([s1, s2], campaign, {
        referenceDate: "2026-11-15T12:00:00Z",
      });

      expect(cart.originalTotal).toBe(500);
      expect(cart.appliedProgressivePercent).toBe(15);
      // 500 - 15% (75) = 425
      expect(cart.finalTotal).toBe(425);
      expect(cart.totalDiscount).toBe(75);
    });

    it("prevents double-discounting when services have individual progressive discount type", () => {
      const s1 = createTestService({ id: "srv-combo-04", price: 200 });
      const s2 = createTestService({ id: "srv-combo-04", price: 300 });

      const campaign = createMockCampaign();

      const cart = calculateCartBlackFridayTotal([s1, s2], campaign, {
        referenceDate: "2026-11-15T12:00:00Z",
      });

      // 2 services in cart: progressive discount is 15%.
      // Individual services with discountType 'progressive' are discounted by 15% (200 -> 170, 300 -> 255).
      // Total final = 170 + 255 = 425.
      // Cart level should NOT apply an extra 15% on top of 425!
      expect(cart.originalTotal).toBe(500);
      expect(cart.finalTotal).toBe(425);
      expect(cart.totalDiscount).toBe(75);
    });

    it("strictly ensures finalTotal is never negative", () => {
      const s1 = createTestService({ id: "srv-zero", price: 0 });
      const campaign = createMockCampaign();

      const cart = calculateCartBlackFridayTotal([s1], campaign);
      expect(cart.finalTotal).toBe(0);
      expect(cart.totalDiscount).toBe(0);
      expect(cart.finalTotal).toBeGreaterThanOrEqual(0);
    });
  });
});
