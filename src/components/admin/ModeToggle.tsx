"use client";

import { DashboardMode } from "@/types/salon";
import { LayoutDashboard, Sparkles, TrendingUp, Sliders } from "lucide-react";

interface ModeToggleProps {
  currentMode: DashboardMode;
  onChangeMode: (mode: DashboardMode) => void;
}

export function ModeToggle({ currentMode, onChangeMode }: ModeToggleProps) {
  const modes: { id: DashboardMode; label: string; icon: any; hint: string }[] = [
    {
      id: "minimalist",
      label: "Minimalista",
      icon: LayoutDashboard,
      hint: "Agenda limpa e foco imediato no dia",
    },
    {
      id: "intermediary",
      label: "Intermediário",
      icon: Sparkles,
      hint: "Visão recomendada com triagens e métricas",
    },
    {
      id: "advanced",
      label: "Avançado",
      icon: TrendingUp,
      hint: "Custos de insumos, margem de lucro e DRE",
    },
  ];

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 bg-white/80 rounded-2xl border border-[#E7DCCE] shadow-2xs">
      <div className="flex items-center space-x-2">
        <Sliders className="w-4 h-4 text-[#C59B27]" />
        <span className="text-xs font-bold uppercase tracking-wider text-[#44271F]">
          Modo do Painel:
        </span>
      </div>

      <div className="flex items-center p-1 bg-[#FAF7F2] rounded-xl border border-[#E7DCCE]/60">
        {modes.map((m) => {
          const Icon = m.icon;
          const isActive = currentMode === m.id;

          return (
            <button
              key={m.id}
              onClick={() => onChangeMode(m.id)}
              title={m.hint}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all ${
                isActive
                  ? "bg-[#44271F] text-white shadow-xs"
                  : "text-[#5E372C] hover:text-[#2D1914] hover:bg-[#F3ECE1]"
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? "text-[#DBAE3B]" : "text-stone-400"}`} />
              <span>{m.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
