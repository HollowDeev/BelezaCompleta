"use client";

import { Clock, Timer } from "lucide-react";

export interface FloatingPillProps {
  activeChemicalPause?: {
    clientName: string;
    remainingSeconds: number;
    totalSeconds: number;
  } | null;
}

export function FloatingPill({ activeChemicalPause }: FloatingPillProps) {
  if (!activeChemicalPause || activeChemicalPause.remainingSeconds <= 0) {
    return null;
  }

  const { clientName, remainingSeconds, totalSeconds } = activeChemicalPause;

  // Formata MM:SS
  const mins = Math.floor(remainingSeconds / 60);
  const secs = remainingSeconds % 60;
  const timeFormatted = `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;

  // Alerta crítico nos últimos 3 minutos (<= 180 segundos)
  const isCritical = remainingSeconds <= 180;

  return (
    <div
      style={{
        position: "fixed",
        top: "12px",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 60,
      }}
      className={`rounded-full px-4 py-2 flex items-center gap-2.5 shadow-2xl backdrop-blur-sm transition-all text-xs font-semibold select-none border ${
        isCritical
          ? "bg-rose-950/95 border-rose-500 text-rose-200 shadow-rose-950/50 animate-pulse"
          : "bg-stone-900/90 border-amber-500/70 text-amber-200 shadow-black/50"
      }`}
    >
      <div
        className={`w-5 h-5 rounded-full flex items-center justify-center ${
          isCritical ? "bg-rose-500/30 text-rose-300" : "bg-amber-500/20 text-amber-300"
        }`}
      >
        <Timer className="w-3.5 h-3.5 shrink-0" />
      </div>

      <div className="flex items-center gap-1.5 whitespace-nowrap">
        <span className="font-bold text-white tracking-wide">
          {clientName}:
        </span>
        <span className="text-stone-300">Pausa Química —</span>
        <span
          className={`font-mono font-bold tracking-wider ${
            isCritical ? "text-rose-300" : "text-amber-400"
          }`}
        >
          {timeFormatted} restantes
        </span>
      </div>
    </div>
  );
}
