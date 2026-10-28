"use client";

import { DashboardMode } from "@/types/salon";
import { Appointment } from "@/types/appointment";
import { ServiceItem } from "@/types/service";
import { formatBRL } from "@/lib/utils";
import {
  DollarSign,
  TrendingUp,
  Percent,
  CreditCard,
  QrCode,
  Package,
  Layers,
  ArrowUpRight,
} from "lucide-react";

interface FinancialOverviewProps {
  mode: DashboardMode;
  appointments: Appointment[];
  services: ServiceItem[];
}

export function FinancialOverview({
  mode,
  appointments,
  services,
}: FinancialOverviewProps) {
  // Cálculos consolidados
  const completedOrConfirmed = appointments.filter(
    (a) => a.status === "confirmed" || a.status === "completed" || a.status === "proposal_sent"
  );

  const totalGrossRevenue = completedOrConfirmed.reduce((sum, a) => sum + a.price, 0);

  // Divisão Pix vs Cartão estimada
  const pixRevenue = completedOrConfirmed
    .filter((a) => a.paymentMethod === "pix" || a.price < 500)
    .reduce((sum, a) => sum + a.price, 0);

  const cardRevenue = totalGrossRevenue - pixRevenue;

  const averageTicket =
    completedOrConfirmed.length > 0
      ? totalGrossRevenue / completedOrConfirmed.length
      : 0;

  // Custos de Insumos (Produtos Químicos) para o Modo Avançado
  let totalProductCosts = 0;
  for (const apt of completedOrConfirmed) {
    const srv = services.find((s) => s.id === apt.serviceId);
    if (srv?.productCosts) {
      totalProductCosts += srv.productCosts.reduce(
        (sum, c) => sum + c.estimatedCost,
        0
      );
    } else {
      totalProductCosts += apt.price * 0.12; // Média de 12% em insumos
    }
  }

  const estimatedCardFees = cardRevenue * 0.028; // Taxa maquininha média 2.8%
  const netProfit = totalGrossRevenue - totalProductCosts - estimatedCardFees;
  const profitMarginPercent =
    totalGrossRevenue > 0 ? Math.round((netProfit / totalGrossRevenue) * 100) : 0;

  // VISÃO 1: MINIMALISTA
  if (mode === "minimalist") {
    return (
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-[#E7DCCE] shadow-2xs">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-widest text-[#AD841D]">
              Faturamento Previsto do Mês
            </span>
            <div className="font-editorial text-2xl sm:text-3xl font-bold text-[#2D1914] mt-0.5">
              {formatBRL(totalGrossRevenue)}
            </div>
          </div>
          <div className="text-right">
            <span className="text-xs text-stone-500 block">Atendimentos no Mês:</span>
            <span className="text-sm font-bold text-[#44271F]">
              {completedOrConfirmed.length} clientes
            </span>
          </div>
        </div>
      </div>
    );
  }

  // VISÃO 2: INTERMEDIÁRIA (PADRÃO RECOMENDADO)
  if (mode === "intermediary") {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Faturamento Bruto */}
        <div className="p-5 rounded-3xl bg-white border border-[#E7DCCE] shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] uppercase font-bold tracking-widest text-[#AD841D]">
              Faturamento Bruto
            </span>
            <div className="w-8 h-8 rounded-full bg-amber-50 text-[#C59B27] flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="font-editorial text-2xl sm:text-3xl font-bold text-[#2D1914]">
            {formatBRL(totalGrossRevenue)}
          </div>
          <span className="text-[10px] text-stone-500 mt-1">
            {completedOrConfirmed.length} agendamentos considerados
          </span>
        </div>

        {/* Ticket Médio */}
        <div className="p-5 rounded-3xl bg-white border border-[#E7DCCE] shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] uppercase font-bold tracking-widest text-[#AD841D]">
              Ticket Médio / Cliente
            </span>
            <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="font-editorial text-2xl sm:text-3xl font-bold text-[#2D1914]">
            {formatBRL(averageTicket)}
          </div>
          <span className="text-[10px] text-emerald-700 font-medium mt-1">
            Alta conversão em pacotes completos
          </span>
        </div>

        {/* Divisão Pix com Desconto */}
        <div className="p-5 rounded-3xl bg-white border border-[#E7DCCE] shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] uppercase font-bold tracking-widest text-[#AD841D]">
              Recebido via Pix
            </span>
            <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-700 flex items-center justify-center">
              <QrCode className="w-4 h-4" />
            </div>
          </div>
          <div className="font-editorial text-2xl sm:text-3xl font-bold text-[#2D1914]">
            {formatBRL(pixRevenue)}
          </div>
          <span className="text-[10px] text-stone-500 mt-1">Liquidez imediata</span>
        </div>

        {/* Cartão de Crédito */}
        <div className="p-5 rounded-3xl bg-white border border-[#E7DCCE] shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] uppercase font-bold tracking-widest text-[#AD841D]">
              Cartão de Crédito
            </span>
            <div className="w-8 h-8 rounded-full bg-purple-50 text-purple-700 flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="font-editorial text-2xl sm:text-3xl font-bold text-[#2D1914]">
            {formatBRL(cardRevenue)}
          </div>
          <span className="text-[10px] text-stone-500 mt-1">Parcelamento do salão</span>
        </div>
      </div>
    );
  }

  // VISÃO 3: AVANÇADA (DRE & CUSTOS DE INSUMOS)
  return (
    <div className="space-y-4">
      {/* Cards de Topo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-3xl bg-white border border-[#E7DCCE] shadow-2xs">
          <span className="text-[10px] uppercase font-bold tracking-widest text-stone-500">
            Faturamento Bruto
          </span>
          <div className="font-editorial text-2xl font-bold text-[#2D1914] mt-1">
            {formatBRL(totalGrossRevenue)}
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-rose-200 shadow-2xs">
          <span className="text-[10px] uppercase font-bold tracking-widest text-rose-700 flex items-center gap-1">
            <Package className="w-3 h-3" /> Custo de Produtos / Insumos
          </span>
          <div className="font-editorial text-2xl font-bold text-rose-800 mt-1">
            - {formatBRL(totalProductCosts)}
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-amber-200 shadow-2xs">
          <span className="text-[10px] uppercase font-bold tracking-widest text-amber-800 flex items-center gap-1">
            <CreditCard className="w-3 h-3" /> Taxas Estimadas Maquininha
          </span>
          <div className="font-editorial text-2xl font-bold text-amber-900 mt-1">
            - {formatBRL(estimatedCardFees)}
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-gradient-to-br from-emerald-50 to-emerald-100/70 border border-emerald-300 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-900">
              Lucro Líquido Real
            </span>
            <span className="text-xs bg-emerald-700 text-white font-bold px-2 py-0.5 rounded-full">
              {profitMarginPercent}% Margem
            </span>
          </div>
          <div className="font-editorial text-2xl font-bold text-emerald-950 mt-1">
            {formatBRL(netProfit)}
          </div>
        </div>
      </div>

      {/* Explicação dos Insumos */}
      <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#E7DCCE] text-xs text-[#5E372C] flex items-center justify-between">
        <span className="flex items-center gap-2">
          <Package className="w-4 h-4 text-[#C59B27]" />
          Custos calculados automaticamente com base nos tubos de coloração, oxidantes e ampolas lipídicas cadastrados em cada procedimento.
        </span>
        <span className="font-bold text-[#2D1914] shrink-0">Saúde Financeira: Excelente</span>
      </div>
    </div>
  );
}
