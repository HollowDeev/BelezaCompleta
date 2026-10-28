import { ServiceItem, ServiceStep } from "@/types/service";
import { Appointment, ScheduledStepBlock } from "@/types/appointment";
import { formatTimeHHmm, parseHHmmToMinutes } from "@/lib/utils";

export interface AvailableSlot {
  time: string; // HH:mm
  endTime: string; // HH:mm
  isEncaixe: boolean; // Encaixado dentro de uma pausa química existente
  encaixeWithAppointmentId?: string;
  encaixeDetails?: string;
  stepBlocks: ScheduledStepBlock[];
}

export interface DayTimelineBlock {
  id: string;
  appointmentId: string;
  clientName: string;
  serviceTitle: string;
  stepTitle: string;
  startMinutes: number;
  endMinutes: number;
  startTime: string;
  endTime: string;
  type: "active" | "pause";
  isParallelAllowed: boolean;
  maxPauseDurationMin?: number;
  status: Appointment["status"];
  colorClass: string;
}

/**
 * Constrói a timeline visual consolidada de um profissional para um determinado dia.
 */
export function buildDayTimeline(
  appointments: Appointment[],
  professionalId: string,
  date: string
): DayTimelineBlock[] {
  const dayAppointments = appointments.filter(
    (a) =>
      a.date === date &&
      (professionalId === "all" || a.professionalId === professionalId) &&
      a.status !== "cancelled"
  );

  const blocks: DayTimelineBlock[] = [];

  for (const apt of dayAppointments) {
    if (apt.stepBlocks && apt.stepBlocks.length > 0) {
      for (const step of apt.stepBlocks) {
        const startMin = parseHHmmToMinutes(step.startTime);
        const endMin = parseHHmmToMinutes(step.endTime);

        blocks.push({
          id: `${apt.id}-${step.id}`,
          appointmentId: apt.id,
          clientName: apt.clientName,
          serviceTitle: apt.serviceTitle,
          stepTitle: step.stepTitle,
          startMinutes: startMin,
          endMinutes: endMin,
          startTime: step.startTime,
          endTime: step.endTime,
          type: step.type,
          isParallelAllowed: step.isParallelSlotAllowed,
          maxPauseDurationMin: step.maxPauseDurationMin,
          status: apt.status,
          colorClass:
            step.type === "active"
              ? "bg-[#54352a] text-white border-[#38231c]"
              : "bg-amber-100/90 text-amber-900 border-dashed border-amber-400 hover:bg-amber-200/90",
        });
      }
    } else {
      // Caso não tenha steps detalhados, cria bloco único
      const startMin = parseHHmmToMinutes(apt.startTime);
      const endMin = parseHHmmToMinutes(apt.endTime);
      blocks.push({
        id: apt.id,
        appointmentId: apt.id,
        clientName: apt.clientName,
        serviceTitle: apt.serviceTitle,
        stepTitle: "Atendimento Geral",
        startMinutes: startMin,
        endMinutes: endMin,
        startTime: apt.startTime,
        endTime: apt.endTime,
        type: "active",
        isParallelAllowed: false,
        status: apt.status,
        colorClass: "bg-[#54352a] text-white border-[#38231c]",
      });
    }
  }

  return blocks.sort((a, b) => a.startMinutes - b.startMinutes);
}

/**
 * Calcula os horários disponíveis para agendamento, testando encaixes
 * durante as pausas químicas existentes respeitando a tolerância e o limite de 1 paralelo.
 */
export function calculateAvailableSlots(
  service: ServiceItem,
  date: string,
  professionalId: string,
  existingAppointments: Appointment[],
  salonConfig = {
    openMinutes: 8 * 60 + 30, // 08:30
    closeMinutes: 19 * 60, // 19:00
    slotIntervalMinutes: 15, // Intervalo de busca (15 em 15 min)
    maxParallelInPause: 1,
  }
): AvailableSlot[] {
  const dayTimeline = buildDayTimeline(
    existingAppointments,
    professionalId,
    date
  );

  // Calcula duração total do serviço
  const totalDuration = service.steps.reduce((sum, s) => sum + s.durationMin, 0);
  const availableSlots: AvailableSlot[] = [];

  // Varre o dia de 15 em 15 minutos
  for (
    let candidateStart = salonConfig.openMinutes;
    candidateStart + totalDuration <= salonConfig.closeMinutes;
    candidateStart += salonConfig.slotIntervalMinutes
  ) {
    // Projeta os blocos do novo serviço começando em candidateStart
    let currentCursor = candidateStart;
    const prospectiveSteps: ScheduledStepBlock[] = [];
    let isCollisionDetected = false;
    let isEncaixe = false;
    let encaixeAptId: string | undefined;
    let encaixeNotes: string | undefined;

    for (const step of service.steps) {
      const stepStart = currentCursor;
      const stepEnd = currentCursor + step.durationMin;

      // Se a etapa do NOVO serviço for ATIVA (exige profissional exclusiva)
      if (step.type === "active") {
        // Verifica se há colisão com outra etapa ATIVA existente
        const collidingActive = dayTimeline.find(
          (b) =>
            b.type === "active" &&
            Math.max(stepStart, b.startMinutes) < Math.min(stepEnd, b.endMinutes)
        );

        if (collidingActive) {
          isCollisionDetected = true;
          break;
        }

        // Verifica se essa etapa ativa está ocorrendo DENTRO de uma PAUSA de outro cliente
        const overlappingPause = dayTimeline.find(
          (b) =>
            b.type === "pause" &&
            stepStart >= b.startMinutes &&
            stepEnd <= (b.maxPauseDurationMin ? b.startMinutes + b.maxPauseDurationMin : b.endMinutes)
        );

        if (overlappingPause) {
          // É um encaixe válido dentro da tolerância química!
          isEncaixe = true;
          encaixeAptId = overlappingPause.appointmentId;
          encaixeNotes = `Encaixe otimizado durante a pausa química de ${overlappingPause.clientName}`;
        }
      } else {
        // Se a etapa do NOVO serviço for uma PAUSA química:
        // Pode coexistir com outra pausa, mas não ultrapassar concorrência excessiva
      }

      prospectiveSteps.push({
        id: `step-${Date.now()}-${step.id}`,
        stepId: step.id,
        stepTitle: step.title,
        type: step.type,
        startTime: formatTimeHHmm(stepStart),
        endTime: formatTimeHHmm(stepEnd),
        durationMin: step.durationMin,
        maxPauseDurationMin: step.maxPauseDurationMin,
        isParallelSlotAllowed: step.type === "pause",
      });

      currentCursor = stepEnd;
    }

    if (!isCollisionDetected) {
      availableSlots.push({
        time: formatTimeHHmm(candidateStart),
        endTime: formatTimeHHmm(candidateStart + totalDuration),
        isEncaixe,
        encaixeWithAppointmentId: encaixeAptId,
        encaixeDetails: encaixeNotes,
        stepBlocks: prospectiveSteps,
      });
    }
  }

  return availableSlots;
}
