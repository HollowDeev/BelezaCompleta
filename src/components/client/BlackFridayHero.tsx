"use client";

import { Star, MapPin, CalendarCheck, ArrowRight, CheckCircle, Sparkle, Tag } from "@phosphor-icons/react";
import { SalonOrganization } from "@/types/salon";
import { BlackFridayCampaign, BlackFridayCampaignRow } from "@/types/blackFriday";

export interface BlackFridayHeroProps {
  organization?: SalonOrganization | null;
  campaign?: BlackFridayCampaign | BlackFridayCampaignRow | null;
  onExploreServices: () => void;
  onBookNow: () => void;
}

export function BlackFridayHero({
  organization,
  campaign,
  onExploreServices,
  onBookNow,
}: BlackFridayHeroProps) {
  const campaignName =
    (campaign as BlackFridayCampaign)?.name ??
    (campaign as BlackFridayCampaignRow)?.name ??
    "Black Friday Oficial";

  return (
    <section
      id="hero-black-friday"
      data-testid="black-friday-hero"
      className="relative overflow-hidden pt-8 pb-16 sm:pt-14 sm:pb-24 bg-gradient-to-b from-[#080F0E] via-[#122B2A] to-[#080F0E] text-[#FCF5EB] border-b border-[#C7A03A]/30"
    >
      {/* Luz ambiente dourada de fundo */}
      <div
        className="absolute top-0 left-1/4 w-[500px] h-[500px] pointer-events-none opacity-20 -z-10 rounded-full"
        style={{
          background: "radial-gradient(circle, #C7A03A 0%, rgba(29,61,60,0.5) 50%, transparent 70%)",
          filter: "blur(90px)",
        }}
      />
      <div
        className="absolute bottom-0 right-10 w-[400px] h-[400px] pointer-events-none opacity-15 -z-10 rounded-full"
        style={{
          background: "radial-gradient(circle, #1D3D3C 0%, transparent 70%)",
          filter: "blur(80px)",
        }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-14 items-center">

          {/* ========================================================
              COLUNA EDITORIAL DE TEXTO & CONVERSÃO (7 Colunas)
              ======================================================== */}
          <div className="lg:col-span-7 space-y-6 sm:space-y-7 text-left">

            {/* 1. Tag de Autoridade Real + Selo Black Friday */}
            <div className="animate-fade-up animation-delay-100 inline-flex flex-wrap items-center gap-1.5 sm:gap-2 px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-2xl sm:rounded-full bg-[#1D3D3C]/80 backdrop-blur-md border border-[#C7A03A]/50 shadow-[0_2px_14px_rgba(199,160,58,0.2)] text-xs font-semibold">
              <div className="flex items-center gap-1.5 text-[#C7A03A]">
                <Star size={15} weight="fill" className="text-[#C7A03A]" />
                <span className="font-bold text-[#FCF5EB]">5.0 no Google</span>
              </div>
              <span className="text-[#C7A03A]/40">·</span>
              <div className="flex items-center gap-1.5 text-stone-300">
                <MapPin size={15} weight="fill" className="text-[#C7A03A]" />
                <span>{organization?.city && organization?.state ? `${organization.city} - ${organization.state}` : "Salto - SP"}</span>
              </div>
              <span className="text-[#C7A03A]/40 hidden sm:inline">·</span>
              <div className="flex items-center gap-1 text-[#D9B85F] font-black text-[11px] uppercase tracking-wider hidden sm:flex">
                <Sparkle size={13} weight="fill" className="text-[#C7A03A]" />
                <span>{campaignName}</span>
              </div>
            </div>

            {/* 2. Slogan Cursivo Oficial com Linha Orgânica Dourada */}
            <div className="animate-fade-up animation-delay-200 space-y-2">
              <p className="font-gwendolyn text-3xl xs:text-4xl sm:text-5xl lg:text-6xl text-[#D9B85F] leading-[1.08] tracking-wide">
                {organization?.tagline ? (
                  organization.tagline.includes(".") ? (
                    <>
                      {organization.tagline.split(".")[0]}.
                      <br />
                      {organization.tagline.split(".")[1]?.trim()}
                    </>
                  ) : (
                    organization.tagline
                  )
                ) : (
                  <>
                    O cuidado que acolhe.
                    <br />
                    A beleza que encanta.
                  </>
                )}
              </p>
              <div className="pt-1">
                <img
                  src="/brand/Grafismos/linha-grafismo-1.png"
                  alt="Linha orgânica Gleicy Ronha"
                  className="h-5 sm:h-6 w-auto object-contain opacity-80 invert select-none pointer-events-none"
                />
              </div>
            </div>

            {/* 3. Headline Principal Editorial em DM Sans */}
            <h1 className="animate-fade-up animation-delay-300 font-editorial font-bold text-[28px] xs:text-3xl sm:text-5xl lg:text-[52px] text-white tracking-tight leading-[1.08]">
              Condições exclusivas de Black Friday com a{" "}
              <span className="relative inline-block text-shimmer-gold">
                saúde capilar
                <svg
                  className="absolute -bottom-1.5 left-0 w-full"
                  height="8"
                  viewBox="0 0 320 8"
                  preserveAspectRatio="none"
                  aria-hidden="true"
                >
                  <path
                    d="M2 6 Q80 1 160 5 Q240 9 318 4"
                    stroke="#C7A03A"
                    strokeWidth="2.5"
                    fill="none"
                    strokeLinecap="round"
                    opacity="0.8"
                  />
                </svg>
              </span>{" "}
              que você merece.
            </h1>

            {/* 4. Descrição com Foco em Confiança e Metodologia */}
            <p className="animate-fade-up animation-delay-400 text-base sm:text-lg text-stone-300 leading-relaxed max-w-xl font-normal">
              Especialista em mechas, loiros de alta integridade, curvaturas e cronograma reconstrutor.
              Aproveite valores promocionais exclusivos de Black Friday com a garantia inegociável de diagnóstico real,
              teste de mecha prévio e preservação total da fibra capilar.
            </p>

            {/* 5. CTAs de Ação Rápida com Paleta Black Friday */}
            <div className="animate-fade-up animation-delay-500 pt-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5">
              <button
                type="button"
                onClick={onBookNow}
                data-testid="black-friday-hero-primary-cta"
                className="relative overflow-hidden px-8 py-4 rounded-2xl bg-gradient-to-r from-[#C7A03A] to-[#D9B85F] text-[#080F0E] text-sm font-bold tracking-wide hover:brightness-110 active:scale-95 transition-all duration-300 shadow-[0_8px_24px_rgba(199,160,58,0.35)] flex items-center justify-center space-x-3 group cursor-pointer"
              >
                <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out" />
                <CalendarCheck size={18} weight="fill" className="text-[#080F0E] relative z-10" />
                <span className="relative z-10 font-black">Garantir Vaga na Black Friday</span>
                <ArrowRight size={18} weight="bold" className="text-[#080F0E] transition-transform group-hover:translate-x-1 relative z-10" />
              </button>

              <button
                type="button"
                onClick={onExploreServices}
                data-testid="black-friday-hero-secondary-cta"
                className="px-7 py-4 rounded-2xl bg-[#1D3D3C]/70 text-[#FCF5EB] text-sm font-semibold border border-[#C7A03A]/50 hover:bg-[#1D3D3C] hover:border-[#C7A03A] hover:shadow-lg transition-all flex items-center justify-center space-x-2 backdrop-blur-sm cursor-pointer"
              >
                <Tag size={17} weight="bold" className="text-[#C7A03A]" />
                <span>Ver Menu Promocional</span>
              </button>
            </div>

            {/* 6. Faixa Editorial de Compromissos Técnicos */}
            <div className="animate-fade-up animation-delay-600 pt-3 border-t border-[#C7A03A]/25">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-stone-300">
                <div className="flex items-center space-x-2">
                  <CheckCircle size={18} weight="fill" className="text-[#C7A03A] shrink-0" />
                  <span className="font-medium text-white">Atenção individualizada</span>
                </div>

                <div className="flex items-center space-x-2">
                  <CheckCircle size={18} weight="fill" className="text-[#C7A03A] shrink-0" />
                  <span className="font-medium text-white">Teste de mecha obrigatório</span>
                </div>

                <div className="flex items-center space-x-2">
                  <CheckCircle size={18} weight="fill" className="text-[#C7A03A] shrink-0" />
                  <span className="font-medium text-[#D9B85F]">Ofertas Reais e Limitadas</span>
                </div>
              </div>
            </div>

          </div>

          {/* ========================================================
              COLUNA VISUAL: MODELO EDITORIAL & DETALHE DE MECHAS (5 Colunas)
              ======================================================== */}
          <div className="lg:col-span-5 relative animate-fade-in animation-delay-300">
            <div className="relative mx-auto max-w-[420px] lg:max-w-[480px] flex items-center justify-center">

              {/* Halo Escuro de Luxo com Brilho Dourado */}
              <div
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[380px] sm:w-[480px] h-[480px] sm:h-[600px] pointer-events-none -z-10 rounded-full"
                style={{
                  background:
                    "radial-gradient(ellipse at center, rgba(199, 160, 58, 0.28) 0%, rgba(29, 61, 60, 0.4) 45%, transparent 72%)",
                  filter: "blur(54px)",
                }}
              />

              {/* Imagem Recortada da Modelo */}
              <div className="relative w-full flex justify-center">
                <img
                  src="/brand/hero_modelo.png"
                  alt="Modelo Black Friday Gleicy Ronha - Mechas de Alta Fidelidade"
                  className="relative z-10 w-full max-h-[580px] sm:max-h-[640px] object-contain drop-shadow-[0_22px_44px_rgba(0,0,0,0.6)] select-none pointer-events-none"
                />

                {/* Card Flutuante Black Friday */}
                <div className="absolute left-2 xs:left-3 sm:-left-4 lg:-left-6 bottom-4 sm:bottom-12 z-20 max-w-[225px] xs:max-w-[260px] sm:max-w-[300px] animate-float">
                  
                  {/* Seta Dourada Curvada Elegante */}
                  <div className="absolute -top-12 right-3 sm:-top-16 sm:right-6 pointer-events-none">
                    <svg
                      className="w-20 h-14 sm:w-28 sm:h-20 text-[#C7A03A]"
                      viewBox="0 0 110 80"
                      fill="none"
                      aria-hidden="true"
                    >
                      <path
                        d="M 14 74 Q 45 60, 96 18"
                        stroke="#D9B85F"
                        strokeWidth="3.5"
                        strokeLinecap="round"
                        opacity="0.3"
                      />
                      <path
                        d="M 14 74 Q 45 60, 96 18"
                        stroke="#C7A03A"
                        strokeWidth="1.75"
                        strokeLinecap="round"
                      />
                      <path
                        d="M 84 20 L 96 18 L 94 30"
                        stroke="#C7A03A"
                        strokeWidth="1.75"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <circle cx="14" cy="74" r="3" fill="#C7A03A" />
                    </svg>
                  </div>

                  {/* Corpo do Card Flutuante */}
                  <div className="p-3 sm:p-4 rounded-2xl bg-[#080F0E]/95 backdrop-blur-md border border-[#C7A03A]/60 shadow-[0_12px_36px_rgba(0,0,0,0.7)] transition-all duration-300">
                    <div className="flex items-start gap-2">
                      <div className="w-2 h-2 rounded-full bg-[#C7A03A] mt-1 shrink-0 animate-pulse" />
                      <div className="space-y-0.5 sm:space-y-1">
                        <div className="inline-block px-1.5 py-0.2 rounded bg-[#1D3D3C] text-[#C7A03A] text-[9px] font-bold uppercase tracking-wider">
                          Black Friday
                        </div>
                        <h3 className="font-editorial font-bold text-[11px] xs:text-xs sm:text-sm text-white leading-snug">
                          Loiros &amp; Morenas Iluminadas
                        </h3>
                        <p className="text-[9px] xs:text-[10px] sm:text-[11px] font-medium text-[#D9B85F] leading-tight flex items-center gap-1">
                          <span>✦</span>
                          <span>Saúde da fibra 100% preservada</span>
                        </p>
                      </div>
                    </div>
                  </div>

                </div>

                {/* Selo Inferior de Autenticidade */}
                <div className="absolute -bottom-3 right-1.5 sm:right-4 z-20 px-2.5 py-1 sm:px-3.5 sm:py-1.5 rounded-full bg-[#080F0E]/90 backdrop-blur-md border border-[#C7A03A]/40 shadow-sm text-[10px] sm:text-[11px] text-stone-300 flex items-center gap-1.5 sm:gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#C7A03A]" />
                  <span className="font-editorial font-bold text-[#D9B85F]">Desde 2013</span>
                  <span className="text-stone-500">·</span>
                  <span className="font-medium text-white">Gleicy Ronha</span>
                </div>

              </div>

            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
