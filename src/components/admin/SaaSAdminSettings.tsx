"use client";

import { useState } from "react";
import { SalonOrganization, UserProfile } from "@/types/salon";
import { SalonStore } from "@/lib/storage/localStore";
import {
  ShieldCheck,
  ToggleLeft,
  ToggleRight,
  Users,
  CheckCircle2,
  RefreshCw,
  Building,
  Key,
} from "lucide-react";

interface SaaSAdminSettingsProps {
  organization: SalonOrganization;
  profiles: UserProfile[];
  onUpdateOrganization: (org: SalonOrganization) => void;
  onRefreshAll: () => void;
}

export function SaaSAdminSettings({
  organization,
  profiles,
  onUpdateOrganization,
  onRefreshAll,
}: SaaSAdminSettingsProps) {
  const [isSharedMode, setIsSharedMode] = useState(
    organization.settings.isSharedMode
  );
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleToggleSharedMode = () => {
    const nextMode = !isSharedMode;
    setIsSharedMode(nextMode);

    const updated = SalonStore.updateOrganization({
      settings: {
        ...organization.settings,
        isSharedMode: nextMode,
      },
    });

    onUpdateOrganization(updated);
    setSuccessMsg(
      nextMode
        ? "Modo Compartilhado Ativado: As profissionais agora compartilham a agenda global e serviços do Espaço Gleicy Ronha."
        : "Modo Isolado Ativado: Cada profissional passa a visualizar apenas seus próprios agendamentos e faturamento."
    );

    setTimeout(() => setSuccessMsg(null), 4000);
  };

  const handleResetData = () => {
    if (confirm("Deseja restaurar todos os dados para o padrão de demonstração da Gleicy Ronha?")) {
      SalonStore.resetToDefaults();
      onRefreshAll();
      window.location.reload();
    }
  };

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-300 shadow-md">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-stone-200">
        <div>
          <span className="text-[10px] uppercase tracking-widest text-blue-700 font-bold block flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            Painel Super Admin SaaS • Gestão por Thaua
          </span>
          <h2 className="font-editorial text-xl sm:text-2xl font-bold text-stone-900">
            Configurações Multi-Tenant & Compartilhamento
          </h2>
        </div>

        <button
          onClick={handleResetData}
          className="px-3.5 py-1.5 text-xs text-stone-600 bg-stone-100 hover:bg-stone-200 rounded-xl flex items-center space-x-1.5 transition-all"
          title="Resetar dados locais para demonstração"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Restaurar Padrões</span>
        </button>
      </div>

      {successMsg && (
        <div className="mb-6 p-4 rounded-2xl bg-blue-50 border border-blue-200 text-xs text-blue-900 font-medium animate-fade-in flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Chave de Compartilhamento Central Solicitada no Alinhamento */}
      <div className="p-6 rounded-2xl bg-stone-50 border border-stone-200 space-y-4 mb-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-bold text-sm text-stone-900 flex items-center gap-2">
              <Building className="w-4 h-4 text-stone-700" />
              Visibilidade entre Profissionais do Salão:
            </h3>
            <p className="text-xs text-stone-600 mt-1 max-w-xl leading-relaxed">
              Define se as outras cabeleireiras parceiras que atendem no Espaço Gleicy Ronha compartilham a visão da agenda completa e catálogo unificado, ou se operam em modo isolado com total privacidade de dados.
            </p>
          </div>

          <button
            onClick={handleToggleSharedMode}
            className={`px-5 py-3 rounded-2xl font-bold text-xs flex items-center space-x-2 transition-all shadow-sm ${
              isSharedMode
                ? "bg-emerald-700 text-white hover:bg-emerald-800"
                : "bg-stone-800 text-white hover:bg-stone-900"
            }`}
          >
            {isSharedMode ? (
              <>
                <ToggleRight className="w-5 h-5 text-emerald-300" />
                <span>Modo Compartilhado Ativo</span>
              </>
            ) : (
              <>
                <ToggleLeft className="w-5 h-5 text-stone-400" />
                <span>Modo Isolado (Privacidade Total)</span>
              </>
            )}
          </button>
        </div>

        <div className="pt-3 border-t border-stone-200/60 text-[11px] text-stone-500 flex items-center justify-between">
          <span>Organização Principal: <strong>{organization.name}</strong></span>
          <span>Slug público: <strong>/{organization.slug}</strong></span>
        </div>
      </div>

      {/* Lista de Profissionais / Assinantes do SaaS */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-stone-700 mb-3 flex items-center gap-1.5">
          <Users className="w-4 h-4 text-stone-600" />
          Profissionais Cadastradas ({profiles.length})
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {profiles.map((p) => (
            <div
              key={p.id}
              className="p-4 rounded-2xl border border-stone-200 bg-white flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-xs text-stone-900">{p.name}</span>
                  <span
                    className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                      p.role === "salon_owner"
                        ? "bg-amber-100 text-amber-900 border border-amber-300"
                        : p.role === "super_admin"
                        ? "bg-blue-100 text-blue-900 border border-blue-300"
                        : "bg-stone-100 text-stone-700"
                    }`}
                  >
                    {p.role.toUpperCase()}
                  </span>
                </div>
                <p className="text-[11px] text-stone-500 truncate">{p.email}</p>
                <p className="text-[11px] text-stone-600 mt-1 font-medium">{p.specialty || "Profissional"}</p>
              </div>

              <div className="mt-3 pt-2 border-t border-stone-100 flex items-center justify-between text-[10px]">
                <span className="text-emerald-700 font-semibold">● Assinatura Ativa</span>
                <span className="text-stone-500">Comissão: {p.commissionRate || 100}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
