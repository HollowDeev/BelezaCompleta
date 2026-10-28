"use client";

import { useState } from "react";
import { ServiceItem } from "@/types/service";
import { Appointment } from "@/types/appointment";
import { formatBRL } from "@/lib/utils";
import { X, Calendar, Clock, Sparkles, Scissors, CheckCircle2 } from "lucide-react";

interface NewAppointmentModalProps {
  services: ServiceItem[];
  prefilledDate?: string;
  prefilledTime?: string;
  onSave: (appointment: Appointment) => void;
  onClose: () => void;
}

export function NewAppointmentModal({
  services,
  prefilledDate = "2026-10-17",
  prefilledTime = "09:00",
  onSave,
  onClose,
}: NewAppointmentModalProps) {
  const [selectedServiceId, setSelectedServiceId] = useState<string>(
    services[0]?.id || ""
  );
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [date, setDate] = useState(prefilledDate);
  const [time, setTime] = useState(prefilledTime);
  const [notes, setNotes] = useState("");

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
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-[#E7DCCE] animate-scale-up">
        <div className="flex items-center justify-between border-b border-[#E7DCCE]/60 pb-4 mb-5">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-widest text-[#AD841D] block">
              Agendamento Direto
            </span>
            <h3 className="text-xl font-bold text-[#2D1914]">Novo Atendimento</h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 flex items-center justify-center text-stone-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
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

          <div className="pt-4 border-t border-[#E7DCCE]/60 flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 font-semibold text-stone-600 hover:bg-stone-100 rounded-xl"
            >
              Cancelar
            </button>

            <button
              type="submit"
              className="px-6 py-2.5 font-bold text-white gold-gradient rounded-xl shadow-xs hover:opacity-95"
            >
              Confirmar Agendamento
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
