"use client";

import { useState, useRef } from "react";
import { ServiceItem, ServiceStep, ServicePriceType } from "@/types/service";
import { TriageForm } from "@/types/triage";
import { UserProfile } from "@/types/salon";
import { formatBRL } from "@/lib/utils";
import { compressImageFile } from "@/lib/storage/imageCompression";
import { uploadImageToStorage } from "@/lib/storage/uploader";
import {
  X,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Scissors,
  Hourglass,
  Sparkles,
  Layers,
  Clock,
  DollarSign,
  AlertCircle,
  HelpCircle,
  UploadCloud,
  Image as ImageIcon,
  CheckCircle2,
  Check,
} from "lucide-react";

const SALON_PRESET_IMAGES = [
  { url: "/brand/Carrossel_Fotos/1.webp", label: "Mechas & Iluminado Dourado" },
  { url: "/brand/Carrossel_Fotos/2.webp", label: "Corte em Camadas Crespas" },
  { url: "/brand/Carrossel_Fotos/3.webp", label: "Cachos Definidos & Volume" },
  { url: "/brand/Carrossel_Fotos/4.webp", label: "Iluminado Mel Quente" },
  { url: "/brand/Carrossel_Fotos/5.webp", label: "Terapia & Tratamento Intensivo" },
  { url: "/brand/Carrossel_Fotos/6.webp", label: "Morena Iluminada Avelã" },
];

interface ServiceEditorModalProps {
  service?: ServiceItem | null; // se fornecido, é modo edição; se null, é criação
  triageForms: TriageForm[];
  profiles?: UserProfile[];
  onSave: (service: ServiceItem) => Promise<void>;
  onClose: () => void;
}

export function ServiceEditorModal({
  service,
  triageForms,
  profiles,
  onSave,
  onClose,
}: ServiceEditorModalProps) {
  const isEditing = Boolean(service);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Estados dos Dados Gerais
  const [title, setTitle] = useState(service?.title || "");
  const defaultProfId =
    service?.professionalId ||
    profiles?.find((p) => p.role === "salon_owner")?.id ||
    profiles?.[0]?.id ||
    "58f26242-1e53-432e-b924-dea25ee2068a";
  const [professionalId, setProfessionalId] = useState<string>(defaultProfId);

  const [category, setCategory] = useState<
    "transformacao" | "mechas" | "corte" | "tratamento" | "outros"
  >(service?.category || "mechas");
  const [description, setDescription] = useState(service?.description || "");
  const [priceType, setPriceType] = useState<ServicePriceType>(
    service?.priceType || "fixed"
  );
  const [price, setPrice] = useState<string>(
    service?.price !== undefined ? String(service.price) : "250"
  );
  const [maxPrice, setMaxPrice] = useState<string>(
    service?.maxPrice !== undefined && service.maxPrice !== null ? String(service.maxPrice) : ""
  );
  const [promotionalPrice, setPromotionalPrice] = useState<string>(
    service?.promotionalPrice ? String(service.promotionalPrice) : ""
  );
  // Pré-seleciona a primeira foto oficial do salão como fallback elegante se for novo serviço
  const [imageUrl, setImageUrl] = useState<string>(
    service?.imageUrl || SALON_PRESET_IMAGES[0].url
  );
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [requiresTriage, setRequiresTriage] = useState<boolean>(
    service?.requiresTriage ?? true
  );
  const [triageFormId, setTriageFormId] = useState<string>(
    service?.triageFormId || (triageForms[0]?.id ?? "")
  );

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setErrorMsg("Selecione um arquivo de imagem válido (JPG, PNG ou WEBP).");
      return;
    }

    setIsUploadingImage(true);
    setErrorMsg(null);
    try {
      // 1. Otimiza com compressão canvas para WebP ~150KB
      const compressed = await compressImageFile(file, {
        maxDimension: 1200,
        quality: 0.8,
        mimeType: "image/webp",
      });

      // Preview imediato
      setImageUrl(compressed.dataUrl);

      // 2. Upload para Cloudflare R2
      const publicUrl = await uploadImageToStorage(
        compressed.blob,
        `procedure-${Date.now()}.webp`,
        "procedures"
      );

      if (publicUrl && publicUrl.startsWith("http")) {
        setImageUrl(publicUrl);
      }
    } catch (err: any) {
      console.error("Erro ao subir imagem de procedimento:", err);
      setErrorMsg("Não foi possível enviar a imagem. Tente novamente.");
    } finally {
      setIsUploadingImage(false);
    }
  };

  // Estados das Etapas do Procedimento
  const [steps, setSteps] = useState<ServiceStep[]>(() =>
    service?.steps && service.steps.length > 0
      ? service.steps
      : [
          {
            id: "st-1-default",
            order: 1,
            title: "Diagnóstico & Aplicação",
            type: "active",
            durationMin: 45,
            requiresExclusiveAttention: true,
          },
          {
            id: "st-2-default",
            order: 2,
            title: "Pausa Química de Ação",
            type: "pause",
            durationMin: 45,
            maxPauseDurationMin: 55,
            requiresExclusiveAttention: false,
          },
          {
            id: "st-3-default",
            order: 3,
            title: "Lavatório & Finalização",
            type: "active",
            durationMin: 30,
            requiresExclusiveAttention: true,
          },
        ]
  );

  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Métricas dinâmicas de tempo
  const totalDuration = steps.reduce((sum, s) => sum + (Number(s.durationMin) || 0), 0);
  const activeDuration = steps
    .filter((s) => s.type === "active")
    .reduce((sum, s) => sum + (Number(s.durationMin) || 0), 0);
  const pauseDuration = steps
    .filter((s) => s.type === "pause")
    .reduce((sum, s) => sum + (Number(s.durationMin) || 0), 0);

  // Adicionar nova etapa
  const handleAddStep = (type: "active" | "pause" = "active") => {
    const newStep: ServiceStep = {
      id: `st-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      order: steps.length + 1,
      title: type === "active" ? "Etapa em Cadeira" : "Pausa Química na Poltrona",
      type,
      durationMin: type === "active" ? 30 : 45,
      maxPauseDurationMin: type === "pause" ? 55 : undefined,
      requiresExclusiveAttention: type === "active",
    };
    setSteps([...steps, newStep]);
  };

  // Remover etapa
  const handleRemoveStep = (index: number) => {
    if (steps.length <= 1) {
      setErrorMsg("O serviço deve conter no mínimo 1 etapa.");
      return;
    }
    const updated = steps.filter((_, idx) => idx !== index);
    setSteps(updated.map((s, idx) => ({ ...s, order: idx + 1 })));
  };

  // Atualizar campo de uma etapa
  const handleUpdateStep = (index: number, updates: Partial<ServiceStep>) => {
    const updated = [...steps];
    updated[index] = { ...updated[index], ...updates };
    setSteps(updated);
  };

  // Mover etapa para cima
  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const updated = [...steps];
    const temp = updated[index - 1];
    updated[index - 1] = updated[index];
    updated[index] = temp;
    setSteps(updated.map((s, idx) => ({ ...s, order: idx + 1 })));
  };

  // Mover etapa para baixo
  const handleMoveDown = (index: number) => {
    if (index === steps.length - 1) return;
    const updated = [...steps];
    const temp = updated[index + 1];
    updated[index + 1] = updated[index];
    updated[index] = temp;
    setSteps(updated.map((s, idx) => ({ ...s, order: idx + 1 })));
  };

  // Submissão do Formulário
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      setErrorMsg("Por favor, informe o nome do serviço / procedimento.");
      scrollContainerRef.current?.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    const numericPrice = Number(price);
    if (isNaN(numericPrice) || numericPrice <= 0) {
      setErrorMsg(
        priceType === "starting_at"
          ? "Informe um valor inicial válido maior que zero (a partir de R$)."
          : "Informe um preço fixo válido maior que zero (R$)."
      );
      scrollContainerRef.current?.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    let numericMaxPrice: number | undefined = undefined;
    if (priceType === "starting_at" && maxPrice.trim()) {
      numericMaxPrice = Number(maxPrice);
      if (isNaN(numericMaxPrice) || numericMaxPrice <= 0) {
        setErrorMsg("O valor máximo deve ser um número válido maior que zero (R$).");
        scrollContainerRef.current?.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      if (numericMaxPrice < numericPrice) {
        setErrorMsg("O valor máximo (R$) não pode ser menor do que o valor inicial (a partir de R$).");
        scrollContainerRef.current?.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
    }

    let numericPromoPrice: number | undefined = undefined;
    if (priceType === "fixed" && promotionalPrice.trim()) {
      numericPromoPrice = Number(promotionalPrice);
      if (isNaN(numericPromoPrice) || numericPromoPrice <= 0) {
        setErrorMsg("O preço promocional deve ser um número válido maior que zero (R$).");
        scrollContainerRef.current?.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      if (numericPromoPrice >= numericPrice) {
        setErrorMsg("O preço promocional deve ser menor do que o preço fixo original.");
        scrollContainerRef.current?.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
    }

    let finalImageUrl = imageUrl?.trim();
    if (!finalImageUrl) {
      finalImageUrl = SALON_PRESET_IMAGES[0].url;
      setImageUrl(finalImageUrl);
    }

    if (steps.length === 0) {
      setErrorMsg("Adicione pelo menos uma etapa ao procedimento.");
      return;
    }

    const hasEmptyStep = steps.some((s) => !s.title || !s.title.trim());
    if (hasEmptyStep) {
      setErrorMsg("Todas as etapas do procedimento precisam de um nome definido.");
      return;
    }

    setIsSaving(true);
    setErrorMsg(null);

    try {
      const slug =
        service?.slug ||
        title
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)+/g, "");

      const serviceToSave: ServiceItem = {
        id: service?.id || `srv-${slug}-${Date.now()}`,
        orgId: service?.orgId || "11111111-1111-4111-8111-111111111111",
        professionalId: professionalId || service?.professionalId || "58f26242-1e53-432e-b924-dea25ee2068a",
        title: title.trim(),
        slug,
        category,
        description: description.trim(),
        priceType,
        price: numericPrice,
        maxPrice: priceType === "starting_at" ? numericMaxPrice : undefined,
        promotionalPrice: priceType === "fixed" ? numericPromoPrice : undefined,
        imageUrl: finalImageUrl,
        requiresTriage,
        triageFormId: requiresTriage ? triageFormId || (triageForms[0]?.id ?? undefined) : undefined,
        isActive: service?.isActive ?? true,
        steps: steps.map((s, idx) => ({
          ...s,
          order: idx + 1,
          durationMin: Math.max(5, Number(s.durationMin) || 15),
          maxPauseDurationMin:
            s.type === "pause"
              ? Math.max(Number(s.durationMin) || 15, Number(s.maxPauseDurationMin) || (Number(s.durationMin) || 15) + 10)
              : undefined,
        })),
      };

      await onSave(serviceToSave);
      onClose();
    } catch (err: any) {
      console.error("Erro ao salvar serviço", err);
      setErrorMsg(
        err?.message || "Ocorreu um erro ao salvar o serviço no banco de dados. Tente novamente."
      );
      scrollContainerRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-hidden touch-manipulation overscroll-contain"
    >
      <div className="bg-white rounded-t-[28px] sm:rounded-3xl rounded-b-none sm:rounded-b-3xl max-w-3xl w-full shadow-2xl border-t border-x sm:border border-[#E7DCCE] animate-slide-up-sheet text-[#2D1914] h-[92dvh] sm:h-auto max-h-[92dvh] sm:max-h-[90vh] flex flex-col overflow-hidden">
        {/* Puxador Visual Mobile (Bottom Sheet Handle) */}
        <div className="w-12 h-1.5 bg-[#D8D0BD] rounded-full mx-auto my-2.5 sm:hidden shrink-0" />

        {/* Topo do Modal */}
        <div className="flex items-center justify-between px-4 sm:px-7 py-3 sm:py-4 border-b border-[#E7DCCE] shrink-0 bg-white">
          <div className="flex items-center space-x-2.5 sm:space-x-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl chocolate-gradient flex items-center justify-center text-[#DBAE3B] shadow-sm shrink-0">
              <Scissors className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <span className="text-[9px] sm:text-[10px] uppercase font-bold tracking-widest text-[#AD841D]">
                Engenharia de Procedimentos
              </span>
              <h2 className="text-sm sm:text-xl font-bold truncate max-w-[210px] sm:max-w-none">
                {isEditing ? "Editar Serviço & Etapas" : "Cadastrar Novo Serviço"}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#FAF7F2] hover:bg-[#F3ECE1] text-[#5E372C] flex items-center justify-center transition-all border border-[#E7DCCE] shrink-0"
            title="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Formulário com Scroll Interno */}
        <form onSubmit={handleSubmit} noValidate className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {/* Mensagem de Erro Superior */}
          {errorMsg && (
            <div className="mx-4 sm:mx-7 mt-3 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center justify-between gap-2 shrink-0 animate-fade-in">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{errorMsg}</span>
              </div>
              <button
                type="button"
                onClick={() => setErrorMsg(null)}
                className="text-rose-500 hover:text-rose-700 text-xs px-1"
              >
                ✕
              </button>
            </div>
          )}

          <div
            ref={scrollContainerRef}
            className="flex-1 overflow-y-auto px-4 sm:px-7 py-4 space-y-5 sm:space-y-6 overscroll-contain [webkit-overflow-scrolling:touch]"
          >
          {/* 1. DADOS GERAIS DO SERVIÇO */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#AD841D] flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#AD841D]" />
              Dados Gerais do Serviço
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Nome do Serviço */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-[#2D1914] mb-1">
                  Nome do Serviço / Procedimento *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Iluminado dos Sonhos, Corte em Camadas Crespas..."
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    if (errorMsg) setErrorMsg(null);
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E7DCCE] text-sm font-semibold outline-none focus:border-[#AD841D] bg-[#FAF7F2]/50"
                />
              </div>

              {/* Categoria */}
              <div>
                <label className="block text-xs font-bold text-[#2D1914] mb-1">
                  Categoria
                </label>
                <select
                  value={category}
                  onChange={(e) =>
                    setCategory(
                      e.target.value as
                        | "transformacao"
                        | "mechas"
                        | "corte"
                        | "tratamento"
                        | "outros"
                    )
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E7DCCE] text-xs font-semibold outline-none focus:border-[#AD841D] bg-white"
                >
                  <option value="mechas">Mechas & Iluminados</option>
                  <option value="transformacao">Transformação Completa</option>
                  <option value="corte">Cortes Personalizados</option>
                  <option value="tratamento">Terapia Capilar & Tratamentos</option>
                  <option value="outros">Outro Procedimento</option>
                </select>
              </div>

              {/* Profissional Responsável */}
              {profiles && profiles.length > 0 && (
                <div>
                  <label className="block text-xs font-bold text-[#2D1914] mb-1">
                    Profissional Responsável
                  </label>
                  <select
                    value={professionalId}
                    onChange={(e) => setProfessionalId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E7DCCE] text-xs font-semibold outline-none focus:border-[#AD841D] bg-white"
                  >
                    {profiles.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} {p.role === "salon_owner" ? "(Proprietária)" : "(Especialista)"}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Seletor Segmentado de Modelo de Precificação */}
              <div className="sm:col-span-2 space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-[#2D1914]">
                    Modalidade de Preço *
                  </label>
                  <span className="text-[11px] text-stone-500">
                    {priceType === "fixed"
                      ? "Valor único e fechado para o serviço"
                      : "Faixa com valor mínimo ('a partir de R$')"}
                  </span>
                </div>

                <div data-tutorial="service-price-type-toggle" className="grid grid-cols-2 gap-2 p-1.5 bg-[#FAF7F2] rounded-2xl border border-[#E7DCCE]">
                  <button
                    type="button"
                    onClick={() => {
                      setPriceType("fixed");
                      if (errorMsg) setErrorMsg(null);
                    }}
                    className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      priceType === "fixed"
                        ? "bg-[#2D1914] text-white shadow-xs"
                        : "text-[#5E372C] hover:text-[#2D1914] hover:bg-white/70"
                    }`}
                  >
                    <DollarSign className="w-4 h-4 text-[#DBAE3B]" />
                    <span>Preço Fixo</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setPriceType("starting_at");
                      if (errorMsg) setErrorMsg(null);
                    }}
                    className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      priceType === "starting_at"
                        ? "bg-[#AD841D] text-white shadow-xs"
                        : "text-[#5E372C] hover:text-[#2D1914] hover:bg-white/70"
                    }`}
                  >
                    <Sparkles className="w-4 h-4 text-white" />
                    <span>A partir de... (Faixa)</span>
                  </button>
                </div>
              </div>

              {/* Campos Condicionais conforme Preço Fixo vs A partir de */}
              {priceType === "fixed" ? (
                <>
                  {/* Preço Fixo Base */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-bold text-[#2D1914]">
                        Preço Fixo (R$) *
                      </label>
                      <span className="text-[10px] text-stone-400">Sugestões rápidas:</span>
                    </div>
                    <div className="relative mb-1.5">
                      <span className="absolute left-3 top-2.5 text-xs text-stone-400 font-bold">
                        R$
                      </span>
                      <input
                        type="number"
                        step="any"
                        min="1"
                        placeholder="250"
                        value={price}
                        onChange={(e) => {
                          setPrice(e.target.value);
                          if (errorMsg) setErrorMsg(null);
                        }}
                        className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-[#E7DCCE] text-sm font-semibold outline-none focus:border-[#AD841D] bg-[#FAF7F2]/50"
                      />
                    </div>
                    <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
                      {["80", "120", "180", "250", "380", "500"].map((val) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => {
                            setPrice(val);
                            if (errorMsg) setErrorMsg(null);
                          }}
                          className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border transition-all shrink-0 cursor-pointer ${
                            price === val
                              ? "bg-[#2D1914] text-white border-[#2D1914] shadow-xs"
                              : "bg-white text-stone-600 border-[#E7DCCE] hover:bg-[#FAF7F2]"
                          }`}
                        >
                          R$ {val}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Preço Promocional Opcional */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-bold text-[#2D1914]">
                        Preço Promocional (Opcional)
                      </label>
                      <span className="text-[10px] text-stone-400">Valor com desconto</span>
                    </div>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-xs text-stone-400 font-bold">
                        R$
                      </span>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        placeholder="Deixe em branco se não houver"
                        value={promotionalPrice}
                        onChange={(e) => {
                          setPromotionalPrice(e.target.value);
                          if (errorMsg) setErrorMsg(null);
                        }}
                        className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-[#E7DCCE] text-sm font-semibold outline-none focus:border-[#AD841D] bg-[#FAF7F2]/50"
                      />
                    </div>
                    <span className="text-[10px] text-stone-400 mt-1 block">
                      Se informado, risca o valor original na vitrine.
                    </span>
                  </div>
                </>
              ) : (
                <>
                  {/* Valor Inicial ("A partir de R$") */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-bold text-[#2D1914] flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-[#AD841D]" />
                        <span>Valor Inicial (a partir de R$) *</span>
                      </label>
                      <span className="text-[10px] text-stone-400">Sugestões rápidas:</span>
                    </div>
                    <div className="relative mb-1.5">
                      <span className="absolute left-3 top-2.5 text-xs text-stone-400 font-bold">
                        R$
                      </span>
                      <input
                        type="number"
                        step="any"
                        min="1"
                        placeholder="250"
                        value={price}
                        onChange={(e) => {
                          setPrice(e.target.value);
                          if (errorMsg) setErrorMsg(null);
                        }}
                        className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-[#E7DCCE] text-sm font-semibold outline-none focus:border-[#AD841D] bg-[#FAF7F2]/50"
                      />
                    </div>
                    <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
                      {["120", "180", "250", "350", "480", "650"].map((val) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => {
                            setPrice(val);
                            if (errorMsg) setErrorMsg(null);
                          }}
                          className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border transition-all shrink-0 cursor-pointer ${
                            price === val
                              ? "bg-[#AD841D] text-white border-[#AD841D] shadow-xs"
                              : "bg-white text-stone-600 border-[#E7DCCE] hover:bg-[#FAF7F2]"
                          }`}
                        >
                          R$ {val}
                        </button>
                      ))}
                    </div>
                    <span className="text-[10px] text-stone-500 mt-1 block">
                      Exibido no catálogo como: &quot;A partir de R$ {price || "..."}&quot;
                    </span>
                  </div>

                  {/* Valor Máximo Opcional */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-bold text-[#2D1914]">
                        Valor Máximo Estimado (R$) (Opcional)
                      </label>
                      <span className="text-[10px] text-stone-400">Teto da faixa</span>
                    </div>
                    <div className="relative mb-1.5">
                      <span className="absolute left-3 top-2.5 text-xs text-stone-400 font-bold">
                        R$
                      </span>
                      <input
                        type="number"
                        step="any"
                        min="1"
                        placeholder="Ex: 450 (ou deixe em branco)"
                        value={maxPrice}
                        onChange={(e) => {
                          setMaxPrice(e.target.value);
                          if (errorMsg) setErrorMsg(null);
                        }}
                        className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-[#E7DCCE] text-sm font-semibold outline-none focus:border-[#AD841D] bg-[#FAF7F2]/50"
                      />
                    </div>
                    {/* Chips de acréscimo proporcional rápido */}
                    {Number(price) > 0 && (
                      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
                        {[
                          Math.round(Number(price) * 1.3),
                          Math.round(Number(price) * 1.5),
                          Math.round(Number(price) * 1.8),
                          Math.round(Number(price) * 2.0),
                        ].map((suggested) => (
                          <button
                            key={suggested}
                            type="button"
                            onClick={() => {
                              setMaxPrice(String(suggested));
                              if (errorMsg) setErrorMsg(null);
                            }}
                            className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border transition-all shrink-0 cursor-pointer ${
                              maxPrice === String(suggested)
                                ? "bg-[#2D1914] text-white border-[#2D1914] shadow-xs"
                                : "bg-white text-stone-600 border-[#E7DCCE] hover:bg-[#FAF7F2]"
                            }`}
                          >
                            R$ {suggested}
                          </button>
                        ))}
                      </div>
                    )}
                    <span className="text-[10px] text-stone-500 mt-1 block">
                      {maxPrice && Number(maxPrice) >= Number(price)
                        ? `Faixa final: A partir de R$ ${price} até R$ ${maxPrice}`
                        : "Opcional. Se não informado, exibe apenas 'A partir de R$ X'."}
                    </span>
                  </div>
                </>
              )}

              {/* Requer Triagem */}
              <div className="flex flex-col justify-end">
                <label className="flex items-center space-x-2.5 p-2.5 rounded-xl border border-[#E7DCCE] bg-[#FAF7F2]/60 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={requiresTriage}
                    onChange={(e) => setRequiresTriage(e.target.checked)}
                    className="w-4 h-4 accent-[#AD841D] rounded"
                  />
                  <div className="text-xs">
                    <span className="font-bold block text-[#2D1914]">
                      Exige Triagem Online
                    </span>
                    <span className="text-[10px] text-stone-500">
                      Cliente responde antes do agendamento
                    </span>
                  </div>
                </label>
              </div>

              {/* Modelo de Triagem Vinculado */}
              {requiresTriage && (
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-[#2D1914] mb-1">
                    Questionário de Triagem Vinculado
                  </label>
                  <select
                    value={triageFormId}
                    onChange={(e) => setTriageFormId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E7DCCE] text-xs font-semibold outline-none focus:border-[#AD841D] bg-white"
                  >
                    {triageForms.map((form) => (
                      <option key={form.id} value={form.id}>
                        {form.title} ({form.questions.length} perguntas)
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Descrição */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-[#2D1914] mb-1">
                  Descrição do Serviço
                </label>
                <textarea
                  rows={2}
                  placeholder="Explique o que está incluso, benefícios e o perfil de cabelo ideal..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E7DCCE] text-xs font-medium outline-none focus:border-[#AD841D] bg-[#FAF7F2]/50"
                />
              </div>

              {/* Foto Ilustrativa do Serviço (OBRIGATÓRIO COM PREVIEW AUTOMÁTICO) */}
              <div className="sm:col-span-2 pt-2 border-t border-[#E7DCCE]/60 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <div>
                    <label className="block text-xs font-bold text-[#2D1914] flex items-center gap-1.5">
                      <ImageIcon className="w-3.5 h-3.5 text-[#AD841D]" />
                      <span>Imagem de Destaque do Serviço (Vitrine)</span>
                      <span className="text-emerald-700 font-extrabold text-xs">✓ Foto Incluída</span>
                    </label>
                    <p className="text-[11px] text-stone-500">
                      Foto em alta definição exibida no catálogo. Já selecionamos uma foto do portfólio oficial; você pode trocá-la ou enviar a sua foto a qualquer momento.
                    </p>
                  </div>

                  {imageUrl && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[10px] font-bold border border-emerald-200 shrink-0">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      Foto Ativa na Vitrine
                    </span>
                  )}
                </div>

                {/* Preview ou Dropzone */}
                {imageUrl ? (
                  <div className="relative rounded-2xl border border-[#E7DCCE] overflow-hidden bg-stone-100 group shadow-2xs">
                    <div className="relative h-44 sm:h-56 w-full">
                      <img
                        src={imageUrl}
                        alt="Preview do Serviço"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 pointer-events-none" />
                    </div>

                    <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between gap-2">
                      <div className="text-white text-xs font-semibold drop-shadow-sm flex items-center gap-1.5 truncate">
                        <Sparkles className="w-3.5 h-3.5 text-[#DBAE3B] shrink-0" />
                        <span className="truncate">Vitrine oficial</span>
                      </div>

                      <div className="flex items-center space-x-1.5 shrink-0">
                        <label
                          htmlFor="service-image-upload-input"
                          className="px-2.5 py-1.5 sm:px-3 sm:py-1.5 rounded-xl bg-white/95 hover:bg-white text-[#2D1914] text-xs font-bold cursor-pointer transition-all shadow-sm flex items-center gap-1 active:scale-95 touch-manipulation"
                        >
                          <UploadCloud className="w-3.5 h-3.5 text-[#AD841D]" />
                          <span>Enviar Foto</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => setImageUrl(SALON_PRESET_IMAGES[0].url)}
                          className="px-2 py-1.5 rounded-xl bg-black/50 hover:bg-black/70 text-white text-xs font-semibold transition-all shadow-sm"
                          title="Restaurar foto padrão"
                        >
                          Padrão
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <label
                    htmlFor="service-image-upload-input"
                    className="cursor-pointer border-2 border-dashed border-[#AD841D]/40 hover:border-[#AD841D] rounded-2xl p-5 sm:p-7 flex flex-col items-center justify-center text-center bg-[#FAF7F2]/60 hover:bg-[#FAF7F2] transition-all group touch-manipulation active:scale-[0.99]"
                  >
                    <div className="w-11 h-11 rounded-2xl chocolate-gradient flex items-center justify-center text-[#DBAE3B] mb-2 shadow-xs group-hover:scale-105 transition-transform">
                      {isUploadingImage ? (
                        <Clock className="w-5 h-5 animate-spin" />
                      ) : (
                        <UploadCloud className="w-5 h-5" />
                      )}
                    </div>
                    <span className="text-xs sm:text-sm font-bold text-[#2D1914] mb-0.5">
                      {isUploadingImage ? "Otimizando imagem..." : "Toque para enviar uma foto do celular"}
                    </span>
                    <span className="text-[11px] text-stone-500 max-w-sm mb-2">
                      JPG, PNG ou WEBP do seu aparelho.
                    </span>
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-white border border-[#E7DCCE] text-xs font-bold text-[#AD841D] shadow-2xs group-hover:border-[#AD841D]">
                      <Plus className="w-3.5 h-3.5" />
                      Selecionar do Aparelho
                    </span>
                  </label>
                )}

                {/* Input seguro com sr-only acessível a navegadores móveis */}
                <input
                  id="service-image-upload-input"
                  type="file"
                  accept="image/*"
                  onChange={handleImageFileChange}
                  className="sr-only"
                />

                {/* Seleção Rápida da Galeria Oficial do Salão */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="font-bold uppercase tracking-wider text-[#5E372C]">
                      Ou toque para escolher uma foto do catálogo:
                    </span>
                    <span className="text-stone-400">
                      1 toque aplica
                    </span>
                  </div>

                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                    {SALON_PRESET_IMAGES.map((preset, pIdx) => {
                      const isSelected = imageUrl === preset.url;
                      return (
                        <button
                          key={preset.url}
                          type="button"
                          onClick={() => {
                            setImageUrl(preset.url);
                            if (errorMsg) setErrorMsg(null);
                          }}
                          className={`group relative rounded-xl overflow-hidden border-2 transition-all aspect-square touch-manipulation ${
                            isSelected
                              ? "border-[#AD841D] ring-2 ring-[#AD841D]/40 scale-102 shadow-xs"
                              : "border-[#E7DCCE] hover:border-[#AD841D]/60 opacity-80 hover:opacity-100"
                          }`}
                          title={preset.label}
                        >
                          <img
                            src={preset.url}
                            alt={preset.label}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                          {isSelected && (
                            <div className="absolute inset-0 bg-[#AD841D]/35 flex items-center justify-center">
                              <div className="w-5 h-5 rounded-full bg-[#AD841D] text-white flex items-center justify-center shadow-xs">
                                <Check className="w-3 h-3 stroke-[3]" />
                              </div>
                            </div>
                          )}
                          <span className="absolute bottom-0 inset-x-0 bg-black/65 text-[9px] text-white font-medium py-0.5 truncate px-1 text-center">
                            Foto {pIdx + 1}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 2. CONSTRUTOR DE ETAPAS (MOTOR DE ENCAIXES & PAUSAS) */}
          <div className="pt-4 border-t border-[#E7DCCE] space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#AD841D] flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-[#AD841D]" />
                  Estrutura de Etapas (Cadeira vs Pausa Química)
                </h3>
                <p className="text-[11px] text-stone-500">
                  Defina onde a Gleicy precisa estar com as mãos na massa e onde há tempo de espera para encaixes paralelos.
                </p>
              </div>

              {/* Métricas de Tempo Acumulado */}
              <div className="flex items-center space-x-2 text-[11px] font-bold">
                <span className="px-2.5 py-1 rounded-lg bg-[#FAF7F2] border border-[#E7DCCE] text-[#2D1914]">
                  Total: {totalDuration} min
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200">
                  Cadeira: {activeDuration} min
                </span>
                {pauseDuration > 0 && (
                  <span className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-900 border border-amber-200">
                    Pausa: {pauseDuration} min
                  </span>
                )}
              </div>
            </div>

            {/* Lista das Etapas */}
            <div className="space-y-3">
              {steps.map((step, idx) => {
                const isPause = step.type === "pause";

                return (
                  <div
                    key={step.id || idx}
                    className={`p-3.5 sm:p-4 rounded-2xl border transition-all ${
                      isPause
                        ? "bg-amber-50/70 border-dashed border-amber-300"
                        : "bg-[#FDFBF7] border-[#E7DCCE]"
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                      <div className="flex items-center space-x-1.5 sm:space-x-2 flex-wrap gap-y-1">
                        <span className="w-6 h-6 rounded-lg bg-white border border-[#E7DCCE] text-xs font-bold flex items-center justify-center text-[#5E372C] shrink-0">
                          {idx + 1}
                        </span>
                        <div className="flex items-center space-x-1.5">
                          <button
                            type="button"
                            onClick={() =>
                              handleUpdateStep(idx, {
                                type: "active",
                                requiresExclusiveAttention: true,
                              })
                            }
                            className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all touch-manipulation ${
                              !isPause
                                ? "bg-[#2D1914] text-white shadow-xs"
                                : "bg-white text-stone-600 border border-stone-200 hover:bg-stone-50"
                            }`}
                          >
                            <Scissors className="w-3 h-3 text-[#DBAE3B]" />
                            <span>Cadeira (Ativa)</span>
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              handleUpdateStep(idx, {
                                type: "pause",
                                requiresExclusiveAttention: false,
                                maxPauseDurationMin: step.maxPauseDurationMin || 55,
                              })
                            }
                            className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all touch-manipulation ${
                              isPause
                                ? "bg-amber-600 text-white shadow-xs"
                                : "bg-white text-stone-600 border border-stone-200 hover:bg-stone-50"
                            }`}
                          >
                            <Hourglass className="w-3 h-3" />
                            <span>Pausa Química</span>
                          </button>
                        </div>
                      </div>

                      {/* Ações de Reordenação e Exclusão */}
                      <div className="flex items-center space-x-1 shrink-0 ml-auto sm:ml-0">
                        <button
                          type="button"
                          onClick={() => handleMoveUp(idx)}
                          disabled={idx === 0}
                          className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 disabled:opacity-20 touch-manipulation"
                          title="Mover para cima"
                        >
                          <ChevronUp className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveDown(idx)}
                          disabled={idx === steps.length - 1}
                          className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 disabled:opacity-20 touch-manipulation"
                          title="Mover para baixo"
                        >
                          <ChevronDown className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveStep(idx)}
                          className="p-1.5 rounded-lg text-stone-400 hover:text-rose-600 touch-manipulation"
                          title="Remover etapa"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {/* Nome da Etapa */}
                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-bold text-[#5E372C] mb-1">
                          Nome da Etapa *
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="Ex: Corte a seco, Aplicação de mechas, Matização..."
                          value={step.title}
                          onChange={(e) => {
                            handleUpdateStep(idx, { title: e.target.value });
                            if (errorMsg) setErrorMsg(null);
                          }}
                          className="w-full px-3 py-2 rounded-xl border border-[#E7DCCE] text-xs font-semibold bg-white outline-none focus:border-[#AD841D]"
                        />
                      </div>

                      {/* Duração em Minutos com Chips Rápidos */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-[11px] font-bold text-[#5E372C]">
                            Duração *
                          </label>
                          <span className="text-[10px] text-stone-400">em minutos</span>
                        </div>
                        <div className="relative mb-1.5">
                          <input
                            type="number"
                            min="5"
                            step="5"
                            value={step.durationMin || ""}
                            onChange={(e) =>
                              handleUpdateStep(idx, {
                                durationMin: Number(e.target.value) || 0,
                              })
                            }
                            className="w-full pl-3 pr-14 py-2 rounded-xl border border-[#E7DCCE] text-xs font-bold bg-white outline-none focus:border-[#AD841D]"
                          />
                          <span className="absolute right-3 top-2 text-[11px] text-stone-400 font-medium pointer-events-none">
                            minutos
                          </span>
                        </div>

                        {/* Chips de Duração para Toque Rápido no Celular */}
                        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-0.5">
                          {[15, 30, 45, 60, 90].map((dur) => (
                            <button
                              key={dur}
                              type="button"
                              onClick={() => handleUpdateStep(idx, { durationMin: dur })}
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-all shrink-0 touch-manipulation ${
                                step.durationMin === dur
                                  ? "bg-[#2D1914] text-white shadow-2xs"
                                  : "bg-white text-stone-600 border border-[#E7DCCE] hover:bg-stone-50"
                              }`}
                            >
                              {dur}m
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Campo de Tolerância Máxima caso seja Pausa Química */}
                    {isPause && (
                      <div className="mt-2.5 pt-2 border-t border-amber-200/80 flex flex-wrap items-center justify-between gap-2 text-[11px] text-amber-950">
                        <span className="flex items-center gap-1 font-medium">
                          <AlertCircle className="w-3 h-3 text-amber-700 shrink-0" />
                          Tolerância máxima de segurança (ação limite):
                        </span>
                        <div className="flex items-center space-x-1.5">
                          <input
                            type="number"
                            min={step.durationMin}
                            value={step.maxPauseDurationMin || step.durationMin + 10}
                            onChange={(e) =>
                              handleUpdateStep(idx, {
                                maxPauseDurationMin: Number(e.target.value) || (step.durationMin + 10),
                              })
                            }
                            className="w-16 px-2 py-1 rounded-lg border border-amber-300 text-xs font-bold bg-white text-center"
                          />
                          <span className="text-[10px] text-amber-800">minutos</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Botões de Adicionar Etapa */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => handleAddStep("active")}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-bold text-[#2D1914] bg-[#FAF7F2] hover:bg-[#F3ECE1] border border-[#E7DCCE] flex items-center justify-center space-x-1.5 transition-all shadow-2xs touch-manipulation active:scale-[0.98]"
              >
                <Plus className="w-3.5 h-3.5 text-[#AD841D]" />
                <span>+ Etapa de Cadeira (Ativa)</span>
              </button>

              <button
                type="button"
                onClick={() => handleAddStep("pause")}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-bold text-amber-950 bg-amber-50 hover:bg-amber-100 border border-amber-300 flex items-center justify-center space-x-1.5 transition-all shadow-2xs touch-manipulation active:scale-[0.98]"
              >
                <Plus className="w-3.5 h-3.5 text-amber-700" />
                <span>+ Pausa Química (Encaixe Paralelo)</span>
              </button>
            </div>
          </div>
          </div>

          {/* Rodapé com Botões de Ação e Feedback Imediato */}
          <div className="pt-3 pb-6 sm:py-4 px-4 sm:px-7 border-t border-[#E7DCCE] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0 bg-white">
            {errorMsg ? (
              <div className="text-xs text-rose-700 bg-rose-50 border border-rose-200 px-3 py-2 rounded-xl flex items-center gap-2 font-medium">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span className="truncate">{errorMsg}</span>
              </div>
            ) : (
              <div className="hidden sm:flex items-center space-x-2 text-xs text-stone-500">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Dados validados para a vitrine</span>
              </div>
            )}

            <div className="flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isSaving}
                className="w-1/3 sm:w-auto px-4 py-2.5 rounded-xl text-xs font-semibold text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition-all text-center"
              >
                Cancelar
              </button>

              <button
                type="submit"
                disabled={isSaving}
                className="flex-1 sm:flex-initial px-6 py-2.5 rounded-xl text-xs font-bold text-[#2D1914] gold-gradient shadow-md hover:opacity-95 transition-all flex items-center justify-center space-x-2 disabled:opacity-50 active:scale-95 cursor-pointer text-center"
              >
                <Sparkles className="w-3.5 h-3.5 shrink-0" />
                <span>
                  {isSaving
                    ? "Salvando no Banco..."
                    : isEditing
                    ? "Salvar Alterações"
                    : "Criar Serviço"}
                </span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
