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
} from "lucide-react";

export interface BlackFridayManagerProps {
  organization: SalonOrganization | null;
  services: ServiceItem[];
  onRefresh?: () => void;
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
          setStartsAt(toDateTimeLocal(campaign.startsAt));
          setEndsAt(toDateTimeLocal(campaign.endsAt));
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

      {/* Basic Settings: Name & Validity Range */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative z-10">
        <div className="bg-[#FAF7F2] p-4 rounded-2xl border border-[#D8D0BD] space-y-1.5">
          <label className="text-xs font-bold text-[#1D3D3C] flex items-center space-x-1.5">
            <Tag className="w-3.5 h-3.5 text-[#C7A03A]" />
            <span>Nome da Campanha</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Black Friday 2026"
            className="w-full px-3 py-2 text-xs bg-white border border-[#D8D0BD] rounded-xl focus:border-[#C7A03A] focus:outline-hidden font-medium text-[#1D3D3C]"
          />
          <p className="text-[10px] text-[#736455]">
            Nome exibido nos relatórios e nos banners temáticos.
          </p>
        </div>

        <div className="bg-[#FAF7F2] p-4 rounded-2xl border border-[#D8D0BD] space-y-1.5">
          <label className="text-xs font-bold text-[#1D3D3C] flex items-center space-x-1.5">
            <Clock className="w-3.5 h-3.5 text-[#C7A03A]" />
            <span>Início das Ofertas</span>
          </label>
          <input
            type="datetime-local"
            value={startsAt}
            onChange={(e) => setStartsAt(e.target.value)}
            className="w-full px-3 py-2 text-xs bg-white border border-[#D8D0BD] rounded-xl focus:border-[#C7A03A] focus:outline-hidden font-medium text-[#1D3D3C]"
          />
          <p className="text-[10px] text-[#736455]">
            Data e horário em que os preços Black Friday entram em vigor.
          </p>
        </div>

        <div className="bg-[#FAF7F2] p-4 rounded-2xl border border-[#D8D0BD] space-y-1.5">
          <label className="text-xs font-bold text-[#1D3D3C] flex items-center space-x-1.5">
            <Clock className="w-3.5 h-3.5 text-[#C7A03A]" />
            <span>Término das Ofertas</span>
          </label>
          <input
            type="datetime-local"
            value={endsAt}
            onChange={(e) => setEndsAt(e.target.value)}
            className={`w-full px-3 py-2 text-xs bg-white border rounded-xl focus:outline-hidden font-medium text-[#1D3D3C] ${
              dateRangeError ? "border-rose-400 focus:border-rose-500" : "border-[#D8D0BD] focus:border-[#C7A03A]"
            }`}
          />
          {dateRangeError ? (
            <p className="text-[10px] text-rose-600 font-semibold">{dateRangeError}</p>
          ) : (
            <p className="text-[10px] text-[#736455]">
              Contagem regressiva no topo do site apontará para este término.
            </p>
          )}
        </div>
      </div>

      {/* Schedule Restriction Section */}
      <div className="bg-[#FAF7F2] p-4 sm:p-6 rounded-2xl border border-[#D8D0BD] relative z-10 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#1D3D3C] text-[#D9B85F] flex items-center justify-center shrink-0">
              <CalendarCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-[#1D3D3C]">
                Restrição Exclusiva de Agenda
              </h3>
              <p className="text-xs text-[#736455]">
                Bloqueie datas do salão para atendimento exclusivo dos serviços Black Friday.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold text-[#1D3D3C]">
              {restrictSchedule ? "Restrição Ativada" : "Agenda Aberta Normal"}
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={restrictSchedule}
              onClick={() => setRestrictSchedule(!restrictSchedule)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                restrictSchedule ? "bg-[#1D3D3C]" : "bg-stone-300"
              }`}
            >
              <span
                aria-hidden="true"
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                  restrictSchedule ? "translate-x-5 bg-[#C7A03A]" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        </div>

        {restrictSchedule && (
          <div className="pt-3 border-t border-[#D8D0BD]/60 space-y-4">
            <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-3 text-xs text-amber-900 flex items-start space-x-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                <strong>Aviso de Restrição:</strong> Em datas restritas, apenas serviços
                participantes da Black Friday poderão ser agendados. Serviços fora da promoção
                serão bloqueados no motor de agendamento nessas datas.
              </span>
            </div>

            {/* Date input picker + Add button */}
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="date"
                value={newRestrictedDate}
                onChange={(e) => setNewRestrictedDate(e.target.value)}
                className="px-3 py-2 text-xs bg-white border border-[#D8D0BD] rounded-xl focus:border-[#C7A03A] focus:outline-hidden font-medium text-[#1D3D3C]"
              />
              <button
                type="button"
                onClick={handleAddRestrictedDate}
                disabled={!newRestrictedDate}
                className="px-3.5 py-2 text-xs font-bold text-[#1D3D3C] gold-gradient rounded-xl shadow-xs hover:brightness-105 active:scale-95 transition-all flex items-center space-x-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Adicionar Data</span>
              </button>
            </div>

            {/* Tag chip list of restricted dates */}
            <div>
              <span className="text-[11px] font-bold text-[#80611F] uppercase tracking-wider block mb-2">
                Datas com Agenda Restrita ({restrictedDates.length})
              </span>
              {restrictedDates.length === 0 ? (
                <p className="text-xs text-stone-500 italic">
                  Nenhuma data restrita cadastrada. Adicione uma data acima.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {restrictedDates.map((dateStr) => {
                    const [y, m, d] = dateStr.split("-");
                    const formattedDisplay = `${d}/${m}/${y}`;
                    return (
                      <span
                        key={dateStr}
                        className="inline-flex items-center space-x-1.5 px-3 py-1 bg-[#1D3D3C] text-white rounded-full text-xs font-semibold shadow-xs border border-[#C7A03A]/40"
                      >
                        <Calendar className="w-3 h-3 text-[#D9B85F]" />
                        <span>{formattedDisplay}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveRestrictedDate(dateStr)}
                          className="hover:text-rose-300 ml-1 transition-colors"
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
