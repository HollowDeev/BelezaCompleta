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
  Sparkles,
  AlertCircle,
  Plus,
  FileText,
  TrendingUp,
  CheckCircle2,
  Edit3,
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
  onConfirmAppointment?: (appointment: Appointment) => void;
  onEditAppointment?: (appointment: Appointment) => void;
  dailyTargetRevenue?: number;
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
  onConfirmAppointment,
  onEditAppointment,
  dailyTargetRevenue = 1500,
}: DayOperationViewProps) {
  // Filtra agendamentos do dia selecionado (apenas agendamentos reais/confirmados)
  const todayAppointments = appointments.filter(
    (a) =>
      a.date === selectedDate &&
      a.status !== "cancelled" &&
      a.status !== "pending_proposal" &&
      a.status !== "uncommitted_quote" &&
      !a.isUncommittedQuote
  );

  // Agendamentos diretos pendentes de confirmação (sem triagem)
  const pendingConfirmations = appointments.filter(
    (a) => a.status === "pending_confirmation" && !a.triageSubmissionId && !a.isUncommittedQuote
  );

  // Cálculos do Dia
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

  // Projeção de faturamento futuro: próximos 14 dias (confirmed e date > today)
  const future14DaysRevenue = appointments
    .filter((a) => {
      if (a.status !== "confirmed" || a.isUncommittedQuote) return false;
      const todayStr = new Date().toISOString().split("T")[0];
      const limitDate = new Date();
      limitDate.setDate(limitDate.getDate() + 14);
      const limitStr = limitDate.toISOString().split("T")[0];
      return a.date > todayStr && a.date <= limitStr;
    })
    .reduce((sum, a) => sum + (Number(a.price) || 0), 0);

  // Triagens pendentes com alerta urgente
  const pendingTriages = triageSubmissions.filter(
    (s) => s.status === "pending_review"
  );

  // Status de pausa química para a operação em tempo real
  const inChemicalPauseAppointment = todayAppointments.find(
    (a) => a.stepBlocks?.some((s) => s.type === "pause")
  );

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
      {/* 1. BANNER GAMIFICADO DE CONQUISTA DIÁRIA */}
      <div className="brand-green-gradient rounded-2xl sm:rounded-3xl p-4 sm:p-8 text-white shadow-lg border border-[#C7A03A]/40 relative overflow-hidden">
        {/* Pattern Oficial Dourado sobre Verde Profundo */}
        <div className="absolute inset-0 bg-pattern-gold-green opacity-15 pointer-events-none" />
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-[#C7A03A]/20 to-transparent rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div className="flex items-center space-x-2 text-[11px] uppercase font-bold tracking-widest text-[#D9B85F] mb-1">
              <Sparkles className="w-3.5 h-3.5 text-[#C7A03A]" />
              <span>Painel Operacional • Espaço Gleicy Ronha</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-sans">
              Bom dia, Gleicy! 🎯
            </h1>

            {/* Grafismo Oficial 1 - Linha Orgânica Dourada */}
            <div className="relative w-40 sm:w-52 h-3 my-2 opacity-85 pointer-events-none">
              <img
                src="/brand/Grafismos/linha-grafismo-1.png"
                alt=""
                className="w-full h-full object-contain object-left"
              />
            </div>

            <p className="text-xs sm:text-sm text-[#F0EFE3] max-w-xl leading-relaxed">
              Você tem <strong>{todayAppointments.length} clientes agendadas</strong> para hoje.{" "}
              {inChemicalPauseAppointment && (
                <span className="text-[#D9B85F] font-semibold">
                  Existe 1 janela de pausa química livre para encaixe paralelo!
                </span>
              )}
            </p>
          </div>

          {/* Barra de Progresso da Meta Diária (Gamificação em 3 Fases) */}
          <div className="bg-white/10 backdrop-blur-md p-3.5 sm:p-4 rounded-2xl border border-white/20 w-full lg:w-auto lg:min-w-[340px] shadow-sm">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="font-semibold text-[#F0EFE3] flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-[#D9B85F]" />
                Meta Diária:
              </span>
              <span className="font-bold text-[#D9B85F]">
                {formatBRL(todayRevenue)} / {formatBRL(dailyTargetRevenue)} ({targetPercent}%)
              </span>
            </div>
            <div className="w-full h-3 rounded-full bg-black/40 overflow-hidden shadow-inner">
              <div
                className={`h-full ${barGradient} transition-all duration-700 ease-out`}
                style={{ width: `${targetPercent}%` }}
              />
            </div>
            <div className="text-[11px] font-semibold text-[#F6ECCF] mt-2 leading-tight">
              {phaseText}
            </div>
            <div className="flex items-center justify-between text-[10px] text-stone-300 mt-1.5 pt-1.5 border-t border-white/10">
              <span>{todayAppointments.length} atendimentos</span>
              <span className="text-emerald-300 font-medium flex items-center gap-1">
                📈 {formatBRL(future14DaysRevenue)} já garantidos nos próximos 14 dias
              </span>
            </div>
          </div>
        </div>

        {/* Barra de Ações Rápidas */}
        <div className="relative z-10 mt-5 pt-5 sm:mt-6 sm:pt-6 border-t border-white/15 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <span className="text-xs text-[#F0EFE3]">Data em exibição:</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => onDateChange(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-white/20 border border-white/25 text-xs font-semibold text-white outline-none focus:border-[#C7A03A]"
            />
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={onOpenNewAppointment}
              className="px-4 py-2 text-xs font-bold text-[#1D3D3C] gold-gradient hover:opacity-95 rounded-xl shadow-xs transition-all flex items-center space-x-1.5 active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Novo Agendamento</span>
            </button>

            <button
              onClick={() => onOpenQuickProposal()}
              className="px-4 py-2 text-xs font-semibold text-white bg-white/15 hover:bg-white/25 rounded-xl border border-white/20 transition-all flex items-center space-x-1.5"
            >
              <FileText className="w-3.5 h-3.5 text-[#D9B85F]" />
              <span>Criar Proposta Rápida</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. ALERTA DE AGENDAMENTOS DIRETOS PENDENTES DE CONFIRMAÇÃO (R4.1, R4.2) */}
      {pendingConfirmations.length > 0 && (
        <div data-tutorial="pending-confirmations-box" className="p-4 sm:p-5 rounded-2xl bg-amber-50/90 border border-[#C7A03A]/60 shadow-xs flex flex-col space-y-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-start space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-[#FCF9F0] border border-[#C7A03A]/60 text-[#80611F] flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5 text-[#80611F]" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-[#80611F] block">
                  Confirmação Necessária • Agendamento sem Triagem
                </span>
                <h3 className="font-bold text-sm text-[#2D1914]">
                  {pendingConfirmations.length} agendamento(s) direto(s) aguardando sua confirmação!
                </h3>
                <p className="text-xs text-stone-600 mt-0.5">
                  Ao confirmar, o horário é consolidado na grade e o WhatsApp com as orientações do salão é aberto automaticamente.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t border-[#C7A03A]/30">
            {pendingConfirmations.map((apt) => (
              <div
                key={apt.id}
                className="p-3 bg-white rounded-xl border border-[#E7DCCE] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-2xs"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#2D1914]">{apt.clientName}</span>
                    <span className="text-stone-400">•</span>
                    <span className="font-mono text-[#AD841D] font-bold">{apt.date} às {apt.startTime}</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                      Pendente
                    </span>
                  </div>
                  <div className="text-stone-500 text-[11px] flex items-center gap-2">
                    <span>{apt.serviceTitle}</span>
                    <span>•</span>
                    <span className="font-semibold text-emerald-700">{formatBRL(apt.price)}</span>
                    {apt.clientPhone && (
                      <>
                        <span>•</span>
                        <span>WhatsApp: {apt.clientPhone}</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  {onEditAppointment && (
                    <button
                      type="button"
                      onClick={() => onEditAppointment(apt)}
                      className="px-3 py-1.5 rounded-xl border border-[#D8D0BD] text-[#2D1914] bg-[#FAF7F2] hover:bg-[#EEE8DD] font-semibold text-xs flex items-center gap-1 transition-colors"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-[#AD841D]" />
                      <span>Editar</span>
                    </button>
                  )}
                  {onConfirmAppointment && (
                    <button
                      type="button"
                      onClick={() => onConfirmAppointment(apt)}
                      className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-xs flex items-center gap-1.5 transition-all active:scale-95"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Confirmar &amp; Abrir WhatsApp</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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
      <div data-tutorial="timeline-container">
        <LinearTimelineMaster
          appointments={appointments}
          selectedDate={selectedDate}
          onSelectProposal={onViewProposal}
          onOpenNewAppointment={onOpenNewAppointment}
        />
      </div>
    </div>
  );
}
