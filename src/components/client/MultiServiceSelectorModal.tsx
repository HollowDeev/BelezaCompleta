"use client";

import { useState, useMemo } from "react";
import { ServiceItem } from "@/types/service";
import { formatBRL } from "@/lib/utils";
import {
  X,
  Clock,
  Sparkles,
  Layers,
  Check,
  Search,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";

interface MultiServiceSelectorModalProps {
  services: ServiceItem[];
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (selectedServices: ServiceItem[]) => void;
}

export function MultiServiceSelectorModal({
  services,
  isOpen,
  onClose,
  onConfirm,
}: MultiServiceSelectorModalProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const categories = [
    { id: "all", label: "Todos os Itens" },
    { id: "transformacao", label: "Mechas & Iluminados" },
    { id: "corte", label: "Cortes Estruturados" },
    { id: "tratamento", label: "Tratamentos & Saúde" },
    { id: "outros", label: "Outras Especialidades" },
  ];

  const activeServices = useMemo(() => {
    return services.filter((s) => s.isActive !== false);
  }, [services]);

  const filteredServices = useMemo(() => {
    return activeServices.filter((service) => {
      const matchesCategory =
        activeCategory === "all"
          ? true
          : activeCategory === "transformacao"
          ? service.category === "transformacao" || service.category === "mechas"
          : service.category === activeCategory;

      const matchesSearch =
        searchQuery.trim() === "" ||
        service.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        service.description.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesCategory && matchesSearch;
    });
  }, [activeServices, activeCategory, searchQuery]);

  const toggleService = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const selectedServices = useMemo(() => {
    return activeServices.filter((s) => selectedIds.includes(s.id));
  }, [activeServices, selectedIds]);

  const totalDurationMin = useMemo(() => {
    return selectedServices.reduce((acc, s) => {
      const dur =
        s.steps && s.steps.length > 0
          ? s.steps.reduce((sum, st) => sum + (Number(st.durationMin) || 0), 0)
          : 60;
      return acc + dur;
    }, 0);
  }, [selectedServices]);

  const totalPrice = useMemo(() => {
    return selectedServices.reduce(
      (acc, s) => acc + (s.promotionalPrice || s.price),
      0
    );
  }, [selectedServices]);

  const anyRequiresTriage = useMemo(() => {
    return selectedServices.some((s) => s.requiresTriage);
  }, [selectedServices]);

  const anyStartingAt = useMemo(() => {
    return selectedServices.some((s) => s.priceType === "starting_at");
  }, [selectedServices]);

  if (!isOpen) return null;

  const hours = Math.floor(totalDurationMin / 60);
  const minutes = totalDurationMin % 60;
  const durationLabel =
    hours > 0 ? `${hours}h${minutes > 0 ? ` ${minutes}min` : ""}` : `${minutes} min`;

  const handleConfirm = () => {
    if (selectedServices.length === 0) return;
    onConfirm(selectedServices);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#122B2A]/70 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-hidden animate-fade-in">
      <div className="bg-white rounded-t-[28px] sm:rounded-3xl rounded-b-none sm:rounded-b-3xl max-w-4xl w-full max-h-[94vh] sm:max-h-[90vh] flex flex-col overflow-hidden shadow-2xl border-t border-x sm:border border-[#C7A03A]/40 animate-slide-up-sheet">
        {/* Mobile handle */}
        <div className="w-12 h-1.5 bg-[#D8D0BD] rounded-full mx-auto my-2.5 sm:hidden shrink-0" />

        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-[#D8D0BD] bg-[#FCF5EB] flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-[#1D3D3C] text-[#C7A03A] flex items-center justify-center shadow-md border border-[#C7A03A]/40">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="inline-flex items-center space-x-1.5 text-[10px] font-bold uppercase tracking-wider text-[#80611F]">
                <Sparkles className="w-3 h-3 text-[#C7A03A]" />
                <span>Montar o meu atendimento</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold font-editorial text-[#1D3D3C] leading-none mt-0.5">
                Monte seu atendimento personalizado
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full text-stone-500 hover:text-stone-800 hover:bg-[#F0EFE3] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filters and Search Bar */}
        <div className="p-4 sm:px-6 sm:py-3.5 border-b border-[#D8D0BD]/60 bg-white space-y-3 shrink-0">
          <div className="relative">
            <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar procedimento (ex: mechas, corte, nutrição)..."
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-[#D8D0BD] bg-[#FCF5EB] text-xs text-[#1D3D3C] placeholder-stone-400 focus:outline-none focus:border-[#1D3D3C]"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  activeCategory === cat.id
                    ? "bg-[#1D3D3C] text-white shadow-2xs border border-[#C7A03A]/40"
                    : "bg-[#FCF5EB] text-[#736455] border border-[#D8D0BD] hover:bg-[#F0EFE3]"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Service Cards Grid (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3">
          {filteredServices.length === 0 ? (
            <div className="text-center py-12 text-[#736455] space-y-2">
              <p className="font-editorial text-lg font-bold text-[#1D3D3C]">
                Nenhum procedimento encontrado
              </p>
              <p className="text-xs">Tente buscar por outro termo ou categoria.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {filteredServices.map((service) => {
                const isSelected = selectedIds.includes(service.id);
                const srvDuration =
                  service.steps && service.steps.length > 0
                    ? service.steps.reduce((sum, st) => sum + (Number(st.durationMin) || 0), 0)
                    : 60;

                return (
                  <div
                    key={service.id}
                    onClick={() => toggleService(service.id)}
                    className={`relative p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? "bg-[#FCF5EB] border-[#C7A03A] shadow-md ring-2 ring-[#C7A03A]/30"
                        : "bg-white border-[#D8D0BD] hover:border-[#C7A03A]/50 hover:bg-[#FAF7F2]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-all ${
                              isSelected
                                ? "bg-[#1D3D3C] border-[#1D3D3C] text-white"
                                : "border-[#D8D0BD] bg-white"
                            }`}
                          >
                            {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                          </span>
                          <h4 className="font-editorial text-base font-bold text-[#1D3D3C]">
                            {service.title}
                          </h4>
                        </div>
                        <p className="text-xs text-[#736455] line-clamp-2 pl-7">
                          {service.description}
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        {service.priceType === "starting_at" ? (
                          <div className="flex flex-col items-end">
                            <span className="text-[9px] uppercase font-bold text-[#80611F]">
                              A partir de
                            </span>
                            <span className="font-editorial text-base font-bold text-[#1D3D3C]">
                              {formatBRL(service.price)}
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-baseline space-x-1">
                            <span className="font-editorial text-base font-bold text-[#1D3D3C]">
                              {formatBRL(service.promotionalPrice || service.price)}
                            </span>
                          </div>
                        )}

                        <div className="flex items-center justify-end space-x-1 text-[11px] text-stone-500 mt-1">
                          <Clock className="w-3 h-3 text-[#C7A03A]" />
                          <span>{srvDuration} min</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-[#D8D0BD]/40 flex items-center justify-between text-[11px]">
                      <span className="text-stone-500">
                        {service.steps?.length || 1} etapas técnicas
                      </span>
                      {service.requiresTriage && (
                        <span className="px-2 py-0.5 rounded-md bg-[#FAF4E8] text-[#80611F] border border-[#C7A03A]/40 text-[10px] font-bold uppercase tracking-wider">
                          Com Avaliação
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Floating Bottom Dock / Summary Bar */}
        <div className="p-4 sm:p-5 bg-[#FCF5EB] border-t border-[#D8D0BD] shrink-0 space-y-3">
          {selectedServices.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 max-h-16 overflow-y-auto no-scrollbar">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#80611F] mr-1">
                Selecionados:
              </span>
              {selectedServices.map((s) => (
                <span
                  key={s.id}
                  className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-white border border-[#D8D0BD] text-xs text-[#1D3D3C] font-medium shadow-2xs"
                >
                  <span className="truncate max-w-[140px] sm:max-w-none">{s.title}</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleService(s.id);
                    }}
                    className="p-0.5 text-stone-400 hover:text-stone-700 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
            <div className="flex items-center justify-between sm:justify-start gap-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#80611F] block">
                  Tempo Total Estimado
                </span>
                <span className="text-sm sm:text-base font-bold text-[#1D3D3C] flex items-center space-x-1">
                  <Clock className="w-4 h-4 text-[#C7A03A]" />
                  <span>{selectedServices.length > 0 ? durationLabel : "0 min"}</span>
                </span>
              </div>

              <div className="h-8 w-px bg-[#D8D0BD]" />

              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#80611F] block">
                  Total Previsto
                </span>
                <span className="text-base sm:text-lg font-bold font-editorial text-[#1D3D3C]">
                  {anyStartingAt && selectedServices.length > 0 ? "A partir de " : ""}
                  {formatBRL(totalPrice)}
                </span>
              </div>

              {anyRequiresTriage && (
                <div className="hidden md:flex items-center space-x-1 text-[11px] text-[#80611F] font-semibold bg-[#FAF4E8] px-2.5 py-1 rounded-lg border border-[#C7A03A]/30">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#C7A03A]" />
                  <span>Inclui Avaliação Capilar</span>
                </div>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-3 rounded-xl border border-[#D8D0BD] text-xs font-semibold text-[#736455] hover:bg-white transition-colors cursor-pointer"
              >
                Voltar
              </button>

              <button
                type="button"
                disabled={selectedServices.length === 0}
                onClick={handleConfirm}
                className="flex-1 sm:flex-none px-6 py-3 rounded-xl bg-[#1D3D3C] text-white text-xs font-bold uppercase tracking-wider hover:bg-[#28504D] disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md flex items-center justify-center space-x-2 border border-[#C7A03A]/40 cursor-pointer"
              >
                <span>
                  {selectedServices.length === 0
                    ? "Selecione ao menos 1 item"
                    : `Continuar (${selectedServices.length} procedimentos)`}
                </span>
                <ArrowRight className="w-4 h-4 text-[#C7A03A]" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
