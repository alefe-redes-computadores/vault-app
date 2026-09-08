// components/SyncStatusIndicator.tsx
"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  AlertTriangle,
  CheckCircle2,
  CloudOff,
  RefreshCw,
} from "lucide-react";

import {
  useLiveQuery,
} from "dexie-react-hooks";

import {
  db,
} from "@/lib/db";

function useOnlineStatus() {
  const [
    online,
    setOnline,
  ] =
    useState(
      typeof navigator !==
        "undefined"
        ? navigator.onLine
        : true
    );

  useEffect(
    () => {
      const handleOnline =
        () =>
          setOnline(
            true
          );

      const handleOffline =
        () =>
          setOnline(
            false
          );

      window.addEventListener(
        "online",
        handleOnline
      );

      window.addEventListener(
        "offline",
        handleOffline
      );

      return () => {
        window.removeEventListener(
          "online",
          handleOnline
        );

        window.removeEventListener(
          "offline",
          handleOffline
        );
      };
    },
    []
  );

  return online;
}

interface SyncStatusIndicatorProps {
  onOpenDiagnostics?:
    () => void;
}

export function SyncStatusIndicator({
  onOpenDiagnostics,
}: SyncStatusIndicatorProps) {
  const online =
    useOnlineStatus();

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

  const handleClick =
    () => {
      if (
        failedCount ===
          0 &&
        pendingCount ===
          0
      ) {
        return;
      }

      if (
        onOpenDiagnostics
      ) {
        onOpenDiagnostics();

        return;
      }

      window.location.hash =
        "#mais";
    };

  if (
    !online
  ) {
    return (
      <div className="flex items-center gap-1.5 text-amber-400">
        <CloudOff
          size={
            14
          }
        />

        <span className="text-[11px] font-medium">
          Offline
        </span>
      </div>
    );
  }

  if (
    failedCount >
    0
  ) {
    return (
      <button
        type="button"
        onClick={
          handleClick
        }
        className="flex cursor-pointer items-center gap-1.5 rounded-full bg-coral/10 px-2 py-0.5 text-coral transition-opacity hover:opacity-80"
        title="Clique para ver os erros de sincronização"
      >
        <AlertTriangle
          size={
            14
          }
        />

        <span className="text-[11px] font-medium">
          Erro ({failedCount})
        </span>
      </button>
    );
  }

  if (
    pendingCount >
    0
  ) {
    return (
      <button
        type="button"
        onClick={
          handleClick
        }
        className="flex cursor-pointer items-center gap-1.5 text-ice transition-opacity hover:opacity-80"
        title="Itens aguardando sincronização"
      >
        <RefreshCw
          size={
            14
          }
          className="animate-spin"
        />

        <span className="text-[11px] font-medium">
          {pendingCount}{" "}
          {pendingCount ===
          1
            ? "na fila"
            : "na fila"}
        </span>
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1.5 text-emerald-400">
      <CheckCircle2
        size={
          14
        }
      />

      <span className="text-[11px] font-medium">
        Sincronizado
      </span>
    </div>
  );
}
