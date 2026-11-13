"use client";

import { useState, useMemo } from "react";
import { TriageSubmission, TriageAnswer } from "@/types/triage";
import { ProposalBuilderModal } from "@/components/proposal/ProposalBuilderModal";
import { LuxuryProposal } from "@/types/proposal";
import { ServiceItem } from "@/types/service";
import { Appointment } from "@/types/appointment";
import { AvailableDay } from "@/types/availability";
import { PhotoGalleryLightbox, GalleryPhoto } from "@/components/common/PhotoGalleryLightbox";
import { formatBRL } from "@/lib/utils";
import {
  Sparkles,
  Camera,
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Zap,
  Filter,
  Phone,
  Calendar,
  Layers,
  Eye,
  Check,
  X,
} from "lucide-react";

interface TriageReviewQueueProps {
  submissions: TriageSubmission[];
  services?: ServiceItem[];
  proposals?: LuxuryProposal[];
  existingAppointments?: Appointment[];
  availableDays?: AvailableDay[];
  onGenerateProposal: (proposal: LuxuryProposal, openWhatsApp?: boolean) => void;
  onViewProposal: (proposalId: string) => void;
  onDirectApprove?: (
    submission: TriageSubmission,
    date: string,
    time: string,
    price: number,
    openWhatsApp: boolean
  ) => Promise<void> | void;
}

type FilterType = "pending" | "encaixes" | "sent" | "approved" | "all";

export function TriageReviewQueue({
  submissions,
  services = [],
  proposals = [],
  existingAppointments = [],
  availableDays = [],
  onGenerateProposal,
  onViewProposal,
  onDirectApprove,
}: TriageReviewQueueProps) {
  const [selectedSubForProposal, setSelectedSubForProposal] =
    useState<TriageSubmission | null>(null);
  const [approvingSubmission, setApprovingSubmission] =
    useState<TriageSubmission | null>(null);

  // Filtro padrão: ATIVO por padrão apenas as que estão aguardando uma resposta ("pending")
  const [filterType, setFilterType] = useState<FilterType>("pending");

  // Estado dos Accordions (IDs das triagens expandidas)
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});

  // Paginação inteligente de 5 em 5 para mitigar sobrecarga de dados/renderização
  const PAGE_SIZE = 5;
  const [visibleCount, setVisibleCount] = useState<number>(PAGE_SIZE);

  // Modal para visualização ampliada de fotos (Galeria Fullscreen)
  const [activeGalleryPhotos, setActiveGalleryPhotos] = useState<GalleryPhoto[] | null>(null);
  const [activeGalleryIndex, setActiveGalleryIndex] = useState(0);

  const getSubmissionPhotos = (sub: TriageSubmission): GalleryPhoto[] => {
    const list: GalleryPhoto[] = [];
    if (sub.photos?.currentHairRoot) {
      list.push({
        url: sub.photos.currentHairRoot,
        title: "Raiz Natural do Cabelo",
        subtitle: `Cliente: ${sub.clientName} • Serviço: ${sub.serviceTitle}`,
      });
    }
    if (sub.photos?.currentHairLength) {
      list.push({
        url: sub.photos.currentHairLength,
        title: "Comprimento e Pontas dos Fios",
        subtitle: `Cliente: ${sub.clientName} • Serviço: ${sub.serviceTitle}`,
      });
    }
    if (sub.photos?.inspirationDesired) {
      list.push({
        url: sub.photos.inspirationDesired,
        title: "Inspiração / Referência Desejada",
        subtitle: `Cliente: ${sub.clientName} • Serviço: ${sub.serviceTitle}`,
      });
    }
    return list;
  };

  const getAnswers = (sub?: TriageSubmission): TriageAnswer[] => {
    return Array.isArray(sub?.answers) ? sub.answers : [];
  };

  const handleOpenGallery = (sub: TriageSubmission, photoUrl: string) => {
    const photos = getSubmissionPhotos(sub);
    const targetIdx = photos.findIndex((p) => p.url === photoUrl);
    setActiveGalleryPhotos(photos);
    setActiveGalleryIndex(targetIdx >= 0 ? targetIdx : 0);
  };

  // Contadores para os filtros
  const counts = useMemo(() => {
    return {
      pending: submissions.filter((s) => s.status === "pending_review").length,
      encaixes: submissions.filter(
        (s) =>
          s.preferredTimeSlot?.startsWith("Encaixe") ||
          getAnswers(s).some((a) => (a.questionTitle || "").toLowerCase().includes("encaixe"))
      ).length,
      sent: submissions.filter((s) => s.status === "proposal_sent").length,
      approved: submissions.filter((s) => s.status === "approved").length,
      all: submissions.length,
    };
  }, [submissions]);

  // Lista filtrada
  const filteredSubmissions = useMemo(() => {
    return submissions.filter((sub) => {
      const isEncaixe =
        sub.preferredTimeSlot?.startsWith("Encaixe") ||
        getAnswers(sub).some((a) => (a.questionTitle || "").toLowerCase().includes("encaixe"));

      if (filterType === "pending") return sub.status === "pending_review";
      if (filterType === "encaixes") return isEncaixe;
      if (filterType === "sent") return sub.status === "proposal_sent";
      if (filterType === "approved") return sub.status === "approved";
      return true; // "all"
    });
  }, [submissions, filterType]);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const expandAll = () => {
    const allExpanded: Record<string, boolean> = {};
    filteredSubmissions.forEach((s) => {
      allExpanded[s.id] = true;
    });
    setExpandedIds(allExpanded);
  };

  const collapseAll = () => {
    setExpandedIds({});
  };

  return (
    <div
      data-tutorial="triage-review-queue"
      className="bg-white/90 backdrop-blur-md rounded-3xl p-5 sm:p-7 border border-[#D8D0BD] shadow-xs space-y-6 relative overflow-hidden"
    >
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#D8D0BD]/70">
        <div>
          <span className="text-[10px] uppercase tracking-widest text-[#80611F] font-bold block">
            Fila de Diagnósticos &amp; Anamnese Capilar
          </span>
          <h2 className="font-editorial text-xl sm:text-2xl font-bold text-[#1D3D3C] flex items-center gap-2 font-sans">
            <span>Triagens de Clientes</span>
            {counts.pending > 0 && (
              <span className="text-xs bg-[#FCF9F0] text-[#80611F] border border-[#C7A03A]/60 px-2.5 py-0.5 rounded-full font-bold animate-pulse">
                {counts.pending} pendente(s)
              </span>
            )}
          </h2>

          {/* Grafismo Oficial 1 - Linha Orgânica Dourada */}
          <div className="relative w-36 sm:w-44 h-2.5 my-1.5 opacity-80 pointer-events-none">
            <img
              src="/brand/Grafismos/linha-grafismo-1.png"
              alt=""
              className="w-full h-full object-contain object-left"
            />
          </div>
        </div>

        {/* Botões de Ação Rápida Accordion */}
        <div className="flex items-center gap-2 self-start sm:self-auto text-xs">
          <button
            type="button"
            onClick={expandAll}
            className="px-2.5 py-1 rounded-lg border border-[#D8D0BD] text-[#736455] hover:bg-[#FAF7F2] font-semibold transition-all"
          >
            Expandir Todos
          </button>
          <button
            type="button"
            onClick={collapseAll}
            className="px-2.5 py-1 rounded-lg border border-[#D8D0BD] text-[#736455] hover:bg-[#FAF7F2] font-semibold transition-all"
          >
            Recolher Todos
          </button>
        </div>
      </div>

      {/* Barra de Filtros com Contadores */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 flex-nowrap sm:flex-wrap">
        <button
          type="button"
          onClick={() => setFilterType("pending")}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 transition-all flex items-center gap-1.5 ${
            filterType === "pending"
              ? "bg-[#1D3D3C] text-white shadow-xs border border-[#C7A03A]/30"
              : "bg-[#FAF7F2] text-[#736455] border border-[#D8D0BD] hover:bg-[#EEE8DD]"
          }`}
        >
          <span>Aguardando Resposta</span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
              filterType === "pending"
                ? "bg-[#C7A03A] text-white"
                : "bg-amber-100 text-amber-900 border border-amber-300"
            }`}
          >
            {counts.pending}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setFilterType("encaixes")}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 transition-all flex items-center gap-1.5 ${
            filterType === "encaixes"
              ? "bg-[#1D3D3C] text-white shadow-xs border border-[#C7A03A]/30"
              : "bg-[#FAF7F2] text-[#736455] border border-[#D8D0BD] hover:bg-[#EEE8DD]"
          }`}
        >
          <Zap className="w-3.5 h-3.5" />
          <span>Encaixes &amp; Pré-Reservas</span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
              filterType === "encaixes"
                ? "bg-[#C7A03A] text-white"
                : "bg-amber-200 text-amber-950"
            }`}
          >
            {counts.encaixes}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setFilterType("sent")}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 transition-all flex items-center gap-1.5 ${
            filterType === "sent"
              ? "bg-[#1D3D3C] text-white shadow-xs border border-[#C7A03A]/30"
              : "bg-[#FAF7F2] text-[#736455] border border-[#D8D0BD] hover:bg-[#EEE8DD]"
          }`}
        >
          <span>Proposta Enviada</span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
              filterType === "sent"
                ? "bg-[#C7A03A] text-white"
                : "bg-blue-100 text-blue-900"
            }`}
          >
            {counts.sent}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setFilterType("approved")}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 transition-all flex items-center gap-1.5 ${
            filterType === "approved"
              ? "bg-[#1D3D3C] text-white shadow-xs border border-[#C7A03A]/30"
              : "bg-[#FAF7F2] text-[#736455] border border-[#D8D0BD] hover:bg-[#EEE8DD]"
          }`}
        >
          <span>Proposta Aprovada</span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
              filterType === "approved"
                ? "bg-[#C7A03A] text-white"
                : "bg-emerald-100 text-emerald-900"
            }`}
          >
            {counts.approved}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setFilterType("all")}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 transition-all flex items-center gap-1.5 ${
            filterType === "all"
              ? "bg-[#1D3D3C] text-white shadow-xs border border-[#C7A03A]/30"
              : "bg-[#FAF7F2] text-[#736455] border border-[#D8D0BD] hover:bg-[#EEE8DD]"
          }`}
        >
          <span>Todas</span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
              filterType === "all"
                ? "bg-[#736455] text-white"
                : "bg-stone-200 text-stone-700"
            }`}
          >
            {counts.all}
          </span>
        </button>
      </div>

      {/* Lista de Triagens com Accordions */}
      {filteredSubmissions.length === 0 ? (
        <div className="py-12 text-center text-xs text-stone-500 bg-[#FAF7F2] rounded-2xl border border-dashed border-[#E7DCCE] space-y-1">
          <p className="font-bold text-sm text-[#2D1914]">Nenhuma triagem encontrada nesta categoria.</p>
          <p className="text-stone-400">
            {filterType === "pending"
              ? "Todas as triagens já foram respondidas ou não há novas solicitações pendentes."
              : "Alterne o filtro acima para ver outras submissões."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredSubmissions.slice(0, visibleCount).map((sub) => {
            const isPending = sub.status === "pending_review";
            const isApproved = sub.status === "approved";
            const isExpanded = Boolean(expandedIds[sub.id]);

            const subAnswers = getAnswers(sub);

            // Detecta se a triagem foi enviada como Encaixe Especial / Pré-Reserva
            const isPreReservation =
              sub.preferredTimeSlot?.startsWith("Encaixe") ||
              subAnswers.some((a) => (a.questionTitle || "").toLowerCase().includes("encaixe"));

            const hasChemical = subAnswers.some(
              (a) =>
                (a.questionTitle || "").toLowerCase().includes("química") &&
                a.selectedOptionLabels?.some(
                  (opt: string) =>
                    !opt.toLowerCase().includes("nenhuma") &&
                    !opt.toLowerCase().includes("natural")
                )
            );

            const totalPhotos =
              (sub.photos?.currentHairRoot ? 1 : 0) +
              (sub.photos?.currentHairLength ? 1 : 0) +
              (sub.photos?.inspirationDesired ? 1 : 0);

            const linkedProposalId =
              sub.proposalId || proposals.find((p) => p.triageSubmissionId === sub.id)?.id;

            return (
              <div
                key={sub.id}
                className={`rounded-2xl border transition-all duration-200 shadow-2xs overflow-hidden ${
                  isPreReservation
                    ? "bg-gradient-to-br from-[#FFFDF7] via-[#FFFBF0] to-[#FEF6E4] border-amber-300 ring-1 ring-amber-300/60 hover:border-amber-400"
                    : "bg-[#FDFBF7] border-[#E7DCCE] hover:border-[#C59B27]"
                }`}
              >
                {/* ACCORDION HEADER (Visão Compacta e Completa) */}
                <div className="p-4 sm:p-5">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                    {/* Coluna 1: Dados da Cliente & Procedimento */}
                    <div className="space-y-1">
                      <div className="flex items-center flex-wrap gap-2">
                        <span className="font-bold text-base text-[#2D1914]">
                          {sub.clientName}
                        </span>

                        {/* WhatsApp Link Direto */}
                        {sub.clientPhone && (
                          <a
                            href={`https://wa.me/55${sub.clientPhone.replace(/\D/g, "")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded-lg transition-all"
                            title="Conversar no WhatsApp"
                          >
                            <Phone className="w-3 h-3 text-emerald-600" />
                            <span>{sub.clientPhone}</span>
                          </a>
                        )}

                        {/* Badge de Pré-Reserva com cor diferenciada */}
                        {isPreReservation && (
                          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-200/80 text-amber-950 border border-amber-400/80 flex items-center gap-1 shadow-2xs">
                            <Zap className="w-3 h-3 text-amber-700" />
                            <span>Encaixe Especial (Pré-Reserva)</span>
                          </span>
                        )}

                        {/* Alerta de Química */}
                        {hasChemical && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3 text-[#AD841D]" />
                            <span>Histórico Químico</span>
                          </span>
                        )}
                      </div>

                      <div className="flex items-center flex-wrap gap-2 text-xs text-[#683C30]">
                        <span className="font-semibold">
                          Procedimento: <strong className="text-[#2D1914]">{sub.serviceTitle}</strong>
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-[#AD841D]" />
                          Data: <strong className="text-[#2D1914]">{sub.preferredDate || "A definir"}</strong>
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-[#AD841D]" />
                          Horário: <strong className="text-[#2D1914]">{sub.preferredTimeSlot || "A definir"}</strong>
                        </span>
                      </div>
                    </div>

                    {/* Coluna 2: Status & Botões de Ação */}
                    <div className="flex items-center flex-wrap gap-2 pt-2 lg:pt-0 border-t lg:border-t-0 border-[#E7DCCE]/60">
                      {/* Badge de Status */}
                      {isPending ? (
                        <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                          Aguardando Proposta
                        </span>
                      ) : isApproved ? (
                        <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300">
                          Proposta Aprovada ✓
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-blue-100 text-blue-900 border border-blue-300">
                          Proposta Enviada
                        </span>
                      )}

                      {/* Botão de Montar Proposta / Aprovar Diretamente / Ver Proposta */}
                      {isPending ? (
                        <div className="flex items-center gap-1.5">
                          {onDirectApprove && (
                            <button
                              type="button"
                              data-tutorial="triage-approve-directly-btn"
                              onClick={() => setApprovingSubmission(sub)}
                              className="px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs flex items-center space-x-1 transition-all active:scale-95"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Aprovar Diretamente</span>
                            </button>
                          )}
                          <button
                            type="button"
                            data-tutorial="triage-proposal-btn"
                            onClick={() => setSelectedSubForProposal(sub)}
                            className="px-3.5 py-1.5 text-xs font-bold text-white gold-gradient rounded-xl shadow-xs hover:opacity-95 flex items-center space-x-1 transition-all active:scale-95"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>Montar Proposta</span>
                          </button>
                        </div>
                      ) : linkedProposalId ? (
                        <button
                          type="button"
                          onClick={() => onViewProposal(linkedProposalId)}
                          className="px-3 py-1.5 text-xs font-semibold text-[#44271F] bg-white border border-[#E7DCCE] hover:bg-[#FAF7F2] rounded-xl flex items-center space-x-1"
                        >
                          <ExternalLink className="w-3.5 h-3.5 text-[#AD841D]" />
                          <span>Ver Proposta</span>
                        </button>
                      ) : null}

                      {/* Botão Toggle Accordion */}
                      <button
                        type="button"
                        onClick={() => toggleExpand(sub.id)}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-xl border flex items-center gap-1.5 transition-all ${
                          isExpanded
                            ? "bg-[#2D1914] text-white border-[#2D1914]"
                            : "bg-white text-stone-700 border-[#E7DCCE] hover:bg-[#FAF7F2]"
                        }`}
                      >
                        <span className="hidden sm:inline">
                          {isExpanded
                            ? "Recolher Detalhes"
                            : `Ver Respostas & Fotos (${subAnswers.length} itens${
                                totalPhotos > 0 ? `, ${totalPhotos} fotos` : ""
                              })`}
                        </span>
                        <span className="sm:hidden">
                          {isExpanded ? "Recolher" : `Detalhes (${totalPhotos > 0 ? `${totalPhotos} fotos` : `${subAnswers.length} itens`})`}
                        </span>
                        {isExpanded ? (
                          <ChevronUp className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* ACCORDION BODY (Conteúdo Detalhado Recolhível) */}
                {isExpanded && (
                  <div className="px-4 pb-5 sm:px-5 pt-3 border-t border-[#E7DCCE]/60 bg-white/70 space-y-4 animate-fade-in">
                    {/* Alerta de Química Expandido */}
                    {hasChemical && (
                      <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-medium">
                        <AlertTriangle className="w-4 h-4 text-[#AD841D] shrink-0" />
                        <span>
                          <strong>Atenção Técnica:</strong> A cliente relatou histórico de processos químicos anteriores. Realizar teste de mecha prévio e avaliar a resistência da fibra capilar antes da aplicação de descolorantes ou tinturas.
                        </span>
                      </div>
                    )}

                    {/* Fotos Enviadas pela Cliente */}
                    {totalPhotos > 0 ? (
                      <div className="space-y-2">
                        <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block">
                          Fotografias Enviadas pela Cliente ({totalPhotos}):
                        </span>
                        <div className="flex flex-wrap items-center gap-3">
                          {sub.photos?.currentHairRoot && (
                            <div
                              onClick={() => handleOpenGallery(sub, sub.photos.currentHairRoot!)}
                              className="relative group cursor-pointer"
                            >
                              <img
                                src={sub.photos.currentHairRoot}
                                alt="Raiz"
                                loading="lazy"
                                decoding="async"
                                className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover border border-[#E7DCCE] shadow-xs group-hover:scale-105 transition-all"
                              />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 rounded-2xl flex items-center justify-center transition-all">
                                <Eye className="w-5 h-5 text-white" />
                              </div>
                              <span className="absolute bottom-1 inset-x-1 bg-black/70 text-[9px] text-white text-center rounded-lg py-0.5 font-bold">
                                Raiz Natural
                              </span>
                            </div>
                          )}

                          {sub.photos?.currentHairLength && (
                            <div
                              onClick={() => handleOpenGallery(sub, sub.photos.currentHairLength!)}
                              className="relative group cursor-pointer"
                            >
                              <img
                                src={sub.photos.currentHairLength}
                                alt="Comprimento"
                                loading="lazy"
                                decoding="async"
                                className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover border border-[#E7DCCE] shadow-xs group-hover:scale-105 transition-all"
                              />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 rounded-2xl flex items-center justify-center transition-all">
                                <Eye className="w-5 h-5 text-white" />
                              </div>
                              <span className="absolute bottom-1 inset-x-1 bg-black/70 text-[9px] text-white text-center rounded-lg py-0.5 font-bold">
                                Fios & Pontas
                              </span>
                            </div>
                          )}

                          {sub.photos?.inspirationDesired && (
                            <div
                              onClick={() => handleOpenGallery(sub, sub.photos.inspirationDesired!)}
                              className="relative group cursor-pointer"
                            >
                              <img
                                src={sub.photos.inspirationDesired}
                                alt="Inspiração"
                                loading="lazy"
                                decoding="async"
                                className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover border border-[#E7DCCE] shadow-xs group-hover:scale-105 transition-all"
                              />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 rounded-2xl flex items-center justify-center transition-all">
                                <Eye className="w-5 h-5 text-white" />
                              </div>
                              <span className="absolute bottom-1 inset-x-1 bg-amber-950/80 text-[9px] text-white text-center rounded-lg py-0.5 font-bold">
                                Inspiração Desejada
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 rounded-xl bg-stone-50 border border-stone-200/70 text-xs text-stone-500 italic">
                        Nenhuma fotografia anexada nesta triagem.
                      </div>
                    )}

                    {/* Respostas da Anamnese Capilar (Filtrando perguntas de fotos) */}
                    {(() => {
                      const technicalAnswers = subAnswers.filter((a) => {
                        const t = (a.questionTitle || "").toLowerCase();
                        return (
                          !t.includes("foto") &&
                          !t.includes("upload") &&
                          !t.includes("imagem")
                        );
                      });

                      if (technicalAnswers.length === 0) return null;

                      return (
                        <div className="space-y-2 pt-2">
                          <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block">
                            Questionário Técnico Respondido ({technicalAnswers.length} perguntas):
                          </span>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                            {technicalAnswers.map((a, i) => (
                              <div
                                key={i}
                                className="p-3 rounded-xl bg-white border border-[#E7DCCE]/80 shadow-2xs space-y-1"
                              >
                                <span className="text-[11px] font-bold text-[#AD841D] block">
                                  {a.questionTitle}
                                </span>
                                <span className="text-xs font-semibold text-[#2D1914] block leading-snug">
                                  {a.selectedOptionLabels && a.selectedOptionLabels.length > 0
                                    ? a.selectedOptionLabels.join(" • ")
                                    : a.answerText || "Não informado"}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Controle de Paginação (5 em 5) */}
      {filteredSubmissions.length > visibleCount && (
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-[#E7DCCE]/60">
          <p className="text-xs text-stone-500">
            Exibindo <span className="font-bold text-[#2D1914]">{Math.min(visibleCount, filteredSubmissions.length)}</span> de{" "}
            <span className="font-bold text-[#2D1914]">{filteredSubmissions.length}</span> triagens
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setVisibleCount((prev) => prev + PAGE_SIZE)}
              className="px-4 py-2 rounded-xl text-xs font-bold text-[#2D1914] bg-[#FAF7F2] hover:bg-[#F2ECE1] border border-[#E7DCCE] transition-all shadow-2xs hover:shadow-xs active:scale-95"
            >
              Carregar mais 5 triagens
            </button>
            <button
              type="button"
              onClick={() => setVisibleCount(filteredSubmissions.length)}
              className="px-3 py-2 rounded-xl text-xs font-semibold text-stone-500 hover:text-stone-800 transition-all"
            >
              Ver todas ({filteredSubmissions.length})
            </button>
          </div>
        </div>
      )}

      {/* Modal de Zoom de Fotografia (Galeria Fullscreen) */}
      {activeGalleryPhotos && (
        <PhotoGalleryLightbox
          photos={activeGalleryPhotos}
          initialIndex={activeGalleryIndex}
          onClose={() => setActiveGalleryPhotos(null)}
        />
      )}

      {/* Modal de Criação de Proposta */}
      {selectedSubForProposal && (
        <ProposalBuilderModal
          submission={selectedSubForProposal}
          services={services}
          existingAppointments={existingAppointments}
          availableDays={availableDays}
          onSave={(prop, openWA) => {
            onGenerateProposal(prop, openWA);
            setSelectedSubForProposal(null);
          }}
          onClose={() => setSelectedSubForProposal(null)}
        />
      )}

      {/* Modal de Aprovação Direta de Triagem (R10.1) */}
      {approvingSubmission && onDirectApprove && (
        <DirectApproveModal
          submission={approvingSubmission}
          services={services}
          onConfirm={async (date, time, price, openWA) => {
            await onDirectApprove(approvingSubmission, date, time, price, openWA);
            setApprovingSubmission(null);
          }}
          onClose={() => setApprovingSubmission(null)}
        />
      )}
    </div>
  );
}

interface DirectApproveModalProps {
  submission: TriageSubmission;
  services: ServiceItem[];
  onConfirm: (date: string, time: string, price: number, openWhatsApp: boolean) => Promise<void> | void;
  onClose: () => void;
}

function DirectApproveModal({ submission, services, onConfirm, onClose }: DirectApproveModalProps) {
  const matchedService = services.find((s) => s.id === submission.serviceId) || services[0];

  const getInitialDate = () => {
    if (submission.preferredDate && /^\d{4}-\d{2}-\d{2}$/.test(submission.preferredDate)) {
      return submission.preferredDate;
    }
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  const getInitialTime = () => {
    if (submission.preferredTimeSlot) {
      const match = submission.preferredTimeSlot.match(/\b\d{2}:\d{2}\b/);
      if (match) return match[0];
    }
    return "09:00";
  };

  const [date, setDate] = useState(getInitialDate);
  const [time, setTime] = useState(getInitialTime);
  const [price, setPrice] = useState<number>(
    matchedService?.promotionalPrice || matchedService?.price || 150
  );
  const [sendWhatsApp, setSendWhatsApp] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onConfirm(date, time, Number(price), sendWhatsApp);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-hidden">
      <div className="bg-white rounded-t-[28px] sm:rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-[#E7DCCE] animate-slide-up-sheet space-y-4">
        <div className="flex items-center justify-between border-b border-[#E7DCCE]/60 pb-3">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-700 block">
              Aprovação Direta • Sem Proposta
            </span>
            <h3 className="text-lg font-bold text-[#2D1914]">Agendar Atendimento</h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 flex items-center justify-center text-stone-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-3.5 rounded-2xl bg-[#FAF7F2] border border-[#E7DCCE] text-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="font-bold text-[#2D1914] text-sm">{submission.clientName}</span>
            <span className="text-stone-500 font-mono">{submission.clientPhone}</span>
          </div>
          <p className="text-stone-600">
            Procedimento: <strong>{matchedService?.title || submission.serviceTitle}</strong>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-[#2D1914] mb-1">Data *</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-[#E7DCCE] outline-none"
              />
            </div>
            <div>
              <label className="block font-semibold text-[#2D1914] mb-1">Horário de Início *</label>
              <input
                type="time"
                required
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-[#E7DCCE] outline-none font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-[#2D1914] mb-1">Valor do Procedimento (R$) *</label>
            <input
              type="number"
              step="any"
              required
              value={price}
              onChange={(e) => setPrice(Number(e.target.value))}
              className="w-full p-2.5 rounded-xl border border-[#E7DCCE] outline-none font-mono"
            />
          </div>

          <label className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50/70 border border-emerald-200 text-xs text-emerald-950 cursor-pointer">
            <input
              type="checkbox"
              checked={sendWhatsApp}
              onChange={(e) => setSendWhatsApp(e.target.checked)}
              className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
            />
            <span>Abrir WhatsApp com a mensagem padrão de confirmação</span>
          </label>

          <div className="flex items-center justify-end space-x-2 pt-2 border-t border-[#E7DCCE]/60">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 font-semibold text-stone-600 hover:bg-stone-100 rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-all active:scale-95 disabled:opacity-50"
            >
              {isSubmitting ? "Aprovando..." : "Confirmar Aprovação & Agendar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

