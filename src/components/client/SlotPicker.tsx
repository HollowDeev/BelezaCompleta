"use client";

import { useState, useEffect, useMemo } from "react";
import { ServiceItem } from "@/types/service";
import { Appointment } from "@/types/appointment";
import { SalonClient } from "@/types/client";
import { AvailableDay, PreReservation, PreferredPeriod } from "@/types/availability";
import {
  calculateAvailableSlots,
  calculateDaySlotGrid,
  AvailableSlot,
  DaySlotItem,
} from "@/lib/scheduling/engine";
import { SalonStore } from "@/lib/storage/localStore";
import { SupabaseDataService } from "@/lib/supabase/api";
import { formatBRL, parseHHmmToMinutes } from "@/lib/utils";
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
  Send,
  Star,
  Info,
} from "lucide-react";
import confetti from "canvas-confetti";

interface SlotPickerProps {
  service: ServiceItem;
  existingAppointments: Appointment[];
  availableDays?: AvailableDay[];
  onConfirmBooking: (appointment: Appointment) => void;
  onCancel: () => void;
  onRequestPreReservation?: (preReservation: PreReservation) => void;
}

// Gera os próximos 21 dias para o seletor visual
function getUpcomingDays(count = 21) {
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
  availableDays: initialAvailableDays,
  onConfirmBooking,
  onCancel,
  onRequestPreReservation,
}: SlotPickerProps) {
  const [upcomingDays, setUpcomingDays] = useState<{
    dateStr: string;
    dayNum: number;
    weekDay: string;
    month: string;
    isToday: boolean;
    isTomorrow: boolean;
  }[]>([]);
  const [selectedDate, setSelectedDate] = useState("");

  useEffect(() => {
    const days = getUpcomingDays(21);
    setUpcomingDays(days);
    setSelectedDate(days[0]?.dateStr || "");
  }, []);
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null);
  const [slotFilter, setSlotFilter] = useState<"all" | "encaixes" | "manha" | "tarde">("all");

  // Dias com agenda aberta pela profissional
  const [daysList, setDaysList] = useState<AvailableDay[]>(initialAvailableDays || []);
  const [isLoadingDays, setIsLoadingDays] = useState(!initialAvailableDays);

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

  // Estado de Pré-Reserva
  const [preReservationPeriod, setPreReservationPeriod] = useState<PreferredPeriod>("qualquer");
  const [preReservationNotes, setPreReservationNotes] = useState("");
  const [isSubmittingPreReservation, setIsSubmittingPreReservation] = useState(false);
  const [preReservationSuccess, setPreReservationSuccess] = useState(false);
  const [createdPreReservation, setCreatedPreReservation] = useState<PreReservation | null>(null);

  // Carrega cliente ativo se já houver sessão
  useEffect(() => {
    const existing = SalonStore.getActiveClient();
    if (existing) {
      setActiveClient(existing);
      setClientName(existing.name);
      setClientPhone(existing.phone);
    }
  }, []);

  // Carrega os dias disponíveis da profissional
  useEffect(() => {
    if (initialAvailableDays && initialAvailableDays.length > 0) {
      setDaysList(initialAvailableDays);
      setIsLoadingDays(false);
      return;
    }

    const local = SalonStore.getAvailableDays(service.professionalId || "user-gleicy-ronha");
    if (local && local.length > 0) {
      setDaysList(local);
    }

    const todayStr = new Date().toISOString().split("T")[0];
    const futureDate = new Date(Date.now() + 60 * 86400000).toISOString().split("T")[0];

    SupabaseDataService.getAvailableDays(
      service.professionalId || "user-gleicy-ronha",
      todayStr,
      futureDate
    ).then((remote) => {
      if (remote && remote.length > 0) {
        setDaysList(remote);
      }
      setIsLoadingDays(false);
    }).catch(() => {
      setIsLoadingDays(false);
    });
  }, [initialAvailableDays, service.professionalId]);

  // Mapeamento de disponibilidade para as pílulas de dias (Aberto c/ vagas, Esgotado ou Fechado)
  const dayAvailabilityMap = useMemo(() => {
    const map: Record<string, { isOpen: boolean; hasSlots: boolean; availableCount: number }> = {};
    upcomingDays.forEach((day) => {
      const dConfig = daysList.find((d) => d.date === day.dateStr && d.isOpen);
      if (!dConfig) {
        map[day.dateStr] = { isOpen: false, hasSlots: false, availableCount: 0 };
      } else {
        const slots = calculateAvailableSlots(
          service,
          day.dateStr,
          service.professionalId || "user-gleicy-ronha",
          existingAppointments,
          {
            openMinutes: parseHHmmToMinutes(dConfig.startTime),
            closeMinutes: parseHHmmToMinutes(dConfig.endTime),
            breakStartMinutes: dConfig.breakStart ? parseHHmmToMinutes(dConfig.breakStart) : undefined,
            breakEndMinutes: dConfig.breakEnd ? parseHHmmToMinutes(dConfig.breakEnd) : undefined,
            slotIntervalMinutes: 30,
          }
        );
        map[day.dateStr] = {
          isOpen: true,
          hasSlots: slots.length > 0,
          availableCount: slots.length,
        };
      }
    });
    return map;
  }, [upcomingDays, daysList, service, existingAppointments]);

  // Configuração do dia selecionado
  const currentDayConfig = useMemo(() => {
    return daysList.find((d) => d.date === selectedDate && d.isOpen);
  }, [daysList, selectedDate]);

  const isDayOpen = Boolean(currentDayConfig);

  // Calcula a grade completa de horários do dia (incluindo ocupados por agendamento e pausas)
  const dayGridSlots = useMemo(() => {
    if (!isDayOpen) return [];

    const salonConfig = {
      openMinutes: currentDayConfig ? parseHHmmToMinutes(currentDayConfig.startTime) : 8 * 60 + 30,
      closeMinutes: currentDayConfig ? parseHHmmToMinutes(currentDayConfig.endTime) : 19 * 60,
      breakStartMinutes: currentDayConfig?.breakStart ? parseHHmmToMinutes(currentDayConfig.breakStart) : undefined,
      breakEndMinutes: currentDayConfig?.breakEnd ? parseHHmmToMinutes(currentDayConfig.breakEnd) : undefined,
      slotIntervalMinutes: 30,
    };

    return calculateDaySlotGrid(
      service,
      selectedDate,
      service.professionalId || "user-gleicy-ronha",
      existingAppointments,
      salonConfig
    );
  }, [service, selectedDate, existingAppointments, isDayOpen, currentDayConfig]);

  const availableSlots = useMemo(() => dayGridSlots.filter((s) => s.isAvailable), [dayGridSlots]);
  const availableSlotsCount = availableSlots.length;
  const encaixesCount = useMemo(() => dayGridSlots.filter((s) => s.isEncaixe).length, [dayGridSlots]);
  const occupiedCount = useMemo(() => dayGridSlots.filter((s) => s.status === "occupied").length, [dayGridSlots]);

  // Filtra slots por período ou categoria
  const filteredSlots = useMemo(() => {
    return dayGridSlots.filter((slot) => {
      const hour = parseInt(slot.time.split(":")[0], 10);
      if (slotFilter === "encaixes") return slot.isEncaixe;
      if (slotFilter === "manha") return hour < 12;
      if (slotFilter === "tarde") return hour >= 12;
      return true;
    });
  }, [dayGridSlots, slotFilter]);

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

        if (!clientName.trim()) {
          setAuthError("Por favor, informe seu nome completo.");
          setIsAuthenticating(false);
          return;
        }

        // Criar ou localizar cliente de forma transparente
        const newClient: SalonClient = {
          id: `cli-${Date.now()}`,
          name: clientName.trim(),
          phone: clientPhone.trim(),
          password: clientPassword?.trim() || "123456",
          createdAt: new Date().toISOString(),
          lastVisitAt: `${selectedDate}T${selectedSlot.time}:00Z`,
          lastServiceTitle: service.title,
        };

        const savedClient = await SupabaseDataService.saveClient(newClient);
        SalonStore.setActiveClient(savedClient);
        clientToUse = savedClient;
        setActiveClient(savedClient);
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

  // Submissão de Pré-Reserva para Datas Fora da Janela ou Sem Vagas
  const handleRequestPreReservation = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");

    let clientToUse: SalonClient | null = activeClient;
    setIsSubmittingPreReservation(true);

    try {
      if (!clientToUse) {
        if (!clientPhone.trim()) {
          setAuthError("Informe seu número de WhatsApp para receber a confirmação.");
          setIsSubmittingPreReservation(false);
          return;
        }
        if (!clientName.trim()) {
          setAuthError("Por favor, informe seu nome completo.");
          setIsSubmittingPreReservation(false);
          return;
        }

        const tempClient: SalonClient = {
          id: `cli-${Date.now()}`,
          name: clientName.trim(),
          phone: clientPhone.trim(),
          password: clientPassword || "123",
          createdAt: new Date().toISOString(),
          lastServiceTitle: service.title,
        };
        const saved = await SupabaseDataService.saveClient(tempClient);
        SalonStore.setActiveClient(saved);
        clientToUse = saved;
        setActiveClient(saved);
      }

      const preReservationPayload = {
        orgId: service.orgId || "org-gleicy-ronha",
        professionalId: service.professionalId || "user-gleicy-ronha",
        serviceId: service.id,
        serviceName: service.title,
        clientName: clientToUse?.name || clientName.trim(),
        clientPhone: clientToUse?.phone || clientPhone.trim(),
        clientEmail: clientToUse?.email,
        requestedDate: selectedDate,
        preferredPeriod: preReservationPeriod,
        reason: preReservationNotes.trim() || undefined,
        status: "pending" as const,
      };

      const created = await SupabaseDataService.createPreReservation(preReservationPayload);
      if (created) {
        SalonStore.createPreReservation(created);
        setCreatedPreReservation(created);
        onRequestPreReservation?.(created);
      }

      confetti({
        particleCount: 90,
        spread: 65,
        colors: ["#DBAE3B", "#C59B27", "#FAF7F2", "#8B6914"],
        origin: { y: 0.6 },
      });

      setPreReservationSuccess(true);
    } catch (err: any) {
      console.error("Erro ao solicitar pré-reserva:", err);
      setAuthError(err.message || "Não foi possível registrar a pré-reserva. Tente novamente.");
    } finally {
      setIsSubmittingPreReservation(false);
    }
  };

  if (preReservationSuccess) {
    return (
      <div className="max-w-md mx-auto my-8 p-6 sm:p-8 bg-white rounded-3xl shadow-xl border border-[#C59B27]/40 text-center animate-fade-in">
        <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-amber-100 to-amber-200 text-[#C59B27] flex items-center justify-center mb-4 border border-amber-300">
          <Sparkles className="w-8 h-8" />
        </div>
        <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#AD841D]">
          Solicitação de Pré-Reserva Enviada
        </span>
        <h2 className="font-editorial text-2xl font-bold text-[#2D1914] mt-1 mb-2">
          Recebido com Sucesso, {activeClient?.name || clientName}!
        </h2>
        <p className="text-xs text-[#5E372C] leading-relaxed mb-6">
          Sua intenção de atendimento para <strong>{service.title}</strong> no dia <strong>{selectedDate}</strong> ({preReservationPeriod === 'qualquer' ? 'qualquer horário' : `período da ${preReservationPeriod}`}) foi encaminhada com prioridade para a Gleicy.
        </p>

        <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#E7DCCE] text-left text-xs space-y-2 mb-6">
          <div className="flex items-center justify-between">
            <span className="text-stone-500">Status:</span>
            <span className="font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full text-[10px]">
              Aguardando Avaliação da Agenda
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-stone-500">Data Solicitada:</span>
            <span className="font-bold text-[#2D1914]">{selectedDate}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-stone-500">WhatsApp de Contato:</span>
            <span className="font-semibold text-[#2D1914]">{activeClient?.phone || clientPhone}</span>
          </div>
          {preReservationNotes && (
            <div className="pt-2 border-t border-[#E7DCCE]/60 text-[11px] text-stone-600">
              <span className="font-semibold text-stone-700 block">Sua Observação:</span>
              <span>"{preReservationNotes}"</span>
            </div>
          )}
        </div>

        <p className="text-[11px] text-stone-500 mb-6">
          Assim que a Gleicy avaliar a possibilidade de abertura ou encaixe, você receberá uma mensagem direta pelo WhatsApp!
        </p>

        <button
          onClick={onCancel}
          className="w-full py-3 px-6 rounded-xl text-white gold-gradient font-bold text-xs shadow-md hover:opacity-95 transition-all"
        >
          Voltar ao Catálogo
        </button>
      </div>
    );
  }

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
    <div className="w-full">
      <div className="bg-white rounded-2xl sm:rounded-3xl p-3.5 sm:p-8 border border-[#E7DCCE]">
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
        <div className="mb-6 p-3.5 sm:p-4 rounded-2xl bg-[#FAF7F2] border border-[#E7DCCE]">
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#AD841D] block mb-2">
            Estrutura Técnica do Procedimento ({service.steps.reduce((acc, s) => acc + s.durationMin, 0)} min total):
          </span>
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            {service.steps.map((st, i) => (
              <div
                key={i}
                className={`flex items-center gap-1 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-xl text-[11px] sm:text-xs font-medium border ${
                  st.type === "active"
                    ? "bg-[#54352a] text-white border-[#38231c]"
                    : "bg-amber-100/90 text-amber-950 border-amber-300 font-semibold"
                }`}
              >
                {st.type === "active" ? (
                  <Clock className="w-3 h-3 text-[#E5C158] shrink-0" />
                ) : (
                  <Zap className="w-3 h-3 text-amber-600 shrink-0" />
                )}
                <span>
                  {i + 1}. {st.title} ({st.durationMin}m)
                </span>
                {st.type === "pause" && (
                  <span className="text-[8.5px] bg-amber-200 text-amber-900 px-1 py-0.2 rounded font-bold shrink-0">
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
            <div className="flex gap-1.5 sm:gap-2 overflow-x-auto pb-2 no-scrollbar sm:scrollbar-thin">
              {upcomingDays.map((day) => {
                const isSelected = selectedDate === day.dateStr;
                const statusInfo = dayAvailabilityMap[day.dateStr];
                const isOpen = statusInfo?.isOpen ?? false;
                const hasSlots = statusInfo?.hasSlots ?? false;
                const availableCount = statusInfo?.availableCount ?? 0;

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
                        : isOpen && hasSlots
                        ? "bg-[#FAF7F2] text-[#2D1914] border-[#C59B27]/40 hover:bg-[#F3ECE1] hover:border-[#AD841D]"
                        : isOpen && !hasSlots
                        ? "bg-rose-50/40 text-stone-700 border-rose-200 hover:bg-rose-50"
                        : "bg-stone-50 text-stone-500 border-stone-200 hover:bg-amber-50/50 hover:border-amber-300"
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
                    <span
                      className={`inline-block text-[8px] font-bold mt-1 px-1.5 py-0.5 rounded-full ${
                        !isOpen
                          ? "text-amber-800 bg-amber-100/90 border border-amber-200/60"
                          : hasSlots
                          ? "text-emerald-800 bg-emerald-100 border border-emerald-200 font-bold"
                          : "text-rose-800 bg-rose-100 border border-rose-200 font-bold"
                      }`}
                    >
                      {!isOpen
                        ? "Agenda Fechada"
                        : hasSlots
                        ? `${availableCount} ${availableCount === 1 ? "Vaga" : "Vagas"}`
                        : "Esgotado"}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Horários Disponíveis ou Card de Encaixe Especial */}
          {!isDayOpen ? (
            /* CARD DE SOLICITAÇÃO DE ENCAIXE ESPECIAL (DATA FECHADA) */
            <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-[#FDF9F0] via-white to-[#FAF4E8] border border-[#C59B27]/40 shadow-sm space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#DBAE3B] to-[#C59B27] text-white flex items-center justify-center shrink-0 shadow-sm">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-100/80 border border-amber-200 text-amber-900 text-[10px] font-extrabold uppercase tracking-wider mb-1">
                    <Calendar className="w-3 h-3 text-[#AD841D]" />
                    <span>Agenda Fechada para {selectedDate}</span>
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-[#2D1914]">
                    Deseja solicitar um Encaixe Especial para este dia?
                  </h3>
                  <p className="text-xs text-[#5E372C] mt-1 leading-relaxed">
                    A agenda oficial da Gleicy Ronha não possui horários regulares abertos para esta data (dia de folga ou janela ainda fechada).
                  </p>
                </div>
              </div>

              {/* Box explicativo: Como Funciona o Encaixe Especial */}
              <div className="p-3.5 sm:p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 text-xs text-[#44271F] space-y-1.5">
                <span className="font-bold text-[#AD841D] flex items-center gap-1.5 text-xs">
                  <Info className="w-3.5 h-3.5 text-[#C59B27]" />
                  Como funciona a solicitação de Encaixe Especial?
                </span>
                <ul className="text-[11px] text-stone-600 space-y-1 list-disc list-inside">
                  <li>Você escolhe o período de sua preferência (manhã, tarde ou qualquer horário).</li>
                  <li>Seu pedido entra com prioridade na fila de avaliação da Gleicy.</li>
                  <li>A Gleicy analisa a viabilidade técnica e entra em contato com você diretamente pelo WhatsApp para confirmar!</li>
                </ul>
              </div>

              {/* Período de Preferência */}
              <div>
                <label className="block text-xs font-bold text-[#2D1914] mb-2">
                  Qual período você prefere para o atendimento?
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-semibold">
                  {(
                    [
                      { id: "qualquer", label: "Qualquer Horário", icon: Sparkles },
                      { id: "manha", label: "Manhã (09h-12h)", icon: Sun },
                      { id: "tarde", label: "Tarde (13h-18h)", icon: Moon },
                      { id: "noite", label: "Final do Dia", icon: Star },
                    ] as const
                  ).map((p) => {
                    const isSelected = preReservationPeriod === p.id;
                    const IconComp = p.icon;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setPreReservationPeriod(p.id)}
                        className={`p-2.5 rounded-xl border text-center transition-all flex items-center justify-center gap-1.5 ${
                          isSelected
                            ? "bg-[#2D1914] text-white border-[#2D1914] shadow-xs"
                            : "bg-white text-stone-700 border-[#E7DCCE] hover:bg-[#FAF7F2]"
                        }`}
                      >
                        <IconComp className={`w-3.5 h-3.5 ${isSelected ? "text-amber-400" : "text-[#C59B27]"}`} />
                        <span>{p.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Observação / Motivo */}
              <div>
                <label className="block text-xs font-semibold text-[#2D1914] mb-1">
                  Motivo ou Horário Específico (Opcional):
                </label>
                <input
                  type="text"
                  value={preReservationNotes}
                  onChange={(e) => setPreReservationNotes(e.target.value)}
                  placeholder="Ex: Tenho um casamento às 17h / Preciso antes das 14h"
                  className="w-full p-2.5 rounded-xl border border-[#E7DCCE] bg-white text-xs text-[#2D1914] outline-none focus:border-[#C59B27]"
                />
              </div>

              {/* Identificação caso a cliente não esteja logada */}
              {!activeClient && (
                <div className="pt-3 border-t border-[#E7DCCE]/60 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#2D1914] mb-1">
                      Seu Nome Completo *
                    </label>
                    <input
                      type="text"
                      required
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      placeholder="Ex: Isa Franca"
                      className="w-full p-2.5 rounded-xl border border-[#E7DCCE] bg-white text-xs text-[#2D1914] outline-none focus:border-[#C59B27]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#2D1914] mb-1">
                      WhatsApp com DDD (para contato da Gleicy) *
                    </label>
                    <input
                      type="tel"
                      required
                      value={clientPhone}
                      onChange={(e) => setClientPhone(e.target.value)}
                      placeholder="Ex: (11) 98765-4321"
                      className="w-full p-2.5 rounded-xl border border-[#E7DCCE] bg-white text-xs text-[#2D1914] outline-none focus:border-[#C59B27]"
                    />
                  </div>
                </div>
              )}

              {authError && (
                <div className="p-2.5 rounded-xl bg-red-50 text-red-700 text-xs flex items-center gap-1.5 border border-red-200">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{authError}</span>
                </div>
              )}

              {/* Botão de Envio do Encaixe Especial */}
              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={onCancel}
                  className="px-4 py-2.5 text-xs font-semibold text-[#5E372C] hover:bg-[#F3ECE1] rounded-xl transition-colors"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  onClick={handleRequestPreReservation}
                  disabled={isSubmittingPreReservation}
                  className="px-6 py-2.5 rounded-xl text-xs font-bold text-white gold-gradient shadow-md hover:opacity-95 flex items-center space-x-2 transition-all disabled:opacity-50"
                >
                  {isSubmittingPreReservation ? (
                    <span>Enviando solicitação...</span>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Enviar Solicitação de Encaixe Especial</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            /* SELETOR DE HORÁRIOS QUANDO O DIA ESTÁ ABERTO */
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                <div>
                  <label className="text-xs font-bold text-[#2D1914] flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-[#C59B27]" />
                    <span>Horários da Agenda em {selectedDate}:</span>
                  </label>
                  <span className="text-[11px] text-stone-500 block">
                    {availableSlotsCount} {availableSlotsCount === 1 ? "vaga livre" : "vagas livres"}
                    {encaixesCount > 0 && ` • ${encaixesCount} via Encaixe Otimizado ⚡`}
                    {occupiedCount > 0 && ` • ${occupiedCount} ocupadas`}
                  </span>
                </div>

                {/* Filtros de Horário */}
                <div className="flex items-center gap-1 bg-[#FAF7F2] p-1 rounded-xl border border-[#E7DCCE] text-[11px] overflow-x-auto no-scrollbar max-w-full shrink-0">
                  <button
                    type="button"
                    onClick={() => setSlotFilter("all")}
                    className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-all ${
                      slotFilter === "all"
                        ? "bg-white text-[#2D1914] shadow-2xs font-bold"
                        : "text-stone-600 hover:text-stone-900"
                    }`}
                  >
                    Todos ({dayGridSlots.length})
                  </button>
                  {encaixesCount > 0 && (
                    <button
                      type="button"
                      onClick={() => setSlotFilter("encaixes")}
                      className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-all flex items-center gap-1 ${
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
                    className={`px-2 py-1 rounded-lg font-medium whitespace-nowrap transition-all flex items-center gap-0.5 ${
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
                    className={`px-2 py-1 rounded-lg font-medium whitespace-nowrap transition-all flex items-center gap-0.5 ${
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

              {/* Legenda visual dos horários */}
              <div className="flex flex-wrap items-center gap-3 text-[10px] text-stone-500 mb-3 px-1">
                <div className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                  <span>Horário Livre</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />
                  <span>Encaixe (Início de Pausa Química)</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-stone-300 inline-block" />
                  <span>Ocupado / Indisponível</span>
                </div>
              </div>

              {/* Grade de Horários (Disponíveis e Ocupados) */}
              <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 gap-2 sm:gap-2.5 max-h-64 overflow-y-auto p-1 scrollbar-thin">
                {filteredSlots.map((slot, idx) => {
                  const isSelected = selectedSlot?.time === slot.time;
                  const isOccupied = slot.status === "occupied";
                  const isBreak = slot.status === "break";
                  const isPast = slot.status === "past";
                  const isDisabled = !slot.isAvailable;

                  if (isDisabled) {
                    return (
                      <div
                        key={idx}
                        title={slot.conflictReason || "Horário indisponível devido a outro agendamento"}
                        className="p-3 rounded-2xl text-xs border text-center flex flex-col items-center justify-center relative bg-stone-100/70 border-stone-200 text-stone-400 cursor-not-allowed select-none opacity-60"
                      >
                        <span className="font-bold text-sm text-stone-400 line-through flex items-center justify-center gap-1">
                          {isBreak ? (
                            <Clock className="w-3 h-3 text-stone-400" />
                          ) : (
                            <Lock className="w-3 h-3 text-stone-400" />
                          )}
                          {slot.time}
                        </span>
                        <span className="text-[10px] text-stone-400 mt-0.5">
                          {isBreak ? "Intervalo Almoço" : isPast ? "Horário Passado" : "Ocupado"}
                        </span>
                        <span className="mt-1 px-1.5 py-0.5 rounded text-[8px] bg-stone-200 text-stone-600 font-semibold">
                          Indisponível
                        </span>
                      </div>
                    );
                  }

                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() =>
                        setSelectedSlot({
                          time: slot.time,
                          endTime: slot.endTime,
                          isEncaixe: slot.isEncaixe,
                          encaixeWithAppointmentId: slot.encaixeWithAppointmentId,
                          encaixeDetails: slot.encaixeDetails,
                          stepBlocks: slot.stepBlocks!,
                        })
                      }
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
                      {slot.isEncaixe ? (
                        <span className="mt-1.5 px-2 py-0.5 rounded-full text-[9px] bg-gradient-to-r from-amber-200 to-amber-300 text-amber-950 font-extrabold flex items-center gap-1 border border-amber-400 shadow-2xs">
                          <Zap className="w-2.5 h-2.5 text-amber-800 fill-amber-700" />
                          <span>Encaixe (Pausa Química)</span>
                        </span>
                      ) : (
                        <span className="mt-1.5 px-2 py-0.5 rounded-full text-[9px] bg-emerald-50 text-emerald-800 font-semibold flex items-center gap-1 border border-emerald-200">
                          <Check className="w-2.5 h-2.5 text-emerald-600 stroke-[3]" />
                          <span>Livre</span>
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Se o dia estiver aberto mas com 0 vagas livres */}
              {availableSlotsCount === 0 && (
                <div className="mt-3 p-4 rounded-2xl bg-amber-50/80 border border-amber-200 text-center space-y-2 animate-fade-in">
                  <div className="flex items-center justify-center gap-1.5 text-amber-900 font-bold text-xs">
                    <AlertCircle className="w-4 h-4 text-amber-600" />
                    <span>Todos os horários oficiais deste dia já foram preenchidos</span>
                  </div>
                  <p className="text-[11px] text-[#5E372C] max-w-md mx-auto leading-relaxed">
                    Deseja registrar uma solicitação de lista de espera para esta data? Se surgir uma desistência ou novo encaixe na agenda, a Gleicy entrará em contato com você via WhatsApp!
                  </p>
                  <button
                    type="button"
                    onClick={handleRequestPreReservation}
                    disabled={isSubmittingPreReservation}
                    className="px-5 py-2 rounded-xl text-xs font-bold text-white gold-gradient shadow-xs hover:opacity-95 transition-all inline-flex items-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Solicitar Lista de Espera nesta Data</span>
                  </button>
                </div>
              )}
            </div>
          )}

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

          {/* Autenticação & Identificação da Cliente (apenas quando há slots abertos) */}
          {isDayOpen && availableSlots.length > 0 && (
            <>
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
                  /* Formulário Rápido sem Fricção */
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-xs font-semibold text-[#1D3D3C] mb-1">
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
                          className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-[#D8D0BD] text-xs focus:border-[#C7A03A] outline-none bg-white"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#1D3D3C] mb-1">
                        WhatsApp com DDD *
                      </label>
                      <div className="relative">
                        <Phone className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
                        <input
                          type="tel"
                          required
                          value={clientPhone}
                          onChange={(e) => setClientPhone(e.target.value)}
                          placeholder="Ex: (11) 99597-5725"
                          className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-[#D8D0BD] text-xs focus:border-[#C7A03A] outline-none bg-white"
                        />
                      </div>
                      <span className="text-[10px] text-stone-500 mt-0.5 block">
                        Receba a confirmação e lembretes diretamente no seu WhatsApp.
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
            </>
          )}
        </form>
      </div>
    </div>
  );
}
