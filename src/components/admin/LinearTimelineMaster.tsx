"use client";

import { useState, useEffect, useRef } from "react";
import { Appointment, ScheduledStepBlock } from "@/types/appointment";
import { formatBRL, formatTimeHHmm, parseHHmmToMinutes } from "@/lib/utils";
import { soundManager } from "@/lib/sound/chime";
import {
  Clock,
  Scissors,
  Hourglass,
  CheckCircle2,
  AlertTriangle,
  Zap,
  Sparkles,
  Info,
  Calendar,
  Volume2,
  VolumeX,
  BellRing,
  ArrowRight,
  ShieldAlert,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Sliders,
  ZoomIn,
  ZoomOut,
  SlidersHorizontal,
} from "lucide-react";

interface LinearTimelineMasterProps {
  appointments: Appointment[];
  selectedDate: string;
  onUpdateAppointment?: (apt: Appointment) => void;
  onSelectProposal?: (proposalId: string) => void;
  onOpenNewAppointment?: () => void;
}

export function LinearTimelineMaster({
  appointments,
  selectedDate,
  onUpdateAppointment,
  onSelectProposal,
  onOpenNewAppointment,
}: LinearTimelineMasterProps) {
  // Obtém o horário real atual em minutos decorridos desde 00:00
  const getNowMinutes = () => {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;
  };

  // Linha do tempo SEMPRE trabalhando automaticamente com o horário real do dia
  const [simulatedMinutes, setSimulatedMinutes] = useState<number>(14 * 60);
  const [isManualScrub, setIsManualScrub] = useState<boolean>(false);

  // Escala de zoom (pixels por minuto): padrão 8px/min (30m = 240px, 45m = 360px)
  const [pxPerMinute, setPxPerMinute] = useState<number>(8);

  // Som ativado ou mudo
  const [isMuted, setIsMuted] = useState(false);

  // Tolerância manual em segundos adicionada (+5 min, etc.) por agendamento
  const [manualTolerance, setManualTolerance] = useState<Record<string, number>>({});

  // Accordion colapsável para os cards de etapas dos procedimentos
  const [isAccordionOpen, setIsAccordionOpen] = useState(true);

  // Alertas sonoros disparados
  const warnedTwoMinutes = useRef<Record<string, boolean>>({});
  const warnedTimeUp = useRef<Record<string, boolean>>({});

  // Faixa de horários coberta na régua: das 07:00 às 20:00 (para rolagem suave nas bordas)
  const rulerStartMin = 7 * 60; // 07:00 (420 min)
  const rulerEndMin = 20 * 60; // 20:00 (1200 min)

  // Marcadores de horário de 15 em 15 minutos (principais de 30 em 30 min)
  const timeMarkers: number[] = [];
  for (let m = rulerStartMin; m <= rulerEndMin; m += 15) {
    timeMarkers.push(m);
  }

  // Agendamentos filtrados para o dia selecionado (apenas agendamentos reais/confirmados)
  const dayAppointments = appointments.filter(
    (a) => a.date === selectedDate && a.status !== "cancelled" && a.status !== "pending_proposal"
  );

  // Filtra agendamentos elegíveis: ativos agora OU que iniciam em até 5 minutos
  const activeOrImminentAppointments = dayAppointments.filter((apt) => {
    if (!apt.stepBlocks || apt.stepBlocks.length === 0) return false;
    const firstStart = parseHHmmToMinutes(apt.stepBlocks[0].startTime);
    const lastEnd = parseHHmmToMinutes(apt.stepBlocks[apt.stepBlocks.length - 1].endTime);
    // Exibe a partir de 5 minutos antes da 1ª etapa até o término da última etapa
    return simulatedMinutes >= firstStart - 5 && simulatedMinutes <= lastEnd;
  });

  // Próximo agendamento futuro do dia (para o aviso caso nenhum esteja ativo no momento)
  const nextUpcomingAppointment = dayAppointments
    .filter((apt) => {
      if (!apt.stepBlocks || apt.stepBlocks.length === 0) return false;
      const firstStart = parseHHmmToMinutes(apt.stepBlocks[0].startTime);
      return firstStart > simulatedMinutes;
    })
    .sort((a, b) => {
      const startA = parseHHmmToMinutes(a.stepBlocks![0].startTime);
      const startB = parseHHmmToMinutes(b.stepBlocks![0].startTime);
      return startA - startB;
    })[0];

  // Cálculo Universal e Dinâmico do Tempo de Qualquer Agendamento com base no Ponteiro
  const getAppointmentTiming = (apt?: Appointment | null) => {
    if (!apt || !apt.stepBlocks || apt.stepBlocks.length === 0) {
      return {
        activeStep: null,
        activeStepIndex: -1,
        remainingSeconds: 0,
        elapsedSeconds: 0,
        totalStepSeconds: 0,
        progressPercent: 0,
        status: "idle" as const,
      };
    }

    const currentIdx = apt.stepBlocks.findIndex((s) => {
      const start = parseHHmmToMinutes(s.startTime);
      const end = parseHHmmToMinutes(s.endTime);
      return simulatedMinutes >= start && simulatedMinutes < end;
    });

    if (currentIdx >= 0) {
      const step = apt.stepBlocks[currentIdx];
      const startMin = parseHHmmToMinutes(step.startTime);
      const endMin = parseHHmmToMinutes(step.endTime);
      const totalSec = (endMin - startMin) * 60;
      const elapsedSec = (simulatedMinutes - startMin) * 60;
      const extraSec = manualTolerance[apt.id] || 0;
      const remainingSec = Math.max(0, Math.round(totalSec - elapsedSec + extraSec));
      const progress = Math.min(100, Math.max(0, (elapsedSec / (totalSec + extraSec)) * 100));

      return {
        activeStep: step,
        activeStepIndex: currentIdx,
        remainingSeconds: remainingSec,
        elapsedSeconds: elapsedSec,
        totalStepSeconds: totalSec + extraSec,
        progressPercent: progress,
        status: "active" as const,
      };
    }

    // Se estiver antes da primeira etapa
    const firstStep = apt.stepBlocks[0];
    const firstStart = parseHHmmToMinutes(firstStep.startTime);
    if (simulatedMinutes < firstStart) {
      const startsInSec = Math.round((firstStart - simulatedMinutes) * 60);
      return {
        activeStep: firstStep,
        activeStepIndex: 0,
        remainingSeconds: startsInSec,
        elapsedSeconds: 0,
        totalStepSeconds: (parseHHmmToMinutes(firstStep.endTime) - firstStart) * 60,
        progressPercent: 0,
        status: "upcoming" as const,
      };
    }

    // Se já passou do fim da última etapa
    const lastStep = apt.stepBlocks[apt.stepBlocks.length - 1];
    return {
      activeStep: lastStep,
      activeStepIndex: apt.stepBlocks.length - 1,
      remainingSeconds: 0,
      elapsedSeconds: 0,
      totalStepSeconds: 0,
      progressPercent: 100,
      status: "completed" as const,
    };
  };

  // Efeito do relógio contínuo trabalhando automaticamente com o horário real
  useEffect(() => {
    setSimulatedMinutes(getNowMinutes());

    const timer = setInterval(() => {
      if (!isManualScrub) {
        setSimulatedMinutes(getNowMinutes());
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [isManualScrub]);

  // Efeito para disparar avisos sonoros sincronizados
  useEffect(() => {
    dayAppointments.forEach((apt) => {
      const timing = getAppointmentTiming(apt);
      if (timing.status === "active") {
        if (timing.remainingSeconds <= 120 && timing.remainingSeconds > 115 && !warnedTwoMinutes.current[apt.id]) {
          warnedTwoMinutes.current[apt.id] = true;
          soundManager.playGentleChime();
        }
        if (timing.remainingSeconds === 0 && !warnedTimeUp.current[apt.id]) {
          warnedTimeUp.current[apt.id] = true;
          soundManager.playTimeUpAlert();
        }
      }
    });
  }, [simulatedMinutes, dayAppointments]);

  // Alterna o som mudo
  const handleToggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    soundManager.setMuted(nextMuted);
  };

  const handleTestSound = () => {
    soundManager.playGentleChime();
  };

  // Avançar manualmente uma etapa com 1 clique (avança a régua até o início da próxima)
  const [undoState, setUndoState] = useState<{ aptId: string; prevMinutes: number; clientName: string } | null>(null);

  const handleManualAdvanceStep = (aptId: string) => {
    const targetApt = dayAppointments.find((a) => a.id === aptId);
    if (!targetApt || !targetApt.stepBlocks) return;

    const timing = getAppointmentTiming(targetApt);
    if (timing.activeStep) {
      const prevMinutes = simulatedMinutes;
      const nextTimeMin = parseHHmmToMinutes(timing.activeStep.endTime);
      setSimulatedMinutes(nextTimeMin);
      warnedTimeUp.current[aptId] = false;
      warnedTwoMinutes.current[aptId] = false;

      // Salva estado para botão Desfazer com timer de 6s
      setUndoState({ aptId, prevMinutes, clientName: targetApt.clientName });
      setTimeout(() => {
        setUndoState((curr) => (curr?.prevMinutes === prevMinutes ? null : curr));
      }, 6000);
    }
  };

  const handleUndoAdvance = () => {
    if (!undoState) return;
    setSimulatedMinutes(undoState.prevMinutes);
    setUndoState(null);
  };

  // Adicionar +5 minutos de tolerância na etapa atual
  const handleAddFiveMinutes = (aptId: string) => {
    setManualTolerance((prev) => ({
      ...prev,
      [aptId]: (prev[aptId] || 0) + 5 * 60,
    }));
    warnedTimeUp.current[aptId] = false;
  };

  // Formata segundos em MM:SS
  const formatCountdown = (totalSeconds: number) => {
    if (totalSeconds <= 0) return "00:00";
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  // Sincronizar com a hora real do sistema (computador)
  const handleSyncWithRealTime = () => {
    setIsManualScrub(false);
    setSimulatedMinutes(getNowMinutes());
  };

  // CÁLCULO DA POSIÇÃO DA FAIXA EM MOVIMENTO (TRANSLAÇÃO X):
  // O ponteiro vermelho está FIXO exatamente no centro horizontal (50%).
  // Definimos left: '50%' no container para que a origem (0) fique no centro exato da viewport,
  // e transladamos em -simulatedMinutes * pxPerMinute para que o minuto simulado coincida exatamente com o centro!
  const movingTrackStyle: React.CSSProperties = {
    left: "50%",
    transform: `translateX(-${simulatedMinutes * pxPerMinute}px)`,
  };
  // Alias de compatibilidade retroativa para evitar ReferenceError durante hot-reload do Turbopack
  const movingTrackTransform = movingTrackStyle.transform;

  return (
    <div className="bg-white/80 backdrop-blur-md rounded-3xl p-5 sm:p-7 border border-[#D8D0BD] shadow-xs space-y-6 relative overflow-hidden">
      {/* ============================================================== */}
      {/* 1. CABEÇALHO DA TORRE DE CONTROLE & PAINEL DE CONTROLE DE HORÁRIOS */}
      {/* ============================================================== */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#D8D0BD]/70 pb-5">
        <div>
          <div className="flex items-center space-x-2 text-[10px] uppercase font-bold tracking-widest text-[#80611F] mb-1">
            <Zap className="w-3.5 h-3.5 text-[#C7A03A]" />
            <span>Torre de Controle Operacional • Régua Dinâmica Centralizada</span>
          </div>

          <h2 className="text-xl sm:text-2xl font-bold text-[#1D3D3C] flex items-center gap-2 font-sans">
            <span>Visão Operacional do Dia &amp; Encaixes Sincronizados</span>
          </h2>

          {/* Grafismo Oficial 1 - Linha Orgânica Dourada */}
          <div className="relative w-36 sm:w-48 h-2.5 my-1.5 opacity-80 pointer-events-none">
            <img
              src="/brand/Grafismos/Linha grafismo 1.png"
              alt=""
              className="w-full h-full object-contain object-left"
            />
          </div>

          <p className="text-xs text-[#736455] mt-0.5">
            Ponteiro fixo no centro: a régua desliza continuamente para a esquerda conforme o tempo passa, mantendo procedimentos simultâneos perfeitamente alinhados um acima do outro.
          </p>
        </div>

        {/* Controles de Momento, Áudio e Cenários */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Botão de Som / Mudo */}
          <button
            onClick={handleToggleMute}
            className={`p-2.5 rounded-xl border text-xs font-bold flex items-center space-x-1.5 transition-all ${
              isMuted
                ? "bg-stone-100 text-stone-500 border-stone-200"
                : "bg-amber-50 text-[#AD841D] border-amber-200 hover:bg-amber-100"
            }`}
            title={isMuted ? "Ativar som dos alertas" : "Silenciar alertas sonoros"}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            <span className="hidden sm:inline">{isMuted ? "Mudo" : "Som Ativo"}</span>
          </button>

          <button
            onClick={handleTestSound}
            className="px-2.5 py-2 text-[11px] font-semibold text-stone-600 hover:text-[#2D1914] bg-[#FAF7F2] hover:bg-stone-100 rounded-xl border border-[#E7DCCE] flex items-center space-x-1"
            title="Ouvir toque suave do alarme"
          >
            <BellRing className="w-3.5 h-3.5 text-[#AD841D]" />
            <span className="hidden md:inline">Testar Toque</span>
          </button>

          {/* Ajuste de Zoom da Régua */}
          <div className="flex items-center space-x-1 p-1 bg-[#FAF7F2] rounded-xl border border-[#E7DCCE]">
            <button
              onClick={() => setPxPerMinute((p) => Math.max(5, p - 1.5))}
              className="p-1.5 text-stone-500 hover:text-stone-800 hover:bg-white rounded-lg transition-all"
              title="Reduzir zoom da régua"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-[10px] font-mono font-bold text-stone-600 px-1">
              {pxPerMinute}px/m
            </span>
            <button
              onClick={() => setPxPerMinute((p) => Math.min(12, p + 1.5))}
              className="p-1.5 text-stone-500 hover:text-stone-800 hover:bg-white rounded-lg transition-all"
              title="Aumentar zoom da régua"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Relógio do Horário Real & Status */}
          <div className="p-2 bg-[#FAF7F2] rounded-xl border border-[#E7DCCE] flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse ml-1" />
            <span className="text-xs font-bold text-[#2D1914]">Horário Real:</span>
            <span className="font-mono text-sm font-extrabold text-rose-700 bg-white px-2.5 py-0.5 rounded-md border border-rose-200 shadow-2xs">
              {formatTimeHHmm(Math.floor(simulatedMinutes))}
            </span>

            {/* Status ou Botão para Voltar ao Horário Real caso a Gleicy arraste a régua */}
            {isManualScrub && Math.abs(simulatedMinutes - getNowMinutes()) > 0.5 ? (
              <button
                onClick={() => {
                  setIsManualScrub(false);
                  setSimulatedMinutes(getNowMinutes());
                }}
                className="p-1 px-2.5 rounded-lg border text-xs font-bold bg-rose-50 text-rose-700 border-rose-300 hover:bg-rose-100 transition-all flex items-center gap-1.5 shadow-2xs animate-pulse"
                title="Retornar a régua ao horário real de agora"
              >
                <Clock className="w-3.5 h-3.5 text-rose-600" />
                <span className="text-[10px]">Voltar ao Agora</span>
              </button>
            ) : (
              <div className="hidden sm:flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Ao Vivo</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 2. ACCORDION COLAPSÁVEL: PROCEDIMENTOS EM ANDAMENTO             */}
      {/* (Exibido 5 min antes de iniciar até o término do procedimento) */}
      {/* ============================================================== */}
      <div className="rounded-2xl border border-[#D8D0BD] bg-white overflow-hidden shadow-2xs">
        {/* Barra de Topo do Accordion */}
        <button
          onClick={() => setIsAccordionOpen(!isAccordionOpen)}
          className="w-full p-4 sm:p-5 flex items-center justify-between text-left hover:bg-[#FAF7F2]/80 transition-colors"
        >
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl brand-green-gradient border border-[#C7A03A]/40 flex items-center justify-center text-[#D9B85F] shrink-0 shadow-xs">
              <Scissors className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] uppercase font-bold tracking-wider text-[#80611F]">
                  Cockpit Operacional
                </span>
                <span
                  className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                    activeOrImminentAppointments.length > 0
                      ? "bg-emerald-100 text-emerald-800 animate-pulse border border-emerald-300"
                      : "bg-[#F0EFE3] text-[#707956] border border-[#D3D0B5]"
                  }`}
                >
                  {activeOrImminentAppointments.length > 0
                    ? `${activeOrImminentAppointments.length} em atendimento / iminente`
                    : "Sem atendimento ativo agora"}
                </span>
              </div>
              <h3 className="font-bold text-sm sm:text-base text-[#1D3D3C] font-sans">
                Cards de Etapas dos Procedimentos
              </h3>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold text-[#736455] hidden sm:inline">
              {isAccordionOpen ? "Recolher Painel" : "Expandir Painel"}
            </span>
            <div className="w-8 h-8 rounded-xl bg-[#FAF7F2] border border-[#D8D0BD] flex items-center justify-center text-[#1D3D3C] transition-transform">
              {isAccordionOpen ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </div>
          </div>
        </button>

        {/* Conteúdo Expansível do Accordion */}
        {isAccordionOpen && (
          <div className="p-4 sm:p-6 border-t border-[#E7DCCE]/60 bg-[#FAF7F2]/30 space-y-4">
            {activeOrImminentAppointments.length === 0 ? (
              /* Estado Ocioso Elegante quando não houver procedimento nos 5 min */
              <div className="p-4 sm:p-5 rounded-2xl bg-white border border-[#E7DCCE] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs shadow-2xs">
                <div className="flex items-start sm:items-center space-x-3">
                  <div className="w-9 h-9 rounded-xl bg-stone-100 text-stone-500 flex items-center justify-center shrink-0">
                    <Clock className="w-4 h-4 text-stone-400" />
                  </div>
                  <div>
                    <span className="font-bold text-[#2D1914] block">
                      Nenhum procedimento em execução neste momento
                    </span>
                    <span className="text-stone-500 text-[11px] block mt-0.5">
                      {nextUpcomingAppointment ? (
                        <>
                          Próximo atendimento: <strong>{nextUpcomingAppointment.clientName}</strong> às{" "}
                          <strong>{nextUpcomingAppointment.startTime}</strong> ({nextUpcomingAppointment.serviceTitle})
                        </>
                      ) : (
                        "Todos os atendimentos de hoje já foram finalizados ou não há agendamentos restantes."
                      )}
                    </span>
                  </div>
                </div>

                {nextUpcomingAppointment && (
                  <span className="text-[10px] uppercase font-bold tracking-wider px-3 py-1 rounded-full bg-amber-50 text-amber-900 border border-amber-200 shrink-0">
                    Inicia às {nextUpcomingAppointment.startTime}
                  </span>
                )}
              </div>
            ) : (
              /* Grid Dinâmico dos Cards de Procedimentos Ativos / Iminentes */
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {activeOrImminentAppointments.map((apt) => {
                  const timing = getAppointmentTiming(apt);
                  const isPause = timing.activeStep?.type === "pause";
                  const isUpcoming = timing.status === "upcoming";

                  return (
                    <div
                      key={apt.id}
                      className={`rounded-2xl p-4 sm:p-5 shadow-md relative overflow-hidden flex flex-col justify-between ${
                        isPause
                          ? "bg-gradient-to-br from-amber-50/95 to-amber-100/90 border-2 border-dashed border-amber-500 text-[#2D1914]"
                          : isUpcoming
                          ? "bg-gradient-to-br from-[#FAF7F2] to-[#F5ECE1] border-2 border-[#DBAE3B]/70 text-[#2D1914]"
                          : "bg-gradient-to-br from-[#2D1914] to-[#1A0F0C] text-white border-2 border-[#C59B27]"
                      }`}
                    >
                      {!isPause && !isUpcoming && (
                        <div className="absolute top-0 right-0 w-36 h-36 bg-[#DBAE3B]/10 rounded-full blur-2xl pointer-events-none" />
                      )}

                      <div>
                        {/* Status da Cadeira */}
                        <div className="flex items-center justify-between mb-3">
                          <span
                            className={`text-[10px] uppercase font-bold tracking-wider flex items-center gap-1.5 ${
                              isPause
                                ? "text-amber-950"
                                : isUpcoming
                                ? "text-[#AD841D]"
                                : "text-[#DBAE3B]"
                            }`}
                          >
                            {isPause ? (
                              <>
                                <Hourglass className="w-3.5 h-3.5 text-amber-700 animate-spin-slow" />
                                Poltrona de Espera • Pausa Química
                              </>
                            ) : isUpcoming ? (
                              <>
                                <Clock className="w-3.5 h-3.5 text-[#AD841D] animate-pulse" />
                                Preparação (Faltam {Math.max(1, Math.ceil(timing.remainingSeconds / 60))}m)
                              </>
                            ) : (
                              <>
                                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                                Cadeira Principal • Mãos na Massa
                              </>
                            )}
                          </span>

                          <span
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                              isPause
                                ? "bg-amber-200 text-amber-950 border-amber-300"
                                : isUpcoming
                                ? "bg-[#DBAE3B]/20 text-[#5E372C] border-[#DBAE3B]/30"
                                : "bg-white/10 text-stone-200 border-white/15"
                            }`}
                          >
                            {isPause
                              ? "Janela Livre p/ Encaixe"
                              : isUpcoming
                              ? "Inicia em Breve"
                              : "Atenção Exclusiva da Gleicy"}
                          </span>
                        </div>

                        {/* Identificação da Cliente */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center space-x-3">
                            <div
                              className={`w-11 h-11 rounded-2xl font-extrabold text-sm flex items-center justify-center shrink-0 shadow-xs ${
                                isPause
                                  ? "bg-amber-200 text-amber-950 border border-amber-300"
                                  : isUpcoming
                                  ? "bg-white text-[#5E372C] border border-[#E7DCCE]"
                                  : "gold-gradient text-[#2D1914]"
                              }`}
                            >
                              {apt.clientName.charAt(0)}
                            </div>
                            <div>
                              <h3
                                className={`font-bold text-base ${
                                  isPause || isUpcoming ? "text-[#2D1914]" : "text-white"
                                }`}
                              >
                                {apt.clientName}
                              </h3>
                              <p
                                className={`text-xs ${
                                  isPause
                                    ? "text-amber-900 font-medium"
                                    : isUpcoming
                                    ? "text-stone-600 font-medium"
                                    : "text-stone-300"
                                }`}
                              >
                                {apt.serviceTitle}
                              </p>
                            </div>
                          </div>

                          {apt.proposalId && onSelectProposal && (
                            <button
                              onClick={() => onSelectProposal(apt.proposalId!)}
                              className={`text-[11px] font-semibold hover:underline ${
                                isPause ? "text-[#7B493B]" : isUpcoming ? "text-[#AD841D]" : "text-[#DBAE3B]"
                              }`}
                            >
                              Ver Proposta
                            </button>
                          )}
                        </div>

                        {/* Bloco de Progresso & Cronômetro */}
                        <div
                          className={`mt-4 p-3.5 rounded-xl border ${
                            isPause
                              ? "bg-white/95 border-amber-300/80 shadow-xs"
                              : isUpcoming
                              ? "bg-white/90 border-[#E7DCCE]"
                              : "bg-white/10 backdrop-blur-md border-white/15"
                          }`}
                        >
                          <div
                            className={`flex items-center justify-between text-xs mb-1 ${
                              isPause ? "text-amber-900" : isUpcoming ? "text-stone-700" : "text-stone-300"
                            }`}
                          >
                            <span className="flex items-center gap-1.5 font-semibold truncate">
                              {isPause ? (
                                <Hourglass className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                              ) : (
                                <Scissors
                                  className={`w-3.5 h-3.5 shrink-0 ${
                                    isUpcoming ? "text-[#AD841D]" : "text-[#DBAE3B]"
                                  }`}
                                />
                              )}
                              {isUpcoming ? "1ª Etapa: " : "Etapa Atual: "}
                              <strong className={isPause || isUpcoming ? "text-[#2D1914]" : "text-white"}>
                                {timing.activeStep?.stepTitle || "Atendimento"}
                              </strong>
                            </span>
                            <span
                              className={`text-[11px] font-mono shrink-0 ml-2 ${
                                isPause || isUpcoming ? "text-stone-600 font-bold" : "text-stone-300"
                              }`}
                            >
                              Etapa {(timing.activeStepIndex ?? 0) + 1} de {apt.stepBlocks?.length || 1}
                            </span>
                          </div>

                          <div
                            className={`flex items-center justify-between py-2 border-y my-2 ${
                              isPause
                                ? "border-amber-100"
                                : isUpcoming
                                ? "border-stone-200"
                                : "border-white/10"
                            }`}
                          >
                            <div>
                              <span
                                className={`text-[10px] uppercase font-bold tracking-wider block ${
                                  isPause
                                    ? "text-amber-800"
                                    : isUpcoming
                                    ? "text-stone-500"
                                    : "text-stone-400"
                                }`}
                              >
                                {isUpcoming
                                  ? "Inicia em:"
                                  : isPause
                                  ? "Faltam para enxágue:"
                                  : "Tempo restante da etapa:"}
                              </span>
                              <span
                                className={`font-mono text-3xl sm:text-4xl font-extrabold tracking-tight ${
                                  isUpcoming
                                    ? "text-[#AD841D]"
                                    : isPause
                                    ? timing.remainingSeconds <= 120
                                      ? "text-rose-600 animate-pulse"
                                      : "text-amber-900"
                                    : "text-[#DBAE3B]"
                                }`}
                              >
                                {formatCountdown(timing.remainingSeconds ?? 0)}
                              </span>
                            </div>

                            <div className="text-right">
                              <span
                                className={`text-[10px] block ${
                                  isPause || isUpcoming ? "text-stone-500" : "text-stone-400"
                                }`}
                              >
                                Próxima Etapa:
                              </span>
                              <span
                                className={`text-xs font-semibold ${
                                  isPause || isUpcoming ? "text-stone-700" : "text-stone-200"
                                }`}
                              >
                                {apt.stepBlocks?.[(timing.activeStepIndex ?? 0) + 1]?.stepTitle ||
                                  "Conclusão do Atendimento"}
                              </span>
                            </div>
                          </div>

                          <div className="space-y-1 mt-1">
                            <div
                              className={`w-full h-2 rounded-full overflow-hidden flex ${
                                isPause
                                  ? "bg-amber-100"
                                  : isUpcoming
                                  ? "bg-stone-200"
                                  : "bg-black/40"
                              }`}
                            >
                              <div
                                className={`h-full transition-all duration-1000 ${
                                  isPause
                                    ? timing.remainingSeconds <= 120
                                      ? "bg-rose-500"
                                      : timing.remainingSeconds <= 5 * 60
                                      ? "bg-amber-500"
                                      : "bg-emerald-500"
                                    : "gold-gradient"
                                }`}
                                style={{
                                  width: `${isUpcoming ? 0 : timing.progressPercent ?? 0}%`,
                                }}
                              />
                            </div>
                            {isPause && (
                              <div className="flex items-center justify-between text-[10px] text-amber-950 font-medium">
                                <span>Mínimo: 30 min</span>
                                <span className="font-bold text-[#AD841D]">Ideal: 45 min</span>
                                <span className="text-rose-700 font-bold">Máx Seguro: 55 min</span>
                              </div>
                            )}
                          </div>

                          {isPause && (timing.remainingSeconds ?? 0) === 0 && (
                            <div className="mt-2 p-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center justify-between animate-pulse">
                              <span className="flex items-center gap-1.5">
                                <AlertTriangle className="w-4 h-4 text-rose-600" />
                                Tempo esgotado! Enxaguar agora!
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Botões de Ação na Etapa */}
                      <div
                        className={`mt-4 pt-3 border-t flex items-center justify-between gap-2 ${
                          isPause
                            ? "border-amber-200/80"
                            : isUpcoming
                            ? "border-stone-200"
                            : "border-white/10"
                        }`}
                      >
                        <button
                          onClick={() => handleAddFiveMinutes(apt.id)}
                          className={`min-h-[46px] sm:min-h-[50px] px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold border transition-all active:scale-95 ${
                            isPause
                              ? "bg-amber-200 hover:bg-amber-300 text-amber-950 border-amber-300"
                              : isUpcoming
                              ? "bg-white hover:bg-stone-100 text-[#5E372C] border-[#E7DCCE]"
                              : "bg-white/10 hover:bg-white/20 text-white border-white/20"
                          }`}
                          title="Adiciona 5 minutos de tolerância na etapa atual"
                        >
                          +5 min
                        </button>

                        <button
                          onClick={() => handleManualAdvanceStep(apt.id)}
                          className={`min-h-[46px] sm:min-h-[50px] px-5 sm:px-6 py-2 rounded-xl text-xs sm:text-sm font-extrabold shadow-md transition-all flex items-center justify-center space-x-2 active:scale-95 flex-1 max-w-xs ${
                            isPause
                              ? "bg-amber-600 hover:bg-amber-700 text-white"
                              : "gold-gradient text-[#2D1914]"
                          }`}
                        >
                          <span>
                            {isUpcoming
                              ? "Iniciar Atendimento"
                              : isPause
                              ? "Levar ao Lavatório"
                              : "Concluir Etapa & Avançar"}
                          </span>
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ============================================================== */}
      {/* 3. BARRA DE NAVEGAÇÃO DA RÉGUA (DESPOLUÍDA)                      */}
      {/* ============================================================== */}
      <div className="p-3.5 rounded-2xl bg-[#FDFBF7] border border-[#E7DCCE] flex items-center justify-between gap-4">
        <div className="flex items-center space-x-2 text-xs font-semibold text-[#5E372C]">
          <Clock className="w-4 h-4 text-[#C59B27]" />
          <span className="hidden sm:inline">Navegar pela Régua do Dia:</span>
        </div>

        {/* Scrubber Slider Deslizante para Olhar Outros Horários */}
        <div className="flex items-center space-x-3 flex-1 max-w-xl">
          <span className="text-[11px] font-mono font-semibold text-stone-500 shrink-0">07:00</span>
          <input
            type="range"
            min={7 * 60}
            max={20 * 60}
            step={1}
            value={Math.floor(simulatedMinutes)}
            onChange={(e) => {
              setIsManualScrub(true);
              setSimulatedMinutes(Number(e.target.value));
            }}
            className="w-full accent-rose-600 cursor-pointer h-1.5 bg-stone-200 rounded-lg"
            title="Arraste para inspecionar horários passados ou futuros na régua"
          />
          <span className="text-[11px] font-mono font-semibold text-stone-500 shrink-0">20:00</span>
        </div>
      </div>

      {/* Legenda Operacional */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-2 text-xs text-stone-600">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center space-x-1.5">
            <span className="w-3.5 h-3.5 rounded-md bg-[#2D1914] border border-[#1A0F0C] ring-2 ring-[#C59B27]/40" />
            <span className="font-bold text-[#2D1914]">Na Cadeira Agora (Foco Total)</span>
          </div>

          <div className="flex items-center space-x-1.5">
            <span className="w-3.5 h-3.5 rounded-md bg-amber-100 border-2 border-dashed border-amber-500" />
            <span className="font-bold text-amber-900">Pausa Química (Livre p/ Encaixe)</span>
          </div>

          <div className="flex items-center space-x-1.5 opacity-60">
            <span className="w-3.5 h-3.5 rounded-md bg-stone-200 border border-stone-300" />
            <span className="font-medium text-stone-600">Próximas Etapas (Desfocadas)</span>
          </div>

          <div className="flex items-center space-x-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span className="text-emerald-800 font-medium">Etapa Concluída</span>
          </div>
        </div>

        <span className="text-[11px] text-[#AD841D] font-semibold flex items-center gap-1">
          <Sparkles className="w-3.5 h-3.5" />
          Passe o mouse ou toque nas etapas futuras para revelá-las
        </span>
      </div>

      {/* ============================================================== */}
      {/* 4. A NOVA RÉGUA DINÂMICA COM PONTEIRO CENTRAL FIXO (50%) */}
      {/* ============================================================== */}
      <div className="relative rounded-2xl border border-[#E7DCCE] bg-[#FAF7F2]/50 p-3 sm:p-5 overflow-hidden shadow-2xs">
        
        {/* ========================================================== */}
        {/* O PONTEIRO VERMELHO FIXO NO CENTRO (50%) DA VIEWPORT      */}
        {/* ========================================================== */}
        <div
          className="absolute top-0 bottom-0 z-30 pointer-events-none flex flex-col items-center"
          style={{ left: "50%", transform: "translateX(-50%)" }}
        >
          {/* Badge Superior Fixo do Ponteiro */}
          <div className="bg-rose-600 text-white font-mono text-[10px] font-extrabold px-3 py-1 rounded-full shadow-lg border-2 border-white flex items-center space-x-1.5 shrink-0 -mt-1 select-none">
            <span className="w-2 h-2 rounded-full bg-white animate-ping" />
            <span>AGORA: {formatTimeHHmm(Math.floor(simulatedMinutes))}</span>
          </div>

          {/* Linha Vertical Vermelha com Brilho / Feixe de Radar */}
          <div className="w-0.5 flex-1 bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)] relative">
            <div className="absolute inset-0 bg-gradient-to-b from-rose-500 via-rose-500 to-rose-600" />
          </div>

          {/* Âncora Inferior Fixa */}
          <div className="w-2.5 h-2.5 rounded-full bg-rose-600 border-2 border-white shadow-md -mb-1 shrink-0" />
        </div>

        {/* ========================================================== */}
        {/* EIXO SUPERIOR DE HORÁRIOS MÓVEL (DESLIZA SOB O PONTEIRO)    */}
        {/* ========================================================== */}
        <div className="relative h-12 border-b border-[#E7DCCE] overflow-hidden mb-4 bg-white/70 rounded-xl">
          <div
            className="absolute top-0 bottom-0 transition-transform duration-300 ease-out"
            style={movingTrackStyle}
          >
            {timeMarkers.map((timeMin) => {
              const isMajor = timeMin % 30 === 0;
              const isHour = timeMin % 60 === 0;
              const xPos = timeMin * pxPerMinute;

              return (
                <div
                  key={timeMin}
                  className="absolute top-0 bottom-0 flex flex-col items-center justify-end"
                  style={{
                    left: `${xPos}px`,
                    transform: "translateX(-50%)",
                  }}
                >
                  {isMajor ? (
                    <span
                      className={`text-[10px] font-mono font-bold mb-1 select-none ${
                        isHour ? "text-[#2D1914] text-[11px]" : "text-stone-500"
                      }`}
                    >
                      {formatTimeHHmm(timeMin)}
                    </span>
                  ) : null}
                  <div
                    className={`w-px ${
                      isHour
                        ? "h-3.5 bg-stone-500"
                        : isMajor
                        ? "h-2.5 bg-stone-400"
                        : "h-1.5 bg-stone-300"
                    }`}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* ========================================================== */}
        {/* TRILHAS DE CADA CLIENTE (LANES PROPORCIONAIS MÓVEIS)        */}
        {/* ========================================================== */}
        <div className="space-y-4">
          {dayAppointments.length === 0 ? (
            <div className="py-12 text-center text-xs text-stone-400 bg-white rounded-2xl border border-dashed border-[#E7DCCE]">
              Nenhum atendimento agendado para esta data.
            </div>
          ) : (
            dayAppointments.map((apt) => {
              // Verifica se a cliente está na cadeira agora ou em pausa agora
              const activeStep = apt.stepBlocks?.find((s) => {
                const sStart = parseHHmmToMinutes(s.startTime);
                const sEnd = parseHHmmToMinutes(s.endTime);
                return simulatedMinutes >= sStart && simulatedMinutes < sEnd;
              });

              const isCurrentlyActiveInChair = activeStep?.type === "active";
              const isCurrentlyInPause = activeStep?.type === "pause";

              return (
                <div
                  key={apt.id}
                  className={`rounded-2xl border transition-all space-y-2.5 shadow-2xs overflow-hidden ${
                    isCurrentlyActiveInChair
                      ? "bg-white border-[#C59B27] ring-2 ring-[#C59B27]/20"
                      : isCurrentlyInPause
                      ? "bg-white border-amber-400 ring-2 ring-amber-400/20"
                      : "bg-white border-[#E7DCCE]"
                  } p-4`}
                >
                  {/* Cabeçalho do Card da Cliente (Ocupa a régua inteira) */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-3">
                    <div className="flex items-center space-x-3">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center font-extrabold text-xs shrink-0 shadow-xs ${
                          isCurrentlyActiveInChair
                            ? "gold-gradient text-[#2D1914]"
                            : isCurrentlyInPause
                            ? "bg-amber-200 text-amber-950"
                            : "chocolate-gradient text-[#DBAE3B]"
                        }`}
                      >
                        {apt.clientName.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-sm text-[#2D1914]">
                            {apt.clientName}
                          </span>
                          <span className="text-xs text-stone-500 font-medium">
                            • {apt.serviceTitle}
                          </span>
                        </div>
                        <span className="text-[11px] text-stone-500">
                          Horário total: <strong>{apt.startTime} às {apt.endTime}</strong> ({apt.totalDurationMin} min)
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2.5">
                      {/* Badge de Status em Tempo Real */}
                      {isCurrentlyActiveInChair ? (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#2D1914] text-[#DBAE3B] border border-[#C59B27] flex items-center gap-1 shadow-2xs">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          Na Cadeira Agora
                        </span>
                      ) : isCurrentlyInPause ? (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-950 border border-amber-300 flex items-center gap-1 shadow-2xs">
                          <Hourglass className="w-3 h-3 text-amber-700 animate-spin-slow" />
                          Pausa Química (Livre)
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-medium bg-stone-100 text-stone-600">
                          {simulatedMinutes < parseHHmmToMinutes(apt.startTime)
                            ? "Aguardando Início"
                            : "Atendimento Concluído"}
                        </span>
                      )}

                      {apt.proposalId && onSelectProposal && (
                        <button
                          onClick={() => onSelectProposal(apt.proposalId!)}
                          className="text-[11px] font-semibold text-[#7B493B] hover:underline"
                        >
                          Ver Proposta
                        </button>
                      )}

                      <span className="font-bold text-xs text-[#2D1914] bg-[#FAF7F2] px-2.5 py-1 rounded-lg border border-[#E7DCCE]">
                        {formatBRL(apt.price)}
                      </span>
                    </div>
                  </div>

                  {/* ======================================================== */}
                  {/* TRILHA HORIZONTAL DINÂMICA DAS ETAPAS DO PROCEDIMENTO    */}
                  {/* ALINHADA AO PONTEIRO CENTRAL COM TRANSLAÇÃO EXATA        */}
                  {/* ======================================================== */}
                  <div className="relative h-28 bg-[#FAF7F2] rounded-xl border border-[#E7DCCE] overflow-hidden">
                    {/* Linhas de Grade de Fundo (Acompanham a translação) */}
                    <div
                      className="absolute top-0 bottom-0 transition-transform duration-300 ease-out pointer-events-none"
                      style={movingTrackStyle}
                    >
                      {timeMarkers.map((timeMin) => (
                        <div
                          key={timeMin}
                          className={`absolute top-0 bottom-0 border-r ${
                            timeMin % 30 === 0
                              ? "border-stone-300/80"
                              : "border-stone-200/40"
                          }`}
                          style={{
                            left: `${timeMin * pxPerMinute}px`,
                          }}
                        />
                      ))}
                    </div>

                    {/* Faixa Móvel com os Blocos das Etapas */}
                    <div
                      className="absolute top-1.5 bottom-1.5 transition-transform duration-300 ease-out"
                      style={movingTrackStyle}
                    >
                      {apt.stepBlocks && apt.stepBlocks.length > 0 ? (
                        apt.stepBlocks.map((step) => {
                          const stepStartMin = parseHHmmToMinutes(step.startTime);
                          const stepEndMin = parseHHmmToMinutes(step.endTime);
                          const stepDurationMin = stepEndMin - stepStartMin;

                          // Coordenadas absolutas em pixels
                          const blockLeftPx = stepStartMin * pxPerMinute;
                          const blockWidthPx = stepDurationMin * pxPerMinute;

                          // Relação temporal com o simulatedMinutes (momento do ponteiro)
                          const isPast = simulatedMinutes >= stepEndMin;
                          const isCurrent =
                            simulatedMinutes >= stepStartMin &&
                            simulatedMinutes < stepEndMin;
                          const isFuture = simulatedMinutes < stepStartMin;
                          const isPause = step.type === "pause";

                          return (
                            <div
                              key={step.id}
                              className={`absolute top-0 bottom-0 rounded-xl p-2.5 flex flex-col justify-between transition-all duration-300 group ${
                                // ETAPA ATUAL: SOB O PONTEIRO CENTRAL (FOCO TOTAL)
                                isCurrent
                                  ? isPause
                                    ? "bg-gradient-to-br from-amber-50 to-amber-100 border-2 border-dashed border-amber-500 ring-4 ring-amber-400/25 z-20 shadow-md"
                                    : "bg-[#2D1914] text-white border-2 border-[#C59B27] ring-4 ring-[#C59B27]/30 z-20 shadow-md"
                                  // ETAPAS FUTURAS: À DIREITA DO PONTEIRO (DESFOCADAS)
                                  : isFuture
                                  ? "backdrop-blur-[2px] opacity-45 hover:opacity-100 hover:backdrop-blur-none bg-white border border-[#E7DCCE] z-10 cursor-pointer shadow-xs hover:border-[#AD841D] hover:scale-[1.01]"
                                  // ETAPAS PASSADAS: À ESQUERDA DO PONTEIRO (CONCLUÍDAS)
                                  : "bg-stone-100/90 border border-stone-200 opacity-60 text-stone-500"
                              }`}
                              style={{
                                left: `${blockLeftPx}px`,
                                width: `${blockWidthPx}px`,
                              }}
                              title={`${step.stepTitle} (${step.startTime} - ${step.endTime})`}
                            >
                              {/* Topo do Bloco da Etapa */}
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-1.5 truncate">
                                  {isPast ? (
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                  ) : isPause ? (
                                    <Hourglass
                                      className={`w-3.5 h-3.5 ${
                                        isCurrent ? "text-amber-600 animate-spin-slow" : "text-amber-700"
                                      } shrink-0`}
                                    />
                                  ) : (
                                    <Scissors
                                      className={`w-3.5 h-3.5 ${
                                        isCurrent ? "text-[#DBAE3B]" : "text-stone-400"
                                      } shrink-0`}
                                    />
                                  )}
                                  <span className="font-bold text-[11px] truncate">
                                    {step.stepTitle}
                                  </span>
                                </div>

                                <span className="font-mono text-[9px] font-bold shrink-0">
                                  {step.startTime} - {step.endTime}
                                </span>
                              </div>

                              {/* Meio: Tag de Status ou Relógio Ativo */}
                              <div className="text-[10px]">
                                {isCurrent ? (
                                  <div className="flex items-center justify-between">
                                    <span
                                      className={`font-mono text-xs font-extrabold ${
                                        isPause ? "text-amber-900" : "text-[#DBAE3B]"
                                      }`}
                                    >
                                      ⏳ {formatCountdown(Math.max(0, Math.round((stepEndMin - simulatedMinutes) * 60)) + (manualTolerance[apt.id] || 0))} restante
                                    </span>

                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleManualAdvanceStep(apt.id);
                                      }}
                                      className={`px-2 py-0.5 rounded text-[9px] font-bold shadow-xs ${
                                        isPause
                                          ? "bg-amber-600 text-white hover:bg-amber-700"
                                          : "gold-gradient text-[#2D1914]"
                                      }`}
                                    >
                                      Avançar
                                    </button>
                                  </div>
                                ) : isFuture ? (
                                  <span className="text-stone-400 italic text-[10px] group-hover:text-stone-700">
                                    Próxima etapa (desfocada)
                                  </span>
                                ) : (
                                  <span className="text-emerald-700 font-semibold text-[10px]">
                                    ✓ Concluída
                                  </span>
                                )}
                              </div>

                              {/* Rodapé do Bloco */}
                              <div className="flex items-center justify-between text-[9px] text-stone-400">
                                <span>{stepDurationMin} min</span>
                                <span>
                                  {isPause ? "Janela Livre p/ Encaixe" : "Cadeira"}
                                </span>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div
                          className="absolute top-0 bottom-0 bg-white rounded-xl border border-[#E7DCCE] flex items-center justify-center text-xs text-stone-400"
                          style={{
                            left: `${parseHHmmToMinutes(apt.startTime) * pxPerMinute}px`,
                            width: `${(parseHHmmToMinutes(apt.endTime) - parseHHmmToMinutes(apt.startTime)) * pxPerMinute}px`,
                          }}
                        >
                          Atendimento contínuo ({apt.startTime} às {apt.endTime})
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Toast Flutuante de Desfazer Avanço de Etapa */}
      {undoState && (
        <div className="fixed bottom-6 left-4 right-4 sm:left-auto sm:right-6 z-50 bg-[#2D1914] text-white px-4 py-3 rounded-2xl shadow-2xl border border-[#C59B27]/60 flex items-center justify-between sm:justify-start gap-3 animate-fade-in max-w-md mx-auto sm:mx-0">
          <span className="text-xs">
            Etapa de <strong>{undoState.clientName}</strong> avançada.
          </span>
          <button
            onClick={handleUndoAdvance}
            className="px-3 py-1.5 rounded-xl bg-[#C59B27] text-[#2D1914] font-extrabold text-xs hover:bg-[#DBAE3B] transition-all shadow-xs flex items-center gap-1 shrink-0"
          >
            <span>↩️ Desfazer</span>
          </button>
        </div>
      )}
    </div>
  );
}
