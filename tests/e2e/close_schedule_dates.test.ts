import { describe, it, expect, beforeEach } from "vitest";
import { SalonStore } from "@/lib/storage/localStore";
import { SupabaseDataService } from "@/lib/supabase/api";

describe("Fechamento de Datas da Agenda (Single e Batch)", () => {
  const professionalId = "58f26242-1e53-432e-b924-dea25ee2068a";
  const orgId = "11111111-1111-4111-8111-111111111111";

  beforeEach(() => {
    window.localStorage.clear();
  });

  describe("1. SalonStore - Fechamento de Datas", () => {
    it("deve abrir dias e depois fechar um dia individualmente com closeAvailableDay", () => {
      // 1. Abre 3 dias
      SalonStore.saveAvailableDaysBatch([
        { date: "2026-11-20", startTime: "09:00", endTime: "18:00", professionalId, orgId },
        { date: "2026-11-21", startTime: "09:00", endTime: "18:00", professionalId, orgId },
        { date: "2026-11-22", startTime: "09:00", endTime: "18:00", professionalId, orgId },
      ]);

      let days = SalonStore.getAvailableDays(professionalId);
      expect(days.filter((d) => d.isOpen)).toHaveLength(3);

      // 2. Fecha o dia 2026-11-21
      const success = SalonStore.closeAvailableDay(professionalId, "2026-11-21");
      expect(success).toBe(true);

      days = SalonStore.getAvailableDays(professionalId);
      const day21 = days.find((d) => d.date === "2026-11-21");
      expect(day21?.isOpen).toBe(false);

      // Os outros 2 continuam abertos
      const openDays = days.filter((d) => d.isOpen);
      expect(openDays).toHaveLength(2);
      expect(openDays.map((d) => d.date)).toEqual(["2026-11-20", "2026-11-22"]);
    });

    it("deve fechar múltiplos dias em lote com closeAvailableDaysBatch", () => {
      // 1. Abre 5 dias de Terça a Sábado
      const testDates = [
        "2026-11-24",
        "2026-11-25",
        "2026-11-26",
        "2026-11-27",
        "2026-11-28",
      ];
      SalonStore.saveAvailableDaysBatch(
        testDates.map((date) => ({
          date,
          startTime: "09:00",
          endTime: "19:00",
          professionalId,
          orgId,
        }))
      );

      let days = SalonStore.getAvailableDays(professionalId);
      expect(days.filter((d) => d.isOpen)).toHaveLength(5);

      // 2. Fecha 3 dias em lote (25, 26, 27)
      const closedCount = SalonStore.closeAvailableDaysBatch(professionalId, [
        "2026-11-25",
        "2026-11-26",
        "2026-11-27",
      ]);
      expect(closedCount).toBe(3);

      // 3. Verifica estado final
      days = SalonStore.getAvailableDays(professionalId);
      const openDays = days.filter((d) => d.isOpen);
      expect(openDays).toHaveLength(2);
      expect(openDays.map((d) => d.date).sort()).toEqual(["2026-11-24", "2026-11-28"]);

      const closedDays = days.filter((d) => !d.isOpen);
      expect(closedDays.map((d) => d.date).sort()).toEqual([
        "2026-11-25",
        "2026-11-26",
        "2026-11-27",
      ]);
    });

    it("deve permitir reabrir uma data previamente fechada", () => {
      // 1. Abre e fecha o dia
      SalonStore.saveAvailableDay({
        date: "2026-11-30",
        startTime: "09:00",
        endTime: "18:00",
        professionalId,
        orgId,
      });
      SalonStore.closeAvailableDay(professionalId, "2026-11-30");

      let days = SalonStore.getAvailableDays(professionalId);
      expect(days.find((d) => d.date === "2026-11-30")?.isOpen).toBe(false);

      // 2. Reabre o dia com novo horário
      SalonStore.saveAvailableDay({
        date: "2026-11-30",
        startTime: "10:00",
        endTime: "20:00",
        professionalId,
        orgId,
      });

      days = SalonStore.getAvailableDays(professionalId);
      const reopened = days.find((d) => d.date === "2026-11-30");
      expect(reopened?.isOpen).toBe(true);
      expect(reopened?.startTime).toBe("10:00");
      expect(reopened?.endTime).toBe("20:00");
    });
  });

  describe("2. SupabaseDataService - Fechamento de Datas", () => {
    it("deve fechar data individual via SupabaseDataService.closeAvailableDay", async () => {
      await SupabaseDataService.saveAvailableDay({
        date: "2026-12-01",
        startTime: "09:00",
        endTime: "17:00",
        professionalId,
        orgId,
      });

      const success = await SupabaseDataService.closeAvailableDay(professionalId, "2026-12-01");
      expect(success).toBe(true);

      const days = await SupabaseDataService.getAvailableDays(professionalId, "2026-12-01", "2026-12-01");
      const day = days.find((d) => d.date === "2026-12-01");
      expect(day?.isOpen).toBe(false);
    });

    it("deve fechar lote de datas via SupabaseDataService.closeAvailableDaysBatch", async () => {
      const datesToOpen = ["2026-12-02", "2026-12-03", "2026-12-04"];
      await SupabaseDataService.saveAvailableDaysBatch(
        datesToOpen.map((date) => ({
          date,
          startTime: "08:30",
          endTime: "18:30",
          professionalId,
          orgId,
        }))
      );

      const countClosed = await SupabaseDataService.closeAvailableDaysBatch(professionalId, [
        "2026-12-02",
        "2026-12-04",
      ]);
      expect(countClosed).toBe(2);

      const days = await SupabaseDataService.getAvailableDays(professionalId, "2026-12-01", "2026-12-10");
      const day2 = days.find((d) => d.date === "2026-12-02");
      const day3 = days.find((d) => d.date === "2026-12-03");
      const day4 = days.find((d) => d.date === "2026-12-04");

      expect(day2?.isOpen).toBe(false);
      expect(day3?.isOpen).toBe(true);
      expect(day4?.isOpen).toBe(false);
    });

    it("deve lidar de forma segura com arrays vazios no batch", async () => {
      const result = await SupabaseDataService.closeAvailableDaysBatch(professionalId, []);
      expect(result).toBe(0);
    });
  });
});
