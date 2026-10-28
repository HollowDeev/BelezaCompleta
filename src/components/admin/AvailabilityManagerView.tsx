"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { SupabaseDataService } from "@/lib/supabase/api";
import { AvailableDay, AvailabilityTemplate, DayAvailabilityConfig } from "@/types/availability";
import { Appointment } from "@/types/appointment";
import {
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  Clock,
  Coffee,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Sliders,
  Sparkles,
  Info,
  Calendar as CalendarIcon,
  Check,
  Plus,
  Trash2,
  Edit2,
  RefreshCw,
  Sun,
  Sunrise,
  Sunset,
  Scissors,
  HelpCircle,
} from "lucide-react";

interface AvailabilityManagerViewProps {
  orgId: string;
  professionalId: string;
  dataService?: typeof SupabaseDataService;
  appointments?: Appointment[];
  onOpenPreReservations?: () => void;
}

export function AvailabilityManagerView({
  orgId,
  professionalId,
  dataService = SupabaseDataService,
  appointments = [],
  onOpenPreReservations,
}: AvailabilityManagerViewProps) {
  // Navegação de Mês/Ano (inicializado em Outubro 2026, conforme padrão do projeto)
  const [currentYearMonth, setCurrentYearMonth] = useState({ year: 2026, month: 10 });
  const [availableDays, setAvailableDays] = useState<AvailableDay[]>([]);
  const [templates, setTemplates] = useState<AvailabilityTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "error" | "info" } | null>(null);

  // Seleção de Múltiplos Dias: conjunto de strings 'YYYY-MM-DD'
  const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set());

  // Estado do formulário de configuração dos horários para os dias selecionados
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("18:00");
  const [hasLunchBreak, setHasLunchBreak] = useState(true);
  const [breakStart, setBreakStart] = useState("12:30");
  const [breakEnd, setBreakEnd] = useState("13:30");
  const [maxClients, setMaxClients] = useState(8);
  const [customNotes, setCustomNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Estado do Popover / Ação Rápida de Dia Aberto
  const [activeDayMenu, setActiveDayMenu] = useState<{
    dateStr: string;
    dayObj: AvailableDay;
    x?: number;
    y?: number;
  } | null>(null);

  // Modal para salvar novo template
  const [isNewTemplateModalOpen, setIsNewTemplateModalOpen] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState("");

  const monthNames = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  // Disparar toast temporário
  const showToast = (text: string, type: "success" | "error" | "info" = "success") => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  // Carregar dados de disponibilidade do mês visível
  const loadMonthData = useCallback(async () => {
    setIsLoading(true);
    try {
      const padMonth = String(currentYearMonth.month).padStart(2, "0");
      const startDate = `${currentYearMonth.year}-${padMonth}-01`;
      const daysCount = new Date(currentYearMonth.year, currentYearMonth.month, 0).getDate();
      const endDate = `${currentYearMonth.year}-${padMonth}-${String(daysCount).padStart(2, "0")}`;

      const [days, tpls] = await Promise.all([
        dataService.getAvailableDays(professionalId, startDate, endDate),
        dataService.getAvailabilityTemplates(professionalId),
      ]);

      setAvailableDays(days);
      setTemplates(tpls);
    } catch (err) {
      console.error("Erro ao carregar dias disponíveis:", err);
      showToast("Não foi possível carregar a disponibilidade.", "error");
    } finally {
      setIsLoading(false);
    }
  }, [currentYearMonth, professionalId, dataService]);

  useEffect(() => {
    loadMonthData();
  }, [loadMonthData]);

  // Navegação de mês
  const handlePrevMonth = () => {
    if (currentYearMonth.month === 1) {
      setCurrentYearMonth({ year: currentYearMonth.year - 1, month: 12 });
    } else {
      setCurrentYearMonth({ ...currentYearMonth, month: currentYearMonth.month - 1 });
    }
    setSelectedDates(new Set());
    setActiveDayMenu(null);
  };

  const handleNextMonth = () => {
    if (currentYearMonth.month === 12) {
      setCurrentYearMonth({ year: currentYearMonth.year + 1, month: 1 });
    } else {
      setCurrentYearMonth({ ...currentYearMonth, month: currentYearMonth.month + 1 });
    }
    setSelectedDates(new Set());
    setActiveDayMenu(null);
  };

  const handleGoToday = () => {
    // Default para 2026 se estivermos no escopo do projeto
    const y = 2026;
    const m = 10;
    setCurrentYearMonth({ year: y, month: m });
    setSelectedDates(new Set());
    setActiveDayMenu(null);
  };

  // Cálculo da grade do calendário
  const daysInMonth = new Date(currentYearMonth.year, currentYearMonth.month, 0).getDate();
  const startDayOffset = new Date(currentYearMonth.year, currentYearMonth.month - 1, 1).getDay();

  // Mapa de dias abertos para acesso rápido O(1)
  const openDaysMap = useMemo(() => {
    const map = new Map<string, AvailableDay>();
    availableDays.forEach((d) => {
      if (d.isOpen) {
        map.set(d.date, d);
      }
    });
    return map;
  }, [availableDays]);

  // Contagem de agendamentos por data
  const appointmentsCountMap = useMemo(() => {
    const map = new Map<string, number>();
    appointments.forEach((a) => {
      if (a.status !== "cancelled") {
        map.set(a.date, (map.get(a.date) || 0) + 1);
      }
    });
    return map;
  }, [appointments]);

  // Estatísticas do Mês
  const monthStats = useMemo(() => {
    let totalOpen = 0;
    let totalBooked = 0;
    let totalCapacity = 0;

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${currentYearMonth.year}-${String(currentYearMonth.month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const dayObj = openDaysMap.get(dateStr);
      if (dayObj) {
        totalOpen++;
        const aptCount = appointmentsCountMap.get(dateStr) || 0;
        totalBooked += aptCount;
        totalCapacity += dayObj.maxClients || 8;
      }
    }

    const occupationRate = totalCapacity > 0 ? Math.round((totalBooked / totalCapacity) * 100) : 0;
    return { totalOpen, totalClosed: daysInMonth - totalOpen, totalBooked, occupationRate };
  }, [daysInMonth, currentYearMonth, openDaysMap, appointmentsCountMap]);

  // Toggle de seleção de data individual
  const toggleDateSelection = (dateStr: string) => {
    setActiveDayMenu(null);
    setSelectedDates((prev) => {
      const next = new Set(prev);
      if (next.has(dateStr)) {
        next.delete(dateStr);
      } else {
        next.add(dateStr);
      }
      return next;
    });
  };

  // Selecionar Terça a Sábado do mês (dias de maior operação da Gleicy)
  const selectTuesdayToSaturday = () => {
    const next = new Set<string>();
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentYearMonth.year, currentYearMonth.month - 1, day);
      const dayOfWeek = date.getDay(); // 0=Dom, 1=Seg, 2=Ter, 3=Qua, 4=Qui, 5=Sex, 6=Sab
      if (dayOfWeek >= 2 && dayOfWeek <= 6) {
        const dateStr = `${currentYearMonth.year}-${String(currentYearMonth.month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        next.add(dateStr);
      }
    }
    setSelectedDates(next);
    showToast(`${next.size} dias úteis (Ter-Sáb) selecionados para configuração.`);
  };

  // Selecionar todos os dias restantes do mês
  const selectAllMonth = () => {
    const next = new Set<string>();
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${currentYearMonth.year}-${String(currentYearMonth.month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      next.add(dateStr);
    }
    setSelectedDates(next);
    showToast(`Todos os ${daysInMonth} dias do mês selecionados.`);
  };

  // Limpar seleção
  const clearSelection = () => {
    setSelectedDates(new Set());
    setActiveDayMenu(null);
  };

  // Chips de Horário Rápido
  const applyQuickTime = (type: "manha" | "tarde" | "completo" | "estendido") => {
    switch (type) {
      case "manha":
        setStartTime("09:00");
        setEndTime("13:00");
        setHasLunchBreak(false);
        break;
      case "tarde":
        setStartTime("13:00");
        setEndTime("19:00");
        setHasLunchBreak(false);
        break;
      case "completo":
        setStartTime("09:00");
        setEndTime("19:00");
        setHasLunchBreak(true);
        setBreakStart("12:30");
        setBreakEnd("13:30");
        break;
      case "estendido":
        setStartTime("08:30");
        setEndTime("20:30");
        setHasLunchBreak(true);
        setBreakStart("12:00");
        setBreakEnd("13:00");
        break;
    }
  };

  // Salvar dias selecionados em lote
  const handleSaveBatch = async () => {
    if (selectedDates.size === 0) return;
    setIsSubmitting(true);
    try {
      const batchConfigs: (DayAvailabilityConfig & { professionalId: string; orgId: string })[] = Array.from(selectedDates).map(
        (date) => ({
          date,
          startTime,
          endTime,
          breakStart: hasLunchBreak ? breakStart : undefined,
          breakEnd: hasLunchBreak ? breakEnd : undefined,
          customNotes: customNotes.trim() || undefined,
          professionalId,
          orgId,
        })
      );

      const savedCount = await dataService.saveAvailableDaysBatch(batchConfigs);

      showToast(`✅ ${savedCount || selectedDates.size} dia(s) aberto(s) com sucesso na sua agenda!`, "success");
      setSelectedDates(new Set());
      await loadMonthData();
    } catch (err) {
      console.error("Erro ao salvar dias em lote:", err);
      showToast("Houve um erro ao abrir os dias selecionados.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Fechar dia individualmente
  const handleCloseSingleDay = async (dateStr: string) => {
    try {
      const success = await dataService.closeAvailableDay(professionalId, dateStr);
      if (success) {
        showToast(`Dia ${dateStr.split("-").reverse().join("/")} foi fechado.`, "info");
        setActiveDayMenu(null);
        await loadMonthData();
      } else {
        showToast("Não foi possível fechar o dia.", "error");
      }
    } catch (err) {
      console.error("Erro ao fechar dia:", err);
      showToast("Erro ao fechar dia selecionado.", "error");
    }
  };

  // Editar horário de um dia já aberto
  const handleEditSingleDay = (dayObj: AvailableDay) => {
    setSelectedDates(new Set([dayObj.date]));
    setStartTime(dayObj.startTime);
    setEndTime(dayObj.endTime);
    if (dayObj.breakStart && dayObj.breakEnd) {
      setHasLunchBreak(true);
      setBreakStart(dayObj.breakStart);
      setBreakEnd(dayObj.breakEnd);
    } else {
      setHasLunchBreak(false);
    }
    setMaxClients(dayObj.maxClients || 8);
    setCustomNotes(dayObj.customNotes || "");
    setActiveDayMenu(null);
  };

  // Aplicar Template salvo
  const handleApplyTemplate = (tpl: AvailabilityTemplate) => {
    if (selectedDates.size === 0) {
      const nextDates = new Set<string>();
      for (let day = 1; day <= daysInMonth; day++) {
        const d = new Date(currentYearMonth.year, currentYearMonth.month - 1, day);
        const dayOfWeek = d.getDay();
        const conf = tpl.daysConfig.find((c) => c.dayOfWeek === dayOfWeek);
        if (conf && conf.isEnabled) {
          const dateStr = `${currentYearMonth.year}-${String(currentYearMonth.month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          nextDates.add(dateStr);
        }
      }
      setSelectedDates(nextDates);
    }

    const firstEnabled = tpl.daysConfig.find((c) => c.isEnabled);
    if (firstEnabled) {
      setStartTime(firstEnabled.startTime);
      setEndTime(firstEnabled.endTime);
      if (firstEnabled.breakStart && firstEnabled.breakEnd) {
        setHasLunchBreak(true);
        setBreakStart(firstEnabled.breakStart);
        setBreakEnd(firstEnabled.breakEnd);
      } else {
        setHasLunchBreak(false);
      }
    }

    showToast(`Template "${tpl.name}" aplicado na configuração. Revise e clique em "Abrir Dias".`, "info");
  };

  // Salvar a configuração atual como novo Template
  const handleSaveAsTemplate = async () => {
    if (!newTemplateName.trim()) return;
    try {
      const daysConfig = [0, 1, 2, 3, 4, 5, 6].map((dow) => ({
        dayOfWeek: dow,
        startTime,
        endTime,
        breakStart: hasLunchBreak ? breakStart : undefined,
        breakEnd: hasLunchBreak ? breakEnd : undefined,
        isEnabled: dow >= 2 && dow <= 6, // Padrão Ter-Sáb habilitado
      }));

      await dataService.saveAvailabilityTemplate({
        orgId,
        professionalId,
        name: newTemplateName.trim(),
        daysConfig,
      });

      showToast(`Template "${newTemplateName}" salvo com sucesso!`, "success");
      setNewTemplateName("");
      setIsNewTemplateModalOpen(false);
      await loadMonthData();
    } catch (err) {
      console.error("Erro ao salvar template:", err);
      showToast("Não foi possível salvar o novo template.", "error");
    }
  };

  return (
    <div className="bg-[#1A0F0C] rounded-3xl p-5 sm:p-8 border border-[#5E372C]/50 shadow-2xl text-stone-100 space-y-8 relative overflow-hidden">
      {/* Toast de Notificação Inline */}
      {toastMessage && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-5 py-3.5 rounded-2xl shadow-2xl border flex items-center space-x-3 text-sm font-semibold transition-all duration-300 animate-slide-up ${
            toastMessage.type === "success"
              ? "bg-[#2D1914] text-amber-200 border-[#DBAE3B]/60 shadow-amber-950/40"
              : toastMessage.type === "error"
              ? "bg-red-950 text-red-200 border-red-600/80 shadow-red-950/50"
              : "bg-stone-900 text-stone-200 border-stone-700 shadow-black/60"
          }`}
        >
          {toastMessage.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 text-[#DBAE3B] shrink-0" />
          ) : toastMessage.type === "error" ? (
            <XCircle className="w-5 h-5 text-red-400 shrink-0" />
          ) : (
            <Info className="w-5 h-5 text-amber-400 shrink-0" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* ============================================================== */}
      {/* ZONA 1 — CABEÇALHO + CONTROLES DO MÊS + ESTATÍSTICAS + LEGENDA */}
      {/* ============================================================== */}
      <div className="space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-[#5E372C]/40">
          <div>
            <div className="flex items-center space-x-2 text-[11px] uppercase font-extrabold tracking-widest text-[#DBAE3B] mb-2">
              <CalendarCheck className="w-4 h-4 text-[#DBAE3B]" />
              <span>Gestão de Disponibilidade • Gleicy Ronha</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
              <span>Abertura de Agenda</span>
              <span className="text-xs px-3 py-1 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-600/60 font-semibold">
                {monthStats.totalOpen} dias abertos
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-stone-400 max-w-2xl mt-1.5 leading-relaxed">
              Defina os dias e turnos em que você atenderá clientes no Espaço da Beleza. As clientes só conseguirão agendar online nos dias que você liberar aqui.
            </p>
          </div>

          {/* Navegação entre Meses */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center bg-stone-900/90 rounded-2xl border border-stone-800 p-1">
              <button
                onClick={handlePrevMonth}
                className="p-2.5 rounded-xl hover:bg-stone-800 text-stone-300 hover:text-white transition-colors"
                title="Mês Anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-4 text-sm font-bold text-stone-100 min-w-[140px] text-center">
                {monthNames[currentYearMonth.month - 1]} {currentYearMonth.year}
              </span>
              <button
                onClick={handleNextMonth}
                className="p-2.5 rounded-xl hover:bg-stone-800 text-stone-300 hover:text-white transition-colors"
                title="Próximo Mês"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <button
              onClick={handleGoToday}
              className="px-3.5 py-2.5 rounded-2xl bg-stone-900 hover:bg-stone-800 border border-[#5E372C]/60 text-xs font-bold text-[#DBAE3B] transition-all hover:border-[#DBAE3B]/40 active:scale-95"
            >
              Hoje
            </button>

            <button
              onClick={loadMonthData}
              disabled={isLoading}
              className="p-2.5 rounded-2xl bg-stone-900 hover:bg-stone-800 border border-stone-800 text-stone-300 hover:text-white transition-all"
              title="Recarregar Disponibilidade"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin text-[#DBAE3B]" : ""}`} />
            </button>
          </div>
        </div>

        {/* Barra de Ações Rápidas de Seleção e Estatísticas */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-stone-950/60 p-4 rounded-2xl border border-stone-800/80">
          {/* Botões de Ação de Seleção Rápida */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-stone-400 mr-1 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-[#DBAE3B]" />
              <span>Seleção rápida:</span>
            </span>
            <button
              onClick={selectTuesdayToSaturday}
              className="px-3 py-1.5 rounded-xl bg-stone-800/90 hover:bg-stone-700/90 border border-stone-700 text-xs font-semibold text-stone-200 transition-all hover:border-stone-500"
            >
              📅 Terça a Sábado
            </button>
            <button
              onClick={selectAllMonth}
              className="px-3 py-1.5 rounded-xl bg-stone-800/90 hover:bg-stone-700/90 border border-stone-700 text-xs font-semibold text-stone-200 transition-all hover:border-stone-500"
            >
              🗓️ Todo o Mês
            </button>
            {selectedDates.size > 0 && (
              <button
                onClick={clearSelection}
                className="px-3 py-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 border border-red-900/60 text-xs font-semibold text-red-300 transition-all"
              >
                ✕ Limpar ({selectedDates.size})
              </button>
            )}
          </div>

          {/* Legenda de Cores */}
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <div className="flex items-center space-x-1.5">
              <span className="w-3.5 h-3.5 rounded-md bg-stone-800 border border-stone-700 inline-block" />
              <span className="text-stone-400">Fechado</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-3.5 h-3.5 rounded-md bg-emerald-950 border border-emerald-500 inline-block" />
              <span className="text-stone-300">Aberto</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-3.5 h-3.5 rounded-md bg-amber-950 border border-amber-500 inline-block" />
              <span className="text-stone-300">&gt;70% Ocupado</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-3.5 h-3.5 rounded-md bg-red-950 border border-red-500 inline-block" />
              <span className="text-stone-300">Lotado</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-3.5 h-3.5 rounded-md bg-[#2D1914] border-2 border-[#DBAE3B] inline-block ring-1 ring-[#DBAE3B]/40" />
              <span className="text-[#DBAE3B] font-semibold">Hoje / Selecionado</span>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* ZONA 2 — GRID CALENDÁRIO MENSAL INTERATIVO                     */}
      {/* ============================================================== */}
      <div className="space-y-3">
        {/* Dias da Semana (Dom a Sáb) */}
        <div className="grid grid-cols-7 gap-2 sm:gap-3 text-center text-xs font-bold text-[#DBAE3B] tracking-wider uppercase mb-1">
          <span className="p-2 rounded-xl bg-stone-900/40 text-stone-500">Dom</span>
          <span className="p-2 rounded-xl bg-stone-900/40">Seg</span>
          <span className="p-2 rounded-xl bg-stone-900/40">Ter</span>
          <span className="p-2 rounded-xl bg-stone-900/40">Qua</span>
          <span className="p-2 rounded-xl bg-stone-900/40">Qui</span>
          <span className="p-2 rounded-xl bg-stone-900/40">Sex</span>
          <span className="p-2 rounded-xl bg-stone-900/40 text-stone-400">Sáb</span>
        </div>

        {/* Grid de Dias */}
        <div className="grid grid-cols-7 gap-2 sm:gap-3">
          {/* Espaços Vazios para o Offset Inicial do Mês */}
          {[...Array(startDayOffset)].map((_, i) => (
            <div
              key={`empty-${i}`}
              className="h-28 sm:h-32 rounded-xl bg-stone-950/20 border border-stone-900/30 pointer-events-none"
            />
          ))}

          {/* Cards de Dias do Mês */}
          {[...Array(daysInMonth)].map((_, i) => {
            const dayNum = i + 1;
            const padDay = String(dayNum).padStart(2, "0");
            const padMonth = String(currentYearMonth.month).padStart(2, "0");
            const dateStr = `${currentYearMonth.year}-${padMonth}-${padDay}`;

            const isOpen = openDaysMap.has(dateStr);
            const dayObj = openDaysMap.get(dateStr);
            const isSelected = selectedDates.has(dateStr);

            // Verificação de data atual (Hoje)
            const isToday =
              dateStr ===
              `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}-${String(
                new Date().getDate()
              ).padStart(2, "0")}` || dateStr === "2026-10-28";

            // Ocupação do Dia
            const clientCount = appointmentsCountMap.get(dateStr) || 0;
            const maxClientsForDay = dayObj?.maxClients || 8;
            const occupationRatio = maxClientsForDay > 0 ? clientCount / maxClientsForDay : 0;
            const isFull = isOpen && (clientCount >= maxClientsForDay || occupationRatio >= 1);
            const isHighOccupation = isOpen && !isFull && occupationRatio >= 0.7;

            // Determinar estilo de fundo e borda baseado no estado
            let statusClasses = "bg-stone-800 border-stone-700 text-stone-400 hover:border-stone-500";

            if (isOpen) {
              if (isFull) {
                // Vermelho: Lotado
                statusClasses = "bg-red-950/80 border-red-600 text-red-200 hover:border-red-400";
              } else if (isHighOccupation) {
                // Âmbar: >70%
                statusClasses = "bg-amber-950/80 border-amber-600 text-amber-200 hover:border-amber-400";
              } else {
                // Verde: Aberto com horário
                statusClasses = "bg-emerald-950/80 border-emerald-500 text-emerald-200 hover:border-emerald-400";
              }
            }

            if (isSelected) {
              statusClasses = "bg-[#2D1914] border-[#DBAE3B] text-stone-100 ring-2 ring-[#DBAE3B] shadow-lg shadow-amber-950/60 scale-[1.02]";
            }

            if (isToday && !isSelected) {
              statusClasses += " ring-2 ring-[#DBAE3B]/70 border-[#DBAE3B]";
            }

            return (
              <div
                key={dateStr}
                onClick={() => toggleDateSelection(dateStr)}
                className={`relative h-28 sm:h-32 p-2.5 rounded-xl border text-left cursor-pointer transition-all duration-200 flex flex-col justify-between select-none group ${statusClasses}`}
              >
                {/* Topo do Card: Número do Dia + Indicador de Seleção / Menu */}
                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs font-black w-6 h-6 rounded-full flex items-center justify-center transition-transform ${
                      isSelected
                        ? "bg-[#DBAE3B] text-[#1A0F0C] font-black"
                        : isToday
                        ? "bg-[#DBAE3B]/30 text-[#DBAE3B] border border-[#DBAE3B]/60"
                        : "text-stone-300 group-hover:text-white"
                    }`}
                  >
                    {dayNum}
                  </span>

                  {/* Indicador de Seleção Ativa */}
                  {isSelected ? (
                    <span className="w-5 h-5 rounded-full bg-[#DBAE3B] text-[#1A0F0C] flex items-center justify-center text-[10px] font-black shadow-xs">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </span>
                  ) : isOpen ? (
                    // Menu rápido de Ação para Dia Aberto
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (activeDayMenu?.dateStr === dateStr) {
                          setActiveDayMenu(null);
                        } else {
                          setActiveDayMenu({ dateStr, dayObj: dayObj! });
                        }
                      }}
                      className="w-5 h-5 rounded-md hover:bg-stone-700/60 flex items-center justify-center text-stone-300 hover:text-white transition-colors"
                      title="Opções do dia"
                    >
                      <Sliders className="w-3 h-3 text-[#DBAE3B]" />
                    </button>
                  ) : null}
                </div>

                {/* Conteúdo Central: Horário e Status */}
                <div className="space-y-1">
                  {isOpen ? (
                    <>
                      <div className="text-[11px] font-bold tracking-tight text-white flex items-center gap-1 truncate">
                        <Clock className="w-3 h-3 text-[#DBAE3B] shrink-0" />
                        <span>
                          {dayObj?.startTime.slice(0, 5)} - {dayObj?.endTime.slice(0, 5)}
                        </span>
                      </div>

                      {/* Pausa Almoço */}
                      {dayObj?.breakStart && (
                        <div className="text-[10px] text-stone-400 flex items-center gap-1 truncate">
                          <Coffee className="w-2.5 h-2.5 text-amber-400 shrink-0" />
                          <span>
                            {dayObj.breakStart.slice(0, 5)}-{dayObj.breakEnd?.slice(0, 5)}
                          </span>
                        </div>
                      )}

                      {/* Contagem de Clientes */}
                      {clientCount > 0 ? (
                        <div
                          className={`text-[10px] font-extrabold flex items-center gap-1 ${
                            isFull
                              ? "text-red-300"
                              : isHighOccupation
                              ? "text-amber-300"
                              : "text-emerald-300"
                          }`}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                          <span>{clientCount} agend.</span>
                        </div>
                      ) : (
                        <div className="text-[10px] text-stone-400 font-medium">Livre</div>
                      )}
                    </>
                  ) : (
                    <div className="text-[11px] font-semibold text-stone-400 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-stone-500" />
                      <span>Fechado</span>
                    </div>
                  )}
                </div>

                {/* Popover / Menu Rápido para Dia Aberto */}
                {activeDayMenu?.dateStr === dateStr && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="absolute top-10 right-2 z-30 w-44 bg-stone-900 border border-[#DBAE3B]/60 rounded-2xl shadow-2xl p-1.5 space-y-1 text-xs animate-scale-up"
                  >
                    <div className="px-2 py-1 text-[10px] uppercase font-bold text-[#DBAE3B] border-b border-stone-800">
                      Dia {padDay}/{padMonth}
                    </div>
                    <button
                      onClick={() => handleEditSingleDay(activeDayMenu.dayObj)}
                      className="w-full text-left px-2.5 py-1.5 rounded-xl hover:bg-stone-800 text-stone-200 flex items-center space-x-2 transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-[#DBAE3B]" />
                      <span>Editar horário</span>
                    </button>
                    <button
                      onClick={() => handleCloseSingleDay(dateStr)}
                      className="w-full text-left px-2.5 py-1.5 rounded-xl hover:bg-red-950/80 text-red-300 flex items-center space-x-2 transition-colors"
                    >
                      <XCircle className="w-3.5 h-3.5 text-red-400" />
                      <span>Fechar este dia</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ============================================================== */}
      {/* ZONA 3 — PAINEL DE CONFIGURAÇÃO (APARECE QUANDO HÁ SELEÇÃO)    */}
      {/* ============================================================== */}
      {selectedDates.size > 0 && (
        <div className="bg-[#2D1914] rounded-2xl border border-[#DBAE3B]/60 p-5 sm:p-7 shadow-2xl space-y-6 animate-slide-up relative">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#5E372C]">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-[#DBAE3B]">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <span>{selectedDates.size} dia(s) selecionado(s)</span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/20 text-[#DBAE3B] border border-amber-500/30">
                    Configurar Horários
                  </span>
                </h3>
                <p className="text-xs text-stone-400">
                  Os horários abaixo serão aplicados a todos os dias marcados no calendário.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={clearSelection}
                className="px-3.5 py-2 rounded-xl bg-stone-900/80 hover:bg-stone-800 text-stone-300 text-xs font-semibold border border-stone-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveBatch}
                disabled={isSubmitting}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 hover:from-amber-400 hover:to-amber-600 text-stone-950 font-extrabold text-xs shadow-lg shadow-amber-950/40 flex items-center space-x-2 transition-all active:scale-95 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4 stroke-[3]" />
                )}
                <span>Abrir {selectedDates.size} dia(s) ✅</span>
              </button>
            </div>
          </div>

          {/* Chips de Horários Rápidos */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-[#DBAE3B] uppercase tracking-wider block">
              Horário Rápido (1 clique):
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <button
                type="button"
                onClick={() => applyQuickTime("manha")}
                className="p-3 rounded-xl bg-stone-800 hover:bg-stone-700 border border-stone-600 text-stone-200 text-xs font-semibold flex items-center justify-center space-x-2 transition-all hover:border-[#DBAE3B]"
              >
                <Sunrise className="w-4 h-4 text-amber-400" />
                <span>🌅 Manhã 9h-13h</span>
              </button>

              <button
                type="button"
                onClick={() => applyQuickTime("tarde")}
                className="p-3 rounded-xl bg-stone-800 hover:bg-stone-700 border border-stone-600 text-stone-200 text-xs font-semibold flex items-center justify-center space-x-2 transition-all hover:border-[#DBAE3B]"
              >
                <Sunset className="w-4 h-4 text-amber-500" />
                <span>☀️ Tarde 13h-19h</span>
              </button>

              <button
                type="button"
                onClick={() => applyQuickTime("completo")}
                className="p-3 rounded-xl bg-stone-800 hover:bg-stone-700 border border-stone-600 text-stone-200 text-xs font-semibold flex items-center justify-center space-x-2 transition-all hover:border-[#DBAE3B]"
              >
                <Sun className="w-4 h-4 text-yellow-400" />
                <span>🌞 Completo 9h-19h</span>
              </button>

              <button
                type="button"
                onClick={() => applyQuickTime("estendido")}
                className="p-3 rounded-xl bg-stone-800 hover:bg-stone-700 border border-stone-600 text-stone-200 text-xs font-semibold flex items-center justify-center space-x-2 transition-all hover:border-[#DBAE3B]"
              >
                <Scissors className="w-4 h-4 text-[#DBAE3B]" />
                <span>✂️ Pico 8h30-20h30</span>
              </button>
            </div>
          </div>

          {/* Configuração Personalizada */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 rounded-xl bg-stone-900/60 border border-stone-800">
            {/* Horário de Início */}
            <div>
              <label className="text-xs font-bold text-stone-300 block mb-1.5">
                Início do Atendimento:
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-stone-800 border border-stone-700 text-white font-semibold text-sm outline-none focus:border-[#DBAE3B]"
              />
            </div>

            {/* Horário de Fim */}
            <div>
              <label className="text-xs font-bold text-stone-300 block mb-1.5">
                Fim do Atendimento:
              </label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-stone-800 border border-stone-700 text-white font-semibold text-sm outline-none focus:border-[#DBAE3B]"
              />
            </div>

            {/* Capacidade Máxima de Clientes */}
            <div>
              <label className="text-xs font-bold text-stone-300 block mb-1.5">
                Limite de Clientes/Dia:
              </label>
              <input
                type="number"
                min={1}
                max={25}
                value={maxClients}
                onChange={(e) => setMaxClients(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-stone-800 border border-stone-700 text-white font-semibold text-sm outline-none focus:border-[#DBAE3B]"
              />
            </div>

            {/* Toggle de Almoço */}
            <div className="flex flex-col justify-between">
              <label className="text-xs font-bold text-stone-300 block mb-1.5">
                Pausa de Almoço?
              </label>
              <div className="flex items-center space-x-2 mt-1">
                <input
                  type="checkbox"
                  id="lunchToggle"
                  checked={hasLunchBreak}
                  onChange={(e) => setHasLunchBreak(e.target.checked)}
                  className="w-4 h-4 rounded text-amber-500 focus:ring-[#DBAE3B] bg-stone-800 border-stone-700 cursor-pointer"
                />
                <label htmlFor="lunchToggle" className="text-xs font-semibold text-stone-200 cursor-pointer">
                  {hasLunchBreak ? "Sim, pausar horário" : "Não, sem pausa"}
                </label>
              </div>
            </div>
          </div>

          {/* Horários da Pausa de Almoço (se toggle ativo) */}
          {hasLunchBreak && (
            <div className="p-3.5 rounded-xl bg-stone-900/40 border border-stone-800/80 flex flex-wrap items-center gap-4 text-xs">
              <span className="font-bold text-[#DBAE3B] flex items-center gap-1.5">
                <Coffee className="w-4 h-4 text-amber-400" />
                Pausa de Almoço:
              </span>
              <div className="flex items-center space-x-2">
                <span className="text-stone-400">De:</span>
                <input
                  type="time"
                  value={breakStart}
                  onChange={(e) => setBreakStart(e.target.value)}
                  className="px-2.5 py-1.5 rounded-lg bg-stone-800 border border-stone-700 text-white text-xs outline-none focus:border-[#DBAE3B]"
                />
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-stone-400">Até:</span>
                <input
                  type="time"
                  value={breakEnd}
                  onChange={(e) => setBreakEnd(e.target.value)}
                  className="px-2.5 py-1.5 rounded-lg bg-stone-800 border border-stone-700 text-white text-xs outline-none focus:border-[#DBAE3B]"
                />
              </div>
            </div>
          )}

          {/* Nota Customizada Opcional */}
          <div>
            <label className="text-xs font-bold text-stone-300 block mb-1.5">
              Nota do dia (opcional para sua referência):
            </label>
            <input
              type="text"
              placeholder="Ex: Foco em Morena Iluminada / Apoio com assistente Débora"
              value={customNotes}
              onChange={(e) => setCustomNotes(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-stone-800 border border-stone-700 text-white text-xs outline-none focus:border-[#DBAE3B] placeholder-stone-500"
            />
          </div>

          {/* Seção de Templates Salvos */}
          <div className="pt-4 border-t border-[#5E372C] flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-[#DBAE3B] flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Templates Salvos:</span>
              </span>
              {templates.map((tpl) => (
                <button
                  key={tpl.id}
                  onClick={() => handleApplyTemplate(tpl)}
                  className="px-3 py-1.5 rounded-xl bg-stone-800/90 hover:bg-stone-700 border border-stone-600 text-xs font-semibold text-stone-200 transition-colors"
                >
                  {tpl.name}
                </button>
              ))}
              <button
                onClick={() => setIsNewTemplateModalOpen(true)}
                className="px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/40 text-xs font-semibold text-[#DBAE3B] flex items-center space-x-1 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Salvar como Novo</span>
              </button>
            </div>

            <button
              onClick={handleSaveBatch}
              disabled={isSubmitting}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 hover:from-amber-400 hover:to-amber-600 text-stone-950 font-extrabold text-xs shadow-lg shadow-amber-950/40 flex items-center justify-center space-x-2 transition-all active:scale-95 disabled:opacity-50"
            >
              {isSubmitting ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4 stroke-[3]" />
              )}
              <span>Abrir {selectedDates.size} dia(s) ✅</span>
            </button>
          </div>
        </div>
      )}

      {/* Modal para Salvar Novo Template */}
      {isNewTemplateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#2D1914] border border-[#DBAE3B]/60 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-scale-up">
            <div className="flex items-center justify-between pb-3 border-b border-[#5E372C]">
              <h4 className="text-base font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#DBAE3B]" />
                <span>Salvar Configuração como Template</span>
              </h4>
              <button
                onClick={() => setIsNewTemplateModalOpen(false)}
                className="w-7 h-7 rounded-full bg-stone-800 text-stone-400 hover:text-white flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-stone-300">
              Crie um modelo com o horário <strong>{startTime} às {endTime}</strong>
              {hasLunchBreak ? ` (pausa ${breakStart}-${breakEnd})` : " (sem pausa)"} para aplicar rapidamente no futuro.
            </p>

            <div>
              <label className="text-xs font-bold text-stone-300 block mb-1.5">
                Nome do Template:
              </label>
              <input
                type="text"
                placeholder="Ex: Turno Especial de Fim de Ano"
                value={newTemplateName}
                onChange={(e) => setNewTemplateName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-stone-900 border border-stone-700 text-white text-xs outline-none focus:border-[#DBAE3B]"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setIsNewTemplateModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-stone-800 text-xs font-semibold text-stone-300 hover:bg-stone-700"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveAsTemplate}
                className="px-5 py-2 rounded-xl gold-gradient text-[#1A0F0C] text-xs font-bold shadow-md"
              >
                Salvar Template
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
