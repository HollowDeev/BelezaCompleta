"use client";

import { useState } from "react";
import { LuxuryProposal } from "@/types/proposal";
import { formatBRL, generateWhatsAppLink } from "@/lib/utils";
import {
  FileText,
  Copy,
  Share2,
  CheckCircle2,
  Clock,
  Sparkles,
  ExternalLink,
  Edit3,
  TrendingUp,
  Percent,
} from "lucide-react";

interface ProposalsManagerViewProps {
  proposals: LuxuryProposal[];
  onViewProposal: (proposalId: string) => void;
  onEditProposal?: (proposal: LuxuryProposal) => void;
}

export function ProposalsManagerView({
  proposals,
  onViewProposal,
  onEditProposal,
}: ProposalsManagerViewProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopyLink = (proposalId: string) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const url = `${origin}/proposta/${proposalId}`;
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(url);
    }
    setCopiedId(proposalId);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const approvedCount = proposals.filter((p) => p.status === "approved").length;
  const totalCount = proposals.length;
  const conversionRate = totalCount > 0 ? Math.round((approvedCount / totalCount) * 100) : 0;

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E7DCCE] shadow-xs space-y-6">
      {/* Topo da Gestão de Propostas */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#E7DCCE]/60 pb-5">
        <div>
          <span className="text-[10px] uppercase tracking-widest text-[#AD841D] font-bold block">
            Central Comercial Gleicy Ronha
          </span>
          <h2 className="text-xl sm:text-2xl font-bold text-[#2D1914]">
            Propostas Comerciais Personalizadas
          </h2>
        </div>

        {/* Indicadores Comerciais Rápidos */}
        <div className="flex items-center gap-3 bg-[#FAF7F2] p-1.5 px-3 rounded-2xl border border-[#E7DCCE]">
          <div className="text-center px-2">
            <span className="text-[10px] text-stone-500 uppercase font-semibold block">Total</span>
            <span className="text-xs font-bold text-[#2D1914]">{totalCount}</span>
          </div>
          <div className="h-6 w-px bg-[#E7DCCE]" />
          <div className="text-center px-2">
            <span className="text-[10px] text-emerald-700 uppercase font-semibold block">Aprovadas</span>
            <span className="text-xs font-bold text-emerald-800">{approvedCount}</span>
          </div>
          <div className="h-6 w-px bg-[#E7DCCE]" />
          <div className="text-center px-2">
            <span className="text-[10px] text-[#AD841D] uppercase font-semibold block">Conversão</span>
            <span className="text-xs font-bold text-[#AD841D]">{conversionRate}%</span>
          </div>
        </div>
      </div>

      {/* LISTAGEM DE PROPOSTAS */}
      {proposals.length === 0 ? (
        <div className="py-12 text-center text-xs text-stone-500 bg-[#FAF7F2] rounded-2xl border border-dashed border-[#E7DCCE]">
          Nenhuma proposta comercial gerada ainda. Acesse a <strong>Fila de Triagens</strong> para criar propostas para clientes que responderam ao questionário.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {proposals.map((prop) => {
            const isApproved = prop.status === "approved";
            const origin = typeof window !== "undefined" ? window.location.origin : "";
            const proposalUrl = `${origin}/proposta/${prop.id}`;
            const shareText = `Olá, ${prop.clientName}! Segue sua Proposta Personalizada da Gleicy Ronha: ${proposalUrl}`;
            const whatsappUrl = generateWhatsAppLink(prop.clientPhone, shareText);

            return (
              <div
                key={prop.id}
                className="p-5 sm:p-6 rounded-2xl border border-[#E7DCCE] bg-[#FAF7F2]/60 hover:bg-[#FAF7F2] transition-all flex flex-col justify-between shadow-2xs"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-base text-[#2D1914]">{prop.clientName}</span>
                    {isApproved ? (
                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                        Aprovada ✓
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                        Aguardando Aceite
                      </span>
                    )}
                  </div>

                  <p className="text-xs font-semibold text-[#5E372C] mb-1">{prop.subtitle}</p>
                  <p className="text-[11px] text-stone-600 line-clamp-2 mb-4 leading-relaxed">
                    {prop.projectOverview}
                  </p>

                  {/* Resumo de Valores */}
                  <div className="p-3.5 rounded-xl bg-white border border-[#E7DCCE] flex items-center justify-between text-xs mb-4">
                    <div>
                      <span className="text-stone-500 text-[11px] block">Condição Especial:</span>
                      <span className="font-bold text-sm text-[#2D1914]">
                        {formatBRL(prop.totalWithDiscount)}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] uppercase font-bold text-[#AD841D] block">
                        No Pix à vista:
                      </span>
                      <span className="font-bold text-sm text-emerald-700">
                        {formatBRL(prop.pixTotal)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Ações da Proposta */}
                <div className="pt-3 border-t border-[#E7DCCE]/60 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onViewProposal(prop.id)}
                      className="px-3 py-1.5 text-xs font-bold text-white chocolate-gradient rounded-xl flex items-center space-x-1 shadow-xs hover:opacity-95"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-[#DBAE3B]" />
                      <span>Ver Proposta & PDF</span>
                    </button>

                    {onEditProposal && (
                      <button
                        onClick={() => onEditProposal(prop)}
                        className="px-3 py-1.5 text-xs font-semibold text-[#5E372C] bg-white hover:bg-[#F3ECE1] border border-[#E7DCCE] rounded-xl flex items-center space-x-1 transition-all"
                        title="Editar valores, módulos ou mensagens desta proposta"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-[#AD841D]" />
                        <span>Editar</span>
                      </button>
                    )}
                  </div>

                  <div className="flex items-center space-x-1.5">
                    <a
                      href={`/proposta/${prop.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-xl bg-white text-stone-600 hover:bg-stone-100 border border-[#E7DCCE]"
                      title="Abrir página web da cliente em nova aba"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-[#C59B27]" />
                    </a>

                    <a
                      href={whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
                      title="Reenviar pelo WhatsApp"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                    </a>

                    <button
                      onClick={() => handleCopyLink(prop.id)}
                      className="p-2 rounded-xl bg-white text-stone-600 hover:bg-stone-100 border border-[#E7DCCE] relative"
                      title="Copiar link web da proposta"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      {copiedId === prop.id && (
                        <span className="absolute -top-7 left-1/2 -translate-x-1/2 bg-[#2D1914] text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-md whitespace-nowrap">
                          Link copiado!
                        </span>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
