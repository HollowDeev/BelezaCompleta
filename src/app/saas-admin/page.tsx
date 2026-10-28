"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/supabase/authContext";
import { SupabaseDataService } from "@/lib/supabase/api";
import { SalonOrganization, UserProfile } from "@/types/salon";
import {
  ShieldCheck,
  Building2,
  Users,
  Database,
  ArrowRight,
  LogOut,
  RefreshCw,
  CheckCircle2,
  Calendar,
  FileText,
  Scissors,
  ToggleLeft,
  ToggleRight,
  Sparkles,
  ExternalLink,
  Lock,
} from "lucide-react";
import Link from "next/link";

export default function SaaSAdminPage() {
  const router = useRouter();
  const { user, profile, role, loading: authLoading, signOut } = useAuth();

  const [organization, setOrganization] = useState<SalonOrganization | null>(null);
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [servicesCount, setServicesCount] = useState(0);
  const [appointmentsCount, setAppointmentsCount] = useState(0);
  const [proposalsCount, setProposalsCount] = useState(0);
  const [triageCount, setTriageCount] = useState(0);
  const [loadingData, setLoadingData] = useState(true);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Verificação de autenticação e papel de Super Admin
  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push("/login");
      } else if (role && role !== "super_admin") {
        router.push("/dashboard");
      }
    }
  }, [user, role, authLoading, router]);

  const loadAllData = async () => {
    setLoadingData(true);
    try {
      const [org, profs, srvs, apts, props, subs] = await Promise.all([
        SupabaseDataService.getOrganization(),
        SupabaseDataService.getProfiles(),
        SupabaseDataService.getServices(),
        SupabaseDataService.getAppointments(),
        SupabaseDataService.getProposals(),
        SupabaseDataService.getTriageSubmissions(),
      ]);

      setOrganization(org);
      setProfiles(profs);
      setServicesCount(srvs.length);
      setAppointmentsCount(apts.length);
      setProposalsCount(props.length);
      setTriageCount(subs.length);
    } catch (err) {
      console.error("Error loading SaaS admin data", err);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    if (user && role === "super_admin") {
      loadAllData();
    }
  }, [user, role]);

  const handleToggleSharedMode = async () => {
    if (!organization) return;
    const current = organization.settings.isSharedMode;
    const updated = await SupabaseDataService.updateOrganization({
      settings: {
        ...organization.settings,
        isSharedMode: !current,
      },
    });
    setOrganization(updated);
    setSuccessMsg(
      !current
        ? "Modo Compartilhado ATIVADO: Profissionais compartilham agenda global e pausas químicas sincronizadas."
        : "Modo Isolado ATIVADO: Cada parceira opera com total isolamento de agendamentos e faturamento."
    );
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  const handleUpdateParallelPause = async (maxParallel: number) => {
    if (!organization) return;
    const updated = await SupabaseDataService.updateOrganization({
      settings: {
        ...organization.settings,
        maxParallelInPause: maxParallel,
      },
    });
    setOrganization(updated);
    setSuccessMsg(`Limite de clientes paralelos nas pausas atualizado para: ${maxParallel}`);
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  if (authLoading || loadingData || !user) {
    return (
      <div className="min-h-screen bg-[#1E120E] text-[#F5EDE4] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-[#E5C158] border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-medium text-[#C4B2A7]">
            Carregando Painel de Controle SaaS...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#160D0A] text-[#F5EDE4] selection:bg-[#c59b27]/30 selection:text-white">
      {/* Top Navbar */}
      <header className="sticky top-0 z-50 bg-[#1E120E]/95 backdrop-blur-md border-b border-[#3D251E] px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#c59b27] to-[#8C6B1B] p-0.5 shadow-lg shadow-[#c59b27]/20">
              <div className="w-full h-full bg-[#1E120E] rounded-[10px] flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-[#E5C158]" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-white tracking-tight">
                  Glaicy Agenda SaaS
                </h1>
                <span className="text-[10px] font-extrabold uppercase tracking-wider bg-[#E5C158]/20 text-[#E5C158] px-2 py-0.5 rounded-full border border-[#E5C158]/30">
                  Super Admin
                </span>
              </div>
              <p className="text-xs text-[#A8988F]">
                Ambiente de Gestão Master · Logado como <strong>{profile?.name || user.email}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#c59b27] to-[#8C6B1B] text-[#1E120E] text-xs font-bold shadow-md hover:brightness-110 transition-all flex items-center gap-1.5"
            >
              <span>Abrir Dashboard do Salão</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>

            <Link
              href="/"
              target="_blank"
              className="px-3.5 py-2 rounded-xl bg-[#2D1914] text-[#C4B2A7] hover:text-white border border-[#4A322B] text-xs font-medium transition-all flex items-center gap-1.5"
            >
              <span>Vitrine Cliente</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>

            <button
              onClick={() => signOut().then(() => router.push("/login"))}
              className="p-2 rounded-xl bg-[#2D1914] text-red-300 hover:bg-red-950/40 border border-[#4A322B] hover:border-red-800 transition-all"
              title="Encerrar Sessão"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Notificação de Sucesso */}
        {successMsg && (
          <div className="p-4 rounded-2xl bg-emerald-950/60 border border-emerald-600/50 text-emerald-200 text-xs font-medium flex items-center gap-2 animate-fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Banner de Status do Supabase */}
        <div className="rounded-3xl bg-gradient-to-r from-[#2D1914] via-[#23140F] to-[#2D1914] border border-[#c59b27]/30 p-6 shadow-xl relative overflow-hidden">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs uppercase tracking-widest text-[#E5C158] font-bold">
                  Banco de Dados Supabase Conectado
                </span>
              </div>
              <h2 className="text-xl font-bold text-white tracking-tight">
                Instância Multi-Tenant: {organization?.name}
              </h2>
              <p className="text-xs text-[#A8988F] mt-1">
                Endpoint: <code className="text-[#E5C158] bg-[#1E120E] px-2 py-0.5 rounded">https://jyndcpizejiiwemwaauv.supabase.co</code> · Políticas RLS ativas
              </p>
            </div>

            <button
              onClick={loadAllData}
              className="px-4 py-2 bg-[#1E120E] hover:bg-[#3D251E] text-[#C4B2A7] hover:text-white border border-[#4A322B] rounded-xl text-xs font-medium flex items-center gap-2 transition-all"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Sincronizar Métricas</span>
            </button>
          </div>

          {/* Cards de Métricas do Banco */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-[#4A322B]/60">
            <div className="bg-[#1E120E]/80 border border-[#3D251E] rounded-2xl p-4">
              <div className="flex items-center justify-between text-[#A8988F] mb-1">
                <span className="text-xs font-medium">Serviços Ativos</span>
                <Scissors className="w-4 h-4 text-[#E5C158]" />
              </div>
              <div className="text-2xl font-bold text-white">{servicesCount}</div>
              <span className="text-[10px] text-emerald-400">Com etapas e pausas</span>
            </div>

            <div className="bg-[#1E120E]/80 border border-[#3D251E] rounded-2xl p-4">
              <div className="flex items-center justify-between text-[#A8988F] mb-1">
                <span className="text-xs font-medium">Agendamentos</span>
                <Calendar className="w-4 h-4 text-[#E5C158]" />
              </div>
              <div className="text-2xl font-bold text-white">{appointmentsCount}</div>
              <span className="text-[10px] text-emerald-400">Timeline sincronizada</span>
            </div>

            <div className="bg-[#1E120E]/80 border border-[#3D251E] rounded-2xl p-4">
              <div className="flex items-center justify-between text-[#A8988F] mb-1">
                <span className="text-xs font-medium">Propostas de Luxo</span>
                <FileText className="w-4 h-4 text-[#E5C158]" />
              </div>
              <div className="text-2xl font-bold text-white">{proposalsCount}</div>
              <span className="text-[10px] text-emerald-400">Com gerador de PDF</span>
            </div>

            <div className="bg-[#1E120E]/80 border border-[#3D251E] rounded-2xl p-4">
              <div className="flex items-center justify-between text-[#A8988F] mb-1">
                <span className="text-xs font-medium">Triagens Recebidas</span>
                <Sparkles className="w-4 h-4 text-[#E5C158]" />
              </div>
              <div className="text-2xl font-bold text-white">{triageCount}</div>
              <span className="text-[10px] text-emerald-400">Diagnósticos capilares</span>
            </div>
          </div>
        </div>

        {/* Chaves de Controle Multi-Tenant do Salão */}
        <div className="bg-[#1E120E] border border-[#3D251E] rounded-3xl p-6 shadow-xl space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-[#3D251E]">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[#E5C158]" />
                Regras de Negócio & Compartilhamento da Equipe
              </h3>
              <p className="text-xs text-[#A8988F] mt-0.5">
                Controle master exclusivo do Super Admin para ditar as regras operacionais do salão
              </p>
            </div>
          </div>

          {/* Toggle Modo Compartilhado */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-[#2D1914]/60 border border-[#4A322B]">
            <div>
              <span className="font-bold text-sm text-white block">
                Modo Compartilhado entre Gleicy e Parceiras
              </span>
              <p className="text-xs text-[#A8988F] mt-1 max-w-xl leading-relaxed">
                Quando ATIVADO, todas as parceiras visualizam a ocupação física da agenda em tempo real para sincronia de espaço, enquanto o financeiro e comissões mantêm-se individuais.
              </p>
            </div>

            <button
              onClick={handleToggleSharedMode}
              className={`px-5 py-3 rounded-2xl font-bold text-xs flex items-center gap-2 transition-all shrink-0 ${
                organization?.settings.isSharedMode
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-900/40"
                  : "bg-[#3D251E] hover:bg-[#4A322B] text-[#C4B2A7]"
              }`}
            >
              {organization?.settings.isSharedMode ? (
                <>
                  <ToggleRight className="w-5 h-5 text-white" />
                  <span>Modo Compartilhado Ativo</span>
                </>
              ) : (
                <>
                  <ToggleLeft className="w-5 h-5 text-[#A8988F]" />
                  <span>Modo Isolado (Privacidade Total)</span>
                </>
              )}
            </button>
          </div>

          {/* Controle de Concorrência nas Pausas */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-[#2D1914]/60 border border-[#4A322B]">
            <div>
              <span className="font-bold text-sm text-white block">
                Concorrência Máxima Permitida durante Pausas Químicas
              </span>
              <p className="text-xs text-[#A8988F] mt-1 max-w-xl leading-relaxed">
                Define quantos atendimentos rápidos (cortes, escovas ou lavatório) podem ser agendados paralelamente enquanto uma cliente está com química agindo.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {[1, 2, 3].map((val) => (
                <button
                  key={val}
                  onClick={() => handleUpdateParallelPause(val)}
                  className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-all ${
                    organization?.settings.maxParallelInPause === val
                      ? "bg-gradient-to-r from-[#c59b27] to-[#8C6B1B] text-[#1E120E] shadow-md"
                      : "bg-[#1E120E] text-[#C4B2A7] hover:text-white border border-[#4A322B]"
                  }`}
                >
                  {val} {val === 1 ? "Encaixe" : "Encaixes"}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Gestão de Perfis Cadastrados */}
        <div className="bg-[#1E120E] border border-[#3D251E] rounded-3xl p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4 pb-4 border-b border-[#3D251E]">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-[#E5C158]" />
              Usuários e Perfis Cadastrados no Supabase ({profiles.length})
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {profiles.map((p) => (
              <div
                key={p.id}
                className="bg-[#2D1914]/80 border border-[#4A322B] rounded-2xl p-5 flex flex-col justify-between hover:border-[#c59b27]/40 transition-all"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-sm text-white">{p.name}</span>
                    <span
                      className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                        p.role === "super_admin"
                          ? "bg-blue-950/80 text-blue-300 border-blue-700/60"
                          : p.role === "salon_owner"
                          ? "bg-[#c59b27]/20 text-[#E5C158] border-[#c59b27]/40"
                          : "bg-purple-950/80 text-purple-300 border-purple-700/60"
                      }`}
                    >
                      {p.role.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-xs text-[#A8988F]">{p.email}</p>
                  <p className="text-xs text-[#E5C158] mt-2 font-medium">
                    {p.specialty || (p.role === "super_admin" ? "Controle Global do SaaS" : "Profissional Parceira")}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-[#4A322B]/60 flex items-center justify-between text-xs text-[#A8988F]">
                  <span>Comissão: <strong>{p.commissionRate || 100}%</strong></span>
                  <span className="text-emerald-400 font-medium">● Ativo no Banco</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
