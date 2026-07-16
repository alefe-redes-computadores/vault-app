"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { initDefaultProfiles } from "@/lib/db";
import { useSyncQueue } from "@/hooks/useSyncQueue";
import { useAuth } from "@/hooks/useAuth";
import { BottomNav } from "./BottomNav";

export function Providers({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, loading } = useAuth();

  // Inicializa perfis padrão
  useEffect(() => {
    initDefaultProfiles();
  }, []);

  // Ativa a fila de sincronização
  useSyncQueue();

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

  // Se não estiver autenticado, mostra só o login
  if (!user && pathname !== "/login") {
    return <>{children}</>;
  }

  // Se estiver na página de login, não mostra BottomNav
  if (pathname === "/login") {
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