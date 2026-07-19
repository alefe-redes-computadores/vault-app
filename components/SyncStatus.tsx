"use client";

import { useState, useEffect } from "react";
import { RefreshCw, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { useSyncQueue } from "@/hooks/useSyncQueue";
import { useAuth } from "@/hooks/useAuth";
import { useHapticFeedback } from "@/lib/haptics";
import { db } from "@/lib/db";

interface SyncStatusProps {
  showLabel?: boolean;
  className?: string;
}

export function SyncStatus({ showLabel = false, className = "" }: SyncStatusProps) {
  const { trigger } = useHapticFeedback();
  const { processQueue, isProcessing, isOnline } = useSyncQueue();
  const { refresh, isSyncing } = useAuth();
  const [syncStatus, setSyncStatus] = useState<"idle" | "syncing" | "success" | "error">("idle");
  const [pendingCount, setPendingCount] = useState(0);

  // Verifica quantos itens estão pendentes na fila
  useEffect(() => {
    const checkPending = async () => {
      const pending = await db.syncQueue.where('table').notEqual('').count();
      setPendingCount(pending);
    };

    checkPending();
    const interval = setInterval(checkPending, 5000);
    return () => clearInterval(interval);
  }, []);

  const isSyncingAll = isProcessing || isSyncing;

  const handleSync = async () => {
    if (!isOnline) {
      trigger("error");
      setSyncStatus("error");
      setTimeout(() => setSyncStatus("idle"), 3000);
      return;
    }

    if (isSyncingAll) return;

    setSyncStatus("syncing");
    trigger("vibrate");

    try {
      // Primeiro faz push (envia dados locais para nuvem)
      await processQueue();
      
      // Depois faz pull (puxa dados da nuvem para local)
      await refresh();
      
      setSyncStatus("success");
      
      // Atualiza contagem após sync
      const pending = await db.syncQueue.where('table').notEqual('').count();
      setPendingCount(pending);
      
      setTimeout(() => setSyncStatus("idle"), 3000);
    } catch (error) {
      console.error("Erro na sincronização:", error);
      setSyncStatus("error");
      setTimeout(() => setSyncStatus("idle"), 3000);
    }
  };

  const hasPending = pendingCount > 0;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Indicador visual */}
      <div className="relative flex items-center">
        {isSyncingAll ? (
          <Loader2 size={16} className="text-ice animate-spin" />
        ) : syncStatus === "success" ? (
          <CheckCircle size={16} className="text-green-400" />
        ) : syncStatus === "error" ? (
          <AlertCircle size={16} className="text-coral" />
        ) : (
          <div className="flex items-center gap-1">
            {hasPending && (
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-coral opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-coral" />
              </span>
            )}
            {!hasPending && (
              <div className="w-2 h-2 rounded-full bg-green-400/50" />
            )}
          </div>
        )}
      </div>

      {/* Botão de sincronização manual */}
      <button
        onClick={handleSync}
        disabled={isSyncingAll || !isOnline}
        className={`flex items-center gap-1 text-xs transition-all active:scale-[0.95] ${
          isSyncingAll || !isOnline
            ? "text-ink-muted/50 cursor-not-allowed"
            : "text-ink-muted hover:text-ink-primary"
        }`}
        title={!isOnline ? "Sem internet" : isSyncingAll ? "Sincronizando..." : "Sincronizar agora"}
      >
        <RefreshCw size={14} className={isSyncingAll ? "animate-spin" : ""} />
        {showLabel && (
          <span>
            {isSyncingAll
              ? "Sincronizando..."
              : hasPending
              ? `${pendingCount} pendente${pendingCount > 1 ? "s" : ""}`
              : isOnline
              ? "Sincronizado"
              : "Offline"}
          </span>
        )}
      </button>
    </div>
  );
}