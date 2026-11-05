"use client";

import { useState } from "react";
import Image from "next/image";
import { Sparkles, Star, ChevronLeft, ChevronRight, Quote, ExternalLink, CheckCircle, MapPin } from "lucide-react";

export function TestimonialsSection() {
  const [activeIdx, setActiveIdx] = useState(0);

  const googleProfileUrl =
    "https://www.google.com/search?kgmid=/g/11t3195br_&q=Espa%C3%A7o+Gleicy+Ronha";

  const testimonials = [
    {
      name: "Patrícia Lopes",
      service: "Mechas Iluminadas & Reconstrução",
      rating: 5,
      date: "Há 2 semanas",
      initials: "PL",
      accent: "#C7A03A",
      text: "Cheguei com muito receio de descolorir porque meu cabelo já tinha quebrado em outro salão. A Gleicy fez o teste de mecha antes de qualquer coisa, explicou detalhadamente o limite do meu fio e fez um loiro mel iluminado impecável! O cabelo saiu mais macio do que entrou. Confiança cega no trabalho dela!",
      detail: "Diagnóstico: Teste de mecha prévio e proteção de pontes",
    },
    {
      name: "Rafaela Silveira",
      service: "Cachos Definidos & Iluminação",
      rating: 5,
      date: "Há 1 mês",
      initials: "RS",
      accent: "#707956",
      text: "Quem tem cabelo cacheado sabe o pavor de fazer mechas e perder a definição dos cachos. A técnica da Gleicy respeitou a estrutura do meu 3B do início ao fim! Não esticou, não ressecou e o brilho ficou surreal. O espaço é super acolhedor e sem correria.",
      detail: "Resultado: Curvatura 3B preservada com tom avelã",
    },
    {
      name: "Mariana Toledo",
      service: "Cronograma Reconstrutor & Corte",
      rating: 5,
      date: "Há 1 mês",
      initials: "MT",
      accent: "#1D3D3C",
      text: "O que mais me impressionou foi a sinceridade: ela não joga química no seu cabelo só para faturar. Me orientou um cronograma antes de clarear, cuidou da saúde da raiz às pontas e hoje meu cabelo é outro. Atendimento de alto padrão aqui em Salto!",
      detail: "Tratamento: Protocolo de recuperação de elasticidade",
    },
    {
      name: "Camila Rodrigues",
      service: "Loiro de Alta Integridade",
      rating: 5,
      date: "Há 2 meses",
      initials: "CR",
      accent: "#80611F",
      text: "Ambiente acolhedor, pontualidade britânica e cafezinho maravilhoso. A Gleicy atende com uma calma que transmite paz. Cada etapa é explicada, os produtos são os melhores do mercado e o resultado do loiro superou qualquer expectativa minha. Recomendo de olhos fechados!",
      detail: "Resultado: Loiro pérola sem sensibilização da fibra",
    },
    {
      name: "Fernanda Albuquerque",
      service: "Corte Estruturado & Visagismo",
      rating: 5,
      date: "Há 3 meses",
      initials: "FA",
      accent: "#736455",
      text: "Fui por indicação de uma amiga para alinhar corte e finalização. A Gleicy avaliou meu formato de rosto e meu estilo de vida antes da tesoura. Ficou perfeito, prático de arrumar em casa no dia a dia. Já virei cliente assídua!",
      detail: "Serviço: Corte com consultoria de estilização home care",
    },
  ];

  const prev = () => setActiveIdx((i) => (i === 0 ? testimonials.length - 1 : i - 1));
  const next = () => setActiveIdx((i) => (i === testimonials.length - 1 ? 0 : i + 1));

  const active = testimonials[activeIdx];

  return (
    <section className="relative overflow-hidden py-24 sm:py-32 bg-[#1D3D3C] text-[#FCF5EB] border-b border-[#28504D]">
      {/* Padrão dourado no verde escuro */}
      <div className="absolute inset-0 bg-pattern-gold-green opacity-[0.16] pointer-events-none" />

      {/* Grafismo lateral de curva orgânica */}
      <div className="absolute right-0 top-1/3 w-36 sm:w-48 h-96 opacity-25 pointer-events-none hidden lg:block">
        <Image
          src="/brand/Grafismos/linha-grafismo-3.png"
          alt=""
          fill
          className="object-contain object-right"
        />
      </div>

      {/* Halo de luz dourada de fundo */}
      <div
        className="absolute top-10 right-0 w-96 h-96 opacity-15 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse, #C7A03A 0%, transparent 70%)",
          filter: "blur(80px)",
        }}
      />
      <div
        className="absolute bottom-10 left-0 w-80 h-80 opacity-10 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse, #D9B85F 0%, transparent 70%)",
          filter: "blur(70px)",
        }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">

        {/* ---- Cabeçalho da Seção com Selo Oficial Google ---- */}
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-16 animate-fade-up">
          <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-[#122B2A] border border-[#C7A03A]/30 text-[#D9B85F] text-xs font-semibold uppercase tracking-widest shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-[#C7A03A]" />
            <span>Transparência &amp; Opinião Real</span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-bold text-[#FCF5EB] tracking-tight font-sans">
            Avaliações Reais no{" "}
            <span className="text-[#D9B85F]">Google Meu Negócio</span>
          </h2>

          {/* Grafismo 1 - Linha sutil de apoio sob o título */}
          <div className="relative w-44 sm:w-56 h-3 mx-auto pointer-events-none opacity-80">
            <Image
              src="/brand/Grafismos/linha-grafismo-1.png"
              alt=""
              fill
              className="object-contain"
            />
          </div>

          <p className="text-sm sm:text-base text-[#E5DFD1] leading-relaxed max-w-2xl mx-auto">
            A satisfação e a integridade do cabelo de cada cliente são o nosso maior patrimônio.
            Confira o que diz quem confiou a transformação dos seus fios ao Espaço Gleicy Ronha.
          </p>

          {/* Card Badge Oficial de Reputação no Google */}
          <div className="inline-flex flex-col sm:flex-row items-center gap-4 sm:gap-6 p-4 sm:p-5 rounded-2xl bg-[#122B2A]/90 border border-[#C7A03A]/30 shadow-xl backdrop-blur-md mt-2">
            <div className="flex items-center gap-3">
              {/* Ícone estilizado do Google */}
              <div className="w-10 h-10 rounded-xl bg-[#FCF5EB] flex items-center justify-center font-bold text-lg text-[#1D3D3C] shadow-sm">
                G
              </div>
              <div className="text-left">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-xl text-[#FCF5EB]">5.0</span>
                  <div className="flex">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-[#C7A03A] text-[#C7A03A]" />
                    ))}
                  </div>
                </div>
                <div className="text-[11px] text-[#D8D0BD] flex items-center gap-1">
                  <CheckCircle className="w-3 h-3 text-emerald-400" />
                  <span>Perfil Oficial Verificado · Salto - SP</span>
                </div>
              </div>
            </div>

            <div className="hidden sm:block h-8 w-px bg-[#C7A03A]/25" />

            <a
              href={googleProfileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#C7A03A] text-[#122B2A] text-xs font-bold uppercase tracking-wider hover:bg-[#D9B85F] transition-all shadow-md group"
            >
              <span>Ver todas no Google Maps</span>
              <ExternalLink className="w-3.5 h-3.5 text-[#122B2A] transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </a>
          </div>
        </div>

        {/* Layout 2-colunas: Depoimento em Destaque + Lista Lateral */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

          {/* ---- Depoimento Principal (8 cols) ---- */}
          <div className="lg:col-span-8 animate-fade-up animation-delay-200">
            <div className="relative bg-[#122B2A]/90 backdrop-blur-md rounded-3xl border border-[#C7A03A]/30 shadow-2xl p-8 sm:p-10 overflow-hidden min-h-[380px] flex flex-col justify-between">
              {/* Aspas decorativas */}
              <Quote
                className="absolute -top-2 -left-1 w-32 h-32 opacity-[0.06] pointer-events-none"
                strokeWidth={1}
                style={{ color: active.accent }}
              />

              {/* Barra colorida topo */}
              <div
                className="absolute top-0 left-8 right-8 h-1 rounded-b-full transition-colors duration-500"
                style={{ background: active.accent }}
              />

              {/* Header do Card com Tag Google e Estrelas */}
              <div className="flex items-center justify-between mb-5 mt-1">
                <div className="flex items-center gap-1.5">
                  <div className="flex">
                    {Array.from({ length: active.rating }).map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-[#C7A03A] text-[#C7A03A]" />
                    ))}
                  </div>
                  <span className="text-xs font-bold text-[#FCF5EB] ml-1">5.0</span>
                </div>

                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-[11px] font-semibold">
                  <CheckCircle className="w-3 h-3 text-emerald-400" />
                  <span>Avaliação Google Verificada</span>
                </div>
              </div>

              {/* Texto do Depoimento */}
              <blockquote className="text-lg sm:text-xl text-[#FCF5EB] leading-relaxed font-normal flex-1 mb-6 font-sans">
                "{active.text}"
              </blockquote>

              {/* Tag com detalhe técnico */}
              <div className="flex items-center gap-2 text-xs text-[#E5DFD1] mb-6 bg-[#1D3D3C] border border-[#C7A03A]/25 rounded-xl px-3.5 py-2 w-fit">
                <div className="w-2 h-2 rounded-full" style={{ background: active.accent }} />
                <span>{active.detail}</span>
              </div>

              {/* Rodapé com Autora e Controles */}
              <div className="flex items-center justify-between border-t border-[#C7A03A]/20 pt-5">
                <div className="flex items-center gap-3">
                  <div
                    className="w-11 h-11 rounded-2xl flex items-center justify-center text-[#122B2A] font-bold text-sm shadow-md"
                    style={{ background: active.accent }}
                  >
                    {active.initials}
                  </div>
                  <div>
                    <span className="font-bold text-[#FCF5EB] text-sm block">{active.name}</span>
                    <span className="text-xs text-[#D8D0BD]">
                      {active.service} · <span className="text-stone-400">{active.date}</span>
                    </span>
                  </div>
                </div>

                {/* Controles de Navegação */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={prev}
                    aria-label="Depoimento anterior"
                    className="w-9 h-9 rounded-xl bg-[#1D3D3C] border border-[#C7A03A]/30 hover:bg-[#28504D] text-[#FCF5EB] flex items-center justify-center transition-all hover:-translate-x-0.5"
                  >
                    <ChevronLeft className="w-4 h-4 text-[#FCF5EB]" />
                  </button>
                  <button
                    onClick={next}
                    aria-label="Próximo depoimento"
                    className="w-9 h-9 rounded-xl bg-[#C7A03A] border border-[#C7A03A] hover:bg-[#D9B85F] text-[#122B2A] flex items-center justify-center transition-all hover:translate-x-0.5"
                  >
                    <ChevronRight className="w-4 h-4 text-[#122B2A]" />
                  </button>
                </div>
              </div>
            </div>

            {/* Indicadores de Página */}
            <div className="flex justify-center gap-2 mt-5">
              {testimonials.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActiveIdx(i)}
                  aria-label={`Ir para depoimento ${i + 1}`}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i === activeIdx ? "w-8 bg-[#C7A03A]" : "w-1.5 bg-white/20 hover:bg-[#C7A03A]/50"
                  }`}
                />
              ))}
            </div>
          </div>

          {/* ---- Lista Lateral (4 cols) ---- */}
          <div className="lg:col-span-4 space-y-3 animate-slide-right animation-delay-300">
            <p className="text-xs font-bold uppercase tracking-widest text-[#D9B85F] px-1 mb-4 flex items-center justify-between">
              <span>Depoimentos em Destaque</span>
              <span className="text-[10px] text-stone-400 font-normal">Google Reviews</span>
            </p>

            {testimonials.map((t, idx) => (
              <button
                key={idx}
                onClick={() => setActiveIdx(idx)}
                className={`w-full text-left p-4 rounded-2xl border transition-all duration-300 group ${
                  idx === activeIdx
                    ? "bg-[#122B2A] border-[#C7A03A] shadow-lg"
                    : "bg-[#122B2A]/50 border-[#C7A03A]/20 hover:border-[#C7A03A]/50 hover:bg-[#122B2A]/80 text-[#FCF5EB]"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${
                      idx === activeIdx ? "text-[#122B2A]" : "text-white"
                    }`}
                    style={{ background: idx === activeIdx ? "#C7A03A" : t.accent }}
                  >
                    {t.initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span
                      className={`font-bold text-xs block truncate ${
                        idx === activeIdx ? "text-white" : "text-[#FCF5EB]"
                      }`}
                    >
                      {t.name}
                    </span>
                    <span
                      className={`text-[11px] truncate block ${
                        idx === activeIdx ? "text-[#D9B85F]" : "text-[#D8D0BD]"
                      }`}
                    >
                      {t.service}
                    </span>
                  </div>
                  <div className="flex shrink-0">
                    {Array.from({ length: 5 }).map((_, si) => (
                      <Star
                        key={si}
                        className={`w-2.5 h-2.5 ${
                          si < t.rating ? "fill-[#C7A03A] text-[#C7A03A]" : "text-white/20"
                        }`}
                      />
                    ))}
                  </div>
                </div>
                <p
                  className={`text-[11px] mt-2 leading-snug line-clamp-2 ${
                    idx === activeIdx ? "text-[#E5DFD1]" : "text-stone-300"
                  }`}
                >
                  {t.text}
                </p>
              </button>
            ))}

            {/* Box de Convite para Avaliar */}
            <div className="p-4 rounded-2xl bg-[#122B2A]/80 border border-[#C7A03A]/25 text-center space-y-2 mt-4">
              <span className="text-xs font-bold text-[#FCF5EB] block">
                Já é cliente do Espaço Gleicy Ronha?
              </span>
              <p className="text-[11px] text-[#E5DFD1]">
                Sua avaliação ajuda outras mulheres a encontrarem o cuidado e a segurança que procuram.
              </p>
              <a
                href={googleProfileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#D9B85F] hover:text-[#FCF5EB] transition-colors pt-1"
              >
                <span>Deixar sua avaliação no Google</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

        </div>
      </div>

      {/* Transição Inferior suave para #FCF5EB */}
      <div className="absolute bottom-0 left-0 right-0 overflow-hidden leading-none pointer-events-none">
        <svg viewBox="0 0 1440 60" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" className="w-full h-10">
          <path d="M0,30 C360,60 900,0 1440,40 L1440,60 L0,60 Z" fill="#FCF5EB" />
        </svg>
      </div>
    </section>
  );
}
