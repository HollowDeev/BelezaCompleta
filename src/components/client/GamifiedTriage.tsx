"use client";

import { useState, useEffect, useMemo } from "react";
import { TriageForm, TriageQuestion, TriageSubmission, TriageAnswer } from "@/types/triage";
import { ServiceItem } from "@/types/service";
import { Appointment } from "@/types/appointment";
import { SalonClient } from "@/types/client";
import { calculateAvailableSlots, AvailableSlot } from "@/lib/scheduling/engine";
import { SalonStore } from "@/lib/storage/localStore";
import { SupabaseDataService } from "@/lib/supabase/api";
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
} from "lucide-react";
import confetti from "canvas-confetti";

interface GamifiedTriageProps {
  service: ServiceItem;
  form: TriageForm;
  existingAppointments?: Appointment[];
  onComplete: (submission: TriageSubmission) => void;
  onCancel: () => void;
}

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
  const upcomingDays = useMemo(() => getUpcomingDays(14), []);
  const [preferredDate, setPreferredDate] = useState(upcomingDays[0]?.dateStr || "2026-10-18");
  const [preferredSlot, setPreferredSlot] = useState("09:30");
  const [selectedSlotObj, setSelectedSlotObj] = useState<AvailableSlot | null>(null);

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

  // Cálculo Dinâmico de Slots pelo Motor
  const availableSlots = useMemo(() => {
    return calculateAvailableSlots(
      service,
      preferredDate,
      service.professionalId || "user-gleicy-ronha",
      existingAppointments
    );
  }, [service, preferredDate, existingAppointments]);

  // Se o slot atual não estiver na lista de disponíveis, seleciona o primeiro
  useEffect(() => {
    if (availableSlots.length > 0) {
      const match = availableSlots.find((s) => s.time === preferredSlot);
      if (!match) {
        setPreferredSlot(availableSlots[0].time);
        setSelectedSlotObj(availableSlots[0]);
      } else {
        setSelectedSlotObj(match);
      }
    }
  }, [availableSlots, preferredSlot]);

  const handlePhotoUpload = (slot: "root" | "length" | "inspiration", e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const maxDim = 1200;
        let width = img.width;
        let height = img.height;
        if (width > height && width > maxDim) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else if (height > maxDim) {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL("image/jpeg", 0.82);
          setUploadedPhotos((prev) => ({ ...prev, [slot]: compressedDataUrl }));
          setStepValidationError(null);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
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
        } else if (currentQuestion.type === "multiple_choice") {
          const val = answers[currentQuestion.id];
          isAnswered = Array.isArray(val) && val.length > 0;
        } else {
          const val = answers[currentQuestion.id];
          isAnswered = val !== undefined && val !== null && String(val).trim().length > 0;
        }

        if (!isAnswered) {
          setStepValidationError("⚠️ Por favor, responda esta pergunta para continuar");
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

          if (authMode === "login") {
            const loginRes = await SupabaseDataService.loginClient(clientPhone, clientPassword);
            if (!loginRes.success || !loginRes.client) {
              setAuthError(loginRes.message || "Telefone ou senha inválidos.");
              setIsSubmitting(false);
              return;
            }
            clientToUse = loginRes.client;
            setActiveClient(loginRes.client);
          } else {
            if (!clientName.trim()) {
              setAuthError("Por favor, informe seu nome completo.");
              setIsSubmitting(false);
              return;
            }
            if (!clientPassword || clientPassword.length < 3) {
              setAuthError("Crie uma senha de acesso com no mínimo 3 caracteres.");
              setIsSubmitting(false);
              return;
            }

            const newClient: SalonClient = {
              id: `cli-${Date.now()}`,
              name: clientName.trim(),
              phone: clientPhone.trim(),
              password: clientPassword.trim(),
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
        }

        const submissionAnswers: TriageAnswer[] = form.questions.map((q) => {
          const val = answers[q.id];
          let labels: string[] = [];
          if (Array.isArray(val)) {
            labels = q.options?.filter((o) => val.includes(o.id)).map((o) => o.label) || [];
          } else if (typeof val === "string") {
            const opt = q.options?.find((o) => o.id === val);
            labels = opt ? [opt.label] : [val];
          }

          return {
            questionId: q.id,
            questionTitle: q.title,
            selectedOptionIds: Array.isArray(val) ? val : val ? [val] : [],
            selectedOptionLabels: labels,
            answerText: typeof val === "string" && !q.options ? val : undefined,
          };
        });

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
            currentHairRoot: uploadedPhotos.root,
            currentHairLength: uploadedPhotos.length,
            inspirationDesired: uploadedPhotos.inspiration,
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
    <div className="max-w-3xl mx-auto my-6 px-4">
      {/* Barra de Progresso Luxuosa */}
      <div className="mb-6">
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

      <div className="bg-white rounded-3xl p-6 sm:p-9 shadow-xl border border-[#E7DCCE]">
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

            {/* Opções de Escolha Única ou Múltipla */}
            {(currentQuestion.type === "single_choice" ||
              currentQuestion.type === "multiple_choice") &&
              currentQuestion.options && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {currentQuestion.options.map((option) => {
                    const isMultiple = currentQuestion.type === "multiple_choice";
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
              )}

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
                  {authMode === "register" && (
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-[#2D1914] mb-1">
                        Seu Nome Completo *
                      </label>
                      <input
                        type="text"
                        required
                        value={clientName}
                        onChange={(e) => setClientName(e.target.value)}
                        placeholder="Ex: Isa Franca"
                        className="w-full p-2.5 rounded-xl border border-[#E7DCCE] bg-white text-xs focus:border-[#C59B27] outline-none"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-[#2D1914] mb-1">
                      WhatsApp com DDD *
                    </label>
                    <input
                      type="tel"
                      required
                      value={clientPhone}
                      onChange={(e) => setClientPhone(e.target.value)}
                      placeholder="Ex: (11) 98765-4321"
                      className="w-full p-2.5 rounded-xl border border-[#E7DCCE] bg-white text-xs focus:border-[#C59B27] outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#2D1914] mb-1">
                      {authMode === "register" ? "Crie sua Senha *" : "Sua Senha de Acesso *"}
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        value={clientPassword}
                        onChange={(e) => setClientPassword(e.target.value)}
                        placeholder={authMode === "register" ? "Mínimo 3 caracteres" : "Sua senha"}
                        className="w-full p-2.5 pr-9 rounded-xl border border-[#E7DCCE] bg-white text-xs focus:border-[#C59B27] outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2.5 top-2 text-stone-400 hover:text-stone-700"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
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

              {/* Pílulas de Dias Próximos */}
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
                {upcomingDays.slice(0, 10).map((day) => {
                  const isSelected = preferredDate === day.dateStr;
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
                    </button>
                  );
                })}
              </div>

              {/* Grade de Horários Dinâmicos */}
              <div>
                <span className="text-[11px] font-semibold text-[#5E372C] block mb-2">
                  Horários Disponíveis para {service.title} ({availableSlots.length} opções):
                </span>

                {availableSlots.length === 0 ? (
                  <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 text-center text-xs text-stone-500">
                    Agenda cheia nesta data. Selecione outro dia acima!
                  </div>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 max-h-48 overflow-y-auto p-0.5 scrollbar-thin">
                    {availableSlots.map((slot, idx) => {
                      const isSelected = preferredSlot === slot.time;
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setPreferredSlot(slot.time);
                            setSelectedSlotObj(slot);
                          }}
                          className={`p-2.5 rounded-xl text-xs font-semibold border text-center transition-all flex flex-col items-center justify-center relative ${
                            isSelected
                              ? "border-[#C59B27] bg-[#FDF9F0] text-[#2D1914] ring-2 ring-[#C59B27]/40 shadow-xs"
                              : slot.isEncaixe
                              ? "border-amber-300 bg-amber-50 text-amber-950 hover:bg-amber-100"
                              : "border-[#E7DCCE] bg-white text-[#44271F] hover:bg-[#FAF7F2]"
                          }`}
                        >
                          <span className="font-extrabold">{slot.time}</span>
                          <span className="text-[9px] text-stone-500">até {slot.endTime}</span>
                          {slot.isEncaixe && (
                            <span className="mt-1 px-1 py-0.2 rounded-full text-[8px] bg-amber-200 text-amber-900 font-bold flex items-center gap-0.5">
                              <Zap className="w-2 h-2 text-amber-700" />
                              Encaixe
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {selectedSlotObj?.isEncaixe && (
                <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-900 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>
                    <strong>Horário Otimizado:</strong> Este slot se inicia durante a pausa química de outro atendimento, sem nenhuma espera!
                  </span>
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
