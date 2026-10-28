"use client";

import { useState } from "react";
import { Appointment } from "@/types/appointment";
import { buildDayTimeline, DayTimelineBlock } from "@/lib/scheduling/engine";
import { formatBRL } from "@/lib/utils";
import {
  Calendar,
  Clock,
  Sparkles,
  Scissors,
  Hourglass,
  CheckCircle,
  FileText,
  User,
  Phone,
  Zap,
} from "lucide-react";

interface VisualTimelineProps {
  appointments: Appointment[];
  selectedDate: string;
  onDateChange: (date: string) => void;
  onSelectProposal?: (proposalId: string) => void;
}

export function VisualTimeline({
  appointments,
  selectedDate,
  onDateChange,
  onSelectProposal,
}: VisualTimelineProps) {
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);

  const timelineBlocks = buildDayTimeline(appointments, "all", selectedDate);

  // Filtra agendamentos do dia selecionado
  const dayAppointments = appointments.filter((a) => a.date === selectedDate);

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E7DCCE] shadow-xs">
      {/* Topo: Controle de Data & Legenda */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6 pb-4 border-b border-[#E7DCCE]/60">
        <div>
          <span className="text-[10px] uppercase tracking-widest text-[#AD841D] font-bold block">
            Timeline Inteligente da Profissional
          </span>
          <h2 className="font-editorial text-xl sm:text-2xl font-bold text-[#2D1914] flex items-center gap-2">
            <span>Agenda do Dia:</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => onDateChange(e.target.value)}
              className="font-sans text-sm font-semibold text-[#44271F] bg-[#FAF7F2] border border-[#E7DCCE] px-3 py-1 rounded-xl outline-none"
            />
          </h2>
        </div>

        {/* Legenda de Cores das Etapas */}
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div className="flex items-center space-x-1.5">
            <span className="w-3.5 h-3.5 rounded-md bg-[#2D1914]" />
            <span className="text-[#2D1914] font-medium">Tempo Ativo (Exclusivo)</span>
          </div>

          <div className="flex items-center space-x-1.5">
            <span className="w-3.5 h-3.5 rounded-md bg-amber-100 border border-dashed border-amber-400" />
            <span className="text-amber-900 font-medium">Pausa Química (Livre p/ Encaixe)</span>
          </div>

          <div className="flex items-center space-x-1.5">
            <span className="w-3.5 h-3.5 rounded-md bg-emerald-100 border border-emerald-400" />
            <span className="text-emerald-900 font-medium">Encaixe Confirmado</span>
          </div>
        </div>
      </div>

      {/* Visão de Blocos da Timeline */}
      {dayAppointments.length === 0 ? (
        <div className="py-12 text-center text-xs text-stone-500 bg-[#FAF7F2] rounded-2xl border border-dashed border-[#E7DCCE]">
          Nenhum agendamento para esta data. Selecione outra data ou crie um agendamento.
        </div>
      ) : (
        <div className="space-y-4">
          {dayAppointments.map((apt) => {
            const hasPause = apt.stepBlocks?.some((s) => s.type === "pause");
            const isProposalWaiting = apt.status === "proposal_sent";

            return (
              <div
                key={apt.id}
                onClick={() => setSelectedAppointment(apt)}
                className={`p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer ${
                  selectedAppointment?.id === apt.id
                    ? "border-[#C59B27] bg-[#FDFBF7] shadow-sm ring-2 ring-[#C59B27]/20"
                    : "border-[#E7DCCE] bg-white hover:border-[#AD841D]/50 hover:bg-[#FAF7F2]/40"
                }`}
              >
                {/* Linha de Dados do Agendamento */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full chocolate-gradient flex items-center justify-center text-[#DBAE3B] font-bold text-xs shrink-0">
                      {apt.clientName.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-sm text-[#2D1914]">{apt.clientName}</span>
                        <span className="text-xs text-stone-500">{apt.clientPhone}</span>
                      </div>
                      <span className="text-xs text-[#683C30] font-medium">{apt.serviceTitle}</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 text-xs">
                    <span className="font-mono font-bold text-[#2D1914] bg-[#FAF7F2] px-2.5 py-1 rounded-lg border border-[#E7DCCE]">
                      {apt.startTime} - {apt.endTime} ({apt.totalDurationMin} min)
                    </span>

                    {/* Status Badge */}
                    {isProposalWaiting ? (
                      <span className="px-2.5 py-1 rounded-full font-semibold bg-amber-100 text-amber-900 border border-amber-300 text-[10px]">
                        Pré-reserva (Proposta Enviada)
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full font-semibold bg-emerald-100 text-emerald-900 border border-emerald-300 text-[10px]">
                        Confirmado
                      </span>
                    )}

                    <span className="font-bold text-[#44271F]">{formatBRL(apt.price)}</span>
                  </div>
                </div>

                {/* Barra Segmentada de Etapas (Motor de Pausas Visuais) */}
                {apt.stepBlocks && apt.stepBlocks.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-[#E7DCCE]/40">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-[#AD841D] block mb-1.5">
                      Sequência de Etapas & Janelas de Espera Química:
                    </span>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {apt.stepBlocks.map((step) => {
                        const isPause = step.type === "pause";

                        return (
                          <div
                            key={step.id}
                            className={`p-2.5 rounded-xl border text-xs flex items-center justify-between ${
                              isPause
                                ? "bg-amber-50/90 border-dashed border-amber-300 text-amber-950"
                                : "bg-[#2D1914] text-white border-[#1A0F0C]"
                            }`}
                          >
                            <div className="flex items-center space-x-2">
                              {isPause ? (
                                <Hourglass className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                              ) : (
                                <Scissors className="w-3.5 h-3.5 text-[#DBAE3B] shrink-0" />
                              )}
                              <div>
                                <span className="font-bold block leading-tight">{step.stepTitle}</span>
                                <span className={`text-[10px] ${isPause ? "text-amber-800" : "text-stone-300"}`}>
                                  {step.startTime} às {step.endTime} ({step.durationMin}m)
                                </span>
                              </div>
                            </div>

                            {isPause && (
                              <span className="text-[9px] bg-amber-200 text-amber-900 px-1.5 py-0.5 rounded-md font-bold shrink-0">
                                Encaixe Livre
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal/Gaveta Rápida do Agendamento Selecionado */}
      {selectedAppointment && (
        <div className="mt-6 p-5 rounded-2xl bg-[#FAF7F2] border border-[#E7DCCE] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-fade-in">
          <div>
            <span className="text-[10px] uppercase font-bold text-[#AD841D]">
              Detalhes de {selectedAppointment.clientName}
            </span>
            <div className="text-xs text-[#44271F] mt-1 space-y-0.5">
              <p>Procedimento: <strong>{selectedAppointment.serviceTitle}</strong></p>
              <p>Observações: {selectedAppointment.notes || "Sem observações adicionais."}</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {selectedAppointment.proposalId && onSelectProposal && (
              <button
                onClick={() => onSelectProposal(selectedAppointment.proposalId!)}
                className="px-3.5 py-2 text-xs font-semibold text-white chocolate-gradient rounded-xl shadow-xs flex items-center space-x-1.5"
              >
                <FileText className="w-3.5 h-3.5 text-[#DBAE3B]" />
                <span>Ver Proposta Comercial</span>
              </button>
            )}

            <button
              onClick={() => setSelectedAppointment(null)}
              className="px-3 py-2 text-xs text-stone-600 hover:bg-stone-200 rounded-xl"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
