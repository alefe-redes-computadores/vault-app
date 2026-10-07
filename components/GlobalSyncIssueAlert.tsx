// components/GlobalSyncIssueAlert.tsx
"use client";

import { AlertTriangle, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { useVaultSyncRuntime } from "@/lib/sync/runtime-status";

// VAULT_SYNC_TRUTH_V95_2
// Atividade saudável é silenciosa fora de Mais.
// Somente falha terminal interrompe o contexto atual.
export function GlobalSyncIssueAlert() {
  const router = useRouter();
  const runtime = useVaultSyncRuntime();
  const failedCount = useLiveQuery(
    () => db.syncQueue.filter((item) => item.failed === true).count(),
    [],
    0
  );

  if (failedCount <= 0 && runtime.phase !== "error") return null;

  return (
    <button
      type="button"
      onClick={() => router.push("/diagnostico")}
      className="fixed left-1/2 z-[90] flex w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 items-center gap-2 rounded-2xl border border-coral/30 bg-surface/95 px-3 py-2.5 text-left text-coral shadow-xl shadow-black/30 backdrop-blur-xl active:scale-[0.985]"
      style={{ top: "calc(max(env(safe-area-inset-top, 0px), var(--vault-native-statusbar-fallback, 0px)) + 12px)" }}
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
