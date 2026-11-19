"use client";

import { useMemo } from "react";
import { Sparkles, Calendar, Tag, ShieldCheck, ArrowRight, Zap, Layers, Clock } from "lucide-react";
import { BlackFridayCampaign, BlackFridayCampaignRow } from "@/types/blackFriday";

export interface BlackFridayHighlightsSectionProps {
  campaign: BlackFridayCampaign | BlackFridayCampaignRow;
  onExploreServices?: () => void;
}

interface HighlightCard {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  tag: string;
}

export function BlackFridayHighlightsSection({
  campaign,
  onExploreServices,
}: BlackFridayHighlightsSectionProps) {
  const campaignName =
    (campaign as BlackFridayCampaign)?.name ??
    (campaign as BlackFridayCampaignRow)?.name ??
    "Black Friday Oficial";

  // 1. Procedimentos configurados no dashboard
  const configs: any[] = useMemo(() => {
    const raw =
      (campaign as BlackFridayCampaign)?.servicesConfig ??
      (campaign as BlackFridayCampaignRow)?.services_config;
    return Array.isArray(raw) ? raw : [];
  }, [campaign]);

  // 2. Desconto progressivo configurado no dashboard
  const progressiveTiers: any[] = useMemo(() => {
    const raw =
      (campaign as BlackFridayCampaign)?.progressiveDiscount?.tiers ??
      (campaign as BlackFridayCampaignRow)?.progressive_discount?.tiers;
    return Array.isArray(raw) ? raw : [];
  }, [campaign]);
  const hasProgressive = progressiveTiers.length > 0;

  // 3. Restrição de agenda configurada no dashboard
  const restrictSchedule = Boolean(
    (campaign as BlackFridayCampaign)?.restrictSchedule ??
    (campaign as BlackFridayCampaignRow)?.restrict_schedule
  );

  const restrictedDates: string[] = useMemo(() => {
    const raw =
      (campaign as BlackFridayCampaign)?.restrictedDates ??
      (campaign as BlackFridayCampaignRow)?.restricted_dates;
    return Array.isArray(raw) ? raw : [];
  }, [campaign]);
  const hasRestrictedDates = restrictSchedule && restrictedDates.length > 0;

  // 4. Período de vigência salvo no dashboard
  const startsAt =
    (campaign as BlackFridayCampaign)?.startsAt ??
    (campaign as BlackFridayCampaignRow)?.starts_at;
  const endsAt =
    (campaign as BlackFridayCampaign)?.endsAt ??
    (campaign as BlackFridayCampaignRow)?.ends_at;

  // Constrói os cards dinamicamente exibindo APENAS o que foi configurado e salvo no dashboard
  const cards: HighlightCard[] = useMemo(() => {
    const list: HighlightCard[] = [];

    // Card de Procedimentos em Promoção
    if (configs.length > 0) {
      list.push({
        id: "descontos",
        icon: Tag,
        title: "Descontos Reais",
        description: `${configs.length} ${
          configs.length === 1 ? "procedimento selecionado" : "procedimentos selecionados"
        } com valores promocionais aplicados diretamente na tabela.`,
        tag: "Transparência total nos valores",
      });
    }

    // Card de Bônus Progressivo (apenas se configurado e ativo no dashboard)
    if (hasProgressive) {
      const maxDiscount = Math.max(
        ...progressiveTiers.map((t: any) =>
          Number(t.discountPercent ?? t.discount_percent ?? 0)
        )
      );
      list.push({
        id: "progressivo",
        icon: Layers,
        title: "Bônus Progressivo",
        description: `Combine procedimentos no mesmo dia e ganhe até ${maxDiscount}% de desconto adicional acumulativo no seu pacote!`,
        tag: "Economia ao montar combos",
      });
    }

    // Card de Datas Reservadas (apenas se restrição de agenda ativa com datas salvas no dashboard)
    if (hasRestrictedDates) {
      const formatted = restrictedDates
        .map((d) => {
          const parts = d.split("-");
          return parts.length === 3 ? `${parts[2]}/${parts[1]}` : d;
        })
        .join(", ");
      list.push({
        id: "datas",
        icon: Calendar,
        title: "Datas Reservadas",
        description: `Agenda com atendimento dedicado exclusivamente aos procedimentos da campanha nas datas: ${formatted}.`,
        tag: "Atendimento com horário marcado",
      });
    }

    // Card de Período da Campanha (se houver datas cadastradas no dashboard)
    if (startsAt || endsAt) {
      const formatIso = (iso: string) => {
        try {
          const [y, m, d] = iso.split("T")[0].split("-");
          return `${d}/${m}`;
        } catch {
          return iso;
        }
      };
      const periodDesc =
        startsAt && endsAt
          ? `Campanha válida de ${formatIso(startsAt)} até ${formatIso(endsAt)}.`
          : endsAt
          ? `Campanha válida até ${formatIso(endsAt)}.`
          : `Campanha iniciada em ${formatIso(startsAt!)}.`;

      list.push({
        id: "periodo",
        icon: Clock,
        title: "Período da Campanha",
        description: `${periodDesc} Vagas limitadas por ordem de agendamento.`,
        tag: "Tempo limitado",
      });
    }

    // Card de Garantia de Qualidade & Padrão Técnico
    list.push({
      id: "qualidade",
      icon: ShieldCheck,
      title: "Padrão Premium Intacto",
      description:
        "Tratamentos realizados com produtos de ponta internacionais (Wella, L'Oréal, Braé) e diagnóstico capilar minucioso.",
      tag: "Saúde dos fios em primeiro lugar",
    });

    return list;
  }, [configs, hasProgressive, progressiveTiers, hasRestrictedDates, restrictedDates, startsAt, endsAt]);

  const handleCta = () => {
    if (onExploreServices) {
      onExploreServices();
      return;
    }
    const target =
      document.getElementById("black-friday-servicos") ||
      document.getElementById("servicos");
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

        {/* Grid Dinâmico: renderiza apenas os cards correspondentes a dados reais configurados no dashboard */}
        <div
          className={`grid grid-cols-1 ${
            cards.length === 1
              ? "max-w-md mx-auto"
              : cards.length === 2
              ? "sm:grid-cols-2 max-w-3xl mx-auto"
              : cards.length === 3
              ? "sm:grid-cols-2 lg:grid-cols-3 max-w-5xl mx-auto"
              : "sm:grid-cols-2 lg:grid-cols-4"
          } gap-5 sm:gap-6 mb-10`}
        >
          {cards.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.id}
                data-testid={`bf-highlight-card-${card.id}`}
                className="p-6 rounded-3xl bg-gradient-to-b from-[#122B2A] to-[#0D1D1C] border border-[#C7A03A]/40 shadow-xl flex flex-col justify-between space-y-4 hover:border-[#C7A03A] transition-all group"
              >
                <div className="space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-[#1D3D3C] text-[#C7A03A] flex items-center justify-center border border-[#C7A03A]/40 group-hover:scale-105 transition-transform shadow-xs">
                    <Icon className="w-6 h-6 text-[#C7A03A]" />
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-[#FCF5EB]">
                    {card.title}
                  </h3>
                  <p className="text-xs text-stone-300 leading-relaxed">
                    {card.description}
                  </p>
                </div>
                <div className="pt-2 border-t border-[#C7A03A]/20 text-[11px] font-semibold text-[#D9B85F] flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5 text-[#C7A03A]" />
                  <span>{card.tag}</span>
                </div>
              </div>
            );
          })}
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
