import { Appointment } from "@/types/appointment";

/**
 * Retorna contagem de agendamentos pendentes de confirmação sem triagem realizada.
 */
export function getPendingUntriagedBadgeCount(appointments: Appointment[]): number {
  if (!appointments || !Array.isArray(appointments)) return 0;
  return appointments.filter(
    (a) => a.status === "pending_confirmation" && !a.triageSubmissionId
  ).length;
}
