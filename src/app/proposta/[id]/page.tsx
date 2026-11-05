"use client";

import { useEffect, useState, Suspense } from "react";
import { useParams } from "next/navigation";
import { LuxuryProposal } from "@/types/proposal";
import { SupabaseDataService } from "@/lib/supabase/api";
import { LuxuryProposalPDF } from "@/components/proposal/LuxuryProposalPDF";
import { Sparkles, Scissors, PhoneCall, AlertCircle } from "lucide-react";
import Link from "next/link";

function ProposalView() {
  const params = useParams();
  const proposalId = params?.id as string;

  const [proposal, setProposal] = useState<LuxuryProposal | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadProposal() {
      if (!proposalId) return;
      try {
        setLoading(true);
        const data = await SupabaseDataService.getProposalById(proposalId);
        if (data) {
          setProposal(data);
        } else {
          setError("Proposta não encontrada ou expirada.");
        }
      } catch (err: any) {
        console.error("Erro ao carregar proposta dedicada:", err);
        setError("Não foi possível carregar a proposta no momento.");
      } finally {
        setLoading(false);
      }
    }

    loadProposal();
  }, [proposalId]);

  const handleApprove = async (
    id: string,
    options?: { chosenDate?: string; chosenTime?: string }
  ) => {
    try {
      await SupabaseDataService.approveProposal(id, options);
      if (proposal) {
        setProposal({
          ...proposal,
          status: "approved",
          schedulingDetails: proposal.schedulingDetails
            ? {
                ...proposal.schedulingDetails,
                confirmedDate:
                  options?.chosenDate ||
                  proposal.schedulingDetails.confirmedDate ||
                  proposal.schedulingDetails.suggestedDateStart,
                confirmedTime:
                  options?.chosenTime ||
                  proposal.schedulingDetails.confirmedTime ||
                  proposal.schedulingDetails.suggestedTime,
                clientChosenDate: options?.chosenDate,
                clientChosenTime: options?.chosenTime,
              }
            : undefined,
        });
      }
    } catch (err) {
      console.error("Erro ao aprovar proposta:", err);
    }
  };

  if (loading) {
    return <ProposalLoading />;
  }

  if (error || !proposal) {
    return (
      <div className="min-h-screen bg-[#FAF7F2] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-full bg-amber-50 border border-amber-200 text-amber-800 flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="font-editorial text-2xl font-bold text-[#2D1914] mb-2">
          {error || "Proposta Não Localizada"}
        </h2>
        <p className="text-xs text-[#5E372C] max-w-md mx-auto mb-6">
          Verifique se o link enviado pelo WhatsApp está completo ou entre em contato com nossa equipe para reenviar sua proposta.
        </p>
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="px-5 py-2.5 rounded-xl text-xs font-semibold text-[#5E372C] bg-white border border-[#E7DCCE] hover:bg-[#F3ECE1] transition-all shadow-2xs"
          >
            Ir para a Página Inicial
          </Link>
          <a
            href="https://wa.me/5511987654321?text=Ol%C3%A1!%20Gostaria%20de%20consultar%20minha%20proposta%20personalizada."
            target="_blank"
            rel="noopener noreferrer"
            className="px-5 py-2.5 rounded-xl text-xs font-bold text-white chocolate-gradient hover:opacity-95 transition-all shadow-xs flex items-center gap-1.5"
          >
            <PhoneCall className="w-3.5 h-3.5 text-[#C59B27]" />
            <span>Falar com o Espaço Gleicy</span>
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF7F2]">
      {/* Barra de Topo Elegante da Página Web */}
      <header className="no-print bg-white/95 backdrop-blur-md border-b border-[#E7DCCE]/80 sticky top-0 z-30 px-3.5 sm:px-8 py-2.5 sm:py-3.5">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#FAF7F2] border border-[#E7DCCE] flex items-center justify-center shrink-0">
              <Scissors className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#C59B27]" />
            </div>
            <div className="min-w-0">
              <span className="font-editorial text-xs sm:text-base font-bold text-[#2D1914] block leading-tight truncate">
                Espaço Gleicy Ronha
              </span>
              <span className="text-[9px] sm:text-[10px] uppercase tracking-wider text-[#AD841D] font-medium block truncate">
                Proposta Exclusiva &amp; Personalizada
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[11px] sm:text-xs text-stone-500 truncate max-w-[140px] sm:max-w-xs">
              <span className="hidden xs:inline">Cliente: </span><strong className="text-[#2D1914]">{proposal.clientName}</strong>
            </span>
          </div>
        </div>
      </header>

      {/* Conteúdo Principal: Proposta Diagramada */}
      <main className="max-w-5xl mx-auto py-3 sm:py-6 px-2 sm:px-4">
        <LuxuryProposalPDF
          proposal={proposal}
          isClientView={true}
          onApprove={handleApprove}
        />
      </main>
    </div>
  );
}

function ProposalLoading() {
  return (
    <div className="min-h-screen bg-[#FAF7F2] flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 rounded-full bg-white shadow-md border border-[#E7DCCE] flex items-center justify-center mb-4">
        <Sparkles className="w-7 h-7 text-[#C59B27] animate-spin" />
      </div>
      <h2 className="font-editorial text-2xl font-bold text-[#2D1914] mb-1">
        Carregando Proposta Personalizada...
      </h2>
      <p className="text-xs text-[#5E372C]">
        Preparando seu plano exclusivo desenvolvido por Gleicy Ronha.
      </p>
    </div>
  );
}

export default function DedicatedProposalPage() {
  return (
    <Suspense fallback={<ProposalLoading />}>
      <ProposalView />
    </Suspense>
  );
}
