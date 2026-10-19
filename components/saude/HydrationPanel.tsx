// app/saude/hidratacao/page.tsx
"use client";
import { ConfirmationModal } from "@/components/ConfirmationModal";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Bell, CheckCircle2, ChevronDown, Droplets, History, Info, Loader2, RotateCcw, Target, Trash2 } from "lucide-react";
import { useToast } from "@/components/ToastProvider";
import { useHealthGoals } from "@/hooks/useHealthGoals";
import { useRegistrosSaude } from "@/hooks/useRegistrosSaude";
import { useHapticFeedback } from "@/lib/haptics";
import { useReturnContext } from "@/hooks/useReturnContext";

const QUICK_AMOUNTS = [200, 250, 350, 500] as const;

function localDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function formatDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR", { weekday: "short", day: "2-digit", month: "short" }).format(new Date(year, month - 1, day, 12));
}

function validWaterRecord(record: { tipo: string; unidade_medida?: string; valor_numerico?: number }) {
  return record.tipo === "agua" && record.unidade_medida === "ml" && typeof record.valor_numerico === "number" && Number.isFinite(record.valor_numerico) && record.valor_numerico > 0;
}

export function HydrationPanel({embedded=false}:{embedded?:boolean}) {
  const router = useRouter();
  const {backTarget,preserveReturn}=useReturnContext("/saude/minha-saude");
  const { showToast } = useToast();
  const { trigger } = useHapticFeedback();
  const { registros, isLoading: recordsLoading, createRegistro, deleteRegistro } = useRegistrosSaude();
  const { hydrationGoal, isLoading: goalLoading, setHydrationGoal, clearHydrationGoal } = useHealthGoals();
  const operationLock = useRef(false);
  const addQueue = useRef<Promise<void>>(Promise.resolve());
  const [queuedAdds,setQueuedAdds]=useState(0);
  const [removingRecord,setRemovingRecord]=useState<string | null>(null);
  const [feedback,setFeedback]=useState("");
  const [confirmGoalRemoval,setConfirmGoalRemoval]=useState(false);
  const [goalDraft, setGoalDraft] = useState("");
  const [custom, setCustom] = useState("");
  const [showGoalEditor, setShowGoalEditor] = useState(false);
  const [todayOpen, setTodayOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const today = localDateKey(new Date());
  const goal = hydrationGoal?.target_value ?? null;

  const validRecords = useMemo(() => registros.filter(validWaterRecord), [registros]);
  const todayRecords = useMemo(() => validRecords.filter((record) => record.data === today).sort((left, right) => {
    const byTime=right.horario.localeCompare(left.horario);
    if(byTime!==0)return byTime;
    return String(right.created_at||right.id||"").localeCompare(String(left.created_at||left.id||""));
  }), [validRecords, today]);
  const total = todayRecords.reduce((sum, record) => sum + (record.valor_numerico || 0), 0);
  const days = useMemo(() => {
    const totals = new Map<string, number>();
    for (const record of validRecords) totals.set(record.data, (totals.get(record.data) || 0) + (record.valor_numerico || 0));
    return [...totals.entries()].sort((left, right) => right[0].localeCompare(left[0])).slice(0, 7);
  }, [validRecords]);
  // VAULT_HYDRATION_EXPERIENCE_V67
  // Média considera somente dias com registros; ausência nunca é tratada como zero.
  const average = days.length > 0 ? Math.round(days.reduce((sum, [, value]) => sum + value, 0) / days.length) : null;
  const sevenDayCutoff = new Date();
  sevenDayCutoff.setHours(0, 0, 0, 0);
  sevenDayCutoff.setDate(sevenDayCutoff.getDate() - 6);
  const sevenDayKeys = new Set(
    validRecords
      .filter((record) => {
        const value = new Date(`${record.data}T12:00:00`).getTime();
        return Number.isFinite(value) && value >= sevenDayCutoff.getTime();
      })
      .map((record) => record.data)
  );
  const sevenDayCoverage = sevenDayKeys.size;
  const progress = goal ? Math.min(100, Math.round((total / goal) * 100)) : null;
  const remaining = goal ? Math.max(0, goal - total) : null;
  const historyMax = Math.max(...days.map(([, amount]) => amount), 1);
  const lastRecord = todayRecords[0] ?? null;

  async function withOperation(id: string, operation: () => Promise<void>) {
    if (operationLock.current) return;
    operationLock.current = true;
    setBusy(id);
    try { await operation(); } finally { operationLock.current = false; setBusy(null); }
  }

  async function add(ml: number) {
    const normalized = Math.round(ml);
    if (!Number.isFinite(normalized) || normalized <= 0 || normalized > 20000) {
      showToast("Informe um valor entre 1 e 20.000 ml", "error");
      return;
    }
    setQueuedAdds(count => count + 1);
    const next = addQueue.current.then(() => withOperation("add", async () => {
      try {
        const date = new Date();
        await createRegistro({ categoria: "habito", tipo: "agua", nome: "Água", valor_medicao: `${normalized} ml`, valor_numerico: normalized, unidade_medida: "ml", registro_chave: "habito:agua", data: localDateKey(date), horario: `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}` });
        setCustom("");
        trigger("success");
        setFeedback(`+${normalized} ml registrados`);
      } catch (error) {
        trigger("error");
        showToast(error instanceof Error ? error.message : "Não foi possível registrar", "error");
      }
    }));
    addQueue.current = next.catch(() => {});
    await next.finally(() => setQueuedAdds(count => count - 1));
  }

  async function remove(id?: string, undo = false) {
    if (!id) return;
    await withOperation(id, async () => {
      try {
        await deleteRegistro(id);
        trigger("vibrate");
        setFeedback(undo ? "Último registro desfeito" : "Registro removido");
      } catch (error) {
        trigger("error");
        showToast(error instanceof Error ? error.message : "Não foi possível remover", "error");
      }
    });
  }

  async function saveGoal() {
    const value = Math.round(Number(goalDraft));
    if (!Number.isFinite(value) || value <= 0 || value > 20000) {
      showToast("Informe uma meta manual entre 1 e 20.000 ml", "error");
      return;
    }
    await withOperation("goal", async () => {
      try {
        await setHydrationGoal(value);
        setGoalDraft(""); setShowGoalEditor(false); trigger("success"); showToast("Meta manual sincronizada", "success");
      } catch (error) {
        trigger("error"); showToast(error instanceof Error ? error.message : "Não foi possível salvar a meta", "error");
      }
    });
  }

  async function clearGoal() {
    setConfirmGoalRemoval(false);
    await withOperation("goal", async () => {
      try {
        await clearHydrationGoal();
        setGoalDraft(""); setShowGoalEditor(false); trigger("success"); showToast("Meta removida; registros preservados", "success");
      } catch (error) {
        trigger("error"); showToast(error instanceof Error ? error.message : "Não foi possível remover a meta", "error");
      }
    });
  }

  const loading = recordsLoading || goalLoading;

  return (
    <section className={embedded ? "text-ink-primary" : "min-h-screen bg-void px-4 pb-28 pt-6 text-ink-primary"}>
      {!embedded && <header className="mx-auto flex max-w-xl items-center gap-3">
        <button type="button" onClick={() => router.replace(backTarget)} className="flex h-11 w-11 items-center justify-center rounded-xl border border-surface-border bg-surface" aria-label="Voltar"><ArrowLeft size={20} /></button>
        <div className="min-w-0 flex-1"><h1 className="font-display text-2xl font-bold">Hidratação</h1><p className="text-sm text-ink-muted">Um registro rápido, sem presumir consumo</p></div>
        <button type="button" onClick={() => router.push(preserveReturn("/saude/lembretes"))} className="flex h-11 w-11 items-center justify-center rounded-xl border border-surface-border bg-surface" aria-label="Abrir lembretes"><Bell size={20} /></button>
      </header>}

      <p aria-live="polite" className="mx-auto mt-3 min-h-[16px] max-w-xl text-xs text-emerald-400">{feedback}</p>
      <section className="mx-auto mt-3 max-w-xl overflow-hidden rounded-[24px] border border-cyan-400/15 bg-gradient-to-br from-cyan-400/[0.07] via-surface to-surface p-4 shadow-[0_20px_55px_rgba(56,189,248,0.06)]">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/[0.07] text-cyan-300"><Droplets size={21} /></div>
          <div className="min-w-0 flex-1"><p className="font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-cyan-300">Água registrada hoje</p><p className="mt-0.5 text-2xl font-bold tabular-nums">{loading ? "—" : `${total} ml`}</p><p className="mt-1 text-[11px] text-ink-muted">{goal && remaining === 0 ? "Meta manual alcançada" : goal ? `${remaining} ml restantes na sua referência` : "Sem meta manual definida"}</p></div>
          {progress !== null && <div className="shrink-0 rounded-xl border border-cyan-400/20 bg-void/55 px-2.5 py-2 text-right"><strong className="block font-mono text-sm text-cyan-300">{progress}%</strong><span className="text-[8px] uppercase tracking-wide text-ink-faint">da meta</span></div>}
        </div>
        {goal ? <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-void"><div className="h-full rounded-full bg-cyan-400 transition-all duration-500" style={{ width: `${progress}%` }} /></div> : <div className="mt-4 flex items-start gap-2 rounded-2xl bg-cyan-400/5 p-3"><Info size={15} className="mt-0.5 shrink-0 text-cyan-300" /><p className="text-xs text-ink-muted">O Vault não recomenda nem presume uma meta. Você pode cadastrar manualmente uma referência definida por você ou por um profissional.</p></div>}
        <div className="mt-4 grid grid-cols-4 gap-2">{QUICK_AMOUNTS.map((amount) => <button key={amount} type="button" disabled={busy !== null && busy !== "add"} onClick={() => void add(amount)} className="min-h-12 rounded-xl border border-cyan-400/20 bg-cyan-400/[0.055] px-1.5 py-2 text-center transition active:scale-95 disabled:opacity-40"><span className="text-sm font-bold text-cyan-300">+{amount}</span><span className="ml-0.5 text-[9px] text-ink-muted">ml</span></button>)}</div>
        <div className="mt-3 flex gap-2"><input aria-label="Outro valor em mililitros" inputMode="numeric" placeholder="Outro valor em ml" value={custom} onChange={(event) => setCustom(event.target.value.replace(/[^0-9]/g, ""))} className="min-w-0 flex-1 rounded-xl border border-surface-border bg-void p-3 text-sm outline-none focus:border-cyan-400/50" /><button type="button" disabled={busy !== null || !custom} onClick={() => void add(Number(custom))} className="rounded-xl border border-cyan-400/40 px-4 text-xs font-bold text-cyan-300 disabled:opacity-40">Registrar</button></div>
        <div className="mt-2 flex min-h-9 items-center justify-between gap-2 text-[10px] text-ink-muted"><span aria-live="polite">{queuedAdds>0?`${queuedAdds} registro(s) sendo salvo(s)…`:lastRecord?`Último: ${lastRecord.valor_numerico} ml às ${lastRecord.horario}`:"Nenhum registro hoje"}</span>{lastRecord?.id && <button type="button" disabled={busy !== null || queuedAdds > 0} onClick={() => void remove(lastRecord.id, true)} className="flex min-h-9 shrink-0 items-center gap-1.5 rounded-lg px-2 font-semibold text-ink-muted disabled:opacity-40"><RotateCcw size={13} /> Desfazer último registro</button>}</div>
      </section>

      <section className="mx-auto mt-4 max-w-xl rounded-3xl border border-surface-border bg-surface p-4">
        <button type="button" onClick={() => { setShowGoalEditor((value) => !value); setGoalDraft(goal ? String(goal) : ""); }} className="flex w-full items-center justify-between text-left"><span><span className="block text-sm font-semibold">Meta diária opcional</span><span className="mt-1 block text-[11px] text-ink-muted">{goal ? `${goal} ml · sincronizada` : "Configure somente se fizer sentido para você"}</span></span><Target size={19} className="text-cyan-300" /></button>
        {showGoalEditor && <div className="mt-3 border-t border-surface-border/60 pt-3"><div className="flex gap-2"><input aria-label="Meta diária em mililitros" type="number" min="1" max="20000" placeholder={goal ? String(goal) : "Meta em ml"} value={goalDraft} onChange={(event) => setGoalDraft(event.target.value)} className="min-w-0 flex-1 rounded-xl border border-surface-border bg-void p-3 text-sm" /><button type="button" disabled={busy !== null || !goalDraft} onClick={() => void saveGoal()} className="flex items-center gap-2 rounded-xl bg-cyan-400 px-4 text-xs font-bold text-void disabled:opacity-40">{busy === "goal" ? <Loader2 size={17} className="animate-spin" /> : <CheckCircle2 size={17} />}Salvar</button></div>{goal !== null && <button type="button" disabled={busy !== null || queuedAdds > 0} onClick={() => setConfirmGoalRemoval(true)} className="mt-3 text-xs font-medium text-coral disabled:opacity-40">Remover meta — os registros serão mantidos</button>}</div>}
      </section>

      {todayRecords.length > 0 && <section className="mx-auto mt-4 max-w-xl overflow-hidden rounded-2xl border border-surface-border bg-surface"><button type="button" aria-expanded={todayOpen} onClick={()=>setTodayOpen(value=>!value)} className="flex min-h-16 w-full items-center gap-3 px-4 text-left"><History size={18} className="shrink-0 text-cyan-300"/><span className="min-w-0 flex-1"><strong className="block text-sm">Registros de hoje</strong><span className="block text-[11px] text-ink-muted">{todayRecords.length} confirmado(s) · {total} ml somados</span></span><ChevronDown size={16} className={`text-ink-muted transition ${todayOpen?'rotate-180':''}`}/></button>{todayOpen&&<div className="border-t border-surface-border/60">{todayRecords.map((record) => <div key={record.id} className="flex min-h-12 items-center justify-between border-b border-surface-border/40 px-4 last:border-0"><div className="flex items-baseline gap-2"><strong className="text-sm">{record.valor_numerico} ml</strong><span className="text-[10px] text-ink-muted">{record.horario}</span></div><button type="button" disabled={busy !== null || queuedAdds > 0} onClick={() => setRemovingRecord(record.id || null)} className="flex h-10 w-10 items-center justify-center rounded-lg text-coral" aria-label={`Remover ${record.valor_numerico} ml das ${record.horario}`}>{busy === record.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}</button></div>)}</div>}</section>}

      <section className="mx-auto mt-4 max-w-xl overflow-hidden rounded-2xl border border-surface-border bg-surface">
        <button type="button" aria-expanded={historyOpen} onClick={()=>setHistoryOpen(value=>!value)} className="flex min-h-16 w-full items-center gap-3 px-4 text-left"><Droplets size={18} className="shrink-0 text-cyan-300/70"/><span className="min-w-0 flex-1"><strong className="block text-sm">Histórico observado</strong><span className="block text-[11px] text-ink-muted">{average === null ? "Ainda não há dias registrados." : `${days.length} dia(s) · média registrada de ${average} ml`}</span></span><ChevronDown size={16} className={`text-ink-muted transition ${historyOpen?'rotate-180':''}`}/></button>
        {historyOpen&&<div className="border-t border-surface-border/60 p-4">
        <div className="mt-4 grid grid-cols-2 gap-2">
          <div className="rounded-2xl bg-void p-3">
            <p className="text-[9px] uppercase tracking-wide text-ink-faint">Média registrada</p>
            <p className="mt-1 text-sm font-semibold">{average === null ? "—" : `${average} ml`}</p>
            <p className="mt-1 text-[10px] text-ink-muted">Só dias com registro</p>
          </div>
          <div className="rounded-2xl bg-void p-3">
            <p className="text-[9px] uppercase tracking-wide text-ink-faint">Cobertura · 7 dias</p>
            <p className="mt-1 text-sm font-semibold">{sevenDayCoverage}/7 dias</p>
            <p className="mt-1 text-[10px] text-ink-muted">Ausência não conta como zero</p>
          </div>
        </div>
        {days.length > 0 ? <div className="mt-4 grid gap-3">{days.map(([date, value]) => <div key={date}><div className="flex justify-between text-xs"><span className="capitalize text-ink-muted">{formatDate(date)}</span><strong>{value} ml</strong></div><div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-raised"><div className="h-full rounded-full bg-cyan-400/70" style={{ width: `${Math.min(100, Math.round((value / historyMax) * 100))}%` }} /></div></div>)}</div> : <div className="mt-4 rounded-2xl border border-dashed border-surface-border p-5 text-center text-xs text-ink-muted">Seus dias registrados aparecerão aqui.</div>}
        <div className="mt-4 flex items-center justify-between gap-3 border-t border-surface-border/50 pt-3"><p className="text-[10px] leading-relaxed text-ink-muted">Dias sem registro não são tratados como consumo zero. Visão descritiva.</p><button type="button" onClick={()=>router.push(preserveReturn('/saude/registros'))} className="min-h-10 shrink-0 text-xs font-semibold text-cyan-300">Linha de cuidado</button></div>
        </div>}
      </section>
    <ConfirmationModal isOpen={Boolean(removingRecord)} onClose={()=>setRemovingRecord(null)} onConfirm={async()=>{const id=removingRecord;setRemovingRecord(null);if(id)await remove(id);}} title="Remover registro de água?" message="O total do dia será atualizado." confirmLabel="Remover registro" />
    <ConfirmationModal isOpen={confirmGoalRemoval} onClose={()=>setConfirmGoalRemoval(false)} onConfirm={clearGoal} title="Remover meta diária?" message="Os registros de água serão preservados." confirmLabel="Remover meta" />
    </section>
  );
}
