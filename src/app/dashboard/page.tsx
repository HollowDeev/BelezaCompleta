"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/supabase/authContext";
import { SupabaseDataService } from "@/lib/supabase/api";
import { supabase, isSupabaseConfigured } from "@/lib/supabase/client";
import { subscribeToSync } from "@/lib/sync/syncBus";

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
import { FloatingPill } from "@/components/admin/FloatingPill";
import { AvailabilityManagerView } from "@/components/admin/AvailabilityManagerView";
import { PreReservationQueue } from "@/components/admin/PreReservationQueue";
import { ProposalBuilderModal } from "@/components/proposal/ProposalBuilderModal";
import { SalonSettingsView } from "@/components/admin/SalonSettingsView";
import { LuxuryProposalPDF } from "@/components/proposal/LuxuryProposalPDF";
import { useKeyboardShortcuts } from "@/lib/useKeyboardShortcuts";
import { InteractiveTutorialTour } from "@/components/tutorial/InteractiveTutorialTour";
import { TutorialHelpModal } from "@/components/tutorial/TutorialHelpModal";
import { TUTORIAL_STEPS } from "@/components/tutorial/tutorialSteps";

import { ServiceItem } from "@/types/service";
import { TriageForm, TriageSubmission } from "@/types/triage";
import { LuxuryProposal, ProposalTemplate } from "@/types/proposal";
import { Appointment } from "@/types/appointment";
import { SalonClient } from "@/types/client";
import { PreReservation, AvailableDay } from "@/types/availability";
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
  GraduationCap,
  MessageCircle,
} from "lucide-react";
import { generateWhatsAppLink } from "@/lib/utils";
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
  const [preReservations, setPreReservations] = useState<PreReservation[]>([]);
  const [availableDays, setAvailableDays] = useState<AvailableDay[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

  // Modais e visualizadores
  const [selectedDate, setSelectedDate] = useState("");

  useEffect(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    setSelectedDate(`${y}-${m}-${d}`);
  }, []);
  const [isNewAppointmentModalOpen, setIsNewAppointmentModalOpen] = useState(false);
  const [newAppointmentPrefill, setNewAppointmentPrefill] = useState<{
    date?: string;
    time?: string;
    clientName?: string;
    clientPhone?: string;
    serviceId?: string;
    preReservationId?: string;
  }>({});
  const [activeSubmissionForProposal, setActiveSubmissionForProposal] = useState<TriageSubmission | null>(null);
  const [activePreReservationForProposal, setActivePreReservationForProposal] = useState<PreReservation | null>(null);
  const [editingProposal, setEditingProposal] = useState<LuxuryProposal | null>(null);
  const [viewingProposalModal, setViewingProposalModal] = useState<LuxuryProposal | null>(null);

  // Estados do Algoritmo de Ensino (Tutorial Interativo & Central)
  const [isTutorialTourOpen, setIsTutorialTourOpen] = useState(false);
  const [tutorialStepIndex, setTutorialStepIndex] = useState(0);
  const [isTutorialHelpModalOpen, setIsTutorialHelpModalOpen] = useState(false);

  // Disparo automático do Tutorial no primeiro acesso
  useEffect(() => {
    if (typeof window === "undefined" || authLoading) return;
    const hasSeenTutorial = localStorage.getItem("glaicy_tutorial_dashboard_seen");
    if (!hasSeenTutorial) {
      const timer = setTimeout(() => {
        setIsTutorialTourOpen(true);
        setTutorialStepIndex(0);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [authLoading]);

  const handleCompleteTutorialTour = () => {
    setIsTutorialTourOpen(false);
    if (typeof window !== "undefined") {
      localStorage.setItem("glaicy_tutorial_dashboard_seen", "true");
    }
  };

  const handleSkipTutorialTour = () => {
    setIsTutorialTourOpen(false);
    if (typeof window !== "undefined") {
      localStorage.setItem("glaicy_tutorial_dashboard_seen", "true");
    }
  };

  const handleStartTourFromBeginning = () => {
    setTutorialStepIndex(0);
    setIsTutorialTourOpen(true);
  };

  // Atalhos de teclado globais do Dashboard
  useKeyboardShortcuts({
    onNewAppointment: () => {
      setNewAppointmentPrefill({});
      setIsNewAppointmentModalOpen(true);
    },
    onGoToToday: () => {
      const now = new Date();
      const y = now.getFullYear();
      const m = String(now.getMonth() + 1).padStart(2, "0");
      const d = String(now.getDate()).padStart(2, "0");
      setSelectedDate(`${y}-${m}-${d}`);
    },
    onPrevDay: () => {
      setSelectedDate((prev) => {
        const d = new Date(prev + "T00:00:00");
        d.setDate(d.getDate() - 1);
        return d.toISOString().split("T")[0];
      });
    },
    onNextDay: () => {
      setSelectedDate((prev) => {
        const d = new Date(prev + "T00:00:00");
        d.setDate(d.getDate() + 1);
        return d.toISOString().split("T")[0];
      });
    },
  });

  // Verificação estrita de autenticação e autorização
  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.replace("/login");
      } else if (role === "client") {
        router.replace("/");
      }
    }
  }, [user, role, authLoading, router]);

  // Carregamento de dados assíncronos do Supabase
  const refreshAll = async () => {
    setIsLoadingData(true);
    try {
      const [org, profs, srvs, forms, subs, props, tpls, apts, clis, preRes, avDays] = await Promise.all([
        SupabaseDataService.getOrganization(),
        SupabaseDataService.getProfiles(),
        SupabaseDataService.getServices(),
        SupabaseDataService.getTriageForms(),
        SupabaseDataService.getTriageSubmissions(),
        SupabaseDataService.getProposals(),
        SupabaseDataService.getProposalTemplates(),
        SupabaseDataService.getAppointments(),
        SupabaseDataService.getClients(),
        SupabaseDataService.getPreReservations("11111111-1111-4111-8111-111111111111"),
        SupabaseDataService.getAvailableDays("58f26242-1e53-432e-b924-dea25ee2068a"),
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
      setPreReservations(preRes || []);
      setAvailableDays(avDays || []);

      if (profile?.dashboardMode) {
        setDashboardMode(profile.dashboardMode);
      }
    } catch (err) {
      console.error("Erro ao carregar dados do Supabase", err);
    } finally {
      setIsLoadingData(false);
    }
  };

  // Só carrega os dados após confirmar que o usuário está autenticado e autorizado
  useEffect(() => {
    if (!authLoading && user && role && role !== "client") {
      refreshAll();
    }
  }, [authLoading, user, role]);

  // Barramento Instantâneo Local / Cross-Tab (0ms de latência entre abas)
  useEffect(() => {
    if (authLoading || !user || role === "client") return;
    const unsubscribe = subscribeToSync((payload) => {
      console.log("Realtime syncBus signal received:", payload);
      refreshAll();
    });
    return unsubscribe;
  }, [authLoading, user, role]);

  // Assinatura em Tempo Real (Supabase Realtime) para Triagens, Agendamentos, Propostas e Pré-Reservas
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase || authLoading || !user || role === "client") return;

    const channel = supabase
      .channel("dashboard-realtime-sync")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "triage_submissions" },
        async () => {
          try {
            const [subs, preRes, clis] = await Promise.all([
              SupabaseDataService.getTriageSubmissions(),
              SupabaseDataService.getPreReservations("11111111-1111-4111-8111-111111111111"),
              SupabaseDataService.getClients(),
            ]);
            setTriageSubmissions(subs);
            setPreReservations(preRes || []);
            setClients(clis);
          } catch (e) {
            console.error("Erro ao atualizar triagens em realtime:", e);
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "pre_reservations" },
        async () => {
          try {
            const [preRes, clis] = await Promise.all([
              SupabaseDataService.getPreReservations(
                "11111111-1111-4111-8111-111111111111"
              ),
              SupabaseDataService.getClients(),
            ]);
            setPreReservations(preRes || []);
            setClients(clis);
          } catch (e) {
            console.error("Erro ao atualizar pré-reservas em realtime:", e);
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "proposals" },
        async () => {
          try {
            const [props, apts, subs] = await Promise.all([
              SupabaseDataService.getProposals(),
              SupabaseDataService.getAppointments(),
              SupabaseDataService.getTriageSubmissions(),
            ]);
            setProposals(props);
            setAppointments(apts);
            setTriageSubmissions(subs);
          } catch (e) {
            console.error("Erro ao atualizar propostas em realtime:", e);
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "appointments" },
        async () => {
          try {
            const [apts, clis] = await Promise.all([
              SupabaseDataService.getAppointments(),
              SupabaseDataService.getClients(),
            ]);
            setAppointments(apts);
            setClients(clis);
          } catch (e) {
            console.error("Erro ao atualizar agendamentos em realtime:", e);
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "salon_clients" },
        async () => {
          try {
            const clis = await SupabaseDataService.getClients();
            setClients(clis);
          } catch (e) {
            console.error("Erro ao atualizar clientes em realtime:", e);
          }
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          console.log("✓ Canal Realtime do Dashboard conectado com sucesso!");
        }
      });

    return () => {
      if (supabase) {
        supabase.removeChannel(channel);
      }
    };
  }, [authLoading, user, role]);

  // Salvar novo agendamento
  const handleSaveNewAppointment = async (newApt: Appointment) => {
    const saved = await SupabaseDataService.saveAppointment(newApt);
    if (newAppointmentPrefill.preReservationId) {
      await SupabaseDataService.updatePreReservationStatus(
        newAppointmentPrefill.preReservationId,
        "converted",
        undefined,
        saved.id
      );
    }
    await refreshAll();
    setIsNewAppointmentModalOpen(false);
  };

  // Salvar proposta gerada ou editada
  const handleSaveProposal = async (proposal: LuxuryProposal, openWhatsApp?: boolean) => {
    const savedProposal = await SupabaseDataService.saveProposal(proposal);

    // Atualiza a triagem vinculada com o UUID real retornado
    if (proposal.triageSubmissionId) {
      const sub = triageSubmissions.find((s) => s.id === proposal.triageSubmissionId);
      if (sub) {
        await SupabaseDataService.saveTriageSubmission({
          ...sub,
          status: "proposal_sent",
          proposalId: savedProposal.id,
        });
      }

      // Sincroniza o agendamento associado à triagem com o ID da proposta e preço aprovado
      const matchedApt = appointments.find((a) => a.triageSubmissionId === proposal.triageSubmissionId);
      if (matchedApt) {
        await SupabaseDataService.saveAppointment({
          ...matchedApt,
          proposalId: savedProposal.id,
          price: savedProposal.totalWithDiscount || savedProposal.totalOriginal || matchedApt.price,
        });
      }
    }

    await refreshAll();
    setActiveSubmissionForProposal(null);
    setEditingProposal(null);
    setViewingProposalModal(savedProposal);

    if (openWhatsApp && savedProposal.clientPhone) {
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const proposalUrl = `${origin}/proposta/${savedProposal.id}`;
      const msg = `Olá, ${savedProposal.clientName}! ✨\n\nSua proposta personalizada do Espaço da Beleza Gleicy Ronha já está pronta com todo carinho!\n\nVocê pode conferir todos os detalhes, valores e confirmar seu horário no link abaixo:\n🔗 ${proposalUrl}\n\nQualquer dúvida estou à disposição!`;
      const waLink = generateWhatsAppLink(savedProposal.clientPhone, msg);
      window.open(waLink, "_blank", "noopener,noreferrer");
    }
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

  // Proteção visual estrita: se não estiver autenticado ou for perfil de cliente, bloqueia renderização
  if (authLoading || !user || role === "client") {
    return (
      <div className="min-h-screen bg-[#122B2A] text-[#FCF5EB] flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 rounded-full border-4 border-[#C7A03A] border-t-transparent animate-spin" />
        <div className="text-center space-y-1">
          <p className="font-editorial text-[#FCF5EB] text-lg tracking-wide">
            {!user ? "Verificando credenciais de acesso seguro..." : "Carregando Painel Operacional..."}
          </p>
          <p className="text-xs text-[#D3D0B5]/60 font-sans">
            Espaço da Beleza Gleicy Ronha · Acesso Restrito à Gestão
          </p>
        </div>
      </div>
    );
  }

  // Se o usuário autenticado estiver inativo
  if (profile && profile.isActive === false) {
    return (
      <div className="min-h-screen bg-[#122B2A] text-[#FCF5EB] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-14 h-14 rounded-2xl bg-red-500/20 text-red-400 flex items-center justify-center mb-4 border border-red-500/30">
          <Shield className="w-7 h-7" />
        </div>
        <h1 className="text-xl font-bold text-white">Acesso Desativado</h1>
        <p className="text-sm text-[#D3D0B5] mt-2 max-w-sm">
          Sua conta no Espaço da Beleza Gleicy Ronha está inativa. Entre em contato com a administração.
        </p>
        <button
          onClick={() => signOut().then(() => router.replace("/login"))}
          className="mt-6 px-5 py-2.5 bg-[#C7A03A] text-[#122B2A] rounded-xl text-xs font-bold hover:bg-[#d9b85f] transition-all"
        >
          Retornar ao Login
        </button>
      </div>
    );
  }

  const pendingTriageCount = triageSubmissions.filter((s) => s.status === "pending_review").length;
  const pendingPreReservationsCount = preReservations.filter((p) => p.status === "pending").length;

  return (
    <div className="min-h-screen bg-[#FCF5EB] text-[#1D3D3C] flex relative overflow-x-hidden">
      {/* Grafismos Oficiais da Marca em Marca d'água no Fundo */}
      <div className="fixed top-0 right-0 w-[440px] h-[440px] opacity-[0.08] pointer-events-none z-0">
        <img
          src="/brand/Grafismos/linha-grafismo-3.png"
          alt=""
          className="w-full h-full object-contain object-top-right"
        />
      </div>
      <div className="fixed bottom-0 left-72 w-[380px] h-[380px] opacity-[0.05] pointer-events-none z-0 hidden lg:block">
        <img
          src="/brand/Grafismos/linha-grafismo-4.png"
          alt=""
          className="w-full h-full object-contain object-bottom-left"
        />
      </div>

      {/* Sidebar de Navegação Lateral */}
      <Sidebar
        currentTab={adminTab}
        onSelectTab={handleSelectTab}
        pendingTriageCount={pendingTriageCount}
        pendingPreReservationsCount={pendingPreReservationsCount}
        role={role}
      />

      {/* Conteúdo Principal do Painel */}
      <div className="flex-1 flex flex-col min-w-0 relative z-10 w-full">
        {/* Barra de Topo / Header Principal */}
        <header className="bg-white/95 backdrop-blur-md border-b border-[#D8D0BD] pl-16 sm:pl-8 pr-3 sm:pr-8 py-2.5 sm:py-3.5 flex items-center justify-between sticky top-0 z-30 shadow-2xs gap-2 relative after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[1px] after:bg-gradient-to-r after:from-transparent after:via-[#C7A03A]/40 after:to-transparent">
          <div data-tutorial="header-profile" className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-2xl bg-[#1D3D3C] border border-[#C7A03A]/40 flex items-center justify-center p-1.5 shrink-0 shadow-xs">
              <img
                src="/brand/logo/simbolo-dourado.svg"
                alt=""
                className="w-full h-full object-contain"
              />
            </div>
            <div className="min-w-0 truncate">
              <div className="flex items-center space-x-1.5 sm:space-x-2 truncate">
                <span className="font-bold text-xs sm:text-sm text-[#1D3D3C] truncate font-sans">
                  {profile?.name || (user?.user_metadata?.name as string) || user?.email || "Gleicy Ronha"}
                </span>
                <span className="text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FCF9F0] text-[#80611F] border border-[#C7A03A]/40 shrink-0">
                  {role === "super_admin"
                    ? "Super Admin"
                    : role === "salon_owner"
                    ? "Dona do Salão"
                    : "Especialista Parceira"}
                </span>
              </div>
              <span className="text-[10px] sm:text-[11px] text-[#736455] truncate block">
                {profile?.specialty || "Espaço da Beleza Gleicy Ronha"}
              </span>
            </div>
          </div>

          <div data-tutorial="header-actions" className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Status do Banco Supabase */}
            <div data-tutorial="header-status" className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#FAF7F2] border border-[#D8D0BD] text-[#1D3D3C] text-[11px] font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Sincronizado</span>
            </div>

            {/* Botão de Tutorial & Guia do Sistema */}
            <button
              onClick={() => setIsTutorialHelpModalOpen(true)}
              className="px-3 py-2 rounded-xl bg-[#FCF9F0] hover:bg-[#F5ECCF] text-[#80611F] border border-[#C7A03A]/50 text-xs font-bold transition-all flex items-center space-x-1.5 shadow-2xs group"
              title="Abrir Tutorial e Guia Completo do Sistema"
            >
              <GraduationCap className="w-4 h-4 text-[#C7A03A] group-hover:scale-110 transition-transform" />
              <span className="hidden sm:inline">Tutorial & Guia</span>
            </button>

            {/* Botão de Atualizar Dados */}
            <button
              onClick={refreshAll}
              disabled={isLoadingData}
              className="p-2 rounded-xl bg-[#FAF7F2] hover:bg-[#EEE8DD] text-[#736455] border border-[#D8D0BD] transition-all"
              title="Recarregar Dados do Banco"
            >
              <RefreshCw className={`w-4 h-4 ${isLoadingData ? "animate-spin" : ""}`} />
            </button>

            {/* Logout */}
            <button
              onClick={() => signOut().then(() => router.push("/login"))}
              className="p-2 rounded-xl bg-[#FAF7F2] hover:bg-red-50 text-[#736455] hover:text-red-700 border border-[#D8D0BD] hover:border-red-200 transition-all"
              title="Encerrar Sessão"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Banner de Aviso de Modo Super Admin */}
        {role === "super_admin" && (
          <div className="bg-[#1D3D3C] text-white px-4 sm:px-8 py-2 text-xs flex items-center justify-between border-b border-[#C7A03A]/30">
            <div className="flex items-center space-x-2">
              <Shield className="w-3.5 h-3.5 text-[#C7A03A]" />
              <span>Você está navegando com privilégios de Super Admin SaaS.</span>
            </div>
            <Link
              href="/saas-admin"
              className="text-[#C7A03A] hover:underline font-semibold text-[11px]"
            >
              Voltar ao Painel SaaS →
            </Link>
          </div>
        )}

        {/* Área de Visualização Dinâmica das Abas */}
        <main className="flex-1 p-3 sm:p-8 max-w-7xl w-full mx-auto space-y-6">
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
              dailyTargetRevenue={organization?.settings?.dailyTargetRevenue || 1500}
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

          {adminTab === "abertura-agenda" && (
            <div className="space-y-8">
              <AvailabilityManagerView
                orgId={organization?.id || "11111111-1111-4111-8111-111111111111"}
                professionalId={profile?.id || "58f26242-1e53-432e-b924-dea25ee2068a"}
                dataService={SupabaseDataService}
                appointments={appointments}
              />
              <PreReservationQueue
                orgId={organization?.id || "11111111-1111-4111-8111-111111111111"}
                professionalId={profile?.id || "58f26242-1e53-432e-b924-dea25ee2068a"}
                dataService={SupabaseDataService}
                onConvertToAppointment={(pr) => {
                  setNewAppointmentPrefill({
                    date: pr.requestedDate,
                    time: pr.preferredTime || (pr.preferredPeriod === "manha" ? "09:30" : "14:00"),
                    clientName: pr.clientName,
                    clientPhone: pr.clientPhone,
                    serviceId: pr.serviceId,
                    preReservationId: pr.id,
                  });
                  setIsNewAppointmentModalOpen(true);
                }}
                onViewTriage={(subId) => {
                  setAdminTab("triagens");
                  const sub = triageSubmissions.find((s) => s.id === subId);
                  if (sub) {
                    setActiveSubmissionForProposal(sub);
                  }
                }}
                onBuildProposal={(pr) => {
                  setActivePreReservationForProposal(pr);
                  const existingSub = pr.triageSubmissionId
                    ? triageSubmissions.find((s) => s.id === pr.triageSubmissionId)
                    : null;
                  if (existingSub) {
                    setActiveSubmissionForProposal(existingSub);
                  } else {
                    const mappedSub: TriageSubmission = {
                      id: pr.triageSubmissionId || `sub-pr-${pr.id}`,
                      orgId: pr.orgId,
                      formId: "form-pr-custom",
                      serviceId: pr.serviceId || "srv-custom",
                      serviceTitle: pr.serviceName || "Atendimento Personalizado",
                      clientName: pr.clientName,
                      clientPhone: pr.clientPhone,
                      clientEmail: pr.clientEmail || "",
                      preferredDate: pr.requestedDate,
                      preferredTimeSlot:
                        pr.preferredTime ||
                        (pr.preferredPeriod === "manha"
                          ? "Encaixe (Manhã)"
                          : pr.preferredPeriod === "tarde"
                          ? "Encaixe (Tarde)"
                          : "Encaixe (Flexível)"),
                      answers: pr.adminNotes
                        ? [
                            {
                              questionId: "notes",
                              questionTitle: "Observações da Pré-Reserva",
                              answerText: pr.adminNotes,
                            },
                          ]
                        : [],
                      photos: {},
                      status: "pending_review",
                      submittedAt: pr.createdAt || new Date().toISOString(),
                    };
                    setActiveSubmissionForProposal(mappedSub);
                  }
                }}
              />
            </div>
          )}

          {adminTab === "triagens" && (
            <TriageReviewQueue
              submissions={triageSubmissions}
              services={services}
              proposals={proposals}
              existingAppointments={appointments}
              availableDays={availableDays}
              onGenerateProposal={(proposal: LuxuryProposal, openWhatsApp?: boolean) => {
                handleSaveProposal(proposal, openWhatsApp);
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

          {adminTab === "configuracoes" && (
            <SalonSettingsView
              organization={organization}
              profile={profile}
              onUpdateOrganization={async (updatedOrg) => {
                await SupabaseDataService.updateOrganization(updatedOrg);
                await refreshAll();
              }}
              onUpdateProfile={async (updatedProf) => {
                if (profile?.id) {
                  await SupabaseDataService.updateUserProfile(profile.id, updatedProf);
                  await refreshAll();
                }
              }}
            />
          )}
        </main>
      </div>

      {/* Ilha Dinâmica Flutuante de Pausa Química */}
      <FloatingPill activeChemicalPause={null} />

      {/* Modal Novo Agendamento */}
      {isNewAppointmentModalOpen && (
        <NewAppointmentModal
          services={services}
          clients={clients}
          prefilledDate={newAppointmentPrefill.date}
          prefilledTime={newAppointmentPrefill.time}
          prefilledClientName={newAppointmentPrefill.clientName}
          prefilledClientPhone={newAppointmentPrefill.clientPhone}
          prefilledServiceId={newAppointmentPrefill.serviceId}
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
          preReservation={activePreReservationForProposal}
          existingAppointments={appointments}
          availableDays={availableDays}
          onSave={(prop, openWA) => {
            handleSaveProposal(prop, openWA);
            setActivePreReservationForProposal(null);
          }}
          onClose={() => {
            setActiveSubmissionForProposal(null);
            setEditingProposal(null);
            setActivePreReservationForProposal(null);
          }}
        />
      )}

      {/* Modal Visualizador de Proposta para a Gleicy (Contido na Altura do Monitor) */}
      {viewingProposalModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-hidden">
          <div className="bg-[#FAF7F2] rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-[#D8D0BD] overflow-hidden animate-scale-up">
            <div className="p-4 sm:p-5 brand-green-gradient text-white border-b border-[#C7A03A]/40 flex flex-wrap items-center justify-between gap-3 shrink-0 relative overflow-hidden">
              {/* Pattern Gold Green sutil */}
              <div className="absolute inset-0 bg-pattern-gold-green opacity-10 pointer-events-none" />

              <div className="flex items-center gap-2 relative z-10">
                <span className="text-xs uppercase tracking-wider text-[#D9B85F] font-extrabold">
                  Proposta Comercial
                </span>
                <span className="text-[#C7A03A]/60">•</span>
                <span className="text-xs font-bold text-white">{viewingProposalModal.clientName}</span>
              </div>

              <div className="flex items-center gap-2 relative z-10">
                {viewingProposalModal.clientPhone && (
                  <a
                    href={generateWhatsAppLink(
                      viewingProposalModal.clientPhone,
                      `Olá, ${viewingProposalModal.clientName}! ✨\n\nSua proposta comercial personalizada do Espaço da Beleza Gleicy Ronha já está pronta com todo carinho!\n\nVocê pode conferir todos os detalhes, valores e confirmar seu horário no link abaixo:\n🔗 ${typeof window !== "undefined" ? window.location.origin : ""}/proposta/${viewingProposalModal.id}\n\nQualquer dúvida estou à disposição!`
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3.5 py-1.5 text-xs font-bold text-[#1D3D3C] gold-gradient hover:opacity-95 rounded-xl flex items-center gap-1.5 transition-all shadow-md active:scale-95"
                    title="Enviar proposta diretamente no WhatsApp da cliente"
                  >
                    <MessageCircle className="w-3.5 h-3.5 fill-[#1D3D3C]" />
                    <span>Enviar no WhatsApp</span>
                  </a>
                )}

                <button
                  onClick={() => {
                    const toEdit = viewingProposalModal;
                    setViewingProposalModal(null);
                    setEditingProposal(toEdit);
                  }}
                  className="px-3 py-1.5 text-xs font-semibold text-white bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl flex items-center gap-1.5 transition-all shadow-2xs"
                >
                  <Edit3 className="w-3.5 h-3.5 text-[#D9B85F]" />
                  <span>Editar</span>
                </button>

                <a
                  href={`/proposta/${viewingProposalModal.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 text-xs font-semibold text-white bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl flex items-center gap-1.5 transition-all shadow-2xs"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-[#D9B85F]" />
                  <span>Ver Página Web</span>
                </a>

                <button
                  onClick={() => setViewingProposalModal(null)}
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 flex items-center justify-center text-white transition-colors"
                  title="Fechar visualização"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {viewingProposalModal.clientPhone && (
              <div className="bg-emerald-50 border-b border-emerald-100 px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs text-emerald-900 shrink-0">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    Proposta pronta para envio para <strong>{viewingProposalModal.clientName}</strong> ({viewingProposalModal.clientPhone}).
                  </span>
                </div>
                <a
                  href={generateWhatsAppLink(
                    viewingProposalModal.clientPhone,
                    `Olá, ${viewingProposalModal.clientName}! ✨\n\nSua proposta personalizada do Espaço da Beleza Gleicy Ronha já está pronta com todo carinho!\n\nVocê pode conferir todos os detalhes, valores e confirmar seu horário no link abaixo:\n🔗 ${typeof window !== "undefined" ? window.location.origin : ""}/proposta/${viewingProposalModal.id}\n\nQualquer dúvida estou à disposição!`
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 font-bold text-emerald-700 bg-white hover:bg-emerald-100 px-3 py-1 rounded-lg border border-emerald-200 transition-colors shadow-2xs"
                >
                  <MessageCircle className="w-3.5 h-3.5 text-emerald-600 fill-emerald-600/20" />
                  <span>Abrir conversa no WhatsApp &rarr;</span>
                </a>
              </div>
            )}

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

      {/* Motor de Tour Guiado Interativo (Holofote) */}
      <InteractiveTutorialTour
        steps={TUTORIAL_STEPS}
        currentStepIndex={tutorialStepIndex}
        isOpen={isTutorialTourOpen}
        onNext={() => setTutorialStepIndex((prev) => Math.min(prev + 1, TUTORIAL_STEPS.length - 1))}
        onPrev={() => setTutorialStepIndex((prev) => Math.max(prev - 1, 0))}
        onSkip={handleSkipTutorialTour}
        onComplete={handleCompleteTutorialTour}
        onSelectTab={(tab) => handleSelectTab(tab as AdminTab)}
      />

      {/* Central de Treinamento & Manual Completo */}
      <TutorialHelpModal
        isOpen={isTutorialHelpModalOpen}
        onClose={() => setIsTutorialHelpModalOpen(false)}
        onStartInteractiveTour={handleStartTourFromBeginning}
      />
    </div>
  );
}
