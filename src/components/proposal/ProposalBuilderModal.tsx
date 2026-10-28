"use client";

import { useState, useMemo } from "react";
import { TriageSubmission } from "@/types/triage";
import { LuxuryProposal, ProposalItem } from "@/types/proposal";
import { ServiceItem } from "@/types/service";
import { formatBRL } from "@/lib/utils";
import {
  Sparkles,
  CheckCircle2,
  X,
  FileText,
  DollarSign,
  Plus,
  Trash2,
  Eye,
  AlertTriangle,
  Layers,
  Scissors,
  HelpCircle,
  Percent,
  Check,
} from "lucide-react";

interface ProposalBuilderModalProps {
  submission: TriageSubmission;
  initialProposal?: LuxuryProposal | null;
  services?: ServiceItem[];
  onSave: (proposal: LuxuryProposal) => void;
  onClose: () => void;
}

export function ProposalBuilderModal({
  submission,
  initialProposal,
  services = [],
  onSave,
  onClose,
}: ProposalBuilderModalProps) {
  // 1. Identificação do Serviço Escolhido pela Cliente
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

  // 2. Extração e Análise Inteligente das Respostas da Triagem
  const curvatureAns = useMemo(() => {
    return (
      submission.answers.find(
        (a) =>
          a.questionTitle?.toLowerCase().includes("curvatura") ||
          a.questionId?.includes("curv")
      )?.selectedOptionLabels?.[0] || ""
    );
  }, [submission.answers]);

  const chemicalAnswers = useMemo(() => {
    return (
      submission.answers.find(
        (a) =>
          a.questionTitle?.toLowerCase().includes("química") ||
          a.questionId?.includes("quimica")
      )?.selectedOptionLabels || []
    );
  }, [submission.answers]);

  const hasChemicalHistory = useMemo(() => {
    return chemicalAnswers.some(
      (c) =>
        !c.toLowerCase().includes("nenhuma") &&
        !c.toLowerCase().includes("natural")
    );
  }, [chemicalAnswers]);

  // 3. Algoritmo de Preenchimento Automático Baseado no Serviço Real
  const smartDefaults = useMemo(() => {
    const serviceTitle = matchedService?.title || submission.serviceTitle || "Transformação Personalizada";
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
      const treatmentService = services.find((s) => s.category === "tratamento") || {
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

  // 4. Estados Locais do Editor
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

  // Módulos de serviços
  const [modules, setModules] = useState<ProposalItem[]>(
    initialProposal?.items && initialProposal.items.length > 0
      ? initialProposal.items
      : smartDefaults.modules
  );

  // Cálculo da Soma Total dos Módulos
  const totalOriginal = useMemo(() => {
    return modules.reduce(
      (sum, m) => sum + (Number(m.originalPrice) || 0),
      0
    );
  }, [modules]);

  // Valores financeiros
  const [priceDiscount, setPriceDiscount] = useState<number>(
    initialProposal?.totalWithDiscount ??
      (initialProposal?.totalOriginal ?? totalOriginal)
  );
  const [pixDiscountPercent, setPixDiscountPercent] = useState<number>(
    initialProposal?.pixDiscountPercent ?? smartDefaults.defaultPixPercent
  );

  // Métricas de Desconto em Tempo Real
  const discountAmount = Math.max(0, totalOriginal - priceDiscount);
  const discountPercent =
    totalOriginal > 0 ? Math.round((discountAmount / totalOriginal) * 100) : 0;
  const pixTotal =
    Math.round(priceDiscount * (1 - pixDiscountPercent / 100) * 100) / 100;
  const totalSavings = Math.max(0, totalOriginal - pixTotal);

  // Manipulação de Módulos de Serviços
  const handleAddModule = () => {
    const defaultAvailable =
      services.find(
        (s) => !modules.some((m) => m.serviceTitle === s.title)
      ) || services[0];

    const newModule: ProposalItem = {
      id: `module-${Date.now()}`,
      serviceTitle: defaultAvailable?.title || "Novo Procedimento Complementar",
      originalPrice: defaultAvailable?.price || 200,
      moduleType: "preparatory",
      explanation: "Procedimento recomendado para potencializar o resultado final.",
    };

    // Insere antes da etapa final
    const finalIdx = modules.findIndex((m) => m.moduleType === "final");
    if (finalIdx >= 0) {
      const copy = [...modules];
      copy.splice(finalIdx, 0, newModule);
      setModules(copy);
    } else {
      setModules([...modules, newModule]);
    }
  };

  const handleUpdateModule = (
    index: number,
    field: keyof ProposalItem,
    value: any
  ) => {
    const copy = [...modules];
    copy[index] = { ...copy[index], [field]: value };

    // Se o usuário mudou o título para um serviço do catálogo, atualiza o preço automaticamente
    if (field === "serviceTitle") {
      const matched = services.find((s) => s.title === value);
      if (matched) {
        copy[index].originalPrice = matched.price;
      }
    }

    setModules(copy);
  };

  const handleRemoveModule = (index: number) => {
    if (modules.length <= 1) return;
    setModules(modules.filter((_, i) => i !== index));
  };

  const handleAddResult = () => {
    setDesiredResults([...desiredResults, "Novo ponto acordado"]);
  };

  const handleRemoveResult = (index: number) => {
    setDesiredResults(desiredResults.filter((_, i) => i !== index));
  };

  const handleSave = () => {
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
      status: initialProposal?.status || "sent",
      expiresAt:
        initialProposal?.expiresAt ||
        new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
      createdAt: initialProposal?.createdAt || new Date().toISOString(),
    };

    onSave(proposal);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-hidden">
      <div className="bg-[#FAF7F2] rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-[#E7DCCE] overflow-hidden animate-scale-up">
        {/* Topo do Modal */}
        <div className="p-5 sm:p-6 bg-white border-b border-[#E7DCCE] flex items-center justify-between shrink-0">
          <div>
            <span className="text-[10px] uppercase tracking-widest text-[#AD841D] font-bold block">
              {initialProposal ? "Edição de Proposta" : "Gerador Inteligente de Proposta"}
            </span>
            <h2 className="font-editorial text-xl sm:text-2xl font-bold text-[#2D1914] flex items-center gap-2">
              <span>{initialProposal ? "Editar Proposta de" : "Construir Proposta para"} {submission.clientName}</span>
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

        {/* Corpo com Scrollbar Otimizada */}
        <div className="p-5 sm:p-7 overflow-y-auto space-y-7 flex-1 text-xs sm:text-sm">
          {/* 1. SEÇÃO DE RESPOSTAS DA CLIENTE (MAIOR E MAIS LEGÍVEL) */}
          <div className="p-5 sm:p-6 rounded-2xl bg-white border border-[#E7DCCE] shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-[#E7DCCE]/60 pb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#C59B27]" />
                <h3 className="font-bold text-sm sm:text-base text-[#2D1914]">
                  Diagnóstico da Cliente • Respostas da Triagem
                </h3>
              </div>
              <span className="text-[11px] text-stone-500 font-medium">
                Pré-reserva: {submission.preferredDate} às {submission.preferredTimeSlot}
              </span>
            </div>

            {/* Alerta de Química se houver */}
            {hasChemicalHistory && (
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-[#AD841D] shrink-0 mt-0.5" />
                <div className="text-xs">
                  <strong className="block font-bold mb-0.5">Atenção Técnica: Histórico com Química</strong>
                  <span>A cliente informou procedimentos anteriores ({chemicalAnswers.join(", ")}). O sistema sugeriu automaticamente um módulo preparatório.</span>
                </div>
              </div>
            )}

            {/* Grade de Perguntas e Respostas da Cliente */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {submission.answers.map((ans, idx) => (
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

            {/* Fotos da Cliente */}
            {(submission.photos.currentHairRoot ||
              submission.photos.currentHairLength ||
              submission.photos.inspirationDesired) && (
              <div className="pt-2 border-t border-[#E7DCCE]/60">
                <span className="text-[11px] font-bold text-[#5E372C] block mb-2">
                  Fotos Enviadas pela Cliente:
                </span>
                <div className="grid grid-cols-3 gap-3">
                  {submission.photos.currentHairRoot && (
                    <a
                      href={submission.photos.currentHairRoot}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group relative rounded-xl overflow-hidden border border-[#E7DCCE] bg-stone-100 block aspect-square"
                    >
                      <img
                        src={submission.photos.currentHairRoot}
                        alt="Raiz"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                      <span className="absolute bottom-1 left-1 right-1 bg-black/60 backdrop-blur-xs text-[10px] text-white text-center py-0.5 rounded-md font-medium">
                        Foto da Raiz
                      </span>
                    </a>
                  )}
                  {submission.photos.currentHairLength && (
                    <a
                      href={submission.photos.currentHairLength}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group relative rounded-xl overflow-hidden border border-[#E7DCCE] bg-stone-100 block aspect-square"
                    >
                      <img
                        src={submission.photos.currentHairLength}
                        alt="Comprimento"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                      <span className="absolute bottom-1 left-1 right-1 bg-black/60 backdrop-blur-xs text-[10px] text-white text-center py-0.5 rounded-md font-medium">
                        Comprimento
                      </span>
                    </a>
                  )}
                  {submission.photos.inspirationDesired && (
                    <a
                      href={submission.photos.inspirationDesired}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group relative rounded-xl overflow-hidden border border-[#E7DCCE] bg-stone-100 block aspect-square"
                    >
                      <img
                        src={submission.photos.inspirationDesired}
                        alt="Inspiração"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                      <span className="absolute bottom-1 left-1 right-1 bg-black/60 backdrop-blur-xs text-[10px] text-white text-center py-0.5 rounded-md font-medium">
                        Inspiração Desejada
                      </span>
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* 2. CABEÇALHO DA PROPOSTA */}
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-[#E7DCCE] shadow-xs space-y-4">
            <h3 className="font-bold text-sm sm:text-base text-[#2D1914] flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#AD841D]" />
              <span>Conceito & Título Oficial da Proposta</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#2D1914] mb-1">
                  Título da Proposta
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-[#E7DCCE] text-xs sm:text-sm font-bold text-[#2D1914] focus:border-[#C59B27] outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#2D1914] mb-1">
                  Subtítulo / Conceito
                </label>
                <input
                  type="text"
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-[#E7DCCE] text-xs sm:text-sm font-medium text-[#683C30] focus:border-[#C59B27] outline-none"
                />
              </div>
            </div>

            {/* O Projeto da Gleicy */}
            <div>
              <label className="block text-xs font-semibold text-[#2D1914] mb-1">
                O Projeto para o Cabelo (Mensagem Personalizada da Gleicy)
              </label>
              <textarea
                rows={4}
                value={projectOverview}
                onChange={(e) => setProjectOverview(e.target.value)}
                className="w-full p-3 rounded-xl border border-[#E7DCCE] text-xs sm:text-sm leading-relaxed text-[#33302C] focus:border-[#C59B27] outline-none"
              />
            </div>
          </div>

          {/* 3. MÓDULOS DE SERVIÇOS (COM JUSTIFICATIVAS E ETAPA FINAL) */}
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-[#E7DCCE] shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E7DCCE]/60 pb-3">
              <div>
                <h3 className="font-bold text-sm sm:text-base text-[#2D1914] flex items-center gap-2">
                  <Layers className="w-4 h-4 text-[#AD841D]" />
                  <span>Módulos de Serviços Propostos</span>
                </h3>
                <p className="text-xs text-stone-500">
                  O serviço selecionado pela cliente entra automaticamente como etapa final. Você pode adicionar tratamentos preparatórios com justificativas técnicas.
                </p>
              </div>

              <button
                type="button"
                onClick={handleAddModule}
                className="px-3.5 py-1.5 text-xs font-bold text-white chocolate-gradient hover:opacity-95 rounded-xl flex items-center gap-1.5 shadow-2xs self-start sm:self-auto shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Adicionar Serviço Preparatório</span>
              </button>
            </div>

            {/* Lista dos Módulos */}
            <div className="space-y-3.5">
              {modules.map((mod, idx) => {
                const isFinal = mod.moduleType === "final" || idx === modules.length - 1;

                return (
                  <div
                    key={mod.id || idx}
                    className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                      isFinal
                        ? "bg-[#FAF7F2] border-[#C59B27]/50 shadow-2xs"
                        : "bg-white border-[#E7DCCE]"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                            isFinal
                              ? "bg-[#2D1914] text-white"
                              : "bg-amber-100 text-amber-900 border border-amber-300"
                          }`}
                        >
                          {isFinal ? "Etapa Final • Serviço Escolhido" : `Etapa ${idx + 1} • Preparatória`}
                        </span>
                        <span className="text-xs font-bold text-[#5E372C]">
                          {mod.serviceTitle}
                        </span>
                      </div>

                      {!isFinal && modules.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveModule(idx)}
                          className="text-stone-400 hover:text-red-600 transition-colors p-1"
                          title="Remover módulo"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                          Nome do Procedimento / Serviço
                        </label>
                        {services.length > 0 ? (
                          <div className="flex gap-2">
                            <select
                              value={mod.serviceTitle}
                              onChange={(e) =>
                                handleUpdateModule(idx, "serviceTitle", e.target.value)
                              }
                              className="flex-1 p-2.5 rounded-xl border border-stone-300 text-xs font-semibold text-[#2D1914] bg-white outline-none focus:border-[#C59B27]"
                            >
                              {services.map((s) => (
                                <option key={s.id} value={s.title}>
                                  {s.title} ({formatBRL(s.price)})
                                </option>
                              ))}
                              {!services.some((s) => s.title === mod.serviceTitle) && (
                                <option value={mod.serviceTitle}>
                                  {mod.serviceTitle} (Personalizado)
                                </option>
                              )}
                            </select>
                          </div>
                        ) : (
                          <input
                            type="text"
                            value={mod.serviceTitle}
                            onChange={(e) =>
                              handleUpdateModule(idx, "serviceTitle", e.target.value)
                            }
                            className="w-full p-2.5 rounded-xl border border-stone-300 text-xs font-semibold text-[#2D1914]"
                          />
                        )}
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                          Valor Tabela Original (R$)
                        </label>
                        <input
                          type="number"
                          value={mod.originalPrice}
                          onChange={(e) =>
                            handleUpdateModule(
                              idx,
                              "originalPrice",
                              Number(e.target.value)
                            )
                          }
                          className="w-full p-2.5 rounded-xl border border-stone-300 text-xs font-bold text-[#2D1914] outline-none focus:border-[#C59B27]"
                        />
                      </div>
                    </div>

                    {/* Justificativa Técnica do Módulo */}
                    <div>
                      <label className="block text-[11px] font-semibold text-[#5E372C] mb-1">
                        Por que este procedimento foi indicado para este cabelo? (Justificativa para a cliente)
                      </label>
                      <textarea
                        rows={2}
                        value={mod.explanation || ""}
                        onChange={(e) =>
                          handleUpdateModule(idx, "explanation", e.target.value)
                        }
                        placeholder="Ex: Necessário para recuperar a massa capilar e evitar quebra durante o processo de iluminação..."
                        className="w-full p-2.5 rounded-xl border border-[#E7DCCE] text-xs leading-relaxed text-[#33302C] focus:border-[#C59B27] outline-none"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 4. DASHBOARD DE DESCONTOS, CONDIÇÃO ESPECIAL E ECONOMIA */}
          <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-[#FDFBF7] to-amber-50/70 border border-amber-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-amber-200/60 pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-950 flex items-center gap-1.5">
                <Percent className="w-4 h-4 text-[#AD841D]" />
                <span>Condição Especial do Pacote & Visualizador de Desconto</span>
              </span>
              <span className="text-xs font-bold text-[#AD841D]">
                Soma Original: {formatBRL(totalOriginal)}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                  Soma dos Serviços (R$)
                </label>
                <input
                  type="number"
                  disabled
                  value={totalOriginal}
                  className="w-full p-2.5 rounded-xl border border-stone-200 bg-stone-100 text-xs font-bold text-stone-600 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#2D1914] mb-1">
                  Condição Especial Pacote (R$)
                </label>
                <input
                  type="number"
                  value={priceDiscount}
                  onChange={(e) => setPriceDiscount(Number(e.target.value))}
                  className="w-full p-2.5 rounded-xl border border-amber-300 text-xs font-bold text-[#2D1914] bg-white outline-none focus:border-[#AD841D]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#7B493B] mb-1">
                  Desconto no Pix (%)
                </label>
                <input
                  type="number"
                  value={pixDiscountPercent}
                  onChange={(e) => setPixDiscountPercent(Number(e.target.value))}
                  className="w-full p-2.5 rounded-xl border border-stone-300 text-xs font-bold text-[#7B493B] bg-white outline-none focus:border-[#AD841D]"
                />
              </div>
            </div>

            {/* PAINEL DE CONTROLE DE DESCONTO PARA A GLEICY */}
            <div className="p-4 rounded-xl bg-white border border-amber-200 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="p-2 border-r border-stone-100">
                <span className="text-[10px] uppercase font-bold text-stone-500 block">
                  Valor Original
                </span>
                <span className="font-bold text-sm text-[#2D1914]">
                  {formatBRL(totalOriginal)}
                </span>
              </div>

              <div className="p-2 border-r border-stone-100">
                <span className="text-[10px] uppercase font-bold text-[#AD841D] block">
                  Desconto Pacote
                </span>
                <span className="font-bold text-sm text-emerald-700">
                  {discountAmount > 0 ? `-${formatBRL(discountAmount)}` : "Sem desconto"}
                </span>
                {discountPercent > 0 && (
                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.2 rounded block mt-0.5">
                    {discountPercent}% OFF
                  </span>
                )}
              </div>

              <div className="p-2 border-r border-stone-100">
                <span className="text-[10px] uppercase font-bold text-[#7B493B] block">
                  À vista no Pix
                </span>
                <span className="font-editorial text-base sm:text-lg font-bold text-[#7B493B]">
                  {formatBRL(pixTotal)}
                </span>
              </div>

              <div className="p-2 bg-emerald-50/60 rounded-lg">
                <span className="text-[10px] uppercase font-bold text-emerald-900 block">
                  Economia Total
                </span>
                <span className="font-bold text-sm text-emerald-800">
                  {formatBRL(totalSavings)}
                </span>
              </div>
            </div>
          </div>

          {/* 5. TÉCNICA E MANUTENÇÃO */}
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-[#E7DCCE] shadow-xs space-y-4">
            <h3 className="font-bold text-sm sm:text-base text-[#2D1914]">
              Técnica & Recomendações de Manutenção
            </h3>

            <div>
              <label className="block text-xs font-semibold text-[#2D1914] mb-1">
                Técnica Escolhida & Justificativa Técnica
              </label>
              <textarea
                rows={3}
                value={chosenTechnique}
                onChange={(e) => setChosenTechnique(e.target.value)}
                className="w-full p-3 rounded-xl border border-[#E7DCCE] text-xs leading-relaxed text-[#33302C]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#2D1914] mb-1">
                Orientações de Manutenção do Resultado
              </label>
              <textarea
                rows={3}
                value={maintenanceGuidance}
                onChange={(e) => setMaintenanceGuidance(e.target.value)}
                className="w-full p-3 rounded-xl border border-[#E7DCCE] text-xs leading-relaxed text-[#33302C]"
              />
            </div>
          </div>

          {/* 6. RESULTADOS DESEJADOS */}
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

        {/* Rodapé de Ações */}
        <div className="p-4 sm:p-5 border-t border-[#E7DCCE] bg-stone-50 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-200 rounded-xl transition-colors"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleSave}
            className="px-6 py-2.5 text-xs font-bold text-white gold-gradient rounded-xl shadow-md hover:opacity-95 flex items-center space-x-1.5 transition-all"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>
              {initialProposal
                ? "Salvar Alterações da Proposta"
                : "Salvar e Gerar Link Web / PDF"}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
