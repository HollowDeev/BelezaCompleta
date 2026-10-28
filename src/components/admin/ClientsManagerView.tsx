"use client";

import { useState, useMemo } from "react";
import { SalonClient } from "@/types/client";
import { Appointment } from "@/types/appointment";
import { LuxuryProposal } from "@/types/proposal";
import { TriageSubmission } from "@/types/triage";
import { formatBRL, generateWhatsAppLink } from "@/lib/utils";
import {
  Users,
  Search,
  Phone,
  Calendar,
  Clock,
  DollarSign,
  Plus,
  MessageCircle,
  Sparkles,
  ExternalLink,
  HeartHandshake,
  FileText,
  AlertCircle,
  X,
  History,
  Scissors,
  UserCheck,
  Tag,
  KeyRound,
} from "lucide-react";

interface ClientsManagerViewProps {
  clients: SalonClient[];
  appointments: Appointment[];
  proposals: LuxuryProposal[];
  triageSubmissions: TriageSubmission[];
  onSaveClient: (client: SalonClient) => Promise<void>;
  onViewProposal?: (proposalId: string) => void;
}

export function formatTimeSince(dateStr?: string): { text: string; badgeColor: string; isWarning: boolean } {
  if (!dateStr) {
    return { text: "Primeiro contato (sem agendamento)", badgeColor: "bg-stone-100 text-stone-600", isWarning: false };
  }
  const date = new Date(dateStr);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - date.getTime());
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return { text: "Hoje", badgeColor: "bg-emerald-100 text-emerald-800 border-emerald-300 font-bold", isWarning: false };
  }
  if (diffDays === 1) {
    return { text: "Ontem", badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200", isWarning: false };
  }
  if (diffDays < 7) {
    return { text: `Há ${diffDays} dias`, badgeColor: "bg-emerald-50 text-emerald-800", isWarning: false };
  }
  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return { text: `Há ${weeks} ${weeks === 1 ? "semana" : "semanas"}`, badgeColor: "bg-amber-50 text-amber-800", isWarning: false };
  }
  if (diffDays < 60) {
    return { text: "Há 1 mês", badgeColor: "bg-amber-100 text-amber-900 border-amber-300 font-medium", isWarning: false };
  }
  const months = Math.floor(diffDays / 30);
  return {
    text: `Há ${months} meses (precisa de retorno)`,
    badgeColor: "bg-rose-100 text-rose-800 border-rose-300 font-bold",
    isWarning: true,
  };
}

export function ClientsManagerView({
  clients,
  appointments,
  proposals,
  triageSubmissions,
  onSaveClient,
  onViewProposal,
}: ClientsManagerViewProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFilter, setSelectedFilter] = useState<"todas" | "vip" | "retorno">("todas");
  const [selectedClientForDetails, setSelectedClientForDetails] = useState<SalonClient | null>(null);
  const [isNewClientModalOpen, setIsNewClientModalOpen] = useState(false);

  // Formulário de Nova Cliente
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newPassword, setNewPassword] = useState("123");
  const [newEmail, setNewEmail] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Filtro e busca de clientes
  const filteredClients = useMemo(() => {
    return clients.filter((c) => {
      const cleanPhone = c.phone.replace(/\D/g, "");
      const matchesSearch =
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cleanPhone.includes(searchTerm.replace(/\D/g, "")) ||
        (c.email && c.email.toLowerCase().includes(searchTerm.toLowerCase()));

      if (!matchesSearch) return false;

      if (selectedFilter === "vip") {
        return (c.totalAppointments || 0) >= 2 || (c.totalSpent || 0) >= 500;
      }
      if (selectedFilter === "retorno") {
        const timeInfo = formatTimeSince(c.lastVisitAt);
        return timeInfo.isWarning;
      }
      return true;
    });
  }, [clients, searchTerm, selectedFilter]);

  const totalClientsCount = clients.length;
  const vipClientsCount = clients.filter((c) => (c.totalAppointments || 0) >= 2).length;
  const needReturnCount = clients.filter((c) => formatTimeSince(c.lastVisitAt).isWarning).length;

  const handleCreateNewClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newPhone) return;

    setIsSaving(true);
    try {
      const clientToSave: SalonClient = {
        id: `cli-${Date.now()}`,
        name: newName,
        phone: newPhone,
        password: newPassword || "123",
        email: newEmail || undefined,
        notes: newNotes || undefined,
        createdAt: new Date().toISOString(),
      };
      await onSaveClient(clientToSave);
      setIsNewClientModalOpen(false);
      setNewName("");
      setNewPhone("");
      setNewPassword("123");
      setNewEmail("");
      setNewNotes("");
    } catch (err) {
      console.error("Erro ao salvar cliente:", err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E7DCCE] shadow-xs space-y-6">
      {/* Topo do CRM */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#E7DCCE]/60 pb-5">
        <div>
          <span className="text-[10px] uppercase tracking-widest text-[#AD841D] font-bold block">
            CRM & Relacionamento com Clientes
          </span>
          <h2 className="text-xl sm:text-2xl font-bold text-[#2D1914] flex items-center gap-2">
            <span>Gestão de Clientes</span>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#FAF7F2] text-[#5E372C] border border-[#E7DCCE]">
              {totalClientsCount} cadastradas
            </span>
          </h2>
        </div>

        <button
          onClick={() => setIsNewClientModalOpen(true)}
          className="px-4 py-2 text-xs font-bold text-white chocolate-gradient rounded-xl flex items-center gap-1.5 shadow-xs hover:opacity-95 transition-all"
        >
          <Plus className="w-3.5 h-3.5 text-[#DBAE3B]" />
          <span>Cadastrar Nova Cliente</span>
        </button>
      </div>

      {/* Cartões de Indicadores Rápidos de Clientes */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#E7DCCE] flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider block">
              Base de Clientes
            </span>
            <span className="font-editorial text-2xl font-bold text-[#2D1914]">
              {totalClientsCount}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-white border border-[#E7DCCE] flex items-center justify-center text-[#5E372C]">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-amber-900 uppercase tracking-wider block">
              Clientes Recorrentes (VIP)
            </span>
            <span className="font-editorial text-2xl font-bold text-amber-950">
              {vipClientsCount}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-white border border-amber-200 flex items-center justify-center text-[#AD841D]">
            <Sparkles className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-rose-50/70 border border-rose-200/80 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-rose-900 uppercase tracking-wider block">
              Oportunidade de Reativação
            </span>
            <span className="font-editorial text-2xl font-bold text-rose-950">
              {needReturnCount}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-white border border-rose-200 flex items-center justify-center text-rose-700">
            <HeartHandshake className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Barra de Filtros e Busca */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nome, telefone WhatsApp ou e-mail..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#E7DCCE] text-xs sm:text-sm text-[#2D1914] bg-[#FAF7F2]/50 focus:bg-white focus:border-[#C59B27] outline-none transition-all"
          />
        </div>

        <div className="flex items-center gap-1.5 p-1 bg-[#FAF7F2] rounded-xl border border-[#E7DCCE] self-start sm:self-auto">
          <button
            onClick={() => setSelectedFilter("todas")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              selectedFilter === "todas"
                ? "bg-[#2D1914] text-white shadow-2xs"
                : "text-[#5E372C] hover:text-[#2D1914]"
            }`}
          >
            Todas ({clients.length})
          </button>
          <button
            onClick={() => setSelectedFilter("vip")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              selectedFilter === "vip"
                ? "bg-[#2D1914] text-white shadow-2xs"
                : "text-[#5E372C] hover:text-[#2D1914]"
            }`}
          >
            VIPs ({vipClientsCount})
          </button>
          <button
            onClick={() => setSelectedFilter("retorno")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              selectedFilter === "retorno"
                ? "bg-[#2D1914] text-white shadow-2xs"
                : "text-[#5E372C] hover:text-[#2D1914]"
            }`}
          >
            Reativar ({needReturnCount})
          </button>
        </div>
      </div>

      {/* Lista / Tabela de Clientes */}
      {filteredClients.length === 0 ? (
        <div className="py-12 text-center text-xs text-stone-500 bg-[#FAF7F2] rounded-2xl border border-dashed border-[#E7DCCE]">
          Nenhuma cliente encontrada com os filtros informados.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredClients.map((client) => {
            const timeInfo = formatTimeSince(client.lastVisitAt);
            const cleanPhone = client.phone.replace(/\D/g, "");
            const whatsappMsg = `Olá, ${client.name}! Aqui é a Gleicy Ronha do Espaço da Beleza. Como está o cuidado com o seu cabelo?`;
            const whatsappUrl = generateWhatsAppLink(client.phone, whatsappMsg);

            // Resumo de atendimentos
            const clientAppointments = appointments.filter(
              (a) =>
                a.clientPhone.replace(/\D/g, "") === cleanPhone ||
                a.clientName.toLowerCase() === client.name.toLowerCase()
            );

            return (
              <div
                key={client.id || client.phone}
                className="p-5 rounded-2xl border border-[#E7DCCE] bg-[#FAF7F2]/60 hover:bg-[#FAF7F2] transition-all flex flex-col justify-between shadow-2xs space-y-4"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#FAF7F2] to-[#E7DCCE] border border-[#C59B27]/40 flex items-center justify-center font-editorial font-bold text-[#2D1914]">
                        {client.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="font-bold text-base text-[#2D1914] leading-tight">
                          {client.name}
                        </h4>
                        <span className="text-xs text-[#683C30] font-medium flex items-center gap-1 mt-0.5">
                          <Phone className="w-3 h-3 text-[#AD841D]" />
                          {client.phone}
                        </span>
                      </div>
                    </div>

                    <span
                      className={`text-[10px] px-2.5 py-1 rounded-full border ${timeInfo.badgeColor}`}
                    >
                      {timeInfo.text}
                    </span>
                  </div>

                  {/* Informações de Retorno e Histórico */}
                  <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-white border border-[#E7DCCE] text-center my-3">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-stone-500 block">
                        Visitas
                      </span>
                      <span className="font-bold text-xs text-[#2D1914]">
                        {clientAppointments.length || client.totalAppointments || 0}
                      </span>
                    </div>
                    <div className="border-x border-stone-100">
                      <span className="text-[10px] uppercase font-bold text-stone-500 block">
                        Investido
                      </span>
                      <span className="font-bold text-xs text-[#AD841D]">
                        {formatBRL(client.totalSpent || 0)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-stone-500 block">
                        Senha Login
                      </span>
                      <span className="text-[11px] font-mono font-semibold text-stone-600">
                        {client.password || "123"}
                      </span>
                    </div>
                  </div>

                  {client.lastServiceTitle && (
                    <p className="text-[11px] text-[#5E372C] leading-snug">
                      <strong className="text-[#2D1914]">Último serviço:</strong>{" "}
                      {client.lastServiceTitle}
                    </p>
                  )}

                  {client.notes && (
                    <p className="text-[11px] text-stone-500 line-clamp-2 mt-1 italic">
                      "{client.notes}"
                    </p>
                  )}
                </div>

                {/* Ações da Cliente */}
                <div className="pt-3 border-t border-[#E7DCCE]/60 flex items-center justify-between gap-2">
                  <button
                    onClick={() => setSelectedClientForDetails(client)}
                    className="px-3.5 py-1.5 text-xs font-semibold text-[#5E372C] bg-white hover:bg-[#F3ECE1] border border-[#E7DCCE] rounded-xl flex items-center gap-1.5 transition-all shadow-2xs"
                  >
                    <History className="w-3.5 h-3.5 text-[#AD841D]" />
                    <span>Ver Histórico Completo</span>
                  </button>

                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3.5 py-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl flex items-center gap-1.5 transition-all shadow-2xs"
                    title="Iniciar conversa no WhatsApp com mensagem personalizada"
                  >
                    <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                    <span>WhatsApp</span>
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL 1: HISTÓRICO COMPLETO DA CLIENTE */}
      {selectedClientForDetails && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-hidden">
          <div className="bg-[#FAF7F2] rounded-3xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-[#E7DCCE] overflow-hidden animate-scale-up">
            {/* Topo do Modal */}
            <div className="p-5 sm:p-6 bg-white border-b border-[#E7DCCE] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#FAF7F2] to-[#E7DCCE] border border-[#C59B27]/50 flex items-center justify-center font-editorial text-lg font-bold text-[#2D1914]">
                  {selectedClientForDetails.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-editorial text-xl font-bold text-[#2D1914]">
                    {selectedClientForDetails.name}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-[#683C30]">
                    <span>{selectedClientForDetails.phone}</span>
                    {selectedClientForDetails.email && (
                      <>
                        <span>•</span>
                        <span>{selectedClientForDetails.email}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <button
                onClick={() => setSelectedClientForDetails(null)}
                className="w-9 h-9 rounded-full bg-stone-100 hover:bg-stone-200 flex items-center justify-center text-stone-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Conteúdo do Histórico */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1 text-xs sm:text-sm">
              {/* Cartão de Acesso e Credencial */}
              <div className="p-4 rounded-2xl bg-white border border-[#E7DCCE] flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-[#AD841D] uppercase tracking-wider block">
                    Credencial de Auto-Agendamento
                  </span>
                  <span className="text-xs text-stone-600 block mt-0.5">
                    A cliente utiliza seu telefone e esta senha para agendar diretamente no catálogo.
                  </span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#FAF7F2] border border-[#E7DCCE]">
                  <KeyRound className="w-3.5 h-3.5 text-[#AD841D]" />
                  <span className="font-mono font-bold text-sm text-[#2D1914]">
                    {selectedClientForDetails.password || "123"}
                  </span>
                </div>
              </div>

              {/* 1. Agendamentos Realizados */}
              <div className="space-y-3">
                <h4 className="font-bold text-sm text-[#2D1914] flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-[#AD841D]" />
                  <span>Histórico de Agendamentos & Visitas</span>
                </h4>

                {(() => {
                  const cleanPhone = selectedClientForDetails.phone.replace(/\D/g, "");
                  const clientApts = appointments.filter(
                    (a) =>
                      a.clientPhone.replace(/\D/g, "") === cleanPhone ||
                      a.clientName.toLowerCase() === selectedClientForDetails.name.toLowerCase()
                  );

                  if (clientApts.length === 0) {
                    return (
                      <div className="p-4 rounded-xl bg-white border border-stone-200 text-xs text-stone-500 text-center">
                        Nenhum agendamento registrado ainda.
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-2">
                      {clientApts.map((apt) => (
                        <div
                          key={apt.id}
                          className="p-3.5 rounded-xl bg-white border border-[#E7DCCE] flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                        >
                          <div>
                            <span className="font-bold text-xs sm:text-sm text-[#2D1914] block">
                              {apt.serviceTitle}
                            </span>
                            <span className="text-[11px] text-stone-500 block">
                              Data: <strong>{apt.date}</strong> às <strong>{apt.startTime} - {apt.endTime}</strong> ({apt.totalDurationMin} min)
                            </span>
                            {apt.notes && (
                              <span className="text-[10px] text-amber-800 bg-amber-50 px-2 py-0.5 rounded mt-1 inline-block">
                                {apt.notes}
                              </span>
                            )}
                          </div>

                          <div className="text-right">
                            <span className="font-bold text-xs text-[#2D1914] block">
                              {formatBRL(apt.price)}
                            </span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-block ${
                                apt.status === "confirmed"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-stone-100 text-stone-600"
                              }`}
                            >
                              {apt.status === "confirmed" ? "Realizado / Confirmado" : apt.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>

              {/* 2. Propostas Comerciais Recebidas */}
              <div className="space-y-3">
                <h4 className="font-bold text-sm text-[#2D1914] flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-[#AD841D]" />
                  <span>Propostas Comerciais Personalizadas</span>
                </h4>

                {(() => {
                  const cleanPhone = selectedClientForDetails.phone.replace(/\D/g, "");
                  const clientProposals = proposals.filter(
                    (p) =>
                      p.clientPhone.replace(/\D/g, "") === cleanPhone ||
                      p.clientName.toLowerCase() === selectedClientForDetails.name.toLowerCase()
                  );

                  if (clientProposals.length === 0) {
                    return (
                      <div className="p-4 rounded-xl bg-white border border-stone-200 text-xs text-stone-500 text-center">
                        Nenhuma proposta comercial gerada para esta cliente.
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-2">
                      {clientProposals.map((prop) => (
                        <div
                          key={prop.id}
                          className="p-3.5 rounded-xl bg-white border border-[#E7DCCE] flex items-center justify-between"
                        >
                          <div>
                            <span className="font-bold text-xs text-[#2D1914] block">{prop.title}</span>
                            <span className="text-[11px] text-stone-500 block">{prop.subtitle}</span>
                            <span className="text-[10px] text-emerald-700 font-semibold">
                              Total: {formatBRL(prop.totalWithDiscount)} (Pix: {formatBRL(prop.pixTotal)})
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <a
                              href={`/proposta/${prop.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3 py-1.5 text-xs font-semibold text-[#2D1914] bg-[#FAF7F2] hover:bg-[#F3ECE1] border border-[#E7DCCE] rounded-xl flex items-center gap-1"
                            >
                              <ExternalLink className="w-3 h-3 text-[#AD841D]" />
                              <span>Ver Proposta Web</span>
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </div>

            <div className="p-4 sm:p-5 border-t border-[#E7DCCE] bg-stone-50 flex items-center justify-end">
              <button
                onClick={() => setSelectedClientForDetails(null)}
                className="px-5 py-2 text-xs font-bold text-[#2D1914] bg-white border border-[#E7DCCE] hover:bg-stone-100 rounded-xl"
              >
                Fechar Detalhes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: CADASTRAR NOVA CLIENTE */}
      {isNewClientModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-hidden">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-[#E7DCCE] overflow-hidden animate-scale-up">
            <div className="p-5 border-b border-[#E7DCCE] flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase tracking-widest text-[#AD841D] font-bold block">
                  Novo Cadastro
                </span>
                <h3 className="font-editorial text-xl font-bold text-[#2D1914]">
                  Cadastrar Cliente no Salão
                </h3>
              </div>
              <button
                onClick={() => setIsNewClientModalOpen(false)}
                className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 flex items-center justify-center text-stone-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateNewClient} className="p-6 space-y-4 text-xs sm:text-sm">
              <div>
                <label className="block text-xs font-semibold text-[#2D1914] mb-1">
                  Nome Completo da Cliente *
                </label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Ex: Amanda Souza"
                  className="w-full p-2.5 rounded-xl border border-[#E7DCCE] text-xs sm:text-sm focus:border-[#C59B27] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#2D1914] mb-1">
                  Telefone / WhatsApp com DDD *
                </label>
                <input
                  type="tel"
                  required
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="Ex: (11) 98765-4321"
                  className="w-full p-2.5 rounded-xl border border-[#E7DCCE] text-xs sm:text-sm focus:border-[#C59B27] outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#2D1914] mb-1">
                    Senha de Acesso *
                  </label>
                  <input
                    type="text"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Ex: 123456"
                    className="w-full p-2.5 rounded-xl border border-[#E7DCCE] text-xs font-mono font-bold focus:border-[#C59B27] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#2D1914] mb-1">
                    E-mail (opcional)
                  </label>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="cliente@email.com"
                    className="w-full p-2.5 rounded-xl border border-[#E7DCCE] text-xs focus:border-[#C59B27] outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#2D1914] mb-1">
                  Anotações Técnicas da Profissional (opcional)
                </label>
                <textarea
                  rows={2}
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="Ex: Fios finos, curvatura 3A, sem químicas recentes..."
                  className="w-full p-2.5 rounded-xl border border-[#E7DCCE] text-xs focus:border-[#C59B27] outline-none"
                />
              </div>

              <div className="pt-4 flex items-center justify-end gap-2 border-t border-[#E7DCCE]/60">
                <button
                  type="button"
                  onClick={() => setIsNewClientModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 text-xs font-bold text-white chocolate-gradient rounded-xl shadow-sm hover:opacity-95 transition-all"
                >
                  {isSaving ? "Salvando..." : "Salvar Cadastro"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
