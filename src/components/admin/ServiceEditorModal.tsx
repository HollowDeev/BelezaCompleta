"use client";

import { useState } from "react";
import { ServiceItem, ServiceStep } from "@/types/service";
import { TriageForm } from "@/types/triage";
import { UserProfile } from "@/types/salon";
import { formatBRL } from "@/lib/utils";
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
  const [price, setPrice] = useState<number>(service?.price || 250);
  const [promotionalPrice, setPromotionalPrice] = useState<string>(
    service?.promotionalPrice ? String(service.promotionalPrice) : ""
  );
  const [imageUrl, setImageUrl] = useState<string>(service?.imageUrl || "");
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [requiresTriage, setRequiresTriage] = useState<boolean>(
    service?.requiresTriage ?? true
  );
  const [triageFormId, setTriageFormId] = useState<string>(
    service?.triageFormId || (triageForms[0]?.id ?? "")
  );

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setErrorMsg("Selecione um arquivo de imagem válido (JPG, PNG ou WEBP).");
      return;
    }

    setIsUploadingImage(true);
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
          const compressedDataUrl = canvas.toDataURL("image/jpeg", 0.85);
          setImageUrl(compressedDataUrl);
          setErrorMsg(null);
        }
        setIsUploadingImage(false);
      };
      img.onerror = () => {
        setErrorMsg("Erro ao processar imagem.");
        setIsUploadingImage(false);
      };
      img.src = event.target?.result as string;
    };
    reader.onerror = () => {
      setErrorMsg("Erro ao ler o arquivo de imagem.");
      setIsUploadingImage(false);
    };
    reader.readAsDataURL(file);
  };

  // Estados das Etapas do Procedimento
  const [steps, setSteps] = useState<ServiceStep[]>(
    service?.steps && service.steps.length > 0
      ? service.steps
      : [
          {
            id: `st-1-${Date.now()}`,
            order: 1,
            title: "Diagnóstico & Aplicação",
            type: "active",
            durationMin: 45,
            requiresExclusiveAttention: true,
          },
          {
            id: `st-2-${Date.now()}`,
            order: 2,
            title: "Pausa Química de Ação",
            type: "pause",
            durationMin: 45,
            maxPauseDurationMin: 55,
            requiresExclusiveAttention: false,
          },
          {
            id: `st-3-${Date.now()}`,
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
      setErrorMsg("Informe o nome do serviço.");
      return;
    }
    if (!imageUrl || !imageUrl.trim()) {
      setErrorMsg("A foto/imagem ilustrativa do serviço é obrigatória para exibição no catálogo do site.");
      return;
    }
    if (price <= 0) {
      setErrorMsg("O valor do serviço deve ser maior que zero.");
      return;
    }
    if (steps.length === 0) {
      setErrorMsg("Adicione pelo menos uma etapa ao procedimento.");
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
        price: Number(price),
        promotionalPrice: promotionalPrice ? Number(promotionalPrice) : undefined,
        imageUrl: imageUrl.trim(),
        requiresTriage,
        triageFormId: requiresTriage ? triageFormId : undefined,
        isActive: service?.isActive ?? true,
        steps: steps.map((s, idx) => ({
          ...s,
          order: idx + 1,
          durationMin: Number(s.durationMin) || 15,
          maxPauseDurationMin:
            s.type === "pause"
              ? Number(s.maxPauseDurationMin) || Number(s.durationMin) + 10
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
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-hidden">
      <div className="bg-white rounded-t-[28px] sm:rounded-3xl rounded-b-none sm:rounded-b-3xl max-w-3xl w-full shadow-2xl border-t border-x sm:border border-[#E7DCCE] animate-slide-up-sheet text-[#2D1914] max-h-[92vh] sm:max-h-[90vh] flex flex-col overflow-hidden">
        {/* Puxador Visual Mobile (Bottom Sheet Handle) */}
        <div className="w-12 h-1.5 bg-[#D8D0BD] rounded-full mx-auto my-2.5 sm:hidden shrink-0" />

        {/* Topo do Modal */}
        <div className="flex items-center justify-between px-5 sm:px-7 py-3.5 sm:py-4 border-b border-[#E7DCCE] shrink-0 bg-white">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl chocolate-gradient flex items-center justify-center text-[#DBAE3B] shadow-sm shrink-0">
              <Scissors className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold tracking-widest text-[#AD841D]">
                Engenharia de Procedimentos
              </span>
              <h2 className="text-base sm:text-xl font-bold">
                {isEditing ? "Editar Serviço & Etapas" : "Cadastrar Novo Serviço"}
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-[#FAF7F2] hover:bg-[#F3ECE1] text-[#5E372C] flex items-center justify-center transition-all border border-[#E7DCCE]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Formulário com Scroll Interno */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {/* Mensagem de Erro */}
          {errorMsg && (
            <div className="mx-5 sm:mx-7 mt-3 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2 shrink-0">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="flex-1 overflow-y-auto px-5 sm:px-7 py-4 space-y-6 no-scrollbar sm:scrollbar-thin">
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
                  onChange={(e) => setTitle(e.target.value)}
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

              {/* Preço Base */}
              <div>
                <label className="block text-xs font-bold text-[#2D1914] mb-1">
                  Preço Base (R$) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs text-stone-400 font-bold">
                    R$
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    required
                    value={price}
                    onChange={(e) => setPrice(Number(e.target.value))}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-[#E7DCCE] text-sm font-semibold outline-none focus:border-[#AD841D] bg-[#FAF7F2]/50"
                  />
                </div>
              </div>

              {/* Preço Promocional (Opcional) */}
              <div>
                <label className="block text-xs font-bold text-[#2D1914] mb-1">
                  Preço Promocional (Opcional)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs text-stone-400 font-bold">
                    R$
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Deixe em branco se não houver"
                    value={promotionalPrice}
                    onChange={(e) => setPromotionalPrice(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-[#E7DCCE] text-sm font-semibold outline-none focus:border-[#AD841D] bg-[#FAF7F2]/50"
                  />
                </div>
              </div>

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

              {/* Foto Ilustrativa do Serviço (OBRIGATÓRIO) */}
              <div className="sm:col-span-2 pt-2 border-t border-[#E7DCCE]/60 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <div>
                    <label className="block text-xs font-bold text-[#2D1914] flex items-center gap-1.5">
                      <ImageIcon className="w-3.5 h-3.5 text-[#AD841D]" />
                      <span>Imagem de Destaque do Serviço (Vitrine)</span>
                      <span className="text-rose-600 font-extrabold text-xs">* Obrigatória</span>
                    </label>
                    <p className="text-[11px] text-stone-500">
                      Esta foto é exibida com destaque para as clientes no catálogo do site. Faça upload de uma foto ou escolha uma do salão.
                    </p>
                  </div>

                  {imageUrl && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[10px] font-bold border border-emerald-200">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      Imagem Definida
                    </span>
                  )}
                </div>

                {/* Preview ou Dropzone */}
                {imageUrl ? (
                  <div className="relative rounded-2xl border border-[#E7DCCE] overflow-hidden bg-stone-100 group shadow-2xs">
                    <div className="relative h-48 sm:h-56 w-full">
                      <img
                        src={imageUrl}
                        alt="Preview do Serviço"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />
                    </div>

                    <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                      <div className="text-white text-xs font-semibold drop-shadow-sm flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-[#DBAE3B]" />
                        <span>Destaque na vitrine do cliente</span>
                      </div>

                      <div className="flex items-center space-x-2">
                        <label
                          htmlFor="service-image-upload-input"
                          className="px-3 py-1.5 rounded-xl bg-white/95 hover:bg-white text-[#2D1914] text-xs font-bold cursor-pointer transition-all shadow-sm flex items-center gap-1"
                        >
                          <UploadCloud className="w-3.5 h-3.5 text-[#AD841D]" />
                          <span>Trocar Foto</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => setImageUrl("")}
                          className="px-3 py-1.5 rounded-xl bg-rose-600/90 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Remover</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <label
                    htmlFor="service-image-upload-input"
                    className="cursor-pointer border-2 border-dashed border-[#AD841D]/40 hover:border-[#AD841D] rounded-2xl p-6 sm:p-7 flex flex-col items-center justify-center text-center bg-[#FAF7F2]/60 hover:bg-[#FAF7F2] transition-all group"
                  >
                    <div className="w-12 h-12 rounded-2xl chocolate-gradient flex items-center justify-center text-[#DBAE3B] mb-2 shadow-xs group-hover:scale-105 transition-transform">
                      {isUploadingImage ? (
                        <Clock className="w-6 h-6 animate-spin" />
                      ) : (
                        <UploadCloud className="w-6 h-6" />
                      )}
                    </div>
                    <span className="text-xs sm:text-sm font-bold text-[#2D1914] mb-0.5">
                      {isUploadingImage ? "Otimizando imagem..." : "Clique para enviar a foto do serviço"}
                    </span>
                    <span className="text-[11px] text-stone-500 max-w-sm mb-2">
                      Foto do seu dispositivo (JPG, PNG, WEBP). Será otimizada para carregar com máxima nitidez.
                    </span>
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-white border border-[#E7DCCE] text-xs font-bold text-[#AD841D] shadow-2xs group-hover:border-[#AD841D]">
                      <Plus className="w-3.5 h-3.5" />
                      Escolher Imagem
                    </span>
                  </label>
                )}

                <input
                  id="service-image-upload-input"
                  type="file"
                  accept="image/*"
                  onChange={handleImageFileChange}
                  className="hidden"
                />

                {/* Seleção Rápida da Galeria Oficial do Salão */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="font-bold uppercase tracking-wider text-[#5E372C]">
                      Ou selecione das fotos oficiais do portfólio:
                    </span>
                    <span className="text-stone-400">
                      Clique para aplicar
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
                            setErrorMsg(null);
                          }}
                          className={`group relative rounded-xl overflow-hidden border-2 transition-all aspect-square ${
                            isSelected
                              ? "border-[#AD841D] ring-2 ring-[#AD841D]/30 scale-102 shadow-xs"
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
                            <div className="absolute inset-0 bg-[#AD841D]/40 flex items-center justify-center">
                              <div className="w-5 h-5 rounded-full bg-[#AD841D] text-white flex items-center justify-center shadow-xs">
                                <Check className="w-3 h-3 stroke-[3]" />
                              </div>
                            </div>
                          )}
                          <span className="absolute bottom-0 inset-x-0 bg-black/60 text-[9px] text-white font-medium py-0.5 truncate px-1 text-center">
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
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <div className="flex items-center space-x-2">
                        <span className="w-6 h-6 rounded-lg bg-white border border-[#E7DCCE] text-xs font-bold flex items-center justify-center text-[#5E372C]">
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
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all ${
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
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all ${
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
                      <div className="flex items-center space-x-1">
                        <button
                          type="button"
                          onClick={() => handleMoveUp(idx)}
                          disabled={idx === 0}
                          className="p-1 rounded-lg text-stone-400 hover:text-stone-700 disabled:opacity-20"
                          title="Mover para cima"
                        >
                          <ChevronUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveDown(idx)}
                          disabled={idx === steps.length - 1}
                          className="p-1 rounded-lg text-stone-400 hover:text-stone-700 disabled:opacity-20"
                          title="Mover para baixo"
                        >
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveStep(idx)}
                          className="p-1 rounded-lg text-stone-400 hover:text-rose-600"
                          title="Remover etapa"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {/* Nome da Etapa */}
                      <div className="sm:col-span-2">
                        <input
                          type="text"
                          required
                          placeholder="Ex: Corte a seco, Aplicação de mechas, Matização..."
                          value={step.title}
                          onChange={(e) =>
                            handleUpdateStep(idx, { title: e.target.value })
                          }
                          className="w-full px-3 py-1.5 rounded-xl border border-[#E7DCCE] text-xs font-semibold bg-white outline-none focus:border-[#AD841D]"
                        />
                      </div>

                      {/* Duração em Minutos */}
                      <div>
                        <div className="relative">
                          <input
                            type="number"
                            min="5"
                            step="5"
                            required
                            value={step.durationMin}
                            onChange={(e) =>
                              handleUpdateStep(idx, {
                                durationMin: Number(e.target.value),
                              })
                            }
                            className="w-full px-3 py-1.5 rounded-xl border border-[#E7DCCE] text-xs font-bold bg-white outline-none focus:border-[#AD841D]"
                          />
                          <span className="absolute right-3 top-1.5 text-[11px] text-stone-400 font-medium">
                            minutos
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Campo de Tolerância Máxima caso seja Pausa Química */}
                    {isPause && (
                      <div className="mt-2.5 pt-2 border-t border-amber-200/80 flex items-center justify-between text-[11px] text-amber-950">
                        <span className="flex items-center gap-1 font-medium">
                          <AlertCircle className="w-3 h-3 text-amber-700" />
                          Tolerância máxima de segurança (ação limite):
                        </span>
                        <div className="flex items-center space-x-1">
                          <input
                            type="number"
                            min={step.durationMin}
                            value={step.maxPauseDurationMin || step.durationMin + 10}
                            onChange={(e) =>
                              handleUpdateStep(idx, {
                                maxPauseDurationMin: Number(e.target.value),
                              })
                            }
                            className="w-16 px-2 py-0.5 rounded-lg border border-amber-300 text-xs font-bold bg-white text-center"
                          />
                          <span className="text-[10px] text-amber-800">min</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Botões de Adicionar Etapa */}
            <div className="flex flex-wrap items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => handleAddStep("active")}
                className="px-3.5 py-2 rounded-xl text-xs font-bold text-[#2D1914] bg-[#FAF7F2] hover:bg-[#F3ECE1] border border-[#E7DCCE] flex items-center space-x-1.5 transition-all shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5 text-[#AD841D]" />
                <span>+ Etapa de Cadeira (Ativa)</span>
              </button>

              <button
                type="button"
                onClick={() => handleAddStep("pause")}
                className="px-3.5 py-2 rounded-xl text-xs font-bold text-amber-950 bg-amber-50 hover:bg-amber-100 border border-amber-300 flex items-center space-x-1.5 transition-all shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5 text-amber-700" />
                <span>+ Pausa Química (Encaixe Paralelo)</span>
              </button>
            </div>
          </div>
          </div>

          {/* Rodapé com Botões de Ação */}
          <div className="pt-3 pb-6 sm:py-4 px-5 sm:px-7 border-t border-[#E7DCCE] flex items-center justify-end space-x-3 shrink-0 bg-white">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition-all"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2.5 rounded-xl text-xs font-bold text-[#2D1914] gold-gradient shadow-md hover:opacity-95 transition-all flex items-center space-x-2 disabled:opacity-50 active:scale-95 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>
                {isSaving
                  ? "Salvando no Banco..."
                  : isEditing
                  ? "Salvar Alterações"
                  : "Criar Serviço"}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
