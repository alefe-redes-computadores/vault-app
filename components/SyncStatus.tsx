"use client";

import { useState, useEffect, useCallback } from "react";
import {
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { useSyncQueue } from "@/hooks/useSyncQueue";
import { useHapticFeedback } from "@/lib/haptics";
import { db } from "@/lib/db";
import { useToast } from "@/components/ToastProvider";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface SyncStatusProps {
  showLabel?: boolean;
  className?: string;
}

export function SyncStatus({
  showLabel = false,
  className = "",
}: SyncStatusProps) {
  const { trigger } = useHapticFeedback();
  const { processQueue, isProcessing, isOnline } = useSyncQueue();
  const { showToast } = useToast();

  const [syncStatus, setSyncStatus] = useState<
    "idle" | "syncing" | "success" | "error"
  >("idle");
  const [pendingCount, setPendingCount] = useState(0);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [isBackgroundSyncing, setIsBackgroundSyncing] = useState(false);

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

  useEffect(() => {
    setIsBackgroundSyncing(isProcessing);
  }, [isProcessing]);

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

  const isSyncingAll = isProcessing;
  const hasPending = pendingCount > 0;

  const getLastSyncLabel = () => {
    if (!lastSyncTime) return "Nunca sincronizado";
    const diff = formatDistanceToNow(lastSyncTime, {
      addSuffix: true,
      locale: ptBR,
    });
    return `Última sync: ${diff}`;
  };

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

  const statusIcon = isSyncingAll ? (
    <Loader2 size={15} className="animate-spin text-ice" />
  ) : syncStatus === "success" ? (
    <CheckCircle size={15} className="text-emerald-400" />
  ) : syncStatus === "error" ? (
    <AlertCircle size={15} className="text-coral" />
  ) : hasPending ? (
    <span className="relative flex h-2.5 w-2.5">
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-coral opacity-75" />
      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-coral" />
    </span>
  ) : (
    <div className="h-2.5 w-2.5 rounded-full bg-emerald-400/60" />
  );

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="relative flex items-center">
        {statusIcon}

        {isBackgroundSyncing && !isSyncingAll && (
          <span className="absolute -right-1 -top-1 flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-ice opacity-70" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-ice" />
          </span>
        )}
      </div>

      <button
        onClick={handleSync}
        disabled={isSyncingAll || !isOnline}
        title={
          !isOnline
            ? "Sem internet"
            : isSyncingAll
            ? "Sincronizando..."
            : "Sincronizar agora"
        }
        className={`flex items-center gap-1 rounded-full px-2 py-1 text-xs transition-all active:scale-[0.97] ${
          isSyncingAll || !isOnline
            ? "cursor-not-allowed text-ink-muted/45"
            : "text-ink-muted hover:bg-surface-raised hover:text-ink-primary"
        }`}
      >
        <RefreshCw size={13} className={isSyncingAll ? "animate-spin" : ""} />

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
              <span className="ml-1 hidden text-[10px] text-ink-muted/60 sm:inline">
                · {getLastSyncLabel()}
              </span>
            )}
          </span>
        )}
      </button>
    </div>
  );
}