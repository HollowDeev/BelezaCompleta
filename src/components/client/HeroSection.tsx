"use client";

import { Star, MapPin, CalendarCheck, ArrowRight, CheckCircle } from "@phosphor-icons/react";
import { SalonOrganization } from "@/types/salon";

interface HeroSectionProps {
  organization?: SalonOrganization | null;
  onExploreServices: () => void;
  onBookNow: () => void;
}

export function HeroSection({ organization, onExploreServices, onBookNow }: HeroSectionProps) {
  return (
    <section
      id="hero"
      className="relative overflow-hidden pt-8 pb-16 sm:pt-14 sm:pb-24 bg-gradient-to-b from-[#FCF5EB] via-[#FAF6EF] to-[#F3ECE0]"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-14 items-center">

          {/* ========================================================
              COLUNA EDITORIAL DE TEXTO & CONVERSÃO (7 Colunas)
              ======================================================== */}
          <div className="lg:col-span-7 space-y-6 sm:space-y-7 text-left">

            {/* 1. Tag de Autoridade Real: Google 5.0 Estrelas & Localização Salto - SP */}
            <div className="animate-fade-up animation-delay-100 inline-flex flex-wrap items-center gap-1.5 sm:gap-2 px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-2xl sm:rounded-full bg-white/95 backdrop-blur-md border border-[#C7A03A]/45 shadow-[0_2px_14px_rgba(199,160,58,0.12)] text-[#1D3D3C] text-xs font-semibold">
              <div className="flex items-center gap-1.5 text-[#C7A03A]">
                <Star size={15} weight="fill" className="text-[#C7A03A]" />
                <span className="font-bold text-[#1D3D3C]">5.0 no Google</span>
              </div>
              <span className="text-stone-300">·</span>
              <div className="flex items-center gap-1.5 text-[#736455]">
                <MapPin size={15} weight="fill" className="text-[#1D3D3C]" />
                <span>{organization?.city && organization?.state ? `${organization.city} - ${organization.state}` : "Salto - SP"}</span>
              </div>
              <span className="text-stone-300 hidden sm:inline">·</span>
              <span className="text-[#80611F] font-bold text-[11px] uppercase tracking-wider hidden sm:inline">
                Atelier de Mechas &amp; Cachos
              </span>
            </div>

            {/* 2. Slogan Cursivo Oficial com Grafismo em Linha Orgânica Dourada */}
            <div className="animate-fade-up animation-delay-200 space-y-2">
              <p className="font-gwendolyn text-3xl xs:text-4xl sm:text-5xl lg:text-6xl text-[#80611F] leading-[1.08] tracking-wide">
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
                  className="h-5 sm:h-6 w-auto object-contain opacity-90 select-none pointer-events-none"
                />
              </div>
            </div>

            {/* 3. Headline Principal Editorial em DM Sans */}
            <h1 className="animate-fade-up animation-delay-300 font-editorial font-bold text-[26px] xs:text-3xl sm:text-5xl lg:text-[52px] text-[#1D3D3C] tracking-tight leading-[1.08]">
              A beleza que você deseja, com a{" "}
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
            <p className="animate-fade-up animation-delay-400 text-base sm:text-lg text-[#736455] leading-relaxed max-w-xl font-normal">
              Especialista em mechas, loiros de alta integridade, curvaturas e cronograma reconstrutor.
              Aqui, cada procedimento começa com diagnóstico real e teste de mecha prévio, em um
              ambiente acolhedor e com valores 100% transparentes.
            </p>

            {/* 5. CTAs de Ação Rápida com Ícones Phosphor */}
            <div className="animate-fade-up animation-delay-500 pt-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5">
              <button
                type="button"
                onClick={onBookNow}
                className="relative overflow-hidden px-8 py-4 rounded-2xl bg-[#1D3D3C] text-[#FCF5EB] text-sm font-bold tracking-wide hover:bg-[#28504D] active:bg-[#122B2A] transition-all duration-300 shadow-[0_8px_24px_rgba(29,61,60,0.3)] hover:shadow-[0_12px_36px_rgba(29,61,60,0.4)] flex items-center justify-center space-x-3 border border-[#C7A03A]/50 group cursor-pointer"
              >
                <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/12 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out" />
                <CalendarCheck size={18} weight="fill" className="text-[#C7A03A] relative z-10" />
                <span className="relative z-10">Agendar Horário Online</span>
                <ArrowRight size={18} weight="bold" className="text-[#D9B85F] transition-transform group-hover:translate-x-1 relative z-10" />
              </button>

              <button
                type="button"
                onClick={onExploreServices}
                className="px-7 py-4 rounded-2xl bg-white/90 text-[#1D3D3C] text-sm font-semibold border border-[#D8D0BD] hover:bg-white hover:border-[#1D3D3C]/50 hover:shadow-md transition-all flex items-center justify-center space-x-2 backdrop-blur-sm cursor-pointer"
              >
                <span>Ver Menu &amp; Valores</span>
              </button>
            </div>

            {/* 6. Faixa Editorial de Compromissos Técnicos com CheckCircle */}
            <div className="animate-fade-up animation-delay-600 pt-3 border-t border-[#D8D0BD]/70">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-[#736455]">
                <div className="flex items-center space-x-2">
                  <CheckCircle size={18} weight="fill" className="text-[#C7A03A] shrink-0" />
                  <span className="font-medium text-[#1D3D3C]">Atenção individualizada</span>
                </div>

                <div className="flex items-center space-x-2">
                  <CheckCircle size={18} weight="fill" className="text-[#C7A03A] shrink-0" />
                  <span className="font-medium text-[#1D3D3C]">Teste de mecha obrigatório</span>
                </div>

                <div className="flex items-center space-x-2">
                  <CheckCircle size={18} weight="fill" className="text-[#C7A03A] shrink-0" />
                  <span className="font-medium text-[#1D3D3C]">Valores sem surpresas</span>
                </div>
              </div>
            </div>

          </div>

          {/* ========================================================
              COLUNA VISUAL: MODELO EDITORIAL & DETALHE DE MECHAS (5 Colunas)
              ======================================================== */}
          <div className="lg:col-span-5 relative animate-fade-in animation-delay-300">
            <div className="relative mx-auto max-w-[420px] lg:max-w-[480px] flex items-center justify-center">

              {/* Luz de fundo natural de estúdio fotográfico atrás da modelo */}
              <div
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[380px] sm:w-[480px] h-[480px] sm:h-[600px] pointer-events-none -z-10 rounded-full"
                style={{
                  background:
                    "radial-gradient(ellipse at center, rgba(235, 206, 138, 0.35) 0%, rgba(246, 236, 207, 0.45) 45%, rgba(252, 245, 235, 0) 72%)",
                  filter: "blur(54px)",
                }}
              />
              <div
                className="absolute top-[28%] left-1/2 -translate-x-1/2 w-[240px] sm:w-[320px] h-[280px] sm:h-[340px] pointer-events-none -z-10 rounded-full"
                style={{
                  background:
                    "radial-gradient(circle, rgba(255, 252, 242, 0.75) 0%, rgba(229, 196, 122, 0.22) 55%, transparent 75%)",
                  filter: "blur(36px)",
                }}
              />

              {/* Imagem Recortada da Modelo com Cabelo Ondulado Longo */}
              <div className="relative w-full flex justify-center">
                <img
                  src="/brand/hero_modelo.png"
                  alt="Modelo Gleicy Ronha - Corte em Camadas e Morena Iluminada Avelã"
                  className="relative z-10 w-full max-h-[580px] sm:max-h-[640px] object-contain drop-shadow-[0_22px_44px_rgba(29,61,60,0.18)] select-none pointer-events-none"
                />

                {/* Card Flutuante Refinado com Seta Curvada Dourada apontando para as mechas */}
                <div className="absolute left-2 xs:left-3 sm:-left-4 lg:-left-6 bottom-4 sm:bottom-12 z-20 max-w-[215px] xs:max-w-[250px] sm:max-w-[290px] animate-float">
                  
                  {/* Seta Dourada Curvada Elegante (SVG fino) apontando para as mechas do cabelo */}
                  <div className="absolute -top-12 right-3 sm:-top-16 sm:right-6 pointer-events-none">
                    <svg
                      className="w-20 h-14 sm:w-28 sm:h-20 text-[#C7A03A]"
                      viewBox="0 0 110 80"
                      fill="none"
                      aria-hidden="true"
                    >
                      {/* Glow sutil na linha */}
                      <path
                        d="M 14 74 Q 45 60, 96 18"
                        stroke="#D9B85F"
                        strokeWidth="3.5"
                        strokeLinecap="round"
                        opacity="0.25"
                      />
                      {/* Linha dourada curvada */}
                      <path
                        d="M 14 74 Q 45 60, 96 18"
                        stroke="#C7A03A"
                        strokeWidth="1.75"
                        strokeLinecap="round"
                      />
                      {/* Ponteiro da seta refinada */}
                      <path
                        d="M 84 20 L 96 18 L 94 30"
                        stroke="#C7A03A"
                        strokeWidth="1.75"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      {/* Ponto inicial decorativo sobre o card */}
                      <circle cx="14" cy="74" r="3" fill="#C7A03A" />
                    </svg>
                  </div>

                  {/* Corpo do Card Flutuante */}
                  <div className="p-3 sm:p-4 rounded-2xl bg-white/95 backdrop-blur-md border border-[#C7A03A]/45 shadow-[0_12px_36px_rgba(29,61,60,0.16)] transition-all duration-300 hover:shadow-[0_16px_44px_rgba(199,160,58,0.22)]">
                    <div className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-[#C7A03A] mt-1 shrink-0 animate-pulse" />
                      <div className="space-y-0.5 sm:space-y-1">
                        <h3 className="font-editorial font-bold text-[11px] xs:text-xs sm:text-sm text-[#1D3D3C] leading-snug">
                          Corte em Camadas &amp; Morena Iluminada Avelã
                        </h3>
                        <p className="text-[9px] xs:text-[10px] sm:text-[11px] font-medium text-[#80611F] leading-tight flex items-center gap-1">
                          <span>✦</span>
                          <span>Saúde da fibra 100% preservada</span>
                        </p>
                      </div>
                    </div>
                  </div>

                </div>

                {/* Selo Nobre Inferior de Autenticidade */}
                <div className="absolute -bottom-3 right-1.5 sm:right-4 z-20 px-2.5 py-1 sm:px-3.5 sm:py-1.5 rounded-full bg-white/90 backdrop-blur-md border border-[#D8D0BD] shadow-sm text-[10px] sm:text-[11px] text-[#736455] flex items-center gap-1.5 sm:gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#C7A03A]" />
                  <span className="font-editorial font-bold text-[#80611F]">Desde 2013</span>
                  <span>·</span>
                  <span className="font-medium text-[#1D3D3C]">Gleicy Ronha</span>
                </div>

              </div>

            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
