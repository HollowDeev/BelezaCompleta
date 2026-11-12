import { AppointmentProcedureItem } from "@/types/appointment";

/**
 * Calcula o valor total a cobrar dos procedimentos, ignorando itens marcados como inclusos (avulsos sem custo adicional).
 */
export function calculateProceduresBill(items: AppointmentProcedureItem[]): number {
  if (!items || !Array.isArray(items)) return 0;
  return items.reduce(
    (acc, item) => acc + (item.isIncluded ? 0 : Math.max(0, item.price || 0)),
    0
  );
}

/**
 * Calcula a duração total somada de todos os procedimentos (em minutos).
 */
export function calculateProceduresDuration(items: AppointmentProcedureItem[]): number {
  if (!items || !Array.isArray(items)) return 0;
  return items.reduce((acc, item) => acc + (Number(item.durationMin) || 0), 0);
}
