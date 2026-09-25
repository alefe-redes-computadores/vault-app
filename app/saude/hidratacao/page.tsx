// app/saude/hidratacao/page.tsx
"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Bell, CheckCircle2, Droplets, History, Info, Loader2, RotateCcw, Target, Trash2 } from "lucide-react";
import { useToast } from "@/components/ToastProvider";
import { useHealthGoals } from "@/hooks/useHealthGoals";
import { useRegistrosSaude } from "@/hooks/useRegistrosSaude";
import { useHapticFeedback } from "@/lib/haptics";

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

export default function HydrationPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const { trigger } = useHapticFeedback();
  const { registros, isLoading: recordsLoading, createRegistro, deleteRegistro } = useRegistrosSaude();
  const { hydrationGoal, isLoading: goalLoading, setHydrationGoal, clearHydrationGoal } = useHealthGoals();
  const operationLock = useRef(false);
  const [goalDraft, setGoalDraft] = useState("");
  const [custom, setCustom] = useState("");
  const [showGoalEditor, setShowGoalEditor] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const today = localDateKey(new Date());
  const goal = hydrationGoal?.target_value ?? null;

  const validRecords = useMemo(() => registros.filter(validWaterRecord), [registros]);
  const todayRecords = useMemo(() => validRecords.filter((record) => record.data === today).sort((left, right) => right.horario.localeCompare(left.horario)), [validRecords, today]);
  const total = todayRecords.reduce((sum, record) => sum + (record.valor_numerico || 0), 0);
  const days = useMemo(() => {
    const totals = new Map<string, number>();
    for (const record of validRecords) totals.set(record.data, (totals.get(record.data) || 0) + (record.valor_numerico || 0));
    return [...totals.entries()].sort((left, right) => right[0].localeCompare(left[0])).slice(0, 7);
  }, [validRecords]);
  const average = days.length > 0 ? Math.round(days.reduce((sum, [, value]) => sum + value, 0) / days.length) : null;
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
    await withOperation("add", async () => {
      try {
        const date = new Date();
        await createRegistro({ categoria: "habito", tipo: "agua", nome: "Água", valor_medicao: `${normalized} ml`, valor_numerico: normalized, unidade_medida: "ml", registro_chave: "habito:agua", data: localDateKey(date), horario: `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}` });
        setCustom("");
        trigger("success");
        showToast(`${normalized} ml registrados`, "success");
      } catch (error) {
        trigger("error");
        showToast(error instanceof Error ? error.message : "Não foi possível registrar", "error");
      }
    });
  }

  async function remove(id?: string, undo = false) {
    if (!id) return;
    await withOperation(id, async () => {
      try {
        await deleteRegistro(id);
        trigger("vibrate");
        showToast(undo ? "Último registro desfeito" : "Registro removido", "info");
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
    if (!window.confirm("Remover a meta diária? Seus registros de água serão preservados.")) return;
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
    <main className="min-h-screen bg-void px-4 pb-28 pt-6 text-ink-primary">
      <header className="mx-auto flex max-w-xl items-center gap-3">
        <button type="button" onClick={() => router.replace("/saude/registros")} className="rounded-xl border border-surface-border p-2" aria-label="Voltar"><ArrowLeft size={20} /></button>
        <div className="min-w-0 flex-1"><h1 className="font-display text-2xl font-bold">Hidratação</h1><p className="text-sm text-ink-muted">Um registro rápido, sem presumir consumo</p></div>
        <button type="button" onClick={() => router.push("/saude/lembretes")} className="rounded-xl border border-surface-border p-2" aria-label="Abrir lembretes"><Bell size={20} /></button>
      </header>

      <section className="mx-auto mt-6 max-w-xl overflow-hidden rounded-[32px] border border-ice/25 bg-gradient-to-br from-ice/10 via-surface to-surface p-5 shadow-[0_24px_70px_rgba(56,189,248,0.08)]">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl border border-ice/20 bg-ice/10 p-3 text-ice"><Droplets size={24} /></div>
          <div className="min-w-0 flex-1"><p className="font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-ice">Hoje</p><p className="mt-1 text-3xl font-bold">{loading ? "—" : `${total} ml`}</p><p className="mt-1 text-xs text-ink-muted">{goal && remaining === 0 ? "Meta manual alcançada" : goal ? `${remaining} ml restantes na meta manual` : "Sem meta definida"}</p></div>
          {progress !== null && <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-4 border-ice/25 bg-void/70 font-mono text-sm font-bold text-ice">{progress}%</div>}
        </div>
        {goal ? <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-void"><div className="h-full rounded-full bg-ice transition-all duration-500" style={{ width: `${progress}%` }} /></div> : <div className="mt-4 flex items-start gap-2 rounded-2xl bg-ice/5 p-3"><Info size={15} className="mt-0.5 shrink-0 text-ice" /><p className="text-xs text-ink-muted">O Vault não recomenda nem presume uma meta. Você pode cadastrar manualmente uma referência definida por você ou por um profissional.</p></div>}
        <div className="mt-5 grid grid-cols-4 gap-2">{QUICK_AMOUNTS.map((amount) => <button key={amount} type="button" disabled={busy !== null} onClick={() => void add(amount)} className="rounded-2xl border border-ice/20 bg-ice/10 px-2 py-3 text-center transition active:scale-95 disabled:opacity-40"><span className="block text-sm font-bold text-ice">+{amount}</span><span className="text-[9px] text-ink-muted">ml</span></button>)}</div>
        <div className="mt-3 flex gap-2"><input aria-label="Outro valor em mililitros" inputMode="numeric" placeholder="Outro valor em ml" value={custom} onChange={(event) => setCustom(event.target.value.replace(/[^0-9]/g, ""))} className="min-w-0 flex-1 rounded-xl border border-surface-border bg-void p-3 text-sm outline-none focus:border-ice/50" /><button type="button" disabled={busy !== null || !custom} onClick={() => void add(Number(custom))} className="rounded-xl border border-ice/40 px-4 text-xs font-bold text-ice disabled:opacity-40">Registrar</button></div>
        {lastRecord?.id && <button type="button" disabled={busy !== null} onClick={() => void remove(lastRecord.id, true)} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl py-2 text-[11px] font-semibold text-ink-muted disabled:opacity-40"><RotateCcw size={14} /> Desfazer último registro ({lastRecord.valor_numerico} ml às {lastRecord.horario})</button>}
      </section>

      <section className="mx-auto mt-4 max-w-xl rounded-3xl border border-surface-border bg-surface p-4">
        <button type="button" onClick={() => { setShowGoalEditor((value) => !value); setGoalDraft(goal ? String(goal) : ""); }} className="flex w-full items-center justify-between text-left"><span><span className="block text-sm font-semibold">Meta diária opcional</span><span className="mt-1 block text-[11px] text-ink-muted">{goal ? `${goal} ml · sincronizada` : "Configure somente se fizer sentido para você"}</span></span><Target size={19} className="text-ice" /></button>
        {showGoalEditor && <div className="mt-3 border-t border-surface-border/60 pt-3"><div className="flex gap-2"><input aria-label="Meta diária em mililitros" type="number" min="1" max="20000" placeholder={goal ? String(goal) : "Meta em ml"} value={goalDraft} onChange={(event) => setGoalDraft(event.target.value)} className="min-w-0 flex-1 rounded-xl border border-surface-border bg-void p-3 text-sm" /><button type="button" disabled={busy !== null || !goalDraft} onClick={() => void saveGoal()} className="flex items-center gap-2 rounded-xl bg-ice px-4 text-xs font-bold text-void disabled:opacity-40">{busy === "goal" ? <Loader2 size={17} className="animate-spin" /> : <CheckCircle2 size={17} />}Salvar</button></div>{goal !== null && <button type="button" disabled={busy !== null} onClick={() => void clearGoal()} className="mt-3 text-xs font-medium text-coral disabled:opacity-40">Remover meta — os registros serão mantidos</button>}</div>}
      </section>

      {todayRecords.length > 0 && <section className="mx-auto mt-4 max-w-xl rounded-3xl border border-surface-border bg-surface p-4"><div className="flex items-center justify-between"><div><h2 className="font-semibold">Registros de hoje</h2><p className="text-[11px] text-ink-muted">{todayRecords.length} registro(s) confirmado(s)</p></div><History size={18} className="text-ice" /></div><div className="mt-3 grid gap-2">{todayRecords.map((record) => <div key={record.id} className="flex items-center justify-between rounded-2xl border border-surface-border/50 bg-void p-3"><div><strong>{record.valor_numerico} ml</strong><p className="text-xs text-ink-muted">às {record.horario}</p></div><button type="button" disabled={busy !== null} onClick={() => { if (window.confirm(`Remover o registro de ${record.valor_numerico} ml?`)) void remove(record.id); }} className="rounded-lg p-2 text-coral" aria-label="Remover registro">{busy === record.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}</button></div>)}</div></section>}

      <section className="mx-auto mt-4 max-w-xl rounded-3xl border border-surface-border bg-surface p-4">
        <div className="flex items-center justify-between"><div><h2 className="font-semibold">Histórico observado</h2><p className="mt-1 text-[11px] text-ink-muted">{average === null ? "Ainda não há dias registrados." : `Média em ${days.length} dia(s) com registro: ${average} ml.`}</p></div><Droplets size={18} className="text-ice/70" /></div>
        {days.length > 0 ? <div className="mt-4 grid gap-3">{days.map(([date, value]) => <div key={date}><div className="flex justify-between text-xs"><span className="capitalize text-ink-muted">{formatDate(date)}</span><strong>{value} ml</strong></div><div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-raised"><div className="h-full rounded-full bg-ice/70" style={{ width: `${Math.min(100, Math.round((value / historyMax) * 100))}%` }} /></div></div>)}</div> : <div className="mt-4 rounded-2xl border border-dashed border-surface-border p-5 text-center text-xs text-ink-muted">Seus dias registrados aparecerão aqui.</div>}
        <p className="mt-4 text-[11px] leading-relaxed text-ink-muted">Dias sem registro não são tratados como consumo zero. Esta visão é descritiva e não substitui orientação profissional.</p>
      </section>
    </main>
  );
}
