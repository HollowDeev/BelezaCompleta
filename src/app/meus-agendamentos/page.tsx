"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { SupabaseDataService } from "@/lib/supabase/api";
import { LuxuryProposal } from "@/types/proposal";
import { Appointment } from "@/types/appointment";
import { formatBRL } from "@/lib/utils";
import {
  Calendar,
  Clock,
  Sparkles,
  Phone,
  FileText,
  ExternalLink,
  ChevronRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Scissors,
  Search,
  User,
  ShieldCheck,
  RefreshCw,
} from "lucide-react";

export default function MeusAgendamentosPage() {
  const [phone, setPhone] = useState("");
  const [searchedPhone, setSearchedPhone] = useState("");
  const [proposals, setProposals] = useState<LuxuryProposal[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [activeTab, setActiveTab] = useState<"todos" | "agendamentos" | "propostas">("todos");

  // Formatação de máscara brasileira para telefone (XX) XXXXX-XXXX
  const formatPhoneInput = (val: string) => {
    const digits = val.replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 2) return digits;
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
  };

  const handleSearchWithPhone = async (phoneToSearch: string) => {
    const clean = phoneToSearch.replace(/\D/g, "");
    if (!clean || clean.length < 8) return;

    setLoading(true);
    setSearchedPhone(phoneToSearch);
    setHasSearched(true);

    try {
      const [fetchedProposals, fetchedAppointments] = await Promise.all([
        SupabaseDataService.getProposalsByClientPhone(clean),
        SupabaseDataService.getAppointmentsByClientPhone(clean),
      ]);

      setProposals(fetchedProposals || []);
      setAppointments(fetchedAppointments || []);

      if (typeof window !== "undefined") {
        localStorage.setItem("glaicy_client_portal_phone", clean);
      }
    } catch (err) {
      console.error("Erro ao consultar agendamentos e propostas:", err);
    } finally {
      setLoading(false);
    }
  };

  // Carrega telefone salvo no primeiro acesso da cliente
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedPhone = localStorage.getItem("glaicy_client_portal_phone");
      if (savedPhone) {
        setPhone(formatPhoneInput(savedPhone));
        handleSearchWithPhone(savedPhone);
      }
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearchWithPhone(phone);
  };

  const handleClearPhone = () => {
    setPhone("");
    setSearchedPhone("");
    setProposals([]);
    setAppointments([]);
    setHasSearched(false);
    if (typeof window !== "undefined") {
      localStorage.removeItem("glaicy_client_portal_phone");
    }
  };

  const clientName =
    proposals[0]?.clientName ||
    appointments[0]?.clientName ||
    "Cliente";

  const formatDateDisplay = (dateStr: string) => {
    try {
      const [year, month, day] = dateStr.split("-");
      if (day && month && year) {
        return `${day}/${month}/${year}`;
      }
      return dateStr;
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="min-h-screen bg-[#FCF5EB] text-[#2D1914] flex flex-col selection:bg-[#C7A03A]/20">
      {/* Topo / Header da Marca */}
      <header className="bg-white/90 backdrop-blur-md border-b border-[#D8D0BD]/80 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-xs font-bold text-[#1D3D3C] hover:opacity-80 transition-opacity"
          >
            <ArrowLeft className="w-4 h-4 text-[#C7A03A]" />
            <span>Voltar ao Início</span>
          </Link>

          <Link href="/" className="inline-block">
            <img
              src="/brand/logo/logo-horizontal-verde.svg"
              alt="Espaço da Beleza Gleicy Ronha"
              className="h-8 sm:h-9 object-contain"
            />
          </Link>

          <a
            href="https://wa.me/5511999999999"
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-[#FAF7F2] border border-[#D8D0BD] text-[#1D3D3C] hover:bg-[#EEE8DD] transition-all flex items-center gap-1.5 text-xs font-semibold"
            title="Fale conosco no WhatsApp"
          >
            <Phone className="w-3.5 h-3.5 text-emerald-700" />
            <span className="hidden sm:inline">WhatsApp</span>
          </a>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-8">
        {/* Banner de Boas-vindas */}
        <div className="text-center space-y-2.5 max-w-xl mx-auto">
          <span className="text-[11px] uppercase tracking-widest font-bold text-[#80611F] bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
            Portal Exclusivo da Cliente
          </span>
          <h1 className="font-editorial text-2xl sm:text-4xl font-bold text-[#1D3D3C]">
            Meus Agendamentos &amp; Propostas
          </h1>
          <p className="text-xs sm:text-sm text-[#736455] leading-relaxed">
            Consulte suas propostas comerciais personalizadas, horários agendados e detalhes dos seus procedimentos informando seu número de WhatsApp com DDD.
          </p>
        </div>

        {/* Formulário de Identificação por Telefone */}
        <div className="bg-white/95 rounded-3xl p-6 sm:p-8 border border-[#D8D0BD] shadow-sm max-w-xl mx-auto">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="client-phone-input"
                className="block text-xs font-bold text-[#1D3D3C] uppercase tracking-wider mb-2"
              >
                Número de Celular / WhatsApp com DDD
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#C7A03A]">
                  <Phone className="w-4 h-4" />
                </div>
                <input
                  id="client-phone-input"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(formatPhoneInput(e.target.value))}
                  placeholder="(11) 99999-9999"
                  className="w-full pl-10 pr-4 py-3 bg-[#FAF7F2] border border-[#D8D0BD] rounded-2xl text-sm sm:text-base font-medium text-[#1D3D3C] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#C7A03A] focus:border-transparent transition-all placeholder:text-stone-400"
                  autoFocus
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="submit"
                disabled={loading || phone.replace(/\D/g, "").length < 8}
                className="flex-1 py-3 px-5 rounded-2xl bg-[#1D3D3C] hover:bg-[#16302f] text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed border border-[#C7A03A]/40"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-[#C7A03A]" />
                    <span>Buscando registros...</span>
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4 text-[#C7A03A]" />
                    <span>Acessar Meus Registros</span>
                  </>
                )}
              </button>

              {hasSearched && (
                <button
                  type="button"
                  onClick={handleClearPhone}
                  className="px-4 py-3 rounded-2xl bg-[#FAF7F2] hover:bg-[#EEE8DD] text-[#736455] text-xs font-semibold border border-[#D8D0BD] transition-all"
                  title="Trocar de número"
                >
                  Limpar
                </button>
              )}
            </div>

            <p className="text-[11px] text-stone-500 text-center flex items-center justify-center gap-1.5 pt-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
              <span>Acesso seguro: localize seus atendimentos apenas com o seu número.</span>
            </p>
          </form>
        </div>

        {/* Resultados Encontrados */}
        {hasSearched && !loading && (
          <div className="space-y-6 animate-fade-in">
            {/* Saudação à Cliente */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-3 border-b border-[#D8D0BD]/70 gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-[#1D3D3C] text-[#C7A03A] flex items-center justify-center font-bold font-editorial text-lg shadow-2xs">
                  {clientName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-[#1D3D3C]">
                    Olá, {clientName}!
                  </h2>
                  <p className="text-xs text-[#736455]">
                    Telefone consultado: <strong>{searchedPhone}</strong>
                  </p>
                </div>
              </div>

              {/* Filtro de Abas */}
              <div className="flex items-center bg-white p-1 rounded-2xl border border-[#D8D0BD] text-xs">
                <button
                  onClick={() => setActiveTab("todos")}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                    activeTab === "todos"
                      ? "bg-[#1D3D3C] text-white shadow-2xs"
                      : "text-stone-600 hover:text-stone-900"
                  }`}
                >
                  Tudo ({proposals.length + appointments.length})
                </button>
                <button
                  onClick={() => setActiveTab("agendamentos")}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                    activeTab === "agendamentos"
                      ? "bg-[#1D3D3C] text-white shadow-2xs"
                      : "text-stone-600 hover:text-stone-900"
                  }`}
                >
                  Agendamentos ({appointments.length})
                </button>
                <button
                  onClick={() => setActiveTab("propostas")}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                    activeTab === "propostas"
                      ? "bg-[#1D3D3C] text-white shadow-2xs"
                      : "text-stone-600 hover:text-stone-900"
                  }`}
                >
                  Propostas ({proposals.length})
                </button>
              </div>
            </div>

            {/* SEÇÃO 1: AGENDAMENTOS */}
            {(activeTab === "todos" || activeTab === "agendamentos") && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#C7A03A]" />
                  <h3 className="font-bold text-sm sm:text-base text-[#1D3D3C]">
                    Seus Agendamentos na Agenda
                  </h3>
                </div>

                {appointments.length === 0 ? (
                  <div className="p-6 rounded-2xl bg-white border border-dashed border-[#D8D0BD] text-center text-xs text-[#736455]">
                    Nenhum agendamento encontrado para este número. Quando seu horário for confirmado, ele aparecerá aqui com todos os detalhes.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {appointments.map((apt) => {
                      const isConfirmed = apt.status === "confirmed";
                      return (
                        <div
                          key={apt.id}
                          className="bg-white rounded-2xl p-5 border border-[#D8D0BD] shadow-xs flex flex-col justify-between hover:border-[#C7A03A] transition-all space-y-4"
                        >
                          <div className="space-y-2.5">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] uppercase font-bold text-[#80611F] bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                                {apt.professionalName || "Gleicy Ronha"}
                              </span>
                              <span
                                className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                                  isConfirmed
                                    ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                                    : "bg-stone-100 text-stone-700 border border-stone-300"
                                }`}
                              >
                                {isConfirmed ? "Horário Confirmado ✓" : apt.status}
                              </span>
                            </div>

                            <h4 className="font-bold text-base text-[#1D3D3C]">
                              {apt.serviceTitle || "Atendimento Personalizado"}
                            </h4>

                            <div className="flex flex-wrap items-center gap-3 text-xs text-stone-600">
                              <span className="flex items-center gap-1 font-semibold text-[#1D3D3C]">
                                <Calendar className="w-3.5 h-3.5 text-[#C7A03A]" />
                                {formatDateDisplay(apt.date)}
                              </span>
                              <span className="flex items-center gap-1 font-semibold text-[#1D3D3C]">
                                <Clock className="w-3.5 h-3.5 text-[#C7A03A]" />
                                {apt.startTime} às {apt.endTime} ({apt.totalDurationMin} min)
                              </span>
                            </div>

                            {/* Procedimentos inclusos ou múltiplos */}
                            {apt.procedures && apt.procedures.length > 0 && (
                              <div className="p-3 bg-[#FAF7F2] rounded-xl border border-[#D8D0BD]/70 space-y-1.5 text-xs">
                                <span className="text-[10px] uppercase tracking-wider font-bold text-stone-500 block">
                                  Procedimentos Inclusos no Atendimento:
                                </span>
                                <ul className="space-y-1">
                                  {apt.procedures.map((proc, idx) => (
                                    <li
                                      key={idx}
                                      className="flex items-center justify-between text-stone-800 text-[11px]"
                                    >
                                      <span>• {proc.title} ({proc.durationMin} min)</span>
                                      {proc.isIncluded ? (
                                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                                          Incluso
                                        </span>
                                      ) : (
                                        <span className="font-semibold">{formatBRL(proc.price)}</span>
                                      )}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>

                          <div className="pt-3 border-t border-[#D8D0BD]/60 flex items-center justify-between text-xs">
                            <span className="text-stone-500">Investimento Total:</span>
                            <span className="font-bold text-base text-[#1D3D3C]">
                              {formatBRL(apt.price)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* SEÇÃO 2: PROPOSTAS COMERCIAIS */}
            {(activeTab === "todos" || activeTab === "propostas") && (
              <div className="space-y-4 pt-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#C7A03A]" />
                  <h3 className="font-bold text-sm sm:text-base text-[#1D3D3C]">
                    Suas Propostas Comerciais Personalizadas
                  </h3>
                </div>

                {proposals.length === 0 ? (
                  <div className="p-6 rounded-2xl bg-white border border-dashed border-[#D8D0BD] text-center text-xs text-[#736455]">
                    Nenhuma proposta comercial encontrada para este telefone. Se você solicitou uma avaliação ou pré-agendamento, sua proposta aparecerá aqui assim que for emitida.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {proposals.map((prop) => {
                      const isApproved = prop.status === "approved";
                      return (
                        <div
                          key={prop.id}
                          className="bg-white rounded-2xl p-5 border border-[#D8D0BD] shadow-xs flex flex-col justify-between hover:border-[#C7A03A] transition-all space-y-4"
                        >
                          <div className="space-y-2.5">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] uppercase font-bold text-[#80611F] bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                                Proposta Exclusiva
                              </span>
                              <span
                                className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                                  isApproved
                                    ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                                    : "bg-[#FCF9F0] text-[#80611F] border border-[#C7A03A]/50"
                                }`}
                              >
                                {isApproved ? "Aprovada ✓" : "Aguardando seu aceite"}
                              </span>
                            </div>

                            <div>
                              <h4 className="font-bold text-base text-[#1D3D3C]">
                                {prop.title}
                              </h4>
                              {prop.subtitle && (
                                <p className="text-xs text-[#80611F] font-semibold mt-0.5">
                                  {prop.subtitle}
                                </p>
                              )}
                            </div>

                            {prop.projectOverview && (
                              <p className="text-xs text-[#736455] line-clamp-3 leading-relaxed">
                                {prop.projectOverview}
                              </p>
                            )}

                            {/* Resumo Financeiro */}
                            <div className="p-3 bg-[#FAF7F2] rounded-xl border border-[#D8D0BD]/70 flex items-center justify-between text-xs">
                              <div>
                                <span className="text-[10px] uppercase text-stone-500 font-bold block">
                                  Valor com Desconto:
                                </span>
                                <span className="font-bold text-sm text-[#1D3D3C]">
                                  {formatBRL(prop.totalWithDiscount)}
                                </span>
                              </div>
                              <div className="text-right">
                                <span className="text-[10px] uppercase text-emerald-800 font-bold block">
                                  No Pix à vista:
                                </span>
                                <span className="font-bold text-sm text-emerald-800">
                                  {formatBRL(prop.pixTotal)}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="pt-3 border-t border-[#D8D0BD]/60">
                            <Link
                              href={`/proposta/${prop.id}`}
                              className="w-full py-2.5 px-4 rounded-xl bg-[#1D3D3C] hover:bg-[#16302f] text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs"
                            >
                              <span>Visualizar Proposta Completa &amp; Confirmar</span>
                              <ExternalLink className="w-3.5 h-3.5 text-[#C7A03A]" />
                            </Link>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Rodapé Elegante */}
      <footer className="border-t border-[#D8D0BD]/60 py-6 bg-white/70 text-center text-xs text-stone-500">
        <p>Espaço da Beleza Gleicy Ronha · Excelência e acolhimento capilar</p>
      </footer>
    </div>
  );
}
