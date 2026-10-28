"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { SupabaseDataService } from "@/lib/supabase/api";
import { SalonStore } from "@/lib/storage/localStore";
import { ServiceCatalog } from "@/components/client/ServiceCatalog";
import { GamifiedTriage } from "@/components/client/GamifiedTriage";
import { SlotPicker } from "@/components/client/SlotPicker";
import { LuxuryProposalPDF } from "@/components/proposal/LuxuryProposalPDF";

import { SalonOrganization, UserProfile } from "@/types/salon";
import { ServiceItem } from "@/types/service";
import { TriageForm, TriageSubmission } from "@/types/triage";
import { Appointment } from "@/types/appointment";
import { LuxuryProposal } from "@/types/proposal";
import { SalonClient } from "@/types/client";

import {
  Scissors,
  Sparkles,
  Calendar,
  CheckCircle2,
  Clock,
  Shield,
  MapPin,
  Phone,
  ArrowRight,
  Lock,
  Heart,
  ChevronRight,
  FileCheck,
  User,
  LogOut,
  X,
  Eye,
  EyeOff,
  ExternalLink,
} from "lucide-react";

export default function ClientHomePage() {
  const [organization, setOrganization] = useState<SalonOrganization | null>(null);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [triageForms, setTriageForms] = useState<TriageForm[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [proposals, setProposals] = useState<LuxuryProposal[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Sessão da Cliente
  const [activeClient, setActiveClient] = useState<SalonClient | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [authPhone, setAuthPhone] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authName, setAuthName] = useState("");
  const [showAuthPassword, setShowAuthPassword] = useState(false);
  const [authError, setAuthError] = useState("");
  const [isAuthLoading, setIsAuthLoading] = useState(false);

  // Estados do Fluxo de Agendamento da Cliente
  const [selectedService, setSelectedService] = useState<ServiceItem | null>(null);
  const [isTakingTriage, setIsTakingTriage] = useState(false);
  const [isPickingSlot, setIsPickingSlot] = useState(false);
  const [completedSubmission, setCompletedSubmission] = useState<TriageSubmission | null>(null);
  const [confirmedAppointment, setConfirmedAppointment] = useState<Appointment | null>(null);

  // Visualização de Proposta
  const [viewingProposal, setViewingProposal] = useState<LuxuryProposal | null>(null);
  const [searchPhone, setSearchPhone] = useState("");
  const [searchResultProposal, setSearchResultProposal] = useState<LuxuryProposal | null>(null);
  const [searchNotFound, setSearchNotFound] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const [org, srvs, forms, apts, props] = await Promise.all([
          SupabaseDataService.getOrganization(),
          SupabaseDataService.getServices(),
          SupabaseDataService.getTriageForms(),
          SupabaseDataService.getAppointments(),
          SupabaseDataService.getProposals(),
        ]);
        setOrganization(org);
        setServices(srvs);
        setTriageForms(forms);
        setAppointments(apts);
        setProposals(props);
      } catch (err) {
        console.error("Erro ao carregar dados da vitrine", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();

    // Carrega sessão da cliente do localStorage
    const saved = SalonStore.getActiveClient();
    if (saved) {
      setActiveClient(saved);
      setSearchPhone(saved.phone);
    }
  }, []);

  // Login / Cadastro no Portal da Cliente
  const handleClientAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setIsAuthLoading(true);

    try {
      if (authMode === "login") {
        const res = await SupabaseDataService.loginClient(authPhone, authPassword);
        if (!res.success || !res.client) {
          setAuthError(res.message || "Telefone ou senha inválidos.");
          setIsAuthLoading(false);
          return;
        }
        setActiveClient(res.client);
        setSearchPhone(res.client.phone);
        setIsAuthModalOpen(false);
      } else {
        if (!authName.trim()) {
          setAuthError("Informe seu nome completo.");
          setIsAuthLoading(false);
          return;
        }
        if (!authPassword || authPassword.length < 3) {
          setAuthError("A senha deve ter no mínimo 3 caracteres.");
          setIsAuthLoading(false);
          return;
        }

        const newCli: SalonClient = {
          id: `cli-${Date.now()}`,
          name: authName.trim(),
          phone: authPhone.trim(),
          password: authPassword.trim(),
          createdAt: new Date().toISOString(),
        };

        const saved = await SupabaseDataService.saveClient(newCli);
        SalonStore.setActiveClient(saved);
        setActiveClient(saved);
        setSearchPhone(saved.phone);
        setIsAuthModalOpen(false);
      }
    } catch (err: any) {
      setAuthError(err.message || "Erro ao conectar. Tente novamente.");
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleLogoutClient = () => {
    SalonStore.setActiveClient(null);
    setActiveClient(null);
  };

  // Iniciar fluxo a partir de um serviço
  const handleSelectService = (srv: ServiceItem) => {
    setSelectedService(srv);
    setCompletedSubmission(null);
    setConfirmedAppointment(null);

    if (srv.requiresTriage) {
      setIsTakingTriage(true);
      setIsPickingSlot(false);
    } else {
      setIsPickingSlot(true);
      setIsTakingTriage(false);
    }
  };

  // Concluir triagem anamnese
  const handleCompleteTriage = async (sub: TriageSubmission) => {
    await SupabaseDataService.saveTriageSubmission(sub);

    // Cria pré-reserva temporária na agenda com horários do motor
    const tempApt: Appointment = {
      id: `apt-pre-${Date.now()}`,
      orgId: sub.orgId || "org-gleicy-ronha",
      professionalId: selectedService?.professionalId || "user-gleicy-ronha",
      professionalName: "Gleicy Ronha",
      serviceId: sub.serviceId,
      serviceTitle: sub.serviceTitle,
      clientName: sub.clientName,
      clientPhone: sub.clientPhone,
      clientEmail: sub.clientEmail,
      date: sub.preferredDate || new Date().toISOString().split("T")[0],
      startTime: sub.preferredTimeSlot || "09:30",
      endTime: "11:40",
      totalDurationMin: 130,
      status: "pending_proposal",
      price: selectedService?.price || 710,
      paymentStatus: "pending",
      triageSubmissionId: sub.id,
      stepBlocks: [],
      notes: "Pré-reserva enviada pelo portal da cliente com anamnese capilar.",
      createdAt: new Date().toISOString(),
    };

    await SupabaseDataService.saveAppointment(tempApt);

    setIsTakingTriage(false);
    setCompletedSubmission(sub);
  };

  // Concluir agendamento direto (para serviços sem triagem obrigatória)
  const handleConfirmDirectBooking = async (apt: Appointment) => {
    await SupabaseDataService.saveAppointment(apt);
    setIsPickingSlot(false);
    setConfirmedAppointment(apt);
  };

  const handlePreReservationDone = (pr: any) => {
    showToast(`Sua Pré-Reserva para ${pr.requestedDate} foi enviada! A Gleicy entrará em contato.`, "success");
    setIsPickingSlot(false);
  };

  // Buscar proposta existente por telefone
  const handleSearchProposal = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchNotFound(false);
    const cleanQuery = searchPhone.replace(/\D/g, "");
    if (!cleanQuery) return;

    const found = proposals.find((p) => p.clientPhone.replace(/\D/g, "").includes(cleanQuery));
    if (found) {
      setSearchResultProposal(found);
    } else {
      setSearchNotFound(true);
      setSearchResultProposal(null);
    }
  };

  const activeTriageForm =
    triageForms.find((f) => f.targetServiceId === selectedService?.id) ||
    triageForms[0];

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-[#22201E] flex flex-col justify-between selection:bg-[#E5C158]/30 selection:text-[#2D1914]">
      {/* Topo / Header da Marca */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-[#E7DCCE] px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#c59b27] to-[#8C6B1B] p-0.5 shadow-md shadow-[#c59b27]/20">
              <div className="w-full h-full bg-[#2D1914] rounded-[14px] flex items-center justify-center text-[#E5C158]">
                <Scissors className="w-5 h-5" />
              </div>
            </div>
            <div>
              <span className="font-bold text-base tracking-tight text-[#2D1914] block leading-tight">
                Espaço da Beleza Gleicy Ronha
              </span>
              <span className="text-[10px] uppercase tracking-widest text-[#AD841D] font-bold block">
                Exclusividade & Alta Performance em Cachos
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Status da Sessão da Cliente */}
            {activeClient ? (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 bg-[#FAF7F2] border border-[#E7DCCE] px-3 py-1.5 rounded-full">
                  <div className="w-6 h-6 rounded-full bg-[#2D1914] text-[#E5C158] font-bold text-xs flex items-center justify-center">
                    {activeClient.name.charAt(0)}
                  </div>
                  <span className="text-xs font-bold text-[#2D1914] hidden sm:inline">
                    Olá, {activeClient.name.split(" ")[0]}
                  </span>
                </div>
                <button
                  onClick={handleLogoutClient}
                  title="Sair da Conta"
                  className="p-1.5 text-stone-400 hover:text-red-700 rounded-full hover:bg-stone-100 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  setAuthMode("login");
                  setIsAuthModalOpen(true);
                }}
                className="text-xs font-semibold text-[#7B493B] hover:text-[#2D1914] px-3.5 py-1.5 rounded-full border border-[#E7DCCE] hover:border-[#AD841D] transition-all flex items-center gap-1.5 bg-white shadow-2xs"
              >
                <User className="w-3.5 h-3.5 text-[#AD841D]" />
                <span>Área da Cliente</span>
              </button>
            )}

            <a
              href="#proposta-search"
              className="hidden sm:flex text-xs font-semibold text-[#7B493B] hover:text-[#2D1914] px-3 py-1.5 rounded-full border border-[#E7DCCE] hover:border-[#AD841D] transition-all"
            >
              Consultar Proposta
            </a>

            {/* Link Discreto para Área Restrita da Equipe */}
            <Link
              href="/login"
              className="text-xs font-semibold text-[#2D1914] bg-[#F4ECE1] hover:bg-[#EADDCF] px-3.5 py-1.5 rounded-full border border-[#D9C4B0] flex items-center gap-1.5 transition-all shadow-xs"
            >
              <Lock className="w-3.5 h-3.5 text-[#AD841D]" />
              <span className="hidden md:inline">Acesso Profissional</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section Luxuosa */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#2D1914] via-[#3D251E] to-[#2D1914] text-white py-16 sm:py-24 px-6">
        <div className="absolute top-0 right-1/4 w-96 h-96 rounded-full bg-[#E5C158]/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-10 w-80 h-80 rounded-full bg-[#AD841D]/15 blur-3xl pointer-events-none" />

        <div className="relative max-w-4xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#E5C158]/10 border border-[#E5C158]/30 text-[#E5C158] text-xs font-bold tracking-wide">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Engenharia de Mechas Saudáveis & Gestão Dinâmica de Pausas</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white leading-tight font-editorial">
            Revele sua melhor curvatura com um iluminado de alta performance.
          </h1>

          <p className="text-sm sm:text-lg text-[#E3D5C8] max-w-2xl mx-auto leading-relaxed">
            Cada cabelo é único. Nossa metodologia combina triagem diagnóstica profunda, técnica superclareadora preservando a barreira lipídica e agendamento inteligente com otimização de horários.
          </p>

          <div className="pt-4 flex flex-wrap justify-center gap-4 text-xs text-[#E5C158]">
            <div className="flex items-center gap-1.5 bg-[#20100C]/60 px-3.5 py-2 rounded-xl border border-[#c59b27]/20">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Diagnóstico Capilar Prévio</span>
            </div>
            <div className="flex items-center gap-1.5 bg-[#20100C]/60 px-3.5 py-2 rounded-xl border border-[#c59b27]/20">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>5% de Desconto no PIX</span>
            </div>
            <div className="flex items-center gap-1.5 bg-[#20100C]/60 px-3.5 py-2 rounded-xl border border-[#c59b27]/20">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Encaixe Inteligente em Pausas Químicas</span>
            </div>
          </div>
        </div>
      </section>

      {/* Conteúdo Central */}
      <main className="max-w-6xl mx-auto px-6 py-12 space-y-16 flex-1 w-full">
        {/* Confirmação de Triagem Realizada */}
        {completedSubmission && (
          <div className="p-8 rounded-3xl bg-white border border-[#c59b27]/40 shadow-xl text-center space-y-4 max-w-2xl mx-auto animate-fade-in">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold text-[#2D1914] font-editorial">
              Triagem Capilar Recebida com Sucesso!
            </h2>
            <p className="text-sm text-[#5E372C] leading-relaxed">
              Obrigada, <strong>{completedSubmission.clientName}</strong>! Seus dados e fotos já estão na fila técnica da Gleicy Ronha.
            </p>
            <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#E7DCCE] text-xs text-[#7B493B] space-y-1 text-left">
              <div>• <strong>Procedimento Desejado:</strong> {completedSubmission.serviceTitle}</div>
              <div>• <strong>Data de Preferência:</strong> {completedSubmission.preferredDate} às {completedSubmission.preferredTimeSlot}</div>
              <div>• <strong>Status:</strong> Pré-reserva bloqueada enquanto a Gleicy formula sua Proposta Personalizada.</div>
            </div>
            <p className="text-xs text-[#AD841D] font-medium">
              Você receberá a Proposta de Transformação no seu WhatsApp ({completedSubmission.clientPhone}) em até 24h a 48h.
            </p>
            <button
              onClick={() => setCompletedSubmission(null)}
              className="mt-2 px-6 py-2.5 rounded-full bg-[#2D1914] text-white text-xs font-bold hover:bg-[#3D251E] transition-all"
            >
              Fazer Outra Consulta
            </button>
          </div>
        )}

        {/* Confirmação de Agendamento Direto */}
        {confirmedAppointment && (
          <div className="p-8 rounded-3xl bg-white border border-emerald-300 shadow-xl text-center space-y-4 max-w-2xl mx-auto animate-fade-in">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold text-[#2D1914] font-editorial">
              Horário Confirmado na Agenda!
            </h2>
            <p className="text-sm text-[#5E372C] leading-relaxed">
              <strong>{confirmedAppointment.clientName}</strong>, seu horário para <strong>{confirmedAppointment.serviceTitle}</strong> foi agendado com sucesso para o dia <strong>{confirmedAppointment.date}</strong> às <strong>{confirmedAppointment.startTime}</strong> (término às {confirmedAppointment.endTime}).
            </p>
            <button
              onClick={() => setConfirmedAppointment(null)}
              className="mt-2 px-6 py-2.5 rounded-full bg-[#2D1914] text-white text-xs font-bold hover:bg-[#3D251E] transition-all"
            >
              Voltar ao Catálogo
            </button>
          </div>
        )}

        {/* Modal Interativo de Triagem Anamnese */}
        {isTakingTriage && activeTriageForm && selectedService && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
            <div className="bg-white rounded-3xl max-w-3xl w-full p-2 sm:p-4 shadow-2xl border border-[#c59b27]/30 my-4 max-h-[92vh] overflow-y-auto">
              <GamifiedTriage
                form={activeTriageForm}
                service={selectedService}
                existingAppointments={appointments}
                onComplete={handleCompleteTriage}
                onCancel={() => setIsTakingTriage(false)}
              />
            </div>
          </div>
        )}

        {/* Modal Interativo de Seleção de Horário (Slot Picker) */}
        {isPickingSlot && selectedService && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
            <div className="bg-white rounded-3xl max-w-3xl w-full p-2 sm:p-4 shadow-2xl border border-[#c59b27]/30 my-4 max-h-[92vh] overflow-y-auto">
              <SlotPicker
                service={selectedService}
                existingAppointments={appointments}
                onConfirmBooking={handleConfirmDirectBooking}
                onRequestPreReservation={handlePreReservationDone}
                onCancel={() => setIsPickingSlot(false)}
              />
            </div>
          </div>
        )}

        {/* Catálogo de Serviços */}
        {!completedSubmission && !confirmedAppointment && (
          <div className="space-y-8">
            <div className="text-center space-y-2">
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#2D1914] font-editorial">
                Nossos Procedimentos Exclusivos
              </h2>
              <p className="text-sm text-[#7B493B] max-w-xl mx-auto">
                Escolha o serviço desejado para iniciar sua triagem capilar online ou reservar seu horário diretamente na agenda com cálculo dinâmico de etapas.
              </p>
            </div>

            <ServiceCatalog
              services={services}
              onSelectService={handleSelectService}
            />
          </div>
        )}

        {/* Seção de Busca / Consulta de Propostas Aprovadas */}
        <section id="proposta-search" className="pt-8 border-t border-[#E7DCCE]">
          <div className="bg-white rounded-3xl p-8 border border-[#E7DCCE] shadow-md max-w-3xl mx-auto">
            <div className="text-center mb-6">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#AD841D] block">
                Portal da Cliente
              </span>
              <h3 className="text-xl font-bold text-[#2D1914] font-editorial">
                Já recebeu sua Proposta de Transformação?
              </h3>
              <p className="text-xs text-[#7B493B] mt-1">
                Digite seu número de telefone com DDD para visualizar e aprovar sua proposta oficial.
              </p>
            </div>

            <form onSubmit={handleSearchProposal} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
              <input
                type="tel"
                placeholder="(11) 93342-9586"
                value={searchPhone}
                onChange={(e) => setSearchPhone(e.target.value)}
                className="flex-1 px-4 py-3 rounded-xl border border-[#D9C4B0] bg-[#FAF7F2] text-sm text-[#2D1914] placeholder-[#A8988F] focus:outline-none focus:border-[#AD841D]"
              />
              <button
                type="submit"
                className="px-6 py-3 bg-[#2D1914] hover:bg-[#3D251E] text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5"
              >
                <span>Buscar</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </form>

            {searchNotFound && (
              <p className="text-center text-xs text-red-600 mt-4">
                Nenhuma proposta ativa foi encontrada para este telefone. Entre em contato conosco via WhatsApp.
              </p>
            )}

            {/* Proposta encontrada */}
            {searchResultProposal && (
              <div className="mt-6 p-5 rounded-2xl bg-[#FAF7F2] border border-[#c59b27]/40 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <span className="font-bold text-sm text-[#2D1914] block">
                    {searchResultProposal.title}: {searchResultProposal.subtitle}
                  </span>
                  <span className="text-xs text-[#7B493B]">
                    Cliente: {searchResultProposal.clientName} · Total: R$ {searchResultProposal.pixTotal.toFixed(2)} (PIX)
                  </span>
                  <span className={`inline-block mt-1 text-[10px] px-2 py-0.5 rounded-full font-bold ${
                    searchResultProposal.status === "approved"
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-amber-100 text-amber-800"
                  }`}>
                    {searchResultProposal.status === "approved" ? "Proposta Aprovada" : "Aguardando Aprovação"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    href={`/proposta/${searchResultProposal.id}`}
                    target="_blank"
                    className="px-4 py-2.5 bg-white border border-[#E7DCCE] hover:border-[#AD841D] text-[#2D1914] text-xs font-bold rounded-xl flex items-center gap-1 transition-all"
                  >
                    <span>Abrir Página Web</span>
                    <ExternalLink className="w-3.5 h-3.5 text-[#AD841D]" />
                  </Link>
                  <button
                    onClick={() => setViewingProposal(searchResultProposal)}
                    className="px-4 py-2.5 bg-gradient-to-r from-[#c59b27] to-[#8C6B1B] text-[#1E120E] text-xs font-bold rounded-xl shadow-xs hover:opacity-95 transition-all"
                  >
                    Visualizar PDF
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Modal de Proposta PDF */}
      {viewingProposal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-4xl w-full p-6 sm:p-8 shadow-2xl my-8">
            <LuxuryProposalPDF
              proposal={viewingProposal}
              isClientView={true}
              onApprove={async (propId: string) => {
                await SupabaseDataService.approveProposal(propId);
                showToast("Proposta aprovada com sucesso! Seu horário foi confirmado na agenda.", "success");
                setViewingProposal(null);
              }}
              onBack={() => setViewingProposal(null)}
            />
          </div>
        </div>
      )}

      {/* Modal de Login / Registro da Cliente */}
      {isAuthModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-[#c59b27]/30 relative animate-fade-in">
            <button
              onClick={() => setIsAuthModalOpen(false)}
              className="absolute right-4 top-4 text-stone-400 hover:text-stone-700"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center mb-6">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#c59b27] to-[#8C6B1B] text-[#2D1914] flex items-center justify-center mx-auto mb-3 shadow-md">
                <User className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-editorial text-2xl font-bold text-[#2D1914]">
                {authMode === "login" ? "Área da Cliente" : "Criar Meu Cadastro"}
              </h3>
              <p className="text-xs text-[#683C30] mt-1">
                {authMode === "login"
                  ? "Acesse suas propostas, agendamentos e histórico."
                  : "Cadastre-se para agendar com rapidez e segurança."}
              </p>
            </div>

            {/* Alternar modo */}
            <div className="flex bg-[#FAF7F2] p-1 rounded-xl border border-[#E7DCCE] text-xs mb-4">
              <button
                type="button"
                onClick={() => {
                  setAuthMode("login");
                  setAuthError("");
                }}
                className={`flex-1 py-1.5 rounded-lg font-medium transition-all ${
                  authMode === "login"
                    ? "bg-[#2D1914] text-white font-bold shadow-2xs"
                    : "text-stone-600"
                }`}
              >
                Já sou Cliente
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthMode("register");
                  setAuthError("");
                }}
                className={`flex-1 py-1.5 rounded-lg font-medium transition-all ${
                  authMode === "register"
                    ? "bg-[#2D1914] text-white font-bold shadow-2xs"
                    : "text-stone-600"
                }`}
              >
                Primeira Vez
              </button>
            </div>

            {authError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 mb-4">
                {authError}
              </div>
            )}

            <form onSubmit={handleClientAuth} className="space-y-4">
              {authMode === "register" && (
                <div>
                  <label className="block text-xs font-semibold text-[#2D1914] mb-1">
                    Nome Completo *
                  </label>
                  <input
                    type="text"
                    required
                    value={authName}
                    onChange={(e) => setAuthName(e.target.value)}
                    placeholder="Ex: Isa Franca"
                    className="w-full p-2.5 rounded-xl border border-[#E7DCCE] text-xs focus:border-[#C59B27] outline-none"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-[#2D1914] mb-1">
                  WhatsApp com DDD *
                </label>
                <input
                  type="tel"
                  required
                  value={authPhone}
                  onChange={(e) => setAuthPhone(e.target.value)}
                  placeholder="Ex: (11) 98765-4321"
                  className="w-full p-2.5 rounded-xl border border-[#E7DCCE] text-xs focus:border-[#C59B27] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#2D1914] mb-1">
                  {authMode === "register" ? "Crie uma Senha *" : "Sua Senha *"}
                </label>
                <div className="relative">
                  <input
                    type={showAuthPassword ? "text" : "password"}
                    required
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    placeholder={authMode === "register" ? "Mínimo 3 caracteres" : "Digite sua senha"}
                    className="w-full p-2.5 pr-9 rounded-xl border border-[#E7DCCE] text-xs focus:border-[#C59B27] outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAuthPassword(!showAuthPassword)}
                    className="absolute right-2.5 top-2.5 text-stone-400 hover:text-stone-700"
                  >
                    {showAuthPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isAuthLoading}
                className="w-full py-3 rounded-xl text-white gold-gradient font-bold text-xs shadow-md hover:opacity-95 transition-all disabled:opacity-50 mt-2"
              >
                {isAuthLoading ? "Conectando..." : authMode === "login" ? "Entrar na Minha Conta" : "Criar Cadastro"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Footer Elegante */}
      <footer className="bg-[#2D1914] text-[#E3D5C8] border-t border-[#4A322B] py-12 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
          <div>
            <span className="font-bold text-base text-white block">
              Espaço da Beleza Gleicy Ronha
            </span>
            <span className="text-xs text-[#AD841D]">
              Av. Paulista, 1000 - Jardins · São Paulo, SP · (11) 98765-4321
            </span>
          </div>

          <div className="flex items-center gap-6 text-xs text-[#C4B2A7]">
            <Link href="/login" className="hover:text-[#E5C158] transition-colors flex items-center gap-1">
              <Lock className="w-3.5 h-3.5" />
              <span>Painel do Salão / Login</span>
            </Link>
          </div>
        </div>

        <div className="max-w-6xl mx-auto mt-8 pt-6 border-t border-[#4A322B]/60 text-center text-xs text-[#786962]">
          © 2026 Glaicy Agenda SaaS. Todos os direitos reservados.
        </div>
      </footer>

      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-2xl shadow-xl text-white font-semibold transition-all ${
          toast.type === 'success' ? 'bg-amber-600 border border-amber-400' : 'bg-red-800'
        }`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}
