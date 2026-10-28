"use client";

import { useState, useEffect, useMemo } from "react";
import { ServiceItem } from "@/types/service";
import { Appointment } from "@/types/appointment";
import { SalonClient } from "@/types/client";
import { calculateAvailableSlots, AvailableSlot } from "@/lib/scheduling/engine";
import { SalonStore } from "@/lib/storage/localStore";
import { SupabaseDataService } from "@/lib/supabase/api";
import { formatBRL } from "@/lib/utils";
import {
  Calendar,
  Clock,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Zap,
  Lock,
  Eye,
  EyeOff,
  User,
  Phone,
  AlertCircle,
  Sun,
  Moon,
  CalendarDays,
  ShieldCheck,
  Check,
} from "lucide-react";
import confetti from "canvas-confetti";

interface SlotPickerProps {
  service: ServiceItem;
  existingAppointments: Appointment[];
  onConfirmBooking: (appointment: Appointment) => void;
  onCancel: () => void;
}

// Gera os próximos 14 dias para o seletor visual rápido
function getUpcomingDays(count = 14) {
  const days = [];
  const base = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const isoDate = `${yyyy}-${mm}-${dd}`;
    const weekDay = d.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "");
    const month = d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");
    days.push({
      dateStr: isoDate,
      dayNum: d.getDate(),
      weekDay: weekDay.charAt(0).toUpperCase() + weekDay.slice(1),
      month: month.charAt(0).toUpperCase() + month.slice(1),
      isToday: i === 0,
      isTomorrow: i === 1,
    });
  }
  return days;
}

export function SlotPicker({
  service,
  existingAppointments,
  onConfirmBooking,
  onCancel,
}: SlotPickerProps) {
  const upcomingDays = useMemo(() => getUpcomingDays(14), []);
  const [selectedDate, setSelectedDate] = useState(upcomingDays[0]?.dateStr || "2026-10-18");
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null);
  const [slotFilter, setSlotFilter] = useState<"all" | "encaixes" | "manha" | "tarde">("all");

  // Sessão da Cliente
  const [activeClient, setActiveClient] = useState<SalonClient | null>(null);
  const [authMode, setAuthMode] = useState<"login" | "register">("register");

  // Formulário de Identificação / Autenticação
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientPassword, setClientPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState("");
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Carrega cliente ativo se já houver sessão
  useEffect(() => {
    const existing = SalonStore.getActiveClient();
    if (existing) {
      setActiveClient(existing);
      setClientName(existing.name);
      setClientPhone(existing.phone);
    }
  }, []);

  // Calcula slots via engine dinâmica com suporte a encaixes em pausas químicas
  const allSlots = useMemo(() => {
    return calculateAvailableSlots(
      service,
      selectedDate,
      service.professionalId || "user-gleicy-ronha",
      existingAppointments
    );
  }, [service, selectedDate, existingAppointments]);

  // Filtra slots por período ou destaque
  const filteredSlots = useMemo(() => {
    return allSlots.filter((slot) => {
      const hour = parseInt(slot.time.split(":")[0], 10);
      if (slotFilter === "encaixes") return slot.isEncaixe;
      if (slotFilter === "manha") return hour < 12;
      if (slotFilter === "tarde") return hour >= 12;
      return true;
    });
  }, [allSlots, slotFilter]);

  const encaixesCount = useMemo(() => {
    return allSlots.filter((s) => s.isEncaixe).length;
  }, [allSlots]);

  // Alterna conta / logout do cliente
  const handleSwitchAccount = () => {
    SalonStore.setActiveClient(null);
    setActiveClient(null);
    setClientName("");
    setClientPhone("");
    setClientPassword("");
    setAuthMode("login");
  };

  // Submissão do Agendamento com Autenticação e Registro da Cliente
  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");

    if (!selectedSlot) {
      setAuthError("Por favor, selecione um horário disponível.");
      return;
    }

    let clientToUse: SalonClient | null = activeClient;

    setIsAuthenticating(true);

    try {
      if (!clientToUse) {
        if (!clientPhone.trim()) {
          setAuthError("Informe seu número de WhatsApp.");
          setIsAuthenticating(false);
          return;
        }

        if (authMode === "login") {
          // Login com Telefone + Senha
          const loginRes = await SupabaseDataService.loginClient(clientPhone, clientPassword);
          if (!loginRes.success || !loginRes.client) {
            setAuthError(loginRes.message || "Telefone ou senha inválidos.");
            setIsAuthenticating(false);
            return;
          }
          clientToUse = loginRes.client;
          setActiveClient(loginRes.client);
        } else {
          // Cadastro Novo: Nome + Telefone + Senha
          if (!clientName.trim()) {
            setAuthError("Por favor, informe seu nome completo.");
            setIsAuthenticating(false);
            return;
          }
          if (!clientPassword || clientPassword.length < 3) {
            setAuthError("Crie uma senha de acesso com no mínimo 3 dígitos.");
            setIsAuthenticating(false);
            return;
          }

          const newClient: SalonClient = {
            id: `cli-${Date.now()}`,
            name: clientName.trim(),
            phone: clientPhone.trim(),
            password: clientPassword.trim(),
            createdAt: new Date().toISOString(),
            lastVisitAt: `${selectedDate}T${selectedSlot.time}:00Z`,
            lastServiceTitle: service.title,
          };

          const savedClient = await SupabaseDataService.saveClient(newClient);
          SalonStore.setActiveClient(savedClient);
          clientToUse = savedClient;
          setActiveClient(savedClient);
        }
      }

      // Constrói o agendamento final vinculado à cliente
      const newAppointment: Appointment = {
        id: `apt-${Date.now()}`,
        orgId: service.orgId || "org-gleicy-ronha",
        professionalId: service.professionalId || "user-gleicy-ronha",
        professionalName: "Gleicy Ronha",
        serviceId: service.id,
        serviceTitle: service.title,
        clientName: clientToUse.name,
        clientPhone: clientToUse.phone,
        clientEmail: clientToUse.email,
        date: selectedDate,
        startTime: selectedSlot.time,
        endTime: selectedSlot.endTime,
        totalDurationMin: service.steps.reduce((sum, s) => sum + s.durationMin, 0),
        status: "confirmed",
        price: service.promotionalPrice || service.price,
        paymentStatus: "pending",
        stepBlocks: selectedSlot.stepBlocks,
        notes: selectedSlot.isEncaixe
          ? `Agendamento via Encaixe Otimizado (${selectedSlot.encaixeDetails})`
          : "Agendamento direto pelo catálogo da cliente",
        createdAt: new Date().toISOString(),
      };

      // Atualiza dados da cliente com a nova visita
      await SupabaseDataService.saveClient({
        ...clientToUse,
        lastVisitAt: `${selectedDate}T${selectedSlot.time}:00Z`,
        lastServiceTitle: service.title,
      });

      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });

      setIsSuccess(true);
      onConfirmBooking(newAppointment);
    } catch (err: any) {
      console.error("Erro ao processar agendamento:", err);
      setAuthError(err.message || "Erro ao salvar agendamento. Tente novamente.");
    } finally {
      setIsAuthenticating(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="max-w-md mx-auto my-10 p-8 bg-white rounded-3xl shadow-xl border border-[#E7DCCE] text-center animate-fade-in">
        <div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mb-4">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <span className="text-xs font-semibold uppercase tracking-widest text-[#AD841D]">
          Agendamento Confirmado
        </span>
        <h2 className="font-editorial text-2xl font-bold text-[#2D1914] mt-1 mb-2">
          Te esperamos, {activeClient?.name || clientName}!
        </h2>
        <p className="text-xs text-[#5E372C] mb-6">
          Seu procedimento <strong>{service.title}</strong> foi confirmado com sucesso na agenda da Gleicy Ronha.
        </p>

        <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#E7DCCE] text-left text-xs space-y-2 mb-6">
          <div className="flex items-center justify-between">
            <span className="text-stone-500">Data & Horário:</span>
            <span className="font-bold text-[#2D1914]">
              {selectedDate} às {selectedSlot?.time} (até {selectedSlot?.endTime})
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-stone-500">Profissional:</span>
            <span className="font-semibold text-[#2D1914]">Gleicy Ronha</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-stone-500">Telefone / WhatsApp:</span>
            <span className="font-semibold text-[#2D1914]">{activeClient?.phone || clientPhone}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-stone-500">Valor Previsto:</span>
            <span className="font-bold text-[#C59B27]">
              {formatBRL(service.promotionalPrice || service.price)}
            </span>
          </div>
          {selectedSlot?.isEncaixe && (
            <div className="pt-2 border-t border-[#E7DCCE]/60 flex items-center gap-1.5 text-amber-800 text-[11px] font-medium">
              <Zap className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span>Agendado via Encaixe Inteligente em Janela de Pausa</span>
            </div>
          )}
        </div>

        <button
          onClick={onCancel}
          className="w-full py-3 px-6 rounded-xl text-white gold-gradient font-bold text-xs shadow-md hover:opacity-95 transition-all"
        >
          Voltar ao Catálogo
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto my-6 px-4">
      <div className="bg-white rounded-3xl p-6 sm:p-9 shadow-xl border border-[#E7DCCE]">
        {/* Cabeçalho do Procedimento */}
        <div className="flex items-start justify-between border-b border-[#E7DCCE]/60 pb-5 mb-6">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FAF7F2] border border-[#E7DCCE] text-[10px] font-bold text-[#AD841D] uppercase tracking-wider mb-2">
              <Sparkles className="w-3 h-3 text-[#C59B27]" />
              <span>Agendamento Inteligente & Gestão de Pausas</span>
            </div>
            <h2 className="font-editorial text-2xl font-bold text-[#2D1914]">
              {service.title}
            </h2>
            <p className="text-xs text-[#5E372C] mt-1 max-w-lg">
              {service.description || "Procedimento exclusivo com técnica avançada para cabelos saudáveis."}
            </p>
          </div>
          <div className="text-right shrink-0">
            <span className="text-[11px] text-stone-500 block">Investimento:</span>
            <span className="font-editorial text-xl font-bold text-[#44271F]">
              {formatBRL(service.promotionalPrice || service.price)}
            </span>
            <span className="text-[10px] text-emerald-700 font-semibold block">
              5% OFF no PIX
            </span>
          </div>
        </div>

        {/* Resumo das Etapas do Serviço (Ativas vs Pausa Química) */}
        <div className="mb-6 p-4 rounded-2xl bg-[#FAF7F2] border border-[#E7DCCE]">
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#AD841D] block mb-2">
            Estrutura Técnica do Procedimento ({service.steps.reduce((acc, s) => acc + s.durationMin, 0)} min total):
          </span>
          <div className="flex flex-wrap items-center gap-2">
            {service.steps.map((st, i) => (
              <div
                key={i}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border ${
                  st.type === "active"
                    ? "bg-[#54352a] text-white border-[#38231c]"
                    : "bg-amber-100/90 text-amber-950 border-amber-300 font-semibold"
                }`}
              >
                {st.type === "active" ? (
                  <Clock className="w-3 h-3 text-[#E5C158]" />
                ) : (
                  <Zap className="w-3 h-3 text-amber-600" />
                )}
                <span>
                  {i + 1}. {st.title} ({st.durationMin}m)
                </span>
                {st.type === "pause" && (
                  <span className="text-[9px] bg-amber-200 text-amber-900 px-1.5 py-0.2 rounded font-bold">
                    Pausa Química
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        <form onSubmit={handleBooking} className="space-y-6">
          {/* Seletor de Dia Interativo (Próximos Dias em Pílulas + Input Calendário) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-[#2D1914] flex items-center gap-1.5">
                <CalendarDays className="w-4 h-4 text-[#C59B27]" />
                <span>Escolha o Dia do Atendimento:</span>
              </label>
              <div className="flex items-center gap-1 text-[11px] text-[#7B493B]">
                <Calendar className="w-3 h-3 text-[#AD841D]" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => {
                    setSelectedDate(e.target.value);
                    setSelectedSlot(null);
                  }}
                  className="bg-transparent border-b border-[#C59B27] font-semibold text-[#2D1914] text-xs outline-none cursor-pointer"
                />
              </div>
            </div>

            {/* Pílulas de Dias da Semana Próximos */}
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
              {upcomingDays.map((day) => {
                const isSelected = selectedDate === day.dateStr;
                return (
                  <button
                    key={day.dateStr}
                    type="button"
                    onClick={() => {
                      setSelectedDate(day.dateStr);
                      setSelectedSlot(null);
                    }}
                    className={`shrink-0 px-3.5 py-2.5 rounded-2xl border text-center transition-all ${
                      isSelected
                        ? "bg-[#2D1914] text-white border-[#2D1914] shadow-md ring-2 ring-[#C59B27]/40"
                        : "bg-white text-[#44271F] border-[#E7DCCE] hover:bg-[#FAF7F2] hover:border-[#AD841D]"
                    }`}
                  >
                    <span className="block text-[10px] uppercase font-bold tracking-wider opacity-80">
                      {day.isToday ? "Hoje" : day.isTomorrow ? "Amanhã" : day.weekDay}
                    </span>
                    <span className="block text-base font-extrabold leading-tight">
                      {day.dayNum}
                    </span>
                    <span className="block text-[9px] font-medium opacity-75">
                      {day.month}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Horários Disponíveis Calculados Dinamicamente pelo Motor */}
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
              <div>
                <label className="text-xs font-bold text-[#2D1914] flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-[#C59B27]" />
                  <span>Horários Disponíveis para este Procedimento:</span>
                </label>
                <span className="text-[11px] text-stone-500 block">
                  {allSlots.length} horários compatíveis em {selectedDate}
                  {encaixesCount > 0 && ` • ${encaixesCount} via Encaixe Otimizado ⚡`}
                </span>
              </div>

              {/* Filtros de Horário */}
              <div className="flex items-center gap-1 bg-[#FAF7F2] p-1 rounded-xl border border-[#E7DCCE] text-[11px]">
                <button
                  type="button"
                  onClick={() => setSlotFilter("all")}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                    slotFilter === "all"
                      ? "bg-white text-[#2D1914] shadow-2xs font-bold"
                      : "text-stone-600 hover:text-stone-900"
                  }`}
                >
                  Todos ({allSlots.length})
                </button>
                {encaixesCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setSlotFilter("encaixes")}
                    className={`px-2.5 py-1 rounded-lg font-medium transition-all flex items-center gap-1 ${
                      slotFilter === "encaixes"
                        ? "bg-amber-100 text-amber-900 shadow-2xs font-bold border border-amber-300"
                        : "text-amber-800 hover:bg-amber-50"
                    }`}
                  >
                    <Zap className="w-3 h-3 text-amber-600" />
                    <span>Encaixes ({encaixesCount})</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setSlotFilter("manha")}
                  className={`px-2 py-1 rounded-lg font-medium transition-all flex items-center gap-0.5 ${
                    slotFilter === "manha"
                      ? "bg-white text-[#2D1914] shadow-2xs font-bold"
                      : "text-stone-600 hover:text-stone-900"
                  }`}
                >
                  <Sun className="w-3 h-3 text-amber-500" />
                  <span>Manhã</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSlotFilter("tarde")}
                  className={`px-2 py-1 rounded-lg font-medium transition-all flex items-center gap-0.5 ${
                    slotFilter === "tarde"
                      ? "bg-white text-[#2D1914] shadow-2xs font-bold"
                      : "text-stone-600 hover:text-stone-900"
                  }`}
                >
                  <Moon className="w-3 h-3 text-indigo-500" />
                  <span>Tarde</span>
                </button>
              </div>
            </div>

            {filteredSlots.length === 0 ? (
              <div className="p-8 rounded-2xl bg-[#FAF7F2] text-center border border-[#E7DCCE] space-y-2">
                <AlertCircle className="w-6 h-6 text-[#C59B27] mx-auto" />
                <p className="text-xs font-semibold text-[#2D1914]">
                  Nenhum horário disponível para esta data com os filtros selecionados.
                </p>
                <p className="text-[11px] text-stone-500">
                  Experimente selecionar outro dia na barra acima ou remover os filtros de período.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 max-h-64 overflow-y-auto p-1 scrollbar-thin">
                {filteredSlots.map((slot, idx) => {
                  const isSelected = selectedSlot?.time === slot.time;

                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setSelectedSlot(slot)}
                      className={`p-3 rounded-2xl text-xs font-medium border text-center transition-all flex flex-col items-center justify-center relative ${
                        isSelected
                          ? "border-[#C59B27] bg-[#FDF9F0] text-[#2D1914] ring-2 ring-[#C59B27]/40 shadow-sm"
                          : slot.isEncaixe
                          ? "border-amber-300 bg-amber-50/60 text-[#2D1914] hover:bg-amber-50 hover:border-amber-400"
                          : "border-[#E7DCCE] bg-white text-[#44271F] hover:border-[#AD841D]/50 hover:bg-[#FAF7F2]"
                      }`}
                    >
                      <span className="font-extrabold text-sm sm:text-base text-[#2D1914]">
                        {slot.time}
                      </span>
                      <span className="text-[10px] text-stone-500">
                        término às {slot.endTime}
                      </span>

                      {/* Selo de Encaixe Otimizado durante Pausa Química */}
                      {slot.isEncaixe && (
                        <span className="mt-1.5 px-2 py-0.5 rounded-full text-[9px] bg-gradient-to-r from-amber-200 to-amber-300 text-amber-950 font-extrabold flex items-center gap-1 border border-amber-400 shadow-2xs">
                          <Zap className="w-2.5 h-2.5 text-amber-800 fill-amber-700" />
                          <span>Encaixe Otimizado</span>
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Destaque Explicativo do Horário Selecionado */}
          {selectedSlot && (
            <div className="p-4 rounded-2xl bg-gradient-to-br from-[#FAF7F2] to-[#F5ECE1] border border-[#E7DCCE] text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[#2D1914] flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Horário Selecionado: {selectedSlot.time} às {selectedSlot.endTime}
                </span>
                <span className="text-[11px] font-semibold text-[#AD841D]">
                  {selectedDate}
                </span>
              </div>

              {selectedSlot.isEncaixe && (
                <div className="p-2.5 rounded-xl bg-amber-100/80 border border-amber-300 text-[11px] text-amber-950 flex items-start gap-2">
                  <Zap className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block">
                      Encaixe Inteligente em Janela de Pausa Química:
                    </span>
                    <span>
                      {selectedSlot.encaixeDetails ||
                        "A primeira etapa deste procedimento inicia perfeitamente durante a pausa química de outro atendimento, sem nenhuma espera para você!"}
                    </span>
                  </div>
                </div>
              )}

              {/* Visualizador das Etapas Projetadas neste Horário */}
              <div className="pt-2 border-t border-[#E7DCCE]/60">
                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 block mb-1.5">
                  Cronograma Previsto na Cadeira:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {selectedSlot.stepBlocks.map((st, i) => (
                    <div
                      key={i}
                      className="p-2 rounded-xl bg-white border border-[#E7DCCE] text-[11px]"
                    >
                      <span className="font-bold text-[#2D1914] block">
                        {st.startTime} - {st.endTime}
                      </span>
                      <span className="text-stone-600 block truncate">
                        {st.stepTitle}
                      </span>
                      <span
                        className={`text-[9px] font-semibold px-1 rounded inline-block mt-0.5 ${
                          st.type === "active"
                            ? "bg-stone-100 text-stone-700"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {st.type === "active" ? "Atendimento Direto" : "Pausa Química"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Autenticação & Identificação da Cliente (Telefone + Senha) */}
          <div className="border-t border-[#E7DCCE] pt-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#AD841D] block">
                  Identificação Segura da Cliente
                </span>
                <h3 className="text-sm font-bold text-[#2D1914]">
                  {activeClient
                    ? "Confirmar com sua Conta"
                    : authMode === "login"
                    ? "Já é Cliente? Entre com seu WhatsApp e Senha"
                    : "Primeiro Agendamento? Cadastre seu Nome, WhatsApp e crie sua Senha"}
                </h3>
              </div>

              {!activeClient && (
                <div className="flex bg-[#FAF7F2] p-1 rounded-xl border border-[#E7DCCE] text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode("register");
                      setAuthError("");
                    }}
                    className={`px-3 py-1 rounded-lg font-medium transition-all ${
                      authMode === "register"
                        ? "bg-white text-[#2D1914] font-bold shadow-2xs"
                        : "text-stone-600"
                    }`}
                  >
                    Novo Cadastro
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode("login");
                      setAuthError("");
                    }}
                    className={`px-3 py-1 rounded-lg font-medium transition-all ${
                      authMode === "login"
                        ? "bg-white text-[#2D1914] font-bold shadow-2xs"
                        : "text-stone-600"
                    }`}
                  >
                    Já sou Cliente
                  </button>
                </div>
              )}
            </div>

            {authError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                <span>{authError}</span>
              </div>
            )}

            {/* Caso já esteja logada */}
            {activeClient ? (
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-sm">
                    {activeClient.name.charAt(0)}
                  </div>
                  <div>
                    <span className="text-xs font-bold text-emerald-950 block">
                      Conectada como {activeClient.name}
                    </span>
                    <span className="text-[11px] text-emerald-800">
                      WhatsApp: {activeClient.phone}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleSwitchAccount}
                  className="text-xs font-semibold text-emerald-800 hover:text-emerald-950 underline px-2 py-1"
                >
                  Trocar Conta
                </button>
              </div>
            ) : (
              /* Formulário de Login ou Cadastro */
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {authMode === "register" && (
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-[#2D1914] mb-1">
                      Seu Nome Completo *
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
                      <input
                        type="text"
                        required
                        value={clientName}
                        onChange={(e) => setClientName(e.target.value)}
                        placeholder="Ex: Beatriz Lima"
                        className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-[#E7DCCE] text-xs focus:border-[#C59B27] outline-none"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-[#2D1914] mb-1">
                    WhatsApp com DDD *
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
                    <input
                      type="tel"
                      required
                      value={clientPhone}
                      onChange={(e) => setClientPhone(e.target.value)}
                      placeholder="Ex: (11) 98765-4321"
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-[#E7DCCE] text-xs focus:border-[#C59B27] outline-none"
                    />
                  </div>
                  <span className="text-[10px] text-stone-500 mt-0.5 block">
                    Usado para seu login e lembretes da agenda.
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#2D1914] mb-1">
                    {authMode === "register" ? "Crie sua Senha de Acesso *" : "Sua Senha *"}
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={clientPassword}
                      onChange={(e) => setClientPassword(e.target.value)}
                      placeholder={authMode === "register" ? "Mínimo 3 dígitos/letras" : "Sua senha"}
                      className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-[#E7DCCE] text-xs focus:border-[#C59B27] outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 text-stone-400 hover:text-stone-700"
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  <span className="text-[10px] text-stone-500 mt-0.5 block">
                    Permite acompanhar propostas e histórico no portal.
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Ações Finais */}
          <div className="flex items-center justify-between pt-4 border-t border-[#E7DCCE]/60">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2.5 text-xs font-semibold text-[#5E372C] hover:bg-[#F3ECE1] rounded-xl transition-colors"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={!selectedSlot || isAuthenticating}
              className="px-7 py-3 rounded-xl text-xs font-bold text-white gold-gradient shadow-md hover:opacity-95 flex items-center space-x-2 transition-all disabled:opacity-50"
            >
              {isAuthenticating ? (
                <span>Processando...</span>
              ) : (
                <>
                  <span>Confirmar Agendamento</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
