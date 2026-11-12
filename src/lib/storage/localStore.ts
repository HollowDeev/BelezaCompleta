import { SalonOrganization, UserProfile, DashboardMode } from "@/types/salon";
import { ServiceItem } from "@/types/service";
import { TriageForm, TriageSubmission } from "@/types/triage";
import { LuxuryProposal, ProposalTemplate } from "@/types/proposal";
import { Appointment, AppointmentProcedureItem } from "@/types/appointment";
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

function cloneDefault<T>(value: T): T {
  if (value === undefined || value === null) return value;
  if (typeof structuredClone === "function") {
    try {
      return structuredClone(value);
    } catch {
      // Fallback if non-serializable properties exist
    }
  }
  return JSON.parse(JSON.stringify(value));
}

function getStorageItem<T>(key: string, defaultValue: T): T {
  if (typeof window === "undefined") return cloneDefault(defaultValue);
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PREFIX + key);
    return raw ? JSON.parse(raw) : cloneDefault(defaultValue);
  } catch (err) {
    console.error(`Error reading ${key} from localStorage`, err);
    return cloneDefault(defaultValue);
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

  static updateUserProfile(userId: string, updates: Partial<UserProfile>): void {
    const profiles = this.getProfiles();
    const updated = profiles.map((p) =>
      p.id === userId ? { ...p, ...updates } : p
    );
    setStorageItem("profiles", updated);
  }

  // Serviços
  static getServices(): ServiceItem[] {
    const list = getStorageItem("services", initialServices);
    return list.map((s) => ({
      ...s,
      priceType: s.priceType || "fixed",
    }));
  }

  static saveService(service: ServiceItem): void {
    const list = this.getServices();
    const normalized: ServiceItem = {
      ...service,
      priceType: service.priceType || "fixed",
      maxPrice: service.priceType === "starting_at" ? service.maxPrice : undefined,
    };
    const index = list.findIndex((s) => s.id === normalized.id);
    if (index >= 0) {
      list[index] = normalized;
    } else {
      list.push(normalized);
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

  static approveTriageDirectly(submissionId: string): { submission: TriageSubmission; appointment?: Appointment } | null {
    const submissions = this.getTriageSubmissions();
    const subIndex = submissions.findIndex((s) => s.id === submissionId);
    if (subIndex === -1) return null;

    const sub = submissions[subIndex];
    sub.status = "approved";
    setStorageItem("triage_submissions", submissions);

    // Convert or create corresponding appointment
    const appointments = this.getAppointments();
    let apt = appointments.find((a) => a.triageSubmissionId === submissionId || a.id === sub.preReservationId);
    if (apt) {
      apt.status = "confirmed";
      setStorageItem("appointments", appointments);
    }
    return { submission: sub, appointment: apt };
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

  static getProposalsByClientPhone(phone: string): LuxuryProposal[] {
    let cleanPhone = (phone || "").replace(/\D/g, "");
    if (cleanPhone.startsWith("55") && cleanPhone.length > 11) {
      cleanPhone = cleanPhone.slice(2);
    }
    if (!cleanPhone) return [];
    const list = this.getProposals();
    return list.filter((p) => {
      let pPhone = (p.clientPhone || "").replace(/\D/g, "");
      if (pPhone.startsWith("55") && pPhone.length > 11) {
        pPhone = pPhone.slice(2);
      }
      return pPhone.includes(cleanPhone) || cleanPhone.includes(pPhone);
    });
  }

  static recordProposalFirstView(proposalId: string): LuxuryProposal | null {
    const proposals = this.getProposals();
    const prop = proposals.find((p) => p.id === proposalId);
    if (!prop) return null;
    if (prop.firstViewedAt || (prop as any).first_viewed_at) return prop;
    const now = new Date().toISOString();
    prop.firstViewedAt = now;
    (prop as any).first_viewed_at = now;
    this.saveProposal(prop);
    return prop;
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

  static getAppointmentsByClientPhone(phone: string): Appointment[] {
    let cleanPhone = (phone || "").replace(/\D/g, "");
    if (cleanPhone.startsWith("55") && cleanPhone.length > 11) {
      cleanPhone = cleanPhone.slice(2);
    }
    if (!cleanPhone) return [];
    const list = this.getAppointments();
    return list.filter((a) => {
      let aPhone = (a.clientPhone || "").replace(/\D/g, "");
      if (aPhone.startsWith("55") && aPhone.length > 11) {
        aPhone = aPhone.slice(2);
      }
      return aPhone.includes(cleanPhone) || cleanPhone.includes(aPhone);
    });
  }

  /**
   * Aprovação de proposta pela cliente:
   * Atualiza status da proposta para 'approved' e confirma a pré-reserva na agenda!
   */
  static approveProposal(
    proposalId: string,
    options?: { chosenDate?: string; chosenTime?: string }
  ): { proposal: LuxuryProposal; appointment?: Appointment } {
    const proposals = this.getProposals();
    const propIndex = proposals.findIndex((p) => p.id === proposalId);
    if (propIndex === -1) throw new Error("Proposta não encontrada");

    const prop = proposals[propIndex];
    prop.status = "approved";
    prop.approvedAt = new Date().toISOString();
    if (options?.chosenDate) {
      if (!prop.schedulingDetails) {
        prop.schedulingDetails = {
          status: "accepted_original",
          originalDate: options.chosenDate,
          originalTime: options.chosenTime || "09:00",
        };
      }
      prop.schedulingDetails.clientChosenDate = options.chosenDate;
      prop.schedulingDetails.confirmedDate = options.chosenDate;
    }
    if (options?.chosenTime && prop.schedulingDetails) {
      prop.schedulingDetails.clientChosenTime = options.chosenTime;
      prop.schedulingDetails.confirmedTime = options.chosenTime;
    }
    setStorageItem("proposals", proposals);

    const finalDate =
      options?.chosenDate ||
      prop.schedulingDetails?.confirmedDate ||
      prop.schedulingDetails?.clientChosenDate ||
      prop.schedulingDetails?.suggestedDateStart ||
      prop.schedulingDetails?.originalDate;
    const finalTime =
      options?.chosenTime ||
      prop.schedulingDetails?.confirmedTime ||
      prop.schedulingDetails?.clientChosenTime ||
      prop.schedulingDetails?.suggestedTime ||
      prop.schedulingDetails?.originalTime ||
      "09:00";

    const procedures: AppointmentProcedureItem[] = (prop.items || []).map((i) => ({
      id: i.id,
      serviceId: "22222222-2222-4222-8222-222222222221",
      title: i.serviceTitle,
      durationMin: i.durationMin || 60,
      price: i.specialPrice ?? i.originalPrice ?? 0,
      isIncluded: Boolean(i.isIncluded ?? true),
    }));

    // Atualiza agendamento correspondente
    const appointments = this.getAppointments();
    let aptIndex = appointments.findIndex((a) => a.proposalId === proposalId);
    if (aptIndex === -1 && prop.triageSubmissionId) {
      aptIndex = appointments.findIndex((a) => a.triageSubmissionId === prop.triageSubmissionId);
    }
    let updatedApt: Appointment | undefined;

    if (aptIndex >= 0) {
      appointments[aptIndex].status = "confirmed";
      appointments[aptIndex].paymentStatus = "paid";
      appointments[aptIndex].proposalId = proposalId;
      appointments[aptIndex].isUncommittedQuote = false;
      if (finalDate) appointments[aptIndex].date = finalDate;
      if (finalTime) appointments[aptIndex].startTime = finalTime;
      if (procedures.length > 0) {
        appointments[aptIndex].procedures = procedures;
        appointments[aptIndex].serviceTitle =
          prop.items?.[0]?.serviceTitle || prop.subtitle || prop.title || appointments[aptIndex].serviceTitle;
      }
      updatedApt = appointments[aptIndex];
      setStorageItem("appointments", appointments);
    } else if (finalDate && finalTime) {
      // Cria agendamento local confirmado
      const totalDurationMin = prop.schedulingDetails?.totalDurationMin || 180;
      const [startH, startM] = (finalTime || "09:00").split(":").map(Number);
      const totalStartMin = (startH || 9) * 60 + (startM || 0);
      const totalEndMin = totalStartMin + totalDurationMin;
      const endH = Math.floor(totalEndMin / 60) % 24;
      const endM = totalEndMin % 60;
      const computedEndTime = `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;

      let currentStepMin = totalStartMin;
      const stepBlocks = (prop.schedulingDetails?.technicalSteps || []).map((s, idx) => {
        const sStartH = Math.floor(currentStepMin / 60) % 24;
        const sStartM = currentStepMin % 60;
        const sStartTime = `${String(sStartH).padStart(2, "0")}:${String(sStartM).padStart(2, "0")}`;
        const dur = Number(s.durationMin) || 30;
        currentStepMin += dur;
        const sEndH = Math.floor(currentStepMin / 60) % 24;
        const sEndM = currentStepMin % 60;
        const sEndTime = `${String(sEndH).padStart(2, "0")}:${String(sEndM).padStart(2, "0")}`;

        return {
          id: `step-${s.id || idx}-${Date.now()}`,
          stepId: s.id,
          stepTitle: s.title,
          type: s.type,
          startTime: sStartTime,
          endTime: sEndTime,
          durationMin: dur,
          isParallelSlotAllowed: s.type === "pause",
        };
      });

      const newApt: Appointment = {
        id: `apt-${Date.now()}`,
        orgId: prop.orgId,
        professionalId: prop.professionalId,
        professionalName: "Gleicy Ronha",
        serviceId: "22222222-2222-4222-8222-222222222221",
        serviceTitle: prop.items?.[0]?.serviceTitle || prop.subtitle || prop.title || "Procedimento Personalizado",
        procedures,
        clientName: prop.clientName,
        clientPhone: prop.clientPhone,
        clientEmail: prop.clientEmail,
        date: finalDate,
        startTime: finalTime,
        endTime: computedEndTime,
        totalDurationMin: totalDurationMin,
        status: "confirmed",
        isUncommittedQuote: false,
        stepBlocks,
        price: prop.totalWithDiscount || prop.pixTotal,
        paymentStatus: "paid",
        proposalId: prop.id,
        triageSubmissionId: prop.triageSubmissionId,
        createdAt: new Date().toISOString(),
      };
      appointments.unshift(newApt);
      updatedApt = newApt;
      setStorageItem("appointments", appointments);
    }

    // Atualiza submissão de triagem se houver
    const submissions = this.getTriageSubmissions();
    const subIndex = submissions.findIndex(
      (s) => s.proposalId === proposalId || (prop.triageSubmissionId && s.id === prop.triageSubmissionId)
    );
    if (subIndex >= 0) {
      submissions[subIndex].status = "approved";
      submissions[subIndex].proposalId = proposalId;
      setStorageItem("triage_submissions", submissions);
    }

    // Atualiza pre-reservas locais
    const preReservations = this.getPreReservations(prop.orgId);
    const preIndex = preReservations.findIndex(
      (pr) =>
        (prop.triageSubmissionId && pr.triageSubmissionId === prop.triageSubmissionId) ||
        (pr.clientPhone.replace(/\D/g, "") === prop.clientPhone.replace(/\D/g, "") &&
          pr.status === "pending")
    );
    if (preIndex >= 0) {
      preReservations[preIndex].status = "converted";
      preReservations[preIndex].convertedAppointmentId = updatedApt?.id;
      setStorageItem("pre_reservations", preReservations);
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
    const rawList = getStorageItem<AvailableDay[]>("available_days", initialAvailableDays);
    // Descarta mocks antigos residuais
    const list = rawList.filter((d) => !d.id?.startsWith("avail-init-"));
    if (list.length !== rawList.length) {
      setStorageItem("available_days", list);
    }

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
    const rawList = getStorageItem<PreReservation[]>("pre_reservations", initialPreReservations);
    // Descarta mocks fictícios antigos
    const legacyMockIds = new Set([
      "pr-vanessa-guimaraes",
      "pr-beatriz-mendonca",
      "pr-camila-silveira",
      "pr-mariana-rocha-aprovada",
    ]);
    const list = rawList.filter((p) => !legacyMockIds.has(p.id));
    if (list.length !== rawList.length) {
      setStorageItem("pre_reservations", list);
    }

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

// Inicialização limpa: dias iniciam fechados por padrão (a Gleicy seleciona os dias para abrir)
export const initialAvailableDays: AvailableDay[] = [];

// Inicialização limpa: sem pré-reservas fictícias
export const initialPreReservations: PreReservation[] = [];

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
