"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase/client";
import { signIn, signUp, signOut, getPersistedSession } from "@/lib/supabase/auth";
import type { User, AuthError } from "@supabase/supabase-js";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    let mounted = true;

    const restoreSession = async () => {
      try {
        const { session, error } = await getPersistedSession();
        if (error) throw error;
        if (mounted) {
          setUser(session?.user || null);
          setLoading(false);
        }
      } catch (error) {
        console.error("Erro ao restaurar sessão local:", error);
        if (mounted) {
          setUser(null);
          setLoading(false);
        }
      }
    };

    void restoreSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (mounted) {
          setUser(session?.user || null);
          setLoading(false);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const result = await signIn(email, password);
    if (result.error) {
      return { data: null, error: result.error };
    }
    return { data: result.data, error: null };
  }, []);

  const register = useCallback(async (email: string, password: string) => {
    const result = await signUp(email, password);
    if (result.error) {
      return { data: null, error: result.error };
    }
    return { data: result.data, error: null };
  }, []);

  const logout = useCallback(async () => {
    const { error } = await signOut();
    if (error) throw error;
    setUser(null);
  }, []);

  return {
    user,
    loading,
    isSyncing,
    login,
    register,
    logout,
  };
}
