import { supabase, isSupabaseConfigured } from "./client";
import { SalonOrganization, UserProfile, DashboardMode } from "@/types/salon";
import { ServiceItem, ServiceStep } from "@/types/service";
import { TriageForm, TriageSubmission } from "@/types/triage";
import { LuxuryProposal, ProposalTemplate } from "@/types/proposal";
import { Appointment } from "@/types/appointment";
import { SalonClient } from "@/types/client";
import { SalonStore } from "@/lib/storage/localStore";

// Utilitários de Resolução de UUID para integridade com PostgreSQL
export const isUuid = (str?: string | null): boolean =>
  str ? /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str) : false;

export const DEFAULT_ORG_ID = "11111111-1111-4111-8111-111111111111";
export const DEFAULT_GLEICY_ID = "58f26242-1e53-432e-b924-dea25ee2068a";
export const DEFAULT_DEBORA_ID = "c88c989f-6f6d-421e-95ca-4992eaeb7ea3";
export const DEFAULT_TRIAGE_FORM_ID = "33333333-3333-4333-8333-333333333331";

export function resolveValidUuid(
  id?: string | null,
  fallback?: string | null
): string | null {
  if (isUuid(id)) return id!;
  if (id === "org-gleicy-ronha") return DEFAULT_ORG_ID;
  if (id === "user-gleicy-ronha") return DEFAULT_GLEICY_ID;
  if (id === "user-debora-stylist") return DEFAULT_DEBORA_ID;
  if (id === "form-triage-iluminado") return DEFAULT_TRIAGE_FORM_ID;
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

      return data.map((p) => ({
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

      if (error || !data || data.length === 0) {
        return SalonStore.getServices();
      }

      return data.map((s) => ({
        id: s.id,
        orgId: s.org_id,
        professionalId: s.professional_id,
        title: s.title,
        slug: s.slug,
        category: s.category,
        description: s.description || "",
        price: Number(s.price),
        promotionalPrice: s.promotional_price ? Number(s.promotional_price) : undefined,
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
      let triageFormId = service.requiresTriage
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

      return data.map((f) => ({
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

      if (error || !data || data.length === 0) {
        return SalonStore.getTriageSubmissions();
      }

      return data.map((s) => ({
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
        answers: s.answers || [],
        photos: s.photos || {},
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

  static async saveTriageSubmission(sub: TriageSubmission): Promise<void> {
    SalonStore.saveTriageSubmission(sub);
    if (!isSupabaseConfigured || !supabase) return;

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
        preferred_time_slot: sub.preferredTimeSlot || null,
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
        console.error("Supabase upsert triage_submissions error:", error);
        throw new Error(error.message || "Erro ao salvar submissão de triagem.");
      }

      if (data) {
        SalonStore.saveTriageSubmission({ ...sub, id: data.id });
      }
    } catch (err) {
      console.error("Error saving triage submission in Supabase", err);
      throw err;
    }
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

      if (error || !data || data.length === 0) {
        return SalonStore.getProposals();
      }

      return data.map((p) => ({
        id: p.id,
        orgId: p.org_id,
        professionalId: p.professional_id,
        triageSubmissionId: p.triage_submission_id,
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
        items: p.items || [],
        totalOriginal: Number(p.total_original),
        totalWithDiscount: Number(p.total_with_discount),
        pixDiscountPercent: Number(p.pix_discount_percent || 5),
        pixTotal: Number(p.pix_total),
        creditCardTerms: "Valor integral, sujeito às condições de parcelamento.",
        status: p.status,
        expiresAt: p.expires_at,
        createdAt: p.created_at,
        approvedAt: p.approved_at,
      }));
    } catch (err) {
      console.error("Error fetching proposals from Supabase", err);
      return SalonStore.getProposals();
    }
  }

  static async getProposalById(id: string): Promise<LuxuryProposal | undefined> {
    const list = await this.getProposals();
    return list.find((p) => p.id === id);
  }

  static async saveProposal(prop: LuxuryProposal): Promise<void> {
    SalonStore.saveProposal(prop);
    if (!isSupabaseConfigured || !supabase) return;

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
        items: prop.items || [],
        total_original: Number(prop.totalOriginal) || 0,
        total_with_discount: Number(prop.totalWithDiscount) || 0,
        pix_discount_percent: Number(prop.pixDiscountPercent) || 5,
        pix_total: Number(prop.pixTotal) || 0,
        status: prop.status,
        expires_at: prop.expiresAt || null,
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

      if (data) {
        SalonStore.saveProposal({ ...prop, id: data.id });
      }
    } catch (err) {
      console.error("Error saving proposal in Supabase", err);
      throw err;
    }
  }

  static async approveProposal(proposalId: string): Promise<void> {
    SalonStore.approveProposal(proposalId);
    if (!isSupabaseConfigured || !supabase) return;

    try {
      const now = new Date().toISOString();
      await supabase
        .from("proposals")
        .update({ status: "approved", approved_at: now })
        .eq("id", proposalId);

      await supabase
        .from("appointments")
        .update({ status: "confirmed", payment_status: "paid" })
        .eq("proposal_id", proposalId);

      await supabase
        .from("triage_submissions")
        .update({ status: "approved" })
        .eq("proposal_id", proposalId);
    } catch (err) {
      console.error("Error approving proposal in Supabase", err);
    }
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

      return data.map((t) => ({
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

      if (error || !data || data.length === 0) {
        return SalonStore.getAppointments();
      }

      return data.map((a) => ({
        id: a.id,
        orgId: a.org_id,
        professionalId: a.professional_id,
        professionalName: a.profiles?.name || "Gleicy Ronha",
        serviceId: a.service_id,
        serviceTitle: a.services?.title || "Transformação Capilar",
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
        notes: a.notes,
        createdAt: a.created_at,
      }));
    } catch (err) {
      console.error("Error fetching appointments from Supabase", err);
      return SalonStore.getAppointments();
    }
  }

  static async saveAppointment(apt: Appointment): Promise<void> {
    SalonStore.saveAppointment(apt);
    if (!isSupabaseConfigured || !supabase) return;

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
        service_id: resolveValidUuid(apt.serviceId),
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

      if (data) {
        SalonStore.saveAppointment({ ...apt, id: data.id });
      }
    } catch (err) {
      console.error("Error saving appointment in Supabase", err);
      throw err;
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

        if (error || !data || data.length === 0) {
          clients = SalonStore.getClients();
        } else {
          clients = data.map((c) => ({
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

    // Enriquece com estatísticas de agendamentos reais da cliente
    const appointments = await this.getAppointments();
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
    const savedLocal = SalonStore.saveClient(client);
    if (!isSupabaseConfigured || !supabase) return savedLocal;

    try {
      let orgId = DEFAULT_ORG_ID;
      try {
        const org = await this.getOrganization();
        if (org && isUuid(org.id)) orgId = org.id;
      } catch (e) {}

      const payload: Record<string, unknown> = {
        org_id: orgId,
        name: client.name,
        phone: client.phone,
        password_hash: client.password || "123",
        email: client.email || null,
        notes: client.notes || null,
        last_visit_at: client.lastVisitAt || null,
      };

      if (isUuid(client.id)) {
        payload.id = client.id;
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

      return data ? { ...client, id: data.id } : savedLocal;
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
}
