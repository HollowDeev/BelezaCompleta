"use client";

import { useState, useMemo, useEffect } from "react";
import { ServiceItem } from "@/types/service";
import { Appointment } from "@/types/appointment";
import { SalonClient } from "@/types/client";
import { SalonStore } from "@/lib/storage/localStore";
import { formatBRL } from "@/lib/utils";
import { X, Calendar, Clock, Sparkles, Scissors, CheckCircle2, Search, UserCheck } from "lucide-react";

interface NewAppointmentModalProps {
  services: ServiceItem[];
  clients?: SalonClient[];
  prefilledDate?: string;
  prefilledTime?: string;
  prefilledClientName?: string;
  prefilledClientPhone?: string;
  prefilledServiceId?: string;
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
  onSave,
  onClose,
}: NewAppointmentModalProps) {
  const [selectedServiceId, setSelectedServiceId] = useState<string>(
    prefilledServiceId || services[0]?.id || ""
  );
  const [clientName, setClientName] = useState(prefilledClientName);
  const [clientPhone, setClientPhone] = useState(prefilledClientPhone);
  const [date, setDate] = useState(prefilledDate || "");
  const [time, setTime] = useState(prefilledTime);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!prefilledDate) {
      const now = new Date();
      const y = now.getFullYear();
      const m = String(now.getMonth() + 1).padStart(2, "0");
      const d = String(now.getDate()).padStart(2, "0");
      setDate(`${y}-${m}-${d}`);
    } else {
      setDate(prefilledDate);
    }
  }, [prefilledDate]);

  useEffect(() => {
    if (prefilledClientName) setClientName(prefilledClientName);
    if (prefilledClientPhone) setClientPhone(prefilledClientPhone);
    if (prefilledServiceId) setSelectedServiceId(prefilledServiceId);
    if (prefilledTime) setTime(prefilledTime);
  }, [prefilledClientName, prefilledClientPhone, prefilledServiceId, prefilledTime]);

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

  const selectedService =
    services.find((s) => s.id === selectedServiceId) || services[0];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName || !clientPhone || !selectedService) return;

    const totalDuration = selectedService.steps.reduce(
      (sum, s) => sum + s.durationMin,
      0
    );

    // Converte time HH:mm para end time
    const [h, m] = time.split(":").map(Number);
    const startMinutes = h * 60 + m;
    const endMinutes = startMinutes + totalDuration;
    const endH = Math.floor(endMinutes / 60);
    const endM = endMinutes % 60;
    const endTimeStr = `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;

    // Gera os step blocks alinhados ao serviço
    let cursor = startMinutes;
    const blocks = selectedService.steps.map((st) => {
      const stepStart = cursor;
      const stepEnd = cursor + st.durationMin;
      cursor = stepEnd;
      return {
        id: `blk-${Date.now()}-${st.id}`,
        stepId: st.id,
        stepTitle: st.title,
        type: st.type,
        startTime: `${String(Math.floor(stepStart / 60)).padStart(2, "0")}:${String(stepStart % 60).padStart(2, "0")}`,
        endTime: `${String(Math.floor(stepEnd / 60)).padStart(2, "0")}:${String(stepEnd % 60).padStart(2, "0")}`,
        durationMin: st.durationMin,
        maxPauseDurationMin: st.maxPauseDurationMin,
        isParallelSlotAllowed: st.type === "pause",
      };
    });

    const newApt: Appointment = {
      id: `apt-${Date.now()}`,
      orgId: selectedService.orgId || "11111111-1111-4111-8111-111111111111",
      professionalId: selectedService.professionalId || "58f26242-1e53-432e-b924-dea25ee2068a",
      professionalName: "Gleicy Ronha",
      serviceId: selectedService.id,
      serviceTitle: selectedService.title,
      clientName,
      clientPhone,
      date,
      startTime: time,
      endTime: endTimeStr,
      totalDurationMin: totalDuration,
      status: "confirmed",
      price: selectedService.promotionalPrice || selectedService.price,
      paymentStatus: "pending",
      stepBlocks: blocks,
      notes,
      createdAt: new Date().toISOString(),
    };

    onSave(newApt);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-hidden">
      <div className="bg-white rounded-t-[28px] sm:rounded-3xl rounded-b-none sm:rounded-b-3xl max-w-lg w-full max-h-[92vh] sm:max-h-[90vh] flex flex-col shadow-2xl border-t border-x sm:border border-[#E7DCCE] animate-slide-up-sheet overflow-hidden">
        {/* Puxador Visual Mobile (Bottom Sheet Handle) */}
        <div className="w-12 h-1.5 bg-[#D8D0BD] rounded-full mx-auto my-2.5 sm:hidden shrink-0" />

        <div className="flex items-center justify-between border-b border-[#E7DCCE]/60 px-5 sm:px-8 py-3.5 sm:py-4 shrink-0 bg-white">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-widest text-[#AD841D] block">
              Agendamento Direto
            </span>
            <h3 className="text-lg sm:text-xl font-bold text-[#2D1914]">Novo Atendimento</h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 flex items-center justify-center text-stone-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto px-5 sm:px-8 py-4 space-y-4 text-xs no-scrollbar sm:scrollbar-thin">
            <div>
              <label className="block font-semibold text-[#2D1914] mb-1">Procedimento</label>
            <select
              value={selectedServiceId}
              onChange={(e) => setSelectedServiceId(e.target.value)}
              className="w-full p-3 rounded-xl border border-[#E7DCCE] bg-white font-medium text-[#2D1914] outline-none"
            >
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title} — {formatBRL(s.price)}
                </option>
              ))}
            </select>
          </div>

          {/* Autocomplete de Clientes Cadastradas */}
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

          <div className="grid grid-cols-2 gap-3">
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

          <div className="grid grid-cols-2 gap-3">
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
              Confirmar Agendamento
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
