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
    <div className="min-h-screen bg-[#1E120E] text-[#F5EDE4] flex flex-col justify-between selection:bg-[#c59b27]/30 selection:text-[#FAF7F2]">
      {/* Background Decorativo com gradiente dourado e chocolate */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-[#c59b27]/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-[#54352a]/30 blur-3xl" />
      </div>

      {/* Header Minimalista */}
      <header className="relative z-10 w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#c59b27] to-[#8C6B1B] p-0.5 shadow-lg shadow-[#c59b27]/20 group-hover:scale-105 transition-transform">
            <div className="w-full h-full bg-[#2D1914] rounded-[10px] flex items-center justify-center">
              <Scissors className="w-5 h-5 text-[#E5C158]" />
            </div>
          </div>
          <div>
            <span className="text-base font-bold tracking-tight text-white block">
              Glaicy Agenda
            </span>
            <span className="text-xs text-[#C4B2A7] tracking-wider uppercase">
              Portal Restrito
            </span>
          </div>
        </Link>

        <Link
          href="/"
          className="text-xs text-[#E5C158] hover:text-[#f3d47c] transition-colors flex items-center gap-1.5 font-medium bg-[#2D1914]/60 px-3 py-1.5 rounded-full border border-[#c59b27]/20"
        >
          ← Voltar para a Vitrine
        </Link>
      </header>

      {/* Card Central de Login */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          {/* Card Principal */}
          <div className="bg-[#2D1914]/90 backdrop-blur-xl border border-[#c59b27]/30 rounded-3xl p-8 shadow-2xl shadow-black/60 relative overflow-hidden">
            {/* Linha de brilho superior */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#E5C158] to-transparent opacity-75" />

            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-[#c59b27]/20 to-transparent border border-[#c59b27]/40 mb-4 shadow-inner">
                <Lock className="w-6 h-6 text-[#E5C158]" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-white">
                Acesso do Sistema
              </h1>
              <p className="text-sm text-[#C4B2A7] mt-1.5">
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
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#C4B2A7] mb-2">
                  E-mail de Acesso
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#A8988F] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ex: seu.email@salao.com"
                    className="w-full pl-10 pr-4 py-3 bg-[#1E120E]/80 border border-[#4A322B] rounded-xl text-white placeholder-[#786962] text-sm focus:outline-none focus:border-[#E5C158] focus:ring-1 focus:ring-[#E5C158] transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#C4B2A7] mb-2">
                  Senha
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#A8988F] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-11 py-3 bg-[#1E120E]/80 border border-[#4A322B] rounded-xl text-white placeholder-[#786962] text-sm focus:outline-none focus:border-[#E5C158] focus:ring-1 focus:ring-[#E5C158] transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Ocultar senha" : "Exibir senha"}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#A8988F] hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 py-3.5 px-4 bg-gradient-to-r from-[#c59b27] via-[#d4af37] to-[#b38a1f] hover:from-[#d4af37] hover:to-[#c59b27] text-[#1E120E] font-bold text-sm rounded-xl shadow-lg shadow-[#c59b27]/25 flex items-center justify-center gap-2 transition-all transform active:scale-[0.99] disabled:opacity-50"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-[#1E120E] border-t-transparent rounded-full animate-spin" />
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
            <div className="mt-8 pt-6 border-t border-[#4A322B]/60">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#C4B2A7]">
                  Acessos de Teste (1-Clique)
                </span>
                <span className="text-[10px] text-[#E5C158] bg-[#E5C158]/10 px-2 py-0.5 rounded-full border border-[#E5C158]/20">
                  Banco Supabase Ativo
                </span>
              </div>

              <div className="grid grid-cols-1 gap-2">
                <button
                  type="button"
                  onClick={() => handleQuickLogin("thaua@admin.com")}
                  className="w-full text-left p-2.5 rounded-xl bg-[#1E120E]/60 hover:bg-[#1E120E] border border-[#4A322B] hover:border-[#c59b27]/60 transition-all flex items-center justify-between group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-[#c59b27]/20 flex items-center justify-center text-[#E5C158]">
                      <Shield className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-white group-hover:text-[#E5C158] transition-colors">
                        Thaua (Super Admin)
                      </div>
                      <div className="text-[10px] text-[#A8988F]">
                        thaua@admin.com · Acesso Total SaaS
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] text-[#C4B2A7] group-hover:text-white">Preencher</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickLogin("gleicy@salao.com")}
                  className="w-full text-left p-2.5 rounded-xl bg-[#1E120E]/60 hover:bg-[#1E120E] border border-[#4A322B] hover:border-[#c59b27]/60 transition-all flex items-center justify-between group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-[#8C6B1B]/20 flex items-center justify-center text-[#d4af37]">
                      <Building2 className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-white group-hover:text-[#E5C158] transition-colors">
                        Gleicy Ronha (Dona)
                      </div>
                      <div className="text-[10px] text-[#A8988F]">
                        gleicy@salao.com · Painel do Salão
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] text-[#C4B2A7] group-hover:text-white">Preencher</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickLogin("debora@salao.com")}
                  className="w-full text-left p-2.5 rounded-xl bg-[#1E120E]/60 hover:bg-[#1E120E] border border-[#4A322B] hover:border-[#c59b27]/60 transition-all flex items-center justify-between group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-[#54352a]/40 flex items-center justify-center text-[#C4B2A7]">
                      <User className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-white group-hover:text-[#E5C158] transition-colors">
                        Débora Santos (Parceira)
                      </div>
                      <div className="text-[10px] text-[#A8988F]">
                        debora@salao.com · Agenda & Comissões
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] text-[#C4B2A7] group-hover:text-white">Preencher</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full py-4 text-center text-xs text-[#786962]">
        Glaicy Agenda SaaS · Autenticação Segura via Supabase Auth & RLS
      </footer>
    </div>
  );
}
