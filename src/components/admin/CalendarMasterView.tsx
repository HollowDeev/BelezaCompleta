"use client";

import { useState, useMemo, useEffect } from "react";
import { Appointment } from "@/types/appointment";
import { formatBRL } from "@/lib/utils";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  Scissors,
  Hourglass,
  Plus,
  Zap,
} from "lucide-react";

interface CalendarMasterViewProps {
  appointments: Appointment[];
  selectedDate: string;
  onSelectDate: (date: string) => void;
  onNewAppointment: (prefilledDate?: string, prefilledTime?: string) => void;
  onSelectProposal?: (proposalId: string) => void;
}

export function CalendarMasterView({
  appointments,
  selectedDate,
  onSelectDate,
  onNewAppointment,
  onSelectProposal,
}: CalendarMasterViewProps) {
  const [viewMode, setViewMode] = useState<"mes" | "semana" | "dia">("mes");
  const [currentYearMonth, setCurrentYearMonth] = useState({ year: 2026, month: 11 });

  useEffect(() => {
    const now = new Date();
    setCurrentYearMonth({ year: now.getFullYear(), month: now.getMonth() + 1 });
  }, []);

  // Cálculo dinâmico dos dias da semana (Segunda a Sábado) para a visão semanal
  const weekDays = useMemo(() => {
    if (!selectedDate || !selectedDate.includes("-")) return [];
    const parts = selectedDate.split("-").map(Number);
    const base = new Date(parts[0], parts[1] - 1, parts[2]);
    const dayOfWeek = base.getDay(); // 0 = Domingo, 1 = Segunda, ..., 6 = Sábado
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(base);
    monday.setDate(base.getDate() + diffToMonday);

    const days: { dateStr: string; label: string; dayNum: number; monthNum: number }[] = [];
    const dayNames = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

    for (let i = 0; i < 6; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const yStr = d.getFullYear();
      const mStr = String(d.getMonth() + 1).padStart(2, "0");
      const dStr = String(d.getDate()).padStart(2, "0");
      days.push({
        dateStr: `${yStr}-${mStr}-${dStr}`,
        label: dayNames[d.getDay()],
        dayNum: d.getDate(),
        monthNum: d.getMonth() + 1,
      });
    }
    return days;
  }, [selectedDate]);

  const daysInMonth = new Date(currentYearMonth.year, currentYearMonth.month, 0).getDate();
  const startDayOffset = new Date(currentYearMonth.year, currentYearMonth.month - 1, 1).getDay();
  const monthNames = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  const handlePrevMonth = () => {
    if (currentYearMonth.month === 1) {
      setCurrentYearMonth({ year: currentYearMonth.year - 1, month: 12 });
    } else {
      setCurrentYearMonth({ ...currentYearMonth, month: currentYearMonth.month - 1 });
    }
  };

  const handleNextMonth = () => {
    if (currentYearMonth.month === 12) {
      setCurrentYearMonth({ year: currentYearMonth.year + 1, month: 1 });
    } else {
      setCurrentYearMonth({ ...currentYearMonth, month: currentYearMonth.month + 1 });
    }
  };

  // Agendamentos filtrados para o dia selecionado (apenas agendamentos reais/confirmados)
  const selectedDayAppointments = appointments.filter(
    (a) => a.date === selectedDate && a.status !== "cancelled" && a.status !== "pending_proposal"
  );

  return (
    <div className="bg-white/85 backdrop-blur-md rounded-2xl sm:rounded-3xl p-3.5 sm:p-8 border border-[#D8D0BD] shadow-xs space-y-6 relative overflow-hidden">
      {/* Topo do Calendário: Navegação e Seletor de Vistas */}
      <div data-tutorial="calendar-controls" className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 border-b border-[#D8D0BD]/70 pb-5">
        <div>
          <div className="flex items-center space-x-2 sm:space-x-3">
            <div className="flex items-center space-x-1">
              <button
                onClick={handlePrevMonth}
                className="p-1.5 sm:p-2 rounded-xl bg-[#FAF7F2] hover:bg-[#EEE8DD] text-[#736455] transition-colors border border-[#D8D0BD]"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={handleNextMonth}
                className="p-1.5 sm:p-2 rounded-xl bg-[#FAF7F2] hover:bg-[#EEE8DD] text-[#736455] transition-colors border border-[#D8D0BD]"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <h2 className="text-lg sm:text-2xl font-bold text-[#1D3D3C] tracking-tight font-sans">
              {monthNames[currentYearMonth.month - 1]} {currentYearMonth.year}
            </h2>

            <button
              onClick={() => {
                const now = new Date();
                const y = now.getFullYear();
                const m = now.getMonth() + 1;
                const d = now.getDate();
                setCurrentYearMonth({ year: y, month: m });
                onSelectDate(`${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`);
              }}
              className="px-2.5 sm:px-3 py-1 rounded-xl text-[11px] sm:text-xs font-bold text-[#80611F] bg-[#FCF9F0] border border-[#C7A03A]/50 hover:bg-[#F6ECCF] transition-colors"
            >
              Hoje
            </button>
          </div>

          {/* Grafismo Oficial 1 - Linha Orgânica Dourada */}
          <div className="relative w-36 sm:w-44 h-2.5 my-1 opacity-75 pointer-events-none">
            <img
              src="/brand/Grafismos/Linha grafismo 1.png"
              alt=""
              className="w-full h-full object-contain object-left"
            />
          </div>
        </div>

        {/* Alternador de Vistas: Mês | Semana | Dia */}
        <div className="flex items-center p-1 bg-[#FAF7F2] rounded-2xl border border-[#D8D0BD] text-xs">
          <button
            onClick={() => setViewMode("mes")}
            className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs font-bold transition-all ${
              viewMode === "mes"
                ? "bg-[#1D3D3C] text-white shadow-xs border border-[#C7A03A]/30"
                : "text-[#736455] hover:text-[#1D3D3C]"
            }`}
          >
            <span className="hidden sm:inline">Visão Mensal</span>
            <span className="sm:hidden">Mês</span>
          </button>
          <button
            onClick={() => setViewMode("semana")}
            className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs font-bold transition-all ${
              viewMode === "semana"
                ? "bg-[#1D3D3C] text-white shadow-xs border border-[#C7A03A]/30"
                : "text-[#736455] hover:text-[#1D3D3C]"
            }`}
          >
            <span className="hidden sm:inline">Visão Semanal</span>
            <span className="sm:hidden">Semana</span>
          </button>
          <button
            onClick={() => setViewMode("dia")}
            className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs font-bold transition-all ${
              viewMode === "dia"
                ? "bg-[#1D3D3C] text-white shadow-xs border border-[#C7A03A]/30"
                : "text-[#736455] hover:text-[#1D3D3C]"
            }`}
          >
            <span className="hidden sm:inline">Visão Diária</span>
            <span className="sm:hidden">Dia</span>
          </button>
        </div>
      </div>

      {/* 1. VISÃO MENSAL (GRID DE DIAS COM BADGES E FATURAMENTO) */}
      {viewMode === "mes" && (
        <div className="space-y-6">
          <div className="grid grid-cols-7 gap-1 sm:gap-2 text-center text-[10px] sm:text-xs font-bold text-[#80611F] uppercase tracking-wider mb-1">
            <span>Dom</span>
            <span>Seg</span>
            <span>Ter</span>
            <span>Qua</span>
            <span>Qui</span>
            <span>Sex</span>
            <span>Sáb</span>
          </div>

          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {/* Espaçamento inicial baseado no dia da semana em que o mês começa */}
            {[...Array(startDayOffset)].map((_, i) => (
              <div key={`empty-${i}`} className="h-24 sm:h-28 rounded-2xl bg-[#FAF7F2]/40 border border-transparent" />
            ))}

            {/* Dias do Mês */}
            {[...Array(daysInMonth)].map((_, i) => {
              const dayNum = i + 1;
              const dateStr = `${currentYearMonth.year}-${String(currentYearMonth.month).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
              const dayApts = appointments
                .filter((a) => a.date === dateStr && a.status !== "cancelled")
                .filter((apt, idx, arr) =>
                  idx === arr.findIndex((t) => t.id === apt.id || (t.startTime === apt.startTime && t.clientName.trim().toLowerCase() === apt.clientName.trim().toLowerCase()))
                );
              const isSelected = selectedDate === dateStr;
              const hasPause = dayApts.some((a) => a.stepBlocks?.some((s) => s.type === "pause"));
              const dayRevenue = dayApts.reduce((sum, a) => sum + a.price, 0);

              return (
                <div
                  key={dayNum}
                  onClick={() => onSelectDate(dateStr)}
                  className={`h-16 sm:h-28 p-1 sm:p-2 rounded-xl sm:rounded-2xl border text-left cursor-pointer transition-all flex flex-col justify-between ${
                    isSelected
                      ? "border-[#C7A03A] bg-[#FCF9F0] ring-2 ring-[#C7A03A]/40 shadow-xs"
                      : "border-[#D8D0BD] bg-white hover:border-[#C7A03A]/60 hover:bg-[#FAF7F2]"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-bold w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center ${
                        isSelected
                          ? "bg-[#1D3D3C] text-[#D9B85F]"
                          : "text-[#1D3D3C]"
                      }`}
                    >
                      {dayNum}
                    </span>

                    {hasPause && (
                      <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-[#C7A03A]" title="Possui janelas de pausa química livres" />
                    )}
                  </div>

                  {dayApts.length > 0 ? (
                    <div className="space-y-0.5 sm:space-y-1">
                      {/* Em mobile, exibe contagem compacta com dot */}
                      <div className="flex sm:hidden items-center justify-center gap-1 mt-0.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                        <span className="text-[9px] font-extrabold text-[#1D3D3C]">{dayApts.length}</span>
                      </div>

                      {/* Em desktop (sm:), exibe detalhes com faturamento */}
                      <div className="hidden sm:block">
                        <div className="text-[10px] font-bold text-[#1D3D3C] truncate">
                          {dayApts.length} cliente(s)
                        </div>
                        <div className="text-[10px] text-emerald-800 font-bold">
                          {formatBRL(dayRevenue)}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <span className="text-[9px] sm:text-[10px] text-stone-300 hidden sm:inline">Livre</span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Detalhe Rápido do Dia Selecionado */}
          <div className="p-5 rounded-2xl bg-[#FAF7F2] border border-[#D8D0BD] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-widest text-[#AD841D]">
                Dia Selecionado: {selectedDate}
              </span>
              <h3 className="font-bold text-base text-[#2D1914]">
                {selectedDayAppointments.length} agendamento(s) programado(s)
              </h3>
            </div>

            <button
              onClick={() => onNewAppointment(selectedDate)}
              className="px-4 py-2 text-xs font-bold text-white gold-gradient rounded-xl shadow-xs hover:opacity-95 flex items-center space-x-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Agendar Neste Dia</span>
            </button>
          </div>
        </div>
      )}

      {/* 2. VISÃO SEMANAL (GRADE COM HORAS E PAUSAS LIVRES) */}
      {viewMode === "semana" && (
        <div className="space-y-4">
          <p className="text-xs text-stone-600">
            {weekDays.length > 0
              ? `Semana de ${String(weekDays[0].dayNum).padStart(2, "0")}/${String(weekDays[0].monthNum).padStart(2, "0")} a ${String(weekDays[weekDays.length - 1].dayNum).padStart(2, "0")}/${String(weekDays[weekDays.length - 1].monthNum).padStart(2, "0")}. As áreas em âmbar pontilhado representam janelas de químicas livres para encaixe:`
              : "Semana selecionada. As áreas em âmbar pontilhado representam janelas de químicas livres para encaixe:"}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
            {weekDays.map((day) => {
              const dayApts = appointments
                .filter((a) => a.date === day.dateStr && a.status !== "cancelled")
                .filter((apt, idx, arr) =>
                  idx === arr.findIndex((t) => t.id === apt.id || (t.startTime === apt.startTime && t.clientName.trim().toLowerCase() === apt.clientName.trim().toLowerCase()))
                );
              const isSelected = selectedDate === day.dateStr;

              return (
                <div
                  key={day.dateStr}
                  onClick={() => onSelectDate(day.dateStr)}
                  className={`p-3 rounded-2xl border transition-all ${
                    isSelected ? "border-[#C59B27] bg-[#FDF9F0]" : "border-[#E7DCCE] bg-white"
                  }`}
                >
                  <div className="border-b border-[#E7DCCE]/60 pb-2 mb-2 text-center">
                    <span className="text-[10px] uppercase font-bold text-[#AD841D] block">
                      {day.label}, {String(day.dayNum).padStart(2, "0")}/{String(day.monthNum).padStart(2, "0")}
                    </span>
                    <span className="text-xs font-bold text-[#2D1914]">
                      {dayApts.length} atendimentos
                    </span>
                  </div>

                  <div className="space-y-2 min-h-48">
                    {dayApts.length === 0 ? (
                      <div className="text-[11px] text-stone-400 text-center pt-8">Sem clientes</div>
                    ) : (
                      dayApts.map((apt) => (
                        <div key={apt.id} className="p-2.5 rounded-xl bg-[#FAF7F2] border border-[#E7DCCE] text-xs">
                          <span className="font-bold text-[#2D1914] block truncate">{apt.clientName}</span>
                          <span className="text-[10px] text-stone-500 block truncate">{apt.serviceTitle}</span>
                          <span className="text-[10px] font-mono font-bold text-[#AD841D]">
                            {apt.startTime} - {apt.endTime}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. VISÃO DIÁRIA (MINUTO A MINUTO COM SLOTS DE ENCAIXE) */}
      {viewMode === "dia" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#2D1914]">
              Horários de {selectedDate}:
            </span>
            <button
              onClick={() => onNewAppointment(selectedDate)}
              className="px-3.5 py-1.5 text-xs font-bold text-white gold-gradient rounded-xl flex items-center space-x-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Novo Agendamento</span>
            </button>
          </div>

          <div className="divide-y divide-[#E7DCCE]/60">
            {["09:00", "10:00", "11:00", "13:30", "14:30", "16:00", "17:30"].map((slotTime) => {
              const matchedApt = selectedDayAppointments.find((a) => a.startTime.startsWith(slotTime.slice(0, 2)));

              return (
                <div key={slotTime} className="py-3 flex items-center justify-between text-xs">
                  <div className="w-16 font-mono font-bold text-[#AD841D]">{slotTime}</div>

                  <div className="flex-1 px-4">
                    {matchedApt ? (
                      <div className="p-2.5 rounded-xl bg-[#2D1914] text-white flex items-center justify-between">
                        <div>
                          <span className="font-bold block">{matchedApt.clientName}</span>
                          <span className="text-[10px] text-stone-300">{matchedApt.serviceTitle}</span>
                        </div>
                        <span className="font-bold text-[#DBAE3B]">{formatBRL(matchedApt.price)}</span>
                      </div>
                    ) : (
                      <div className="p-2 rounded-xl border border-dashed border-stone-300 text-stone-400 flex items-center justify-between hover:bg-stone-50 transition-colors">
                        <span>Horário livre</span>
                        <button
                          onClick={() => onNewAppointment(selectedDate, slotTime)}
                          className="text-[11px] text-[#AD841D] font-bold hover:underline"
                        >
                          + Agendar
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
