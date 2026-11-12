import { supabase, isSupabaseConfigured } from "./client";
import { SalonOrganization, UserProfile, DashboardMode } from "@/types/salon";
import { ServiceItem } from "@/types/service";
import { TriageForm, TriageSubmission } from "@/types/triage";
import { LuxuryProposal, ProposalTemplate } from "@/types/proposal";
import { Appointment, AppointmentProcedureItem } from "@/types/appointment";
import { SalonClient } from "@/types/client";
import { SalonStore } from "@/lib/storage/localStore";
import {
  AvailableDay,
  PreReservation,
  AvailabilityTemplate,
  DayAvailabilityConfig,
  PreferredPeriod,
  PreReservationStatus,
} from "@/types/availability";
import { broadcastSync } from "@/lib/sync/syncBus";


// Utilitários de Resolução de UUID para integridade com PostgreSQL
export const isUuid = (str?: string | null): boolean =>
  str ? /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str) : false;

export const DEFAULT_ORG_ID = "11111111-1111-4111-8111-111111111111";
export const DEFAULT_GLEICY_ID = "58f26242-1e53-432e-b924-dea25ee2068a";
export const DEFAULT_DEBORA_ID = "c88c989f-6f6d-421e-95ca-4992eaeb7ea3";
export const DEFAULT_TRIAGE_FORM_ID = "33333333-3333-4333-8333-333333333331";
export const DEFAULT_SERVICE_ID = "22222222-2222-4222-8222-222222222221";

export function resolveValidUuid(
  id?: string | null,
  fallback?: string | null
): string | null {
  if (isUuid(id)) return id!;
  if (id === "org-gleicy-ronha") return DEFAULT_ORG_ID;
  if (id === "user-gleicy-ronha") return DEFAULT_GLEICY_ID;
  if (id === "user-debora-stylist") return DEFAULT_DEBORA_ID;
  if (id === "form-triage-iluminado") return DEFAULT_TRIAGE_FORM_ID;
  if (id === "srv-custom") return DEFAULT_SERVICE_ID;
  if (fallback && isUuid(fallback)) return fallback;
  return null;
}

export class SupabaseDataService {
  // 1. Organização
  static async getOrganization(): Promise<SalonOrganization> {
    if (!isSupabaseConfigured || !supabase) {
      return SalonStore.getOrganization();
    }
    try {
      const { data, error } = await supabase
        .from("organizations")
        .select("*")
        .limit(1)
        .single();

      if (error || !data) return SalonStore.getOrganization();

      return {
        id: data.id,
        name: data.name,
        slug: data.slug,
        tagline: data.tagline,
        phone: data.phone,
        address: data.address,
        city: data.city,
        state: data.state,
        logoUrl: data.logo_url,
        theme: data.theme || { primaryColor: "#54352a", accentColor: "#c59b27" },
        settings: data.settings || {
          isSharedMode: true,
          allowSelfRegistration: false,
          requireTriageApprovalHours: 48,
          pixDiscountPercent: 5,
          maxParallelInPause: 1,
        },
        createdAt: data.created_at,
      };
    } catch (err) {
      console.error("Error fetching organization from Supabase", err);
      return SalonStore.getOrganization();
    }
  }

  static async updateOrganization(
    org: Partial<SalonOrganization>
  ): Promise<SalonOrganization> {
    SalonStore.updateOrganization(org);
    if (!isSupabaseConfigured || !supabase) return SalonStore.getOrganization();

    try {
      const current = await this.getOrganization();
      const payload: Record<string, unknown> = {
        name: org.name ?? current.name,
        slug: org.slug ?? current.slug,
        tagline: org.tagline ?? current.tagline,
        phone: org.phone ?? current.phone,
        address: org.address ?? current.address,
        city: org.city ?? current.city,
        state: org.state ?? current.state,
        settings: { ...current.settings, ...(org.settings || {}) },
        theme: org.theme ?? current.theme,
      };

      await supabase
        .from("organizations")
        .update(payload)
        .eq("id", current.id);

      return { ...current, ...org } as SalonOrganization;
    } catch (err) {
      console.error("Error updating organization in Supabase", err);
      return SalonStore.getOrganization();
    }
  }

  // 2. Perfis
  static async getProfiles(): Promise<UserProfile[]> {
    if (!isSupabaseConfigured || !supabase) {
      return SalonStore.getProfiles();
    }
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("name", { ascending: true });

      if (error || !data || data.length === 0) {
        return SalonStore.getProfiles();
      }

      return data.map((p: any) => ({
        id: p.id,
        orgId: p.org_id,
        name: p.name,
        email: p.email,
        phone: p.phone,
        role: p.role,
        specialty: p.specialty,
        bio: p.bio,
        avatarUrl: p.avatar_url,
        dashboardMode: (p.dashboard_mode as DashboardMode) || "intermediary",
        isActive: p.is_active,
        commissionRate: Number(p.commission_rate || 0),
      }));
    } catch (err) {
      console.error("Error fetching profiles from Supabase", err);
      return SalonStore.getProfiles();
    }
  }

  static async updateCurrentUserDashboardMode(
    userId: string,
    mode: DashboardMode
  ): Promise<void> {
    SalonStore.updateCurrentUserDashboardMode(mode);
    if (!isSupabaseConfigured || !supabase) return;

    try {
      await supabase
        .from("profiles")
        .update({ dashboard_mode: mode })
        .eq("id", userId);
    } catch (err) {
      console.error("Error updating dashboard mode", err);
    }
  }

  static async updateUserProfile(
    userId: string,
    updates: Partial<UserProfile>
  ): Promise<void> {
    SalonStore.updateUserProfile(userId, updates);
    if (!isSupabaseConfigured || !supabase) return;

    try {
      const payload: Record<string, unknown> = {};
      if (updates.name !== undefined) payload.name = updates.name;
      if (updates.phone !== undefined) payload.phone = updates.phone;
      if (updates.specialty !== undefined) payload.specialty = updates.specialty;
      if (updates.bio !== undefined) payload.bio = updates.bio;
      if (updates.dashboardMode !== undefined) payload.dashboard_mode = updates.dashboardMode;
      if (updates.commissionRate !== undefined) payload.commission_rate = updates.commissionRate;

      await supabase
        .from("profiles")
        .update(payload)
        .eq("id", userId);
    } catch (err) {
      console.error("Error updating user profile in Supabase", err);
    }
  }

  static async updateUserPassword(
    newPassword: string
  ): Promise<{ success: boolean; error?: string }> {
    if (!isSupabaseConfigured || !supabase) {
      return { success: true };
    }
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro desconhecido ao alterar senha";
      return { success: false, error: msg };
    }
  }

  // 3. Serviços
  static async getServices(): Promise<ServiceItem[]> {
    if (!isSupabaseConfigured || !supabase) {
      return SalonStore.getServices();
    }
    try {
      const { data, error } = await supabase
        .from("services")
        .select("*, service_steps(*)")
        .order("title", { ascending: true });

      if (error) {
        console.error("Error fetching services from Supabase", error);
        return SalonStore.getServices();
      }

      if (!data) return [];

      return data.map((s: any) => ({
        id: s.id,
        orgId: s.org_id,
        professionalId: s.professional_id,
        title: s.title,
        slug: s.slug,
        category: s.category,
        description: s.description || "",
        price: Number(s.price),
        promotionalPrice: s.promotional_price ? Number(s.promotional_price) : undefined,
        priceType: (s.price_type as "fixed" | "starting_at") || "fixed",
        maxPrice: s.max_price != null ? Number(s.max_price) : undefined,
        imageUrl: s.image_url,
        requiresTriage: s.requires_triage,
        triageFormId: s.triage_form_id,
        isActive: s.is_active,
        steps: (s.service_steps || [])
          .sort((a: { step_order: number }, b: { step_order: number }) => a.step_order - b.step_order)
          .map((st: {
            id: string;
            step_order: number;
            title: string;
            step_type: string;
            duration_min: number;
            max_pause_duration_min?: number;
            requires_exclusive_attention: boolean;
          }) => ({
            id: st.id,
            order: st.step_order,
            title: st.title,
            type: st.step_type as "active" | "pause",
            durationMin: st.duration_min,
            maxPauseDurationMin: st.max_pause_duration_min,
            requiresExclusiveAttention: st.requires_exclusive_attention,
          })),
      }));
    } catch (err) {
      console.error("Error fetching services from Supabase", err);
      return SalonStore.getServices();
    }
  }

  static async saveService(service: ServiceItem): Promise<ServiceItem> {
    SalonStore.saveService(service);
    if (!isSupabaseConfigured || !supabase) return service;

    try {
      // 1. Organização (UUID obrigatório)
      let orgId = DEFAULT_ORG_ID;
      try {
        const org = await this.getOrganization();
        if (org && isUuid(org.id)) orgId = org.id;
      } catch (e) {
        console.warn("Could not fetch org from supabase, using fallback uuid", e);
      }

      // 2. Profissional (UUID válido referenciando profiles(id))
      let professionalId = resolveValidUuid(service.professionalId);
      if (!professionalId) {
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData?.session?.user?.id && isUuid(sessionData.session.user.id)) {
          professionalId = sessionData.session.user.id;
        } else {
          professionalId = DEFAULT_GLEICY_ID;
        }
      }

      // 3. Formulário de Triagem (UUID ou null)
      const triageFormId = service.requiresTriage
        ? resolveValidUuid(service.triageFormId, DEFAULT_TRIAGE_FORM_ID)
        : null;

      // 4. Slug seguro
      const slug =
        service.slug ||
        service.title
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)+/g, "");

      const payload: Record<string, unknown> = {
        org_id: orgId,
        professional_id: professionalId,
        title: service.title.trim(),
        slug,
        category: service.category || "outros",
        description: service.description || "",
        price: Number(service.price) || 0,
        promotional_price: service.promotionalPrice ? Number(service.promotionalPrice) : null,
        price_type: service.priceType || "fixed",
        max_price:
          service.priceType === "starting_at" && service.maxPrice != null
            ? Number(service.maxPrice)
            : null,
        image_url: service.imageUrl || null,
        requires_triage: Boolean(service.requiresTriage),
        triage_form_id: triageFormId,
        is_active: service.isActive ?? true,
      };

      if (isUuid(service.id)) {
        payload.id = service.id;
      }

      const { data, error } = await supabase
        .from("services")
        .upsert(payload)
        .select()
        .single();

      if (error) {
        console.error("Supabase upsert service error:", error);
        throw new Error(error.message || "Erro ao salvar serviço no banco de dados.");
      }

      if (data && service.steps && service.steps.length > 0) {
        await supabase.from("service_steps").delete().eq("service_id", data.id);
        const stepsPayload = service.steps.map((st, idx) => ({
          service_id: data.id,
          step_order: idx + 1,
          title: st.title,
          step_type: st.type,
          duration_min: Number(st.durationMin) || 15,
          max_pause_duration_min:
            st.type === "pause" && st.maxPauseDurationMin
              ? Number(st.maxPauseDurationMin)
              : null,
          requires_exclusive_attention: Boolean(st.requiresExclusiveAttention),
        }));
        const { error: stepsErr } = await supabase.from("service_steps").insert(stepsPayload);
        if (stepsErr) {
          console.error("Supabase insert service_steps error:", stepsErr);
          throw new Error(stepsErr.message || "Erro ao salvar etapas do serviço.");
        }
      }

      // Sincroniza o id real retornado pelo Supabase no localStorage
      const updatedService: ServiceItem = {
        ...service,
        id: data.id,
        orgId,
        professionalId: professionalId || service.professionalId,
        triageFormId: triageFormId || undefined,
        priceType: (data.price_type as "fixed" | "starting_at") || service.priceType || "fixed",
        maxPrice: data.max_price != null ? Number(data.max_price) : service.maxPrice,
      };
      SalonStore.saveService(updatedService);

      return updatedService;
    } catch (err) {
      console.error("Error saving service in Supabase", err);
      throw err;
    }
  }

  static async deleteService(serviceId: string): Promise<void> {
    SalonStore.deleteService(serviceId);
    if (!isSupabaseConfigured || !supabase) return;
    try {
      if (isUuid(serviceId)) {
        const { error } = await supabase.from("services").delete().eq("id", serviceId);
        if (error) {
          console.error("Supabase delete service error:", error);
          throw new Error(error.message || "Erro ao excluir serviço do banco de dados.");
        }
      }
    } catch (err) {
      console.error("Error deleting service in Supabase", err);
      throw err;
    }
  }

  // 4. Triagens
  static async getTriageForms(): Promise<TriageForm[]> {
    if (!isSupabaseConfigured || !supabase) {
      return SalonStore.getTriageForms();
    }
    try {
      const { data, error } = await supabase
        .from("triage_forms")
        .select("*, triage_questions(*)")
        .order("created_at", { ascending: true });

      if (error || !data || data.length === 0) {
        return SalonStore.getTriageForms();
      }

      return data.map((f: any) => ({
        id: f.id,
        orgId: f.org_id,
        title: f.title,
        description: f.description || "",
        targetServiceId: f.target_service_id,
        estimatedMinutes: f.estimated_minutes || 3,
        isTemplate: f.is_template,
        createdAt: f.created_at,
        questions: (f.triage_questions || [])
          .sort((a: { question_order: number }, b: { question_order: number }) => a.question_order - b.question_order)
          .map((q: {
            id: string;
            question_order: number;
            title: string;
            subtitle?: string;
            educational_tip?: string;
            question_type: string;
            options_json?: unknown;
            allow_multiple?: boolean;
            required?: boolean;
          }) => ({
            id: q.id,
            order: q.question_order,
            title: q.title,
            subtitle: q.subtitle,
            educationalTip: q.educational_tip || "",
            type: q.question_type as any,
            options: (q.options_json as any) || [],
            allowMultiple: q.allow_multiple,
            required: q.required ?? true,
          })),
      }));
    } catch (err) {
      console.error("Error fetching triage forms from Supabase", err);
      return SalonStore.getTriageForms();
    }
  }

  static async saveTriageForm(form: TriageForm): Promise<TriageForm> {
    SalonStore.saveTriageForm(form);
    if (!isSupabaseConfigured || !supabase) return form;

    try {
      let orgId = DEFAULT_ORG_ID;
      try {
        const org = await this.getOrganization();
        if (org && isUuid(org.id)) orgId = org.id;
      } catch (e) {}

      const payload: Record<string, unknown> = {
        org_id: orgId,
        title: form.title.trim(),
        description: form.description || "",
        target_service_id: resolveValidUuid(form.targetServiceId),
        estimated_minutes: Number(form.estimatedMinutes) || 3,
        is_template: Boolean(form.isTemplate),
      };

      if (isUuid(form.id)) {
        payload.id = form.id;
      }

      const { data, error } = await supabase
        .from("triage_forms")
        .upsert(payload)
        .select()
        .single();

      if (error) {
        console.error("Supabase upsert triage_form error:", error);
        throw new Error(error.message || "Erro ao salvar modelo de triagem no banco de dados.");
      }

      if (data && form.questions && form.questions.length > 0) {
        await supabase.from("triage_questions").delete().eq("form_id", data.id);
        const questionsPayload = form.questions.map((q, idx) => ({
          form_id: data.id,
          question_order: idx + 1,
          title: q.title,
          subtitle: q.subtitle || null,
          educational_tip: q.educationalTip || null,
          question_type: q.type,
          options_json: q.options || [],
          allow_multiple: Boolean(q.allowMultiple),
          required: q.required ?? true,
        }));
        const { error: qErr } = await supabase.from("triage_questions").insert(questionsPayload);
        if (qErr) {
          console.error("Supabase insert triage_questions error:", qErr);
          throw new Error(qErr.message || "Erro ao salvar perguntas da triagem.");
        }
      }

      const updatedForm: TriageForm = {
        ...form,
        id: data.id,
        orgId,
      };
      SalonStore.saveTriageForm(updatedForm);
      return updatedForm;
    } catch (err) {
      console.error("Error saving triage form in Supabase", err);
      throw err;
    }
  }

  static async deleteTriageForm(formId: string): Promise<void> {
    SalonStore.deleteTriageForm(formId);
    if (!isSupabaseConfigured || !supabase) return;
    try {
      if (isUuid(formId)) {
        const { error } = await supabase.from("triage_forms").delete().eq("id", formId);
        if (error) {
          console.error("Supabase delete triage_form error:", error);
          throw new Error(error.message || "Erro ao excluir formulário do banco de dados.");
        }
      }
    } catch (err) {
      console.error("Error deleting triage form in Supabase", err);
      throw err;
    }
  }

  // 5. Submissões de Triagem
  static async getTriageSubmissions(): Promise<TriageSubmission[]> {
    if (!isSupabaseConfigured || !supabase) {
      return SalonStore.getTriageSubmissions();
    }
    try {
      const { data, error } = await supabase
        .from("triage_submissions")
        .select("*, services(title)")
        .order("submitted_at", { ascending: false });

      if (error) {
        console.error("Error fetching triage submissions from Supabase", error);
        return SalonStore.getTriageSubmissions();
      }

      if (!data) return [];

      return data.map((s: any) => ({
        id: s.id,
        orgId: s.org_id,
        formId: s.form_id,
        serviceId: s.service_id,
        serviceTitle: s.services?.title || "Transformação Personalizada",
        clientName: s.client_name,
        clientPhone: s.client_phone,
        clientEmail: s.client_email,
        preferredDate: s.preferred_date,
        preferredTimeSlot: s.preferred_time_slot,
        answers: Array.isArray(s.answers) ? s.answers : [],
        photos: (s.photos && typeof s.photos === "object") ? s.photos : {},
        status: s.status,
        submittedAt: s.submitted_at,
        reviewedAt: s.reviewed_at,
        proposalId: s.proposal_id,
      }));
    } catch (err) {
      console.error("Error fetching triage submissions from Supabase", err);
      return SalonStore.getTriageSubmissions();
    }
  }

  static async saveTriageSubmission(sub: TriageSubmission): Promise<TriageSubmission> {
    SalonStore.saveTriageSubmission(sub);
    if (!isSupabaseConfigured || !supabase) return sub;

    try {
      let orgId = DEFAULT_ORG_ID;
      try {
        const org = await this.getOrganization();
        if (org && isUuid(org.id)) orgId = org.id;
      } catch (e) {}

      const payload: Record<string, unknown> = {
        org_id: orgId,
        form_id: resolveValidUuid(sub.formId, DEFAULT_TRIAGE_FORM_ID) || DEFAULT_TRIAGE_FORM_ID,
        service_id: resolveValidUuid(sub.serviceId),
        client_name: sub.clientName,
        client_phone: sub.clientPhone,
        client_email: sub.clientEmail || null,
        preferred_date: sub.preferredDate || null,
        preferred_time_slot: sub.preferredTimeSlot ? sub.preferredTimeSlot.slice(0, 30) : null,
        answers: sub.answers,
        photos: sub.photos || {},
        status: sub.status,
        proposal_id: resolveValidUuid(sub.proposalId),
      };

      if (isUuid(sub.id)) {
        payload.id = sub.id;
      }

      const { data, error } = await supabase
        .from("triage_submissions")
        .upsert(payload)
        .select()
        .single();

      if (error) {
        console.error("Supabase upsert triage_submissions error:", {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
        });
        throw new Error(error.message || "Erro ao salvar submissão de triagem.");
      }

      const savedResult = data ? { ...sub, id: data.id } : sub;
      SalonStore.saveTriageSubmission(savedResult);

      // Auto-cadastra/atualiza cliente no CRM de clientes
      if (savedResult.clientPhone && savedResult.clientName) {
        this.saveClient({
          id: `cli-${Date.now()}`,
          orgId: savedResult.orgId || DEFAULT_ORG_ID,
          name: savedResult.clientName.trim(),
          phone: savedResult.clientPhone.trim(),
          email: savedResult.clientEmail?.trim(),
          createdAt: savedResult.submittedAt || new Date().toISOString(),
          lastServiceTitle: savedResult.serviceTitle,
        }).catch((e) => console.warn("Auto-register client from triage error:", e));
      }

      broadcastSync("triage_saved", savedResult.id);
      return savedResult;
    } catch (err) {
      console.error("Error saving triage submission in Supabase", err);
      return sub;
    }
  }

  static async approveTriageDirectly(
    submissionId: string
  ): Promise<{ submission: TriageSubmission; appointment?: Appointment } | null> {
    const result = SalonStore.approveTriageDirectly(submissionId);
    if (!isSupabaseConfigured || !supabase) {
      broadcastSync("triage_approved", submissionId);
      return result;
    }
    try {
      await supabase
        .from("triage_submissions")
        .update({ status: "approved" })
        .eq("id", submissionId);
      broadcastSync("triage_approved", submissionId);
    } catch (e) {
      console.warn("Error approving triage directly in Supabase", e);
    }
    return result;
  }

  // Helper para mapear propostas do Supabase e desempacotar metadados de agendamento
  private static mapProposal(p: any): LuxuryProposal {
    let schedulingDetails = p.scheduling_details;
    let items = p.items || [];
    if (Array.isArray(items)) {
      const envelope = items.find(
        (it: any) => it && (it.__isSchedulingEnvelope || it.id === "__scheduling_envelope__")
      );
      if (envelope) {
        if (!schedulingDetails) {
          schedulingDetails = envelope.schedulingDetails;
        }
        items = items.filter(
          (it: any) => !(it.__isSchedulingEnvelope || it.id === "__scheduling_envelope__")
        );
      }
    }

    return {
      id: p.id,
      orgId: p.org_id,
      professionalId: p.professional_id,
      appointmentId: p.appointment_id,
      triageSubmissionId: p.triage_submission_id,
      templateId: p.template_id,
      clientName: p.client_name,
      clientPhone: p.client_phone,
      clientEmail: p.client_email,
      title: p.title,
      subtitle: p.subtitle,
      projectOverview: p.project_overview,
      desiredResults: p.desired_results || [],
      chosenTechnique: p.chosen_technique,
      maintenanceGuidance: p.maintenance_guidance,
      includedItems: p.included_items || [],
      differentials: p.differentials || [],
      technicalCommitment: p.technical_commitment,
      items: items,
      totalOriginal: Number(p.total_original),
      totalWithDiscount: Number(p.total_with_discount),
      pixDiscountPercent: Number(p.pix_discount_percent || 5),
      pixTotal: Number(p.pix_total),
      creditCardTerms: "Valor integral, sujeito às condições de parcelamento.",
      schedulingDetails: schedulingDetails || undefined,
      status: p.status,
      expiresAt: p.expires_at,
      createdAt: p.created_at,
      approvedAt: p.approved_at,
      first_viewed_at: p.first_viewed_at || p.firstViewedAt,
      firstViewedAt: p.first_viewed_at || p.firstViewedAt,
    };
  }

  // 6. Propostas
  static async getProposals(): Promise<LuxuryProposal[]> {
    if (!isSupabaseConfigured || !supabase) {
      return SalonStore.getProposals();
    }
    try {
      const { data, error } = await supabase
        .from("proposals")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching proposals from Supabase", error);
        return SalonStore.getProposals();
      }

      if (!data) return [];
      return data.map((p: any) => this.mapProposal(p));
    } catch (err) {
      console.error("Error fetching proposals from Supabase", err);
      return SalonStore.getProposals();
    }
  }

  static async getProposalById(id: string): Promise<LuxuryProposal | undefined> {
    if (isSupabaseConfigured && supabase && isUuid(id)) {
      try {
        const { data, error } = await supabase
          .from("proposals")
          .select("*")
          .eq("id", id)
          .single();

        if (data && !error) {
          return this.mapProposal(data);
        }
      } catch (e) {
        console.warn("Direct proposal query failed, falling back to cached list", e);
      }
    }
    const list = await this.getProposals();
    return list.find((p) => p.id === id);
  }

  static async getProposalsByClientPhone(phone: string): Promise<LuxuryProposal[]> {
    let cleanPhone = phone.replace(/\D/g, "");
    if (cleanPhone.startsWith("55") && cleanPhone.length > 11) {
      cleanPhone = cleanPhone.slice(2);
    }
    if (!cleanPhone) return [];

    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from("proposals")
          .select("*")
          .order("created_at", { ascending: false });

        if (!error && data && data.length > 0) {
          return data
            .filter((p: any) => (p.client_phone || "").replace(/\D/g, "").includes(cleanPhone))
            .map((p: any) => this.mapProposal(p));
        }
      } catch (e) {
        console.warn("Direct getProposalsByClientPhone query failed, falling back to cached list", e);
      }
    }

    const list = await this.getProposals();
    return list.filter((p) => (p.clientPhone || "").replace(/\D/g, "").includes(cleanPhone));
  }

  static async saveProposal(prop: LuxuryProposal): Promise<LuxuryProposal> {
    SalonStore.saveProposal(prop);
    if (!isSupabaseConfigured || !supabase) return prop;

    try {
      let orgId = DEFAULT_ORG_ID;
      try {
        const org = await this.getOrganization();
        if (org && isUuid(org.id)) orgId = org.id;
      } catch (e) {}

      let professionalId = resolveValidUuid(prop.professionalId);
      if (!professionalId) {
        const { data: sessionData } = await supabase.auth.getSession();
        professionalId = sessionData?.session?.user?.id && isUuid(sessionData.session.user.id)
          ? sessionData.session.user.id
          : DEFAULT_GLEICY_ID;
      }

      // Empacota schedulingDetails de modo defensivo dentro de items
      const itemsToPersist = Array.isArray(prop.items) ? [...prop.items] : [];
      if (prop.schedulingDetails) {
        itemsToPersist.push({
          id: "__scheduling_envelope__",
          serviceTitle: "__scheduling_envelope__",
          originalPrice: 0,
          __isSchedulingEnvelope: true,
          schedulingDetails: prop.schedulingDetails,
        } as any);
      }

      const payload: Record<string, unknown> = {
        org_id: orgId,
        professional_id: professionalId,
        triage_submission_id: resolveValidUuid(prop.triageSubmissionId),
        client_name: prop.clientName,
        client_phone: prop.clientPhone,
        client_email: prop.clientEmail || null,
        title: prop.title,
        subtitle: prop.subtitle || null,
        project_overview: prop.projectOverview || null,
        desired_results: prop.desiredResults || [],
        chosen_technique: prop.chosenTechnique || null,
        maintenance_guidance: prop.maintenanceGuidance || null,
        included_items: prop.includedItems || [],
        differentials: prop.differentials || [],
        technical_commitment: prop.technicalCommitment || null,
        items: itemsToPersist,
        total_original: Number(prop.totalOriginal) || 0,
        total_with_discount: Number(prop.totalWithDiscount) || 0,
        pix_discount_percent: Number(prop.pixDiscountPercent) || 5,
        pix_total: Number(prop.pixTotal) || 0,
        status: prop.status,
        expires_at: prop.expiresAt || null,
        first_viewed_at: prop.firstViewedAt || (prop as any).first_viewed_at || null,
        approved_at: prop.approvedAt || null,
      };

      if (isUuid(prop.id)) {
        payload.id = prop.id;
      }

      const { data, error } = await supabase
        .from("proposals")
        .upsert(payload)
        .select()
        .single();

      if (error) {
        console.error("Supabase upsert proposal error:", error);
        throw new Error(error.message || "Erro ao salvar proposta no banco de dados.");
      }

      const savedResult = data ? this.mapProposal(data) : prop;
      SalonStore.saveProposal(savedResult);
      broadcastSync("proposal_saved", savedResult.id);
      return savedResult;
    } catch (err) {
      console.error("Error saving proposal in Supabase", err);
      return prop;
    }
  }

  static async approveProposal(
    proposalId: string,
    options?: { chosenDate?: string; chosenTime?: string }
  ): Promise<void> {
    SalonStore.approveProposal(proposalId, options);
    if (!isSupabaseConfigured || !supabase) {
      broadcastSync("proposal_approved", proposalId);
      return;
    }

    try {
      const now = new Date().toISOString();
      const prop = await this.getProposalById(proposalId);
      if (!prop) {
        throw new Error(`Proposta não encontrada: ${proposalId}`);
      }

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

      let validServiceId: string | null = null;
      if (prop.triageSubmissionId) {
        try {
          const subs = await this.getTriageSubmissions();
          const matchedSub = subs.find((s) => s.id === prop.triageSubmissionId);
          validServiceId = resolveValidUuid(matchedSub?.serviceId);
        } catch {}
      }
      if (!validServiceId) {
        try {
          const services = await this.getServices();
          validServiceId =
            services[0]?.id && isUuid(services[0].id)
              ? services[0].id
              : DEFAULT_SERVICE_ID;
        } catch {
          validServiceId = DEFAULT_SERVICE_ID;
        }
      }

      const procedures: AppointmentProcedureItem[] = (prop.items || []).map((item) => ({
        id: item.id,
        serviceId: validServiceId || DEFAULT_SERVICE_ID,
        title: item.serviceTitle,
        durationMin: item.durationMin || 60,
        price: item.specialPrice ?? item.originalPrice ?? 0,
        isIncluded: Boolean(item.isIncluded ?? true),
      }));

      // Se a cliente escolheu nova data/hora, empacota e atualiza a proposta
      if (options?.chosenDate && prop) {
        if (!prop.schedulingDetails) {
          prop.schedulingDetails = {
            status: "accepted_original",
            originalDate: options.chosenDate,
            originalTime: options.chosenTime || "09:00",
          };
        }
        prop.schedulingDetails.clientChosenDate = options.chosenDate;
        prop.schedulingDetails.confirmedDate = options.chosenDate;
        if (options.chosenTime) {
          prop.schedulingDetails.clientChosenTime = options.chosenTime;
          prop.schedulingDetails.confirmedTime = options.chosenTime;
        }
        await this.saveProposal({
          ...prop,
          status: "approved",
          approvedAt: now,
        });
      } else {
        await supabase
          .from("proposals")
          .update({ status: "approved", approved_at: now })
          .eq("id", proposalId);
      }

      // 1. Atualiza agendamento associado por proposal_id
      const aptUpdate: Record<string, unknown> = {
        status: "confirmed",
        payment_status: "paid",
        proposal_id: proposalId,
        is_uncommitted_quote: false,
      };
      if (finalDate) aptUpdate.date = finalDate;
      if (finalTime) aptUpdate.start_time = finalTime;
      if (procedures.length > 0) aptUpdate.procedures = procedures;

      const { data: updatedApts } = await supabase
        .from("appointments")
        .update(aptUpdate)
        .eq("proposal_id", proposalId)
        .select();

      // 2. Se não atualizou por proposal_id, tenta por triage_submission_id
      let hadExistingApt = Boolean(updatedApts && updatedApts.length > 0);
      if (!hadExistingApt && prop.triageSubmissionId) {
        const { data: updatedByTriage } = await supabase
          .from("appointments")
          .update(aptUpdate)
          .eq("triage_submission_id", prop.triageSubmissionId)
          .select();
        if (updatedByTriage && updatedByTriage.length > 0) {
          hadExistingApt = true;
        }
      }

      // 3. Se ainda assim não existe agendamento nenhum, cria agendamento confirmado no banco
      if (!hadExistingApt && finalDate && finalTime) {
        const serviceTitle =
          prop.items?.[0]?.serviceTitle || prop.subtitle || prop.title || "Procedimento Personalizado";

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

        await this.saveAppointment({
          id: `apt-prop-${Date.now()}`,
          orgId: prop.orgId || DEFAULT_ORG_ID,
          professionalId: prop.professionalId || DEFAULT_GLEICY_ID,
          professionalName: "Gleicy Ronha",
          serviceId: validServiceId || DEFAULT_SERVICE_ID,
          serviceTitle: serviceTitle,
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
          createdAt: now,
        });
      }

      // 4. Atualiza triagem se houver
      if (prop.triageSubmissionId) {
        await supabase
          .from("triage_submissions")
          .update({ status: "approved", proposal_id: proposalId })
          .eq("id", prop.triageSubmissionId);

        // Atualiza pré-reserva associada para converted
        await supabase
          .from("pre_reservations")
          .update({ status: "converted", updated_at: now })
          .eq("triage_submission_id", prop.triageSubmissionId);
      }

      // 5. Atualiza pré-reserva associada por telefone e data
      if (prop.clientPhone && finalDate) {
        await supabase
          .from("pre_reservations")
          .update({ status: "converted", updated_at: now })
          .eq("client_phone", prop.clientPhone)
          .eq("requested_date", finalDate);
      }

      broadcastSync("proposal_approved", proposalId);
    } catch (err) {
      console.error("Error approving proposal in Supabase", err);
      throw err;
    }
  }

  static async recordProposalFirstView(proposalId: string): Promise<LuxuryProposal | null> {
    const localUpdated = SalonStore.recordProposalFirstView(proposalId);
    if (!isSupabaseConfigured || !supabase) {
      return localUpdated;
    }
    try {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from("proposals")
        .update({ first_viewed_at: now })
        .eq("id", proposalId)
        .is("first_viewed_at", null)
        .select()
        .single();
      if (!error && data) {
        return this.mapProposal(data);
      }
    } catch (e) {
      console.warn("Error updating first_viewed_at in Supabase", e);
    }
    return localUpdated;
  }

  // 7. Modelos de Propostas
  static async getProposalTemplates(): Promise<ProposalTemplate[]> {
    if (!isSupabaseConfigured || !supabase) {
      return SalonStore.getProposalTemplates();
    }
    try {
      const { data, error } = await supabase
        .from("proposal_templates")
        .select("*")
        .order("created_at", { ascending: true });

      if (error || !data || data.length === 0) {
        return SalonStore.getProposalTemplates();
      }

      return data.map((t: any) => ({
        id: t.id,
        title: t.title,
        targetCategory: t.category,
        subtitle: t.data?.subtitle || "",
        projectOverviewTemplate: t.data?.projectOverview || "",
        desiredResults: t.data?.desiredResults || [],
        chosenTechnique: t.data?.chosenTechnique || "",
        maintenanceGuidance: t.data?.maintenanceGuidance || "",
        includedItems: t.data?.includedItems || [],
        differentials: t.data?.differentials || [],
        technicalCommitment: t.data?.technicalCommitment || "",
        basePrice: t.data?.basePrice || 0,
        pixDiscountPercent: t.data?.pixDiscountPercent || 5,
        createdAt: t.created_at,
      }));
    } catch (err) {
      console.error("Error fetching templates from Supabase", err);
      return SalonStore.getProposalTemplates();
    }
  }

  // 8. Agendamentos
  static async getAppointments(): Promise<Appointment[]> {
    if (!isSupabaseConfigured || !supabase) {
      return SalonStore.getAppointments();
    }
    try {
      const { data, error } = await supabase
        .from("appointments")
        .select("*, profiles(name), services(title)")
        .order("date", { ascending: true })
        .order("start_time", { ascending: true });

      if (error) {
        console.error("Error fetching appointments from Supabase", error);
        return SalonStore.getAppointments();
      }

      if (!data) return [];

      return data.map((a: any) => ({
        id: a.id,
        orgId: a.org_id,
        professionalId: a.professional_id,
        professionalName: a.profiles?.name || "Gleicy Ronha",
        serviceId: a.service_id || undefined,
        serviceTitle: a.service_title || a.services?.title || "Atendimento Personalizado",
        clientName: a.client_name,
        clientPhone: a.client_phone,
        clientEmail: a.client_email,
        date: a.date,
        startTime: a.start_time,
        endTime: a.end_time,
        totalDurationMin: a.total_duration_min,
        status: a.status,
        price: Number(a.price),
        paymentMethod: a.payment_method,
        paymentStatus: a.payment_status,
        proposalId: a.proposal_id,
        triageSubmissionId: a.triage_submission_id,
        stepBlocks: a.step_blocks || [],
        procedures: Array.isArray(a.procedures) ? a.procedures : [],
        isUncommittedQuote: Boolean(a.is_uncommitted_quote),
        notes: a.notes,
        createdAt: a.created_at,
      }));
    } catch (err) {
      console.error("Error fetching appointments from Supabase", err);
      return SalonStore.getAppointments();
    }
  }

  static async getAppointmentsByClientPhone(phone: string): Promise<Appointment[]> {
    let cleanPhone = (phone || "").replace(/\D/g, "");
    if (cleanPhone.startsWith("55") && cleanPhone.length > 11) {
      cleanPhone = cleanPhone.slice(2);
    }
    if (!cleanPhone) return [];

    if (isSupabaseConfigured && supabase) {
      try {
        const allApts = await this.getAppointments();
        return allApts.filter((a) => {
          let aPhone = (a.clientPhone || "").replace(/\D/g, "");
          if (aPhone.startsWith("55") && aPhone.length > 11) {
            aPhone = aPhone.slice(2);
          }
          return aPhone.includes(cleanPhone) || cleanPhone.includes(aPhone);
        });
      } catch (e) {
        console.warn("Direct getAppointmentsByClientPhone query failed, falling back to localStore", e);
      }
    }

    return SalonStore.getAppointmentsByClientPhone(phone);
  }

  static async saveAppointment(apt: Appointment): Promise<Appointment> {
    SalonStore.saveAppointment(apt);
    if (!isSupabaseConfigured || !supabase) return apt;

    try {
      let orgId = DEFAULT_ORG_ID;
      try {
        const org = await this.getOrganization();
        if (org && isUuid(org.id)) orgId = org.id;
      } catch (e) {}

      let professionalId = resolveValidUuid(apt.professionalId);
      if (!professionalId) {
        const { data: sessionData } = await supabase.auth.getSession();
        professionalId = sessionData?.session?.user?.id && isUuid(sessionData.session.user.id)
          ? sessionData.session.user.id
          : DEFAULT_GLEICY_ID;
      }

      const payload: Record<string, unknown> = {
        org_id: orgId,
        professional_id: professionalId,
        service_id: resolveValidUuid(apt.serviceId) || DEFAULT_SERVICE_ID,
        service_title: apt.serviceTitle || null,
        procedures: apt.procedures || [],
        is_uncommitted_quote: Boolean(apt.isUncommittedQuote),
        client_name: apt.clientName,
        client_phone: apt.clientPhone,
        client_email: apt.clientEmail || null,
        date: apt.date,
        start_time: apt.startTime,
        end_time: apt.endTime,
        total_duration_min: apt.totalDurationMin,
        status: apt.status,
        price: Number(apt.price) || 0,
        payment_method: apt.paymentMethod,
        payment_status: apt.paymentStatus,
        proposal_id: resolveValidUuid(apt.proposalId),
        triage_submission_id: resolveValidUuid(apt.triageSubmissionId),
        step_blocks: apt.stepBlocks || [],
        notes: apt.notes || null,
      };

      if (isUuid(apt.id)) {
        payload.id = apt.id;
      } else {
        // Blindagem contra duplicidade: se já houver agendamento ativo para a mesma data, horário e cliente, reutiliza o ID
        const { data: existingApt } = await supabase
          .from("appointments")
          .select("id")
          .eq("org_id", orgId)
          .eq("date", apt.date)
          .eq("start_time", apt.startTime)
          .eq("client_name", apt.clientName)
          .neq("status", "cancelled")
          .maybeSingle();

        if (existingApt?.id) {
          payload.id = existingApt.id;
        }
      }

      const { data, error } = await supabase
        .from("appointments")
        .upsert(payload)
        .select()
        .single();

      if (error) {
        console.error("Supabase upsert appointment error:", error);
        throw new Error(error.message || "Erro ao salvar agendamento no banco de dados.");
      }

      const savedResult = data ? { ...apt, id: data.id } : apt;
      SalonStore.saveAppointment(savedResult);

      if (savedResult.clientPhone && savedResult.clientName) {
        this.saveClient({
          id: `cli-${Date.now()}`,
          orgId: savedResult.orgId || DEFAULT_ORG_ID,
          name: savedResult.clientName.trim(),
          phone: savedResult.clientPhone.trim(),
          email: savedResult.clientEmail?.trim(),
          createdAt: savedResult.createdAt || new Date().toISOString(),
          lastServiceTitle: savedResult.serviceTitle,
          lastVisitAt: savedResult.date ? `${savedResult.date}T10:00:00Z` : undefined,
        }).catch((e) => console.warn("Auto-register client from appointment error:", e));
      }

      broadcastSync("appointment_saved", savedResult.id);
      return savedResult;
    } catch (err) {
      console.error("Error saving appointment in Supabase", err);
      return apt;
    }
  }

  // 9. Gestão de Clientes & CRM
  static async getClients(): Promise<SalonClient[]> {
    let clients: SalonClient[] = [];
    if (!isSupabaseConfigured || !supabase) {
      clients = SalonStore.getClients();
    } else {
      try {
        const { data, error } = await supabase
          .from("salon_clients")
          .select("*")
          .order("created_at", { ascending: false });

        if (error) {
          console.error("Error fetching salon_clients from Supabase", error);
          clients = SalonStore.getClients();
        } else {
          clients = (data || []).map((c: any) => ({
            id: c.id,
            orgId: c.org_id,
            name: c.name,
            phone: c.phone,
            password: c.password_hash,
            email: c.email || undefined,
            notes: c.notes || undefined,
            createdAt: c.created_at,
            lastVisitAt: c.last_visit_at || undefined,
          }));
        }
      } catch (err) {
        console.error("Error fetching salon_clients from Supabase", err);
        clients = SalonStore.getClients();
      }
    }

    // Harmoniza clientes que enviaram triagens, pré-reservas ou agendamentos
    const [appointments, triages, preRes] = await Promise.all([
      this.getAppointments().catch(() => []),
      this.getTriageSubmissions().catch(() => []),
      this.getPreReservations(DEFAULT_ORG_ID).catch(() => []),
    ]);

    const knownPhones = new Set<string>(clients.map((c) => c.phone.replace(/\D/g, "")));

    // Extrai clientes de pré-reservas que ainda não estavam na lista
    for (const pr of preRes) {
      const clean = (pr.clientPhone || "").replace(/\D/g, "");
      if (clean && clean.length >= 8 && !knownPhones.has(clean)) {
        knownPhones.add(clean);
        const autoClient: SalonClient = {
          id: `cli-pre-${pr.id}`,
          orgId: pr.orgId,
          name: pr.clientName,
          phone: clean,
          email: pr.clientEmail,
          createdAt: pr.createdAt || new Date().toISOString(),
          lastServiceTitle: pr.serviceName,
        };
        clients.push(autoClient);
        this.saveClient(autoClient).catch(() => {});
      }
    }

    // Extrai clientes de triagens que ainda não estavam na lista
    for (const sub of triages) {
      const clean = (sub.clientPhone || "").replace(/\D/g, "");
      if (clean && clean.length >= 8 && !knownPhones.has(clean)) {
        knownPhones.add(clean);
        const autoClient: SalonClient = {
          id: `cli-sub-${sub.id}`,
          orgId: sub.orgId,
          name: sub.clientName,
          phone: clean,
          email: sub.clientEmail,
          createdAt: sub.submittedAt || new Date().toISOString(),
          lastServiceTitle: sub.serviceTitle,
        };
        clients.push(autoClient);
        this.saveClient(autoClient).catch(() => {});
      }
    }

    // Extrai clientes de agendamentos que ainda não estavam na lista
    for (const apt of appointments) {
      const clean = (apt.clientPhone || "").replace(/\D/g, "");
      if (clean && clean.length >= 8 && !knownPhones.has(clean)) {
        knownPhones.add(clean);
        const autoClient: SalonClient = {
          id: `cli-apt-${apt.id}`,
          orgId: apt.orgId,
          name: apt.clientName,
          phone: clean,
          email: apt.clientEmail,
          createdAt: apt.createdAt || new Date().toISOString(),
          lastServiceTitle: apt.serviceTitle,
          lastVisitAt: apt.date ? `${apt.date}T10:00:00Z` : undefined,
        };
        clients.push(autoClient);
        this.saveClient(autoClient).catch(() => {});
      }
    }

    // Enriquece com estatísticas de agendamentos reais da cliente
    return clients.map((c) => {
      const cleanPhone = c.phone.replace(/\D/g, "");
      const clientApts = appointments.filter(
        (a) =>
          a.clientPhone.replace(/\D/g, "") === cleanPhone ||
          a.clientName.toLowerCase() === c.name.toLowerCase()
      );
      const totalAppointments = clientApts.length;
      const totalSpent = clientApts.reduce(
        (sum, a) => sum + (Number(a.price) || 0),
        0
      );
      const sortedApts = [...clientApts].sort((a, b) => (b.date > a.date ? 1 : -1));
      const lastApt = sortedApts[0];

      return {
        ...c,
        totalAppointments,
        totalSpent,
        lastVisitAt: lastApt?.date ? `${lastApt.date}T10:00:00Z` : c.lastVisitAt,
        lastServiceTitle: lastApt?.serviceTitle || c.lastServiceTitle,
      };
    });
  }

  static async saveClient(client: SalonClient): Promise<SalonClient> {
    const cleanPhone = client.phone.replace(/\D/g, "");
    const normalizedClient: SalonClient = {
      ...client,
      phone: cleanPhone || client.phone,
    };
    const savedLocal = SalonStore.saveClient(normalizedClient);
    if (!isSupabaseConfigured || !supabase) return savedLocal;

    try {
      let orgId = DEFAULT_ORG_ID;
      try {
        const org = await this.getOrganization();
        if (org && isUuid(org.id)) orgId = org.id;
      } catch (e) {}

      const payload: Record<string, unknown> = {
        org_id: orgId,
        name: normalizedClient.name,
        phone: cleanPhone || normalizedClient.phone,
        password_hash: normalizedClient.password || "123",
        email: normalizedClient.email || null,
        notes: normalizedClient.notes || null,
        last_visit_at: normalizedClient.lastVisitAt || null,
      };

      if (isUuid(normalizedClient.id)) {
        payload.id = normalizedClient.id;
      }

      const { data, error } = await supabase
        .from("salon_clients")
        .upsert(payload, { onConflict: "phone" })
        .select()
        .single();

      if (error) {
        console.warn("Supabase upsert salon_client error:", error);
        return savedLocal;
      }

      const savedResult = data ? { ...normalizedClient, id: data.id } : savedLocal;
      SalonStore.saveClient(savedResult);
      broadcastSync("client_saved", savedResult.id);
      return savedResult;
    } catch (err) {
      console.error("Error saving salon_client in Supabase", err);
      return savedLocal;
    }
  }

  static async loginClient(
    phone: string,
    password?: string
  ): Promise<{ success: boolean; client?: SalonClient; message?: string }> {
    const cleanPhone = phone.replace(/\D/g, "");
    const clients = await this.getClients();
    const client = clients.find(
      (c) => c.phone.replace(/\D/g, "") === cleanPhone
    );

    if (!client) {
      return {
        success: false,
        message: "Telefone não cadastrado. Por favor, crie seu cadastro com nome e senha.",
      };
    }

    if (password && client.password && client.password !== password) {
      return {
        success: false,
        message: "Senha incorreta. Verifique e tente novamente.",
      };
    }

    SalonStore.setActiveClient(client);
    return { success: true, client };
  }

  // =========================================
  // MÓDULO: DISPONIBILIDADE E PRÉ-RESERVAS
  // =========================================

  static async getAvailableDays(
    professionalId: string,
    startDate?: string,
    endDate?: string
  ): Promise<AvailableDay[]> {
    const validProfId = resolveValidUuid(professionalId, DEFAULT_GLEICY_ID) || professionalId;
    if (!isSupabaseConfigured || !supabase) {
      return SalonStore.getAvailableDays(validProfId, startDate, endDate);
    }
    try {
      let query = supabase
        .from('available_days')
        .select('*')
        .eq('professional_id', validProfId)
        .order('date', { ascending: true });
      if (startDate) query = query.gte('date', startDate);
      if (endDate) query = query.lte('date', endDate);
      const { data, error } = await query;
      if (error) throw error;
      return (data || []).map(this.mapAvailableDay);
    } catch (err) {
      console.error('getAvailableDays error:', err);
      return SalonStore.getAvailableDays(validProfId, startDate, endDate);
    }
  }

  static async saveAvailableDay(
    day: DayAvailabilityConfig & { professionalId: string; orgId: string }
  ): Promise<AvailableDay | null> {
    const validOrgId = resolveValidUuid(day.orgId, DEFAULT_ORG_ID) || day.orgId;
    const validProfId = resolveValidUuid(day.professionalId, DEFAULT_GLEICY_ID) || day.professionalId;
    
    // Salva localmente primeiro para sincronia imediata
    const localSaved = SalonStore.saveAvailableDay({
      ...day,
      orgId: validOrgId,
      professionalId: validProfId,
    });

    if (!isSupabaseConfigured || !supabase) return localSaved;

    try {
      const { data, error } = await supabase
        .from('available_days')
        .upsert(
          {
            org_id: validOrgId,
            professional_id: validProfId,
            date: day.date,
            start_time: day.startTime,
            end_time: day.endTime,
            break_start: day.breakStart || null,
            break_end: day.breakEnd || null,
            is_open: day.isOpen !== undefined ? day.isOpen : true,
            max_clients: day.maxClients !== undefined ? Number(day.maxClients) : 8,
            slot_interval_min: day.slotIntervalMin !== undefined ? Number(day.slotIntervalMin) : 15,
            custom_notes: day.customNotes || null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'professional_id,date' }
        )
        .select()
        .single();
      if (error) throw error;
      return this.mapAvailableDay(data);
    } catch (err) {
      console.error('saveAvailableDay error:', err);
      return localSaved;
    }
  }

  static async saveAvailableDaysBatch(
    days: (DayAvailabilityConfig & { professionalId: string; orgId: string })[]
  ): Promise<number> {
    const sanitizedDays = days.map((d) => ({
      ...d,
      orgId: resolveValidUuid(d.orgId, DEFAULT_ORG_ID) || d.orgId,
      professionalId: resolveValidUuid(d.professionalId, DEFAULT_GLEICY_ID) || d.professionalId,
    }));

    // Salva localmente primeiro
    const localCount = SalonStore.saveAvailableDaysBatch(sanitizedDays);

    if (!isSupabaseConfigured || !supabase) return localCount;

    try {
      const rows = sanitizedDays.map((d) => ({
        org_id: d.orgId,
        professional_id: d.professionalId,
        date: d.date,
        start_time: d.startTime,
        end_time: d.endTime,
        break_start: d.breakStart || null,
        break_end: d.breakEnd || null,
        is_open: d.isOpen !== undefined ? d.isOpen : true,
        max_clients: d.maxClients !== undefined ? Number(d.maxClients) : 8,
        slot_interval_min: d.slotIntervalMin !== undefined ? Number(d.slotIntervalMin) : 15,
        custom_notes: d.customNotes || null,
        updated_at: new Date().toISOString(),
      }));
      const { error, count } = await supabase
        .from('available_days')
        .upsert(rows, { onConflict: 'professional_id,date' });
      if (error) throw error;
      return count || days.length;
    } catch (err) {
      console.error('saveAvailableDaysBatch error:', err);
      return localCount;
    }
  }

  static async closeAvailableDay(professionalId: string, date: string): Promise<boolean> {
    const validProfId = resolveValidUuid(professionalId, DEFAULT_GLEICY_ID) || professionalId;
    SalonStore.closeAvailableDay(validProfId, date);

    if (!isSupabaseConfigured || !supabase) return true;

    try {
      const { error } = await supabase
        .from('available_days')
        .update({ is_open: false, updated_at: new Date().toISOString() })
        .eq('professional_id', validProfId)
        .eq('date', date);
      if (error) throw error;
      return true;
    } catch (err) {
      console.error('closeAvailableDay error:', err);
      return true;
    }
  }

  static async getPreReservations(orgId: string, status?: string): Promise<PreReservation[]> {
    const validOrgId = resolveValidUuid(orgId, DEFAULT_ORG_ID) || orgId;
    if (!isSupabaseConfigured || !supabase) {
      return SalonStore.getPreReservations(validOrgId, status);
    }
    try {
      let query = supabase
        .from('pre_reservations')
        .select('*, services(title)')
        .eq('org_id', validOrgId)
        .order('created_at', { ascending: false });
      if (status) query = query.eq('status', status);
      const { data, error } = await query;
      if (error) throw error;
      return (data || []).map(this.mapPreReservation);
    } catch (err) {
      console.error('getPreReservations error:', err);
      return SalonStore.getPreReservations(validOrgId, status);
    }
  }

  static async createPreReservation(
    pr: Omit<PreReservation, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<PreReservation | null> {
    const validOrgId = resolveValidUuid(pr.orgId, DEFAULT_ORG_ID) || pr.orgId;
    const validProfId = resolveValidUuid(pr.professionalId, DEFAULT_GLEICY_ID) || pr.professionalId;
    const validSrvId = resolveValidUuid(pr.serviceId);

    const localSaved = SalonStore.createPreReservation({
      ...pr,
      orgId: validOrgId,
      professionalId: validProfId,
      serviceId: validSrvId || pr.serviceId,
    });

    if (!isSupabaseConfigured || !supabase) return localSaved;

    try {
      // Blindagem contra duplicidade: se já houver pré-reserva aberta para o mesmo telefone e data, reutiliza/atualiza
      const { data: existingPre } = await supabase
        .from('pre_reservations')
        .select('id')
        .eq('org_id', validOrgId)
        .eq('client_phone', pr.clientPhone)
        .eq('requested_date', pr.requestedDate)
        .neq('status', 'declined')
        .maybeSingle();

      const prePayload: Record<string, unknown> = {
        org_id: validOrgId,
        professional_id: validProfId,
        service_id: validSrvId || null,
        client_name: pr.clientName,
        client_phone: pr.clientPhone,
        client_email: pr.clientEmail || null,
        requested_date: pr.requestedDate,
        preferred_period: pr.preferredPeriod,
        preferred_time: pr.preferredTime || null,
        triage_submission_id: resolveValidUuid(pr.triageSubmissionId) || null,
        admin_notes: (pr as any).reason || pr.adminNotes || null,
        status: 'pending',
      };

      if (existingPre?.id) {
        prePayload.id = existingPre.id;
      }

      const { data, error } = await supabase
        .from('pre_reservations')
        .upsert(prePayload)
        .select()
        .single();
      if (error) throw error;
      if (pr.clientPhone && pr.clientName) {
        this.saveClient({
          id: `cli-${Date.now()}`,
          orgId: validOrgId,
          name: pr.clientName.trim(),
          phone: pr.clientPhone.trim(),
          email: pr.clientEmail?.trim(),
          createdAt: new Date().toISOString(),
          lastServiceTitle: pr.serviceName,
        }).catch((e) => console.warn("Auto-register client from pre-reservation error:", e));
      }

      broadcastSync("pre_reservation_saved", data?.id || localSaved?.id);
      return this.mapPreReservation(data);
    } catch (err) {
      console.error('createPreReservation error:', err);
      return localSaved;
    }
  }

  static async savePreReservation(
    pr: Omit<PreReservation, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<PreReservation | null> {
    return this.createPreReservation(pr);
  }

  static async updatePreReservationStatus(
    id: string,
    status: PreReservationStatus,
    adminNotes?: string,
    convertedAppointmentId?: string
  ): Promise<boolean> {
    SalonStore.updatePreReservationStatus(id, status, adminNotes, convertedAppointmentId);

    if (!isSupabaseConfigured || !supabase) return true;

    try {
      const { error } = await supabase
        .from('pre_reservations')
        .update({
          status,
          admin_notes: adminNotes || null,
          converted_appointment_id: resolveValidUuid(convertedAppointmentId) || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);
      if (error) throw error;
      return true;
    } catch (err) {
      console.error('updatePreReservationStatus error:', err);
      return true;
    }
  }

  static async getAvailabilityTemplates(professionalId: string): Promise<AvailabilityTemplate[]> {
    const validProfId = resolveValidUuid(professionalId, DEFAULT_GLEICY_ID) || professionalId;
    if (!isSupabaseConfigured || !supabase) {
      return SalonStore.getAvailabilityTemplates(validProfId);
    }
    try {
      const { data, error } = await supabase
        .from('availability_templates')
        .select('*')
        .eq('professional_id', validProfId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data || []).map(this.mapAvailabilityTemplate);
    } catch (err) {
      console.error('getAvailabilityTemplates error:', err);
      return SalonStore.getAvailabilityTemplates(validProfId);
    }
  }

  static async saveAvailabilityTemplate(
    template: Omit<AvailabilityTemplate, 'id' | 'createdAt'>
  ): Promise<AvailabilityTemplate | null> {
    const validOrgId = resolveValidUuid(template.orgId, DEFAULT_ORG_ID) || template.orgId;
    const validProfId = resolveValidUuid(template.professionalId, DEFAULT_GLEICY_ID) || template.professionalId;

    const localSaved = SalonStore.saveAvailabilityTemplate({
      ...template,
      orgId: validOrgId,
      professionalId: validProfId,
    });

    if (!isSupabaseConfigured || !supabase) return localSaved;

    try {
      const { data, error } = await supabase
        .from('availability_templates')
        .insert({
          org_id: validOrgId,
          professional_id: validProfId,
          name: template.name,
          days_config: template.daysConfig,
        })
        .select()
        .single();
      if (error) throw error;
      return this.mapAvailabilityTemplate(data);
    } catch (err) {
      console.error('saveAvailabilityTemplate error:', err);
      return localSaved;
    }
  }

  // Mappers
  private static mapAvailableDay(row: Record<string, unknown>): AvailableDay {
    return {
      id: row.id as string,
      orgId: row.org_id as string,
      professionalId: row.professional_id as string,
      date: row.date as string,
      startTime: row.start_time as string,
      endTime: row.end_time as string,
      breakStart: row.break_start as string | undefined,
      breakEnd: row.break_end as string | undefined,
      isOpen: row.is_open as boolean,
      maxClients: (row.max_clients as number) || 8,
      slotIntervalMin: (row.slot_interval_min as number) || 15,
      customNotes: row.custom_notes as string | undefined,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    };
  }

  private static mapPreReservation(row: Record<string, unknown>): PreReservation {
    const servicesRow = row.services as { title: string } | null;
    return {
      id: row.id as string,
      orgId: row.org_id as string,
      professionalId: row.professional_id as string,
      serviceId: row.service_id as string | undefined,
      serviceName: servicesRow?.title,
      clientName: row.client_name as string,
      clientPhone: row.client_phone as string,
      clientEmail: row.client_email as string | undefined,
      requestedDate: row.requested_date as string,
      preferredPeriod: (row.preferred_period as PreferredPeriod) || 'qualquer',
      preferredTime: row.preferred_time as string | undefined,
      triageSubmissionId: row.triage_submission_id as string | undefined,
      status: (row.status === 'confirmed' ? 'approved' : row.status as PreReservationStatus) || 'pending',
      convertedAppointmentId: row.converted_appointment_id as string | undefined,
      adminNotes: row.admin_notes as string | undefined,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    };
  }

  private static mapAvailabilityTemplate(row: Record<string, unknown>): AvailabilityTemplate {
    return {
      id: row.id as string,
      orgId: row.org_id as string,
      professionalId: row.professional_id as string,
      name: row.name as string,
      daysConfig: (row.days_config as AvailabilityTemplate['daysConfig']) || [],
      createdAt: row.created_at as string,
    };
  }

  // Delegadores de instância
  getAvailableDays = SupabaseDataService.getAvailableDays;
  saveAvailableDay = SupabaseDataService.saveAvailableDay;
  saveAvailableDaysBatch = SupabaseDataService.saveAvailableDaysBatch;
  closeAvailableDay = SupabaseDataService.closeAvailableDay;
  getPreReservations = SupabaseDataService.getPreReservations;
  createPreReservation = SupabaseDataService.createPreReservation;
  savePreReservation = SupabaseDataService.savePreReservation;
  updatePreReservationStatus = SupabaseDataService.updatePreReservationStatus;
  getAvailabilityTemplates = SupabaseDataService.getAvailabilityTemplates;
  saveAvailabilityTemplate = SupabaseDataService.saveAvailabilityTemplate;
  getProposalsByClientPhone = SupabaseDataService.getProposalsByClientPhone;
  getAppointmentsByClientPhone = SupabaseDataService.getAppointmentsByClientPhone;
  recordProposalFirstView = SupabaseDataService.recordProposalFirstView;
  approveTriageDirectly = SupabaseDataService.approveTriageDirectly;
}

