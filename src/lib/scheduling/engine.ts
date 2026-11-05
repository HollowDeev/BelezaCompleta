import { ServiceItem, ServiceStep } from "@/types/service";
import { Appointment, ScheduledStepBlock } from "@/types/appointment";
import { ProposalTechnicalStep } from "@/types/proposal";
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
      a.status !== "cancelled" &&
      a.status !== "pending_proposal"
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
export type SlotStatus = "available" | "encaixe" | "occupied" | "break" | "past";

export interface DaySlotItem {
  time: string; // HH:mm
  endTime: string; // HH:mm
  status: SlotStatus;
  isAvailable: boolean; // true se 'available' ou 'encaixe'
  isEncaixe: boolean;
  encaixeWithAppointmentId?: string;
  encaixeDetails?: string;
  conflictReason?: string;
  stepBlocks?: ScheduledStepBlock[];
}

export interface SalonScheduleConfig {
  openMinutes?: number; // 08:30 (510 min)
  closeMinutes?: number; // 19:00 (1140 min)
  slotIntervalMinutes?: number; // Intervalo de busca (15 ou 30 min)
  maxParallelInPause?: number;
  breakStartMinutes?: number; // Pausa de almoço início em minutos
  breakEndMinutes?: number; // Pausa de almoço fim em minutos
}

/**
 * Calcula a grade completa de horários de um dia para um serviço,
 * indicando para cada horário se está disponível, se é encaixe durante pausa química,
 * ou se está ocupado/bloqueado por agendamento ativo ou almoço.
 */
export function calculateDaySlotGrid(
  service: ServiceItem,
  date: string,
  professionalId: string,
  existingAppointments: Appointment[],
  salonConfig: SalonScheduleConfig = {
    openMinutes: 8 * 60 + 30, // 08:30
    closeMinutes: 19 * 60, // 19:00
    slotIntervalMinutes: 30,
    maxParallelInPause: 1,
  }
): DaySlotItem[] {
  const config = {
    openMinutes: salonConfig.openMinutes ?? 8 * 60 + 30,
    closeMinutes: salonConfig.closeMinutes ?? 19 * 60,
    slotIntervalMinutes: salonConfig.slotIntervalMinutes ?? 30,
    maxParallelInPause: salonConfig.maxParallelInPause ?? 1,
    breakStartMinutes: salonConfig.breakStartMinutes,
    breakEndMinutes: salonConfig.breakEndMinutes,
  };

  const dayTimeline = buildDayTimeline(
    existingAppointments,
    professionalId,
    date
  );

  const totalDuration = service.steps.reduce(
    (sum, s) => sum + (Number(s.durationMin) || 0),
    0
  );

  const todayStr = new Date().toISOString().split("T")[0];
  const isToday = date === todayStr;
  const now = new Date();
  const currentMinutesToday = isToday ? now.getHours() * 60 + now.getMinutes() : -1;

  // Coleta os minutos candidatos do dia:
  // 1. Minutos regulares com base no intervalo
  const candidateMinutesSet = new Set<number>();
  for (
    let m = config.openMinutes;
    m + totalDuration <= config.closeMinutes;
    m += config.slotIntervalMinutes
  ) {
    candidateMinutesSet.add(m);
  }

  // 2. Início de qualquer pausa química existente no dia (permitindo encaixe exatamente no início da pausa)
  for (const block of dayTimeline) {
    if (block.type === "pause") {
      const pauseStart = block.startMinutes;
      if (
        pauseStart >= config.openMinutes &&
        pauseStart + totalDuration <= config.closeMinutes
      ) {
        candidateMinutesSet.add(pauseStart);
      }
    }
  }

  const sortedCandidates = Array.from(candidateMinutesSet).sort((a, b) => a - b);
  const grid: DaySlotItem[] = [];

  for (const candidateStart of sortedCandidates) {
    // 1. Checa se o horário já passou hoje
    if (isToday && candidateStart <= currentMinutesToday) {
      grid.push({
        time: formatTimeHHmm(candidateStart),
        endTime: formatTimeHHmm(candidateStart + totalDuration),
        status: "past",
        isAvailable: false,
        isEncaixe: false,
        conflictReason: "Horário já passou",
      });
      continue;
    }

    let currentCursor = candidateStart;
    const prospectiveSteps: ScheduledStepBlock[] = [];
    let isCollisionDetected = false;
    let collisionType: "break" | "occupied" = "occupied";
    let collisionReason: string | undefined;
    let isEncaixe = false;
    let encaixeAptId: string | undefined;
    let encaixeNotes: string | undefined;

    for (const step of service.steps) {
      const stepStart = currentCursor;
      const stepEnd = currentCursor + (Number(step.durationMin) || 15);

      // Colisão com almoço da profissional
      if (
        config.breakStartMinutes !== undefined &&
        config.breakEndMinutes !== undefined &&
        Math.max(stepStart, config.breakStartMinutes) <
          Math.min(stepEnd, config.breakEndMinutes)
      ) {
        isCollisionDetected = true;
        collisionType = "break";
        collisionReason = "Horário de almoço / intervalo";
        break;
      }

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
          collisionType = "occupied";
          collisionReason = `Horário ocupado (em atendimento com ${collidingActive.clientName})`;
          break;
        }

        // Verifica se essa etapa ativa está ocorrendo DENTRO de uma PAUSA química de outro cliente
        const overlappingPause = dayTimeline.find(
          (b) =>
            b.type === "pause" &&
            stepStart >= b.startMinutes &&
            stepEnd <=
              (b.maxPauseDurationMin
                ? b.startMinutes + b.maxPauseDurationMin
                : b.endMinutes)
        );

        if (overlappingPause) {
          isEncaixe = true;
          encaixeAptId = overlappingPause.appointmentId;
          encaixeNotes = `Encaixe otimizado durante a pausa química de ${overlappingPause.clientName}`;
        }
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

    if (isCollisionDetected) {
      grid.push({
        time: formatTimeHHmm(candidateStart),
        endTime: formatTimeHHmm(candidateStart + totalDuration),
        status: collisionType,
        isAvailable: false,
        isEncaixe: false,
        conflictReason: collisionReason || "Horário indisponível",
      });
    } else {
      grid.push({
        time: formatTimeHHmm(candidateStart),
        endTime: formatTimeHHmm(candidateStart + totalDuration),
        status: isEncaixe ? "encaixe" : "available",
        isAvailable: true,
        isEncaixe,
        encaixeWithAppointmentId: encaixeAptId,
        encaixeDetails: encaixeNotes,
        stepBlocks: prospectiveSteps,
      });
    }
  }

  return grid;
}

export function calculateAvailableSlots(
  service: ServiceItem,
  date: string,
  professionalId: string,
  existingAppointments: Appointment[],
  salonConfig: SalonScheduleConfig = {
    openMinutes: 8 * 60 + 30, // 08:30
    closeMinutes: 19 * 60, // 19:00
    slotIntervalMinutes: 15,
    maxParallelInPause: 1,
  }
): AvailableSlot[] {
  const grid = calculateDaySlotGrid(
    service,
    date,
    professionalId,
    existingAppointments,
    salonConfig
  );

  return grid
    .filter((slot) => slot.isAvailable && slot.stepBlocks)
    .map((slot) => ({
      time: slot.time,
      endTime: slot.endTime,
      isEncaixe: slot.isEncaixe,
      encaixeWithAppointmentId: slot.encaixeWithAppointmentId,
      encaixeDetails: slot.encaixeDetails,
      stepBlocks: slot.stepBlocks!,
    }));
}

export interface ProposalFeasibilityResult {
  isFeasible: boolean;
  conflictReason?: string;
  totalDurationMin: number;
  endTime: string;
  prospectiveSteps?: ScheduledStepBlock[];
}

/**
 * Valida a viabilidade de uma proposta de agendamento em relação à agenda real do salão,
 * verificando passos ativos contra passos ativos de outros agendamentos e horários de fechamento/almoço.
 */
export function validateProposalScheduleFeasibility({
  date,
  startTime,
  technicalSteps,
  existingAppointments,
  salonConfig = {
    openMinutes: 8 * 60 + 30, // 08:30
    closeMinutes: 19 * 60, // 19:00
  },
  ignoreAppointmentId,
  ignoreTriageSubmissionId,
  professionalId = "all",
}: {
  date: string;
  startTime: string;
  technicalSteps: ProposalTechnicalStep[];
  existingAppointments: Appointment[];
  salonConfig?: SalonScheduleConfig;
  ignoreAppointmentId?: string;
  ignoreTriageSubmissionId?: string;
  professionalId?: string;
}): ProposalFeasibilityResult {
  if (!startTime || !date || !technicalSteps || technicalSteps.length === 0) {
    return {
      isFeasible: false,
      conflictReason: "Data, horário ou etapas do procedimento não informados.",
      totalDurationMin: 0,
      endTime: startTime || "00:00",
    };
  }

  const startMin = parseHHmmToMinutes(startTime);
  if (isNaN(startMin)) {
    return {
      isFeasible: false,
      conflictReason: "Horário inicial inválido.",
      totalDurationMin: 0,
      endTime: startTime,
    };
  }

  const config = {
    openMinutes: salonConfig.openMinutes ?? 8 * 60 + 30,
    closeMinutes: salonConfig.closeMinutes ?? 19 * 60,
    breakStartMinutes: salonConfig.breakStartMinutes,
    breakEndMinutes: salonConfig.breakEndMinutes,
  };

  const totalDuration = technicalSteps.reduce(
    (sum, s) => sum + (Number(s.durationMin) || 0),
    0
  );
  const endMin = startMin + totalDuration;
  const endTimeStr = formatTimeHHmm(endMin);

  if (startMin < config.openMinutes) {
    return {
      isFeasible: false,
      conflictReason: `O horário de início (${startTime}) é anterior à abertura do salão (${formatTimeHHmm(config.openMinutes)}).`,
      totalDurationMin: totalDuration,
      endTime: endTimeStr,
    };
  }

  if (endMin > config.closeMinutes) {
    return {
      isFeasible: false,
      conflictReason: `O término do procedimento (${endTimeStr}) ultrapassa o fechamento do salão (${formatTimeHHmm(config.closeMinutes)}). Duração total: ${totalDuration} min.`,
      totalDurationMin: totalDuration,
      endTime: endTimeStr,
    };
  }

  // Filtra agendamentos existentes no mesmo dia
  const relevantAppointments = existingAppointments.filter(
    (a) =>
      a.date === date &&
      a.status !== "cancelled" &&
      a.status !== "pending_proposal" &&
      (!ignoreAppointmentId || a.id !== ignoreAppointmentId) &&
      (!ignoreTriageSubmissionId || a.triageSubmissionId !== ignoreTriageSubmissionId)
  );

  const dayTimeline = buildDayTimeline(
    relevantAppointments,
    professionalId,
    date
  );

  let currentCursor = startMin;
  const prospectiveSteps: ScheduledStepBlock[] = [];

  for (const step of technicalSteps) {
    const stepDuration = Number(step.durationMin) || 0;
    const stepStart = currentCursor;
    const stepEnd = currentCursor + stepDuration;

    // Conflito com almoço
    if (
      config.breakStartMinutes !== undefined &&
      config.breakEndMinutes !== undefined &&
      Math.max(stepStart, config.breakStartMinutes) <
        Math.min(stepEnd, config.breakEndMinutes)
    ) {
      return {
        isFeasible: false,
        conflictReason: `A etapa "${step.title}" coincide com o intervalo/almoço da profissional (${formatTimeHHmm(config.breakStartMinutes)} às ${formatTimeHHmm(config.breakEndMinutes)}).`,
        totalDurationMin: totalDuration,
        endTime: endTimeStr,
      };
    }

    if (step.type === "active") {
      // Verifica se colide com etapa ATIVA de outro cliente
      const collidingActive = dayTimeline.find(
        (b) =>
          b.type === "active" &&
          Math.max(stepStart, b.startMinutes) < Math.min(stepEnd, b.endMinutes)
      );

      if (collidingActive) {
        return {
          isFeasible: false,
          conflictReason: `Conflito técnico na etapa "${step.title}" (${formatTimeHHmm(stepStart)} - ${formatTimeHHmm(stepEnd)}): a profissional já está em atendimento ativo com ${collidingActive.clientName} (${collidingActive.stepTitle} das ${collidingActive.startTime} às ${collidingActive.endTime}).`,
          totalDurationMin: totalDuration,
          endTime: endTimeStr,
        };
      }
    }

    prospectiveSteps.push({
      id: `prop-step-${Date.now()}-${step.id}`,
      stepId: step.id,
      stepTitle: step.title,
      type: step.type,
      startTime: formatTimeHHmm(stepStart),
      endTime: formatTimeHHmm(stepEnd),
      durationMin: stepDuration,
      isParallelSlotAllowed: step.type === "pause",
    });

    currentCursor = stepEnd;
  }

  return {
    isFeasible: true,
    totalDurationMin: totalDuration,
    endTime: endTimeStr,
    prospectiveSteps,
  };
}
