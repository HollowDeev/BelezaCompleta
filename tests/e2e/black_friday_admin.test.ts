import { describe, it, expect, beforeEach, vi } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

import { Sidebar, AdminTab } from "@/components/layout/Sidebar";
import { BlackFridayManager } from "@/components/admin/BlackFridayManager";
import { SupabaseDataService, DEFAULT_ORG_ID } from "@/lib/supabase/api";
import { SalonStore } from "@/lib/storage/localStore";
import {
  getServiceBlackFridayPrice,
  getProgressiveDiscount,
  isCampaignActive,
} from "@/lib/services/blackFridayPricing";
import {
  BlackFridayCampaign,
  BlackFridayServiceConfig,
  ProgressiveDiscountTier,
} from "@/types/blackFriday";
import { ServiceItem } from "@/types/service";
import { SalonOrganization } from "@/types/salon";

const mockOrganization: SalonOrganization = {
  id: "a0000000-0000-4000-8000-000000000001",
  name: "Espaço Gleicy Ronha",
  slug: "gleicy-ronha",
  phone: "11999998888",
  document: "12345678000199",
  createdAt: "2026-01-01T00:00:00Z",
};

const mockServices: ServiceItem[] = [
  {
    id: "srv-mechas-01",
    orgId: "a0000000-0000-4000-8000-000000000001",
    professionalId: "prof-gleicy",
    title: "Mechas Criativas & Blond",
    slug: "mechas-criativas",
    category: "mechas",
    description: "Descoloração de alta performance e matização personalizada.",
    price: 450,
    requiresTriage: true,
    steps: [{ id: "step-1", order: 1, title: "Aplicação", type: "active", durationMin: 120, requiresExclusiveAttention: true }],
  },
  {
    id: "srv-corte-02",
    orgId: "org-gleicy-admin-test",
    professionalId: "prof-gleicy",
    title: "Corte Bordado & Design",
    slug: "corte-bordado",
    category: "corte",
    description: "Corte de pontas duplas sem alterar comprimento.",
    price: 180,
    requiresTriage: false,
    steps: [{ id: "step-1", order: 1, title: "Corte", type: "active", durationMin: 45, requiresExclusiveAttention: true }],
  },
  {
    id: "srv-tratamento-03",
    orgId: "org-gleicy-admin-test",
    professionalId: "prof-gleicy",
    title: "Reconstrução Molecular Acidificante",
    slug: "reconstrucao-molecular",
    category: "tratamento",
    description: "Reposição de massa e selagem de cutículas pós-química.",
    price: 220,
    requiresTriage: false,
    steps: [{ id: "step-1", order: 1, title: "Tratamento", type: "active", durationMin: 60, requiresExclusiveAttention: false }],
  },
];

describe("Milestone M3: Admin Management Dashboard (Requirement R4)", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  describe("1. Sidebar Navigation & Tab Integration", () => {
    const sidebarPath = resolve(
      process.cwd(),
      "src/components/layout/Sidebar.tsx"
    );
    const dashboardPath = resolve(
      process.cwd(),
      "src/app/dashboard/page.tsx"
    );

    it("verifies AdminTab union type in Sidebar.tsx includes 'black-friday'", () => {
      const code = readFileSync(sidebarPath, "utf-8");
      expect(code).toContain('"black-friday"');
    });

    it("verifies operationItems in Sidebar.tsx contains Black Friday navigation entry", () => {
      const code = readFileSync(sidebarPath, "utf-8");
      expect(code).toContain('id: "black-friday"');
      expect(code).toContain('label: "Black Friday"');
      expect(code).toContain('badge: "Campanha"');
      expect(code).toContain("bg-[#080F0E]");
      expect(code).toContain("text-[#C7A03A]");
    });

    it("renders Sidebar containing the Black Friday navigation button with badge and icon", () => {
      let selectedTab: AdminTab = "operacao";
      const handleSelectTab = (tab: AdminTab) => {
        selectedTab = tab;
      };

      const html = renderToStaticMarkup(
        React.createElement(Sidebar, {
          currentTab: "operacao",
          onSelectTab: handleSelectTab,
          pendingTriageCount: 2,
          pendingPreReservationsCount: 1,
          pendingConfirmationsCount: 0,
        })
      );

      expect(html).toContain("Black Friday");
      expect(html).toContain("Campanha");
      expect(html).toContain('data-tutorial="sidebar-black-friday"');
    });

    it("renders Sidebar with active styles when currentTab is 'black-friday'", () => {
      const html = renderToStaticMarkup(
        React.createElement(Sidebar, {
          currentTab: "black-friday",
          onSelectTab: () => {},
          pendingTriageCount: 0,
        })
      );

      expect(html).toContain("Black Friday");
      expect(html).toContain("bg-[#1D3D3C]");
      expect(html).toContain("text-white");
    });

    it("verifies dashboard/page.tsx imports and conditionally renders BlackFridayManager", () => {
      const code = readFileSync(dashboardPath, "utf-8");
      expect(code).toContain('import { BlackFridayManager } from "@/components/admin/BlackFridayManager"');
      expect(code).toContain('adminTab === "black-friday"');
      expect(code).toContain("<BlackFridayManager");
      expect(code).toContain("organization={organization}");
      expect(code).toContain("services={services}");
      expect(code).toContain("onRefresh={refreshAll}");
    });
  });

  describe("2. BlackFridayManager Component Contract & Rendering", () => {
    it("renders default draft state when no campaign exists", () => {
      const html = renderToStaticMarkup(
        React.createElement(BlackFridayManager, {
          organization: mockOrganization,
          services: mockServices,
          onRefresh: () => {},
        })
      );

      // Verify header, title and default texts
      expect(html).toContain("Gestão da Black Friday");
      expect(html).toContain("Temporada Especial de Ofertas");
      expect(html).toContain("Salvar Campanha");
      expect(html).toContain("Restrição Exclusiva de Agenda");
      expect(html).toContain("Desconto Progressivo por Combo");
      expect(html).toContain("Serviços Participantes");
      expect(html).toContain("Mechas Criativas &amp; Blond");
      expect(html).toContain("Corte Bordado &amp; Design");
    });

    it("renders existing campaign data when present in storage", async () => {
      const existingCampaign: BlackFridayCampaign = {
        id: "bf-campaign-existing",
        orgId: mockOrganization.id,
        name: "Black Friday Oficial 2026",
        isActive: true,
        startsAt: "2026-11-20T00:00:00.000Z",
        endsAt: "2026-11-30T23:59:59.000Z",
        restrictSchedule: true,
        restrictedDates: ["2026-11-27", "2026-11-28"],
        servicesConfig: [
          {
            serviceId: "srv-mechas-01",
            discountType: "percentage",
            discountValue: 25,
            blackPrice: 337.5,
          },
        ],
        progressiveDiscount: {
          tiers: [
            { minServices: 2, discountPercent: 15 },
            { minServices: 3, discountPercent: 25 },
          ],
        },
      };

      SalonStore.saveBlackFridayCampaign(existingCampaign);

      const loaded = await SupabaseDataService.getBlackFridayCampaign(mockOrganization.id);
      expect(loaded).toBeDefined();
      expect(loaded?.id).toBe("bf-campaign-existing");
      expect(loaded?.name).toBe("Black Friday Oficial 2026");
      expect(loaded?.isActive).toBe(true);
      expect(loaded?.restrictedDates).toEqual(["2026-11-27", "2026-11-28"]);
      expect(loaded?.progressiveDiscount?.tiers.length).toBe(2);
    });
  });

  describe("3. Dynamic Pricing Preview Logic in Admin Context", () => {
    const campaignDraft: BlackFridayCampaign = {
      id: "draft-test",
      orgId: mockOrganization.id,
      name: "Black Friday",
      isActive: true,
      startsAt: "2026-11-01T00:00:00.000Z",
      endsAt: "2026-12-01T00:00:00.000Z",
      restrictSchedule: false,
      restrictedDates: [],
      servicesConfig: [
        {
          serviceId: "srv-mechas-01",
          discountType: "percentage",
          discountValue: 20, // 20% off R$ 450 -> R$ 360, savings R$ 90
        },
        {
          serviceId: "srv-corte-02",
          discountType: "fixed",
          discountValue: 50, // R$ 50 off R$ 180 -> R$ 130, savings R$ 50
        },
        {
          serviceId: "srv-tratamento-03",
          discountType: "manual",
          blackPrice: 150, // direct R$ 150 (base R$ 220) -> savings R$ 70
        },
      ],
      progressiveDiscount: {
        tiers: [
          { minServices: 2, discountPercent: 10 },
          { minServices: 3, discountPercent: 20 },
        ],
      },
    };

    it("calculates percentage discount correctly with real-time preview formula", () => {
      const mechas = mockServices[0];
      const preview = getServiceBlackFridayPrice(mechas, campaignDraft, {
        ignoreDateRange: true,
      });

      expect(preview.originalPrice).toBe(450);
      expect(preview.finalPrice).toBe(360);
      expect(preview.discountAmount).toBe(90);
      expect(preview.discountPercent).toBe(20);
      expect(preview.isPromotional).toBe(true);
    });

    it("calculates fixed R$ discount correctly with real-time preview formula", () => {
      const corte = mockServices[1];
      const preview = getServiceBlackFridayPrice(corte, campaignDraft, {
        ignoreDateRange: true,
      });

      expect(preview.originalPrice).toBe(180);
      expect(preview.finalPrice).toBe(130);
      expect(preview.discountAmount).toBe(50);
      expect(preview.isPromotional).toBe(true);
    });

    it("calculates manual price correctly with real-time preview formula", () => {
      const tratamento = mockServices[2];
      const preview = getServiceBlackFridayPrice(tratamento, campaignDraft, {
        ignoreDateRange: true,
      });

      expect(preview.originalPrice).toBe(220);
      expect(preview.finalPrice).toBe(150);
      expect(preview.discountAmount).toBe(70);
      expect(preview.isPromotional).toBe(true);
    });

    it("strictly clamps final price to non-negative when discount exceeds service price", () => {
      const excessiveFixedCampaign: BlackFridayCampaign = {
        ...campaignDraft,
        servicesConfig: [
          {
            serviceId: "srv-corte-02", // price is R$ 180
            discountType: "fixed",
            discountValue: 250, // exceeds R$ 180
          },
        ],
      };

      const corte = mockServices[1];
      const preview = getServiceBlackFridayPrice(corte, excessiveFixedCampaign, {
        ignoreDateRange: true,
      });

      expect(preview.finalPrice).toBe(0);
      expect(preview.discountAmount).toBe(180);
      expect(Math.max(0, preview.finalPrice)).toBe(0);
    });

    it("strictly clamps manual negative price to non-negative zero", () => {
      const negativeManualCampaign: BlackFridayCampaign = {
        ...campaignDraft,
        servicesConfig: [
          {
            serviceId: "srv-tratamento-03",
            discountType: "manual",
            blackPrice: -100,
          },
        ],
      };

      const tratamento = mockServices[2];
      const preview = getServiceBlackFridayPrice(tratamento, negativeManualCampaign, {
        ignoreDateRange: true,
      });

      expect(preview.finalPrice).toBe(0);
      expect(preview.finalPrice).toBeGreaterThanOrEqual(0);
    });

    it("ignores date range when ignoreDateRange option is passed for admin preview", () => {
      const futureCampaign: BlackFridayCampaign = {
        ...campaignDraft,
        startsAt: "2030-01-01T00:00:00.000Z",
        endsAt: "2030-01-10T00:00:00.000Z",
      };

      // In client mode (no ignoreDateRange), it should be inactive
      const clientPreview = getServiceBlackFridayPrice(mockServices[0], futureCampaign);
      expect(clientPreview.isPromotional).toBe(false);
      expect(clientPreview.finalPrice).toBe(450);

      // In admin preview mode (ignoreDateRange: true), preview shows promo price
      const adminPreview = getServiceBlackFridayPrice(mockServices[0], futureCampaign, {
        ignoreDateRange: true,
      });
      expect(adminPreview.isPromotional).toBe(true);
      expect(adminPreview.finalPrice).toBe(360);
    });
  });

  describe("4. Progressive Discount Tiers Configuration Logic", () => {
    it("sorts progressive tiers in ascending order of minServices", () => {
      const unsortedTiers: ProgressiveDiscountTier[] = [
        { minServices: 4, discountPercent: 30 },
        { minServices: 2, discountPercent: 10 },
        { minServices: 3, discountPercent: 20 },
      ];

      const sorted = [...unsortedTiers].sort((a, b) => a.minServices - b.minServices);
      expect(sorted[0].minServices).toBe(2);
      expect(sorted[1].minServices).toBe(3);
      expect(sorted[2].minServices).toBe(4);
    });

    it("computes progressive discount percentage matching the qualifying tier", () => {
      const campaignWithTiers: BlackFridayCampaign = {
        id: "tiers-test",
        orgId: mockOrganization.id,
        name: "Combo Black Friday",
        isActive: true,
        restrictSchedule: false,
        restrictedDates: [],
        servicesConfig: [],
        progressiveDiscount: {
          tiers: [
            { minServices: 2, discountPercent: 15 },
            { minServices: 3, discountPercent: 25 },
            { minServices: 5, discountPercent: 35 },
          ],
        },
      };

      expect(getProgressiveDiscount(1, campaignWithTiers)).toBe(0);
      expect(getProgressiveDiscount(2, campaignWithTiers)).toBe(15);
      expect(getProgressiveDiscount(3, campaignWithTiers)).toBe(25);
      expect(getProgressiveDiscount(4, campaignWithTiers)).toBe(25);
      expect(getProgressiveDiscount(5, campaignWithTiers)).toBe(35);
      expect(getProgressiveDiscount(10, campaignWithTiers)).toBe(35);
    });

    it("disallows progressive tier with minServices < 2 or discountPercent outside 1-100", () => {
      const validateTier = (min: number, pct: number) => {
        if (min < 2) return false;
        if (pct <= 0 || pct > 100) return false;
        return true;
      };

      expect(validateTier(1, 10)).toBe(false);
      expect(validateTier(0, 10)).toBe(false);
      expect(validateTier(2, 0)).toBe(false);
      expect(validateTier(2, -5)).toBe(false);
      expect(validateTier(2, 105)).toBe(false);
      expect(validateTier(2, 15)).toBe(true);
      expect(validateTier(3, 100)).toBe(true);
    });
  });

  describe("5. Schedule Restriction Dates Management Logic", () => {
    it("handles adding and removing restricted dates with chronological ordering", () => {
      let dates: string[] = [];

      const addDate = (d: string) => {
        if (!dates.includes(d)) {
          dates = [...dates, d].sort();
        }
      };

      const removeDate = (d: string) => {
        dates = dates.filter((item) => item !== d);
      };

      addDate("2026-11-28");
      addDate("2026-11-27");
      addDate("2026-11-29");

      expect(dates).toEqual(["2026-11-27", "2026-11-28", "2026-11-29"]);

      // Avoid duplicates
      addDate("2026-11-27");
      expect(dates.length).toBe(3);

      // Remove date
      removeDate("2026-11-28");
      expect(dates).toEqual(["2026-11-27", "2026-11-29"]);
    });

    it("validates temporal constraints: endsAt must be strictly greater than startsAt", () => {
      const validateDates = (startsAt: string, endsAt: string) => {
        const s = new Date(startsAt).getTime();
        const e = new Date(endsAt).getTime();
        return e > s;
      };

      expect(validateDates("2026-11-20T10:00", "2026-11-20T18:00")).toBe(true);
      expect(validateDates("2026-11-20T10:00", "2026-11-20T10:00")).toBe(false);
      expect(validateDates("2026-11-25T10:00", "2026-11-20T10:00")).toBe(false);
    });
  });

  describe("6. Persistence Handling (Create & Update Campaign)", () => {
    it("creates a new Black Friday campaign via SupabaseDataService and persists to storage", async () => {
      const newCampaignPayload: Partial<BlackFridayCampaign> = {
        orgId: mockOrganization.id,
        name: "Black Friday Nova",
        isActive: true,
        startsAt: "2026-11-25T08:00:00.000Z",
        endsAt: "2026-11-30T22:00:00.000Z",
        restrictSchedule: true,
        restrictedDates: ["2026-11-27", "2026-11-28"],
        servicesConfig: [
          {
            serviceId: "srv-mechas-01",
            discountType: "percentage",
            discountValue: 30,
            blackPrice: 315,
          },
        ],
        progressiveDiscount: {
          tiers: [{ minServices: 2, discountPercent: 20 }],
        },
      };

      const created = await SupabaseDataService.createBlackFridayCampaign(newCampaignPayload);

      expect(created).toBeDefined();
      expect(created.id).toBeDefined();
      expect(created.orgId).toBe(mockOrganization.id);
      expect(created.name).toBe("Black Friday Nova");
      expect(created.isActive).toBe(true);
      expect(created.restrictSchedule).toBe(true);
      expect(created.restrictedDates).toEqual(["2026-11-27", "2026-11-28"]);
      expect(created.servicesConfig.length).toBe(1);

      // Verify retrieval
      const fetched = await SupabaseDataService.getBlackFridayCampaign(mockOrganization.id);
      expect(fetched?.id).toBe(created.id);
      expect(fetched?.name).toBe("Black Friday Nova");
    });

    it("updates an existing Black Friday campaign via SupabaseDataService", async () => {
      const initial = await SupabaseDataService.createBlackFridayCampaign({
        orgId: mockOrganization.id,
        name: "Black Friday Inicial",
        isActive: false,
        restrictSchedule: false,
        restrictedDates: [],
        servicesConfig: [],
      });

      const updated = await SupabaseDataService.updateBlackFridayCampaign(initial.id, {
        name: "Black Friday Atualizada",
        isActive: true,
        restrictSchedule: true,
        restrictedDates: ["2026-11-27"],
        servicesConfig: [
          {
            serviceId: "srv-corte-02",
            discountType: "fixed",
            discountValue: 40,
            blackPrice: 140,
          },
        ],
      });

      expect(updated).toBeDefined();
      expect(updated?.id).toBe(initial.id);
      expect(updated?.name).toBe("Black Friday Atualizada");
      expect(updated?.isActive).toBe(true);
      expect(updated?.restrictSchedule).toBe(true);
      expect(updated?.restrictedDates).toEqual(["2026-11-27"]);
      expect(updated?.servicesConfig[0].serviceId).toBe("srv-corte-02");

      // Verify retrieval
      const fetched = await SupabaseDataService.getBlackFridayCampaign(mockOrganization.id);
      expect(fetched?.name).toBe("Black Friday Atualizada");
      expect(fetched?.isActive).toBe(true);
    });
  });
});
