"use client";

import { useState, useEffect } from "react";
import { Sparkles, Phone, Calendar, Menu, X, User } from "lucide-react";
import { SalonOrganization } from "@/types/salon";
import { SalonClient } from "@/types/client";

interface ClientNavbarProps {
  organization: SalonOrganization | null;
  activeClient: SalonClient | null;
  onOpenAuth: () => void;
  onScrollToSection: (sectionId: string) => void;
  onOpenMyProposals?: () => void;
}

export function ClientNavbar({
  organization,
  activeClient,
  onOpenAuth,
  onScrollToSection,
  onOpenMyProposals,
}: ClientNavbarProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  const whatsappNumber = organization?.phone
    ? organization.phone.replace(/\D/g, "")
    : "5511999999999";

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 48);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleNavClick = (sectionId: string) => {
    setIsMobileMenuOpen(false);
    onScrollToSection(sectionId);
  };

  const navLinks = [
    { id: "sobre", label: "Nossa História" },
    { id: "servicos", label: "Serviços & Valores" },
    { id: "metodo", label: "O Método" },
    { id: "espaco", label: "O Espaço" },
  ];

  return (
    <header className="sticky top-0 z-50 w-full">
      {/* Faixa superior anúncio */}
      <div className="bg-[#1D3D3C] text-[#FCF5EB] text-[10px] sm:text-xs py-1 px-3 sm:py-1.5 sm:px-4 text-center font-medium flex items-center justify-center gap-1.5 sm:gap-2 border-b border-[#C7A03A]/20 overflow-hidden">
        {/* Linha de brilho animada */}
        <span
          className="absolute inset-0 opacity-10"
          style={{
            background: "linear-gradient(90deg, transparent, #C7A03A, transparent)",
            backgroundSize: "200% 100%",
            animation: "shimmer 4s linear infinite",
          }}
        />
        <span className="w-1.5 h-1.5 rounded-full bg-[#C7A03A] animate-pulse shrink-0 relative z-10" />
        <span className="relative z-10 truncate max-w-[280px] xs:max-w-none">
          Atendimento individual · Agenda disponível este mês
        </span>
        <span className="hidden sm:inline text-[#C7A03A] relative z-10">·</span>
        <span className="hidden sm:inline font-gwendolyn text-base text-[#C7A03A] relative z-10">
          O cuidado que acolhe
        </span>
      </div>

      {/* Navbar principal — muda ao rolar */}
      <div
        className={`border-b transition-all duration-500 ${
          isScrolled
            ? "bg-[#FCF5EB]/97 backdrop-blur-xl border-[#D8D0BD] shadow-[0_4px_24px_rgba(29,61,60,0.08)]"
            : "bg-[#FCF5EB]/88 backdrop-blur-md border-[#D8D0BD]/60 shadow-none"
        }`}
      >
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 sm:h-[72px] flex items-center justify-between">

          {/* Logo Oficial da Marca */}
          <button
            onClick={() => handleNavClick("hero")}
            className="flex items-center space-x-3 text-left group focus:outline-none"
            aria-label="Espaço da Beleza Gleicy Ronha - Início"
          >
            {/* Logo horizontal verde profundo oficial em SVG */}
            <div className="relative overflow-hidden py-1 transition-transform duration-300 group-hover:scale-[1.02]">
              <img
                src="/brand/logo/logo-horizontal-verde.svg"
                alt="Espaço da Beleza Gleicy Ronha"
                width={220}
                height={48}
                className={`w-auto object-contain transition-all duration-300 ${
                  isScrolled ? "h-8 xs:h-9 sm:h-11" : "h-9 xs:h-10 sm:h-12"
                }`}
              />
            </div>
          </button>


          {/* Links Desktop com underline animado */}
          <nav className="hidden md:flex items-center space-x-7 text-sm font-sans font-medium text-[#736455]">
            {navLinks.map((link) => (
              <button
                key={link.id}
                onClick={() => handleNavClick(link.id)}
                className="nav-link-animated font-sans hover:text-[#1D3D3C] transition-colors duration-200 py-1"
              >
                {link.label}
              </button>
            ))}
          </nav>

          {/* CTAs Desktop */}
          <div className="hidden md:flex items-center space-x-2.5">
            <a
              href={`https://wa.me/${whatsappNumber}?text=Olá! Vi o site e gostaria de saber mais sobre os serviços.`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2.5 rounded-xl bg-[#F0EFE3] hover:bg-[#EEE8DD] border border-[#D8D0BD] text-[#1D3D3C] transition-all hover:border-[#1D3D3C]/30 font-sans"
              title="WhatsApp"
            >
              <Phone className="w-4 h-4" />
            </a>

            <button
              onClick={() => handleNavClick("agendar")}
              className="relative overflow-hidden px-5 py-2.5 rounded-xl bg-[#1D3D3C] text-[#FCF5EB] font-sans text-xs font-bold tracking-wide hover:bg-[#28504D] transition-all shadow-md hover:shadow-[0_4px_20px_rgba(29,61,60,0.3)] border border-[#C7A03A]/40 flex items-center space-x-1.5 group"
            >
              <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
              <Calendar className="w-3.5 h-3.5 text-[#C7A03A] relative z-10" />
              <span className="relative z-10">Agendar</span>
            </button>

            {activeClient ? (
              <div className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-[#F0EFE3] border border-[#D8D0BD] text-xs font-sans font-medium text-[#1D3D3C]">
                <div className="w-6 h-6 rounded-full bg-[#1D3D3C] text-[#C7A03A] flex items-center justify-center text-[10px] font-bold">
                  {activeClient.name.charAt(0).toUpperCase()}
                </div>
                <span className="max-w-[100px] truncate">{activeClient.name.split(" ")[0]}</span>
              </div>
            ) : (
              <button
                onClick={onOpenAuth}
                className="p-2.5 rounded-xl bg-[#F0EFE3] hover:bg-[#EEE8DD] border border-[#D8D0BD] text-[#736455] hover:text-[#1D3D3C] transition-all font-sans"
                title="Minha Proposta"
              >
                <User className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Botão Mobile */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2.5 rounded-xl bg-[#1D3D3C] text-white border border-[#C7A03A]/30 font-sans"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Menu Mobile */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-[#FCF5EB]/98 backdrop-blur-xl border-b border-[#D8D0BD] shadow-lg animate-fade-in">
          <div className="max-w-7xl mx-auto px-4 py-4 space-y-1">
            {navLinks.map((link) => (
              <button
                key={link.id}
                onClick={() => handleNavClick(link.id)}
                className="w-full text-left px-4 py-3 rounded-xl text-sm font-sans font-medium text-[#736455] hover:text-[#1D3D3C] hover:bg-[#F0EFE3] transition-all"
              >
                {link.label}
              </button>
            ))}
            <div className="pt-3 border-t border-[#D8D0BD]/60 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <a
                  href={`https://wa.me/${whatsappNumber}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-3 px-3 rounded-xl text-xs font-sans font-semibold text-[#1D3D3C] bg-[#F0EFE3] hover:bg-[#EEE8DD] border border-[#D8D0BD] text-center flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Phone className="w-3.5 h-3.5 text-[#1D3D3C]" />
                  <span>WhatsApp</span>
                </a>
                <button
                  onClick={() => handleNavClick("agendar")}
                  className="py-3 px-3 rounded-xl text-xs font-sans font-bold text-[#FCF5EB] bg-[#1D3D3C] hover:bg-[#28504D] border border-[#C7A03A]/40 text-center flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                >
                  <Calendar className="w-3.5 h-3.5 text-[#C7A03A]" />
                  <span>Agendar</span>
                </button>
              </div>

              {activeClient ? (
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    if (onOpenMyProposals) onOpenMyProposals();
                    else onOpenAuth();
                  }}
                  className="w-full py-2.5 px-4 rounded-xl text-xs font-sans font-semibold text-[#1D3D3C] bg-[#F0EFE3] border border-[#D8D0BD] flex items-center justify-center gap-2"
                >
                  <div className="w-5 h-5 rounded-full bg-[#1D3D3C] text-[#C7A03A] flex items-center justify-center text-[10px] font-bold">
                    {activeClient.name.charAt(0).toUpperCase()}
                  </div>
                  <span>{activeClient.name.split(" ")[0]} · Minhas Propostas</span>
                </button>
              ) : (
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onOpenAuth();
                  }}
                  className="w-full py-2.5 px-4 rounded-xl text-xs font-sans font-semibold text-[#736455] hover:text-[#1D3D3C] bg-white border border-[#D8D0BD] flex items-center justify-center gap-2 shadow-2xs"
                >
                  <User className="w-4 h-4 text-[#C7A03A]" />
                  <span>Acessar Minhas Propostas</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
