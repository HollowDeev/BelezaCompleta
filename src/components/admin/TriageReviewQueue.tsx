"use client";

import { useState } from "react";
import { TriageSubmission } from "@/types/triage";
import { ProposalBuilderModal } from "@/components/proposal/ProposalBuilderModal";
import { LuxuryProposal } from "@/types/proposal";
import { ServiceItem } from "@/types/service";
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
} from "lucide-react";

interface TriageReviewQueueProps {
  submissions: TriageSubmission[];
  services?: ServiceItem[];
  onGenerateProposal: (proposal: LuxuryProposal) => void;
  onViewProposal: (proposalId: string) => void;
}

export function TriageReviewQueue({
  submissions,
  services = [],
  onGenerateProposal,
  onViewProposal,
}: TriageReviewQueueProps) {
  const [selectedSubForProposal, setSelectedSubForProposal] =
    useState<TriageSubmission | null>(null);

  const pendingCount = submissions.filter((s) => s.status === "pending_review").length;

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E7DCCE] shadow-xs">
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-[#E7DCCE]/60">
        <div>
          <span className="text-[10px] uppercase tracking-widest text-[#AD841D] font-bold block">
            Fila de Diagnósticos & Anamnese
          </span>
          <h2 className="font-editorial text-xl sm:text-2xl font-bold text-[#2D1914] flex items-center gap-2">
            <span>Triagens de Clientes</span>
            {pendingCount > 0 && (
              <span className="text-xs bg-amber-100 text-amber-900 border border-amber-300 px-2.5 py-0.5 rounded-full font-bold">
                {pendingCount} pendente(s)
              </span>
            )}
          </h2>
        </div>
      </div>

      {submissions.length === 0 ? (
        <div className="py-8 text-center text-xs text-stone-500 bg-[#FAF7F2] rounded-2xl border border-dashed border-[#E7DCCE]">
          Nenhuma triagem enviada recentemente.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {submissions.map((sub) => {
            const isPending = sub.status === "pending_review";
            const isApproved = sub.status === "approved";

            const hasChemical = sub.answers.some(
              (a) =>
                a.questionTitle.toLowerCase().includes("química") &&
                a.selectedOptionLabels?.some(
                  (opt) => !opt.toLowerCase().includes("nenhuma") && !opt.toLowerCase().includes("natural")
                )
            );

            return (
              <div
                key={sub.id}
                className="p-5 sm:p-6 rounded-2xl border border-[#E7DCCE] bg-[#FDFBF7] flex flex-col justify-between hover:border-[#C59B27] transition-all shadow-2xs"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-base text-[#2D1914] block">{sub.clientName}</span>
                      <span className="text-xs font-semibold text-[#683C30]">
                        Procedimento: {sub.serviceTitle}
                      </span>
                    </div>

                    {isPending ? (
                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                        Aguardando Proposta
                      </span>
                    ) : isApproved ? (
                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300">
                        Proposta Aprovada ✓
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-900 border border-blue-300">
                        Proposta Enviada
                      </span>
                    )}
                  </div>

                  {/* Alerta de Química se houver */}
                  {hasChemical && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-medium">
                      <AlertTriangle className="w-3.5 h-3.5 text-[#AD841D] shrink-0" />
                      <span>Possui histórico químico informado na triagem</span>
                    </div>
                  )}

                  {/* Fotos Enviadas pela Cliente */}
                  {(sub.photos.currentHairRoot ||
                    sub.photos.currentHairLength ||
                    sub.photos.inspirationDesired) && (
                    <div className="space-y-1.5 pt-1">
                      <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block">
                        Fotos Recebidas:
                      </span>
                      <div className="flex items-center gap-2.5">
                        {sub.photos.currentHairRoot && (
                          <div className="relative group">
                            <img
                              src={sub.photos.currentHairRoot}
                              alt="Raiz"
                              title="Foto da Raiz"
                              className="w-14 h-14 rounded-xl object-cover border border-[#E7DCCE] shadow-2xs"
                            />
                            <span className="absolute bottom-0 inset-x-0 bg-black/60 text-[9px] text-white text-center rounded-b-xl py-0.2">
                              Raiz
                            </span>
                          </div>
                        )}
                        {sub.photos.currentHairLength && (
                          <div className="relative group">
                            <img
                              src={sub.photos.currentHairLength}
                              alt="Comprimento"
                              title="Foto do Comprimento"
                              className="w-14 h-14 rounded-xl object-cover border border-[#E7DCCE] shadow-2xs"
                            />
                            <span className="absolute bottom-0 inset-x-0 bg-black/60 text-[9px] text-white text-center rounded-b-xl py-0.2">
                              Fios
                            </span>
                          </div>
                        )}
                        {sub.photos.inspirationDesired && (
                          <div className="relative group">
                            <img
                              src={sub.photos.inspirationDesired}
                              alt="Inspiração"
                              title="Foto de Inspiração"
                              className="w-14 h-14 rounded-xl object-cover border border-[#E7DCCE] shadow-2xs"
                            />
                            <span className="absolute bottom-0 inset-x-0 bg-black/60 text-[9px] text-white text-center rounded-b-xl py-0.2">
                              Desejo
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Respostas da Anamnese (Exibição Ampliada e Legível) */}
                  <div className="space-y-2 pt-1">
                    <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block">
                      Respostas da Anamnese:
                    </span>
                    <div className="space-y-1.5">
                      {sub.answers.map((a, i) => (
                        <div
                          key={i}
                          className="p-2.5 rounded-xl bg-white border border-[#E7DCCE]/70"
                        >
                          <span className="text-[11px] font-bold text-[#AD841D] block mb-0.5">
                            {a.questionTitle}
                          </span>
                          <span className="text-xs font-semibold text-[#2D1914] block">
                            {a.selectedOptionLabels?.join(" • ") || a.answerText || "Não informado"}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Ações */}
                <div className="pt-4 mt-4 flex items-center justify-between border-t border-[#E7DCCE]/60">
                  <span className="text-xs text-stone-500 font-medium">
                    Pré-reserva: <strong className="text-[#2D1914]">{sub.preferredDate}</strong> às{" "}
                    <strong className="text-[#2D1914]">{sub.preferredTimeSlot}</strong>
                  </span>

                  {isPending ? (
                    <button
                      onClick={() => setSelectedSubForProposal(sub)}
                      className="px-4 py-2 text-xs font-bold text-white gold-gradient rounded-xl shadow-xs hover:opacity-95 flex items-center space-x-1.5 transition-all"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Montar Proposta</span>
                    </button>
                  ) : sub.proposalId ? (
                    <button
                      onClick={() => onViewProposal(sub.proposalId!)}
                      className="px-3.5 py-1.5 text-xs font-semibold text-[#44271F] bg-white border border-[#E7DCCE] hover:bg-[#FAF7F2] rounded-xl flex items-center space-x-1"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-[#AD841D]" />
                      <span>Ver Proposta</span>
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Criação de Proposta */}
      {selectedSubForProposal && (
        <ProposalBuilderModal
          submission={selectedSubForProposal}
          services={services}
          onSave={(prop) => {
            onGenerateProposal(prop);
            setSelectedSubForProposal(null);
          }}
          onClose={() => setSelectedSubForProposal(null)}
        />
      )}
    </div>
  );
}
