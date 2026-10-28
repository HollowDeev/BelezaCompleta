"use client";

import Link from "next/link";
import { Sparkles, Calendar, FileText, ShieldCheck, Scissors } from "lucide-react";

interface NavbarProps {
  currentView: "client" | "admin" | "proposal" | "superadmin";
  onSelectView?: (view: "client" | "admin" | "proposal" | "superadmin") => void;
}

export function Navbar({ currentView, onSelectView }: NavbarProps) {
  return (
    <header className="sticky top-0 z-50 glass-luxury border-b border-[#E7DCCE]/80 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo & Marca */}
          <div className="flex items-center space-x-3">
            <button
              onClick={() => onSelectView?.("client")}
              className="flex items-center space-x-3 text-left group transition-all"
            >
              <div className="w-11 h-11 rounded-full chocolate-gradient flex items-center justify-center text-[#DBAE3B] shadow-md group-hover:scale-105 transition-transform">
                <Scissors className="w-5 h-5" />
              </div>
              <div>
                <span className="block font-editorial text-xl sm:text-2xl font-bold tracking-wider text-[#2D1914]">
                  GLEICY RONHA
                </span>
                <span className="block text-[10px] sm:text-xs uppercase tracking-widest text-[#AD841D] font-medium">
                  Espaço da Beleza • Alta Performance
                </span>
              </div>
            </button>
          </div>

          {/* Navegação Rápida / Alternador de Vistas */}
          <nav className="flex items-center space-x-1 sm:space-x-2">
            <button
              onClick={() => onSelectView?.("client")}
              className={`px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-medium transition-all flex items-center space-x-1.5 ${
                currentView === "client"
                  ? "bg-[#44271F] text-white shadow-xs"
                  : "text-[#5E372C] hover:bg-[#F3ECE1]"
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Agendar & Catálogo</span>
            </button>

            <button
              onClick={() => onSelectView?.("proposal")}
              className={`px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-medium transition-all flex items-center space-x-1.5 ${
                currentView === "proposal"
                  ? "bg-[#44271F] text-white shadow-xs"
                  : "text-[#5E372C] hover:bg-[#F3ECE1]"
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Ver Proposta Modelo</span>
            </button>

            <button
              onClick={() => onSelectView?.("admin")}
              className={`px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-medium transition-all flex items-center space-x-1.5 border ${
                currentView === "admin"
                  ? "bg-[#C59B27] text-white border-[#AD841D] shadow-xs"
                  : "text-[#44271F] border-[#E7DCCE] bg-white hover:bg-[#FDF9F3]"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span className="font-semibold">Painel Gleicy</span>
            </button>

            <button
              onClick={() => onSelectView?.("superadmin")}
              className={`px-2.5 sm:px-3 py-2 rounded-full text-xs font-medium transition-all flex items-center space-x-1 border ${
                currentView === "superadmin"
                  ? "bg-stone-900 text-white border-stone-800"
                  : "text-stone-600 border-stone-200 hover:bg-stone-100"
              }`}
              title="Acesso Thaua (Super Admin SaaS)"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
              <span className="hidden md:inline">SaaS Admin</span>
            </button>
          </nav>
        </div>
      </div>
    </header>
  );
}
