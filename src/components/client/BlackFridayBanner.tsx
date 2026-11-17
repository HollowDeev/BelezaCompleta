"use client";

import { useState, useEffect, useMemo } from "react";
import { BlackFridayCampaign, BlackFridayCampaignRow } from "@/types/blackFriday";
import { Sparkles, Clock, Calendar, ArrowRight, Zap } from "lucide-react";

export interface BlackFridayBannerProps {
  campaign: BlackFridayCampaign | BlackFridayCampaignRow;
  onCtaClick?: () => void;
}

export function BlackFridayBanner({ campaign, onCtaClick }: BlackFridayBannerProps) {
  const endsAt =
    (campaign as BlackFridayCampaign).endsAt ??
    (campaign as BlackFridayCampaignRow).ends_at;

  const restrictSchedule = Boolean(
    (campaign as BlackFridayCampaign).restrictSchedule ??
    (campaign as BlackFridayCampaignRow).restrict_schedule
  );

  const restrictedDates: string[] = useMemo(() => {
    const raw =
      (campaign as BlackFridayCampaign).restrictedDates ??
      (campaign as BlackFridayCampaignRow).restricted_dates;
    return Array.isArray(raw) ? raw : [];
  }, [campaign]);

  // Real-time countdown calculation with strict clamping (>= 0)
  const calculateTimeLeft = () => {
    if (!endsAt) {
      return { diff: 0, days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true };
    }

    const targetTime = new Date(endsAt).getTime();
    if (isNaN(targetTime)) {
      return { diff: 0, days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true };
    }

    const now = Date.now();
    const diff = Math.max(0, targetTime - now);
    const isExpired = diff <= 0;

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((diff / (1000 * 60)) % 60);
    const seconds = Math.floor((diff / 1000) % 60);

    return { diff, days, hours, minutes, seconds, isExpired };
  };

  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft);

  useEffect(() => {
    // Immediate compute to catch initial state
    setTimeLeft(calculateTimeLeft());

    const interval = setInterval(() => {
      const updated = calculateTimeLeft();
      setTimeLeft(updated);
      if (updated.isExpired) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [endsAt]);

  const handleCta = () => {
    if (onCtaClick) {
      onCtaClick();
      return;
    }
    const target = document.getElementById("servicos");
    if (target) {
      target.scrollIntoView({ behavior: "smooth" });
    }
  };

  const formattedRestrictedDates = useMemo(() => {
    if (!restrictedDates || restrictedDates.length === 0) return "";
    return restrictedDates
      .map((d) => {
        const parts = String(d).split("-");
        if (parts.length === 3) {
          return `${parts[2]}/${parts[1]}`;
        }
        return String(d);
      })
      .join(", ");
  }, [restrictedDates]);

  const pad = (n: number) => String(Math.max(0, n)).padStart(2, "0");

  return (
    <div
      role="banner"
      data-testid="black-friday-banner"
      className="sticky top-0 z-50 w-full bg-[#080F0E] text-[#FCF5EB] border-b border-[#C7A03A]/40 shadow-xl transition-all"
    >
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-2.5 lg:gap-4 text-center lg:text-left">
          
          {/* Tag Promocional + Mensagem de Impacto */}
          <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2 text-xs sm:text-sm">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#1D3D3C] text-[#C7A03A] border border-[#C7A03A]/50 font-black text-[10px] tracking-wider uppercase shadow-xs">
              <Sparkles className="w-3 h-3 text-[#C7A03A]" />
              <span>BLACK FRIDAY</span>
            </span>

            <span className="font-semibold text-white/95">
              Condições Exclusivas por Tempo Limitado!
            </span>

            {/* Aviso de Restrição de Agenda quando ativo */}
            {restrictSchedule && restrictedDates.length > 0 && (
              <span
                data-testid="schedule-restriction-notice"
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-950/80 text-[#D9B85F] border border-[#C7A03A]/60 text-[11px] font-medium"
              >
                <Zap className="w-3 h-3 text-[#C7A03A] shrink-0" />
                <span>
                  Agenda Especial: datas ({formattedRestrictedDates}) exclusivas para procedimentos Black Friday
                </span>
              </span>
            )}
          </div>

          {/* Countdown Timer + Botão CTA */}
          <div className="flex items-center justify-center gap-3 sm:gap-4 shrink-0">
            {/* Bloco de Contagem Regressiva */}
            <div
              data-testid="black-friday-countdown"
              className="flex items-center gap-1 sm:gap-1.5 text-xs font-mono font-bold bg-[#122B2A]/90 px-3 py-1.5 rounded-xl border border-[#C7A03A]/30 shadow-inner"
            >
              <Clock className="w-3.5 h-3.5 text-[#C7A03A] mr-1 shrink-0 hidden xs:inline" />
              
              <div className="flex flex-col items-center min-w-[20px]">
                <span data-testid="countdown-days" className="text-white text-xs sm:text-sm">
                  {pad(timeLeft.days)}
                </span>
                <span className="text-[8px] font-sans text-stone-400 uppercase -mt-0.5">d</span>
              </div>
              <span className="text-[#C7A03A] font-bold">:</span>

              <div className="flex flex-col items-center min-w-[20px]">
                <span data-testid="countdown-hours" className="text-white text-xs sm:text-sm">
                  {pad(timeLeft.hours)}
                </span>
                <span className="text-[8px] font-sans text-stone-400 uppercase -mt-0.5">h</span>
              </div>
              <span className="text-[#C7A03A] font-bold">:</span>

              <div className="flex flex-col items-center min-w-[20px]">
                <span data-testid="countdown-minutes" className="text-white text-xs sm:text-sm">
                  {pad(timeLeft.minutes)}
                </span>
                <span className="text-[8px] font-sans text-stone-400 uppercase -mt-0.5">m</span>
              </div>
              <span className="text-[#C7A03A] font-bold">:</span>

              <div className="flex flex-col items-center min-w-[20px]">
                <span data-testid="countdown-seconds" className="text-[#C7A03A] text-xs sm:text-sm">
                  {pad(timeLeft.seconds)}
                </span>
                <span className="text-[8px] font-sans text-stone-400 uppercase -mt-0.5">s</span>
              </div>

              {timeLeft.isExpired && (
                <span
                  data-testid="countdown-expired-badge"
                  className="ml-2 text-[10px] uppercase font-sans font-bold text-amber-400 bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-600/40"
                >
                  Encerrado
                </span>
              )}
            </div>

            {/* CTA Button */}
            <button
              type="button"
              onClick={handleCta}
              data-testid="black-friday-banner-cta"
              className="px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-gradient-to-r from-[#C7A03A] to-[#D9B85F] text-[#080F0E] text-xs font-bold uppercase tracking-wider hover:brightness-110 active:scale-95 transition-all shadow-md flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <span>Ver Ofertas</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
