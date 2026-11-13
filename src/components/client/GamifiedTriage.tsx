"use client";

import { useState, useEffect, useMemo } from "react";
import { TriageForm, TriageQuestion, TriageSubmission, TriageAnswer, QuestionOption } from "@/types/triage";
import { ServiceItem } from "@/types/service";
import { Appointment } from "@/types/appointment";
import { SalonClient } from "@/types/client";
import {
  calculateAvailableSlots,
  calculateDaySlotGrid,
  AvailableSlot,
  DaySlotItem,
} from "@/lib/scheduling/engine";
import { AvailableDay, PreferredPeriod } from "@/types/availability";
import { parseHHmmToMinutes } from "@/lib/utils";
import { SalonStore } from "@/lib/storage/localStore";
import { SupabaseDataService } from "@/lib/supabase/api";
import { compressImageFile } from "@/lib/storage/imageCompression";
import { uploadImageToStorage } from "@/lib/storage/uploader";
import {
  Sparkles,
  Lightbulb,
  ArrowRight,
  ArrowLeft,
  Camera,
  CheckCircle2,
  Calendar,
  AlertTriangle,
  UploadCloud,
  Clock,
  Lock,
  Eye,
  EyeOff,
  User,
  Phone,
  Zap,
  Sun,
  Moon,
  CalendarDays,
  AlertCircle,
  Check,
  Info,
} from "lucide-react";
import confetti from "canvas-confetti";

interface GamifiedTriageProps {
  service: ServiceItem;
  form: TriageForm;
  existingAppointments?: Appointment[];
  availableDays?: AvailableDay[];
  onComplete: (submission: TriageSubmission) => void;
  onCancel: () => void;
}

const DEFAULT_CURL_OPTIONS: QuestionOption[] = [
  { id: "opt-2a", label: "Ondulado (2A, 2B ou 2C)", description: "Ondas suaves em formato de S, raiz mais lisa" },
  { id: "opt-3a", label: "Cacheado Aberto (3A ou 3B)", description: "Cachos em espiral bem definidos e soltos" },
  { id: "opt-3c", label: "Cacheado Fechado (3C)", description: "Cachos em espiral estreita e densos" },
  { id: "opt-4a", label: "Crespo / Afropuff (4A, 4B ou 4C)", description: "Curvatura bem fechada em Z com alto volume natural" },
  { id: "opt-trans", label: "Em Transição Capilar", description: "Duas texturas presentes (raiz natural e pontas com química)" },
];

// Próximos 14 dias para o seletor visual
function getUpcomingDays(count = 14) {
  const days = [];
  const base = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const isoDate = `${yyyy}-${mm}-${dd}`;
    const weekDay = d.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "");
    const month = d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");
    days.push({
      dateStr: isoDate,
      dayNum: d.getDate(),
      weekDay: weekDay.charAt(0).toUpperCase() + weekDay.slice(1),
      month: month.charAt(0).toUpperCase() + month.slice(1),
      isToday: i === 0,
      isTomorrow: i === 1,
    });
  }
  return days;
}

export function GamifiedTriage({
  service,
  form,
  existingAppointments = [],
  availableDays: initialAvailableDays,
  onComplete,
  onCancel,
}: GamifiedTriageProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [stepValidationError, setStepValidationError] = useState<string | null>(null);

  // Sessão e Identificação
  const [activeClient, setActiveClient] = useState<SalonClient | null>(null);
  const [authMode, setAuthMode] = useState<"login" | "register">("register");
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientPassword, setClientPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [clientEmail, setClientEmail] = useState("");
  const [authError, setAuthError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Agendamento Dinâmico de Preferência
  const [upcomingDays, setUpcomingDays] = useState<{
    dateStr: string;
    dayNum: number;
    weekDay: string;
    month: string;
    isToday: boolean;
    isTomorrow: boolean;
  }[]>([]);
  const [preferredDate, setPreferredDate] = useState("");

  // Dias com agenda aberta pela profissional
  const [daysList, setDaysList] = useState<AvailableDay[]>(initialAvailableDays || []);
  const [preferredPeriod, setPreferredPeriod] = useState<PreferredPeriod>("qualquer");

  useEffect(() => {
    const days = getUpcomingDays(14);
    setUpcomingDays(days);
    setPreferredDate(days[0]?.dateStr || "");
  }, []);

  const [preferredSlot, setPreferredSlot] = useState("09:30");
  const [selectedSlotObj, setSelectedSlotObj] = useState<AvailableSlot | DaySlotItem | null>(null);

  const [uploadedPhotos, setUploadedPhotos] = useState<{
    root?: string;
    length?: string;
    inspiration?: string;
  }>({});

  // Carrega cliente ativo se já houver sessão
  useEffect(() => {
    const existing = SalonStore.getActiveClient();
    if (existing) {
      setActiveClient(existing);
      setClientName(existing.name);
      setClientPhone(existing.phone);
      if (existing.email) setClientEmail(existing.email);
    }
  }, []);

  // Carrega os dias disponíveis da profissional
  useEffect(() => {
    if (initialAvailableDays && initialAvailableDays.length > 0) {
      setDaysList(initialAvailableDays);
      return;
    }

    const local = SalonStore.getAvailableDays(service.professionalId || "user-gleicy-ronha");
    if (local && local.length > 0) {
      setDaysList(local);
    }

    const todayStr = new Date().toISOString().split("T")[0];
    const futureDate = new Date(Date.now() + 60 * 86400000).toISOString().split("T")[0];

    SupabaseDataService.getAvailableDays(
      service.professionalId || "user-gleicy-ronha",
      todayStr,
      futureDate
    ).then((remote) => {
      if (remote && remote.length > 0) {
        setDaysList(remote);
      }
    }).catch(() => {});
  }, [initialAvailableDays, service.professionalId]);

  // Mapeamento de disponibilidade para as pílulas de dias
  const dayAvailabilityMap = useMemo(() => {
    const map: Record<string, { isOpen: boolean; hasSlots: boolean; availableCount: number }> = {};
    upcomingDays.forEach((day) => {
      const dConfig = daysList.find((d) => d.date === day.dateStr && d.isOpen);
      if (!dConfig) {
        map[day.dateStr] = { isOpen: false, hasSlots: false, availableCount: 0 };
      } else {
        const slots = calculateAvailableSlots(
          service,
          day.dateStr,
          service.professionalId || "user-gleicy-ronha",
          existingAppointments,
          {
            openMinutes: parseHHmmToMinutes(dConfig.startTime),
            closeMinutes: parseHHmmToMinutes(dConfig.endTime),
            breakStartMinutes: dConfig.breakStart ? parseHHmmToMinutes(dConfig.breakStart) : undefined,
            breakEndMinutes: dConfig.breakEnd ? parseHHmmToMinutes(dConfig.breakEnd) : undefined,
            slotIntervalMinutes: 30,
          }
        );
        map[day.dateStr] = {
          isOpen: true,
          hasSlots: slots.length > 0,
          availableCount: slots.length,
        };
      }
    });
    return map;
  }, [upcomingDays, daysList, service, existingAppointments]);

  // Configuração do dia selecionado
  const currentDayConfig = useMemo(() => {
    return daysList.find((d) => d.date === preferredDate && d.isOpen);
  }, [daysList, preferredDate]);

  const isDayOpen = Boolean(currentDayConfig);

  // Calcula a grade completa de horários do dia
  const dayGridSlots = useMemo(() => {
    if (!isDayOpen) return [];

    const salonConfig = {
      openMinutes: currentDayConfig ? parseHHmmToMinutes(currentDayConfig.startTime) : 8 * 60 + 30,
      closeMinutes: currentDayConfig ? parseHHmmToMinutes(currentDayConfig.endTime) : 19 * 60,
      breakStartMinutes: currentDayConfig?.breakStart ? parseHHmmToMinutes(currentDayConfig.breakStart) : undefined,
      breakEndMinutes: currentDayConfig?.breakEnd ? parseHHmmToMinutes(currentDayConfig.breakEnd) : undefined,
      slotIntervalMinutes: 30,
    };

    return calculateDaySlotGrid(
      service,
      preferredDate,
      service.professionalId || "user-gleicy-ronha",
      existingAppointments,
      salonConfig
    );
  }, [service, preferredDate, existingAppointments, isDayOpen, currentDayConfig]);

  const availableSlots = useMemo(() => dayGridSlots.filter((s) => s.isAvailable), [dayGridSlots]);

  // Se o dia estiver aberto e houver slots disponíveis, seleciona o primeiro se o atual não coincidir
  useEffect(() => {
    if (isDayOpen && availableSlots.length > 0) {
      const match = availableSlots.find((s) => s.time === preferredSlot);
      if (!match) {
        setPreferredSlot(availableSlots[0].time);
        setSelectedSlotObj(availableSlots[0]);
      } else {
        setSelectedSlotObj(match);
      }
    } else if (!isDayOpen) {
      setSelectedSlotObj(null);
      if (!preferredSlot.startsWith("Encaixe")) {
        setPreferredSlot("Encaixe (Flexível)");
      }
    }
  }, [availableSlots, preferredSlot, isDayOpen]);

  const [uploadingSlot, setUploadingSlot] = useState<string | null>(null);

  const handlePhotoUpload = async (slot: "root" | "length" | "inspiration", e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingSlot(slot);
      // 1. Otimiza no cliente usando canvas: reduz para máx 1400px e formato WebP qualidade 0.8
      const compressed = await compressImageFile(file, {
        maxDimension: 1400,
        quality: 0.8,
        mimeType: "image/webp",
      });

      // Salva de imediato para preview ultra-rápido no UI
      setUploadedPhotos((prev) => ({ ...prev, [slot]: compressed.dataUrl }));
      setStepValidationError(null);

      // 2. Faz upload para o Cloudflare R2 em segundo plano
      const publicUrl = await uploadImageToStorage(
        compressed.blob,
        `triage-${slot}-${Date.now()}.webp`,
        "triages"
      );

      // Atualiza com a URL final pública do Cloudflare R2
      if (publicUrl && publicUrl.startsWith("http")) {
        setUploadedPhotos((prev) => ({ ...prev, [slot]: publicUrl }));
      }
    } catch (err) {
      console.error("Erro ao comprimir/subir foto:", err);
    } finally {
      setUploadingSlot(null);
    }
  };

  const [isFinished, setIsFinished] = useState(false);

  // Perguntas + Etapa Final (Identificação e Agendamento)
  const totalQuestions = form.questions.length;
  const isIdentificationStep = currentStepIndex === totalQuestions;
  const progressPercent = Math.round(((currentStepIndex + 1) / (totalQuestions + 1)) * 100);

  const currentQuestion = form.questions[currentStepIndex];

  const handleSelectOption = (questionId: string, optionId: string, isMultiple = false) => {
    setStepValidationError(null);
    if (isMultiple) {
      const current = (answers[questionId] as string[]) || [];
      const updated = current.includes(optionId)
        ? current.filter((id) => id !== optionId)
        : [...current, optionId];
      setAnswers({ ...answers, [questionId]: updated });
    } else {
      setAnswers({ ...answers, [questionId]: optionId });
    }
  };

  const handleSwitchAccount = () => {
    SalonStore.setActiveClient(null);
    setActiveClient(null);
    setClientName("");
    setClientPhone("");
    setClientPassword("");
    setAuthMode("login");
  };

  const handleNext = async () => {
    if (currentStepIndex < totalQuestions) {
      if (currentQuestion && currentQuestion.required) {
        let isAnswered = false;
        if (currentQuestion.type === "photo_upload") {
          isAnswered = Boolean(
            uploadedPhotos.root || uploadedPhotos.length || uploadedPhotos.inspiration
          );
        } else if (currentQuestion.type === "multiple_choice" || currentQuestion.allowMultiple) {
          const val = answers[currentQuestion.id];
          isAnswered = Array.isArray(val) && val.length > 0;
        } else {
          const val = answers[currentQuestion.id];
          isAnswered = val !== undefined && val !== null && String(val).trim().length > 0;
        }

        if (!isAnswered) {
          setStepValidationError("⚠️ Por favor, selecione ou responda esta pergunta para continuar");
          return;
        }
      }

      setStepValidationError(null);
      setCurrentStepIndex(currentStepIndex + 1);
    } else {
      // Submissão Final com Autenticação e Registro da Cliente
      setAuthError("");
      setIsSubmitting(true);

      try {
        let clientToUse: SalonClient | null = activeClient;

        if (!clientToUse) {
          if (!clientPhone.trim()) {
            setAuthError("Informe seu número de WhatsApp.");
            setIsSubmitting(false);
            return;
          }

          if (!clientName.trim()) {
            setAuthError("Por favor, informe seu nome completo.");
            setIsSubmitting(false);
            return;
          }

          const newClient: SalonClient = {
            id: `cli-${Date.now()}`,
            name: clientName.trim(),
            phone: clientPhone.trim(),
            password: clientPassword?.trim() || "123456",
            email: clientEmail.trim() || undefined,
            createdAt: new Date().toISOString(),
            lastVisitAt: `${preferredDate}T${preferredSlot}:00Z`,
            lastServiceTitle: service.title,
          };

          const savedClient = await SupabaseDataService.saveClient(newClient);
          SalonStore.setActiveClient(savedClient);
          clientToUse = savedClient;
          setActiveClient(savedClient);
        }


        const submissionAnswers: TriageAnswer[] = form.questions
          .filter((q) => q.type !== "photo_upload")
          .map((q) => {
          const val = answers[q.id];
          const effectiveOptions =
            q.options && q.options.length > 0
              ? q.options
              : q.type === "curl_pattern"
              ? DEFAULT_CURL_OPTIONS
              : [];
          let labels: string[] = [];
          if (Array.isArray(val)) {
            labels = effectiveOptions.filter((o) => val.includes(o.id)).map((o) => o.label) || [];
          } else if (typeof val === "string") {
            const opt = effectiveOptions.find((o) => o.id === val);
            labels = opt ? [opt.label] : [val];
          }

          return {
            questionId: q.id,
            questionTitle: q.title,
            selectedOptionIds: Array.isArray(val) ? val : val ? [val] : [],
            selectedOptionLabels: labels,
            answerText: typeof val === "string" && effectiveOptions.length === 0 ? val : undefined,
          };
        });

        // Garante que se ainda houver fotos em base64 que não foram enviadas pro R2, sobe agora antes de salvar
        const finalPhotos = { ...uploadedPhotos };
        if (finalPhotos.root && finalPhotos.root.startsWith("data:")) {
          try {
            finalPhotos.root = await uploadImageToStorage(finalPhotos.root, `triage-root-${Date.now()}.webp`, "triages");
          } catch (e) {}
        }
        if (finalPhotos.length && finalPhotos.length.startsWith("data:")) {
          try {
            finalPhotos.length = await uploadImageToStorage(finalPhotos.length, `triage-length-${Date.now()}.webp`, "triages");
          } catch (e) {}
        }
        if (finalPhotos.inspiration && finalPhotos.inspiration.startsWith("data:")) {
          try {
            finalPhotos.inspiration = await uploadImageToStorage(finalPhotos.inspiration, `triage-inspiration-${Date.now()}.webp`, "triages");
          } catch (e) {}
        }

        const submission: TriageSubmission = {
          id: `sub-${Date.now()}`,
          orgId: form.orgId,
          formId: form.id,
          serviceId: service.id,
          serviceTitle: service.title,
          clientName: clientToUse.name,
          clientPhone: clientToUse.phone,
          clientEmail: clientToUse.email || clientEmail,
          preferredDate,
          preferredTimeSlot: preferredSlot,
          answers: submissionAnswers,
          photos: {
            currentHairRoot: finalPhotos.root,
            currentHairLength: finalPhotos.length,
            inspirationDesired: finalPhotos.inspiration,
          },
          status: "pending_review",
          submittedAt: new Date().toISOString(),
        };

        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
        });

        setIsFinished(true);
        onComplete(submission);
      } catch (err: any) {
        console.error("Erro na triagem:", err);
        setAuthError(err.message || "Erro ao processar. Tente novamente.");
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handlePrev = () => {
    setStepValidationError(null);
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
    } else {
      onCancel();
    }
  };

  if (isFinished) {
    return (
      <div className="max-w-xl mx-auto my-8 p-8 bg-white rounded-3xl shadow-xl border border-[#E7DCCE] text-center animate-fade-in">
        <div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mb-4">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <span className="text-xs font-semibold uppercase tracking-widest text-[#AD841D]">
          Triagem Enviada com Sucesso
        </span>
        <h2 className="font-editorial text-2xl sm:text-3xl font-bold text-[#2D1914] mt-1 mb-3">
          Seu Diagnóstico está com a Gleicy Ronha!
        </h2>
        <p className="text-xs sm:text-sm text-[#5E372C] leading-relaxed mb-6">
          Recebemos suas fotos e respostas. Como o procedimento <strong>{service.title}</strong> envolve química de alta performance, Gleicy irá analisar a integridade do seu cabelo e montar sua <strong>Proposta Personalizada</strong> com orçamento detalhado em até 24h a 48h.
        </p>

        <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#E7DCCE] text-left text-xs space-y-2 mb-6">
          <div className="flex items-center justify-between">
            <span className="text-stone-500">Horário pretendido:</span>
            <span className="font-bold text-[#2D1914] flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-[#C59B27]" />
              {preferredDate} às {preferredSlot}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-stone-500">Status da reserva:</span>
            <span className="text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full font-semibold">
              Pré-reserva Travada
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-stone-500">Contato:</span>
            <span className="font-medium text-[#2D1914]">{activeClient?.phone || clientPhone}</span>
          </div>
        </div>

        <button
          onClick={onCancel}
          className="w-full py-3 px-6 rounded-xl text-white gold-gradient font-bold text-xs shadow-md hover:opacity-95 transition-all"
        >
          Voltar à Vitrine
        </button>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Barra de Progresso Luxuosa */}
      <div className="mb-5">
        <div className="flex items-center justify-between text-xs text-[#7B493B] font-semibold mb-2">
          <span>
            {isIdentificationStep
              ? "Etapa Final: Agendamento & Contato"
              : `Pergunta ${currentStepIndex + 1} de ${totalQuestions}`}
          </span>
          <span className="font-bold text-[#AD841D]">{progressPercent}%</span>
        </div>
        <div className="w-full h-1.5 bg-[#E7DCCE] rounded-full overflow-hidden">
          <div
            className="h-full gold-gradient transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl sm:rounded-3xl p-3.5 sm:p-7 border border-[#E7DCCE]">
        {/* Passos de Perguntas */}
        {!isIdentificationStep && currentQuestion && (
          <div className="space-y-6">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FAF7F2] border border-[#E7DCCE] text-[10px] font-bold text-[#AD841D] uppercase tracking-wider mb-2">
                <Sparkles className="w-3 h-3 text-[#C59B27]" />
                <span>Diagnóstico Personalizado de Cachos</span>
              </div>
              <h2 className="font-editorial text-xl sm:text-2xl font-bold text-[#2D1914] leading-snug">
                {currentQuestion.title}
              </h2>
              {currentQuestion.subtitle && (
                <p className="text-xs sm:text-sm text-[#5E372C] mt-1.5 leading-relaxed">
                  {currentQuestion.subtitle}
                </p>
              )}
            </div>

            {/* Opções de Escolha Única, Múltipla ou Curvatura */}
            {(() => {
              const isOptionsType =
                currentQuestion.type === "single_choice" ||
                currentQuestion.type === "multiple_choice" ||
                currentQuestion.type === "curl_pattern" ||
                Boolean(currentQuestion.options && currentQuestion.options.length > 0);

              if (!isOptionsType) return null;

              const displayOptions =
                currentQuestion.options && currentQuestion.options.length > 0
                  ? currentQuestion.options
                  : currentQuestion.type === "curl_pattern"
                  ? DEFAULT_CURL_OPTIONS
                  : [];

              if (displayOptions.length === 0) return null;

              const isMultiple =
                currentQuestion.type === "multiple_choice" || Boolean(currentQuestion.allowMultiple);

              return (
                <div className="space-y-3">
                  {isMultiple && (
                    <div className="flex items-center gap-1.5 text-xs text-[#AD841D] font-bold bg-[#FAF7F2] border border-[#E7DCCE] px-3 py-1.5 rounded-xl w-fit">
                      <Sparkles className="w-3.5 h-3.5 text-[#C59B27]" />
                      <span>Você pode selecionar mais de uma opção</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {displayOptions.map((option) => {
                      const isSelected = isMultiple
                        ? ((answers[currentQuestion.id] as string[]) || []).includes(option.id)
                        : answers[currentQuestion.id] === option.id;

                      return (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() =>
                            handleSelectOption(currentQuestion.id, option.id, isMultiple)
                          }
                          className={`p-4 rounded-2xl border text-left transition-all flex items-start space-x-3 group ${
                            isSelected
                              ? "border-[#C59B27] bg-[#FDF9F0] ring-2 ring-[#C59B27]/30 shadow-xs"
                              : "border-[#E7DCCE] bg-white hover:border-[#AD841D]/50 hover:bg-[#FAF7F2]"
                          }`}
                        >
                          <div
                            className={`w-5 h-5 rounded-${
                              isMultiple ? "md" : "full"
                            } border flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                              isSelected
                                ? "border-[#C59B27] bg-[#C59B27] text-white"
                                : "border-[#D9C4B0] bg-white group-hover:border-[#AD841D]"
                            }`}
                          >
                            {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                          <div className="flex-1">
                            <span
                              className={`text-xs sm:text-sm font-semibold block ${
                                isSelected ? "text-[#2D1914]" : "text-[#44271F]"
                              }`}
                            >
                              {option.label}
                            </span>
                            {option.description && (
                              <span className="text-[11px] text-stone-500 mt-0.5 block leading-tight">
                                {option.description}
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* Módulo Especial de Envio de Fotos Reais */}
            {currentQuestion.type === "photo_upload" && (
              <div className="space-y-4">
                <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/80 text-xs text-amber-900 flex items-start space-x-2.5">
                  <Lightbulb className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <p>
                    Fotos reais tiradas sob luz natural permitem à Gleicy avaliar com precisão a saúde das cutículas, elasticidade e fundo de clareamento do seu cabelo.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { key: "root" as const, title: "Foto da Raiz", desc: "Mostre o contraste natural" },
                    { key: "length" as const, title: "Comprimento e Pontas", desc: "Visão do volume e curvatura" },
                    { key: "inspiration" as const, title: "Foto de Inspiração", desc: "O resultado que você sonha" },
                  ].map((slot) => {
                    const uploaded = uploadedPhotos[slot.key];
                    return (
                      <div
                        key={slot.key}
                        className={`relative rounded-2xl border-2 border-dashed transition-all p-3 text-center flex flex-col items-center justify-center min-h-[160px] ${
                          uploaded
                            ? "border-emerald-400 bg-emerald-50/30"
                            : "border-[#E7DCCE] hover:border-[#AD841D] bg-[#FAF7F2]/50 hover:bg-[#FAF7F2]"
                        }`}
                      >
                        <input
                          type="file"
                          accept="image/*"
                          id={`photo-input-${slot.key}`}
                          className="hidden"
                          onChange={(e) => handlePhotoUpload(slot.key, e)}
                        />

                        {uploaded ? (
                          <div className="relative w-full h-full flex flex-col items-center justify-center">
                            <img
                              src={uploaded}
                              alt={slot.title}
                              className="w-full h-28 object-cover rounded-xl shadow-xs mb-2 border border-[#E7DCCE]"
                            />
                            <div className="flex items-center gap-1.5 text-xs text-emerald-800 font-bold">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>{slot.title} pronta</span>
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <label
                                htmlFor={`photo-input-${slot.key}`}
                                className="text-[11px] font-semibold text-[#AD841D] hover:underline cursor-pointer"
                              >
                                Alterar
                              </label>
                              <span className="text-stone-300">•</span>
                              <button
                                type="button"
                                onClick={() =>
                                  setUploadedPhotos((prev) => ({
                                    ...prev,
                                    [slot.key]: undefined,
                                  }))
                                }
                                className="text-[11px] font-semibold text-red-600 hover:underline"
                              >
                                Remover
                              </button>
                            </div>
                          </div>
                        ) : (
                          <label
                            htmlFor={`photo-input-${slot.key}`}
                            className="cursor-pointer flex flex-col items-center justify-center py-6 px-3 h-full hover:bg-white rounded-xl transition-all"
                          >
                            <div className="w-10 h-10 rounded-full bg-white shadow-2xs border border-[#E7DCCE] flex items-center justify-center mb-2 text-[#C59B27] group-hover:scale-110 transition-transform">
                              <UploadCloud className="w-5 h-5" />
                            </div>
                            <span className="text-xs font-bold text-[#2D1914] block mb-0.5">
                              {slot.title}
                            </span>
                            <span className="text-[10px] text-stone-500 block mb-2 leading-tight">
                              {slot.desc}
                            </span>
                            <span className="text-[11px] font-bold text-[#AD841D] bg-white border border-[#E7DCCE] px-2.5 py-1 rounded-lg shadow-2xs group-hover:border-[#C59B27]">
                              Enviar Foto
                            </span>
                          </label>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 text-center text-xs text-stone-600 flex items-center justify-center gap-2">
                  <Camera className="w-4 h-4 text-[#C59B27]" />
                  <span>
                    No celular, você pode tirar a foto agora mesmo ou selecionar da sua galeria.
                  </span>
                </div>
              </div>
            )}

            {/* Campo de Texto Livre */}
            {currentQuestion.type === "text" && (
              <div>
                <textarea
                  rows={4}
                  value={answers[currentQuestion.id] || ""}
                  onChange={(e) => {
                    setStepValidationError(null);
                    setAnswers({ ...answers, [currentQuestion.id]: e.target.value });
                  }}
                  placeholder={currentQuestion.placeholder || "Digite sua resposta..."}
                  className="w-full p-4 rounded-2xl border border-[#E7DCCE] focus:border-[#C59B27] focus:ring-2 focus:ring-[#C59B27]/20 outline-none text-xs sm:text-sm text-[#2D1914] bg-[#FDFBF7]"
                />
              </div>
            )}

            {stepValidationError && (
              <p className="text-red-400 text-sm mt-2 animate-pulse">
                {stepValidationError}
              </p>
            )}
          </div>
        )}

        {/* Etapa Final: Identificação Segura da Cliente & Agendamento Dinâmico */}
        {isIdentificationStep && (
          <div className="space-y-6">
            <div className="border-b border-[#E7DCCE]/60 pb-4">
              <div className="flex items-center space-x-2 text-[11px] font-bold uppercase tracking-wider text-[#AD841D] mb-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Etapa Final • Agendamento & Portal da Cliente</span>
              </div>

              <h2 className="font-editorial text-xl sm:text-2xl font-bold text-[#2D1914]">
                Escolha seu Dia & Crie seu Acesso
              </h2>
              <p className="text-xs sm:text-sm text-[#683C30] mt-1">
                Seu número e senha permitirão acompanhar o status da proposta e seu histórico no Espaço Gleicy Ronha.
              </p>
            </div>

            {authError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                <span>{authError}</span>
              </div>
            )}

            {/* SEÇÃO 1: Autenticação da Cliente (Telefone + Senha) */}
            <div className="p-4 sm:p-5 rounded-2xl bg-[#FAF7F2] border border-[#E7DCCE] space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#2D1914] flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-[#C59B27]" />
                  <span>Dados da Cliente & Senha de Acesso:</span>
                </span>

                {!activeClient && (
                  <div className="flex bg-white p-0.5 rounded-xl border border-[#E7DCCE] text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode("register");
                        setAuthError("");
                      }}
                      className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                        authMode === "register"
                          ? "bg-[#2D1914] text-white font-bold"
                          : "text-stone-600"
                      }`}
                    >
                      Criar Cadastro
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode("login");
                        setAuthError("");
                      }}
                      className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                        authMode === "login"
                          ? "bg-[#2D1914] text-white font-bold"
                          : "text-stone-600"
                      }`}
                    >
                      Já sou Cliente
                    </button>
                  </div>
                )}
              </div>

              {activeClient ? (
                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-emerald-950 block">
                      Conectada como {activeClient.name}
                    </span>
                    <span className="text-[11px] text-emerald-800">
                      WhatsApp: {activeClient.phone}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleSwitchAccount}
                    className="text-xs font-semibold text-emerald-800 hover:text-emerald-950 underline"
                  >
                    Trocar Conta
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#1D3D3C] mb-1">
                      Seu Nome Completo *
                    </label>
                    <input
                      type="text"
                      required
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      placeholder="Ex: Beatriz Lima"
                      className="w-full p-2.5 rounded-xl border border-[#D8D0BD] bg-white text-xs focus:border-[#C7A03A] outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#1D3D3C] mb-1">
                      WhatsApp com DDD *
                    </label>
                    <input
                      type="tel"
                      required
                      value={clientPhone}
                      onChange={(e) => setClientPhone(e.target.value)}
                      placeholder="Ex: (11) 99597-5725"
                      className="w-full p-2.5 rounded-xl border border-[#D8D0BD] bg-white text-xs focus:border-[#C7A03A] outline-none"
                    />
                  </div>
                </div>

              )}
            </div>

            {/* SEÇÃO 2: Seleção de Dia & Horários Disponíveis Dinâmicos */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[#2D1914] flex items-center gap-1.5">
                  <CalendarDays className="w-4 h-4 text-[#C59B27]" />
                  <span>Escolha o Dia da Pré-Reserva:</span>
                </label>
                <div className="flex items-center gap-1 text-[11px] text-[#7B493B]">
                  <Calendar className="w-3.5 h-3.5 text-[#AD841D]" />
                  <input
                    type="date"
                    value={preferredDate}
                    onChange={(e) => setPreferredDate(e.target.value)}
                    className="bg-transparent border-b border-[#C59B27] font-semibold text-[#2D1914] text-xs outline-none cursor-pointer"
                  />
                </div>
              </div>

              {/* Pílulas de Dias Próximos com Status Visual */}
              <div className="flex gap-1.5 sm:gap-2 overflow-x-auto pb-1.5 no-scrollbar sm:scrollbar-thin">
                {upcomingDays.slice(0, 12).map((day) => {
                  const isSelected = preferredDate === day.dateStr;
                  const dayStatus = dayAvailabilityMap[day.dateStr] || { isOpen: false, hasSlots: false, availableCount: 0 };
                  return (
                    <button
                      key={day.dateStr}
                      type="button"
                      onClick={() => setPreferredDate(day.dateStr)}
                      className={`shrink-0 px-3 py-2 rounded-xl border text-center transition-all ${
                        isSelected
                          ? "bg-[#2D1914] text-white border-[#2D1914] shadow-xs"
                          : "bg-white text-[#44271F] border-[#E7DCCE] hover:bg-[#FAF7F2]"
                      }`}
                    >
                      <span className="block text-[9px] uppercase font-bold tracking-wider opacity-80">
                        {day.isToday ? "Hoje" : day.weekDay}
                      </span>
                      <span className="block text-sm font-extrabold">{day.dayNum}</span>
                      <span
                        className={`inline-block mt-0.5 text-[8px] font-bold px-1.5 py-0.2 rounded-full ${
                          isSelected
                            ? "bg-white/20 text-white"
                            : !dayStatus.isOpen
                            ? "bg-stone-100 text-stone-500"
                            : dayStatus.hasSlots
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {!dayStatus.isOpen
                          ? "Fechada"
                          : dayStatus.hasSlots
                          ? `${dayStatus.availableCount} vagas`
                          : "Esgotado"}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Quando a data NÃO está aberta: Exibir Solicitação de Encaixe Especial */}
              {!isDayOpen ? (
                <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-amber-50 to-[#FDF8EE] border border-amber-200 space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 rounded-xl bg-amber-100 text-amber-800 shrink-0 mt-0.5">
                      <Zap className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-amber-950 flex items-center gap-1.5">
                        <span>Data Fora da Grade Regular • Solicitação de Encaixe Especial</span>
                      </h3>
                      <p className="text-xs text-amber-900 mt-1 leading-relaxed">
                        A agenda regular da Gleicy não está aberta nesta data. No entanto, você pode enviar suas respostas e fotos como uma <strong>Solicitação de Encaixe Especial</strong>. A Gleicy analisará a viabilidade de agenda ou encaixe durante pausas químicas e entrará em contato via WhatsApp.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2 pt-1 border-t border-amber-200/60">
                    <label className="text-xs font-semibold text-stone-700 block">
                      Qual período você prefere para o encaixe?
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setPreferredPeriod("manha");
                          setPreferredSlot("Encaixe (Manhã)");
                        }}
                        className={`p-2.5 rounded-xl border text-center transition-all ${
                          preferredPeriod === "manha"
                            ? "border-amber-600 bg-amber-100/80 font-bold text-amber-950 shadow-xs"
                            : "border-stone-200 bg-white text-stone-600 hover:bg-stone-50"
                        }`}
                      >
                        <Sun className="w-4 h-4 mx-auto mb-1 text-amber-600" />
                        <span className="text-xs block font-bold">Manhã</span>
                        <span className="text-[10px] text-stone-400">09h às 12h</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setPreferredPeriod("tarde");
                          setPreferredSlot("Encaixe (Tarde)");
                        }}
                        className={`p-2.5 rounded-xl border text-center transition-all ${
                          preferredPeriod === "tarde"
                            ? "border-amber-600 bg-amber-100/80 font-bold text-amber-950 shadow-xs"
                            : "border-stone-200 bg-white text-stone-600 hover:bg-stone-50"
                        }`}
                      >
                        <Moon className="w-4 h-4 mx-auto mb-1 text-amber-600" />
                        <span className="text-xs block font-bold">Tarde</span>
                        <span className="text-[10px] text-stone-400">13h às 18h</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setPreferredPeriod("qualquer");
                          setPreferredSlot("Encaixe (Flexível)");
                        }}
                        className={`p-2.5 rounded-xl border text-center transition-all ${
                          preferredPeriod === "qualquer"
                            ? "border-amber-600 bg-amber-100/80 font-bold text-amber-950 shadow-xs"
                            : "border-stone-200 bg-white text-stone-600 hover:bg-stone-50"
                        }`}
                      >
                        <Zap className="w-4 h-4 mx-auto mb-1 text-amber-600" />
                        <span className="text-xs block font-bold">Flexível</span>
                        <span className="text-[10px] text-stone-400">Qualquer horário</span>
                      </button>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-white/80 border border-amber-200/80 text-[11px] text-amber-900 flex items-center gap-2">
                    <Info className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>
                      Sua solicitação entrará com prioridade para resposta personalizada no WhatsApp após o envio da triagem.
                    </span>
                  </div>
                </div>
              ) : (
                /* Quando a data ESTÁ aberta: Exibir Grade Completa (Livres, Ocupados e Encaixes) */
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-semibold text-[#5E372C] block">
                      Horários para {service.title}:
                    </span>
                    <div className="flex items-center gap-3 text-[10px]">
                      <span className="flex items-center gap-1 text-emerald-700 font-semibold">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                        {availableSlots.length} Livres
                      </span>
                      <span className="flex items-center gap-1 text-stone-400 font-medium">
                        <span className="w-2 h-2 rounded-full bg-stone-300 inline-block" />
                        {dayGridSlots.filter((s) => s.status === "occupied").length} Ocupados
                      </span>
                      {dayGridSlots.some((s) => s.isEncaixe) && (
                        <span className="flex items-center gap-1 text-amber-700 font-bold">
                          <Zap className="w-2.5 h-2.5 text-amber-500" />
                          Encaixe
                        </span>
                      )}
                    </div>
                  </div>

                  {availableSlots.length === 0 ? (
                    <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-center text-xs text-amber-900 space-y-1">
                      <p className="font-bold">Todos os horários desta data estão ocupados.</p>
                      <p className="text-[11px] text-amber-800">
                        Selecione outra data acima com vagas disponíveis ou escolha uma data fechada para solicitar encaixe especial.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-1.5 sm:gap-2 max-h-52 overflow-y-auto p-0.5 scrollbar-thin">
                      {dayGridSlots.map((slot, idx) => {
                        const isSelected = preferredSlot === slot.time && slot.isAvailable;
                        const isOccupied = slot.status === "occupied";
                        const isBreak = slot.status === "break";
                        const isPast = slot.status === "past";
                        const isClickable = slot.isAvailable;

                        if (isBreak || isPast) return null;

                        return (
                          <button
                            key={idx}
                            type="button"
                            disabled={!isClickable}
                            onClick={() => {
                              if (isClickable) {
                                setPreferredSlot(slot.time);
                                setSelectedSlotObj(slot);
                              }
                            }}
                            title={isOccupied ? "Horário indisponível: Já existe um atendimento agendado neste período." : slot.conflictReason}
                            className={`p-2.5 rounded-xl text-xs font-semibold border text-center transition-all flex flex-col items-center justify-center relative ${
                              isSelected
                                ? "border-[#C59B27] bg-[#FDF9F0] text-[#2D1914] ring-2 ring-[#C59B27]/40 shadow-xs"
                                : isOccupied
                                ? "border-stone-200 bg-stone-100/80 text-stone-400 cursor-not-allowed opacity-60"
                                : slot.isEncaixe
                                ? "border-amber-300 bg-amber-50 text-amber-950 hover:bg-amber-100"
                                : "border-[#E7DCCE] bg-white text-[#44271F] hover:bg-[#FAF7F2]"
                            }`}
                          >
                            <div className="flex items-center gap-1 font-extrabold">
                              {isOccupied && <Lock className="w-2.5 h-2.5 text-stone-400" />}
                              <span>{slot.time}</span>
                            </div>

                            <span className="text-[9px] text-stone-500">
                              {isOccupied ? "Ocupado" : `até ${slot.endTime}`}
                            </span>

                            {slot.isEncaixe && (
                              <span className="mt-1 px-1.5 py-0.2 rounded-full text-[8px] bg-amber-200 text-amber-900 font-bold flex items-center gap-0.5">
                                <Zap className="w-2 h-2 text-amber-700" />
                                Pausa Química
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {selectedSlotObj?.isEncaixe && (
                    <div className="mt-2.5 p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-900 flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span>
                        <strong>Horário Otimizado (Encaixe em Pausa Química):</strong> Este slot se inicia no momento em que outro procedimento entra em tempo de pausa, permitindo seu atendimento com total dedicação e sem espera!
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Controles de Navegação */}
        <div className="mt-8 pt-6 border-t border-[#E7DCCE]/60 flex items-center justify-between">
          <button
            type="button"
            onClick={handlePrev}
            className="px-4 py-2.5 rounded-xl text-xs font-semibold text-[#5E372C] hover:bg-[#F3ECE1] flex items-center space-x-1 transition-all"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Voltar</span>
          </button>

          <button
            type="button"
            onClick={handleNext}
            disabled={isSubmitting}
            className="px-6 py-2.5 rounded-xl text-xs font-bold text-white gold-gradient shadow-md hover:opacity-95 flex items-center space-x-1.5 transition-all active:scale-95 disabled:opacity-50"
          >
            {isSubmitting ? (
              <span>Salvando...</span>
            ) : (
              <>
                <span>
                  {isIdentificationStep
                    ? "Enviar Diagnóstico & Bloquear Horário"
                    : "Avançar"}
                </span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
