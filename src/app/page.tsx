"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { SupabaseDataService } from "@/lib/supabase/api";
import { SalonStore } from "@/lib/storage/localStore";
import { broadcastSync } from "@/lib/sync/syncBus";

// Componentes da Nova Identidade Visual Oficial
import { ClientNavbar } from "@/components/client/ClientNavbar";
import { HeroSection } from "@/components/client/HeroSection";
import { StatsBanner } from "@/components/client/StatsBanner";
import { Transformations3DCarousel } from "@/components/client/Transformations3DCarousel";
import { AboutStorySection } from "@/components/client/AboutStorySection";
import { TransparentServicesCatalog } from "@/components/client/TransparentServicesCatalog";
import { TestimonialsSection } from "@/components/client/TestimonialsSection";
import { MethodologySection } from "@/components/client/MethodologySection";
import { TeamAndSpaceSection } from "@/components/client/TeamAndSpaceSection";
import { ClientFooter } from "@/components/client/ClientFooter";

// Fluxos Interativos de Agendamento e Proposta
import { GamifiedTriage } from "@/components/client/GamifiedTriage";
import { SlotPicker } from "@/components/client/SlotPicker";
import { LuxuryProposalPDF } from "@/components/proposal/LuxuryProposalPDF";
import { MultiServiceSelectorModal } from "@/components/client/MultiServiceSelectorModal";

import { SalonOrganization } from "@/types/salon";
import { ServiceItem } from "@/types/service";
import { TriageForm, TriageSubmission } from "@/types/triage";
import { Appointment } from "@/types/appointment";
import { LuxuryProposal } from "@/types/proposal";
import { SalonClient } from "@/types/client";
import { AvailableDay, PreReservation, PreferredPeriod } from "@/types/availability";

import {
  Sparkles,
  CheckCircle2,
  Calendar,
  X,
  User,
  Eye,
  EyeOff,
  ExternalLink,
  ChevronRight,
  Phone,
  FileText,
  Search,
} from "lucide-react";
import { buildCompositeService } from "@/lib/services/composite";
export { buildCompositeService };

export default function ClientHomePage() {
  const [organization, setOrganization] = useState<SalonOrganization | null>(null);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [triageForms, setTriageForms] = useState<TriageForm[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [proposals, setProposals] = useState<LuxuryProposal[]>([]);
  const [availableDays, setAvailableDays] = useState<AvailableDay[]>([]);
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
  const [isMultiServiceModalOpen, setIsMultiServiceModalOpen] = useState(false);
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
    }, 4500);
  };

  const scrollToSection = (sectionId: string) => {
    if (sectionId === "agendar") {
      const el = document.getElementById("servicos");
      if (el) el.scrollIntoView({ behavior: "smooth" });
      return;
    }
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const todayStr = new Date().toISOString().split("T")[0];
        const nextMonth = new Date();
        nextMonth.setDate(nextMonth.getDate() + 45);
        const nextMonthStr = nextMonth.toISOString().split("T")[0];

        const [org, srvs, forms, apts, props, days] = await Promise.all([
          SupabaseDataService.getOrganization(),
          SupabaseDataService.getServices(),
          SupabaseDataService.getTriageForms(),
          SupabaseDataService.getAppointments(),
          SupabaseDataService.getProposals(),
          SupabaseDataService.getAvailableDays("user-gleicy-ronha", todayStr, nextMonthStr),
        ]);
        setOrganization(org);
        setServices(srvs);
        setTriageForms(forms);
        setAppointments(apts);
        setProposals(props);
        setAvailableDays(days);
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
        showToast(`Bem-vinda de volta, ${res.client.name.split(" ")[0]}!`, "success");
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
        showToast("Cadastro realizado com sucesso!", "success");
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
    showToast("Sessão encerrada com sucesso.", "success");
  };

  // Handler para confirmação de múltiplos procedimentos ("Montar o meu atendimento")
  const handleConfirmMultiServices = (selectedServices: ServiceItem[]) => {
    if (!selectedServices || selectedServices.length === 0) return;

    if (selectedServices.length === 1) {
      handleSelectService(selectedServices[0]);
      setIsMultiServiceModalOpen(false);
      return;
    }

    const compositeService = buildCompositeService(selectedServices);
    if (!compositeService) return;
    setIsMultiServiceModalOpen(false);
    handleSelectService(compositeService);
  };

  // Iniciar fluxo a partir de um serviço escolhido
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
    // 1. Salva a submissão de triagem
    const savedSub = await SupabaseDataService.saveTriageSubmission(sub);

    // 2. Se for solicitação de Encaixe Especial, cria a Pré-Reserva correspondente
    if (sub.preferredTimeSlot?.startsWith("Encaixe")) {
      const preferredPeriod: PreferredPeriod = sub.preferredTimeSlot.includes("Manhã")
        ? "manha"
        : sub.preferredTimeSlot.includes("Tarde")
        ? "tarde"
        : "qualquer";

      const rawTime = sub.preferredTimeSlot;
      let validStartTime = "09:30";
      if (rawTime.includes("Tarde")) validStartTime = "14:00";
      else if (rawTime.includes("Manhã")) validStartTime = "09:30";

      await SupabaseDataService.createPreReservation({
        orgId: savedSub.orgId || "11111111-1111-4111-8111-111111111111",
        professionalId: selectedService?.professionalId || "58f26242-1e53-432e-b924-dea25ee2068a",
        serviceId: savedSub.serviceId,
        serviceName: savedSub.serviceTitle,
        clientName: savedSub.clientName,
        clientPhone: savedSub.clientPhone,
        clientEmail: savedSub.clientEmail,
        requestedDate: savedSub.preferredDate || new Date().toISOString().split("T")[0],
        preferredPeriod,
        preferredTime: validStartTime,
        triageSubmissionId: savedSub.id,
        status: "pending",
        adminNotes: `Solicitação de Encaixe Especial (${sub.preferredTimeSlot}) enviada com triagem anamnese capilar.`,
      });
    }

    // Dispara sinal imediato no barramento de tempo real
    broadcastSync("triage_created", savedSub.id);

    setIsTakingTriage(false);
    setCompletedSubmission(savedSub);
  };

  // Confirmar agendamento direto pelo Slot Picker
  const handleConfirmDirectBooking = async (apt: Appointment) => {
    const saved = await SupabaseDataService.saveAppointment(apt);
    setAppointments((prev) => [...prev, saved]);
    setIsPickingSlot(false);
    if (!apt.isUncommittedQuote && apt.status !== "uncommitted_quote") {
      setConfirmedAppointment(saved);
    }
  };

  const handlePreReservationDone = (pre: PreReservation) => {
    setIsPickingSlot(false);
    showToast("Pré-reserva solicitada com sucesso! A Gleicy entrará em contato.", "success");
  };

  // Buscar proposta por telefone
  const handleSearchProposal = async (e: React.FormEvent) => {
    e.preventDefault();
    setSearchNotFound(false);
    setSearchResultProposal(null);
    const clean = searchPhone.replace(/\D/g, "");
    if (!clean) return;

    try {
      const results = await SupabaseDataService.getProposalsByClientPhone(clean);
      if (results && results.length > 0) {
        setSearchResultProposal(results[0]);
        return;
      }
    } catch (err) {
      console.warn("Erro ao buscar propostas pelo telefone no Supabase:", err);
    }

    const found = proposals.find((p) => p.clientPhone.replace(/\D/g, "").includes(clean));
    if (found) {
      setSearchResultProposal(found);
    } else {
      setSearchNotFound(true);
    }
  };

  const activeTriageForm =
    (selectedService?.triageFormId ? triageForms.find((f) => f.id === selectedService.triageFormId) : null) ||
    triageForms.find((f) => f.targetServiceId === selectedService?.id) ||
    triageForms[0];

  const whatsappNumber = organization?.phone
    ? organization.phone.replace(/\D/g, "")
    : "5511995975725";


  return (
    <div className="min-h-screen flex flex-col bg-[#FCF5EB] text-[#1D3D3C]">
      {/* 1. Navbar Oficial */}
      <ClientNavbar
        organization={organization}
        activeClient={activeClient}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onScrollToSection={scrollToSection}
      />

      {/* 2. Hero Section */}
      <HeroSection
        organization={organization}
        onExploreServices={() => scrollToSection("servicos")}
        onBookNow={() => scrollToSection("servicos")}
      />

      {/* 3. Faixa de Estatísticas / Prova Social Numérica */}
      <StatsBanner onBookNow={() => scrollToSection("servicos")} />

      {/* Bloco 3: Carrossel 3D de Transformações Reais */}
      <Transformations3DCarousel onBookResult={() => scrollToSection("servicos")} />

      {/* 4. Confirmações de Agendamento ou Triagem */}
      {(completedSubmission || confirmedAppointment) && (
        <section className="max-w-4xl mx-auto px-4 sm:px-6 py-8 w-full animate-fade-in">
          {completedSubmission && (
            <div className="p-8 sm:p-10 rounded-3xl bg-white border border-[#C7A03A]/50 shadow-2xl text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-[#F0EFE3] text-[#1D3D3C] flex items-center justify-center mx-auto border border-[#C7A03A]/40">
                <CheckCircle2 className="w-8 h-8 text-[#C7A03A]" />
              </div>
              <span className="font-gwendolyn text-3xl sm:text-4xl text-[#80611F] block">
                O cuidado já começou
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold text-[#1D3D3C] font-editorial">
                Triagem Capilar Recebida com Sucesso!
              </h2>
              <p className="text-sm text-[#736455] leading-relaxed max-w-xl mx-auto">
                Obrigada, <strong>{completedSubmission.clientName}</strong>! Suas respostas e fotos foram enviadas diretamente para a bancada técnica da Gleicy Ronha.
              </p>
              <div className="p-5 rounded-2xl bg-[#FCF5EB] border border-[#D8D0BD] text-xs text-[#1D3D3C] space-y-1.5 text-left max-w-md mx-auto">
                <div>• <strong>Procedimento:</strong> {completedSubmission.serviceTitle}</div>
                <div>• <strong>Data de Preferência:</strong> {completedSubmission.preferredDate} às {completedSubmission.preferredTimeSlot}</div>
                <div>• <strong>Status:</strong> Em formulação de Proposta Consultiva de Luxo.</div>
              </div>
              <p className="text-xs text-[#80611F] font-semibold">
                Você receberá sua Proposta Oficial com diagnóstico e cronograma no WhatsApp ({completedSubmission.clientPhone}) em breve!
              </p>
              <button
                onClick={() => setCompletedSubmission(null)}
                className="mt-3 px-7 py-3 rounded-xl bg-[#1D3D3C] text-white text-xs font-bold uppercase tracking-wider hover:bg-[#28504D] transition-all shadow-sm"
              >
                Concluir e Voltar
              </button>
            </div>
          )}

          {confirmedAppointment && (
            <div className="p-8 sm:p-10 rounded-3xl bg-white border border-emerald-400 shadow-2xl text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto border border-emerald-300">
                <CheckCircle2 className="w-8 h-8 text-emerald-600" />
              </div>
              <span className="font-gwendolyn text-3xl sm:text-4xl text-[#C7A03A] block">
                Tudo pronto para receber você
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold text-[#1D3D3C] font-editorial">
                Horário Confirmado na Agenda!
              </h2>
              <p className="text-sm text-[#736455] leading-relaxed max-w-xl mx-auto">
                <strong>{confirmedAppointment.clientName}</strong>, seu horário para <strong>{confirmedAppointment.serviceTitle}</strong> foi reservado para o dia <strong>{confirmedAppointment.date}</strong> às <strong>{confirmedAppointment.startTime}</strong> (término previsto às {confirmedAppointment.endTime}).
              </p>
              <button
                onClick={() => setConfirmedAppointment(null)}
                className="mt-3 px-7 py-3 rounded-xl bg-[#1D3D3C] text-white text-xs font-bold uppercase tracking-wider hover:bg-[#28504D] transition-all shadow-sm"
              >
                Voltar à Página Principal
              </button>
            </div>
          )}
        </section>
      )}

      {/* 5. Nossa História & Essência */}
      <AboutStorySection />

      {/* 6. Catálogo de Serviços com Valores e Etapas */}
      <TransparentServicesCatalog
        services={services}
        onSelectService={handleSelectService}
        onOpenMultiServiceSelector={() => setIsMultiServiceModalOpen(true)}
        whatsappNumber={whatsappNumber}
      />

      {/* Modal de Montagem de Atendimento Personalizado */}
      <MultiServiceSelectorModal
        services={services}
        isOpen={isMultiServiceModalOpen}
        onClose={() => setIsMultiServiceModalOpen(false)}
        onConfirm={handleConfirmMultiServices}
      />

      {/* 7. Depoimentos de Clientes */}
      <TestimonialsSection />

      {/* 8. O Método Gleicy Ronha */}
      <MethodologySection />

      {/* 9. O Espaço & Equipe Multidisciplinar */}
      <TeamAndSpaceSection
        organization={organization}
        whatsappNumber={whatsappNumber}
        onBookHair={() => scrollToSection("servicos")}
      />

      {/* 10. Área de Consulta Rápida de Proposta */}
      <section id="proposta-search" className="py-16 sm:py-20 bg-[#E5DFD1] border-t border-[#D8D0BD] relative overflow-hidden font-sans">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 relative z-10">
          <div className="bg-white rounded-3xl p-8 sm:p-10 border border-[#D8D0BD] shadow-lg text-center space-y-5">
            <div className="space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#80611F] block">
                Portal Consultivo
              </span>
              <h3 className="text-2xl sm:text-3xl font-bold text-[#1D3D3C] font-sans">
                Já recebeu sua Proposta de Transformação?
              </h3>
              {/* Linha grafismo 1 */}
              <div className="relative w-36 sm:w-44 h-2.5 mx-auto pointer-events-none opacity-70">
                <Image
                  src="/brand/Grafismos/linha-grafismo-1.png"
                  alt=""
                  fill
                  className="object-contain"
                />
              </div>
              <p className="text-xs sm:text-sm text-[#736455] max-w-lg mx-auto leading-relaxed">
                Digite seu número de WhatsApp com DDD para visualizar e aprovar seu orçamento exclusivo diretamente no portal.
              </p>
            </div>

            <form onSubmit={handleSearchProposal} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
              <input
                type="tel"
                placeholder="(11) 98765-4321"
                value={searchPhone}
                onChange={(e) => setSearchPhone(e.target.value)}
                className="flex-1 px-4 py-3 rounded-xl border border-[#D8D0BD] bg-[#FCF5EB] text-sm text-[#1D3D3C] placeholder-[#736455]/60 focus:outline-none focus:border-[#1D3D3C] focus:ring-1 focus:ring-[#1D3D3C]"
              />
              <button
                type="submit"
                className="px-6 py-3 bg-[#1D3D3C] hover:bg-[#28504D] text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-sm flex items-center justify-center space-x-2"
              >
                <Search className="w-3.5 h-3.5 text-[#C7A03A]" />
                <span>Consultar</span>
              </button>
            </form>

            {searchNotFound && (
              <p className="text-xs text-[#9B3834] font-medium pt-2">
                Nenhuma proposta ativa foi encontrada para este telefone. Entre em contato conosco via WhatsApp.
              </p>
            )}

            {/* Proposta Encontrada */}
            {searchResultProposal && (
              <div className="mt-6 p-5 sm:p-6 rounded-2xl bg-[#FCF5EB] border border-[#C7A03A]/50 flex flex-col sm:flex-row items-center justify-between gap-4 text-left animate-fade-in">
                <div className="space-y-1">
                  <span className="font-bold text-sm text-[#1D3D3C] block font-editorial">
                    {searchResultProposal.title}: {searchResultProposal.subtitle}
                  </span>
                  <span className="text-xs text-[#736455] block">
                    Cliente: <strong>{searchResultProposal.clientName}</strong> • Total Pix: R$ {searchResultProposal.pixTotal.toFixed(2)}
                  </span>
                  <span
                    className={`inline-block text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                      searchResultProposal.status === "approved"
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {searchResultProposal.status === "approved" ? "Proposta Aprovada" : "Aguardando Aprovação (48h)"}
                  </span>
                </div>

                <div className="flex items-center space-x-2 w-full sm:w-auto">
                  <Link
                    href={`/proposta/${searchResultProposal.id}`}
                    target="_blank"
                    className="flex-1 sm:flex-none px-4 py-2.5 bg-white border border-[#D8D0BD] hover:border-[#1D3D3C] text-[#1D3D3C] text-xs font-bold rounded-xl flex items-center justify-center space-x-1.5 transition-all shadow-2xs"
                  >
                    <span>Abrir Link</span>
                    <ExternalLink className="w-3.5 h-3.5 text-[#C7A03A]" />
                  </Link>

                  <button
                    onClick={() => setViewingProposal(searchResultProposal)}
                    className="flex-1 sm:flex-none px-4 py-2.5 bg-[#1D3D3C] text-[#FCF5EB] text-xs font-bold uppercase tracking-wider rounded-xl shadow-sm hover:bg-[#28504D] transition-all"
                  >
                    Visualizar PDF
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 9. Rodapé Completo da Marca */}
      <ClientFooter
        organization={organization}
        onScrollToSection={scrollToSection}
      />

      {/* Modal Interativo de Triagem Anamnese (quando serviço exige) */}
      {isTakingTriage && activeTriageForm && selectedService && (
        <div className="fixed inset-0 z-50 bg-[#122B2A]/70 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-hidden">
          <div className="bg-white rounded-t-[28px] sm:rounded-3xl rounded-b-none sm:rounded-b-3xl max-w-3xl w-full p-2 sm:p-4 shadow-2xl border-t border-x sm:border border-[#C7A03A]/40 max-h-[94vh] sm:max-h-[92vh] flex flex-col overflow-hidden animate-slide-up-sheet">
            {/* Puxador Visual Mobile */}
            <div className="w-12 h-1.5 bg-[#D8D0BD] rounded-full mx-auto my-2 sm:hidden shrink-0" />
            <div className="flex-1 overflow-y-auto no-scrollbar sm:scrollbar-thin">
              <GamifiedTriage
                form={activeTriageForm}
                service={selectedService}
                existingAppointments={appointments}
                availableDays={availableDays}
                onComplete={handleCompleteTriage}
                onCancel={() => setIsTakingTriage(false)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Modal Interativo de Seleção de Horário (Slot Picker Direto) */}
      {isPickingSlot && selectedService && (
        <div className="fixed inset-0 z-50 bg-[#122B2A]/70 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-hidden">
          <div className="bg-white rounded-t-[28px] sm:rounded-3xl rounded-b-none sm:rounded-b-3xl max-w-3xl w-full p-2 sm:p-4 shadow-2xl border-t border-x sm:border border-[#C7A03A]/40 max-h-[94vh] sm:max-h-[92vh] flex flex-col overflow-hidden animate-slide-up-sheet">
            {/* Puxador Visual Mobile */}
            <div className="w-12 h-1.5 bg-[#D8D0BD] rounded-full mx-auto my-2 sm:hidden shrink-0" />
            <div className="flex-1 overflow-y-auto no-scrollbar sm:scrollbar-thin">
              <SlotPicker
                service={selectedService}
                existingAppointments={appointments}
                availableDays={availableDays}
                onConfirmBooking={handleConfirmDirectBooking}
                onRequestPreReservation={handlePreReservationDone}
                onCancel={() => setIsPickingSlot(false)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Modal de Proposta PDF */}
      {viewingProposal && (
        <div className="fixed inset-0 z-50 bg-[#122B2A]/70 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-hidden">
          <div className="bg-white rounded-t-[28px] sm:rounded-3xl rounded-b-none sm:rounded-b-3xl max-w-4xl w-full p-3 sm:p-8 shadow-2xl max-h-[94vh] sm:max-h-[90vh] flex flex-col overflow-hidden border-t border-x sm:border border-[#D8D0BD] animate-slide-up-sheet">
            {/* Puxador Visual Mobile */}
            <div className="w-12 h-1.5 bg-[#D8D0BD] rounded-full mx-auto my-2 sm:hidden shrink-0" />
            <div className="flex-1 overflow-y-auto no-scrollbar sm:scrollbar-thin">
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
        </div>
      )}

      {/* Modal de Login / Registro da Cliente */}
      {isAuthModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#122B2A]/70 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-hidden">
          <div className="bg-white rounded-t-[28px] sm:rounded-3xl rounded-b-none sm:rounded-b-3xl max-w-md w-full p-5 sm:p-8 shadow-2xl border-t border-x sm:border border-[#D8D0BD] relative max-h-[92vh] sm:max-h-[90vh] flex flex-col overflow-hidden animate-slide-up-sheet">
            {/* Puxador Visual Mobile */}
            <div className="w-12 h-1.5 bg-[#D8D0BD] rounded-full mx-auto -mt-1 mb-3 sm:hidden shrink-0" />

            <button
              onClick={() => setIsAuthModalOpen(false)}
              className="p-1 rounded-full text-stone-400 hover:text-stone-700 absolute right-4 top-4 transition-colors z-10"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex-1 overflow-y-auto no-scrollbar sm:scrollbar-thin pb-4 sm:pb-0">
              <div className="text-center mb-6">
              <div className="w-12 h-12 rounded-2xl bg-[#1D3D3C] text-[#C7A03A] flex items-center justify-center mx-auto mb-3 shadow-md border border-[#C7A03A]/40 font-editorial font-bold text-lg">
                GR
              </div>
              <h3 className="font-editorial text-2xl font-bold text-[#1D3D3C]">
                {authMode === "login" ? "Área da Cliente" : "Criar Meu Cadastro"}
              </h3>
              <p className="text-xs text-[#736455] mt-1">
                {authMode === "login"
                  ? "Acesse suas propostas, agendamentos e histórico."
                  : "Cadastre-se para agendar com rapidez e segurança."}
              </p>
            </div>

            {/* Alternar modo */}
            <div className="flex bg-[#FCF5EB] p-1 rounded-xl border border-[#D8D0BD] text-xs mb-4">
              <button
                type="button"
                onClick={() => {
                  setAuthMode("login");
                  setAuthError("");
                }}
                className={`flex-1 py-2 rounded-lg font-medium transition-all ${
                  authMode === "login"
                    ? "bg-[#1D3D3C] text-white font-bold shadow-2xs"
                    : "text-[#736455] hover:text-[#1D3D3C]"
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
                className={`flex-1 py-2 rounded-lg font-medium transition-all ${
                  authMode === "register"
                    ? "bg-[#1D3D3C] text-white font-bold shadow-2xs"
                    : "text-[#736455] hover:text-[#1D3D3C]"
                }`}
              >
                Primeira Vez
              </button>
            </div>

            {authError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-[#9B3834] mb-4">
                {authError}
              </div>
            )}

            <form onSubmit={handleClientAuth} className="space-y-4">
              {authMode === "register" && (
                <div>
                  <label className="block text-xs font-semibold text-[#1D3D3C] mb-1">
                    Nome Completo *
                  </label>
                  <input
                    type="text"
                    required
                    value={authName}
                    onChange={(e) => setAuthName(e.target.value)}
                    placeholder="Ex: Amanda Silva"
                    className="w-full p-3 rounded-xl border border-[#D8D0BD] bg-[#FCF5EB] text-xs text-[#1D3D3C] focus:border-[#1D3D3C] outline-none"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-[#1D3D3C] mb-1">
                  WhatsApp com DDD *
                </label>
                <input
                  type="tel"
                  required
                  value={authPhone}
                  onChange={(e) => setAuthPhone(e.target.value)}
                  placeholder="Ex: (11) 98765-4321"
                  className="w-full p-3 rounded-xl border border-[#D8D0BD] bg-[#FCF5EB] text-xs text-[#1D3D3C] focus:border-[#1D3D3C] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1D3D3C] mb-1">
                  {authMode === "register" ? "Crie uma Senha *" : "Sua Senha *"}
                </label>
                <div className="relative">
                  <input
                    type={showAuthPassword ? "text" : "password"}
                    required
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    placeholder={authMode === "register" ? "Mínimo 3 caracteres" : "Digite sua senha"}
                    className="w-full p-3 pr-10 rounded-xl border border-[#D8D0BD] bg-[#FCF5EB] text-xs text-[#1D3D3C] focus:border-[#1D3D3C] outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAuthPassword(!showAuthPassword)}
                    className="absolute right-3 top-3 text-stone-400 hover:text-stone-700"
                  >
                    {showAuthPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isAuthLoading}
                className="w-full py-3.5 rounded-xl text-white bg-[#1D3D3C] hover:bg-[#28504D] active:bg-[#122B2A] font-bold text-xs uppercase tracking-wider shadow-md transition-all disabled:opacity-50 mt-2 border border-[#C7A03A]/40 active:scale-95 cursor-pointer"
              >
                {isAuthLoading ? "Conectando..." : authMode === "login" ? "Entrar na Minha Conta" : "Criar Meu Cadastro"}
              </button>
            </form>
            </div>
          </div>
        </div>
      )}

      {/* Notificação Toast */}
      {toast && (
        <div
          className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-2xl shadow-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center space-x-2 ${
            toast.type === "success"
              ? "bg-[#1D3D3C] text-[#FCF5EB] border border-[#C7A03A]"
              : "bg-[#9B3834] text-white"
          }`}
        >
          <Sparkles className="w-4 h-4 text-[#C7A03A]" />
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}
