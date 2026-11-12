"use client";

import { useState } from "react";
import { UPDATE_RELEASE_FEATURES } from "./tutorialSteps";
import { UpdateReleaseFeature } from "@/types/tutorial";
import {
  X,
  Sparkles,
  Play,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  Lightbulb,
  ExternalLink,
  Tag,
  Calendar,
  Bell,
  MessageCircle,
  Zap,
  FileText,
  CheckSquare,
  Clock,
  Scissors,
} from "lucide-react";

interface UpdateReleaseTutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartInteractiveTour: () => void;
  onNavigateToTab?: (tab: string) => void;
}

export function UpdateReleaseTutorialModal({
  isOpen,
  onClose,
  onStartInteractiveTour,
  onNavigateToTab,
}: UpdateReleaseTutorialModalProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  if (!isOpen) return null;

  const currentFeature: UpdateReleaseFeature =
    UPDATE_RELEASE_FEATURES[selectedIndex] || UPDATE_RELEASE_FEATURES[0];

  const handlePrev = () => {
    setSelectedIndex((prev) => Math.max(0, prev - 1));
  };

  const handleNext = () => {
    setSelectedIndex((prev) => Math.min(UPDATE_RELEASE_FEATURES.length - 1, prev + 1));
  };

  const renderIcon = (name: string, className = "w-4 h-4") => {
    switch (name) {
      case "Tag":
        return <Tag className={className} />;
      case "Sparkles":
        return <Sparkles className={className} />;
      case "Calendar":
        return <Calendar className={className} />;
      case "Bell":
        return <Bell className={className} />;
      case "MessageCircle":
        return <MessageCircle className={className} />;
      case "Zap":
        return <Zap className={className} />;
      case "FileText":
        return <FileText className={className} />;
      case "CheckSquare":
        return <CheckSquare className={className} />;
      case "Clock":
        return <Clock className={className} />;
      case "CheckCircle2":
        return <CheckCircle2 className={className} />;
      default:
        return <Scissors className={className} />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 md:p-6 overflow-hidden bg-black/70 backdrop-blur-xs animate-fade-in">
      <div className="bg-white w-full max-w-5xl rounded-t-[28px] sm:rounded-3xl rounded-b-none sm:rounded-b-3xl shadow-2xl border-t border-x sm:border border-[#E7DCCE] overflow-hidden flex flex-col max-h-[95vh] sm:max-h-[90vh] animate-slide-up-sheet">
        {/* Puxador Visual Mobile */}
        <div className="w-12 h-1.5 bg-[#D8D0BD] rounded-full mx-auto my-2 sm:hidden shrink-0" />

        {/* Header de Impacto: Beleza Completa & Novidades */}
        <div className="bg-gradient-to-r from-[#1D3D3C] via-[#244645] to-[#152e2d] text-white p-5 sm:p-6 relative overflow-hidden shrink-0 border-b border-[#C7A03A]/30">
          <div className="absolute top-0 right-0 w-80 h-80 bg-radial from-[#C59B27]/25 to-transparent pointer-events-none rounded-full blur-3xl" />

          <div className="relative z-10 flex items-start justify-between gap-3">
            <div className="space-y-1.5">
              <div className="flex items-center space-x-2">
                <span className="px-2.5 py-0.5 rounded-full bg-[#C59B27]/25 border border-[#C59B27]/50 text-[#F0C961] text-[10px] font-extrabold uppercase tracking-widest flex items-center gap-1 shadow-2xs">
                  <Sparkles className="w-3 h-3 text-[#F0C961]" />
                  Atualização Concluída
                </span>
                <span className="text-xs text-stone-400">•</span>
                <span className="text-xs text-[#E7DCCE] font-medium">Gleicy Ronha</span>
              </div>
              <h2 className="font-editorial text-2xl sm:text-3xl font-bold tracking-tight text-[#FAF7F2]">
                Guia das Novas Funcionalidades & Correções ✨
              </h2>
              <p className="text-xs sm:text-sm text-stone-300 max-w-2xl leading-relaxed">
                Implementamos todas as 10 melhorias solicitadas para transformar sua rotina, acelerar o atendimento e blindar seu faturamento.
              </p>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-2xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer shrink-0"
              title="Fechar Guia"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Banner Rápido: Tour com Holofote */}
          <div className="mt-4 pt-3.5 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-2 text-xs text-[#E5C158]">
              <Sparkles className="w-4 h-4 shrink-0 text-[#DBAE3B]" />
              <span>Deseja um passeio rápido pelas telas apontando cada novo botão?</span>
            </div>

            <button
              onClick={() => {
                onClose();
                onStartInteractiveTour();
              }}
              className="px-4 py-2 rounded-xl font-bold text-xs text-[#2D1914] bg-gradient-to-r from-[#DBAE3B] to-[#F0C961] hover:brightness-105 transition-all shadow-md flex items-center justify-center space-x-2 shrink-0 cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Iniciar Tour Visual com Holofote</span>
            </button>
          </div>
        </div>

        {/* Corpo Principal: Seletor das 10 Novidades + Card Explicativo */}
        <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden bg-[#FAF7F2]">
          {/* Coluna Esquerda: Lista das 10 Novidades */}
          <div className="w-full md:w-80 lg:w-96 border-b md:border-b-0 md:border-r border-[#E7DCCE] bg-white flex flex-col shrink-0">
            <div className="p-3.5 border-b border-[#E7DCCE] bg-[#FAF7F2]/80 flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#736455]">
                10 Novidades Prontas
              </span>
              <span className="text-[11px] font-bold text-[#80611F] bg-[#FCF9F0] border border-[#C7A03A]/40 px-2 py-0.5 rounded-full">
                {selectedIndex + 1} de {UPDATE_RELEASE_FEATURES.length}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1.5 no-scrollbar md:scrollbar-thin">
              {UPDATE_RELEASE_FEATURES.map((item, idx) => {
                const isSelected = idx === selectedIndex;
                return (
                  <button
                    key={item.id}
                    onClick={() => setSelectedIndex(idx)}
                    className={`w-full text-left p-3 rounded-2xl transition-all flex items-start gap-3 cursor-pointer ${
                      isSelected
                        ? "bg-[#1D3D3C] text-white shadow-md border border-[#C7A03A]/40"
                        : "hover:bg-[#FAF7F2] text-[#2D1914] border border-transparent"
                    }`}
                  >
                    <div
                      className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold ${
                        isSelected
                          ? "bg-[#C59B27] text-white"
                          : "bg-[#FAF7F2] text-[#80611F] border border-[#E7DCCE]"
                      }`}
                    >
                      {item.number}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider ${
                            isSelected ? "text-[#E5C158]" : "text-[#80611F]"
                          }`}
                        >
                          {item.tag}
                        </span>
                      </div>
                      <h4
                        className={`text-xs font-bold truncate ${
                          isSelected ? "text-white" : "text-[#2D1914]"
                        }`}
                      >
                        {item.title}
                      </h4>
                      <p
                        className={`text-[11px] line-clamp-1 mt-0.5 ${
                          isSelected ? "text-stone-300" : "text-stone-500"
                        }`}
                      >
                        {item.shortSummary}
                      </p>
                    </div>

                    <ChevronRight
                      className={`w-4 h-4 shrink-0 mt-1 transition-transform ${
                        isSelected ? "text-[#E5C158] translate-x-0.5" : "text-stone-300"
                      }`}
                    />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Coluna Direita: Detalhamento da Novidade Selecionada */}
          <div className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-6">
            {/* Header da Novidade */}
            <div className="space-y-2 border-b border-[#E7DCCE] pb-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-[#FCF9F0] border border-[#C7A03A]/50 text-[#80611F] flex items-center justify-center shadow-2xs">
                    {renderIcon(currentFeature.iconName, "w-4 h-4 text-[#80611F]")}
                  </div>
                  <span className="text-[11px] font-extrabold uppercase tracking-widest text-[#80611F] bg-[#FCF9F0] border border-[#C7A03A]/40 px-2.5 py-0.5 rounded-full">
                    Item {currentFeature.number} • {currentFeature.tag}
                  </span>
                </div>

                {currentFeature.targetTab && onNavigateToTab && (
                  <button
                    onClick={() => {
                      onNavigateToTab(currentFeature.targetTab!);
                      onClose();
                    }}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold text-[#1D3D3C] bg-white border border-[#D8D0BD] hover:bg-[#FAF7F2] transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
                    title={`Abrir tela de ${currentFeature.targetTab}`}
                  >
                    <span>Ir para a tela agora</span>
                    <ExternalLink className="w-3.5 h-3.5 text-[#C7A03A]" />
                  </button>
                )}
              </div>

              <h3 className="font-editorial text-2xl sm:text-3xl font-bold text-[#2D1914] leading-tight">
                {currentFeature.title}
              </h3>
              <p className="text-xs sm:text-sm text-[#736455] font-medium leading-relaxed">
                {currentFeature.shortSummary}
              </p>
            </div>

            {/* Bloco 1: O Que Mudou */}
            <div className="p-4 sm:p-5 rounded-2xl bg-white border border-[#E7DCCE] shadow-2xs space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-[#1D3D3C] uppercase tracking-wider">
                <Sparkles className="w-4 h-4 text-[#C7A03A]" />
                <span>O que mudou nesta atualização?</span>
              </div>
              <p className="text-xs sm:text-sm text-stone-700 leading-relaxed">
                {currentFeature.whatChanged}
              </p>
            </div>

            {/* Bloco 2: Como Usar no Dia a Dia */}
            <div className="p-4 sm:p-5 rounded-2xl bg-white border border-[#E7DCCE] shadow-2xs space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-[#1D3D3C] uppercase tracking-wider">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Como usar na prática no salão:</span>
              </div>
              <div className="space-y-2">
                {currentFeature.howToUse.map((step, sIdx) => (
                  <div key={sIdx} className="flex items-start gap-3 text-xs sm:text-sm text-stone-700">
                    <span className="w-5 h-5 rounded-full bg-[#FCF9F0] text-[#80611F] border border-[#C7A03A]/40 text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                      {sIdx + 1}
                    </span>
                    <span className="leading-relaxed">{step}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Bloco 3: Dica de Ouro da Profissional */}
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-[#FCF9F0] to-[#FAF5E6] border border-[#C7A03A]/50 shadow-2xs space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-bold text-[#80611F] uppercase tracking-wider">
                <Lightbulb className="w-4 h-4 text-[#C7A03A]" />
                <span>Dica de Ouro da Gleicy:</span>
              </div>
              <p className="text-xs sm:text-sm text-[#5E372C] leading-relaxed font-medium">
                {currentFeature.goldenTip}
              </p>
            </div>
          </div>
        </div>

        {/* Rodapé de Navegação Rápida */}
        <div className="bg-white border-t border-[#E7DCCE] px-5 sm:px-8 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="flex items-center space-x-2 text-xs text-stone-500 font-medium order-2 sm:order-1">
            <span>Explorando novidade</span>
            <span className="font-bold text-[#1D3D3C]">
              {selectedIndex + 1} de {UPDATE_RELEASE_FEATURES.length}
            </span>
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto justify-end order-1 sm:order-2">
            <button
              onClick={handlePrev}
              disabled={selectedIndex === 0}
              className="px-3.5 py-2 rounded-xl text-xs font-bold border border-[#D8D0BD] text-[#736455] hover:bg-[#FAF7F2] disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center space-x-1 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Anterior</span>
            </button>

            {selectedIndex < UPDATE_RELEASE_FEATURES.length - 1 ? (
              <button
                onClick={handleNext}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-[#1D3D3C] hover:bg-[#152e2d] text-white shadow-xs transition-all flex items-center space-x-1 cursor-pointer"
              >
                <span>Próxima</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={onClose}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-[#DBAE3B] to-[#F0C961] text-[#2D1914] shadow-md hover:brightness-105 transition-all flex items-center space-x-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Entendido! Concluir Guia</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
