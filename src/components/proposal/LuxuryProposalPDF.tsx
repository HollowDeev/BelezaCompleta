"use client";

import { useState, useMemo } from "react";
import { LuxuryProposal } from "@/types/proposal";
import { formatBRL, generateWhatsAppLink } from "@/lib/utils";
import {
  Download,
  Share2,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
  HeartHandshake,
  Clock,
  Printer,
  CalendarCheck,
  Edit3,
  ExternalLink,
  Layers,
  ArrowRight,
  Calendar,
  CalendarDays,
  Info,
  Check,
} from "lucide-react";
import confetti from "canvas-confetti";
import { PhotoGalleryLightbox, GalleryPhoto } from "@/components/common/PhotoGalleryLightbox";

interface LuxuryProposalPDFProps {
  proposal: LuxuryProposal;
  isClientView?: boolean;
  isModalView?: boolean;
  onEdit?: () => void;
  onApprove?: (
    proposalId: string,
    options?: { chosenDate?: string; chosenTime?: string }
  ) => void;
  onBack?: () => void;
}

export function LuxuryProposalPDF({
  proposal,
  isClientView = false,
  isModalView = false,
  onEdit,
  onApprove,
  onBack,
}: LuxuryProposalPDFProps) {
  const [isApproving, setIsApproving] = useState(false);
  const [isApproved, setIsApproved] = useState(proposal.status === "approved");

  // Estados para escolha de data quando a Gleicy sugeriu período flexível
  const [clientChosenDate, setClientChosenDate] = useState<string>(
    proposal.schedulingDetails?.clientChosenDate ||
      proposal.schedulingDetails?.suggestedDateStart ||
      proposal.schedulingDetails?.confirmedDate ||
      proposal.schedulingDetails?.originalDate ||
      ""
  );

  const [clientChosenTime, setClientChosenTime] = useState<string>(
    proposal.schedulingDetails?.clientChosenTime ||
      proposal.schedulingDetails?.suggestedTime ||
      proposal.schedulingDetails?.confirmedTime ||
      "09:30"
  );

  // Galeria Fullscreen de Fotos
  const [activeLightboxPhotos, setActiveLightboxPhotos] = useState<GalleryPhoto[] | null>(null);
  const [activeLightboxIndex, setActiveLightboxIndex] = useState(0);

  const getProposalPhotos = (): GalleryPhoto[] => {
    if (!proposal.photos) return [];
    const list: GalleryPhoto[] = [];
    if (proposal.photos.currentHairRoot) {
      list.push({
        url: proposal.photos.currentHairRoot,
        title: "Raiz Natural do Cabelo",
        subtitle: `Cliente: ${proposal.clientName}`,
      });
    }
    if (proposal.photos.currentHairLength) {
      list.push({
        url: proposal.photos.currentHairLength,
        title: "Comprimento e Pontas dos Fios",
        subtitle: `Cliente: ${proposal.clientName}`,
      });
    }
    if (proposal.photos.inspirationDesired) {
      list.push({
        url: proposal.photos.inspirationDesired,
        title: "Referência / Inspiração Desejada",
        subtitle: `Cliente: ${proposal.clientName}`,
      });
    }
    return list;
  };

  const handleOpenGallery = (photoUrl: string) => {
    const photos = getProposalPhotos();
    const idx = photos.findIndex((p) => p.url === photoUrl);
    setActiveLightboxPhotos(photos);
    setActiveLightboxIndex(idx >= 0 ? idx : 0);
  };

  const handleApprove = () => {
    setIsApproving(true);
    setTimeout(() => {
      setIsApproving(false);
      setIsApproved(true);
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
        colors: ["#C59B27", "#5E372C", "#DBAE3B", "#FAF7F2"],
      });
      onApprove?.(proposal.id, {
        chosenDate: clientChosenDate,
        chosenTime: clientChosenTime,
      });
    }, 700);
  };

  const handlePrint = () => {
    window.print();
  };

  const proposalUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/proposta/${proposal.id}`
      : `/proposta/${proposal.id}`;

  const shareText = `Olá, ${proposal.clientName}! Segue sua Proposta Personalizada exclusiva criada pela Gleicy Ronha: ${proposalUrl}`;
  const whatsappUrl = generateWhatsAppLink(proposal.clientPhone, shareText);

  const discountAmount = Math.max(
    0,
    proposal.totalOriginal - proposal.totalWithDiscount
  );
  const discountPercent =
    proposal.totalOriginal > 0
      ? Math.round((discountAmount / proposal.totalOriginal) * 100)
      : 0;
  const totalGeneralSavings = Math.max(
    0,
    proposal.totalOriginal - proposal.pixTotal
  );

  const primordialItems = useMemo(() => {
    return (proposal.items || []).filter((item) => item.isPrimordial !== false);
  }, [proposal.items]);

  const additionalItems = useMemo(() => {
    return (proposal.items || []).filter((item) => item.isPrimordial === false);
  }, [proposal.items]);

  const mainServiceName =
    primordialItems[0]?.serviceGroup || proposal.title || "Serviço Principal";

  const primordialSubtotal = useMemo(() => {
    return primordialItems
      .filter((i) => !i.isIncluded && Number(i.originalPrice) > 0)
      .reduce(
        (sum, i) => sum + (Number(i.specialPrice || i.originalPrice) || 0),
        0
      );
  }, [primordialItems]);

  const additionalSubtotal = useMemo(() => {
    return additionalItems
      .filter((i) => !i.isIncluded && Number(i.originalPrice) > 0)
      .reduce(
        (sum, i) => sum + (Number(i.specialPrice || i.originalPrice) || 0),
        0
      );
  }, [additionalItems]);

  return (
    <div
      className={
        isModalView
          ? "w-full flex flex-col items-center"
          : "min-h-screen py-6 sm:py-10 px-3 sm:px-6 flex flex-col items-center"
      }
    >
      {/* Barra de Ações Superior (Invisível na impressão) */}
      <div className="no-print w-full max-w-4xl mb-6 flex flex-wrap items-center justify-between gap-3 bg-white/95 p-3.5 sm:p-4 rounded-2xl shadow-xs border border-[#E7DCCE]">
        <div className="flex items-center space-x-2">
          {onBack && (
            <button
              onClick={onBack}
              className="px-3 py-1.5 text-xs text-[#5E372C] hover:bg-[#F3ECE1] rounded-lg transition-colors min-h-[38px] flex items-center"
            >
              ← Voltar
            </button>
          )}
          <span className="text-xs uppercase tracking-wider text-[#AD841D] font-semibold flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">Status:</span>{" "}
            {isApproved ? (
              <span className="text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 font-bold">
                Aprovada ✓
              </span>
            ) : proposal.status === "sent" ? (
              <span className="text-[#C59B27] bg-[#FAF7F2] px-2.5 py-0.5 rounded-full border border-[#E7DCCE] font-bold">
                Aguardando Aprovação
              </span>
            ) : (
              <span className="text-stone-600 bg-stone-100 px-2.5 py-0.5 rounded-full font-bold">
                Rascunho
              </span>
            )}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
          {onEdit && !isApproved && (
            <button
              onClick={onEdit}
              className="px-3 sm:px-3.5 py-2 text-xs font-semibold text-[#5E372C] bg-white hover:bg-[#F3ECE1] border border-[#E7DCCE] rounded-xl flex items-center space-x-1.5 transition-colors shadow-2xs min-h-[38px]"
            >
              <Edit3 className="w-3.5 h-3.5 text-[#C59B27]" />
              <span>Editar</span>
            </button>
          )}

          <button
            onClick={handlePrint}
            className="px-3 sm:px-3.5 py-2 text-xs font-medium text-stone-700 bg-stone-50 hover:bg-stone-100 border border-stone-200 rounded-xl flex items-center space-x-1.5 transition-colors min-h-[38px]"
          >
            <Printer className="w-3.5 h-3.5 text-stone-500" />
            <span className="hidden sm:inline">Imprimir / Salvar PDF</span>
            <span className="sm:hidden">PDF</span>
          </button>

          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 sm:px-3.5 py-2 text-xs font-medium text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl flex items-center space-x-1.5 transition-all shadow-2xs min-h-[38px]"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Enviar WhatsApp</span>
            <span className="sm:hidden">WhatsApp</span>
          </a>

          {!isApproved && (
            <button
              onClick={handleApprove}
              disabled={isApproving}
              className="px-3.5 sm:px-4 py-2 text-xs font-semibold text-white gold-gradient hover:opacity-95 rounded-xl shadow-xs flex items-center space-x-1.5 transition-all active:scale-95 min-h-[38px]"
            >
              {isApproving ? (
                <span>Confirmando...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Aprovar Proposta</span>
                  <span className="sm:hidden">Aprovar</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* DOCUMENTO OFICIAL DIAGRAMADO (A4 Elegante) */}
      <div
        id="luxury-proposal-document"
        className="print-page w-full max-w-4xl bg-white text-[#22201E] shadow-xl rounded-xl sm:rounded-2xl border border-[#E7DCCE]/80 p-4 xs:p-5 sm:p-10 md:p-14 transition-all"
      >
        {/* Cabeçalho da Proposta */}
        <div className="text-center pb-6 sm:pb-8 border-b border-[#E7DCCE]/60 relative">
          <p className="text-[10px] sm:text-xs uppercase tracking-[0.2em] sm:tracking-[0.25em] text-[#AD841D] font-semibold mb-2">
            E X C L U S I V I D A D E &nbsp;&amp;&nbsp; A L T A &nbsp; P E R F O R M A N C E
          </p>
          <h1 className="font-editorial text-xl xs:text-2xl sm:text-4xl font-bold tracking-wide text-[#2D1914] uppercase">
            {proposal.title}
          </h1>
          <p className="font-editorial italic text-xs sm:text-base text-[#683C30] mt-1">
            {proposal.subtitle}
          </p>

          <div className="w-20 sm:w-24 h-0.5 mx-auto bg-gradient-to-r from-transparent via-[#C59B27] to-transparent mt-3 sm:mt-4" />
        </div>

        {/* Barra de Identificação da Cliente */}
        <div className="my-4 sm:my-6 p-3.5 sm:p-4 rounded-xl bg-[#FDFBF7] border border-[#E7DCCE]/70 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs sm:text-sm">
          <div className="flex items-center space-x-2">
            <span className="font-bold tracking-wider uppercase text-[#44271F]">
              CLIENTE:
            </span>
            <span className="font-semibold text-[#2D1914]">
              {proposal.clientName}
            </span>
          </div>
          <div className="flex items-center space-x-2 text-[#683C30]">
            <span className="font-bold tracking-wider uppercase text-[#44271F]">
              CONTATO:
            </span>
            <span>{proposal.clientPhone}</span>
          </div>
        </div>

        {/* ============================================================== */}
        {/* SEÇÃO ESPECIAL: AGENDAMENTO, DATA & ETAPAS                     */}
        {/* ============================================================== */}
        {proposal.schedulingDetails && (
          <section className="my-6 sm:my-8 print-avoid-break">
            <h2 className="font-editorial text-xs sm:text-sm tracking-[0.15em] sm:tracking-[0.2em] uppercase text-[#AD841D] font-bold mb-3 flex items-center gap-1.5">
              <span>✦</span> A G E N D A M E N T O &nbsp; &amp; &nbsp; D A T A &nbsp; D O &nbsp; P R O C E D I M E N T O
            </h2>

            {/* Caso 1: Horário Aceito ou Original Confirmado */}
            {(proposal.schedulingDetails.status === "accepted_original" ||
              proposal.schedulingDetails.status === "accepted_encaixe") && (
              <div className="p-4 sm:p-6 rounded-2xl bg-gradient-to-br from-[#FAF7F2] to-amber-50/40 border border-[#C59B27]/40 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E7DCCE]/60">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-full bg-[#C59B27]/10 flex items-center justify-center text-[#AD841D] shrink-0">
                      <CalendarCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#AD841D] block">
                        Data e Horário Reservados para Você
                      </span>
                      <strong className="text-sm sm:text-base text-[#2D1914]">
                        {proposal.schedulingDetails.confirmedDate ||
                          proposal.schedulingDetails.originalDate}{" "}
                        às{" "}
                        {proposal.schedulingDetails.confirmedTime ||
                          proposal.schedulingDetails.originalTime}
                      </strong>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs font-semibold text-stone-700 bg-white px-3.5 py-1.5 rounded-xl border border-[#E7DCCE] self-start sm:self-auto">
                    <Clock className="w-3.5 h-3.5 text-[#AD841D]" />
                    <span>
                      Duração Total: {proposal.schedulingDetails.totalDurationMin || 180} min
                    </span>
                  </div>
                </div>

                {/* Linha do tempo das etapas técnicas */}
                {proposal.schedulingDetails.technicalSteps &&
                  proposal.schedulingDetails.technicalSteps.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-[11px] font-bold text-[#5E372C] uppercase tracking-wider block">
                        Cronograma das Fases do Procedimento:
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                        {proposal.schedulingDetails.technicalSteps.map(
                          (step, idx) => (
                            <div
                              key={step.id || idx}
                              className={`p-2.5 rounded-xl border flex items-center justify-between ${
                                step.type === "pause"
                                  ? "bg-amber-50/60 border-amber-300 text-amber-950 font-semibold"
                                  : "bg-white border-[#E7DCCE] text-stone-800"
                              }`}
                            >
                              <span className="truncate pr-2">
                                {idx + 1}. {step.title}
                              </span>
                              <span className="text-[10px] text-stone-500 font-bold shrink-0">
                                {step.durationMin}m
                              </span>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  )}
              </div>
            )}

            {/* Caso 2: Sugestão de Nova Data / Contraproposta de Encaixe */}
            {(proposal.schedulingDetails.status === "suggested_alternative" ||
              proposal.schedulingDetails.status === "conflict_reschedule") && (
              <div className="p-4 sm:p-6 rounded-2xl bg-amber-50/80 border border-amber-300 shadow-xs space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full bg-amber-200/80 text-amber-900 flex items-center justify-center shrink-0 mt-0.5">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase tracking-wider font-extrabold text-amber-900 block">
                      Orientação Técnica Especial de Agenda • Gleicy Ronha
                    </span>
                    <h3 className="font-bold text-sm sm:text-base text-[#2D1914]">
                      {proposal.schedulingDetails.dateSuggestionType === "range"
                        ? "Sugestão de Período Flexível para seu Atendimento"
                        : "Sugestão de Nova Data / Horário com Dedicação Total"}
                    </h3>
                    {proposal.schedulingDetails.scheduleChangeReason && (
                      <p className="text-xs text-[#5E372C] leading-relaxed pt-1 italic">
                        &quot;{proposal.schedulingDetails.scheduleChangeReason}&quot;
                      </p>
                    )}
                  </div>
                </div>

                <div className="p-3.5 sm:p-4 rounded-xl bg-white border border-amber-200 text-xs text-[#2D1914]">
                  {proposal.schedulingDetails.dateSuggestionType === "range" ? (
                    <div className="space-y-2">
                      <p className="font-semibold text-stone-800">
                        Disponibilidade técnica entre{" "}
                        <strong className="text-amber-900">
                          {proposal.schedulingDetails.suggestedDateStart}
                        </strong>{" "}
                        e{" "}
                        <strong className="text-amber-900">
                          {proposal.schedulingDetails.suggestedDateEnd}
                        </strong>{" "}
                        (Turno:{" "}
                        {proposal.schedulingDetails.suggestedPeriod === "manha"
                          ? "Manhã"
                          : proposal.schedulingDetails.suggestedPeriod === "tarde"
                          ? "Tarde"
                          : "Flexível"}
                        ).
                      </p>
                      <p className="text-[11px] text-stone-500">
                        Escolha o dia ideal no campo de confirmação abaixo para travar sua vaga na agenda.
                      </p>
                    </div>
                  ) : (
                    <p className="font-semibold">
                      Data sugerida pela especialista:{" "}
                      <strong className="text-amber-900">
                        {proposal.schedulingDetails.confirmedDate ||
                          proposal.schedulingDetails.suggestedDateStart}
                      </strong>{" "}
                      às{" "}
                      <strong className="text-amber-900">
                        {proposal.schedulingDetails.confirmedTime ||
                          proposal.schedulingDetails.suggestedTime ||
                          "09:00"}
                      </strong>
                    </p>
                  )}
                </div>
              </div>
            )}
          </section>
        )}

        {/* 1. O Projeto / Proposta para o seu Cabelo */}
        <section className="my-6 sm:my-8">
          <h2 className="font-editorial text-xs sm:text-sm tracking-[0.15em] sm:tracking-[0.2em] uppercase text-[#AD841D] font-bold mb-3">
            O P R O J E T O &nbsp; P A R A &nbsp; O &nbsp; S E U &nbsp; C A B E L O
          </h2>
          <div className="p-4 sm:p-6 rounded-xl bg-[#FAF7F2]/60 border border-[#E7DCCE]/50 text-xs sm:text-sm leading-relaxed text-[#33302C]">
            <p className="whitespace-pre-line">{proposal.projectOverview}</p>
          </div>
        </section>

        {/* 2. Resultado Desejado & Técnica Escolhida */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-8 print-avoid-break">
          {/* Resultado Desejado */}
          <div className="p-5 rounded-xl border border-[#E7DCCE]/60 bg-white">
            <h3 className="font-editorial text-xs tracking-widest uppercase text-[#AD841D] font-bold mb-3 flex items-center gap-1.5">
              <span>✦</span> RESULTADO DESEJADO
            </h3>
            <ul className="space-y-2 text-xs sm:text-sm text-[#44271F]">
              {proposal.desiredResults.map((result, idx) => (
                <li key={idx} className="flex items-start space-x-2">
                  <span className="text-[#C59B27] text-xs mt-0.5">✦</span>
                  <span>{result}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Técnica Escolhida */}
          <div className="p-5 rounded-xl border border-[#E7DCCE]/60 bg-white">
            <h3 className="font-editorial text-xs tracking-widest uppercase text-[#AD841D] font-bold mb-3 flex items-center gap-1.5">
              <span>✦</span> TÉCNICA ESCOLHIDA
            </h3>
            <p className="text-xs sm:text-sm text-[#33302C] leading-relaxed">
              {proposal.chosenTechnique}
            </p>
          </div>
        </div>

        {/* Fotografias de Referência & Diagnóstico */}
        {proposal.photos &&
          (proposal.photos.currentHairRoot ||
            proposal.photos.currentHairLength ||
            proposal.photos.inspirationDesired) && (
            <section className="my-8 print-avoid-break">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-editorial text-xs sm:text-sm tracking-[0.2em] uppercase text-[#AD841D] font-bold">
                  D I A G N Ó S T I C O &nbsp; V I S U A L &nbsp; & &nbsp; R E F E R Ê N C I A S
                </h2>
                <span className="text-[10px] text-stone-500 font-semibold no-print">
                  Clique na imagem para ampliar em tela cheia
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {proposal.photos.currentHairRoot && (
                  <div
                    onClick={() => handleOpenGallery(proposal.photos!.currentHairRoot!)}
                    className="group relative rounded-2xl overflow-hidden border border-[#E7DCCE] bg-stone-100 aspect-square cursor-pointer shadow-2xs hover:shadow-md transition-all"
                  >
                    <img
                      src={proposal.photos.currentHairRoot}
                      alt="Raiz"
                      className="w-full h-full object-cover group-hover:scale-105 transition-all"
                    />
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="px-2.5 py-1 rounded-full bg-white/90 text-stone-900 text-[10px] font-bold">
                        Ver Foto
                      </span>
                    </div>
                    <span className="absolute bottom-1.5 inset-x-1.5 bg-black/70 text-white text-[9px] font-bold text-center py-0.5 rounded-lg">
                      Raiz Natural
                    </span>
                  </div>
                )}
                {proposal.photos.currentHairLength && (
                  <div
                    onClick={() => handleOpenGallery(proposal.photos!.currentHairLength!)}
                    className="group relative rounded-2xl overflow-hidden border border-[#E7DCCE] bg-stone-100 aspect-square cursor-pointer shadow-2xs hover:shadow-md transition-all"
                  >
                    <img
                      src={proposal.photos.currentHairLength}
                      alt="Comprimento"
                      className="w-full h-full object-cover group-hover:scale-105 transition-all"
                    />
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="px-2.5 py-1 rounded-full bg-white/90 text-stone-900 text-[10px] font-bold">
                        Ver Foto
                      </span>
                    </div>
                    <span className="absolute bottom-1.5 inset-x-1.5 bg-black/70 text-white text-[9px] font-bold text-center py-0.5 rounded-lg">
                      Comprimento e Pontas
                    </span>
                  </div>
                )}
                {proposal.photos.inspirationDesired && (
                  <div
                    onClick={() => handleOpenGallery(proposal.photos!.inspirationDesired!)}
                    className="group relative rounded-2xl overflow-hidden border border-[#E7DCCE] bg-stone-100 aspect-square cursor-pointer shadow-2xs hover:shadow-md transition-all"
                  >
                    <img
                      src={proposal.photos.inspirationDesired}
                      alt="Inspiração"
                      className="w-full h-full object-cover group-hover:scale-105 transition-all"
                    />
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="px-2.5 py-1 rounded-full bg-white/90 text-stone-900 text-[10px] font-bold">
                        Ver Foto
                      </span>
                    </div>
                    <span className="absolute bottom-1.5 inset-x-1.5 bg-amber-950/80 text-white text-[9px] font-bold text-center py-0.5 rounded-lg">
                      Inspiração Desejada
                    </span>
                  </div>
                )}
              </div>
            </section>
          )}

        {/* 3. Protocolos Inclusos */}
        <section className="my-8 print-avoid-break">
          <h2 className="font-editorial text-xs sm:text-sm tracking-[0.2em] uppercase text-[#AD841D] font-bold mb-3">
            P R O T O C O L O S &nbsp; I N C L U S O S
          </h2>
          <div className="p-5 rounded-xl border border-[#E7DCCE]/60 bg-[#FDFBF7]">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm text-[#33302C]">
              {proposal.includedItems.map((item, idx) => (
                <div key={idx} className="flex items-start space-x-2">
                  <span className="text-emerald-700 font-bold text-sm">✓</span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-[#683C30] italic mt-4 pt-3 border-t border-[#E7DCCE]/40">
              * Todo o protocolo de tratamento necessário para proteger e cuidar do cabelo já está incluso no valor apresentado.
            </p>
          </div>
        </section>

        {/* 4. ETAPAS DO PROCEDIMENTO & INVESTIMENTO */}
        <section className="my-6 sm:my-8 print-avoid-break space-y-5 sm:space-y-6">
          <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-1.5">
            <h2 className="font-editorial text-xs sm:text-sm tracking-[0.15em] sm:tracking-[0.2em] uppercase text-[#AD841D] font-bold">
              E T A P A S &nbsp; D O &nbsp; P R O C E D I M E N T O &nbsp; & &nbsp; I N V E S T I M E N T O
            </h2>
            <span className="text-[10px] uppercase font-bold text-[#683C30] bg-[#FAF7F2] px-2.5 py-1 rounded-full border border-[#E7DCCE] self-start xs:self-auto">
              {proposal.items.length}{" "}
              {proposal.items.length === 1 ? "Etapa Planejada" : "Etapas Planejadas"}
            </span>
          </div>

          {/* BLOCO 1: PACOTE DO SERVIÇO PRINCIPAL */}
          <div className="p-3.5 sm:p-5 rounded-xl sm:rounded-2xl border-2 border-[#C59B27]/40 bg-gradient-to-br from-white to-[#FAF7F2] space-y-3.5 sm:space-y-4 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#E7DCCE]">
              <div>
                <span className="text-[9px] uppercase tracking-wider font-extrabold text-[#AD841D] bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md inline-block mb-1">
                  Pacote do Serviço Principal
                </span>
                <h3 className="font-editorial text-base sm:text-lg font-bold text-[#2D1914]">
                  {mainServiceName}
                </h3>
                <p className="text-xs text-stone-600 mt-0.5">
                  Todas as etapas abaixo compõem o valor contratado para a entrega completa do resultado.
                </p>
              </div>

              <div className="text-right self-start sm:self-auto bg-white px-3 sm:px-3.5 py-1.5 rounded-xl border border-[#C59B27]/40 shadow-2xs">
                <span className="text-[9px] uppercase font-bold text-stone-500 block">
                  Subtotal do Serviço
                </span>
                <span className="font-editorial text-base sm:text-lg font-bold text-[#2D1914]">
                  {formatBRL(primordialSubtotal)}
                </span>
              </div>
            </div>

            {/* Cards das Etapas Primordiais */}
            <div className="space-y-2.5 sm:space-y-3">
              {primordialItems.map((item, idx) => {
                const isIncluded = item.isIncluded || Number(item.originalPrice) === 0;

                return (
                  <div
                    key={item.id || idx}
                    className={`p-3 sm:p-4 rounded-xl border transition-all ${
                      !isIncluded
                        ? "bg-white border-[#C59B27]/40 shadow-2xs"
                        : "bg-white/80 border-[#E7DCCE]"
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-1.5">
                      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                        <span className="w-5 h-5 rounded-full bg-[#2D1914] text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>

                        {item.durationMin && (
                          <span className="px-2 py-0.5 rounded-md bg-stone-100 text-stone-600 text-[10px] font-bold flex items-center gap-1 border border-stone-200">
                            <Clock className="w-3 h-3 text-[#AD841D]" />
                            {item.durationMin} min
                          </span>
                        )}

                        {item.stepType && (
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                              item.stepType === "pause"
                                ? "bg-purple-50 text-purple-800 border border-purple-200"
                                : "bg-amber-50 text-amber-900 border border-amber-200"
                            }`}
                          >
                            {item.stepType === "pause"
                              ? "Pausa Química / Ação"
                              : "Atendimento Ativo"}
                          </span>
                        )}

                        <h4 className="font-bold text-xs sm:text-sm text-[#2D1914]">
                          {item.serviceTitle}
                        </h4>
                      </div>

                      <div className="text-left sm:text-right">
                        {isIncluded ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-bold">
                            ✓ Incluso no Pacote
                          </span>
                        ) : (
                          <div className="flex items-center gap-2 sm:justify-end">
                            {item.specialPrice && item.specialPrice !== item.originalPrice && (
                              <span className="text-xs text-stone-500 line-through">
                                {formatBRL(item.originalPrice)}
                              </span>
                            )}
                            <span className="text-xs sm:text-sm font-bold text-[#2D1914]">
                              {formatBRL(item.specialPrice || item.originalPrice)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {item.explanation && (
                      <div className="mt-2 p-2 sm:p-2.5 rounded-lg bg-[#FAF7F2]/80 border border-[#E7DCCE]/50 text-xs text-[#5E372C] leading-relaxed">
                        <strong className="text-[#2D1914] font-semibold block mb-0.5">
                          Detalhes Técnicos:
                        </strong>
                        <span>{item.explanation}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* BLOCO 2: ETAPAS & PROCEDIMENTOS ADICIONAIS (SE HOUVER) */}
          {additionalItems.length > 0 && (
            <div className="p-3.5 sm:p-5 rounded-xl sm:rounded-2xl border border-[#E7DCCE] bg-white space-y-3.5 sm:space-y-4 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#E7DCCE]/60">
                <div>
                  <span className="text-[9px] uppercase tracking-wider font-extrabold text-stone-600 bg-stone-100 border border-stone-200 px-2 py-0.5 rounded-md inline-block mb-1">
                    Adicionais &amp; Procedimentos Complementares
                  </span>
                  <h3 className="font-editorial text-base sm:text-lg font-bold text-[#2D1914]">
                    Procedimentos Extras Incluídos
                  </h3>
                  <p className="text-xs text-stone-500 mt-0.5">
                    Cuidados e tratamentos adicionados sob medida para seu cabelo.
                  </p>
                </div>

                <div className="text-right self-start sm:self-auto bg-stone-50 px-3 sm:px-3.5 py-1.5 rounded-xl border border-stone-200">
                  <span className="text-[9px] uppercase font-bold text-stone-500 block">
                    Subtotal Adicionais
                  </span>
                  <span className="font-editorial text-base sm:text-lg font-bold text-[#2D1914]">
                    {formatBRL(additionalSubtotal)}
                  </span>
                </div>
              </div>

              <div className="space-y-2.5 sm:space-y-3">
                {additionalItems.map((item, idx) => {
                  const isIncluded = item.isIncluded || Number(item.originalPrice) === 0;

                  return (
                    <div
                      key={item.id || idx}
                      className={`p-3 sm:p-4 rounded-xl border transition-all ${
                        !isIncluded
                          ? "bg-gradient-to-r from-white to-[#FAF7F2] border-[#C59B27]/40 shadow-2xs"
                          : "bg-white border-[#E7DCCE]"
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-1.5">
                        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                          <span className="px-2 py-0.5 rounded-md bg-[#AD841D] text-white text-[9px] font-extrabold uppercase">
                            Adicional {idx + 1}
                          </span>

                          {item.durationMin && (
                            <span className="px-2 py-0.5 rounded-md bg-stone-100 text-stone-600 text-[10px] font-bold flex items-center gap-1 border border-stone-200">
                              <Clock className="w-3 h-3 text-[#AD841D]" />
                              {item.durationMin} min
                            </span>
                          )}

                          {item.stepType && (
                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                item.stepType === "pause"
                                  ? "bg-purple-50 text-purple-800 border border-purple-200"
                                  : "bg-amber-50 text-amber-900 border border-amber-200"
                              }`}
                            >
                              {item.stepType === "pause"
                                ? "Pausa Química"
                                : "Atendimento Ativo"}
                            </span>
                          )}

                          <h4 className="font-bold text-xs sm:text-sm text-[#2D1914]">
                            {item.serviceTitle}
                          </h4>
                        </div>

                        <div className="text-left sm:text-right">
                          {isIncluded ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-bold">
                              ✓ Incluso no Pacote
                            </span>
                          ) : (
                            <div className="flex items-center gap-2 sm:justify-end">
                              {item.specialPrice && item.specialPrice !== item.originalPrice && (
                                <span className="text-xs text-stone-500 line-through">
                                  {formatBRL(item.originalPrice)}
                                </span>
                              )}
                              <span className="text-xs sm:text-sm font-bold text-[#2D1914]">
                                {formatBRL(item.specialPrice || item.originalPrice)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {item.explanation && (
                        <div className="mt-2 p-2 sm:p-2.5 rounded-lg bg-[#FAF7F2]/80 border border-[#E7DCCE]/50 text-xs text-[#5E372C] leading-relaxed">
                          <strong className="text-[#2D1914] font-semibold block mb-0.5">
                            Detalhes:
                          </strong>
                          <span>{item.explanation}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tabela de Investimento Resumido */}
          <div className="overflow-x-auto no-scrollbar sm:scrollbar-thin rounded-xl border border-[#E7DCCE] mt-6">
            <table className="w-full min-w-[360px] sm:min-w-[420px] text-left text-xs sm:text-sm">
              <thead className="bg-[#2D1914] text-white uppercase text-[9px] sm:text-xs tracking-wider">
                <tr>
                  <th className="py-2.5 sm:py-3 px-3 sm:px-4 font-medium">Etapa / Procedimento</th>
                  <th className="py-2.5 sm:py-3 px-2 sm:px-4 font-medium text-center">Duração</th>
                  <th className="py-2.5 sm:py-3 px-3 sm:px-4 font-medium text-right">Condição / Investimento</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E7DCCE]/60 bg-white">
                {/* Cabeçalho do Grupo Serviço Principal */}
                <tr className="bg-[#FAF7F2] font-bold text-[#AD841D] text-[10px] sm:text-[11px] uppercase tracking-wider">
                  <td colSpan={2} className="py-2.5 px-3 sm:px-4">
                    ✦ Pacote do Serviço Principal: {mainServiceName}
                  </td>
                  <td className="py-2.5 px-3 sm:px-4 text-right text-[#2D1914]">
                    Subtotal: {formatBRL(primordialSubtotal)}
                  </td>
                </tr>

                {primordialItems.map((item, idx) => {
                  const isIncluded = item.isIncluded || Number(item.originalPrice) === 0;
                  return (
                    <tr key={item.id || idx} className="hover:bg-[#FAF7F2]/50">
                      <td className="py-2.5 sm:py-3 px-3 sm:px-4 font-medium text-[#2D1914] pl-4 sm:pl-6">
                        <span className="text-stone-400 font-bold mr-1.5">{idx + 1}.</span>
                        {item.serviceTitle}
                      </td>
                      <td className="py-2.5 sm:py-3 px-2 sm:px-4 text-center text-stone-600 font-semibold text-[11px] sm:text-xs">
                        {item.durationMin ? `${item.durationMin} min` : "—"}
                      </td>
                      <td className="py-2.5 sm:py-3 px-3 sm:px-4 text-right font-bold text-[11px] sm:text-xs">
                        {isIncluded ? (
                          <span className="text-emerald-700 font-bold">Incluso no Pacote</span>
                        ) : (
                          <span className="text-[#2D1914]">
                            {formatBRL(item.specialPrice || item.originalPrice)}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}

                {/* Se houver adicionais, insere o grupo de adicionais na tabela */}
                {additionalItems.length > 0 && (
                  <>
                    <tr className="bg-stone-100/70 font-bold text-stone-700 text-[10px] sm:text-[11px] uppercase tracking-wider">
                      <td colSpan={2} className="py-2.5 px-3 sm:px-4">
                        ✦ Procedimentos &amp; Cuidados Adicionais
                      </td>
                      <td className="py-2.5 px-3 sm:px-4 text-right text-[#2D1914]">
                        Subtotal: {formatBRL(additionalSubtotal)}
                      </td>
                    </tr>

                    {additionalItems.map((item, idx) => {
                      const isIncluded = item.isIncluded || Number(item.originalPrice) === 0;
                      return (
                        <tr key={item.id || idx} className="hover:bg-[#FAF7F2]/50">
                          <td className="py-2.5 sm:py-3 px-3 sm:px-4 font-medium text-[#2D1914] pl-4 sm:pl-6">
                            <span className="text-stone-400 font-bold mr-1.5">
                              {primordialItems.length + idx + 1}.
                            </span>
                            {item.serviceTitle}
                          </td>
                          <td className="py-2.5 sm:py-3 px-2 sm:px-4 text-center text-stone-600 font-semibold text-[11px] sm:text-xs">
                            {item.durationMin ? `${item.durationMin} min` : "—"}
                          </td>
                          <td className="py-2.5 sm:py-3 px-3 sm:px-4 text-right font-bold text-[11px] sm:text-xs">
                            {isIncluded ? (
                              <span className="text-emerald-700 font-bold">Incluso no Pacote</span>
                            ) : (
                              <span className="text-[#2D1914]">
                                {formatBRL(item.specialPrice || item.originalPrice)}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </>
                )}
              </tbody>
            </table>
          </div>

          {/* Card de Destaque do Total & Pix */}
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
            <div className="p-4 sm:p-5 rounded-xl sm:rounded-2xl bg-[#FAF7F2] border border-[#E7DCCE] flex flex-col justify-center">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[9px] sm:text-[10px] uppercase tracking-widest text-[#683C30] font-semibold">
                  TOTAL DO PROJETO
                </span>
                {discountAmount > 0 && (
                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                    {discountPercent}% OFF Especial
                  </span>
                )}
              </div>
              <div className="flex items-baseline gap-2">
                <span className="font-editorial text-xl xs:text-2xl sm:text-3xl font-bold text-[#2D1914]">
                  {formatBRL(proposal.totalWithDiscount)}
                </span>
                {discountAmount > 0 && (
                  <span className="text-xs text-stone-500 line-through">
                    {formatBRL(proposal.totalOriginal)}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-stone-600 mt-1">
                Cartão de Crédito: {proposal.creditCardTerms}
              </p>
            </div>

            <div className="p-4 sm:p-5 rounded-xl sm:rounded-2xl bg-gradient-to-br from-[#FDF9F0] to-[#F5E8C9] border border-[#C59B27]/40 flex flex-col justify-center shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[9px] sm:text-[10px] uppercase tracking-widest text-[#AD841D] font-bold">
                  PAGAMENTO À VISTA VIA PIX ({proposal.pixDiscountPercent}% OFF)
                </span>
                <span className="text-[10px] sm:text-xs bg-[#C59B27] text-white px-2 py-0.5 rounded-full font-bold">
                  ECONOMIA
                </span>
              </div>
              <span className="font-editorial text-xl xs:text-2xl sm:text-3xl font-bold text-[#7B493B] mt-0.5">
                {formatBRL(proposal.pixTotal)}
              </span>
              <p className="text-[11px] text-[#5E372C] mt-1 font-medium">
                {totalGeneralSavings > 0
                  ? `Economia total de ${formatBRL(
                      totalGeneralSavings
                    )} em relação ao valor avulso original.`
                  : "Desconto especial aplicado automaticamente para liquidação via Pix."}
              </p>
            </div>
          </div>
        </section>

        {/* 5. Manutenção do Resultado */}
        <section className="my-6 sm:my-8 print-avoid-break">
          <h2 className="font-editorial text-xs sm:text-sm tracking-[0.15em] sm:tracking-[0.2em] uppercase text-[#AD841D] font-bold mb-3">
            M A N U T E N Ç Ã O &nbsp; D O &nbsp; R E S U L T A D O
          </h2>
          <div className="p-4 sm:p-5 rounded-xl bg-[#FAF7F2] border border-[#E7DCCE]/60 text-xs sm:text-sm text-[#44271F] leading-relaxed">
            <p className="whitespace-pre-line">{proposal.maintenanceGuidance}</p>
          </div>
        </section>

        {/* 6. Compromisso Técnico & Diferenciais */}
        <section className="my-6 sm:my-8 print-avoid-break">
          <h2 className="font-editorial text-xs sm:text-sm tracking-[0.15em] sm:tracking-[0.2em] uppercase text-[#AD841D] font-bold mb-3">
            D I F E R E N C I A I S &nbsp; &amp; &nbsp; C O M P R O M I S S O &nbsp; T É C N I C O
          </h2>

          <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 my-4">
            {proposal.differentials.map((diff) => (
              <div
                key={diff.id}
                className="p-3 sm:p-3.5 rounded-xl border border-[#E7DCCE] bg-white text-center flex flex-col items-center justify-center hover:border-[#C59B27] transition-colors"
              >
                <span className="text-[#C59B27] text-base mb-1">✦</span>
                <span className="text-xs font-bold text-[#2D1914] mb-1">
                  {diff.title}
                </span>
                <span className="text-[10px] text-stone-600 leading-tight">
                  {diff.description}
                </span>
              </div>
            ))}
          </div>

          <div className="p-3.5 sm:p-4 rounded-xl bg-[#FDFBF7] border border-[#E7DCCE] text-xs text-stone-700 italic text-center">
            &quot;{proposal.technicalCommitment}&quot;
          </div>
        </section>

        {/* Card de Aceite Integrado ao Documento */}
        {!isApproved ? (
          <div className="no-print mt-8 sm:mt-10 p-4 sm:p-6 rounded-xl sm:rounded-2xl bg-gradient-to-br from-[#FDF9F0] via-white to-[#F5E8C9] border border-[#C59B27]/50 text-center shadow-sm space-y-4">
            <div>
              <span className="text-[10px] sm:text-[11px] uppercase tracking-widest text-[#AD841D] font-bold block mb-1">
                Etapa de Confirmação Oficial
              </span>
              <h3 className="font-editorial text-lg xs:text-xl sm:text-2xl font-bold text-[#2D1914]">
                Pronta para sua Transformação?
              </h3>
              <p className="text-xs text-[#5E372C] max-w-lg mx-auto mt-1 leading-relaxed">
                Ao aprovar esta proposta, sua vaga na agenda de Gleicy Ronha é confirmada
                automaticamente com todos os protocolos acordados.
              </p>
            </div>

            {/* Seletor de Data Flexível caso sugerido período */}
            {proposal.schedulingDetails?.dateSuggestionType === "range" && (
              <div className="max-w-md mx-auto p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-white border border-amber-300 text-left space-y-3 shadow-2xs">
                <div>
                  <label className="text-xs font-bold text-[#2D1914] block">
                    Escolha seu dia preferido no período sugerido:
                  </label>
                  <span className="text-[10px] text-stone-500">
                    Disponível de {proposal.schedulingDetails.suggestedDateStart} a{" "}
                    {proposal.schedulingDetails.suggestedDateEnd}
                  </span>
                </div>
                <div className="grid grid-cols-1 xs:grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-stone-500 block mb-0.5">
                      Data:
                    </label>
                    <input
                      type="date"
                      min={proposal.schedulingDetails.suggestedDateStart}
                      max={proposal.schedulingDetails.suggestedDateEnd}
                      value={clientChosenDate}
                      onChange={(e) => setClientChosenDate(e.target.value)}
                      className="w-full p-2 rounded-xl border border-[#E7DCCE] text-xs font-bold bg-[#FAF7F2]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-stone-500 block mb-0.5">
                      Horário:
                    </label>
                    <input
                      type="time"
                      value={clientChosenTime}
                      onChange={(e) => setClientChosenTime(e.target.value)}
                      className="w-full p-2 rounded-xl border border-[#E7DCCE] text-xs font-bold bg-[#FAF7F2]"
                    />
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={handleApprove}
              disabled={isApproving}
              className="w-full sm:w-auto py-3.5 px-6 sm:px-8 rounded-xl sm:rounded-2xl text-white gold-gradient font-bold text-xs sm:text-sm shadow-lg hover:scale-[1.02] sm:hover:scale-105 active:scale-95 transition-all inline-flex items-center justify-center space-x-2"
            >
              <CalendarCheck className="w-4 h-4 text-white shrink-0" />
              <span>
                {isApproving
                  ? "Confirmando seu Horário..."
                  : "Aprovar Proposta e Confirmar Agendamento"}
              </span>
            </button>
          </div>
        ) : (
          <div className="no-print mt-8 sm:mt-10 p-5 sm:p-6 rounded-xl sm:rounded-2xl bg-emerald-50 border border-emerald-300 text-center space-y-2">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
              <Check className="w-6 h-6 stroke-[3]" />
            </div>
            <h3 className="font-editorial text-xl font-bold text-emerald-950">
              Proposta Aprovada com Sucesso!
            </h3>
            <p className="text-xs text-emerald-800 max-w-md mx-auto">
              Seu agendamento foi registrado com sucesso para{" "}
              <strong>
                {clientChosenDate ||
                  proposal.schedulingDetails?.confirmedDate ||
                  proposal.schedulingDetails?.originalDate}
              </strong>{" "}
              às{" "}
              <strong>
                {clientChosenTime ||
                  proposal.schedulingDetails?.confirmedTime ||
                  proposal.schedulingDetails?.originalTime}
              </strong>
              . Nos vemos no salão!
            </p>
          </div>
        )}

        {/* Rodapé Oficial da Proposta */}
        <div className="mt-8 pt-6 border-t border-[#E7DCCE] flex items-center justify-between text-[11px] text-stone-600 uppercase tracking-widest">
          <span>ESPAÇO DA BELEZA GLEICY RONHA</span>
          <span>DOCUMENTO EXCLUSIVO</span>
        </div>
      </div>

      {/* Modal de Zoom de Fotografia (Galeria Fullscreen) */}
      {activeLightboxPhotos && (
        <PhotoGalleryLightbox
          photos={activeLightboxPhotos}
          initialIndex={activeLightboxIndex}
          onClose={() => setActiveLightboxPhotos(null)}
        />
      )}
    </div>
  );
}
