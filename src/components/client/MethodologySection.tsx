"use client";

import Image from "next/image";
import { Sparkles, Shield, HeartHandshake, Coffee, CheckCircle2, ShieldCheck, ArrowRight } from "lucide-react";

export function MethodologySection() {
  const steps = [
    {
      step: "01",
      title: "Diagnóstico Capilar Real",
      desc: "Avaliamos a porosidade, elasticidade e histórico químico antes de qualquer tesoura ou pincel tocar seus fios.",
      icon: Shield,
      detail: "Teste de mecha incluso em procedimentos químicos.",
    },
    {
      step: "02",
      title: "Atenção Exclusiva",
      desc: "Durante o corte, desenho das mechas e tonalização, a atenção é 100% sua. Sem pressa e sem interrupções.",
      icon: HeartHandshake,
      detail: "Nenhuma etapa ativa é delegada a assistentes.",
    },
    {
      step: "03",
      title: "Pausas Acolhedoras",
      desc: "Enquanto a química ou o tratamento age no tempo exato, você descansa em um ambiente privativo e climatizado.",
      icon: Coffee,
      detail: "Café especial, chá e poltronas ergonômicas.",
    },
    {
      step: "04",
      title: "Consultoria Home Care",
      desc: "Você sai sabendo exatamente como manter a cor radiante, a curvatura viva e os fios saudáveis em casa.",
      icon: CheckCircle2,
      detail: "Prescrição personalizada de manutenção.",
    },
  ];

  return (
    <section
      id="metodo"
      className="relative overflow-hidden py-24 sm:py-32 bg-[#FCF5EB] border-b border-[#D8D0BD]"
    >
      {/* Grafismo 4 de canto orgânico decorativo */}
      <div className="absolute left-0 bottom-0 w-44 sm:w-60 h-60 opacity-20 pointer-events-none hidden md:block">
        <Image
          src="/brand/Grafismos/linha-grafismo-4.png"
          alt=""
          fill
          className="object-contain object-left-bottom"
        />
      </div>

      {/* Halo dourado sutil */}
      <div
        className="absolute top-0 right-0 w-96 h-96 opacity-15 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse, #C7A03A 0%, transparent 70%)",
          filter: "blur(70px)",
        }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* ---- Cabeçalho Centralizado ---- */}
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-16 animate-fade-up">
          <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-[#EFECE1] border border-[#D8D0BD] text-[#80611F] text-xs font-semibold uppercase tracking-widest shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-[#C7A03A]" />
            <span>O Método Gleicy Ronha · Excelência &amp; Cuidado</span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-bold text-[#1D3D3C] tracking-tight font-sans">
            Excelência técnica sem a frieza
            <br />
            <span className="font-gwendolyn text-4xl sm:text-5xl text-[#80611F] font-normal block mt-1">
              dos grandes salões
            </span>
          </h2>

          {/* Grafismo 1 - Linha curva de apoio */}
          <div className="relative w-44 sm:w-56 h-3 mx-auto pointer-events-none opacity-80">
            <Image
              src="/brand/Grafismos/linha-grafismo-1.png"
              alt=""
              fill
              className="object-contain"
            />
          </div>

          <p className="text-sm sm:text-base text-[#736455] leading-relaxed max-w-2xl mx-auto">
            Aqui você não é apenas mais um número em uma esteira de produção. Cada procedimento
            segue 4 etapas rigorosas para transformar com segurança absoluta e respeito à saúde do seu cabelo.
          </p>
        </div>

        {/* ---- Linha do Tempo Horizontal Compacta (4 Passos) ---- */}
        <div className="relative mb-16">
          {/* Linha conectora no Desktop */}
          <div className="hidden lg:block absolute top-7 left-14 right-14 h-0.5 bg-gradient-to-r from-[#C7A03A]/20 via-[#C7A03A]/60 to-[#C7A03A]/20 z-0" />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 relative z-10">
            {steps.map((s, idx) => {
              const Icon = s.icon;
              return (
                <div
                  key={s.step}
                  className="flex flex-col group animate-fade-up"
                  style={{ animationDelay: `${idx * 120 + 200}ms` }}
                >
                  {/* Topo: Ícone e Número */}
                  <div className="flex items-center justify-between sm:justify-start gap-4 mb-4">
                    <div className="w-14 h-14 rounded-2xl bg-[#1D3D3C] border-2 border-[#C7A03A]/70 flex items-center justify-center text-[#C7A03A] shadow-md group-hover:scale-105 group-hover:border-[#C7A03A] transition-all duration-300">
                      <Icon className="w-6 h-6" />
                    </div>
                    <div className="lg:hidden text-xs font-bold text-[#80611F] tracking-widest uppercase">
                      Passo {s.step}
                    </div>
                  </div>

                  {/* Card Compacto */}
                  <div className="flex-1 p-5 rounded-2xl bg-white border border-[#D8D0BD] shadow-sm hover:shadow-md transition-all duration-300 group-hover:-translate-y-1 flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="hidden lg:flex items-center justify-between">
                        <span className="text-xs font-bold text-[#80611F] tracking-widest uppercase">
                          Passo {s.step}
                        </span>
                        <span className="w-2 h-2 rounded-full bg-[#C7A03A]" />
                      </div>

                      <h3 className="text-base font-bold text-[#1D3D3C] font-sans">
                        {s.title}
                      </h3>

                      <p className="text-xs text-[#736455] leading-relaxed">
                        {s.desc}
                      </p>
                    </div>

                    {/* Detalhe sutil */}
                    <div className="mt-4 pt-3 border-t border-[#D8D0BD]/60">
                      <p className="text-[11px] text-[#707956] font-medium leading-tight flex items-start gap-1.5">
                        <span className="text-[#C7A03A] font-bold">✓</span>
                        <span>{s.detail}</span>
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ---- Card de Compromisso Inegociável ---- */}
        <div className="relative rounded-3xl bg-[#1D3D3C] text-[#FCF5EB] border border-[#C7A03A]/30 p-6 sm:p-8 shadow-xl overflow-hidden">
          {/* Fundo com padrão sutil */}
          <div className="absolute inset-0 bg-pattern-gold-green opacity-[0.06] pointer-events-none" />

          {/* Halo dourado */}
          <div
            className="absolute top-0 right-0 w-72 h-72 opacity-15 pointer-events-none"
            style={{
              background: "radial-gradient(circle, #C7A03A 0%, transparent 70%)",
              filter: "blur(50px)",
            }}
          />

          <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-[#C7A03A]/20 border border-[#C7A03A]/50 flex items-center justify-center text-[#C7A03A] shrink-0">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[#D9B85F] uppercase tracking-wider">
                    Compromisso Inegociável
                  </span>
                  <span className="hidden sm:inline-block w-1.5 h-1.5 rounded-full bg-[#C7A03A]" />
                  <span className="hidden sm:inline-block text-xs text-[#E5DFD1]">
                    Saúde Capilar Primeiro
                  </span>
                </div>
                <h4 className="text-lg sm:text-xl font-bold text-[#FCF5EB] font-sans">
                  Se o cabelo não passar no teste de mecha, nós não descolorimos.
                </h4>
                <p className="text-xs sm:text-sm text-[#E5DFD1] leading-relaxed max-w-3xl">
                  Transparência absoluta: indicaremos primeiro o cronograma reconstrutor para preparar
                  a fibra capilar. Você nunca terá fios quebrados ou danificados por negligência.
                </p>
              </div>
            </div>

            <div className="shrink-0 flex items-center gap-3 w-full lg:w-auto justify-end">
              <a
                href="#agendamento"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-[#C7A03A] text-[#122B2A] text-xs font-bold uppercase tracking-wider hover:bg-[#D9B85F] transition-all shadow-md"
              >
                <span>Agendar Avaliação</span>
                <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
