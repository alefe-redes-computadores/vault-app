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

interface SyncStatusIndicatorProps {
  onOpenDiagnostics?: () => void;
}

export function SyncStatusIndicator({ onOpenDiagnostics }: SyncStatusIndicatorProps) {
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

  // Ação ao clicar no indicador quando houver pendências ou erros
  const handleClick = () => {
    if (failedCount > 0 || pendingCount > 0) {
      if (onOpenDiagnostics) {
        onOpenDiagnostics();
      } else {
        // Fallback: redireciona para a seção de diagnóstico na página Mais
        window.location.hash = "#mais";
      }
    }
  };

  if (!online) {
    return (
      <div className="flex items-center gap-1.5 text-amber-400">
        <CloudOff size={14} />
        <span className="text-[11px] font-medium">Offline</span>
      </div>
    );
  }

  // Se tem itens falhos, vira um botão clicável que avisa o erro exato
  if (failedCount > 0) {
    return (
      <button 
        onClick={handleClick}
        className="flex items-center gap-1.5 text-coral hover:opacity-80 transition-opacity cursor-pointer bg-coral/10 px-2 py-0.5 rounded-full"
        title="Clique para ver os erros de sincronização"
      >
        <AlertTriangle size={14} />
        <span className="text-[11px] font-medium">Erro ({failedCount})</span>
      </button>
    );
  }

  if (pendingCount > 0) {
    return (
      <button 
        onClick={handleClick}
        className="flex items-center gap-1.5 text-ice hover:opacity-80 transition-opacity cursor-pointer"
        title="Itens na fila de envio"
      >
        <RefreshCw size={14} className="animate-spin" />
        <span className="text-[11px] font-medium">{pendingCount} na fila</span>
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1.5 text-emerald-400">
      <CheckCircle2 size={14} />
      <span className="text-[11px] font-medium">Sincronizado</span>
    </div>
  );
}
