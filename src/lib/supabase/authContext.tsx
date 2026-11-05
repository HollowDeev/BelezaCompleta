"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase, isSupabaseConfigured } from "./client";
import { UserProfile, UserRole } from "@/types/salon";
import { SupabaseDataService } from "./api";

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  role: UserRole | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password?: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  switchSimulatedUser?: (role: UserRole) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  role: null,
  session: null,
  loading: true,
  signIn: async () => ({ error: null }),
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Carrega perfil associado ao usuário
  const loadProfile = async (currentUser: User | null) => {
    if (!currentUser) {
      setProfile(null);
      return;
    }

    try {
      const profiles = await SupabaseDataService.getProfiles();
      const matched =
        profiles.find(
          (p) =>
            p.id === currentUser.id ||
            p.email.toLowerCase() === currentUser.email?.toLowerCase()
        ) || null;

      if (matched) {
        setProfile(matched);
      } else {
        // Fallback básico a partir de metadata
        const role = (currentUser.user_metadata?.role as UserRole) || "professional";
        setProfile({
          id: currentUser.id,
          orgId: "11111111-1111-4111-8111-111111111111",
          name: currentUser.user_metadata?.name || currentUser.email || "Usuário",
          email: currentUser.email || "",
          phone: "",
          role,
          dashboardMode: role === "super_admin" ? "advanced" : "intermediary",
          isActive: true,
        });
      }
    } catch (err) {
      console.error("Error loading user profile", err);
    }
  };

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      // Simulação local caso não configurado
      setLoading(false);
      return;
    }

    // Inicialização da sessão atual
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      if (currentSession?.user) {
        loadProfile(currentSession.user).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    // Ouvinte de mudanças no auth
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      if (newSession?.user) {
        await loadProfile(newSession.user);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password?: string): Promise<{ error: string | null }> => {
    if (!isSupabaseConfigured || !supabase) {
      return { error: "Supabase não está configurado." };
    }

    if (!email || !password) {
      return { error: "Por favor, preencha o e-mail e a senha." };
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        return { error: error.message };
      }

      if (data.user) {
        setUser(data.user);
        setSession(data.session);
        await loadProfile(data.user);
      }

      return { error: null };
    } catch (err: any) {
      return { error: err.message || "Erro ao conectar" };
    }
  };

  const signOut = async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    setUser(null);
    setSession(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        role: profile?.role || (user?.user_metadata?.role as UserRole) || null,
        session,
        loading,
        signIn,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
