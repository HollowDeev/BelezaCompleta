export interface SalonClient {
  id: string;
  orgId?: string;
  name: string;
  phone: string;
  password?: string;
  email?: string;
  notes?: string;
  createdAt: string;
  lastVisitAt?: string;
  totalAppointments?: number;
  totalSpent?: number;
  lastServiceTitle?: string;
}

export interface ClientAuthResponse {
  client: SalonClient;
  token?: string;
}
