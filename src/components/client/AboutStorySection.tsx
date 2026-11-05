"use client";

import { Sparkles, Heart, CheckCircle2, Award, Users } from "lucide-react";

export function AboutStorySection() {
  const values = [
    {
      number: "01",
      title: "Autenticidade",
      desc: "Respeitamos a sua curvatura natural e sua história. Acreditamos que a beleza não segue um padrão rígido, mas expressa a sua personalidade.",
      icon: Heart,
      accent: "#C7A03A",
    },
    {
      number: "02",
      title: "Excelência Técnica",
      desc: "Aperfeiçoamento constante com as melhores técnicas de mechas, cortes estruturados e saúde capilar, utilizando produtos de padrão internacional.",
      icon: Award,
      accent: "#707956",
    },
    {
      number: "03",
      title: "Acolhimento Genuíno",
      desc: "Da chegada à despedida: ambiente com carinho, café aconchegante, massagem relaxante no lavatório e zero correria no seu atendimento.",
      icon: CheckCircle2,
      accent: "#1D3D3C",
    },
    {
      number: "04",
      title: "Reconhecimento & Equipe",
      desc: "Um espaço construído a muitas mãos, que valoriza cada profissional parceira e honra a confiança das clientes que compartilham nossa trajetória.",
      icon: Users,
      accent: "#80611F",
    },
  ];

  /* Linha do tempo da trajetória */
  const timeline = [
    {
      year: "2013",
      title: "O Primeiro Passo",
      desc: "Aos 13 anos, Gleicy faz seu primeiro curso técnico e começa a realizar sonhos com as bonecas e amigas.",
    },
    {
      year: "2016",
      title: "A Garagem",
      desc: "Com a garagem dos pais adaptada, começa a atender clientes reais e a construir sua reputação de cuidado e excelência.",
    },
    {
      year: "2019",
      title: "O Salão Comercial",
      desc: "Conquista o primeiro espaço comercial próprio. Cada detalhe pensado para refletir sofisticação e acolhimento.",
    },
    {
      year: "2022",
      title: "Expansão & Equipe",
      desc: "Amplia o espaço para acolher profissionais talentosas, criando um centro multidisciplinar de beleza de alto padrão.",
    },
    {
      year: "Hoje",
      title: "Referência & Legado",
      desc: "Um espaço de referência onde técnica de ponta caminha lado a lado com o afeto e a atenção individualizada.",
    },
  ];

  return (
    <section
      id="sobre"
      className="relative overflow-hidden py-24 sm:py-32 bg-[#FCF5EB] border-b border-[#D8D0BD]"
    >
      {/* Grafismo Oficial 2 (Linha Orgânica Horizontal) no topo/divisor */}
      <div
        className="absolute top-4 left-1/2 -translate-x-1/2 w-full max-w-4xl h-10 opacity-30 pointer-events-none select-none"
        style={{
          backgroundImage: "url('/brand/Grafismos/Linha grafismo 2.png')",
          backgroundRepeat: "no-repeat",
          backgroundPosition: "center",
          backgroundSize: "contain",
        }}
      />

      {/* Grafismo Oficial 4 (Canto Orgânico) no canto inferior esquerdo */}
      <div
        className="absolute -bottom-8 -left-8 w-48 h-64 opacity-20 pointer-events-none select-none"
        style={{
          backgroundImage: "url('/brand/Grafismos/Linha grafismo 4.png')",
          backgroundRepeat: "no-repeat",
          backgroundSize: "contain",
        }}
      />

      {/* Halo de luz dourada */}
      <div
        className="absolute top-24 right-0 w-80 h-80 opacity-20 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse, #C7A03A 0%, transparent 70%)",
          filter: "blur(60px)",
        }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">

        {/* ---- Cabeçalho da Seção ---- */}
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-20 animate-fade-up">
          <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-white border border-[#D8D0BD] text-[#80611F] text-xs font-semibold uppercase tracking-widest shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-[#C7A03A]" />
            <span>Nossa História &amp; Essência</span>
          </div>
          <h2 className="font-editorial text-3xl sm:text-5xl font-bold text-[#1D3D3C] tracking-tight">
            Os cabelos foram o começo.
            <br />
            <span className="text-shimmer-gold">As pessoas deram sentido.</span>
          </h2>
          <p className="text-sm sm:text-base text-[#736455] leading-relaxed">
            Conheça a trajetória de quem transformou a vocação de infância em um espaço de referência,
            onde a técnica de ponta caminha lado a lado com o afeto.
          </p>
        </div>


        {/* ---- Foto + Texto Biográfico ---- */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center mb-24">

          {/* Foto com blob orgânico */}
          <div className="lg:col-span-5 animate-slide-left animation-delay-200">
            <div className="relative mx-auto max-w-sm lg:max-w-none">
              {/* Sombra blob verde */}
              <div
                className="absolute inset-6 -z-10 opacity-25"
                style={{
                  background: "#1D3D3C",
                  filter: "blur(30px)",
                  borderRadius: "55% 45% 40% 60% / 50% 60% 40% 50%",
                }}
              />
              {/* Imagem com moldura editorial elegante */}
              <div
                className="relative overflow-hidden border-2 border-[#D8D0BD]/80 aspect-[4/5] shadow-2xl rounded-[32px] sm:rounded-[40px] bg-[#FCF5EB]"
              >
                <img
                  src="/brand/gleicy_atendimento.png"
                  alt="Gleicy Ronha em atendimento real no salão"
                  className="w-full h-full object-cover object-center"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#1D3D3C]/90 via-[#1D3D3C]/15 to-transparent" />
                <div className="absolute bottom-7 left-7 right-7 text-[#FCF5EB]">
                  <span className="font-gwendolyn text-3xl sm:text-4xl text-[#C7A03A] block">
                    Gleicy Ronha
                  </span>
                  <span className="text-xs uppercase tracking-widest font-semibold text-stone-300">
                    Fundadora &amp; Especialista Capilar · Salto - SP
                  </span>
                </div>
              </div>

              {/* Selos flutuantes */}
              <div
                className="absolute -bottom-5 -right-3 w-[88px] h-[88px] rounded-full bg-[#1D3D3C] border-2 border-[#C7A03A] shadow-xl flex flex-col items-center justify-center text-center"
                style={{ animation: "floatSlow 8s ease-in-out infinite" }}
              >
                <span className="text-[9px] font-bold text-[#C7A03A] uppercase tracking-wider">Desde</span>
                <span className="font-editorial text-xl font-bold text-white leading-none">2013</span>
                <span className="text-[8px] text-stone-300">Dedicação</span>
              </div>
            </div>
          </div>

          {/* Texto + Quote */}
          <div className="lg:col-span-7 space-y-6 text-[#736455] text-sm sm:text-base leading-relaxed animate-slide-right animation-delay-300">
            <h3 className="font-editorial text-2xl sm:text-3xl font-bold text-[#1D3D3C] leading-snug">
              Da garagem dos pais ao salão acolhedor: uma jornada feita de aprendizado e superação.
            </h3>

            <p>
              Antes de ter um salão próprio, Gleicy tinha as bonecas, os cabelos das amigas e a
              vontade incansável de aprender. Aos 13 anos, realizou seu primeiro curso técnico.
              Ainda precisaria de tempo, persistência e da confiança de quem lhe abriu as primeiras
              portas para acreditar plenamente no próprio potencial.
            </p>

            <p>
              Da garagem adaptada dos pais até a conquista do salão comercial, cada etapa foi
              marcada por recomeços, noites de estudo e cursos de especialização com mestres das
              cores e curvaturas.
            </p>

            <p>
              Em 2022, Gleicy deu mais um passo decisivo: ampliou o espaço para acolher outras
              profissionais talentosas, criando um centro multidisciplinar de beleza sem jamais
              perder a atenção individualizada que tornou o seu trabalho inconfundível.
            </p>

            {/* Quote com acento dourado */}
            <div className="p-5 rounded-2xl bg-white/80 backdrop-blur border border-[#D8D0BD] shadow-sm space-y-2 border-l-4 border-l-[#C7A03A]">
              <p className="font-editorial text-[#1D3D3C] font-semibold text-base italic leading-relaxed">
                "Para quem valoriza qualidade, o cuidado faz parte do resultado.
                Queremos que você encontre aqui a tranquilidade de estar em boas mãos
                e o prazer de dedicar um momento a si mesma."
              </p>
              <span className="text-xs font-bold text-[#80611F] block uppercase tracking-wider">
                — Gleicy Ronha
              </span>
            </div>
          </div>
        </div>

        {/* =======================================
            LINHA DO TEMPO DA TRAJETÓRIA HORIZONTAL & COMPACTA
            ======================================= */}
        <div className="mb-20 sm:mb-24 animate-fade-up animation-delay-400">
          <div className="text-center mb-10 sm:mb-12">
            <span className="text-xs font-bold uppercase tracking-widest text-[#80611F] block mb-2 font-sans">
              Uma trajetória de dedicação
            </span>
            <h3 className="font-editorial text-2xl sm:text-3xl font-bold text-[#1D3D3C]">
              A história por trás do espaço
            </h3>
          </div>

          {/* Trilho Horizontal Contínuo */}
          <div className="relative">
            {/* Scroll Container para mobile com scroll suave / Grid compacto no desktop */}
            <div className="overflow-x-auto pb-4 pt-2 -mx-4 px-4 sm:mx-0 sm:px-0 sm:overflow-visible scrollbar-none">
              {/* Trilho relativo: no desktop grid com 5 colunas, no mobile flex com min-w para cada card */}
              <div className="relative min-w-[760px] md:min-w-0 md:grid md:grid-cols-5 md:gap-4 flex gap-3">
                {/* Linha conectora dourada contínua no desktop (atrás dos pontos luminosos) */}
                <div 
                  className="hidden md:block absolute top-[19px] left-[10%] right-[10%] h-[2px] -z-0 pointer-events-none"
                  style={{
                    background: "linear-gradient(90deg, #C7A03A 0%, #D9B85F 50%, #80611F 100%)",
                    boxShadow: "0 0 10px rgba(199, 160, 58, 0.4)",
                  }}
                />

                {timeline.map((item, idx) => {
                  const isCurrent = item.year === "Hoje";
                  return (
                    <div
                      key={idx}
                      className="relative flex-1 min-w-[210px] md:min-w-0 flex flex-col items-center group"
                    >
                      {/* Ponto Luminoso & Marcador de Ano */}
                      <div className="relative z-10 flex flex-col items-center mb-4">
                        {/* Ponto luminoso com anel pulsante */}
                        <div className="relative flex items-center justify-center">
                          <div 
                            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                              isCurrent 
                                ? "bg-[#1D3D3C] text-[#C7A03A] ring-4 ring-[#C7A03A]/40 shadow-lg scale-105" 
                                : "bg-white text-[#80611F] border-2 border-[#C7A03A] group-hover:bg-[#1D3D3C] group-hover:text-[#FCF5EB] shadow-sm"
                            }`}
                          >
                            <div className={`w-3.5 h-3.5 rounded-full ${isCurrent ? "bg-[#C7A03A] animate-pulse" : "bg-[#C7A03A] group-hover:bg-[#D9B85F]"}`} />
                          </div>

                          {/* Aura de brilho dourado */}
                          <div 
                            className="absolute -inset-1 rounded-full opacity-30 group-hover:opacity-75 blur-sm transition-opacity duration-300 pointer-events-none"
                            style={{ background: "#C7A03A" }}
                          />
                        </div>

                        {/* Tag do ano */}
                        <span 
                          className={`mt-2 px-2.5 py-0.5 rounded-full text-xs font-bold font-sans tracking-wider transition-colors duration-300 ${
                            isCurrent
                              ? "bg-[#1D3D3C] text-[#C7A03A] border border-[#C7A03A]/50 shadow-sm"
                              : "bg-[#F0EFE3] text-[#80611F] border border-[#D8D0BD] group-hover:border-[#C7A03A]/60"
                          }`}
                        >
                          {item.year}
                        </span>
                      </div>

                      {/* Card compacto com conteúdo */}
                      <div 
                        className={`w-full flex-1 rounded-2xl p-4 sm:p-5 transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between border ${
                          isCurrent
                            ? "bg-gradient-to-b from-white to-[#FDF8EE] border-[#C7A03A]/60 shadow-[0_8px_20px_rgba(199,160,58,0.12)] ring-1 ring-[#C7A03A]/30"
                            : "bg-white/90 backdrop-blur-sm border-[#D8D0BD] hover:border-[#C7A03A]/50 shadow-sm hover:shadow-md"
                        }`}
                      >
                        <div>
                          <h4 className="font-editorial text-sm sm:text-base font-bold text-[#1D3D3C] mb-2 leading-snug group-hover:text-[#80611F] transition-colors">
                            {item.title}
                          </h4>
                          <p className="text-xs text-[#736455] leading-relaxed">
                            {item.desc}
                          </p>
                        </div>

                        {/* Acento inferior sutil */}
                        <div 
                          className={`mt-3 h-0.5 rounded-full w-8 transition-all duration-300 ${
                            isCurrent ? "w-12 bg-[#C7A03A]" : "bg-[#D8D0BD] group-hover:w-10 group-hover:bg-[#C7A03A]"
                          }`} 
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Dica de rolagem sutil no mobile */}
            <div className="flex md:hidden items-center justify-center gap-1.5 mt-2 text-[11px] text-[#80611F] font-medium font-sans">
              <span>← Deslize horizontalmente para navegar na linha do tempo →</span>
            </div>
          </div>
        </div>

        {/* ---- Os 4 Valores Fundamentais ---- */}
        <div className="pt-8 border-t border-[#D8D0BD]/70">
          <div className="text-center max-w-xl mx-auto mb-12 animate-fade-up">
            <span className="text-xs font-bold uppercase tracking-widest text-[#80611F] block mb-2">
              Pilares de Atuação
            </span>
            <h3 className="font-editorial text-2xl sm:text-3xl font-bold text-[#1D3D3C]">
              O que orienta cada detalhe do seu atendimento
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map((v, idx) => {
              const Icon = v.icon;
              return (
                <div
                  key={v.number}
                  className={`relative overflow-hidden bg-white p-6 rounded-3xl border border-[#D8D0BD] shadow-sm hover:shadow-lg transition-all duration-400 space-y-4 group hover:-translate-y-1.5 animate-fade-up animation-delay-${(idx * 100) + 200}`}
                >
                  {/* Watermark numérico de fundo */}
                  <span
                    className="absolute -bottom-3 -right-2 text-8xl font-bold font-editorial leading-none select-none pointer-events-none transition-opacity duration-300 group-hover:opacity-8"
                    style={{ color: v.accent, opacity: 0.05 }}
                  >
                    {v.number}
                  </span>

                  {/* Linha colorida superior */}
                  <div className="absolute top-0 left-6 right-6 h-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ background: v.accent }} />

                  <div className="flex items-center justify-between relative z-10">
                    <span className="text-xs font-extrabold font-editorial tracking-widest" style={{ color: v.accent }}>
                      {v.number}
                    </span>
                    <div
                      className="w-10 h-10 rounded-2xl flex items-center justify-center text-[#1D3D3C] group-hover:text-white transition-colors duration-300"
                      style={{
                        background: `${v.accent}18`,
                      }}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                  </div>

                  <h4 className="font-editorial text-lg font-bold text-[#1D3D3C] relative z-10">{v.title}</h4>
                  <p className="text-xs text-[#736455] leading-relaxed relative z-10">{v.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Onda de transição inferior */}
      <div className="absolute bottom-0 left-0 right-0 overflow-hidden leading-none pointer-events-none">
        <svg viewBox="0 0 1440 70" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" className="w-full h-16">
          <path
            d="M0,40 C360,70 720,10 1080,40 C1260,55 1380,30 1440,40 L1440,70 L0,70 Z"
            fill="#FCF5EB"
            fillOpacity="1"
          />
        </svg>
      </div>
    </section>
  );
}
