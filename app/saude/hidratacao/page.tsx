"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Bell,
  Droplets,
  Info,
  Loader2,
  Target,
  Trash2,
} from "lucide-react";

import { useToast } from "@/components/ToastProvider";
import { useHealthGoals } from "@/hooks/useHealthGoals";
import { useRegistrosSaude } from "@/hooks/useRegistrosSaude";
import { useHapticFeedback } from "@/lib/haptics";

function localDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function formatDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" })
    .format(new Date(year, month - 1, day, 12));
}

function validWaterRecord(record: {
  tipo: string;
  unidade_medida?: string;
  valor_numerico?: number;
}) {
  return record.tipo === "agua" &&
    record.unidade_medida === "ml" &&
    typeof record.valor_numerico === "number" &&
    Number.isFinite(record.valor_numerico) &&
    record.valor_numerico > 0;
}

export default function HydrationPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const { trigger } = useHapticFeedback();
  const { registros, isLoading: recordsLoading, createRegistro, deleteRegistro } = useRegistrosSaude();
  const { hydrationGoal, isLoading: goalLoading, setHydrationGoal, clearHydrationGoal } = useHealthGoals();
  const [goalDraft, setGoalDraft] = useState("");
  const [custom, setCustom] = useState("350");
  const [busy, setBusy] = useState<string | null>(null);
  const today = localDateKey(new Date());
  const goal = hydrationGoal?.target_value ?? null;

  const validRecords = useMemo(
    () => registros.filter(validWaterRecord),
    [registros]
  );
  const todayRecords = useMemo(
    () => validRecords
      .filter((record) => record.data === today)
      .sort((left, right) => right.horario.localeCompare(left.horario)),
    [validRecords, today]
  );
  const total = todayRecords.reduce((sum, record) => sum + (record.valor_numerico || 0), 0);
  const days = useMemo(() => {
    const totals = new Map<string, number>();
    for (const record of validRecords) {
      totals.set(record.data, (totals.get(record.data) || 0) + (record.valor_numerico || 0));
    }
    return [...totals.entries()].sort((left, right) => right[0].localeCompare(left[0])).slice(0, 7);
  }, [validRecords]);
  const average = days.length > 0
    ? Math.round(days.reduce((sum, [, value]) => sum + value, 0) / days.length)
    : null;
  const progress = goal ? Math.min(100, Math.round((total / goal) * 100)) : null;

  async function add(ml: number) {
    if (!Number.isFinite(ml) || ml <= 0 || ml > 20000) {
      showToast("Informe um valor entre 1 e 20.000 ml", "error");
      return;
    }
    setBusy("add");
    try {
      const date = new Date();
      await createRegistro({
        categoria: "habito",
        tipo: "agua",
        nome: "Água",
        valor_medicao: `${Math.round(ml)} ml`,
        valor_numerico: Math.round(ml),
        unidade_medida: "ml",
        registro_chave: "habito:agua",
        data: localDateKey(date),
        horario: `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`,
      });
      setCustom("");
      trigger("success");
      showToast(`${Math.round(ml)} ml registrados`, "success");
    } catch (error) {
      trigger("error");
      showToast(error instanceof Error ? error.message : "Não foi possível registrar", "error");
    } finally {
      setBusy(null);
    }
  }

  async function remove(id?: string) {
    if (!id) return;
    setBusy(id);
    try {
      await deleteRegistro(id);
      trigger("vibrate");
      showToast("Registro removido", "info");
    } catch (error) {
      trigger("error");
      showToast(error instanceof Error ? error.message : "Não foi possível remover", "error");
    } finally {
      setBusy(null);
    }
  }

  async function saveGoal() {
    const value = Number(goalDraft);
    if (!Number.isFinite(value) || value <= 0 || value > 20000) {
      showToast("Informe uma meta manual entre 1 e 20.000 ml", "error");
      return;
    }
    setBusy("goal");
    try {
      await setHydrationGoal(value);
      setGoalDraft("");
      trigger("success");
      showToast("Meta manual sincronizada", "success");
    } catch (error) {
      trigger("error");
      showToast(error instanceof Error ? error.message : "Não foi possível salvar a meta", "error");
    } finally {
      setBusy(null);
    }
  }

  async function clearGoal() {
    if (!window.confirm("Remover a meta diária? Seus registros de água serão preservados.")) return;
    setBusy("goal");
    try {
      await clearHydrationGoal();
      setGoalDraft("");
      trigger("success");
      showToast("Meta removida; registros preservados", "success");
    } catch (error) {
      trigger("error");
      showToast(error instanceof Error ? error.message : "Não foi possível remover a meta", "error");
    } finally {
      setBusy(null);
    }
  }

  const loading = recordsLoading || goalLoading;

  return (
    <main className="min-h-screen bg-void px-4 pb-28 pt-6 text-ink-primary">
      <header className="mx-auto flex max-w-xl items-center gap-3">
        <button onClick={() => router.replace("/saude/registros")} className="rounded-xl border border-surface-border p-2" aria-label="Voltar"><ArrowLeft size={20} /></button>
        <div className="min-w-0 flex-1"><h1 className="font-display text-2xl font-bold">Hidratação</h1><p className="text-sm text-ink-muted">Registros reais em ml</p></div>
        <button onClick={() => router.push("/saude/lembretes")} className="rounded-xl border border-surface-border p-2" aria-label="Abrir lembretes"><Bell size={20} /></button>
      </header>

      <section className="mx-auto mt-6 max-w-xl rounded-3xl border border-ice/20 bg-surface p-5">
        <div className="flex items-center gap-3">
          <Droplets className="text-ice" />
          <div className="min-w-0 flex-1">
            <p className="text-3xl font-bold">{loading ? "—" : `${total} ml`}</p>
            <p className="text-sm text-ink-muted">registrados hoje{goal ? ` · meta manual ${goal} ml` : " · sem meta definida"}</p>
          </div>
          {progress !== null && <span className="font-mono text-sm font-bold text-ice">{progress}%</span>}
        </div>
        {goal ? (
          <div className="mt-4 h-3 overflow-hidden rounded-full bg-void"><div className="h-full rounded-full bg-ice transition-all" style={{ width: `${progress}%` }} /></div>
        ) : (
          <div className="mt-4 flex items-start gap-2 rounded-2xl bg-ice/5 p-3"><Info size={15} className="mt-0.5 shrink-0 text-ice" /><p className="text-xs text-ink-muted">O Vault não presume uma meta de consumo. Se quiser acompanhar progresso, informe manualmente uma meta escolhida por você.</p></div>
        )}

        <div className="mt-4 flex gap-2">
          <button disabled={busy !== null} onClick={() => void add(250)} className="flex-1 rounded-xl bg-ice/10 p-3 font-semibold text-ice disabled:opacity-40">+250 ml</button>
          <button disabled={busy !== null} onClick={() => void add(500)} className="flex-1 rounded-xl bg-ice/10 p-3 font-semibold text-ice disabled:opacity-40">+500 ml</button>
        </div>
        <div className="mt-3 flex gap-2">
          <input inputMode="numeric" placeholder="Outro valor em ml" value={custom} onChange={(event) => setCustom(event.target.value.replace(/[^0-9]/g, ""))} className="min-w-0 flex-1 rounded-xl border border-surface-border bg-void p-3" />
          <button disabled={busy !== null || !custom} onClick={() => void add(Number(custom))} className="rounded-xl border border-ice/40 px-4 disabled:opacity-40">Registrar</button>
        </div>

        <label className="mt-5 block text-xs text-ink-muted">Meta diária manual e sincronizada (ml)</label>
        <div className="mt-1 flex gap-2">
          <input type="number" min="1" max="20000" placeholder={goal ? String(goal) : "Defina se desejar"} value={goalDraft} onChange={(event) => setGoalDraft(event.target.value)} className="min-w-0 flex-1 rounded-xl border border-surface-border bg-void p-3" />
          <button disabled={busy !== null || !goalDraft} onClick={() => void saveGoal()} className="flex items-center gap-2 rounded-xl bg-ice px-4 font-semibold text-void disabled:opacity-40">{busy === "goal" ? <Loader2 size={18} className="animate-spin" /> : <Target size={17} />}Salvar</button>
        </div>
        {goal !== null && <button disabled={busy !== null} onClick={() => void clearGoal()} className="mt-2 text-xs font-medium text-coral disabled:opacity-40">Remover meta (mantém os registros)</button>}
      </section>

      {todayRecords.length > 0 && (
        <section className="mx-auto mt-4 max-w-xl rounded-3xl border border-surface-border bg-surface p-5">
          <h2 className="font-semibold">Registros de hoje</h2>
          <div className="mt-3 grid gap-2">
            {todayRecords.map((record) => (
              <div key={record.id} className="flex items-center justify-between rounded-xl bg-void p-3">
                <div><strong>{record.valor_numerico} ml</strong><p className="text-xs text-ink-muted">às {record.horario}</p></div>
                <button disabled={busy !== null} onClick={() => { if (window.confirm(`Remover o registro de ${record.valor_numerico} ml?`)) void remove(record.id); }} className="rounded-lg p-2 text-coral" aria-label="Remover registro">{busy === record.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}</button>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="mx-auto mt-4 max-w-xl rounded-3xl border border-surface-border bg-surface p-5">
        <h2 className="font-semibold">Histórico observado</h2>
        <p className="mt-1 text-sm text-ink-muted">{average === null ? "Ainda não há dias registrados para calcular média." : `Média dos ${days.length} dias com registros: ${average} ml.`}</p>
        <div className="mt-3 grid gap-2">{days.map(([date, value]) => <div key={date} className="flex justify-between rounded-xl bg-void p-3"><span>{formatDate(date)}</span><strong>{value} ml</strong></div>)}</div>
        <p className="mt-3 text-xs text-ink-muted">Dias sem registro não são tratados como consumo zero. Esta visão é descritiva e não substitui orientação profissional.</p>
      </section>
    </main>
  );
}
