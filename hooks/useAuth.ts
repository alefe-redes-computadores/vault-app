"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase/client";
import { signIn, signUp, signOut, getCurrentUser } from "@/lib/supabase/auth";
import type { User, AuthError } from "@supabase/supabase-js";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    let mounted = true;

    const getUser = async () => {
      try {
        const { user: currentUser } = await getCurrentUser();
        if (mounted) {
          setUser(currentUser || null);
          setLoading(false);
        }
      } catch (error) {
        console.error("Erro ao buscar usuário:", error);
        if (mounted) {
          setUser(null);
          setLoading(false);
        }
      }
    };

    getUser();

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