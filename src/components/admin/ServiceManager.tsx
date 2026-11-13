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

  // Paginação de serviços (5 em 5)
  const PAGE_SIZE = 5;
  const [visibleCount, setVisibleCount] = useState<number>(PAGE_SIZE);

  // Espelhar Questionário
  const handleMirror = async () => {
    if (!targetServiceForMirror || !selectedBaseFormId) return;

    const clonedForm = SalonStore.mirrorTriageForm(selectedBaseFormId, targetServiceForMirror);

    if (SupabaseDataService) {
      try {
        await SupabaseDataService.saveTriageForm(clonedForm);
        await SupabaseDataService.saveService({
          ...targetServiceForMirror,
          requiresTriage: true,
          triageFormId: clonedForm.id,
        });
      } catch (err) {
        console.error("Erro ao persistir triagem espelhada no Supabase:", err);
      }
    }

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
    <div className="bg-white/85 backdrop-blur-md rounded-2xl sm:rounded-3xl p-3.5 sm:p-8 border border-[#D8D0BD] shadow-xs relative overflow-hidden">
      {/* Pattern de Arcos de Oliva sutil */}
      <div className="absolute inset-0 bg-pattern-arches-olive opacity-[0.03] pointer-events-none" />

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-[#D8D0BD] relative z-10">
        <div>
          <span className="text-[10px] uppercase tracking-widest text-[#80611F] font-bold block mb-1">
            Engenharia de Procedimentos • Espaço da Beleza
          </span>
          <h2 className="text-xl sm:text-2xl font-extrabold text-[#1D3D3C]">
            Serviços &amp; Procedimentos
          </h2>

          {/* Grafismo Oficial 1 - Linha Orgânica Dourada */}
          <div className="relative w-36 sm:w-44 h-2.5 my-1.5 opacity-80 pointer-events-none">
            <img
              src="/brand/Grafismos/linha-grafismo-1.png"
              alt=""
              className="w-full h-full object-contain object-left"
            />
          </div>

          <p className="text-xs text-[#736455] mt-0.5">
            Cadastre novos serviços, edite preços, configure etapas ativas vs pausas químicas de encaixe.
          </p>
        </div>

        <div className="flex items-center space-x-3 w-full sm:w-auto justify-between sm:justify-end">
          {feedbackMsg && (
            <div className="text-xs bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-1.5 rounded-xl font-medium animate-fade-in shadow-xs">
              {feedbackMsg}
            </div>
          )}

          <button
            onClick={() => setEditingService(null)}
            className="w-full sm:w-auto px-4 py-2.5 text-xs font-bold text-white brand-green-gradient border border-[#C7A03A]/40 hover:border-[#C7A03A] rounded-xl shadow-xs transition-all flex items-center justify-center space-x-1.5 shrink-0 active:scale-95 touch-manipulation cursor-pointer"
          >
            <Plus className="w-4 h-4 text-[#D9B85F]" />
            <span>Novo Serviço</span>
          </button>
        </div>
      </div>

      {/* Lista de Serviços Cadastrados */}
      <div className="space-y-6 relative z-10">
        {services.length === 0 ? (
          <div className="p-8 text-center rounded-2xl border border-dashed border-[#D8D0BD] bg-[#FAF7F2]">
            <Scissors className="w-8 h-8 text-[#736455] mx-auto mb-2 opacity-60" />
            <h3 className="font-bold text-sm text-[#1D3D3C]">Nenhum serviço cadastrado</h3>
            <p className="text-xs text-[#736455] mt-1 mb-4">
              Comece adicionando os procedimentos realizados no salão.
            </p>
            <button
              onClick={() => setEditingService(null)}
              className="px-4 py-2 text-xs font-bold text-[#1D3D3C] gold-gradient rounded-xl shadow-xs"
            >
              + Cadastrar Primeiro Serviço
            </button>
          </div>
        ) : (
          services.slice(0, visibleCount).map((service) => {
            const totalDuration = service.steps.reduce((sum, s) => sum + s.durationMin, 0);
            const hasTriage = service.requiresTriage;

            return (
              <div
                key={service.id}
                className="p-3.5 sm:p-6 rounded-2xl border border-[#D8D0BD] bg-[#FAF7F2]/60 hover:bg-[#FAF7F2] space-y-4 hover:border-[#C7A03A]/60 transition-all shadow-xs">
                {/* Topo do Serviço */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="flex items-start space-x-3.5">
                    <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden shrink-0 border border-[#D8D0BD] bg-white shadow-xs">
                      {service.imageUrl ? (
                        <img
                          src={service.imageUrl}
                          alt={service.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-[#736455] bg-[#FAF7F2]">
                          <Scissors className="w-4 h-4 mb-0.5 opacity-50 text-[#C7A03A]" />
                          <span className="text-[8px] font-bold text-[#80611F]">Sem foto</span>
                        </div>
                      )}
                    </div>

                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg sm:text-xl font-bold text-[#1D3D3C]">
                          {service.title}
                        </h3>

                        {service.priceType === "starting_at" ? (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-bold text-[#80611F] bg-[#FCF9F0] px-2.5 py-0.5 rounded-md border border-[#C7A03A]/50 flex items-center gap-1 shadow-2xs">
                              <Sparkles className="w-3 h-3 text-[#AD841D]" />
                              <span>A partir de {formatBRL(service.price)}</span>
                              {service.maxPrice && service.maxPrice > service.price && (
                                <span className="text-[#736455] font-medium text-[11px] ml-0.5">
                                  (até {formatBRL(service.maxPrice)})
                                </span>
                              )}
                            </span>
                            <span className="text-[9px] font-extrabold uppercase tracking-wider text-[#AD841D] bg-amber-50/80 border border-amber-200/80 px-2 py-0.5 rounded-full">
                              Preço Variável
                            </span>
                          </div>
                        ) : service.promotionalPrice && service.promotionalPrice < service.price ? (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-bold text-[#80611F] bg-[#FCF9F0] px-2.5 py-0.5 rounded-md border border-[#C7A03A]/50 shadow-2xs">
                              {formatBRL(service.promotionalPrice)}
                            </span>
                            <span className="text-xs text-[#736455] line-through">
                              {formatBRL(service.price)}
                            </span>
                            <span className="text-[9px] font-extrabold uppercase tracking-wider text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                              Promoção
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs font-bold text-[#80611F] bg-[#FCF9F0] px-2.5 py-0.5 rounded-md border border-[#C7A03A]/50 shadow-2xs">
                            {formatBRL(service.price)}
                          </span>
                        )}

                        <span className="text-[10px] font-semibold uppercase tracking-wider text-[#736455] bg-white border border-[#D8D0BD] px-2 py-0.5 rounded-full">
                          {service.category}
                        </span>
                      </div>
                      {service.description && (
                        <p className="text-xs text-[#736455] mt-1 max-w-2xl">
                          {service.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Ações do Serviço */}
                  <div className="flex flex-wrap items-center gap-2">
                    {hasTriage ? (
                      <span className="text-[11px] bg-[#FCF9F0] text-[#80611F] border border-[#C7A03A]/50 px-2.5 py-1 rounded-full font-bold">
                        Triagem Ativa
                      </span>
                    ) : (
                      <span className="text-[11px] bg-white border border-[#D8D0BD] text-[#736455] px-2.5 py-1 rounded-full font-medium">
                        Sem Triagem
                      </span>
                    )}

                    {/* Botão de Espelhar Questionário */}
                    <button
                      onClick={() => setTargetServiceForMirror(service)}
                      className="px-3 py-1.5 text-xs font-semibold text-[#1D3D3C] bg-white border border-[#D8D0BD] hover:bg-[#FAF7F2] rounded-xl flex items-center space-x-1.5 shadow-xs transition-all"
                      title="Clonar questionário de triagem existente para este serviço"
                    >
                      <Copy className="w-3.5 h-3.5 text-[#C7A03A]" />
                      <span className="hidden md:inline">Espelhar Questionário</span>
                    </button>

                    {/* Botão Editar */}
                    <button
                      onClick={() => setEditingService(service)}
                      className="px-3 py-1.5 text-xs font-bold text-[#1D3D3C] bg-white hover:bg-[#FAF7F2] border border-[#D8D0BD] rounded-xl flex items-center space-x-1 shadow-xs transition-all"
                      title="Editar dados e etapas deste serviço"
                    >
                      <Pencil className="w-3.5 h-3.5 text-[#C7A03A]" />
                      <span>Editar</span>
                    </button>

                    {/* Botão Excluir */}
                    <button
                      onClick={() => setDeletingServiceId(service.id)}
                      className="p-1.5 text-xs font-semibold text-[#736455] hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 rounded-xl transition-all"
                      title="Excluir este serviço"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Detalhe dos Blocos de Etapas (Motor de Pausas) */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-[#80611F] block">
                      Estrutura de Tempo • {totalDuration} min no total:
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                    {service.steps.map((step, idx) => {
                      const isPause = step.type === "pause";

                      return (
                        <div
                          key={step.id || idx}
                          className={`p-3 rounded-xl border text-xs flex flex-col justify-between shadow-xs ${
                            isPause
                              ? "bg-amber-50/90 border-dashed border-amber-300 text-amber-950"
                              : "bg-white border-[#D8D0BD] text-[#1D3D3C]"
                          }`}
                        >
                          <div className="flex items-start justify-between mb-1">
                            <span className="font-bold flex items-center gap-1.5 truncate">
                              {isPause ? (
                                <Hourglass className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                              ) : (
                                <Scissors className="w-3.5 h-3.5 text-[#C7A03A] shrink-0" />
                              )}
                              <span className="truncate">
                                Etapa {idx + 1}: {step.title}
                              </span>
                            </span>
                            <span className="font-mono font-bold text-[11px] shrink-0 ml-1 text-[#80611F]">
                              {step.durationMin}m
                            </span>
                          </div>

                          <p className="text-[11px] text-[#736455] mb-2">
                            {step.description ||
                              (isPause
                                ? "Ação química com janela de tolerância para encaixes paralelos."
                                : "Atendimento exclusivo com a profissional.")}
                          </p>

                          {isPause && (
                            <div className="pt-2 border-t border-amber-200 text-[10px] text-amber-900 flex items-center justify-between">
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

        {/* Paginação de Serviços (5 em 5) */}
        {services.length > visibleCount && (
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-[#D8D0BD]/70">
            <p className="text-xs text-[#736455]">
              Exibindo <span className="font-bold text-[#1D3D3C]">{Math.min(visibleCount, services.length)}</span> de{" "}
              <span className="font-bold text-[#1D3D3C]">{services.length}</span> serviços cadastrados
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setVisibleCount((prev) => prev + PAGE_SIZE)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-[#1D3D3C] bg-white hover:bg-[#FAF7F2] border border-[#D8D0BD] transition-all shadow-2xs hover:shadow-xs active:scale-95"
              >
                Carregar mais 5 serviços
              </button>
              <button
                type="button"
                onClick={() => setVisibleCount(services.length)}
                className="px-3 py-2 rounded-xl text-xs font-semibold text-[#736455] hover:text-[#1D3D3C] transition-all"
              >
                Ver todos ({services.length})
              </button>
            </div>
          </div>
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
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-hidden">
          <div className="bg-white rounded-t-[28px] sm:rounded-3xl rounded-b-none sm:rounded-b-3xl max-w-sm w-full p-5 pb-8 sm:p-6 shadow-2xl border-t border-x sm:border border-rose-200 animate-slide-up-sheet text-center">
            {/* Puxador Visual Mobile */}
            <div className="w-12 h-1.5 bg-[#D8D0BD] rounded-full mx-auto -mt-1 mb-3 sm:hidden shrink-0" />

            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-base text-[#1D3D3C] mb-1">
              Excluir este Serviço?
            </h3>
            <p className="text-xs text-[#736455] mb-5 leading-relaxed">
              Tem certeza que deseja remover este serviço e suas etapas? Agendamentos passados continuarão preservados no histórico.
            </p>
            <div className="flex items-center justify-center space-x-2">
              <button
                type="button"
                onClick={() => setDeletingServiceId(null)}
                className="px-4 py-2 text-xs font-semibold text-[#736455] hover:bg-[#FAF7F2] rounded-xl border border-[#D8D0BD] transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => handleDeleteService(deletingServiceId)}
                className="px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs active:scale-95"
              >
                Sim, Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Espelhar Questionário */}
      {targetServiceForMirror && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-hidden">
          <div className="bg-white rounded-t-[28px] sm:rounded-3xl rounded-b-none sm:rounded-b-3xl max-w-md w-full p-5 pb-8 sm:p-6 shadow-2xl border-t border-x sm:border border-[#D8D0BD] animate-slide-up-sheet max-h-[92vh] sm:max-h-[90vh] flex flex-col overflow-hidden">
            {/* Puxador Visual Mobile */}
            <div className="w-12 h-1.5 bg-[#D8D0BD] rounded-full mx-auto -mt-1 mb-3 sm:hidden shrink-0" />

            <div className="flex-1 overflow-y-auto no-scrollbar sm:scrollbar-thin">
              <span className="text-[10px] uppercase font-bold tracking-widest text-[#80611F] block mb-1">
                Recurso de Espelhamento Inteligente
              </span>
              <h3 className="text-lg sm:text-xl font-bold text-[#1D3D3C] mb-2">
                Espelhar Questionário de Triagem
              </h3>
              <p className="text-xs text-[#736455] leading-relaxed mb-4">
                Você está vinculando uma nova triagem ao serviço:{" "}
                <strong className="text-[#1D3D3C]">{targetServiceForMirror.title}</strong>. Selecione qual questionário existente deseja usar como modelo:
              </p>

              <div className="space-y-2 mb-6">
                {triageForms.map((form) => (
                  <label
                    key={form.id}
                    className={`p-3 rounded-xl border block cursor-pointer text-xs transition-all ${
                      selectedBaseFormId === form.id
                        ? "border-[#C7A03A] bg-[#FCF9F0] text-[#1D3D3C] font-semibold"
                        : "border-[#D8D0BD] bg-white text-[#736455]"
                    }`}
                  >
                    <input
                      type="radio"
                      name="baseForm"
                      value={form.id}
                      checked={selectedBaseFormId === form.id}
                      onChange={(e) => setSelectedBaseFormId(e.target.value)}
                      className="mr-2 accent-[#1D3D3C]"
                    />
                    <span>{form.title}</span>
                    <span className="block text-[10px] text-[#736455]/80 font-normal mt-0.5">
                      {form.questions.length} perguntas (curvatura, química, fotos, etc.)
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-3 border-t border-[#D8D0BD] shrink-0 bg-white">
              <button
                type="button"
                onClick={() => setTargetServiceForMirror(null)}
                className="px-4 py-2 text-xs font-semibold text-[#736455] hover:bg-[#FAF7F2] rounded-xl border border-[#D8D0BD] transition-colors"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleMirror}
                className="px-5 py-2 text-xs font-bold text-[#1D3D3C] gold-gradient rounded-xl shadow-md hover:opacity-95 active:scale-95"
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
