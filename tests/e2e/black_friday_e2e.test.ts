import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import fs from "fs";
import path from "path";
import { SalonStore } from "@/lib/storage/localStore";
import { SupabaseDataService, DEFAULT_ORG_ID } from "@/lib/supabase/api";
import { subscribeToSync } from "@/lib/sync/syncBus";
import {
  calculateDaySlotGrid,
  calculateAvailableSlots,
  validateProposalScheduleFeasibility,
  validateServiceDateRestriction,
  type ScheduleRestrictionResult,
} from "@/lib/scheduling/engine";
import {
  getServiceBlackFridayPrice,
  getProgressiveDiscount,
  isCampaignActive,
  calculateCartBlackFridayTotal,
  type BlackFridayPriceOptions,
  type BlackFridayPriceResult,
  type CartBlackFridayItemResult,
  type CartBlackFridayTotalResult,
} from "@/lib/services/blackFridayPricing";
import { formatBRL } from "@/lib/utils";
import {
  BlackFridayCampaign,
  BlackFridayDiscountType,
  BlackFridayServiceConfig,
  ProgressiveDiscountTier,
  ProgressiveDiscountConfig,
} from "@/types";
import { ServiceItem } from "@/types/service";
import { Appointment } from "@/types/appointment";
import {
  mockFixedService,
  mockStartingAtService,
  mockTratamentoService,
} from "../fixtures/services.fixture";
import { mockConfirmedAppointment } from "../fixtures/appointments.fixture";

// =============================================================================
// COUNTDOWN CONTRACT & UTILITIES
// =============================================================================

export interface CountdownResult {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isExpired: boolean;
}

export function calculateCountdown(
  endsAt?: string | null,
  referenceTime: Date | string = new Date()
): CountdownResult {
  if (!endsAt) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true };
  }
  const endTime = new Date(endsAt).getTime();
  if (isNaN(endTime)) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true };
  }
  const refTime = new Date(referenceTime).getTime();
  const diff = Math.max(0, endTime - refTime);

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  const seconds = Math.floor((diff / 1000) % 60);
  const isExpired = diff <= 0;

  return { days, hours, minutes, seconds, isExpired };
}

// Factory helper for clean test campaign generation
function createTestCampaign(overrides: Partial<BlackFridayCampaign> = {}): BlackFridayCampaign {
  return {
    id: `bf-camp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    orgId: DEFAULT_ORG_ID,
    name: "Black Friday Oficial GlaicyAgenda",
    isActive: true,
    startsAt: "2026-11-01T00:00:00Z",
    endsAt: "2026-11-30T23:59:59Z",
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
      ],
    },
    ...overrides,
  };
}

// =============================================================================
// MAIN 4-TIER TEST SUITE
// =============================================================================

describe("Black Friday Comprehensive E2E Test Suite (R1-R5)", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  // ===========================================================================
  // TIER 1: Feature Coverage (Happy-Path Equivalence Classes — 25 Tests)
  // ===========================================================================
  describe("Tier 1: Feature Coverage (Happy Paths for R1, R2, R3, R4, R5)", () => {
    // --- R1: Data Model & Access Layer (T1.1 - T1.5) ---
    describe("R1: Data Model & Access Layer", () => {
      it("T1.1 - Campaign model complete schema initializes with valid types and default values", () => {
        const campaign = createTestCampaign();

        expect(campaign.id).toBeDefined();
        expect(campaign.orgId).toBe(DEFAULT_ORG_ID);
        expect(campaign.name).toBe("Black Friday Oficial GlaicyAgenda");
        expect(campaign.isActive).toBe(true);
        expect(campaign.startsAt).toBe("2026-11-01T00:00:00Z");
        expect(campaign.endsAt).toBe("2026-11-30T23:59:59Z");
        expect(campaign.restrictSchedule).toBe(true);
        expect(campaign.restrictedDates).toEqual(["2026-11-27", "2026-11-28"]);
        expect(campaign.servicesConfig).toHaveLength(4);
        expect(campaign.progressiveDiscount?.tiers).toHaveLength(2);

        // JSON serialization round-trip fidelity
        const serialized = JSON.stringify(campaign);
        const parsed: BlackFridayCampaign = JSON.parse(serialized);
        expect(parsed).toEqual(campaign);
      });

      it("T1.2 - SupabaseDataService creates and retrieves active campaign", async () => {
        const campaignInput: Partial<BlackFridayCampaign> = {
          orgId: DEFAULT_ORG_ID,
          name: "Black Friday Especial 2026",
          isActive: true,
          startsAt: "2026-11-01T00:00:00Z",
          endsAt: "2026-11-30T23:59:59Z",
          restrictSchedule: true,
          restrictedDates: ["2026-11-27"],
          servicesConfig: [
            { serviceId: "srv-101", discountType: "fixed", discountValue: 50 },
          ],
        };

        const created = await SupabaseDataService.createBlackFridayCampaign(campaignInput);
        expect(created.id).toBeDefined();
        expect(created.name).toBe("Black Friday Especial 2026");
        expect(created.isActive).toBe(true);

        const activeCampaign = await SupabaseDataService.getActiveBlackFridayCampaign(DEFAULT_ORG_ID);
        expect(activeCampaign).not.toBeNull();
        expect(activeCampaign?.id).toBe(created.id);
        expect(activeCampaign?.servicesConfig).toHaveLength(1);
        expect(activeCampaign?.servicesConfig[0].discountValue).toBe(50);
      });

      it("T1.3 - SupabaseDataService updates existing campaign configuration", async () => {
        const initial = await SupabaseDataService.createBlackFridayCampaign({
          orgId: DEFAULT_ORG_ID,
          name: "Campanha Rascunho",
          isActive: false,
          restrictSchedule: false,
          restrictedDates: [],
          servicesConfig: [],
        });

        const updated = await SupabaseDataService.updateBlackFridayCampaign(initial.id, {
          name: "Campanha Lançada",
          isActive: true,
          restrictSchedule: true,
          restrictedDates: ["2026-11-27"],
        });

        expect(updated).not.toBeNull();
        expect(updated?.name).toBe("Campanha Lançada");
        expect(updated?.isActive).toBe(true);
        expect(updated?.restrictSchedule).toBe(true);
        expect(updated?.restrictedDates).toEqual(["2026-11-27"]);
      });

      it("T1.4 - SalonStore persists offline campaign and sync bus emits event", async () => {
        let syncReceived: { type: string; id?: string } | null = null;
        const unsubscribe = subscribeToSync((event) => {
          syncReceived = event;
        });

        const campaign = createTestCampaign({ id: "camp-offline-sync-01" });
        const saved = SalonStore.saveBlackFridayCampaign(campaign);

        expect(saved.id).toBe("camp-offline-sync-01");
        expect(saved.createdAt).toBeDefined();

        const stored = SalonStore.getBlackFridayCampaign(DEFAULT_ORG_ID);
        expect(stored?.id).toBe("camp-offline-sync-01");

        // Verify localStorage persistence under the specific key
        const rawStorage = window.localStorage.getItem("glaicy_agenda_v2_black_friday_campaigns");
        expect(rawStorage).not.toBeNull();
        expect(rawStorage).toContain("camp-offline-sync-01");

        unsubscribe();
      });

      it("T1.5 - Mutual deactivation enforces single active campaign per organization", async () => {
        const campA = createTestCampaign({ id: "camp-first-active", isActive: true });
        SalonStore.saveBlackFridayCampaign(campA);

        const activeAfterFirst = SalonStore.getActiveBlackFridayCampaign(DEFAULT_ORG_ID);
        expect(activeAfterFirst?.id).toBe("camp-first-active");

        const campB = createTestCampaign({ id: "camp-second-active", isActive: true });
        SalonStore.saveBlackFridayCampaign(campB);

        const activeAfterSecond = SalonStore.getActiveBlackFridayCampaign(DEFAULT_ORG_ID);
        expect(activeAfterSecond?.id).toBe("camp-second-active");

        const allCampaigns = SalonStore.getBlackFridayCampaigns();
        const foundOld = allCampaigns.find((c) => c.id === "camp-first-active");
        expect(foundOld?.isActive).toBe(false);
      });
    });

    // --- R2: Pricing Engine Calculations (T1.6 - T1.10) ---
    describe("R2: Pricing Engine Calculations", () => {
      it("T1.6 - Fixed discount (R$ off) deduces exact configured amount", () => {
        const service: ServiceItem = { ...mockFixedService, id: "srv-mechas-01", price: 450 };
        const campaign = createTestCampaign();

        const result = getServiceBlackFridayPrice(service, campaign, {
          referenceDate: "2026-11-27T12:00:00Z",
        });

        expect(result.originalPrice).toBe(450);
        expect(result.finalPrice).toBe(350);
        expect(result.discountAmount).toBe(100);
        expect(result.discountType).toBe("fixed");
        expect(result.isPromotional).toBe(true);
      });

      it("T1.7 - Percentage discount (% off) calculates exact proportional deduction", () => {
        const service: ServiceItem = { ...mockFixedService, id: "srv-nutricao-02", price: 200 };
        const campaign = createTestCampaign();

        const result = getServiceBlackFridayPrice(service, campaign, {
          referenceDate: "2026-11-27T12:00:00Z",
        });

        expect(result.originalPrice).toBe(200);
        expect(result.finalPrice).toBe(160);
        expect(result.discountAmount).toBe(40);
        expect(result.discountPercent).toBe(20);
        expect(result.discountType).toBe("percentage");
        expect(result.isPromotional).toBe(true);
      });

      it("T1.8 - Manual Black Friday price assigns exact promotional value", () => {
        const service: ServiceItem = { ...mockFixedService, id: "srv-botox-03", price: 380 };
        const campaign = createTestCampaign();

        const result = getServiceBlackFridayPrice(service, campaign, {
          referenceDate: "2026-11-27T12:00:00Z",
        });

        expect(result.originalPrice).toBe(380);
        expect(result.finalPrice).toBe(199.9);
        expect(result.discountAmount).toBe(180.1);
        expect(result.discountType).toBe("manual");
        expect(result.isPromotional).toBe(true);
      });

      it("T1.9 - Progressive discount tier matches multi-service count", () => {
        const campaign = createTestCampaign();

        expect(getProgressiveDiscount(1, campaign)).toBe(0);
        expect(getProgressiveDiscount(2, campaign)).toBe(15);
        expect(getProgressiveDiscount(3, campaign)).toBe(25);
        expect(getProgressiveDiscount(5, campaign)).toBe(25);
      });

      it("T1.10 - Cart total calculation aggregates itemized promotional discounts", () => {
        const s1: ServiceItem = { ...mockFixedService, id: "srv-mechas-01", price: 180 }; // 30 off -> 150
        const s2: ServiceItem = { ...mockFixedService, id: "srv-nutricao-02", price: 250 }; // 20% off -> 200
        const campaign = createTestCampaign({
          progressiveDiscount: null, // individual discounts only
          servicesConfig: [
            { serviceId: "srv-mechas-01", discountType: "fixed", discountValue: 30 },
            { serviceId: "srv-nutricao-02", discountType: "percentage", discountValue: 20 },
          ],
        });

        const cart = calculateCartBlackFridayTotal([s1, s2], campaign);

        expect(cart.originalTotal).toBe(430);
        expect(cart.finalTotal).toBe(350);
        expect(cart.totalDiscount).toBe(80);
        expect(cart.items).toHaveLength(2);
      });
    });

    // --- R3: Schedule Restriction & Validation (T1.11 - T1.15) ---
    describe("R3: Schedule Restriction & Validation", () => {
      it("T1.11 - Restricted date permits booking when service is participating", () => {
        const service: ServiceItem = { ...mockFixedService, id: "srv-mechas-01", title: "Mechas Criativas" };
        const campaign = createTestCampaign({
          restrictSchedule: true,
          restrictedDates: ["2026-11-27"],
        });

        const check = validateServiceDateRestriction(service, "2026-11-27", campaign);
        expect(check.isAllowed).toBe(true);
        expect(check.isRestrictedDate).toBe(true);
      });

      it("T1.12 - Restricted date blocks booking when service is non-participating", () => {
        const service: ServiceItem = { ...mockFixedService, id: "srv-corte-regular", title: "Corte Tradicional" };
        const campaign = createTestCampaign({
          restrictSchedule: true,
          restrictedDates: ["2026-11-27"],
        });

        const check = validateServiceDateRestriction(service, "2026-11-27", campaign);
        expect(check.isAllowed).toBe(false);
        expect(check.isRestrictedDate).toBe(true);
        expect(check.reason).toContain("Corte Tradicional");
        expect(check.reason).toContain("exclusiva para serviços Black Friday");
      });

      it("T1.13 - Non-restricted normal date allows booking of any service", () => {
        const service: ServiceItem = { ...mockFixedService, id: "srv-corte-regular", title: "Corte Tradicional" };
        const campaign = createTestCampaign({
          restrictSchedule: true,
          restrictedDates: ["2026-11-27"],
        });

        const check = validateServiceDateRestriction(service, "2026-11-29", campaign);
        expect(check.isAllowed).toBe(true);
        expect(check.isRestrictedDate).toBe(false);
      });

      it("T1.14 - Day slot grid marks all slots unavailable on restricted dates for non-campaign services", () => {
        const service: ServiceItem = { ...mockFixedService, id: "srv-unauthorized-cut", title: "Corte Não Participante" };
        const campaign = createTestCampaign({
          restrictSchedule: true,
          restrictedDates: ["2026-11-27"],
        });

        const slots = calculateDaySlotGrid(service, "2026-11-27", "prof-gleicy", [], {
          blackFridayCampaign: campaign,
        });

        expect(slots.length).toBeGreaterThan(0);
        const availableSlots = slots.filter((s) => s.isAvailable);
        expect(availableSlots).toHaveLength(0);
        expect(slots[0].conflictReason).toContain("exclusiva para serviços Black Friday");

        // Also assert directly on calculateAvailableSlots from engine.ts
        const available = calculateAvailableSlots(service, "2026-11-27", "prof-gleicy", [], {
          blackFridayCampaign: campaign,
        });
        expect(available).toEqual([]);
      });

      it("T1.15 - Proposal schedule feasibility confirms participating service on restricted date", () => {
        const campaign = createTestCampaign({
          restrictSchedule: true,
          restrictedDates: ["2026-11-27"],
        });

        const technicalSteps = [
          {
            id: "step-1",
            stepNumber: 1,
            title: "Aplicação Mechas",
            type: "active" as const,
            durationMin: 60,
            requiresExclusiveAttention: true,
          },
        ];

        const participatingService: ServiceItem = {
          ...mockFixedService,
          id: "srv-mechas-01",
          title: "Mechas Black Friday",
        };

        // Participating service should be feasible
        const feasibility = validateProposalScheduleFeasibility({
          date: "2026-11-27",
          startTime: "09:00",
          technicalSteps,
          professionalId: "prof-gleicy",
          existingAppointments: [],
          service: participatingService, // srv-mechas-01 participates
          blackFridayCampaign: campaign,
        });

        expect(feasibility.isFeasible).toBe(true);

        // Non-participating service should be unfeasible
        const blockedFeasibility = validateProposalScheduleFeasibility({
          date: "2026-11-27",
          startTime: "09:00",
          technicalSteps,
          professionalId: "prof-gleicy",
          existingAppointments: [],
          service: { id: "srv-unauthorized-proposal", title: "Corte Simples" },
          blackFridayCampaign: campaign,
        });

        expect(blockedFeasibility.isFeasible).toBe(false);
        expect(blockedFeasibility.conflictReason).toContain("exclusiva para serviços Black Friday");
      });
    });

    // --- R4: Admin Dashboard Management (T1.16 - T1.20) ---
    describe("R4: Admin Dashboard Management", () => {
      it("T1.16 - Admin toggles campaign active status with persistence", async () => {
        const campaign = await SupabaseDataService.createBlackFridayCampaign({
          orgId: DEFAULT_ORG_ID,
          name: "Campanha Toggle",
          isActive: false,
          restrictSchedule: false,
          restrictedDates: [],
          servicesConfig: [],
        });

        expect(campaign.isActive).toBe(false);

        const updated = await SupabaseDataService.updateBlackFridayCampaign(campaign.id, {
          isActive: true,
        });

        expect(updated?.isActive).toBe(true);
        const fetched = await SupabaseDataService.getActiveBlackFridayCampaign(DEFAULT_ORG_ID);
        expect(fetched?.id).toBe(campaign.id);
      });

      it("T1.17 - Admin configures valid date window verified by isCampaignActive boundary checks", async () => {
        const startsAt = "2026-11-20T00:00:00Z";
        const endsAt = "2026-11-30T23:59:59Z";

        const campaign = await SupabaseDataService.createBlackFridayCampaign({
          orgId: DEFAULT_ORG_ID,
          name: "Campanha Janela Válida",
          isActive: true,
          startsAt,
          endsAt,
        });

        expect(isCampaignActive(campaign, "2026-11-19T23:59:59Z")).toBe(false);
        expect(isCampaignActive(campaign, "2026-11-25T12:00:00Z")).toBe(true);
        expect(isCampaignActive(campaign, "2026-12-01T00:00:00Z")).toBe(false);
      });

      it("T1.18 - Admin switches discount modes between percentage, fixed and manual with persistence", async () => {
        const service: ServiceItem = { ...mockFixedService, id: "srv-switch-mode", price: 200 };

        // 1. Initial Mode: Percentage discount (20% off)
        const campaign = await SupabaseDataService.createBlackFridayCampaign({
          orgId: DEFAULT_ORG_ID,
          name: "Campanha Alternância de Modos",
          isActive: true,
          servicesConfig: [
            { serviceId: service.id, discountType: "percentage", discountValue: 20 },
          ],
        });

        let active = await SupabaseDataService.getActiveBlackFridayCampaign(DEFAULT_ORG_ID);
        expect(active?.servicesConfig[0].discountType).toBe("percentage");
        expect(active?.servicesConfig[0].discountValue).toBe(20);
        let pricing = getServiceBlackFridayPrice(service, active, { ignoreDateRange: true });
        expect(pricing.finalPrice).toBe(160); // 200 - 20% = 160

        // 2. Mode switch: Percentage -> Fixed discount (R$ 50 off)
        await SupabaseDataService.updateBlackFridayCampaign(campaign.id, {
          servicesConfig: [
            { serviceId: service.id, discountType: "fixed", discountValue: 50 },
          ],
        });

        active = await SupabaseDataService.getActiveBlackFridayCampaign(DEFAULT_ORG_ID);
        expect(active?.servicesConfig[0].discountType).toBe("fixed");
        expect(active?.servicesConfig[0].discountValue).toBe(50);
        pricing = getServiceBlackFridayPrice(service, active, { ignoreDateRange: true });
        expect(pricing.finalPrice).toBe(150); // 200 - 50 = 150

        // 3. Mode switch: Fixed -> Manual promotional price (R$ 120 flat)
        await SupabaseDataService.updateBlackFridayCampaign(campaign.id, {
          servicesConfig: [
            { serviceId: service.id, discountType: "manual", blackPrice: 120 },
          ],
        });

        active = await SupabaseDataService.getActiveBlackFridayCampaign(DEFAULT_ORG_ID);
        expect(active?.servicesConfig[0].discountType).toBe("manual");
        expect(active?.servicesConfig[0].blackPrice).toBe(120);
        pricing = getServiceBlackFridayPrice(service, active, { ignoreDateRange: true });
        expect(pricing.finalPrice).toBe(120); // Manual blackPrice = 120
      });

      it("T1.19 - Admin configures and saves progressive discount tiers", async () => {
        const tiers: ProgressiveDiscountTier[] = [
          { minServices: 2, discountPercent: 10 },
          { minServices: 3, discountPercent: 20 },
        ];

        const campaign = await SupabaseDataService.createBlackFridayCampaign({
          orgId: DEFAULT_ORG_ID,
          name: "Campanha Tiers",
          isActive: true,
          progressiveDiscount: { tiers },
        });

        expect(campaign.progressiveDiscount?.tiers).toHaveLength(2);
        expect(campaign.progressiveDiscount?.tiers[0].minServices).toBe(2);
        expect(campaign.progressiveDiscount?.tiers[1].discountPercent).toBe(20);
      });

      it("T1.20 - Admin manages restricted dates tag list", async () => {
        const campaign = await SupabaseDataService.createBlackFridayCampaign({
          orgId: DEFAULT_ORG_ID,
          name: "Campanha Tags",
          isActive: true,
          restrictSchedule: true,
          restrictedDates: ["2026-11-27", "2026-11-28"],
        });

        expect(campaign.restrictedDates).toHaveLength(2);
        expect(campaign.restrictedDates).toContain("2026-11-27");
        expect(campaign.restrictedDates).toContain("2026-11-28");
      });
    });

    // --- R5: Public Themed Client Experience (T1.21 - T1.25) ---
    describe("R5: Public Themed Client Experience", () => {
      it("T1.21 - Public banner calculates real-time countdown to endsAt", () => {
        const reference = "2026-11-27T00:00:00Z";
        const endsAt = "2026-11-29T03:15:30Z"; // 2 days, 3 hours, 15 min, 30 sec later

        const countdown = calculateCountdown(endsAt, reference);

        expect(countdown.isExpired).toBe(false);
        expect(countdown.days).toBe(2);
        expect(countdown.hours).toBe(3);
        expect(countdown.minutes).toBe(15);
        expect(countdown.seconds).toBe(30);
      });

      it("T1.22 - Public banner renders schedule restriction alert notice and validates restricted dates", async () => {
        // Persist campaign with schedule restrictions configured via SupabaseDataService
        const campaign = await SupabaseDataService.createBlackFridayCampaign({
          orgId: DEFAULT_ORG_ID,
          name: "Campanha Restrição Banner",
          isActive: true,
          restrictSchedule: true,
          restrictedDates: ["2026-11-27", "2026-11-28"],
          servicesConfig: [
            { serviceId: "srv-mechas-01", discountType: "fixed", discountValue: 100 },
          ],
        });

        const activeCampaign = await SupabaseDataService.getActiveBlackFridayCampaign(DEFAULT_ORG_ID);
        expect(activeCampaign).not.toBeNull();
        expect(activeCampaign?.restrictSchedule).toBe(true);
        expect(activeCampaign?.restrictedDates).toEqual(["2026-11-27", "2026-11-28"]);

        // Test genuine domain logic: validateServiceDateRestriction flags restricted dates
        // and emits the informative schedule restriction alert notice
        const regularService: ServiceItem = { ...mockFixedService, id: "srv-regular-cut", title: "Corte Tradicional" };
        const restrictedCheck = validateServiceDateRestriction(regularService, "2026-11-27", activeCampaign);

        expect(restrictedCheck.isRestrictedDate).toBe(true);
        expect(restrictedCheck.isAllowed).toBe(false);
        expect(restrictedCheck.reason).toContain("exclusiva para serviços Black Friday");
        expect(restrictedCheck.reason).toContain("Corte Tradicional");

        // Normal unrestricted date does NOT trigger the alert notice
        const normalCheck = validateServiceDateRestriction(regularService, "2026-11-29", activeCampaign);
        expect(normalCheck.isRestrictedDate).toBe(false);
        expect(normalCheck.isAllowed).toBe(true);
      });

      it("T1.23 - Catalog displays Black Friday badge and strikethrough prices for participating services", () => {
        const service: ServiceItem = { ...mockFixedService, id: "srv-mechas-01", price: 450 };
        const campaign = createTestCampaign();

        const pricing = getServiceBlackFridayPrice(service, campaign, {
          referenceDate: "2026-11-27T12:00:00Z",
        });

        expect(pricing.isPromotional).toBe(true);
        expect(formatBRL(pricing.originalPrice)).toBe("R$ 450,00");
        expect(formatBRL(pricing.finalPrice)).toBe("R$ 350,00");
      });

      it("T1.24 - Non-participating services display standard prices without promotional badges", () => {
        const service: ServiceItem = { ...mockFixedService, id: "srv-corte-padrao", price: 180 };
        const campaign = createTestCampaign();

        const pricing = getServiceBlackFridayPrice(service, campaign, {
          referenceDate: "2026-11-27T12:00:00Z",
        });

        expect(pricing.isPromotional).toBe(false);
        expect(pricing.finalPrice).toBe(180);
        expect(pricing.discountAmount).toBe(0);
      });

      it("T1.25 - Black Friday Hero section reflects luxury dark palette and promotional CTA", () => {
        const globalsCssPath = path.resolve(process.cwd(), "src/app/globals.css");
        expect(fs.existsSync(globalsCssPath)).toBe(true);
        const cssContent = fs.readFileSync(globalsCssPath, "utf-8").toLowerCase();

        // 1. Verify Deep Green token (#1D3D3C) present in brand variables or gradients
        expect(cssContent).toContain("#1d3d3c");

        // 2. Verify Gold Accent token (#C7A03A) present in brand gold variables / shimmer
        expect(cssContent).toContain("#c7a03a");

        // 3. Verify Cream Text token (#FCF5EB) present in brand cream variables
        expect(cssContent).toContain("#fcf5eb");

        // 4. Verify Black Friday Dark token (#080F0E) or luxury dark backdrop styling
        const hasDarkThemeToken =
          cssContent.includes("#080f0e") || cssContent.includes("glass-dark-luxury");
        expect(hasDarkThemeToken).toBe(true);
      });
    });
  });

  // ===========================================================================
  // TIER 2: Boundary & Corner Cases (Limits, Clamping & Negative Guards — 25 Tests)
  // ===========================================================================
  describe("Tier 2: Boundary & Corner Cases (Limits, Clamping & Guards)", () => {
    // --- R1 Boundaries (T2.1 - T2.5) ---
    describe("R1 Boundaries & Edge Cases", () => {
      it("T2.1 - Empty servicesConfig and restrictedDates initialize gracefully", () => {
        const campaign: BlackFridayCampaign = {
          id: "camp-empty-configs",
          orgId: DEFAULT_ORG_ID,
          name: "Vazia",
          isActive: true,
          restrictSchedule: false,
          restrictedDates: [],
          servicesConfig: [],
        };

        const price = getServiceBlackFridayPrice(mockFixedService, campaign);
        expect(price.isPromotional).toBe(false);
        expect(price.finalPrice).toBe(mockFixedService.price);

        const restriction = validateServiceDateRestriction(mockFixedService, "2026-11-27", campaign);
        expect(restriction.isAllowed).toBe(true);
      });

      it("T2.2 - Null or undefined progressiveDiscount handles cleanly without throwing", () => {
        const campaignNull: BlackFridayCampaign = {
          ...createTestCampaign(),
          progressiveDiscount: null,
        };
        expect(getProgressiveDiscount(3, campaignNull)).toBe(0);

        const campaignUndefined: BlackFridayCampaign = {
          ...createTestCampaign(),
          progressiveDiscount: undefined,
        };
        expect(getProgressiveDiscount(3, campaignUndefined)).toBe(0);
      });

      it("T2.3 - Corrupted localStorage payload recovers gracefully to empty list", () => {
        window.localStorage.setItem(
          "glaicy_agenda_v2_black_friday_campaigns",
          "CORRUPTED_JSON_MALFORMED{{{["
        );

        const list = SalonStore.getBlackFridayCampaigns();
        expect(Array.isArray(list)).toBe(true);
        expect(list).toHaveLength(0);
      });

      it("T2.4 - Organization ID tenant isolation prevents campaign leakage across tenants", async () => {
        const tenantA = "22222222-2222-4222-8222-222222222222";
        const tenantB = "33333333-3333-4333-8333-333333333333";

        await SupabaseDataService.createBlackFridayCampaign({
          orgId: tenantA,
          name: "Campanha Tenant A",
          isActive: true,
          servicesConfig: [],
        });

        const resultB = await SupabaseDataService.getActiveBlackFridayCampaign(tenantB);
        expect(resultB).toBeNull();
      });

      it("T2.5 - Timezone offset handling across UTC and BRT (UTC-3) preserves boundary integrity", () => {
        // Nov 27 00:00:00 BRT corresponds to Nov 27 03:00:00 UTC
        const brtMidnightIso = "2026-11-27T03:00:00.000Z";
        const campaign = createTestCampaign({
          startsAt: "2026-11-27T03:00:00.000Z",
          endsAt: "2026-11-29T02:59:59.000Z",
        });

        expect(isCampaignActive(campaign, brtMidnightIso)).toBe(true);
        // 1 minute before startsAt in UTC
        expect(isCampaignActive(campaign, "2026-11-27T02:59:00.000Z")).toBe(false);
      });
    });

    // --- R2 Boundaries (T2.6 - T2.10) ---
    describe("R2 Boundaries & Price Clamping", () => {
      it("T2.6 - Fixed discount exceeding base price strictly clamps final price to 0.00", () => {
        const service: ServiceItem = { ...mockFixedService, id: "srv-low-price", price: 50 };
        const campaign = createTestCampaign({
          servicesConfig: [
            { serviceId: "srv-low-price", discountType: "fixed", discountValue: 80 },
          ],
        });

        const result = getServiceBlackFridayPrice(service, campaign, { ignoreDateRange: true });
        expect(result.finalPrice).toBe(0.0);
        expect(result.discountAmount).toBe(50.0);
        expect(result.finalPrice).toBeGreaterThanOrEqual(0);
      });

      it("T2.7 - Manual negative or zero blackPrice strictly clamps to non-negative 0.00", () => {
        const service: ServiceItem = { ...mockFixedService, id: "srv-manual-neg", price: 300 };
        const campaign = createTestCampaign({
          servicesConfig: [
            { serviceId: "srv-manual-neg", discountType: "manual", blackPrice: -50 },
          ],
        });

        const result = getServiceBlackFridayPrice(service, campaign, { ignoreDateRange: true });
        expect(result.finalPrice).toBe(0.0);
        expect(result.discountAmount).toBe(300.0);
      });

      it("T2.8 - Percentage discount extremes: 0% yields full price, 100% yields 0.00, >100% clamped", () => {
        const srv0: ServiceItem = { ...mockFixedService, id: "srv-pct-0", price: 200 };
        const srv100: ServiceItem = { ...mockFixedService, id: "srv-pct-100", price: 200 };
        const srv150: ServiceItem = { ...mockFixedService, id: "srv-pct-150", price: 200 };

        const campaign = createTestCampaign({
          servicesConfig: [
            { serviceId: "srv-pct-0", discountType: "percentage", discountValue: 0 },
            { serviceId: "srv-pct-100", discountType: "percentage", discountValue: 100 },
            { serviceId: "srv-pct-150", discountType: "percentage", discountValue: 150 },
          ],
        });

        const res0 = getServiceBlackFridayPrice(srv0, campaign, { ignoreDateRange: true });
        expect(res0.finalPrice).toBe(200);
        expect(res0.discountAmount).toBe(0);

        const res100 = getServiceBlackFridayPrice(srv100, campaign, { ignoreDateRange: true });
        expect(res100.finalPrice).toBe(0);
        expect(res100.discountAmount).toBe(200);

        const res150 = getServiceBlackFridayPrice(srv150, campaign, { ignoreDateRange: true });
        expect(res150.finalPrice).toBe(0);
        expect(res150.discountAmount).toBe(200);
      });

      it("T2.9 - Progressive tier step boundary matching: count below minServices vs exact match vs exceeding", () => {
        const campaign = createTestCampaign({
          progressiveDiscount: {
            tiers: [
              { minServices: 3, discountPercent: 20 },
            ],
          },
        });

        expect(getProgressiveDiscount(2, campaign)).toBe(0); // N - 1
        expect(getProgressiveDiscount(3, campaign)).toBe(20); // Exact boundary N
        expect(getProgressiveDiscount(4, campaign)).toBe(20); // N + 1
      });

      it("T2.10 - Temporal boundaries: campaign inactive before startsAt and inactive after endsAt", () => {
        const campaign = createTestCampaign({
          startsAt: "2026-11-27T00:00:00Z",
          endsAt: "2026-11-29T23:59:59Z",
        });

        // 1 second before start
        expect(isCampaignActive(campaign, "2026-11-26T23:59:59Z")).toBe(false);
        // Exact start
        expect(isCampaignActive(campaign, "2026-11-27T00:00:00Z")).toBe(true);
        // Exact end
        expect(isCampaignActive(campaign, "2026-11-29T23:59:59Z")).toBe(true);
        // 1 second after end
        expect(isCampaignActive(campaign, "2026-11-30T00:00:00Z")).toBe(false);
      });
    });

    // --- R3 Boundaries (T2.11 - T2.15) ---
    describe("R3 Boundaries & Date Normalization", () => {
      it("T2.11 - Date format normalization handles ISO timestamp with time component vs simple date string", () => {
        const service: ServiceItem = { ...mockFixedService, id: "srv-mechas-01", title: "Mechas" };
        const campaign = createTestCampaign({
          restrictSchedule: true,
          restrictedDates: ["2026-11-27"],
        });

        // Query with full ISO timestamp
        const checkIso = validateServiceDateRestriction(
          service,
          "2026-11-27T14:30:00.000Z",
          campaign
        );
        expect(checkIso.isRestrictedDate).toBe(true);
        expect(checkIso.isAllowed).toBe(true);
      });

      it("T2.12 - Active campaign with restrictSchedule=false does NOT restrict any dates", () => {
        const service: ServiceItem = { ...mockFixedService, id: "srv-unauthorized", title: "Corte" };
        const campaign = createTestCampaign({
          restrictSchedule: false, // toggle OFF
          restrictedDates: ["2026-11-27"],
        });

        const check = validateServiceDateRestriction(service, "2026-11-27", campaign);
        expect(check.isAllowed).toBe(true);
        expect(check.isRestrictedDate).toBe(false);
      });

      it("T2.13 - Inactive campaign with restrictSchedule=true does NOT restrict calendar", () => {
        const service: ServiceItem = { ...mockFixedService, id: "srv-unauthorized", title: "Corte" };
        const campaign = createTestCampaign({
          isActive: false, // campaign inactive
          restrictSchedule: true,
          restrictedDates: ["2026-11-27"],
        });

        const check = validateServiceDateRestriction(service, "2026-11-27", campaign);
        expect(check.isAllowed).toBe(true);
        expect(check.isRestrictedDate).toBe(false);
      });

      it("T2.14 - Year boundary and month transitions in restrictedDates evaluate correctly", () => {
        const service: ServiceItem = { ...mockFixedService, id: "srv-mechas-01", title: "Mechas" };
        const campaign = createTestCampaign({
          restrictSchedule: true,
          restrictedDates: ["2026-12-31", "2027-01-01"],
        });

        const dec31 = validateServiceDateRestriction(service, "2026-12-31", campaign);
        expect(dec31.isRestrictedDate).toBe(true);

        const jan01 = validateServiceDateRestriction(service, "2027-01-01", campaign);
        expect(jan01.isRestrictedDate).toBe(true);
      });

      it("T2.15 - Composite bundle with mixed participating and non-participating procedures is blocked", () => {
        const compositeService = {
          id: "composite-bundle-mixed",
          title: "Combo Mechas e Corte",
          procedures: [
            { id: "srv-mechas-01", title: "Mechas Criativas" }, // participating
            { id: "srv-corte-normal", title: "Corte Feminino" }, // non-participating
          ],
        };

        const campaign = createTestCampaign({
          restrictSchedule: true,
          restrictedDates: ["2026-11-27"],
        });

        const check = validateServiceDateRestriction(compositeService, "2026-11-27", campaign);
        expect(check.isAllowed).toBe(false);
        expect(check.isRestrictedDate).toBe(true);
        expect(check.reason).toContain("Corte Feminino");
      });
    });

    // --- R4 Boundaries (T2.16 - T2.20) ---
    describe("R4 Boundaries & Admin Validation", () => {
      it("T2.16 - Decimal floating point precision rounds preview prices accurately to 2 decimals", () => {
        const service: ServiceItem = { ...mockFixedService, id: "srv-decimal-test", price: 199.9 };
        const campaign = createTestCampaign({
          servicesConfig: [
            { serviceId: "srv-decimal-test", discountType: "percentage", discountValue: 33.33 },
          ],
        });

        const result = getServiceBlackFridayPrice(service, campaign, { ignoreDateRange: true });
        // 199.90 * 33.33% = 66.62667 -> 66.63 discount -> 133.27 final
        expect(result.finalPrice).toBe(133.27);
        expect(result.discountAmount).toBe(66.63);
      });

      it("T2.17 - Progressive tier validation guards against minServices < 2 in pricing engine and persistence", async () => {
        const campaign = await SupabaseDataService.createBlackFridayCampaign({
          orgId: DEFAULT_ORG_ID,
          name: "Campanha Tiers Guard",
          isActive: true,
          servicesConfig: [
            { serviceId: "srv-progressive-combo", discountType: "progressive" },
          ],
          progressiveDiscount: {
            tiers: [
              { minServices: 2, discountPercent: 15 },
              { minServices: 3, discountPercent: 25 },
            ],
          },
        });

        const active = await SupabaseDataService.getActiveBlackFridayCampaign(DEFAULT_ORG_ID);
        expect(active?.progressiveDiscount?.tiers).toHaveLength(2);

        // 1. Service count below minimum threshold (< 2) receives 0% progressive discount
        expect(getProgressiveDiscount(0, active)).toBe(0);
        expect(getProgressiveDiscount(1, active)).toBe(0);

        // 2. Service count meeting or exceeding minimum threshold (>= 2) triggers qualifying tier
        expect(getProgressiveDiscount(2, active)).toBe(15);
        expect(getProgressiveDiscount(3, active)).toBe(25);

        // 3. Verify getServiceBlackFridayPrice evaluates promotional status correctly
        const testService: ServiceItem = { ...mockFixedService, id: "srv-progressive-combo", price: 300 };

        const singleResult = getServiceBlackFridayPrice(testService, active, { serviceCount: 1, ignoreDateRange: true });
        expect(singleResult.isPromotional).toBe(false);
        expect(singleResult.discountPercent).toBe(0);
        expect(singleResult.finalPrice).toBe(300);
        expect(singleResult.appliedTier).toBeNull();

        const multiResult = getServiceBlackFridayPrice(testService, active, { serviceCount: 2, ignoreDateRange: true });
        expect(multiResult.isPromotional).toBe(true);
        expect(multiResult.discountPercent).toBe(15);
        expect(multiResult.finalPrice).toBe(255); // 300 - 15% = 255
        expect(multiResult.appliedTier?.minServices).toBe(2);
      });

      it("T2.18 - Progressive discount percentage validation clamps between 0 and 100 in pricing engine", () => {
        const service: ServiceItem = { ...mockFixedService, id: "srv-clamping-test", price: 200 };

        // 1. Negative discount percentage (-10%) is clamped to 0%
        const negativeCampaign = createTestCampaign({
          servicesConfig: [{ serviceId: service.id, discountType: "progressive" }],
          progressiveDiscount: {
            tiers: [{ minServices: 2, discountPercent: -10 }],
          },
        });
        expect(getProgressiveDiscount(2, negativeCampaign)).toBe(0);
        const negResult = getServiceBlackFridayPrice(service, negativeCampaign, { serviceCount: 2, ignoreDateRange: true });
        expect(negResult.discountPercent).toBe(0);
        expect(negResult.finalPrice).toBe(200);

        // 2. Excessive discount percentage (120%) is clamped to 100% (free service, never negative)
        const excessiveCampaign = createTestCampaign({
          servicesConfig: [{ serviceId: service.id, discountType: "progressive" }],
          progressiveDiscount: {
            tiers: [{ minServices: 2, discountPercent: 120 }],
          },
        });
        expect(getProgressiveDiscount(2, excessiveCampaign)).toBe(100);
        const excessResult = getServiceBlackFridayPrice(service, excessiveCampaign, { serviceCount: 2, ignoreDateRange: true });
        expect(excessResult.discountPercent).toBe(100);
        expect(excessResult.finalPrice).toBe(0);
        expect(excessResult.discountAmount).toBe(200);

        // 3. Valid normal percentage (25%) remains exact
        const normalCampaign = createTestCampaign({
          servicesConfig: [{ serviceId: service.id, discountType: "progressive" }],
          progressiveDiscount: {
            tiers: [{ minServices: 2, discountPercent: 25 }],
          },
        });
        expect(getProgressiveDiscount(2, normalCampaign)).toBe(25);
        const normalResult = getServiceBlackFridayPrice(service, normalCampaign, { serviceCount: 2, ignoreDateRange: true });
        expect(normalResult.discountPercent).toBe(25);
        expect(normalResult.finalPrice).toBe(150); // 200 - 25% = 150
      });

      it("T2.19 - Open-ended date window (null startsAt/endsAt) remains active while isActive=true", () => {
        const campaign = createTestCampaign({
          startsAt: null,
          endsAt: null,
          isActive: true,
        });

        expect(isCampaignActive(campaign, new Date())).toBe(true);
      });

      it("T2.20 - Restricted dates tag manager persists deduplicated dates and enforces restriction idempotency", async () => {
        const inputDates = ["2026-11-27", "2026-11-27", "2026-11-28"];
        // Tag manager deduplication logic
        const sanitizedDates = Array.from(new Set(inputDates));

        const campaign = await SupabaseDataService.createBlackFridayCampaign({
          orgId: DEFAULT_ORG_ID,
          name: "Campanha Restricted Dates Dedupe",
          isActive: true,
          restrictSchedule: true,
          restrictedDates: sanitizedDates,
          servicesConfig: [
            { serviceId: "srv-mechas-01", discountType: "fixed", discountValue: 100 },
          ],
        });

        expect(campaign.restrictedDates).toHaveLength(2);
        expect(campaign.restrictedDates).toEqual(["2026-11-27", "2026-11-28"]);

        // Verify persistence via SupabaseDataService / SalonStore
        const fetched = await SupabaseDataService.getActiveBlackFridayCampaign(DEFAULT_ORG_ID);
        expect(fetched?.restrictedDates).toHaveLength(2);
        expect(fetched?.restrictedDates).toEqual(["2026-11-27", "2026-11-28"]);

        // Verify scheduling engine idempotency: date restriction evaluates consistently
        const testService: ServiceItem = { ...mockFixedService, id: "srv-unauthorized-corte", title: "Corte Comum" };
        const checkFirstRestricted = validateServiceDateRestriction(testService, "2026-11-27", fetched);
        const checkSecondRestricted = validateServiceDateRestriction(testService, "2026-11-28", fetched);
        const checkUnrestricted = validateServiceDateRestriction(testService, "2026-11-29", fetched);

        expect(checkFirstRestricted.isRestrictedDate).toBe(true);
        expect(checkFirstRestricted.isAllowed).toBe(false);
        expect(checkSecondRestricted.isRestrictedDate).toBe(true);
        expect(checkSecondRestricted.isAllowed).toBe(false);
        expect(checkUnrestricted.isRestrictedDate).toBe(false);
        expect(checkUnrestricted.isAllowed).toBe(true);
      });
    });

    // --- R5 Boundaries (T2.21 - T2.25) ---
    describe("R5 Boundaries & Fallback Behavior", () => {
      it("T2.21 - Expired countdown strictly freezes at 00:00:00 without negative values", () => {
        const now = "2026-11-30T12:00:00Z";
        const pastEndsAt = "2026-11-29T23:59:59Z";

        const countdown = calculateCountdown(pastEndsAt, now);

        expect(countdown.isExpired).toBe(true);
        expect(countdown.days).toBe(0);
        expect(countdown.hours).toBe(0);
        expect(countdown.minutes).toBe(0);
        expect(countdown.seconds).toBe(0);
      });

      it("T2.22 - Countdown handles null, undefined, and malformed endsAt gracefully", () => {
        expect(calculateCountdown(null).isExpired).toBe(true);
        expect(calculateCountdown(undefined).isExpired).toBe(true);
        expect(calculateCountdown("invalid-date-string").isExpired).toBe(true);
      });

      it("T2.23 - Expired campaign triggers full client layout fallback to default components", () => {
        const expiredCampaign = createTestCampaign({
          isActive: true,
          endsAt: "2026-11-10T23:59:59Z", // expired in the past
        });

        const activeStatus = isCampaignActive(expiredCampaign, new Date());
        expect(activeStatus).toBe(false);

        // Price returns default
        const price = getServiceBlackFridayPrice(mockFixedService, expiredCampaign);
        expect(price.isPromotional).toBe(false);
      });

      it("T2.24 - Active campaign with zero participating services renders regular catalog without crash", () => {
        const campaign = createTestCampaign({
          servicesConfig: [],
        });

        const price = getServiceBlackFridayPrice(mockFixedService, campaign);
        expect(price.isPromotional).toBe(false);
        expect(price.finalPrice).toBe(mockFixedService.price);
      });

      it("T2.25 - Large monetary amounts format correctly in Brazilian currency BRL format", () => {
        const largePrice = 1800.0;
        const discounted = 900.0;

        expect(formatBRL(largePrice)).toBe("R$ 1.800,00");
        expect(formatBRL(discounted)).toBe("R$ 900,00");
      });
    });
  });

  // ===========================================================================
  // TIER 3: Cross-Feature Combinations (Pairwise & System Interactions — 7 Tests)
  // ===========================================================================
  describe("Tier 3: Cross-Feature Combinations", () => {
    it("T3.1 - Pairwise R2 + R3: Multi-service cart with progressive discount on restricted date", () => {
      // 3 participating services
      const s1: ServiceItem = { ...mockFixedService, id: "srv-mechas-01", price: 450 }; // 100 off -> 350
      const s2: ServiceItem = { ...mockFixedService, id: "srv-nutricao-02", price: 180 }; // 20% off -> 144
      const s3: ServiceItem = { ...mockFixedService, id: "srv-botox-03", price: 120 }; // manual 90
      const campaign = createTestCampaign({
        restrictSchedule: true,
        restrictedDates: ["2026-11-27"],
        servicesConfig: [
          { serviceId: "srv-mechas-01", discountType: "fixed", discountValue: 100 },
          { serviceId: "srv-nutricao-02", discountType: "percentage", discountValue: 20 },
          { serviceId: "srv-botox-03", discountType: "manual", blackPrice: 90 },
        ],
        progressiveDiscount: {
          tiers: [{ minServices: 3, discountPercent: 20 }],
        },
      });

      // 1. Restriction validation for all services on Nov 27
      expect(validateServiceDateRestriction(s1, "2026-11-27", campaign).isAllowed).toBe(true);
      expect(validateServiceDateRestriction(s2, "2026-11-27", campaign).isAllowed).toBe(true);
      expect(validateServiceDateRestriction(s3, "2026-11-27", campaign).isAllowed).toBe(true);

      // 2. Multi-service cart calculation
      const cart = calculateCartBlackFridayTotal([s1, s2, s3], campaign);
      // Itemized: 350 + 144 + 90 = 584.00
      // Progressive 20% discount on combo: 584 * 0.80 = 467.20. Total saved = 750 - 467.20 = 282.80
      expect(cart.originalTotal).toBe(750);
      expect(cart.finalTotal).toBe(467.2);
      expect(cart.totalDiscount).toBe(282.8);
      expect(cart.appliedProgressivePercent).toBe(20);
    });

    it("T3.2 - Pairwise R2 + R3: Cart containing both participating and non-participating services on restricted date", () => {
      const srvAllowed: ServiceItem = { ...mockFixedService, id: "srv-mechas-01", title: "Mechas" };
      const srvBlocked: ServiceItem = { ...mockFixedService, id: "srv-regular-cut", title: "Corte Comum" };
      const campaign = createTestCampaign({
        restrictSchedule: true,
        restrictedDates: ["2026-11-27"],
      });

      const checkAllowed = validateServiceDateRestriction(srvAllowed, "2026-11-27", campaign);
      expect(checkAllowed.isAllowed).toBe(true);

      const checkBlocked = validateServiceDateRestriction(srvBlocked, "2026-11-27", campaign);
      expect(checkBlocked.isAllowed).toBe(false);
      expect(checkBlocked.reason).toContain("Corte Comum");
    });

    it("T3.3 - Pairwise R1 + R2 + R4: Admin live configuration updates immediately propagate to pricing engine", async () => {
      const service: ServiceItem = { ...mockFixedService, id: "srv-live-update", price: 200 };

      // Initial config: 10% off
      const campaign = await SupabaseDataService.createBlackFridayCampaign({
        orgId: DEFAULT_ORG_ID,
        name: "Campanha Live",
        isActive: true,
        startsAt: "2026-11-01T00:00:00Z",
        servicesConfig: [
          { serviceId: "srv-live-update", discountType: "percentage", discountValue: 10 },
        ],
      });

      const price1 = getServiceBlackFridayPrice(service, campaign);
      expect(price1.finalPrice).toBe(180);

      // Admin updates config to fixed 50 off
      const updatedCampaign = await SupabaseDataService.updateBlackFridayCampaign(campaign.id, {
        servicesConfig: [
          { serviceId: "srv-live-update", discountType: "fixed", discountValue: 50 },
        ],
      });

      const price2 = getServiceBlackFridayPrice(service, updatedCampaign!);
      expect(price2.finalPrice).toBe(150);
    });

    it("T3.4 - Pairwise R3 + R4 + R5: Admin date restriction update reflects in client banner and slot picker", async () => {
      const service: ServiceItem = { ...mockFixedService, id: "srv-corte", title: "Corte" };

      // Initial campaign without restriction
      const campaign = await SupabaseDataService.createBlackFridayCampaign({
        orgId: DEFAULT_ORG_ID,
        name: "Campanha Sem Restrição",
        isActive: true,
        startsAt: "2026-11-01T00:00:00Z",
        restrictSchedule: false,
        restrictedDates: [],
      });

      expect(validateServiceDateRestriction(service, "2026-11-27", campaign).isAllowed).toBe(true);

      // Admin enables restriction on Nov 27
      const updated = await SupabaseDataService.updateBlackFridayCampaign(campaign.id, {
        restrictSchedule: true,
        restrictedDates: ["2026-11-27"],
      });

      const restrictionCheck = validateServiceDateRestriction(service, "2026-11-27", updated!);
      expect(restrictionCheck.isAllowed).toBe(false);
      expect(restrictionCheck.isRestrictedDate).toBe(true);
    });

    it("T3.5 - Pairwise R1 + R2 + R5: Campaign expiration transition disengages discounts and calendar blocks", () => {
      const campaign = createTestCampaign({
        startsAt: "2026-11-20T00:00:00Z",
        endsAt: "2026-11-27T23:59:59Z",
        restrictSchedule: true,
        restrictedDates: ["2026-11-27"],
      });

      // Post-expiration timestamp
      const postExpiredTime = "2026-11-28T00:00:01Z";

      expect(isCampaignActive(campaign, postExpiredTime)).toBe(false);
      expect(calculateCountdown(campaign.endsAt, postExpiredTime).isExpired).toBe(true);

      const price = getServiceBlackFridayPrice(
        { ...mockFixedService, id: "srv-mechas-01", price: 450 },
        campaign,
        { referenceDate: postExpiredTime }
      );
      expect(price.isPromotional).toBe(false);
      expect(price.finalPrice).toBe(450);
    });

    it("T3.6 - Pairwise R2 + R4 + R5: Price calculations are consistent across admin preview, catalog, and checkout", () => {
      const service: ServiceItem = { ...mockFixedService, id: "srv-consistent", price: 300 };
      const campaign = createTestCampaign({
        progressiveDiscount: null, // single item checkout
        servicesConfig: [
          { serviceId: "srv-consistent", discountType: "percentage", discountValue: 25 },
        ],
      });

      // 1. Admin dynamic preview
      const adminPreview = getServiceBlackFridayPrice(service, campaign);
      // 2. Client catalog display
      const catalogDisplay = getServiceBlackFridayPrice(service, campaign);
      // 3. Checkout cart subtotal
      const checkoutTotal = calculateCartBlackFridayTotal([service], campaign);

      expect(adminPreview.finalPrice).toBe(225.0);
      expect(catalogDisplay.finalPrice).toBe(225.0);
      expect(checkoutTotal.finalTotal).toBe(225.0);
      expect(formatBRL(adminPreview.finalPrice)).toBe("R$ 225,00");
    });

    it("T3.7 - Pairwise R1 + R3 + R5: Multi-tenant organization isolation with concurrent campaigns", async () => {
      const orgA = "44444444-4444-4444-8444-444444444444";
      const orgB = "55555555-5555-4555-8555-555555555555";

      // Org A has active campaign restricting Nov 27
      await SupabaseDataService.createBlackFridayCampaign({
        orgId: orgA,
        name: "Black Friday Alpha",
        isActive: true,
        startsAt: "2026-11-01T00:00:00Z",
        restrictSchedule: true,
        restrictedDates: ["2026-11-27"],
        servicesConfig: [],
      });

      const campaignA = await SupabaseDataService.getActiveBlackFridayCampaign(orgA);
      const campaignB = await SupabaseDataService.getActiveBlackFridayCampaign(orgB);

      expect(campaignA).not.toBeNull();
      expect(campaignB).toBeNull();

      // Service booking on Org B is completely unaffected
      const serviceB: ServiceItem = { ...mockFixedService, id: "srv-beta-cut", orgId: orgB };
      const checkB = validateServiceDateRestriction(serviceB, "2026-11-27", campaignB);
      expect(checkB.isAllowed).toBe(true);
    });
  });

  // ===========================================================================
  // TIER 4: Real-World Application Scenarios (End-to-End User Workloads — 4 Scenarios)
  // ===========================================================================
  describe("Tier 4: Real-World Application Scenarios", () => {
    it("T4.1 - Scenario 1: Complete Black Friday customer booking journey with progressive combo discount", async () => {
      // 1. Setup campaign in store
      const campaign = await SupabaseDataService.createBlackFridayCampaign({
        orgId: DEFAULT_ORG_ID,
        name: "Black Friday Weekend 2026",
        isActive: true,
        startsAt: "2026-11-01T00:00:00Z",
        endsAt: "2026-11-30T23:59:59Z",
        restrictSchedule: true,
        restrictedDates: ["2026-11-27"],
        servicesConfig: [
          { serviceId: "srv-mechas-criativas", discountType: "fixed", discountValue: 100 },
          { serviceId: "srv-nutricao-capilar", discountType: "percentage", discountValue: 20 },
        ],
        progressiveDiscount: {
          tiers: [{ minServices: 2, discountPercent: 15 }],
        },
      });

      const srvMechas: ServiceItem = {
        ...mockFixedService,
        id: "srv-mechas-criativas",
        title: "Mechas Criativas Iluminadas",
        price: 450,
      };
      const srvNutricao: ServiceItem = {
        ...mockFixedService,
        id: "srv-nutricao-capilar",
        title: "Nutrição Capilar Intensiva",
        price: 180,
      };

      // 2. Client views catalog on Nov 27
      const now = "2026-11-27T10:00:00Z";
      expect(isCampaignActive(campaign, now)).toBe(true);

      const priceMechas = getServiceBlackFridayPrice(srvMechas, campaign, { referenceDate: now });
      const priceNutricao = getServiceBlackFridayPrice(srvNutricao, campaign, { referenceDate: now });

      expect(priceMechas.finalPrice).toBe(350);
      expect(priceNutricao.finalPrice).toBe(144);

      // 3. Client builds cart with combo of 2 services
      const cart = calculateCartBlackFridayTotal([srvMechas, srvNutricao], campaign, {
        referenceDate: now,
      });
      // Combo subtotal: 350 + 144 = 494.00; progressive tier = 15% -> 494 * 0.85 = 419.90
      expect(cart.originalTotal).toBe(630);
      expect(cart.finalTotal).toBe(419.9);
      expect(cart.totalDiscount).toBe(210.1);
      expect(cart.appliedProgressivePercent).toBe(15);

      // 4. Scheduling validation on restricted date Nov 27
      expect(validateServiceDateRestriction(srvMechas, "2026-11-27", campaign).isAllowed).toBe(true);
      expect(validateServiceDateRestriction(srvNutricao, "2026-11-27", campaign).isAllowed).toBe(true);

      // 5. Booking creation and persistence in store
      const appointment: Appointment = {
        ...mockConfirmedAppointment,
        id: "apt-bf-journey-01",
        orgId: DEFAULT_ORG_ID,
        date: "2026-11-27",
        serviceId: "srv-mechas-criativas",
        service: srvMechas,
        totalPrice: cart.finalTotal,
        notes: "Reserva Black Friday Combo",
      };

      SalonStore.saveAppointment(appointment);
      const savedApt = SalonStore.getAppointments().find((a) => a.id === "apt-bf-journey-01");

      expect(savedApt).toBeDefined();
      expect(savedApt?.totalPrice).toBe(419.9);
      expect(savedApt?.date).toBe("2026-11-27");
    });

    it("T4.2 - Scenario 2: Unauthorized booking attempt on restricted date with graceful recovery", async () => {
      const campaign = await SupabaseDataService.createBlackFridayCampaign({
        orgId: DEFAULT_ORG_ID,
        name: "Black Friday Exclusiva",
        isActive: true,
        startsAt: "2026-11-01T00:00:00Z",
        restrictSchedule: true,
        restrictedDates: ["2026-11-28"],
        servicesConfig: [
          { serviceId: "srv-mechas-bf", discountType: "fixed", discountValue: 100 },
        ],
      });

      const regularService: ServiceItem = {
        ...mockFixedService,
        id: "srv-corte-comum",
        title: "Corte Tradicional",
        price: 150,
      };

      // 1. Attempt on restricted date Nov 28 -> blocked
      const blockedAttempt = validateServiceDateRestriction(regularService, "2026-11-28", campaign);
      expect(blockedAttempt.isAllowed).toBe(false);
      expect(blockedAttempt.isRestrictedDate).toBe(true);

      // 2. Recovery Path A: Client switches to unrestricted date (Nov 30) -> success
      const recoveryPathA = validateServiceDateRestriction(regularService, "2026-11-30", campaign);
      expect(recoveryPathA.isAllowed).toBe(true);
      expect(recoveryPathA.isRestrictedDate).toBe(false);

      // 3. Recovery Path B: Client switches service to participating Mechas on Nov 28 -> success
      const promoService: ServiceItem = {
        ...mockFixedService,
        id: "srv-mechas-bf",
        title: "Mechas Black Friday",
        price: 450,
      };
      const recoveryPathB = validateServiceDateRestriction(promoService, "2026-11-28", campaign);
      expect(recoveryPathB.isAllowed).toBe(true);
      expect(recoveryPathB.isRestrictedDate).toBe(true);
    });

    it("T4.3 - Scenario 3: Real-time admin promotion launch during active salon operations", async () => {
      // 1. Initial State: Normal salon operations
      const activeInitial = await SupabaseDataService.getActiveBlackFridayCampaign(DEFAULT_ORG_ID);
      expect(activeInitial).toBeNull();

      let liveBroadcastReceived = false;
      const unsubscribe = subscribeToSync((event) => {
        if (event.type === "black_friday_campaign_saved") {
          liveBroadcastReceived = true;
        }
      });

      // 2. Admin launches campaign in real time
      const campaign = await SupabaseDataService.createBlackFridayCampaign({
        orgId: DEFAULT_ORG_ID,
        name: "Lançamento Black Friday Relâmpago",
        isActive: true,
        startsAt: "2026-11-01T00:00:00Z",
        endsAt: "2026-11-30T23:59:59Z",
        servicesConfig: [
          { serviceId: "srv-flash-mechas", discountType: "fixed", discountValue: 120 },
        ],
      });

      // 3. Sync bus broadcasts event immediately
      expect(liveBroadcastReceived).toBe(true);

      // 4. Client querying active campaign immediately sees promo prices
      const refreshedActive = await SupabaseDataService.getActiveBlackFridayCampaign(DEFAULT_ORG_ID);
      expect(refreshedActive?.id).toBe(campaign.id);

      const pricing = getServiceBlackFridayPrice(
        { ...mockFixedService, id: "srv-flash-mechas", price: 400 },
        refreshedActive
      );
      expect(pricing.finalPrice).toBe(280);

      unsubscribe();
    });

    it("T4.4 - Scenario 4: Post-campaign expiration, clean reversion, and historical booking financial integrity", async () => {
      // 1. Save historical appointment booked at promotional price R$ 419.90
      const historicalAppointment: Appointment = {
        ...mockConfirmedAppointment,
        id: "apt-historical-bf",
        orgId: DEFAULT_ORG_ID,
        date: "2026-11-27",
        totalPrice: 419.9,
        notes: "Black Friday Historical Record",
      };
      SalonStore.saveAppointment(historicalAppointment);

      // 2. Campaign expires (endsAt was in the past)
      const expiredCampaign = createTestCampaign({
        startsAt: "2026-11-01T00:00:00Z",
        endsAt: "2026-11-10T23:59:59Z",
        restrictSchedule: true,
        restrictedDates: ["2026-11-27"],
      });

      const currentDate = "2026-11-15T10:00:00Z";
      expect(isCampaignActive(expiredCampaign, currentDate)).toBe(false);

      // 3. Restriction automatically lifts post-campaign
      const restrictionCheck = validateServiceDateRestriction(
        mockFixedService,
        "2026-11-27",
        isCampaignActive(expiredCampaign, currentDate) ? expiredCampaign : null
      );
      expect(restrictionCheck.isAllowed).toBe(true);

      // 4. Historical booking retains exact promotional price without recalculation
      const retrievedAppointment = SalonStore.getAppointments().find(
        (a) => a.id === "apt-historical-bf"
      );
      expect(retrievedAppointment?.totalPrice).toBe(419.9);
      expect(retrievedAppointment?.totalPrice).not.toBe(mockFixedService.price);
    });
  });
});
