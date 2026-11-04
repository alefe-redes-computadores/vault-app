// components/GlobalSyncIssueAlert.tsx
"use client";

import { AlertTriangle, ChevronRight } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useVaultSyncRuntime } from "@/lib/sync/runtime-status";
import { useSyncQueueSummary } from "@/hooks/useSyncQueueSummary";

// VAULT_SYNC_TRUTH_V95_2
// Atividade saudável é silenciosa fora de Mais.
// Somente falha terminal interrompe o contexto atual.
export function GlobalSyncIssueAlert() {
  const router = useRouter();
  const pathname = usePathname();
  const runtime = useVaultSyncRuntime();
  const { failed: failedCount, unavailable: queueUnavailable } = useSyncQueueSummary();

  // A fixed warning must not obscure the very screen used to inspect or recover the failure.
  if (pathname === "/diagnostico" || pathname === "/recuperacao") return null;
  if (failedCount <= 0 && runtime.phase !== "error" && !queueUnavailable) return null;

  return (
    <button
      type="button"
      onClick={() => router.push("/diagnostico")}
      className="fixed left-1/2 z-[90] flex min-h-12 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 items-center gap-2 rounded-2xl border border-coral/30 bg-surface/95 px-3 py-2.5 text-left text-coral shadow-xl shadow-black/30 backdrop-blur-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-ice active:scale-[0.985]"
      style={{ top: "calc(max(env(safe-area-inset-top, 0px), var(--vault-native-statusbar-fallback, 0px)) + 12px)" }}
      role="alert"
      aria-label="Abrir diagnóstico de sincronização"
    >
      <AlertTriangle size={16} className="shrink-0" />
      <span className="min-w-0 flex-1">
        <strong className="block text-xs">Sincronização precisa de atenção</strong>
        <span className="block truncate text-[10px] text-ink-muted">
          {failedCount > 0
            ? `${failedCount} ${failedCount === 1 ? "registro não foi enviado" : "registros não foram enviados"}`
            : queueUnavailable ? "Não foi possível consultar a fila local" : "A última tentativa não foi concluída"}
        </span>
      </span>
      <ChevronRight size={15} className="shrink-0" />
    </button>
  );
}
