export type BlackFridayDiscountType = "fixed" | "percentage" | "manual" | "progressive";

export interface BlackFridayServiceConfig {
  serviceId: string;
  discountType: BlackFridayDiscountType;
  discountValue?: number; // Valor de desconto em R$ (ex: 50) ou % (ex: 20)
  blackPrice?: number; // Preço promocional manual direto (ex: 180)
}

export interface ProgressiveDiscountTier {
  minServices: number; // Quantidade mínima de serviços combinados (ex: 2)
  discountPercent: number; // Percentual de desconto a aplicar (ex: 15)
}

export interface ProgressiveDiscountConfig {
  tiers: ProgressiveDiscountTier[];
}

export interface BlackFridayCampaign {
  id: string;
  orgId: string;
  name: string;
  isActive: boolean;
  startsAt?: string | null; // ISO string com timezone
  endsAt?: string | null; // ISO string com timezone
  restrictSchedule: boolean;
  restrictedDates: string[]; // array de 'YYYY-MM-DD'
  servicesConfig: BlackFridayServiceConfig[];
  progressiveDiscount?: ProgressiveDiscountConfig | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface BlackFridayCampaignRow {
  id: string;
  org_id: string;
  name: string;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  restrict_schedule: boolean;
  restricted_dates: string[];
  services_config: {
    service_id?: string;
    serviceId?: string;
    discount_type?: BlackFridayDiscountType;
    discountType?: BlackFridayDiscountType;
    discount_value?: number;
    discountValue?: number;
    black_price?: number;
    blackPrice?: number;
  }[];
  progressive_discount: {
    tiers: {
      min_services?: number;
      minServices?: number;
      discount_percent?: number;
      discountPercent?: number;
    }[];
  } | null;
  created_at: string;
  updated_at: string;
}
