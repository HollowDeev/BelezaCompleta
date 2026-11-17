import { describe, it, expect } from "vitest";
import {
  validateServiceDateRestriction,
  calculateDaySlotGrid,
  calculateAvailableSlots,
  validateProposalScheduleFeasibility,
  ScheduleRestrictionResult,
  SalonScheduleConfig,
} from "@/lib/scheduling/engine";
import {
  BlackFridayCampaign,
  BlackFridayCampaignRow,
} from "@/types/blackFriday";
import { ServiceItem } from "@/types/service";
import { Appointment } from "@/types/appointment";
import { ProposalTechnicalStep } from "@/types/proposal";

// Test fixture helper for services
function createTestService(overrides: Partial<ServiceItem> = {}): ServiceItem {
  return {
    id: "srv-mechas-01",
    orgId: "org-gleicy-default",
    professionalId: "prof-gleicy",
    title: "Mechas Criativas",
    slug: "mechas-criativas",
    category: "mechas",
    description: "Serviço participante da promoção",
    price: 450,
    isActive: true,
    requiresTriage: false,
    steps: [
      {
        id: "step-1",
        title: "Aplicação de Descolorante",
        durationMin: 60,
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
    id: "camp-bf-schedule-2026",
    orgId: "org-gleicy-default",
    name: "Black Friday Oficial 2026",
    isActive: true,
    startsAt: "2026-11-01T00:00:00Z",
    endsAt: "2026-11-30T23:59:59Z",
    restrictSchedule: true,
    restrictedDates: ["2026-11-27", "2026-11-28"],
    servicesConfig: [
      { serviceId: "srv-mechas-01", discountType: "fixed", discountValue: 100 },
      { serviceId: "srv-nutricao-02", discountType: "percentage", discountValue: 20 },
      { serviceId: "srv-botox-03", discountType: "manual", blackPrice: 199.9 },
    ],
    progressiveDiscount: null,
    ...overrides,
  };
}

describe("Black Friday Scheduling Restrictions & Engine Integration (R3)", () => {
  // ===========================================================================
  // 1. validateServiceDateRestriction
  // ===========================================================================
  describe("validateServiceDateRestriction", () => {
    it("allows booking if campaign is null, undefined, or missing", () => {
      const service = createTestService();
      expect(validateServiceDateRestriction(service, "2026-11-27", null)).toEqual({
        isAllowed: true,
        isRestrictedDate: false,
      });
      expect(validateServiceDateRestriction(service, "2026-11-27", undefined)).toEqual({
        isAllowed: true,
        isRestrictedDate: false,
      });
    });

    it("allows booking if campaign isActive is false", () => {
      const service = createTestService({ id: "srv-unauthorized" });
      const campaign = createMockCampaign({ isActive: false });

      const result = validateServiceDateRestriction(service, "2026-11-27", campaign);
      expect(result.isAllowed).toBe(true);
      expect(result.isRestrictedDate).toBe(false);
    });

    it("allows booking if campaign restrictSchedule is false", () => {
      const service = createTestService({ id: "srv-unauthorized" });
      const campaign = createMockCampaign({ restrictSchedule: false });

      const result = validateServiceDateRestriction(service, "2026-11-27", campaign);
      expect(result.isAllowed).toBe(true);
      expect(result.isRestrictedDate).toBe(false);
    });

    it("allows booking on non-restricted dates for any service", () => {
      const nonParticipatingService = createTestService({
        id: "srv-corte-tradicional",
        title: "Corte Tradicional",
      });
      const campaign = createMockCampaign();

      // 2026-11-26 is not in restrictedDates: ["2026-11-27", "2026-11-28"]
      const result = validateServiceDateRestriction(
        nonParticipatingService,
        "2026-11-26",
        campaign
      );
      expect(result.isAllowed).toBe(true);
      expect(result.isRestrictedDate).toBe(false);
    });

    it("permits booking on restricted date when single service participates in campaign", () => {
      const participatingService = createTestService({
        id: "srv-mechas-01",
        title: "Mechas Criativas",
      });
      const campaign = createMockCampaign();

      const result = validateServiceDateRestriction(
        participatingService,
        "2026-11-27",
        campaign
      );
      expect(result.isAllowed).toBe(true);
      expect(result.isRestrictedDate).toBe(true);
    });

    it("blocks booking on restricted date when single service does not participate", () => {
      const nonParticipatingService = createTestService({
        id: "srv-corte-tradicional",
        title: "Corte Tradicional",
      });
      const campaign = createMockCampaign();

      const result = validateServiceDateRestriction(
        nonParticipatingService,
        "2026-11-27",
        campaign
      );
      expect(result.isAllowed).toBe(false);
      expect(result.isRestrictedDate).toBe(true);
      expect(result.reason).toBeDefined();
      expect(result.reason).toContain("2026-11-27");
      expect(result.reason).toContain("Corte Tradicional");
      expect(result.reason).toContain("exclusiva para serviços Black Friday");
    });

    it("normalizes ISO timestamp strings to date-only string", () => {
      const service = createTestService({ id: "srv-corte-tradicional", title: "Corte" });
      const campaign = createMockCampaign();

      const result = validateServiceDateRestriction(
        service,
        "2026-11-27T14:30:00.000Z",
        campaign
      );
      expect(result.isAllowed).toBe(false);
      expect(result.isRestrictedDate).toBe(true);
      expect(result.reason).toContain("2026-11-27");
    });

    it("handles composite services: permits when all procedures participate", () => {
      const compositeService = createTestService({
        id: "composite-123456",
        title: "Combo Mechas + Nutrição",
        procedures: [
          { id: "srv-mechas-01", title: "Mechas Criativas", price: 350, isIncluded: true },
          { id: "srv-nutricao-02", title: "Nutrição Intensa", price: 160, isIncluded: true },
        ],
      });
      const campaign = createMockCampaign();

      const result = validateServiceDateRestriction(compositeService, "2026-11-27", campaign);
      expect(result.isAllowed).toBe(true);
      expect(result.isRestrictedDate).toBe(true);
    });

    it("handles composite services: blocks when any procedure does not participate", () => {
      const compositeService = createTestService({
        id: "composite-123456",
        title: "Combo Mechas + Corte Normal",
        procedures: [
          { id: "srv-mechas-01", title: "Mechas Criativas", price: 350, isIncluded: true },
          { id: "srv-corte-avulso", title: "Corte Avulso", price: 90, isIncluded: true },
        ],
      });
      const campaign = createMockCampaign();

      const result = validateServiceDateRestriction(compositeService, "2026-11-27", campaign);
      expect(result.isAllowed).toBe(false);
      expect(result.isRestrictedDate).toBe(true);
      expect(result.reason).toContain("2026-11-27");
      expect(result.reason).toContain('"Corte Avulso"');
      expect(result.reason).toContain("exclusiva para procedimentos da Black Friday");
    });

    it("supports snake_case database row objects seamlessly", () => {
      const service = createTestService({ id: "srv-unauthorized", title: "Escova" });
      const row: Partial<BlackFridayCampaignRow> = {
        is_active: true,
        restrict_schedule: true,
        restricted_dates: ["2026-11-27"],
        services_config: [
          { service_id: "srv-mechas-01", discount_type: "fixed", discount_value: 100 },
        ],
      };

      const result = validateServiceDateRestriction(service, "2026-11-27", row as any);
      expect(result.isAllowed).toBe(false);
      expect(result.isRestrictedDate).toBe(true);
      expect(result.reason).toContain("Escova");
    });
  });

  // ===========================================================================
  // 2. calculateDaySlotGrid Integration
  // ===========================================================================
  describe("calculateDaySlotGrid Integration", () => {
    it("marks all slots as occupied and unavailable on restricted dates for non-participating services", () => {
      const nonParticipating = createTestService({
        id: "srv-corte-simples",
        title: "Corte Simples",
      });
      const campaign = createMockCampaign();

      const slots = calculateDaySlotGrid(
        nonParticipating,
        "2026-11-27",
        "prof-gleicy",
        [],
        { blackFridayCampaign: campaign }
      );

      expect(slots.length).toBeGreaterThan(0);
      const availableSlots = slots.filter((s) => s.isAvailable);
      expect(availableSlots).toHaveLength(0);

      // Verify slot properties
      expect(slots[0].status).toBe("occupied");
      expect(slots[0].isAvailable).toBe(false);
      expect(slots[0].isEncaixe).toBe(false);
      expect(slots[0].conflictReason).toContain("exclusiva para serviços Black Friday");
      expect(slots[0].conflictReason).toContain("Corte Simples");
    });

    it("generates normal available slots on restricted dates for participating services", () => {
      const participating = createTestService({
        id: "srv-mechas-01",
        title: "Mechas Criativas",
      });
      const campaign = createMockCampaign();

      const slots = calculateDaySlotGrid(
        participating,
        "2026-11-27",
        "prof-gleicy",
        [],
        { blackFridayCampaign: campaign }
      );

      expect(slots.length).toBeGreaterThan(0);
      const availableSlots = slots.filter((s) => s.isAvailable);
      expect(availableSlots.length).toBeGreaterThan(0);
      expect(availableSlots[0].status).toBe("available");
      expect(availableSlots[0].stepBlocks).toBeDefined();
    });

    it("generates normal available slots on non-restricted dates for non-participating services", () => {
      const nonParticipating = createTestService({
        id: "srv-corte-simples",
        title: "Corte Simples",
      });
      const campaign = createMockCampaign();

      // 2026-11-25 is not a restricted date
      const slots = calculateDaySlotGrid(
        nonParticipating,
        "2026-11-25",
        "prof-gleicy",
        [],
        { blackFridayCampaign: campaign }
      );

      expect(slots.length).toBeGreaterThan(0);
      const availableSlots = slots.filter((s) => s.isAvailable);
      expect(availableSlots.length).toBeGreaterThan(0);
    });

    it("generates normal slots when campaign restrictSchedule is false", () => {
      const nonParticipating = createTestService({
        id: "srv-corte-simples",
        title: "Corte Simples",
      });
      const campaign = createMockCampaign({ restrictSchedule: false });

      const slots = calculateDaySlotGrid(
        nonParticipating,
        "2026-11-27",
        "prof-gleicy",
        [],
        { blackFridayCampaign: campaign }
      );

      const availableSlots = slots.filter((s) => s.isAvailable);
      expect(availableSlots.length).toBeGreaterThan(0);
    });
  });

  // ===========================================================================
  // 3. calculateAvailableSlots Integration
  // ===========================================================================
  describe("calculateAvailableSlots Integration", () => {
    it("returns empty array for restricted dates with non-participating service", () => {
      const nonParticipating = createTestService({
        id: "srv-unauthorized",
        title: "Massagem Capilar",
      });
      const campaign = createMockCampaign();

      const availableSlots = calculateAvailableSlots(
        nonParticipating,
        "2026-11-27",
        "prof-gleicy",
        [],
        { blackFridayCampaign: campaign }
      );

      expect(availableSlots).toEqual([]);
      expect(availableSlots).toHaveLength(0);
    });

    it("returns available slots for restricted dates with participating service", () => {
      const participating = createTestService({
        id: "srv-mechas-01",
        title: "Mechas Criativas",
      });
      const campaign = createMockCampaign();

      const availableSlots = calculateAvailableSlots(
        participating,
        "2026-11-27",
        "prof-gleicy",
        [],
        { blackFridayCampaign: campaign }
      );

      expect(availableSlots.length).toBeGreaterThan(0);
      expect(availableSlots[0].time).toBeDefined();
      expect(availableSlots[0].endTime).toBeDefined();
      expect(availableSlots[0].stepBlocks).toBeDefined();
    });

    it("returns available slots for non-restricted dates with non-participating service", () => {
      const nonParticipating = createTestService({
        id: "srv-unauthorized",
        title: "Massagem Capilar",
      });
      const campaign = createMockCampaign();

      const availableSlots = calculateAvailableSlots(
        nonParticipating,
        "2026-11-25",
        "prof-gleicy",
        [],
        { blackFridayCampaign: campaign }
      );

      expect(availableSlots.length).toBeGreaterThan(0);
    });
  });

  // ===========================================================================
  // 4. validateProposalScheduleFeasibility Integration
  // ===========================================================================
  describe("validateProposalScheduleFeasibility Integration", () => {
    const technicalSteps: ProposalTechnicalStep[] = [
      {
        id: "step-1",
        title: "Aplicação Mechas",
        type: "active",
        durationMin: 60,
      },
    ];

    it("marks proposal feasible on restricted date when service participates", () => {
      const participatingService = createTestService({
        id: "srv-mechas-01",
        title: "Mechas Criativas",
      });
      const campaign = createMockCampaign();

      const result = validateProposalScheduleFeasibility({
        date: "2026-11-27",
        startTime: "09:00",
        technicalSteps,
        existingAppointments: [],
        service: participatingService,
        blackFridayCampaign: campaign,
      });

      expect(result.isFeasible).toBe(true);
      expect(result.conflictReason).toBeUndefined();
      expect(result.endTime).toBe("10:00");
    });

    it("marks proposal infeasible on restricted date when service does not participate", () => {
      const nonParticipatingService = createTestService({
        id: "srv-corte-avulso",
        title: "Corte Avulso",
      });
      const campaign = createMockCampaign();

      const result = validateProposalScheduleFeasibility({
        date: "2026-11-27",
        startTime: "09:00",
        technicalSteps,
        existingAppointments: [],
        service: nonParticipatingService,
        blackFridayCampaign: campaign,
      });

      expect(result.isFeasible).toBe(false);
      expect(result.conflictReason).toBeDefined();
      expect(result.conflictReason).toContain("exclusiva para serviços Black Friday");
      expect(result.conflictReason).toContain("Corte Avulso");
    });

    it("marks proposal infeasible on restricted date for composite service with non-participating procedure", () => {
      const compositeService = createTestService({
        id: "composite-bundle-999",
        title: "Combo Iluminação",
        procedures: [
          { id: "srv-mechas-01", title: "Mechas Criativas", price: 350, isIncluded: true },
          { id: "srv-nao-participante", title: "Pedicure", price: 50, isIncluded: true },
        ],
      });
      const campaign = createMockCampaign();

      const result = validateProposalScheduleFeasibility({
        date: "2026-11-27",
        startTime: "09:00",
        technicalSteps,
        existingAppointments: [],
        service: compositeService,
        blackFridayCampaign: campaign,
      });

      expect(result.isFeasible).toBe(false);
      expect(result.conflictReason).toContain("Pedicure");
      expect(result.conflictReason).toContain("exclusiva para procedimentos da Black Friday");
    });

    it("accepts blackFridayCampaign via salonConfig parameter", () => {
      const nonParticipatingService = createTestService({
        id: "srv-corte-avulso",
        title: "Corte Avulso",
      });
      const campaign = createMockCampaign();

      const result = validateProposalScheduleFeasibility({
        date: "2026-11-27",
        startTime: "09:00",
        technicalSteps,
        existingAppointments: [],
        service: nonParticipatingService,
        salonConfig: {
          openMinutes: 8 * 60 + 30,
          closeMinutes: 19 * 60,
          blackFridayCampaign: campaign,
        },
      });

      expect(result.isFeasible).toBe(false);
      expect(result.conflictReason).toContain("Corte Avulso");
    });

    it("allows proposal on restricted date if campaign restrictSchedule is disabled", () => {
      const nonParticipatingService = createTestService({
        id: "srv-corte-avulso",
        title: "Corte Avulso",
      });
      const campaign = createMockCampaign({ restrictSchedule: false });

      const result = validateProposalScheduleFeasibility({
        date: "2026-11-27",
        startTime: "09:00",
        technicalSteps,
        existingAppointments: [],
        service: nonParticipatingService,
        blackFridayCampaign: campaign,
      });

      expect(result.isFeasible).toBe(true);
    });
  });
});
