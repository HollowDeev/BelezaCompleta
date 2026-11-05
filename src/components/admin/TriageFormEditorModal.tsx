"use client";

import { useState } from "react";
import { TriageForm, TriageQuestion, QuestionType, QuestionOption } from "@/types/triage";
import { ServiceItem } from "@/types/service";
import {
  X,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Sparkles,
  AlertTriangle,
  HelpCircle,
  Camera,
  CheckSquare,
  List,
  Type,
  Layers,
  Clock,
  ShieldAlert,
} from "lucide-react";

interface TriageFormEditorModalProps {
  form?: TriageForm | null; // se fornecido, edição; se null, criação
  services: ServiceItem[];
  onSave: (form: TriageForm) => Promise<void>;
  onClose: () => void;
}

export function TriageFormEditorModal({
  form,
  services,
  onSave,
  onClose,
}: TriageFormEditorModalProps) {
  const isEditing = Boolean(form);

  // Estados dos Dados Gerais
  const [title, setTitle] = useState(form?.title || "");
  const [description, setDescription] = useState(form?.description || "");
  const [targetServiceId, setTargetServiceId] = useState<string>(
    form?.targetServiceId || ""
  );
  const [estimatedMinutes, setEstimatedMinutes] = useState<number>(
    form?.estimatedMinutes || 3
  );

  // Estados das Perguntas
  const [questions, setQuestions] = useState<TriageQuestion[]>(
    form?.questions && form.questions.length > 0
      ? form.questions
      : [
          {
            id: `q-1-${Date.now()}`,
            order: 1,
            title: "Qual é o padrão predominante da sua curvatura?",
            subtitle: "Ajuda a calcular a retenção de hidratação e o tempo de abertura de tom.",
            educationalTip:
              "Cabelos crespos e cacheados possuem cutículas mais abertas nas curvas, demandando produtos com maior peso lipídico.",
            type: "curl_pattern",
            required: true,
            options: [
              { id: "opt-2a", label: "Ondulado (2A - 2C)" },
              { id: "opt-3a", label: "Cacheado Aberto (3A - 3B)" },
              { id: "opt-3c", label: "Cacheado Fechado (3C)" },
              { id: "opt-4a", label: "Crespo / Afropuff (4A - 4C)" },
            ],
          },
          {
            id: `q-2-${Date.now()}`,
            order: 2,
            title: "Você possui algum histórico de química nos fios nos últimos 24 meses?",
            subtitle: "Selecione todas as substâncias já utilizadas.",
            educationalTip:
              "Incompatibilidades químicas (como Henê ou Tioglicolato) causam corte químico na descoloração. A segurança dos seus fios é inegociável!",
            type: "multiple_choice",
            required: true,
            allowMultiple: true,
            options: [
              { id: "opt-none", label: "Nenhuma (Cabelo 100% Natural)" },
              { id: "opt-color", label: "Coloração ou Tonalizante sem amônia" },
              {
                id: "opt-progressiva",
                label: "Progressiva / Botox / Ácido Glioxílico",
                isRiskFactor: true,
              },
              {
                id: "opt-hene",
                label: "Henê ou Tintura com Sais Metálicos",
                isRiskFactor: true,
              },
            ],
          },
          {
            id: `q-3-${Date.now()}`,
            order: 3,
            title: "Fotos Atuais do seu Cabelo",
            subtitle: "Envie fotos tiradas na luz natural (raiz e comprimento)",
            educationalTip:
              "Permite que Gleicy Ronha faça a pré-avaliação do fundo de clareamento antes mesmo de você chegar ao salão.",
            type: "photo_upload",
            required: true,
            maxPhotos: 3,
          },
        ]
  );

  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Adicionar Pergunta
  const handleAddQuestion = (type: QuestionType = "single_choice") => {
    const newQuestion: TriageQuestion = {
      id: `q-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      order: questions.length + 1,
      title: "Nova Pergunta de Avaliação",
      educationalTip: "Explique aqui para a cliente por que esta resposta é crucial para o procedimento.",
      type,
      required: true,
      options:
        type === "single_choice" || type === "multiple_choice" || type === "curl_pattern"
          ? [
              { id: `opt-1-${Date.now()}`, label: "Opção 1" },
              { id: `opt-2-${Date.now()}`, label: "Opção 2" },
            ]
          : undefined,
    };
    setQuestions([...questions, newQuestion]);
  };

  // Remover Pergunta
  const handleRemoveQuestion = (index: number) => {
    if (questions.length <= 1) {
      setErrorMsg("O modelo de triagem deve conter no mínimo 1 pergunta.");
      return;
    }
    const updated = questions.filter((_, idx) => idx !== index);
    setQuestions(updated.map((q, idx) => ({ ...q, order: idx + 1 })));
  };

  // Atualizar campo da Pergunta
  const handleUpdateQuestion = (index: number, updates: Partial<TriageQuestion>) => {
    const updated = [...questions];
    updated[index] = { ...updated[index], ...updates };
    setQuestions(updated);
  };

  // Mover Pergunta para Cima
  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const updated = [...questions];
    const temp = updated[index - 1];
    updated[index - 1] = updated[index];
    updated[index] = temp;
    setQuestions(updated.map((q, idx) => ({ ...q, order: idx + 1 })));
  };

  // Mover Pergunta para Baixo
  const handleMoveDown = (index: number) => {
    if (index === questions.length - 1) return;
    const updated = [...questions];
    const temp = updated[index + 1];
    updated[index + 1] = updated[index];
    updated[index] = temp;
    setQuestions(updated.map((q, idx) => ({ ...q, order: idx + 1 })));
  };

  // Opções: Adicionar Opção
  const handleAddOption = (qIndex: number) => {
    const q = questions[qIndex];
    const currentOptions = q.options || [];
    const newOpt: QuestionOption = {
      id: `opt-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      label: `Nova Opção ${currentOptions.length + 1}`,
      isRiskFactor: false,
    };
    handleUpdateQuestion(qIndex, { options: [...currentOptions, newOpt] });
  };

  // Opções: Atualizar Opção
  const handleUpdateOption = (
    qIndex: number,
    optIndex: number,
    updates: Partial<QuestionOption>
  ) => {
    const q = questions[qIndex];
    if (!q.options) return;
    const updatedOpts = [...q.options];
    updatedOpts[optIndex] = { ...updatedOpts[optIndex], ...updates };
    handleUpdateQuestion(qIndex, { options: updatedOpts });
  };

  // Opções: Remover Opção
  const handleRemoveOption = (qIndex: number, optIndex: number) => {
    const q = questions[qIndex];
    if (!q.options || q.options.length <= 1) return;
    const updatedOpts = q.options.filter((_, idx) => idx !== optIndex);
    handleUpdateQuestion(qIndex, { options: updatedOpts });
  };

  // Salvar Formulário
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMsg("Informe o título do modelo de triagem.");
      return;
    }
    if (questions.length === 0) {
      setErrorMsg("Adicione pelo menos 1 pergunta.");
      return;
    }

    setIsSaving(true);
    setErrorMsg(null);

    try {
      const formToSave: TriageForm = {
        id: form?.id || `form-triage-${Date.now()}`,
        orgId: form?.orgId || "11111111-1111-4111-8111-111111111111",
        title: title.trim(),
        description: description.trim(),
        targetServiceId: targetServiceId || undefined,
        estimatedMinutes: Number(estimatedMinutes) || 3,
        isTemplate: true,
        createdAt: form?.createdAt || new Date().toISOString(),
        questions: questions.map((q, idx) => ({
          ...q,
          order: idx + 1,
          allowMultiple: q.type === "multiple_choice",
        })),
      };

      await onSave(formToSave);
      onClose();
    } catch (err: any) {
      console.error("Erro ao salvar modelo de triagem", err);
      setErrorMsg(
        err?.message || "Ocorreu um erro ao salvar o modelo de triagem no banco de dados. Tente novamente."
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-hidden">
      <div className="bg-white rounded-t-[28px] sm:rounded-3xl rounded-b-none sm:rounded-b-3xl max-w-4xl w-full shadow-2xl border-t border-x sm:border border-[#E7DCCE] animate-slide-up-sheet text-[#2D1914] max-h-[92vh] sm:max-h-[90vh] flex flex-col overflow-hidden">
        {/* Puxador Visual Mobile (Bottom Sheet Handle) */}
        <div className="w-12 h-1.5 bg-[#D8D0BD] rounded-full mx-auto my-2.5 sm:hidden shrink-0" />

        {/* Topo do Modal */}
        <div className="flex items-center justify-between px-5 sm:px-7 py-3.5 sm:py-4 border-b border-[#E7DCCE] shrink-0 bg-white">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl chocolate-gradient flex items-center justify-center text-[#DBAE3B] shadow-sm shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold tracking-widest text-[#AD841D]">
                Anamnese &amp; Diagnóstico Capilar
              </span>
              <h2 className="text-base sm:text-xl font-bold">
                {isEditing ? "Editar Modelo de Triagem" : "Criar Novo Modelo de Triagem"}
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
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="flex-1 overflow-y-auto px-5 sm:px-7 py-4 space-y-6 no-scrollbar sm:scrollbar-thin">
          {/* 1. DADOS GERAIS DO MODELO */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#AD841D] flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-[#AD841D]" />
              Identificação do Questionário
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Título do Questionário */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-[#2D1914] mb-1">
                  Título do Questionário *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Anamnese Capilar - Transformação Mechas & Iluminados..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E7DCCE] text-sm font-semibold outline-none focus:border-[#AD841D] bg-[#FAF7F2]/50"
                />
              </div>

              {/* Tempo Estimado */}
              <div>
                <label className="block text-xs font-bold text-[#2D1914] mb-1">
                  Tempo Estimado (min)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    max="30"
                    value={estimatedMinutes}
                    onChange={(e) => setEstimatedMinutes(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E7DCCE] text-sm font-semibold outline-none focus:border-[#AD841D] bg-[#FAF7F2]/50"
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-stone-400 font-semibold">
                    minutos
                  </span>
                </div>
              </div>

              {/* Serviço Vinculado (Opcional) */}
              <div className="sm:col-span-3">
                <label className="block text-xs font-bold text-[#2D1914] mb-1">
                  Vincular a um Serviço Específico (Opcional)
                </label>
                <select
                  value={targetServiceId}
                  onChange={(e) => setTargetServiceId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E7DCCE] text-xs font-semibold outline-none focus:border-[#AD841D] bg-white"
                >
                  <option value="">Modelo Geral (Disponível para qualquer serviço)</option>
                  {services.map((srv) => (
                    <option key={srv.id} value={srv.id}>
                      {srv.title} ({srv.category})
                    </option>
                  ))}
                </select>
              </div>

              {/* Descrição */}
              <div className="sm:col-span-3">
                <label className="block text-xs font-bold text-[#2D1914] mb-1">
                  Descrição / Instrução para a Cliente
                </label>
                <textarea
                  rows={2}
                  placeholder="Ex: Para garantir a segurança dos seus fios e criar uma proposta personalizada, responda com sinceridade às perguntas a seguir..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-[#E7DCCE] text-xs font-medium outline-none focus:border-[#AD841D] bg-[#FAF7F2]/50"
                />
              </div>
            </div>
          </div>

          {/* 2. CONSTRUTOR DE PERGUNTAS */}
          <div className="pt-4 border-t border-[#E7DCCE] space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#AD841D] flex items-center gap-1.5">
                  <CheckSquare className="w-3.5 h-3.5 text-[#AD841D]" />
                  Perguntas do Questionário ({questions.length})
                </h3>
                <p className="text-[11px] text-stone-500">
                  Adicione perguntas, dicas educativas e marque respostas com risco de incompatibilidade química.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleAddQuestion("single_choice")}
                  className="px-2.5 py-1.5 rounded-xl text-[11px] font-bold bg-[#FAF7F2] hover:bg-[#F3ECE1] border border-[#E7DCCE] text-[#2D1914] flex items-center gap-1"
                >
                  <List className="w-3 h-3 text-[#AD841D]" />
                  <span>+ Escolha Única</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleAddQuestion("multiple_choice")}
                  className="px-2.5 py-1.5 rounded-xl text-[11px] font-bold bg-[#FAF7F2] hover:bg-[#F3ECE1] border border-[#E7DCCE] text-[#2D1914] flex items-center gap-1"
                >
                  <CheckSquare className="w-3 h-3 text-[#AD841D]" />
                  <span>+ Múltipla Escolha</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleAddQuestion("photo_upload")}
                  className="px-2.5 py-1.5 rounded-xl text-[11px] font-bold bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-950 flex items-center gap-1"
                >
                  <Camera className="w-3 h-3 text-amber-700" />
                  <span>+ Upload de Fotos</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleAddQuestion("text")}
                  className="px-2.5 py-1.5 rounded-xl text-[11px] font-bold bg-[#FAF7F2] hover:bg-[#F3ECE1] border border-[#E7DCCE] text-[#2D1914] flex items-center gap-1"
                >
                  <Type className="w-3 h-3 text-[#AD841D]" />
                  <span>+ Texto Livre</span>
                </button>
              </div>
            </div>

            {/* Lista Interativa de Perguntas */}
            <div className="space-y-4">
              {questions.map((q, qIdx) => {
                const hasOptions =
                  q.type === "single_choice" ||
                  q.type === "multiple_choice" ||
                  q.type === "curl_pattern";

                return (
                  <div
                    key={q.id || qIdx}
                    className="p-4 sm:p-5 rounded-2xl border border-[#E7DCCE] bg-[#FDFBF7] space-y-3 relative shadow-2xs"
                  >
                    {/* Header da Pergunta */}
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center space-x-2">
                        <span className="w-6 h-6 rounded-lg bg-[#2D1914] text-white text-xs font-bold flex items-center justify-center shrink-0">
                          {qIdx + 1}
                        </span>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#AD841D] bg-[#DBAE3B]/10 px-2 py-0.5 rounded-md border border-[#DBAE3B]/20">
                          {q.type === "single_choice"
                            ? "Seleção Única"
                            : q.type === "multiple_choice"
                            ? "Múltipla Escolha"
                            : q.type === "photo_upload"
                            ? "Upload de Fotos"
                            : q.type === "curl_pattern"
                            ? "Padrão de Curvatura"
                            : "Texto Descritivo"}
                        </span>
                      </div>

                      <div className="flex items-center space-x-1">
                        <button
                          type="button"
                          onClick={() => handleMoveUp(qIdx)}
                          disabled={qIdx === 0}
                          className="p-1 text-stone-400 hover:text-stone-700 disabled:opacity-20"
                          title="Mover pergunta para cima"
                        >
                          <ChevronUp className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveDown(qIdx)}
                          disabled={qIdx === questions.length - 1}
                          className="p-1 text-stone-400 hover:text-stone-700 disabled:opacity-20"
                          title="Mover pergunta para baixo"
                        >
                          <ChevronDown className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveQuestion(qIdx)}
                          className="p-1 text-stone-400 hover:text-rose-600"
                          title="Remover pergunta"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Título da Pergunta & Tipo */}
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                      <div className="sm:col-span-3">
                        <label className="block text-[11px] font-bold text-[#2D1914] mb-1">
                          Pergunta para a Cliente *
                        </label>
                        <input
                          type="text"
                          required
                          value={q.title}
                          onChange={(e) =>
                            handleUpdateQuestion(qIdx, { title: e.target.value })
                          }
                          className="w-full px-3 py-1.5 rounded-xl border border-[#E7DCCE] text-xs font-semibold bg-white outline-none focus:border-[#AD841D]"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-[#2D1914] mb-1">
                          Tipo de Resposta
                        </label>
                        <select
                          value={q.type}
                          onChange={(e) => {
                            const newType = e.target.value as QuestionType;
                            handleUpdateQuestion(qIdx, {
                              type: newType,
                              options:
                                newType === "single_choice" ||
                                newType === "multiple_choice" ||
                                newType === "curl_pattern"
                                  ? q.options || [
                                      { id: `opt-1-${Date.now()}`, label: "Opção 1" },
                                      { id: `opt-2-${Date.now()}`, label: "Opção 2" },
                                    ]
                                  : undefined,
                            });
                          }}
                          className="w-full px-2.5 py-1.5 rounded-xl border border-[#E7DCCE] text-xs font-semibold bg-white outline-none focus:border-[#AD841D]"
                        >
                          <option value="single_choice">Seleção Única</option>
                          <option value="multiple_choice">Múltipla Escolha</option>
                          <option value="photo_upload">Envio de Fotos</option>
                          <option value="text">Texto Livre</option>
                          <option value="curl_pattern">Padrão de Cachos</option>
                        </select>
                      </div>
                    </div>

                    {/* Dica Educativa ("Por que saber isso?") */}
                    <div>
                      <label className="block text-[11px] font-bold text-[#AD841D] mb-1 flex items-center gap-1">
                        <HelpCircle className="w-3 h-3 text-[#AD841D]" />
                        Dica Educativa (Explica à cliente o valor técnico da pergunta)
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: Cabelos com progressiva recente têm a cutícula selada e requerem acidificação prévia..."
                        value={q.educationalTip || ""}
                        onChange={(e) =>
                          handleUpdateQuestion(qIdx, {
                            educationalTip: e.target.value,
                          })
                        }
                        className="w-full px-3 py-1.5 rounded-xl border border-[#E7DCCE] text-xs font-medium bg-amber-50/50 outline-none focus:border-[#AD841D]"
                      />
                    </div>

                    {/* Construtor de Opções (se for escolha) */}
                    {hasOptions && (
                      <div className="pt-2 border-t border-[#E7DCCE]/60 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] uppercase font-bold tracking-wider text-[#5E372C]">
                            Opções de Resposta:
                          </span>
                          <button
                            type="button"
                            onClick={() => handleAddOption(qIdx)}
                            className="text-[11px] font-bold text-[#AD841D] hover:underline flex items-center gap-1"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Adicionar Opção</span>
                          </button>
                        </div>

                        <div className="space-y-1.5">
                          {(q.options || []).map((opt, optIdx) => (
                            <div
                              key={opt.id || optIdx}
                              className={`p-2 rounded-xl border flex items-center justify-between gap-2 text-xs ${
                                opt.isRiskFactor
                                  ? "bg-rose-50 border-rose-300 text-rose-900"
                                  : "bg-white border-[#E7DCCE] text-[#2D1914]"
                              }`}
                            >
                              <div className="flex-1 flex items-center space-x-2">
                                <input
                                  type="text"
                                  value={opt.label}
                                  onChange={(e) =>
                                    handleUpdateOption(qIdx, optIdx, {
                                      label: e.target.value,
                                    })
                                  }
                                  className="w-full px-2.5 py-1 rounded-lg border border-transparent hover:border-[#E7DCCE] focus:border-[#AD841D] bg-transparent font-medium outline-none"
                                />
                              </div>

                              {/* Toggle de Risco Químico */}
                              <label
                                className="flex items-center space-x-1.5 text-[10px] font-bold cursor-pointer select-none px-2 py-1 rounded-lg hover:bg-black/5"
                                title="Marcar como alerta vermelho de incompatibilidade química (ex: henê, relaxamento)"
                              >
                                <input
                                  type="checkbox"
                                  checked={Boolean(opt.isRiskFactor)}
                                  onChange={(e) =>
                                    handleUpdateOption(qIdx, optIdx, {
                                      isRiskFactor: e.target.checked,
                                    })
                                  }
                                  className="accent-rose-600 rounded"
                                />
                                <span className={opt.isRiskFactor ? "text-rose-700 font-extrabold flex items-center gap-0.5" : "text-stone-500"}>
                                  {opt.isRiskFactor && <ShieldAlert className="w-3 h-3 text-rose-600" />}
                                  Risco Químico
                                </span>
                              </label>

                              <button
                                type="button"
                                onClick={() => handleRemoveOption(qIdx, optIdx)}
                                disabled={(q.options?.length || 0) <= 1}
                                className="p-1 text-stone-400 hover:text-rose-600 disabled:opacity-20"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
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
                  ? "Salvar Modelo"
                  : "Criar Modelo de Triagem"}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
