"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { initDefaultProfiles } from "@/lib/db";
import { useSyncQueue } from "@/hooks/useSyncQueue";
import { useAuth } from "@/hooks/useAuth";
import { BottomNav } from "@/components/BottomNav";
import { supabase } from "@/lib/supabase/client";

export function Providers({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading } = useAuth();

  // Inicializa perfis padrão
  useEffect(() => {
    initDefaultProfiles();
  }, []);

  // Ativa a fila de sincronização
  useSyncQueue();

  // Listener para mudanças de autenticação (redireciona após login)
  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) {
        router.push("/");
      }
      if (event === "SIGNED_OUT") {
        router.push("/login");
      }
    });

    return () => listener?.subscription.unsubscribe();
  }, [router]);

  // Se estiver carregando, mostra loading
  if (loading) {
    return (
      <div className="min-h-screen bg-void flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-ice border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-ink-muted mt-4">Carregando...</p>
        </div>
      </div>
    );
  }

  // Se não estiver autenticado e não estiver na página de login ou callback
  if (!user && pathname !== "/login" && pathname !== "/auth/callback") {
    router.push("/login");
    return null;
  }

  // Se estiver na página de login ou callback, não mostra BottomNav
  if (pathname === "/login" || pathname === "/auth/callback") {
    return <>{children}</>;
  }

  // Páginas principais com BottomNav
  return (
    <div className="min-h-screen pb-24">
      {children}
      <BottomNav />
    </div>
  );
}