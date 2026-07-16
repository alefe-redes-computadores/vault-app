"use client";

import { useEffect } from "react";
import { initDefaultProfiles } from "@/lib/db";
import { useSyncQueue } from "@/hooks/useSyncQueue";

export function Providers({ children }: { children: React.ReactNode }) {
  // Inicializa perfis padrão
  useEffect(() => {
    initDefaultProfiles();
  }, []);

  // Ativa a fila de sincronização
  useSyncQueue();

  return <>{children}</>;
}