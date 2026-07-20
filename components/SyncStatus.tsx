"use client";

import { useState, useEffect } from "react";
import { RefreshCw, CheckCircle, AlertCircle, Loader2, Clock } from "lucide-react";
import { useSyncQueue } from "@/hooks/useSyncQueue";
import { useAuth } from "@/hooks/useAuth";
import { useHapticFeedback } from "@/lib/haptics";
import { db } from "@/lib/db";
import { useToast } from "@/components/ToastProvider";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface SyncStatusProps {
  showLabel?: boolean;
  className?: string;
}

export function SyncStatus({ showLabel = false, className = "" }: SyncStatusProps) {
  const { trigger } = useHapticFeedback();
  const { processQueue, isProcessing, isOnline } = useSyncQueue();
  const { refresh, isSyncing } = useAuth();
  const { showToast } = useToast();
  const [syncStatus, setSyncStatus] = useState<"idle" | "syncing" | "success" | "error">("idle");
  const [pendingCount, setPendingCount] = useState(0);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [isBackgroundSyncing, setIsBackgroundSyncing] = useState(false);

  // Carrega a última sincronização do localStorage
  useEffect(() => {
    const saved = localStorage.getItem("vault_last_sync");
    if (saved) {
      try {
        setLastSyncTime(new Date(JSON.parse(saved)));
      } catch {
        setLastSyncTime(null);
      }
    }
  }, []);

  // Monitora se está sincronizando em background
  useEffect(() => {
    setIsBackgroundSyncing(isProcessing || isSyncing);
  }, [isProcessing, isSyncing]);

  // Atualiza o tempo de última sincronização
  const updateLastSyncTime = () => {
    const now = new Date();
    setLastSyncTime(now);
    localStorage.setItem("vault_last_sync", JSON.stringify(now.toISOString()));
  };

  useEffect(() => {
    const checkPending = async () => {
      try {
        const pending = await db.syncQueue.count();
        setPendingCount(pending);
      } catch (error) {
        console.error("Erro ao verificar fila:", error);
      }
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
      showToast("Sem conexão com a internet", "error");
      setTimeout(() => setSyncStatus("idle"), 3000);
      return;
    }

    if (isSyncingAll) return;

    setSyncStatus("syncing");
    trigger("vibrate");
    showToast("Sincronizando dados...", "info");

    try {
      await processQueue();
      await refresh();
      
      setSyncStatus("success");
      const pending = await db.syncQueue.count();
      setPendingCount(pending);
      updateLastSyncTime();
      
      showToast("Dados sincronizados com sucesso!", "success");
      setTimeout(() => setSyncStatus("idle"), 3000);
    } catch (error) {
      console.error("Erro na sincronização:", error);
      setSyncStatus("error");
      showToast("Erro ao sincronizar dados", "error");
      setTimeout(() => setSyncStatus("idle"), 3000);
    }
  };

  const hasPending = pendingCount > 0;

  const getLastSyncLabel = () => {
    if (!lastSyncTime) return "Nunca sincronizado";
    const diff = formatDistanceToNow(lastSyncTime, { 
      addSuffix: true,
      locale: ptBR 
    });
    return `Última sync: ${diff}`;
  };

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
        
        {/* Indicador de sincronização em background (pisca suavemente) */}
        {isBackgroundSyncing && !isSyncingAll && (
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-ice opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-ice" />
          </span>
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
          <span className="flex items-center gap-1">
            {isSyncingAll
              ? "Sincronizando..."
              : hasPending
              ? `${pendingCount} pendente${pendingCount > 1 ? "s" : ""}`
              : isOnline
              ? "Sincronizado"
              : "Offline"}
            {!isSyncingAll && !hasPending && isOnline && lastSyncTime && (
              <span className="text-[10px] text-ink-muted/60 ml-1 hidden sm:inline">
                · {getLastSyncLabel()}
              </span>
            )}
          </span>
        )}
      </button>
    </div>
  );
}