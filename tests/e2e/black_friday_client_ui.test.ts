import { describe, it, expect, beforeEach, vi } from "vitest";
import React from "react";

// Mock next/image to prevent Node runtime ReferenceError: document is not defined
vi.mock("next/image", () => ({
  default: (props: any) => React.createElement("img", props),
}));

if (typeof (globalThis as any).document === "undefined") {
  (globalThis as any).document = {
    querySelector: () => null,
    getElementById: () => null,
    createElement: () => ({}),
  };
}

import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "fs";
import { resolve } from "path";

import { BlackFridayBanner } from "@/components/client/BlackFridayBanner";
import { BlackFridayHero } from "@/components/client/BlackFridayHero";
import { TransparentServicesCatalog } from "@/components/client/TransparentServicesCatalog";
import { SlotPicker } from "@/components/client/SlotPicker";
import {
  getServiceBlackFridayPrice,
  isCampaignActive,
} from "@/lib/services/blackFridayPricing";
import {
  validateServiceDateRestriction,
  calculateDaySlotGrid,
} from "@/lib/scheduling/engine";
import {
  BlackFridayCampaign,
  BlackFridayCampaignRow,
} from "@/types/blackFriday";
import { ServiceItem } from "@/types/service";
import { SalonOrganization } from "@/types/salon";

const mockOrganization: SalonOrganization = {
  id: "11111111-1111-4111-8111-111111111111",
  name: "Espaço Gleicy Ronha",
  slug: "gleicy-ronha",
  tagline: "O cuidado que acolhe. A beleza que encanta.",
  phone: "11995975725",
  city: "Salto",
  state: "SP",
  document: "12345678000199",
  createdAt: "2026-01-01T00:00:00Z",
};

const mockServices: ServiceItem[] = [
  {
    id: "srv-mechas-bf",
    orgId: "11111111-1111-4111-8111-111111111111",
    professionalId: "user-gleicy-ronha",
    title: "Mechas Criativas & Blond",
    slug: "mechas-criativas",
    category: "mechas",
    description: "Descoloração de alta performance e matização personalizada.",
    price: 500,
    requiresTriage: true,
    steps: [
      { id: "st-1", order: 1, title: "Aplicação", type: "active", durationMin: 120, requiresExclusiveAttention: true },
      { id: "st-2", order: 2, title: "Pausa Química", type: "pause", durationMin: 45, maxPauseDurationMin: 60, isParallelSlotAllowed: true },
    ],
  },
  {
    id: "srv-corte-normal",
    orgId: "11111111-1111-4111-8111-111111111111",
    professionalId: "user-gleicy-ronha",
    title: "Corte Bordado Autoral",
    slug: "corte-bordado",
    category: "corte",
    description: "Corte de precisão mantendo o comprimento.",
    price: 200,
    requiresTriage: false,
    steps: [
      { id: "st-1", order: 1, title: "Corte e Modelagem", type: "active", durationMin: 60, requiresExclusiveAttention: true },
    ],
  },
];

const mockActiveCampaign: BlackFridayCampaign = {
  id: "bf-camp-2026",
  orgId: "11111111-1111-4111-8111-111111111111",
  name: "Black Friday Oficial Gleicy Ronha",
  isActive: true,
  startsAt: "2026-11-01T00:00:00Z",
  endsAt: "2026-11-30T23:59:59Z",
  restrictSchedule: true,
  restrictedDates: ["2026-11-27", "2026-11-28"],
  servicesConfig: [
    {
      serviceId: "srv-mechas-bf",
      discountType: "percentage",
      discountValue: 20,
    },
  ],
  progressiveDiscount: {
    tiers: [
      { minServices: 2, discountPercent: 15 },
      { minServices: 3, discountPercent: 25 },
    ],
  },
};

describe("Milestone M4: Public Client Experience (Requirement R5)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  /* ========================================================================
     1. BlackFridayBanner Component Tests
     ======================================================================== */
  describe("1. BlackFridayBanner (Top Countdown Banner & Restrictions)", () => {
    it("renders BlackFridayBanner with promotional badge, title, and CTA button", () => {
      const html = renderToStaticMarkup(
        React.createElement(BlackFridayBanner, {
          campaign: mockActiveCampaign,
        })
      );

      expect(html).toContain('data-testid="black-friday-banner"');
      expect(html).toContain("BLACK FRIDAY");
      expect(html).toContain("Condições Exclusivas por Tempo Limitado!");
      expect(html).toContain("Ver Ofertas");
      expect(html).toContain('data-testid="black-friday-banner-cta"');
    });

    it("displays schedule restriction notice when restrictSchedule is active with restricted dates", () => {
      const html = renderToStaticMarkup(
        React.createElement(BlackFridayBanner, {
          campaign: mockActiveCampaign,
        })
      );

      expect(html).toContain('data-testid="schedule-restriction-notice"');
      expect(html).toContain("Agenda Especial");
      expect(html).toContain("27/11, 28/11");
    });

    it("omits schedule restriction notice when restrictSchedule is false", () => {
      const inactiveScheduleCampaign: BlackFridayCampaign = {
        ...mockActiveCampaign,
        restrictSchedule: false,
      };

      const html = renderToStaticMarkup(
        React.createElement(BlackFridayBanner, {
          campaign: inactiveScheduleCampaign,
        })
      );

      expect(html).not.toContain('data-testid="schedule-restriction-notice"');
    });

    it("strictly clamps countdown timer at zero when campaign has already expired (no negative values)", () => {
      const expiredCampaign: BlackFridayCampaign = {
        ...mockActiveCampaign,
        endsAt: "2020-01-01T00:00:00Z", // Past date
      };

      const html = renderToStaticMarkup(
        React.createElement(BlackFridayBanner, {
          campaign: expiredCampaign,
        })
      );

      // Verify days, hours, minutes, seconds are all clamped to '00'
      expect(html).toMatch(/data-testid="countdown-days"[^>]*>00<\/span>/);
      expect(html).toMatch(/data-testid="countdown-hours"[^>]*>00<\/span>/);
      expect(html).toMatch(/data-testid="countdown-minutes"[^>]*>00<\/span>/);
      expect(html).toMatch(/data-testid="countdown-seconds"[^>]*>00<\/span>/);
      expect(html).toContain("Encerrado");

      // Verify no negative values exist anywhere in the countdown container
      expect(html).not.toMatch(/data-testid="countdown-(days|hours|minutes|seconds)">-[0-9]+/);
    });

    it("handles snake_case BlackFridayCampaignRow input transparently", () => {
      const snakeCaseCampaign: BlackFridayCampaignRow = {
        id: "bf-snake-01",
        org_id: "11111111-1111-4111-8111-111111111111",
        name: "Black Friday Snake",
        is_active: true,
        starts_at: "2026-11-01T00:00:00Z",
        ends_at: "2026-11-30T23:59:59Z",
        restrict_schedule: true,
        restricted_dates: ["2026-11-27"],
        services_config: [{ service_id: "srv-mechas-bf", discount_type: "fixed", discount_value: 100 }],
        progressive_discount: null,
        created_at: "2026-11-01T00:00:00Z",
        updated_at: "2026-11-01T00:00:00Z",
      };

      const html = renderToStaticMarkup(
        React.createElement(BlackFridayBanner, {
          campaign: snakeCaseCampaign,
        })
      );

      expect(html).toContain('data-testid="black-friday-banner"');
      expect(html).toContain("27/11");
    });

    it("uses luxury brand palette styling tokens (#080F0E, #C7A03A, #FCF5EB)", () => {
      const html = renderToStaticMarkup(
        React.createElement(BlackFridayBanner, {
          campaign: mockActiveCampaign,
        })
      );

      expect(html).toContain("bg-[#080F0E]");
      expect(html).toContain("text-[#FCF5EB]");
      expect(html).toContain("#C7A03A");
    });
  });

  /* ========================================================================
     2. BlackFridayHero Component Tests
     ======================================================================== */
  describe("2. BlackFridayHero (Themed Luxury Hero Section)", () => {
    it("renders BlackFridayHero with brand palette (#080F0E, #1D3D3C, #C7A03A, #FCF5EB)", () => {
      const html = renderToStaticMarkup(
        React.createElement(BlackFridayHero, {
          organization: mockOrganization,
          campaign: mockActiveCampaign,
          onExploreServices: () => {},
          onBookNow: () => {},
        })
      );

      expect(html).toContain('data-testid="black-friday-hero"');
      expect(html).toContain("from-[#080F0E]");
      expect(html).toContain("via-[#122B2A]");
      expect(html).toContain("to-[#080F0E]");
      expect(html).toContain("#C7A03A");
      expect(html).toContain("text-[#FCF5EB]");
    });

    it("renders Google 5.0 badge, location, and campaign name tag", () => {
      const html = renderToStaticMarkup(
        React.createElement(BlackFridayHero, {
          organization: mockOrganization,
          campaign: mockActiveCampaign,
          onExploreServices: () => {},
          onBookNow: () => {},
        })
      );

      expect(html).toContain("5.0 no Google");
      expect(html).toContain("Salto - SP");
      expect(html).toContain("Black Friday Oficial Gleicy Ronha");
    });

    it("renders cursive slogan in font-gwendolyn and editorial headline", () => {
      const html = renderToStaticMarkup(
        React.createElement(BlackFridayHero, {
          organization: mockOrganization,
          campaign: mockActiveCampaign,
          onExploreServices: () => {},
          onBookNow: () => {},
        })
      );

      expect(html).toContain("font-gwendolyn");
      expect(html).toContain("O cuidado que acolhe");
      expect(html).toContain("font-editorial");
      expect(html).toContain("saúde capilar");
    });

    it("renders both primary and secondary CTAs targeting promotional booking", () => {
      const html = renderToStaticMarkup(
        React.createElement(BlackFridayHero, {
          organization: mockOrganization,
          campaign: mockActiveCampaign,
          onExploreServices: () => {},
          onBookNow: () => {},
        })
      );

      expect(html).toContain('data-testid="black-friday-hero-primary-cta"');
      expect(html).toContain("Garantir Vaga na Black Friday");
      expect(html).toContain('data-testid="black-friday-hero-secondary-cta"');
      expect(html).toContain("Ver Menu Promocional");
    });

    it("points model image to '/brand/hero_modelo.png' with trust badges", () => {
      const html = renderToStaticMarkup(
        React.createElement(BlackFridayHero, {
          organization: mockOrganization,
          campaign: mockActiveCampaign,
          onExploreServices: () => {},
          onBookNow: () => {},
        })
      );

      expect(html).toContain('src="/brand/hero_modelo.png"');
      expect(html).toContain("Atenção individualizada");
      expect(html).toContain("Teste de mecha obrigatório");
      expect(html).toContain("Ofertas Reais e Limitadas");
      expect(html).toContain("Desde 2013");
      expect(html).toContain("Gleicy Ronha");
    });
  });

  /* ========================================================================
     3. TransparentServicesCatalog Badging & Price Display Tests
     ======================================================================== */
  describe("3. TransparentServicesCatalog (Badging, Strikethrough & Progressive Notice)", () => {
    it("renders 'BLACK FRIDAY' badge, original price strikethrough, and golden promo price for participating service", () => {
      const html = renderToStaticMarkup(
        React.createElement(TransparentServicesCatalog, {
          services: mockServices,
          blackFridayCampaign: mockActiveCampaign,
          onSelectService: () => {},
        })
      );

      // srv-mechas-bf has 20% discount on R$ 500 = R$ 400
      expect(html).toContain('data-testid="service-bf-badge"');
      expect(html).toContain("BLACK FRIDAY");
      expect(html).toContain('data-testid="service-bf-price"');
      expect(html).toContain("R$ 400,00"); // Final promotional price in gold
      expect(html).toContain('data-testid="service-original-price"');
      expect(html).toContain("R$ 500,00"); // Original price with line-through
      expect(html).toContain("20% OFF");
    });

    it("renders standard pricing and NO 'BLACK FRIDAY' badge for non-participating service", () => {
      const nonBfServiceOnly = [mockServices[1]]; // srv-corte-normal (not in campaign)

      const html = renderToStaticMarkup(
        React.createElement(TransparentServicesCatalog, {
          services: nonBfServiceOnly,
          blackFridayCampaign: mockActiveCampaign,
          onSelectService: () => {},
        })
      );

      expect(html).not.toContain('data-testid="service-bf-badge"');
      expect(html).not.toContain('data-testid="service-bf-price"');
      expect(html).toContain("R$ 200,00");
    });

    it("renders progressive discount bonus notice when campaign has configured tiers", () => {
      const html = renderToStaticMarkup(
        React.createElement(TransparentServicesCatalog, {
          services: mockServices,
          blackFridayCampaign: mockActiveCampaign,
          onSelectService: () => {},
        })
      );

      expect(html).toContain('data-testid="bf-progressive-notice"');
      expect(html).toContain("Desconto Progressivo Black Friday");
      expect(html).toContain("Bônus Multi-Serviço");
    });

    it("omits progressive discount notice when campaign has no tiers", () => {
      const noTiersCampaign: BlackFridayCampaign = {
        ...mockActiveCampaign,
        progressiveDiscount: null,
      };

      const html = renderToStaticMarkup(
        React.createElement(TransparentServicesCatalog, {
          services: mockServices,
          blackFridayCampaign: noTiersCampaign,
          onSelectService: () => {},
        })
      );

      expect(html).not.toContain('data-testid="bf-progressive-notice"');
    });

    it("renders 100% standard catalog layout when blackFridayCampaign is null", () => {
      const html = renderToStaticMarkup(
        React.createElement(TransparentServicesCatalog, {
          services: mockServices,
          blackFridayCampaign: null,
          onSelectService: () => {},
        })
      );

      expect(html).not.toContain('data-testid="service-bf-badge"');
      expect(html).not.toContain('data-testid="service-bf-price"');
      expect(html).not.toContain('data-testid="bf-progressive-notice"');
      expect(html).toContain("R$ 500,00");
      expect(html).toContain("R$ 200,00");
    });
  });

  /* ========================================================================
     4. SlotPicker Date Restriction & Booking Validation Guards Tests
     ======================================================================== */
  describe("4. SlotPicker (Date Restrictions & Pre-Booking Validation Guards)", () => {
    it("renders restriction banner on restricted date when campaign is active", () => {
      const html = renderToStaticMarkup(
        React.createElement(SlotPicker, {
          service: mockServices[0], // Participating service
          existingAppointments: [],
          availableDays: [{ id: "day-1", professionalId: "user-gleicy-ronha", date: "2026-11-27", isOpen: true, startTime: "09:00", endTime: "18:00" }],
          campaign: mockActiveCampaign,
          onConfirmBooking: () => {},
          onCancel: () => {},
        })
      );

      expect(html).toBeDefined();
    });

    it("validates that validateServiceDateRestriction blocks non-participating service on restricted date", () => {
      const nonParticipatingService = mockServices[1]; // srv-corte-normal
      const restrictedDate = "2026-11-27";

      const result = validateServiceDateRestriction(
        nonParticipatingService,
        restrictedDate,
        mockActiveCampaign
      );

      expect(result.isAllowed).toBe(false);
      expect(result.isRestrictedDate).toBe(true);
      expect(result.reason).toContain("A data selecionada (2026-11-27) possui agenda exclusiva para serviços Black Friday");
      expect(result.reason).toContain(nonParticipatingService.title);
    });

    it("validates that validateServiceDateRestriction allows participating service on restricted date", () => {
      const participatingService = mockServices[0]; // srv-mechas-bf
      const restrictedDate = "2026-11-27";

      const result = validateServiceDateRestriction(
        participatingService,
        restrictedDate,
        mockActiveCampaign
      );

      expect(result.isAllowed).toBe(true);
      expect(result.isRestrictedDate).toBe(true);
    });

    it("validates that validateServiceDateRestriction allows non-participating service on unrestricted date", () => {
      const nonParticipatingService = mockServices[1]; // srv-corte-normal
      const normalDate = "2026-11-25"; // Not in restricted_dates

      const result = validateServiceDateRestriction(
        nonParticipatingService,
        normalDate,
        mockActiveCampaign
      );

      expect(result.isAllowed).toBe(true);
      expect(result.isRestrictedDate).toBe(false);
    });

    it("marks slots as occupied and unavailable in calculateDaySlotGrid for non-participating service on restricted date", () => {
      const nonParticipatingService = mockServices[1];
      const restrictedDate = "2026-11-27";

      const grid = calculateDaySlotGrid(
        nonParticipatingService,
        restrictedDate,
        "user-gleicy-ronha",
        [],
        {
          openMinutes: 540,
          closeMinutes: 1080,
          slotIntervalMinutes: 60,
          blackFridayCampaign: mockActiveCampaign,
        }
      );

      expect(grid.length).toBeGreaterThan(0);
      expect(grid.every((s) => !s.isAvailable)).toBe(true);
      expect(grid.every((s) => s.status === "occupied")).toBe(true);
      expect(grid[0].conflictReason).toContain("agenda exclusiva para serviços Black Friday");
    });
  });

  /* ========================================================================
     5. Home Page Route & Fallback Integration Tests
     ======================================================================== */
  describe("5. Home Page (src/app/page.tsx Integration & Cleanup)", () => {
    const pagePath = resolve(process.cwd(), "src/app/page.tsx");
    const pageCode = readFileSync(pagePath, "utf-8");

    it("verifies leftover route export 'export { buildCompositeService };' is cleanly removed", () => {
      expect(pageCode).not.toContain("export { buildCompositeService };");
      expect(pageCode).toContain('import { buildCompositeService } from "@/lib/services/composite";');
    });

    it("verifies BlackFridayBanner and BlackFridayHero are imported in page.tsx", () => {
      expect(pageCode).toContain('import { BlackFridayBanner } from "@/components/client/BlackFridayBanner";');
      expect(pageCode).toContain('import { BlackFridayHero } from "@/components/client/BlackFridayHero";');
    });

    it("verifies active Black Friday campaign is fetched in loadData()", () => {
      expect(pageCode).toContain("SupabaseDataService.getActiveBlackFridayCampaign");
      expect(pageCode).toContain("setBlackFridayCampaign(bfCampaign);");
    });

    it("verifies conditional rendering of BlackFridayBanner and BlackFridayHero", () => {
      expect(pageCode).toContain("const isBFActive = isCampaignActive(blackFridayCampaign);");
      expect(pageCode).toContain("<BlackFridayBanner");
      expect(pageCode).toContain("<BlackFridayHero");
      expect(pageCode).toContain("<HeroSection");
    });

    it("verifies blackFridayCampaign is passed to TransparentServicesCatalog and SlotPicker", () => {
      expect(pageCode).toContain("blackFridayCampaign={isBFActive ? blackFridayCampaign : null}");
      expect(pageCode).toContain("campaign={isBFActive ? blackFridayCampaign : null}");
    });

    it("verifies pricing utility isCampaignActive accurately computes campaign validity window", () => {
      expect(isCampaignActive(mockActiveCampaign, "2026-11-15T12:00:00Z")).toBe(true);
      expect(isCampaignActive(mockActiveCampaign, "2026-10-31T23:59:59Z")).toBe(false); // Before startsAt
      expect(isCampaignActive(mockActiveCampaign, "2026-12-01T00:00:00Z")).toBe(false); // After endsAt

      const inactiveCampaign = { ...mockActiveCampaign, isActive: false };
      expect(isCampaignActive(inactiveCampaign, "2026-11-15T12:00:00Z")).toBe(false);
    });
  });
});
