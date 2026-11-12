"use client";

import { useState, useMemo } from "react";
import { MODULE_GUIDES, UPDATE_RELEASE_FEATURES } from "./tutorialSteps";
import {
  X,
  BookOpen,
  Sparkles,
  Search,
  Zap,
  CalendarCheck,
  ClipboardList,
  Calendar,
  DollarSign,
  ChevronRight,
  CheckCircle2,
  Lightbulb,
  Keyboard,
  HelpCircle,
  Play,
  RotateCcw,
  Tag,
  Bell,
  MessageCircle,
  FileText,
  CheckSquare,
  Clock,
} from "lucide-react";

interface TutorialHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartInteractiveTour: () => void;
}

export function TutorialHelpModal({
  isOpen,
  onClose,
  onStartInteractiveTour,
}: TutorialHelpModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedModuleId, setSelectedModuleId] = useState<string>(MODULE_GUIDES[0].id);
  const [activeTab, setActiveTab] = useState<"novidades" | "modulos" | "atalhos" | "faq">("novidades");

  const filteredGuides = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return MODULE_GUIDES;
    return MODULE_GUIDES.filter(
      (m) =>
        m.title.toLowerCase().includes(q) ||
        m.summary.toLowerCase().includes(q) ||
        m.keyPoints.some(
          (k) =>
            k.label.toLowerCase().includes(q) || k.text.toLowerCase().includes(q)
        )
    );
  }, [searchQuery]);

  const activeModule =
    MODULE_GUIDES.find((m) => m.id === selectedModuleId) || MODULE_GUIDES[0];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6 overflow-hidden bg-black/60 backdrop-blur-xs">
      <div className="bg-white w-full max-w-4xl rounded-t-[28px] sm:rounded-3xl rounded-b-none sm:rounded-b-3xl shadow-2xl border-t border-x sm:border border-[#E7DCCE] overflow-hidden flex flex-col max-h-[94vh] sm:max-h-[90vh] animate-slide-up-sheet">
        {/* Puxador Visual Mobile */}
        <div className="w-12 h-1.5 bg-[#D8D0BD] rounded-full mx-auto my-2 sm:hidden shrink-0" />

        {/* Header da Central */}
        <div className="bg-[#2D1914] text-white p-5 sm:p-8 relative overflow-hidden shrink-0">
          <div className="absolute top-0 right-0 w-64 h-64 bg-radial from-[#C59B27]/20 to-transparent pointer-events-none rounded-full blur-2xl" />

          <div className="relative z-10 flex items-start justify-between">
            <div className="space-y-1.5">
              <div className="flex items-center space-x-2">
                <span className="px-2.5 py-0.5 rounded-full bg-[#C59B27]/20 border border-[#C59B27]/40 text-[#DBAE3B] text-[10px] font-extrabold uppercase tracking-widest">
                  Manual Executivo
                </span>
                <span className="text-xs text-stone-400">•</span>
                <span className="text-xs text-stone-300">Gleicy Ronha</span>
              </div>
              <h2 className="font-editorial text-2xl sm:text-3xl font-bold tracking-tight text-[#FAF7F2]">
                Central de Treinamento do Salão
              </h2>
              <p className="text-xs sm:text-sm text-stone-300 max-w-xl">
                Aprenda a operar todas as funções da sua agenda, dominar o intercalamento em pausas químicas e emitir propostas de alto padrão.
              </p>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-2xl bg-white/10 hover:bg-white/20 text-white transition-colors"
              title="Fechar Central"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Banner de Ação de Destaque: Iniciar Tour Guiado */}
          <div className="mt-5 pt-4 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-2 text-xs text-[#E5C158]">
              <Sparkles className="w-4 h-4 shrink-0 text-[#DBAE3B]" />
              <span>Deseja um passo a passo visual diretamente na sua tela?</span>
            </div>

            <button
              onClick={() => {
                onClose();
                onStartInteractiveTour();
              }}
              className="px-5 py-2.5 rounded-2xl font-bold text-xs text-[#2D1914] bg-[#DBAE3B] hover:bg-[#E5C158] transition-all shadow-md flex items-center justify-center space-x-2 shrink-0 transform hover:scale-[1.02]"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Iniciar Tour Guiado com Holofote</span>
            </button>
          </div>
        </div>

        {/* Barra de Navegação Interna & Busca */}
        <div className="bg-[#FAF7F2] border-b border-[#E7DCCE] px-4 sm:px-6 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          {/* Tabs */}
          <div className="flex items-center space-x-1 overflow-x-auto no-scrollbar pb-1 sm:pb-0 w-full sm:w-auto shrink-0">
            <button
              onClick={() => setActiveTab("novidades")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 shrink-0 ${
                activeTab === "novidades"
                  ? "bg-[#1D3D3C] text-white shadow-xs border border-[#C7A03A]/50"
                  : "text-[#80611F] bg-[#FCF9F0] hover:bg-[#F5ECCF] border border-[#C7A03A]/40"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-[#C59B27]" />
              <span>Novidades da Atualização ✨</span>
            </button>

            <button
              onClick={() => setActiveTab("modulos")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 shrink-0 ${
                activeTab === "modulos"
                  ? "bg-[#2D1914] text-white shadow-xs"
                  : "text-[#5E372C] hover:bg-stone-200/50"
              }`}
            >
              <BookOpen className="w-3.5 h-3.5 text-[#C59B27]" />
              <span>Módulos do Sistema</span>
            </button>

            <button
              onClick={() => setActiveTab("atalhos")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 shrink-0 ${
                activeTab === "atalhos"
                  ? "bg-[#2D1914] text-white shadow-xs"
                  : "text-[#5E372C] hover:bg-stone-200/50"
              }`}
            >
              <Keyboard className="w-3.5 h-3.5 text-[#C59B27]" />
              <span>Atalhos de Teclado</span>
            </button>

            <button
              onClick={() => setActiveTab("faq")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 shrink-0 ${
                activeTab === "faq"
                  ? "bg-[#2D1914] text-white shadow-xs"
                  : "text-[#5E372C] hover:bg-stone-200/50"
              }`}
            >
              <HelpCircle className="w-3.5 h-3.5 text-[#C59B27]" />
              <span>Perguntas Frequentes</span>
            </button>
          </div>

          {/* Campo de Busca Rápida */}
          <div className="relative w-full sm:w-64 shrink-0">
            <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por recurso..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-[#E7DCCE] bg-white text-xs text-[#2D1914] placeholder:text-stone-400 focus:outline-none focus:ring-1 focus:ring-[#C59B27]"
            />
          </div>
        </div>

        {/* Conteúdo da Tab */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {activeTab === "novidades" && (
            <div className="space-y-6 max-w-4xl mx-auto py-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-[#1D3D3C] to-[#254d4c] text-white shadow-md">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2 text-[#F0C961] text-xs font-bold uppercase tracking-wider">
                    <Sparkles className="w-4 h-4" />
                    <span>Atualização 2.0 Concluída</span>
                  </div>
                  <h3 className="font-editorial text-xl sm:text-2xl font-bold text-white">
                    10 Melhorias e Novas Ferramentas no seu Painel
                  </h3>
                  <p className="text-xs text-stone-300 max-w-xl">
                    Todas as novas funções solicitadas foram integradas e testadas para facilitar seu atendimento diário.
                  </p>
                </div>

                <button
                  onClick={() => {
                    onClose();
                    onStartInteractiveTour();
                  }}
                  className="px-4 py-2.5 rounded-xl font-bold text-xs text-[#2D1914] bg-[#DBAE3B] hover:bg-[#F0C961] transition-all shadow-md flex items-center justify-center space-x-2 shrink-0 cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Ver na Tela (Tour)</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {UPDATE_RELEASE_FEATURES.filter(
                  (f) =>
                    !searchQuery ||
                    f.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    f.whatChanged.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    f.tag.toLowerCase().includes(searchQuery.toLowerCase())
                ).map((feature) => (
                  <div
                    key={feature.id}
                    className="p-4 sm:p-5 rounded-2xl bg-white border border-[#E7DCCE] shadow-xs flex flex-col justify-between space-y-3.5 hover:border-[#C7A03A]/60 transition-colors"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#80611F] bg-[#FCF9F0] border border-[#C7A03A]/40 px-2.5 py-0.5 rounded-full">
                          {feature.number}. {feature.tag}
                        </span>
                      </div>
                      <h4 className="font-bold text-sm sm:text-base text-[#2D1914] leading-snug">
                        {feature.title}
                      </h4>
                      <p className="text-xs text-stone-600 leading-relaxed">
                        {feature.whatChanged}
                      </p>
                    </div>

                    <div className="space-y-2 pt-2 border-t border-[#E7DCCE]/60">
                      <div className="text-[11px] font-bold text-[#1D3D3C] uppercase tracking-wider flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Como usar:</span>
                      </div>
                      <ul className="space-y-1 text-xs text-stone-600 list-disc pl-4">
                        {feature.howToUse.slice(0, 2).map((step, idx) => (
                          <li key={idx} className="leading-relaxed">{step}</li>
                        ))}
                      </ul>

                      <div className="mt-2 p-2.5 rounded-xl bg-[#FCF9F0] border border-[#C7A03A]/30 text-[11px] text-[#5E372C] leading-snug">
                        <span className="font-bold text-[#80611F]">💡 Dica: </span>
                        {feature.goldenTip}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "modulos" && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-5 md:gap-6">
              {/* Menu Lateral de Módulos (Carrossel Horizontal no Mobile, Barra Lateral no Desktop) */}
              <div className="md:col-span-4 flex md:flex-col gap-2 overflow-x-auto md:overflow-x-visible no-scrollbar pb-2 md:pb-0 border-b md:border-b-0 md:border-r border-[#E7DCCE]/60 md:pr-4 shrink-0">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#AD841D] hidden md:block mb-1">
                  Tópicos do Sistema ({filteredGuides.length})
                </span>

                {filteredGuides.map((guide) => {
                  const isSelected = guide.id === selectedModuleId;
                  return (
                    <button
                      key={guide.id}
                      onClick={() => setSelectedModuleId(guide.id)}
                      className={`min-w-[190px] sm:min-w-[220px] md:min-w-0 md:w-full text-left p-3 rounded-2xl transition-all flex items-center justify-between border shrink-0 md:shrink ${
                        isSelected
                          ? "bg-[#2D1914] text-white border-[#2D1914] shadow-xs ring-1 ring-[#DBAE3B]/40"
                          : "bg-white text-[#44271F] border-[#E7DCCE]/80 hover:bg-[#FAF7F2]"
                      }`}
                    >
                      <div className="truncate mr-2">
                        <span className="font-bold text-xs block truncate">
                          {guide.title}
                        </span>
                        <span
                          className={`text-[10px] block truncate ${
                            isSelected ? "text-stone-300" : "text-stone-500"
                          }`}
                        >
                          {guide.summary}
                        </span>
                      </div>
                      <ChevronRight
                        className={`w-4 h-4 shrink-0 hidden sm:block ${
                          isSelected ? "text-[#DBAE3B]" : "text-stone-400"
                        }`}
                      />
                    </button>
                  );
                })}
              </div>

              {/* Detalhes do Módulo Selecionado */}
              <div className="md:col-span-8 space-y-6 md:pl-2">
                <div>
                  <h3 className="font-editorial text-2xl font-bold text-[#2D1914] mb-1">
                    {activeModule.title}
                  </h3>
                  <p className="text-xs text-stone-600">{activeModule.summary}</p>
                </div>

                {/* Pontos Chave */}
                <div className="space-y-2.5">
                  <span className="text-[11px] font-bold text-[#AD841D] uppercase tracking-wider block">
                    Conceitos Fundamentais:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {activeModule.keyPoints.map((pt, i) => (
                      <div
                        key={i}
                        className="p-3.5 rounded-2xl bg-[#FAF7F2] border border-[#E7DCCE]/80 space-y-1"
                      >
                        <span className="font-bold text-xs text-[#2D1914] block">
                          {pt.label}
                        </span>
                        <span className="text-[11px] text-stone-600 block leading-relaxed">
                          {pt.text}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Passo a Passo */}
                <div className="space-y-2.5">
                  <span className="text-[11px] font-bold text-[#AD841D] uppercase tracking-wider block">
                    Passo a Passo de Operação:
                  </span>
                  <div className="space-y-2">
                    {activeModule.stepByStep.map((step, idx) => (
                      <div
                        key={idx}
                        className="flex items-start space-x-3 p-2.5 rounded-xl bg-white border border-[#E7DCCE]/60"
                      >
                        <span className="w-5 h-5 rounded-full bg-[#C59B27] text-white text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                          {idx + 1}
                        </span>
                        <span className="text-xs text-[#2D1914] leading-relaxed">
                          {step}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Regras de Ouro */}
                <div className="p-4 rounded-2xl bg-[#FFF9E6] border border-[#F0DC9B] space-y-2">
                  <div className="flex items-center space-x-2 text-xs font-bold text-[#6B5112]">
                    <Lightbulb className="w-4 h-4 text-[#C59B27]" />
                    <span>Boas Práticas de Ouro para a Gleicy:</span>
                  </div>
                  <ul className="space-y-1.5 pl-6 list-disc text-xs text-[#6B5112]">
                    {activeModule.rulesOfThumb.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {activeTab === "atalhos" && (
            <div className="space-y-6 max-w-2xl mx-auto py-2">
              <div>
                <h3 className="font-editorial text-2xl font-bold text-[#2D1914] mb-1">
                  Atalhos de Teclado de Alta Performance
                </h3>
                <p className="text-xs text-stone-600">
                  Economize tempo durante o atendimento no salão utilizando comandos rápidos:
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-4 rounded-2xl bg-[#FAF7F2] border border-[#E7DCCE]">
                  <div>
                    <span className="font-bold text-sm text-[#2D1914] block">Novo Agendamento</span>
                    <span className="text-xs text-stone-500">Abre o formulário de agendamento rápido com autocomplete</span>
                  </div>
                  <kbd className="px-3 py-1.5 bg-white border-2 border-stone-300 rounded-xl shadow-xs font-mono font-bold text-xs text-[#2D1914]">
                    N
                  </kbd>
                </div>

                <div className="flex items-center justify-between p-4 rounded-2xl bg-[#FAF7F2] border border-[#E7DCCE]">
                  <div>
                    <span className="font-bold text-sm text-[#2D1914] block">Ir Para o Dia de Hoje</span>
                    <span className="text-xs text-stone-500">Posiciona o calendário e a timeline na data presente</span>
                  </div>
                  <kbd className="px-3 py-1.5 bg-white border-2 border-stone-300 rounded-xl shadow-xs font-mono font-bold text-xs text-[#2D1914]">
                    T
                  </kbd>
                </div>

                <div className="flex items-center justify-between p-4 rounded-2xl bg-[#FAF7F2] border border-[#E7DCCE]">
                  <div>
                    <span className="font-bold text-sm text-[#2D1914] block">Dia Anterior / Próximo Dia</span>
                    <span className="text-xs text-stone-500">Navega a data da agenda suavemente</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <kbd className="px-2.5 py-1.5 bg-white border-2 border-stone-300 rounded-xl shadow-xs font-mono font-bold text-xs text-[#2D1914]">
                      ←
                    </kbd>
                    <kbd className="px-2.5 py-1.5 bg-white border-2 border-stone-300 rounded-xl shadow-xs font-mono font-bold text-xs text-[#2D1914]">
                      →
                    </kbd>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 rounded-2xl bg-[#FAF7F2] border border-[#E7DCCE]">
                  <div>
                    <span className="font-bold text-sm text-[#2D1914] block">Fechar Modais e Telas</span>
                    <span className="text-xs text-stone-500">Cancela ou fecha qualquer janela aberta</span>
                  </div>
                  <kbd className="px-3 py-1.5 bg-white border-2 border-stone-300 rounded-xl shadow-xs font-mono font-bold text-xs text-[#2D1914]">
                    Esc
                  </kbd>
                </div>
              </div>
            </div>
          )}

          {activeTab === "faq" && (
            <div className="space-y-4 max-w-2xl mx-auto py-2">
              <div>
                <h3 className="font-editorial text-2xl font-bold text-[#2D1914] mb-1">
                  Dúvidas Frequentes do Dia a Dia
                </h3>
                <p className="text-xs text-stone-600">
                  Respostas imediatas para as situações mais comuns:
                </p>
              </div>

              <div className="space-y-3">
                <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#E7DCCE] space-y-1">
                  <span className="font-bold text-sm text-[#2D1914] block">
                    1. Como funciona a contraproposta quando não posso atender no horário que a cliente pediu?
                  </span>
                  <p className="text-xs text-stone-600 leading-relaxed">
                    Ao clicar em &quot;Montar Proposta&quot; em uma triagem ou pré-reserva de encaixe, você tem a opção de <strong>Recusar e Contrapropor</strong>. Você pode sugerir: 1) Outro horário no mesmo dia; 2) Outra data específica; ou 3) Um período flexível (ex: entre terça e sexta da próxima semana). O sistema envia tudo isso com uma justificativa amigável e, no caso do período flexível, a própria cliente escolhe o dia ideal dentro da proposta!
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#E7DCCE] space-y-1">
                  <span className="font-bold text-sm text-[#2D1914] block">
                    2. O que significa o alerta de conflito técnico de horário no construtor de proposta?
                  </span>
                  <p className="text-xs text-stone-600 leading-relaxed">
                    O sistema simula a execução do procedimento minuto a minuto com base nas etapas técnicas que você configurou. Se o horário que você escolheu colidir com uma etapa ativa de outro cliente ou se o tempo total ultrapassar o horário de fechamento do salão (19:00), ele avisa com um banner vermelho e disponibiliza um botão rápido para você sugerir uma nova data para a cliente.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#E7DCCE] space-y-1">
                  <span className="font-bold text-sm text-[#2D1914] block">
                    3. A cliente escolheu um procedimento que não tem triagem, mas pediu encaixe de data. O que eu faço?
                  </span>
                  <p className="text-xs text-stone-600 leading-relaxed">
                    Na lista de Pré-Reservas, você encontra o botão <strong>&quot;Montar Proposta&quot;</strong> em todos os cards. Mesmo que não haja formulário de anamnese, o sistema permite que você defina o horário de início, etapas técnicas e valores, emitindo a proposta personalizada oficial com link para a cliente aprovar.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#E7DCCE] space-y-1">
                  <span className="font-bold text-sm text-[#2D1914] block">
                    4. Preciso atualizar a página (F5) para ver novos agendamentos e triagens?
                  </span>
                  <p className="text-xs text-stone-600 leading-relaxed">
                    <strong>Não!</strong> Seu sistema está equipado com Supabase Realtime via WebSockets. Quando uma cliente preenche uma triagem no site ou aprova uma proposta pelo celular dela, as informações aparecem instantaneamente na sua tela em tempo real.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#E7DCCE] space-y-1">
                  <span className="font-bold text-sm text-[#2D1914] block">
                    5. Por que os cards de triagem agora estão em formato sanfonado (accordion)?
                  </span>
                  <p className="text-xs text-stone-600 leading-relaxed">
                    Para deixar sua tela limpa e rápida. Em vez de rolar dezenas de telas, os cards ficam recolhidos. Você pode expandir apenas o card que está analisando ou usar os botões &quot;Expandir Todos&quot; e &quot;Recolher Todos&quot; no topo. Além disso, o filtro inicia focado em &quot;Aguardando Resposta&quot; para você não perder tempo com o que já foi respondido.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#E7DCCE] space-y-1">
                  <span className="font-bold text-sm text-[#2D1914] block">
                    6. O que acontece quando eu altero meu telefone, meta ou endereço na aba Configurações?
                  </span>
                  <p className="text-xs text-stone-600 leading-relaxed">
                    Tudo é sincronizado imediatamente em banco de dados. O WhatsApp de contato, o endereço e os horários são atualizados instantaneamente no rodapé e nos botões do site principal onde as clientes navegam.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#E7DCCE] space-y-1">
                  <span className="font-bold text-sm text-[#2D1914] block">
                    7. Como o sistema protege a saúde dos fios em cabelos com química anterior?
                  </span>
                  <p className="text-xs text-stone-600 leading-relaxed">
                    O formulário de triagem detecta respostas com químicas incompatíveis ou procedimentos recentes (alisamentos, mechas). O sistema gera um alerta em destaque e inclui automaticamente um módulo de reposição lipídica e proteção antes do procedimento químico principal na proposta.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#E7DCCE] space-y-1">
                  <span className="font-bold text-sm text-[#2D1914] block">
                    8. Como funciona o desconto do Pix nas propostas?
                  </span>
                  <p className="text-xs text-stone-600 leading-relaxed">
                    Por padrão, o gerador aplica 5% de desconto automático para pagamento via Pix à vista. O valor da economia é destacado em um card dourado na proposta da cliente, incentivando o fechamento imediato com liquidação instantânea.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Rodapé da Central */}
        <div className="bg-[#FAF7F2] border-t border-[#E7DCCE] px-4 sm:px-6 py-3 sm:py-4 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="flex items-center space-x-2 text-xs text-stone-500">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="text-center sm:text-left">Sistema 100% atualizado e conectado ao Supabase</span>
          </div>

          <button
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2.5 sm:py-2 rounded-xl text-xs font-bold text-[#2D1914] bg-white border border-[#E7DCCE] hover:bg-[#F3ECE1] transition-all shadow-2xs text-center"
          >
            Entendido, fechar manual
          </button>
        </div>
      </div>
    </div>
  );
}
