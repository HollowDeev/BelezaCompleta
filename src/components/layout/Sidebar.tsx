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
  Eye,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  Sparkles,
  Sliders,
  Users,
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
  | "saas";

interface SidebarProps {
  currentTab: AdminTab;
  onSelectTab: (tab: AdminTab) => void;
  onViewAsClient: () => void;
  pendingTriageCount: number;
  pendingPreReservationsCount?: number;
}

export function Sidebar({
  currentTab,
  onSelectTab,
  onViewAsClient,
  pendingTriageCount,
  pendingPreReservationsCount = 0,
}: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const operationItems = [
    {
      id: "operacao" as AdminTab,
      label: "Operação do Dia",
      icon: Zap,
      badge: "Hoje",
      badgeColor: "bg-emerald-100 text-emerald-800",
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
      badgeColor: "bg-amber-100 text-amber-900 font-bold animate-pulse",
    },
    {
      id: "triagens" as AdminTab,
      label: "Fila de Triagens",
      icon: ClipboardList,
      badge: pendingTriageCount > 0 ? `${pendingTriageCount}` : undefined,
      badgeColor: "bg-amber-100 text-amber-900 font-bold animate-pulse",
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
  ];

  const renderNavGroup = (title: string, items: typeof operationItems) => (
    <div className="space-y-1">
      {!isCollapsed && (
        <div className="px-3 pt-3 pb-1">
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#AD841D]/90 block">
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
            onClick={() => {
              onSelectTab(item.id);
              setIsMobileOpen(false);
            }}
            title={item.label}
            className={`w-full p-2.5 sm:p-3 rounded-2xl text-xs font-semibold flex items-center transition-all ${
              isActive
                ? "bg-[#2D1914] text-white shadow-sm"
                : "text-[#5E372C] hover:bg-[#FAF7F2] hover:text-[#2D1914]"
            } ${isCollapsed ? "justify-center" : "justify-between"}`}
          >
            <div className="flex items-center space-x-3 truncate">
              <Icon
                className={`w-4 h-4 shrink-0 ${
                  isActive ? "text-[#DBAE3B]" : "text-stone-400"
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
      <div className="md:hidden fixed top-4 left-4 z-50">
        <button
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className="p-2.5 rounded-2xl bg-[#2D1914] text-white shadow-lg border border-[#C59B27]/40 flex items-center justify-center"
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
        className={`fixed md:sticky top-0 left-0 h-screen z-40 flex flex-col justify-between bg-white border-r border-[#E7DCCE] transition-all duration-300 shadow-xs ${
          isCollapsed ? "w-20" : "w-64 sm:w-72"
        } ${isMobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}
      >
        {/* Topo: Logo & Perfil */}
        <div>
          {/* Logo do Salão */}
          <div className="p-5 border-b border-[#E7DCCE]/60 flex items-center justify-between">
            <div className="flex items-center space-x-3 overflow-hidden">
              <div className="w-10 h-10 rounded-2xl chocolate-gradient flex items-center justify-center text-[#DBAE3B] shrink-0 shadow-sm">
                <Scissors className="w-5 h-5" />
              </div>

              {!isCollapsed && (
                <div className="leading-tight truncate">
                  <span className="block font-bold text-sm tracking-wider text-[#2D1914] uppercase">
                    GLEICY RONHA
                  </span>
                  <span className="text-[10px] text-[#AD841D] font-bold tracking-widest uppercase block">
                    Espaço da Beleza
                  </span>
                </div>
              )}
            </div>

            {/* Botão de Colapsar (Desktop) */}
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="hidden md:flex w-7 h-7 rounded-xl bg-[#FAF7F2] hover:bg-[#F3ECE1] text-[#5E372C] items-center justify-center transition-colors border border-[#E7DCCE]"
              title={isCollapsed ? "Expandir Menu" : "Recolher Menu"}
            >
              {isCollapsed ? (
                <ChevronRight className="w-4 h-4" />
              ) : (
                <ChevronLeft className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* Badge da Profissional Ativa */}
          {!isCollapsed && (
            <div className="p-4 mx-3 my-3 rounded-2xl bg-[#FAF7F2] border border-[#E7DCCE]/70 flex items-center space-x-3">
              <div className="w-9 h-9 rounded-full bg-[#5E372C] text-[#DBAE3B] flex items-center justify-center font-bold text-xs shrink-0">
                GR
              </div>
              <div className="truncate">
                <div className="flex items-center gap-1">
                  <span className="font-bold text-xs text-[#2D1914] truncate">Gleicy Ronha</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                </div>
                <span className="text-[10px] text-[#7B493B] block font-medium truncate">
                  Master em Cachos & Cor
                </span>
              </div>
            </div>
          )}

          {/* Navegação Principal Agrupada */}
          <nav className="px-3 py-2 space-y-3">
            {renderNavGroup("Operações", operationItems)}

            <div className="border-t border-[#E7DCCE]/60 my-2" />

            {renderNavGroup("Cadastros", registryItems)}
          </nav>
        </div>

        {/* Rodapé da Sidebar: Ver Como Cliente & Super Admin */}
        <div className="p-3 border-t border-[#E7DCCE]/60 space-y-1.5">
          {/* Botão de Ver Como Cliente */}
          <button
            onClick={() => {
              onViewAsClient();
              setIsMobileOpen(false);
            }}
            className={`w-full p-2.5 rounded-2xl text-xs font-semibold text-[#44271F] bg-[#FAF7F2] hover:bg-[#F3ECE1] border border-[#E7DCCE] flex items-center transition-all ${
              isCollapsed ? "justify-center" : "justify-center space-x-2"
            }`}
            title="Abrir a tela pública do catálogo e agendamento da cliente"
          >
            <Eye className="w-3.5 h-3.5 text-[#C59B27]" />
            {!isCollapsed && <span>Ver Como Cliente</span>}
          </button>

          {/* Atalho Super Admin Thaua */}
          <button
            onClick={() => {
              onSelectTab("saas");
              setIsMobileOpen(false);
            }}
            className={`w-full p-2 rounded-xl text-[11px] font-medium text-stone-500 hover:text-stone-800 hover:bg-stone-100 flex items-center transition-all ${
              isCollapsed ? "justify-center" : "justify-center space-x-1.5"
            }`}
            title="Acesso Thaua (Super Admin SaaS)"
          >
            <ShieldCheck className="w-3 h-3 text-blue-500" />
            {!isCollapsed && <span>Painel SaaS (Thaua)</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
