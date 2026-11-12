import type { AppointmentProcedureItem } from "./appointment";

export type StepType = "active" | "pause";
export type ServicePriceType = "fixed" | "starting_at";

export interface ServiceStep {
  id: string;
  order: number;
  title: string;
  type: StepType;
  durationMin: number; // Duração nominal (ou mínima se for pausa)
  maxPauseDurationMin?: number; // Tolerância máxima da pausa (ex: pausa de 30m podendo ficar até 50m)
  description?: string;
  requiresExclusiveAttention: boolean; // true para ativo, false para pausa
}

export interface ServiceProductCost {
  id: string;
  name: string; // Ex: Pó descolorante Blondor, Matizador Wella, Ampola Nutritiva
  estimatedCost: number; // Ex: R$ 35,00
  unit: string;
}

export interface ServiceItem {
  id: string;
  orgId: string;
  professionalId: string; // ID da profissional (Gleicy ou parceira)
  title: string;
  slug: string;
  category: "transformacao" | "mechas" | "corte" | "tratamento" | "outros";
  description: string;
  price: number;
  promotionalPrice?: number;
  priceType?: ServicePriceType; // 'fixed' | 'starting_at' (default: 'fixed')
  maxPrice?: number; // Limite superior opcional para faixas de preço
  imageUrl?: string;
  requiresTriage: boolean;
  triageFormId?: string; // Questionário vinculado
  steps: ServiceStep[];
  procedures?: AppointmentProcedureItem[];
  productCosts?: ServiceProductCost[]; // Para cálculo no dashboard avançado
  isActive: boolean;
}
