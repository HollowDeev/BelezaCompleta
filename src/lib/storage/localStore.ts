import { SalonOrganization, UserProfile, DashboardMode } from "@/types/salon";
import { ServiceItem, ServiceStep } from "@/types/service";
import { TriageForm, TriageSubmission } from "@/types/triage";
import { LuxuryProposal, ProposalTemplate } from "@/types/proposal";
import { Appointment } from "@/types/appointment";
import { SalonClient } from "@/types/client";
import {
  AvailableDay,
  PreReservation,
  AvailabilityTemplate,
  DayAvailabilityConfig,
  PreReservationStatus,
} from "@/types/availability";
import {
  initialOrganization,
  initialProfiles,
  initialServices,
  initialTriageForms,
  initialProposals,
  initialProposalTemplates,
  initialAppointments,
  initialTriageSubmissions,
  initialClients,
} from "@/lib/scheduling/mockData";

const STORAGE_KEY_PREFIX = "glaicy_agenda_v2_";

function getStorageItem<T>(key: string, defaultValue: T): T {
  if (typeof window === "undefined") return defaultValue;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PREFIX + key);
    return raw ? JSON.parse(raw) : defaultValue;
  } catch (err) {
    console.error(`Error reading ${key} from localStorage`, err);
    return defaultValue;
  }
}

function setStorageItem<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY_PREFIX + key, JSON.stringify(value));
  } catch (err) {
    console.error(`Error saving ${key} to localStorage`, err);
  }
}

export class SalonStore {
  // Organização
  static getOrganization(): SalonOrganization {
    return getStorageItem("organization", initialOrganization);
  }

  static updateOrganization(org: Partial<SalonOrganization>): SalonOrganization {
    const current = this.getOrganization();
    const updated = { ...current, ...org, settings: { ...current.settings, ...(org.settings || {}) } };
    setStorageItem("organization", updated);
    return updated;
  }

  // Perfis
  static getProfiles(): UserProfile[] {
    return getStorageItem("profiles", initialProfiles);
  }

  static getCurrentUser(): UserProfile {
    const profiles = this.getProfiles();
    return profiles.find((p) => p.role === "salon_owner") || profiles[0];
  }

  static updateCurrentUserDashboardMode(mode: DashboardMode): void {
    const profiles = this.getProfiles();
    const updated = profiles.map((p) =>
      p.role === "salon_owner" || p.id === "58f26242-1e53-432e-b924-dea25ee2068a" || p.id === "user-gleicy-ronha"
        ? { ...p, dashboardMode: mode }
        : p
    );
    setStorageItem("profiles", updated);
  }

  // Serviços
  static getServices(): ServiceItem[] {
    return getStorageItem("services", initialServices);
  }

  static saveService(service: ServiceItem): void {
    const list = this.getServices();
    const index = list.findIndex((s) => s.id === service.id);
    if (index >= 0) {
      list[index] = service;
    } else {
      list.push(service);
    }
    setStorageItem("services", list);
  }

  static deleteService(serviceId: string): void {
    const list = this.getServices().filter((s) => s.id !== serviceId);
    setStorageItem("services", list);
  }

  // Triagens & Questionários
  static getTriageForms(): TriageForm[] {
    return getStorageItem("triage_forms", initialTriageForms);
  }

  static saveTriageForm(form: TriageForm): void {
    const list = this.getTriageForms();
    const index = list.findIndex((f) => f.id === form.id);
    if (index >= 0) {
      list[index] = form;
    } else {
      list.push(form);
    }
    setStorageItem("triage_forms", list);
  }

  static deleteTriageForm(formId: string): void {
    const list = this.getTriageForms().filter((f) => f.id !== formId);
    setStorageItem("triage_forms", list);
  }

  /**
   * Recurso de Espelhar / Clonar questionário de um serviço para outro
   */
  static mirrorTriageForm(sourceFormId: string, targetService: ServiceItem): TriageForm {
    const forms = this.getTriageForms();
    const source = forms.find((f) => f.id === sourceFormId) || forms[0];

    const clonedForm: TriageForm = {
      ...source,
      id: `form-triage-${targetService.slug}-${Date.now()}`,
      title: `Triagem para ${targetService.title}`,
      description: `Avaliação diagnóstica baseada em ${source.title}, adaptada para ${targetService.title}`,
      targetServiceId: targetService.id,
      isTemplate: false,
      questions: source.questions.map((q) => ({
        ...q,
        id: `q-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      })),
      createdAt: new Date().toISOString(),
    };

    this.saveTriageForm(clonedForm);

    // Vincula o questionário clonado ao serviço de destino
    this.saveService({
      ...targetService,
      requiresTriage: true,
      triageFormId: clonedForm.id,
    });

    return clonedForm;
  }

  // Submissões de Triagem
  static getTriageSubmissions(): TriageSubmission[] {
    return getStorageItem("triage_submissions", initialTriageSubmissions);
  }

  static saveTriageSubmission(sub: TriageSubmission): void {
    const list = this.getTriageSubmissions();
    const index = list.findIndex((s) => s.id === sub.id);
    if (index >= 0) {
      list[index] = sub;
    } else {
      list.unshift(sub);
    }
    setStorageItem("triage_submissions", list);
  }

  // Modelos & Templates de Propostas
  static getProposalTemplates(): ProposalTemplate[] {
    return getStorageItem("proposal_templates", initialProposalTemplates);
  }

  static saveProposalTemplate(tpl: ProposalTemplate): void {
    const list = this.getProposalTemplates();
    const index = list.findIndex((t) => t.id === tpl.id);
    if (index >= 0) {
      list[index] = tpl;
    } else {
      list.push(tpl);
    }
    setStorageItem("proposal_templates", list);
  }

  static deleteProposalTemplate(id: string): void {
    const list = this.getProposalTemplates().filter((t) => t.id !== id);
    setStorageItem("proposal_templates", list);
  }

  // Propostas Comerciais
  static getProposals(): LuxuryProposal[] {
    return getStorageItem("proposals", initialProposals);
  }

  static getProposalById(id: string): LuxuryProposal | undefined {
    return this.getProposals().find((p) => p.id === id);
  }

  static saveProposal(prop: LuxuryProposal): void {
    const list = this.getProposals();
    const index = list.findIndex((p) => p.id === prop.id);
    if (index >= 0) {
      list[index] = prop;
    } else {
      list.unshift(prop);
    }
    setStorageItem("proposals", list);
  }

  // Agendamentos
  static getAppointments(): Appointment[] {
    const today = (() => {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    })();
    const list = getStorageItem("appointments", initialAppointments);
    // Assegura que Isa Franca (14:00 às 15:45) e Débora Santos (14:30 às 15:40) estejam alinhados com o dia atual para teste da timeline
    return list.map((apt) => {
      let updatedApt = { ...apt };
      if ((apt.id === "apt-isa-franca" || apt.id === "apt-debora-transformacao") && apt.date === "2026-10-17") {
        updatedApt.date = today;
      }
      if (apt.id === "apt-isa-franca" && apt.startTime !== "14:00") {
        const canonical = initialAppointments.find((a) => a.id === "apt-isa-franca");
        if (canonical) updatedApt = { ...canonical, date: updatedApt.date };
      }
      if (apt.id === "apt-debora-transformacao" && apt.startTime !== "14:30") {
        const canonical = initialAppointments.find((a) => a.id === "apt-debora-transformacao");
        if (canonical) updatedApt = { ...canonical, date: updatedApt.date };
      }
      return updatedApt;
    });
  }

  static saveAppointment(apt: Appointment): void {
    const list = this.getAppointments();
    const index = list.findIndex((a) => a.id === apt.id);
    if (index >= 0) {
      list[index] = apt;
    } else {
      list.unshift(apt);
    }
    setStorageItem("appointments", list);
  }

  /**
   * Aprovação de proposta pela cliente:
   * Atualiza status da proposta para 'approved' e confirma a pré-reserva na agenda!
   */
  static approveProposal(proposalId: string): { proposal: LuxuryProposal; appointment?: Appointment } {
    const proposals = this.getProposals();
    const propIndex = proposals.findIndex((p) => p.id === proposalId);
    if (propIndex === -1) throw new Error("Proposta não encontrada");

    proposals[propIndex].status = "approved";
    proposals[propIndex].approvedAt = new Date().toISOString();
    setStorageItem("proposals", proposals);

    // Atualiza agendamento correspondente
    const appointments = this.getAppointments();
    const aptIndex = appointments.findIndex((a) => a.proposalId === proposalId);
    let updatedApt: Appointment | undefined;

    if (aptIndex >= 0) {
      appointments[aptIndex].status = "confirmed";
      appointments[aptIndex].paymentStatus = "paid";
      updatedApt = appointments[aptIndex];
      setStorageItem("appointments", appointments);
    }

    // Atualiza submissão de triagem se houver
    const submissions = this.getTriageSubmissions();
    const subIndex = submissions.findIndex((s) => s.proposalId === proposalId);
    if (subIndex >= 0) {
      submissions[subIndex].status = "approved";
      setStorageItem("triage_submissions", submissions);
    }

    return { proposal: proposals[propIndex], appointment: updatedApt };
  }

  // Clientes
  static getClients(): SalonClient[] {
    return getStorageItem("clients", initialClients);
  }

  static getClientByPhone(phone: string): SalonClient | undefined {
    const clean = phone.replace(/\D/g, "");
    return this.getClients().find((c) => c.phone.replace(/\D/g, "") === clean);
  }

  static saveClient(client: SalonClient): SalonClient {
    const list = this.getClients();
    const clean = client.phone.replace(/\D/g, "");
    const index = list.findIndex((c) => c.phone.replace(/\D/g, "") === clean || c.id === client.id);
    if (index >= 0) {
      list[index] = { ...list[index], ...client };
      setStorageItem("clients", list);
      return list[index];
    } else {
      const newClient: SalonClient = {
        ...client,
        id: client.id || `cli-${Date.now()}`,
        createdAt: client.createdAt || new Date().toISOString(),
      };
      list.unshift(newClient);
      setStorageItem("clients", list);
      return newClient;
    }
  }

  static getActiveClient(): SalonClient | null {
    return getStorageItem<SalonClient | null>("active_client", null);
  }

  static setActiveClient(client: SalonClient | null): void {
    setStorageItem("active_client", client);
  }

  // Disponibilidade e Abertura de Agenda
  static getAvailableDays(
    professionalId: string,
    startDate?: string,
    endDate?: string
  ): AvailableDay[] {
    const list = getStorageItem<AvailableDay[]>("available_days", initialAvailableDays);
    return list.filter((d) => {
      if (d.professionalId && professionalId && d.professionalId !== professionalId) {
        // Aceita se for compatível ou ID padrão
        const isMatch = d.professionalId === professionalId || 
          d.professionalId === "58f26242-1e53-432e-b924-dea25ee2068a" ||
          d.professionalId === "user-gleicy-ronha";
        if (!isMatch) return false;
      }
      if (startDate && d.date < startDate) return false;
      if (endDate && d.date > endDate) return false;
      return true;
    });
  }

  static saveAvailableDay(
    day: DayAvailabilityConfig & { professionalId: string; orgId: string }
  ): AvailableDay {
    const list = getStorageItem<AvailableDay[]>("available_days", initialAvailableDays);
    const existingIndex = list.findIndex(
      (d) => d.date === day.date && (d.professionalId === day.professionalId || !d.professionalId)
    );

    const updated: AvailableDay = {
      id: existingIndex >= 0 ? list[existingIndex].id : `avail-${Date.now()}-${day.date}`,
      orgId: day.orgId,
      professionalId: day.professionalId,
      date: day.date,
      startTime: day.startTime,
      endTime: day.endTime,
      breakStart: day.breakStart,
      breakEnd: day.breakEnd,
      isOpen: true,
      maxClients: 8,
      slotIntervalMin: 15,
      customNotes: day.customNotes,
      updatedAt: new Date().toISOString(),
    };

    if (existingIndex >= 0) {
      list[existingIndex] = updated;
    } else {
      list.push(updated);
    }

    setStorageItem("available_days", list);
    return updated;
  }

  static saveAvailableDaysBatch(
    days: (DayAvailabilityConfig & { professionalId: string; orgId: string })[]
  ): number {
    const list = getStorageItem<AvailableDay[]>("available_days", initialAvailableDays);
    let count = 0;

    days.forEach((day) => {
      const existingIndex = list.findIndex(
        (d) => d.date === day.date && (d.professionalId === day.professionalId || !d.professionalId)
      );

      const updated: AvailableDay = {
        id: existingIndex >= 0 ? list[existingIndex].id : `avail-${Date.now()}-${day.date}-${count}`,
        orgId: day.orgId,
        professionalId: day.professionalId,
        date: day.date,
        startTime: day.startTime,
        endTime: day.endTime,
        breakStart: day.breakStart,
        breakEnd: day.breakEnd,
        isOpen: true,
        maxClients: 8,
        slotIntervalMin: 15,
        customNotes: day.customNotes,
        updatedAt: new Date().toISOString(),
      };

      if (existingIndex >= 0) {
        list[existingIndex] = updated;
      } else {
        list.push(updated);
      }
      count++;
    });

    setStorageItem("available_days", list);
    return count;
  }

  static closeAvailableDay(professionalId: string, date: string): boolean {
    const list = getStorageItem<AvailableDay[]>("available_days", initialAvailableDays);
    const existingIndex = list.findIndex(
      (d) => d.date === date && (d.professionalId === professionalId || !d.professionalId)
    );

    if (existingIndex >= 0) {
      list[existingIndex].isOpen = false;
      list[existingIndex].updatedAt = new Date().toISOString();
      setStorageItem("available_days", list);
      return true;
    }
    return false;
  }

  // Pré-Reservas
  static getPreReservations(orgId: string, status?: string): PreReservation[] {
    const list = getStorageItem<PreReservation[]>("pre_reservations", initialPreReservations);
    if (!status) return list;
    return list.filter((p) => p.status === status);
  }

  static createPreReservation(
    pr: Omit<PreReservation, "id" | "createdAt" | "updatedAt">
  ): PreReservation {
    const list = getStorageItem<PreReservation[]>("pre_reservations", initialPreReservations);
    const newPr: PreReservation = {
      ...pr,
      id: `pr-${Date.now()}`,
      status: "pending",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    list.unshift(newPr);
    setStorageItem("pre_reservations", list);
    return newPr;
  }

  static updatePreReservationStatus(
    id: string,
    status: PreReservationStatus,
    adminNotes?: string,
    convertedAppointmentId?: string
  ): boolean {
    const list = getStorageItem<PreReservation[]>("pre_reservations", initialPreReservations);
    const index = list.findIndex((p) => p.id === id);
    if (index >= 0) {
      list[index] = {
        ...list[index],
        status,
        adminNotes: adminNotes ?? list[index].adminNotes,
        convertedAppointmentId: convertedAppointmentId ?? list[index].convertedAppointmentId,
        updatedAt: new Date().toISOString(),
      };
      setStorageItem("pre_reservations", list);
      return true;
    }
    return false;
  }

  // Templates de Disponibilidade
  static getAvailabilityTemplates(professionalId: string): AvailabilityTemplate[] {
    return getStorageItem<AvailabilityTemplate[]>("availability_templates", initialAvailabilityTemplates);
  }

  static saveAvailabilityTemplate(
    template: Omit<AvailabilityTemplate, "id" | "createdAt">
  ): AvailabilityTemplate {
    const list = getStorageItem<AvailabilityTemplate[]>(
      "availability_templates",
      initialAvailabilityTemplates
    );
    const newTpl: AvailabilityTemplate = {
      ...template,
      id: `tpl-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    list.push(newTpl);
    setStorageItem("availability_templates", list);
    return newTpl;
  }

  static resetToDefaults(): void {
    if (typeof window === "undefined") return;
    localStorage.removeItem(STORAGE_KEY_PREFIX + "organization");
    localStorage.removeItem(STORAGE_KEY_PREFIX + "profiles");
    localStorage.removeItem(STORAGE_KEY_PREFIX + "services");
    localStorage.removeItem(STORAGE_KEY_PREFIX + "triage_forms");
    localStorage.removeItem(STORAGE_KEY_PREFIX + "triage_submissions");
    localStorage.removeItem(STORAGE_KEY_PREFIX + "proposals");
    localStorage.removeItem(STORAGE_KEY_PREFIX + "appointments");
    localStorage.removeItem(STORAGE_KEY_PREFIX + "clients");
    localStorage.removeItem(STORAGE_KEY_PREFIX + "active_client");
    localStorage.removeItem(STORAGE_KEY_PREFIX + "available_days");
    localStorage.removeItem(STORAGE_KEY_PREFIX + "pre_reservations");
    localStorage.removeItem(STORAGE_KEY_PREFIX + "availability_templates");
  }
}

// Mock inicial de dias abertos
export const initialAvailableDays: AvailableDay[] = [
  // Outubro 2026
  "2026-10-20", "2026-10-21", "2026-10-22", "2026-10-23", "2026-10-24",
  "2026-10-27", "2026-10-28", "2026-10-29", "2026-10-30", "2026-10-31",
  // Novembro 2026
  "2026-11-03", "2026-11-04", "2026-11-05", "2026-11-06", "2026-11-07",
  "2026-11-10", "2026-11-11", "2026-11-12", "2026-11-13", "2026-11-14",
  "2026-11-17", "2026-11-18", "2026-11-19", "2026-11-20", "2026-11-21",
  "2026-11-24", "2026-11-25", "2026-11-26", "2026-11-27", "2026-11-28",
].map((date, idx) => ({
  id: `avail-init-${idx + 1}`,
  orgId: "11111111-1111-4111-8111-111111111111",
  professionalId: "58f26242-1e53-432e-b924-dea25ee2068a",
  date,
  startTime: "09:00",
  endTime: "19:00",
  breakStart: "12:30",
  breakEnd: "13:30",
  isOpen: true,
  maxClients: 8,
  slotIntervalMin: 15,
  customNotes: "Atendimento presencial com diagnóstico capilar",
  createdAt: "2026-10-01T00:00:00Z",
}));

// Mock inicial de pré-reservas
export const initialPreReservations: PreReservation[] = [
  {
    id: "pr-vanessa-guimaraes",
    orgId: "11111111-1111-4111-8111-111111111111",
    professionalId: "58f26242-1e53-432e-b924-dea25ee2068a",
    serviceId: "srv-mechas-platinum",
    serviceName: "Mechas Platinum & Iluminado",
    clientName: "Vanessa Guimarães",
    clientPhone: "(11) 98765-1122",
    clientEmail: "vanessa.guimaraes@gmail.com",
    requestedDate: "2026-11-28",
    preferredPeriod: "tarde",
    status: "pending",
    adminNotes: "Casamento da irmã - solicitou abertura especial",
    createdAt: "2026-10-25T14:20:00Z",
  },
  {
    id: "pr-beatriz-mendonca",
    orgId: "11111111-1111-4111-8111-111111111111",
    professionalId: "58f26242-1e53-432e-b924-dea25ee2068a",
    serviceId: "srv-iluminado-chocolate",
    serviceName: "Morena Iluminada Chocolate",
    clientName: "Beatriz Mendonça",
    clientPhone: "(11) 97123-4567",
    clientEmail: "beatriz.mendonca@advocacia.com",
    requestedDate: "2026-12-05",
    preferredPeriod: "manha",
    preferredTime: "09:30",
    status: "pending",
    adminNotes: "Formatura de faculdade de Direito",
    createdAt: "2026-10-26T10:15:00Z",
  },
  {
    id: "pr-camila-silveira",
    orgId: "11111111-1111-4111-8111-111111111111",
    professionalId: "58f26242-1e53-432e-b924-dea25ee2068a",
    serviceId: "srv-cronograma-luxo",
    serviceName: "Cronograma Capilar Alta Performance",
    clientName: "Camila Silveira",
    clientPhone: "(11) 99887-6543",
    clientEmail: "camila.silveira@uol.com.br",
    requestedDate: "2026-12-08",
    preferredPeriod: "especifico",
    preferredTime: "14:00",
    status: "pending",
    adminNotes: "Viagem de férias para o litoral",
    createdAt: "2026-10-27T16:45:00Z",
  },
  {
    id: "pr-mariana-rocha-aprovada",
    orgId: "11111111-1111-4111-8111-111111111111",
    professionalId: "58f26242-1e53-432e-b924-dea25ee2068a",
    serviceId: "srv-corte-alinhamento",
    serviceName: "Corte Geométrico & Alinhamento",
    clientName: "Mariana Rocha",
    clientPhone: "(11) 96543-2109",
    clientEmail: "mariana.rocha@hotmail.com",
    requestedDate: "2026-11-14",
    preferredPeriod: "tarde",
    status: "approved",
    adminNotes: "Dia aberto e horário confirmado com a cliente",
    createdAt: "2026-10-22T09:00:00Z",
  },
];

// Mock inicial de templates
export const initialAvailabilityTemplates: AvailabilityTemplate[] = [
  {
    id: "tpl-semana-padrao",
    orgId: "11111111-1111-4111-8111-111111111111",
    professionalId: "58f26242-1e53-432e-b924-dea25ee2068a",
    name: "Semana Padrão Ter-Sáb (09h-19h)",
    daysConfig: [
      { dayOfWeek: 0, startTime: "09:00", endTime: "19:00", isEnabled: false },
      { dayOfWeek: 1, startTime: "09:00", endTime: "19:00", isEnabled: false },
      { dayOfWeek: 2, startTime: "09:00", endTime: "19:00", breakStart: "12:30", breakEnd: "13:30", isEnabled: true },
      { dayOfWeek: 3, startTime: "09:00", endTime: "19:00", breakStart: "12:30", breakEnd: "13:30", isEnabled: true },
      { dayOfWeek: 4, startTime: "09:00", endTime: "19:00", breakStart: "12:30", breakEnd: "13:30", isEnabled: true },
      { dayOfWeek: 5, startTime: "09:00", endTime: "19:00", breakStart: "12:30", breakEnd: "13:30", isEnabled: true },
      { dayOfWeek: 6, startTime: "09:00", endTime: "19:00", breakStart: "12:30", breakEnd: "13:30", isEnabled: true },
    ],
    createdAt: "2026-10-01T00:00:00Z",
  },
  {
    id: "tpl-semana-pico",
    orgId: "11111111-1111-4111-8111-111111111111",
    professionalId: "58f26242-1e53-432e-b924-dea25ee2068a",
    name: "Semana de Pico & Festas (08h30-20h30)",
    daysConfig: [
      { dayOfWeek: 0, startTime: "08:30", endTime: "20:30", isEnabled: false },
      { dayOfWeek: 1, startTime: "08:30", endTime: "20:30", isEnabled: false },
      { dayOfWeek: 2, startTime: "08:30", endTime: "20:30", breakStart: "12:00", breakEnd: "13:00", isEnabled: true },
      { dayOfWeek: 3, startTime: "08:30", endTime: "20:30", breakStart: "12:00", breakEnd: "13:00", isEnabled: true },
      { dayOfWeek: 4, startTime: "08:30", endTime: "20:30", breakStart: "12:00", breakEnd: "13:00", isEnabled: true },
      { dayOfWeek: 5, startTime: "08:30", endTime: "20:30", breakStart: "12:00", breakEnd: "13:00", isEnabled: true },
      { dayOfWeek: 6, startTime: "08:30", endTime: "20:30", breakStart: "12:00", breakEnd: "13:00", isEnabled: true },
    ],
    createdAt: "2026-10-01T00:00:00Z",
  },
];
