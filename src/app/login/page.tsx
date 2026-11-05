"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/supabase/authContext";
import { Sparkles, Shield, Lock, Mail, ArrowRight, CheckCircle2, Scissors, Building2, User, Eye, EyeOff } from "lucide-react";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const { user, role, signIn, loading: authLoading } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Redirecionamento automático se já estiver logado
  useEffect(() => {
    if (!authLoading && user && role) {
      if (role === "super_admin") {
        router.push("/saas-admin");
      } else {
        router.push("/dashboard");
      }
    }
  }, [user, role, authLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    const res = await signIn(email, password);
    if (res.error) {
      setErrorMessage(res.error);
      setIsLoading(false);
    }
    // O useEffect cuidará do redirecionamento após a atualização do contexto
  };

  const handleQuickLogin = (quickEmail: string) => {
    setEmail(quickEmail);
    setPassword("Glaicy@2026!");
  };

  return (
    <div className="min-h-screen bg-[#122B2A] text-[#FCF5EB] flex flex-col justify-between selection:bg-[#C7A03A]/30 selection:text-[#FCF5EB]">
      {/* Background Decorativo com gradiente dourado e verde profundo */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-[#C7A03A]/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-[#1D3D3C]/60 blur-3xl" />
      </div>

      {/* Header Minimalista */}
      <header className="relative z-10 w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#C7A03A] to-[#80611F] p-0.5 shadow-lg shadow-[#C7A03A]/20 group-hover:scale-105 transition-transform">
            <div className="w-full h-full bg-[#1D3D3C] rounded-[10px] flex items-center justify-center">
              <Scissors className="w-5 h-5 text-[#C7A03A]" />
            </div>
          </div>
          <div>
            <span className="text-base font-bold tracking-tight text-white block">
              Glaicy Agenda
            </span>
            <span className="text-xs text-[#D3D0B5] tracking-wider uppercase">
              Portal Restrito
            </span>
          </div>
        </Link>

        <Link
          href="/"
          className="text-xs text-[#C7A03A] hover:text-[#d9b85f] transition-colors flex items-center gap-1.5 font-medium bg-[#1D3D3C]/80 px-3.5 py-1.5 rounded-full border border-[#C7A03A]/30"
        >
          ← Voltar para a Vitrine
        </Link>
      </header>

      {/* Card Central de Login */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          {/* Card Principal */}
          <div className="bg-[#1D3D3C]/95 backdrop-blur-xl border border-[#C7A03A]/30 rounded-3xl p-8 shadow-2xl shadow-black/60 relative overflow-hidden">
            {/* Linha de brilho superior */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#C7A03A] to-transparent opacity-85" />

            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-[#C7A03A]/20 to-transparent border border-[#C7A03A]/40 mb-4 shadow-inner">
                <Lock className="w-6 h-6 text-[#C7A03A]" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-white">
                Acesso do Sistema
              </h1>
              <p className="text-sm text-[#D3D0B5] mt-1.5">
                Faça login com seu perfil administrativo ou profissional
              </p>
            </div>

            {errorMessage && (
              <div className="mb-6 p-4 rounded-xl bg-red-950/60 border border-red-800/60 text-red-200 text-xs flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-400 shrink-0 animate-pulse" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#D3D0B5] mb-2">
                  E-mail de Acesso
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#D3D0B5]/70 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ex: seu.email@salao.com"
                    className="w-full pl-10 pr-4 py-3 bg-[#122B2A]/90 border border-[#28504D] rounded-xl text-white placeholder-[#707956] text-sm focus:outline-none focus:border-[#C7A03A] focus:ring-1 focus:ring-[#C7A03A] transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#D3D0B5] mb-2">
                  Senha
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#D3D0B5]/70 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-11 py-3 bg-[#122B2A]/90 border border-[#28504D] rounded-xl text-white placeholder-[#707956] text-sm focus:outline-none focus:border-[#C7A03A] focus:ring-1 focus:ring-[#C7A03A] transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Ocultar senha" : "Exibir senha"}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#D3D0B5]/70 hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 py-3.5 px-4 bg-gradient-to-r from-[#C7A03A] via-[#d9b85f] to-[#80611F] hover:from-[#d9b85f] hover:to-[#C7A03A] text-[#122B2A] font-bold text-sm rounded-xl shadow-lg shadow-[#C7A03A]/25 flex items-center justify-center gap-2 transition-all transform active:scale-[0.99] disabled:opacity-50"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-[#122B2A] border-t-transparent rounded-full animate-spin" />
                    Autenticando...
                  </span>
                ) : (
                  <>
                    Entrar no Sistema
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Seção de Contas de Teste Rápidas */}
            <div className="mt-8 pt-6 border-t border-[#28504D]">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#D3D0B5]">
                  Acessos de Teste (1-Clique)
                </span>
                <span className="text-[10px] text-[#C7A03A] bg-[#C7A03A]/10 px-2 py-0.5 rounded-full border border-[#C7A03A]/30">
                  Banco Supabase Ativo
                </span>
              </div>

              <div className="grid grid-cols-1 gap-2">
                <button
                  type="button"
                  onClick={() => handleQuickLogin("thaua@admin.com")}
                  className="w-full text-left p-2.5 rounded-xl bg-[#122B2A]/70 hover:bg-[#122B2A] border border-[#28504D] hover:border-[#C7A03A]/60 transition-all flex items-center justify-between group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-[#C7A03A]/20 flex items-center justify-center text-[#C7A03A]">
                      <Shield className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-white group-hover:text-[#C7A03A] transition-colors">
                        Thaua (Super Admin)
                      </div>
                      <div className="text-[10px] text-[#D3D0B5]/80">
                        thaua@admin.com · Acesso Total SaaS
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] text-[#D3D0B5] group-hover:text-white">Preencher</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickLogin("gleicy@salao.com")}
                  className="w-full text-left p-2.5 rounded-xl bg-[#122B2A]/70 hover:bg-[#122B2A] border border-[#28504D] hover:border-[#C7A03A]/60 transition-all flex items-center justify-between group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-[#C7A03A]/20 flex items-center justify-center text-[#C7A03A]">
                      <Building2 className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-white group-hover:text-[#C7A03A] transition-colors">
                        Gleicy Ronha (Dona)
                      </div>
                      <div className="text-[10px] text-[#D3D0B5]/80">
                        gleicy@salao.com · Painel do Salão
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] text-[#D3D0B5] group-hover:text-white">Preencher</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickLogin("debora@salao.com")}
                  className="w-full text-left p-2.5 rounded-xl bg-[#122B2A]/70 hover:bg-[#122B2A] border border-[#28504D] hover:border-[#C7A03A]/60 transition-all flex items-center justify-between group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-[#28504D]/60 flex items-center justify-center text-[#D3D0B5]">
                      <User className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-white group-hover:text-[#C7A03A] transition-colors">
                        Débora Santos (Parceira)
                      </div>
                      <div className="text-[10px] text-[#D3D0B5]/80">
                        debora@salao.com · Agenda & Comissões
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] text-[#D3D0B5] group-hover:text-white">Preencher</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full py-4 text-center text-xs text-[#D3D0B5]/60">
        Glaicy Agenda SaaS · Autenticação Segura via Supabase Auth & RLS
      </footer>
    </div>
  );
}
