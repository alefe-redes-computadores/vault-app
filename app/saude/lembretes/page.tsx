"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Capacitor } from "@capacitor/core";
import {
  AlertTriangle,
  ArrowLeft,
  Bell,
  CheckCircle2,
  Loader2,
  Pause,
  Pencil,
  Play,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";

import { HEALTH_REMINDERS_RECONCILE_EVENT } from "@/components/HealthReminderReconciler";
import { useToast } from "@/components/ToastProvider";
import { useHealthReminders } from "@/hooks/useHealthReminders";
import {
  HEALTH_REMINDER_TARGETS,
  type HealthReminderTargetType,
} from "@/lib/health-reminders/domain";
import {
  getHealthReminderPermission,
  requestHealthReminderPermission,
  type HealthReminderScheduleResult,
} from "@/lib/health-reminders/scheduler";
import type {
  HealthReminderFrequency,
  HealthReminderRule,
} from "@/lib/health-reminders/types";
import { useHapticFeedback } from "@/lib/haptics";

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const DEFAULT_TARGET = HEALTH_REMINDER_TARGETS[0];

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Não foi possível concluir a ação.";
}

export default function HealthRemindersPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const { trigger } = useHapticFeedback();
  const {
    reminders,
    isLoading,
    createReminder,
    updateReminder,
    pauseReminder,
    deleteReminder,
  } = useHealthReminders();
  const [editing, setEditing] = useState<HealthReminderRule | null>(null);
  const [targetType, setTargetType] = useState<HealthReminderTargetType>(DEFAULT_TARGET.type);
  const [title, setTitle] = useState<string>(DEFAULT_TARGET.label);
  const [time, setTime] = useState("10:00");
  const [frequency, setFrequency] = useState<HealthReminderFrequency>("daily");
  const [weekdays, setWeekdays] = useState<number[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [permission, setPermission] = useState<HealthReminderScheduleResult["permission"]>(
    Capacitor.isNativePlatform() ? "prompt" : "unavailable"
  );

  const selectedTarget = useMemo(
    () => HEALTH_REMINDER_TARGETS.find((target) => target.type === targetType) || DEFAULT_TARGET,
    [targetType]
  );

  useEffect(() => {
    void getHealthReminderPermission().then(setPermission).catch(() => setPermission("denied"));
  }, []);

  useEffect(() => {
    if (!editing) return;
    const knownTarget = HEALTH_REMINDER_TARGETS.find((target) =>
      target.type === editing.target_type && target.route === editing.target_route
    );
    setTargetType((knownTarget || DEFAULT_TARGET).type);
    setTitle(editing.title);
    setTime(editing.time);
    setFrequency(editing.frequency);
    setWeekdays(editing.weekdays);
  }, [editing]);

  function reset() {
    setEditing(null);
    setTargetType(DEFAULT_TARGET.type);
    setTitle(DEFAULT_TARGET.label);
    setTime("10:00");
    setFrequency("daily");
    setWeekdays([]);
  }

  function changeTarget(nextType: HealthReminderTargetType) {
    const next = HEALTH_REMINDER_TARGETS.find((target) => target.type === nextType) || DEFAULT_TARGET;
    setTargetType(next.type);
    if (!editing || title === selectedTarget.label) setTitle(next.label);
  }

  function toggleDay(day: number) {
    setWeekdays((current) => {
      if (frequency === "weekly") return [day];
      return current.includes(day)
        ? current.filter((value) => value !== day)
        : [...current, day].sort((left, right) => left - right);
    });
  }

  async function run(id: string, operation: () => Promise<unknown>, success: string) {
    setBusyId(id);
    try {
      await operation();
      trigger("success");
      showToast(success, "success");
    } catch (error) {
      trigger("error");
      showToast(errorMessage(error), "error");
    } finally {
      setBusyId(null);
    }
  }

  async function save() {
    await run("form", async () => {
      const data = {
        title,
        body: "Abra o Vault para registrar — sem presumir que a ação foi realizada.",
        target_type: selectedTarget.type,
        target_route: selectedTarget.route,
        time,
        frequency,
        weekdays: frequency === "daily" ? [] : weekdays,
        status: editing?.status || "active" as const,
      };
      if (editing) await updateReminder(editing.id, data);
      else await createReminder(data);
      reset();
    }, editing ? "Lembrete atualizado" : "Lembrete criado");
  }

  async function enableNotifications() {
    setBusyId("permission");
    try {
      const next = await requestHealthReminderPermission();
      setPermission(next);
      if (next === "granted") {
        window.dispatchEvent(new Event(HEALTH_REMINDERS_RECONCILE_EVENT));
        trigger("success");
        showToast("Notificações permitidas neste aparelho", "success");
      } else {
        showToast("A permissão não foi concedida neste aparelho", "info");
      }
    } finally {
      setBusyId(null);
    }
  }

  const invalidDays = frequency === "weekly"
    ? weekdays.length !== 1
    : frequency === "custom" && weekdays.length === 0;

  return (
    <main className="min-h-screen bg-void px-4 pb-28 pt-6 text-ink-primary">
      <header className="mx-auto flex max-w-xl items-center gap-3">
        <button onClick={() => router.replace("/saude/registros")} className="rounded-xl border border-surface-border p-2" aria-label="Voltar">
          <ArrowLeft size={20} />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-2xl font-bold">Lembretes de saúde</h1>
          <p className="text-sm text-ink-muted">Regras sincronizadas; agendamento local por aparelho.</p>
        </div>
      </header>

      <section className="mx-auto mt-5 max-w-xl rounded-3xl border border-surface-border bg-surface p-4">
        {permission === "unavailable" ? (
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 shrink-0 text-amber-400" size={18} />
            <p className="text-xs leading-relaxed text-ink-muted">No navegador/PWA, o sistema não garante alarmes recorrentes com o Vault fechado. A regra continua sincronizada.</p>
          </div>
        ) : permission === "granted" ? (
          <div className="flex items-center gap-3 text-xs text-emerald-400"><CheckCircle2 size={18} />Notificações autorizadas neste aparelho.</div>
        ) : (
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-start gap-2"><ShieldCheck className="mt-0.5 shrink-0 text-ice" size={18} /><p className="text-xs text-ink-muted">Autorize quando quiser receber os lembretes neste aparelho.</p></div>
            <button disabled={busyId !== null} onClick={() => void enableNotifications()} className="shrink-0 rounded-xl bg-ice px-3 py-2 text-xs font-bold text-void">Permitir</button>
          </div>
        )}
      </section>

      <section className="mx-auto mt-4 max-w-xl rounded-3xl border border-surface-border bg-surface p-4">
        <div className="mb-3 flex items-center justify-between">
          <strong>{editing ? "Editar lembrete" : "Novo lembrete"}</strong>
          {editing && <button onClick={reset} aria-label="Cancelar edição"><X size={18} /></button>}
        </div>
        <div className="grid gap-3">
          <fieldset>
            <legend className="text-xs font-medium text-ink-muted">O que deseja lembrar?</legend>
            <div className="mt-2 grid gap-2 sm:grid-cols-3">
              {HEALTH_REMINDER_TARGETS.map((target) => {
                const selected = target.type === targetType;
                return <button type="button" key={target.type} onClick={() => changeTarget(target.type)} className={`rounded-2xl border p-3 text-left transition-all ${selected ? "border-ice bg-ice/10 text-ice" : "border-surface-border bg-void text-ink-muted"}`}>
                  <span className="block text-xs font-bold">{target.label.replace("Registrar ", "")}</span>
                  <span className="mt-1 block text-[10px] leading-snug opacity-75">{target.description}</span>
                </button>;
              })}
            </div>
          </fieldset>
          <label className="grid gap-1 text-xs text-ink-muted">Título
            <input value={title} onChange={(event) => setTitle(event.target.value)} className="rounded-xl border border-surface-border bg-void p-3 text-sm text-ink-primary" />
          </label>
          <label className="grid gap-1 text-xs text-ink-muted">Horário
            <input type="time" value={time} onChange={(event) => setTime(event.target.value)} className="rounded-xl border border-surface-border bg-void p-3 text-sm text-ink-primary" />
          </label>
          <fieldset>
            <legend className="text-xs font-medium text-ink-muted">Frequência</legend>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {([['daily','Todos os dias'],['weekly','Uma vez por semana'],['custom','Dias personalizados']] as const).map(([value,label]) => (
                <button type="button" key={value} onClick={() => { setFrequency(value); setWeekdays([]); }} className={`rounded-xl border px-2 py-3 text-[11px] font-semibold ${frequency === value ? "border-ice bg-ice/10 text-ice" : "border-surface-border bg-void text-ink-muted"}`}>{label}</button>
              ))}
            </div>
          </fieldset>
          {frequency !== "daily" && (
            <div className="grid grid-cols-7 gap-1">
              {WEEKDAYS.map((label, day) => (
                <button type="button" key={label} onClick={() => toggleDay(day)} className={`rounded-lg py-2 text-[10px] ${weekdays.includes(day) ? "bg-ice text-void" : "bg-void text-ink-muted"}`}>{label}</button>
              ))}
            </div>
          )}
          <button disabled={busyId !== null || !title.trim() || !time || invalidDays} onClick={() => void save()} className="flex items-center justify-center gap-2 rounded-xl bg-ice p-3 font-semibold text-void disabled:opacity-40">
            {busyId === "form" && <Loader2 size={17} className="animate-spin" />}
            {editing ? "Salvar alterações" : "Criar lembrete"}
          </button>
        </div>
      </section>

      <section className="mx-auto mt-4 grid max-w-xl gap-3">
        {isLoading && <div className="flex justify-center p-8"><Loader2 className="animate-spin text-ice" /></div>}
        {!isLoading && reminders.length === 0 && (
          <div className="rounded-3xl border border-dashed border-surface-border p-8 text-center"><Bell className="mx-auto text-ink-faint" /><p className="mt-3 text-sm font-semibold">Nenhum lembrete criado</p><p className="mt-1 text-xs text-ink-muted">Crie apenas os lembretes que forem úteis para sua rotina.</p></div>
        )}
        {reminders.map((reminder) => (
          <article key={reminder.id} className="flex items-center gap-3 rounded-2xl border border-surface-border bg-surface p-4">
            <Bell size={18} className={reminder.status === "paused" ? "text-ink-faint" : "text-ice"} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{reminder.title}</p>
              <p className="text-xs text-ink-muted">{reminder.time} · {reminder.frequency === "daily" ? "todos os dias" : reminder.weekdays.map((day) => WEEKDAYS[day]).join(", ")} · {reminder.status === "paused" ? "pausado" : "ativo"}</p>
            </div>
            <button disabled={busyId !== null} aria-label="Editar" onClick={() => setEditing(reminder)} className="p-2"><Pencil size={17} /></button>
            <button disabled={busyId !== null} aria-label={reminder.status === "paused" ? "Ativar" : "Pausar"} onClick={() => void run(reminder.id, () => pauseReminder(reminder.id, reminder.status !== "paused"), reminder.status === "paused" ? "Lembrete ativado" : "Lembrete pausado")} className="p-2">{busyId === reminder.id ? <Loader2 size={17} className="animate-spin" /> : reminder.status === "paused" ? <Play size={17} /> : <Pause size={17} />}</button>
            <button disabled={busyId !== null} aria-label="Excluir" onClick={() => { if (window.confirm(`Excluir o lembrete “${reminder.title}”?`)) void run(reminder.id, () => deleteReminder(reminder.id), "Lembrete excluído"); }} className="p-2 text-coral"><Trash2 size={17} /></button>
          </article>
        ))}
      </section>
    </main>
  );
}
