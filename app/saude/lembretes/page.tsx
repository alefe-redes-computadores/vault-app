// app/saude/lembretes/page.tsx
"use client";
import {HealthTimePicker} from "@/components/saude/HealthTimePicker";
import { isVaultNative } from "@/lib/native-runtime";
import { NotificationPreferencesPanel } from "@/components/NotificationPreferencesPanel";
import { NotificationBrainPanel } from "@/components/NotificationBrainPanel";
import { ConfirmationModal } from "@/components/ConfirmationModal";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useReturnContext } from "@/hooks/useReturnContext";
import {
  AlertTriangle,
  ArrowLeft,
  Bell,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Loader2,
  Pause,
  Pencil,
  Play,
  Plus,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
  X,
} from "lucide-react";

import { HEALTH_REMINDERS_RECONCILE_EVENT } from "@/components/HealthReminderReconciler";
import { useToast } from "@/components/ToastProvider";
import { useHealthReminders } from "@/hooks/useHealthReminders";
import {
  HEALTH_REMINDER_TARGETS,
  nextHealthReminderOccurrence,
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
import { setNotificationPreferenceEnabled } from "@/lib/notifications";

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const DEFAULT_TARGET = HEALTH_REMINDER_TARGETS[0];

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Não foi possível concluir a ação.";
}

function frequencyLabel(reminder: Pick<HealthReminderRule,"frequency"|"weekdays">) {
  if(reminder.frequency==="daily")return "Todos os dias";
  const days=reminder.weekdays.map(day=>WEEKDAYS[day]).filter(Boolean).join(", ");
  return reminder.frequency==="weekly"?`Toda ${days}`:`${days}`;
}

function nextLabel(value: Date | null, now: Date) {
  if(!value)return "Sem próxima ocorrência";
  const sameDay=value.getFullYear()===now.getFullYear()&&value.getMonth()===now.getMonth()&&value.getDate()===now.getDate();
  const tomorrow=new Date(now);tomorrow.setDate(now.getDate()+1);
  const nextDay=value.getFullYear()===tomorrow.getFullYear()&&value.getMonth()===tomorrow.getMonth()&&value.getDate()===tomorrow.getDate();
  const prefix=sameDay?"Hoje":nextDay?"Amanhã":new Intl.DateTimeFormat("pt-BR",{weekday:"short",day:"2-digit",month:"short"}).format(value);
  return `${prefix} às ${String(value.getHours()).padStart(2,"0")}:${String(value.getMinutes()).padStart(2,"0")}`;
}

export default function HealthRemindersPage() {
  const {backTarget,preserveReturn} = useReturnContext("/saude/registros");
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
  const [formOpen, setFormOpen] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [showPaused, setShowPaused] = useState(false);
  const [deleting, setDeleting] = useState<HealthReminderRule | null>(null);
  const [permission, setPermission] = useState<HealthReminderScheduleResult["permission"]>(
    isVaultNative() ? "prompt" : "unavailable"
  );

  const selectedTarget = useMemo(
    () => HEALTH_REMINDER_TARGETS.find((target) => target.type === targetType) || DEFAULT_TARGET,
    [targetType]
  );

  useEffect(() => {
    const refresh=()=>{if(document.visibilityState==="visible")void getHealthReminderPermission().then(setPermission).catch(() => setPermission("denied"));};
    refresh();
    document.addEventListener("visibilitychange",refresh);
    return()=>document.removeEventListener("visibilitychange",refresh);
  }, []);

  useEffect(() => {
    if (!editing) return;
    setFormOpen(true);
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
    setFormOpen(false);
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
      return true;
    } catch (error) {
      trigger("error");
      showToast(errorMessage(error), "error");
      return false;
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
        setNotificationPreferenceEnabled(true);
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
  const presentation=useMemo(()=>{
    const now=new Date();
    const rows=reminders.map(reminder=>({reminder,next:nextHealthReminderOccurrence(reminder,now)}));
    const active=rows.filter(row=>row.reminder.status==="active").sort((left,right)=>(left.next?.getTime()??Number.MAX_SAFE_INTEGER)-(right.next?.getTime()??Number.MAX_SAFE_INTEGER));
    const paused=rows.filter(row=>row.reminder.status==="paused").sort((left,right)=>left.reminder.title.localeCompare(right.reminder.title,"pt-BR"));
    return{now,active,paused,next:active[0]??null};
  },[reminders]);
  const activeCount = presentation.active.length;

  return (
    <main className="min-h-screen bg-void px-4 pb-28 pt-6 text-ink-primary">
      <header className="mx-auto flex max-w-xl items-center gap-3">
        <button onClick={() => router.replace(backTarget)} className="flex h-11 w-11 items-center justify-center rounded-xl border border-surface-border bg-surface" aria-label="Voltar">
          <ArrowLeft size={20} />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-2xl font-bold">Lembretes de saúde</h1>
          <p className="text-sm text-ink-muted">{isLoading ? "Carregando sua rotina…" : `${activeCount} ativo(s) · ${reminders.length} no total`}</p>
        </div>
        <button type="button" onClick={() => { reset(); setFormOpen(true); }} className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-400 text-void" aria-label="Criar lembrete"><Plus size={20} /></button>
      </header>

      {/* VAULT_REMINDER_INTENT_UX_V67 */}
      <section className="mx-auto mt-5 max-w-xl overflow-hidden rounded-[24px] border border-amber-400/15 bg-gradient-to-br from-amber-400/[0.07] via-surface to-surface">
        <div className="flex items-center gap-3 p-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-amber-400/20 bg-amber-400/[0.08] text-amber-300"><CalendarClock size={20}/></div>
          <div className="min-w-0 flex-1"><p className="text-[9px] font-bold uppercase tracking-[0.18em] text-amber-300">Próximo lembrete</p><h2 className="mt-0.5 truncate text-sm font-bold">{presentation.next?.reminder.title||"Sua rotina está livre"}</h2><p className="mt-0.5 text-[11px] text-ink-muted">{presentation.next?nextLabel(presentation.next.next,presentation.now):"Crie apenas lembretes úteis para você"}</p></div>
          <span className="shrink-0 rounded-lg border border-surface-border bg-void/45 px-2 py-1 text-[9px] font-semibold text-ink-muted">{activeCount} ativo{activeCount===1?"":"s"}</span>
        </div>
        {presentation.next&&<button type="button" onClick={()=>router.push(preserveReturn(presentation.next!.reminder.target_route))} className="flex min-h-11 w-full items-center justify-between border-t border-amber-400/10 px-4 text-xs font-semibold text-amber-200"><span>Abrir destino do próximo lembrete</span><ChevronRight size={15}/></button>}
      </section>

      <section className="mx-auto mt-3 max-w-xl rounded-2xl border border-surface-border bg-surface p-3">
        {permission === "unavailable" ? (
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 shrink-0 text-amber-400" size={18} />
            <p className="text-xs leading-relaxed text-ink-muted">No navegador/PWA, o sistema não garante alarmes recorrentes com o Vault fechado. A regra continua sincronizada.</p>
          </div>
        ) : permission === "granted" ? (
          <div className="flex items-center gap-3 text-xs text-emerald-400"><CheckCircle2 size={18} /><span><strong className="block">Avisos autorizados neste aparelho</strong><span className="text-[10px] font-normal text-ink-muted">As regras também permanecem salvas e sincronizadas.</span></span></div>
        ) : (
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-start gap-2"><ShieldCheck className="mt-0.5 shrink-0 text-amber-300" size={18} /><p className="text-xs text-ink-muted">Autorize quando quiser receber os lembretes neste aparelho.</p></div>
            <button disabled={busyId !== null} onClick={() => void enableNotifications()} className="shrink-0 rounded-xl bg-amber-400 px-3 py-2 text-xs font-bold text-void">Permitir</button>
          </div>
        )}
      </section>

      {formOpen && <section className="mx-auto mt-4 max-w-xl rounded-[24px] border border-amber-400/20 bg-surface p-4 shadow-[0_18px_50px_rgba(0,0,0,0.18)]">
        <div className="mb-3 flex items-center justify-between">
          <strong>{editing ? "Editar lembrete" : "Novo lembrete"}</strong>
          <button type="button" onClick={reset} aria-label="Fechar formulário"><X size={18} /></button>
        </div>
        <div className="grid gap-3">
          <fieldset>
            <legend className="text-xs font-medium text-ink-muted">O que deseja lembrar?</legend>
            <div className="mt-2 grid gap-2 sm:grid-cols-3">
              {HEALTH_REMINDER_TARGETS.map((target) => {
                const selected = target.type === targetType;
                return <button type="button" key={target.type} onClick={() => changeTarget(target.type)} className={`min-h-16 rounded-xl border p-2.5 text-left transition-all ${selected ? "border-amber-400 bg-amber-400/10 text-amber-300" : "border-surface-border bg-void text-ink-muted"}`}>
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
            <HealthTimePicker value={time} onChange={setTime} />
          </label>
          <fieldset>
            <legend className="text-xs font-medium text-ink-muted">Frequência</legend>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {([['daily','Todos os dias'],['weekly','Uma vez por semana'],['custom','Dias personalizados']] as const).map(([value,label]) => (
                <button type="button" key={value} onClick={() => { setFrequency(value); setWeekdays([]); }} className={`rounded-xl border px-2 py-3 text-[11px] font-semibold ${frequency === value ? "border-amber-400 bg-amber-400/10 text-amber-300" : "border-surface-border bg-void text-ink-muted"}`}>{label}</button>
              ))}
            </div>
          </fieldset>
          {frequency !== "daily" && (
            <div className="grid grid-cols-7 gap-1">
              {WEEKDAYS.map((label, day) => (
                <button type="button" key={label} onClick={() => toggleDay(day)} className={`rounded-lg py-2 text-[10px] ${weekdays.includes(day) ? "bg-amber-400 text-void" : "bg-void text-ink-muted"}`}>{label}</button>
              ))}
            </div>
          )}
          <button type="button" disabled={busyId !== null || !title.trim() || !time || invalidDays} onClick={() => void save()} className="flex items-center justify-center gap-2 rounded-xl bg-amber-400 p-3 font-semibold text-void disabled:opacity-40">
            {busyId === "form" && <Loader2 size={17} className="animate-spin" />}
            {editing ? "Salvar alterações" : "Criar lembrete"}
          </button>
        </div>
      </section>}

      <section className="mx-auto mt-4 grid max-w-xl gap-2">
        {isLoading && <div className="flex justify-center p-8"><Loader2 className="animate-spin text-amber-300" /></div>}
        {!isLoading && reminders.length === 0 && (
          <button type="button" onClick={() => setFormOpen(true)} className="rounded-3xl border border-dashed border-surface-border p-8 text-center"><Bell className="mx-auto text-ink-faint" /><p className="mt-3 text-sm font-semibold">Nenhum lembrete criado</p><p className="mt-1 text-xs text-ink-muted">Toque para criar apenas o que for útil para sua rotina.</p></button>
        )}
        {presentation.active.map(({reminder,next}) => <ReminderRow key={reminder.id} reminder={reminder} next={nextLabel(next,presentation.now)} busy={busyId===reminder.id} onOpen={()=>router.push(preserveReturn(reminder.target_route))} onEdit={()=>setEditing(reminder)} onPause={()=>void run(reminder.id,()=>pauseReminder(reminder.id,true),"Lembrete pausado")} onDelete={()=>setDeleting(reminder)}/>)}
        {presentation.paused.length>0&&<div className="overflow-hidden rounded-2xl border border-surface-border bg-surface"><button type="button" aria-expanded={showPaused} onClick={()=>setShowPaused(value=>!value)} className="flex min-h-14 w-full items-center gap-3 px-4 text-left"><Pause size={16} className="text-ink-faint"/><span className="min-w-0 flex-1 text-sm font-semibold">Pausados <span className="font-normal text-ink-muted">· {presentation.paused.length}</span></span><ChevronDown size={16} className={`text-ink-muted transition ${showPaused?"rotate-180":""}`}/></button>{showPaused&&<div className="grid gap-2 border-t border-surface-border/60 p-2">{presentation.paused.map(({reminder})=><ReminderRow key={reminder.id} reminder={reminder} next="Pausado" busy={busyId===reminder.id} onOpen={()=>router.push(preserveReturn(reminder.target_route))} onEdit={()=>setEditing(reminder)} onPause={()=>void run(reminder.id,()=>pauseReminder(reminder.id,false),"Lembrete ativado")} onDelete={()=>setDeleting(reminder)}/>)}</div>}</div>}
      </section>

      <section className="mx-auto mt-5 max-w-xl overflow-hidden rounded-3xl border border-surface-border bg-surface">
        <button type="button" onClick={() => setAdvancedOpen((value) => !value)} className="flex w-full items-center gap-3 p-4 text-left" aria-expanded={advancedOpen}>
          <div className="rounded-xl border border-surface-border bg-void p-2 text-ink-muted"><SlidersHorizontal size={17} /></div>
          <div className="min-w-0 flex-1"><p className="text-sm font-semibold">Configurações avançadas</p><p className="mt-0.5 text-[11px] text-ink-muted">Categorias, antecedência e repetição dos avisos</p></div>
          <ChevronDown size={18} className={`text-ink-muted transition-transform ${advancedOpen ? "rotate-180" : ""}`} />
        </button>
        {advancedOpen && <div className="grid gap-3 border-t border-surface-border p-3"><NotificationPreferencesPanel /><NotificationBrainPanel /></div>}
      </section>
      <ConfirmationModal isOpen={Boolean(deleting)} onClose={()=>setDeleting(null)} onConfirm={async()=>{const reminder=deleting;if(!reminder)return;const removed=await run(reminder.id,()=>deleteReminder(reminder.id),"Lembrete excluído");if(removed)setDeleting(null);}} title="Excluir lembrete?" message={deleting?`“${deleting.title}” será removido desta pessoa. Os registros de saúde existentes não serão alterados.`:""} confirmLabel="Excluir lembrete" isLoading={Boolean(deleting&&busyId===deleting.id)}/>
    </main>
  );
}

function ReminderRow({reminder,next,busy,onOpen,onEdit,onPause,onDelete}:{reminder:HealthReminderRule;next:string;busy:boolean;onOpen:()=>void;onEdit:()=>void;onPause:()=>void;onDelete:()=>void}) {
  const paused=reminder.status==="paused";
  return <article className={`overflow-hidden rounded-2xl border bg-surface ${paused?"border-surface-border":"border-amber-400/20"}`}><div className="flex min-h-[66px] items-center gap-3 px-3"><button type="button" onClick={onOpen} className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${paused?"bg-void text-ink-faint":"bg-amber-400/10 text-amber-300"}`} aria-label={`Abrir ${reminder.title}`}><Bell size={17}/></button><button type="button" onClick={onOpen} className="min-w-0 flex-1 py-2 text-left"><span className="block truncate text-sm font-semibold">{reminder.title}</span><span className="mt-0.5 block truncate text-[10px] text-ink-muted">{frequencyLabel(reminder)} · {next}</span></button><strong className={`font-mono text-sm ${paused?"text-ink-faint":"text-amber-200"}`}>{reminder.time}</strong></div><div className="grid grid-cols-3 border-t border-surface-border/55"><button type="button" disabled={busy} onClick={onEdit} className="flex min-h-11 items-center justify-center gap-1.5 text-[10px] font-semibold text-ink-muted"><Pencil size={14}/>Editar</button><button type="button" disabled={busy} onClick={onPause} className="flex min-h-11 items-center justify-center gap-1.5 border-x border-surface-border/55 text-[10px] font-semibold text-ink-muted">{busy?<Loader2 size={14} className="animate-spin"/>:paused?<Play size={14}/>:<Pause size={14}/>} {paused?"Ativar":"Pausar"}</button><button type="button" disabled={busy} onClick={onDelete} className="flex min-h-11 items-center justify-center gap-1.5 text-[10px] font-semibold text-coral"><Trash2 size={14}/>Excluir</button></div></article>;
}
