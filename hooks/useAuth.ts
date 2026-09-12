"use client";

import { createContext, createElement, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/lib/supabase/client";
import { signIn, signUp, signOut, getPersistedSession } from "@/lib/supabase/auth";
import type { User } from "@supabase/supabase-js";

function useAuthState() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSyncing] = useState(false);

  useEffect(() => {
    let mounted = true;

    const restoreSession = async () => {
      try {
        const { session, error } = await getPersistedSession();
        if (error) throw error;
        if (mounted) setUser(session?.user || null);
      } catch (error) {
        console.error("Erro ao restaurar sessão local:", error);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void restoreSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      if (session?.user) {
        setUser(session.user);
      } else if (event === "SIGNED_OUT" || event === "INITIAL_SESSION") {
        setUser(null);
      }
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const result = await signIn(email, password);
    return result.error ? { data: null, error: result.error } : { data: result.data, error: null };
  }, []);

  const register = useCallback(async (email: string, password: string) => {
    const result = await signUp(email, password);
    return result.error ? { data: null, error: result.error } : { data: result.data, error: null };
  }, []);

  const logout = useCallback(async () => {
    const { error } = await signOut();
    if (error) throw error;
    setUser(null);
  }, []);

  return { user, loading, isSyncing, login, register, logout };
}

type AuthContextValue = ReturnType<typeof useAuthState>;
const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const value = useAuthState();
  return createElement(AuthContext.Provider, { value }, children);
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth precisa estar dentro de AuthProvider.");
  return context;
}
