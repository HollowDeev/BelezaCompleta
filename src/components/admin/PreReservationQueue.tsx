"use client";

import { useState, useEffect, useCallback } from "react";
import { SupabaseDataService } from "@/lib/supabase/api";
import { PreReservation, PreReservationStatus, PreferredPeriod } from "@/types/availability";
import {
  Bell,
  CheckCircle2,
  XCircle,
  Calendar,
  Clock,
  User,
  Phone,
  Mail,
  FileText,
  Sparkles,
  Search,
  Filter,
  Check,
  X,
  AlertCircle,
  RefreshCw,
  ArrowRight,
  MessageCircle,
} from "lucide-react";

interface PreReservationQueueProps {
  orgId: string;
  professionalId: string;
  dataService?: typeof SupabaseDataService;
  onConvertToAppointment?: (preReservation: PreReservation) => void;
  onViewTriage?: (triageSubmissionId: string) => void;
  onBuildProposal?: (preReservation: PreReservation) => void;
}

export function PreReservationQueue({
  orgId,
  professionalId,
  dataService = SupabaseDataService,
  onConvertToAppointment,
  onViewTriage,
  onBuildProposal,
}: PreReservationQueueProps) {
  const [preReservations, setPreReservations] = useState<PreReservation[]>([]);
  const [filterStatus, setFilterStatus] = useState<"all" | PreReservationStatus>("pending");
  const [isLoading, setIsLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "error" | "info" } | null>(null);

  // Modal para recusa com justificativa opcional
  const [decliningItem, setDecliningItem] = useState<PreReservation | null>(null);
  const [declineReason, setDeclineReason] = useState("");
  const [isProcessingAction, setIsProcessingAction] = useState(false);

  // Disparar feedback toast
  const showToast = (text: string, type: "success" | "error" | "info" = "success") => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  // Carregar lista de pré-reservas
  const loadPreReservations = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await dataService.getPreReservations(orgId);
      setPreReservations(data);
    } catch (err) {
      console.error("Erro ao carregar pré-reservas:", err);
      showToast("Erro ao carregar pré-reservas.", "error");
    } finally {
      setIsLoading(false);
    }
  }, [orgId, dataService]);

  useEffect(() => {
    loadPreReservations();
  }, [loadPreReservations]);

  // Normalizador de status para tolerar 'confirmed' como 'approved'
  const getNormalizedStatus = (status: PreReservationStatus | string): PreReservationStatus => {
    if (status === "confirmed") return "approved";
    return status as PreReservationStatus;
  };

  // Contagem de pendentes
  const pendingCount = preReservations.filter((p) => getNormalizedStatus(p.status) === "pending").length;

  // Filtragem local com deduplicação por cliente + data
  const filteredList = preReservations
    .filter((p) => {
      if (filterStatus === "all") return true;
      return getNormalizedStatus(p.status) === filterStatus;
    })
    .filter((item, idx, arr) =>
      idx === arr.findIndex((t) => t.id === item.id || (t.clientPhone.replace(/\D/g, "") === item.clientPhone.replace(/\D/g, "") && t.requestedDate === item.requestedDate))
    );

  // Ação: Abrir Dia & Confirmar
  const handleApproveAndOpenDay = async (item: PreReservation) => {
    setIsProcessingAction(true);
    try {
      // 1. Determina horários de acordo com a preferência da cliente
      let startTime = "09:00";
      let endTime = "19:00";
      let breakStart: string | undefined = "12:30";
      let breakEnd: string | undefined = "13:30";

      if (item.preferredPeriod === "manha") {
        startTime = "09:00";
        endTime = "13:00";
        breakStart = undefined;
        breakEnd = undefined;
      } else if (item.preferredPeriod === "tarde") {
        startTime = "13:00";
        endTime = "19:00";
        breakStart = undefined;
        breakEnd = undefined;
      }

      // 2. Abre o dia na agenda da profissional
      await dataService.saveAvailableDay({
        orgId,
        professionalId,
        date: item.requestedDate,
        startTime,
        endTime,
        breakStart,
        breakEnd,
        customNotes: `Abertura especial para pré-reserva de ${item.clientName} (${item.serviceName || "Procedimento"})`,
      });

      // 3. Atualiza o status da pré-reserva para 'approved'
      await dataService.updatePreReservationStatus(
        item.id,
        "approved",
        `Dia aberto com turno ${startTime}-${endTime} para a cliente.`
      );

      // 4. Se houver callback para converter em agendamento, executa
      if (onConvertToAppointment) {
        onConvertToAppointment(item);
      }

      showToast(`✅ Dia ${formatDisplayDate(item.requestedDate)} aberto e pré-reserva de ${item.clientName} aprovada!`);
      await loadPreReservations();
    } catch (err) {
      console.error("Erro ao aprovar e abrir dia:", err);
      showToast("Falha ao abrir dia para a pré-reserva.", "error");
    } finally {
      setIsProcessingAction(false);
    }
  };

  // Ação: Confirmar Recusa com motivo
  const handleConfirmDecline = async () => {
    if (!decliningItem) return;
    setIsProcessingAction(true);
    try {
      await dataService.updatePreReservationStatus(
        decliningItem.id,
        "declined",
        declineReason.trim() || "Sem disponibilidade de agenda nesta data."
      );

      showToast(`Pré-reserva de ${decliningItem.clientName} recusada.`);
      setDecliningItem(null);
      setDeclineReason("");
      await loadPreReservations();
    } catch (err) {
      console.error("Erro ao recusar pré-reserva:", err);
      showToast("Falha ao recusar solicitação.", "error");
    } finally {
      setIsProcessingAction(false);
    }
  };

  // Formatação amigável de data (ex: Sex, 28/11/2026)
  const formatDisplayDate = (dateStr: string) => {
    try {
      const parts = dateStr.split("-");
      if (parts.length !== 3) return dateStr;
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const d = parseInt(parts[2], 10);
      const date = new Date(y, m, d);

      const daysOfWeek = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
      const dayName = daysOfWeek[date.getDay()];
      return `${dayName}, ${String(d).padStart(2, "0")}/${String(m + 1).padStart(2, "0")}/${y}`;
    } catch {
      return dateStr;
    }
  };

  // Cálculo de dias restantes até a data solicitada
  const getDaysDiffText = (dateStr: string) => {
    try {
      const target = new Date(dateStr + "T00:00:00");
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      const diffMs = target.getTime() - now.getTime();
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

      if (diffDays < 0) return `${Math.abs(diffDays)} dias atrás`;
      if (diffDays === 0) return "Hoje";
      if (diffDays === 1) return "Amanhã";
      return `Daqui a ${diffDays} dias`;
    } catch {
      return "";
    }
  };

  // Rótulo do período preferido
  const getPeriodLabel = (period: PreferredPeriod, specificTime?: string) => {
    switch (period) {
      case "manha":
        return "🌅 Manhã (09h - 13h)";
      case "tarde":
        return "☀️ Tarde (13h - 19h)";
      case "noite":
        return "🌙 Noite (após 19h)";
      case "especifico":
        return specificTime ? `⏰ Horário: ${specificTime}` : "⏰ Horário específico";
      default:
        return "⭐ Horário flexível";
    }
  };

  return (
    <div data-tutorial="pre-reservation-queue" className="bg-white/85 backdrop-blur-md rounded-3xl p-5 sm:p-8 border border-[#D8D0BD] shadow-xs text-[#1D3D3C] space-y-6 relative overflow-hidden">
      {/* Pattern de Arcos de Oliva sutil */}
      <div className="absolute inset-0 bg-pattern-arches-olive opacity-[0.03] pointer-events-none" />

      {/* Toast Inline */}
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
            <AlertCircle className="w-5 h-5 text-[#80611F] shrink-0" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* ============================================================== */}
      {/* CABEÇALHO + BADGES DE STATUS + FILTROS                        */}
      {/* ============================================================== */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-[#D8D0BD] relative z-10">
        <div>
          <div className="flex items-center space-x-2 text-[11px] uppercase font-extrabold tracking-widest text-[#80611F] mb-1.5">
            <Bell className="w-4 h-4 text-[#C7A03A]" />
            <span>Fila de Espera Exclusiva</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-[#1D3D3C] flex items-center gap-2.5">
            <span>Pré-Reservas Solicitadas</span>
            {pendingCount > 0 && (
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#FCF9F0] text-[#80611F] border border-[#C7A03A]/60 font-bold animate-pulse">
                {pendingCount} pendente{pendingCount > 1 ? "s" : ""}
              </span>
            )}
          </h2>

          {/* Grafismo Oficial 1 - Linha Orgânica Dourada */}
          <div className="relative w-36 sm:w-44 h-2.5 my-1.5 opacity-80 pointer-events-none">
            <img
              src="/brand/Grafismos/Linha grafismo 1.png"
              alt=""
              className="w-full h-full object-contain object-left"
            />
          </div>

          <p className="text-xs text-[#736455] mt-1 max-w-xl">
            Clientes que solicitaram agendamento em datas ainda fechadas na sua agenda. Ao clicar em &quot;Abrir Dia &amp; Confirmar&quot;, o dia é aberto automaticamente.
          </p>
        </div>

        {/* Filtros de Status */}
        <div className="flex flex-wrap items-center gap-1.5 bg-[#FAF7F2] p-1.5 rounded-2xl border border-[#D8D0BD] shadow-xs">
          <button
            onClick={() => setFilterStatus("all")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              filterStatus === "all"
                ? "bg-[#1D3D3C] text-[#D9B85F] shadow-xs border border-[#C7A03A]/40 font-bold"
                : "text-[#736455] hover:text-[#1D3D3C]"
            }`}
          >
            Todas ({preReservations.length})
          </button>
          <button
            onClick={() => setFilterStatus("pending")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              filterStatus === "pending"
                ? "bg-[#1D3D3C] text-[#D9B85F] shadow-xs border border-[#C7A03A]/40 font-bold"
                : "text-[#736455] hover:text-[#1D3D3C]"
            }`}
          >
            Pendentes ({preReservations.filter((p) => getNormalizedStatus(p.status) === "pending").length})
          </button>
          <button
            onClick={() => setFilterStatus("approved")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              filterStatus === "approved"
                ? "bg-emerald-100 text-emerald-900 shadow-xs border border-emerald-300 font-bold"
                : "text-[#736455] hover:text-[#1D3D3C]"
            }`}
          >
            Aprovadas ({preReservations.filter((p) => getNormalizedStatus(p.status) === "approved").length})
          </button>
          <button
            onClick={() => setFilterStatus("declined")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              filterStatus === "declined"
                ? "bg-red-100 text-red-900 shadow-xs border border-red-300 font-bold"
                : "text-[#736455] hover:text-[#1D3D3C]"
            }`}
          >
            Recusadas ({preReservations.filter((p) => getNormalizedStatus(p.status) === "declined").length})
          </button>

          <button
            onClick={loadPreReservations}
            disabled={isLoading}
            className="p-1.5 ml-1 rounded-xl text-[#736455] hover:text-[#1D3D3C] transition-colors"
            title="Recarregar Pré-Reservas"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-[#C7A03A]" : ""}`} />
          </button>
        </div>
      </div>

      {/* ============================================================== */}
      {/* LISTA DE CARDS OU ESTADO VAZIO                                */}
      {/* ============================================================== */}
      {filteredList.length === 0 ? (
        <div className="py-12 px-4 text-center rounded-2xl bg-[#FAF7F2]/60 border border-dashed border-[#D8D0BD] space-y-3 relative z-10">
          <div className="w-12 h-12 rounded-full bg-[#C7A03A]/15 border border-[#C7A03A]/30 flex items-center justify-center text-[#80611F] mx-auto">
            <Sparkles className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-[#1D3D3C]">
            Nenhuma pré-reserva {filterStatus !== "all" ? `com status "${filterStatus}"` : "registrada"}
          </h3>
          <p className="text-xs text-[#736455] max-w-md mx-auto leading-relaxed">
            Quando clientes solicitarem datas fora da sua agenda aberta, elas aparecerão aqui para você decidir se deseja liberar o dia e confirmar o atendimento.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
          {filteredList.map((item) => {
            const normStatus = getNormalizedStatus(item.status);
            const isPending = normStatus === "pending";
            const isApproved = normStatus === "approved";
            const isDeclined = normStatus === "declined";
            const isConverted = normStatus === "converted";
            const daysRemaining = getDaysDiffText(item.requestedDate);

            return (
              <div
                key={item.id}
                className={`p-5 rounded-2xl border transition-all duration-200 flex flex-col justify-between space-y-4 shadow-xs ${
                  isPending
                    ? "bg-[#FCF5EB] border-2 border-[#C7A03A]/60 hover:border-[#C7A03A]"
                    : isApproved
                    ? "bg-white/90 border-emerald-300 hover:border-emerald-500"
                    : isDeclined
                    ? "bg-[#FAF7F2] border-[#D8D0BD] opacity-80"
                    : "bg-white/90 border-[#C7A03A]/40"
                }`}
              >
                {/* Topo do Card: Badge de Status + Nome da Cliente + Data Solicitada */}
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        {isPending && (
                          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-[#FCF9F0] text-[#80611F] border border-[#C7A03A]/60 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#C7A03A] animate-ping" />
                            <span>🔔 Pendente</span>
                          </span>
                        )}
                        {isApproved && (
                          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300">
                            ✅ Aprovada
                          </span>
                        )}
                        {isDeclined && (
                          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-red-50 text-red-800 border border-red-300">
                            ❌ Recusada
                          </span>
                        )}
                        {isConverted && (
                          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-[#FAF7F2] text-[#80611F] border border-[#C7A03A]/40">
                            💎 Agendamento Criado
                          </span>
                        )}
                      </div>

                      <h4 className="text-base font-extrabold text-[#1D3D3C] tracking-tight">
                        {item.clientName}
                      </h4>
                    </div>

                    {/* Data Solicitada em destaque */}
                    <div className="text-right shrink-0">
                      <span className="text-xs font-bold text-[#80611F] block">
                        {formatDisplayDate(item.requestedDate)}
                      </span>
                      <span className="text-[10px] text-[#736455] font-medium">
                        {daysRemaining}
                      </span>
                    </div>
                  </div>

                  {/* Detalhes do Procedimento e Período */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3 rounded-xl bg-white/80 border border-[#D8D0BD] text-xs">
                    <div>
                      <span className="text-[10px] text-[#736455] block font-medium">
                        Procedimento Desejado:
                      </span>
                      <span className="font-bold text-[#1D3D3C]">
                        {item.serviceName || "Personalizado (Consultoria)"}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-[#736455] block font-medium">
                        Período / Horário:
                      </span>
                      <span className="font-bold text-[#80611F]">
                        {getPeriodLabel(item.preferredPeriod, item.preferredTime)}
                      </span>
                    </div>
                  </div>

                  {/* Motivo da Cliente ou Anotação */}
                  {item.adminNotes && (
                    <div className="text-xs italic text-[#736455] bg-[#FAF7F2] px-3 py-2 rounded-xl border border-[#D8D0BD]">
                      &quot;{item.adminNotes}&quot;
                    </div>
                  )}

                  {/* Contato da Cliente */}
                  <div className="flex flex-wrap items-center gap-3 text-xs text-[#736455] pt-1">
                    <a
                      href={`https://wa.me/55${item.clientPhone.replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center space-x-1.5 hover:text-emerald-700 transition-colors font-medium"
                      title="Abrir WhatsApp"
                    >
                      <Phone className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{item.clientPhone}</span>
                    </a>

                    {item.clientEmail && (
                      <div className="flex items-center space-x-1.5 text-[#736455]">
                        <Mail className="w-3.5 h-3.5 text-[#736455]" />
                        <span className="truncate max-w-[180px]">{item.clientEmail}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Barra de Ações para a Gleicy */}
                <div className="pt-3 border-t border-[#D8D0BD] flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {item.triageSubmissionId && (
                      <button
                        onClick={() => onViewTriage && onViewTriage(item.triageSubmissionId!)}
                        className="px-3 py-1.5 rounded-xl bg-white hover:bg-[#FAF7F2] text-[#1D3D3C] text-xs font-semibold flex items-center space-x-1.5 transition-colors border border-[#D8D0BD] shadow-xs"
                        title="Ver formulário de anamnese/triagem preenchido"
                      >
                        <FileText className="w-3.5 h-3.5 text-[#C7A03A]" />
                        <span>Ver Triagem</span>
                      </button>
                    )}

                    {onBuildProposal && (
                      <button
                        onClick={() => onBuildProposal(item)}
                        className="px-3 py-1.5 rounded-xl brand-green-gradient text-white text-xs font-bold flex items-center space-x-1.5 transition-colors border border-[#C7A03A]/40 shadow-xs hover:border-[#C7A03A]"
                        title="Construir proposta de transformação para este encaixe"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-[#D9B85F]" />
                        <span>Montar Proposta</span>
                      </button>
                    )}
                  </div>

                  {isPending && (
                    <div className="flex items-center space-x-2 ml-auto">
                      {/* Botão Recusar */}
                      <button
                        onClick={() => setDecliningItem(item)}
                        disabled={isProcessingAction}
                        className="p-2 rounded-xl bg-white hover:bg-red-50 text-[#736455] hover:text-red-700 border border-[#D8D0BD] hover:border-red-300 transition-colors shadow-xs"
                        title="Recusar pré-reserva"
                      >
                        <X className="w-4 h-4" />
                      </button>

                      {/* Botão Primário: Abrir Dia & Confirmar */}
                      <button
                        onClick={() => handleApproveAndOpenDay(item)}
                        disabled={isProcessingAction}
                        className="px-4 py-2 rounded-xl gold-gradient text-[#1D3D3C] text-xs font-extrabold flex items-center space-x-1.5 shadow-md active:scale-95 transition-all disabled:opacity-50"
                        title="Abrir turno automaticamente na agenda sem emitir proposta"
                      >
                        <Check className="w-4 h-4 stroke-[3]" />
                        <span>Abrir Dia &amp; Confirmar</span>
                      </button>
                    </div>
                  )}

                  {!isPending && (
                    <div className="text-[11px] text-[#736455] font-medium ml-auto">
                      {isApproved && "Dia aberto para este atendimento"}
                      {isDeclined && "Solicitação finalizada como recusada"}
                      {isConverted && "Agendamento registrado no calendário"}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Confirmação de Recusa */}
      {decliningItem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#D8D0BD] rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-scale-up text-[#1D3D3C]">
            <div className="flex items-center justify-between pb-3 border-b border-[#D8D0BD]">
              <h4 className="text-base font-bold text-[#1D3D3C] flex items-center gap-2">
                <XCircle className="w-5 h-5 text-red-500" />
                <span>Recusar Pré-Reserva</span>
              </h4>
              <button
                onClick={() => setDecliningItem(null)}
                className="w-7 h-7 rounded-full bg-[#FAF7F2] text-[#736455] hover:text-[#1D3D3C] flex items-center justify-center transition-colors"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-[#736455]">
              Você está recusando a solicitação de <strong className="text-[#1D3D3C]">{decliningItem.clientName}</strong> para a data{" "}
              <strong className="text-[#1D3D3C]">{formatDisplayDate(decliningItem.requestedDate)}</strong>.
            </p>

            <div>
              <label className="text-xs font-bold text-[#1D3D3C] block mb-1.5">
                Motivo ou Nota Interna (opcional):
              </label>
              <textarea
                rows={3}
                placeholder="Ex: Sem horário disponível nesta data / Salão em reforma"
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#D8D0BD] text-[#1D3D3C] text-xs outline-none focus:border-[#C7A03A] placeholder-[#736455]/60"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setDecliningItem(null)}
                className="px-4 py-2 rounded-xl bg-[#FAF7F2] text-xs font-semibold text-[#736455] hover:text-[#1D3D3C] border border-[#D8D0BD] transition-colors"
              >
                Voltar
              </button>
              <button
                onClick={handleConfirmDecline}
                disabled={isProcessingAction}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-md"
              >
                Confirmar Recusa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
