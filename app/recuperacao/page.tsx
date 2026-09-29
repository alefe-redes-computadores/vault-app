"use client";
// VAULT_RECOVERY_CENTER_V68

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  Cloud,
  Database,
  Download,
  Loader2,
  RefreshCw,
  ShieldCheck,
  TriangleAlert,
  WifiOff,
} from "lucide-react";
import { useLiveQuery } from "dexie-react-hooks";

import { PageTransition } from "@/components/PageTransition";
import { ExportButton } from "@/components/ExportButton";
import { useAuth } from "@/hooks/useAuth";
import { useSyncQueue } from "@/hooks/useSyncQueue";
import { useVaultSyncRuntime } from "@/lib/sync/runtime-status";
import { pullAllData } from "@/lib/sync/pull";
import { db } from "@/lib/db";
import {
  getPullDiagnostics,
  type VaultPullRun,
} from "@/lib/sync/diagnostics";

function formatWhen(value: string | null) {
  if (!value) return "Ainda não registrado";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Ainda não registrado";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function formatDuration(ms: number | null) {
  if (ms == null) return "—";
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(ms < 10_000 ? 1 : 0)} s`;
}

export default function RecoveryCenterPage() {
  const router = useRouter();
  const { user } = useAuth();
  const syncRuntime = useVaultSyncRuntime();
  const { processQueue, isOnline } = useSyncQueue();
  const pending = useLiveQuery(() => db.syncQueue.count(), []) ?? 0;
  const [diagnostics, setDiagnostics] = useState<VaultPullRun>(() => getPullDiagnostics());
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  useEffect(() => {
    const refresh = () => setDiagnostics(getPullDiagnostics());
    refresh();
    window.addEventListener("vault:sync-diagnostics", refresh);
    return () => window.removeEventListener("vault:sync-diagnostics", refresh);
  }, []);

  const slowest = useMemo(
    () => [...diagnostics.tables].sort((a, b) => b.durationMs - a.durationMs).slice(0, 5),
    [diagnostics.tables]
  );

  const runRecoverySync = useCallback(async () => {
    if (!user || syncing || !isOnline) return;
    setSyncing(true);
    setResult(null);
    try {
      await pullAllData(user.id);
      // VAULT_FINAL_RELEASE_V69_RECOVERY_TRUTH
      const pullDiagnostics = getPullDiagnostics();
      const failedPullTables = pullDiagnostics.tables.filter((metric) => !metric.ok);
      const pushed = await processQueue();

      if (failedPullTables.length > 0) {
        setResult(
          `A conferência não terminou por completo: ${failedPullTables.length} tabela(s) tiveram falha na leitura da nuvem. Nenhum dado local foi apagado; a fila de envio também foi processada.`
        );
      } else if (pushed.fatalError || pushed.permanentlyFailed > 0) {
        setResult("A leitura da nuvem terminou, mas há itens da fila de envio que precisam de revisão.");
      } else if (pushed.remaining > 0) {
        setResult("Conferência concluída. Alguns itens continuam aguardando nova tentativa de envio.");
      } else {
        setResult("Dados conferidos com a nuvem e fila de envio processada.");
      }
    } catch (error) {
      setResult(
        error instanceof Error
          ? `Não foi possível concluir: ${error.message}`
          : "Não foi possível concluir a recuperação."
      );
    } finally {
      setDiagnostics(getPullDiagnostics());
      setSyncing(false);
    }
  }, [isOnline, processQueue, syncing, user]);

  const hasPullFailures = diagnostics.tables.some((metric) => !metric.ok);
  const healthy = isOnline && syncRuntime.phase !== "error" && !hasPullFailures;

  return (
    <PageTransition>
      <main className="min-h-screen bg-void px-4 pb-32 pt-6 text-ink-primary">
        <header className="mx-auto flex max-w-2xl items-start gap-3">
          <button
            type="button"
            onClick={() => router.replace("/mais")}
            className="rounded-2xl border border-surface-border bg-surface p-3 text-ink-muted"
            aria-label="Voltar"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="min-w-0 flex-1">
            <p className="font-mono text-[9px] uppercase tracking-[0.24em] text-ice">
              DADOS & RECUPERAÇÃO
            </p>
            <h1 className="text-2xl font-bold">Central de segurança</h1>
            <p className="mt-1 text-xs leading-relaxed text-ink-muted">
              Veja a saúde da cópia local, sincronização e backup sem apagar nem substituir dados automaticamente.
            </p>
          </div>
        </header>

        <section className="mx-auto mt-5 max-w-2xl rounded-[26px] border border-surface-border bg-surface p-4">
          <div className="flex items-center gap-3">
            <div className={`rounded-2xl p-3 ${healthy ? "bg-ice/10 text-ice" : "bg-amber-400/10 text-amber-300"}`}>
              {healthy ? <ShieldCheck size={22} /> : <TriangleAlert size={22} />}
            </div>
            <div>
              <p className="text-sm font-semibold">
                {healthy ? "Vault operacional" : "Há algo para revisar"}
              </p>
              <p className="mt-0.5 text-xs text-ink-muted">
                {isOnline ? "Conexão disponível" : "Offline · seus dados locais continuam acessíveis"}
              </p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="rounded-2xl bg-void p-3">
              <Cloud size={15} className="text-ice" />
              <p className="mt-2 text-[9px] uppercase tracking-wide text-ink-faint">Última sincronização</p>
              <p className="mt-1 text-xs font-semibold">{formatWhen(syncRuntime.lastSyncedAt)}</p>
            </div>
            <div className="rounded-2xl bg-void p-3">
              <Database size={15} className="text-ice" />
              <p className="mt-2 text-[9px] uppercase tracking-wide text-ink-faint">Fila local</p>
              <p className="mt-1 text-xs font-semibold">
                {pending === 0 ? "Sem pendências" : `${pending} aguardando`}
              </p>
            </div>
          </div>

          {!isOnline && (
            <div className="mt-3 flex items-start gap-2 rounded-2xl border border-surface-border p-3 text-xs text-ink-muted">
              <WifiOff size={15} className="mt-0.5 shrink-0" />
              O modo offline não é uma falha. Novas alterações ficam no aparelho e entram na fila para envio quando a conexão voltar.
            </div>
          )}
        </section>

        <section className="mx-auto mt-4 max-w-2xl rounded-[26px] border border-surface-border bg-surface p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ice">Recuperação segura</p>
          <h2 className="mt-1 text-base font-bold">Conferir com a nuvem</h2>
          <p className="mt-1 text-xs leading-relaxed text-ink-muted">
            Baixa a versão remota respeitando alterações locais pendentes e depois tenta enviar a fila. Não limpa o banco local.
          </p>

          <button
            type="button"
            disabled={!isOnline || syncing || !user}
            onClick={() => void runRecoverySync()}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-ice/20 bg-ice/10 px-4 py-3 text-sm font-semibold text-ice disabled:opacity-40"
          >
            {syncing ? <Loader2 size={17} className="animate-spin" /> : <RefreshCw size={17} />}
            {syncing ? "Conferindo dados…" : "Conferir e sincronizar"}
          </button>

          {result && (
            <p className="mt-3 rounded-2xl bg-void p-3 text-xs leading-relaxed text-ink-muted">{result}</p>
          )}
        </section>

        <section className="mx-auto mt-4 max-w-2xl rounded-[26px] border border-surface-border bg-surface p-4">
          <div className="flex items-center gap-2">
            <Download size={16} className="text-violet-300" />
            <div>
              <h2 className="text-sm font-semibold">Backup portátil</h2>
              <p className="text-xs text-ink-muted">Snapshot lógico dos dados da conta neste dispositivo.</p>
            </div>
          </div>
          <div className="mt-3">
            <ExportButton variant="full" />
          </div>
          <p className="mt-3 text-[10px] leading-relaxed text-ink-faint">
            O JSON pode conter dados médicos e credenciais. Guarde-o em local privado e protegido. Esta versão exporta; restauração automática de arquivo não é oferecida sem validação transacional.
          </p>
        </section>

        <section className="mx-auto mt-4 max-w-2xl rounded-[26px] border border-surface-border bg-surface p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ice">Diagnóstico do pull</p>
              <h2 className="mt-1 text-sm font-bold">Onde a sincronização gastou tempo</h2>
            </div>
            {diagnostics.durationMs != null && (
              <span className="rounded-full bg-void px-3 py-1 text-[10px] text-ink-muted">
                total {formatDuration(diagnostics.durationMs)}
              </span>
            )}
          </div>

          {slowest.length === 0 ? (
            <p className="mt-3 text-xs leading-relaxed text-ink-muted">
              Ainda não há medição. A próxima sincronização registrará apenas nome da tabela, duração e sucesso — nenhum dado clínico ou conteúdo.
            </p>
          ) : (
            <div className="mt-3 space-y-2">
              {slowest.map((metric) => (
                <div key={`${metric.table}-${metric.at}`} className="flex items-center justify-between gap-3 rounded-2xl bg-void p-3">
                  <div className="flex min-w-0 items-center gap-2">
                    {metric.ok ? (
                      <CheckCircle2 size={14} className="shrink-0 text-ice" />
                    ) : (
                      <TriangleAlert size={14} className="shrink-0 text-amber-300" />
                    )}
                    <span className="truncate text-xs">{metric.table}</span>
                  </div>
                  <span className="shrink-0 font-mono text-[10px] text-ink-muted">
                    {formatDuration(metric.durationMs)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        <p className="mx-auto mt-4 max-w-2xl px-1 text-[10px] leading-relaxed text-ink-faint">
          Esta central é diagnóstica. Ela não considera ausência de internet como perda de dados e não executa limpeza, sobrescrita forçada ou restauração destrutiva.
        </p>
      </main>
    </PageTransition>
  );
}
