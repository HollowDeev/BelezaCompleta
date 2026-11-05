"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Sparkle,
  CaretLeft,
  CaretRight,
  ArrowRight,
  ShieldCheck,
  Clock,
  Check,
} from "@phosphor-icons/react";

export interface TransformationItem {
  id: number;
  image: string;
  title: string;
  subtitle: string;
  tag: string;
  description: string;
  benefits: string[];
  specs: {
    duration: string;
    maintenance: string;
    technique: string;
  };
}

const TRANSFORMATIONS: TransformationItem[] = [
  {
    id: 1,
    image: "/brand/Carrossel_Fotos/1.webp",
    title: "Morena Iluminada Avelã",
    subtitle: "Camadas Longas & Ponto de Luz",
    tag: "Morena Iluminada",
    description:
      "Transição sutil e aveludada do castanho natural para nuances de avelã e toffee. O corte em camadas longas potencializa o movimento e distribui a iluminação com total leveza.",
    benefits: [
      "Zero marcação de raiz com transição suave",
      "Preservação absoluta da elasticidade do fio",
      "Harmonização refinada com o subtom de pele",
    ],
    specs: {
      duration: "~3h30",
      maintenance: "5 a 6 meses",
      technique: "Esfumado + Camadas Longas",
    },
  },
  {
    id: 2,
    image: "/brand/Carrossel_Fotos/2.webp",
    title: "Loiro Mel Dourado",
    subtitle: "Ondas Nobres & Iluminação Solar",
    tag: "Loiro Nobre",
    description:
      "Clareamento quente e luminoso com reflexos de mel e âmbar. Finalizado em ondas desestruturadas que revelam a riqueza de contrastes sem agredir a barreira lipídica dos fios.",
    benefits: [
      "Reflexo dourado quente e sofisticado",
      "Fios encorpados com toque acetinado",
      "Descoloração protegida com protocolo plex",
    ],
    specs: {
      duration: "~4h00",
      maintenance: "4 a 5 meses",
      technique: "Micro-mechas & Contorno",
    },
  },
  {
    id: 3,
    image: "/brand/Carrossel_Fotos/3.webp",
    title: "Cachos Definidos & Iluminados",
    subtitle: "Curvatura Natural no Salão Gleicy Ronha",
    tag: "Especialista em Cachos",
    description:
      "Técnica autoral de mechas pontuais sem tração para cabelos com curvatura. Preserva a forma em espiral do cacho, adicionando profundidade e brilho dimensional com alta nutrição.",
    benefits: [
      "Zero perda de definição da curvatura",
      "Nutrição profunda integrada ao procedimento",
      "Volume e definição em perfeita harmonia",
    ],
    specs: {
      duration: "~3h45",
      maintenance: "6 meses",
      technique: "Ponto de Luz em Cachos",
    },
  },
  {
    id: 4,
    image: "/brand/Carrossel_Fotos/4.webp",
    title: "Morena Iluminada em Ondas",
    subtitle: "Visão 360° em Ondas de Costas",
    tag: "Degradê Sunset",
    description:
      "Distribuição perfeita de luz vista em todos os ângulos. As ondas fluidas destacam a profundidade da raiz esfumada até a luminosidade suave nas extremidades.",
    benefits: [
      "Raiz 100% natural sem necessidade de retoque rápido",
      "Movimento ultra fluido nas ondas",
      "Brilho espelhado sob qualquer iluminação",
    ],
    specs: {
      duration: "~3h30",
      maintenance: "5 a 6 meses",
      technique: "Balayage Orgânica",
    },
  },
  {
    id: 5,
    image: "/brand/Carrossel_Fotos/5.webp",
    title: "Loiro Pérola Iluminado",
    subtitle: "Camadas Estruturadas & Fundo Limpo",
    tag: "Loiro Pérola",
    description:
      "Descoloração guiada com reconstrução imediata de pontes de sulfeto e matização personalizada em pérola e champanhe frio. Mantém o fio resistente, encorpado e sedoso.",
    benefits: [
      "Fundo ultra limpo e perolado sem amarelar",
      "Reconstrução celular concomitante ao clareamento",
      "Densidade e pontas com peso preservado",
    ],
    specs: {
      duration: "~4h30",
      maintenance: "3 a 4 meses",
      technique: "High-Lift Reestruturante",
    },
  },
  {
    id: 6,
    image: "/brand/Carrossel_Fotos/6.webp",
    title: "Mechas Frontais Criativas",
    subtitle: "Moldura Facial & Face Framing",
    tag: "Design de Rosto",
    description:
      "Pontos de luminosidade direcionados para o contorno do rosto, harmonizando os traços e trazendo frescor imediato à fisionomia. Camadas dinâmicas que garantem versatilidade de penteados.",
    benefits: [
      "Valorização imediata do olhar e expressão facial",
      "Transição luminosa e elegante sem marcações",
      "Versatilidade para penteados soltos ou presos",
    ],
    specs: {
      duration: "~3h15",
      maintenance: "4 a 5 meses",
      technique: "Contour & Freehand Frontal",
    },
  },
];

interface Transformations3DCarouselProps {
  onBookResult?: (transformationTitle: string) => void;
}

export function Transformations3DCarousel({
  onBookResult,
}: Transformations3DCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const touchStartXRef = useRef<number | null>(null);

  const total = TRANSFORMATIONS.length;

  const nextSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % total);
  }, [total]);

  const prevSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + total) % total);
  }, [total]);

  const goToIndex = useCallback((index: number) => {
    setCurrentIndex(index);
  }, []);

  // Temporizador automático suave de 3 segundos com pause on hover
  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(() => {
      nextSlide();
    }, 3000);
    return () => clearInterval(timer);
  }, [isPaused, nextSlide]);

  // Gestos de toque para dispositivos móveis
  const handleTouchStart = (e: React.TouchEvent) => {
    setIsPaused(true);
    touchStartXRef.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    setIsPaused(false);
    if (touchStartXRef.current === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchEndX - touchStartXRef.current;
    if (Math.abs(diff) > 40) {
      if (diff < 0) {
        nextSlide();
      } else {
        prevSlide();
      }
    }
    touchStartXRef.current = null;
  };

  // Cálculo da posição no leque 3D (Coverflow)
  const getCardStyle = (index: number) => {
    let offset = index - currentIndex;
    while (offset > total / 2) offset -= total;
    while (offset <= -total / 2) offset += total;

    if (offset === 0) {
      return {
        transform: "translate3d(0, 0, 0) scale(1) rotateY(0deg)",
        zIndex: 30,
        opacity: 1,
        filter: "brightness(1) contrast(1)",
        pointerEvents: "auto" as const,
        boxShadow:
          "0 25px 45px -12px rgba(18, 43, 42, 0.4), 0 0 0 2px rgba(199, 160, 58, 0.6)",
      };
    }

    if (offset === -1) {
      return {
        transform: "translate3d(-54%, 0, -60px) scale(0.85) rotateY(18deg)",
        zIndex: 20,
        opacity: 0.6,
        filter: "brightness(0.9) contrast(0.95)",
        pointerEvents: "auto" as const,
        boxShadow: "0 15px 30px -10px rgba(18, 43, 42, 0.25)",
      };
    }

    if (offset === 1) {
      return {
        transform: "translate3d(54%, 0, -60px) scale(0.85) rotateY(-18deg)",
        zIndex: 20,
        opacity: 0.6,
        filter: "brightness(0.9) contrast(0.95)",
        pointerEvents: "auto" as const,
        boxShadow: "0 15px 30px -10px rgba(18, 43, 42, 0.25)",
      };
    }

    if (offset === -2) {
      return {
        transform: "translate3d(-96%, 0, -120px) scale(0.7) rotateY(28deg)",
        zIndex: 10,
        opacity: 0,
        filter: "brightness(0.8)",
        pointerEvents: "none" as const,
        boxShadow: "none",
      };
    }

    if (offset === 2) {
      return {
        transform: "translate3d(96%, 0, -120px) scale(0.7) rotateY(-28deg)",
        zIndex: 10,
        opacity: 0,
        filter: "brightness(0.8)",
        pointerEvents: "none" as const,
        boxShadow: "none",
      };
    }

    return {
      transform: "translate3d(0, 0, -150px) scale(0.6)",
      zIndex: 0,
      opacity: 0,
      pointerEvents: "none" as const,
      boxShadow: "none",
    };
  };

  const handleCardClick = (index: number) => {
    let offset = index - currentIndex;
    while (offset > total / 2) offset -= total;
    while (offset <= -total / 2) offset += total;

    if (offset === -1) {
      prevSlide();
    } else if (offset === 1) {
      nextSlide();
    } else if (offset !== 0) {
      goToIndex(index);
    }
  };

  const activeItem = TRANSFORMATIONS[currentIndex];

  const handleBookCurrent = () => {
    if (onBookResult) {
      onBookResult(activeItem.title);
    } else {
      const el = document.getElementById("servicos");
      if (el) el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <section
      id="transformacoes"
      className="relative overflow-hidden py-16 sm:py-20 lg:py-24 bg-[#EFECE1] border-b border-[#D8D0BD]"
    >
      {/* Grafismo Oficial 3 (Linha Orgânica Lateral) para preenchimento no canto */}
      <div
        className="absolute -top-10 -left-12 w-64 h-96 opacity-20 pointer-events-none select-none"
        style={{
          backgroundImage: "url('/brand/Grafismos/linha-grafismo-3.png')",
          backgroundRepeat: "no-repeat",
          backgroundSize: "contain",
        }}
      />
      <div
        className="absolute -bottom-12 -right-10 w-64 h-96 opacity-15 pointer-events-none select-none rotate-180"
        style={{
          backgroundImage: "url('/brand/Grafismos/linha-grafismo-3.png')",
          backgroundRepeat: "no-repeat",
          backgroundSize: "contain",
        }}
      />

      {/* Brilho radial de luz dourada suave ao fundo */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[720px] h-[520px] pointer-events-none opacity-35"

        style={{
          background:
            "radial-gradient(ellipse at center, rgba(199, 160, 58, 0.22) 0%, transparent 70%)",
          filter: "blur(60px)",
        }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-8 items-center">
          {/* ========================================================
              1. LADO ESQUERDO: Texto Editorial & Filosofia Técnica
              ======================================================== */}
          <div className="lg:col-span-4 space-y-6 text-left">
            {/* Tag com ícone Phosphor Sparkle */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/90 border border-[#C7A03A]/40 text-[#80611F] text-[11px] font-bold uppercase tracking-widest shadow-2xs">
              <Sparkle weight="fill" className="w-3.5 h-3.5 text-[#C7A03A]" />
              <span>TRANSFORMAÇÕES REAIS</span>
            </div>

            {/* Título editorial */}
            <div className="space-y-2">
              <h2 className="font-editorial text-3xl sm:text-4xl lg:text-[42px] font-bold text-[#1D3D3C] leading-[1.15] tracking-tight">
                A assinatura Gleicy Ronha
                <span className="font-gwendolyn text-4xl sm:text-5xl lg:text-6xl text-[#80611F] font-normal block mt-1">
                  em cada mecha.
                </span>
              </h2>
            </div>

            {/* Parágrafo explicativo da preservação da fibra e cor personalizada */}
            <p className="text-sm sm:text-base text-[#736455] leading-relaxed">
              Cada transformação é concebida como uma obra sob medida. Unimos visagismo refinado à
              máxima preservação da fibra capilar com ativos reconstrutores e plex de alta performance,
              esculpindo tonalidades tridimensionais, luminosas e saudáveis que respeitam a
              identidade única de cada mulher.
            </p>

            {/* Pilares de segurança técnica */}
            <div className="pt-2 space-y-3">
              <div className="flex items-start gap-3 p-3 rounded-2xl bg-white/70 border border-[#D8D0BD]/70 backdrop-blur-2xs shadow-2xs">
                <div className="w-8 h-8 rounded-xl bg-[#1D3D3C] text-[#C7A03A] flex items-center justify-center shrink-0">
                  <ShieldCheck weight="fill" className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#1D3D3C] uppercase tracking-wider">
                    Preservação da Fibra Capilar
                  </h4>
                  <p className="text-xs text-[#736455] leading-snug mt-0.5">
                    Clareamento com proteção contínua de pontes de sulfeto e reposição lipídica imediata.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-2xl bg-white/70 border border-[#D8D0BD]/70 backdrop-blur-2xs shadow-2xs">
                <div className="w-8 h-8 rounded-xl bg-[#80611F] text-[#F0EFE3] flex items-center justify-center shrink-0">
                  <Sparkle weight="bold" className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#1D3D3C] uppercase tracking-wider">
                    Cor &amp; Visagismo Personalizados
                  </h4>
                  <p className="text-xs text-[#736455] leading-snug mt-0.5">
                    Diagnóstico cromático para harmonização absoluta com seu tom de pele e rotina.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* ========================================================
              2. PALCO CENTRAL: Composição em Leque 3D (Coverflow)
              ======================================================== */}
          <div
            className="lg:col-span-4 xl:col-span-5 flex flex-col items-center justify-center py-2"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            {/* Palco 3D com perspectiva */}
            <div
              className="relative w-full max-w-[460px] h-[380px] sm:h-[430px] md:h-[470px] flex items-center justify-center select-none"
              style={{
                perspective: "1200px",
                transformStyle: "preserve-3d",
              }}
            >
              {TRANSFORMATIONS.map((item, idx) => {
                const cardStyle = getCardStyle(idx);
                let offset = idx - currentIndex;
                while (offset > total / 2) offset -= total;
                while (offset <= -total / 2) offset += total;
                const isCenter = offset === 0;

                return (
                  <div
                    key={item.id}
                    onClick={() => handleCardClick(idx)}
                    style={{
                      transform: cardStyle.transform,
                      zIndex: cardStyle.zIndex,
                      opacity: cardStyle.opacity,
                      filter: cardStyle.filter,
                      boxShadow: cardStyle.boxShadow,
                      pointerEvents: cardStyle.pointerEvents,
                    }}
                    className={`absolute w-[220px] sm:w-[250px] md:w-[275px] h-[320px] sm:h-[370px] md:h-[415px] rounded-2xl sm:rounded-3xl overflow-hidden cursor-pointer transition-all duration-700 ease-out will-change-transform bg-[#FCF5EB] border ${
                      isCenter ? "border-[#C7A03A]" : "border-[#D8D0BD]"
                    }`}
                  >
                    {/* Imagem em alta definição */}
                    <img
                      src={item.image}
                      alt={item.title}
                      loading={idx < 3 ? "eager" : "lazy"}
                      className="w-full h-full object-cover object-center select-none pointer-events-none"
                    />

                    {/* Gradiente escuro no rodapé para legibilidade */}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#122B2A]/90 via-[#122B2A]/20 to-transparent pointer-events-none" />

                    {/* Tag no topo do card frontal */}
                    {isCenter && (
                      <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
                        <span className="px-2.5 py-1 rounded-full bg-[#122B2A]/80 backdrop-blur-xs text-[#C7A03A] text-[10px] font-bold tracking-wider uppercase border border-[#C7A03A]/40 flex items-center gap-1">
                          <Sparkle weight="fill" className="w-2.5 h-2.5" />
                          <span>{item.tag}</span>
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-xs text-white text-[10px] font-mono font-bold">
                          0{item.id} / 0{total}
                        </span>
                      </div>
                    )}

                    {/* Legenda de rodapé no card */}
                    <div className="absolute bottom-3 left-3.5 right-3.5 text-white pointer-events-none">
                      <span className="text-[10px] font-semibold text-[#C7A03A] uppercase tracking-wider block">
                        Gleicy Ronha
                      </span>
                      <h3 className="font-editorial text-sm sm:text-base font-bold leading-tight drop-shadow-sm truncate">
                        {item.title}
                      </h3>
                    </div>

                    {/* Overlay sutil para fotos laterais */}
                    {!isCenter && (
                      <div className="absolute inset-0 bg-[#F0EFE3]/20 backdrop-blur-[0.5px] transition-opacity duration-500 hover:opacity-0" />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Controles discretos: Botões Manuais & Dots de Paginação */}
            <div className="w-full max-w-[380px] flex items-center justify-between mt-3 px-4">
              {/* Botão Anterior */}
              <button
                type="button"
                onClick={prevSlide}
                aria-label="Transformação anterior"
                className="w-10 h-10 rounded-full bg-white/90 hover:bg-[#1D3D3C] text-[#1D3D3C] hover:text-[#C7A03A] border border-[#C7A03A]/40 shadow-sm flex items-center justify-center transition-all duration-300 active:scale-95 cursor-pointer"
              >
                <CaretLeft weight="bold" className="w-5 h-5" />
              </button>

              {/* Indicadores de Paginação */}
              <div className="flex items-center gap-1.5">
                {TRANSFORMATIONS.map((_, dotIdx) => (
                  <button
                    key={dotIdx}
                    type="button"
                    onClick={() => goToIndex(dotIdx)}
                    aria-label={`Visualizar transformação ${dotIdx + 1}`}
                    className={`h-2 rounded-full transition-all duration-500 cursor-pointer ${
                      dotIdx === currentIndex
                        ? "w-7 bg-[#80611F]"
                        : "w-2 bg-[#D8D0BD] hover:bg-[#C7A03A]"
                    }`}
                  />
                ))}
              </div>

              {/* Botão Próximo */}
              <button
                type="button"
                onClick={nextSlide}
                aria-label="Próxima transformação"
                className="w-10 h-10 rounded-full bg-white/90 hover:bg-[#1D3D3C] text-[#1D3D3C] hover:text-[#C7A03A] border border-[#C7A03A]/40 shadow-sm flex items-center justify-center transition-all duration-300 active:scale-95 cursor-pointer"
              >
                <CaretRight weight="bold" className="w-5 h-5" />
              </button>
            </div>

            {/* Indicador sutil de rotação contínua */}
            <div className="mt-2 text-center">
              <span className="text-[10px] font-medium text-[#736455]/70 tracking-wide inline-flex items-center gap-1.5">
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isPaused ? "bg-amber-600" : "bg-emerald-600 animate-pulse"
                  }`}
                />
                {isPaused ? "Rotação pausada (mouse sobre o carrossel)" : "Gira suave a cada 3s"}
              </span>
            </div>
          </div>

          {/* ========================================================
              3. LADO DIREITO: Card Dinâmico que Atualiza com a Foto Ativa
              ======================================================== */}
          <div className="lg:col-span-4 xl:col-span-3">
            <div
              key={activeItem.id}
              className="bg-white/90 backdrop-blur-md rounded-3xl p-6 sm:p-7 border border-[#D8D0BD] shadow-xl space-y-5 transition-all duration-500 animate-fade-in"
            >
              {/* Cabeçalho do Card Dinâmico */}
              <div className="space-y-1.5 border-b border-[#D8D0BD]/60 pb-4">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F0EFE3] border border-[#C7A03A]/40 text-[#80611F] text-[10px] font-bold uppercase tracking-wider">
                    <Sparkle weight="fill" className="w-3 h-3 text-[#C7A03A]" />
                    <span>{activeItem.tag}</span>
                  </span>
                  <span className="text-[11px] font-mono font-bold text-[#736455]">
                    0{activeItem.id} / 0{total}
                  </span>
                </div>

                <h3 className="font-editorial text-2xl font-bold text-[#1D3D3C] leading-snug pt-1">
                  {activeItem.title}
                </h3>
                <p className="text-xs font-semibold text-[#80611F]">
                  {activeItem.subtitle}
                </p>
              </div>

              {/* Descrição detalhada da técnica */}
              <p className="text-xs sm:text-sm text-[#736455] leading-relaxed">
                {activeItem.description}
              </p>

              {/* Ficha Técnica Rápida */}
              <div className="grid grid-cols-3 gap-2 p-3 rounded-2xl bg-[#FCF5EB] border border-[#D8D0BD]/70 text-center">
                <div className="space-y-0.5">
                  <span className="text-[10px] uppercase font-bold text-[#80611F] block">
                    Duração
                  </span>
                  <span className="text-xs font-bold text-[#1D3D3C] flex items-center justify-center gap-1">
                    <Clock className="w-3 h-3 text-[#C7A03A]" />
                    {activeItem.specs.duration}
                  </span>
                </div>
                <div className="space-y-0.5 border-x border-[#D8D0BD]/60">
                  <span className="text-[10px] uppercase font-bold text-[#80611F] block">
                    Retoque
                  </span>
                  <span className="text-xs font-bold text-[#1D3D3C]">
                    {activeItem.specs.maintenance}
                  </span>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[10px] uppercase font-bold text-[#80611F] block">
                    Técnica
                  </span>
                  <span className="text-[11px] font-bold text-[#1D3D3C] truncate block px-1">
                    {activeItem.specs.technique}
                  </span>
                </div>
              </div>

              {/* Lista de Benefícios Reais */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#1D3D3C] block">
                  Destaques deste Resultado:
                </span>
                <ul className="space-y-1.5">
                  {activeItem.benefits.map((benefit, bIdx) => (
                    <li
                      key={bIdx}
                      className="flex items-start gap-2 text-xs text-[#736455] leading-snug"
                    >
                      <div className="w-4 h-4 rounded-full bg-[#1D3D3C] text-[#C7A03A] flex items-center justify-center shrink-0 mt-0.5">
                        <Check weight="bold" className="w-2.5 h-2.5" />
                      </div>
                      <span>{benefit}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Botão de Ação: Agendar este Resultado */}
              <button
                type="button"
                onClick={handleBookCurrent}
                className="w-full py-3.5 px-6 rounded-2xl bg-[#1D3D3C] text-[#FCF5EB] hover:bg-[#28504D] text-xs sm:text-sm font-bold uppercase tracking-wider shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 group cursor-pointer"
              >
                <span>Agendar este Resultado</span>
                <ArrowRight
                  weight="bold"
                  className="w-4 h-4 text-[#C7A03A] group-hover:translate-x-1 transition-transform"
                />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
