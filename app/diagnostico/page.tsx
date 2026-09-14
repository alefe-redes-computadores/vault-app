"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import {
  ArrowLeft,
  CheckCircle2,
  Cloud,
  CloudUpload,
  Database,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  TriangleAlert,
  WifiOff,
} from "lucide-react";
import { PageTransition } from "@/components/PageTransition";
import { useToast } from "@/components/ToastProvider";
import { useAuth } from "@/hooks/useAuth";
import { useHapticFeedback } from "@/lib/haptics";
import { useSyncQueue } from "@/hooks/useSyncQueue";
import { db } from "@/lib/db";
import { pullAllData } from "@/lib/sync/pull";
import { enfileirarOperacao } from "@/lib/sync/enfileirarOperacao";
import { supabase } from "@/lib/supabase/client";
import type { DoseLog, SyncQueueItem } from "@/lib/types";
import { getSyncQueueState, summarizeSyncQueue } from "@/lib/sync/queue-health";

interface TableCheck {
  key: string;
  label: string;
  local: number | null;
  remote: number | null;
  error?: string;
}

interface DoseAudit {
  localOnly: DoseLog[];
  remoteOnly: string[];
  divergent: string[];
  invalidLocal: DoseLog[];
  checkedAt: string;
}

const TABLES = [
  ["persons", "persons", "Pessoas"],
  ["medicamentos", "medicamentos", "Medicamentos"],
  ["tratamentos", "tratamentos", "Tratamentos"],
  ["doseLogs", "dose_logs", "Doses"],
  ["registros_saude", "registros_saude", "Registros de saúde"],
  ["health_reminders", "health_reminders", "Lembretes"],
  ["health_goals", "health_goals", "Metas"],
  ["documents", "documents", "Documentos"],
] as const;

const DOSE_FIELDS =
  "id,user_id,person_id,medicamento_id,data,horario,tomado_em,ignorado_em,quantidade,dose_kind,motivo,created_at,updated_at";

function ageLabel(value?: string) {
  if (!value) return "idade desconhecida";
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60000));
  return minutes < 1 ? "agora" : minutes < 60 ? `há ${minutes} min` : `há ${Math.floor(minutes / 60)} h`;
}

function normalizedDose(log: Record<string, unknown>) {
  return {
    person_id: log.person_id || null,
    medicamento_id: log.medicamento_id || null,
    data: log.data || null,
    horario: log.horario || null,
    tomado_em: log.tomado_em || null,
    ignorado_em: log.ignorado_em || null,
    quantidade: log.quantidade == null ? null : Number(log.quantidade),
    dose_kind: log.dose_kind || null,
    motivo: log.motivo || null,
  };
}

function validLocalDose(log: DoseLog, userId: string) {
  return Boolean(
    log.id &&
      log.user_id === userId &&
      log.person_id &&
      log.medicamento_id &&
      log.data &&
      log.horario
  );
}

export default function DiagnosticoPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { trigger } = useHapticFeedback();
  const { showToast } = useToast();
  const { processQueue, resetFailedItems, isProcessing, isOnline } = useSyncQueue();
  const queue = (useLiveQuery(() => db.syncQueue.orderBy("created_at").toArray(), []) ?? []) as SyncQueueItem[];
  const [checks, setChecks] = useState<TableCheck[]>([]);
  const [checking, setChecking] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [doseAudit, setDoseAudit] = useState<DoseAudit | null>(null);
  const [auditingDoses, setAuditingDoses] = useState(false);
  const [repairingDoses, setRepairingDoses] = useState(false);
  const [repairArmed, setRepairArmed] = useState(false);

  const queueHealth = useMemo(() => summarizeSyncQueue(queue), [queue]);
  const failed = queueHealth.failed;
  const deferred = queueHealth.deferred;
  const byTable = useMemo(
    () =>
      queue.reduce<Record<string, { total: number; failed: number }>>((result, item) => {
        const current = result[item.table] || { total: 0, failed: 0 };
        current.total += 1;
        if (getSyncQueueState(item) === "failed") current.failed += 1;
        result[item.table] = current;
        return result;
      }, {}),
    [queue]
  );

  const runDoseAudit = useCallback(async (): Promise<DoseAudit | null> => {
    if (!user?.id || !isOnline) return null;
    setAuditingDoses(true);
    try {
      const local = await db.doseLogs
        .toCollection()
        .filter((row) => row.user_id === user.id)
        .toArray();
      const { data, error } = await supabase
        .from("dose_logs")
        .select(DOSE_FIELDS)
        .eq("user_id", user.id)
        .range(0, 9999);
      if (error) throw error;
      const remote = (data ?? []) as unknown as Array<Record<string, unknown>>;
      const remoteById = new Map(remote.map((row) => [String(row.id), row]));
      const localById = new Map(local.filter((row) => row.id).map((row) => [String(row.id), row]));
      const invalidLocal = local.filter((row) => !validLocalDose(row, user.id));
      const localOnly = local.filter(
        (row) => validLocalDose(row, user.id) && row.id && !remoteById.has(row.id)
      );
      const remoteOnly = remote
        .map((row) => String(row.id))
        .filter((id) => !localById.has(id));
      const divergent = local
        .filter((row) => row.id && remoteById.has(row.id))
        .filter(
          (row) =>
            JSON.stringify(normalizedDose(row as unknown as Record<string, unknown>)) !==
            JSON.stringify(normalizedDose(remoteById.get(String(row.id))!))
        )
        .map((row) => String(row.id));
      const report = {
        localOnly,
        remoteOnly,
        divergent,
        invalidLocal,
        checkedAt: new Date().toISOString(),
      };
      setDoseAudit(report);
      setRepairArmed(false);
      return report;
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Não foi possível reconciliar as doses", "error");
      return null;
    } finally {
      setAuditingDoses(false);
    }
  }, [user?.id, isOnline, showToast]);

  const syncNow = useCallback(async () => {
    if (!user?.id || !isOnline || syncing) return;
    setSyncing(true);
    trigger("vibrate");
    try {
      await pullAllData(user.id);
      const result = await processQueue();
      showToast(
        result.remaining === 0 ? "Sincronização concluída" : `${result.remaining} item(ns) continuam pendentes`,
        result.remaining === 0 ? "success" : "info"
      );
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Não foi possível sincronizar", "error");
    } finally {
      setSyncing(false);
    }
  }, [user?.id, isOnline, syncing, trigger, processQueue, showToast]);

  const runCheck = useCallback(async () => {
    if (!user?.id || !isOnline) return;
    setChecking(true);
    const results: TableCheck[] = [];
    for (const [localKey, remoteKey, label] of TABLES) {
      try {
        const local = await (db as any)[localKey]
          .toCollection()
          .filter((row: any) => row.user_id === user.id)
          .count();
        const remoteResult = await supabase
          .from(remoteKey)
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id);
        results.push({
          key: localKey,
          label,
          local,
          remote: remoteResult.error ? null : remoteResult.count ?? 0,
          error: remoteResult.error?.message,
        });
      } catch (error) {
        results.push({
          key: localKey,
          label,
          local: null,
          remote: null,
          error: error instanceof Error ? error.message : "Falha na leitura",
        });
      }
    }
    setChecks(results);
    setChecking(false);
  }, [user?.id, isOnline]);

  const repairLocalDoses = useCallback(async () => {
    if (!user?.id || !doseAudit?.localOnly.length || repairingDoses) return;
    if (!repairArmed) {
      setRepairArmed(true);
      trigger("vibrate");
      return;
    }
    setRepairingDoses(true);
    setRepairArmed(false);
    try {
      let queued = 0;
      for (const original of doseAudit.localOnly) {
        if (!original.id || !validLocalDose(original, user.id)) continue;
        const current = await db.doseLogs.get(original.id);
        if (!current || !validLocalDose(current, user.id)) continue;
        const person = await db.persons.get(current.person_id!);
        const medication = await db.medicamentos.get(current.medicamento_id);
        if (
          !person ||
          person.user_id !== user.id ||
          !medication ||
          medication.user_id !== user.id ||
          medication.person_id !== current.person_id
        ) {
          continue;
        }
        await db.doseLogs.update(current.id!, { synced: false });
        await enfileirarOperacao("doseLogs", "add", { ...current, synced: false });
        queued += 1;
      }
      if (queued === 0) {
        showToast("Nenhuma dose válida foi liberada para reparo", "info");
        return;
      }
      const result = await processQueue();
      const nextReport = await runDoseAudit();
      await runCheck();
      const repaired = queued - (nextReport?.localOnly.length ?? queued);
      showToast(
        result.remaining === 0
          ? `${repaired} dose(s) histórica(s) recuperada(s)`
          : `${result.remaining} item(ns) permanecem na fila`,
        result.remaining === 0 ? "success" : "info"
      );
      trigger("vibrate");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Falha ao reparar doses", "error");
    } finally {
      setRepairingDoses(false);
    }
  }, [user?.id, doseAudit, repairingDoses, repairArmed, processQueue, runDoseAudit, runCheck, showToast, trigger]);

  return (
    <PageTransition>
      <main className="min-h-screen bg-void px-5 pb-28 text-ink-primary">
        <header className="sticky top-0 z-20 -mx-5 flex items-center gap-3 border-b border-surface-border/40 bg-void/90 px-5 header-safe-top pb-4 backdrop-blur-xl">
          <button onClick={() => router.replace("/mais")} aria-label="Voltar para Mais" className="rounded-full border border-surface-border p-3">
            <ArrowLeft size={18} />
          </button>
          <div><p className="font-mono text-[11px] uppercase tracking-[.25em] text-ice">Vault</p><h1 className="text-xl font-semibold">Saúde da sincronização</h1></div>
        </header>

        {!isOnline && <div className="mt-5 flex gap-3 rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4"><WifiOff className="shrink-0 text-amber-400" /><p className="text-sm text-ink-muted">Sem rede. Seus dados permanecem no aparelho e a fila será retomada quando a conexão voltar.</p></div>}

        <section className="mt-5 grid grid-cols-3 gap-2">
          {([ ["Prontos", queueHealth.ready], ["Com falha", failed], ["Aguardando", deferred] ] as const).map(([label, value]) => <div key={label} className={`rounded-2xl border bg-surface p-3 text-center ${label === "Com falha" && value > 0 ? "border-coral/35" : "border-surface-border"}`}><strong className="text-xl">{value}</strong><p className="text-[11px] text-ink-muted">{label}</p></div>)}
        </section>
        <p className="mt-2 text-xs text-ink-muted">{queue[0] ? `Item mais antigo ${ageLabel(queue[0].created_at)}.` : "Nenhuma alteração aguardando envio."}</p>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <button disabled={!isOnline || syncing || isProcessing} onClick={() => void syncNow()} className="flex items-center justify-center gap-2 rounded-2xl bg-ice p-3 font-semibold text-void disabled:opacity-40">{syncing || isProcessing ? <Loader2 className="animate-spin" size={17} /> : <RefreshCw size={17} />}Sincronizar</button>
          <button disabled={!isOnline || failed === 0 || isProcessing} onClick={() => void resetFailedItems()} className="rounded-2xl border border-amber-400/40 p-3 text-sm font-semibold text-amber-300 disabled:opacity-40">Repetir falhas</button>
        </div>
        <p className="mt-2 text-xs text-ink-muted">Nenhum item é descartado por esta tela. Reenvios sempre passam pela fila oficial do Vault.</p>

        <section className="mt-6 rounded-3xl border border-surface-border bg-surface p-4">
          <h2 className="font-semibold">Fila por área</h2>
          {Object.keys(byTable).length === 0 ? <div className="mt-4 flex items-center gap-2 text-sm text-emerald-400"><CheckCircle2 size={18} />Fila limpa</div> : <div className="mt-3 grid gap-2">{Object.entries(byTable).map(([table, state]) => <div key={table} className="flex items-center justify-between rounded-xl bg-void p-3 text-sm"><span>{table}</span><div className="flex items-center gap-2">{state.failed > 0 && <span className="rounded-full bg-coral/10 px-2 py-0.5 text-[10px] text-coral">{state.failed} falha</span>}<strong>{state.total}</strong></div></div>)}</div>}
        </section>

        <section className="mt-4 rounded-3xl border border-surface-border bg-surface p-4">
          <div className="flex items-center justify-between"><div><h2 className="font-semibold">Cobertura local × nuvem</h2><p className="text-xs text-ink-muted">Contagem é uma triagem; a reconciliação abaixo compara IDs.</p></div><button disabled={!isOnline || checking} onClick={() => void runCheck()} aria-label="Verificar contagens" className="rounded-xl border border-surface-border p-3">{checking ? <Loader2 className="animate-spin" size={17} /> : <Database size={17} />}</button></div>
          <div className="mt-3 grid gap-2">{checks.map((check) => <div key={check.key} className="rounded-xl bg-void p-3"><div className="flex items-center gap-2"><Smartphone size={14} /><span className="min-w-0 flex-1 text-sm">{check.label}</span><span className="font-mono text-sm">{check.local ?? "—"}</span><Cloud size={14} /><span className="font-mono text-sm">{check.remote ?? "—"}</span></div>{check.error && <p className="mt-1 flex gap-1 text-xs text-coral"><TriangleAlert size={13} />{check.error}</p>}</div>)}</div>
        </section>

        <section className="mt-4 rounded-3xl border border-ice/20 bg-surface p-4">
          <div className="flex items-start gap-3"><div className="rounded-2xl bg-ice/10 p-3 text-ice"><ShieldCheck size={20} /></div><div className="min-w-0 flex-1"><h2 className="font-semibold">Reconciliação de doses</h2><p className="mt-1 text-xs leading-relaxed text-ink-muted">Compara os IDs e o conteúdo. Nada é apagado ou sobrescrito automaticamente.</p></div></div>
          <button disabled={!isOnline || auditingDoses || repairingDoses} onClick={() => void runDoseAudit()} className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-ice/30 p-3 text-sm font-semibold text-ice disabled:opacity-40">{auditingDoses ? <Loader2 className="animate-spin" size={17} /> : <RefreshCw size={17} />}Comparar registros</button>
          {doseAudit && <div className="mt-4"><div className="grid grid-cols-2 gap-2">{([ ["Só no aparelho", doseAudit.localOnly.length, "text-amber-300"], ["Só na nuvem", doseAudit.remoteOnly.length, "text-ice"], ["Divergentes", doseAudit.divergent.length, "text-coral"], ["Locais inválidos", doseAudit.invalidLocal.length, "text-coral"] ] as const).map(([label, value, tone]) => <div key={label} className="rounded-2xl bg-void p-3"><strong className={`text-xl ${tone}`}>{value}</strong><p className="mt-1 text-[11px] text-ink-muted">{label}</p></div>)}</div>
            {doseAudit.localOnly.length > 0 && <><p className="mt-3 text-xs leading-relaxed text-ink-muted">Somente doses válidas, pertencentes ao usuário, à pessoa e ao medicamento relacionados serão reenfileiradas.</p><button disabled={repairingDoses || isProcessing} onClick={() => void repairLocalDoses()} className={`mt-3 flex w-full items-center justify-center gap-2 rounded-2xl p-3 text-sm font-semibold disabled:opacity-40 ${repairArmed ? "bg-amber-400 text-void" : "bg-ice text-void"}`}>{repairingDoses ? <Loader2 className="animate-spin" size={17} /> : <CloudUpload size={17} />}{repairArmed ? `Confirmar envio de ${doseAudit.localOnly.length} dose(s)` : "Enviar ausentes para a nuvem"}</button></>}
            {doseAudit.localOnly.length === 0 && doseAudit.invalidLocal.length === 0 && <p className="mt-3 flex items-center gap-2 text-sm text-emerald-400"><CheckCircle2 size={17} />Nenhuma dose local válida está faltando na nuvem.</p>}
          </div>}
        </section>
      </main>
    </PageTransition>
  );
}
