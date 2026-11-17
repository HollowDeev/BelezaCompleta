import { describe, it, expect, beforeEach } from "vitest";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import { SalonStore } from "@/lib/storage/localStore";
import { SupabaseDataService, DEFAULT_ORG_ID } from "@/lib/supabase/api";
import { subscribeToSync } from "@/lib/sync/syncBus";
import {
  BlackFridayCampaign,
  BlackFridayDiscountType,
  BlackFridayServiceConfig,
  ProgressiveDiscountConfig,
} from "@/types";

describe("Milestone M1: Black Friday Data Layer & Types", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  // 1. SQL Migration Schema Verification
  describe("1. SQL Migration Integrity", () => {
    const migrationPath = resolve(
      process.cwd(),
      "scripts/migrations/20261117_black_friday_campaigns.sql"
    );

    it("migration file should exist in scripts/migrations/", () => {
      expect(existsSync(migrationPath)).toBe(true);
    });

    it("migration should contain all required DDL clauses, indexes, RLS and realtime", () => {
      const sql = readFileSync(migrationPath, "utf-8");

      // Table & Columns
      expect(sql).toContain("CREATE TABLE IF NOT EXISTS public.black_friday_campaigns");
      expect(sql).toContain("id UUID PRIMARY KEY DEFAULT uuid_generate_v4()");
      expect(sql).toContain("org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE");
      expect(sql).toContain("name VARCHAR(255) NOT NULL DEFAULT 'Black Friday'");
      expect(sql).toContain("is_active BOOLEAN NOT NULL DEFAULT false");
      expect(sql).toContain("starts_at TIMESTAMP WITH TIME ZONE");
      expect(sql).toContain("ends_at TIMESTAMP WITH TIME ZONE");
      expect(sql).toContain("restrict_schedule BOOLEAN NOT NULL DEFAULT false");
      expect(sql).toContain("restricted_dates JSONB NOT NULL DEFAULT '[]'::jsonb");
      expect(sql).toContain("services_config JSONB NOT NULL DEFAULT '[]'::jsonb");
      expect(sql).toContain("progressive_discount JSONB DEFAULT NULL");
      expect(sql).toContain("created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()");
      expect(sql).toContain("updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()");

      // Indexes
      expect(sql).toContain("idx_black_friday_campaigns_org");
      expect(sql).toContain("idx_black_friday_campaigns_active");

      // RLS Policies
      expect(sql).toContain("ENABLE ROW LEVEL SECURITY");
      expect(sql).toContain("Public Read Black Friday Campaigns");
      expect(sql).toContain("Staff Manage Black Friday Campaigns");

      // Realtime
      expect(sql).toContain("supabase_realtime");
      expect(sql).toContain("REPLICA IDENTITY FULL");
    });
  });

  // 2. TypeScript Types Barrel Export
  describe("2. TypeScript Types", () => {
    it("should correctly instantiate campaign with all discount types", () => {
      const discountTypes: BlackFridayDiscountType[] = ["fixed", "percentage", "manual", "progressive"];
      expect(discountTypes).toHaveLength(4);

      const servicesConfig: BlackFridayServiceConfig[] = [
        { serviceId: "srv-1", discountType: "fixed", discountValue: 50 },
        { serviceId: "srv-2", discountType: "percentage", discountValue: 20 },
        { serviceId: "srv-3", discountType: "manual", blackPrice: 180 },
        { serviceId: "srv-4", discountType: "progressive" },
      ];

      const progressiveDiscount: ProgressiveDiscountConfig = {
        tiers: [
          { minServices: 2, discountPercent: 15 },
          { minServices: 3, discountPercent: 25 },
        ],
      };

      const campaign: BlackFridayCampaign = {
        id: "bf-campaign-01",
        orgId: DEFAULT_ORG_ID,
        name: "Black Friday 2026",
        isActive: true,
        startsAt: "2026-11-20T00:00:00Z",
        endsAt: "2026-11-30T23:59:59Z",
        restrictSchedule: true,
        restrictedDates: ["2026-11-27", "2026-11-28"],
        servicesConfig,
        progressiveDiscount,
      };

      expect(campaign.name).toBe("Black Friday 2026");
      expect(campaign.servicesConfig).toHaveLength(4);
      expect(campaign.progressiveDiscount?.tiers).toHaveLength(2);
      expect(campaign.restrictedDates).toContain("2026-11-27");
    });
  });

  // 3. SalonStore Offline LocalStore Fallback
  describe("3. SalonStore Local Storage Implementation", () => {
    it("should save and retrieve campaign correctly", () => {
      const campaign: BlackFridayCampaign = {
        id: "bf-local-1",
        orgId: DEFAULT_ORG_ID,
        name: "Campanha Local",
        isActive: true,
        restrictSchedule: false,
        restrictedDates: [],
        servicesConfig: [
          { serviceId: "srv-1", discountType: "percentage", discountValue: 30 },
        ],
      };

      const saved = SalonStore.saveBlackFridayCampaign(campaign);
      expect(saved.id).toBe("bf-local-1");
      expect(saved.createdAt).toBeDefined();
      expect(saved.updatedAt).toBeDefined();

      const active = SalonStore.getActiveBlackFridayCampaign(DEFAULT_ORG_ID);
      expect(active).not.toBeNull();
      expect(active?.id).toBe("bf-local-1");
      expect(active?.name).toBe("Campanha Local");
    });

    it("should return null when no campaign is active", () => {
      const campaign: BlackFridayCampaign = {
        id: "bf-inactive",
        orgId: DEFAULT_ORG_ID,
        name: "Campanha Pausada",
        isActive: false,
        restrictSchedule: false,
        restrictedDates: [],
        servicesConfig: [],
      };

      SalonStore.saveBlackFridayCampaign(campaign);

      const active = SalonStore.getActiveBlackFridayCampaign(DEFAULT_ORG_ID);
      expect(active).toBeNull();

      const retrieved = SalonStore.getBlackFridayCampaign(DEFAULT_ORG_ID);
      expect(retrieved).not.toBeNull();
      expect(retrieved?.id).toBe("bf-inactive");
    });

    it("should deactivate older campaigns when a new active campaign is saved", () => {
      const camp1: BlackFridayCampaign = {
        id: "bf-1",
        orgId: DEFAULT_ORG_ID,
        name: "Campanha Antiga",
        isActive: true,
        restrictSchedule: false,
        restrictedDates: [],
        servicesConfig: [],
      };
      SalonStore.saveBlackFridayCampaign(camp1);

      const camp2: BlackFridayCampaign = {
        id: "bf-2",
        orgId: DEFAULT_ORG_ID,
        name: "Campanha Nova",
        isActive: true,
        restrictSchedule: false,
        restrictedDates: [],
        servicesConfig: [],
      };
      SalonStore.saveBlackFridayCampaign(camp2);

      const active = SalonStore.getActiveBlackFridayCampaign(DEFAULT_ORG_ID);
      expect(active?.id).toBe("bf-2");

      const all = SalonStore.getBlackFridayCampaigns();
      const oldCamp = all.find((c) => c.id === "bf-1");
      expect(oldCamp?.isActive).toBe(false);
    });

    it("should update existing campaign via updateBlackFridayCampaign", () => {
      const camp: BlackFridayCampaign = {
        id: "bf-update-test",
        orgId: DEFAULT_ORG_ID,
        name: "Campanha Inicial",
        isActive: false,
        restrictSchedule: false,
        restrictedDates: [],
        servicesConfig: [],
      };
      SalonStore.saveBlackFridayCampaign(camp);

      const updated = SalonStore.updateBlackFridayCampaign("bf-update-test", {
        name: "Campanha Atualizada",
        isActive: true,
        restrictSchedule: true,
        restrictedDates: ["2026-11-27"],
      });

      expect(updated).not.toBeNull();
      expect(updated?.name).toBe("Campanha Atualizada");
      expect(updated?.isActive).toBe(true);
      expect(updated?.restrictSchedule).toBe(true);
      expect(updated?.restrictedDates).toEqual(["2026-11-27"]);
    });

    it("should clear black_friday_campaigns on resetToDefaults", () => {
      SalonStore.saveBlackFridayCampaign({
        id: "bf-to-clear",
        orgId: DEFAULT_ORG_ID,
        name: "Campanha Temporária",
        isActive: true,
        restrictSchedule: false,
        restrictedDates: [],
        servicesConfig: [],
      });

      expect(SalonStore.getBlackFridayCampaigns()).toHaveLength(1);
      SalonStore.resetToDefaults();
      expect(SalonStore.getBlackFridayCampaigns()).toHaveLength(0);
    });
  });

  // 4. SupabaseDataService API Layer
  describe("4. SupabaseDataService API Methods", () => {
    it("should create campaign, assign UUID, and emit sync event", async () => {
      let syncReceived: { type: string; id?: string } | null = null;
      const unsubscribe = subscribeToSync((payload) => {
        syncReceived = payload;
      });

      const campaign = await SupabaseDataService.createBlackFridayCampaign({
        orgId: "org-gleicy-ronha", // mock alias
        name: "Black Friday Promocional",
        isActive: true,
        servicesConfig: [
          { serviceId: "srv-cortar", discountType: "fixed", discountValue: 40 },
        ],
      });

      expect(campaign.id).toBeDefined();
      expect(campaign.orgId).toBe(DEFAULT_ORG_ID); // alias resolved
      expect(campaign.isActive).toBe(true);
      expect(campaign.servicesConfig).toHaveLength(1);

      // Verify sync bus event was triggered
      expect(syncReceived).not.toBeNull();
      expect(syncReceived?.type).toBe("black_friday_campaign_saved");
      expect(syncReceived?.id).toBe(campaign.id);

      unsubscribe();
    });

    it("should retrieve active campaign via getActiveBlackFridayCampaign", async () => {
      await SupabaseDataService.createBlackFridayCampaign({
        orgId: DEFAULT_ORG_ID,
        name: "Campanha Ativa",
        isActive: true,
        restrictSchedule: true,
        restrictedDates: ["2026-11-28"],
        servicesConfig: [
          { serviceId: "srv-luzes", discountType: "manual", blackPrice: 200 },
        ],
      });

      const active = await SupabaseDataService.getActiveBlackFridayCampaign(DEFAULT_ORG_ID);
      expect(active).not.toBeNull();
      expect(active?.name).toBe("Campanha Ativa");
      expect(active?.restrictSchedule).toBe(true);
      expect(active?.restrictedDates).toEqual(["2026-11-28"]);
    });

    it("should update campaign via updateBlackFridayCampaign and emit sync event", async () => {
      const created = await SupabaseDataService.createBlackFridayCampaign({
        orgId: DEFAULT_ORG_ID,
        name: "Campanha Pré-Edição",
        isActive: false,
      });

      let syncReceived: { type: string; id?: string } | null = null;
      const unsubscribe = subscribeToSync((payload) => {
        syncReceived = payload;
      });

      const updated = await SupabaseDataService.updateBlackFridayCampaign(created.id, {
        name: "Campanha Pós-Edição",
        isActive: true,
        progressiveDiscount: {
          tiers: [
            { minServices: 2, discountPercent: 20 },
            { minServices: 4, discountPercent: 35 },
          ],
        },
      });

      expect(updated).not.toBeNull();
      expect(updated?.name).toBe("Campanha Pós-Edição");
      expect(updated?.isActive).toBe(true);
      expect(updated?.progressiveDiscount?.tiers).toHaveLength(2);

      expect(syncReceived).not.toBeNull();
      expect(syncReceived?.type).toBe("black_friday_campaign_saved");
      expect(syncReceived?.id).toBe(created.id);

      unsubscribe();
    });

    it("should expose instance delegation methods", () => {
      const serviceInstance = new SupabaseDataService();
      expect(typeof serviceInstance.getActiveBlackFridayCampaign).toBe("function");
      expect(typeof serviceInstance.getBlackFridayCampaign).toBe("function");
      expect(typeof serviceInstance.createBlackFridayCampaign).toBe("function");
      expect(typeof serviceInstance.updateBlackFridayCampaign).toBe("function");
    });
  });
});
