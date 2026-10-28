"use client";

import { useState } from "react";
import { ServiceItem } from "@/types/service";
import { formatBRL } from "@/lib/utils";
import {
  Sparkles,
  Clock,
  ShieldAlert,
  ArrowRight,
  CheckCircle,
  HelpCircle,
  Scissors,
} from "lucide-react";

interface ServiceCatalogProps {
  services: ServiceItem[];
  onSelectService: (service: ServiceItem) => void;
}

export function ServiceCatalog({ services, onSelectService }: ServiceCatalogProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const categories = [
    { id: "all", label: "Todos os Procedimentos" },
    { id: "transformacao", label: "Transformações & Mechas" },
    { id: "corte", label: "Cortes Estruturados" },
    { id: "tratamento", label: "Saúde & Estabilização" },
  ];

  const filtered = services.filter((s) =>
    selectedCategory === "all" ? true : s.category === selectedCategory
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Banner de Apresentação de Alto Padrão */}
      <div className="text-center max-w-3xl mx-auto mb-12">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] uppercase tracking-widest font-semibold bg-amber-100/70 text-[#AD841D] border border-amber-200 mb-3">
          <Sparkles className="w-3.5 h-3.5" />
          Espaço da Beleza Gleicy Ronha
        </span>
        <h1 className="font-editorial text-3xl sm:text-5xl font-bold text-[#2D1914] tracking-tight mb-4">
          Cachos, Ondas e Iluminados com Saúde Extrema
        </h1>
        <p className="text-xs sm:text-base text-[#683C30] leading-relaxed">
          Procedimentos personalizados que respeitam a curvatura natural e a integridade da fibra capilar. Procedimentos de transformação passam por triagem técnica prévia para segurança máxima.
        </p>

        {/* Filtro de Categorias */}
        <div className="flex flex-wrap items-center justify-center gap-2 mt-8">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-4 py-2 rounded-full text-xs font-semibold transition-all ${
                selectedCategory === cat.id
                  ? "bg-[#44271F] text-white shadow-xs"
                  : "bg-white text-[#5E372C] border border-[#E7DCCE] hover:bg-[#FAF7F2]"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid de Serviços */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
        {filtered.map((service) => {
          const totalDuration = service.steps.reduce((sum, s) => sum + s.durationMin, 0);
          const hasPauseStep = service.steps.some((s) => s.type === "pause");

          return (
            <div
              key={service.id}
              className="bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-[#E7DCCE]/80 flex flex-col group"
            >
              {/* Imagem de Capa do Serviço */}
              <div className="relative h-56 w-full overflow-hidden bg-stone-100">
                <img
                  src={service.imageUrl}
                  alt={service.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                {/* Badge de Triagem Obrigatória */}
                {service.requiresTriage ? (
                  <div className="absolute top-3 right-3 bg-[#44271F]/90 backdrop-blur-md text-[#DBAE3B] border border-[#C59B27]/40 text-[10px] uppercase font-bold tracking-wider px-3 py-1 rounded-full flex items-center space-x-1 shadow-md">
                    <Sparkles className="w-3 h-3 text-[#DBAE3B]" />
                    <span>Requer Triagem Técnica</span>
                  </div>
                ) : (
                  <div className="absolute top-3 right-3 bg-emerald-900/90 backdrop-blur-md text-emerald-200 border border-emerald-400/40 text-[10px] uppercase font-bold tracking-wider px-3 py-1 rounded-full flex items-center space-x-1 shadow-md">
                    <CheckCircle className="w-3 h-3 text-emerald-300" />
                    <span>Agendamento Direto</span>
                  </div>
                )}

                <div className="absolute bottom-3 left-3 text-white">
                  <span className="text-[10px] uppercase tracking-widest text-[#DBAE3B] font-semibold">
                    {service.category.toUpperCase()}
                  </span>
                  <div className="text-xl font-bold font-editorial">
                    {service.promotionalPrice && service.promotionalPrice < service.price ? (
                      <>
                        <span className="font-bold text-amber-400">{formatBRL(service.promotionalPrice)}</span>
                        <span className="text-xs line-through text-stone-400 ml-2 font-normal">{formatBRL(service.price)}</span>
                      </>
                    ) : (
                      <span>{formatBRL(service.price)}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Informações do Card */}
              <div className="p-6 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="font-editorial text-lg sm:text-xl font-bold text-[#2D1914] mb-2 leading-snug">
                    {service.title}
                  </h3>
                  <p className="text-xs text-stone-600 line-clamp-3 mb-4 leading-relaxed">
                    {service.description}
                  </p>

                  {/* Informações de Etapas / Pausas */}
                  <div className="p-3 rounded-2xl bg-[#FAF7F2] border border-[#E7DCCE]/60 space-y-1.5 text-xs text-[#5E372C] mb-4">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1 text-[11px]">
                        <Clock className="w-3.5 h-3.5 text-[#C59B27]" />
                        Duração total:
                      </span>
                      <span className="font-semibold">{totalDuration} minutos</span>
                    </div>

                    {hasPauseStep && (
                      <div className="flex items-center justify-between text-[11px] text-amber-800">
                        <span>Pausa de Química / Espera:</span>
                        <span className="font-semibold bg-amber-100 px-2 py-0.5 rounded-full">
                          Janela para encaixe ativo
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Botão de Ação */}
                <button
                  onClick={() => onSelectService(service)}
                  className="w-full py-3 px-4 rounded-xl text-xs font-bold text-white gold-gradient shadow-xs hover:opacity-95 flex items-center justify-center space-x-2 transition-all active:scale-98"
                >
                  <span>
                    {service.requiresTriage
                      ? "Fazer Triagem & Pré-Agendar"
                      : "Ver Horários Disponíveis"}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
