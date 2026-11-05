"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { TutorialStep } from "@/types/tutorial";
import {
  ChevronRight,
  ChevronLeft,
  X,
  Lightbulb,
  CheckCircle2,
} from "lucide-react";

interface InteractiveTutorialTourProps {
  steps: TutorialStep[];
  currentStepIndex: number;
  isOpen: boolean;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
  onComplete: () => void;
  onSelectTab?: (tab: string) => void;
}

interface TargetRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export function InteractiveTutorialTour({
  steps,
  currentStepIndex,
  isOpen,
  onNext,
  onPrev,
  onSkip,
  onComplete,
  onSelectTab,
}: InteractiveTutorialTourProps) {
  const currentStep = useMemo(() => steps[currentStepIndex], [steps, currentStepIndex]);
  const [targetRect, setTargetRect] = useState<TargetRect | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [viewportDims, setViewportDims] = useState<{ width: number; height: number }>({
    width: typeof window !== "undefined" ? window.innerWidth : 1200,
    height: typeof window !== "undefined" ? window.innerHeight : 800,
  });

  // Função pura para obter retângulo nas coordenadas da viewport
  const getElementViewportRect = useCallback((selector: string): TargetRect | null => {
    const el = document.querySelector(selector);
    if (!el) return null;

    const rect = el.getBoundingClientRect();
    const padding = 8;
    return {
      top: Math.round(rect.top - padding),
      left: Math.round(rect.left - padding),
      width: Math.round(rect.width + padding * 2),
      height: Math.round(rect.height + padding * 2),
    };
  }, []);

  // Atualiza posição do elemento ativo
  const updateTargetPosition = useCallback(() => {
    if (!currentStep?.targetSelector) {
      setTargetRect(null);
      return;
    }

    const computedRect = getElementViewportRect(currentStep.targetSelector);
    setTargetRect(computedRect);
  }, [currentStep, getElementViewportRect]);

  // Efeito principal: ativa aba se necessário, busca elemento e rastreia scroll suave
  useEffect(() => {
    if (!isOpen || !currentStep) return;

    let isCancelled = false;
    let pollInterval: NodeJS.Timeout | null = null;
    let rafId: number | null = null;
    let pollAttempts = 0;
    const maxPollAttempts = 16; // até ~800ms procurando o elemento

    // Se a etapa exige troca de aba
    if (currentStep.targetTab && onSelectTab) {
      onSelectTab(currentStep.targetTab);
    }

    if (!currentStep.targetSelector) {
      setTargetRect(null);
      return;
    }

    const startTrackingTarget = () => {
      const el = document.querySelector(currentStep.targetSelector!);
      if (!el) {
        pollAttempts++;
        if (pollAttempts < maxPollAttempts && !isCancelled) {
          pollInterval = setTimeout(startTrackingTarget, 50);
        } else {
          setTargetRect(null);
        }
        return;
      }

      // Elemento encontrado: obtém posição inicial
      const initialRect = getElementViewportRect(currentStep.targetSelector!);
      if (initialRect && !isCancelled) {
        setTargetRect(initialRect);
      }

      // Verifica se o elemento está razoavelmente visível na tela
      const rawRect = el.getBoundingClientRect();
      const isComfortablyVisible =
        rawRect.top >= 90 &&
        rawRect.bottom <= window.innerHeight - 90 &&
        rawRect.left >= 0 &&
        rawRect.right <= window.innerWidth;

      if (!isComfortablyVisible) {
        el.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
      }

      // Rastreia coordenadas com RAF durante a animação de scroll (650ms)
      const animStart = performance.now();
      const trackAnimation = () => {
        if (isCancelled) return;
        const currentRect = getElementViewportRect(currentStep.targetSelector!);
        if (currentRect) {
          setTargetRect(currentRect);
        }
        if (performance.now() - animStart < 650) {
          rafId = requestAnimationFrame(trackAnimation);
        }
      };

      rafId = requestAnimationFrame(trackAnimation);
    };

    startTrackingTarget();

    return () => {
      isCancelled = true;
      if (pollInterval) clearTimeout(pollInterval);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [isOpen, currentStep, onSelectTab, getElementViewportRect]);

  // Listener contínuo de resize e scroll nativo
  useEffect(() => {
    if (!isOpen) return;

    const handleWindowChange = () => {
      setViewportDims({
        width: window.innerWidth,
        height: window.innerHeight,
      });
      updateTargetPosition();
    };

    window.addEventListener("resize", handleWindowChange, { passive: true });
    window.addEventListener("scroll", handleWindowChange, { capture: true, passive: true });

    return () => {
      window.removeEventListener("resize", handleWindowChange);
      window.removeEventListener("scroll", handleWindowChange, true);
    };
  }, [isOpen, updateTargetPosition]);

  // Atalhos de teclado para navegação no tour
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onSkip();
      } else if (e.key === "ArrowRight") {
        if (currentStepIndex === steps.length - 1) {
          onComplete();
        } else {
          onNext();
        }
      } else if (e.key === "ArrowLeft") {
        onPrev();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, currentStepIndex, steps.length, onNext, onPrev, onSkip, onComplete]);

  if (!isOpen || !currentStep) return null;

  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === steps.length - 1;
  const progressPercent = Math.round(((currentStepIndex + 1) / steps.length) * 100);

  // Determina se deve ficar centralizado
  const isCentered = !targetRect || currentStep.position === "center";

  // Cálculo seguro e restrito da posição do Card na Viewport
  let cardStyle: React.CSSProperties = {};

  if (!isCentered && targetRect) {
    const spacing = 16;
    const vw = viewportDims.width;
    const vh = viewportDims.height;

    // Dimensões do card (calculadas ou estimadas com margem)
    const cardWidth = cardRef.current?.offsetWidth || Math.min(420, vw - 32);
    const cardHeight = cardRef.current?.offsetHeight || 330;

    // Limites seguros da tela (evita encobrir barra superior e evita vazar no rodapé)
    const minTop = 75; // altura do cabeçalho superior do dashboard
    const maxTop = Math.max(minTop, vh - cardHeight - 16);
    const minLeft = 16;
    const maxLeft = Math.max(minLeft, vw - cardWidth - 16);

    let desiredPos = currentStep.position || "bottom";
    let computedTop = minTop;
    let computedLeft = minLeft;

    if (desiredPos === "bottom") {
      let idealTop = targetRect.top + targetRect.height + spacing;
      // Se vazar embaixo, tenta colocar em cima
      if (idealTop + cardHeight > vh - 16) {
        if (targetRect.top - cardHeight - spacing >= minTop) {
          idealTop = targetRect.top - cardHeight - spacing;
        }
      }
      computedTop = Math.max(minTop, Math.min(idealTop, maxTop));
      computedLeft = Math.max(minLeft, Math.min(targetRect.left, maxLeft));
    } else if (desiredPos === "top") {
      let idealTop = targetRect.top - cardHeight - spacing;
      // Se não couber em cima, coloca embaixo
      if (idealTop < minTop) {
        idealTop = targetRect.top + targetRect.height + spacing;
      }
      computedTop = Math.max(minTop, Math.min(idealTop, maxTop));
      computedLeft = Math.max(minLeft, Math.min(targetRect.left, maxLeft));
    } else if (desiredPos === "right") {
      let idealLeft = targetRect.left + targetRect.width + spacing;
      // Se vazar à direita, posiciona à esquerda
      if (idealLeft + cardWidth > vw - 16) {
        if (targetRect.left - cardWidth - spacing >= minLeft) {
          idealLeft = targetRect.left - cardWidth - spacing;
        }
      }
      computedLeft = Math.max(minLeft, Math.min(idealLeft, maxLeft));
      // Alinha verticalmente com o centro do alvo, estritamente contido na tela
      const idealTop = targetRect.top + targetRect.height / 2 - cardHeight / 2;
      computedTop = Math.max(minTop, Math.min(idealTop, maxTop));
    } else if (desiredPos === "left") {
      let idealLeft = targetRect.left - cardWidth - spacing;
      // Se não couber à esquerda, posiciona à direita
      if (idealLeft < minLeft) {
        idealLeft = targetRect.left + targetRect.width + spacing;
      }
      computedLeft = Math.max(minLeft, Math.min(idealLeft, maxLeft));
      const idealTop = targetRect.top + targetRect.height / 2 - cardHeight / 2;
      computedTop = Math.max(minTop, Math.min(idealTop, maxTop));
    }

    cardStyle = {
      position: "fixed",
      top: computedTop,
      left: computedLeft,
    };
  }

  return (
    <div className="fixed inset-0 z-50 pointer-events-auto overflow-hidden">
      {/* 1. Backdrop com Holofote Recortado */}
      {targetRect && !isCentered ? (
        <div
          className="fixed rounded-2xl pointer-events-none transition-[box-shadow,border] duration-150 ease-out border-2 border-[#C59B27] shadow-[0_0_0_9999px_rgba(28,16,12,0.82),0_0_24px_rgba(197,155,39,0.55)] animate-pulse"
          style={{
            top: targetRect.top,
            left: targetRect.left,
            width: targetRect.width,
            height: targetRect.height,
          }}
        />
      ) : (
        <div className="fixed inset-0 bg-[#1A0F0C]/85 backdrop-blur-xs transition-opacity duration-300" />
      )}

      {/* 2. Card Educacional do Passo */}
      <div
        ref={cardRef}
        className={`fixed z-50 transition-all duration-200 ease-out ${
          isCentered
            ? "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[92%] sm:w-[480px]"
            : "w-[92%] sm:w-[420px]"
        }`}
        style={isCentered ? undefined : cardStyle}
      >
        <div className="bg-white rounded-3xl shadow-2xl border border-[#E7DCCE] overflow-hidden text-[#2D1914] flex flex-col max-h-[calc(100vh-100px)]">
          {/* Topo do Card: Progresso e Fechar */}
          <div className="bg-[#FAF7F2] border-b border-[#E7DCCE]/60 px-5 py-3.5 flex items-center justify-between shrink-0">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#C59B27] animate-ping" />
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#AD841D]">
                {currentStep.categoryLabel}
              </span>
              <span className="text-[11px] font-semibold text-stone-400">•</span>
              <span className="text-[11px] font-bold text-stone-500">
                Passo {currentStepIndex + 1} de {steps.length}
              </span>
            </div>

            <button
              onClick={onSkip}
              className="p-1 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-200/50 transition-colors"
              title="Pular Tutorial (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Barra de Progresso Dourada */}
          <div className="w-full bg-[#E7DCCE]/40 h-1 shrink-0">
            <div
              className="h-full gold-gradient transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* Conteúdo Principal do Passo com scroll se a tela for muito baixa */}
          <div className="p-5 sm:p-6 space-y-4 overflow-y-auto min-h-0">
            <div className="space-y-1.5">
              <h3 className="font-editorial text-xl sm:text-2xl font-bold text-[#2D1914] leading-snug">
                {currentStep.title}
              </h3>
              <p className="text-xs sm:text-sm text-stone-600 leading-relaxed whitespace-pre-line">
                {currentStep.description}
              </p>
            </div>

            {/* Dica de Ouro Estratégica (se houver) */}
            {currentStep.goldenTip && (
              <div className="p-3.5 rounded-2xl bg-[#FFF9E6] border border-[#F0DC9B] flex items-start space-x-3 text-xs text-[#6B5112]">
                <Lightbulb className="w-4 h-4 text-[#C59B27] shrink-0 mt-0.5" />
                <div className="leading-snug">
                  <strong className="block text-[#473406] mb-0.5">Dica de Ouro:</strong>
                  <span>{currentStep.goldenTip}</span>
                </div>
              </div>
            )}
          </div>

          {/* Rodapé com Navegação Estritamente Visível */}
          <div className="bg-[#FAF7F2] border-t border-[#E7DCCE]/60 px-5 py-4 flex items-center justify-between shrink-0">
            <button
              onClick={onSkip}
              className="text-xs font-semibold text-stone-400 hover:text-stone-600 transition-colors"
            >
              Pular tour
            </button>

            <div className="flex items-center space-x-2">
              {!isFirstStep && (
                <button
                  onClick={onPrev}
                  className="px-3 py-2 text-xs font-semibold text-[#5E372C] bg-white border border-[#E7DCCE] hover:bg-[#F3ECE1] rounded-xl flex items-center space-x-1 transition-all"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Anterior</span>
                </button>
              )}

              {isLastStep ? (
                <button
                  onClick={onComplete}
                  className="px-4 py-2 text-xs font-bold text-white gold-gradient rounded-xl shadow-md hover:opacity-95 flex items-center space-x-1.5 transition-all transform hover:scale-[1.02]"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Concluir Tutorial!</span>
                </button>
              ) : (
                <button
                  onClick={onNext}
                  className="px-4 py-2 text-xs font-bold text-white gold-gradient rounded-xl shadow-md hover:opacity-95 flex items-center space-x-1.5 transition-all transform hover:scale-[1.02]"
                >
                  <span>Próximo</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
