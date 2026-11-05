"use client";

import { useState } from "react";
import { TriageForm } from "@/types/triage";
import { ServiceItem } from "@/types/service";
import { SupabaseDataService } from "@/lib/supabase/api";
import { TriageFormEditorModal } from "@/components/admin/TriageFormEditorModal";
import {
  Sparkles,
  Plus,
  Pencil,
  Copy,
  Trash2,
  AlertTriangle,
  ClipboardList,
  Clock,
  Layers,
  HelpCircle,
  ShieldAlert,
  Camera,
  Scissors,
} from "lucide-react";

interface TriageFormsManagerViewProps {
  forms: TriageForm[];
  services: ServiceItem[];
  onRefresh: () => void;
}

export function TriageFormsManagerView({
  forms,
  services,
  onRefresh,
}: TriageFormsManagerViewProps) {
  // Controle do Modal de Edição / Criação
  const [editingForm, setEditingForm] = useState<TriageForm | null | undefined>(
    undefined
  );

  // Confirmação de exclusão
  const [deletingFormId, setDeletingFormId] = useState<string | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  // Salvar formulário
  const handleSaveForm = async (formToSave: TriageForm) => {
    try {
      await SupabaseDataService.saveTriageForm(formToSave);
      setFeedbackMsg(`Modelo "${formToSave.title}" salvo com sucesso no banco!`);
      onRefresh();
      setTimeout(() => setFeedbackMsg(null), 4000);
    } catch (err: any) {
      console.error("Erro ao salvar formulário:", err);
      throw err;
    }
  };

  // Duplicar formulário existente
  const handleDuplicateForm = async (sourceForm: TriageForm) => {
    try {
      const duplicated: TriageForm = {
        ...sourceForm,
        id: `form-triage-copy-${Date.now()}`,
        title: `${sourceForm.title} (Cópia)`,
        createdAt: new Date().toISOString(),
        questions: sourceForm.questions.map((q) => ({
          ...q,
          id: `q-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        })),
      };

      await SupabaseDataService.saveTriageForm(duplicated);
      setFeedbackMsg(`Modelo "${duplicated.title}" duplicado com sucesso!`);
      onRefresh();
      setTimeout(() => setFeedbackMsg(null), 4000);
    } catch (err: any) {
      console.error("Erro ao duplicar formulário:", err);
      setFeedbackMsg(err?.message || "Erro ao duplicar modelo no banco.");
      setTimeout(() => setFeedbackMsg(null), 5000);
    }
  };

  // Excluir formulário
  const handleDeleteForm = async (formId: string) => {
    try {
      await SupabaseDataService.deleteTriageForm(formId);
      setDeletingFormId(null);
      setFeedbackMsg("Modelo de triagem removido com sucesso!");
      onRefresh();
      setTimeout(() => setFeedbackMsg(null), 4000);
    } catch (err: any) {
      console.error("Erro ao excluir formulário:", err);
      setFeedbackMsg(err?.message || "Erro ao remover modelo do banco de dados.");
      setTimeout(() => setFeedbackMsg(null), 5000);
    }
  };

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E7DCCE] shadow-xs space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-[#E7DCCE]/60">
        <div>
          <span className="text-[10px] uppercase tracking-widest text-[#AD841D] font-bold block">
            Cadastros & Configurações
          </span>
          <h2 className="font-editorial text-xl sm:text-2xl font-bold text-[#2D1914]">
            Modelos de Triagem & Anamnese Capilar
          </h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Crie e edite questionários de diagnóstico online para identificar curvaturas, químicas incompatíveis e receber fotos das clientes.
          </p>
        </div>

        <div className="flex items-center space-x-3 shrink-0">
          {feedbackMsg && (
            <div className="text-xs bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-1.5 rounded-xl font-medium animate-fade-in">
              {feedbackMsg}
            </div>
          )}

          <button
            onClick={() => setEditingForm(null)}
            className="px-4 py-2.5 text-xs font-bold text-[#2D1914] gold-gradient rounded-xl shadow-xs hover:opacity-95 transition-all flex items-center space-x-1.5 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Modelo de Triagem</span>
          </button>
        </div>
      </div>

      {/* Lista de Modelos de Triagem */}
      <div className="space-y-4">
        {forms.length === 0 ? (
          <div className="p-8 text-center rounded-2xl border border-dashed border-[#E7DCCE] bg-[#FAF7F2]">
            <ClipboardList className="w-8 h-8 text-stone-400 mx-auto mb-2" />
            <h3 className="font-bold text-sm text-[#2D1914]">Nenhum modelo de triagem cadastrado</h3>
            <p className="text-xs text-stone-500 mt-1 mb-4">
              Crie o primeiro questionário para coletar diagnósticos capilares antes dos agendamentos.
            </p>
            <button
              onClick={() => setEditingForm(null)}
              className="px-4 py-2 text-xs font-bold text-[#2D1914] gold-gradient rounded-xl"
            >
              + Criar Primeiro Modelo
            </button>
          </div>
        ) : (
          forms.map((form) => {
            const linkedService = services.find((s) => s.id === form.targetServiceId);
            const photoQuestionsCount = form.questions.filter(
              (q) => q.type === "photo_upload"
            ).length;
            const riskQuestionsCount = form.questions.filter((q) =>
              q.options?.some((opt) => opt.isRiskFactor)
            ).length;

            return (
              <div
                key={form.id}
                className="p-5 sm:p-6 rounded-2xl border border-[#E7DCCE] bg-[#FDFBF7] space-y-4 hover:border-[#AD841D]/40 transition-all shadow-2xs"
              >
                {/* Topo do Card */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-editorial text-lg sm:text-xl font-bold text-[#2D1914]">
                        {form.title}
                      </h3>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#AD841D] bg-[#DBAE3B]/10 px-2.5 py-0.5 rounded-full border border-[#DBAE3B]/20">
                        {form.questions.length} perguntas
                      </span>
                      <span className="text-[10px] font-semibold text-stone-500 bg-stone-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Clock className="w-3 h-3 text-stone-400" />
                        ~{form.estimatedMinutes || 3} min
                      </span>
                    </div>

                    {form.description && (
                      <p className="text-xs text-stone-600 mt-1 max-w-2xl">
                        {form.description}
                      </p>
                    )}
                  </div>

                  {/* Ações */}
                  <div className="flex items-center space-x-2 shrink-0">
                    <button
                      onClick={() => handleDuplicateForm(form)}
                      className="px-3 py-1.5 text-xs font-semibold text-[#5E372C] bg-white border border-[#E7DCCE] hover:bg-[#FAF7F2] rounded-xl flex items-center space-x-1 shadow-2xs transition-all"
                      title="Duplicar este modelo"
                    >
                      <Copy className="w-3.5 h-3.5 text-[#C59B27]" />
                      <span className="hidden md:inline">Duplicar</span>
                    </button>

                    <button
                      onClick={() => setEditingForm(form)}
                      className="px-3.5 py-1.5 text-xs font-bold text-[#2D1914] bg-white hover:bg-stone-50 border border-[#E7DCCE] rounded-xl flex items-center space-x-1.5 shadow-2xs transition-all"
                      title="Editar perguntas deste modelo"
                    >
                      <Pencil className="w-3.5 h-3.5 text-[#AD841D]" />
                      <span>Editar</span>
                    </button>

                    <button
                      onClick={() => setDeletingFormId(form.id)}
                      className="p-1.5 text-xs font-semibold text-stone-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 rounded-xl transition-all"
                      title="Excluir este modelo"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Badges de Destaques e Vínculo */}
                <div className="pt-3 border-t border-[#E7DCCE]/60 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center space-x-1.5 text-stone-600">
                      <Scissors className="w-3.5 h-3.5 text-[#C59B27]" />
                      <span>
                        Vínculo:{" "}
                        <strong className="text-[#2D1914]">
                          {linkedService ? linkedService.title : "Modelo Geral (Todos)"}
                        </strong>
                      </span>
                    </div>

                    {photoQuestionsCount > 0 && (
                      <span className="flex items-center gap-1 text-[11px] font-semibold text-amber-900 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                        <Camera className="w-3 h-3 text-amber-700" />
                        Coleta Fotos Naturais
                      </span>
                    )}

                    {riskQuestionsCount > 0 && (
                      <span className="flex items-center gap-1 text-[11px] font-semibold text-rose-800 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-md">
                        <ShieldAlert className="w-3 h-3 text-rose-600" />
                        Monitora Incompatibilidade Química
                      </span>
                    )}
                  </div>

                  <span className="text-[11px] text-stone-400">
                    Criado em {new Date(form.createdAt).toLocaleDateString("pt-BR")}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal de Criação / Edição de Modelo de Triagem */}
      {editingForm !== undefined && (
        <TriageFormEditorModal
          form={editingForm}
          services={services}
          onSave={handleSaveForm}
          onClose={() => setEditingForm(undefined)}
        />
      )}

      {/* Modal de Confirmação de Exclusão */}
      {deletingFormId && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-hidden">
          <div className="bg-white rounded-t-[28px] sm:rounded-3xl rounded-b-none sm:rounded-b-3xl max-w-sm w-full p-5 pb-8 sm:p-6 shadow-2xl border-t border-x sm:border border-rose-200 animate-slide-up-sheet text-center">
            {/* Puxador Visual Mobile */}
            <div className="w-12 h-1.5 bg-[#D8D0BD] rounded-full mx-auto -mt-1 mb-3 sm:hidden shrink-0" />

            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-base text-[#2D1914] mb-1">
              Excluir este Modelo?
            </h3>
            <p className="text-xs text-stone-600 mb-5 leading-relaxed">
              Tem certeza que deseja excluir este modelo de triagem? Respostas de clientes já enviadas anteriormente continuarão preservadas.
            </p>
            <div className="flex items-center justify-center space-x-2">
              <button
                type="button"
                onClick={() => setDeletingFormId(null)}
                className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => handleDeleteForm(deletingFormId)}
                className="px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs active:scale-95"
              >
                Sim, Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
