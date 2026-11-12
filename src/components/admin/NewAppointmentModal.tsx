"use client";

import { useState, useMemo, useEffect } from "react";
import { ServiceItem } from "@/types/service";
import { Appointment, AppointmentProcedureItem, ScheduledStepBlock } from "@/types/appointment";
import { SalonClient } from "@/types/client";
import { SalonStore } from "@/lib/storage/localStore";
import { formatBRL } from "@/lib/utils";
import {
  calculateProceduresBill,
  calculateProceduresDuration,
} from "@/lib/appointments/billing";
import {
  X,
  Calendar,
  Clock,
  Sparkles,
  Scissors,
  CheckCircle2,
  Search,
  UserCheck,
  Plus,
  Trash2,
  DollarSign,
  Tag,
  Layers,
} from "lucide-react";

interface NewAppointmentModalProps {
  services: ServiceItem[];
  clients?: SalonClient[];
  prefilledDate?: string;
  prefilledTime?: string;
  prefilledClientName?: string;
  prefilledClientPhone?: string;
  prefilledServiceId?: string;
  appointmentToEdit?: Appointment | null;
  onSave: (appointment: Appointment) => void;
  onClose: () => void;
}

export function NewAppointmentModal({
  services,
  clients,
  prefilledDate,
  prefilledTime = "09:00",
  prefilledClientName = "",
  prefilledClientPhone = "",
  prefilledServiceId,
  appointmentToEdit,
  onSave,
  onClose,
}: NewAppointmentModalProps) {
  const [clientName, setClientName] = useState(
    appointmentToEdit?.clientName || prefilledClientName || ""
  );
  const [clientPhone, setClientPhone] = useState(
    appointmentToEdit?.clientPhone || prefilledClientPhone || ""
  );
  const [date, setDate] = useState(appointmentToEdit?.date || prefilledDate || "");
  const [time, setTime] = useState(appointmentToEdit?.startTime || prefilledTime);
  const [notes, setNotes] = useState(appointmentToEdit?.notes || "");

  // R8: Lista de Procedimentos Múltiplos (Procedure Builder)
  const [procedures, setProcedures] = useState<AppointmentProcedureItem[]>(() => {
    if (appointmentToEdit?.procedures && appointmentToEdit.procedures.length > 0) {
      return appointmentToEdit.procedures;
    }
    if (appointmentToEdit) {
      return [
        {
          id: `proc-1`,
          serviceId: appointmentToEdit.serviceId,
          title: appointmentToEdit.serviceTitle || "Procedimento Principal",
          durationMin: appointmentToEdit.totalDurationMin || 60,
          price: appointmentToEdit.price || 0,
          isIncluded: false,
        },
      ];
    }
    const initialSrv = services.find((s) => s.id === prefilledServiceId) || services[0];
    const initialPrice = initialSrv ? (initialSrv.promotionalPrice || initialSrv.price) : 0;
    const initialDur = initialSrv?.steps?.reduce((acc, st) => acc + st.durationMin, 0) || 60;
    return [
      {
        id: `proc-1`,
        serviceId: initialSrv?.id,
        title: initialSrv?.title || "Atendimento Personalizado",
        durationMin: initialDur,
        price: initialPrice,
        isIncluded: false,
      },
    ];
  });

  // Cálculos dinâmicos via funções de faturamento (R8.2)
  const calculatedBill = useMemo(() => calculateProceduresBill(procedures), [procedures]);
  const calculatedDuration = useMemo(() => calculateProceduresDuration(procedures), [procedures]);

  // Valor final customizável / editável pela profissional
  const [customFinalPrice, setCustomFinalPrice] = useState<string>(() => {
    if (appointmentToEdit) {
      return String(appointmentToEdit.finalPrice ?? appointmentToEdit.price ?? 0);
    }
    return String(calculatedBill);
  });
  const [isPriceManuallyOverridden, setIsPriceManuallyOverridden] = useState(false);

  // Sincroniza valor sugerido quando a lista de procedimentos muda e o usuário não editou manualmente
  useEffect(() => {
    if (!isPriceManuallyOverridden && !appointmentToEdit) {
      setCustomFinalPrice(String(calculatedBill));
    }
  }, [calculatedBill, isPriceManuallyOverridden, appointmentToEdit]);

  useEffect(() => {
    if (!appointmentToEdit && !prefilledDate) {
      const now = new Date();
      const y = now.getFullYear();
      const m = String(now.getMonth() + 1).padStart(2, "0");
      const d = String(now.getDate()).padStart(2, "0");
      setDate(`${y}-${m}-${d}`);
    } else if (appointmentToEdit) {
      setDate(appointmentToEdit.date);
    } else if (prefilledDate) {
      setDate(prefilledDate);
    }
  }, [prefilledDate, appointmentToEdit]);

  useEffect(() => {
    if (appointmentToEdit) {
      setClientName(appointmentToEdit.clientName);
      setClientPhone(appointmentToEdit.clientPhone);
      setDate(appointmentToEdit.date);
      setTime(appointmentToEdit.startTime);
      setNotes(appointmentToEdit.notes || "");
      if (appointmentToEdit.procedures && appointmentToEdit.procedures.length > 0) {
        setProcedures(appointmentToEdit.procedures);
      }
      setCustomFinalPrice(String(appointmentToEdit.finalPrice ?? appointmentToEdit.price ?? 0));
    } else {
      if (prefilledClientName) setClientName(prefilledClientName);
      if (prefilledClientPhone) setClientPhone(prefilledClientPhone);
      if (prefilledTime) setTime(prefilledTime);
    }
  }, [appointmentToEdit, prefilledClientName, prefilledClientPhone, prefilledTime]);

  // Autocomplete de clientes
  const [clientSearchQuery, setClientSearchQuery] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [clientList, setClientList] = useState<SalonClient[]>(() => {
    if (clients && clients.length > 0) return clients;
    return typeof window !== "undefined" ? SalonStore.getClients() : [];
  });

  useEffect(() => {
    if (clients && clients.length > 0) {
      setClientList(clients);
    } else {
      setClientList(SalonStore.getClients());
    }
  }, [clients]);

  // Filtra clientes quando digitado 3+ caracteres
  const searchResults = useMemo(() => {
    const q = clientSearchQuery.trim().toLowerCase();
    if (q.length < 3) return [];
    return clientList.filter((c) => {
      const cleanPhone = c.phone.replace(/\D/g, "");
      const cleanQ = q.replace(/\D/g, "");
      return (
        c.name.toLowerCase().includes(q) ||
        (cleanQ.length >= 2 && cleanPhone.includes(cleanQ)) ||
        (c.email && c.email.toLowerCase().includes(q))
      );
    });
  }, [clientList, clientSearchQuery]);

  const handleSelectClient = (c: SalonClient) => {
    setClientName(c.name);
    setClientPhone(c.phone);
    setClientSearchQuery(c.name);
    setIsDropdownOpen(false);
  };

  // Funções de Gerenciamento de Procedimentos Múltiplos
  const [selectedCatalogServiceId, setSelectedCatalogServiceId] = useState<string>("");

  const handleAddFromCatalog = () => {
    if (!selectedCatalogServiceId) return;
    const srv = services.find((s) => s.id === selectedCatalogServiceId);
    if (!srv) return;
    const dur = srv.steps?.reduce((sum, st) => sum + st.durationMin, 0) || 45;
    const price = srv.promotionalPrice || srv.price || 0;

    setProcedures((prev) => [
      ...prev,
      {
        id: `proc-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        serviceId: srv.id,
        title: srv.title,
        durationMin: dur,
        price: price,
        isIncluded: false,
      },
    ]);
    setSelectedCatalogServiceId("");
  };

  const handleAddCustomProcedure = () => {
    setProcedures((prev) => [
      ...prev,
      {
        id: `proc-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        title: "Procedimento Avulso",
        durationMin: 30,
        price: 0,
        isIncluded: false,
      },
    ]);
  };

  const handleUpdateProcedure = (
    index: number,
    field: keyof AppointmentProcedureItem,
    value: any
  ) => {
    setProcedures((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleRemoveProcedure = (index: number) => {
    setProcedures((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName || !clientPhone || procedures.length === 0) return;

    const totalDuration = calculatedDuration > 0 ? calculatedDuration : 60;

    // Converte time HH:mm para end time
    const [h, m] = time.split(":").map(Number);
    const startMinutes = (h || 9) * 60 + (m || 0);
    const endMinutes = startMinutes + totalDuration;
    const endH = Math.floor(endMinutes / 60) % 24;
    const endM = endMinutes % 60;
    const endTimeStr = `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;

    // Gera os step blocks alinhados aos procedimentos
    let cursor = startMinutes;
    const blocks: ScheduledStepBlock[] = [];

    procedures.forEach((proc, pIdx) => {
      const matchingService = services.find(
        (s) => s.id === proc.serviceId || s.title.toLowerCase() === proc.title.toLowerCase()
      );
      if (matchingService && matchingService.steps && matchingService.steps.length > 0) {
        matchingService.steps.forEach((st, sIdx) => {
          const stepStart = cursor;
          const stepEnd = cursor + st.durationMin;
          cursor = stepEnd;
          blocks.push({
            id: `blk-${Date.now()}-${pIdx}-${sIdx}`,
            stepId: st.id,
            stepTitle: `${proc.title}: ${st.title}`,
            type: st.type,
            startTime: `${String(Math.floor(stepStart / 60)).padStart(2, "0")}:${String(stepStart % 60).padStart(2, "0")}`,
            endTime: `${String(Math.floor(stepEnd / 60)).padStart(2, "0")}:${String(stepEnd % 60).padStart(2, "0")}`,
            durationMin: st.durationMin,
            maxPauseDurationMin: st.maxPauseDurationMin,
            isParallelSlotAllowed: st.type === "pause",
          });
        });
      } else {
        const stepStart = cursor;
        const dur = proc.durationMin || 30;
        const stepEnd = cursor + dur;
        cursor = stepEnd;
        blocks.push({
          id: `blk-${Date.now()}-${pIdx}`,
          stepId: proc.id || `step-${pIdx}`,
          stepTitle: proc.title,
          type: "active",
          startTime: `${String(Math.floor(stepStart / 60)).padStart(2, "0")}:${String(stepStart % 60).padStart(2, "0")}`,
          endTime: `${String(Math.floor(stepEnd / 60)).padStart(2, "0")}:${String(stepEnd % 60).padStart(2, "0")}`,
          durationMin: dur,
          isParallelSlotAllowed: false,
        });
      }
    });

    const parsedPrice = parseFloat(customFinalPrice);
    const finalPrice = isNaN(parsedPrice) ? calculatedBill : parsedPrice;

    const mainTitle =
      procedures.length === 1
        ? procedures[0].title
        : procedures.map((p) => p.title).join(" + ");

    const primaryServiceId = procedures[0]?.serviceId || services[0]?.id || "srv-custom";

    if (appointmentToEdit) {
      const updatedApt: Appointment = {
        ...appointmentToEdit,
        serviceId: primaryServiceId,
        serviceTitle: mainTitle,
        clientName,
        clientPhone,
        date,
        startTime: time,
        endTime: endTimeStr,
        totalDurationMin: totalDuration,
        stepBlocks: blocks,
        procedures,
        price: finalPrice,
        finalPrice: finalPrice,
        notes,
      };
      onSave(updatedApt);
      return;
    }

    const newApt: Appointment = {
      id: `apt-${Date.now()}`,
      orgId: services[0]?.orgId || "11111111-1111-4111-8111-111111111111",
      professionalId: services[0]?.professionalId || "58f26242-1e53-432e-b924-dea25ee2068a",
      professionalName: "Gleicy Ronha",
      serviceId: primaryServiceId,
      serviceTitle: mainTitle,
      clientName,
      clientPhone,
      date,
      startTime: time,
      endTime: endTimeStr,
      totalDurationMin: totalDuration,
      status: "confirmed",
      procedures,
      price: finalPrice,
      finalPrice: finalPrice,
      paymentStatus: "pending",
      stepBlocks: blocks,
      notes,
      createdAt: new Date().toISOString(),
    };

    onSave(newApt);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-hidden">
      <div className="bg-white rounded-t-[28px] sm:rounded-3xl rounded-b-none sm:rounded-b-3xl max-w-2xl w-full max-h-[94vh] sm:max-h-[92vh] flex flex-col shadow-2xl border-t border-x sm:border border-[#E7DCCE] animate-slide-up-sheet overflow-hidden">
        {/* Puxador Visual Mobile */}
        <div className="w-12 h-1.5 bg-[#D8D0BD] rounded-full mx-auto my-2.5 sm:hidden shrink-0" />

        <div className="flex items-center justify-between border-b border-[#E7DCCE]/60 px-5 sm:px-8 py-3.5 sm:py-4 shrink-0 bg-white">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-widest text-[#AD841D] block">
              {appointmentToEdit ? "Edição de Atendimento" : "Agendamento Direto Personalizado"}
            </span>
            <h3 className="text-lg sm:text-xl font-bold text-[#2D1914]">
              {appointmentToEdit ? "Editar Atendimento" : "Novo Atendimento com Procedimentos"}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 flex items-center justify-center text-stone-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto px-5 sm:px-8 py-4 space-y-5 text-xs no-scrollbar sm:scrollbar-thin">
            {/* SEÇÃO 1: CONSTRUTOR DE MÚLTIPLOS PROCEDIMENTOS (R8) */}
            <div data-tutorial="appointment-procedures-builder" className="p-4 rounded-2xl bg-[#FFFDF9] border border-[#C59B27]/40 space-y-3.5">
              <div className="flex items-center justify-between border-b border-[#E7DCCE]/70 pb-2.5">
                <div className="flex items-center gap-2">
                  <Scissors className="w-4 h-4 text-[#C59B27]" />
                  <h4 className="font-bold text-xs sm:text-sm text-[#2D1914]">
                    Procedimentos do Atendimento ({procedures.length})
                  </h4>
                </div>
                <span className="text-[10px] font-semibold text-stone-500">
                  Adicione, edite durações ou marque itens como inclusos
                </span>
              </div>

              {/* Tabela / Lista de Itens do Procedimento */}
              <div className="space-y-2.5">
                {procedures.map((proc, index) => (
                  <div
                    key={proc.id || index}
                    className="p-3 bg-white rounded-xl border border-[#E7DCCE] shadow-2xs space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-bold text-[#AD841D] uppercase">
                        Item #{index + 1}
                      </span>
                      {procedures.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveProcedure(index)}
                          className="p-1 text-stone-400 hover:text-red-600 transition-colors"
                          title="Remover procedimento"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center">
                      {/* Título do Procedimento */}
                      <div className="sm:col-span-5">
                        <label className="text-[10px] text-stone-500 block mb-0.5">Procedimento</label>
                        <input
                          type="text"
                          required
                          value={proc.title}
                          onChange={(e) => handleUpdateProcedure(index, "title", e.target.value)}
                          placeholder="Nome do procedimento"
                          className="w-full p-2 rounded-lg border border-[#E7DCCE] bg-stone-50 focus:bg-white text-xs font-semibold text-[#2D1914] outline-none"
                        />
                      </div>

                      {/* Duração em minutos */}
                      <div className="sm:col-span-2">
                        <label className="text-[10px] text-stone-500 block mb-0.5">Duração (min)</label>
                        <div className="relative">
                          <input
                            type="number"
                            min={5}
                            step={5}
                            required
                            value={proc.durationMin}
                            onChange={(e) =>
                              handleUpdateProcedure(index, "durationMin", Number(e.target.value) || 0)
                            }
                            className="w-full p-2 rounded-lg border border-[#E7DCCE] bg-stone-50 focus:bg-white text-xs text-center font-bold text-[#2D1914] outline-none"
                          />
                        </div>
                      </div>

                      {/* Valor do Item */}
                      <div className="sm:col-span-2">
                        <label className="text-[10px] text-stone-500 block mb-0.5">Valor (R$)</label>
                        <input
                          type="number"
                          min={0}
                          step={1}
                          disabled={proc.isIncluded}
                          value={proc.isIncluded ? 0 : proc.price}
                          onChange={(e) =>
                            handleUpdateProcedure(index, "price", Number(e.target.value) || 0)
                          }
                          className={`w-full p-2 rounded-lg border border-[#E7DCCE] text-xs font-bold text-right outline-none ${
                            proc.isIncluded
                              ? "bg-stone-100 text-stone-400 cursor-not-allowed"
                              : "bg-stone-50 focus:bg-white text-[#2D1914]"
                          }`}
                        />
                      </div>

                      {/* Toggle Cobrado / Incluso */}
                      <div className="sm:col-span-3">
                        <label className="text-[10px] text-stone-500 block mb-0.5">Cobrança</label>
                        <button
                          type="button"
                          onClick={() => handleUpdateProcedure(index, "isIncluded", !proc.isIncluded)}
                          className={`w-full p-2 rounded-lg text-[10px] font-extrabold border transition-all text-center ${
                            proc.isIncluded
                              ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                              : "bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100"
                          }`}
                        >
                          {proc.isIncluded ? "✓ Incluso / Avulso" : "Cobrar no Total"}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Botões para Adicionar Procedimentos */}
              <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-[#E7DCCE]/60">
                <div className="flex-1 min-w-[200px] flex items-center gap-1.5">
                  <select
                    value={selectedCatalogServiceId}
                    onChange={(e) => setSelectedCatalogServiceId(e.target.value)}
                    className="flex-1 p-2 rounded-xl border border-[#E7DCCE] bg-white text-xs font-medium text-[#2D1914] outline-none"
                  >
                    <option value="">-- Adicionar do Catálogo --</option>
                    {services.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.title} — {formatBRL(s.price)} ({s.steps?.reduce((sum, st) => sum + st.durationMin, 0) || 60}min)
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    disabled={!selectedCatalogServiceId}
                    onClick={handleAddFromCatalog}
                    className="px-3 py-2 bg-[#1D3D3C] hover:bg-[#16302f] disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shrink-0"
                  >
                    + Adicionar
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleAddCustomProcedure}
                  className="px-3 py-2 bg-white hover:bg-[#FAF7F2] text-[#80611F] border border-[#C59B27]/50 rounded-xl text-xs font-bold transition-all flex items-center gap-1 shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Procedimento Avulso</span>
                </button>
              </div>

              {/* BARRA DE RESUMO FINANCEIRO E TEMPO (R8.2) */}
              <div className="p-3 bg-white rounded-xl border border-[#D8D0BD] grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
                <div className="text-center sm:text-left">
                  <span className="text-[10px] uppercase font-bold text-stone-500 block">Duração Total</span>
                  <span className="font-bold text-sm text-[#1D3D3C] flex items-center gap-1 justify-center sm:justify-start">
                    <Clock className="w-3.5 h-3.5 text-[#C7A03A]" />
                    {calculatedDuration} minutos
                  </span>
                </div>

                <div className="text-center sm:text-left">
                  <span className="text-[10px] uppercase font-bold text-stone-500 block">Soma Calculada</span>
                  <span className="font-bold text-sm text-stone-700">
                    {formatBRL(calculatedBill)}
                  </span>
                </div>

                <div className="text-center sm:text-right">
                  <span className="text-[10px] uppercase font-bold text-emerald-800 block">
                    Valor Final Cobrado (R$) *
                  </span>
                  <div className="inline-flex items-center gap-1 justify-center sm:justify-end">
                    <span className="text-xs font-bold text-emerald-800">R$</span>
                    <input
                      type="number"
                      min={0}
                      step={1}
                      value={customFinalPrice}
                      onChange={(e) => {
                        setCustomFinalPrice(e.target.value);
                        setIsPriceManuallyOverridden(true);
                      }}
                      className="w-24 p-1.5 rounded-lg border border-emerald-300 bg-emerald-50 text-right font-bold text-sm text-emerald-900 outline-none focus:bg-white"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* SEÇÃO 2: DADOS DA CLIENTE */}
            <div className="relative">
              <div className="flex items-center justify-between mb-1">
                <label className="block font-semibold text-[#2D1914]">
                  Buscar cliente cadastrada
                </label>
                <span className="text-[10px] text-stone-500">
                  (opcional — digite 3+ letras)
                </span>
              </div>

              <div className="relative">
                <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={clientSearchQuery}
                  onChange={(e) => {
                    setClientSearchQuery(e.target.value);
                    setIsDropdownOpen(true);
                  }}
                  onFocus={() => setIsDropdownOpen(true)}
                  placeholder="Buscar por nome ou telefone..."
                  className="w-full pl-8 pr-3 py-2 rounded-xl border border-[#E7DCCE] bg-[#FAF7F2]/60 focus:bg-white focus:border-[#C59B27] outline-none text-xs"
                />
                {clientSearchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setClientSearchQuery("");
                      setIsDropdownOpen(false);
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Dropdown de sugestões */}
              {isDropdownOpen && clientSearchQuery.trim().length >= 3 && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-xl border border-[#E7DCCE] shadow-xl max-h-48 overflow-y-auto z-30 p-1.5 space-y-1">
                  {searchResults.length > 0 ? (
                    searchResults.map((c) => {
                      const last4 = c.phone.replace(/\D/g, "").slice(-4);
                      const isVip =
                        (c.totalAppointments || 0) >= 2 ||
                        (c.totalSpent || 0) >= 500;
                      const isReturn =
                        c.lastVisitAt &&
                        Math.floor(
                          (Date.now() - new Date(c.lastVisitAt).getTime()) /
                            (1000 * 60 * 60 * 24)
                        ) > 45;

                      return (
                        <button
                          key={c.id || c.phone}
                          type="button"
                          onClick={() => handleSelectClient(c)}
                          className="w-full text-left p-2 rounded-lg hover:bg-[#FAF7F2] flex items-center justify-between text-xs transition-colors border border-transparent hover:border-[#E7DCCE]"
                        >
                          <div>
                            <span className="font-bold text-[#2D1914] block">
                              {c.name}
                            </span>
                            <span className="text-[11px] text-stone-500">
                              WhatsApp: ••••-{last4}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            {isVip && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300">
                                VIP
                              </span>
                            )}
                            {isReturn && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-300">
                                Retorno
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })
                  ) : (
                    <div className="p-3 text-center text-[11px] text-stone-600">
                      <span className="font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded-full mr-1.5 inline-block">
                        Nova cliente
                      </span>
                      <span>Nenhum cadastro encontrado. Preencha manualmente abaixo.</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-[#2D1914] mb-1">Nome da Cliente *</label>
                <input
                  type="text"
                  required
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Ex: Vanessa Guimarães"
                  className="w-full p-2.5 rounded-xl border border-[#E7DCCE] outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#2D1914] mb-1">WhatsApp *</label>
                <input
                  type="tel"
                  required
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  placeholder="(11) 98765-4321"
                  className="w-full p-2.5 rounded-xl border border-[#E7DCCE] outline-none"
                />
              </div>
            </div>

            {/* SEÇÃO 3: DATA, HORÁRIO E NOTAS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-[#2D1914] mb-1">Data</label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-[#E7DCCE] outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#2D1914] mb-1">Horário de Início</label>
                <input
                  type="time"
                  required
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-[#E7DCCE] outline-none font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-[#2D1914] mb-1">Observações Internas</label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ex: Cabelo 3C, cliente prefere difusor mais quente..."
                className="w-full p-2.5 rounded-xl border border-[#E7DCCE] outline-none"
              />
            </div>
          </div>

          <div className="pt-3 pb-6 sm:py-4 px-5 sm:px-8 border-t border-[#E7DCCE]/60 flex items-center justify-end space-x-2 shrink-0 bg-white">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 font-semibold text-stone-600 hover:bg-stone-100 rounded-xl transition-colors"
            >
              Cancelar
            </button>

            <button
              type="submit"
              className="px-6 py-2.5 font-bold text-white gold-gradient rounded-xl shadow-xs hover:opacity-95 transition-all active:scale-95"
            >
              {appointmentToEdit ? "Salvar Alterações" : "Confirmar Agendamento"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
