"use client";

import { Sparkles, Calendar, Tag, ShieldCheck, ArrowRight, Zap, Layers } from "lucide-react";
import { BlackFridayCampaign, BlackFridayCampaignRow } from "@/types/blackFriday";

export interface BlackFridayHighlightsSectionProps {
  campaign: BlackFridayCampaign | BlackFridayCampaignRow;
  onExploreServices?: () => void;
}

export function BlackFridayHighlightsSection({
  campaign,
  onExploreServices,
}: BlackFridayHighlightsSectionProps) {
  const campaignName =
    (campaign as BlackFridayCampaign)?.name ??
    (campaign as BlackFridayCampaignRow)?.name ??
    "Black Friday Oficial";

  const restrictSchedule = Boolean(
    (campaign as BlackFridayCampaign)?.restrictSchedule ??
    (campaign as BlackFridayCampaignRow)?.restrict_schedule
  );

  const restrictedDates: string[] = (() => {
    const raw =
      (campaign as BlackFridayCampaign)?.restrictedDates ??
      (campaign as BlackFridayCampaignRow)?.restricted_dates;
    return Array.isArray(raw) ? raw : [];
  })();

  const progressiveTiers =
    (campaign as BlackFridayCampaign)?.progressiveDiscount?.tiers ??
    (campaign as BlackFridayCampaignRow)?.progressive_discount?.tiers ??
    [];
  const hasProgressive = Array.isArray(progressiveTiers) && progressiveTiers.length > 0;

  const handleCta = () => {
    if (onExploreServices) {
      onExploreServices();
      return;
    }
    const target = document.getElementById("black-friday-servicos") || document.getElementById("servicos");
    if (target) {
      target.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <section
      data-testid="black-friday-highlights-section"
      className="relative overflow-hidden py-16 sm:py-20 bg-[#080F0E] text-[#FCF5EB] border-b border-[#C7A03A]/30 font-sans"
    >
      {/* Luz ambiente de fundo */}
      <div
        className="absolute top-0 right-1/4 w-96 h-96 pointer-events-none opacity-20 -z-10 rounded-full"
        style={{
          background: "radial-gradient(circle, #C7A03A 0%, rgba(29,61,60,0.4) 60%, transparent 80%)",
          filter: "blur(80px)",
        }}
      />
      <div
        className="absolute bottom-0 left-10 w-80 h-80 pointer-events-none opacity-15 -z-10 rounded-full"
        style={{
          background: "radial-gradient(circle, #1D3D3C 0%, transparent 70%)",
          filter: "blur(70px)",
        }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Cabeçalho da Seção */}
        <div className="text-center max-w-3xl mx-auto space-y-3 mb-12 sm:mb-14">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#1D3D3C]/90 border border-[#C7A03A]/50 text-[#C7A03A] text-xs font-bold uppercase tracking-wider shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-[#C7A03A]" />
            <span>Condições Especiais · {campaignName}</span>
          </div>

          <h2 className="text-2xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-[#FCF5EB] font-sans">
            O Cuidado que Você Merece,
            <br />
            <span className="text-[#D9B85F] font-gwendolyn text-3xl sm:text-5xl lg:text-6xl font-normal block mt-1">
              com Condições Históricas
            </span>
          </h2>

          <p className="text-xs sm:text-sm text-stone-300 leading-relaxed max-w-2xl mx-auto">
            Preparamos um período exclusivo com valores especiais nos procedimentos mais desejados, mantendo
            rigorosamente o mesmo padrão de excelência, segurança técnica e cosmética premium do Espaço Gleicy Ronha.
          </p>
        </div>

        {/* Grid de 3 ou 4 Cards Estilizados */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6 mb-10">
          {/* Card 1: Descontos Especiais */}
          <div className="p-6 rounded-3xl bg-gradient-to-b from-[#122B2A] to-[#0D1D1C] border border-[#C7A03A]/40 shadow-xl flex flex-col justify-between space-y-4 hover:border-[#C7A03A] transition-all group">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-[#1D3D3C] text-[#C7A03A] flex items-center justify-center border border-[#C7A03A]/40 group-hover:scale-105 transition-transform shadow-xs">
                <Tag className="w-6 h-6 text-[#C7A03A]" />
              </div>
              <h3 className="text-base sm:text-lg font-bold text-[#FCF5EB]">
                Descontos Reais
              </h3>
              <p className="text-xs text-stone-300 leading-relaxed">
                Valores promocionais aplicados diretamente na tabela para os procedimentos participantes selecionados.
              </p>
            </div>
            <div className="pt-2 border-t border-[#C7A03A]/20 text-[11px] font-semibold text-[#D9B85F] flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-[#C7A03A]" />
              <span>Transparência total nos valores</span>
            </div>
          </div>

          {/* Card 2: Desconto Progressivo */}
          <div className="p-6 rounded-3xl bg-gradient-to-b from-[#122B2A] to-[#0D1D1C] border border-[#C7A03A]/40 shadow-xl flex flex-col justify-between space-y-4 hover:border-[#C7A03A] transition-all group">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-[#1D3D3C] text-[#C7A03A] flex items-center justify-center border border-[#C7A03A]/40 group-hover:scale-105 transition-transform shadow-xs">
                <Layers className="w-6 h-6 text-[#C7A03A]" />
              </div>
              <h3 className="text-base sm:text-lg font-bold text-[#FCF5EB]">
                Bônus Progressivo
              </h3>
              <p className="text-xs text-stone-300 leading-relaxed">
                {hasProgressive
                  ? "Combine 2 ou mais procedimentos no mesmo dia e ganhe descontos extras acumulativos no pacote!"
                  : "Possibilidade de combinar múltiplos procedimentos no mesmo dia com montagem personalizada."}
              </p>
            </div>
            <div className="pt-2 border-t border-[#C7A03A]/20 text-[11px] font-semibold text-[#D9B85F] flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-[#C7A03A]" />
              <span>Economia ao montar combos</span>
            </div>
          </div>

          {/* Card 3: Datas Exclusivas & Agenda */}
          <div className="p-6 rounded-3xl bg-gradient-to-b from-[#122B2A] to-[#0D1D1C] border border-[#C7A03A]/40 shadow-xl flex flex-col justify-between space-y-4 hover:border-[#C7A03A] transition-all group">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-[#1D3D3C] text-[#C7A03A] flex items-center justify-center border border-[#C7A03A]/40 group-hover:scale-105 transition-transform shadow-xs">
                <Calendar className="w-6 h-6 text-[#C7A03A]" />
              </div>
              <h3 className="text-base sm:text-lg font-bold text-[#FCF5EB]">
                {restrictSchedule ? "Datas Reservadas" : "Vagas Limitadas"}
              </h3>
              <p className="text-xs text-stone-300 leading-relaxed">
                {restrictSchedule && restrictedDates.length > 0
                  ? `Agenda com datas dedicadas exclusivamente para os serviços da campanha: ${restrictedDates.map(d => {
                      const parts = d.split("-");
                      return parts.length === 3 ? `${parts[2]}/${parts[1]}` : d;
                    }).join(", ")}.`
                  : "Horários controlados para garantir que cada cliente receba atenção exclusiva e sem pressa."}
              </p>
            </div>
            <div className="pt-2 border-t border-[#C7A03A]/20 text-[11px] font-semibold text-[#D9B85F] flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-[#C7A03A]" />
              <span>Atendimento com horário marcado</span>
            </div>
          </div>

          {/* Card 4: Cosmética Premium */}
          <div className="p-6 rounded-3xl bg-gradient-to-b from-[#122B2A] to-[#0D1D1C] border border-[#C7A03A]/40 shadow-xl flex flex-col justify-between space-y-4 hover:border-[#C7A03A] transition-all group">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-[#1D3D3C] text-[#C7A03A] flex items-center justify-center border border-[#C7A03A]/40 group-hover:scale-105 transition-transform shadow-xs">
                <ShieldCheck className="w-6 h-6 text-[#C7A03A]" />
              </div>
              <h3 className="text-base sm:text-lg font-bold text-[#FCF5EB]">
                Padrão Premium Intacto
              </h3>
              <p className="text-xs text-stone-300 leading-relaxed">
                Tratamentos com produtos de ponta internacionais (Wella, L'Oréal, Braé) e diagnóstico capilar detalhado.
              </p>
            </div>
            <div className="pt-2 border-t border-[#C7A03A]/20 text-[11px] font-semibold text-[#D9B85F] flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-[#C7A03A]" />
              <span>Saúde dos fios em primeiro lugar</span>
            </div>
          </div>
        </div>

        {/* Botão de Rolar para os Serviços Promocionais */}
        <div className="text-center">
          <button
            type="button"
            onClick={handleCta}
            className="inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl bg-gradient-to-r from-[#C7A03A] via-[#D9B85F] to-[#C7A03A] text-[#080F0E] font-bold text-xs uppercase tracking-wider hover:brightness-110 active:scale-95 transition-all shadow-lg cursor-pointer"
          >
            <span>Ver Procedimentos da Black Friday</span>
            <ArrowRight className="w-4 h-4 text-[#080F0E]" />
          </button>
        </div>
      </div>
    </section>
  );
}
