export type UserRole = "super_admin" | "salon_owner" | "professional" | "client";

export type DashboardMode = "minimalist" | "intermediary" | "advanced";

export interface SalonOrganization {
  id: string;
  name: string;
  slug: string;
  tagline: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  logoUrl?: string;
  theme: {
    primaryColor: string;
    accentColor: string;
  };
  settings: {
    isSharedMode: boolean; // Super Admin toggle: true = agenda/serviços compartilhados, false = isolado
    allowSelfRegistration: boolean;
    requireTriageApprovalHours: number; // ex: 36h
    pixDiscountPercent: number; // ex: 5%
    maxParallelInPause: number; // ex: 1
    dailyTargetRevenue?: number; // Meta diária de faturamento (ex: R$ 1500)
  };
  createdAt: string;
}

export interface UserProfile {
  id: string;
  orgId: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  specialty?: string;
  bio?: string;
  avatarUrl?: string;
  dashboardMode: DashboardMode;
  isActive: boolean;
  commissionRate?: number; // Para cálculo no modo avançado
}
