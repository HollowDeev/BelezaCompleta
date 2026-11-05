"use client";

import Image from "next/image";

import {
  Coffee,
  SpeakerHigh,
  Snowflake,
  Car,
  WifiHigh,
  Plant,
  Sparkle,
  Scissors,
  Star,
  Phone,
  Clock,
  MapPin,
} from "@phosphor-icons/react";
import { SalonOrganization } from "@/types/salon";

interface TeamAndSpaceSectionProps {
  organization?: SalonOrganization | null;
  whatsappNumber?: string;
  onBookHair: () => void;
}

export function TeamAndSpaceSection({
  organization,
  whatsappNumber = "5511995975725",
  onBookHair,
}: TeamAndSpaceSectionProps) {
  const specialties = [
    {
      title: "Cuidado Capilar & Mechas",
      lead: "Gleicy Ronha",
      badge: "Especialidade Principal",
      description:
        "Especialista em mechas, loiros saudáveis, curvaturas e cronograma reconstrutor de alta performance.",
      actionText: "Agendar Cabelo Online",
      isOnlineBooking: true,
      image: "/brand/gleicy_atendimento.png",
      highlight: true,
    },
    {
      title: "Unhas & Spa das Mãos",
      lead: "Equipe Especializada",
      badge: "Parceira do Espaço",
      description:
        "Manicure russa, esmaltação em gel e spa com produtos nutritivos e esterilização hospitalar.",
      actionText: "Consultar no WhatsApp",
      isOnlineBooking: false,
      image:
        "https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&q=80&w=700",
      highlight: false,
    },
    {
      title: "Sobrancelhas & Olhar",
      lead: "Equipe Especializada",
      badge: "Parceira do Espaço",
      description:
        "Design estratégico, visagismo facial, henna orgânica e laminação para harmonização natural.",
      actionText: "Consultar no WhatsApp",
      isOnlineBooking: false,
      image:
        "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&q=80&w=700",
      highlight: false,
    },
  ];

  const comforts = [
    { icon: Coffee, title: "Café & Chá", desc: "Bebidas selecionadas e artesanais à disposição" },
    { icon: SpeakerHigh, title: "Ambiente Sonoro", desc: "Playlist cuidadosamente selecionada para relaxar" },
    { icon: Snowflake, title: "Climatização", desc: "Temperatura controlada para o seu conforto total" },
    { icon: Car, title: "Estacionamento", desc: "Vaga privativa e fácil acesso ao espaço" },
    { icon: WifiHigh, title: "Wi-Fi Exclusivo", desc: "Conectividade rápida durante todo o atendimento" },
    { icon: Plant, title: "Aromaterapia", desc: "Ambiente aromatizado com óleos essenciais naturais" },
  ];

  return (
    <section id="espaco" className="relative overflow-hidden py-24 sm:py-32 bg-[#ECE8DC] border-b border-[#D8D0BD] font-sans">
      {/* Grafismo lateral decorativo */}
      <div className="absolute right-0 top-1/4 w-36 sm:w-48 h-96 opacity-20 pointer-events-none hidden lg:block">
        <Image
          src="/brand/Grafismos/Linha grafismo 3.png"
          alt=""
          fill
          className="object-contain object-right"
        />
      </div>

      {/* Halo decorativo */}
      <div
        className="absolute -bottom-20 -right-20 w-96 h-96 opacity-15 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse, #1D3D3C 0%, transparent 70%)",
          filter: "blur(70px)",
        }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">

        {/* Cabeçalho */}
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-16 animate-fade-up">
          <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-[#F5EFE6] border border-[#D8D0BD] text-[#80611F] text-xs font-semibold uppercase tracking-widest shadow-sm">
            <Sparkle weight="fill" className="w-3.5 h-3.5 text-[#C7A03A]" />
            <span>O Espaço &amp; Especialidades</span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-bold text-[#1D3D3C] tracking-tight font-sans">
            Diferentes talentos reunidos em{" "}
            <span className="text-[#80611F]">um único ambiente acolhedor</span>
          </h2>

          {/* Grafismo 1 - Linha sutil de apoio sob o título */}
          <div className="relative w-44 sm:w-56 h-3 mx-auto pointer-events-none opacity-80">
            <Image
              src="/brand/Grafismos/Linha grafismo 1.png"
              alt=""
              fill
              className="object-contain"
            />
          </div>

          <p className="text-sm sm:text-base text-[#736455] leading-relaxed max-w-2xl mx-auto">
            O Espaço da Beleza Gleicy Ronha expandiu para acolher diferentes profissionais de excelência.
            Aqui você encontra praticidade e conforto para cuidar de si por completo.
          </p>
        </div>

        {/* Grid de Especialidades */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-20">
          {specialties.map((item, idx) => (
            <div
              key={idx}
              className={`relative bg-white rounded-3xl border overflow-hidden shadow-sm hover:shadow-xl transition-all duration-400 flex flex-col group hover:-translate-y-2 animate-fade-up animation-delay-${(idx * 150) + 200} ${
                item.highlight ? "border-[#C7A03A]/40 md:scale-[1.02]" : "border-[#D8D0BD]"
              }`}
            >
              {/* Badge de destaque */}
              {item.highlight && (
                <div className="absolute top-4 right-4 z-20 px-3 py-1 rounded-full bg-[#C7A03A] text-[#122B2A] text-[10px] font-bold uppercase tracking-wider shadow-md flex items-center gap-1">
                  <Star className="w-3 h-3 fill-current" />
                  <span>Principal</span>
                </div>
              )}

              {/* Imagem */}
              <div className="relative h-64 w-full overflow-hidden bg-[#EEE8DD]">
                <img
                  src={item.image}
                  alt={item.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#1D3D3C]/80 via-[#1D3D3C]/10 to-transparent" />
                <div className="absolute bottom-5 left-5 right-5 text-[#FCF5EB]">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-[#C7A03A] block">
                    {item.lead}
                  </span>
                  <h3 className="font-editorial text-xl font-bold text-white">{item.title}</h3>
                </div>
              </div>

              {/* Body */}
              <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                <p className="text-xs sm:text-sm text-[#736455] leading-relaxed">{item.description}</p>

                {item.isOnlineBooking ? (
                  <button
                    onClick={onBookHair}
                    className="relative overflow-hidden w-full py-3 px-4 rounded-xl bg-[#1D3D3C] text-[#FCF5EB] text-xs font-bold uppercase tracking-wider hover:bg-[#28504D] transition-all shadow-sm flex items-center justify-center space-x-2 border border-[#C7A03A]/40 group/btn"
                  >
                    <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-700" />
                    <Scissors className="w-4 h-4 text-[#C7A03A] relative z-10" />
                    <span className="relative z-10">{item.actionText}</span>
                  </button>
                ) : (
                  <a
                    href={`https://wa.me/${whatsappNumber}?text=Olá! Gostaria de saber mais sobre os serviços de *${encodeURIComponent(item.title)}*.`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-3 px-4 rounded-xl bg-[#F0EFE3] text-[#1D3D3C] hover:bg-[#EEE8DD] text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center space-x-2 border border-[#D8D0BD]"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>{item.actionText}</span>
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* ---- Grid de Comodidades ---- */}
        <div className="mb-20 animate-fade-up animation-delay-400">
          <div className="text-center mb-10">
            <span className="text-xs font-bold uppercase tracking-widest text-[#80611F] block mb-2">
              O conforto que você merece
            </span>
            <h3 className="font-editorial text-2xl sm:text-3xl font-bold text-[#1D3D3C]">
              Cada detalhe pensado para você
            </h3>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {comforts.map((c, idx) => {
              const Icon = c.icon;
              return (
                <div
                  key={idx}
                  className={`p-4 rounded-2xl bg-white/95 backdrop-blur-sm border border-[#D8D0BD] text-center space-y-2.5 hover:border-[#C7A03A]/60 hover:shadow-lg transition-all duration-300 hover:-translate-y-1.5 group animate-fade-up animation-delay-${(idx * 100) + 300}`}
                >
                  <div className="w-12 h-12 mx-auto rounded-2xl bg-[#F0EFE3] border border-[#D8D0BD]/70 flex items-center justify-center text-[#80611F] group-hover:bg-[#1D3D3C] group-hover:text-[#D9B85F] group-hover:scale-110 transition-all duration-300 shadow-sm">
                    <Icon className="w-6 h-6" weight="duotone" />
                  </div>
                  <div className="text-xs font-bold text-[#1D3D3C] font-sans">{c.title}</div>
                  <div className="text-[11px] text-[#736455] leading-snug hidden sm:block font-sans">{c.desc}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ---- Banner Dark Verde com Foto Real do Espaço ---- */}
        <div className="rounded-3xl bg-[#1D3D3C] text-[#FCF5EB] border border-[#C7A03A]/25 shadow-2xl relative overflow-hidden animate-fade-up animation-delay-500 font-sans">
          <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch">
            {/* Foto Real do Salão */}
            <div className="lg:col-span-5 relative min-h-[300px] lg:min-h-full">
              <img
                src="/brand/espaco_real.png"
                alt="Espaço da Beleza Gleicy Ronha - Interior do Salão em Salto SP"
                className="w-full h-full object-cover object-center"
              />
              <div className="absolute inset-0 bg-gradient-to-t lg:bg-gradient-to-r from-[#1D3D3C]/80 via-transparent to-transparent" />
              <div className="absolute bottom-4 left-4 right-4 text-xs bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 w-fit text-stone-200">
                <span>Fotografia Real do Espaço · {organization?.address || "Av. Brasília, 996"}, {organization?.city || "Salto"} {organization?.state || "SP"}</span>
              </div>
            </div>

            {/* Texto & Horários */}
            <div className="lg:col-span-7 p-8 sm:p-10 space-y-5 flex flex-col justify-between">
              <div className="space-y-3">
                <span className="font-gwendolyn text-3xl sm:text-4xl text-shimmer-gold block">
                  Seu refúgio de autocuidado
                </span>
                <h3 className="font-editorial text-2xl sm:text-3xl font-bold tracking-tight leading-tight">
                  Um espaço pensado para você desacelerar e se encantar.
                </h3>
                <p className="text-xs sm:text-sm text-stone-300 leading-relaxed font-sans">
                  Poltronas anatômicas, lavatórios de massagem, ozonioterapia capilar, climatização suave e bebidas selecionadas.
                  Aqui você não divide sua atenção com barulho ou pressa: sua visita é um momento especial
                  de pausa e renovação.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="p-3.5 rounded-2xl bg-white/10 backdrop-blur border border-white/10 flex items-center space-x-3 text-xs">
                  <div className="w-8 h-8 rounded-xl bg-[#C7A03A]/20 border border-[#C7A03A]/30 flex items-center justify-center shrink-0">
                    <Clock className="w-4 h-4 text-[#C7A03A]" weight="regular" />
                  </div>
                  <div>
                    <strong className="block text-white font-bold">Atendimento</strong>
                    <span className="text-stone-300">Ter a Sáb · 09:00 às 19:00</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-white/10 backdrop-blur border border-white/10 flex items-center space-x-3 text-xs">
                  <div className="w-8 h-8 rounded-xl bg-[#C7A03A]/20 border border-[#C7A03A]/30 flex items-center justify-center shrink-0">
                    <MapPin className="w-4 h-4 text-[#C7A03A]" weight="fill" />
                  </div>
                  <div>
                    <strong className="block text-white font-bold">{organization?.city && organization?.state ? `${organization.city} - ${organization.state}` : "Salto - SP"}</strong>
                    <span className="text-stone-300">{organization?.address || "Av. Brasília, 996 · Jd. Saltense"}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Onda de transição */}
      <div className="absolute bottom-0 left-0 right-0 overflow-hidden leading-none pointer-events-none">
        <svg viewBox="0 0 1440 60" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" className="w-full h-14">
          <path d="M0,30 C480,60 960,0 1440,30 L1440,60 L0,60 Z" fill="#122B2A" fillOpacity="0.15" />
        </svg>
      </div>
    </section>
  );
}
