"use client";

import { useState, useMemo } from "react";
import { SalonClient } from "@/types/client";
import { Appointment } from "@/types/appointment";
import { formatBRL, generateWhatsAppLink } from "@/lib/utils";
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  MessageCircle,
  Sparkles,
  Send,
  Calendar,
  DollarSign,
  Users,
  CheckCircle2,
  ExternalLink,
  Copy,
  X,
} from "lucide-react";

interface RevenueRiskRadarProps {
  clients: SalonClient[];
  appointments: Appointment[];
}

export function RevenueRiskRadar({ clients, appointments }: RevenueRiskRadarProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [copiedBatch, setCopiedBatch] = useState(false);

  // Calcula dias desde a última visita
  const getDaysSinceLastVisit = (lastVisitAt?: string): number => {
    if (!lastVisitAt) return 0;
    const date = new Date(lastVisitAt);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  };

  // Clientes sem retorno há mais de 60 dias
  const atRiskClients = useMemo(() => {
    return clients
      .map((c) => {
        const days = getDaysSinceLastVisit(c.lastVisitAt);
        const cleanPhone = c.phone.replace(/\D/g, "");
        const clientApts = appointments.filter(
          (a) =>
            a.clientPhone.replace(/\D/g, "") === cleanPhone ||
            a.clientName.toLowerCase() === c.name.toLowerCase()
        );
        const totalSpent =
          c.totalSpent ||
          clientApts.reduce((sum, a) => sum + (Number(a.price) || 0), 0);
        const visits = clientApts.length || c.totalAppointments || 1;
        const avgTicket = visits > 0 ? totalSpent / visits : 300;

        return {
          ...c,
          daysSinceLastVisit: days,
          totalSpentCalculated: totalSpent,
          avgTicketCalculated: avgTicket > 0 ? avgTicket : 300,
        };
      })
      .filter((c) => c.daysSinceLastVisit >= 60)
      .sort((a, b) => b.daysSinceLastVisit - a.daysSinceLastVisit);
  }, [clients, appointments]);

  // Soma da receita potencial em risco (baseado na receita média e valor parado)
  const totalRiskRevenue = useMemo(() => {
    return atRiskClients.reduce((sum, c) => {
      // Receita potencial em risco é a receita média que essa cliente costuma gerar por ciclo
      return sum + c.avgTicketCalculated;
    }, 0);
  }, [atRiskClients]);

  // Mensagem personalizada de resgate
  const buildRescueMessage = (clientName: string) => {
    return `Olá, ${clientName}! ✨ Aqui é a Gleicy Ronha do Espaço da Beleza. Passando para saber como estão os cuidados com o seu cabelo! Como já faz algum tempo desde a sua última visita, separei um carinho especial para o seu retorno. Que tal agendarmos seu diagnóstico capilar?`;
  };

  const handleCopyBatch = () => {
    const text = atRiskClients
      .map(
        (c) =>
          `*${c.name}* (${c.phone}) - ${c.daysSinceLastVisit} dias sem retorno:\n${buildRescueMessage(c.name)}\n`
      )
      .join("\n---\n\n");
    navigator.clipboard.writeText(text);
    setCopiedBatch(true);
    setTimeout(() => setCopiedBatch(false), 3000);
  };

  if (atRiskClients.length === 0) {
    return null;
  }

  return (
    <div className="bg-[#1A0F0C] rounded-3xl p-6 sm:p-7 text-white border-2 border-amber-500/40 shadow-xl relative overflow-hidden transition-all">
      {/* Brilho de fundo sutil */}
      <div className="absolute top-0 right-0 w-72 h-72 bg-gradient-to-br from-amber-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />

      {/* Topo / Card Principal Compacto */}
      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="space-y-1.5">
          <div className="flex items-center space-x-2 text-xs uppercase font-bold tracking-wider text-amber-400">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Receita em Risco • Inteligência de Reativação</span>
          </div>

          <div className="flex flex-wrap items-baseline gap-3">
            <span className="text-2xl sm:text-3xl font-editorial font-extrabold text-amber-300">
              {formatBRL(totalRiskRevenue)}
            </span>
            <span className="text-xs sm:text-sm text-stone-300">
              em receita parada estimada
            </span>
          </div>

          <p className="text-xs text-stone-400">
            <strong className="text-white font-semibold">{atRiskClients.length} clientes VIPs e recorrentes</strong> estão sem retorno há mais de 60 dias.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="px-4 py-2.5 text-xs font-bold text-[#1A0F0C] bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 rounded-xl shadow-md transition-all flex items-center gap-2 active:scale-95"
          >
            <MessageCircle className="w-4 h-4 text-[#1A0F0C]" />
            <span>
              {isExpanded ? "Ocultar Lista de Clientes" : "Ver Lista e Enviar Mensagem de Resgate 💬"}
            </span>
            {isExpanded ? (
              <ChevronUp className="w-3.5 h-3.5 text-[#1A0F0C]" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-[#1A0F0C]" />
            )}
          </button>
        </div>
      </div>

      {/* Lista Expandida de Clientes em Risco */}
      {isExpanded && (
        <div className="relative z-10 mt-6 pt-6 border-t border-white/10 space-y-4 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-stone-900/80 p-3.5 rounded-2xl border border-white/10">
            <div className="text-xs text-stone-300">
              Dispare mensagens personalizadas de acolhimento para reativar estas clientes na agenda.
            </div>

            <button
              onClick={() => setShowBatchModal(true)}
              className="px-3.5 py-1.5 text-xs font-semibold text-white bg-white/15 hover:bg-white/25 rounded-xl border border-white/20 transition-all flex items-center gap-1.5 self-start sm:self-auto shrink-0"
            >
              <Send className="w-3.5 h-3.5 text-amber-400" />
              <span>Enviar para Todas em Lote</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {atRiskClients.map((client) => {
              const msg = buildRescueMessage(client.name);
              const waLink = generateWhatsAppLink(client.phone, msg);

              return (
                <div
                  key={client.id || client.phone}
                  className="bg-stone-900/90 rounded-2xl p-4 border border-white/10 hover:border-amber-500/40 transition-all flex flex-col justify-between space-y-3 shadow-inner"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-bold text-sm text-white">{client.name}</h4>
                        <span className="text-[11px] text-stone-400 font-mono">
                          {client.phone}
                        </span>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                        {client.daysSinceLastVisit} dias ausente
                      </span>
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-white/5 flex items-center justify-between text-[11px] text-stone-400">
                      <span>Ticket habitual:</span>
                      <span className="font-bold text-amber-300">
                        {formatBRL(client.avgTicketCalculated)}
                      </span>
                    </div>

                    {client.lastServiceTitle && (
                      <p className="text-[10px] text-stone-400 truncate mt-1">
                        Último: {client.lastServiceTitle}
                      </p>
                    )}
                  </div>

                  <a
                    href={waLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2 px-3 text-xs font-bold text-emerald-950 bg-emerald-400 hover:bg-emerald-300 rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-xs"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>WhatsApp de Resgate</span>
                  </a>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal de Disparo / Envio em Lote */}
      {showBatchModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-6 overflow-hidden">
          <div className="bg-[#1A0F0C] rounded-t-[28px] sm:rounded-3xl rounded-b-none sm:rounded-b-3xl max-w-2xl w-full max-h-[92vh] sm:max-h-[85vh] flex flex-col shadow-2xl border-t border-x sm:border border-amber-500/40 overflow-hidden text-white animate-slide-up-sheet">
            {/* Puxador Visual Mobile */}
            <div className="w-12 h-1.5 bg-amber-700/60 rounded-full mx-auto my-2.5 sm:hidden shrink-0" />

            <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between shrink-0">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-widest text-amber-400 block">
                  Campanha de Resgate Ativo
                </span>
                <h3 className="font-editorial text-base sm:text-xl font-bold text-white">
                  Envio para {atRiskClients.length} Clientes em Risco
                </h3>
              </div>
              <button
                onClick={() => setShowBatchModal(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-stone-300 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 sm:p-5 pb-8 sm:pb-5 overflow-y-auto space-y-4 text-xs flex-1 no-scrollbar sm:scrollbar-thin">
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-200">
                💡 Clique no botão WhatsApp ao lado de cada cliente para abrir a conversa com a mensagem pré-formatada, ou copie a lista completa abaixo para colar no seu gerenciador de disparos.
              </div>

              <div className="space-y-2.5">
                {atRiskClients.map((client, idx) => {
                  const msg = buildRescueMessage(client.name);
                  const waLink = generateWhatsAppLink(client.phone, msg);

                  return (
                    <div
                      key={client.id || client.phone}
                      className="p-3 rounded-xl bg-stone-900 border border-white/10 flex items-center justify-between gap-3"
                    >
                      <div>
                        <div className="font-bold text-white">
                          {idx + 1}. {client.name}
                        </div>
                        <div className="text-[11px] text-stone-400">
                          {client.phone} • {client.daysSinceLastVisit} dias sem visita
                        </div>
                      </div>

                      <a
                        href={waLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 text-xs font-bold text-emerald-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg flex items-center gap-1 shrink-0"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>Abrir ({client.name.split(" ")[0]})</span>
                      </a>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="p-4 border-t border-white/10 bg-stone-950 flex items-center justify-between gap-3">
              <button
                onClick={handleCopyBatch}
                className="px-4 py-2 text-xs font-semibold text-white bg-white/15 hover:bg-white/25 rounded-xl border border-white/20 flex items-center gap-1.5 transition-all"
              >
                {copiedBatch ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Copiado com Sucesso!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-amber-400" />
                    <span>Copiar Todos os Textos</span>
                  </>
                )}
              </button>

              <button
                onClick={() => setShowBatchModal(false)}
                className="px-5 py-2 text-xs font-bold text-[#1A0F0C] bg-amber-400 hover:bg-amber-300 rounded-xl"
              >
                Concluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
