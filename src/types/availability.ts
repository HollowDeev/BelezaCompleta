export interface AvailableDay {
  id: string;
  orgId: string;
  professionalId: string;
  date: string; // 'YYYY-MM-DD'
  startTime: string; // 'HH:MM'
  endTime: string; // 'HH:MM'
  breakStart?: string;
  breakEnd?: string;
  isOpen: boolean;
  maxClients: number;
  slotIntervalMin: number;
  customNotes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type PreferredPeriod = 'manha' | 'tarde' | 'noite' | 'qualquer' | 'especifico';
export type PreReservationStatus = 'pending' | 'approved' | 'declined' | 'converted';

export interface PreReservation {
  id: string;
  orgId: string;
  professionalId: string;
  serviceId?: string;
  serviceName?: string; // joined
  clientName: string;
  clientPhone: string;
  clientEmail?: string;
  requestedDate: string; // 'YYYY-MM-DD'
  preferredPeriod: PreferredPeriod;
  preferredTime?: string;
  triageSubmissionId?: string;
  status: PreReservationStatus;
  convertedAppointmentId?: string;
  adminNotes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface AvailabilityTemplate {
  id: string;
  orgId: string;
  professionalId: string;
  name: string;
  daysConfig: {
    dayOfWeek: number; // 0=Dom, 1=Seg, ..., 6=Sab
    startTime: string;
    endTime: string;
    breakStart?: string;
    breakEnd?: string;
    isEnabled: boolean;
  }[];
  createdAt?: string;
}

export interface DayAvailabilityConfig {
  date: string;
  startTime: string;
  endTime: string;
  breakStart?: string;
  breakEnd?: string;
  customNotes?: string;
}
