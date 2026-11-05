"use client";

import { useState } from "react";
import { SalonOrganization, UserProfile } from "@/types/salon";
import { SupabaseDataService } from "@/lib/supabase/api";
import { formatBRL } from "@/lib/utils";
import {
  Building2,
  Phone,
  MapPin,
  Target,
  KeyRound,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Sparkles,
  Save,
  User,
  Globe,
  Clock,
  ExternalLink,
} from "lucide-react";

interface SalonSettingsViewProps {
  organization: SalonOrganization | null;
  profile: UserProfile | null;
  onUpdateOrganization: (updated: Partial<SalonOrganization>) => Promise<void>;
  onUpdateProfile: (updated: Partial<UserProfile>) => Promise<void>;
}

export function SalonSettingsView({
  organization,
  profile,
  onUpdateOrganization,
  onUpdateProfile,
}: SalonSettingsViewProps) {
  // Aba ativa interna de configurações
  const [activeSubTab, setActiveSubTab] = useState<"contato" | "meta" | "senha" | "perfil">("contato");

  // Estado: Dados de Contato e Salão
  const [salonName, setSalonName] = useState(organization?.name || "Espaço da Beleza Gleicy Ronha");
  const [tagline, setTagline] = useState(organization?.tagline || "O cuidado que acolhe. A beleza que encanta.");
  const [phone, setPhone] = useState(organization?.phone || "(11) 99597-5725");
  const [address, setAddress] = useState(organization?.address || "Av. Brasília, 996 - Jardim Saltense");
  const [city, setCity] = useState(organization?.city || "Salto");
  const [state, setState] = useState(organization?.state || "SP");

  // Estado: Meta Diária
  const [dailyTarget, setDailyTarget] = useState<number>(
    organization?.settings?.dailyTargetRevenue || 1500
  );

  // Estado: Alteração de Senha
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");

  // Estado: Perfil da Profissional
  const [profileName, setProfileName] = useState(profile?.name || "Gleicy Ronha");
  const [specialty, setSpecialty] = useState(profile?.specialty || "Master em Cachos & Cor");
  const [bio, setBio] = useState(
    profile?.bio ||
      "Mais de 12 anos dedicados à saúde capilar, mechas de alta integridade e valorização da curvatura natural."
  );

  // Estados de feedback / loading
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Salvar Informações do Salão & Contato (Sincronizado ao site)
  const handleSaveContact = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onUpdateOrganization({
        name: salonName,
        tagline,
        phone,
        address,
        city,
        state,
      });
      showToast("Dados do salão e contatos sincronizados com sucesso no site!");
    } catch (err) {
      console.error(err);
      showToast("Erro ao sincronizar informações do salão.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  // Salvar Meta Diária
  const handleSaveTarget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (dailyTarget <= 0) {
      showToast("Informe um valor de meta diária maior que zero.", "error");
      return;
    }
    setIsSaving(true);
    try {
      await onUpdateOrganization({
        settings: {
          ...(organization?.settings || {
            isSharedMode: true,
            allowSelfRegistration: false,
            requireTriageApprovalHours: 48,
            pixDiscountPercent: 5,
            maxParallelInPause: 1,
          }),
          dailyTargetRevenue: dailyTarget,
        },
      });
      showToast(`Meta diária atualizada para ${formatBRL(dailyTarget)}!`);
    } catch (err) {
      console.error(err);
      showToast("Erro ao atualizar meta diária.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  // Salvar Nova Senha
  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError("");

    if (newPassword.length < 6) {
      setPasswordError("A senha precisa ter no mínimo 6 caracteres.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("A confirmação da senha não coincide com a nova senha.");
      return;
    }

    setIsSaving(true);
    try {
      const res = await SupabaseDataService.updateUserPassword(newPassword);
      if (!res.success) {
        setPasswordError(res.error || "Erro ao atualizar senha no Supabase Auth.");
        showToast("Não foi possível atualizar a senha.", "error");
      } else {
        setNewPassword("");
        setConfirmPassword("");
        showToast("Senha alterada com sucesso! Utilize-a em seu próximo login.");
      }
    } catch (err) {
      console.error(err);
      setPasswordError("Erro de comunicação com o servidor de autenticação.");
      showToast("Erro ao atualizar senha.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  // Salvar Perfil da Profissional
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setIsSaving(true);
    try {
      await onUpdateProfile({
        name: profileName,
        specialty,
        bio,
      });
      showToast("Perfil profissional atualizado com sucesso!");
    } catch (err) {
      console.error(err);
      showToast("Erro ao salvar perfil profissional.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const targetShortcuts = [1000, 1500, 2000, 2500, 3000, 4000];

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto">
      {/* Toast Notification Flutuante */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 p-4 rounded-2xl shadow-2xl flex items-center space-x-3 text-xs font-bold transition-all border animate-slide-up ${
            toast.type === "success"
              ? "bg-emerald-900/95 text-emerald-100 border-emerald-500 shadow-emerald-950/40"
              : "bg-rose-900/95 text-rose-100 border-rose-500 shadow-rose-950/40"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Topo: Título Editorial e Subtítulo */}
      <div className="bg-white/85 backdrop-blur-md rounded-3xl p-6 sm:p-8 border border-[#D8D0BD] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 relative overflow-hidden">
        {/* Pattern de Arcos de Oliva sutil */}
        <div className="absolute inset-0 bg-pattern-arches-olive opacity-[0.03] pointer-events-none" />

        <div className="relative z-10">
          <span className="text-[10px] uppercase tracking-widest text-[#80611F] font-bold block mb-1">
            Painel de Ajustes Operacionais • Espaço da Beleza
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1D3D3C]">
            Configurações do Salão &amp; Perfil
          </h1>

          {/* Grafismo Oficial 1 - Linha Orgânica Dourada */}
          <div className="relative w-36 sm:w-44 h-2.5 my-1.5 opacity-80 pointer-events-none">
            <img
              src="/brand/Grafismos/linha-grafismo-1.png"
              alt=""
              className="w-full h-full object-contain object-left"
            />
          </div>

          <p className="text-xs text-[#736455] mt-1 max-w-xl">
            Altere seus dados de contato, senha de acesso e meta financeira. As informações salvas aqui são sincronizadas instantaneamente com o site principal.
          </p>
        </div>

        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="relative z-10 px-4 py-2.5 rounded-xl bg-[#FAF7F2] hover:bg-[#EEE8DD] border border-[#D8D0BD] text-xs font-bold text-[#1D3D3C] flex items-center space-x-2 transition-all shadow-xs shrink-0 self-start md:self-auto"
        >
          <Globe className="w-3.5 h-3.5 text-[#C7A03A]" />
          <span>Ver Site Oficial</span>
          <ExternalLink className="w-3 h-3 text-[#736455]" />
        </a>
      </div>

      {/* Navegação entre as Abas Internas */}
      <div className="flex flex-wrap gap-2 p-1.5 bg-[#FAF7F2] rounded-2xl border border-[#D8D0BD] shadow-xs">
        <button
          onClick={() => setActiveSubTab("contato")}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeSubTab === "contato"
              ? "bg-[#1D3D3C] text-[#D9B85F] shadow-xs border border-[#C7A03A]/40"
              : "text-[#736455] hover:text-[#1D3D3C] hover:bg-white/60"
          }`}
        >
          <Building2 className="w-3.5 h-3.5 text-[#C7A03A]" />
          <span>Dados do Salão &amp; Contato</span>
        </button>

        <button
          onClick={() => setActiveSubTab("meta")}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeSubTab === "meta"
              ? "bg-[#1D3D3C] text-[#D9B85F] shadow-xs border border-[#C7A03A]/40"
              : "text-[#736455] hover:text-[#1D3D3C] hover:bg-white/60"
          }`}
        >
          <Target className="w-3.5 h-3.5 text-[#C7A03A]" />
          <span>Meta Diária de Faturamento</span>
        </button>

        <button
          onClick={() => setActiveSubTab("senha")}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeSubTab === "senha"
              ? "bg-[#1D3D3C] text-[#D9B85F] shadow-xs border border-[#C7A03A]/40"
              : "text-[#736455] hover:text-[#1D3D3C] hover:bg-white/60"
          }`}
        >
          <KeyRound className="w-3.5 h-3.5 text-[#C7A03A]" />
          <span>Segurança &amp; Alterar Senha</span>
        </button>

        <button
          onClick={() => setActiveSubTab("perfil")}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeSubTab === "perfil"
              ? "bg-[#1D3D3C] text-[#D9B85F] shadow-xs border border-[#C7A03A]/40"
              : "text-[#736455] hover:text-[#1D3D3C] hover:bg-white/60"
          }`}
        >
          <User className="w-3.5 h-3.5 text-[#C7A03A]" />
          <span>Perfil da Especialista</span>
        </button>
      </div>

      {/* ========================================================
          ABA 1: DADOS DO SALÃO & CONTATO (Sincronizado ao Site)
          ======================================================== */}
      {activeSubTab === "contato" && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E7DCCE] shadow-xs space-y-6 animate-fade-in">
          <div className="border-b border-[#E7DCCE]/60 pb-4">
            <h2 className="font-editorial text-xl font-bold text-[#2D1914] flex items-center gap-2">
              <Building2 className="w-5 h-5 text-[#C7A03A]" />
              <span>Dados de Localização &amp; Presença Pública</span>
            </h2>
            <p className="text-xs text-stone-500 mt-1">
              Estes campos alimentam em tempo real o topo, o rodapé, o botão de WhatsApp e as seções de endereço do site institucional.
            </p>
          </div>

          <form onSubmit={handleSaveContact} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-bold text-[#2D1914] uppercase tracking-wider mb-1.5">
                  Nome do Salão
                </label>
                <input
                  type="text"
                  value={salonName}
                  onChange={(e) => setSalonName(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#D8D0BD] bg-[#FAF7F2] text-xs font-medium text-[#1D3D3C] focus:bg-white focus:border-[#C7A03A] outline-none transition-all"
                  placeholder="Ex: Espaço da Beleza Gleicy Ronha"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#2D1914] uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-[#C7A03A]" />
                  <span>Telefone &amp; WhatsApp Oficial</span>
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#D8D0BD] bg-[#FAF7F2] text-xs font-medium text-[#1D3D3C] focus:bg-white focus:border-[#C7A03A] outline-none transition-all"
                  placeholder="Ex: (11) 99597-5725"
                />
                <span className="text-[10px] text-stone-400 mt-1 block">
                  Utilizado para receber mensagens de clientes direto no WhatsApp.
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#2D1914] uppercase tracking-wider mb-1.5">
                Slogan Oficial / Tagline
              </label>
              <input
                type="text"
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#D8D0BD] bg-[#FAF7F2] text-xs font-medium text-[#1D3D3C] focus:bg-white focus:border-[#C7A03A] outline-none transition-all"
                placeholder="Ex: O cuidado que acolhe. A beleza que encanta."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
              <div className="md:col-span-6">
                <label className="block text-xs font-bold text-[#2D1914] uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-[#C7A03A]" />
                  <span>Endereço &amp; Bairro</span>
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#D8D0BD] bg-[#FAF7F2] text-xs font-medium text-[#1D3D3C] focus:bg-white focus:border-[#C7A03A] outline-none transition-all"
                  placeholder="Ex: Av. Brasília, 996 - Jardim Saltense"
                />
              </div>

              <div className="md:col-span-4">
                <label className="block text-xs font-bold text-[#2D1914] uppercase tracking-wider mb-1.5">
                  Cidade
                </label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#D8D0BD] bg-[#FAF7F2] text-xs font-medium text-[#1D3D3C] focus:bg-white focus:border-[#C7A03A] outline-none transition-all"
                  placeholder="Ex: Salto"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-[#2D1914] uppercase tracking-wider mb-1.5">
                  Estado (UF)
                </label>
                <input
                  type="text"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  required
                  maxLength={2}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#D8D0BD] bg-[#FAF7F2] text-xs font-medium text-[#1D3D3C] focus:bg-white focus:border-[#C7A03A] outline-none transition-all uppercase text-center"
                  placeholder="SP"
                />
              </div>
            </div>

            {/* Card de Pré-visualização ao Vivo */}
            <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#E7DCCE] space-y-2">
              <span className="text-[10px] uppercase font-bold tracking-wider text-[#AD841D] block">
                Pré-visualização no Rodapé do Site:
              </span>
              <div className="text-xs text-[#2D1914]">
                <strong className="block text-sm">{salonName}</strong>
                <p className="text-stone-600 mt-0.5">{address}</p>
                <p className="text-stone-500 text-[11px]">{city} - {state}</p>
                <p className="text-emerald-700 font-bold mt-1">WhatsApp de Contato: {phone}</p>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={isSaving}
                className="px-6 py-3 rounded-xl text-xs font-bold text-[#2D1914] gold-gradient hover:opacity-95 shadow-md flex items-center space-x-2 transition-all disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? "Sincronizando..." : "Salvar & Sincronizar com o Site"}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================
          ABA 2: META DIÁRIA DE FATURAMENTO
          ======================================================== */}
      {activeSubTab === "meta" && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E7DCCE] shadow-xs space-y-6 animate-fade-in">
          <div className="border-b border-[#E7DCCE]/60 pb-4">
            <h2 className="font-editorial text-xl font-bold text-[#2D1914] flex items-center gap-2">
              <Target className="w-5 h-5 text-[#C7A03A]" />
              <span>Meta Diária de Faturamento da Operação</span>
            </h2>
            <p className="text-xs text-stone-500 mt-1">
              Define o objetivo financeiro diário que alimenta a barra gamificada de conquista no painel "Operação do Dia".
            </p>
          </div>

          <form onSubmit={handleSaveTarget} className="space-y-6">
            <div className="max-w-md space-y-2">
              <label className="block text-xs font-bold text-[#2D1914] uppercase tracking-wider">
                Valor da Meta Diária (R$)
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-stone-400">
                  R$
                </span>
                <input
                  type="number"
                  min={100}
                  step={50}
                  value={dailyTarget}
                  onChange={(e) => setDailyTarget(Number(e.target.value))}
                  required
                  className="w-full pl-12 pr-4 py-3 rounded-2xl border border-[#D8D0BD] bg-[#FAF7F2] text-lg font-bold text-[#1D3D3C] focus:bg-white focus:border-[#C7A03A] outline-none transition-all font-mono"
                />
              </div>
            </div>

            {/* Atalhos Rápidos */}
            <div className="space-y-2">
              <span className="text-xs font-semibold text-stone-500 block">
                Atalhos rápidos para definir a meta:
              </span>
              <div className="flex flex-wrap gap-2">
                {targetShortcuts.map((amount) => (
                  <button
                    key={amount}
                    type="button"
                    onClick={() => setDailyTarget(amount)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                      dailyTarget === amount
                        ? "bg-[#1D3D3C] text-white border-[#1D3D3C] shadow-xs"
                        : "bg-[#FAF7F2] text-[#736455] border-[#D8D0BD] hover:bg-[#EEE8DD]"
                    }`}
                  >
                    {formatBRL(amount)}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 text-xs text-amber-950 space-y-1.5">
              <div className="font-bold text-amber-900 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-[#AD841D]" />
                <span>Como funciona a gamificação:</span>
              </div>
              <p className="text-[11px] leading-relaxed text-stone-700">
                Ao bater 50% da meta, a barra passa para a cor dourada vibrante. Ao alcançar 100%, ela se torna verde esmeralda com chuva de confetes e efeito sonoro comemorativo no painel.
              </p>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={isSaving}
                className="px-6 py-3 rounded-xl text-xs font-bold text-[#2D1914] gold-gradient hover:opacity-95 shadow-md flex items-center space-x-2 transition-all disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? "Salvando..." : "Salvar Meta Diária"}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================
          ABA 3: SEGURANÇA & ALTERAR SENHA
          ======================================================== */}
      {activeSubTab === "senha" && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E7DCCE] shadow-xs space-y-6 animate-fade-in">
          <div className="border-b border-[#E7DCCE]/60 pb-4">
            <h2 className="font-editorial text-xl font-bold text-[#2D1914] flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-[#C7A03A]" />
              <span>Segurança da Conta &amp; Alteração de Senha</span>
            </h2>
            <p className="text-xs text-stone-500 mt-1">
              Atualize sua senha de acesso ao painel de administração da Gleicy Ronha.
            </p>
          </div>

          <form onSubmit={handleSavePassword} className="space-y-5 max-w-lg">
            <div>
              <label className="block text-xs font-bold text-[#2D1914] uppercase tracking-wider mb-1.5">
                Email da Conta
              </label>
              <input
                type="email"
                value={profile?.email || "gleicy@glaicyagenda.com"}
                disabled
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 bg-stone-100 text-xs font-medium text-stone-500 cursor-not-allowed"
              />
              <span className="text-[10px] text-stone-400 mt-1 block">
                O email da conta é gerenciado pelo Super Admin do sistema.
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#2D1914] uppercase tracking-wider mb-1.5">
                Nova Senha
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-[#D8D0BD] bg-[#FAF7F2] text-xs font-medium text-[#1D3D3C] focus:bg-white focus:border-[#C7A03A] outline-none transition-all"
                  placeholder="Mínimo 6 caracteres"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#2D1914] uppercase tracking-wider mb-1.5">
                Confirmar Nova Senha
              </label>
              <input
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#D8D0BD] bg-[#FAF7F2] text-xs font-medium text-[#1D3D3C] focus:bg-white focus:border-[#C7A03A] outline-none transition-all"
                placeholder="Repita a nova senha"
              />
            </div>

            {passwordError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{passwordError}</span>
              </div>
            )}

            <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200 text-xs text-stone-600 space-y-1">
              <span className="font-semibold text-stone-700 block">Dicas de Segurança:</span>
              <ul className="list-disc pl-4 space-y-0.5 text-[11px] text-stone-500">
                <li>Utilize pelo menos 6 caracteres (letras e números).</li>
                <li>Evite sequências óbvias como 123456 ou datas de aniversário.</li>
              </ul>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={isSaving}
                className="px-6 py-3 rounded-xl text-xs font-bold text-white bg-[#1D3D3C] hover:bg-[#28504D] shadow-md flex items-center space-x-2 transition-all disabled:opacity-50"
              >
                <ShieldCheck className="w-4 h-4 text-[#C7A03A]" />
                <span>{isSaving ? "Atualizando..." : "Alterar Senha de Acesso"}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================
          ABA 4: PERFIL DA PROFISSIONAL
          ======================================================== */}
      {activeSubTab === "perfil" && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E7DCCE] shadow-xs space-y-6 animate-fade-in">
          <div className="border-b border-[#E7DCCE]/60 pb-4">
            <h2 className="font-editorial text-xl font-bold text-[#2D1914] flex items-center gap-2">
              <User className="w-5 h-5 text-[#C7A03A]" />
              <span>Perfil Profissional da Gleicy</span>
            </h2>
            <p className="text-xs text-stone-500 mt-1">
              Personalize seu nome de exibição, especialidade técnica e bio institucional.
            </p>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-5 max-w-lg">
            <div>
              <label className="block text-xs font-bold text-[#2D1914] uppercase tracking-wider mb-1.5">
                Nome Profissional
              </label>
              <input
                type="text"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#D8D0BD] bg-[#FAF7F2] text-xs font-medium text-[#1D3D3C] focus:bg-white focus:border-[#C7A03A] outline-none transition-all"
                placeholder="Ex: Gleicy Ronha"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#2D1914] uppercase tracking-wider mb-1.5">
                Especialidade Técnica
              </label>
              <input
                type="text"
                value={specialty}
                onChange={(e) => setSpecialty(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#D8D0BD] bg-[#FAF7F2] text-xs font-medium text-[#1D3D3C] focus:bg-white focus:border-[#C7A03A] outline-none transition-all"
                placeholder="Ex: Master em Cachos & Cor"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#2D1914] uppercase tracking-wider mb-1.5">
                Bio / Apresentação Institucional
              </label>
              <textarea
                rows={4}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#D8D0BD] bg-[#FAF7F2] text-xs font-medium text-[#1D3D3C] focus:bg-white focus:border-[#C7A03A] outline-none transition-all resize-none"
                placeholder="Breve descrição da sua carreira e técnica..."
              />
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={isSaving}
                className="px-6 py-3 rounded-xl text-xs font-bold text-[#2D1914] gold-gradient hover:opacity-95 shadow-md flex items-center space-x-2 transition-all disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? "Salvando..." : "Salvar Perfil"}</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
