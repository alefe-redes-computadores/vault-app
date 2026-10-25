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
  ListChecks,
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
import { runManualVaultSync } from "@/lib/sync/manual-sync";
import { useVaultSyncRuntime } from "@/lib/sync/runtime-status";

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
  ["vaults", "vaults", "Cofres"],
  ["vaultMembers", "vault_members", "Compartilhamentos"],
  ["credentials", "credentials", "Senhas"],
  ["bankCards", "cards", "Contas e cartões"],
  ["medicos", "medicos", "Médicos"],
  ["farmacias", "farmacias", "Farmácias"],
  ["hospitais", "hospitais", "Hospitais"],
  ["locais", "locais", "Locais de saúde"],
  ["exames", "exames", "Exames"],
  ["consultas", "consultas", "Consultas"],
  ["cirurgias", "cirurgias", "Cirurgias"],
  ["cids", "cids", "CIDs"],
  ["instituicoes", "instituicoes", "Instituições"],
  ["renovacoes", "renovacoes", "Renovações"],
  ["retiradas", "retiradas", "Retiradas"],
  ["fornecimentos", "fornecimentos", "Fornecimentos"],
  ["fornecimento_ciclos", "fornecimento_ciclos", "Ciclos de fornecimento"],
  ["fornecimento_itens", "fornecimento_itens", "Itens fornecidos"],
  ["fornecimento_documentos", "fornecimento_documentos", "Documentos do fornecimento"],
  ["anexos_clinicos", "anexos_clinicos", "Anexos clínicos"],
  ["health_devices", "health_devices", "Dispositivos"],
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
  const syncRuntime = useVaultSyncRuntime();
  const queue = (useLiveQuery(() => db.syncQueue.orderBy("created_at").toArray(), []) ?? []) as SyncQueueItem[];
  const [checks, setChecks] = useState<TableCheck[]>([]);
  const [checking, setChecking] = useState(false);
  const [lastCoverageCheck, setLastCoverageCheck] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [doseAudit, setDoseAudit] = useState<DoseAudit | null>(null);
  const [auditingDoses, setAuditingDoses] = useState(false);
  const [repairingDoses, setRepairingDoses] = useState(false);
  const [repairArmed, setRepairArmed] = useState(false);

  const queueHealth = useMemo(() => summarizeSyncQueue(queue), [queue]);
  const failed = queueHealth.failed;
  const deferred = queueHealth.deferred;
  const failedItems = useMemo(
    () => queue.filter((item) => getSyncQueueState(item) === "failed"),
    [queue]
  );
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
  const syncBusy = syncing || isProcessing || syncRuntime.phase === "pulling" || syncRuntime.phase === "pushing";
  const syncHeadline = !isOnline
    ? "Trabalhando offline"
    : syncBusy
      ? "Conferindo e enviando"
      : failed > 0 || syncRuntime.phase === "error"
        ? "Sincronização precisa de revisão"
        : queueHealth.total > 0
          ? "Alterações protegidas no aparelho"
          : "Fila local vazia";
  const syncDescription = !isOnline
    ? "A fila está preservada e será retomada quando a conexão voltar."
    : syncBusy
      ? "Primeiro conferimos a nuvem; depois enviamos a fila local."
      : failed > 0
        ? `${failed} item(ns) chegaram ao limite de tentativas. Os dados não foram descartados.`
        : queueHealth.total > 0
          ? `${queueHealth.total} item(ns) aguardam envio ou nova tentativa.`
          : "Este dispositivo não tem envios pendentes. Registros de outro aparelho dependem da confirmação de envio e atualização na nuvem.";
  const recoveryStep = !isOnline ? 0 : failed > 0 ? 1 : queueHealth.total > 0 ? 2 : 3;

  const runDoseAudit = useCallback(async (): Promise<DoseAudit | null> => {
    if (!user?.id || !isOnline) return null;
    setAuditingDoses(true);
    try {
      const local = await db.doseLogs
        .where("user_id")
        .equals(user.id)
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
      const operation = await runManualVaultSync({
        pull: () => pullAllData(user.id),
        push: processQueue,
      });
      const result = operation.queue;
      if (operation.phase === "error") {
        showToast(operation.error || "Há itens que precisam de revisão", "error");
      } else {
        showToast(
          result.remaining === 0 ? "Sincronização concluída" : `${result.remaining} item(ns) continuam pendentes`,
          result.remaining === 0 ? "success" : "info"
        );
      }
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Não foi possível sincronizar", "error");
    } finally {
      setSyncing(false);
    }
  }, [user?.id, isOnline, syncing, trigger, processQueue, showToast]);

  // V201: auditoria é EXPLICITAMENTE manual e limita concorrência a quatro consultas.
  // Sem observadores ou polling sobre contagens remotas: não criar query storm.
  const runCheck = useCallback(async () => {
    if (!user?.id || !isOnline || checking) return;
    setChecking(true);
    setChecks([]);
    setLastCoverageCheck(null);
    try {
      const checkOne = async ([localKey, remoteKey, label]: (typeof TABLES)[number]): Promise<TableCheck> => {
        let local: number | null = null;
        let remote: number | null = null;
        const problems: string[] = [];
        try {
          // Todas as leituras permanecem restritas ao usuário autenticado.
          const table = (db as unknown as Record<string, any>)[localKey];
          if (!table) throw new Error("Tabela local não disponível");
          local = table.schema.indexes.some((index: {name: string}) => index.name === "user_id")
            ? await table.where("user_id").equals(user.id).count()
            : await table.toCollection().filter((row: {user_id?: string}) => row.user_id === user.id).count();
        } catch (error) {
          problems.push(`Aparelho: ${error instanceof Error ? error.message : "falha na leitura"}`);
        }
        try {
          const response = await supabase.from(remoteKey).select("id", {count: "exact", head: true}).eq("user_id", user.id);
          if (response.error) throw response.error;
          remote = response.count ?? 0;
        } catch (error) {
          problems.push(`Nuvem: ${error instanceof Error ? error.message : "falha na leitura"}`);
        }
        return {key: localKey, label, local, remote, error: problems.join(" · ") || undefined};
      };
      const results: TableCheck[] = [];
      for (let index = 0; index < TABLES.length; index += 4) {
        const batch = await Promise.all(TABLES.slice(index,index+4).map(checkOne));
        results.push(...batch);
        setChecks([...results]);
      }
      setLastCoverageCheck(new Date().toISOString());
    } finally {
      setChecking(false);
    }
  }, [user?.id, isOnline, checking]);

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
      <main className="min-h-[100dvh] bg-void px-4 pb-[calc(6rem+env(safe-area-inset-bottom,0px))] text-ink-primary">
        <header className="sticky top-0 z-20 -mx-4 flex items-center gap-3 border-b border-surface-border/40 bg-void/90 px-4 header-safe-top pb-3 backdrop-blur-xl">
          <button onClick={() => router.replace("/mais")} aria-label="Voltar para Mais" className="rounded-xl border border-surface-border p-3">
            <ArrowLeft size={18} />
          </button>
          <div><p className="font-mono text-[11px] uppercase tracking-[.25em] text-ice">Vault</p><h1 className="text-xl font-semibold">Saúde da sincronização</h1></div>
        </header>

        {!isOnline && <div className="mt-5 flex gap-3 rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4"><WifiOff className="shrink-0 text-amber-400" /><p className="text-sm text-ink-muted">Sem rede. Seus dados permanecem no aparelho e a fila será retomada quando a conexão voltar.</p></div>}

        <section aria-live="polite" className={`mt-4 overflow-hidden rounded-[20px] border bg-gradient-to-br from-surface to-void ${failed>0||syncRuntime.phase==='error'?'border-amber-400/25':'border-emerald-300/20'}`}>
          <div className="flex items-start gap-3 p-4">
            <span className={`grid size-11 shrink-0 place-items-center rounded-2xl ${failed>0||syncRuntime.phase==='error'?'bg-amber-400/10 text-amber-300':'bg-emerald-300/10 text-emerald-300'}`}>{syncBusy?<Loader2 className="animate-spin" size={20}/>:failed>0||syncRuntime.phase==='error'?<TriangleAlert size={20}/>:<ShieldCheck size={20}/>}</span>
            <div className="min-w-0 flex-1"><h2 className="text-sm font-semibold">{syncHeadline}</h2><p className="mt-1 text-[11px] leading-relaxed text-ink-muted">{syncDescription}</p>{queue[0]?<p className="mt-1 text-[9px] text-ink-faint">Item mais antigo {ageLabel(queue[0].created_at)}.</p>:null}</div>
          </div>
          <div className="grid grid-cols-3 border-y border-surface-border/60 bg-black/10">
            {([ ["Para enviar", queueHealth.ready], ["Em espera", deferred], ["Revisar", failed] ] as const).map(([label,value])=><div key={label} className="border-r border-surface-border/60 px-2 py-2.5 text-center last:border-r-0"><strong className={label==='Revisar'&&value>0?'text-amber-300':'text-ink-primary'}>{value}</strong><p className="mt-0.5 text-[9px] text-ink-muted">{label}</p></div>)}
          </div>
          <div className="p-3">
            {failed>0?<button disabled={!isOnline||syncBusy} onClick={()=>void resetFailedItems()} className="mb-2 min-h-12 w-full rounded-xl bg-amber-400 px-3 text-sm font-bold text-void disabled:opacity-40">1 · Liberar {failed} {failed===1?'falha':'falhas'} para nova tentativa</button>:null}
            <button disabled={!isOnline||syncBusy||failed>0} onClick={()=>void syncNow()} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-ice/30 bg-ice/10 px-4 text-sm font-semibold text-ice disabled:opacity-40">{syncBusy?<Loader2 className="animate-spin" size={17}/>:<RefreshCw size={17}/>} {syncBusy?'Sincronizando…':failed>0?'2 · Sincronizar após liberar':'Conferir e sincronizar'}</button>
          </div>
        </section>
        <p className="mt-2 px-1 text-[10px] leading-relaxed text-ink-muted">Esta tela nunca descarta itens. Toda nova tentativa passa pela fila oficial e mantém o funcionamento offline.</p>

        <div aria-label="Etapas da recuperação" className="mt-3 grid grid-cols-3 overflow-hidden rounded-xl border border-surface-border/60 bg-surface text-center">
          {(["Liberar", "Sincronizar", "Validar"] as const).map((label,index)=>{const step=index+1;const active=recoveryStep===step;const complete=recoveryStep>step;return <div key={label} className={`border-r border-surface-border/50 px-1.5 py-2.5 last:border-r-0 ${active?'bg-ice/[0.07] text-ice':complete?'text-emerald-300':'text-ink-muted'}`}><span className="font-mono text-[9px] font-bold">{complete?'✓':step}</span><p className="mt-0.5 text-[9px] font-semibold">{label}</p></div>})}
        </div>

        {failedItems.length > 0 && (
          <section className="vault-deferred mt-4 rounded-[20px] border border-coral/25 bg-coral/[0.05] p-3.5">
            <div className="flex items-center gap-2 text-coral">
              <TriangleAlert size={16} />
              <h2 className="text-sm font-semibold">Motivo da falha</h2>
            </div>
            <div className="mt-2 space-y-2">
              {failedItems.map((item) => (
                <div key={item.id} className="rounded-xl bg-void/70 px-3 py-2.5">
                  <p className="text-xs font-semibold text-ink-primary">{item.table}</p>
                  <p className="mt-1 break-words text-[11px] leading-relaxed text-ink-muted">
                    {item.error || "O servidor não informou o motivo da falha."}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="vault-deferred mt-4 rounded-[20px] border border-surface-border bg-surface p-3.5">
          <h2 className="font-semibold">Fila por área</h2>
          {Object.keys(byTable).length === 0 ? <div className="mt-4 flex items-center gap-2 text-sm text-emerald-400"><CheckCircle2 size={18} />Fila limpa</div> : <div className="mt-3 grid gap-2">{Object.entries(byTable).map(([table, state]) => <div key={table} className="flex items-center justify-between rounded-xl bg-void p-3 text-sm"><span>{table}</span><div className="flex items-center gap-2">{state.failed > 0 && <span className="rounded-full bg-coral/10 px-2 py-0.5 text-[10px] text-coral">{state.failed} falha</span>}<strong>{state.total}</strong></div></div>)}</div>}
        </section>

        <section className="vault-deferred mt-3 rounded-[20px] border border-surface-border bg-surface p-3.5">
          <div className="flex items-center justify-between"><div><h2 className="font-semibold">Cobertura local × nuvem</h2><p className="text-xs text-ink-muted">Comparação manual de todas as áreas do Cofre e da saúde. Contagens não alteram nem restauram registros.</p></div><button disabled={!isOnline || checking} onClick={() => void runCheck()} aria-label="Comparar todas as áreas locais e da nuvem" className="rounded-xl border border-surface-border p-3">{checking ? <Loader2 className="animate-spin" size={17} /> : <Database size={17} />}</button></div>
          <div className="mt-3 flex items-center justify-between gap-2 rounded-xl border border-emerald-300/20 bg-emerald-300/[0.045] px-3 py-2 text-[11px] text-ink-muted">
            <span>{checking ? `Conferindo ${checks.length} de ${TABLES.length} áreas…` : lastCoverageCheck ? `${checks.length} áreas verificadas · leitura pontual` : `${TABLES.length} áreas · toque no ícone para comparar`}</span>
            <span className="shrink-0 text-emerald-300">{checking ? "Verificando" : "Sob demanda"}</span>
          </div>
          <div className="mt-3 grid gap-2">{checks.map((check) => <div key={check.key} className="rounded-xl bg-void p-3"><div className="flex items-center gap-2"><Smartphone size={14} /><span className="min-w-0 flex-1 text-sm">{check.label}</span><span className="font-mono text-sm">{check.local ?? "—"}</span><Cloud size={14} /><span className="font-mono text-sm">{check.remote ?? "—"}</span></div>{check.error && <p className="mt-1 flex gap-1 text-xs text-coral"><TriangleAlert size={13} />{check.error}</p>}</div>)}</div>
        </section>

        <section className="vault-deferred mt-3 rounded-[20px] border border-ice/20 bg-surface p-3.5">
          <div className="flex items-start gap-3"><div className="rounded-2xl bg-ice/10 p-3 text-ice"><ShieldCheck size={20} /></div><div className="min-w-0 flex-1"><h2 className="font-semibold">Reconciliação de doses</h2><p className="mt-1 text-xs leading-relaxed text-ink-muted">Compara os IDs e o conteúdo. Nada é apagado ou sobrescrito automaticamente.</p></div></div>
          <button disabled={!isOnline || auditingDoses || repairingDoses} onClick={() => void runDoseAudit()} className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-ice/30 p-3 text-sm font-semibold text-ice disabled:opacity-40">{auditingDoses ? <Loader2 className="animate-spin" size={17} /> : <RefreshCw size={17} />}Comparar registros</button>
          {doseAudit && <div className="mt-4"><div className="grid grid-cols-2 gap-2">{([ ["Só no aparelho", doseAudit.localOnly.length, "text-amber-300"], ["Só na nuvem", doseAudit.remoteOnly.length, "text-ice"], ["Divergentes", doseAudit.divergent.length, "text-coral"], ["Locais inválidos", doseAudit.invalidLocal.length, "text-coral"] ] as const).map(([label, value, tone]) => <div key={label} className="rounded-2xl bg-void p-3"><strong className={`text-xl ${tone}`}>{value}</strong><p className="mt-1 text-[11px] text-ink-muted">{label}</p></div>)}</div>
            {doseAudit.localOnly.length > 0 && <><p className="mt-3 text-xs leading-relaxed text-ink-muted">Somente doses válidas, pertencentes ao usuário, à pessoa e ao medicamento relacionados serão reenfileiradas.</p>{repairArmed?<div role="alert" className="mt-3 rounded-2xl border border-amber-400/30 bg-amber-400/[0.07] p-3"><div className="flex items-start gap-2"><ListChecks size={17} className="mt-0.5 shrink-0 text-amber-300"/><div><p className="text-xs font-semibold text-amber-200">Confirmar reparo seguro?</p><p className="mt-1 text-[10px] leading-relaxed text-ink-muted">{doseAudit.localOnly.length} {doseAudit.localOnly.length===1?'dose será reenfileirada':'doses serão reenfileiradas'}. Nada será apagado e o estoque não será movimentado novamente.</p></div></div><div className="mt-3 grid grid-cols-2 gap-2"><button type="button" disabled={repairingDoses} onClick={()=>setRepairArmed(false)} className="min-h-11 rounded-xl border border-surface-border text-xs text-ink-muted">Cancelar</button><button type="button" disabled={repairingDoses||isProcessing} onClick={()=>void repairLocalDoses()} className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-amber-400 px-2 text-xs font-bold text-void disabled:opacity-40">{repairingDoses?<Loader2 className="animate-spin" size={16}/>:<CloudUpload size={16}/>}Confirmar envio</button></div></div>:<button disabled={repairingDoses||isProcessing} onClick={()=>void repairLocalDoses()} className="mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-ice px-3 text-sm font-semibold text-void disabled:opacity-40"><CloudUpload size={17}/>Preparar envio das ausentes</button>}</>}
            {doseAudit.localOnly.length === 0 && doseAudit.invalidLocal.length === 0 && <p className="mt-3 flex items-center gap-2 text-sm text-emerald-400"><CheckCircle2 size={17} />Nenhuma dose local válida está faltando na nuvem.</p>}
          </div>}
        </section>
      </main>
    </PageTransition>
  );
}
