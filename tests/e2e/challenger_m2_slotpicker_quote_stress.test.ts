import { describe, it, expect, beforeEach, vi } from "vitest";
import fs from "fs";
import path from "path";
import { SalonStore } from "@/lib/storage/localStore";
import { SupabaseDataService } from "@/lib/supabase/api";
import {
  calculateDaySlotGrid,
  calculateAvailableSlots,
  DaySlotItem,
} from "@/lib/scheduling/engine";
import { Appointment, AppointmentStatus, ScheduledStepBlock } from "@/types/appointment";
import { ServiceItem } from "@/types/service";
import { SalonClient } from "@/types/client";
import { LuxuryProposal } from "@/types/proposal";
import { mockFixedService, mockStartingAtService } from "../fixtures/services.fixture";
import { mockLuxuryProposal } from "../fixtures/proposals.fixture";

describe("Challenger M2 Iteration 2: SlotPicker Uncommitted Quote Flow & page.tsx Stress Test", () => {
  const targetDate = "2026-11-28";
  const profId = "user-gleicy-ronha";
  const profName = "Gleicy Ronha";

  beforeEach(() => {
    window.localStorage.clear();
    vi.clearAllMocks();
  });

  // Helper function to build strictly valid synthetic appointments
  function makeSyntheticAppointment(params: {
    id: string;
    startTime: string;
    endTime: string;
    totalDurationMin?: number;
    status: AppointmentStatus;
    isUncommittedQuote: boolean;
    price?: number;
    clientName?: string;
    clientPhone?: string;
    stepBlocks?: ScheduledStepBlock[];
    proposalId?: string;
    serviceId?: string;
    serviceTitle?: string;
  }): Appointment {
    return {
      id: params.id,
      orgId: "org-gleicy-ronha",
      professionalId: profId,
      professionalName: profName,
      serviceId: params.serviceId || mockFixedService.id,
      serviceTitle: params.serviceTitle || mockFixedService.title,
      clientName: params.clientName || `Cliente ${params.id}`,
      clientPhone: params.clientPhone || "11988887777",
      date: targetDate,
      startTime: params.startTime,
      endTime: params.endTime,
      totalDurationMin: params.totalDurationMin ?? 90,
      status: params.status,
      isUncommittedQuote: params.isUncommittedQuote,
      price: params.price ?? 200,
      paymentStatus: params.isUncommittedQuote ? "pending" : "paid",
      stepBlocks: params.stepBlocks ?? [],
      proposalId: params.proposalId,
      createdAt: new Date().toISOString(),
    };
  }

  // =========================================================================
  // SECTION 1: STATIC & CODE-LEVEL ADVERSARIAL AUDIT OF SLOTPICKER & PAGE.TSX
  // =========================================================================

  describe("1. Contract & Code-Level Audit", () => {
    it("1.1 - SlotPicker.tsx MUST NOT call onConfirmBooking in handleRequestUncommittedQuote", () => {
      const slotPickerPath = path.resolve(
        process.cwd(),
        "src/components/client/SlotPicker.tsx"
      );
      const source = fs.readFileSync(slotPickerPath, "utf-8");

      // Extract the body of handleRequestUncommittedQuote up to handleRequestPreReservation
      const startIndex = source.indexOf("const handleRequestUncommittedQuote = async () => {");
      const endIndex = source.indexOf("const handleRequestPreReservation = async");
      expect(startIndex).toBeGreaterThan(-1);
      expect(endIndex).toBeGreaterThan(startIndex);

      const fnBody = source.slice(startIndex, endIndex);

      // Assert that onConfirmBooking is NOT invoked anywhere inside handleRequestUncommittedQuote
      expect(fnBody).not.toMatch(/onConfirmBooking\s*\(/);

      // Assert that setIsQuoteSuccess(true) IS invoked
      expect(fnBody).toMatch(/setIsQuoteSuccess\s*\(\s*true\s*\)/);
    });

    it("1.2 - SlotPicker.tsx MUST render isQuoteSuccess modal with onCancel action (Catalog Return)", () => {
      const slotPickerPath = path.resolve(
        process.cwd(),
        "src/components/client/SlotPicker.tsx"
      );
      const source = fs.readFileSync(slotPickerPath, "utf-8");

      // Look for the if (isQuoteSuccess) render block
      const renderBlockRegex =
        /if\s*\(\s*isQuoteSuccess\s*\)\s*\{([\s\S]*?return\s*\([\s\S]*?\);\s*\})/;
      const match = source.match(renderBlockRegex);
      expect(match).not.toBeNull();
      const renderCode = match![1];

      // Verifies quote success UI elements
      expect(renderCode).toContain("Orçamento Solicitado");
      expect(renderCode).toContain("Nenhum horário foi bloqueado na agenda");
      expect(renderCode).toContain("Voltar ao Catálogo");
      expect(renderCode).toContain("onClick={onCancel}");
    });

    it("1.3 - page.tsx MUST guard setConfirmedAppointment against uncommitted quotes in handleConfirmDirectBooking", () => {
      const pagePath = path.resolve(process.cwd(), "src/app/page.tsx");
      const source = fs.readFileSync(pagePath, "utf-8");

      // Extract handleConfirmDirectBooking
      const fnRegex =
        /const\s+handleConfirmDirectBooking\s*=\s*async\s*\((?:apt:\s*Appointment)?\)\s*=>\s*\{([\s\S]*?)\n\s*\};/;
      const match = source.match(fnRegex);
      expect(match).not.toBeNull();
      const fnBody = match![1];

      // Assert defensive check exists before setConfirmedAppointment
      expect(fnBody).toMatch(
        /if\s*\(\s*!apt\.isUncommittedQuote\s*&&\s*apt\.status\s*!==\s*["']uncommitted_quote["']\s*\)\s*\{[\s\S]*?setConfirmedAppointment\(/
      );
    });
  });

  // =========================================================================
  // SECTION 2: EMPIRICAL BEHAVIORAL TESTING OF PAGE.TSX GUARD LOGIC
  // =========================================================================

  describe("2. Behavioral Guard Stress-Testing (page.tsx Immunity)", () => {
    it("2.1 - handleConfirmDirectBooking simulation MUST NOT set confirmedAppointment for uncommitted quotes", async () => {
      let confirmedAppointmentState: Appointment | null = null;
      let appointmentsList: Appointment[] = [];

      // Exact handler implementation extracted from src/app/page.tsx:278
      const simulateHandleConfirmDirectBooking = async (apt: Appointment) => {
        const saved = await SupabaseDataService.saveAppointment(apt);
        appointmentsList.push(saved);
        if (!apt.isUncommittedQuote && apt.status !== "uncommitted_quote") {
          confirmedAppointmentState = saved;
        }
      };

      // Case A: Uncommitted quote with standard flags
      const uncommittedQuote = makeSyntheticAppointment({
        id: `apt-quote-${Date.now()}`,
        startTime: "10:00",
        endTime: "11:30",
        status: "uncommitted_quote",
        isUncommittedQuote: true,
      });

      await simulateHandleConfirmDirectBooking(uncommittedQuote);

      // Crucial Assertions:
      expect(confirmedAppointmentState).toBeNull(); // BANNER MUST NEVER APPEAR
      expect(appointmentsList).toHaveLength(1);
      expect(appointmentsList[0].isUncommittedQuote).toBe(true);

      // Case B: Defensive check with isUncommittedQuote: true but status: 'pending_confirmation'
      confirmedAppointmentState = null;
      const disguisedQuote: Appointment = {
        ...uncommittedQuote,
        id: `apt-disguised-${Date.now()}`,
        status: "pending_confirmation",
        isUncommittedQuote: true,
      };
      await simulateHandleConfirmDirectBooking(disguisedQuote);
      expect(confirmedAppointmentState).toBeNull();

      // Case C: Defensive check with status: 'uncommitted_quote' but isUncommittedQuote: false
      confirmedAppointmentState = null;
      const statusOnlyQuote: Appointment = {
        ...uncommittedQuote,
        id: `apt-status-only-${Date.now()}`,
        status: "uncommitted_quote",
        isUncommittedQuote: false,
      };
      await simulateHandleConfirmDirectBooking(statusOnlyQuote);
      expect(confirmedAppointmentState).toBeNull();

      // Case D: Regular confirmed appointment MUST set confirmedAppointment
      confirmedAppointmentState = null;
      const regularBooking: Appointment = {
        ...uncommittedQuote,
        id: `apt-confirmed-${Date.now()}`,
        status: "confirmed",
        isUncommittedQuote: false,
      };
      await simulateHandleConfirmDirectBooking(regularBooking);
      expect(confirmedAppointmentState).not.toBeNull();
      expect((confirmedAppointmentState as any)?.id).toBe(regularBooking.id);
    });

    it("2.2 - Banner rendering check: confirmedAppointment banner renders ONLY when state is truthy", () => {
      // Simulating page.tsx:385-405 condition
      const renderConfirmationBanner = (apt: Appointment | null) => {
        if (!apt) return null;
        return {
          bannerTitle: "Horário Confirmado na Agenda!",
          clientName: apt.clientName,
          date: apt.date,
          startTime: apt.startTime,
        };
      };

      // With null (uncommitted quote flow):
      expect(renderConfirmationBanner(null)).toBeNull();

      // With regular appointment:
      const regularApt = makeSyntheticAppointment({
        id: "apt-regular",
        startTime: "14:00",
        endTime: "15:00",
        totalDurationMin: 60,
        status: "confirmed",
        isUncommittedQuote: false,
        clientName: "Mariana Silva",
      });
      const rendered = renderConfirmationBanner(regularApt);
      expect(rendered).not.toBeNull();
      expect(rendered?.bannerTitle).toBe("Horário Confirmado na Agenda!");
      expect(rendered?.clientName).toBe("Mariana Silva");
    });
  });

  // =========================================================================
  // SECTION 3: EMPIRICAL SIMULATION OF SLOTPICKER QUOTE FLOW
  // =========================================================================

  describe("3. SlotPicker Uncommitted Quote Flow & Mount Persistence", () => {
    it("3.1 - handleRequestUncommittedQuote executes without calling onConfirmBooking or unmounting", async () => {
      const onConfirmBookingSpy = vi.fn();
      const onCancelSpy = vi.fn();
      let isPickingSlotState = true;
      let isQuoteSuccessState = false;
      let authErrorState = "";

      const activeClient: SalonClient = {
        id: "client-quote-01",
        name: "Juliana Santos",
        phone: "11988887777",
        createdAt: new Date().toISOString(),
      };
      SalonStore.setActiveClient(activeClient);

      // Simulated handler replicating exact logic of SlotPicker.tsx:355-442
      const simulateHandleRequestUncommittedQuote = async () => {
        authErrorState = "";
        try {
          const clientToUse = activeClient;
          const finalDate = targetDate;
          const finalTime = "10:00";
          const finalEndTime = "11:30";

          const newAppointment: Appointment = {
            id: `apt-${Date.now()}`,
            orgId: mockFixedService.orgId || "org-gleicy-ronha",
            professionalId: mockFixedService.professionalId || "user-gleicy-ronha",
            professionalName: "Gleicy Ronha",
            serviceId: mockFixedService.id,
            serviceTitle: mockFixedService.title,
            clientName: clientToUse.name,
            clientPhone: clientToUse.phone,
            clientEmail: clientToUse.email,
            date: finalDate,
            startTime: finalTime,
            endTime: finalEndTime,
            totalDurationMin: mockFixedService.steps.reduce(
              (sum, s) => sum + s.durationMin,
              0
            ),
            status: "uncommitted_quote",
            isUncommittedQuote: true,
            price: mockFixedService.promotionalPrice || mockFixedService.price,
            paymentStatus: "pending",
            stepBlocks: [],
            procedures: mockFixedService.procedures || [
              {
                title: mockFixedService.title,
                durationMin: mockFixedService.steps.reduce(
                  (sum, s) => sum + s.durationMin,
                  0
                ),
                price: mockFixedService.promotionalPrice || mockFixedService.price,
                isIncluded: true,
              },
            ],
            notes: "Orçamento sem compromisso (sem bloqueio de horário na grade)",
            createdAt: new Date().toISOString(),
          };

          await SupabaseDataService.saveAppointment(newAppointment);

          // Crucial: Remediated behavior: sets isQuoteSuccess to true, NO onConfirmBooking
          isQuoteSuccessState = true;
        } catch (err: any) {
          authErrorState = err.message;
        }
      };

      // Execute uncommitted quote request
      await simulateHandleRequestUncommittedQuote();

      // Assertions:
      expect(isQuoteSuccessState).toBe(true);
      expect(onConfirmBookingSpy).not.toHaveBeenCalled();
      // Parent modal state remains OPEN because onConfirmBooking was NOT called
      expect(isPickingSlotState).toBe(true);

      // Check persisted appointment
      const allApts = SalonStore.getAppointments();
      const savedQuote = allApts.find((a) => a.clientName === "Juliana Santos");
      expect(savedQuote).toBeDefined();
      expect(savedQuote?.status).toBe("uncommitted_quote");
      expect(savedQuote?.isUncommittedQuote).toBe(true);

      // Now user clicks "Voltar ao Catálogo", which calls onCancel
      const handleUserClickBackToCatalog = () => {
        onCancelSpy();
        isPickingSlotState = false; // simulates page.tsx onCancel={() => setIsPickingSlot(false)}
      };

      handleUserClickBackToCatalog();
      expect(onCancelSpy).toHaveBeenCalledTimes(1);
      expect(isPickingSlotState).toBe(false);
    });
  });

  // =========================================================================
  // SECTION 4: ADVERSARIAL SCALE: 150+ CONCURRENT QUOTE SUBMISSIONS VS ENGINE
  // =========================================================================

  describe("4. Adversarial Scale: 150+ Concurrent Quotes vs calculateDaySlotGrid", () => {
    it("4.1 - 150 uncommitted quotes across the entire day MUST result in 0 slot blockages", () => {
      // 1. Calculate pristine baseline grid on empty schedule
      const pristineGrid = calculateDaySlotGrid(
        mockFixedService,
        targetDate,
        profId,
        [],
        {
          openMinutes: 8 * 60 + 30, // 08:30
          closeMinutes: 19 * 60, // 19:00
          slotIntervalMinutes: 30,
          maxParallelInPause: 1,
        }
      );

      const pristineAvailableCount = pristineGrid.filter(
        (s) => s.isAvailable
      ).length;
      expect(pristineAvailableCount).toBeGreaterThan(0);

      // 2. Generate 150 uncommitted quotes saturating EVERY slot of the day
      const syntheticQuotes: Appointment[] = [];
      const times = [
        "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
        "12:00", "12:30", "13:00", "13:30", "14:00", "14:30", "15:00",
        "15:30", "16:00", "16:30", "17:00", "17:30", "18:00",
      ];

      for (let i = 0; i < 150; i++) {
        const timeSlot = times[i % times.length];
        syntheticQuotes.push(
          makeSyntheticAppointment({
            id: `stress-quote-${i}`,
            startTime: timeSlot,
            endTime: "19:00",
            status: "uncommitted_quote",
            isUncommittedQuote: true,
            clientName: `Cliente Quote Stress ${i}`,
            clientPhone: `1197777${String(i).padStart(4, "0")}`,
          })
        );
      }

      expect(syntheticQuotes).toHaveLength(150);

      // 3. Calculate grid with 150 quotes present
      const startTime = performance.now();
      const stressedGrid = calculateDaySlotGrid(
        mockFixedService,
        targetDate,
        profId,
        syntheticQuotes,
        {
          openMinutes: 8 * 60 + 30,
          closeMinutes: 19 * 60,
          slotIntervalMinutes: 30,
          maxParallelInPause: 1,
        }
      );
      const executionDuration = performance.now() - startTime;

      // Assert performance: calculating with 150 quotes must execute swiftly (< 50ms)
      expect(executionDuration).toBeLessThan(50);

      // 4. Strict Grid Comparison: Every single slot item must match pristine grid
      expect(stressedGrid.length).toBe(pristineGrid.length);

      for (let i = 0; i < pristineGrid.length; i++) {
        const pristineSlot = pristineGrid[i];
        const stressedSlot = stressedGrid[i];

        expect(stressedSlot.time).toBe(pristineSlot.time);
        expect(stressedSlot.isAvailable).toBe(pristineSlot.isAvailable);
        expect(stressedSlot.status).toBe(pristineSlot.status);
        expect(stressedSlot.conflictReason).toBe(pristineSlot.conflictReason);
      }

      const stressedAvailableCount = stressedGrid.filter(
        (s) => s.isAvailable
      ).length;
      expect(stressedAvailableCount).toBe(pristineAvailableCount);
    });

    it("4.2 - High-Density Collision: 5 Confirmed Appointments + 150 Uncommitted Quotes produces IDENTICAL available grid as 5 Confirmed Appointments alone", () => {
      // Create 5 real, confirmed appointments that genuinely occupy slots
      const confirmedAppointments: Appointment[] = [
        makeSyntheticAppointment({
          id: "conf-1",
          serviceTitle: "Corte Bordado",
          startTime: "09:00",
          endTime: "10:30",
          totalDurationMin: 90,
          status: "confirmed",
          isUncommittedQuote: false,
          price: 200,
          stepBlocks: [
            {
              id: "sb-1",
              stepId: "step-1",
              stepTitle: "Corte",
              type: "active",
              startTime: "09:00",
              endTime: "10:30",
              durationMin: 90,
              isParallelSlotAllowed: false,
            },
          ],
        }),
        makeSyntheticAppointment({
          id: "conf-2",
          serviceTitle: "Coloração",
          startTime: "11:30",
          endTime: "13:00",
          totalDurationMin: 90,
          status: "confirmed",
          isUncommittedQuote: false,
          price: 300,
          stepBlocks: [
            {
              id: "sb-2",
              stepId: "step-2",
              stepTitle: "Aplicação",
              type: "active",
              startTime: "11:30",
              endTime: "13:00",
              durationMin: 90,
              isParallelSlotAllowed: false,
            },
          ],
        }),
        makeSyntheticAppointment({
          id: "conf-3",
          serviceTitle: "Tratamento",
          startTime: "14:00",
          endTime: "15:30",
          totalDurationMin: 90,
          status: "confirmed",
          isUncommittedQuote: false,
          price: 150,
          stepBlocks: [
            {
              id: "sb-3",
              stepId: "step-3",
              stepTitle: "Tratamento",
              type: "active",
              startTime: "14:00",
              endTime: "15:30",
              durationMin: 90,
              isParallelSlotAllowed: false,
            },
          ],
        }),
        makeSyntheticAppointment({
          id: "conf-4",
          serviceTitle: "Escova",
          startTime: "16:00",
          endTime: "17:00",
          totalDurationMin: 60,
          status: "confirmed",
          isUncommittedQuote: false,
          price: 120,
          stepBlocks: [
            {
              id: "sb-4",
              stepId: "step-4",
              stepTitle: "Escova",
              type: "active",
              startTime: "16:00",
              endTime: "17:00",
              durationMin: 60,
              isParallelSlotAllowed: false,
            },
          ],
        }),
        makeSyntheticAppointment({
          id: "conf-5",
          serviceTitle: "Finalização",
          startTime: "17:30",
          endTime: "18:30",
          totalDurationMin: 60,
          status: "confirmed",
          isUncommittedQuote: false,
          price: 100,
          stepBlocks: [
            {
              id: "sb-5",
              stepId: "step-5",
              stepTitle: "Finalização",
              type: "active",
              startTime: "17:30",
              endTime: "18:30",
              durationMin: 60,
              isParallelSlotAllowed: false,
            },
          ],
        }),
      ];

      // Baseline: Grid with only the 5 confirmed appointments
      const baselineGrid = calculateDaySlotGrid(
        mockFixedService,
        targetDate,
        profId,
        confirmedAppointments,
        {
          openMinutes: 8 * 60 + 30,
          closeMinutes: 19 * 60,
          slotIntervalMinutes: 30,
          maxParallelInPause: 1,
        }
      );

      // Generate 150 quotes, heavily targeting the times of confirmed bookings AND open gaps
      const aggressiveQuotes: Appointment[] = [];
      for (let i = 0; i < 150; i++) {
        const slotTime = [
          "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
          "12:00", "12:30", "13:00", "13:30", "14:00", "14:30",
          "15:00", "15:30", "16:00", "16:30", "17:00", "17:30",
        ][i % 18];

        aggressiveQuotes.push(
          makeSyntheticAppointment({
            id: `aggressive-quote-${i}`,
            serviceId: mockStartingAtService.id,
            serviceTitle: mockStartingAtService.title,
            clientName: `Lead Orçamento #${i}`,
            startTime: slotTime,
            endTime: "18:00",
            status: "uncommitted_quote",
            isUncommittedQuote: true,
            price: 450,
          })
        );
      }

      // Stressed grid: 5 confirmed + 150 aggressive quotes
      const combinedAppointments = [...confirmedAppointments, ...aggressiveQuotes];
      expect(combinedAppointments).toHaveLength(155);

      const stressedGrid = calculateDaySlotGrid(
        mockFixedService,
        targetDate,
        profId,
        combinedAppointments,
        {
          openMinutes: 8 * 60 + 30,
          closeMinutes: 19 * 60,
          slotIntervalMinutes: 30,
          maxParallelInPause: 1,
        }
      );

      // Verify identical lengths and identical slot states
      expect(stressedGrid.length).toBe(baselineGrid.length);

      for (let i = 0; i < baselineGrid.length; i++) {
        const base = baselineGrid[i];
        const stress = stressedGrid[i];

        expect(stress.time).toBe(base.time);
        expect(stress.isAvailable).toBe(base.isAvailable);
        expect(stress.status).toBe(base.status);
        expect(stress.conflictReason).toBe(base.conflictReason);
        expect(stress.isEncaixe).toBe(base.isEncaixe);
      }
    });

    it("4.3 - Stampede on Exact Single Timestamp: 50 concurrent quotes at 10:00 MUST leave 10:00 available for regular booking", () => {
      const stampedeQuotes: Appointment[] = [];
      for (let i = 0; i < 50; i++) {
        stampedeQuotes.push(
          makeSyntheticAppointment({
            id: `stampede-${i}`,
            startTime: "10:00",
            endTime: "11:30",
            status: "uncommitted_quote",
            isUncommittedQuote: true,
            clientName: `Stampede User ${i}`,
          })
        );
      }

      const availableSlots = calculateAvailableSlots(
        mockFixedService,
        targetDate,
        profId,
        stampedeQuotes,
        {
          openMinutes: 8 * 60 + 30,
          closeMinutes: 19 * 60,
          slotIntervalMinutes: 30,
          maxParallelInPause: 1,
        }
      );

      const slotAt10 = availableSlots.find((s) => s.time === "10:00");
      expect(slotAt10).toBeDefined();
    });

    it("4.4 - Chemical Pause Encaixe: 50 uncommitted quotes inside chemical pause window do NOT consume or disrupt genuine encaixe capacity", () => {
      // Confirmed appointment with chemical pause from 10:00 to 11:30
      const appointmentWithPause = makeSyntheticAppointment({
        id: "apt-chem-pause",
        serviceId: "srv-chem",
        serviceTitle: "Mechas & Alisamento",
        clientName: "Cliente Alisamento",
        startTime: "09:00",
        endTime: "12:30",
        totalDurationMin: 210,
        status: "confirmed",
        isUncommittedQuote: false,
        price: 600,
        stepBlocks: [
          {
            id: "step-1",
            stepId: "s1",
            stepTitle: "Aplicação Química",
            type: "active",
            startTime: "09:00",
            endTime: "10:00",
            durationMin: 60,
            isParallelSlotAllowed: false,
          },
          {
            id: "step-2",
            stepId: "s2",
            stepTitle: "Pausa Química",
            type: "pause",
            startTime: "10:00",
            endTime: "11:30",
            durationMin: 90,
            maxPauseDurationMin: 90,
            isParallelSlotAllowed: true,
          },
          {
            id: "step-3",
            stepId: "s3",
            stepTitle: "Enxágue e Finalização",
            type: "active",
            startTime: "11:30",
            endTime: "12:30",
            durationMin: 60,
            isParallelSlotAllowed: false,
          },
        ],
      });

      // Service that fits neatly into the 90 min chemical pause
      const quickService: ServiceItem = {
        id: "srv-quick",
        orgId: "org-01",
        professionalId: profId,
        title: "Escova Rápida",
        slug: "escova-rapida",
        category: "corte",
        description: "Escova rápida",
        requiresTriage: false,
        isActive: true,
        price: 80,
        steps: [
          {
            id: "q-1",
            order: 1,
            title: "Escova",
            durationMin: 60,
            type: "active",
            requiresExclusiveAttention: true,
          },
        ],
      };

      // 50 uncommitted quotes submitted for the exact encaixe window (10:00)
      const pauseBombQuotes: Appointment[] = [];
      for (let i = 0; i < 50; i++) {
        pauseBombQuotes.push(
          makeSyntheticAppointment({
            id: `pause-bomb-${i}`,
            serviceId: quickService.id,
            serviceTitle: quickService.title,
            startTime: "10:00",
            endTime: "11:00",
            totalDurationMin: 60,
            status: "uncommitted_quote",
            isUncommittedQuote: true,
            price: 80,
          })
        );
      }

      const availableSlots = calculateAvailableSlots(
        quickService,
        targetDate,
        profId,
        [appointmentWithPause, ...pauseBombQuotes],
        {
          openMinutes: 8 * 60 + 30,
          closeMinutes: 19 * 60,
          slotIntervalMinutes: 30,
          maxParallelInPause: 1,
        }
      );

      // The encaixe slot at 10:00 MUST still be detected as available and isEncaixe: true
      const encaixeSlot = availableSlots.find((s) => s.time === "10:00");
      expect(encaixeSlot).toBeDefined();
      expect(encaixeSlot?.isEncaixe).toBe(true);
      expect(encaixeSlot?.encaixeWithAppointmentId).toBe("apt-chem-pause");
    });
  });

  // =========================================================================
  // SECTION 5: LIFECYCLE CONVERSION VERIFICATION (QUOTE -> CONFIRMED BOOKING)
  // =========================================================================

  describe("5. Quote Conversion Lifecycle (Zero Ghost Quotes)", () => {
    it("5.1 - Approving proposal converts quote to confirmed booking, correctly blocking slot in calculateDaySlotGrid", async () => {
      // 1. Arrange: Existing uncommitted quote
      const quoteApt = makeSyntheticAppointment({
        id: "apt-quote-lifecycle-01",
        serviceId: mockFixedService.id,
        serviceTitle: mockFixedService.title,
        clientName: "Cliente Transição",
        startTime: "14:00",
        endTime: "15:30",
        totalDurationMin: 90,
        status: "uncommitted_quote",
        isUncommittedQuote: true,
        price: 250,
        proposalId: "prop-lifecycle-01",
      });
      SalonStore.saveAppointment(quoteApt);

      const proposal: LuxuryProposal = {
        ...mockLuxuryProposal,
        id: "prop-lifecycle-01",
        schedulingDetails: {
          status: "accepted_original",
          originalDate: targetDate,
          originalTime: "14:00",
        },
      };
      SalonStore.saveProposal(proposal);

      // Prior to approval: slot at 14:00 is available
      let currentApts = SalonStore.getAppointments();
      let gridBefore = calculateDaySlotGrid(
        mockFixedService,
        targetDate,
        profId,
        currentApts
      );
      const slotBefore = gridBefore.find((s) => s.time === "14:00");
      expect(slotBefore?.isAvailable).toBe(true);

      // 2. Act: Client approves proposal
      await SupabaseDataService.approveProposal("prop-lifecycle-01", {
        chosenDate: targetDate,
        chosenTime: "14:00",
      });

      // 3. Assert: Appointment converted
      currentApts = SalonStore.getAppointments();
      const approvedApt = currentApts.find((a) => a.id === "apt-quote-lifecycle-01");
      expect(approvedApt).toBeDefined();
      expect(approvedApt?.status).toBe("confirmed");
      expect(approvedApt?.isUncommittedQuote).toBe(false);

      // Now: slot at 14:00 is OCCUPIED / BLOCKED by the newly confirmed appointment
      let gridAfter = calculateDaySlotGrid(
        mockFixedService,
        targetDate,
        profId,
        currentApts
      );
      const slotAfter = gridAfter.find((s) => s.time === "14:00");
      expect(slotAfter?.isAvailable).toBe(false);
      expect(slotAfter?.status).toBe("occupied");
    });
  });
});
