// components/GlobalSyncIssueAlert.tsx
"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, ChevronRight, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";

import { db } from "@/lib/db";
import { useVaultSyncRuntime } from "@/lib/sync/runtime-status";

const ACTIVITY_DELAY_MS = 700;

// VAULT_GLOBAL_SYNC_FEEDBACK_V85
// Operações rápidas continuam invisíveis. Após 700 ms aparece uma cápsula
// discreta, sem bloquear cliques. Falha real mantém a ação persistente.
export function GlobalSyncIssueAlert() {
  const router = useRouter();
  const runtime = useVaultSyncRuntime();
  const [showActivity, setShowActivity] = useState(false);
  const failedCount = useLiveQuery(
    () => db.syncQueue.filter((item) => item.failed === true).count(),
    [],
    0
  );

  const active =
    runtime.phase === "pulling" ||
    runtime.phase === "pushing" ||
    runtime.phase === "background";

  useEffect(() => {
    if (!active) {
      setShowActivity(false);
      return;
    }

    const timer = window.setTimeout(() => setShowActivity(true), ACTIVITY_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [active]);

  if (failedCount > 0 || runtime.phase === "error") {
    return (
      <button
        type="button"
        onClick={() => router.push("/diagnostico")}
        className="fixed left-1/2 top-[max(0.75rem,env(safe-area-inset-top))] z-[90] flex w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 items-center gap-2 rounded-2xl border border-coral/30 bg-surface/95 px-3 py-2.5 text-left text-coral shadow-xl shadow-black/30 backdrop-blur-xl active:scale-[0.985]"
        role="alert"
      >
        <AlertTriangle size={16} className="shrink-0" />
        <span className="min-w-0 flex-1">
          <strong className="block text-xs">Sincronização precisa de atenção</strong>
          <span className="block truncate text-[10px] text-ink-muted">
            {failedCount > 0
              ? `${failedCount} ${failedCount === 1 ? "registro não foi enviado" : "registros não foram enviados"}`
              : "A última tentativa não foi concluída"}
          </span>
        </span>
        <ChevronRight size={15} className="shrink-0" />
      </button>
    );
  }

  if (!showActivity) return null;

  return (
    <div
      className="pointer-events-none fixed left-1/2 top-[max(0.75rem,env(safe-area-inset-top))] z-[89] flex -translate-x-1/2 items-center gap-2 rounded-full border border-emerald-400/20 bg-surface/90 px-3 py-2 text-emerald-300 shadow-lg shadow-black/20 backdrop-blur-xl"
      role="status"
      aria-live="polite"
    >
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
      </span>
      <RefreshCw size={13} className="animate-spin" />
      <span className="whitespace-nowrap text-[11px] font-semibold">Sincronizando</span>
    </div>
  );
}
