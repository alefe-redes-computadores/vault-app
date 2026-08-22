// components/SyncStatusIndicator.tsx
"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useState, useEffect } from "react";
import { CloudOff, RefreshCw, CheckCircle2, AlertTriangle } from "lucide-react";
import { db } from "@/lib/db";

function useOnlineStatus() {
  const [online, setOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return online;
}

export function SyncStatusIndicator() {
  const online = useOnlineStatus();
  
  // Conta itens pendentes normais
  const pendingCount = useLiveQuery(
    () => db.syncQueue.filter((item) => !item.failed).count(),
    []
  ) ?? 0;

  // Conta itens que falharam (travados na fila)
  const failedCount = useLiveQuery(
    () => db.syncQueue.filter((item) => !!item.failed).count(),
    []
  ) ?? 0;

  if (!online) {
    return (
      <div className="flex items-center gap-1.5 text-amber-400">
        <CloudOff size={14} />
        <span className="text-[11px] font-medium">Offline</span>
      </div>
    );
  }

  // Se tem itens falhos, mostramos o erro vermelho para não "mentir" que está sincronizado
  if (failedCount > 0) {
    return (
      <div className="flex items-center gap-1.5 text-coral">
        <AlertTriangle size={14} />
        <span className="text-[11px] font-medium">Erro de Sinc.</span>
      </div>
    );
  }

  if (pendingCount > 0) {
    return (
      <div className="flex items-center gap-1.5 text-ice">
        <RefreshCw size={14} className="animate-spin" />
        <span className="text-[11px] font-medium">Sincronizando...</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 text-emerald-400">
      <CheckCircle2 size={14} />
      <span className="text-[11px] font-medium">Sincronizado</span>
    </div>
  );
}
