"use client";
// VAULT_RECOVERY_CENTER_V68

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Macro02PreparationR6 } from "@/components/saude/Macro02PreparationR6";
import { Macro02ActiveDeviceVerificationR5 } from "@/components/saude/Macro02ActiveDeviceVerificationR5";
import { P13DeviceDoseAudit } from "@/components/saude/P13DeviceDoseAudit";
import { useRouter } from "next/navigation";
import {inspectMacro02Backup,stageMacro02Backup,getMacro02StagedSummary,clearMacro02StagedBackup} from "@/lib/sync/macro02-backup-recovery";
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
import { SyncDoseRefreshSummary } from "@/components/SyncDoseRefreshSummary";
import { pullAllData } from "@/lib/sync/pull";
import { db } from "@/lib/db";
import { runManualVaultSync } from "@/lib/sync/manual-sync";
import { runVaultPullSingleFlight } from "@/lib/sync/coordinator";
import { describeRecoveryStatusM103 } from "@/lib/sync/presentation-m103";
import { summarizeSyncQueue } from "@/lib/sync/queue-health";
import {
  getPullDiagnostics,
  getPullFailureMessage,
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
  const { processQueue, isOnline, isProcessing } = useSyncQueue();
  const queueHealth = useLiveQuery(async () => summarizeSyncQueue(await db.syncQueue.toArray()), []) ?? { total: 0, ready: 0, deferred: 0, failed: 0 };
  const [diagnostics, setDiagnostics] = useState<VaultPullRun>(() => getPullDiagnostics());
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [backupBusy,setBackupBusy]=useState(false);
  const [backupResult,setBackupResult]=useState<string|null>(null);
  const activeUid=useRef(user?.id);activeUid.current=user?.id;
  const [staged,setStaged]=useState<Awaited<ReturnType<typeof getMacro02StagedSummary>>>(null);
  const [confirmStageRemoval,setConfirmStageRemoval]=useState(false);
  useEffect(()=>{let current=true;setBackupResult(null);setStaged(null);setConfirmStageRemoval(false);
    if(user?.id)void getMacro02StagedSummary(user.id).then(value=>{if(current)setStaged(value);}).catch(()=>{});
    return ()=>{current=false;};
  },[user?.id]);
  async function stageFile(file:File){
    const uid=user?.id;if(!uid||backupBusy)return;setBackupBusy(true);setBackupResult(null);
    try{const staged=await stageMacro02Backup(file,uid);if(activeUid.current===uid){setStaged(staged);setBackupResult('Cópia isolada preservada. Nenhum fato foi inserido na base ativa, nenhuma dose foi recalculada e nenhuma operação foi reenviada.');}}
    catch(e){if(activeUid.current===uid)setBackupResult(e instanceof Error?e.message:'Não foi possível preparar a cópia isolada.');}finally{setBackupBusy(false);}
  }
  async function clearStage(){
    const uid=user?.id;if(!uid||!confirmStageRemoval||backupBusy)return;setBackupBusy(true);
    try{await clearMacro02StagedBackup(uid);if(activeUid.current===uid){setStaged(null);setBackupResult('Somente a cópia isolada foi removida. A base ativa e o arquivo original não foram alterados.');}}
    catch(e){if(activeUid.current===uid)setBackupResult(e instanceof Error?e.message:'Não foi possível remover a cópia isolada.');}finally{setConfirmStageRemoval(false);setBackupBusy(false);}
  }
  async function reviewFile(file:File){
    const uid=user?.id;if(!uid||backupBusy)return;setBackupBusy(true);setBackupResult(null);
    try{const review=await inspectMacro02Backup(file,uid);if(activeUid.current!==uid)return;setBackupResult((review.pendingCount?`${review.pendingCount} intenção(ões) conferida(s): ${review.confirmed} com recibo íntegro e ${review.needsReview} precisam de revisão de estado remoto. Nenhuma operação foi reenviada nem restaurada.`:'Backup conferido: não contém intenções Premium pendentes. Nenhum dado foi restaurado.')+(review.outbox.complete?` Fila original preservada no arquivo: ${review.outbox.legacy} legada(s), ${review.outbox.premium} Premium, ${review.outbox.unclassified} ambígua(s), ${review.outbox.dependency} dependência(s).${review.outbox.scopeComplete?'':' Escopo integral da fila não comprovado.'}`:' Esta cópia não comprova a integralidade da fila legada.'));}
    catch(e){if(activeUid.current===uid)setBackupResult(e instanceof Error?e.message:'Não foi possível conferir o backup.');}finally{setBackupBusy(false);}
  }

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

  const syncBusy = syncing || isProcessing || syncRuntime.phase === "pulling" || syncRuntime.phase === "background" || syncRuntime.phase === "pushing";
  const runRecoverySync = useCallback(async () => {
    if (!user || syncBusy || !isOnline) return;
    setSyncing(true);
    setResult(null);
    try {
      // VAULT_FINAL_RELEASE_V69_RECOVERY_TRUTH
      const operation = await runManualVaultSync({
        ownerId: user.id,
        pull: () => pullAllData(user.id),
        coordinatePull: task => runVaultPullSingleFlight(user.id, task, true),
        push: processQueue,
        pullIssue: () => {
          return getPullFailureMessage();
        },
      });
      const pullDiagnostics = getPullDiagnostics();
      const failedPullTables = pullDiagnostics.tables.filter((metric) => !metric.ok);
      const pushed = operation.queue;

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
  }, [isOnline, processQueue, syncBusy, user]);

  const hasPullFailures = diagnostics.tables.some((metric) => !metric.ok);
  const presentation = describeRecoveryStatusM103({
    online: isOnline,
    phase: syncRuntime.phase,
    pending: queueHealth.total,
    failed: queueHealth.failed,
    pullFailures: diagnostics.tables.filter(metric => !metric.ok).length,
  });
  const healthy = presentation.tone === "confirmed";
  const needsReview = presentation.tone === "issue";

  return (
    <PageTransition>
      <main className="min-h-screen bg-void px-4 pb-32 pt-6 text-ink-primary">
        {user?.id && <Macro02PreparationR6 key={`prepare:${user.id}`} uid={user.id} />}
        {user?.id && <Macro02ActiveDeviceVerificationR5 key={user.id} uid={user.id} />}
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
              {healthy ? <ShieldCheck size={22} /> : needsReview ? <TriangleAlert size={22} /> : <RefreshCw size={22} />}
            </div>
            <div>
              <p className="text-sm font-semibold">
                {presentation.title}
              </p>
              <p className="mt-0.5 text-xs text-ink-muted">
                {presentation.detail}
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
                {queueHealth.total === 0 ? "Sem pendências" : `${queueHealth.total} preservado(s)`}
              </p>
              {queueHealth.total > 0 ? <p className="mt-1 text-[9px] leading-relaxed text-ink-faint">{queueHealth.ready} pronto(s) · {queueHealth.deferred} em espera · {queueHealth.failed} para revisar</p> : null}
            </div>
          </div>

          {!isOnline && (
            <div className="mt-3 flex items-start gap-2 rounded-2xl border border-surface-border p-3 text-xs text-ink-muted">
              <WifiOff size={15} className="mt-0.5 shrink-0" />
              O modo offline não é uma falha. Novas alterações ficam no aparelho e entram na fila para envio quando a conexão voltar.
            </div>
          )}
        </section>

        <SyncDoseRefreshSummary userId={user?.id} />
        <section className="mx-auto mt-4 max-w-2xl rounded-[26px] border border-surface-border bg-surface p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ice">Recuperação segura</p>
          <h2 className="mt-1 text-base font-bold">Conferir com a nuvem</h2>
          <p className="mt-1 text-xs leading-relaxed text-ink-muted">
            Baixa a versão remota respeitando alterações locais pendentes e depois tenta enviar a fila. Não limpa o banco local.
          </p>

          <button
            type="button"
            disabled={!isOnline || syncBusy || !user}
            onClick={() => void runRecoverySync()}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-ice/20 bg-ice/10 px-4 py-3 text-sm font-semibold text-ice disabled:opacity-40"
          >
            {syncBusy ? <Loader2 size={17} className="animate-spin" /> : <RefreshCw size={17} />}
            {syncBusy ? "Conferindo dados…" : "Conferir e sincronizar"}
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
            O JSON pode conter dados médicos e credenciais. Guarde-o em local privado e protegido. A conferência consulta os recibos originais da conta. Ausência de recibo não autoriza reenvio. A restauração integral ainda exige verificação das dependências e do estado remoto.
          </p>
          <label className="mt-4 flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-2xl border border-violet-400/20 bg-violet-400/5 px-3 py-3 text-sm font-semibold text-violet-300 focus-within:ring-2 focus-within:ring-violet-300">
            {backupBusy?<Loader2 size={16} className="motion-safe:animate-spin"/>:<ShieldCheck size={16}/>}
            {backupBusy?'Conferindo…':'Conferir backup de doses'}
            <input type="file" accept="application/json,.json" className="sr-only" aria-label="Selecionar backup de doses" disabled={!user||backupBusy||syncBusy} onChange={e=>{const f=e.currentTarget.files?.[0];e.currentTarget.value='';if(f)void reviewFile(f);}}/>
          </label>
          <div className="mt-4 rounded-2xl border border-surface-border p-3">
            <p className="text-xs font-semibold">Cópia isolada para recuperação assistida</p>
            <p className="mt-1 text-[10px] leading-relaxed text-ink-muted">Cria uma segunda cópia clínica neste aparelho, separada da base ativa e sem sincronização. Não é restauração definitiva. Guarde o arquivo original. Requer conexão para conferência dos recibos.</p>
            {!staged?<label className="mt-3 flex min-h-12 cursor-pointer items-center justify-center rounded-xl border border-ice/20 px-3 text-xs text-ice focus-within:ring-2 focus-within:ring-ice">
              Preparar cópia isolada
              <input type="file" accept="application/json,.json" className="sr-only" disabled={!user||backupBusy||syncBusy||!isOnline} onChange={e=>{const f=e.currentTarget.files?.[0];e.currentTarget.value='';if(f)void stageFile(f);}}/>
            </label>:<div className="mt-3 text-xs text-ink-muted"><p>{staged.rows} registros · {staged.queue} intenções originais · {staged.confirmed} recibos confirmados · {staged.issues} referências a revisar.</p><p className="mt-1">Envio e restauração ativa bloqueados até revisão.</p>{!staged.outboxScopeComplete&&<p className="mt-1 text-amber-300">Escopo integral da fila não comprovado. Preserve o dispositivo original, se disponível.</p>}
              {confirmStageRemoval?<div className="mt-3 flex flex-wrap gap-2"><button type="button" disabled={backupBusy} onClick={()=>void clearStage()} className="rounded-xl border border-amber-400/30 px-3 py-2 text-amber-300">Confirmar remoção da cópia isolada</button><button type="button" onClick={()=>setConfirmStageRemoval(false)} className="rounded-xl px-3 py-2">Cancelar</button></div>:<button type="button" disabled={backupBusy} onClick={()=>setConfirmStageRemoval(true)} className="mt-3 rounded-xl border border-surface-border px-3 py-2">Remover somente cópia isolada</button>}
            </div>}
          </div>
          {backupResult&&<p role="status" className="mt-3 rounded-2xl bg-void p-3 text-xs leading-relaxed text-ink-muted">{backupResult}</p>}
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
        <P13DeviceDoseAudit />
      </main>
    </PageTransition>
  );
}
