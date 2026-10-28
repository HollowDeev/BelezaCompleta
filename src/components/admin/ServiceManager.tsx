"use client";

import { useState } from "react";
import { ServiceItem } from "@/types/service";
import { TriageForm } from "@/types/triage";
import { UserProfile } from "@/types/salon";
import { SalonStore } from "@/lib/storage/localStore";
import { SupabaseDataService } from "@/lib/supabase/api";
import { ServiceEditorModal } from "@/components/admin/ServiceEditorModal";
import { formatBRL } from "@/lib/utils";
import {
  Copy,
  Clock,
  Sparkles,
  CheckCircle,
  Scissors,
  Hourglass,
  Layers,
  Plus,
  Pencil,
  Trash2,
  AlertTriangle,
} from "lucide-react";

interface ServiceManagerProps {
  services: ServiceItem[];
  triageForms: TriageForm[];
  profiles?: UserProfile[];
  onRefresh: () => void;
}

export function ServiceManager({
  services,
  triageForms,
  profiles,
  onRefresh,
}: ServiceManagerProps) {
  // Controle do Modal de Criação / Edição
  const [editingService, setEditingService] = useState<ServiceItem | null | undefined>(
    undefined
  );

  // Controle de Espelhamento
  const [targetServiceForMirror, setTargetServiceForMirror] = useState<ServiceItem | null>(null);
  const [selectedBaseFormId, setSelectedBaseFormId] = useState<string>(
    triageForms[0]?.id || ""
  );

  // Confirmação de exclusão
  const [deletingServiceId, setDeletingServiceId] = useState<string | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  // Espelhar Questionário
  const handleMirror = () => {
    if (!targetServiceForMirror || !selectedBaseFormId) return;

    SalonStore.mirrorTriageForm(selectedBaseFormId, targetServiceForMirror);

    setFeedbackMsg(
      `Questionário espelhado com sucesso para "${targetServiceForMirror.title}"! Agora você pode personalizar as perguntas.`
    );
    setTargetServiceForMirror(null);
    onRefresh();
    setTimeout(() => setFeedbackMsg(null), 4000);
  };

  // Salvar serviço (criação ou edição)
  const handleSaveService = async (serviceToSave: ServiceItem) => {
    try {
      await SupabaseDataService.saveService(serviceToSave);
      setFeedbackMsg(`Serviço "${serviceToSave.title}" salvo com sucesso no banco!`);
      onRefresh();
      setTimeout(() => setFeedbackMsg(null), 4000);
    } catch (err: any) {
      console.error("Erro ao salvar serviço:", err);
      throw err; // Permite ao ServiceEditorModal capturar e exibir mensagem amigável sem fechar
    }
  };

  // Excluir serviço
  const handleDeleteService = async (serviceId: string) => {
    try {
      await SupabaseDataService.deleteService(serviceId);
      setDeletingServiceId(null);
      setFeedbackMsg("Serviço excluído com sucesso!");
      onRefresh();
      setTimeout(() => setFeedbackMsg(null), 4000);
    } catch (err: any) {
      console.error("Erro ao excluir serviço:", err);
      setFeedbackMsg(err?.message || "Erro ao excluir serviço do banco de dados.");
      setTimeout(() => setFeedbackMsg(null), 5000);
    }
  };

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E7DCCE] shadow-xs">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-[#E7DCCE]/60">
        <div>
          <span className="text-[10px] uppercase tracking-widest text-[#AD841D] font-bold block">
            Engenharia de Procedimentos
          </span>
          <h2 className="font-editorial text-xl sm:text-2xl font-bold text-[#2D1914]">
            Serviços & Procedimentos
          </h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Cadastre novos serviços, edite preços, configure etapas ativas vs pausas químicas de encaixe.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {feedbackMsg && (
            <div className="text-xs bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-1.5 rounded-xl font-medium animate-fade-in">
              {feedbackMsg}
            </div>
          )}

          <button
            onClick={() => setEditingService(null)}
            className="px-4 py-2.5 text-xs font-bold text-[#2D1914] gold-gradient rounded-xl shadow-xs hover:opacity-95 transition-all flex items-center space-x-1.5 shrink-0 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Serviço</span>
          </button>
        </div>
      </div>

      {/* Lista de Serviços Cadastrados */}
      <div className="space-y-6">
        {services.length === 0 ? (
          <div className="p-8 text-center rounded-2xl border border-dashed border-[#E7DCCE] bg-[#FAF7F2]">
            <Scissors className="w-8 h-8 text-stone-400 mx-auto mb-2" />
            <h3 className="font-bold text-sm text-[#2D1914]">Nenhum serviço cadastrado</h3>
            <p className="text-xs text-stone-500 mt-1 mb-4">
              Comece adicionando os procedimentos realizados no salão.
            </p>
            <button
              onClick={() => setEditingService(null)}
              className="px-4 py-2 text-xs font-bold text-[#2D1914] gold-gradient rounded-xl"
            >
              + Cadastrar Primeiro Serviço
            </button>
          </div>
        ) : (
          services.map((service) => {
            const totalDuration = service.steps.reduce((sum, s) => sum + s.durationMin, 0);
            const hasTriage = service.requiresTriage;

            return (
              <div
                key={service.id}
                className="p-5 sm:p-6 rounded-2xl border border-[#E7DCCE] bg-[#FDFBF7] space-y-4 hover:border-[#AD841D]/40 transition-all shadow-2xs"
              >
                {/* Topo do Serviço */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-editorial text-lg sm:text-xl font-bold text-[#2D1914]">
                        {service.title}
                      </h3>
                      <span className="text-xs font-bold text-[#AD841D] bg-[#DBAE3B]/10 px-2.5 py-0.5 rounded-md border border-[#DBAE3B]/20">
                        {formatBRL(service.price)}
                      </span>
                      {service.promotionalPrice && (
                        <span className="text-xs text-stone-400 line-through">
                          {formatBRL(service.promotionalPrice)}
                        </span>
                      )}
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-stone-500 bg-stone-100 px-2 py-0.5 rounded-full">
                        {service.category}
                      </span>
                    </div>
                    {service.description && (
                      <p className="text-xs text-stone-600 mt-1 max-w-2xl">
                        {service.description}
                      </p>
                    )}
                  </div>

                  {/* Ações do Serviço */}
                  <div className="flex flex-wrap items-center gap-2">
                    {hasTriage ? (
                      <span className="text-[11px] bg-amber-100 text-amber-900 border border-amber-300 px-2.5 py-1 rounded-full font-bold">
                        Triagem Ativa
                      </span>
                    ) : (
                      <span className="text-[11px] bg-stone-100 text-stone-600 px-2.5 py-1 rounded-full font-medium">
                        Sem Triagem
                      </span>
                    )}

                    {/* Botão de Espelhar Questionário */}
                    <button
                      onClick={() => setTargetServiceForMirror(service)}
                      className="px-3 py-1.5 text-xs font-semibold text-[#5E372C] bg-white border border-[#E7DCCE] hover:bg-[#FAF7F2] rounded-xl flex items-center space-x-1.5 shadow-2xs transition-all"
                      title="Clonar questionário de triagem existente para este serviço"
                    >
                      <Copy className="w-3.5 h-3.5 text-[#C59B27]" />
                      <span className="hidden md:inline">Espelhar Questionário</span>
                    </button>

                    {/* Botão Editar */}
                    <button
                      onClick={() => setEditingService(service)}
                      className="px-3 py-1.5 text-xs font-bold text-[#2D1914] bg-white hover:bg-stone-50 border border-[#E7DCCE] rounded-xl flex items-center space-x-1 shadow-2xs transition-all"
                      title="Editar dados e etapas deste serviço"
                    >
                      <Pencil className="w-3.5 h-3.5 text-[#AD841D]" />
                      <span>Editar</span>
                    </button>

                    {/* Botão Excluir */}
                    <button
                      onClick={() => setDeletingServiceId(service.id)}
                      className="p-1.5 text-xs font-semibold text-stone-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 rounded-xl transition-all"
                      title="Excluir este serviço"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Detalhe dos Blocos de Etapas (Motor de Pausas) */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-[#AD841D] block">
                      Estrutura de Tempo • {totalDuration} min no total:
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                    {service.steps.map((step, idx) => {
                      const isPause = step.type === "pause";

                      return (
                        <div
                          key={step.id || idx}
                          className={`p-3 rounded-xl border text-xs flex flex-col justify-between ${
                            isPause
                              ? "bg-amber-50/80 border-dashed border-amber-300 text-amber-950"
                              : "bg-white border-[#E7DCCE] text-[#2D1914]"
                          }`}
                        >
                          <div className="flex items-start justify-between mb-1">
                            <span className="font-bold flex items-center gap-1.5 truncate">
                              {isPause ? (
                                <Hourglass className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                              ) : (
                                <Scissors className="w-3.5 h-3.5 text-[#C59B27] shrink-0" />
                              )}
                              <span className="truncate">
                                Etapa {idx + 1}: {step.title}
                              </span>
                            </span>
                            <span className="font-mono font-bold text-[11px] shrink-0 ml-1">
                              {step.durationMin}m
                            </span>
                          </div>

                          <p className="text-[11px] text-stone-500 mb-2">
                            {step.description ||
                              (isPause
                                ? "Ação química com janela de tolerância para encaixes paralelos."
                                : "Atendimento exclusivo com a profissional.")}
                          </p>

                          {isPause && (
                            <div className="pt-2 border-t border-amber-200 text-[10px] text-amber-800 flex items-center justify-between">
                              <span>Tolerância Máxima:</span>
                              <span className="font-bold font-mono">
                                {step.maxPauseDurationMin || step.durationMin} min
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal de Criação / Edição de Serviço */}
      {editingService !== undefined && (
        <ServiceEditorModal
          service={editingService}
          triageForms={triageForms}
          profiles={profiles}
          onSave={handleSaveService}
          onClose={() => setEditingService(undefined)}
        />
      )}

      {/* Modal de Confirmação de Exclusão */}
      {deletingServiceId && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-rose-200 animate-scale-up text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-base text-[#2D1914] mb-1">
              Excluir este Serviço?
            </h3>
            <p className="text-xs text-stone-600 mb-5 leading-relaxed">
              Tem certeza que deseja remover este serviço e suas etapas? Agendamentos passados continuarão preservados no histórico.
            </p>
            <div className="flex items-center justify-center space-x-2">
              <button
                type="button"
                onClick={() => setDeletingServiceId(null)}
                className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-xl"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => handleDeleteService(deletingServiceId)}
                className="px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs"
              >
                Sim, Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Espelhar Questionário */}
      {targetServiceForMirror && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-[#E7DCCE] animate-scale-up">
            <span className="text-[10px] uppercase font-bold tracking-widest text-[#AD841D] block mb-1">
              Recurso de Espelhamento Inteligente
            </span>
            <h3 className="font-editorial text-xl font-bold text-[#2D1914] mb-2">
              Espelhar Questionário de Triagem
            </h3>
            <p className="text-xs text-[#5E372C] leading-relaxed mb-4">
              Você está vinculando uma nova triagem ao serviço:{" "}
              <strong>{targetServiceForMirror.title}</strong>. Selecione qual questionário existente deseja usar como modelo:
            </p>

            <div className="space-y-2 mb-6">
              {triageForms.map((form) => (
                <label
                  key={form.id}
                  className={`p-3 rounded-xl border block cursor-pointer text-xs transition-all ${
                    selectedBaseFormId === form.id
                      ? "border-[#C59B27] bg-[#FDF9F0] text-[#2D1914] font-semibold"
                      : "border-[#E7DCCE] bg-white text-[#44271F]"
                  }`}
                >
                  <input
                    type="radio"
                    name="baseForm"
                    value={form.id}
                    checked={selectedBaseFormId === form.id}
                    onChange={(e) => setSelectedBaseFormId(e.target.value)}
                    className="mr-2 accent-[#C59B27]"
                  />
                  <span>{form.title}</span>
                  <span className="block text-[10px] text-stone-500 font-normal mt-0.5">
                    {form.questions.length} perguntas (curvatura, química, fotos, etc.)
                  </span>
                </label>
              ))}
            </div>

            <div className="flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={() => setTargetServiceForMirror(null)}
                className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-xl"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleMirror}
                className="px-5 py-2 text-xs font-bold text-white gold-gradient rounded-xl shadow-md hover:opacity-95"
              >
                Confirmar Espelhamento
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
