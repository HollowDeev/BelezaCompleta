"use client";

import { useState } from "react";
import { LuxuryProposal } from "@/types/proposal";
import { formatBRL, generateWhatsAppLink } from "@/lib/utils";
import { generateProposalWhatsAppMessage } from "@/lib/proposals/sharing";
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
  MessageCircle,
  Eye,
  EyeOff,
  Plus,
} from "lucide-react";

interface ProposalsManagerViewProps {
  proposals: LuxuryProposal[];
  onViewProposal: (proposalId: string) => void;
  onEditProposal?: (proposal: LuxuryProposal) => void;
  onCreateManualProposal?: () => void;
}

export function ProposalsManagerView({
  proposals,
  onViewProposal,
  onEditProposal,
  onCreateManualProposal,
}: ProposalsManagerViewProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const formatFirstViewed = (isoString?: string) => {
    if (!isoString) return "";
    try {
      const d = new Date(isoString);
      const day = String(d.getDate()).padStart(2, "0");
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const hours = String(d.getHours()).padStart(2, "0");
      const minutes = String(d.getMinutes()).padStart(2, "0");
      return `${day}/${month} às ${hours}:${minutes}`;
    } catch {
      return isoString;
    }
  };

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
    <div data-tutorial="proposals-manager" className="bg-white/85 backdrop-blur-md rounded-3xl p-6 sm:p-8 border border-[#D8D0BD] shadow-xs space-y-6 relative overflow-hidden">
      {/* Topo da Gestão de Propostas */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#D8D0BD]/70 pb-5">
        <div>
          <span className="text-[10px] uppercase tracking-widest text-[#80611F] font-bold block">
            Central Comercial Gleicy Ronha
          </span>

          <h2 className="text-xl sm:text-2xl font-bold text-[#1D3D3C] font-sans">
            Propostas Comerciais Personalizadas
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

        <div className="flex flex-wrap items-center gap-3">
          {/* Botão de Criação de Proposta Manual */}
          {onCreateManualProposal && (
            <button
              data-tutorial="proposals-new-manual-btn"
              onClick={onCreateManualProposal}
              className="px-4 py-2 bg-[#1D3D3C] hover:bg-[#152e2d] text-white rounded-2xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm border border-[#C7A03A]/50 shrink-0 cursor-pointer"
            >
              <Plus className="w-4 h-4 text-[#D9B85F]" />
              <span>+ Nova Proposta Manual</span>
            </button>
          )}

          {/* Indicadores Comerciais Rápidos */}
          <div className="flex items-center gap-3 bg-[#FAF7F2] p-1.5 px-3 rounded-2xl border border-[#D8D0BD]">
            <div className="text-center px-2">
              <span className="text-[10px] text-[#736455] uppercase font-semibold block">Total</span>
              <span className="text-xs font-bold text-[#1D3D3C]">{totalCount}</span>
            </div>
            <div className="h-6 w-px bg-[#D8D0BD]" />
            <div className="text-center px-2">
              <span className="text-[10px] text-emerald-800 uppercase font-semibold block">Aprovadas</span>
              <span className="text-xs font-bold text-emerald-800">{approvedCount}</span>
            </div>
            <div className="h-6 w-px bg-[#D8D0BD]" />
            <div className="text-center px-2">
              <span className="text-[10px] text-[#80611F] uppercase font-semibold block">Conversão</span>
              <span className="text-xs font-bold text-[#80611F]">{conversionRate}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* LISTAGEM DE PROPOSTAS */}
      {proposals.length === 0 ? (
        <div className="py-12 text-center text-xs text-[#736455] bg-[#FAF7F2] rounded-2xl border border-dashed border-[#D8D0BD] space-y-3">
          <p>
            Nenhuma proposta comercial gerada ainda. Acesse a <strong>Fila de Triagens</strong> para criar propostas para clientes que responderam ao questionário, ou crie uma proposta manual avulsa.
          </p>
          {onCreateManualProposal && (
            <div>
              <button
                onClick={onCreateManualProposal}
                className="px-4 py-2 bg-[#1D3D3C] text-white rounded-xl font-bold text-xs inline-flex items-center gap-2 hover:bg-[#152e2d] transition-all shadow-xs border border-[#C7A03A]/40 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-[#D9B85F]" />
                <span>+ Nova Proposta Manual</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {proposals.map((prop) => {
            const isApproved = prop.status === "approved";
            const firstViewed = prop.firstViewedAt || (prop as any).first_viewed_at;
            const origin = typeof window !== "undefined" ? window.location.origin : "";
            const proposalUrl = `${origin}/proposta/${prop.id}`;
            const shareText = generateProposalWhatsAppMessage(prop, origin);
            const whatsappUrl = generateWhatsAppLink(prop.clientPhone, shareText);

            return (
              <div
                key={prop.id}
                className="p-5 sm:p-6 rounded-2xl border border-[#D8D0BD] bg-[#FCF5EB]/60 hover:bg-[#FCF5EB] transition-all flex flex-col justify-between shadow-2xs hover:border-[#C7A03A]"
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-base text-[#1D3D3C]">{prop.clientName}</span>
                    {isApproved ? (
                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                        Aprovada ✓
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#FCF9F0] text-[#80611F] border border-[#C7A03A]/50">
                        Aguardando Aceite
                      </span>
                    )}
                  </div>

                  {/* Indicador de Visualização / Primeiro Acesso (R7.4) */}
                  <div className="mb-2.5">
                    {firstViewed ? (
                      <span className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                        <Eye className="w-3 h-3 text-emerald-600 shrink-0" />
                        <span>Visualizada pela cliente em {formatFirstViewed(firstViewed)}</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-[10px] font-medium px-2.5 py-0.5 rounded-full bg-stone-50 text-stone-500 border border-stone-200">
                        <EyeOff className="w-3 h-3 text-stone-400 shrink-0" />
                        <span>Ainda não visualizada</span>
                      </span>
                    )}
                  </div>

                  <p className="text-xs font-semibold text-[#80611F] mb-1">{prop.subtitle}</p>
                  <p className="text-[11px] text-[#736455] line-clamp-2 mb-4 leading-relaxed">
                    {prop.projectOverview}
                  </p>

                  {/* Resumo de Valores */}
                  <div className="p-3.5 rounded-xl bg-white border border-[#D8D0BD] flex items-center justify-between text-xs mb-4">
                    <div>
                      <span className="text-[#736455] text-[11px] block">Condição Especial:</span>
                      <span className="font-bold text-sm text-[#1D3D3C]">
                        {formatBRL(prop.totalWithDiscount)}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] uppercase font-bold text-[#80611F] block">
                        No Pix à vista:
                      </span>
                      <span className="font-bold text-sm text-emerald-800">
                        {formatBRL(prop.pixTotal)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Ações da Proposta */}
                <div className="pt-3 border-t border-[#D8D0BD]/70 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onViewProposal(prop.id)}
                      className="px-3 py-1.5 text-xs font-bold text-white brand-green-gradient border border-[#C7A03A]/40 rounded-xl flex items-center space-x-1 shadow-xs hover:opacity-95"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-[#D9B85F]" />
                      <span>Ver Proposta &amp; PDF</span>
                    </button>

                    {onEditProposal && (
                      <button
                        onClick={() => onEditProposal(prop)}
                        className="px-3 py-1.5 text-xs font-semibold text-[#1D3D3C] bg-white hover:bg-[#EEE8DD] border border-[#D8D0BD] rounded-xl flex items-center space-x-1 transition-all"
                        title="Editar valores, módulos ou mensagens desta proposta"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-[#C7A03A]" />
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
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-2xs"
                      title="Enviar proposta diretamente no WhatsApp"
                    >
                      <MessageCircle className="w-3.5 h-3.5 fill-white" />
                      <span>WhatsApp</span>
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
