"use client";

import { useMemo } from "react";
import { ServiceItem } from "@/types/service";
import { BlackFridayCampaign, BlackFridayCampaignRow } from "@/types/blackFriday";
import { getServiceBlackFridayPrice } from "@/lib/services/blackFridayPricing";
import { formatBRL } from "@/lib/utils";
import {
  Sparkles,
  Calendar,
  Clock,
  ArrowRight,
  CheckCircle2,
  Tag,
  Zap,
  Info,
} from "lucide-react";

export interface BlackFridayExclusiveShowcaseProps {
  services: ServiceItem[];
  campaign: BlackFridayCampaign | BlackFridayCampaignRow;
  onSelectService: (service: ServiceItem) => void;
  whatsappNumber?: string;
}

export function BlackFridayExclusiveShowcase({
  services,
  campaign,
  onSelectService,
  whatsappNumber = "5511995975725",
}: BlackFridayExclusiveShowcaseProps) {
  const campaignName =
    (campaign as BlackFridayCampaign)?.name ??
    (campaign as BlackFridayCampaignRow)?.name ??
    "Black Friday Oficial";

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

  const configs: any[] = useMemo(() => {
    const raw =
      (campaign as BlackFridayCampaign)?.servicesConfig ??
      (campaign as BlackFridayCampaignRow)?.services_config;
    return Array.isArray(raw) ? raw : [];
  }, [campaign]);

  // Filter only services that are configured in the Black Friday campaign
  const blackFridayServices = useMemo(() => {
    if (!configs || configs.length === 0) return [];
    const validIds = new Set(configs.map((c: any) => c.serviceId ?? c.service_id));
    return services.filter((s) => validIds.has(s.id));
  }, [services, configs]);

  const formatRestrictedDateHuman = (isoDate: string): { dayMonth: string; weekday: string } => {
    try {
      const [year, month, day] = isoDate.split("-").map(Number);
      if (!year || !month || !day) return { dayMonth: isoDate, weekday: "" };
      const d = new Date(year, month - 1, day);
      const dayMonth = `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}`;
      const weekday = d.toLocaleDateString("pt-BR", { weekday: "long" });
      const capitalized = weekday.charAt(0).toUpperCase() + weekday.slice(1);
      return { dayMonth, weekday: capitalized };
    } catch {
      return { dayMonth: isoDate, weekday: "" };
    }
  };

  if (!blackFridayServices || blackFridayServices.length === 0) {
    return null;
  }

  return (
    <section
      id="black-friday-servicos"
      data-testid="black-friday-exclusive-showcase"
      className="relative overflow-hidden py-16 sm:py-24 bg-[#080F0E] text-[#FCF5EB] border-b border-[#C7A03A]/40 font-sans"
    >
      {/* Luz ambiente de destaque dourada */}
      <div
        className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[600px] pointer-events-none opacity-15 -z-10 rounded-full"
        style={{
          background: "radial-gradient(circle, #C7A03A 0%, rgba(29,61,60,0.5) 50%, transparent 75%)",
          filter: "blur(100px)",
        }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Cabeçalho da Vitrine */}
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#1D3D3C] border border-[#C7A03A]/60 text-[#D9B85F] text-xs font-black uppercase tracking-widest shadow-md">
            <Sparkles className="w-4 h-4 text-[#C7A03A]" />
            <span>Vitrine Exclusiva · {campaignName}</span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-[#FCF5EB] font-sans">
            Procedimentos Selecionados
            <br />
            <span className="text-[#D9B85F] font-gwendolyn text-4xl sm:text-6xl font-normal block mt-1">
              com Valores de Black Friday
            </span>
          </h2>

          <p className="text-xs sm:text-sm text-stone-300 leading-relaxed max-w-2xl mx-auto">
            Abaixo estão reunidos exclusivamente os procedimentos participantes da campanha. Escolha seu tratamento e garanta seu horário com valores promocionais.
          </p>
        </div>

        {/* Bloco de Datas Exclusivas da Agenda (quando restrição ativa) */}
        {restrictSchedule && restrictedDates.length > 0 && (
          <div
            data-testid="bf-exclusive-dates-card"
            className="mb-12 p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-[#122B2A] via-[#1D3D3C] to-[#122B2A] border border-[#C7A03A]/60 shadow-2xl relative overflow-hidden"
          >
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
              <div className="space-y-2 max-w-xl">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#080F0E]/80 border border-[#C7A03A]/40 text-[#D9B85F] text-[11px] font-bold uppercase tracking-wider">
                  <Calendar className="w-3.5 h-3.5 text-[#C7A03A]" />
                  <span>Agenda Dedicada</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-[#FCF5EB]">
                  Datas Exclusivas para a Black Friday
                </h3>
                <p className="text-xs sm:text-sm text-stone-300 leading-relaxed">
                  Nas datas abaixo, a agenda do salão funcionará <strong className="text-[#D9B85F]">exclusivamente</strong> para os procedimentos desta vitrine. Nas demais datas da agenda, todos os serviços normais continuam disponíveis para agendamento!
                </p>
              </div>

              {/* Badges estilizados das datas */}
              <div className="flex flex-wrap items-center gap-3">
                {restrictedDates.map((d) => {
                  const info = formatRestrictedDateHuman(d);
                  return (
                    <div
                      key={d}
                      className="px-4 py-2.5 rounded-2xl bg-[#080F0E] border border-[#C7A03A] text-center shadow-md flex items-center gap-3"
                    >
                      <div className="w-8 h-8 rounded-xl bg-[#1D3D3C] text-[#C7A03A] flex items-center justify-center font-bold text-xs">
                        <Zap className="w-4 h-4 text-[#C7A03A]" />
                      </div>
                      <div className="text-left">
                        <span className="block text-sm font-black text-[#FCF5EB] font-mono tracking-wide">
                          {info.dayMonth}
                        </span>
                        {info.weekday && (
                          <span className="block text-[10px] text-[#D9B85F] uppercase font-bold tracking-wider">
                            {info.weekday}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Grid de Serviços Exclusivos da Black Friday */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {blackFridayServices.map((service) => {
            const pricing = getServiceBlackFridayPrice(service, campaign, { ignoreDateRange: true });
            const totalDuration = service.steps?.reduce((acc, st) => acc + (st.durationMin || 0), 0) || 120;
            const hours = Math.floor(totalDuration / 60);
            const minutes = totalDuration % 60;
            const durationLabel = `${hours > 0 ? `${hours}h` : ""}${minutes > 0 ? `${minutes}m` : ""}` || "2h";

            // Determine discount badge label
            let badgeText = "OFERTA BLACK";
            if (pricing.discountType === "percentage" && pricing.discountPercent > 0) {
              badgeText = `-${pricing.discountPercent}% OFF`;
            } else if (pricing.discountType === "fixed" && pricing.discountAmount > 0) {
              badgeText = `-R$ ${pricing.discountAmount} OFF`;
            } else if (pricing.discountType === "manual") {
              badgeText = "PREÇO ESPECIAL";
            }

            return (
              <div
                key={service.id}
                data-testid={`bf-exclusive-service-card-${service.id}`}
                className="rounded-3xl bg-gradient-to-b from-[#122B2A] to-[#0A1414] border border-[#C7A03A]/50 hover:border-[#C7A03A] shadow-xl overflow-hidden flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 group"
              >
                {/* Imagem do Serviço ou Header */}
                <div className="relative h-48 sm:h-52 w-full overflow-hidden bg-[#1D3D3C]/40">
                  <img
                    src={service.imageUrl || "/brand/Carrossel_Fotos/1.webp"}
                    alt={service.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />

                  {/* Overlay gradiente escuro */}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#122B2A] via-transparent to-black/40" />

                  {/* Badges superiores */}
                  <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2 z-10">
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#080F0E]/90 text-[#C7A03A] border border-[#C7A03A]/60 text-[10px] font-black uppercase tracking-wider shadow-md">
                      <Sparkles className="w-3 h-3 text-[#C7A03A]" />
                      <span>BLACK FRIDAY</span>
                    </span>

                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-gradient-to-r from-[#C7A03A] to-[#D9B85F] text-[#080F0E] text-[11px] font-black uppercase tracking-wider shadow-md">
                      <Tag className="w-3 h-3 text-[#080F0E]" />
                      <span>{badgeText}</span>
                    </span>
                  </div>

                  {/* Categoria sobre a imagem */}
                  <div className="absolute bottom-3 left-3 z-10">
                    <span className="text-[10px] uppercase font-bold tracking-widest text-[#D9B85F] bg-[#080F0E]/80 px-2.5 py-0.5 rounded-md border border-[#C7A03A]/30">
                      {service.category === "transformacao" || service.category === "mechas"
                        ? "Mechas & Iluminados"
                        : service.category === "corte"
                        ? "Corte Estruturado"
                        : service.category === "tratamento"
                        ? "Tratamento Capilar"
                        : "Procedimento"}
                    </span>
                  </div>
                </div>

                {/* Conteúdo do Card */}
                <div className="p-6 space-y-4 flex-1 flex flex-col justify-between">
                  <div className="space-y-2">
                    <h3 className="text-xl font-bold text-[#FCF5EB] group-hover:text-[#D9B85F] transition-colors leading-snug">
                      {service.title}
                    </h3>
                    <p className="text-xs text-stone-300 line-clamp-2 leading-relaxed">
                      {service.description || "Procedimento com diagnóstico capilar detalhado, cosmética internacional e acompanhamento técnico."}
                    </p>

                    {/* Duração e etapas */}
                    <div className="flex items-center gap-3 pt-2 text-[11px] text-stone-400">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-[#C7A03A]" />
                        <span>Aprox. {durationLabel}</span>
                      </div>
                      <span>·</span>
                      <div className="flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#C7A03A]" />
                        <span>{service.steps?.length || 3} etapas inclusas</span>
                      </div>
                    </div>
                  </div>

                  {/* Bloco de Preços */}
                  <div className="pt-4 border-t border-[#C7A03A]/20 space-y-3">
                    <div className="flex items-baseline justify-between gap-2">
                      <div className="space-y-0.5">
                        <span className="text-[10px] uppercase text-stone-400 font-bold block">
                          De:
                        </span>
                        <span className="text-sm text-stone-400 line-through font-mono">
                          {formatBRL(pricing.originalPrice)}
                        </span>
                      </div>

                      <div className="text-right space-y-0.5">
                        <span className="text-[10px] uppercase text-[#D9B85F] font-bold block tracking-wider">
                          Por apenas:
                        </span>
                        <div className="text-2xl sm:text-3xl font-black text-[#D9B85F] font-mono tracking-tight">
                          {formatBRL(pricing.finalPrice)}
                        </div>
                      </div>
                    </div>

                    {/* Botão de Agendamento */}
                    <button
                      type="button"
                      onClick={() => onSelectService(service)}
                      className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-[#C7A03A] via-[#D9B85F] to-[#C7A03A] text-[#080F0E] font-bold text-xs uppercase tracking-wider hover:brightness-110 active:scale-95 transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <span>Agendar com Preço Black</span>
                      <ArrowRight className="w-4 h-4 text-[#080F0E]" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
