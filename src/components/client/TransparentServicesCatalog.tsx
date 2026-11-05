"use client";

import { useState } from "react";
import Image from "next/image";
import { ServiceItem } from "@/types/service";
import { formatBRL } from "@/lib/utils";
import {
  Sparkles,
  Clock,
  Calendar,
  MessageCircle,
  ChevronDown,
  ChevronUp,
  Check,
} from "lucide-react";

interface TransparentServicesCatalogProps {
  services: ServiceItem[];
  onSelectService: (service: ServiceItem) => void;
  whatsappNumber?: string;
}

export function TransparentServicesCatalog({
  services,
  onSelectService,
  whatsappNumber = "5511999999999",
}: TransparentServicesCatalogProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [expandedDetailsId, setExpandedDetailsId] = useState<string | null>(null);

  const categories = [
    { id: "all", label: "Todos os Procedimentos" },
    { id: "transformacao", label: "Mechas & Iluminados" },
    { id: "corte", label: "Cortes Estruturados" },
    { id: "tratamento", label: "Tratamentos & Saúde" },
    { id: "outros", label: "Outras Especialidades" },
  ];

  const filtered = services.filter((s) => {
    if (selectedCategory === "all") return true;
    if (selectedCategory === "transformacao")
      return s.category === "transformacao" || s.category === "mechas";
    return s.category === selectedCategory;
  });

  const getIncludedItems = (service: ServiceItem): string[] => {
    if (service.steps && service.steps.length > 0) {
      return service.steps.map((st) => `${st.title} (${st.durationMin}min)`);
    }
    if (service.category === "transformacao" || service.category === "mechas") {
      return [
        "Diagnóstico capilar aprofundado e teste de mecha prévio",
        "Lavatório relaxante com higienização suave dos fios",
        "Aplicação técnica personalizada com descolorante de baixa agressão",
        "Matização personalizada para neutralização ou realce do tom",
        "Tratamento reconstrutor intensivo pós-química",
        "Finalização modelada e consultoria de cuidados home care",
      ];
    }
    if (service.category === "corte") {
      return [
        "Consultoria de visagismo e avaliação da curvatura natural",
        "Lavatório aconchegante com massagem capilar",
        "Corte autoral estruturado respeitando o caimento dos fios",
        "Finalização com secador, difusor ou modelagem",
        "Dicas personalizadas de estilização e manutenção",
      ];
    }
    if (service.category === "tratamento") {
      return [
        "Análise da porosidade e elasticidade da fibra capilar",
        "Higienização com xampu de limpeza inteligente",
        "Aplicação de máscara reconstrutora e ampolas de alta tecnologia",
        "Tempo de pausa com massagem relaxante no couro cabeludo",
        "Secagem e selagem das cutículas para brilho duradouro",
      ];
    }
    return [
      "Avaliação inicial personalizada",
      "Procedimento realizado com produtos profissionais de excelência",
      "Finalização cuidadosa e orientações de bem-estar",
    ];
  };

  const toggleExpand = (id: string) => {
    setExpandedDetailsId(expandedDetailsId === id ? null : id);
  };

  const getCategoryLabel = (cat: string): string => {
    if (cat === "transformacao" || cat === "mechas") return "Mechas & Iluminado";
    if (cat === "corte") return "Corte Estruturado";
    if (cat === "tratamento") return "Saúde Capilar";
    return "Procedimento";
  };

  return (
    <section
      id="servicos"
      className="relative overflow-hidden py-24 sm:py-32 bg-[#F5EFE6] border-b border-[#D8D0BD]"
    >
      {/* Grafismo lateral de preenchimento elegante */}
      <div className="absolute right-0 top-1/4 w-36 sm:w-48 h-96 opacity-20 pointer-events-none hidden lg:block">
        <Image
          src="/brand/Grafismos/linha-grafismo-3.png"
          alt=""
          fill
          className="object-contain object-right"
        />
      </div>

      {/* Halo dourado sutil */}
      <div
        className="absolute top-10 left-0 w-80 h-80 opacity-15 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse, #C7A03A 0%, transparent 70%)",
          filter: "blur(70px)",
        }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Cabeçalho */}
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-14 animate-fade-up">
          <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-[#EFECE1] border border-[#D8D0BD] text-[#80611F] text-xs font-semibold uppercase tracking-widest shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-[#C7A03A]" />
            <span>Transparência Total · Sem Surpresas</span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-bold text-[#1D3D3C] tracking-tight font-sans">
            Nossos Serviços, Valores
            <br />
            <span className="text-[#80611F]">e o que está incluso</span>
          </h2>

          {/* Grafismo 1 - Linha sutil de apoio sob o título */}
          <div className="relative w-44 sm:w-56 h-3 mx-auto pointer-events-none opacity-75">
            <Image
              src="/brand/Grafismos/linha-grafismo-1.png"
              alt=""
              fill
              className="object-contain"
            />
          </div>

          <p className="text-sm sm:text-base text-[#736455] leading-relaxed max-w-2xl mx-auto">
            Acreditamos que a confiança começa na clareza. Você sabe exatamente o valor de cada
            procedimento, o tempo necessário e todas as etapas técnicas preparadas para a saúde do seu cabelo.
          </p>

          {/* Abas de Categorias */}
          <div className="flex items-center sm:justify-center gap-2 pt-2 overflow-x-auto no-scrollbar pb-2 sm:pb-0 px-4 sm:px-0 -mx-4 sm:mx-0 flex-nowrap sm:flex-wrap">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-4 sm:px-5 py-2 sm:py-2.5 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 transition-all duration-300 ${
                  selectedCategory === cat.id
                    ? "bg-[#1D3D3C] text-[#FCF5EB] shadow-md border border-[#C7A03A]/40 scale-105"
                    : "bg-white text-[#736455] border border-[#D8D0BD] hover:bg-[#F0EFE3] hover:text-[#1D3D3C] hover:border-[#C7A03A]/30"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Grid de Serviços */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filtered.map((service, serviceIdx) => {
            const totalDuration =
              service.steps && service.steps.length > 0
                ? service.steps.reduce((acc, s) => acc + s.durationMin, 0)
                : 60;
            const hours = Math.floor(totalDuration / 60);
            const minutes = totalDuration % 60;
            const durationLabel =
              hours > 0
                ? `${hours}h${minutes > 0 ? ` ${minutes}min` : ""}`
                : `${minutes} min`;

            const includedItems = getIncludedItems(service);
            const isExpanded = expandedDetailsId === service.id;

            return (
              <div
                key={service.id}
                className={`relative bg-white rounded-3xl border border-[#D8D0BD] overflow-hidden shadow-sm hover:shadow-[0_8px_40px_rgba(199,160,58,0.12)] transition-all duration-400 flex flex-col group hover:-translate-y-1.5 animate-fade-up animation-delay-${(serviceIdx % 3) * 150 + 200}`}
              >
                {/* Linha de acento topo — aparece no hover */}
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#C7A03A] to-[#80611F] opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20" />

                {/* Imagem de Capa */}
                <div className="relative h-56 w-full overflow-hidden bg-[#EEE8DD]">
                  <img
                    src={service.imageUrl || "/brand/Carrossel_Fotos/1.webp"}
                    alt={service.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#1D3D3C]/80 via-[#1D3D3C]/10 to-transparent" />

                  {/* Badge de Categoria */}
                  <div className="absolute top-3 left-3 bg-[#1D3D3C]/90 backdrop-blur-md text-[#C7A03A] border border-[#C7A03A]/40 text-[10px] uppercase font-bold tracking-wider px-3 py-1 rounded-full shadow-md">
                    {getCategoryLabel(service.category)}
                  </div>

                  {/* Duração */}
                  <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-md text-[#1D3D3C] border border-[#D8D0BD] text-[11px] font-bold px-3 py-1 rounded-full flex items-center space-x-1 shadow-sm">
                    <Clock className="w-3.5 h-3.5 text-[#C7A03A]" />
                    <span>{durationLabel}</span>
                  </div>

                  {/* Preço no rodapé da foto */}
                  <div className="absolute bottom-3 left-4 right-4 flex items-baseline justify-between text-white">
                    <div>
                      <span className="text-[10px] uppercase font-semibold text-stone-200 block">
                        Investimento
                      </span>
                      <div className="flex items-baseline space-x-2">
                        <span className="text-2xl font-bold font-editorial text-white">
                          {formatBRL(service.price)}
                        </span>
                        {service.promotionalPrice && (
                          <span className="text-xs text-stone-300 line-through">
                            {formatBRL(service.promotionalPrice)}
                          </span>
                        )}
                      </div>
                    </div>

                    {service.requiresTriage && (
                      <span className="text-[10px] bg-[#C7A03A] text-[#1D3D3C] font-extrabold px-2 py-0.5 rounded-md uppercase tracking-wider">
                        Com Avaliação
                      </span>
                    )}
                  </div>
                </div>

                {/* Conteúdo Principal */}
                <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <h3 className="font-editorial text-xl font-bold text-[#1D3D3C] leading-snug">
                      {service.title}
                    </h3>
                    <p className="text-xs text-[#736455] leading-relaxed line-clamp-2">
                      {service.description}
                    </p>
                  </div>

                  {/* O que está incluso */}
                  <div className="pt-3 border-t border-[#D8D0BD]/60 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-[#80611F]">
                        O que está incluso:
                      </span>
                      <button
                        onClick={() => toggleExpand(service.id)}
                        className="text-[11px] text-[#736455] hover:text-[#1D3D3C] flex items-center space-x-0.5 font-medium transition-colors"
                      >
                        <span>
                          {isExpanded
                            ? "Ver menos"
                            : `Ver todas as ${includedItems.length} etapas`}
                        </span>
                        {isExpanded ? (
                          <ChevronUp className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>

                    <ul className={`space-y-1.5 text-xs text-[#1D3D3C] overflow-hidden transition-all duration-500 ${isExpanded ? "max-h-96" : "max-h-24"}`}>
                      {includedItems.map((item, idx) => (
                        <li key={idx} className="flex items-start space-x-2">
                          <div className="w-4 h-4 rounded-full bg-[#F0EFE3] flex items-center justify-center shrink-0 mt-0.5">
                            <Check className="w-2.5 h-2.5 text-[#707956] stroke-[3]" />
                          </div>
                          <span className="leading-tight text-stone-700">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Ações */}
                  <div className="pt-4 border-t border-[#D8D0BD]/60 space-y-2">
                    <button
                      onClick={() => onSelectService(service)}
                      className="relative overflow-hidden w-full py-3 px-4 rounded-xl bg-[#1D3D3C] text-[#FCF5EB] text-xs font-bold uppercase tracking-wider hover:bg-[#28504D] transition-all shadow-sm hover:shadow-md flex items-center justify-center space-x-2 border border-[#C7A03A]/40 group/btn"
                    >
                      <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-700" />
                      <Calendar className="w-4 h-4 text-[#C7A03A] relative z-10" />
                      <span className="relative z-10">Agendar este Procedimento</span>
                    </button>

                    <a
                      href={`https://wa.me/${whatsappNumber}?text=Olá%20Gleicy!%20Tenho%20dúvidas%20sobre%20*${encodeURIComponent(service.title)}*%20(${formatBRL(service.price)}).`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-2.5 px-3 rounded-xl bg-white border border-[#D8D0BD] text-[#736455] hover:text-[#1D3D3C] hover:bg-[#F0EFE3] text-xs font-semibold transition-all flex items-center justify-center space-x-2"
                    >
                      <MessageCircle className="w-3.5 h-3.5 text-[#25D366]" />
                      <span>Tirar Dúvida no WhatsApp</span>
                    </a>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Estado vazio — sem serviços nesta categoria */}
        {filtered.length === 0 && (
          <div className="text-center py-20 text-[#736455] space-y-3">
            <div className="text-4xl">✂️</div>
            <p className="font-editorial text-lg font-bold text-[#1D3D3C]">
              Nenhum procedimento nesta categoria ainda.
            </p>
            <p className="text-sm">
              Entre em contato para consultar disponibilidade ou serviços personalizados.
            </p>
          </div>
        )}

        {/* Banner Informativo */}
        <div className="mt-16 p-5 sm:p-10 rounded-2xl sm:rounded-3xl bg-[#1D3D3C] text-[#FCF5EB] border border-[#C7A03A]/20 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden shadow-xl">
          <div
            className="absolute top-0 right-0 w-64 h-64 opacity-10 pointer-events-none"
            style={{
              background: "radial-gradient(circle, #C7A03A, transparent)",
              filter: "blur(40px)",
            }}
          />
          <div className="space-y-1 text-center md:text-left relative z-10">
            <span className="font-gwendolyn text-2xl text-[#C7A03A] block">
              Precisa de algo personalizado?
            </span>
            <h4 className="font-editorial text-lg sm:text-xl font-bold">
              Diagnóstico capilar com cronograma sob medida.
            </h4>
            <p className="text-xs sm:text-sm text-stone-300 max-w-lg leading-relaxed">
              Caso você tenha histórico de químicas anteriores ou deseje uma proposta consultiva
              detalhada, nossa equipe prepara um diagnóstico completo para o seu cabelo.
            </p>
          </div>

          <a
            href={`https://wa.me/${whatsappNumber}?text=Olá%20Gleicy!%20Gostaria%20de%20uma%20avaliação%20personalizada%20para%20o%20meu%20cabelo.`}
            target="_blank"
            rel="noopener noreferrer"
            className="relative overflow-hidden w-full sm:w-auto px-6 sm:px-7 py-3.5 rounded-2xl bg-[#C7A03A] text-[#122B2A] text-xs font-bold uppercase tracking-wider hover:bg-[#d9b85f] transition-all shadow-lg shrink-0 flex items-center justify-center space-x-2 group text-center"
          >
            <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
            <MessageCircle className="w-4 h-4 relative z-10 shrink-0" />
            <span className="relative z-10">Solicitar Avaliação Personalizada</span>
          </a>
        </div>
      </div>
    </section>
  );
}
