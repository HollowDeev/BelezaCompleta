import { describe, it, expect, beforeEach } from "vitest";
import { SalonStore } from "@/lib/storage/localStore";
import { SupabaseDataService } from "@/lib/supabase/api";
import {
  calculateProceduresBill,
  calculateProceduresDuration,
} from "@/lib/appointments/billing";
import {
  Appointment,
  AppointmentProcedureItem,
  ScheduledStepBlock,
} from "@/types/appointment";
import { LuxuryProposal } from "@/types/proposal";
import { mockMultiProcedureAppointment } from "../fixtures/appointments.fixture";
import { mockManualProposal } from "../fixtures/proposals.fixture";

describe("Adversarial Challenger M4: Multi-Procedure Billing, Step Alignment & Concurrency Stress", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  // =========================================================================
  // 1. MULTI-PROCEDURE BILLING LOGIC ADVERSARIAL STRESS TESTS
  // =========================================================================

  describe("Billing & Duration Calculation Rigor", () => {
    it("CH-M4-01: Handles empty array, null, undefined and corrupted input without throwing", () => {
      expect(calculateProceduresBill([])).toBe(0);
      expect(calculateProceduresDuration([])).toBe(0);

      expect(calculateProceduresBill(null as any)).toBe(0);
      expect(calculateProceduresDuration(null as any)).toBe(0);

      expect(calculateProceduresBill(undefined as any)).toBe(0);
      expect(calculateProceduresDuration(undefined as any)).toBe(0);

      expect(calculateProceduresBill("not-an-array" as any)).toBe(0);
      expect(calculateProceduresDuration({} as any)).toBe(0);
    });

    it("CH-M4-02: Returns exactly 0 price but retains full duration when all procedures are included", () => {
      const allIncluded: AppointmentProcedureItem[] = [
        { title: "Diagnóstico Capilar", durationMin: 20, price: 90, isIncluded: true },
        { title: "Detox do Couro Cabeludo", durationMin: 35, price: 160, isIncluded: true },
        { title: "Corte das Pontas Cortesia", durationMin: 25, price: 110, isIncluded: true },
        { title: "Secagem e Finalização", durationMin: 30, price: 80, isIncluded: true },
      ];

      expect(calculateProceduresBill(allIncluded)).toBe(0);
      expect(calculateProceduresDuration(allIncluded)).toBe(110); // 20 + 35 + 25 + 30
    });

    it("CH-M4-03: Correctly computes mixed charged and included items with exact precision", () => {
      const mixedItems: AppointmentProcedureItem[] = [
        { title: "Mechas Globais", durationMin: 150, price: 650, isIncluded: false },
        { title: "Tonalização Personalizada", durationMin: 30, price: 180, isIncluded: true }, // Cortesia
        { title: "Tratamento Reconstrutor Kérastase", durationMin: 45, price: 280, isIncluded: false },
        { title: "Escova Modelada", durationMin: 40, price: 90, isIncluded: true }, // Cortesia
        { title: "Home Care Starter Kit", durationMin: 0, price: 150, isIncluded: false },
      ];

      // Charged: 650 + 0 + 280 + 0 + 150 = 1080
      expect(calculateProceduresBill(mixedItems)).toBe(1080);
      // Duration: 150 + 30 + 45 + 40 + 0 = 265 min
      expect(calculateProceduresDuration(mixedItems)).toBe(265);
    });

    it("CH-M4-04: High-volume stress harness with 15 procedures with diverse durations and prices", () => {
      const items: AppointmentProcedureItem[] = Array.from({ length: 15 }, (_, i) => ({
        id: `proc-stress-${i}`,
        title: `Procedimento Especializado #${i + 1}`,
        durationMin: 15 * ((i % 4) + 1), // 15, 30, 45, 60
        price: 50 * (i + 1), // 50, 100, 150...
        isIncluded: i % 3 === 0, // 0, 3, 6, 9, 12 are included
      }));

      // Calculate manual oracles
      let expectedBill = 0;
      let expectedDuration = 0;
      for (let i = 0; i < items.length; i++) {
        expectedDuration += items[i].durationMin;
        if (!items[i].isIncluded) {
          expectedBill += items[i].price;
        }
      }

      expect(calculateProceduresBill(items)).toBe(expectedBill);
      expect(calculateProceduresDuration(items)).toBe(expectedDuration);
      expect(calculateProceduresBill(items)).toBeGreaterThan(0);
      expect(calculateProceduresDuration(items)).toBeGreaterThan(300);
    });

    it("CH-M4-05: Price override accommodates both commercial discounts and extra complexity surcharges", () => {
      const procedures: AppointmentProcedureItem[] = [
        { title: "Transformação Total", durationMin: 180, price: 600, isIncluded: false },
        { title: "Matização", durationMin: 30, price: 150, isIncluded: false },
        { title: "Tratamento Intensivo", durationMin: 30, price: 100, isIncluded: false },
      ];

      const baseBill = calculateProceduresBill(procedures);
      expect(baseBill).toBe(850);

      // Scenario A: Commercial discount to R$ 700
      const discountedApt: Appointment = {
        ...mockMultiProcedureAppointment,
        id: "apt-override-discount",
        procedures,
        price: 700,
        finalPrice: 700,
      };
      SalonStore.saveAppointment(discountedApt);

      const savedDiscount = SalonStore.getAppointments().find((a) => a.id === "apt-override-discount");
      expect(savedDiscount?.price).toBe(700);
      expect(savedDiscount?.finalPrice).toBe(700);

      // Scenario B: Extra fee surcharge to R$ 980 (e.g. extra density/extra product)
      const surchargedApt: Appointment = {
        ...mockMultiProcedureAppointment,
        id: "apt-override-surcharge",
        procedures,
        price: 980,
        finalPrice: 980,
      };
      SalonStore.saveAppointment(surchargedApt);

      const savedSurcharge = SalonStore.getAppointments().find((a) => a.id === "apt-override-surcharge");
      expect(savedSurcharge?.price).toBe(980);
      expect(savedSurcharge?.finalPrice).toBe(980);
    });

    it("CH-M4-06: Defensively handles negative prices and non-numeric durations", () => {
      const defensiveItems: AppointmentProcedureItem[] = [
        { title: "Corte Principal", durationMin: 60, price: 200, isIncluded: false },
        { title: "Preço Negativo Inválido", durationMin: 30, price: -100, isIncluded: false },
        { title: "Duração em String", durationMin: "45" as any, price: 150, isIncluded: false },
        { title: "Item Sem Preço", durationMin: 20, price: undefined as any, isIncluded: false },
      ];

      // Bill: 200 + 0 (clamped) + 150 + 0 = 350
      expect(calculateProceduresBill(defensiveItems)).toBe(350);
      // Duration: 60 + 30 + 45 + 20 = 155
      expect(calculateProceduresDuration(defensiveItems)).toBe(155);
    });
  });

  // =========================================================================
  // 2. STEP BLOCKS SEQUENTIAL ALIGNMENT & CONTINUITY STRESS TESTS
  // =========================================================================

  describe("Step Blocks Sequential Continuity & Non-Overlap Oracle", () => {
    // Helper function that mirrors NewAppointmentModal sequential step block generation
    function buildSequentialBlocks(
      startTime: string,
      procedures: AppointmentProcedureItem[],
      serviceCatalog: Array<{ id: string; title: string; steps?: Array<{ id: string; title: string; durationMin: number; type: "active" | "pause" }> }>
    ): { blocks: ScheduledStepBlock[]; totalDuration: number; endTime: string } {
      const [h, m] = startTime.split(":").map(Number);
      const startMinutes = (h || 9) * 60 + (m || 0);

      let cursor = startMinutes;
      const blocks: ScheduledStepBlock[] = [];

      procedures.forEach((proc, pIdx) => {
        const matching = serviceCatalog.find(
          (s) => s.id === proc.serviceId || s.title.toLowerCase() === proc.title.toLowerCase()
        );
        if (matching && matching.steps && matching.steps.length > 0) {
          matching.steps.forEach((st, sIdx) => {
            const stepStart = cursor;
            const stepEnd = cursor + st.durationMin;
            cursor = stepEnd;
            blocks.push({
              id: `blk-${pIdx}-${sIdx}`,
              stepId: st.id,
              stepTitle: `${proc.title}: ${st.title}`,
              type: st.type,
              startTime: `${String(Math.floor(stepStart / 60)).padStart(2, "0")}:${String(stepStart % 60).padStart(2, "0")}`,
              endTime: `${String(Math.floor(stepEnd / 60)).padStart(2, "0")}:${String(stepEnd % 60).padStart(2, "0")}`,
              durationMin: st.durationMin,
              isParallelSlotAllowed: st.type === "pause",
            });
          });
        } else {
          const stepStart = cursor;
          const dur = proc.durationMin || 30;
          const stepEnd = cursor + dur;
          cursor = stepEnd;
          blocks.push({
            id: `blk-${pIdx}`,
            stepId: proc.id || `step-${pIdx}`,
            stepTitle: proc.title,
            type: "active",
            startTime: `${String(Math.floor(stepStart / 60)).padStart(2, "0")}:${String(stepStart % 60).padStart(2, "0")}`,
            endTime: `${String(Math.floor(stepEnd / 60)).padStart(2, "0")}:${String(stepEnd % 60).padStart(2, "0")}`,
            durationMin: dur,
            isParallelSlotAllowed: false,
          });
        }
      });

      const totalDuration = cursor - startMinutes;
      const endH = Math.floor(cursor / 60) % 24;
      const endM = cursor % 60;
      const endTime = `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;

      return { blocks, totalDuration, endTime };
    }

    function parseHHmm(hhmm: string): number {
      const [h, m] = hhmm.split(":").map(Number);
      return h * 60 + m;
    }

    it("CH-M4-07: Produces contiguous non-overlapping step blocks for multi-procedure appointments", () => {
      const procedures: AppointmentProcedureItem[] = [
        { id: "p1", title: "Corte em Camadas", durationMin: 45, price: 150, isIncluded: false },
        { id: "p2", title: "Nutrição Lipídica", durationMin: 30, price: 120, isIncluded: false },
        { id: "p3", title: "Secagem e Modelagem", durationMin: 40, price: 80, isIncluded: true },
      ];

      const { blocks, totalDuration, endTime } = buildSequentialBlocks("09:15", procedures, []);

      expect(blocks).toHaveLength(3);
      expect(totalDuration).toBe(115); // 45 + 30 + 40 = 115
      expect(endTime).toBe("11:10"); // 09:15 + 1h55m = 11:10

      // Verify strict sequential alignment and continuity
      expect(blocks[0].startTime).toBe("09:15");
      expect(blocks[0].endTime).toBe("10:00");

      expect(blocks[1].startTime).toBe("10:00");
      expect(blocks[1].endTime).toBe("10:30");

      expect(blocks[2].startTime).toBe("10:30");
      expect(blocks[2].endTime).toBe("11:10");

      // Adversarial check: for all step blocks, block[i].startTime == block[i-1].endTime
      for (let i = 1; i < blocks.length; i++) {
        expect(parseHHmm(blocks[i].startTime)).toBe(parseHHmm(blocks[i - 1].endTime));
        expect(parseHHmm(blocks[i].endTime)).toBeGreaterThan(parseHHmm(blocks[i].startTime));
      }
    });

    it("CH-M4-08: Sequences nested multi-step procedures with pause steps without gaps or overlaps", () => {
      const mockCatalog = [
        {
          id: "srv-mechas-complex",
          title: "Mechas e Reconstrução",
          steps: [
            { id: "st-1", title: "Aplicação do Descolorante", durationMin: 60, type: "active" as const },
            { id: "st-2", title: "Tempo de Ação / Pausa Química", durationMin: 45, type: "pause" as const },
            { id: "st-3", title: "Enxágue e Matização", durationMin: 35, type: "active" as const },
          ],
        },
      ];

      const procedures: AppointmentProcedureItem[] = [
        { serviceId: "srv-mechas-complex", title: "Mechas e Reconstrução", durationMin: 140, price: 550, isIncluded: false },
        { title: "Finalização Personalizada", durationMin: 25, price: 0, isIncluded: true },
      ];

      const { blocks, totalDuration } = buildSequentialBlocks("13:30", procedures, mockCatalog);

      expect(blocks).toHaveLength(4); // 3 steps from mechas + 1 standalone
      expect(totalDuration).toBe(165); // 60 + 45 + 35 + 25 = 165 min (2h45)

      // Step 1: 13:30 - 14:30
      expect(blocks[0].startTime).toBe("13:30");
      expect(blocks[0].endTime).toBe("14:30");
      expect(blocks[0].type).toBe("active");

      // Step 2 (pause): 14:30 - 15:15
      expect(blocks[1].startTime).toBe("14:30");
      expect(blocks[1].endTime).toBe("15:15");
      expect(blocks[1].type).toBe("pause");
      expect(blocks[1].isParallelSlotAllowed).toBe(true);

      // Step 3: 15:15 - 15:50
      expect(blocks[2].startTime).toBe("15:15");
      expect(blocks[2].endTime).toBe("15:50");
      expect(blocks[2].type).toBe("active");

      // Step 4: 15:50 - 16:15
      expect(blocks[3].startTime).toBe("15:50");
      expect(blocks[3].endTime).toBe("16:15");

      // Overlap verification: ensure strictly monotonically increasing time points
      for (let i = 0; i < blocks.length - 1; i++) {
        expect(parseHHmm(blocks[i].endTime)).toBe(parseHHmm(blocks[i + 1].startTime));
      }
    });

    it("CH-M4-09: Stress-tests 10 sequential procedures across afternoon hours", () => {
      const procedures: AppointmentProcedureItem[] = Array.from({ length: 10 }, (_, i) => ({
        id: `step-p-${i}`,
        title: `Etapa Clínica #${i + 1}`,
        durationMin: 20,
        price: 50,
        isIncluded: false,
      }));

      const { blocks, totalDuration, endTime } = buildSequentialBlocks("10:00", procedures, []);

      expect(blocks).toHaveLength(10);
      expect(totalDuration).toBe(200); // 10 * 20 = 200 min (3h20)
      expect(endTime).toBe("13:20");

      for (let i = 0; i < blocks.length; i++) {
        const expectedStartMin = 600 + i * 20;
        const expectedEndMin = expectedStartMin + 20;
        expect(parseHHmm(blocks[i].startTime)).toBe(expectedStartMin);
        expect(parseHHmm(blocks[i].endTime)).toBe(expectedEndMin);
      }
    });
  });

  // =========================================================================
  // 3. CONCURRENCY, STORAGE & DATA INTEGRITY TESTS
  // =========================================================================

  describe("Storage Persistence & Concurrency Stress", () => {
    it("CH-M4-10: Preserves complete procedures array metadata upon storage and retrieval", () => {
      const detailedApt: Appointment = {
        ...mockMultiProcedureAppointment,
        id: "apt-detailed-meta-01",
        procedures: [
          {
            id: "proc-sub-1",
            serviceId: "srv-001",
            title: "Tratamento de Alta Porosidade",
            durationMin: 45,
            price: 220,
            isIncluded: false,
          },
          {
            id: "proc-sub-2",
            serviceId: "srv-002",
            title: "Cauterização Molecular",
            durationMin: 35,
            price: 180,
            isIncluded: true,
          },
        ],
      };

      SalonStore.saveAppointment(detailedApt);

      const retrieved = SalonStore.getAppointments().find((a) => a.id === "apt-detailed-meta-01");
      expect(retrieved).toBeDefined();
      expect(retrieved?.procedures).toHaveLength(2);

      const p1 = retrieved?.procedures?.[0];
      expect(p1?.id).toBe("proc-sub-1");
      expect(p1?.serviceId).toBe("srv-001");
      expect(p1?.title).toBe("Tratamento de Alta Porosidade");
      expect(p1?.durationMin).toBe(45);
      expect(p1?.price).toBe(220);
      expect(p1?.isIncluded).toBe(false);

      const p2 = retrieved?.procedures?.[1];
      expect(p2?.id).toBe("proc-sub-2");
      expect(p2?.serviceId).toBe("srv-002");
      expect(p2?.title).toBe("Cauterização Molecular");
      expect(p2?.durationMin).toBe(35);
      expect(p2?.price).toBe(180);
      expect(p2?.isIncluded).toBe(true);
    });

    it("CH-M4-11: Handles 15 concurrent appointment writes without JSON corruption or lost procedures", async () => {
      const writePromises = Array.from({ length: 15 }, async (_, i) => {
        const apt: Appointment = {
          ...mockMultiProcedureAppointment,
          id: `apt-concurrent-${i}`,
          clientName: `Cliente Concorrente ${i}`,
          clientPhone: `119999900${String(i).padStart(2, "0")}`,
          procedures: [
            { title: `Procedimento A-${i}`, durationMin: 30, price: 100 + i, isIncluded: false },
            { title: `Procedimento B-${i}`, durationMin: 15, price: 50 + i, isIncluded: true },
          ],
        };
        await SupabaseDataService.saveAppointment(apt);
        return apt.id;
      });

      const savedIds = await Promise.all(writePromises);
      expect(savedIds).toHaveLength(15);

      const allApts = SalonStore.getAppointments();
      for (const id of savedIds) {
        const found = allApts.find((a) => a.id === id);
        expect(found).toBeDefined();
        expect(found?.procedures).toHaveLength(2);
        expect(found?.procedures?.[0].title).toContain("Procedimento A-");
        expect(found?.procedures?.[1].isIncluded).toBe(true);
      }
    });

    it("CH-M4-12: Isolates phone searches strictly and prevents cross-client contamination across DDDs", async () => {
      const aptSP: Appointment = {
        ...mockMultiProcedureAppointment,
        id: "apt-phone-sp",
        clientName: "Cliente São Paulo",
        clientPhone: "11988880001",
      };
      const aptRJ: Appointment = {
        ...mockMultiProcedureAppointment,
        id: "apt-phone-rj",
        clientName: "Cliente Rio de Janeiro",
        clientPhone: "21988880001", // Mesmos dígitos, mas DDD 21 diferente de 11
      };
      const aptOther: Appointment = {
        ...mockMultiProcedureAppointment,
        id: "apt-phone-other",
        clientName: "Outra Cliente",
        clientPhone: "11977770002",
      };

      SalonStore.saveAppointment(aptSP);
      SalonStore.saveAppointment(aptRJ);
      SalonStore.saveAppointment(aptOther);

      // Search for SP client with various formats
      const resSP = await SupabaseDataService.getAppointmentsByClientPhone("(11) 98888-0001");
      expect(resSP.some((a) => a.id === "apt-phone-sp")).toBe(true);
      // RJ appointment must NOT appear in SP phone lookup
      expect(resSP.some((a) => a.id === "apt-phone-rj")).toBe(false);

      // Search for RJ client
      const resRJ = await SupabaseDataService.getAppointmentsByClientPhone("+55 21 98888-0001");
      expect(resRJ.some((a) => a.id === "apt-phone-rj")).toBe(true);
      expect(resRJ.some((a) => a.id === "apt-phone-sp")).toBe(false);
    });

    it("CH-M4-13: Ensures concurrent recordProposalFirstView calls are strictly idempotent", async () => {
      const proposalToTrack: LuxuryProposal = {
        ...mockManualProposal,
        id: "prop-race-first-view",
        clientPhone: "11944443333",
        firstViewedAt: undefined,
        first_viewed_at: undefined,
      };
      SalonStore.saveProposal(proposalToTrack);

      // Fire 10 concurrent requests to record first view
      const results = await Promise.all(
        Array.from({ length: 10 }, () =>
          SupabaseDataService.recordProposalFirstView("prop-race-first-view")
        )
      );

      const firstResultTimestamp = results[0]?.firstViewedAt;
      expect(firstResultTimestamp).toBeDefined();

      // All returned results should share the exact same initial timestamp
      for (const res of results) {
        expect(res?.firstViewedAt).toBe(firstResultTimestamp);
      }

      // Verify stored record
      const finalProp = SalonStore.getProposalById("prop-race-first-view");
      expect(finalProp?.firstViewedAt).toBe(firstResultTimestamp);
    });

    it("CH-M4-14: Standalone proposal creation and client portal retrieval without triage requirement", async () => {
      const directManualProposal: LuxuryProposal = {
        ...mockManualProposal,
        id: "prop-standalone-pure",
        triageSubmissionId: undefined,
        clientName: "Patrícia Abravanel",
        clientPhone: "11912345678",
        status: "sent",
        items: [
          {
            id: "prop-item-corte",
            serviceTitle: "Corte Geométrico Exclusivo",
            durationMin: 75,
            originalPrice: 250,
          },
          {
            id: "prop-item-terapia",
            serviceTitle: "Terapia Capilar com Ozônio",
            durationMin: 45,
            originalPrice: 180,
          },
        ],
        totalOriginal: 430,
        totalWithDiscount: 390,
        pixDiscountPercent: 5,
        pixTotal: 370.5,
      };

      await SupabaseDataService.saveProposal(directManualProposal);

      // Verify portal retrieval by phone
      const portalResults = await SupabaseDataService.getProposalsByClientPhone("11 91234-5678");
      expect(portalResults).toHaveLength(1);
      expect(portalResults[0].id).toBe("prop-standalone-pure");
      expect(portalResults[0].items).toHaveLength(2);
      expect(portalResults[0].totalWithDiscount).toBe(390);
      expect(portalResults[0].triageSubmissionId).toBeUndefined();
    });

    it("CH-M4-15: Floating point precision resilience with fractional prices (centavos)", () => {
      const fractionalProcedures: AppointmentProcedureItem[] = [
        { title: "Item A", durationMin: 30, price: 199.9, isIncluded: false },
        { title: "Item B", durationMin: 20, price: 49.5, isIncluded: false },
        { title: "Item C", durationMin: 15, price: 100.25, isIncluded: false },
        { title: "Item D Incluso", durationMin: 10, price: 80.5, isIncluded: true },
      ];

      const bill = calculateProceduresBill(fractionalProcedures);
      // 199.90 + 49.50 + 100.25 = 349.65
      expect(Math.round(bill * 100) / 100).toBe(349.65);
      expect(calculateProceduresDuration(fractionalProcedures)).toBe(75);
    });

    it("CH-M4-16: Concurrent dual lookup for client portal (proposals and appointments in parallel)", async () => {
      const targetPhone = "11966667777";
      const directProposal: LuxuryProposal = {
        ...mockManualProposal,
        id: "prop-dual-client",
        clientPhone: targetPhone,
        clientName: "Vanessa Camargo",
      };
      const directApt: Appointment = {
        ...mockMultiProcedureAppointment,
        id: "apt-dual-client",
        clientPhone: targetPhone,
        clientName: "Vanessa Camargo",
      };

      SalonStore.saveProposal(directProposal);
      SalonStore.saveAppointment(directApt);

      // Perform 10 parallel dual lookups
      const lookups = await Promise.all(
        Array.from({ length: 10 }, async () => {
          const [props, apts] = await Promise.all([
            SupabaseDataService.getProposalsByClientPhone(targetPhone),
            SupabaseDataService.getAppointmentsByClientPhone(targetPhone),
          ]);
          return { props, apts };
        })
      );

      for (const res of lookups) {
        expect(res.props.some((p) => p.id === "prop-dual-client")).toBe(true);
        expect(res.apts.some((a) => a.id === "apt-dual-client")).toBe(true);
      }
    });

    it("CH-M4-17: Preserves isUncommittedQuote and procedures simultaneously for quote requests", () => {
      const quoteWithProcedures: Appointment = {
        ...mockMultiProcedureAppointment,
        id: "apt-quote-procedures-01",
        status: "uncommitted_quote",
        isUncommittedQuote: true,
        procedures: [
          { title: "Avaliação Capilar", durationMin: 30, price: 0, isIncluded: true },
          { title: "Cronograma Orçado", durationMin: 60, price: 320, isIncluded: false },
        ],
      };

      SalonStore.saveAppointment(quoteWithProcedures);

      const saved = SalonStore.getAppointments().find((a) => a.id === "apt-quote-procedures-01");
      expect(saved).toBeDefined();
      expect(saved?.status).toBe("uncommitted_quote");
      expect(saved?.isUncommittedQuote).toBe(true);
      expect(saved?.procedures).toHaveLength(2);
      expect(saved?.procedures?.[1].price).toBe(320);
    });

    it("CH-M4-18: Correctly updates existing appointment procedures and prices on edit", () => {
      const initialApt: Appointment = {
        ...mockMultiProcedureAppointment,
        id: "apt-to-be-edited-01",
        procedures: [
          { title: "Corte", durationMin: 60, price: 180, isIncluded: false },
        ],
        price: 180,
        totalDurationMin: 60,
      };

      SalonStore.saveAppointment(initialApt);

      // Edit: add 2 procedures and change price
      const updatedApt: Appointment = {
        ...initialApt,
        procedures: [
          { title: "Corte", durationMin: 60, price: 180, isIncluded: false },
          { title: "Hidratação", durationMin: 30, price: 100, isIncluded: false },
          { title: "Finalização", durationMin: 20, price: 50, isIncluded: true },
        ],
        price: 250, // Discounted from 280
        finalPrice: 250,
        totalDurationMin: 110,
      };

      SalonStore.saveAppointment(updatedApt);

      const retrieved = SalonStore.getAppointments().find((a) => a.id === "apt-to-be-edited-01");
      expect(retrieved?.procedures).toHaveLength(3);
      expect(retrieved?.price).toBe(250);
      expect(retrieved?.totalDurationMin).toBe(110);
      expect(calculateProceduresBill(retrieved?.procedures || [])).toBe(280);
      expect(calculateProceduresDuration(retrieved?.procedures || [])).toBe(110);
    });
  });
});
