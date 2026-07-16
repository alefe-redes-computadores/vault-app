"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSyncQueue } from "@/hooks/useSyncQueue";
import { useAuth } from "@/hooks/useAuth";
import { BottomNav } from "./BottomNav";

export function Providers({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading } = useAuth();

  // Ativa a fila de sincronização
  useSyncQueue();

  // Listener para mudanças de autenticação
  useEffect(() => {
    // Redireciona para login se não estiver autenticado
    if (!loading && !user && pathname !== "/login" && pathname !== "/auth/callback") {
      router.push("/login");
    }
  }, [loading, user, pathname, router]);

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
    return <>{children}</>;
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