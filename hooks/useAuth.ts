"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase/client";
import { signIn, signUp, signOut, getCurrentUser } from "@/lib/supabase/auth";
import type { User } from "@supabase/supabase-js";

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
    const { data, error } = await signIn(email, password);
    if (error) throw error;
    return data;
  }, []);

  const register = useCallback(async (email: string, password: string) => {
    const { data, error } = await signUp(email, password);
    if (error) throw error;
    return data;
  }, []);

  // ✅ REMOVIDO: signInWithGoogle agora é gerenciado exclusivamente em login/page.tsx
  // O login com Google é feito via handleGoogleLogin na página de login

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
    // signInWithGoogle removido - use o handleGoogleLogin do login/page.tsx
  };
}