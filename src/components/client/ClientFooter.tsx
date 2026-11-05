"use client";

import Link from "next/link";
import {
  Phone,
  MapPin,
  Clock,
  ArrowUp,
  Lock,
  InstagramLogo,
  WhatsappLogo,
} from "@phosphor-icons/react";
import { SalonOrganization } from "@/types/salon";

interface ClientFooterProps {
  organization: SalonOrganization | null;
  onScrollToSection: (sectionId: string) => void;
}

export function ClientFooter({ organization, onScrollToSection }: ClientFooterProps) {
  const whatsappNumber = organization?.phone
    ? organization.phone.replace(/\D/g, "")
    : "5511995975725";

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const navLinks = [
    { id: "hero", label: "Início" },
    { id: "sobre", label: "Nossa História & Valores" },
    { id: "servicos", label: "Serviços, Valores & Inclusos" },
    { id: "metodo", label: "O Método de Atendimento" },
    { id: "espaco", label: "O Espaço & Equipe" },
    { id: "agendar", label: "Agendamento Online" },
  ];

  return (
    <>
      {/* Onda de entrada do Footer */}
      <div className="overflow-hidden leading-none bg-[#E5DFD1] relative">
        <svg
          viewBox="0 0 1440 80"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="none"
          className="w-full h-16 sm:h-20 block"
        >
          <path
            d="M0,40 C240,80 480,10 720,45 C960,78 1200,15 1440,50 L1440,80 L0,80 Z"
            fill="#122B2A"
          />
        </svg>
      </div>

      <footer className="bg-[#122B2A] text-[#FCF5EB] relative overflow-hidden font-sans">
        {/* Padrão dourado no verde escuro */}
        <div className="absolute inset-0 bg-pattern-gold-green opacity-[0.14] pointer-events-none" />

        {/* Elementos decorativos internos */}
        <div
          className="absolute top-0 right-0 w-96 h-96 opacity-10 pointer-events-none"
          style={{
            background: "radial-gradient(ellipse, #C7A03A 0%, transparent 65%)",
            filter: "blur(60px)",
          }}
        />
        <div
          className="absolute bottom-0 left-0 w-64 h-64 opacity-10 pointer-events-none"
          style={{
            background: "radial-gradient(ellipse, #D3D0B5 0%, transparent 65%)",
            filter: "blur(60px)",
          }}
        />

        {/* Faixa do slogan cursivo */}
        <div className="relative border-b border-white/10 py-8 px-4 text-center overflow-hidden">
          {/* Linha de brilho ao longo da borda inferior */}
          <div
            className="absolute bottom-0 left-0 right-0 h-px opacity-30"
            style={{
              background: "linear-gradient(90deg, transparent, #C7A03A 30%, #C7A03A 70%, transparent)",
            }}
          />
          <p className="font-gwendolyn text-3xl sm:text-5xl text-shimmer-gold relative z-10">
            O cuidado que acolhe. A beleza que encanta.
          </p>
          <div className="mt-3 flex items-center justify-center space-x-3 opacity-40">
            <div className="h-px w-24 bg-[#C7A03A]" />
            <div className="w-1.5 h-1.5 rounded-full bg-[#C7A03A]" />
            <div className="h-px w-24 bg-[#C7A03A]" />
          </div>
        </div>

        {/* Corpo do Footer */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-8">

            {/* Coluna 1: Identidade */}
            <div className="space-y-5 lg:col-span-1">
              <div className="block">
                <img
                  src="/brand/Logotipo/Símbolo + assinatura/Logo horizontal creme.svg"
                  alt="Espaço da Beleza Gleicy Ronha"
                  className="h-11 sm:h-12 w-auto object-contain"
                />
              </div>

              <p className="text-xs text-stone-300 leading-relaxed font-sans">
                Cuidado capilar com atenção individualizada, mechas seguras, saúde da fibra e ambiente
                acolhedor. Sofisticação com proximidade.
              </p>

              {/* Redes Sociais com ícones Phosphor */}
              <div className="flex items-center space-x-2.5">
                <a
                  href={`https://wa.me/${whatsappNumber}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 rounded-xl bg-white/10 hover:bg-[#C7A03A] hover:text-[#122B2A] text-white flex items-center justify-center transition-all border border-white/10 hover:border-[#C7A03A]"
                  title="WhatsApp"
                >
                  <WhatsappLogo className="w-4 h-4" weight="bold" />
                </a>
                <a
                  href="https://instagram.com/espacogleicyronha"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 rounded-xl bg-white/10 hover:bg-[#C7A03A] hover:text-[#122B2A] text-white flex items-center justify-center transition-all border border-white/10 hover:border-[#C7A03A]"
                  title="Instagram"
                >
                  <InstagramLogo className="w-4 h-4" weight="bold" />
                </a>
                <a
                  href={`tel:+5511995975725`}
                  className="w-9 h-9 rounded-xl bg-white/10 hover:bg-[#C7A03A] hover:text-[#122B2A] text-white flex items-center justify-center transition-all border border-white/10 hover:border-[#C7A03A]"
                  title="Telefone"
                >
                  <Phone className="w-4 h-4" weight="bold" />
                </a>
              </div>
            </div>

            {/* Coluna 2: Navegação */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-widest text-[#C7A03A] font-sans">
                Navegação
              </h4>
              <ul className="space-y-2.5">
                {navLinks.map((link) => (
                  <li key={link.id}>
                    <button
                      onClick={() => onScrollToSection(link.id)}
                      className="text-xs font-sans text-stone-300 hover:text-white transition-colors nav-link-animated text-left"
                    >
                      {link.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Coluna 3: Horários */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-widest text-[#C7A03A] font-sans">
                Horário &amp; Atendimento
              </h4>
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 rounded-xl bg-[#C7A03A]/15 border border-[#C7A03A]/25 flex items-center justify-center shrink-0">
                    <Clock className="w-4 h-4 text-[#C7A03A]" weight="regular" />
                  </div>
                  <div className="text-xs font-sans">
                    <strong className="block text-white">Terça a Sábado</strong>
                    <span className="text-stone-300">09:00 às 19:00</span>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                    <Clock className="w-4 h-4 text-stone-500" weight="regular" />
                  </div>
                  <div className="text-xs font-sans">
                    <strong className="block text-stone-400">Domingos e Segundas</strong>
                    <span className="text-stone-500">Fechado · Folga Técnica</span>
                  </div>
                </div>

                {/* Badge de status */}
                <div className="flex items-center space-x-2 px-3 py-2 rounded-xl bg-emerald-950/50 border border-emerald-800/40 text-xs font-sans mt-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                  <span className="text-emerald-400 font-medium">Agenda aberta este mês</span>
                </div>
              </div>
            </div>

            {/* Coluna 4: Localização & Contato */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-widest text-[#C7A03A] font-sans">
                Localização &amp; Contato
              </h4>
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 rounded-xl bg-[#C7A03A]/15 border border-[#C7A03A]/25 flex items-center justify-center shrink-0">
                    <MapPin className="w-4 h-4 text-[#C7A03A]" weight="fill" />
                  </div>
                  <div className="text-xs font-sans">
                    <span className="block text-white font-medium">{organization?.name || "Espaço da Beleza Gleicy Ronha"}</span>
                    <span className="text-stone-300">{organization?.address || "Av. Brasília, 996 - Jardim Saltense"}</span>
                    <span className="block text-[11px] text-stone-400 mt-0.5">
                      {organization?.city && organization?.state ? `${organization.city} - ${organization.state}` : "Salto - SP"}
                    </span>
                    <a
                      href="https://www.google.com/search?kgmid=/g/11t3195br_&q=Espa%C3%A7o+Gleicy+Ronha"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-[#C7A03A] hover:underline font-semibold block mt-1"
                    >
                      Abrir no Google Maps ↗
                    </a>
                  </div>
                </div>

                <a
                  href={`https://wa.me/${whatsappNumber}?text=Olá%20Gleicy!%20Gostaria%20de%20agendar%20um%20horário.`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="relative overflow-hidden flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-[#C7A03A] text-[#122B2A] text-xs font-bold font-sans uppercase tracking-wider hover:bg-[#d9b85f] transition-all shadow-lg hover:shadow-[0_4px_20px_rgba(199,160,58,0.4)] group"
                >
                  <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                  <WhatsappLogo className="w-4 h-4 relative z-10" weight="bold" />
                  <span className="relative z-10">WhatsApp: {organization?.phone || "(11) 99597-5725"}</span>
                </a>
              </div>
            </div>
          </div>

          {/* Rodapé inferior */}
          <div className="mt-14 pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 font-sans">
            <div className="text-xs text-stone-400 text-center sm:text-left">
              <span>© 2026 {organization?.name || "Espaço da Beleza Gleicy Ronha"} · Todos os direitos reservados.</span>
            </div>

            <div className="flex items-center space-x-4">
              <Link
                href="/login"
                className="text-stone-500 hover:text-stone-300 transition-colors flex items-center space-x-1.5 text-xs group"
              >
                <Lock className="w-3.5 h-3.5 text-stone-600 group-hover:text-stone-400 transition-colors" weight="bold" />
                <span>Acesso Administrativo</span>
              </Link>

              <button
                onClick={scrollToTop}
                className="w-9 h-9 rounded-xl bg-white/10 hover:bg-[#C7A03A] hover:text-[#122B2A] text-white transition-all flex items-center justify-center border border-white/10"
                title="Voltar ao Topo"
              >
                <ArrowUp className="w-4 h-4" weight="bold" />
              </button>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
