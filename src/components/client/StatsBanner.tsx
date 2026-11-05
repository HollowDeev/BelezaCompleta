"use client";

interface StatsBannerProps {
  onBookNow: () => void;
}

export function StatsBanner({ onBookNow }: StatsBannerProps) {
  const stats = [
    { value: "12+", label: "Anos de excelência", suffix: "" },
    { value: "2.000", label: "Clientes atendidas", suffix: "+" },
    { value: "98", label: "Satisfação das clientes", suffix: "%" },
    { value: "0", label: "Químicas sem teste de mecha", suffix: "" },
  ];

  return (
    <section className="relative overflow-hidden py-14 sm:py-18 bg-[#1D3D3C]">
      {/* Pattern Oficial Dourado sobre Fundo Verde-Profundo */}
      <div className="absolute inset-0 bg-pattern-gold-green opacity-[0.16] pointer-events-none" />

      {/* Blob de luz dourada */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-36 opacity-30 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse, #C7A03A, transparent 70%)",
          filter: "blur(36px)",
        }}
      />


      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-4">
          {stats.map((s, idx) => (
            <div
              key={idx}
              className={`text-center space-y-1 animate-fade-up animation-delay-${idx * 100 + 100} group`}
            >
              {/* Linha dourada decorativa sobre o número */}
              <div className="flex justify-center mb-3">
                <div className="h-px w-10 bg-[#C7A03A]/40 group-hover:w-16 transition-all duration-500" />
              </div>

              <div className="flex items-end justify-center gap-0.5">
                <span className="text-4xl sm:text-5xl font-bold font-editorial text-shimmer-gold leading-none">
                  {s.value}
                </span>
                <span className="text-xl sm:text-2xl font-bold text-[#C7A03A] pb-1">{s.suffix}</span>
              </div>
              <p className="text-xs sm:text-sm text-stone-300 font-medium leading-snug">{s.label}</p>

              {/* Linha dourada decorativa abaixo do label */}
              <div className="flex justify-center pt-2">
                <div className="h-px w-10 bg-[#C7A03A]/30 group-hover:w-14 transition-all duration-500" />
              </div>
            </div>
          ))}
        </div>

        {/* CTA Central */}
        <div className="mt-12 text-center">
          <button
            onClick={onBookNow}
            className="relative overflow-hidden inline-flex items-center gap-2.5 px-8 py-4 rounded-2xl bg-transparent text-[#C7A03A] text-sm font-bold tracking-wide border-2 border-[#C7A03A]/60 hover:bg-[#C7A03A] hover:text-[#122B2A] transition-all duration-300 group"
          >
            <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
            <span className="relative z-10">Agende Seu Horário &amp; Faça Parte Desta História</span>
          </button>
        </div>
      </div>
    </section>
  );
}
