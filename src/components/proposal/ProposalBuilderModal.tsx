"use client";

import { useState, useMemo, useEffect } from "react";
import { TriageSubmission } from "@/types/triage";
import {
  LuxuryProposal,
  ProposalItem,
  ProposalSchedulingDetails,
  ProposalTechnicalStep,
} from "@/types/proposal";
import { ServiceItem } from "@/types/service";
import { PreReservation, AvailableDay } from "@/types/availability";
import { Appointment } from "@/types/appointment";
import { formatBRL } from "@/lib/utils";
import { PhotoGalleryLightbox, GalleryPhoto } from "@/components/common/PhotoGalleryLightbox";
import {
  validateProposalScheduleFeasibility,
  ProposalFeasibilityResult,
} from "@/lib/scheduling/engine";
import {
  Sparkles,
  CheckCircle2,
  X,
  FileText,
  DollarSign,
  Plus,
  Trash2,
  AlertTriangle,
  Layers,
  Scissors,
  HelpCircle,
  Percent,
  Check,
  Calendar,
  Clock,
  ArrowRight,
  Info,
  CalendarDays,
  AlertCircle,
  Clock4,
  MessageCircle,
} from "lucide-react";

interface ProposalBuilderModalProps {
  submission: TriageSubmission;
  initialProposal?: LuxuryProposal | null;
  services?: ServiceItem[];
  preReservation?: PreReservation | null;
  existingAppointments?: Appointment[];
  availableDays?: AvailableDay[];
  onSave: (proposal: LuxuryProposal, openWhatsApp?: boolean) => void;
  onClose: () => void;
}

export function ProposalBuilderModal({
  submission,
  initialProposal,
  services = [],
  preReservation,
  existingAppointments = [],
  availableDays = [],
  onSave,
  onClose,
}: ProposalBuilderModalProps) {
  // 1. Identificação de Encaixe / Pré-Reserva
  const isEncaixe = useMemo(() => {
    return (
      Boolean(preReservation) ||
      submission.preferredTimeSlot?.toLowerCase().includes("encaixe") ||
      submission.preferredTimeSlot?.toLowerCase().includes("flex") ||
      submission.preferredTimeSlot?.toLowerCase().includes("reserva")
    );
  }, [preReservation, submission.preferredTimeSlot]);

  // Data e Horário Solicitados pela Cliente
  const clientRequestedDate = useMemo(() => {
    return (
      preReservation?.requestedDate ||
      submission.preferredDate ||
      new Date().toISOString().split("T")[0]
    );
  }, [preReservation, submission.preferredDate]);

  const clientRequestedTime = useMemo(() => {
    return (
      preReservation?.preferredTime ||
      submission.preferredTimeSlot ||
      "Horário flexível"
    );
  }, [preReservation, submission.preferredTimeSlot]);

  // 2. Identificação do Serviço Escolhido pela Cliente
  const matchedService = useMemo(() => {
    return (
      services.find(
        (s) =>
          s.id === submission.serviceId ||
          s.title.toLowerCase() === submission.serviceTitle?.toLowerCase()
      ) ||
      services.find((s) =>
        submission.serviceTitle?.toLowerCase().includes(s.title.toLowerCase())
      ) ||
      services[0]
    );
  }, [services, submission.serviceId, submission.serviceTitle]);

  // 3. Extração e Análise Inteligente das Respostas da Triagem
  const safeAnswers = useMemo(
    () => (Array.isArray(submission?.answers) ? submission.answers : []),
    [submission?.answers]
  );

  const curvatureAns = useMemo(() => {
    return (
      safeAnswers.find(
        (a) =>
          a.questionTitle?.toLowerCase().includes("curvatura") ||
          a.questionId?.includes("curv")
      )?.selectedOptionLabels?.[0] || ""
    );
  }, [safeAnswers]);

  const chemicalAnswers = useMemo(() => {
    return (
      safeAnswers.find(
        (a) =>
          a.questionTitle?.toLowerCase().includes("química") ||
          a.questionId?.includes("quimica")
      )?.selectedOptionLabels || []
    );
  }, [safeAnswers]);

  const hasChemicalHistory = useMemo(() => {
    return chemicalAnswers.some(
      (c) =>
        !c.toLowerCase().includes("nenhuma") &&
        !c.toLowerCase().includes("natural")
    );
  }, [chemicalAnswers]);

  // 4. Algoritmo de Preenchimento Automático Baseado no Serviço Real
  const smartDefaults = useMemo(() => {
    const serviceTitle =
      matchedService?.title ||
      submission.serviceTitle ||
      "Transformação Personalizada";
    const servicePrice = Number(matchedService?.price) || 710;
    const isCurls =
      curvatureAns.toLowerCase().includes("cacheado") ||
      curvatureAns.toLowerCase().includes("crespo") ||
      curvatureAns.toLowerCase().includes("ondulado");

    // Overview inteligente contextualizado
    let overview = `${submission.clientName},\n\nA proposta para o seu cabelo foi desenhada de forma 100% exclusiva para o procedimento de ${serviceTitle}.`;
    if (isCurls) {
      overview += `\n\nRespeitando seu padrão de curvatura natural ${
        curvatureAns ? `(${curvatureAns})` : ""
      }, nosso objetivo é alcançar um resultado de alta definição, com iluminação harmônica e sem linhas de demarcação no crescimento, preservando a elasticidade natural dos fios.`;
    } else {
      overview += `\n\nO objetivo é criar uma transição suave e luminosa, respeitando o fundo natural dos fios e entregando máxima vitalidade e brilho.`;
    }

    if (hasChemicalHistory) {
      overview += `\n\nComo seu histórico recente inclui ${chemicalAnswers.join(
        ", "
      )}, o plano contempla protocolos dedicados de proteção e estabilização lipídica para assegurar a integridade total da fibra capilar.`;
    }

    // Técnica escolhida contextualizada
    let technique = `Para a realização de ${serviceTitle}, aplicaremos técnica personalizada da Gleicy Ronha.`;
    if (hasChemicalHistory) {
      technique += ` O procedimento contará com produtos superclareadores de liberação gradual e barreira lipídica, minimizando atrito químico nas mechas sensibilizadas por procedimentos anteriores.`;
    } else {
      technique += ` Abertura de tom controlada e direcionada mecha a mecha, garantindo definição de curvatura, retenção de umidade e ausência de ressecamento.`;
    }

    // Manutenção recomendada
    const maintenance = `A proposta é criar um resultado com baixa manutenção. O crescimento da raiz preservará a naturalidade sem exigir retoques mensais ou procedimentos corretivos frequentes. Serão indicados protocolos de home care adequados para a curvatura natural.`;

    // Módulos iniciais inteligentes
    const initialModules: ProposalItem[] = [];

    // Se a cliente tem química ou fragilidade, sugere módulo preparatório anterior
    if (hasChemicalHistory) {
      const treatmentService = services.find(
        (s) => s.category === "tratamento"
      ) || {
        id: "srv-prep-sugerido",
        title: "Protocolo de Reposição Lipídica Pré-Química",
        price: 220,
      };

      initialModules.push({
        id: `module-prep-${Date.now()}`,
        serviceTitle: treatmentService.title,
        originalPrice: treatmentService.price,
        moduleType: "preparatory",
        explanation: `Indicado devido ao histórico de química (${chemicalAnswers.join(
          ", "
        )}) para repor nutrientes essenciais e preparar a estrutura dos fios antes da transformação química.`,
      });
    }

    // Módulo Final: sempre o serviço escolhido pela cliente
    initialModules.push({
      id: `module-final-${Date.now()}`,
      serviceTitle: serviceTitle,
      originalPrice: servicePrice,
      moduleType: "final",
      explanation: "Procedimento principal de transformação escolhido pela cliente.",
    });

    return {
      title: "PROPOSTA PERSONALIZADA",
      subtitle: `${serviceTitle} & Saúde dos Fios`,
      projectOverview: overview,
      chosenTechnique: technique,
      maintenanceGuidance: maintenance,
      modules: initialModules,
      defaultPixPercent: 5,
    };
  }, [
    matchedService,
    submission.serviceTitle,
    submission.clientName,
    curvatureAns,
    chemicalAnswers,
    hasChemicalHistory,
    services,
  ]);

  // 5. Estados de Agendamento, Encaixe e Etapas Técnicas
  const initialScheduling = initialProposal?.schedulingDetails;

  const [activeTab, setActiveTab] = useState<"scheduling" | "proposal">(
    "scheduling"
  );

  const [schedulingDecision, setSchedulingDecision] = useState<
    "accept" | "decline_alternative"
  >(
    initialScheduling?.status === "suggested_alternative" ||
      initialScheduling?.status === "conflict_reschedule"
      ? "decline_alternative"
      : "accept"
  );

  // Confirmação de data e horário (quando aceito)
  const [confirmedDate, setConfirmedDate] = useState<string>(
    initialScheduling?.confirmedDate || clientRequestedDate
  );

  const defaultStartTime = useMemo(() => {
    if (initialScheduling?.confirmedTime) return initialScheduling.confirmedTime;
    if (
      clientRequestedTime.includes("13") ||
      clientRequestedTime.toLowerCase().includes("tarde")
    ) {
      return "13:30";
    }
    if (
      clientRequestedTime.includes("09") ||
      clientRequestedTime.toLowerCase().includes("manhã")
    ) {
      return "09:00";
    }
    const match = clientRequestedTime.match(/(\d{2}:\d{2})/);
    return match ? match[1] : "09:00";
  }, [initialScheduling, clientRequestedTime]);

  const [confirmedTime, setConfirmedTime] = useState<string>(defaultStartTime);

  // Contraproposta (caso recuse o encaixe ou haja conflito técnico)
  const [suggestionType, setSuggestionType] = useState<
    "same_day_other_time" | "exact" | "range"
  >(initialScheduling?.dateSuggestionType || "exact");

  const [suggestedSameDayTime, setSuggestedSameDayTime] = useState<string>(
    initialScheduling?.suggestedTime || "14:30"
  );
  const [suggestedExactDate, setSuggestedExactDate] = useState<string>(
    initialScheduling?.suggestedDateStart || clientRequestedDate
  );
  const [suggestedExactTime, setSuggestedExactTime] = useState<string>(
    initialScheduling?.suggestedTime || "09:00"
  );
  const [suggestedDateStart, setSuggestedDateStart] = useState<string>(
    initialScheduling?.suggestedDateStart || clientRequestedDate
  );
  const [suggestedDateEnd, setSuggestedDateEnd] = useState<string>(
    initialScheduling?.suggestedDateEnd || ""
  );
  const [suggestedPeriod, setSuggestedPeriod] = useState<
    "manha" | "tarde" | "qualquer"
  >(initialScheduling?.suggestedPeriod || "qualquer");

  const [scheduleChangeReason, setScheduleChangeReason] = useState<string>(
    initialScheduling?.scheduleChangeReason || ""
  );

  // Etapas técnicas do procedimento
  const defaultSteps: ProposalTechnicalStep[] = useMemo(() => {
    const mainServiceName = matchedService?.title || submission.serviceTitle || "Serviço Principal";

    if (
      initialScheduling?.technicalSteps &&
      initialScheduling.technicalSteps.length > 0
    ) {
      return initialScheduling.technicalSteps.map((st) => ({
        ...st,
        isPrimordial: st.isPrimordial ?? true,
        serviceGroup: st.serviceGroup || mainServiceName,
      }));
    }
    if (matchedService?.steps && matchedService.steps.length > 0) {
      return matchedService.steps.map((s, idx) => ({
        id: s.id || `step-${idx}`,
        title: s.title,
        durationMin: Number(s.durationMin) || 30,
        type: (s.type === "pause" ? "pause" : "active") as "active" | "pause",
        isParallelSlotAllowed: s.type === "pause",
        isPrimordial: true,
        serviceGroup: mainServiceName,
      }));
    }
    return [
      {
        id: "s-1",
        title: "Avaliação & Teste de Mecha",
        durationMin: 30,
        type: "active",
        isPrimordial: true,
        serviceGroup: mainServiceName,
      },
      {
        id: "s-2",
        title: "Aplicação Técnica da Cor / Descoloração",
        durationMin: 90,
        type: "active",
        isPrimordial: true,
        serviceGroup: mainServiceName,
      },
      {
        id: "s-3",
        title: "Pausa Química / Tempo de Ação",
        durationMin: 50,
        type: "pause",
        isParallelSlotAllowed: true,
        isPrimordial: true,
        serviceGroup: mainServiceName,
      },
      {
        id: "s-4",
        title: "Higienização & Neutralização",
        durationMin: 30,
        type: "active",
        isPrimordial: true,
        serviceGroup: mainServiceName,
      },
      {
        id: "s-5",
        title: "Tratamento Reconstrutor & Proteção Lipídica",
        durationMin: 30,
        type: "active",
        isPrimordial: true,
        serviceGroup: mainServiceName,
      },
      {
        id: "s-6",
        title: "Finalização com Curvatura & Secagem",
        durationMin: 40,
        type: "active",
        isPrimordial: true,
        serviceGroup: mainServiceName,
      },
    ];
  }, [initialScheduling, matchedService, submission.serviceTitle]);

  const [technicalSteps, setTechnicalSteps] =
    useState<ProposalTechnicalStep[]>(defaultSteps);

  const totalStepDuration = useMemo(() => {
    return technicalSteps.reduce(
      (sum, s) => sum + (Number(s.durationMin) || 0),
      0
    );
  }, [technicalSteps]);

  // Target date & time para validação da viabilidade
  const activeValidationDate =
    schedulingDecision === "accept"
      ? confirmedDate
      : suggestionType === "same_day_other_time"
      ? clientRequestedDate
      : suggestionType === "exact"
      ? suggestedExactDate
      : "";

  const activeValidationTime =
    schedulingDecision === "accept"
      ? confirmedTime
      : suggestionType === "same_day_other_time"
      ? suggestedSameDayTime
      : suggestionType === "exact"
      ? suggestedExactTime
      : "";

  const scheduleFeasibility: ProposalFeasibilityResult | null = useMemo(() => {
    if (!activeValidationDate || !activeValidationTime) return null;
    if (
      schedulingDecision === "decline_alternative" &&
      suggestionType === "range"
    ) {
      return null;
    }

    return validateProposalScheduleFeasibility({
      date: activeValidationDate,
      startTime: activeValidationTime,
      technicalSteps,
      existingAppointments: existingAppointments || [],
      ignoreAppointmentId: initialProposal?.appointmentId,
      ignoreTriageSubmissionId: submission?.id || initialProposal?.triageSubmissionId,
    });
  }, [
    activeValidationDate,
    activeValidationTime,
    technicalSteps,
    existingAppointments,
    schedulingDecision,
    suggestionType,
    submission?.id,
    initialProposal?.appointmentId,
    initialProposal?.triageSubmissionId,
  ]);

  // Manipulação de Etapas Técnicas
  const handleUpdateStep = (
    indexOrId: number | string,
    field: keyof ProposalTechnicalStep,
    value: any
  ) => {
    let targetId = typeof indexOrId === "string" ? indexOrId : "";
    setTechnicalSteps((prev) => {
      const copy = [...prev];
      const idx =
        typeof indexOrId === "number"
          ? indexOrId
          : copy.findIndex((s) => s.id === indexOrId);
      if (idx === -1) return prev;
      targetId = copy[idx].id;
      copy[idx] = { ...copy[idx], [field]: value };
      if (field === "type") {
        copy[idx].isParallelSlotAllowed = value === "pause";
      }
      return copy;
    });

    if (targetId) {
      if (field === "title") {
        setModules((prev) =>
          prev.map((m) => (m.id === targetId ? { ...m, serviceTitle: value } : m))
        );
      } else if (field === "durationMin") {
        setModules((prev) =>
          prev.map((m) => (m.id === targetId ? { ...m, durationMin: value } : m))
        );
      } else if (field === "type") {
        setModules((prev) =>
          prev.map((m) => (m.id === targetId ? { ...m, stepType: value } : m))
        );
      }
    }
  };

  const handleAddStep = (isPrimordial = false) => {
    const mainServiceName =
      matchedService?.title || submission.serviceTitle || "Serviço Principal";
    const newId = `step-${Date.now()}`;
    const newStep: ProposalTechnicalStep = {
      id: newId,
      title: isPrimordial
        ? "Nova Etapa do Serviço"
        : "Novo Procedimento / Etapa Adicional",
      durationMin: 30,
      type: "active",
      isParallelSlotAllowed: false,
      isPrimordial,
      serviceGroup: isPrimordial ? mainServiceName : "Procedimentos Adicionais",
    };
    setTechnicalSteps((prev) => [...prev, newStep]);

    setModules((prev) => [
      ...prev,
      {
        id: newId,
        serviceTitle: newStep.title,
        durationMin: newStep.durationMin,
        stepType: newStep.type,
        isStepItem: true,
        isPrimordial,
        serviceGroup: newStep.serviceGroup,
        isIncluded: isPrimordial ? true : false,
        originalPrice: isPrimordial ? 0 : 150,
        explanation: "",
      },
    ]);
  };

  const handleRemoveStep = (indexOrId: number | string) => {
    const stepId =
      typeof indexOrId === "string"
        ? indexOrId
        : technicalSteps[indexOrId]?.id;
    if (!stepId || technicalSteps.length <= 1) return;

    setTechnicalSteps((prev) => prev.filter((s) => s.id !== stepId));
    setModules((prev) => prev.filter((m) => m.id !== stepId));
  };

  // Separação computada das etapas do cronograma (Passo 1)
  const primordialSteps = useMemo(() => {
    return technicalSteps.filter((s) => s.isPrimordial !== false);
  }, [technicalSteps]);

  const additionalSteps = useMemo(() => {
    return technicalSteps.filter((s) => s.isPrimordial === false);
  }, [technicalSteps]);

  // 6. Estados de Conteúdo da Proposta
  const [title, setTitle] = useState(
    initialProposal?.title || smartDefaults.title
  );
  const [subtitle, setSubtitle] = useState(
    initialProposal?.subtitle || smartDefaults.subtitle
  );
  const [projectOverview, setProjectOverview] = useState(
    initialProposal?.projectOverview || smartDefaults.projectOverview
  );
  const [chosenTechnique, setChosenTechnique] = useState(
    initialProposal?.chosenTechnique || smartDefaults.chosenTechnique
  );
  const [maintenanceGuidance, setMaintenanceGuidance] = useState(
    initialProposal?.maintenanceGuidance || smartDefaults.maintenanceGuidance
  );
  const [desiredResults, setDesiredResults] = useState<string[]>(
    initialProposal?.desiredResults || [
      "Iluminação natural, mas com presença marcante.",
      "Tom elegante e harmonioso com seu fundo natural.",
      "Transição suave entre a raiz natural e o iluminado.",
      "Ausência de marcações fortes no crescimento.",
      "Mais profundidade e dimensão para a curvatura.",
      "Movimento e valorização da curvatura natural.",
      "Resultado de baixa manutenção.",
    ]
  );
  const [includedItems, setIncludedItems] = useState<string[]>(
    initialProposal?.includedItems || [
      "Avaliação técnica do cabelo e planejamento personalizado.",
      "Aplicação da técnica escolhida com proteção da fibra.",
      "Tratamento profissional completo durante o procedimento.",
      "Estabilização da fibra capilar pós-química.",
      "Finalização profissional valorizando a curvatura natural.",
    ]
  );

  // Sincronização entre Etapas Técnicas (Passo 1) e Itens Financeiros da Proposta (Passo 2)
  const defaultServicePrice = Number(matchedService?.price) || 710;

  const syncStepsToModules = (
    steps: ProposalTechnicalStep[],
    currentModules: ProposalItem[],
    basePrice: number
  ): ProposalItem[] => {
    const mainServiceName =
      matchedService?.title || submission.serviceTitle || "Serviço Principal";

    const pSteps = steps.filter((s) => s.isPrimordial !== false);

    const hasAnyPrimordialPriced = currentModules.some(
      (m) =>
        m.isPrimordial !== false &&
        !m.isIncluded &&
        (Number(m.originalPrice) || 0) > 0
    );

    const primaryIndex = pSteps.findIndex(
      (s) =>
        s.type === "active" &&
        (s.title.toLowerCase().includes("aplica") ||
          s.title.toLowerCase().includes("mecha") ||
          s.title.toLowerCase().includes("cor") ||
          s.title.toLowerCase().includes("procedimento"))
    );
    const targetBaseIndex =
      primaryIndex >= 0 ? primaryIndex : pSteps.length > 1 ? 1 : 0;

    return steps.map((step) => {
      const existing = currentModules.find((m) => m.id === step.id);
      const isPrimordial = step.isPrimordial !== false;

      if (existing) {
        return {
          ...existing,
          serviceTitle: step.title,
          durationMin: step.durationMin,
          stepType: step.type,
          isStepItem: true,
          isPrimordial,
          serviceGroup:
            step.serviceGroup ||
            (isPrimordial ? mainServiceName : "Procedimentos Adicionais"),
        };
      }

      if (isPrimordial) {
        const primordialIndex = pSteps.findIndex((s) => s.id === step.id);
        const isPrimary = !hasAnyPrimordialPriced && primordialIndex === targetBaseIndex;

        return {
          id: step.id,
          serviceTitle: step.title,
          durationMin: step.durationMin,
          stepType: step.type,
          isStepItem: true,
          isPrimordial: true,
          serviceGroup: mainServiceName,
          isIncluded: !isPrimary,
          originalPrice: isPrimary ? basePrice : 0,
          explanation: isPrimary
            ? `Procedimento principal contratado (${mainServiceName}).`
            : "Etapa inclusa no pacote do serviço principal.",
        };
      }

      return {
        id: step.id,
        serviceTitle: step.title,
        durationMin: step.durationMin,
        stepType: step.type,
        isStepItem: true,
        isPrimordial: false,
        serviceGroup: "Procedimentos Adicionais",
        isIncluded: false,
        originalPrice: 150,
        explanation: "",
      };
    });
  };

  // Módulos / Etapas Financeiras da proposta
  const [modules, setModules] = useState<ProposalItem[]>(() => {
    const mainServiceName =
      matchedService?.title || submission.serviceTitle || "Serviço Principal";

    if (initialProposal?.items && initialProposal.items.length > 0) {
      return initialProposal.items.map((it, idx) => {
        const matchingStep =
          defaultSteps.find((s) => s.id === it.id) || defaultSteps[idx];
        const isPrimordial =
          it.isPrimordial ??
          (matchingStep ? matchingStep.isPrimordial !== false : true);
        return {
          ...it,
          isPrimordial,
          serviceGroup:
            it.serviceGroup ||
            (isPrimordial ? mainServiceName : "Procedimentos Adicionais"),
          isIncluded: it.isIncluded ?? Number(it.originalPrice) === 0,
          durationMin: it.durationMin ?? matchingStep?.durationMin,
          stepType: it.stepType ?? matchingStep?.type,
          isStepItem: it.isStepItem ?? Boolean(matchingStep),
        };
      });
    }
    return syncStepsToModules(defaultSteps, [], defaultServicePrice);
  });

  // Separação dos módulos para a parte financeira
  const primordialModules = useMemo(() => {
    return modules.filter((m) => m.isPrimordial !== false);
  }, [modules]);

  const additionalModules = useMemo(() => {
    return modules.filter((m) => m.isPrimordial === false);
  }, [modules]);

  const primordialSubtotal = useMemo(() => {
    return primordialModules
      .filter((m) => !m.isIncluded)
      .reduce((sum, m) => sum + (Number(m.originalPrice) || 0), 0);
  }, [primordialModules]);

  const additionalSubtotal = useMemo(() => {
    return additionalModules
      .filter((m) => !m.isIncluded)
      .reduce((sum, m) => sum + (Number(m.originalPrice) || 0), 0);
  }, [additionalModules]);

  const totalOriginal = useMemo(() => {
    return primordialSubtotal + additionalSubtotal;
  }, [primordialSubtotal, additionalSubtotal]);

  // Função inteligente para equilibrar as etapas primordiais somando o valor base do serviço
  const handleBalancePrimordialPrice = () => {
    const mainServiceName =
      matchedService?.title || submission.serviceTitle || "Serviço Principal";
    const primaryIdx = primordialModules.findIndex(
      (s) =>
        s.stepType === "active" &&
        (s.serviceTitle.toLowerCase().includes("aplica") ||
          s.serviceTitle.toLowerCase().includes("mecha") ||
          s.serviceTitle.toLowerCase().includes("cor") ||
          s.serviceTitle.toLowerCase().includes("procedimento"))
    );
    const targetIdx =
      primaryIdx >= 0 ? primaryIdx : primordialModules.length > 1 ? 1 : 0;

    setModules((prev) =>
      prev.map((m) => {
        if (m.isPrimordial === false) return m;
        const pIndex = primordialModules.findIndex((pm) => pm.id === m.id);
        const isPrimary = pIndex === targetIdx;
        return {
          ...m,
          isIncluded: !isPrimary,
          originalPrice: isPrimary ? defaultServicePrice : 0,
          explanation: isPrimary
            ? `Procedimento principal contratado (${mainServiceName}).`
            : "Etapa inclusa no pacote do serviço principal.",
        };
      })
    );
  };

  const [priceDiscount, setPriceDiscount] = useState<number>(
    initialProposal?.totalWithDiscount ??
      (initialProposal?.totalOriginal ?? totalOriginal)
  );

  // Manter valor final sincronizado se não houver desconto personalizado fixado
  useEffect(() => {
    if (!initialProposal) {
      setPriceDiscount(totalOriginal);
    }
  }, [totalOriginal, initialProposal]);

  const [pixDiscountPercent, setPixDiscountPercent] = useState<number>(
    initialProposal?.pixDiscountPercent ?? smartDefaults.defaultPixPercent
  );

  const discountAmount = Math.max(0, totalOriginal - priceDiscount);
  const discountPercent =
    totalOriginal > 0 ? Math.round((discountAmount / totalOriginal) * 100) : 0;
  const pixTotal =
    Math.round(priceDiscount * (1 - pixDiscountPercent / 100) * 100) / 100;
  const totalSavings = Math.max(0, totalOriginal - pixTotal);

  // Navegar para a aba de proposta garantindo que as etapas estão sincronizadas
  const handleGoToProposalTab = () => {
    setModules((prev) =>
      syncStepsToModules(technicalSteps, prev, defaultServicePrice)
    );
    setActiveTab("proposal");
  };

  // Adicionar Item/Etapa Extra Financeira no Passo 2
  const handleAddExtraModule = () => {
    handleAddStep(false);
  };

  const handleUpdateModule = (
    id: string,
    field: keyof ProposalItem,
    value: any
  ) => {
    setModules((prev) =>
      prev.map((m) => {
        if (m.id !== id) return m;
        const updated = { ...m, [field]: value };
        if (field === "isIncluded" && value === true) {
          updated.originalPrice = 0;
        }
        return updated;
      })
    );

    if (field === "serviceTitle") {
      setTechnicalSteps((prev) =>
        prev.map((s) => (s.id === id ? { ...s, title: value } : s))
      );
    }
  };

  const handleRemoveModule = (id: string) => {
    handleRemoveStep(id);
  };

  // Modal de Fotos em Tela Cheia (Galeria Fullscreen Universal)
  const [activeGalleryPhotos, setActiveGalleryPhotos] = useState<GalleryPhoto[] | null>(null);
  const [activeGalleryIndex, setActiveGalleryIndex] = useState(0);

  const getClientPhotos = (): GalleryPhoto[] => {
    const list: GalleryPhoto[] = [];
    if (submission.photos.currentHairRoot) {
      list.push({
        url: submission.photos.currentHairRoot,
        title: "Raiz Natural do Cabelo",
        subtitle: `Cliente: ${submission.clientName} • Serviço: ${submission.serviceTitle || "Avaliação"}`,
      });
    }
    if (submission.photos.currentHairLength) {
      list.push({
        url: submission.photos.currentHairLength,
        title: "Comprimento e Pontas dos Fios",
        subtitle: `Cliente: ${submission.clientName} • Serviço: ${submission.serviceTitle || "Avaliação"}`,
      });
    }
    if (submission.photos.inspirationDesired) {
      list.push({
        url: submission.photos.inspirationDesired,
        title: "Inspiração / Referência Desejada",
        subtitle: `Cliente: ${submission.clientName} • Serviço: ${submission.serviceTitle || "Avaliação"}`,
      });
    }
    return list;
  };

  const handleOpenGallery = (photoUrl: string) => {
    const photos = getClientPhotos();
    const idx = photos.findIndex((p) => p.url === photoUrl);
    setActiveGalleryPhotos(photos);
    setActiveGalleryIndex(idx >= 0 ? idx : 0);
  };

  const handleAddResult = () => {
    setDesiredResults([...desiredResults, "Novo ponto acordado"]);
  };

  const handleRemoveResult = (index: number) => {
    setDesiredResults(desiredResults.filter((_, i) => i !== index));
  };

  // Salvar Proposta Completa
  const handleSave = (openWhatsApp: boolean = false) => {
    const schedulingDetails: ProposalSchedulingDetails = {
      status: isEncaixe
        ? schedulingDecision === "accept"
          ? "accepted_encaixe"
          : "suggested_alternative"
        : scheduleFeasibility && !scheduleFeasibility.isFeasible
        ? "conflict_reschedule"
        : "accepted_original",
      originalDate: clientRequestedDate,
      originalTime: clientRequestedTime,
      confirmedDate:
        schedulingDecision === "accept"
          ? confirmedDate
          : suggestionType === "exact"
          ? suggestedExactDate
          : undefined,
      confirmedTime:
        schedulingDecision === "accept"
          ? confirmedTime
          : suggestionType === "same_day_other_time"
          ? suggestedSameDayTime
          : suggestionType === "exact"
          ? suggestedExactTime
          : undefined,
      dateSuggestionType:
        schedulingDecision === "decline_alternative" ? suggestionType : undefined,
      suggestedDateStart:
        schedulingDecision === "decline_alternative" && suggestionType === "range"
          ? suggestedDateStart
          : undefined,
      suggestedDateEnd:
        schedulingDecision === "decline_alternative" && suggestionType === "range"
          ? suggestedDateEnd
          : undefined,
      suggestedPeriod:
        schedulingDecision === "decline_alternative" && suggestionType === "range"
          ? suggestedPeriod
          : undefined,
      suggestedTime:
        schedulingDecision === "decline_alternative"
          ? suggestionType === "exact"
            ? suggestedExactTime
            : suggestionType === "same_day_other_time"
            ? suggestedSameDayTime
            : undefined
          : undefined,
      scheduleChangeReason:
        schedulingDecision === "decline_alternative" ||
        (scheduleFeasibility && !scheduleFeasibility.isFeasible)
          ? scheduleChangeReason || scheduleFeasibility?.conflictReason
          : undefined,
      technicalSteps,
      totalDurationMin: totalStepDuration,
      isEncaixe,
    };

    const proposal: LuxuryProposal = {
      id: initialProposal?.id || `prop-${Date.now()}`,
      orgId:
        initialProposal?.orgId ||
        submission.orgId ||
        "11111111-1111-4111-8111-111111111111",
      professionalId:
        initialProposal?.professionalId ||
        "58f26242-1e53-432e-b924-dea25ee2068a",
      triageSubmissionId: submission.id,
      clientName: submission.clientName,
      clientPhone: submission.clientPhone,
      clientEmail: submission.clientEmail,
      title,
      subtitle,
      projectOverview,
      desiredResults,
      chosenTechnique,
      maintenanceGuidance,
      includedItems,
      differentials: initialProposal?.differentials || [
        {
          id: "diff-1",
          title: "Atendimento Personalizado",
          description: "Dedicação e análise anatômica de cada mecha.",
        },
        {
          id: "diff-2",
          title: "Técnicas Adaptadas",
          description: "Foco exclusivo em cabelos ondulados, cacheados e crespos.",
        },
        {
          id: "diff-3",
          title: "Preservação da Saúde",
          description: "Proteção da barreira lipídica durante a cor.",
        },
        {
          id: "diff-4",
          title: "Baixa Manutenção",
          description: "Crescimento sem efeito de demarcação ou raiz reta.",
        },
      ],
      technicalCommitment:
        initialProposal?.technicalCommitment ||
        "O resultado será construído respeitando a base natural, a estrutura e a resistência do seu cabelo. O objetivo não é apenas clarear/transformar, mas criar uma transformação bonita, saudável e coerente com a realidade do cabelo, preservando sua curvatura e evitando uma rotina de manutenção difícil.",
      items: modules,
      totalOriginal,
      totalWithDiscount: priceDiscount,
      pixDiscountPercent,
      pixTotal,
      creditCardTerms:
        "Valor integral, sujeito às condições de parcelamento e aos juros da maquininha, quando aplicáveis.",
      schedulingDetails,
      photos: submission.photos,
      status: initialProposal?.status || "sent",
      expiresAt:
        initialProposal?.expiresAt ||
        new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
      createdAt: initialProposal?.createdAt || new Date().toISOString(),
    };

    onSave(proposal, openWhatsApp);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-hidden">
      <div className="bg-[#FAF7F2] rounded-3xl max-w-4xl w-full max-h-[94vh] flex flex-col shadow-2xl border border-[#E7DCCE] overflow-hidden animate-scale-up">
        {/* Topo do Modal */}
        <div className="p-5 sm:p-6 bg-white border-b border-[#E7DCCE] flex items-center justify-between shrink-0">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] uppercase tracking-widest text-[#AD841D] font-bold">
                {initialProposal ? "Edição de Proposta" : "Gerador Integrado de Proposta & Agenda"}
              </span>
              {isEncaixe && (
                <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
                  ⚡ Solicitação de Encaixe Especial
                </span>
              )}
            </div>
            <h2 className="font-editorial text-xl sm:text-2xl font-bold text-[#2D1914] flex items-center gap-2 flex-wrap">
              <span>
                {initialProposal ? "Editar Proposta de" : "Construir Proposta para"}{" "}
                {submission.clientName}
              </span>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-50 text-[#AD841D] border border-amber-200">
                {submission.serviceTitle}
              </span>
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-stone-100 hover:bg-stone-200 flex items-center justify-center text-stone-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Abas de Navegação Superior */}
        <div className="flex border-b border-[#E7DCCE] bg-stone-50 px-2 sm:px-7 pt-2 shrink-0 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveTab("scheduling")}
            className={`pb-2.5 sm:pb-3 px-2.5 sm:px-3.5 text-xs font-bold border-b-2 flex items-center gap-1.5 sm:gap-2 transition-all whitespace-nowrap ${
              activeTab === "scheduling"
                ? "border-[#C59B27] text-[#2D1914] bg-white rounded-t-xl"
                : "border-transparent text-stone-600 hover:text-stone-900"
            }`}
          >
            <Calendar className="w-4 h-4 text-[#C59B27] shrink-0" />
            <span className="hidden sm:inline">1. Agenda, Encaixe &amp; Etapas</span>
            <span className="sm:hidden">1. Agenda &amp; Etapas</span>
            {scheduleFeasibility && !scheduleFeasibility.isFeasible && (
              <span
                className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse shrink-0"
                title="Atenção: conflito de horário"
              />
            )}
            {scheduleFeasibility?.isFeasible && (
              <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3] shrink-0" />
            )}
          </button>

          <button
            type="button"
            onClick={handleGoToProposalTab}
            className={`pb-2.5 sm:pb-3 px-2.5 sm:px-3.5 text-xs font-bold border-b-2 flex items-center gap-1.5 sm:gap-2 transition-all whitespace-nowrap ${
              activeTab === "proposal"
                ? "border-[#C59B27] text-[#2D1914] bg-white rounded-t-xl"
                : "border-transparent text-stone-600 hover:text-stone-900"
            }`}
          >
            <Sparkles className="w-4 h-4 text-[#C59B27] shrink-0" />
            <span className="hidden sm:inline">2. Diagnóstico, Etapas &amp; Valores</span>
            <span className="sm:hidden">2. Proposta &amp; Valores</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-stone-200 text-stone-700 font-extrabold shrink-0">
              {modules.length}
            </span>
          </button>
        </div>

        {/* Corpo do Modal com Scroll */}
        <div className="p-5 sm:p-7 overflow-y-auto space-y-7 flex-1 text-xs sm:text-sm">
          {/* ============================================================== */}
          {/* ABA 1: AGENDA, ENCAIXE E ETAPAS TÉCNICAS                       */}
          {/* ============================================================== */}
          {activeTab === "scheduling" && (
            <div className="space-y-6">
              {/* Card de Identificação da Solicitação */}
              <div className="p-5 rounded-2xl bg-white border border-[#E7DCCE] shadow-xs space-y-3">
                <div className="flex items-center justify-between pb-3 border-b border-[#E7DCCE]/60">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="w-4 h-4 text-[#C59B27]" />
                    <h3 className="font-bold text-sm sm:text-base text-[#2D1914]">
                      Parâmetros do Agendamento Solicitado
                    </h3>
                  </div>
                  <span className="text-[11px] font-semibold text-stone-500">
                    Cliente: {submission.clientName} ({submission.clientPhone})
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-[#FAF7F2] border border-[#E7DCCE]/70">
                    <span className="text-[10px] uppercase font-bold text-stone-500 block mb-1">
                      Data Desejada pela Cliente:
                    </span>
                    <span className="font-bold text-[#2D1914] text-sm">
                      {clientRequestedDate}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-[#FAF7F2] border border-[#E7DCCE]/70">
                    <span className="text-[10px] uppercase font-bold text-stone-500 block mb-1">
                      Horário / Turno Escolhido:
                    </span>
                    <span className="font-bold text-amber-900 text-sm">
                      {clientRequestedTime}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-[#FAF7F2] border border-[#E7DCCE]/70">
                    <span className="text-[10px] uppercase font-bold text-stone-500 block mb-1">
                      Tipo de Agendamento:
                    </span>
                    <span className="font-bold text-[#2D1914] text-xs">
                      {isEncaixe
                        ? "⚡ Encaixe Especial (Pré-reserva)"
                        : "📅 Data Oficial na Agenda"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Se for solicitação de Encaixe: Decisão Obrigatória de Aceite ou Recusa/Contraproposta */}
              {isEncaixe ? (
                <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-amber-50/70 via-white to-amber-50/30 border border-amber-300 shadow-xs space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-amber-800 font-extrabold block">
                        Etapa 1: Decisão da Especialista
                      </span>
                      <h4 className="font-bold text-base text-[#2D1914]">
                        Aceitar ou Contrapropor o Encaixe Especial?
                      </h4>
                    </div>
                  </div>

                  {/* Seletor de Decisão */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <button
                      type="button"
                      onClick={() => setSchedulingDecision("accept")}
                      className={`p-4 rounded-2xl border text-left transition-all flex items-start gap-3 ${
                        schedulingDecision === "accept"
                          ? "bg-white border-[#C59B27] shadow-md ring-2 ring-[#C59B27]/20"
                          : "bg-stone-50/80 border-[#E7DCCE] hover:bg-white"
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
                          schedulingDecision === "accept"
                            ? "border-[#C59B27] bg-[#C59B27] text-white"
                            : "border-stone-400"
                        }`}
                      >
                        {schedulingDecision === "accept" && (
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        )}
                      </div>
                      <div>
                        <strong className="block text-xs sm:text-sm font-bold text-[#2D1914]">
                          Aceitar Encaixe na Data Solicitada
                        </strong>
                        <span className="text-[11px] text-stone-600 leading-relaxed block mt-0.5">
                          Confirmar atendimento em {clientRequestedDate} definindo o horário
                          exato de início.
                        </span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSchedulingDecision("decline_alternative")}
                      className={`p-4 rounded-2xl border text-left transition-all flex items-start gap-3 ${
                        schedulingDecision === "decline_alternative"
                          ? "bg-white border-amber-600 shadow-md ring-2 ring-amber-500/20"
                          : "bg-stone-50/80 border-[#E7DCCE] hover:bg-white"
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
                          schedulingDecision === "decline_alternative"
                            ? "border-amber-600 bg-amber-600 text-white"
                            : "border-stone-400"
                        }`}
                      >
                        {schedulingDecision === "decline_alternative" && (
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        )}
                      </div>
                      <div>
                        <strong className="block text-xs sm:text-sm font-bold text-[#2D1914]">
                          Recusar e Propor Nova Data / Horário
                        </strong>
                        <span className="text-[11px] text-stone-600 leading-relaxed block mt-0.5">
                          Enviar uma contraproposta com justificativa e opções de datas ou horários alternativos.
                        </span>
                      </div>
                    </button>
                  </div>

                  {/* Campos do Aceite: Horário de Início */}
                  {schedulingDecision === "accept" && (
                    <div className="p-4 rounded-xl bg-white border border-[#E7DCCE] space-y-3 animate-fade-in">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <label className="text-xs font-bold text-[#2D1914] block">
                            Definir Horário de Início do Atendimento:
                          </label>
                          <span className="text-[11px] text-stone-500">
                            Data: {clientRequestedDate}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-[#AD841D]" />
                          <input
                            type="time"
                            value={confirmedTime}
                            onChange={(e) => setConfirmedTime(e.target.value)}
                            className="px-3 py-1.5 rounded-xl border border-[#E7DCCE] text-sm font-bold text-[#2D1914] bg-stone-50"
                          />
                        </div>
                      </div>

                      {scheduleFeasibility && (
                        <div className="text-[11px] text-stone-600 flex items-center justify-between border-t border-stone-100 pt-2">
                          <span>
                            Duração calculada: <strong>{totalStepDuration} min</strong>
                          </span>
                          <span>
                            Término estimado:{" "}
                            <strong className="text-[#2D1914]">
                              {scheduleFeasibility.endTime}
                            </strong>
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Campos da Contraproposta: Tipo + Datas + Justificativa */}
                  {schedulingDecision === "decline_alternative" && (
                    <div className="p-4 rounded-xl bg-white border border-amber-200 space-y-4 animate-fade-in">
                      <div>
                        <label className="text-xs font-bold text-[#2D1914] block mb-1.5">
                          Tipo de Sugestão para a Cliente:
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <button
                            type="button"
                            onClick={() => setSuggestionType("same_day_other_time")}
                            className={`p-2.5 rounded-xl border text-xs font-semibold transition-all ${
                              suggestionType === "same_day_other_time"
                                ? "bg-amber-100 text-amber-900 border-amber-400 font-bold"
                                : "bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100"
                            }`}
                          >
                            Outro Horário no Mesmo Dia
                          </button>

                          <button
                            type="button"
                            onClick={() => setSuggestionType("exact")}
                            className={`p-2.5 rounded-xl border text-xs font-semibold transition-all ${
                              suggestionType === "exact"
                                ? "bg-amber-100 text-amber-900 border-amber-400 font-bold"
                                : "bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100"
                            }`}
                          >
                            Outra Data Específica
                          </button>

                          <button
                            type="button"
                            onClick={() => setSuggestionType("range")}
                            className={`p-2.5 rounded-xl border text-xs font-semibold transition-all ${
                              suggestionType === "range"
                                ? "bg-amber-100 text-amber-900 border-amber-400 font-bold"
                                : "bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100"
                            }`}
                          >
                            Período de Datas Flexíveis
                          </button>
                        </div>
                      </div>

                      {/* Configuração de acordo com o tipo */}
                      {suggestionType === "same_day_other_time" && (
                        <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <span className="text-xs text-stone-700">
                            Data: <strong>{clientRequestedDate}</strong> • Novo Horário sugerido:
                          </span>
                          <input
                            type="time"
                            value={suggestedSameDayTime}
                            onChange={(e) => setSuggestedSameDayTime(e.target.value)}
                            className="px-3 py-1.5 rounded-xl border border-stone-300 text-xs font-bold bg-white"
                          />
                        </div>
                      )}

                      {suggestionType === "exact" && (
                        <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="text-[11px] font-bold text-stone-600 block mb-1">
                              Nova Data Sugerida:
                            </label>
                            <input
                              type="date"
                              value={suggestedExactDate}
                              onChange={(e) => setSuggestedExactDate(e.target.value)}
                              className="w-full px-3 py-1.5 rounded-xl border border-stone-300 text-xs bg-white font-bold"
                            />
                          </div>
                          <div>
                            <label className="text-[11px] font-bold text-stone-600 block mb-1">
                              Horário Sugerido:
                            </label>
                            <input
                              type="time"
                              value={suggestedExactTime}
                              onChange={(e) => setSuggestedExactTime(e.target.value)}
                              className="w-full px-3 py-1.5 rounded-xl border border-stone-300 text-xs bg-white font-bold"
                            />
                          </div>
                        </div>
                      )}

                      {suggestionType === "range" && (
                        <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 space-y-3">
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <div>
                              <label className="text-[11px] font-bold text-stone-600 block mb-1">
                                Data Inicial:
                              </label>
                              <input
                                type="date"
                                value={suggestedDateStart}
                                onChange={(e) => setSuggestedDateStart(e.target.value)}
                                className="w-full px-2.5 py-1.5 rounded-xl border border-stone-300 text-xs bg-white font-bold"
                              />
                            </div>
                            <div>
                              <label className="text-[11px] font-bold text-stone-600 block mb-1">
                                Data Limite:
                              </label>
                              <input
                                type="date"
                                value={suggestedDateEnd}
                                onChange={(e) => setSuggestedDateEnd(e.target.value)}
                                className="w-full px-2.5 py-1.5 rounded-xl border border-stone-300 text-xs bg-white font-bold"
                              />
                            </div>
                            <div>
                              <label className="text-[11px] font-bold text-stone-600 block mb-1">
                                Turno Sugerido:
                              </label>
                              <select
                                value={suggestedPeriod}
                                onChange={(e: any) => setSuggestedPeriod(e.target.value)}
                                className="w-full px-2.5 py-1.5 rounded-xl border border-stone-300 text-xs bg-white font-bold"
                              >
                                <option value="qualquer">Qualquer Turno</option>
                                <option value="manha">Manhã (09h - 13h)</option>
                                <option value="tarde">Tarde (13h - 19h)</option>
                              </select>
                            </div>
                          </div>
                          <p className="text-[11px] text-stone-500 italic">
                            A cliente visualizará este intervalo na proposta e poderá selecionar o dia exato desejado para aprovação.
                          </p>
                        </div>
                      )}

                      {/* Justificativa Técnica para a Cliente */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-xs font-bold text-[#2D1914] block">
                            Justificativa para a Cliente (visível na proposta):
                          </label>
                          <button
                            type="button"
                            onClick={() =>
                              setScheduleChangeReason(
                                "Para entregar o resultado desejado com total atenção e integridade dos fios, precisamos de uma janela completa de atendimento que está disponível nesta nova data."
                              )
                            }
                            className="text-[10px] text-[#AD841D] font-bold hover:underline"
                          >
                            Usar sugestão padrão
                          </button>
                        </div>
                        <textarea
                          rows={2}
                          placeholder="Explique o motivo técnico ou de agenda com carinho para a cliente..."
                          value={scheduleChangeReason}
                          onChange={(e) => setScheduleChangeReason(e.target.value)}
                          className="w-full p-2.5 rounded-xl border border-stone-300 text-xs leading-relaxed focus:border-[#C59B27] outline-none"
                        />
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* Triagem Normal com Horário Marcado */
                <div className="p-4 sm:p-5 rounded-2xl bg-white border border-[#E7DCCE] shadow-xs space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-[#AD841D] block">
                        Agendamento Regular
                      </span>
                      <h4 className="font-bold text-sm sm:text-base text-[#2D1914]">
                        Data e Horário Pré-Agendados
                      </h4>
                      <p className="text-xs text-stone-600">
                        A cliente reservou para o dia <strong>{clientRequestedDate}</strong> às{" "}
                        <strong>{confirmedTime}</strong>.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <label className="text-xs font-bold text-stone-600">Ajustar Início:</label>
                      <input
                        type="time"
                        value={confirmedTime}
                        onChange={(e) => setConfirmedTime(e.target.value)}
                        className="px-3 py-1.5 rounded-xl border border-[#E7DCCE] text-xs font-bold text-[#2D1914] bg-stone-50"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* BANNER DE FEASIBILITY / VALIDAÇÃO DE CONFLITO EM TEMPO REAL */}
              {scheduleFeasibility && (
                <div
                  className={`p-4 rounded-2xl border transition-all ${
                    scheduleFeasibility.isFeasible
                      ? "bg-emerald-50 border-emerald-300 text-emerald-900"
                      : "bg-red-50 border-red-300 text-red-900"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {scheduleFeasibility.isFeasible ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                    )}
                    <div className="text-xs flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <strong className="font-bold text-sm block">
                          {scheduleFeasibility.isFeasible
                            ? "✅ Horário 100% Viável na Agenda"
                            : "⚠️ Conflito Técnico de Horário Detectado"}
                        </strong>
                        <span className="font-semibold text-[11px]">
                          Término previsto: {scheduleFeasibility.endTime} ({totalStepDuration} min)
                        </span>
                      </div>

                      {scheduleFeasibility.isFeasible ? (
                        <p className="text-emerald-800">
                          O atendimento cabe perfeitamente na grade do dia, respeitando atendimentos ativos
                          anteriores e janelas de pausas químicas.
                        </p>
                      ) : (
                        <div className="space-y-2">
                          <p className="font-semibold text-red-800">
                            {scheduleFeasibility.conflictReason}
                          </p>
                          <div className="pt-1 flex flex-wrap items-center gap-2">
                            <span className="text-[11px] text-stone-700">Deseja reagendar?</span>
                            <button
                              type="button"
                              onClick={() => {
                                setSchedulingDecision("decline_alternative");
                                if (!scheduleChangeReason) {
                                  setScheduleChangeReason(
                                    scheduleFeasibility.conflictReason ||
                                      "Devido a outros atendimentos técnicos já marcados nesta data, sugiro realizarmos em um horário/data com maior conforto."
                                  );
                                }
                              }}
                              className="px-3 py-1 bg-red-700 text-white rounded-lg font-bold text-[11px] hover:bg-red-800 transition-all shadow-xs"
                            >
                              👉 Propor Nova Data / Horário para a Cliente
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* BLOCO INTERATIVO DE ETAPAS TÉCNICAS E DURAÇÕES */}
              <div className="p-5 sm:p-6 rounded-2xl bg-white border border-[#E7DCCE] shadow-xs space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#E7DCCE]/60">
                  <div>
                    <div className="flex items-center gap-2">
                      <Scissors className="w-4 h-4 text-[#C59B27]" />
                      <h4 className="font-bold text-sm sm:text-base text-[#2D1914]">
                        Etapas Técnicas do Procedimento &amp; Duração
                      </h4>
                    </div>
                    <p className="text-[11px] text-stone-500 mt-0.5">
                      Defina a ordem e minutos de cada fase. O motor recalcula colisões da agenda em tempo real.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    <span className="text-xs bg-amber-50 text-amber-900 border border-amber-300 px-3 py-1 rounded-xl font-bold">
                      Tempo Total: {totalStepDuration} min ({Math.floor(totalStepDuration / 60)}h{" "}
                      {totalStepDuration % 60}min)
                    </span>
                    <button
                      type="button"
                      onClick={() => handleAddStep(false)}
                      className="px-3 py-1 text-xs font-bold text-[#AD841D] hover:bg-amber-50 border border-amber-300 rounded-xl flex items-center gap-1 transition-all"
                    >
                      <Plus className="w-3.5 h-3.5" /> Adicionar Etapa Adicional
                    </button>
                  </div>
                </div>

                {/* 1. SEÇÃO DE ETAPAS PRIMORDIAIS DO SERVIÇO PRINCIPAL */}
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-1">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-3.5 h-3.5 text-[#C59B27]" />
                      <h5 className="font-bold text-xs uppercase tracking-wider text-[#2D1914]">
                        Etapas do Serviço Principal ({matchedService?.title || submission.serviceTitle || "Serviço Base"})
                      </h5>
                    </div>
                    <span className="text-[11px] font-bold text-[#AD841D] bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full">
                      Valor Base: {formatBRL(defaultServicePrice)}
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-500 italic">
                    Estas etapas compõem o procedimento inicial escolhido e somam o valor base do serviço.
                  </p>

                  <div className="space-y-2.5">
                    {primordialSteps.map((step, idx) => (
                      <div
                        key={step.id || idx}
                        className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all ${
                          step.type === "pause"
                            ? "bg-amber-50/50 border-dashed border-amber-300"
                            : "bg-[#FAF7F2] border-[#E7DCCE]"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 flex-1">
                          <span className="w-6 h-6 rounded-full bg-[#2D1914] text-white text-xs font-bold flex items-center justify-center shrink-0">
                            {idx + 1}
                          </span>
                          <input
                            type="text"
                            value={step.title}
                            onChange={(e) => handleUpdateStep(step.id, "title", e.target.value)}
                            className="flex-1 bg-white border border-[#E7DCCE] rounded-lg px-2.5 py-1 text-xs font-semibold text-[#2D1914]"
                            placeholder="Título da etapa primordial"
                          />
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-auto">
                          <div className="flex items-center gap-1 bg-white border border-[#E7DCCE] rounded-lg px-2 py-1">
                            <Clock4 className="w-3.5 h-3.5 text-stone-400" />
                            <input
                              type="number"
                              min={5}
                              step={5}
                              value={step.durationMin}
                              onChange={(e) =>
                                handleUpdateStep(step.id, "durationMin", Number(e.target.value))
                              }
                              className="w-12 text-xs font-bold text-center outline-none"
                            />
                            <span className="text-[10px] text-stone-400">min</span>
                          </div>

                          <select
                            value={step.type}
                            onChange={(e: any) => handleUpdateStep(step.id, "type", e.target.value)}
                            className="bg-white border border-[#E7DCCE] rounded-lg px-2 py-1 text-xs font-semibold text-stone-700"
                          >
                            <option value="active">Ativo (Exclusivo)</option>
                            <option value="pause">Pausa Química (Paralelo OK)</option>
                          </select>

                          {technicalSteps.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveStep(step.id)}
                              className="p-1 text-stone-400 hover:text-red-600 transition-colors"
                              title="Remover etapa"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 2. SEÇÃO DE ETAPAS ADICIONAIS */}
                <div className="pt-3 border-t border-[#E7DCCE]/60 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h5 className="font-bold text-xs uppercase tracking-wider text-[#2D1914] flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-[#AD841D]" />
                        <span>Etapas &amp; Procedimentos Adicionais</span>
                      </h5>
                      <p className="text-[11px] text-stone-500 mt-0.5">
                        Adicione etapas extras (tratamentos complementares, corte, etc.). Na etapa seguinte você define os valores.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleAddStep(false)}
                      className="px-3 py-1 text-xs font-bold text-[#AD841D] hover:bg-amber-50 border border-amber-300 rounded-xl flex items-center gap-1 transition-all"
                    >
                      <Plus className="w-3.5 h-3.5" /> Adicionar Adicional
                    </button>
                  </div>

                  {additionalSteps.length === 0 ? (
                    <div className="p-4 rounded-xl border border-dashed border-[#E7DCCE] bg-stone-50/60 text-center">
                      <p className="text-xs text-stone-500">
                        Nenhuma etapa adicional incluída até o momento.
                      </p>
                      <button
                        type="button"
                        onClick={() => handleAddStep(false)}
                        className="mt-2 text-xs font-bold text-[#AD841D] hover:underline"
                      >
                        + Clique aqui para adicionar uma etapa complementar
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {additionalSteps.map((step, idx) => (
                        <div
                          key={step.id || idx}
                          className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all ${
                            step.type === "pause"
                              ? "bg-purple-50/40 border-dashed border-purple-300"
                              : "bg-white border-[#E7DCCE]"
                          }`}
                        >
                          <div className="flex items-center gap-2.5 flex-1">
                            <span className="px-2 py-0.5 rounded-md bg-[#AD841D] text-white text-[10px] font-extrabold uppercase shrink-0">
                              Adicional {idx + 1}
                            </span>
                            <input
                              type="text"
                              value={step.title}
                              onChange={(e) => handleUpdateStep(step.id, "title", e.target.value)}
                              className="flex-1 bg-white border border-[#E7DCCE] rounded-lg px-2.5 py-1 text-xs font-semibold text-[#2D1914]"
                              placeholder="Nome do procedimento adicional"
                            />
                          </div>

                          <div className="flex items-center gap-2 self-end sm:self-auto">
                            <div className="flex items-center gap-1 bg-white border border-[#E7DCCE] rounded-lg px-2 py-1">
                              <Clock4 className="w-3.5 h-3.5 text-stone-400" />
                              <input
                                type="number"
                                min={5}
                                step={5}
                                value={step.durationMin}
                                onChange={(e) =>
                                  handleUpdateStep(step.id, "durationMin", Number(e.target.value))
                                }
                                className="w-12 text-xs font-bold text-center outline-none"
                              />
                              <span className="text-[10px] text-stone-400">min</span>
                            </div>

                            <select
                              value={step.type}
                              onChange={(e: any) => handleUpdateStep(step.id, "type", e.target.value)}
                              className="bg-white border border-[#E7DCCE] rounded-lg px-2 py-1 text-xs font-semibold text-stone-700"
                            >
                              <option value="active">Ativo (Exclusivo)</option>
                              <option value="pause">Pausa Química (Paralelo OK)</option>
                            </select>

                            <button
                              type="button"
                              onClick={() => handleRemoveStep(step.id)}
                              className="p-1 text-stone-400 hover:text-red-600 transition-colors"
                              title="Remover etapa adicional"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Botão de Avançar para a Aba de Proposta */}
              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={handleGoToProposalTab}
                  className="px-6 py-3 rounded-2xl bg-gradient-to-r from-[#C59B27] to-[#AD841D] text-white text-xs font-extrabold flex items-center space-x-2 shadow-md hover:opacity-95 transition-all"
                >
                  <span>Continuar para Proposta Técnica &amp; Valores</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* ABA 2: DIAGNÓSTICO, PROPOSTA TÉCNICA E VALORES                 */}
          {/* ============================================================== */}
          {activeTab === "proposal" && (
            <div className="space-y-7">
              {/* 1. SEÇÃO DE RESPOSTAS DA CLIENTE */}
              <div className="p-5 sm:p-6 rounded-2xl bg-white border border-[#E7DCCE] shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-[#E7DCCE]/60 pb-3">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-[#C59B27]" />
                    <h3 className="font-bold text-sm sm:text-base text-[#2D1914]">
                      Diagnóstico da Cliente • Respostas da Triagem
                    </h3>
                  </div>
                  <span className="text-[11px] text-stone-500 font-medium">
                    Data: {clientRequestedDate} às {clientRequestedTime}
                  </span>
                </div>

                {hasChemicalHistory && (
                  <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-[#AD841D] shrink-0 mt-0.5" />
                    <div className="text-xs">
                      <strong className="block font-bold mb-0.5">
                        Atenção Técnica: Histórico com Química
                      </strong>
                      <span>
                        A cliente informou procedimentos anteriores ({chemicalAnswers.join(", ")}
                        ). O sistema sugeriu automaticamente um módulo preparatório.
                      </span>
                    </div>
                  </div>
                )}

                {(() => {
                  const technicalAnswers = safeAnswers.filter((ans) => {
                    const t = (ans.questionTitle || "").toLowerCase();
                    return (
                      !t.includes("foto") &&
                      !t.includes("upload") &&
                      !t.includes("imagem")
                    );
                  });

                  if (technicalAnswers.length === 0) return null;

                  return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                      {technicalAnswers.map((ans, idx) => (
                        <div
                          key={idx}
                          className="p-3.5 rounded-xl bg-[#FAF7F2] border border-[#E7DCCE]/70 hover:border-[#C59B27]/50 transition-all"
                        >
                          <span className="text-[11px] uppercase tracking-wider text-[#AD841D] font-bold block mb-1">
                            Pergunta {idx + 1}: {ans.questionTitle}
                          </span>
                          <p className="text-xs sm:text-sm font-semibold text-[#2D1914]">
                            {ans.selectedOptionLabels?.length
                              ? ans.selectedOptionLabels.join(" • ")
                              : ans.answerText || "Não informado"}
                          </p>
                        </div>
                      ))}
                    </div>
                  );
                })()}

                {/* Fotos da Cliente */}
                {(submission.photos.currentHairRoot ||
                  submission.photos.currentHairLength ||
                  submission.photos.inspirationDesired) && (
                  <div className="pt-2 border-t border-[#E7DCCE]/60">
                    <span className="text-[11px] font-bold text-[#5E372C] block mb-2">
                      Fotos Enviadas pela Cliente (clique para ampliar):
                    </span>
                    <div className="grid grid-cols-3 gap-3">
                      {submission.photos.currentHairRoot && (
                        <button
                          type="button"
                          onClick={() => handleOpenGallery(submission.photos.currentHairRoot!)}
                          className="group relative rounded-xl overflow-hidden border border-[#E7DCCE] bg-stone-100 block aspect-square text-left cursor-pointer"
                        >
                          <img
                            src={submission.photos.currentHairRoot}
                            alt="Raiz"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                          <span className="absolute bottom-1 left-1 right-1 text-[9px] bg-black/60 text-white px-1.5 py-0.5 rounded text-center truncate font-bold">
                            Raiz Natural
                          </span>
                        </button>
                      )}
                      {submission.photos.currentHairLength && (
                        <button
                          type="button"
                          onClick={() => handleOpenGallery(submission.photos.currentHairLength!)}
                          className="group relative rounded-xl overflow-hidden border border-[#E7DCCE] bg-stone-100 block aspect-square text-left cursor-pointer"
                        >
                          <img
                            src={submission.photos.currentHairLength}
                            alt="Comprimento"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                          <span className="absolute bottom-1 left-1 right-1 text-[9px] bg-black/60 text-white px-1.5 py-0.5 rounded text-center truncate font-bold">
                            Comprimento e Pontas
                          </span>
                        </button>
                      )}
                      {submission.photos.inspirationDesired && (
                        <button
                          type="button"
                          onClick={() => handleOpenGallery(submission.photos.inspirationDesired!)}
                          className="group relative rounded-xl overflow-hidden border border-[#E7DCCE] bg-stone-100 block aspect-square text-left cursor-pointer"
                        >
                          <img
                            src={submission.photos.inspirationDesired}
                            alt="Inspiração"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                          <span className="absolute bottom-1 left-1 right-1 text-[9px] bg-amber-950/80 text-white px-1.5 py-0.5 rounded text-center truncate font-bold">
                            Inspiração Desejada
                          </span>
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* 2. ETAPAS DO PROCEDIMENTO & INVESTIMENTO (Agrupamento Primordial vs Adicionais) */}
              <div className="bg-white p-5 sm:p-6 rounded-2xl border border-[#E7DCCE] shadow-xs space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E7DCCE]/60 pb-3">
                  <div>
                    <h3 className="font-bold text-sm sm:text-base text-[#2D1914] flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-[#C59B27]" />
                      <span>Etapas do Procedimento &amp; Precificação</span>
                    </h3>
                    <p className="text-[11px] text-stone-500 mt-0.5">
                      Todas as etapas do serviço principal somam o valor inicial do serviço. Etapas adicionais possuem valores próprios ou status incluso.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveTab("scheduling")}
                      className="px-2.5 py-1.5 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-50 text-[11px] font-bold flex items-center gap-1 transition-colors"
                      title="Voltar ao Passo 1 para alterar ordem ou minutos das etapas"
                    >
                      <Clock className="w-3.5 h-3.5 text-[#AD841D]" /> Ajustar no Passo 1
                    </button>
                    <button
                      type="button"
                      onClick={handleAddExtraModule}
                      className="px-3 py-1.5 rounded-xl border border-[#C59B27] bg-[#FAF7F2] text-[#AD841D] hover:bg-amber-50 text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs"
                    >
                      <Plus className="w-3.5 h-3.5" /> Adicionar Etapa Adicional
                    </button>
                  </div>
                </div>

                {/* BLOCO 1: PACOTE DO SERVIÇO PRINCIPAL (AGRUPADO) */}
                <div className="p-4 sm:p-5 rounded-2xl border-2 border-[#C59B27]/40 bg-gradient-to-br from-[#FAF7F2] to-amber-50/30 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#E7DCCE]">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full bg-[#2D1914] text-[#F3ECE2] text-[10px] font-extrabold uppercase tracking-wider">
                          Serviço Principal
                        </span>
                        <h4 className="font-bold text-sm sm:text-base text-[#2D1914]">
                          {matchedService?.title || submission.serviceTitle || "Serviço Base"}
                        </h4>
                      </div>
                      <p className="text-[11px] text-stone-600 mt-1">
                        As etapas abaixo pertencem exclusivamente a este serviço e compõem o valor contratado.
                      </p>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-auto">
                      <div className="px-3 py-1 rounded-xl bg-white border border-[#C59B27] text-right shadow-2xs">
                        <span className="text-[9px] uppercase font-bold text-stone-500 block">
                          Subtotal do Serviço
                        </span>
                        <span className="text-sm font-black text-[#2D1914]">
                          {formatBRL(primordialSubtotal)}
                        </span>
                      </div>
                      {primordialSubtotal !== defaultServicePrice && (
                        <button
                          type="button"
                          onClick={handleBalancePrimordialPrice}
                          className="px-2.5 py-1 text-[11px] font-bold text-[#AD841D] hover:bg-amber-100 bg-amber-50 border border-amber-300 rounded-xl transition-all"
                          title={`Ajustar para somar exatamente ${formatBRL(defaultServicePrice)}`}
                        >
                          Equilibrar para {formatBRL(defaultServicePrice)}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Lista das Etapas Primordiais */}
                  <div className="space-y-3">
                    {primordialModules.map((m, idx) => (
                      <div
                        key={m.id || idx}
                        className={`p-3.5 rounded-xl border transition-all space-y-2.5 ${
                          m.isIncluded
                            ? "bg-white/90 border-[#E7DCCE]"
                            : "bg-white border-[#C59B27]/50 shadow-xs"
                        }`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-[#2D1914] text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                              {idx + 1}
                            </span>
                            <span className="text-xs font-bold text-[#2D1914]">
                              {m.serviceTitle}
                            </span>
                            {m.durationMin && (
                              <span className="px-2 py-0.5 rounded-md bg-stone-100 text-stone-600 text-[10px] font-bold flex items-center gap-1 border border-stone-200">
                                <Clock className="w-3 h-3 text-[#AD841D]" />
                                {m.durationMin} min
                              </span>
                            )}
                            {m.stepType && (
                              <span
                                className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                  m.stepType === "pause"
                                    ? "bg-purple-100 text-purple-800"
                                    : "bg-amber-100 text-amber-900"
                                }`}
                              >
                                {m.stepType === "pause"
                                  ? "Pausa Química"
                                  : "Atendimento Ativo"}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                          {/* Modo de Cobrança: Cobrar vs Incluso */}
                          <div className="sm:col-span-5">
                            <label className="text-[10px] font-bold text-stone-500 block mb-1">
                              Status no Pacote:
                            </label>
                            <div className="grid grid-cols-2 p-1 bg-stone-200/60 rounded-xl">
                              <button
                                type="button"
                                onClick={() => {
                                  handleUpdateModule(m.id, "isIncluded", false);
                                  if (!m.originalPrice || m.originalPrice === 0) {
                                    handleUpdateModule(m.id, "originalPrice", defaultServicePrice);
                                  }
                                }}
                                className={`py-1 text-[11px] font-bold rounded-lg transition-all ${
                                  !m.isIncluded
                                    ? "bg-white text-[#2D1914] shadow-xs"
                                    : "text-stone-500 hover:text-stone-800"
                                }`}
                              >
                                Cobrar (R$)
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  handleUpdateModule(m.id, "isIncluded", true);
                                  handleUpdateModule(m.id, "originalPrice", 0);
                                }}
                                className={`py-1 text-[11px] font-bold rounded-lg transition-all ${
                                  m.isIncluded
                                    ? "bg-[#C59B27] text-white shadow-xs"
                                    : "text-stone-500 hover:text-stone-800"
                                }`}
                              >
                                Incluso
                              </button>
                            </div>
                          </div>

                          {/* Valor da Etapa */}
                          <div className="sm:col-span-7">
                            <label className="text-[10px] font-bold text-stone-500 block mb-1">
                              {m.isIncluded ? "Condição:" : "Valor da Etapa (R$):"}
                            </label>
                            {m.isIncluded ? (
                              <div className="w-full p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-extrabold flex items-center justify-center gap-1.5">
                                <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" /> Incluso no Pacote
                              </div>
                            ) : (
                              <div className="relative">
                                <span className="absolute left-2.5 top-2 text-xs font-bold text-stone-400">R$</span>
                                <input
                                  type="number"
                                  min="0"
                                  value={m.originalPrice || ""}
                                  onChange={(e) =>
                                    handleUpdateModule(m.id, "originalPrice", Number(e.target.value))
                                  }
                                  className="w-full pl-8 pr-2.5 py-1.5 rounded-lg border border-[#E7DCCE] text-xs font-black text-[#2D1914] bg-white focus:border-[#C59B27]"
                                  placeholder="0"
                                />
                              </div>
                            )}
                          </div>
                        </div>

                        <div>
                          <input
                            type="text"
                            value={m.explanation || ""}
                            onChange={(e) =>
                              handleUpdateModule(m.id, "explanation", e.target.value)
                            }
                            placeholder="Observação técnica opcional para esta etapa..."
                            className="w-full p-2 rounded-lg border border-[#E7DCCE]/80 text-xs text-stone-700 bg-stone-50/50 placeholder:text-stone-400"
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="pt-2 text-right">
                    <span className="text-xs font-medium text-stone-600">
                      Soma das etapas do serviço principal:{" "}
                      <strong className="text-[#2D1914] font-bold">{formatBRL(primordialSubtotal)}</strong>
                      {primordialSubtotal === defaultServicePrice ? (
                        <span className="text-emerald-700 font-bold ml-1.5">✓ Totaliza o serviço base</span>
                      ) : (
                        <span className="text-amber-800 font-semibold ml-1.5">
                          (Valor base do catálogo: {formatBRL(defaultServicePrice)})
                        </span>
                      )}
                    </span>
                  </div>
                </div>

                {/* BLOCO 2: ETAPAS & PROCEDIMENTOS ADICIONAIS */}
                <div className="p-4 sm:p-5 rounded-2xl border border-[#E7DCCE] bg-white space-y-4 shadow-2xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#E7DCCE]/60">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full bg-[#AD841D] text-white text-[10px] font-extrabold uppercase tracking-wider">
                          Adicionais &amp; Extras
                        </span>
                        <h4 className="font-bold text-sm sm:text-base text-[#2D1914]">
                          Procedimentos Complementares
                        </h4>
                      </div>
                      <p className="text-[11px] text-stone-500 mt-1">
                        Etapas adicionadas no Passo 1 ou criadas diretamente aqui.
                      </p>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-auto">
                      <div className="px-3 py-1 rounded-xl bg-stone-50 border border-stone-200 text-right">
                        <span className="text-[9px] uppercase font-bold text-stone-500 block">
                          Subtotal Adicionais
                        </span>
                        <span className="text-sm font-black text-[#2D1914]">
                          {formatBRL(additionalSubtotal)}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={handleAddExtraModule}
                        className="px-3 py-1.5 rounded-xl border border-[#C59B27] bg-[#FAF7F2] text-[#AD841D] hover:bg-amber-50 text-xs font-bold flex items-center gap-1.5 transition-all"
                      >
                        <Plus className="w-3.5 h-3.5" /> Adicionar
                      </button>
                    </div>
                  </div>

                  {additionalModules.length === 0 ? (
                    <div className="p-5 rounded-xl border border-dashed border-[#E7DCCE] bg-stone-50/50 text-center space-y-2">
                      <p className="text-xs text-stone-500">
                        Nenhum procedimento adicional adicionado a esta proposta.
                      </p>
                      <button
                        type="button"
                        onClick={handleAddExtraModule}
                        className="text-xs font-bold text-[#AD841D] hover:underline"
                      >
                        + Clique para incluir um procedimento complementar (ex: corte, tratamento extra)
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {additionalModules.map((m, idx) => (
                        <div
                          key={m.id || idx}
                          className={`p-3.5 rounded-xl border transition-all space-y-2.5 relative group ${
                            m.isIncluded
                              ? "border-[#E7DCCE]/70 bg-stone-50/60"
                              : "border-[#C59B27]/40 bg-[#FAF7F2]"
                          }`}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 rounded-lg text-[10px] uppercase font-extrabold bg-[#AD841D] text-white">
                                Adicional {idx + 1}
                              </span>
                              {m.durationMin && (
                                <span className="px-2 py-0.5 rounded-lg bg-stone-200/80 text-stone-700 text-[10px] font-bold flex items-center gap-1">
                                  <Clock className="w-3 h-3 text-stone-500" />
                                  {m.durationMin} min
                                </span>
                              )}
                              {m.stepType && (
                                <span
                                  className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${
                                    m.stepType === "pause"
                                      ? "bg-purple-100 text-purple-800"
                                      : "bg-amber-100 text-amber-900"
                                  }`}
                                >
                                  {m.stepType === "pause" ? "Pausa Química" : "Atendimento Ativo"}
                                </span>
                              )}
                            </div>

                            <button
                              type="button"
                              onClick={() => handleRemoveModule(m.id)}
                              className="text-stone-400 hover:text-red-600 transition-colors p-1"
                              title="Remover procedimento adicional"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                            <div className="sm:col-span-6">
                              <label className="text-[11px] font-bold text-stone-600 block mb-1">
                                Nome do Procedimento / Item:
                              </label>
                              <input
                                type="text"
                                value={m.serviceTitle}
                                onChange={(e) =>
                                  handleUpdateModule(m.id, "serviceTitle", e.target.value)
                                }
                                placeholder="Ex: Corte Visagista, Tratamento Lipídico Extra..."
                                className="w-full p-2 rounded-lg border border-[#E7DCCE] text-xs font-semibold text-[#2D1914] bg-white"
                              />
                            </div>

                            <div className="sm:col-span-3">
                              <label className="text-[11px] font-bold text-stone-600 block mb-1">
                                Cobrança:
                              </label>
                              <div className="grid grid-cols-2 p-1 bg-stone-200/60 rounded-xl">
                                <button
                                  type="button"
                                  onClick={() => {
                                    handleUpdateModule(m.id, "isIncluded", false);
                                    if (!m.originalPrice || m.originalPrice === 0) {
                                      handleUpdateModule(m.id, "originalPrice", 150);
                                    }
                                  }}
                                  className={`py-1 text-[11px] font-bold rounded-lg transition-all ${
                                    !m.isIncluded
                                      ? "bg-white text-[#2D1914] shadow-xs"
                                      : "text-stone-500 hover:text-stone-800"
                                  }`}
                                >
                                  Cobrar (R$)
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    handleUpdateModule(m.id, "isIncluded", true);
                                    handleUpdateModule(m.id, "originalPrice", 0);
                                  }}
                                  className={`py-1 text-[11px] font-bold rounded-lg transition-all ${
                                    m.isIncluded
                                      ? "bg-[#C59B27] text-white shadow-xs"
                                      : "text-stone-500 hover:text-stone-800"
                                  }`}
                                >
                                  Incluso
                                </button>
                              </div>
                            </div>

                            <div className="sm:col-span-3">
                              <label className="text-[11px] font-bold text-stone-600 block mb-1">
                                {m.isIncluded ? "Status:" : "Valor da Etapa (R$):"}
                              </label>
                              {m.isIncluded ? (
                                <div className="w-full p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-extrabold flex items-center justify-center gap-1.5">
                                  <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" /> Incluso no Pacote
                                </div>
                              ) : (
                                <div className="relative">
                                  <span className="absolute left-2.5 top-2 text-xs font-bold text-stone-400">R$</span>
                                  <input
                                    type="number"
                                    min="0"
                                    value={m.originalPrice || ""}
                                    onChange={(e) =>
                                      handleUpdateModule(m.id, "originalPrice", Number(e.target.value))
                                    }
                                    className="w-full pl-8 pr-2.5 py-1.5 rounded-lg border border-[#E7DCCE] text-xs font-black text-[#2D1914] bg-white focus:border-[#C59B27]"
                                    placeholder="0"
                                  />
                                </div>
                              )}
                            </div>
                          </div>

                          <div>
                            <input
                              type="text"
                              value={m.explanation || ""}
                              onChange={(e) =>
                                handleUpdateModule(m.id, "explanation", e.target.value)
                              }
                              placeholder="Observação explicativa para a cliente..."
                              className="w-full p-2 rounded-lg border border-[#E7DCCE]/80 text-xs text-stone-700 bg-white placeholder:text-stone-400"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* 3. RESUMO FINANCEIRO */}
              <div className="p-5 sm:p-6 rounded-2xl bg-white border border-[#E7DCCE] shadow-xs space-y-4">
                <div className="flex items-center gap-2 border-b border-[#E7DCCE]/60 pb-3">
                  <DollarSign className="w-4 h-4 text-[#C59B27]" />
                  <h3 className="font-bold text-sm sm:text-base text-[#2D1914]">
                    Resumo Financeiro &amp; Condições Especiais
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200">
                    <span className="text-[10px] text-stone-500 uppercase font-bold block mb-1">
                      Serviço Principal:
                    </span>
                    <span className="text-base font-bold text-stone-700">
                      {formatBRL(primordialSubtotal)}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200">
                    <span className="text-[10px] text-stone-500 uppercase font-bold block mb-1">
                      Etapas Adicionais:
                    </span>
                    <span className="text-base font-bold text-stone-700">
                      {formatBRL(additionalSubtotal)}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200">
                    <label className="text-[10px] text-stone-500 uppercase font-bold block mb-1">
                      Valor Final Proposta (R$):
                    </label>
                    <input
                      type="number"
                      value={priceDiscount}
                      onChange={(e) => setPriceDiscount(Number(e.target.value))}
                      className="w-full p-1.5 rounded-lg border border-stone-300 text-sm font-bold text-[#2D1914] bg-white"
                    />
                    {discountAmount > 0 && (
                      <span className="text-[10px] text-emerald-700 font-bold block mt-1">
                        Economia: {formatBRL(discountAmount)} ({discountPercent}% OFF)
                      </span>
                    )}
                  </div>

                  <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200">
                    <label className="text-[10px] text-amber-900 uppercase font-bold block mb-1">
                      Desconto Pix (%):
                    </label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min={0}
                        max={30}
                        value={pixDiscountPercent}
                        onChange={(e) => setPixDiscountPercent(Number(e.target.value))}
                        className="w-16 p-1.5 rounded-lg border border-amber-300 text-sm font-bold text-amber-900 bg-white"
                      />
                      <span className="text-xs font-bold text-amber-900">%</span>
                    </div>
                    <span className="text-[10px] text-amber-900 font-extrabold block mt-1">
                      Total no Pix: {formatBRL(pixTotal)}
                    </span>
                  </div>
                </div>
              </div>

              {/* 4. PARÂMETROS CONCEITUAIS */}
              <div className="bg-white p-5 sm:p-6 rounded-2xl border border-[#E7DCCE] shadow-xs space-y-4">
                <div className="border-b border-[#E7DCCE]/60 pb-3">
                  <h3 className="font-bold text-sm sm:text-base text-[#2D1914]">
                    Parâmetros Conceituais &amp; Visão da Especialista
                  </h3>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-[#2D1914] block mb-1">
                      Visão Geral do Projeto (Project Overview)
                    </label>
                    <textarea
                      rows={3}
                      value={projectOverview}
                      onChange={(e) => setProjectOverview(e.target.value)}
                      className="w-full p-3 rounded-xl border border-[#E7DCCE] text-xs leading-relaxed text-[#33302C]"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-[#2D1914] block mb-1">
                      Técnica Escolhida &amp; Aplicação
                    </label>
                    <textarea
                      rows={3}
                      value={chosenTechnique}
                      onChange={(e) => setChosenTechnique(e.target.value)}
                      className="w-full p-3 rounded-xl border border-[#E7DCCE] text-xs leading-relaxed text-[#33302C]"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-[#2D1914] block mb-1">
                      Orientações de Manutenção &amp; Home Care
                    </label>
                    <textarea
                      rows={3}
                      value={maintenanceGuidance}
                      onChange={(e) => setMaintenanceGuidance(e.target.value)}
                      className="w-full p-3 rounded-xl border border-[#E7DCCE] text-xs leading-relaxed text-[#33302C]"
                    />
                  </div>
                </div>
              </div>

              {/* 5. RESULTADOS DESEJADOS */}
              <div className="bg-white p-5 sm:p-6 rounded-2xl border border-[#E7DCCE] shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-[#2D1914]">
                    Resultados Desejados (Bullets de Destaque)
                  </label>
                  <button
                    type="button"
                    onClick={handleAddResult}
                    className="text-[11px] text-[#AD841D] font-bold hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Adicionar Tópico
                  </button>
                </div>
                <div className="space-y-1.5">
                  {desiredResults.map((item, idx) => (
                    <div key={idx} className="flex items-center space-x-2">
                      <span className="text-[#C59B27]">✦</span>
                      <input
                        type="text"
                        value={item}
                        onChange={(e) => {
                          const copy = [...desiredResults];
                          copy[idx] = e.target.value;
                          setDesiredResults(copy);
                        }}
                        className="flex-1 p-2 rounded-lg border border-[#E7DCCE] text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveResult(idx)}
                        className="text-stone-400 hover:text-red-600"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Rodapé de Ações Finais */}
        <div className="p-3.5 sm:p-5 border-t border-[#E7DCCE] bg-stone-50 flex flex-wrap items-center justify-between gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-200 rounded-xl transition-colors order-1"
          >
            Cancelar
          </button>

          <div className="flex flex-wrap items-center gap-2 order-2 w-full sm:w-auto justify-end">
            {activeTab === "proposal" && (
              <button
                type="button"
                onClick={() => setActiveTab("scheduling")}
                className="px-3 py-2 text-xs font-bold text-stone-700 bg-white border border-[#E7DCCE] hover:bg-stone-100 rounded-xl transition-all"
              >
                ← Agenda
              </button>
            )}

            <button
              type="button"
              onClick={() => handleSave(false)}
              className="px-3.5 sm:px-5 py-2.5 text-xs font-bold text-white gold-gradient rounded-xl shadow-md hover:opacity-95 flex items-center space-x-1.5 transition-all"
            >
              <Sparkles className="w-3.5 h-3.5 shrink-0" />
              <span>Salvar</span>
            </button>

            <button
              type="button"
              onClick={() => handleSave(true)}
              className="px-3.5 sm:px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md flex items-center space-x-1.5 transition-all active:scale-95 cursor-pointer"
              title="Salvar a proposta e abrir o WhatsApp com mensagem e link direto para a cliente"
            >
              <MessageCircle className="w-3.5 h-3.5 fill-white shrink-0" />
              <span>Salvar &amp; Enviar no WhatsApp</span>
            </button>
          </div>
        </div>
      </div>

      {/* Modal de Zoom de Fotografia (Galeria Fullscreen Universal) */}
      {activeGalleryPhotos && (
        <PhotoGalleryLightbox
          photos={activeGalleryPhotos}
          initialIndex={activeGalleryIndex}
          onClose={() => setActiveGalleryPhotos(null)}
        />
      )}
    </div>
  );
}
