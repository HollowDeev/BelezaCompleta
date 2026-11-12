import { Appointment } from "@/types/appointment";

export interface ChronologicalDayAccordion {
  date: string;
  appointments: Appointment[];
  count: number;
  totalRevenue: number;
}

/**
 * Agrupa agendamentos cronologicamente por data para visualização em accordions.
 */
export function groupAppointmentsChronologically(
  appointments: Appointment[]
): ChronologicalDayAccordion[] {
  if (!appointments || appointments.length === 0) return [];
  const groups: Record<string, ChronologicalDayAccordion> = {};

  for (const apt of appointments) {
    if (!groups[apt.date]) {
      groups[apt.date] = {
        date: apt.date,
        appointments: [],
        count: 0,
        totalRevenue: 0,
      };
    }
    groups[apt.date].appointments.push(apt);
    groups[apt.date].count++;
    groups[apt.date].totalRevenue += apt.finalPrice || apt.price || 0;
  }

  return Object.values(groups).sort((a, b) => a.date.localeCompare(b.date));
}
