import { describe, it, expect, beforeEach } from "vitest";
import { generateWhatsAppLink, formatBRL } from "@/lib/utils";
import {
  DEFAULT_CONFIRMATION_MESSAGE,
  interpolateMessageTokens,
} from "@/lib/whatsapp/confirmation";
import { SalonStore } from "@/lib/storage/localStore";
import { SupabaseDataService } from "@/lib/supabase/api";
import type { TriageSubmission } from "@/types/triage";
import type { PreReservation } from "@/types/availability";
import type { ServiceItem, ServiceStep } from "@/types/service";
import type { Appointment } from "@/types/appointment";

describe("Milestone 3 Challenger: WhatsApp Confirmation, Token Interpolation & Direct Triage Approval", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  // =========================================================================
  // 1. WhatsApp Link & Phone Sanitization Stress Tests
  // =========================================================================
  describe("1. WhatsApp Link Generation & Phone Number Sanitization", () => {
    it("handles standard Brazilian mobile formatted as (11) 98765-4321", () => {
      const link = generateWhatsAppLink("(11) 98765-4321", "Olá!");
      expect(link).toBe("https://wa.me/5511987654321?text=Ol%C3%A1!");
      const url = new URL(link);
      expect(url.pathname).toBe("/5511987654321");
      expect(url.searchParams.get("text")).toBe("Olá!");
    });

    it("handles mobile with international code +55 11 98765-4321 without duplicating 55", () => {
      const link = generateWhatsAppLink("+55 11 98765-4321", "Confirmação");
      expect(link).toBe("https://wa.me/5511987654321?text=Confirma%C3%A7%C3%A3o");
      const url = new URL(link);
      expect(url.pathname).toBe("/5511987654321");
    });

    it("handles raw digits with 55 prefix (13 digits: 5511987654321)", () => {
      const link = generateWhatsAppLink("5511987654321", "Teste");
      expect(link).toBe("https://wa.me/5511987654321?text=Teste");
    });

    it("handles raw digits without 55 prefix (11 digits: 11987654321)", () => {
      const link = generateWhatsAppLink("11987654321", "Teste");
      expect(link).toBe("https://wa.me/5511987654321?text=Teste");
    });

    it("handles DDD 55 (Santa Maria / RS) without international code: (55) 99876-5432", () => {
      // 11 digits: DDD 55 + 9 digits. Must NOT slice the DDD!
      const link = generateWhatsAppLink("(55) 99876-5432", "Teste RS");
      expect(link).toBe("https://wa.me/5555998765432?text=Teste%20RS");
      const url = new URL(link);
      expect(url.pathname).toBe("/5555998765432");
    });

    it("handles DDD 55 (RS) WITH international code: +55 (55) 99876-5432", () => {
      // 13 digits: 55 (DDI) + 55 (DDD) + 9 digits. Must slice DDI and keep DDD!
      const link = generateWhatsAppLink("+55 (55) 99876-5432", "Teste RS DDI");
      expect(link).toBe("https://wa.me/5555998765432?text=Teste%20RS%20DDI");
      const url = new URL(link);
      expect(url.pathname).toBe("/5555998765432");
    });

    it("handles landline phone formatted: (11) 3456-7890 (10 digits)", () => {
      const link = generateWhatsAppLink("(11) 3456-7890", "Fixo");
      expect(link).toBe("https://wa.me/551134567890?text=Fixo");
    });

    it("handles landline with +55: +55 (11) 3456-7890 (12 digits)", () => {
      const link = generateWhatsAppLink("+55 (11) 3456-7890", "Fixo");
      expect(link).toBe("https://wa.me/551134567890?text=Fixo");
    });

    it("handles highly erratic punctuation: +55.  ( 11 ) - 9.8765 - 4321", () => {
      const link = generateWhatsAppLink("+55.  ( 11 ) - 9.8765 - 4321", "Ok");
      expect(link).toBe("https://wa.me/5511987654321?text=Ok");
    });

    it("handles empty or non-numeric phone gracefully", () => {
      const linkEmpty = generateWhatsAppLink("", "Msg");
      expect(linkEmpty).toBe("https://wa.me/55?text=Msg");

      const linkLetters = generateWhatsAppLink("abc-xyz", "Msg");
      expect(linkLetters).toBe("https://wa.me/55?text=Msg");
    });

    it("preserves URL query integrity against special characters (&, ?, =, #, /, \", newlines)", () => {
      const complexMsg =
        "Olá & Bem-vindo! Preço: R$ 150,00? Sim #1. Link: http://test.com/a?b=1&c=2\nSegunda linha: 'aspas' & \"aspas duplas\"";
      const link = generateWhatsAppLink("11987654321", complexMsg);

      // Must be a valid parseable URL
      const url = new URL(link);
      expect(url.protocol).toBe("https:");
      expect(url.hostname).toBe("wa.me");
      expect(url.pathname).toBe("/5511987654321");
      // The search param must decode back exactly to the original text without truncation
      expect(url.searchParams.get("text")).toBe(complexMsg);
    });
  });

  // =========================================================================
  // 2. Token Interpolation Stress Tests
  // =========================================================================
  describe("2. Template & Token Interpolation Stress Tests", () => {
    it("interpolates all standard tokens accurately", () => {
      const template =
        "Olá {cliente}, seu agendamento de {servico} em {data} às {horario} no valor de {valor} está confirmado!";
      const data = {
        cliente: "Beatriz Lima",
        servico: "Design de Sobrancelhas",
        data: "2026-11-20",
        horario: "14:30",
        valor: "R$ 120,00",
      };
      const result = interpolateMessageTokens(template, data);
      expect(result).toBe(
        "Olá Beatriz Lima, seu agendamento de Design de Sobrancelhas em 2026-11-20 às 14:30 no valor de R$ 120,00 está confirmado!"
      );
    });

    it("handles heavy Portuguese accents and cedillas in replacement values", () => {
      const template = "Atendimento de {cliente}: {servico}.";
      const data = {
        cliente: "Conceição Álvares de Magalhães",
        servico: "Coloração, Reconstrução Térmica & Hidratação de Cílios",
      };
      const result = interpolateMessageTokens(template, data);
      expect(result).toBe(
        "Atendimento de Conceição Álvares de Magalhães: Coloração, Reconstrução Térmica & Hidratação de Cílios."
      );

      // Verify that this encoded in WhatsApp link remains fully round-trippable
      const waLink = generateWhatsAppLink("11999999999", result);
      const parsed = new URL(waLink);
      expect(parsed.searchParams.get("text")).toBe(result);
    });

    it("retains placeholder if data key is missing/undefined", () => {
      const template = "Olá {cliente}, seu serviço é {servico}.";
      const data = { cliente: "Mariana" }; // servico is missing
      const result = interpolateMessageTokens(template, data);
      expect(result).toBe("Olá Mariana, seu serviço é {servico}.");
    });

    it("replaces placeholder with empty string if value is explicitly empty string", () => {
      const template = "Olá {cliente}, seu horário é {horario}.";
      const data = { cliente: "", horario: "10:00" };
      const result = interpolateMessageTokens(template, data);
      expect(result).toBe("Olá , seu horário é 10:00.");
    });

    it("handles zero price correctly with formatBRL", () => {
      const template = "Valor do procedimento: {valor}";
      const formattedZero = formatBRL(0);
      const result = interpolateMessageTokens(template, { valor: formattedZero });
      // Brazilian format is "R$ 0,00" (with standard or non-breaking space)
      expect(result).toMatch(/R\$\s*0,00/);
    });

    it("investigates accented placeholder tokens like {serviço} or {horário}", () => {
      const templateWithAccentedTokens = "Confirmado: {serviço} às {horário}";
      const data = {
        serviço: "Manicure",
        horário: "15:00",
        servico: "Manicure",
        horario: "15:00",
      };
      const result = interpolateMessageTokens(templateWithAccentedTokens, data);
      // Because \w only matches ASCII [a-zA-Z0-9_], {serviço} will NOT match \w+ completely
      // Empirical verification of actual behavior:
      expect(result).toBe("Confirmado: {serviço} às {horário}");
    });

    it("handles long service names and multi-line templates gracefully", () => {
      const longService =
        "Tratamento Capilar Intensivo Cronograma Completo Nutrição Reconstrução Umectação com Óleo de Argan e Ozonioterapia";
      const result = interpolateMessageTokens(DEFAULT_CONFIRMATION_MESSAGE + "\nProcedimento: {servico}", {
        servico: longService,
      });
      expect(result).toContain(longService);
      expect(result).toContain("50% do valor do procedimento reservado");
    });

    it("safely handles XSS / markup injection in client names when constructing WhatsApp links", () => {
      const xssName = '<script>alert("xss")</script> & <img src=x onerror=alert(1)>';
      const template = "Cliente: {cliente}";
      const msg = interpolateMessageTokens(template, { cliente: xssName });
      const waLink = generateWhatsAppLink("11988887777", msg);

      // Verify that no unencoded tags exist in query string
      expect(waLink).not.toContain("<script>");
      expect(waLink).toContain("%3Cscript%3E");
      const parsed = new URL(waLink);
      expect(parsed.searchParams.get("text")).toBe("Cliente: " + xssName);
    });

    it("returns empty string if template is empty or undefined", () => {
      expect(interpolateMessageTokens("", { cliente: "Ana" })).toBe("");
      expect(interpolateMessageTokens(null as any, { cliente: "Ana" })).toBe("");
    });
  });

  // =========================================================================
  // 3. Direct Triage Approval & Pre-Reservation Conversion Stress Tests
  // =========================================================================
  describe("3. Direct Triage Approval & Pre-Reservation Workflow", () => {
    const mockService: ServiceItem = {
      id: "srv-mechas-luxo",
      orgId: "org-1",
      professionalId: "user-1",
      title: "Mechas Criativas com Glossing",
      slug: "mechas-criativas",
      category: "mechas",
      description: "Serviço completo de mechas",
      price: 450,
      promotionalPrice: 390,
      requiresTriage: true,
      isActive: true,
      steps: [
        {
          id: "step-1",
          order: 1,
          title: "Descoloração e Mechas",
          durationMin: 90,
          type: "active",
          requiresExclusiveAttention: true,
        },
        {
          id: "step-2",
          order: 2,
          title: "Tempo de Ação (Pausa)",
          durationMin: 45,
          maxPauseDurationMin: 60,
          type: "pause",
          requiresExclusiveAttention: false,
        },
        {
          id: "step-3",
          order: 3,
          title: "Tonalização e Lavatório",
          durationMin: 45,
          type: "active",
          requiresExclusiveAttention: true,
        },
      ],
    };

    it("computes stepBlocks sequentially with correct duration and pause flags", () => {
      // Replicate the step block calculation logic from handleDirectApproveTriage
      const srv = mockService;
      const totalDuration = srv.steps.reduce((sum: number, s: ServiceStep) => sum + s.durationMin, 0);
      expect(totalDuration).toBe(180);

      const time = "10:00";
      const [h, m] = time.split(":").map(Number);
      const startMinutes = h * 60 + m; // 600
      const endMinutes = startMinutes + totalDuration; // 780 = 13:00
      const endTimeStr = `${String(Math.floor(endMinutes / 60)).padStart(2, "0")}:${String(endMinutes % 60).padStart(2, "0")}`;
      expect(endTimeStr).toBe("13:00");

      let cursor = startMinutes;
      const blocks = srv.steps.map((st: ServiceStep) => {
        const stepStart = cursor;
        const stepEnd = cursor + st.durationMin;
        cursor = stepEnd;
        return {
          id: `blk-${st.id}`,
          stepId: st.id,
          stepTitle: st.title,
          type: st.type,
          startTime: `${String(Math.floor(stepStart / 60)).padStart(2, "0")}:${String(stepStart % 60).padStart(2, "0")}`,
          endTime: `${String(Math.floor(stepEnd / 60)).padStart(2, "0")}:${String(stepEnd % 60).padStart(2, "0")}`,
          durationMin: st.durationMin,
          maxPauseDurationMin: st.maxPauseDurationMin,
          isParallelSlotAllowed: st.type === "pause",
        };
      });

      expect(blocks).toHaveLength(3);
      // Step 1: 10:00 -> 11:30 (90 min)
      expect(blocks[0].startTime).toBe("10:00");
      expect(blocks[0].endTime).toBe("11:30");
      expect(blocks[0].isParallelSlotAllowed).toBe(false);

      // Step 2: 11:30 -> 12:15 (45 min pause)
      expect(blocks[1].startTime).toBe("11:30");
      expect(blocks[1].endTime).toBe("12:15");
      expect(blocks[1].isParallelSlotAllowed).toBe(true);

      // Step 3: 12:15 -> 13:00 (45 min)
      expect(blocks[2].startTime).toBe("12:15");
      expect(blocks[2].endTime).toBe("13:00");
      expect(blocks[2].isParallelSlotAllowed).toBe(false);
    });

    it("converts pre-reservation to 'converted' status and links convertedAppointmentId", async () => {
      const preResPayload = {
        orgId: "org-1",
        professionalId: "user-1",
        serviceId: "srv-mechas-luxo",
        serviceName: "Mechas Criativas com Glossing",
        clientName: "Carolina Mendes",
        clientPhone: "11988882222",
        requestedDate: "2026-11-25",
        preferredPeriod: "tarde" as const,
        status: "pending" as const,
      };
      const createdPreRes = SalonStore.createPreReservation(preResPayload);

      const submission: TriageSubmission = {
        id: "sub-direct-approve-1",
        orgId: "org-1",
        formId: "form-1",
        serviceId: "srv-mechas-luxo",
        serviceTitle: "Mechas Criativas com Glossing",
        clientName: "Carolina Mendes",
        clientPhone: "11988882222",
        preferredDate: "2026-11-25",
        preferredTimeSlot: "14:00",
        preReservationId: createdPreRes.id,
        status: "pending_review",
        answers: [],
        photos: {},
        submittedAt: new Date().toISOString(),
      };
      SalonStore.saveTriageSubmission(submission);

      // Execute approval
      const aptId = "apt-confirmed-direct-1";
      await SupabaseDataService.approveTriageDirectly(submission.id);
      await SupabaseDataService.updatePreReservationStatus(
        submission.preReservationId!,
        "converted",
        undefined,
        aptId
      );

      // Verify triage submission status
      const updatedSubmissions = SalonStore.getTriageSubmissions();
      const updatedSub = updatedSubmissions.find((s) => s.id === submission.id);
      expect(updatedSub?.status).toBe("approved");

      // Verify pre-reservation status & link
      const preReservations = SalonStore.getPreReservations("org-1");
      const updatedPreRes = preReservations.find((p) => p.id === createdPreRes.id);
      expect(updatedPreRes?.status).toBe("converted");
      expect(updatedPreRes?.convertedAppointmentId).toBe(aptId);
    });

    it("prevents double approvals and avoids creating duplicate appointments", async () => {
      const submission: TriageSubmission = {
        id: "sub-double-approval-test",
        orgId: "org-1",
        formId: "form-1",
        serviceId: "srv-mechas-luxo",
        serviceTitle: "Mechas Criativas com Glossing",
        clientName: "Fernanda Costa",
        clientPhone: "11977773333",
        status: "pending_review",
        answers: [],
        photos: {},
        submittedAt: new Date().toISOString(),
      };
      SalonStore.saveTriageSubmission(submission);

      // Simulate First Approval Workflow
      const firstApt: Appointment = {
        id: "apt-first-approval",
        orgId: submission.orgId,
        professionalId: "user-1",
        professionalName: "Gleicy Ronha",
        serviceId: submission.serviceId,
        serviceTitle: submission.serviceTitle,
        clientName: submission.clientName,
        clientPhone: submission.clientPhone,
        date: "2026-11-22",
        startTime: "10:00",
        endTime: "13:00",
        totalDurationMin: 180,
        status: "confirmed",
        price: 390,
        paymentStatus: "pending",
        triageSubmissionId: submission.id,
        createdAt: new Date().toISOString(),
      };
      await SupabaseDataService.saveAppointment(firstApt);
      await SupabaseDataService.approveTriageDirectly(submission.id);

      let allApts = SalonStore.getAppointments().filter(
        (a) => a.triageSubmissionId === submission.id
      );
      expect(allApts).toHaveLength(1);

      // Simulate Second Approval attempt for the same submission
      const existingApt = SalonStore.getAppointments().find(
        (a) => a.triageSubmissionId === submission.id
      );
      expect(existingApt).toBeDefined();

      // In handleDirectApproveTriage, if existingApt exists, it modifies existingApt preserving id
      const secondApt: Appointment = {
        ...existingApt!,
        date: "2026-11-23", // reschedule on second approval
        startTime: "11:00",
        endTime: "14:00",
        price: 400,
      };
      await SupabaseDataService.saveAppointment(secondApt);
      await SupabaseDataService.approveTriageDirectly(submission.id);

      allApts = SalonStore.getAppointments().filter(
        (a) => a.triageSubmissionId === submission.id
      );
      expect(allApts).toHaveLength(1);
      expect(allApts[0].id).toBe("apt-first-approval");
      expect(allApts[0].date).toBe("2026-11-23");
      expect(allApts[0].price).toBe(400);
    });

    it("handles submission without preferred date and time slot gracefully", () => {
      const submissionWithoutSlot: TriageSubmission = {
        id: "sub-no-slot",
        orgId: "org-1",
        formId: "form-1",
        serviceId: "srv-mechas-luxo",
        serviceTitle: "Mechas Criativas com Glossing",
        clientName: "Renata Sem Horário",
        clientPhone: "11966664444",
        status: "pending_review",
        answers: [],
        photos: {},
        submittedAt: new Date().toISOString(),
      };

      // Test DirectApproveModal fallback logic for date and time:
      const getInitialDate = (sub: TriageSubmission) => {
        if (sub.preferredDate && /^\d{4}-\d{2}-\d{2}$/.test(sub.preferredDate)) {
          return sub.preferredDate;
        }
        const now = new Date();
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, "0");
        const d = String(now.getDate()).padStart(2, "0");
        return `${y}-${m}-${d}`;
      };

      const getInitialTime = (sub: TriageSubmission) => {
        if (sub.preferredTimeSlot) {
          const match = sub.preferredTimeSlot.match(/\b\d{2}:\d{2}\b/);
          if (match) return match[0];
        }
        return "09:00";
      };

      const date = getInitialDate(submissionWithoutSlot);
      const time = getInitialTime(submissionWithoutSlot);

      expect(date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(time).toBe("09:00");

      // Test with textual non-time slot like "Encaixe no sábado de manhã"
      submissionWithoutSlot.preferredTimeSlot = "Encaixe no sábado de manhã";
      expect(getInitialTime(submissionWithoutSlot)).toBe("09:00");

      // Test with slot containing time like "Encaixe às 15:30"
      submissionWithoutSlot.preferredTimeSlot = "Encaixe às 15:30";
      expect(getInitialTime(submissionWithoutSlot)).toBe("15:30");
    });

    it("empirically verifies zero price behavior in handleDirectApproveTriage", () => {
      // In handleDirectApproveTriage line 457:
      // price: price || srv?.promotionalPrice || srv?.price || 150
      const testPrice = 0;
      const srvPrice = 450;
      const resolvedPriceWithOr = testPrice || srvPrice || 150;
      const resolvedPriceWithNullish = testPrice ?? srvPrice ?? 150;

      // Note: `0 || 450` evaluates to 450 because 0 is falsy in JavaScript!
      expect(resolvedPriceWithOr).toBe(450);
      expect(resolvedPriceWithNullish).toBe(0);
    });
  });
});
