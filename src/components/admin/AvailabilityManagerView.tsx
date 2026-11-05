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
  // Navegação de Mês/Ano (sincronizado dinamicamente em relação ao mês e ano atuais)
  const [currentYearMonth, setCurrentYearMonth] = useState({ year: 2026, month: 11 });
  const [todayStr, setTodayStr] = useState("");

  useEffect(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth() + 1;
    const d = now.getDate();
    setCurrentYearMonth({ year: y, month: m });
    setTodayStr(`${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`);
  }, []);
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
    const now = new Date();
    setCurrentYearMonth({ year: now.getFullYear(), month: now.getMonth() + 1 });
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
    <div className="bg-white/85 backdrop-blur-md rounded-2xl sm:rounded-3xl p-3.5 sm:p-8 border border-[#D8D0BD] shadow-xs text-[#1D3D3C] space-y-6 sm:space-y-8 relative overflow-hidden">
      {/* Pattern de Arcos de Oliva sutil ao fundo */}
      <div className="absolute inset-0 bg-pattern-arches-olive opacity-[0.03] pointer-events-none" />

      {/* Toast de Notificação Inline */}
      {toastMessage && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-5 py-3.5 rounded-2xl shadow-xl border flex items-center space-x-3 text-sm font-semibold transition-all duration-300 animate-slide-up ${
            toastMessage.type === "success"
              ? "bg-[#1D3D3C] text-[#FCF5EB] border-[#C7A03A]/60 shadow-[#1D3D3C]/30"
              : toastMessage.type === "error"
              ? "bg-red-950 text-red-100 border-red-500 shadow-red-950/40"
              : "bg-[#FCF5EB] text-[#1D3D3C] border-[#D8D0BD] shadow-black/20"
          }`}
        >
          {toastMessage.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 text-[#D9B85F] shrink-0" />
          ) : toastMessage.type === "error" ? (
            <XCircle className="w-5 h-5 text-red-400 shrink-0" />
          ) : (
            <Info className="w-5 h-5 text-[#80611F] shrink-0" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* ============================================================== */}
      {/* ZONA 1 — CABEÇALHO + CONTROLES DO MÊS + ESTATÍSTICAS + LEGENDA */}
      {/* ============================================================== */}
      <div className="space-y-6 relative z-10">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-[#D8D0BD]">
          <div>
            <div className="flex items-center space-x-2 text-[11px] uppercase font-extrabold tracking-widest text-[#80611F] mb-1.5">
              <CalendarCheck className="w-4 h-4 text-[#C7A03A]" />
              <span>Gestão de Disponibilidade • Gleicy Ronha</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#1D3D3C] flex items-center gap-3">
              <span>Abertura de Agenda</span>
              <span className="text-xs px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300 font-semibold">
                {monthStats.totalOpen} dias abertos
              </span>
            </h1>

            {/* Grafismo Oficial 1 - Linha Orgânica Dourada */}
            <div className="relative w-36 sm:w-44 h-2.5 my-1.5 opacity-80 pointer-events-none">
              <img
                src="/brand/Grafismos/Linha grafismo 1.png"
                alt=""
                className="w-full h-full object-contain object-left"
              />
            </div>

            <p className="text-xs sm:text-sm text-[#736455] max-w-2xl mt-1 leading-relaxed">
              Defina os dias e turnos em que você atenderá clientes no Espaço da Beleza. As clientes só conseguirão agendar online nos dias que você liberar aqui.
            </p>
          </div>

          {/* Navegação entre Meses */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center bg-[#FAF7F2] rounded-2xl border border-[#D8D0BD] p-1 shadow-xs">
              <button
                onClick={handlePrevMonth}
                className="p-2.5 rounded-xl hover:bg-[#FCF5EB] text-[#1D3D3C] hover:text-[#80611F] transition-colors"
                title="Mês Anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-4 text-sm font-bold text-[#1D3D3C] min-w-[140px] text-center">
                {monthNames[currentYearMonth.month - 1]} {currentYearMonth.year}
              </span>
              <button
                onClick={handleNextMonth}
                className="p-2.5 rounded-xl hover:bg-[#FCF5EB] text-[#1D3D3C] hover:text-[#80611F] transition-colors"
                title="Próximo Mês"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <button
              onClick={handleGoToday}
              className="px-3.5 py-2.5 rounded-2xl bg-[#1D3D3C] hover:bg-[#1D3D3C]/90 border border-[#C7A03A]/40 text-xs font-bold text-[#D9B85F] transition-all hover:border-[#C7A03A] shadow-xs active:scale-95"
            >
              Hoje
            </button>

            <button
              onClick={loadMonthData}
              disabled={isLoading}
              className="p-2.5 rounded-2xl bg-[#FAF7F2] hover:bg-[#FCF5EB] border border-[#D8D0BD] text-[#736455] hover:text-[#1D3D3C] transition-all shadow-xs"
              title="Recarregar Disponibilidade"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin text-[#C7A03A]" : ""}`} />
            </button>
          </div>
        </div>

        {/* Barra de Ações Rápidas de Seleção e Estatísticas */}
        <div data-tutorial="abertura-batch-actions" className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#FCF5EB]/80 p-4 rounded-2xl border border-[#D8D0BD]">
          {/* Botões de Ação de Seleção Rápida */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-[#736455] mr-1 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-[#C7A03A]" />
              <span>Seleção rápida:</span>
            </span>
            <button
              onClick={selectTuesdayToSaturday}
              className="px-3 py-1.5 rounded-xl bg-white hover:bg-[#FAF7F2] border border-[#D8D0BD] text-xs font-semibold text-[#1D3D3C] transition-all hover:border-[#C7A03A] shadow-xs"
            >
              📅 Terça a Sábado
            </button>
            <button
              onClick={selectAllMonth}
              className="px-3 py-1.5 rounded-xl bg-white hover:bg-[#FAF7F2] border border-[#D8D0BD] text-xs font-semibold text-[#1D3D3C] transition-all hover:border-[#C7A03A] shadow-xs"
            >
              🗓️ Todo o Mês
            </button>
            {selectedDates.size > 0 && (
              <button
                onClick={clearSelection}
                className="px-3 py-1.5 rounded-xl bg-white hover:bg-red-50 border border-red-200 text-xs font-semibold text-red-600 transition-all shadow-xs"
              >
                ✕ Limpar ({selectedDates.size})
              </button>
            )}
          </div>

          {/* Legenda de Cores */}
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <div className="flex items-center space-x-1.5">
              <span className="w-3.5 h-3.5 rounded-md bg-[#FAF7F2] border border-[#D8D0BD] inline-block" />
              <span className="text-[#736455]">Fechado</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-3.5 h-3.5 rounded-md bg-emerald-50 border border-emerald-400 inline-block" />
              <span className="text-[#1D3D3C]">Aberto</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-3.5 h-3.5 rounded-md bg-amber-50 border border-amber-400 inline-block" />
              <span className="text-[#1D3D3C]">&gt;70% Ocupado</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-3.5 h-3.5 rounded-md bg-red-50 border border-red-400 inline-block" />
              <span className="text-[#1D3D3C]">Lotado</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-3.5 h-3.5 rounded-md bg-[#1D3D3C] border-2 border-[#C7A03A] inline-block ring-1 ring-[#C7A03A]/40" />
              <span className="text-[#80611F] font-semibold">Hoje / Selecionado</span>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* ZONA 2 — GRID CALENDÁRIO MENSAL INTERATIVO                     */}
      {/* ============================================================== */}
      <div data-tutorial="abertura-calendar-grid" className="space-y-3 relative z-10">
        {/* Dias da Semana (Dom a Sáb) */}
        <div className="grid grid-cols-7 gap-2 sm:gap-3 text-center text-xs font-bold text-[#80611F] tracking-wider uppercase mb-1">
          <span className="p-2 rounded-xl bg-[#FAF7F2] border border-[#D8D0BD]/40 text-[#736455]/70">Dom</span>
          <span className="p-2 rounded-xl bg-[#FAF7F2] border border-[#D8D0BD]/40 text-[#736455]">Seg</span>
          <span className="p-2 rounded-xl bg-[#FAF7F2] border border-[#D8D0BD]/40 text-[#736455]">Ter</span>
          <span className="p-2 rounded-xl bg-[#FAF7F2] border border-[#D8D0BD]/40 text-[#736455]">Qua</span>
          <span className="p-2 rounded-xl bg-[#FAF7F2] border border-[#D8D0BD]/40 text-[#736455]">Qui</span>
          <span className="p-2 rounded-xl bg-[#FAF7F2] border border-[#D8D0BD]/40 text-[#736455]">Sex</span>
          <span className="p-2 rounded-xl bg-[#FAF7F2] border border-[#D8D0BD]/40 text-[#736455]">Sáb</span>
        </div>

        {/* Grid de Dias */}
        <div className="grid grid-cols-7 gap-2 sm:gap-3">
          {/* Espaços Vazios para o Offset Inicial do Mês */}
          {[...Array(startDayOffset)].map((_, i) => (
            <div
              key={`empty-${i}`}
              className="h-20 xs:h-24 sm:h-32 rounded-xl bg-[#FAF7F2]/40 border border-[#D8D0BD]/40 pointer-events-none"
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
            const isToday = Boolean(todayStr && dateStr === todayStr);

            // Ocupação do Dia
            const clientCount = appointmentsCountMap.get(dateStr) || 0;
            const maxClientsForDay = dayObj?.maxClients || 8;
            const occupationRatio = maxClientsForDay > 0 ? clientCount / maxClientsForDay : 0;
            const isFull = isOpen && (clientCount >= maxClientsForDay || occupationRatio >= 1);
            const isHighOccupation = isOpen && !isFull && occupationRatio >= 0.7;

            // Determinar estilo de fundo e borda baseado no estado
            let statusClasses = "bg-[#FAF7F2] border-[#D8D0BD] text-[#736455] hover:border-[#C7A03A]/60 shadow-xs";

            if (isOpen) {
              if (isFull) {
                // Vermelho: Lotado
                statusClasses = "bg-red-50/90 border-red-300 text-red-950 hover:border-red-500 shadow-xs";
              } else if (isHighOccupation) {
                // Âmbar: >70%
                statusClasses = "bg-amber-50/90 border-amber-300 text-amber-950 hover:border-amber-500 shadow-xs";
              } else {
                // Verde: Aberto com horário
                statusClasses = "bg-emerald-50/90 border-emerald-300 text-emerald-950 hover:border-emerald-500 shadow-xs";
              }
            }

            if (isSelected) {
              statusClasses = "bg-[#1D3D3C] border-[#C7A03A] text-white ring-2 ring-[#C7A03A] shadow-md shadow-[#1D3D3C]/20 scale-[1.02]";
            }

            if (isToday && !isSelected) {
              statusClasses += " ring-2 ring-[#C7A03A]/70 border-[#C7A03A]";
            }

            return (
              <div
                key={dateStr}
                onClick={() => toggleDateSelection(dateStr)}
                className={`relative h-20 xs:h-24 sm:h-32 p-1.5 sm:p-2.5 rounded-xl border text-left cursor-pointer transition-all duration-200 flex flex-col justify-between select-none group ${statusClasses}`}
              >
                {/* Topo do Card: Número do Dia + Indicador de Seleção / Menu */}
                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs font-black w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center transition-transform ${
                      isSelected
                        ? "bg-[#C7A03A] text-[#1D3D3C] font-black"
                        : isToday
                        ? "bg-[#C7A03A]/20 text-[#80611F] border border-[#C7A03A]/60 font-bold"
                        : isOpen
                        ? "text-[#1D3D3C] group-hover:text-[#80611F] font-bold"
                        : "text-[#736455] group-hover:text-[#1D3D3C]"
                    }`}
                  >
                    {dayNum}
                  </span>

                  {/* Indicador de Seleção Ativa */}
                  {isSelected ? (
                    <span className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-[#C7A03A] text-[#1D3D3C] flex items-center justify-center text-[9px] sm:text-[10px] font-black shadow-xs">
                      <Check className="w-2.5 h-2.5 sm:w-3 sm:h-3 stroke-[3]" />
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
                      className="w-4 h-4 sm:w-5 sm:h-5 rounded-md hover:bg-[#FCF5EB] flex items-center justify-center text-[#736455] hover:text-[#1D3D3C] transition-colors"
                      title="Opções do dia"
                    >
                      <Sliders className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-[#C7A03A]" />
                    </button>
                  ) : null}
                </div>

                {/* Conteúdo Central: Horário e Status */}
                <div className="space-y-0.5 sm:space-y-1">
                  {isOpen ? (
                    <>
                      <div className={`text-[9px] sm:text-[11px] font-bold tracking-tight flex items-center gap-0.5 sm:gap-1 truncate ${isSelected ? "text-white" : "text-[#1D3D3C]"}`}>
                        <Clock className={`w-2.5 h-2.5 sm:w-3 sm:h-3 shrink-0 ${isSelected ? "text-[#D9B85F]" : "text-[#C7A03A]"}`} />
                        <span className="truncate">
                          {dayObj?.startTime.slice(0, 5)} - {dayObj?.endTime.slice(0, 5)}
                        </span>
                      </div>

                      {/* Pausa Almoço */}
                      {dayObj?.breakStart && (
                        <div className={`text-[8.5px] sm:text-[10px] hidden xs:flex items-center gap-0.5 sm:gap-1 truncate ${isSelected ? "text-[#FCF5EB]/80" : "text-[#736455]"}`}>
                          <Coffee className={`w-2.5 h-2.5 shrink-0 ${isSelected ? "text-[#D9B85F]" : "text-[#80611F]"}`} />
                          <span className="truncate">
                            {dayObj.breakStart.slice(0, 5)}-{dayObj.breakEnd?.slice(0, 5)}
                          </span>
                        </div>
                      )}

                      {/* Contagem de Clientes */}
                      {clientCount > 0 ? (
                        <div
                          className={`text-[10px] font-extrabold flex items-center gap-1 ${
                            isSelected
                              ? isFull ? "text-red-300" : isHighOccupation ? "text-amber-300" : "text-emerald-300"
                              : isFull ? "text-red-700" : isHighOccupation ? "text-amber-700" : "text-emerald-700"
                          }`}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                          <span>{clientCount} agend.</span>
                        </div>
                      ) : (
                        <div className={`text-[10px] font-medium ${isSelected ? "text-[#FCF5EB]/60" : "text-[#736455]"}`}>Livre</div>
                      )}
                    </>
                  ) : (
                    <div className="text-[11px] font-semibold text-[#736455] flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#D8D0BD]" />
                      <span>Fechado</span>
                    </div>
                  )}
                </div>

                {/* Popover / Menu Rápido para Dia Aberto */}
                {activeDayMenu?.dateStr === dateStr && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="absolute top-10 right-2 z-30 w-44 bg-white border border-[#D8D0BD] rounded-2xl shadow-xl p-1.5 space-y-1 text-xs animate-scale-up text-[#1D3D3C]"
                  >
                    <div className="px-2 py-1 text-[10px] uppercase font-bold text-[#80611F] border-b border-[#D8D0BD]/60">
                      Dia {padDay}/{padMonth}
                    </div>
                    <button
                      onClick={() => handleEditSingleDay(activeDayMenu.dayObj)}
                      className="w-full text-left px-2.5 py-1.5 rounded-xl hover:bg-[#FAF7F2] text-[#1D3D3C] flex items-center space-x-2 transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-[#C7A03A]" />
                      <span>Editar horário</span>
                    </button>
                    <button
                      onClick={() => handleCloseSingleDay(dateStr)}
                      className="w-full text-left px-2.5 py-1.5 rounded-xl hover:bg-red-50 text-red-700 flex items-center space-x-2 transition-colors"
                    >
                      <XCircle className="w-3.5 h-3.5 text-red-500" />
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
        <div data-tutorial="abertura-time-config" className="bg-[#FCF5EB] rounded-2xl border-2 border-[#C7A03A]/60 p-5 sm:p-7 shadow-xl space-y-6 animate-slide-up relative text-[#1D3D3C]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#D8D0BD]">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-[#C7A03A]/20 border border-[#C7A03A]/40 flex items-center justify-center text-[#80611F]">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-[#1D3D3C] flex items-center gap-2">
                  <span>{selectedDates.size} dia(s) selecionado(s)</span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#FAF7F2] text-[#80611F] border border-[#C7A03A]/40 font-semibold">
                    Configurar Horários
                  </span>
                </h3>
                <p className="text-xs text-[#736455]">
                  Os horários abaixo serão aplicados a todos os dias marcados no calendário.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={clearSelection}
                className="px-3.5 py-2 rounded-xl bg-white hover:bg-[#FAF7F2] text-[#736455] hover:text-[#1D3D3C] text-xs font-semibold border border-[#D8D0BD] transition-colors shadow-xs"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveBatch}
                disabled={isSubmitting}
                className="px-5 py-2.5 rounded-xl gold-gradient text-[#1D3D3C] font-extrabold text-xs shadow-md flex items-center space-x-2 transition-all active:scale-95 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <RefreshCw className="w-4 h-4 animate-spin text-[#1D3D3C]" />
                ) : (
                  <Check className="w-4 h-4 stroke-[3]" />
                )}
                <span>Abrir {selectedDates.size} dia(s) ✅</span>
              </button>
            </div>
          </div>

          {/* Chips de Horários Rápidos */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-[#80611F] uppercase tracking-wider block">
              Horário Rápido (1 clique):
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <button
                type="button"
                onClick={() => applyQuickTime("manha")}
                className="p-3 rounded-xl bg-white hover:bg-[#FAF7F2] border border-[#D8D0BD] text-[#1D3D3C] text-xs font-semibold flex items-center justify-center space-x-2 transition-all hover:border-[#C7A03A] shadow-xs"
              >
                <Sunrise className="w-4 h-4 text-[#C7A03A]" />
                <span>🌅 Manhã 9h-13h</span>
              </button>

              <button
                type="button"
                onClick={() => applyQuickTime("tarde")}
                className="p-3 rounded-xl bg-white hover:bg-[#FAF7F2] border border-[#D8D0BD] text-[#1D3D3C] text-xs font-semibold flex items-center justify-center space-x-2 transition-all hover:border-[#C7A03A] shadow-xs"
              >
                <Sunset className="w-4 h-4 text-[#80611F]" />
                <span>☀️ Tarde 13h-19h</span>
              </button>

              <button
                type="button"
                onClick={() => applyQuickTime("completo")}
                className="p-3 rounded-xl bg-white hover:bg-[#FAF7F2] border border-[#D8D0BD] text-[#1D3D3C] text-xs font-semibold flex items-center justify-center space-x-2 transition-all hover:border-[#C7A03A] shadow-xs"
              >
                <Sun className="w-4 h-4 text-amber-500" />
                <span>🌞 Completo 9h-19h</span>
              </button>

              <button
                type="button"
                onClick={() => applyQuickTime("estendido")}
                className="p-3 rounded-xl bg-white hover:bg-[#FAF7F2] border border-[#D8D0BD] text-[#1D3D3C] text-xs font-semibold flex items-center justify-center space-x-2 transition-all hover:border-[#C7A03A] shadow-xs"
              >
                <Scissors className="w-4 h-4 text-[#80611F]" />
                <span>✂️ Pico 8h30-20h30</span>
              </button>
            </div>
          </div>

          {/* Configuração Personalizada */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 rounded-xl bg-white/80 border border-[#D8D0BD]">
            {/* Horário de Início */}
            <div>
              <label className="text-xs font-bold text-[#1D3D3C] block mb-1.5">
                Início do Atendimento:
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#FAF7F2] border border-[#D8D0BD] text-[#1D3D3C] font-semibold text-sm outline-none focus:border-[#C7A03A]"
              />
            </div>

            {/* Horário de Fim */}
            <div>
              <label className="text-xs font-bold text-[#1D3D3C] block mb-1.5">
                Fim do Atendimento:
              </label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#FAF7F2] border border-[#D8D0BD] text-[#1D3D3C] font-semibold text-sm outline-none focus:border-[#C7A03A]"
              />
            </div>

            {/* Capacidade Máxima de Clientes */}
            <div>
              <label className="text-xs font-bold text-[#1D3D3C] block mb-1.5">
                Limite de Clientes/Dia:
              </label>
              <input
                type="number"
                min={1}
                max={25}
                value={maxClients}
                onChange={(e) => setMaxClients(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-[#FAF7F2] border border-[#D8D0BD] text-[#1D3D3C] font-semibold text-sm outline-none focus:border-[#C7A03A]"
              />
            </div>

            {/* Toggle de Almoço */}
            <div className="flex flex-col justify-between">
              <label className="text-xs font-bold text-[#1D3D3C] block mb-1.5">
                Pausa de Almoço?
              </label>
              <div className="flex items-center space-x-2 mt-1">
                <input
                  type="checkbox"
                  id="lunchToggle"
                  checked={hasLunchBreak}
                  onChange={(e) => setHasLunchBreak(e.target.checked)}
                  className="w-4 h-4 rounded text-[#1D3D3C] accent-[#1D3D3C] focus:ring-[#C7A03A] border-[#D8D0BD] cursor-pointer"
                />
                <label htmlFor="lunchToggle" className="text-xs font-semibold text-[#1D3D3C] cursor-pointer">
                  {hasLunchBreak ? "Sim, pausar horário" : "Não, sem pausa"}
                </label>
              </div>
            </div>
          </div>

          {/* Horários da Pausa de Almoço (se toggle ativo) */}
          {hasLunchBreak && (
            <div className="p-3.5 rounded-xl bg-white/60 border border-[#D8D0BD] flex flex-wrap items-center gap-4 text-xs">
              <span className="font-bold text-[#80611F] flex items-center gap-1.5">
                <Coffee className="w-4 h-4 text-[#C7A03A]" />
                Pausa de Almoço:
              </span>
              <div className="flex items-center space-x-2">
                <span className="text-[#736455]">De:</span>
                <input
                  type="time"
                  value={breakStart}
                  onChange={(e) => setBreakStart(e.target.value)}
                  className="px-2.5 py-1.5 rounded-lg bg-[#FAF7F2] border border-[#D8D0BD] text-[#1D3D3C] text-xs outline-none focus:border-[#C7A03A]"
                />
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-[#736455]">Até:</span>
                <input
                  type="time"
                  value={breakEnd}
                  onChange={(e) => setBreakEnd(e.target.value)}
                  className="px-2.5 py-1.5 rounded-lg bg-[#FAF7F2] border border-[#D8D0BD] text-[#1D3D3C] text-xs outline-none focus:border-[#C7A03A]"
                />
              </div>
            </div>
          )}

          {/* Nota Customizada Opcional */}
          <div>
            <label className="text-xs font-bold text-[#1D3D3C] block mb-1.5">
              Nota do dia (opcional para sua referência):
            </label>
            <input
              type="text"
              placeholder="Ex: Foco em Morena Iluminada / Apoio com assistente Débora"
              value={customNotes}
              onChange={(e) => setCustomNotes(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-white border border-[#D8D0BD] text-[#1D3D3C] text-xs outline-none focus:border-[#C7A03A] placeholder-[#736455]/60"
            />
          </div>

          {/* Seção de Templates Salvos */}
          <div className="pt-4 border-t border-[#D8D0BD] flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-[#80611F] flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-[#C7A03A]" />
                <span>Templates Salvos:</span>
              </span>
              {templates.map((tpl) => (
                <button
                  key={tpl.id}
                  onClick={() => handleApplyTemplate(tpl)}
                  className="px-3 py-1.5 rounded-xl bg-white hover:bg-[#FAF7F2] border border-[#D8D0BD] text-xs font-semibold text-[#1D3D3C] transition-colors shadow-xs"
                >
                  {tpl.name}
                </button>
              ))}
              <button
                onClick={() => setIsNewTemplateModalOpen(true)}
                className="px-3 py-1.5 rounded-xl bg-[#FAF7F2] hover:bg-white border border-[#C7A03A]/60 text-xs font-semibold text-[#80611F] flex items-center space-x-1 transition-colors shadow-xs"
              >
                <Plus className="w-3.5 h-3.5 text-[#C7A03A]" />
                <span>Salvar como Novo</span>
              </button>
            </div>

            <button
              onClick={handleSaveBatch}
              disabled={isSubmitting}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl gold-gradient text-[#1D3D3C] font-extrabold text-xs shadow-md flex items-center justify-center space-x-2 transition-all active:scale-95 disabled:opacity-50"
            >
              {isSubmitting ? (
                <RefreshCw className="w-4 h-4 animate-spin text-[#1D3D3C]" />
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
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#D8D0BD] rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-scale-up text-[#1D3D3C]">
            <div className="flex items-center justify-between pb-3 border-b border-[#D8D0BD]">
              <h4 className="text-base font-bold text-[#1D3D3C] flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#C7A03A]" />
                <span>Salvar Configuração como Template</span>
              </h4>
              <button
                onClick={() => setIsNewTemplateModalOpen(false)}
                className="w-7 h-7 rounded-full bg-[#FAF7F2] text-[#736455] hover:text-[#1D3D3C] flex items-center justify-center transition-colors"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-[#736455]">
              Crie um modelo com o horário <strong className="text-[#1D3D3C]">{startTime} às {endTime}</strong>
              {hasLunchBreak ? ` (pausa ${breakStart}-${breakEnd})` : " (sem pausa)"} para aplicar rapidamente no futuro.
            </p>

            <div>
              <label className="text-xs font-bold text-[#1D3D3C] block mb-1.5">
                Nome do Template:
              </label>
              <input
                type="text"
                placeholder="Ex: Turno Especial de Fim de Ano"
                value={newTemplateName}
                onChange={(e) => setNewTemplateName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#D8D0BD] text-[#1D3D3C] text-xs outline-none focus:border-[#C7A03A]"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setIsNewTemplateModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-[#FAF7F2] text-xs font-semibold text-[#736455] hover:text-[#1D3D3C] border border-[#D8D0BD] transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveAsTemplate}
                className="px-5 py-2 rounded-xl gold-gradient text-[#1D3D3C] text-xs font-bold shadow-md"
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
