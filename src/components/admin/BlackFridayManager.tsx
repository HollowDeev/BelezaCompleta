"use client";

import { useState, useEffect, useMemo } from "react";
import { SalonOrganization } from "@/types/salon";
import { ServiceItem } from "@/types/service";
import {
  BlackFridayCampaign,
  BlackFridayDiscountType,
  BlackFridayServiceConfig,
  ProgressiveDiscountTier,
} from "@/types/blackFriday";
import { SupabaseDataService } from "@/lib/supabase/api";
import { getServiceBlackFridayPrice } from "@/lib/services/blackFridayPricing";
import { formatBRL } from "@/lib/utils";
import {
  Sparkles,
  Calendar,
  Tag,
  Check,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Plus,
  Trash2,
  X,
  RefreshCw,
  Save,
  Percent,
  DollarSign,
  Clock,
  Layers,
  CalendarCheck,
  ShieldCheck,
  Sliders,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
} from "lucide-react";

export interface BlackFridayManagerProps {
  organization: SalonOrganization | null;
  services: ServiceItem[];
  onRefresh?: () => void;
}

const MONTH_NAMES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

const WEEK_DAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function formatDisplayDateOnly(dateStr?: string): string {
  if (!dateStr) return "";
  try {
    const [y, m, d] = dateStr.split("-");
    if (!y || !m || !d) return dateStr;
    return `${d}/${m}/${y}`;
  } catch {
    return dateStr;
  }
}

function formatDisplayDateTime(dt?: string): string {
  if (!dt) return "";
  try {
    const [dPart, tPart] = dt.split("T");
    if (!dPart) return "";
    const [y, m, d] = dPart.split("-");
    return `${d}/${m}/${y}${tPart ? ` às ${tPart}` : ""}`;
  } catch {
    return dt;
  }
}

function toDateTimeLocal(isoString?: string | null): string {
  if (!isoString) return "";
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return "";
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const h = String(d.getHours()).padStart(2, "0");
    const min = String(d.getMinutes()).padStart(2, "0");
    return `${y}-${m}-${day}T${h}:${min}`;
  } catch {
    return "";
  }
}

function toISOStringOrNull(dateTimeLocal?: string | null): string | null {
  if (!dateTimeLocal || !dateTimeLocal.trim()) return null;
  try {
    const d = new Date(dateTimeLocal);
    if (isNaN(d.getTime())) return null;
    return d.toISOString();
  } catch {
    return null;
  }
}

export function BlackFridayManager({
  organization,
  services,
  onRefresh,
}: BlackFridayManagerProps) {
  // Campaign ID (if existing)
  const [campaignId, setCampaignId] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState("Black Friday");
  const [isActive, setIsActive] = useState(false);
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [restrictSchedule, setRestrictSchedule] = useState(false);
  const [restrictedDates, setRestrictedDates] = useState<string[]>([]);
  const [newRestrictedDate, setNewRestrictedDate] = useState("");

  // Accordion toggle states
  const [isPeriodAccordionOpen, setIsPeriodAccordionOpen] = useState(true);
  const [isScheduleAccordionOpen, setIsScheduleAccordionOpen] = useState(false);

  // Month navigation for calendars
  const [periodYearMonth, setPeriodYearMonth] = useState<{ year: number; month: number }>(() => {
    return { year: 2026, month: 11 };
  });
  const [scheduleYearMonth, setScheduleYearMonth] = useState<{ year: number; month: number }>(() => {
    return { year: 2026, month: 11 };
  });

  // Time inputs for period range
  const [startTime, setStartTime] = useState("00:00");
  const [endTime, setEndTime] = useState("23:59");
  const [todayStr, setTodayStr] = useState("");

  useEffect(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    setTodayStr(`${y}-${m}-${day}`);
  }, []);

  // Progressive discounts
  const [hasProgressive, setHasProgressive] = useState(false);
  const [progressiveTiers, setProgressiveTiers] = useState<ProgressiveDiscountTier[]>([]);
  const [newTierMinServices, setNewTierMinServices] = useState<number>(2);
  const [newTierDiscountPercent, setNewTierDiscountPercent] = useState<number>(10);

  // Services configuration (serviceId -> BlackFridayServiceConfig)
  const [servicesConfigMap, setServicesConfigMap] = useState<
    Map<string, BlackFridayServiceConfig>
  >(new Map());

  // UI States
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [serviceSearch, setServiceSearch] = useState("");

  // Load existing campaign on mount
  useEffect(() => {
    let isMounted = true;
    async function loadCampaign() {
      if (!organization?.id) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const campaign = await SupabaseDataService.getBlackFridayCampaign(
          organization.id
        );

        if (isMounted && campaign) {
          setCampaignId(campaign.id);
          setName(campaign.name || "Black Friday");
          setIsActive(Boolean(campaign.isActive));
          const loadedStartsAt = toDateTimeLocal(campaign.startsAt);
          const loadedEndsAt = toDateTimeLocal(campaign.endsAt);
          setStartsAt(loadedStartsAt);
          setEndsAt(loadedEndsAt);
          if (loadedStartsAt) {
            const [dPart, tPart] = loadedStartsAt.split("T");
            if (tPart) setStartTime(tPart);
            if (dPart) {
              const [y, m] = dPart.split("-");
              if (y && m) {
                const parsedYear = parseInt(y, 10);
                const parsedMonth = parseInt(m, 10);
                setPeriodYearMonth({ year: parsedYear, month: parsedMonth });
                setScheduleYearMonth({ year: parsedYear, month: parsedMonth });
              }
            }
          }
          if (loadedEndsAt) {
            const [, tPart] = loadedEndsAt.split("T");
            if (tPart) setEndTime(tPart);
          }
          setRestrictSchedule(Boolean(campaign.restrictSchedule));
          setRestrictedDates(campaign.restrictedDates || []);

          if (campaign.servicesConfig && Array.isArray(campaign.servicesConfig)) {
            const map = new Map<string, BlackFridayServiceConfig>();
            campaign.servicesConfig.forEach((cfg) => {
              if (cfg.serviceId) {
                map.set(cfg.serviceId, {
                  serviceId: cfg.serviceId,
                  discountType: cfg.discountType || "percentage",
                  discountValue: cfg.discountValue ?? 0,
                  blackPrice: cfg.blackPrice,
                });
              }
            });
            setServicesConfigMap(map);
          }

          if (
            campaign.progressiveDiscount?.tiers &&
            campaign.progressiveDiscount.tiers.length > 0
          ) {
            setHasProgressive(true);
            setProgressiveTiers(campaign.progressiveDiscount.tiers);
          } else {
            setHasProgressive(false);
            setProgressiveTiers([]);
          }
        }
      } catch (err) {
        console.error("Erro ao carregar campanha da Black Friday:", err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadCampaign();

    return () => {
      isMounted = false;
    };
  }, [organization?.id]);

  // Temporary campaign draft for dynamic price preview
  const previewCampaign = useMemo<BlackFridayCampaign>(() => {
    return {
      id: campaignId || "preview-id",
      orgId: organization?.id || "",
      name,
      isActive: true, // evaluated as active in admin preview
      startsAt: toISOStringOrNull(startsAt),
      endsAt: toISOStringOrNull(endsAt),
      restrictSchedule,
      restrictedDates,
      servicesConfig: Array.from(servicesConfigMap.values()),
      progressiveDiscount:
        hasProgressive && progressiveTiers.length > 0
          ? { tiers: progressiveTiers }
          : null,
    };
  }, [
    campaignId,
    organization?.id,
    name,
    startsAt,
    endsAt,
    restrictSchedule,
    restrictedDates,
    servicesConfigMap,
    hasProgressive,
    progressiveTiers,
  ]);

  // Date range validation
  const dateRangeError = useMemo(() => {
    if (startsAt && endsAt) {
      const s = new Date(startsAt).getTime();
      const e = new Date(endsAt).getTime();
      if (!isNaN(s) && !isNaN(e) && e <= s) {
        return "A data de término deve ser posterior à data de início da campanha.";
      }
    }
    return null;
  }, [startsAt, endsAt]);

  // Handler: Add restricted date
  const handleAddRestrictedDate = () => {
    if (!newRestrictedDate) return;
    if (restrictedDates.includes(newRestrictedDate)) {
      setFeedbackMsg({
        type: "error",
        text: "Esta data já está incluída na lista de agendamentos restritos.",
      });
      setTimeout(() => setFeedbackMsg(null), 4000);
      return;
    }
    const updated = [...restrictedDates, newRestrictedDate].sort();
    setRestrictedDates(updated);
    setNewRestrictedDate("");
  };

  // Handler: Remove restricted date
  const handleRemoveRestrictedDate = (dateToRemove: string) => {
    setRestrictedDates((prev) => prev.filter((d) => d !== dateToRemove));
  };

  // Split dates for range comparison
  const startDateOnly = useMemo(() => {
    return startsAt ? startsAt.split("T")[0] || "" : "";
  }, [startsAt]);

  const endDateOnly = useMemo(() => {
    return endsAt ? endsAt.split("T")[0] || "" : "";
  }, [endsAt]);

  // Handler: Click a date in the Period calendar
  const handleSelectPeriodDay = (dateStr: string) => {
    if (!startDateOnly || (startDateOnly && endDateOnly)) {
      setStartsAt(`${dateStr}T${startTime || "00:00"}`);
      setEndsAt("");
    } else {
      if (dateStr < startDateOnly) {
        setStartsAt(`${dateStr}T${startTime || "00:00"}`);
      } else {
        setEndsAt(`${dateStr}T${endTime || "23:59"}`);
      }
    }
  };

  const handleSetQuickPeriod = (startD: string, endD: string) => {
    setStartsAt(`${startD}T${startTime || "00:00"}`);
    setEndsAt(`${endD}T${endTime || "23:59"}`);
    const [y, m] = startD.split("-");
    if (y && m) {
      setPeriodYearMonth({ year: parseInt(y, 10), month: parseInt(m, 10) });
    }
  };

  const handleStartTimeChange = (val: string) => {
    setStartTime(val);
    if (startDateOnly) {
      setStartsAt(`${startDateOnly}T${val || "00:00"}`);
    }
  };

  const handleEndTimeChange = (val: string) => {
    setEndTime(val);
    if (endDateOnly) {
      setEndsAt(`${endDateOnly}T${val || "23:59"}`);
    }
  };

  // Toggle restricted date
  const handleToggleRestrictedDate = (dateStr: string) => {
    setRestrictedDates((prev) => {
      if (prev.includes(dateStr)) {
        return prev.filter((d) => d !== dateStr);
      }
      return [...prev, dateStr].sort();
    });
  };

  // Copy period dates to restricted dates
  const handleCopyPeriodToRestricted = () => {
    if (!startDateOnly) {
      setFeedbackMsg({
        type: "error",
        text: "Defina o período de vigência da Black Friday primeiro.",
      });
      setTimeout(() => setFeedbackMsg(null), 3000);
      return;
    }
    const end = endDateOnly || startDateOnly;
    const startObj = new Date(`${startDateOnly}T12:00:00`);
    const endObj = new Date(`${end}T12:00:00`);
    const newDates = new Set(restrictedDates);

    const curr = new Date(startObj);
    while (curr <= endObj) {
      const y = curr.getFullYear();
      const m = String(curr.getMonth() + 1).padStart(2, "0");
      const d = String(curr.getDate()).padStart(2, "0");
      newDates.add(`${y}-${m}-${d}`);
      curr.setDate(curr.getDate() + 1);
    }

    setRestrictedDates(Array.from(newDates).sort());
    setRestrictSchedule(true);
    setFeedbackMsg({
      type: "success",
      text: `${newDates.size} datas copiadas para a agenda exclusiva da Black Friday!`,
    });
    setTimeout(() => setFeedbackMsg(null), 3500);
  };

  // Select Tuesday to Saturday for current schedule month
  const handleSelectTuesdayToSaturday = () => {
    const { year, month } = scheduleYearMonth;
    const daysCount = new Date(year, month, 0).getDate();
    const newDates = new Set(restrictedDates);

    for (let day = 1; day <= daysCount; day++) {
      const dt = new Date(year, month - 1, day);
      const dayOfWeek = dt.getDay(); // 0 Dom, 1 Seg, 2 Ter, 3 Qua, 4 Qui, 5 Sex, 6 Sab
      if (dayOfWeek >= 2 && dayOfWeek <= 6) {
        const padM = String(month).padStart(2, "0");
        const padD = String(day).padStart(2, "0");
        newDates.add(`${year}-${padM}-${padD}`);
      }
    }

    setRestrictedDates(Array.from(newDates).sort());
    setRestrictSchedule(true);
  };

  // Select all month for schedule
  const handleSelectWholeMonthSchedule = () => {
    const { year, month } = scheduleYearMonth;
    const daysCount = new Date(year, month, 0).getDate();
    const newDates = new Set(restrictedDates);

    for (let day = 1; day <= daysCount; day++) {
      const padM = String(month).padStart(2, "0");
      const padD = String(day).padStart(2, "0");
      newDates.add(`${year}-${padM}-${padD}`);
    }

    setRestrictedDates(Array.from(newDates).sort());
    setRestrictSchedule(true);
  };

  // Handler: Add progressive discount tier
  const handleAddTier = () => {
    if (newTierMinServices < 2) {
      setFeedbackMsg({
        type: "error",
        text: "A quantidade mínima de serviços para o tier deve ser no mínimo 2.",
      });
      setTimeout(() => setFeedbackMsg(null), 4000);
      return;
    }
    if (newTierDiscountPercent <= 0 || newTierDiscountPercent > 100) {
      setFeedbackMsg({
        type: "error",
        text: "O percentual de desconto deve estar entre 1% e 100%.",
      });
      setTimeout(() => setFeedbackMsg(null), 4000);
      return;
    }
    if (progressiveTiers.some((t) => t.minServices === newTierMinServices)) {
      setFeedbackMsg({
        type: "error",
        text: `Já existe um tier cadastrado para ${newTierMinServices} serviços.`,
      });
      setTimeout(() => setFeedbackMsg(null), 4000);
      return;
    }

    const updated = [
      ...progressiveTiers,
      {
        minServices: newTierMinServices,
        discountPercent: newTierDiscountPercent,
      },
    ].sort((a, b) => a.minServices - b.minServices);

    setProgressiveTiers(updated);
    setNewTierMinServices(updated[updated.length - 1].minServices + 1);
  };

  // Handler: Remove progressive discount tier
  const handleRemoveTier = (minServices: number) => {
    setProgressiveTiers((prev) =>
      prev.filter((t) => t.minServices !== minServices)
    );
  };

  // Handler: Toggle service participation
  const handleToggleService = (service: ServiceItem) => {
    setServicesConfigMap((prev) => {
      const next = new Map(prev);
      if (next.has(service.id)) {
        next.delete(service.id);
      } else {
        // Default: 20% off
        const defaultDiscountPercent = 20;
        const computedBlackPrice = Math.max(
          0,
          Math.round((service.price * (1 - defaultDiscountPercent / 100)) * 100) / 100
        );
        next.set(service.id, {
          serviceId: service.id,
          discountType: "percentage",
          discountValue: defaultDiscountPercent,
          blackPrice: computedBlackPrice,
        });
      }
      return next;
    });
  };

  // Handler: Update service discount configuration
  const handleUpdateServiceConfig = (
    service: ServiceItem,
    discountType: BlackFridayDiscountType,
    val: number
  ) => {
    setServicesConfigMap((prev) => {
      const next = new Map(prev);
      const safeVal = Math.max(0, val);
      let blackPrice = service.price;
      let discountValue = safeVal;

      if (discountType === "percentage") {
        const clampedPct = Math.min(100, safeVal);
        discountValue = clampedPct;
        blackPrice = Math.max(
          0,
          Math.round((service.price * (1 - clampedPct / 100)) * 100) / 100
        );
      } else if (discountType === "fixed") {
        discountValue = safeVal;
        blackPrice = Math.max(
          0,
          Math.round((service.price - safeVal) * 100) / 100
        );
      } else if (discountType === "manual") {
        blackPrice = safeVal;
        discountValue = Math.max(
          0,
          Math.round((service.price - safeVal) * 100) / 100
        );
      }

      next.set(service.id, {
        serviceId: service.id,
        discountType,
        discountValue,
        blackPrice,
      });
      return next;
    });
  };

  // Select / Deselect all services
  const handleSelectAllServices = () => {
    const next = new Map<string, BlackFridayServiceConfig>();
    services.forEach((s) => {
      const existing = servicesConfigMap.get(s.id);
      if (existing) {
        next.set(s.id, existing);
      } else {
        const defaultDiscountPercent = 20;
        const computedBlackPrice = Math.max(
          0,
          Math.round((s.price * (1 - defaultDiscountPercent / 100)) * 100) / 100
        );
        next.set(s.id, {
          serviceId: s.id,
          discountType: "percentage",
          discountValue: defaultDiscountPercent,
          blackPrice: computedBlackPrice,
        });
      }
    });
    setServicesConfigMap(next);
  };

  const handleDeselectAllServices = () => {
    setServicesConfigMap(new Map());
  };

  // Save campaign
  const handleSaveCampaign = async () => {
    if (!organization?.id) {
      setFeedbackMsg({
        type: "error",
        text: "Identificador da organização não encontrado.",
      });
      setTimeout(() => setFeedbackMsg(null), 4000);
      return;
    }

    if (dateRangeError) {
      setFeedbackMsg({
        type: "error",
        text: dateRangeError,
      });
      setTimeout(() => setFeedbackMsg(null), 4000);
      return;
    }

    setIsSaving(true);
    setFeedbackMsg(null);

    const payload: Partial<BlackFridayCampaign> = {
      orgId: organization.id,
      name: name.trim() || "Black Friday",
      isActive,
      startsAt: toISOStringOrNull(startsAt),
      endsAt: toISOStringOrNull(endsAt),
      restrictSchedule,
      restrictedDates: [...restrictedDates].sort(),
      servicesConfig: Array.from(servicesConfigMap.values()),
      progressiveDiscount:
        hasProgressive && progressiveTiers.length > 0
          ? { tiers: progressiveTiers }
          : null,
    };

    try {
      if (campaignId) {
        const updated = await SupabaseDataService.updateBlackFridayCampaign(
          campaignId,
          payload
        );
        if (updated) {
          setCampaignId(updated.id);
        }
      } else {
        const created = await SupabaseDataService.createBlackFridayCampaign(
          payload
        );
        if (created?.id) {
          setCampaignId(created.id);
        }
      }

      setFeedbackMsg({
        type: "success",
        text: "Configurações da Black Friday salvas com sucesso!",
      });

      if (onRefresh) {
        onRefresh();
      }
    } catch (err: any) {
      console.error("Erro ao salvar campanha:", err);
      setFeedbackMsg({
        type: "error",
        text: err?.message || "Ocorreu um erro ao salvar a campanha.",
      });
    } finally {
      setIsSaving(false);
      setTimeout(() => setFeedbackMsg(null), 4000);
    }
  };

  // Filtered services
  const filteredServices = useMemo(() => {
    if (!serviceSearch.trim()) return services;
    const q = serviceSearch.toLowerCase();
    return services.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.category?.toLowerCase().includes(q)
    );
  }, [services, serviceSearch]);

  const participatingCount = servicesConfigMap.size;

  if (isLoading) {
    return (
      <div className="bg-white/85 backdrop-blur-md rounded-2xl sm:rounded-3xl p-6 sm:p-12 border border-[#D8D0BD] shadow-xs text-center">
        <RefreshCw className="w-8 h-8 text-[#C7A03A] animate-spin mx-auto mb-3" />
        <p className="text-sm font-semibold text-[#1D3D3C]">
          Carregando configurações da Black Friday...
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white/85 backdrop-blur-md rounded-2xl sm:rounded-3xl p-3.5 sm:p-8 border border-[#D8D0BD] shadow-xs relative overflow-hidden space-y-8">
      {/* Pattern de Arcos de Oliva sutil */}
      <div className="absolute inset-0 bg-pattern-arches-olive opacity-[0.03] pointer-events-none" />

      {/* Top Header & Master Toggle */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-6 border-b border-[#D8D0BD] relative z-10">
        <div>
          <div className="flex items-center space-x-2 mb-1">
            <span className="text-[10px] uppercase tracking-widest text-[#80611F] font-bold block">
              Temporada Especial de Ofertas • Gleicy Ronha
            </span>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center space-x-1 ${
                isActive
                  ? "bg-[#080F0E] text-[#C7A03A] border border-[#C7A03A]/40"
                  : "bg-stone-100 text-stone-600 border border-stone-300"
              }`}
            >
              <Sparkles className="w-3 h-3 text-[#C7A03A]" />
              <span>{isActive ? "Campanha Ativa" : "Campanha Inativa"}</span>
            </span>
          </div>

          <h2 className="text-xl sm:text-2xl font-extrabold text-[#1D3D3C] flex items-center space-x-2">
            <span>Gestão da Black Friday</span>
          </h2>

          {/* Grafismo Oficial 1 - Linha Orgânica Dourada */}
          <div className="relative w-36 sm:w-44 h-2.5 my-1.5 opacity-80 pointer-events-none">
            <img
              src="/brand/Grafismos/linha-grafismo-1.png"
              alt=""
              className="w-full h-full object-contain object-left"
            />
          </div>

          <p className="text-xs text-[#736455] max-w-2xl mt-0.5">
            Configure vigência, serviços participantes, descontos promocionais dinâmicos,
            descontos progressivos por quantidade e bloqueio de agenda exclusiva.
          </p>
        </div>

        {/* Master Actions */}
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-between lg:justify-end">
          {feedbackMsg && (
            <div
              className={`text-xs px-3.5 py-2 rounded-xl font-medium shadow-xs flex items-center space-x-1.5 animate-fade-in ${
                feedbackMsg.type === "success"
                  ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                  : "bg-rose-50 text-rose-800 border border-rose-200"
              }`}
            >
              {feedbackMsg.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{feedbackMsg.text}</span>
            </div>
          )}

          {/* Master Toggle Switch */}
          <div className="flex items-center space-x-2 bg-[#FCF5EB] border border-[#D8D0BD] px-3 py-2 rounded-xl">
            <span className="text-xs font-bold text-[#1D3D3C]">
              {isActive ? "Ativada no Salão" : "Desativada"}
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={isActive}
              onClick={() => setIsActive(!isActive)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                isActive ? "bg-[#1D3D3C]" : "bg-stone-300"
              }`}
            >
              <span
                aria-hidden="true"
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                  isActive ? "translate-x-5 bg-[#C7A03A]" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* Save Button */}
          <button
            onClick={handleSaveCampaign}
            disabled={isSaving || Boolean(dateRangeError)}
            className="px-5 py-2.5 text-xs font-bold text-white brand-green-gradient border border-[#C7A03A]/40 hover:border-[#C7A03A] rounded-xl shadow-xs transition-all flex items-center space-x-2 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation cursor-pointer"
          >
            {isSaving ? (
              <RefreshCw className="w-4 h-4 text-[#D9B85F] animate-spin" />
            ) : (
              <Save className="w-4 h-4 text-[#D9B85F]" />
            )}
            <span>{isSaving ? "Salvando..." : "Salvar Campanha"}</span>
          </button>
        </div>
      </div>

      {/* Campaign Name & General Settings */}
      <div className="bg-[#FAF7F2] p-4 sm:p-5 rounded-2xl border border-[#D8D0BD] relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex-1 space-y-1">
          <label className="text-xs font-bold text-[#1D3D3C] flex items-center space-x-1.5">
            <Tag className="w-3.5 h-3.5 text-[#C7A03A]" />
            <span>Nome Oficial da Campanha</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Black Friday 2026"
            className="w-full px-3.5 py-2 text-xs sm:text-sm bg-white border border-[#D8D0BD] rounded-xl focus:border-[#C7A03A] focus:outline-hidden font-bold text-[#1D3D3C]"
          />
          <p className="text-[11px] text-[#736455]">
            Identificação utilizada nos relatórios, banners na home e contagem regressiva da campanha.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start md:self-center">
          <div className="px-3.5 py-2 rounded-xl bg-white border border-[#D8D0BD] flex items-center space-x-2 text-xs">
            <Clock className="w-4 h-4 text-[#C7A03A]" />
            <span className="text-[#736455]">Vigência:</span>
            <span className="font-bold text-[#1D3D3C]">
              {startsAt && endsAt
                ? `${formatDisplayDateOnly(startDateOnly)} a ${formatDisplayDateOnly(endDateOnly)}`
                : "Não definida"}
            </span>
          </div>

          <div className="px-3.5 py-2 rounded-xl bg-white border border-[#D8D0BD] flex items-center space-x-2 text-xs">
            <CalendarCheck className="w-4 h-4 text-[#C7A03A]" />
            <span className="text-[#736455]">Datas exclusivas:</span>
            <span className="font-bold text-[#1D3D3C]">
              {restrictSchedule ? `${restrictedDates.length} data(s)` : "Livre"}
            </span>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* ACCORDION 1: PERÍODO DE VIGÊNCIA (CALENDÁRIO GAMIFICADO)       */}
      {/* ============================================================== */}
      <div className="bg-[#FAF7F2] rounded-2xl border border-[#D8D0BD] overflow-hidden relative z-10 shadow-xs transition-all">
        {/* Accordion Header */}
        <div
          onClick={() => setIsPeriodAccordionOpen((prev) => !prev)}
          className="p-4 sm:p-5 flex items-center justify-between cursor-pointer hover:bg-[#FAF7F2]/80 transition-colors select-none"
        >
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-[#1D3D3C] text-[#D9B85F] flex items-center justify-center shrink-0 border border-[#C7A03A]/40 shadow-xs">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2 flex-wrap">
                <h3 className="text-sm sm:text-base font-extrabold text-[#1D3D3C]">
                  1. Período de Vigência das Ofertas
                </h3>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#C7A03A]/20 text-[#80611F] border border-[#C7A03A]/40">
                  Seleção por Intervalo
                </span>
              </div>
              <p className="text-xs text-[#736455] mt-0.5">
                Defina interativamente quando os preços com desconto e contadores entram no ar.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* Status chip */}
            {startsAt && endsAt ? (
              <span className="hidden md:inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>
                  {formatDisplayDateTime(startsAt)} até {formatDisplayDateTime(endsAt)}
                </span>
              </span>
            ) : startsAt ? (
              <span className="hidden md:inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-300 text-amber-800 text-xs font-semibold">
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                <span>Início: {formatDisplayDateTime(startsAt)} (selecione o término)</span>
              </span>
            ) : (
              <span className="hidden md:inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-stone-100 border border-stone-300 text-stone-700 text-xs font-medium">
                <AlertCircle className="w-3.5 h-3.5 text-stone-500" />
                <span>Nenhum período definido</span>
              </span>
            )}

            <button
              type="button"
              className="w-8 h-8 rounded-xl bg-white border border-[#D8D0BD] flex items-center justify-center text-[#1D3D3C] hover:border-[#C7A03A] transition-colors"
              aria-label={isPeriodAccordionOpen ? "Recolher calendário de vigência" : "Expandir calendário de vigência"}
            >
              {isPeriodAccordionOpen ? (
                <ChevronUp className="w-4 h-4 text-[#C7A03A]" />
              ) : (
                <ChevronDown className="w-4 h-4 text-[#736455]" />
              )}
            </button>
          </div>
        </div>

        {/* Accordion Content */}
        {isPeriodAccordionOpen && (
          <div className="p-4 sm:p-6 border-t border-[#D8D0BD] bg-white/70 space-y-5 animate-in fade-in-50 duration-200">
            {/* Top Bar: Month navigation + Quick presets */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#FAF7F2] p-3 sm:p-4 rounded-2xl border border-[#D8D0BD]">
              {/* Navegação entre Meses */}
              <div className="flex items-center space-x-2">
                <div className="flex items-center bg-white rounded-xl border border-[#D8D0BD] p-1 shadow-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setPeriodYearMonth((prev) => {
                        if (prev.month === 1) return { year: prev.year - 1, month: 12 };
                        return { year: prev.year, month: prev.month - 1 };
                      });
                    }}
                    className="p-1.5 sm:p-2 rounded-lg hover:bg-[#FAF7F2] text-[#1D3D3C] hover:text-[#80611F] transition-colors"
                    title="Mês Anterior"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="px-3 sm:px-4 text-xs sm:text-sm font-bold text-[#1D3D3C] min-w-[130px] sm:min-w-[150px] text-center">
                    {MONTH_NAMES[periodYearMonth.month - 1]} {periodYearMonth.year}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setPeriodYearMonth((prev) => {
                        if (prev.month === 12) return { year: prev.year + 1, month: 1 };
                        return { year: prev.year, month: prev.month + 1 };
                      });
                    }}
                    className="p-1.5 sm:p-2 rounded-lg hover:bg-[#FAF7F2] text-[#1D3D3C] hover:text-[#80611F] transition-colors"
                    title="Próximo Mês"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const d = new Date();
                    setPeriodYearMonth({ year: d.getFullYear(), month: d.getMonth() + 1 });
                  }}
                  className="px-3 py-2 rounded-xl bg-white hover:bg-[#FAF7F2] border border-[#D8D0BD] text-xs font-bold text-[#1D3D3C] transition-all hover:border-[#C7A03A] shadow-xs"
                >
                  Hoje
                </button>

                <button
                  type="button"
                  onClick={() => setPeriodYearMonth({ year: 2026, month: 11 })}
                  className="px-3 py-2 rounded-xl bg-[#1D3D3C] text-[#D9B85F] hover:bg-[#1D3D3C]/90 border border-[#C7A03A]/40 text-xs font-bold transition-all shadow-xs"
                >
                  Novembro
                </button>
              </div>

              {/* Atalhos Rápidos de Período */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-[#736455] flex items-center space-x-1">
                  <Sliders className="w-3.5 h-3.5 text-[#C7A03A]" />
                  <span>Atalhos:</span>
                </span>
                <button
                  type="button"
                  onClick={() => handleSetQuickPeriod("2026-11-27", "2026-11-29")}
                  className="px-3 py-1.5 rounded-xl bg-white hover:bg-[#FAF7F2] border border-[#D8D0BD] text-xs font-semibold text-[#1D3D3C] transition-all hover:border-[#C7A03A] shadow-xs"
                >
                  🔥 Black Friday (27 a 29 Nov)
                </button>
                <button
                  type="button"
                  onClick={() => handleSetQuickPeriod("2026-11-23", "2026-11-30")}
                  className="px-3 py-1.5 rounded-xl bg-white hover:bg-[#FAF7F2] border border-[#D8D0BD] text-xs font-semibold text-[#1D3D3C] transition-all hover:border-[#C7A03A] shadow-xs"
                >
                  ⚡ Black Week (23 a 30 Nov)
                </button>
                <button
                  type="button"
                  onClick={() => handleSetQuickPeriod("2026-11-01", "2026-11-30")}
                  className="px-3 py-1.5 rounded-xl bg-white hover:bg-[#FAF7F2] border border-[#D8D0BD] text-xs font-semibold text-[#1D3D3C] transition-all hover:border-[#C7A03A] shadow-xs"
                >
                  🗓️ Mês Inteiro
                </button>
                {(startsAt || endsAt) && (
                  <button
                    type="button"
                    onClick={() => {
                      setStartsAt("");
                      setEndsAt("");
                    }}
                    className="px-3 py-1.5 rounded-xl bg-white hover:bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-600 transition-all shadow-xs"
                  >
                    ✕ Limpar
                  </button>
                )}
              </div>
            </div>

            {/* Instruction tooltip */}
            <div className="flex items-center space-x-2 text-xs text-[#736455] bg-[#FCF5EB] px-3.5 py-2 rounded-xl border border-[#D8D0BD]/60">
              <Sparkles className="w-4 h-4 text-[#C7A03A] shrink-0" />
              <span>
                <strong>Como selecionar:</strong> Clique no primeiro dia para marcar o <strong>Início</strong> e em seguida clique no dia final para o <strong>Término</strong>. Os dias intermediários serão preenchidos automaticamente.
              </span>
            </div>

            {/* Calendário: Grid de Dias da Semana e Mês */}
            <div className="space-y-2">
              {/* Cabeçalho dos dias da semana */}
              <div className="grid grid-cols-7 gap-1.5 sm:gap-2 text-center text-xs font-bold text-[#80611F] tracking-wider uppercase mb-1">
                {WEEK_DAYS.map((wd, i) => (
                  <span
                    key={wd}
                    className={`py-2 rounded-xl bg-[#FAF7F2] border border-[#D8D0BD]/50 ${
                      i === 0 || i === 6 ? "text-[#736455]/70" : "text-[#736455]"
                    }`}
                  >
                    {wd}
                  </span>
                ))}
              </div>

              {/* Grid dos Dias */}
              {(() => {
                const year = periodYearMonth.year;
                const month = periodYearMonth.month;
                const startDayOffset = new Date(year, month - 1, 1).getDay();
                const daysInMonth = new Date(year, month, 0).getDate();

                return (
                  <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
                    {/* Espaços Vazios para o Offset Inicial do Mês */}
                    {[...Array(startDayOffset)].map((_, i) => (
                      <div
                        key={`empty-period-${i}`}
                        className="h-16 sm:h-20 rounded-xl bg-[#FAF7F2]/40 border border-[#D8D0BD]/30 pointer-events-none"
                      />
                    ))}

                    {/* Cards dos Dias */}
                    {[...Array(daysInMonth)].map((_, i) => {
                      const dayNum = i + 1;
                      const padDay = String(dayNum).padStart(2, "0");
                      const padMonth = String(month).padStart(2, "0");
                      const dateStr = `${year}-${padMonth}-${padDay}`;

                      const isStart = dateStr === startDateOnly;
                      const isEnd = dateStr === endDateOnly;
                      const isInRange = Boolean(
                        startDateOnly &&
                          endDateOnly &&
                          dateStr > startDateOnly &&
                          dateStr < endDateOnly
                      );
                      const isToday = Boolean(todayStr && dateStr === todayStr);

                      let cellStyles =
                        "bg-white border-[#D8D0BD] text-[#1D3D3C] hover:border-[#C7A03A] hover:bg-[#FCF5EB] shadow-2xs";

                      if (isStart || isEnd) {
                        cellStyles =
                          "bg-[#1D3D3C] border-2 border-[#C7A03A] text-white ring-2 ring-[#C7A03A]/40 shadow-md shadow-[#1D3D3C]/20 scale-[1.02] z-10";
                      } else if (isInRange) {
                        cellStyles =
                          "bg-[#C7A03A]/20 border-y-2 border-y-[#C7A03A]/60 border-x-transparent text-[#1D3D3C] font-black rounded-none";
                      } else if (isToday) {
                        cellStyles += " ring-2 ring-[#C7A03A]/60 border-[#C7A03A]";
                      }

                      return (
                        <div
                          key={dateStr}
                          onClick={() => handleSelectPeriodDay(dateStr)}
                          className={`relative h-16 sm:h-20 p-1.5 sm:p-2 rounded-xl border text-left cursor-pointer transition-all duration-150 flex flex-col justify-between select-none group touch-manipulation ${cellStyles}`}
                        >
                          <div className="flex items-center justify-between">
                            <span
                              className={`text-xs sm:text-sm font-extrabold w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center ${
                                isStart || isEnd
                                  ? "bg-[#C7A03A] text-[#1D3D3C]"
                                  : isInRange
                                  ? "text-[#1D3D3C]"
                                  : isToday
                                  ? "bg-[#C7A03A]/20 text-[#80611F] border border-[#C7A03A]/60"
                                  : "text-[#1D3D3C] group-hover:text-[#80611F]"
                              }`}
                            >
                              {dayNum}
                            </span>

                            {isToday && !(isStart || isEnd) && (
                              <span className="hidden sm:inline-block text-[9px] font-bold text-[#80611F]">
                                Hoje
                              </span>
                            )}
                          </div>

                          <div className="flex items-center justify-center">
                            {isStart && isEnd ? (
                              <span className="text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-[#C7A03A] text-[#1D3D3C] whitespace-nowrap shadow-xs">
                                Início & Fim
                              </span>
                            ) : isStart ? (
                              <span className="text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-[#C7A03A] text-[#1D3D3C] whitespace-nowrap shadow-xs">
                                Início
                              </span>
                            ) : isEnd ? (
                              <span className="text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-[#C7A03A] text-[#1D3D3C] whitespace-nowrap shadow-xs">
                                Término
                              </span>
                            ) : isInRange ? (
                              <span className="text-[9px] font-bold text-[#80611F] hidden sm:inline-block">
                                Promoção Ativa
                              </span>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>

            {/* Bottom Controls: Exact Hours & Manual Adjustment */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-[#D8D0BD]/70">
              <div className="bg-[#FAF7F2] p-3 sm:p-4 rounded-xl border border-[#D8D0BD] space-y-1.5">
                <label className="text-xs font-bold text-[#1D3D3C] flex items-center space-x-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#C7A03A]" />
                  <span>Horário de Início</span>
                </label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => handleStartTimeChange(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-[#D8D0BD] rounded-xl focus:border-[#C7A03A] focus:outline-hidden font-bold text-[#1D3D3C]"
                />
                <p className="text-[10px] text-[#736455]">
                  Data selecionada: {startDateOnly ? formatDisplayDateOnly(startDateOnly) : "Não definida"}
                </p>
              </div>

              <div className="bg-[#FAF7F2] p-3 sm:p-4 rounded-xl border border-[#D8D0BD] space-y-1.5">
                <label className="text-xs font-bold text-[#1D3D3C] flex items-center space-x-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#C7A03A]" />
                  <span>Horário de Término</span>
                </label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => handleEndTimeChange(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-[#D8D0BD] rounded-xl focus:border-[#C7A03A] focus:outline-hidden font-bold text-[#1D3D3C]"
                />
                <p className="text-[10px] text-[#736455]">
                  Data selecionada: {endDateOnly ? formatDisplayDateOnly(endDateOnly) : "Não definida"}
                </p>
              </div>

              <div className="bg-[#FAF7F2] p-3 sm:p-4 rounded-xl border border-[#D8D0BD] flex flex-col justify-between">
                <div>
                  <span className="text-xs font-bold text-[#1D3D3C] block mb-1">
                    Resumo do Período de Vigência
                  </span>
                  <p className="text-xs text-[#736455]">
                    {startsAt && endsAt ? (
                      <>
                        De <strong className="text-[#1D3D3C]">{formatDisplayDateTime(startsAt)}</strong> até{" "}
                        <strong className="text-[#1D3D3C]">{formatDisplayDateTime(endsAt)}</strong>.
                      </>
                    ) : (
                      "Selecione as datas no calendário para completar o período."
                    )}
                  </p>
                </div>

                {dateRangeError && (
                  <p className="text-[10px] text-rose-600 font-bold mt-2 flex items-center space-x-1">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    <span>{dateRangeError}</span>
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ============================================================== */}
      {/* ACCORDION 2: DATAS EXCLUSIVAS DE ATENDIMENTO NA AGENDA         */}
      {/* ============================================================== */}
      <div className="bg-[#FAF7F2] rounded-2xl border border-[#D8D0BD] overflow-hidden relative z-10 shadow-xs transition-all">
        {/* Accordion Header */}
        <div className="p-4 sm:p-5 flex items-center justify-between select-none">
          <div
            onClick={() => setIsScheduleAccordionOpen((prev) => !prev)}
            className="flex-1 flex items-center space-x-3 cursor-pointer hover:opacity-90 transition-opacity"
          >
            <div className="w-10 h-10 rounded-xl bg-[#1D3D3C] text-[#D9B85F] flex items-center justify-center shrink-0 border border-[#C7A03A]/40 shadow-xs">
              <CalendarCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2 flex-wrap">
                <h3 className="text-sm sm:text-base font-extrabold text-[#1D3D3C]">
                  2. Restrição Exclusiva de Agenda (Datas Especiais)
                </h3>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#1D3D3C] text-[#D9B85F] border border-[#C7A03A]/40">
                  {restrictSchedule ? `${restrictedDates.length} Data(s) Reservada(s)` : "Opcional (Desativado)"}
                </span>
              </div>
              <p className="text-xs text-[#736455] mt-0.5">
                Reserve dias específicos no salão onde somente serviços participantes da Black Friday poderão ser agendados.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3 ml-3">
            {/* Direct Switch in Header */}
            <div className="flex items-center space-x-2 bg-white px-3 py-1.5 rounded-xl border border-[#D8D0BD]">
              <span className="text-xs font-bold text-[#1D3D3C] hidden sm:inline-block">
                {restrictSchedule ? "Ativado" : "Desativado"}
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={restrictSchedule}
                onClick={(e) => {
                  e.stopPropagation();
                  setRestrictSchedule(!restrictSchedule);
                  if (!restrictSchedule) {
                    setIsScheduleAccordionOpen(true);
                  }
                }}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                  restrictSchedule ? "bg-[#1D3D3C]" : "bg-stone-300"
                }`}
                title={restrictSchedule ? "Desativar restrição de agenda" : "Ativar restrição de agenda"}
              >
                <span
                  aria-hidden="true"
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                    restrictSchedule ? "translate-x-5 bg-[#C7A03A]" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            <button
              type="button"
              onClick={() => setIsScheduleAccordionOpen((prev) => !prev)}
              className="w-8 h-8 rounded-xl bg-white border border-[#D8D0BD] flex items-center justify-center text-[#1D3D3C] hover:border-[#C7A03A] transition-colors cursor-pointer"
              aria-label={isScheduleAccordionOpen ? "Recolher datas exclusivas" : "Expandir datas exclusivas"}
            >
              {isScheduleAccordionOpen ? (
                <ChevronUp className="w-4 h-4 text-[#C7A03A]" />
              ) : (
                <ChevronDown className="w-4 h-4 text-[#736455]" />
              )}
            </button>
          </div>
        </div>

        {/* Accordion Content */}
        {isScheduleAccordionOpen && (
          <div className="p-4 sm:p-6 border-t border-[#D8D0BD] bg-white/70 space-y-5 animate-in fade-in-50 duration-200">
            {/* Warning / explanation banner */}
            <div className="bg-amber-50/80 border border-amber-200/90 rounded-xl p-3.5 text-xs text-amber-900 flex items-start space-x-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong className="font-bold">Como funciona a restrição de agenda:</strong>
                <p className="mt-0.5 text-amber-800">
                  Nas datas selecionadas abaixo, o motor de agendamento online permitirá apenas o agendamento de procedimentos configurados na Black Friday. Serviços comuns fora da promoção serão bloqueados para reserva nessas datas.
                </p>
              </div>
            </div>

            {/* Top Bar: Month navigation + Quick presets */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#FAF7F2] p-3 sm:p-4 rounded-2xl border border-[#D8D0BD]">
              {/* Navegação entre Meses */}
              <div className="flex items-center space-x-2">
                <div className="flex items-center bg-white rounded-xl border border-[#D8D0BD] p-1 shadow-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setScheduleYearMonth((prev) => {
                        if (prev.month === 1) return { year: prev.year - 1, month: 12 };
                        return { year: prev.year, month: prev.month - 1 };
                      });
                    }}
                    className="p-1.5 sm:p-2 rounded-lg hover:bg-[#FAF7F2] text-[#1D3D3C] hover:text-[#80611F] transition-colors"
                    title="Mês Anterior"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="px-3 sm:px-4 text-xs sm:text-sm font-bold text-[#1D3D3C] min-w-[130px] sm:min-w-[150px] text-center">
                    {MONTH_NAMES[scheduleYearMonth.month - 1]} {scheduleYearMonth.year}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setScheduleYearMonth((prev) => {
                        if (prev.month === 12) return { year: prev.year + 1, month: 1 };
                        return { year: prev.year, month: prev.month + 1 };
                      });
                    }}
                    className="p-1.5 sm:p-2 rounded-lg hover:bg-[#FAF7F2] text-[#1D3D3C] hover:text-[#80611F] transition-colors"
                    title="Próximo Mês"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const d = new Date();
                    setScheduleYearMonth({ year: d.getFullYear(), month: d.getMonth() + 1 });
                  }}
                  className="px-3 py-2 rounded-xl bg-white hover:bg-[#FAF7F2] border border-[#D8D0BD] text-xs font-bold text-[#1D3D3C] transition-all hover:border-[#C7A03A] shadow-xs"
                >
                  Hoje
                </button>

                <button
                  type="button"
                  onClick={() => setScheduleYearMonth({ year: 2026, month: 11 })}
                  className="px-3 py-2 rounded-xl bg-[#1D3D3C] text-[#D9B85F] hover:bg-[#1D3D3C]/90 border border-[#C7A03A]/40 text-xs font-bold transition-all shadow-xs"
                >
                  Novembro
                </button>
              </div>

              {/* Atalhos Rápidos para Datas Exclusivas */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-[#736455] flex items-center space-x-1">
                  <Sliders className="w-3.5 h-3.5 text-[#C7A03A]" />
                  <span>Ações Rápidas:</span>
                </span>
                <button
                  type="button"
                  onClick={handleCopyPeriodToRestricted}
                  className="px-3 py-1.5 rounded-xl bg-[#1D3D3C] hover:bg-[#1D3D3C]/90 border border-[#C7A03A]/40 text-xs font-bold text-[#D9B85F] transition-all shadow-xs"
                  title="Copia todas as datas do período de vigência da Black Friday para a restrição de agenda"
                >
                  ✨ Copiar do Período Black
                </button>
                <button
                  type="button"
                  onClick={handleSelectTuesdayToSaturday}
                  className="px-3 py-1.5 rounded-xl bg-white hover:bg-[#FAF7F2] border border-[#D8D0BD] text-xs font-semibold text-[#1D3D3C] transition-all hover:border-[#C7A03A] shadow-xs"
                >
                  📅 Terça a Sábado
                </button>
                <button
                  type="button"
                  onClick={handleSelectWholeMonthSchedule}
                  className="px-3 py-1.5 rounded-xl bg-white hover:bg-[#FAF7F2] border border-[#D8D0BD] text-xs font-semibold text-[#1D3D3C] transition-all hover:border-[#C7A03A] shadow-xs"
                >
                  🗓️ Todo o Mês
                </button>
                {restrictedDates.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setRestrictedDates([])}
                    className="px-3 py-1.5 rounded-xl bg-white hover:bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-600 transition-all shadow-xs"
                  >
                    ✕ Limpar ({restrictedDates.length})
                  </button>
                )}
              </div>
            </div>

            {/* Calendário: Grid de Seleção Gamificada */}
            <div className="space-y-2">
              {/* Cabeçalho dos dias da semana */}
              <div className="grid grid-cols-7 gap-1.5 sm:gap-2 text-center text-xs font-bold text-[#80611F] tracking-wider uppercase mb-1">
                {WEEK_DAYS.map((wd, i) => (
                  <span
                    key={wd}
                    className={`py-2 rounded-xl bg-[#FAF7F2] border border-[#D8D0BD]/50 ${
                      i === 0 || i === 6 ? "text-[#736455]/70" : "text-[#736455]"
                    }`}
                  >
                    {wd}
                  </span>
                ))}
              </div>

              {/* Grid dos Dias */}
              {(() => {
                const year = scheduleYearMonth.year;
                const month = scheduleYearMonth.month;
                const startDayOffset = new Date(year, month - 1, 1).getDay();
                const daysInMonth = new Date(year, month, 0).getDate();

                return (
                  <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
                    {/* Espaços Vazios para o Offset Inicial do Mês */}
                    {[...Array(startDayOffset)].map((_, i) => (
                      <div
                        key={`empty-schedule-${i}`}
                        className="h-16 sm:h-20 rounded-xl bg-[#FAF7F2]/40 border border-[#D8D0BD]/30 pointer-events-none"
                      />
                    ))}

                    {/* Cards dos Dias */}
                    {[...Array(daysInMonth)].map((_, i) => {
                      const dayNum = i + 1;
                      const padDay = String(dayNum).padStart(2, "0");
                      const padMonth = String(month).padStart(2, "0");
                      const dateStr = `${year}-${padMonth}-${padDay}`;

                      const isRestricted = restrictedDates.includes(dateStr);
                      const isToday = Boolean(todayStr && dateStr === todayStr);

                      let cellStyles =
                        "bg-white border-[#D8D0BD] text-[#1D3D3C] hover:border-[#C7A03A] hover:bg-[#FCF5EB] shadow-2xs";

                      if (isRestricted) {
                        cellStyles =
                          "bg-[#1D3D3C] border-2 border-[#C7A03A] text-white ring-2 ring-[#C7A03A]/40 shadow-md shadow-[#1D3D3C]/20 scale-[1.02] z-10";
                      } else if (isToday) {
                        cellStyles += " ring-2 ring-[#C7A03A]/60 border-[#C7A03A]";
                      }

                      return (
                        <div
                          key={dateStr}
                          onClick={() => {
                            if (!restrictSchedule) setRestrictSchedule(true);
                            handleToggleRestrictedDate(dateStr);
                          }}
                          className={`relative h-16 sm:h-20 p-1.5 sm:p-2 rounded-xl border text-left cursor-pointer transition-all duration-150 flex flex-col justify-between select-none group touch-manipulation ${cellStyles}`}
                        >
                          <div className="flex items-center justify-between">
                            <span
                              className={`text-xs sm:text-sm font-extrabold w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center ${
                                isRestricted
                                  ? "bg-[#C7A03A] text-[#1D3D3C]"
                                  : isToday
                                  ? "bg-[#C7A03A]/20 text-[#80611F] border border-[#C7A03A]/60"
                                  : "text-[#1D3D3C] group-hover:text-[#80611F]"
                              }`}
                            >
                              {dayNum}
                            </span>

                            {isRestricted ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-[#D9B85F]" />
                            ) : isToday ? (
                              <span className="hidden sm:inline-block text-[9px] font-bold text-[#80611F]">
                                Hoje
                              </span>
                            ) : null}
                          </div>

                          <div className="flex items-center justify-center">
                            {isRestricted ? (
                              <span className="text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-[#C7A03A] text-[#1D3D3C] whitespace-nowrap shadow-xs">
                                ★ Exclusivo
                              </span>
                            ) : (
                              <span className="text-[9px] text-[#736455] opacity-0 group-hover:opacity-100 transition-opacity hidden sm:inline-block">
                                + Incluir
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>

            {/* Selected Dates Chips & Manual Fallback Input */}
            <div className="space-y-3 pt-3 border-t border-[#D8D0BD]/70">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <span className="text-xs font-bold text-[#80611F] uppercase tracking-wider flex items-center space-x-1.5">
                  <CalendarCheck className="w-3.5 h-3.5 text-[#C7A03A]" />
                  <span>Datas Exclusivas Cadastradas ({restrictedDates.length})</span>
                </span>

                {/* Manual date input fallback */}
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={newRestrictedDate}
                    onChange={(e) => setNewRestrictedDate(e.target.value)}
                    className="px-3 py-1.5 text-xs bg-white border border-[#D8D0BD] rounded-xl focus:border-[#C7A03A] focus:outline-hidden font-medium text-[#1D3D3C]"
                  />
                  <button
                    type="button"
                    onClick={handleAddRestrictedDate}
                    disabled={!newRestrictedDate}
                    className="px-3 py-1.5 text-xs font-bold text-[#1D3D3C] gold-gradient rounded-xl shadow-xs hover:brightness-105 active:scale-95 transition-all flex items-center space-x-1 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Adicionar</span>
                  </button>
                </div>
              </div>

              {restrictedDates.length === 0 ? (
                <div className="p-4 rounded-xl bg-[#FAF7F2] border border-dashed border-[#D8D0BD] text-center">
                  <p className="text-xs text-[#736455] italic">
                    Nenhuma data cadastrada ainda. Clique diretamente nos dias do calendário acima ou use o atalho &quot;Copiar do Período Black&quot;.
                  </p>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2 p-3 rounded-xl bg-[#FAF7F2] border border-[#D8D0BD]">
                  {restrictedDates.map((dateStr) => {
                    const formattedDisplay = formatDisplayDateOnly(dateStr);
                    return (
                      <span
                        key={dateStr}
                        className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-[#1D3D3C] text-white rounded-full text-xs font-semibold shadow-xs border border-[#C7A03A]/40"
                      >
                        <Calendar className="w-3 h-3 text-[#D9B85F]" />
                        <span>{formattedDisplay}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveRestrictedDate(dateStr)}
                          className="hover:text-rose-300 ml-1 transition-colors p-0.5"
                          title="Remover data"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Progressive Discount Rules Manager */}
      <div className="bg-[#FAF7F2] p-4 sm:p-6 rounded-2xl border border-[#D8D0BD] relative z-10 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#1D3D3C] text-[#D9B85F] flex items-center justify-center shrink-0">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-[#1D3D3C]">
                Desconto Progressivo por Combo
              </h3>
              <p className="text-xs text-[#736455]">
                Incentive combos aumentando o desconto conforme a quantidade de serviços agendados juntos.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold text-[#1D3D3C]">
              {hasProgressive ? "Tiers Ativados" : "Desativado"}
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={hasProgressive}
              onClick={() => setHasProgressive(!hasProgressive)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                hasProgressive ? "bg-[#1D3D3C]" : "bg-stone-300"
              }`}
            >
              <span
                aria-hidden="true"
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                  hasProgressive ? "translate-x-5 bg-[#C7A03A]" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        </div>

        {hasProgressive && (
          <div className="pt-3 border-t border-[#D8D0BD]/60 space-y-4">
            {/* Add new tier inputs */}
            <div className="flex flex-wrap items-center gap-3 bg-white p-3.5 rounded-xl border border-[#D8D0BD]">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-[#1D3D3C]">Mín. Serviços:</span>
                <input
                  type="number"
                  min="2"
                  max="10"
                  value={newTierMinServices}
                  onChange={(e) => setNewTierMinServices(Math.max(2, parseInt(e.target.value) || 2))}
                  className="w-16 px-2.5 py-1 text-xs border border-[#D8D0BD] rounded-lg font-bold text-[#1D3D3C] text-center"
                />
              </div>

              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-[#1D3D3C]">Desconto (%):</span>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={newTierDiscountPercent}
                  onChange={(e) =>
                    setNewTierDiscountPercent(
                      Math.min(100, Math.max(1, parseInt(e.target.value) || 1))
                    )
                  }
                  className="w-20 px-2.5 py-1 text-xs border border-[#D8D0BD] rounded-lg font-bold text-[#1D3D3C] text-center"
                />
              </div>

              <button
                type="button"
                onClick={handleAddTier}
                className="px-3.5 py-1.5 text-xs font-bold text-[#1D3D3C] gold-gradient rounded-xl shadow-xs hover:brightness-105 active:scale-95 transition-all flex items-center space-x-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Adicionar Nível</span>
              </button>
            </div>

            {/* Tiers List */}
            <div>
              <span className="text-[11px] font-bold text-[#80611F] uppercase tracking-wider block mb-2">
                Regras de Desconto Progressivo Cadastradas ({progressiveTiers.length})
              </span>
              {progressiveTiers.length === 0 ? (
                <p className="text-xs text-stone-500 italic">
                  Nenhum nível cadastrado. Adicione um nível acima para ativar o desconto progressivo.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                  {progressiveTiers.map((tier) => (
                    <div
                      key={tier.minServices}
                      className="flex items-center justify-between p-3 bg-white rounded-xl border border-[#D8D0BD] shadow-2xs"
                    >
                      <div className="flex items-center space-x-2">
                        <div className="w-7 h-7 rounded-lg bg-[#FCF5EB] border border-[#C7A03A]/40 flex items-center justify-center text-[#80611F] font-bold text-xs">
                          {tier.minServices}+
                        </div>
                        <div>
                          <p className="text-xs font-extrabold text-[#1D3D3C]">
                            {tier.minServices} ou mais serviços
                          </p>
                          <p className="text-[11px] text-[#C7A03A] font-bold">
                            {tier.discountPercent}% OFF no combo
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveTier(tier.minServices)}
                        className="text-stone-400 hover:text-rose-600 transition-colors p-1"
                        title="Remover nível"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Participating Services & Dynamic Pricing List */}
      <div className="space-y-4 relative z-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#D8D0BD]">
          <div>
            <h3 className="text-base sm:text-lg font-extrabold text-[#1D3D3C] flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-[#C7A03A]" />
              <span>Serviços Participantes &amp; Preços Promocionais</span>
            </h3>
            <p className="text-xs text-[#736455] mt-0.5">
              Marque os procedimentos que entrarão na campanha e configure o desconto individual.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold text-[#80611F] bg-[#FCF5EB] px-3 py-1 rounded-full border border-[#C7A03A]/40">
              {participatingCount} de {services.length} incluídos
            </span>

            <button
              type="button"
              onClick={handleSelectAllServices}
              className="text-xs font-semibold text-[#1D3D3C] hover:text-[#C7A03A] underline transition-colors px-1"
            >
              Marcar Todos
            </button>
            <span className="text-stone-300">|</span>
            <button
              type="button"
              onClick={handleDeselectAllServices}
              className="text-xs font-semibold text-stone-600 hover:text-rose-600 underline transition-colors px-1"
            >
              Desmarcar
            </button>
          </div>
        </div>

        {/* Search bar */}
        <div className="max-w-xs">
          <input
            type="text"
            value={serviceSearch}
            onChange={(e) => setServiceSearch(e.target.value)}
            placeholder="Buscar serviço por nome ou categoria..."
            className="w-full px-3 py-1.5 text-xs bg-white border border-[#D8D0BD] rounded-xl focus:border-[#C7A03A] focus:outline-hidden font-medium text-[#1D3D3C]"
          />
        </div>

        {/* Service Cards */}
        {filteredServices.length === 0 ? (
          <div className="p-8 text-center rounded-2xl border border-dashed border-[#D8D0BD] bg-[#FAF7F2]">
            <p className="text-xs text-stone-500">Nenhum serviço encontrado no salão.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredServices.map((service) => {
              const isIncluded = servicesConfigMap.has(service.id);
              const config = servicesConfigMap.get(service.id);
              const discountType = config?.discountType || "percentage";
              const rawDiscountValue =
                discountType === "manual"
                  ? config?.blackPrice ?? service.price
                  : config?.discountValue ?? 20;

              // Compute preview using blackFridayPricing engine clamped non-negative
              const preview = getServiceBlackFridayPrice(service, previewCampaign, {
                ignoreDateRange: true,
              });

              const clampedFinalPrice = Math.max(0, preview.finalPrice);

              return (
                <div
                  key={service.id}
                  className={`p-3.5 sm:p-5 rounded-2xl border transition-all ${
                    isIncluded
                      ? "bg-[#FCF9F0] border-[#C7A03A]/60 shadow-xs"
                      : "bg-[#FAF7F2]/60 border-[#D8D0BD] opacity-80 hover:opacity-100"
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Checkbox and Service Info */}
                    <div className="flex items-start space-x-3.5">
                      <input
                        type="checkbox"
                        checked={isIncluded}
                        onChange={() => handleToggleService(service)}
                        id={`srv-${service.id}`}
                        className="mt-1 w-4 h-4 rounded text-[#1D3D3C] focus:ring-[#C7A03A] cursor-pointer"
                      />
                      <div>
                        <label
                          htmlFor={`srv-${service.id}`}
                          className="text-sm font-extrabold text-[#1D3D3C] cursor-pointer block hover:text-[#C7A03A] transition-colors"
                        >
                          {service.title}
                        </label>
                        <div className="flex flex-wrap items-center gap-2 mt-0.5">
                          <span className="text-[10px] font-bold text-[#80611F] bg-[#FCF5EB] px-2 py-0.5 rounded-md uppercase tracking-wider">
                            {service.category}
                          </span>
                          <span className="text-xs font-semibold text-stone-500">
                            Preço Base: {formatBRL(service.price)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Discount Configuration & Dynamic Preview */}
                    {isIncluded ? (
                      <div className="flex flex-wrap items-center gap-4 bg-white/90 p-3 rounded-xl border border-[#D8D0BD] w-full lg:w-auto justify-between lg:justify-end">
                        {/* Selector of discount type */}
                        <div className="flex items-center space-x-1.5">
                          <span className="text-[11px] font-bold text-[#1D3D3C]">Tipo:</span>
                          <select
                            value={discountType}
                            onChange={(e) =>
                              handleUpdateServiceConfig(
                                service,
                                e.target.value as BlackFridayDiscountType,
                                rawDiscountValue
                              )
                            }
                            className="text-xs bg-white border border-[#D8D0BD] rounded-lg px-2 py-1 font-semibold text-[#1D3D3C] focus:outline-hidden focus:border-[#C7A03A]"
                          >
                            <option value="percentage">Porcentagem (%)</option>
                            <option value="fixed">Desconto Fixo (R$)</option>
                            <option value="manual">Preço Fixo Black Friday</option>
                          </select>
                        </div>

                        {/* Value input */}
                        <div className="flex items-center space-x-1.5">
                          <span className="text-[11px] font-bold text-[#1D3D3C]">
                            {discountType === "percentage"
                              ? "Valor (%):"
                              : discountType === "fixed"
                              ? "Desconto (R$):"
                              : "Preço Final (R$):"}
                          </span>
                          <input
                            type="number"
                            min="0"
                            max={discountType === "percentage" ? 100 : undefined}
                            step={discountType === "percentage" ? "1" : "5"}
                            value={rawDiscountValue}
                            onChange={(e) =>
                              handleUpdateServiceConfig(
                                service,
                                discountType,
                                parseFloat(e.target.value) || 0
                              )
                            }
                            className="w-20 px-2 py-1 text-xs border border-[#D8D0BD] rounded-lg font-bold text-[#1D3D3C] text-center focus:outline-hidden focus:border-[#C7A03A]"
                          />
                        </div>

                        {/* Dynamic Real-Time Price Preview */}
                        <div className="flex items-center space-x-3 pl-2 sm:border-l sm:border-[#D8D0BD]">
                          <div className="text-right leading-tight">
                            <span className="line-through text-stone-400 text-xs font-medium block">
                              {formatBRL(preview.originalPrice)}
                            </span>
                            <span className="text-base sm:text-lg font-bold text-[#C7A03A] font-editorial block">
                              {formatBRL(clampedFinalPrice)}
                            </span>
                          </div>

                          <span className="text-[10px] sm:text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 shrink-0">
                            Economia de {formatBRL(preview.discountAmount)}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs text-stone-400 italic">
                        Não participante da campanha
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Bottom Sticky-like Save Bar for Mobile / Convenience */}
      <div className="pt-4 border-t border-[#D8D0BD] flex items-center justify-between relative z-10">
        <p className="text-xs text-stone-500">
          {participatingCount} serviços participantes ·{" "}
          {restrictSchedule ? `${restrictedDates.length} datas restritas` : "agenda normal"}
        </p>

        <button
          onClick={handleSaveCampaign}
          disabled={isSaving || Boolean(dateRangeError)}
          className="px-5 py-2.5 text-xs font-bold text-white brand-green-gradient border border-[#C7A03A]/40 hover:border-[#C7A03A] rounded-xl shadow-xs transition-all flex items-center space-x-2 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation cursor-pointer"
        >
          {isSaving ? (
            <RefreshCw className="w-4 h-4 text-[#D9B85F] animate-spin" />
          ) : (
            <Save className="w-4 h-4 text-[#D9B85F]" />
          )}
          <span>{isSaving ? "Salvando..." : "Salvar Campanha"}</span>
        </button>
      </div>
    </div>
  );
}
