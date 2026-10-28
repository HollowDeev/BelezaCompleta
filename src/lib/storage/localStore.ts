import { SalonOrganization, UserProfile, DashboardMode } from "@/types/salon";
import { ServiceItem, ServiceStep } from "@/types/service";
import { TriageForm, TriageSubmission } from "@/types/triage";
import { LuxuryProposal, ProposalTemplate } from "@/types/proposal";
import { Appointment } from "@/types/appointment";
import { SalonClient } from "@/types/client";
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
  }
}
