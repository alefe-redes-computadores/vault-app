"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  AlertCircle,
  CheckCircle,
  Loader2,
  RefreshCw,
} from "lucide-react";

import {
  useLiveQuery,
} from "dexie-react-hooks";

import {
  formatDistanceToNow,
} from "date-fns";

import {
  ptBR,
} from "date-fns/locale";

import {
  useSyncQueue,
} from "@/hooks/useSyncQueue";

import {
  useHapticFeedback,
} from "@/lib/haptics";

import {
  db,
} from "@/lib/db";

import {
  useToast,
} from "@/components/ToastProvider";

interface SyncStatusProps {
  showLabel?: boolean;
  className?: string;
}

export function SyncStatus({
  showLabel = false,
  className = "",
}: SyncStatusProps) {
  const {
    trigger,
  } =
    useHapticFeedback();

  const {
    processQueue,
    isProcessing,
    isOnline,
  } =
    useSyncQueue();

  const {
    showToast,
  } =
    useToast();

  const [
    syncStatus,
    setSyncStatus,
  ] =
    useState<
      | "idle"
      | "syncing"
      | "success"
      | "error"
    >(
      "idle"
    );

  const [
    lastSyncTime,
    setLastSyncTime,
  ] =
    useState<
      Date | null
    >(
      null
    );

  const pendingCount =
    useLiveQuery(
      () =>
        db.syncQueue
          .filter(
            (
              item
            ) =>
              item.failed !==
              true
          )
          .count(),
      []
    ) ??
    0;

  const failedCount =
    useLiveQuery(
      () =>
        db.syncQueue
          .filter(
            (
              item
            ) =>
              item.failed ===
              true
          )
          .count(),
      []
    ) ??
    0;

  useEffect(
    () => {
      const saved =
        localStorage.getItem(
          "vault_last_sync"
        );

      if (
        !saved
      ) {
        return;
      }

      try {
        setLastSyncTime(
          new Date(
            JSON.parse(
              saved
            )
          )
        );
      } catch {
        setLastSyncTime(
          null
        );
      }
    },
    []
  );

  const updateLastSyncTime =
    () => {
      const now =
        new Date();

      setLastSyncTime(
        now
      );

      localStorage.setItem(
        "vault_last_sync",
        JSON.stringify(
          now.toISOString()
        )
      );
    };

  const hasPending =
    pendingCount >
    0;

  const hasFailed =
    failedCount >
    0;

  const getLastSyncLabel =
    () => {
      if (
        !lastSyncTime
      ) {
        return "Nunca sincronizado";
      }

      const diff =
        formatDistanceToNow(
          lastSyncTime,
          {
            addSuffix:
              true,

            locale:
              ptBR,
          }
        );

      return `Última sync: ${diff}`;
    };

  const handleSync =
    async () => {
      if (
        !isOnline
      ) {
        trigger(
          "error"
        );

        setSyncStatus(
          "error"
        );

        showToast(
          "Sem conexão com a internet",
          "error"
        );

        setTimeout(
          () =>
            setSyncStatus(
              "idle"
            ),
          3000
        );

        return;
      }

      if (
        isProcessing
      ) {
        return;
      }

      setSyncStatus(
        "syncing"
      );

      trigger(
        "vibrate"
      );

      showToast(
        "Sincronizando dados...",
        "info"
      );

      try {
        const result =
          await processQueue();

        const remaining =
          result.remaining;

        const permanentlyFailed =
          result.permanentlyFailed;

        if (
          permanentlyFailed >
          0
        ) {
          setSyncStatus(
            "error"
          );

          showToast(
            `${permanentlyFailed} item${permanentlyFailed === 1 ? "" : "s"} com erro de sincronização`,
            "error"
          );
        } else if (
          remaining >
          0
        ) {
          setSyncStatus(
            "idle"
          );

          showToast(
            `${remaining} item${remaining === 1 ? "" : "s"} ainda aguardando sincronização`,
            "info"
          );
        } else {
          setSyncStatus(
            "success"
          );

          updateLastSyncTime();

          showToast(
            "Dados sincronizados com sucesso!",
            "success"
          );
        }

        setTimeout(
          () =>
            setSyncStatus(
              "idle"
            ),
          3000
        );
      } catch (
        error
      ) {
        console.error(
          "Erro na sincronização:",
          error
        );

        setSyncStatus(
          "error"
        );

        showToast(
          "Erro ao sincronizar dados",
          "error"
        );

        setTimeout(
          () =>
            setSyncStatus(
              "idle"
            ),
          3000
        );
      }
    };

  const syncing =
    isProcessing ||
    syncStatus ===
      "syncing";

  const statusIcon =
    syncing
      ? (
          <Loader2
            size={
              15
            }
            className="animate-spin text-ice"
          />
        )
      : hasFailed ||
          syncStatus ===
            "error"
        ? (
            <AlertCircle
              size={
                15
              }
              className="text-coral"
            />
          )
        : syncStatus ===
            "success"
          ? (
              <CheckCircle
                size={
                  15
                }
                className="text-emerald-400"
              />
            )
          : hasPending
            ? (
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-ice opacity-60" />

                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-ice" />
                </span>
              )
            : (
                <span className="glow-ice relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
              );

  const label =
    !isOnline
      ? "Offline"
      : syncing
        ? "Sincronizando..."
        : hasFailed
          ? `${failedCount} com erro`
          : hasPending
            ? `${pendingCount} pendente${pendingCount === 1 ? "" : "s"}`
            : "Sincronizado";

  return (
    <div
      className={`flex items-center gap-2 ${className}`}
    >
      <div className="relative flex items-center">
        {
          statusIcon
        }
      </div>

      <button
        type="button"
        onClick={
          handleSync
        }
        disabled={
          syncing ||
          !isOnline
        }
        title={
          !isOnline
            ? "Sem internet"
            : syncing
              ? "Sincronizando..."
              : hasFailed
                ? "Há itens com erro de sincronização"
                : "Sincronizar agora"
        }
        className={`flex items-center gap-1 rounded-full px-2 py-1 text-xs transition-all active:scale-[0.97] ${
          syncing ||
          !isOnline
            ? "cursor-not-allowed text-ink-muted/45"
            : hasFailed
              ? "text-coral hover:bg-coral/8"
              : "text-ink-muted hover:bg-ice/8 hover:text-ice"
        }`}
      >
        <RefreshCw
          size={
            13
          }
          className={
            syncing
              ? "animate-spin"
              : ""
          }
        />

        {showLabel && (
          <span className="flex items-center gap-1">
            {
              label
            }

            {!syncing &&
              !hasPending &&
              !hasFailed &&
              isOnline &&
              lastSyncTime && (
                <span className="ml-1 hidden text-[10px] text-ink-muted/60 sm:inline">
                  ·{" "}
                  {
                    getLastSyncLabel()
                  }
                </span>
              )}
          </span>
        )}
      </button>
    </div>
  );
}
