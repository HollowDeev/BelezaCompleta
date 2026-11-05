"use client";

import { useState } from "react";
import {
  Zap,
  Calendar,
  CalendarCheck,
  ClipboardList,
  FileText,
  Scissors,
  DollarSign,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  Sparkles,
  Sliders,
  Users,
  Settings,
} from "lucide-react";

export type AdminTab =
  | "operacao"
  | "agenda"
  | "abertura-agenda"
  | "triagens"
  | "propostas"
  | "clientes"
  | "servicos"
  | "modelos-triagem"
  | "financeiro"
  | "configuracoes"
  | "saas";

interface SidebarProps {
  currentTab: AdminTab;
  onSelectTab: (tab: AdminTab) => void;
  pendingTriageCount: number;
  pendingPreReservationsCount?: number;
  role?: string | null;
}

export function Sidebar({
  currentTab,
  onSelectTab,
  pendingTriageCount,
  pendingPreReservationsCount = 0,
  role,
}: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const operationItems = [
    {
      id: "operacao" as AdminTab,
      label: "Operação do Dia",
      icon: Zap,
      badge: "Hoje",
      badgeColor: "bg-[#1D3D3C] text-[#D9B85F] border border-[#C7A03A]/40 font-bold",
    },
    {
      id: "agenda" as AdminTab,
      label: "Agenda & Calendário",
      icon: Calendar,
    },
    {
      id: "abertura-agenda" as AdminTab,
      label: "Abertura de Agenda",
      icon: CalendarCheck,
      badge: pendingPreReservationsCount > 0 ? `${pendingPreReservationsCount}` : undefined,
      badgeColor: "bg-[#FCF9F0] text-[#80611F] border border-[#C7A03A]/60 font-bold animate-pulse",
    },
    {
      id: "triagens" as AdminTab,
      label: "Fila de Triagens",
      icon: ClipboardList,
      badge: pendingTriageCount > 0 ? `${pendingTriageCount}` : undefined,
      badgeColor: "bg-[#FCF9F0] text-[#80611F] border border-[#C7A03A]/60 font-bold animate-pulse",
    },
    {
      id: "propostas" as AdminTab,
      label: "Propostas Comerciais",
      icon: FileText,
    },
    {
      id: "clientes" as AdminTab,
      label: "Gestão de Clientes",
      icon: Users,
    },
    {
      id: "financeiro" as AdminTab,
      label: "Painel Financeiro",
      icon: DollarSign,
    },
  ];

  const registryItems = [
    {
      id: "servicos" as AdminTab,
      label: "Serviços & Procedimentos",
      icon: Scissors,
    },
    {
      id: "modelos-triagem" as AdminTab,
      label: "Modelos de Triagem",
      icon: Sliders,
    },
    {
      id: "configuracoes" as AdminTab,
      label: "Configurações & Perfil",
      icon: Settings,
    },
  ];

  const renderNavGroup = (title: string, items: typeof operationItems) => (
    <div className="space-y-1">
      {!isCollapsed && (
        <div className="px-3 pt-3 pb-1">
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#80611F] block">
            {title}
          </span>
        </div>
      )}
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = currentTab === item.id;

        return (
          <button
            key={item.id}
            data-tutorial={`sidebar-${item.id}`}
            onClick={() => {
              onSelectTab(item.id);
              setIsMobileOpen(false);
            }}
            title={item.label}
            className={`w-full p-2.5 sm:p-3 rounded-2xl text-xs font-semibold flex items-center transition-all ${
              isActive
                ? "bg-[#1D3D3C] text-white shadow-xs border border-[#C7A03A]/30"
                : "text-[#736455] hover:bg-[#EEE8DD] hover:text-[#1D3D3C]"
            } ${isCollapsed ? "justify-center" : "justify-between"}`}
          >
            <div className="flex items-center space-x-3 truncate">
              <Icon
                className={`w-4 h-4 shrink-0 transition-colors ${
                  isActive ? "text-[#C7A03A]" : "text-[#736455]/70"
                }`}
              />
              {!isCollapsed && <span className="truncate">{item.label}</span>}
            </div>

            {!isCollapsed && item.badge && (
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full shrink-0 ${item.badgeColor}`}
              >
                {item.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );

  return (
    <>
      {/* Botão de Menu Flutuante para Mobile */}
      <div className="md:hidden fixed top-3 left-3 z-50">
        <button
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className="w-11 h-11 rounded-2xl bg-[#1D3D3C] text-white shadow-lg border border-[#C7A03A]/40 flex items-center justify-center active:scale-95 transition-transform"
          aria-label={isMobileOpen ? "Fechar Menu" : "Abrir Menu"}
        >
          {isMobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Overlay para Mobile */}
      {isMobileOpen && (
        <div
          onClick={() => setIsMobileOpen(false)}
          className="md:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-xs"
        />
      )}

      {/* Sidebar Lateral Principal */}
      <aside
        className={`fixed md:sticky top-0 left-0 h-screen z-40 flex flex-col justify-between bg-[#FCF5EB] border-r border-[#D8D0BD] transition-all duration-300 shadow-sm relative overflow-hidden ${
          isCollapsed ? "w-20" : "w-64 sm:w-72"
        } ${isMobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}
      >
        {/* Marca d'água sutil de pattern no rodapé da Sidebar */}
        <div
          className="absolute -bottom-10 -right-10 w-44 h-44 opacity-15 pointer-events-none bg-pattern-gold-cream"
          aria-hidden="true"
        />

        {/* Topo: Logo & Perfil + Navegação com Scroll Suave */}
        <div className="flex-1 overflow-y-auto min-h-0 no-scrollbar sm:scrollbar-thin relative z-10">
          {/* Logo do Salão Oficial */}
          <div className="p-4 sm:p-5 border-b border-[#D8D0BD] bg-white/70 backdrop-blur-xs flex items-center justify-between">
            <div className="flex items-center space-x-3 overflow-hidden">
              <div className="w-10 h-10 rounded-2xl bg-[#1D3D3C] border border-[#C7A03A]/40 flex items-center justify-center p-2 shrink-0 shadow-xs">
                <img
                  src="/brand/Logotipo/Símbolo isolado/Símbolo dourado.svg"
                  alt="Gleicy Ronha Símbolo"
                  className="w-full h-full object-contain"
                />
              </div>

              {!isCollapsed && (
                <div className="leading-tight truncate">
                  <span className="block font-bold text-sm tracking-wider text-[#1D3D3C] uppercase font-sans">
                    GLEICY RONHA
                  </span>
                  <span className="text-[10px] text-[#80611F] font-bold tracking-widest uppercase block">
                    Espaço da Beleza
                  </span>
                </div>
              )}
            </div>

            {/* Botão de Colapsar (Desktop) */}
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="hidden md:flex w-7 h-7 rounded-xl bg-[#FAF7F2] hover:bg-[#EEE8DD] text-[#736455] items-center justify-center transition-colors border border-[#D8D0BD]"
              title={isCollapsed ? "Expandir Menu" : "Recolher Menu"}
            >
              {isCollapsed ? (
                <ChevronRight className="w-4 h-4" />
              ) : (
                <ChevronLeft className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* Navegação Principal Agrupada */}
          <nav className="px-3 py-3 space-y-3">
            {renderNavGroup("Operações", operationItems)}

            <div className="border-t border-[#D8D0BD]/70 my-2" />

            {renderNavGroup("Cadastros", registryItems)}
          </nav>
        </div>

        {/* Rodapé da Sidebar (Apenas Super Admin) */}
        {role === "super_admin" && (
          <div className="p-3 border-t border-[#D8D0BD] relative z-10 bg-white/60">
            <button
              onClick={() => {
                onSelectTab("saas");
                setIsMobileOpen(false);
              }}
              className={`w-full p-2 rounded-xl text-[11px] font-medium text-[#736455] hover:text-[#1D3D3C] hover:bg-[#EEE8DD] flex items-center transition-all ${
                isCollapsed ? "justify-center" : "justify-center space-x-1.5"
              }`}
              title="Acesso Thaua (Super Admin SaaS)"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-[#1D3D3C]" />
              {!isCollapsed && <span>Painel SaaS (Thaua)</span>}
            </button>
          </div>
        )}
      </aside>
    </>
  );
}
