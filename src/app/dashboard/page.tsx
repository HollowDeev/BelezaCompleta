"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/supabase/authContext";
import { SupabaseDataService } from "@/lib/supabase/api";

import { Sidebar, AdminTab } from "@/components/layout/Sidebar";
import { DayOperationView } from "@/components/admin/DayOperationView";
import { CalendarMasterView } from "@/components/admin/CalendarMasterView";
import { TriageReviewQueue } from "@/components/admin/TriageReviewQueue";
import { ProposalsManagerView } from "@/components/admin/ProposalsManagerView";
import { ServiceManager } from "@/components/admin/ServiceManager";
import { TriageFormsManagerView } from "@/components/admin/TriageFormsManagerView";
import { FinancialOverview } from "@/components/admin/FinancialOverview";
import { ClientsManagerView } from "@/components/admin/ClientsManagerView";
import { NewAppointmentModal } from "@/components/admin/NewAppointmentModal";
import { ProposalBuilderModal } from "@/components/proposal/ProposalBuilderModal";
import { LuxuryProposalPDF } from "@/components/proposal/LuxuryProposalPDF";

import { ServiceItem } from "@/types/service";
import { TriageForm, TriageSubmission } from "@/types/triage";
import { LuxuryProposal, ProposalTemplate } from "@/types/proposal";
import { Appointment } from "@/types/appointment";
import { SalonClient } from "@/types/client";
import { SalonOrganization, UserProfile, DashboardMode } from "@/types/salon";
import {
  Sparkles,
  ArrowLeft,
  LogOut,
  Building2,
  CheckCircle2,
  Shield,
  Eye,
  RefreshCw,
  Edit3,
  ExternalLink,
  X,
} from "lucide-react";
import Link from "next/link";

export default function DashboardPage() {
  const router = useRouter();
  const { user, profile, role, loading: authLoading, signOut } = useAuth();

  // Estados principais da aplicação
  const [adminTab, setAdminTab] = useState<AdminTab>("operacao");
  const [dashboardMode, setDashboardMode] = useState<DashboardMode>("intermediary");

  // Dados sincronizados (Supabase / localStore)
  const [organization, setOrganization] = useState<SalonOrganization | null>(null);
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [triageForms, setTriageForms] = useState<TriageForm[]>([]);
  const [triageSubmissions, setTriageSubmissions] = useState<TriageSubmission[]>([]);
  const [proposals, setProposals] = useState<LuxuryProposal[]>([]);
  const [proposalTemplates, setProposalTemplates] = useState<ProposalTemplate[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [clients, setClients] = useState<SalonClient[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);


  // Modais e visualizadores
  const [selectedDate, setSelectedDate] = useState("2026-10-18");
  const [isNewAppointmentModalOpen, setIsNewAppointmentModalOpen] = useState(false);
  const [newAppointmentPrefill, setNewAppointmentPrefill] = useState<{ date?: string; time?: string }>({});
  const [activeSubmissionForProposal, setActiveSubmissionForProposal] = useState<TriageSubmission | null>(null);
  const [editingProposal, setEditingProposal] = useState<LuxuryProposal | null>(null);
  const [viewingProposalModal, setViewingProposalModal] = useState<LuxuryProposal | null>(null);

  // Verificação de autenticação
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  // Carregamento de dados assíncronos do Supabase
  const refreshAll = async () => {
    setIsLoadingData(true);
    try {
      const [org, profs, srvs, forms, subs, props, tpls, apts, clis] = await Promise.all([
        SupabaseDataService.getOrganization(),
        SupabaseDataService.getProfiles(),
        SupabaseDataService.getServices(),
        SupabaseDataService.getTriageForms(),
        SupabaseDataService.getTriageSubmissions(),
        SupabaseDataService.getProposals(),
        SupabaseDataService.getProposalTemplates(),
        SupabaseDataService.getAppointments(),
        SupabaseDataService.getClients(),
      ]);

      setOrganization(org);
      setProfiles(profs);
      setServices(srvs);
      setTriageForms(forms);
      setTriageSubmissions(subs);
      setProposals(props);
      setProposalTemplates(tpls);
      setAppointments(apts);
      setClients(clis);

      if (profile?.dashboardMode) {
        setDashboardMode(profile.dashboardMode);
      }
    } catch (err) {
      console.error("Erro ao carregar dados do Supabase", err);
    } finally {
      setIsLoadingData(false);
    }
  };

  useEffect(() => {
    refreshAll();
  }, []);

  // Salvar novo agendamento
  const handleSaveNewAppointment = async (newApt: Appointment) => {
    await SupabaseDataService.saveAppointment(newApt);
    await refreshAll();
    setIsNewAppointmentModalOpen(false);
  };

  // Salvar proposta gerada ou editada
  const handleSaveProposal = async (proposal: LuxuryProposal) => {
    await SupabaseDataService.saveProposal(proposal);

    // Atualiza a triagem vinculada
    if (proposal.triageSubmissionId) {
      const sub = triageSubmissions.find((s) => s.id === proposal.triageSubmissionId);
      if (sub) {
        await SupabaseDataService.saveTriageSubmission({
          ...sub,
          status: "proposal_sent",
          proposalId: proposal.id,
        });
      }
    }

    await refreshAll();
    setActiveSubmissionForProposal(null);
    setEditingProposal(null);
    setViewingProposalModal(proposal);
  };

  // Aprovação de proposta
  const handleApproveProposal = async (proposalId: string) => {
    await SupabaseDataService.approveProposal(proposalId);
    await refreshAll();
  };

  // Troca de modo
  const handleModeChange = (newMode: DashboardMode) => {
    setDashboardMode(newMode);
    if (user) {
      SupabaseDataService.updateCurrentUserDashboardMode(user.id, newMode);
    }
  };

  // Redireciona caso o usuário clique na aba SaaS e for Super Admin
  const handleSelectTab = (tab: AdminTab) => {
    if (tab === "saas") {
      if (role === "super_admin") {
        router.push("/saas-admin");
        return;
      }
    }
    setAdminTab(tab);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#FAF7F2] flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 rounded-full border-4 border-[#C59B27] border-t-transparent animate-spin" />
        <p className="font-editorial text-[#5E372C] text-lg">Carregando Painel Operacional...</p>
      </div>
    );
  }

  const pendingTriageCount = triageSubmissions.filter((s) => s.status === "pending_review").length;

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-[#33302C] flex">
      {/* Sidebar de Navegação Lateral */}
      <Sidebar
        currentTab={adminTab}
        onSelectTab={handleSelectTab}
        onViewAsClient={() => router.push("/")}
        pendingTriageCount={pendingTriageCount}
      />

      {/* Conteúdo Principal do Painel */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Barra de Topo / Header Principal */}
        <header className="bg-white border-b border-[#E7DCCE] px-4 sm:px-8 py-3.5 flex items-center justify-between sticky top-0 z-30 shadow-2xs">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-full bg-[#FAF7F2] border border-[#E7DCCE] flex items-center justify-center text-[#5E372C]">
              <Building2 className="w-4 h-4 text-[#C59B27]" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-sm text-[#2D1914]">
                  {profile?.name || (user?.user_metadata?.name as string) || user?.email || "Gleicy Ronha"}
                </span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200">
                  {role === "super_admin"
                    ? "Super Admin"
                    : role === "salon_owner"
                    ? "Dona do Salão"
                    : "Parceira"}
                </span>
              </div>
              <span className="text-[11px] text-[#7B493B]">
                {profile?.specialty || "Espaço da Beleza Gleicy Ronha"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Status do Banco Supabase */}
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Supabase Ativo</span>
            </div>

            {/* Botão de Atualizar Dados */}
            <button
              onClick={refreshAll}
              disabled={isLoadingData}
              className="p-2 rounded-xl bg-[#FAF7F2] hover:bg-[#F3ECE1] text-[#5E372C] border border-[#E7DCCE] transition-all"
              title="Recarregar Dados do Banco"
            >
              <RefreshCw className={`w-4 h-4 ${isLoadingData ? "animate-spin" : ""}`} />
            </button>

            {/* Logout */}
            <button
              onClick={() => signOut().then(() => router.push("/login"))}
              className="p-2 rounded-xl bg-[#FAF7F2] hover:bg-red-50 text-[#7B493B] hover:text-red-700 border border-[#E7DCCE] hover:border-red-200 transition-all"
              title="Encerrar Sessão"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Banner de Aviso de Modo Super Admin */}
        {role === "super_admin" && (
          <div className="bg-[#2D1914] text-white px-4 sm:px-8 py-2 text-xs flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Shield className="w-3.5 h-3.5 text-[#DBAE3B]" />
              <span>Você está navegando com privilégios de Super Admin SaaS.</span>
            </div>
            <Link
              href="/saas-admin"
              className="text-[#DBAE3B] hover:underline font-semibold text-[11px]"
            >
              Voltar ao Painel SaaS →
            </Link>
          </div>
        )}

        {/* Área de Visualização Dinâmica das Abas */}
        <main className="flex-1 p-4 sm:p-8 max-w-7xl w-full mx-auto space-y-6">
          {adminTab === "operacao" && (
            <DayOperationView
              appointments={appointments}
              triageSubmissions={triageSubmissions}
              services={services}
              selectedDate={selectedDate}
              onDateChange={setSelectedDate}
              onOpenNewAppointment={() => {
                setNewAppointmentPrefill({});
                setIsNewAppointmentModalOpen(true);
              }}
              onOpenQuickProposal={(submission) => {
                if (submission) {
                  setActiveSubmissionForProposal(submission);
                } else if (triageSubmissions.length > 0) {
                  setActiveSubmissionForProposal(triageSubmissions[0]);
                }
              }}
              onViewProposal={(propId: string) => {
                const prop = proposals.find((p) => p.id === propId);
                if (prop) setViewingProposalModal(prop);
              }}
            />
          )}

          {adminTab === "agenda" && (
            <CalendarMasterView
              appointments={appointments}
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
              onNewAppointment={(prefilledDate?: string, prefilledTime?: string) => {
                setNewAppointmentPrefill({ date: prefilledDate, time: prefilledTime });
                setIsNewAppointmentModalOpen(true);
              }}
              onSelectProposal={(propId: string) => {
                const prop = proposals.find((p) => p.id === propId);
                if (prop) setViewingProposalModal(prop);
              }}
            />
          )}

          {adminTab === "triagens" && (
            <TriageReviewQueue
              submissions={triageSubmissions}
              services={services}
              onGenerateProposal={(proposal: LuxuryProposal) => {
                handleSaveProposal(proposal);
              }}
              onViewProposal={(propId: string) => {
                const prop = proposals.find((p) => p.id === propId);
                if (prop) setViewingProposalModal(prop);
              }}
            />
          )}

          {adminTab === "propostas" && (
            <ProposalsManagerView
              proposals={proposals}
              onViewProposal={(propId: string) => {
                const prop = proposals.find((p) => p.id === propId);
                if (prop) setViewingProposalModal(prop);
              }}
              onEditProposal={(prop: LuxuryProposal) => {
                setEditingProposal(prop);
              }}
            />
          )}

          {adminTab === "clientes" && (
            <ClientsManagerView
              clients={clients}
              appointments={appointments}
              proposals={proposals}
              triageSubmissions={triageSubmissions}
              onSaveClient={async (newCli) => {
                await SupabaseDataService.saveClient(newCli);
                await refreshAll();
              }}
              onViewProposal={(propId: string) => {
                const prop = proposals.find((p) => p.id === propId);
                if (prop) setViewingProposalModal(prop);
              }}
            />
          )}

          {adminTab === "servicos" && (
            <ServiceManager
              services={services}
              triageForms={triageForms}
              profiles={profiles}
              onRefresh={refreshAll}
            />
          )}

          {adminTab === "modelos-triagem" && (
            <TriageFormsManagerView
              forms={triageForms}
              services={services}
              onRefresh={refreshAll}
            />
          )}

          {adminTab === "financeiro" && (
            <FinancialOverview
              mode={dashboardMode}
              appointments={appointments}
              services={services}
            />
          )}
        </main>
      </div>

      {/* Modal Novo Agendamento */}
      {isNewAppointmentModalOpen && (
        <NewAppointmentModal
          services={services}
          prefilledDate={newAppointmentPrefill.date}
          prefilledTime={newAppointmentPrefill.time}
          onSave={handleSaveNewAppointment}
          onClose={() => setIsNewAppointmentModalOpen(false)}
        />
      )}

      {/* Modal Gerador ou Editor de Proposta de Luxo */}
      {(activeSubmissionForProposal || editingProposal) && (
        <ProposalBuilderModal
          submission={
            activeSubmissionForProposal ||
            triageSubmissions.find((s) => s.id === editingProposal?.triageSubmissionId) ||
            ({
              id: editingProposal?.triageSubmissionId || `sub-${Date.now()}`,
              orgId: editingProposal?.orgId || "org-gleicy-ronha",
              formId: "form-triage-iluminado",
              serviceId: "srv-iluminado-chocolate",
              serviceTitle: editingProposal?.subtitle || "Transformação Personalizada",
              clientName: editingProposal?.clientName || "Cliente",
              clientPhone: editingProposal?.clientPhone || "",
              clientEmail: editingProposal?.clientEmail || "",
              answers: [],
              photos: {},
              preferredDate: "A combinar",
              preferredTimeSlot: "Horário flexível",
              status: "pending_review",
              createdAt: editingProposal?.createdAt || new Date().toISOString(),
              submittedAt: editingProposal?.createdAt || new Date().toISOString(),
            } as TriageSubmission)
          }
          initialProposal={editingProposal}
          services={services}
          onSave={handleSaveProposal}
          onClose={() => {
            setActiveSubmissionForProposal(null);
            setEditingProposal(null);
          }}
        />
      )}

      {/* Modal Visualizador de Proposta para a Gleicy (Contido na Altura do Monitor) */}
      {viewingProposalModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-hidden">
          <div className="bg-[#FAF7F2] rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-[#E7DCCE] overflow-hidden animate-scale-up">
            <div className="p-4 sm:p-5 bg-white border-b border-[#E7DCCE] flex flex-wrap items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase tracking-wider text-[#AD841D] font-bold">
                  Proposta Comercial
                </span>
                <span className="text-stone-300">•</span>
                <span className="text-xs font-bold text-[#2D1914]">{viewingProposalModal.clientName}</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const toEdit = viewingProposalModal;
                    setViewingProposalModal(null);
                    setEditingProposal(toEdit);
                  }}
                  className="px-3 py-1.5 text-xs font-semibold text-[#5E372C] bg-[#FAF7F2] hover:bg-[#F3ECE1] border border-[#E7DCCE] rounded-xl flex items-center gap-1.5 transition-all shadow-2xs"
                >
                  <Edit3 className="w-3.5 h-3.5 text-[#AD841D]" />
                  <span>Editar Proposta</span>
                </button>

                <a
                  href={`/proposta/${viewingProposalModal.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 text-xs font-semibold text-[#2D1914] bg-white hover:bg-stone-50 border border-[#E7DCCE] rounded-xl flex items-center gap-1.5 transition-all shadow-2xs"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-[#C59B27]" />
                  <span>Abrir Página Web da Cliente</span>
                </a>

                <button
                  onClick={() => setViewingProposalModal(null)}
                  className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 flex items-center justify-center text-stone-600 transition-colors"
                  title="Fechar visualização"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="overflow-y-auto flex-1 p-3 sm:p-6">
              <LuxuryProposalPDF
                proposal={viewingProposalModal}
                isModalView={true}
                onEdit={() => {
                  const toEdit = viewingProposalModal;
                  setViewingProposalModal(null);
                  setEditingProposal(toEdit);
                }}
                onApprove={(propId: string) => {
                  handleApproveProposal(propId);
                  setViewingProposalModal(null);
                }}
                onBack={() => setViewingProposalModal(null)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
