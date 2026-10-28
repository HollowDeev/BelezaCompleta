"use client";

import { useState, useEffect, useRef } from "react";
import { Appointment } from "@/types/appointment";
import { TriageSubmission } from "@/types/triage";
import { ServiceItem } from "@/types/service";
import { formatBRL } from "@/lib/utils";
import { LinearTimelineMaster } from "@/components/admin/LinearTimelineMaster";
import confetti from "canvas-confetti";
import { playSuccessTone } from "@/lib/sound/chime";
import {
  Zap,
  Sparkles,
  Clock,
  Scissors,
  Hourglass,
  CheckCircle2,
  AlertCircle,
  Plus,
  FileText,
  User,
  Calendar,
  Layers,
  ArrowRight,
  TrendingUp,
  Sun,
  X,
} from "lucide-react";

interface DayOperationViewProps {
  appointments: Appointment[];
  triageSubmissions: TriageSubmission[];
  services: ServiceItem[];
  selectedDate: string;
  onDateChange: (date: string) => void;
  onOpenNewAppointment: () => void;
  onOpenQuickProposal: (submission?: TriageSubmission) => void;
  onViewProposal: (proposalId: string) => void;
}

export function DayOperationView({
  appointments,
  triageSubmissions,
  services,
  selectedDate,
  onDateChange,
  onOpenNewAppointment,
  onOpenQuickProposal,
  onViewProposal,
}: DayOperationViewProps) {
  // Filtra agendamentos do dia selecionado
  const todayAppointments = appointments.filter(
    (a) => a.date === selectedDate && a.status !== "cancelled"
  );

  // Cálculos do Dia
  const dailyTargetRevenue = 1500; // Meta diária padrão
  const todayRevenue = todayAppointments.reduce((sum, a) => sum + a.price, 0);
  const targetPercent = Math.min(
    100,
    Math.round((todayRevenue / dailyTargetRevenue) * 100)
  );

  // Gamificação - Efeito de confetes e som disparado uma única vez ao atingir 100%
  const hasCelebratedRef = useRef(false);

  useEffect(() => {
    if (targetPercent >= 100) {
      if (!hasCelebratedRef.current) {
        hasCelebratedRef.current = true;
        try {
          confetti({
            particleCount: 80,
            spread: 60,
            colors: ["#DBAE3B", "#C59B27", "#FAF7F2", "#8B6914"],
            origin: { y: 0.7 },
          });
        } catch (e) {
          console.warn("Falha ao disparar confetes:", e);
        }
        playSuccessTone();
      }
    } else {
      hasCelebratedRef.current = false;
    }
  }, [targetPercent]);

  // Morning Briefing (aparece apenas no primeiro acesso do dia)
  const [showBriefing, setShowBriefing] = useState(false);

  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    const lastBriefingDate = localStorage.getItem("lastBriefingDate");
    if (lastBriefingDate !== today) {
      setShowBriefing(true);
    }
  }, []);

  const handleCloseBriefing = () => {
    const today = new Date().toISOString().split("T")[0];
    localStorage.setItem("lastBriefingDate", today);
    setShowBriefing(false);
  };

  // Projeção de faturamento futuro: próximos 14 dias (confirmed e date > today)
  const future14DaysRevenue = appointments
    .filter((a) => {
      if (a.status !== "confirmed") return false;
      const todayStr = new Date().toISOString().split("T")[0];
      const limitDate = new Date();
      limitDate.setDate(limitDate.getDate() + 14);
      const limitStr = limitDate.toISOString().split("T")[0];
      return a.date > todayStr && a.date <= limitStr;
    })
    .reduce((sum, a) => sum + (Number(a.price) || 0), 0);

  // Ordenação de atendimentos do dia para o briefing
  const sortedTodayAppointments = [...todayAppointments].sort((a, b) =>
    a.startTime.localeCompare(b.startTime)
  );
  const nextClient = sortedTodayAppointments[0];

  // Identificação de janela livre para encaixe
  const freeSlotInfo = (() => {
    // 1. Pausa química ativa em algum atendimento
    for (const apt of sortedTodayAppointments) {
      const pauseBlock = apt.stepBlocks?.find((b) => b.type === "pause");
      if (pauseBlock) {
        return {
          time: pauseBlock.startTime,
          durationMin: pauseBlock.durationMin,
        };
      }
    }
    // 2. Intervalo livre entre atendimentos subsequentes
    for (let i = 0; i < sortedTodayAppointments.length - 1; i++) {
      const curr = sortedTodayAppointments[i];
      const next = sortedTodayAppointments[i + 1];
      const [currH, currM] = curr.endTime.split(":").map(Number);
      const [nextH, nextM] = next.startTime.split(":").map(Number);
      const diff = nextH * 60 + nextM - (currH * 60 + currM);
      if (diff >= 30) {
        return {
          time: curr.endTime,
          durationMin: diff,
        };
      }
    }
    return null;
  })();

  // Triagens pendentes com alerta urgente
  const pendingTriages = triageSubmissions.filter(
    (s) => s.status === "pending_review"
  );

  // Status simulado para a operação em tempo real
  const inChairAppointment = todayAppointments.find(
    (a) => a.stepBlocks?.some((s) => s.type === "active") && a.status === "confirmed"
  ) || todayAppointments[0];

  const inChemicalPauseAppointment = todayAppointments.find(
    (a) => a.stepBlocks?.some((s) => s.type === "pause")
  );

  const upcomingAppointments = todayAppointments.slice(1);

  // 3 Fases Visuais da Barra de Meta
  const remainingToTarget = Math.max(0, dailyTargetRevenue - todayRevenue);
  let barGradient = "bg-[#8B4513]";
  let phaseText = `Foco no dia! Faltam ${formatBRL(remainingToTarget)} para cobrir os custos`;

  if (targetPercent >= 100) {
    barGradient = "bg-gradient-to-r from-emerald-500 to-emerald-600";
    phaseText = "🎉 Meta Superada! Você é imparável hoje, Gleicy!";
  } else if (targetPercent >= 50) {
    barGradient = "gold-gradient";
    phaseText = `Quase lá! Faltam ${formatBRL(remainingToTarget)} para sua meta diária 🔥`;
  }

  return (
    <div className="space-y-6">
      {/* MORNING BRIEFING (Primeiro acesso do dia) */}
      {showBriefing && (
        <div className="relative bg-gradient-to-r from-[#2D1914] via-[#3E211A] to-[#1A0F0C] rounded-3xl p-5 sm:p-6 text-white border-2 border-[#DBAE3B]/60 shadow-xl overflow-hidden animate-fade-in">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#DBAE3B]/10 rounded-full blur-2xl pointer-events-none" />
          
          <div className="relative z-10 flex items-start justify-between gap-4">
            <div className="space-y-3 flex-1">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-amber-400/20 text-[#DBAE3B] flex items-center justify-center">
                  <Sun className="w-5 h-5 text-amber-300" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                  Bom dia, Gleicy! ☀️
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs pt-1">
                <div className="p-3 rounded-xl bg-white/10 border border-white/15">
                  <span className="text-stone-300 block text-[11px]">Atendimentos Hoje:</span>
                  <span className="text-base font-bold text-white">
                    {todayAppointments.length} agendados
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-white/10 border border-white/15">
                  <span className="text-stone-300 block text-[11px]">Faturamento Previsto:</span>
                  <span className="text-base font-bold text-[#DBAE3B]">
                    {formatBRL(todayRevenue)}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-white/10 border border-white/15">
                  <span className="text-stone-300 block text-[11px]">Próxima Cliente:</span>
                  <span className="text-xs font-bold text-white truncate block">
                    {nextClient ? `${nextClient.clientName} às ${nextClient.startTime}` : "Nenhuma agendada"}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-white/10 border border-white/15">
                  <span className="text-stone-300 block text-[11px]">Oportunidade Encaixe:</span>
                  <span className="text-xs font-bold text-emerald-300 truncate block">
                    {freeSlotInfo
                      ? `Janela livre às ${freeSlotInfo.time} (${freeSlotInfo.durationMin} min)`
                      : "Agenda contínua hoje"}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={handleCloseBriefing}
              className="p-1.5 sm:p-2 rounded-xl bg-white/10 hover:bg-white/20 text-stone-300 hover:text-white transition-colors shrink-0"
              title="Fechar briefing"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* 1. BANNER GAMIFICADO DE CONQUISTA DIÁRIA */}
      <div className="bg-gradient-to-r from-[#2D1914] via-[#44271F] to-[#1A0F0C] rounded-3xl p-6 sm:p-8 text-white shadow-lg border border-[#C59B27]/30 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-[#DBAE3B]/10 to-transparent rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div className="flex items-center space-x-2 text-[11px] uppercase font-bold tracking-widest text-[#DBAE3B] mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Painel Operacional • Espaço Gleicy Ronha</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mb-2">
              Bom dia, Gleicy! 🎯
            </h1>
            <p className="text-xs sm:text-sm text-stone-300 max-w-xl leading-relaxed">
              Você tem <strong>{todayAppointments.length} clientes agendadas</strong> para hoje.{" "}
              {inChemicalPauseAppointment && (
                <span className="text-amber-300 font-semibold">
                  Existe 1 janela de pausa química livre para encaixe paralelo!
                </span>
              )}
            </p>
          </div>

          {/* Barra de Progresso da Meta Diária (Gamificação em 3 Fases) */}
          <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/15 min-w-[280px] sm:min-w-[340px]">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="font-semibold text-stone-300 flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-[#DBAE3B]" />
                Meta Diária:
              </span>
              <span className="font-bold text-[#DBAE3B]">
                {formatBRL(todayRevenue)} / {formatBRL(dailyTargetRevenue)} ({targetPercent}%)
              </span>
            </div>
            <div className="w-full h-3 rounded-full bg-black/40 overflow-hidden shadow-inner">
              <div
                className={`h-full ${barGradient} transition-all duration-700 ease-out`}
                style={{ width: `${targetPercent}%` }}
              />
            </div>
            <div className="text-[11px] font-semibold text-amber-200 mt-2 leading-tight">
              {phaseText}
            </div>
            <div className="flex items-center justify-between text-[10px] text-stone-400 mt-1.5 pt-1.5 border-t border-white/10">
              <span>{todayAppointments.length} atendimentos</span>
              <span className="text-emerald-300 font-medium flex items-center gap-1">
                📈 {formatBRL(future14DaysRevenue)} já garantidos nos próximos 14 dias
              </span>
            </div>
          </div>
        </div>

        {/* Barra de Ações Rápidas */}
        <div className="relative z-10 mt-6 pt-6 border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <span className="text-xs text-stone-400">Data em exibição:</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => onDateChange(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-white/15 border border-white/20 text-xs font-semibold text-white outline-none"
            />
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={onOpenNewAppointment}
              className="px-4 py-2 text-xs font-bold text-[#2D1914] bg-[#DBAE3B] hover:bg-[#C59B27] rounded-xl shadow-xs transition-all flex items-center space-x-1.5 active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Novo Agendamento</span>
            </button>

            <button
              onClick={() => onOpenQuickProposal()}
              className="px-4 py-2 text-xs font-semibold text-white bg-white/15 hover:bg-white/25 rounded-xl border border-white/20 transition-all flex items-center space-x-1.5"
            >
              <FileText className="w-3.5 h-3.5 text-[#DBAE3B]" />
              <span>Criar Proposta Rápida</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. ALERTA DE TRIAGENS URGENTES PENDENTES */}
      {pendingTriages.length > 0 && (
        <div className="p-4 sm:p-5 rounded-2xl bg-amber-50/90 border border-amber-300 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-200 text-amber-900 flex items-center justify-center shrink-0">
              <AlertCircle className="w-5 h-5 text-amber-800" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-amber-900 block">
                Alerta de Atendimento Rápido
              </span>
              <h3 className="font-bold text-sm text-[#2D1914]">
                {pendingTriages.length} cliente(s) aguardando sua proposta personalizada!
              </h3>
              <p className="text-xs text-stone-600 mt-0.5">
                {pendingTriages[0].clientName} enviou respostas e fotos para <strong>{pendingTriages[0].serviceTitle}</strong>.
              </p>
            </div>
          </div>

          <button
            onClick={() => onOpenQuickProposal(pendingTriages[0])}
            className="px-4 py-2 text-xs font-bold text-white gold-gradient rounded-xl shadow-xs hover:opacity-95 flex items-center space-x-1.5 shrink-0"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Criar Proposta Agora</span>
          </button>
        </div>
      )}

      {/* 3. A NOVA LINHA DO TEMPO LINEAR HORIZONTAL (TORRE DE CONTROLE) */}
      <LinearTimelineMaster
        appointments={appointments}
        selectedDate={selectedDate}
        onSelectProposal={onViewProposal}
        onOpenNewAppointment={onOpenNewAppointment}
      />

      {/* 4. PAINEL DE PROJEÇÃO E EFICIÊNCIA DE ENCAIXES DO DIA */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna 1: Eficiência Operacional & Alavancagem de Faturamento */}
        <div className="p-5 rounded-2xl border border-[#E7DCCE] bg-white flex flex-col justify-between shadow-2xs">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] uppercase font-bold tracking-wider text-[#AD841D] flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-[#AD841D]" />
                Alavancagem de Horários
              </span>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                +100% Produtivo
              </span>
            </div>

            <h4 className="font-bold text-sm text-[#2D1914] mb-1">
              Encaixes em Pausas Químicas
            </h4>
            <p className="text-xs text-stone-500 leading-relaxed mb-4">
              Enquanto o produto age no cabelo da cliente em espera, você fatura atendendo outro procedimento na cadeira principal sem estender o horário de fechamento do salão.
            </p>

            <div className="p-3.5 rounded-xl bg-[#FAF7F2] border border-[#E7DCCE] text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-stone-600">Tempo de Cadeira Ativa:</span>
                <span className="font-bold text-[#2D1914]">3h 15min</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-stone-600">Pausas Químicas Aproveitadas:</span>
                <span className="font-bold text-amber-900">45 min livres</span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-[#E7DCCE]">
                <span className="font-semibold text-emerald-800">Faturamento Extra por Encaixe:</span>
                <span className="font-bold text-emerald-800">{formatBRL(380)}</span>
              </div>
            </div>
          </div>

          <button
            onClick={onOpenNewAppointment}
            className="mt-4 w-full py-2.5 px-3 text-xs font-bold text-[#2D1914] gold-gradient rounded-xl shadow-xs hover:opacity-95 flex items-center justify-center space-x-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Adicionar Novo Encaixe Inteligente</span>
          </button>
        </div>

        {/* Coluna 2: Próximas Clientes do Dia */}
        <div className="p-5 rounded-2xl border border-[#E7DCCE] bg-white flex flex-col justify-between shadow-2xs">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] uppercase font-bold tracking-wider text-[#AD841D] flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#AD841D]" />
                Próximas do Dia ({upcomingAppointments.length})
              </span>
              <span className="text-[10px] bg-stone-100 text-stone-600 font-bold px-2 py-0.5 rounded-full">
                Cronograma
              </span>
            </div>

            <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
              {upcomingAppointments.length === 0 ? (
                <p className="text-xs text-stone-400 py-8 text-center italic">
                  Nenhum próximo agendamento para esta data.
                </p>
              ) : (
                upcomingAppointments.map((apt) => (
                  <div
                    key={apt.id}
                    className="p-3 rounded-xl bg-[#FAF7F2] border border-[#E7DCCE]/60 flex items-center justify-between text-xs hover:border-[#AD841D]/40 transition-all"
                  >
                    <div>
                      <span className="font-bold text-[#2D1914] block">{apt.clientName}</span>
                      <span className="text-[11px] text-stone-500 truncate block max-w-[150px]">
                        {apt.serviceTitle}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="font-mono font-bold text-[#44271F] block">
                        {apt.startTime}
                      </span>
                      <span className="text-[10px] text-emerald-700 font-semibold">
                        {formatBRL(apt.price)}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[#E7DCCE]/60 text-center">
            <span className="text-[11px] text-stone-500">
              Total de atendimentos hoje: <strong>{todayAppointments.length}</strong>
            </span>
          </div>
        </div>

        {/* Coluna 3: Protocolo & Dicas de Segurança para os Procedimentos */}
        <div className="p-5 rounded-2xl border border-[#E7DCCE] bg-white flex flex-col justify-between shadow-2xs">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] uppercase font-bold tracking-wider text-[#AD841D] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#AD841D]" />
                Segurança Capilar do Dia
              </span>
              <span className="text-[10px] bg-amber-100 text-amber-900 font-bold px-2 py-0.5 rounded-full">
                Protocolo Ativo
              </span>
            </div>

            <h4 className="font-bold text-sm text-[#2D1914] mb-1">
              Controle de Tempo de Pausa Química
            </h4>
            <p className="text-xs text-stone-600 leading-relaxed mb-3">
              Cabelos cacheados e crespos exigem monitoramento rigoroso da barreira lipídica. Não ultrapasse a tolerância de <strong>55 minutos</strong> na descoloração / superclareadora.
            </p>

            <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-200 text-xs text-amber-950 space-y-1">
              <div className="font-bold text-amber-900 flex items-center gap-1">
                <span>🛡️ Dica Operacional Gleicy:</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                Ao término do corte da Débora, a mecha teste de Isa estará no ponto ideal de matização e acidificação para lavatório!
              </p>
            </div>
          </div>

          <button
            onClick={() => onOpenQuickProposal()}
            className="mt-4 w-full py-2 px-3 text-xs font-semibold text-[#44271F] bg-[#FAF7F2] border border-[#E7DCCE] hover:bg-stone-50 rounded-xl flex items-center justify-center space-x-1"
          >
            <FileText className="w-3.5 h-3.5 text-[#C59B27]" />
            <span>Criar Nova Proposta Personalizada</span>
          </button>
        </div>
      </div>
    </div>
  );
}
