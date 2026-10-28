export type AppointmentStatus =
  | "pending_triage"
  | "pending_proposal"
  | "proposal_sent"
  | "confirmed"
  | "in_service"
  | "completed"
  | "cancelled";

export interface ScheduledStepBlock {
  id: string;
  stepId: string;
  stepTitle: string;
  type: "active" | "pause";
  startTime: string; // ISO ou HH:mm
  endTime: string;
  durationMin: number;
  maxPauseDurationMin?: number;
  isParallelSlotAllowed: boolean;
  parallelAppointmentId?: string; // ID de outro agendamento encaixado nesta pausa
}

export interface Appointment {
  id: string;
  orgId: string;
  professionalId: string;
  professionalName: string;
  serviceId: string;
  serviceTitle: string;
  
  // Cliente
  clientId?: string;
  clientName: string;
  clientPhone: string;
  clientEmail?: string;

  // Horários e Status
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  totalDurationMin: number;
  status: AppointmentStatus;
  
  // Detalhamento de Etapas (para o motor de intercalamento)
  stepBlocks: ScheduledStepBlock[];

  // Finanças
  price: number;
  paymentMethod?: "pix" | "credit_card" | "debit_card" | "cash";
  paymentStatus: "pending" | "paid" | "partial";
  
  // Relacionamentos
  triageSubmissionId?: string;
  proposalId?: string;
  proposalExpiresAt?: string;

  notes?: string;
  createdAt: string;
}
