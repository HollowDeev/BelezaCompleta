"use client";

import { useState } from "react";
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
} from "lucide-react";
import confetti from "canvas-confetti";

interface LuxuryProposalPDFProps {
  proposal: LuxuryProposal;
  isClientView?: boolean;
  isModalView?: boolean;
  onEdit?: () => void;
  onApprove?: (proposalId: string) => void;
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
      onApprove?.(proposal.id);
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

  const discountAmount = Math.max(0, proposal.totalOriginal - proposal.totalWithDiscount);
  const discountPercent =
    proposal.totalOriginal > 0
      ? Math.round((discountAmount / proposal.totalOriginal) * 100)
      : 0;
  const totalGeneralSavings = Math.max(0, proposal.totalOriginal - proposal.pixTotal);

  return (
    <div
      className={
        isModalView
          ? "w-full flex flex-col items-center"
          : "min-h-screen py-6 sm:py-10 px-3 sm:px-6 flex flex-col items-center"
      }
    >
      {/* Barra de Ações Superior (Invisível na impressão) */}
      <div className="no-print w-full max-w-4xl mb-6 flex flex-wrap items-center justify-between gap-3 bg-white/95 p-4 rounded-2xl shadow-xs border border-[#E7DCCE]">
        <div className="flex items-center space-x-2">
          {onBack && (
            <button
              onClick={onBack}
              className="px-3 py-1.5 text-xs text-[#5E372C] hover:bg-[#F3ECE1] rounded-lg transition-colors"
            >
              ← Voltar
            </button>
          )}
          <span className="text-xs uppercase tracking-wider text-[#AD841D] font-semibold flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5" />
            Status:{" "}
            {isApproved ? (
              <span className="text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 font-bold">
                Aprovada ✓
              </span>
            ) : (
              <span className="text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200 font-bold">
                Aguardando Aceite
              </span>
            )}
          </span>
        </div>

        <div className="flex items-center flex-wrap gap-2">
          {onEdit && (
            <button
              onClick={onEdit}
              className="px-3 py-2 text-xs font-semibold text-[#5E372C] bg-[#FAF7F2] hover:bg-[#F3ECE1] border border-[#E7DCCE] rounded-xl flex items-center space-x-1.5 transition-all shadow-2xs"
              title="Editar Proposta"
            >
              <Edit3 className="w-3.5 h-3.5 text-[#AD841D]" />
              <span>Editar</span>
            </button>
          )}

          <button
            onClick={handlePrint}
            className="px-3.5 py-2 text-xs font-medium text-[#44271F] bg-[#FAF7F2] hover:bg-[#F3ECE1] border border-[#E7DCCE] rounded-xl flex items-center space-x-1.5 transition-all shadow-2xs"
            title="Exportar ou Imprimir em PDF formato A4"
          >
            <Printer className="w-3.5 h-3.5 text-[#AD841D]" />
            <span>Baixar / Imprimir PDF</span>
          </button>

          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-2 text-xs font-medium text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl flex items-center space-x-1.5 transition-all shadow-2xs"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Enviar WhatsApp</span>
          </a>

          {!isApproved && (
            <button
              onClick={handleApprove}
              disabled={isApproving}
              className="px-4 py-2 text-xs font-semibold text-white gold-gradient hover:opacity-95 rounded-xl shadow-xs flex items-center space-x-1.5 transition-all active:scale-95"
            >
              {isApproving ? (
                <span>Confirmando...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Aprovar Proposta</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* DOCUMENTO OFICIAL DIAGRAMADO (A4 Elegante) */}
      <div
        id="luxury-proposal-document"
        className="print-page w-full max-w-4xl bg-white text-[#22201E] shadow-xl sm:rounded-2xl border border-[#E7DCCE]/80 p-8 sm:p-14 transition-all"
      >
        {/* Cabeçalho da Proposta */}
        <div className="text-center pb-8 border-b border-[#E7DCCE]/60 relative">
          <p className="text-[11px] sm:text-xs uppercase tracking-[0.25em] text-[#AD841D] font-semibold mb-2">
            E X C L U S I V I D A D E &nbsp;&amp;&nbsp; A L T A &nbsp; P E R F O R M A N C E
          </p>
          <h1 className="font-editorial text-2xl sm:text-4xl font-bold tracking-wide text-[#2D1914] uppercase">
            {proposal.title}
          </h1>
          <p className="font-editorial italic text-sm sm:text-base text-[#683C30] mt-1">
            {proposal.subtitle}
          </p>

          <div className="w-24 h-0.5 mx-auto bg-gradient-to-r from-transparent via-[#C59B27] to-transparent mt-4" />
        </div>

        {/* Barra de Identificação da Cliente */}
        <div className="my-6 p-4 rounded-xl bg-[#FDFBF7] border border-[#E7DCCE]/70 flex flex-col sm:flex-row items-center justify-between text-xs sm:text-sm">
          <div className="flex items-center space-x-2">
            <span className="font-bold tracking-wider uppercase text-[#44271F]">CLIENTE:</span>
            <span className="font-semibold text-[#2D1914]">{proposal.clientName}</span>
          </div>
          <div className="flex items-center space-x-2 mt-2 sm:mt-0 text-[#683C30]">
            <span className="font-bold tracking-wider uppercase text-[#44271F]">CONTATO:</span>
            <span>{proposal.clientPhone}</span>
          </div>
        </div>

        {/* 1. O Projeto / Proposta para o seu Cabelo */}
        <section className="my-8">
          <h2 className="font-editorial text-xs sm:text-sm tracking-[0.2em] uppercase text-[#AD841D] font-bold mb-3">
            O P R O J E T O &nbsp; P A R A &nbsp; O &nbsp; S E U &nbsp; C A B E L O
          </h2>
          <div className="p-5 sm:p-6 rounded-xl bg-[#FAF7F2]/60 border border-[#E7DCCE]/50 text-sm leading-relaxed text-[#33302C]">
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

        {/* 4. MÓDULOS DO PLANO DE TRANSFORMAÇÃO & INVESTIMENTO */}
        <section className="my-8 print-avoid-break space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-editorial text-xs sm:text-sm tracking-[0.2em] uppercase text-[#AD841D] font-bold">
              J O R N A D A &nbsp; D O &nbsp; S E U &nbsp; C A B E L O &nbsp; E M &nbsp; M Ó D U L O S
            </h2>
            <span className="text-[10px] uppercase font-bold text-[#683C30] bg-[#FAF7F2] px-2.5 py-1 rounded-full border border-[#E7DCCE]">
              {proposal.items.length} {proposal.items.length === 1 ? "Etapa Planejada" : "Etapas Planejadas"}
            </span>
          </div>

          {/* Cards dos Módulos / Etapas */}
          <div className="space-y-3">
            {proposal.items.map((item, idx) => {
              const isFinal = item.moduleType === "final" || idx === proposal.items.length - 1;
              return (
                <div
                  key={item.id || idx}
                  className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                    isFinal
                      ? "bg-gradient-to-r from-white to-[#FAF7F2] border-[#C59B27]/40 shadow-xs"
                      : "bg-white border-[#E7DCCE]"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                          isFinal
                            ? "bg-[#2D1914] text-white"
                            : "bg-[#FAF7F2] text-[#5E372C] border border-[#E7DCCE]"
                        }`}
                      >
                        {isFinal ? "Etapa Final • Procedimento Principal" : `Etapa ${idx + 1} • Módulo Preparatório`}
                      </span>
                      <h4 className="font-bold text-sm sm:text-base text-[#2D1914]">
                        {item.serviceTitle}
                      </h4>
                    </div>

                    <div className="text-right">
                      <span className="text-xs text-stone-500 line-through mr-2">
                        {formatBRL(item.originalPrice)}
                      </span>
                      {item.specialPrice && item.specialPrice !== item.originalPrice && (
                        <span className="text-xs font-bold text-[#2D1914]">
                          {formatBRL(item.specialPrice)}
                        </span>
                      )}
                    </div>
                  </div>

                  {item.explanation && (
                    <div className="mt-2.5 p-3 rounded-xl bg-[#FAF7F2]/80 border border-[#E7DCCE]/50 text-xs text-[#5E372C] leading-relaxed">
                      <strong className="text-[#2D1914] font-semibold block mb-0.5">
                        Por que este procedimento foi indicado para você:
                      </strong>
                      <span>{item.explanation}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Tabela de Investimento Resumido */}
          <div className="overflow-x-auto rounded-xl border border-[#E7DCCE] mt-6">
            <table className="w-full min-w-[420px] text-left text-xs sm:text-sm">
              <thead className="bg-[#2D1914] text-white uppercase text-[10px] sm:text-xs tracking-wider">
                <tr>
                  <th className="py-3 px-4 font-medium">Serviço / Módulo</th>
                  <th className="py-3 px-4 font-medium text-right">Valor Original</th>
                  <th className="py-3 px-4 font-medium text-right">Condição do Pacote</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E7DCCE]/60 bg-white">
                {proposal.items.map((item, idx) => (
                  <tr key={item.id || idx} className="hover:bg-[#FAF7F2]/50">
                    <td className="py-3.5 px-4 font-medium text-[#2D1914]">{item.serviceTitle}</td>
                    <td className="py-3.5 px-4 text-right text-stone-600 line-through">
                      {formatBRL(item.originalPrice)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-[#2D1914]">
                      {item.specialPrice ? formatBRL(item.specialPrice) : formatBRL(item.originalPrice)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Card de Destaque do Total & Pix */}
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-5 rounded-2xl bg-[#FAF7F2] border border-[#E7DCCE] flex flex-col justify-center">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] uppercase tracking-widest text-[#683C30] font-semibold">
                  TOTAL DO PROJETO
                </span>
                {discountAmount > 0 && (
                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                    {discountPercent}% OFF Especial
                  </span>
                )}
              </div>
              <div className="flex items-baseline gap-2">
                <span className="font-editorial text-2xl sm:text-3xl font-bold text-[#2D1914]">
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

            <div className="p-5 rounded-2xl bg-gradient-to-br from-[#FDF9F0] to-[#F5E8C9] border border-[#C59B27]/40 flex flex-col justify-center shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-widest text-[#AD841D] font-bold">
                  PAGAMENTO À VISTA VIA PIX ({proposal.pixDiscountPercent}% OFF)
                </span>
                <span className="text-xs bg-[#C59B27] text-white px-2 py-0.5 rounded-full font-bold">
                  ECONOMIA
                </span>
              </div>
              <span className="font-editorial text-2xl sm:text-3xl font-bold text-[#7B493B] mt-0.5">
                {formatBRL(proposal.pixTotal)}
              </span>
              <p className="text-[11px] text-[#5E372C] mt-1 font-medium">
                {totalGeneralSavings > 0
                  ? `Economia total de ${formatBRL(totalGeneralSavings)} em relação ao valor avulso original.`
                  : "Desconto especial aplicado automaticamente para liquidação via Pix."}
              </p>
            </div>
          </div>
        </section>

        {/* 5. Manutenção do Resultado */}
        <section className="my-8 print-avoid-break">
          <h2 className="font-editorial text-xs sm:text-sm tracking-[0.2em] uppercase text-[#AD841D] font-bold mb-3">
            M A N U T E N Ç Ã O &nbsp; D O &nbsp; R E S U L T A D O
          </h2>
          <div className="p-5 rounded-xl bg-[#FAF7F2] border border-[#E7DCCE]/60 text-xs sm:text-sm text-[#44271F] leading-relaxed">
            <p className="whitespace-pre-line">{proposal.maintenanceGuidance}</p>
          </div>
        </section>

        {/* 6. Compromisso Técnico & Diferenciais */}
        <section className="my-8 print-avoid-break">
          <h2 className="font-editorial text-xs sm:text-sm tracking-[0.2em] uppercase text-[#AD841D] font-bold mb-3">
            D I F E R E N C I A I S &nbsp; &amp; &nbsp; C O M P R O M I S S O &nbsp; T É C N I C O
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-4">
            {proposal.differentials.map((diff) => (
              <div
                key={diff.id}
                className="p-3.5 rounded-xl border border-[#E7DCCE] bg-white text-center flex flex-col items-center justify-center hover:border-[#C59B27] transition-colors"
              >
                <span className="text-[#C59B27] text-base mb-1">✦</span>
                <span className="text-xs font-bold text-[#2D1914] mb-1">{diff.title}</span>
                <span className="text-[10px] text-stone-600 leading-tight">{diff.description}</span>
              </div>
            ))}
          </div>

          <div className="p-4 rounded-xl bg-[#FDFBF7] border border-[#E7DCCE] text-xs text-stone-700 italic text-center">
            "{proposal.technicalCommitment}"
          </div>
        </section>

        {/* Card de Aceite Integrado ao Documento */}
        {!isApproved && (
          <div className="no-print mt-10 p-6 rounded-2xl bg-gradient-to-br from-[#FDF9F0] via-white to-[#F5E8C9] border border-[#C59B27]/50 text-center shadow-sm">
            <span className="text-[11px] uppercase tracking-widest text-[#AD841D] font-bold block mb-1">
              Etapa de Confirmação Oficial
            </span>
            <h3 className="font-editorial text-xl font-bold text-[#2D1914] mb-2">
              Pronta para sua Transformação?
            </h3>
            <p className="text-xs text-[#5E372C] max-w-lg mx-auto mb-5 leading-relaxed">
              Ao aprovar esta proposta, seu horário pretendido na agenda de Gleicy Ronha é confirmado automaticamente e sua pré-reserva é convertida em agendamento oficial.
            </p>
            <button
              onClick={handleApprove}
              disabled={isApproving}
              className="py-3.5 px-8 rounded-2xl text-white gold-gradient font-bold text-sm shadow-lg hover:scale-105 active:scale-95 transition-all inline-flex items-center space-x-2"
            >
              <CalendarCheck className="w-4 h-4 text-white" />
              <span>Aprovar Proposta e Confirmar Agendamento</span>
            </button>
          </div>
        )}

        {/* Rodapé Oficial da Proposta */}
        <div className="mt-8 pt-6 border-t border-[#E7DCCE] flex items-center justify-between text-[11px] text-stone-600 uppercase tracking-widest">
          <span>ESPAÇO DA BELEZA GLEICY RONHA</span>
          <span>DOCUMENTO EXCLUSIVO</span>
        </div>
      </div>
    </div>
  );
}
