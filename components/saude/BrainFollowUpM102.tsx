"use client";
import { useEffect, useState } from "react";
import { BellOff, CalendarClock, ClipboardPlus, ShieldCheck } from "lucide-react";
import type { BrainV5Alert } from "@/lib/health-intelligence/brain-v5";
import { createFollowUpM102, followUpKeyM102, followUpStateM102, parseFollowUpM102, type BrainFollowUpPlanM102, type BrainFollowUpDelayM102 } from "@/lib/health-intelligence/followup-m102";
import { cancelFollowUpQueueM102P4, followUpQueueKeyM102P4, selectedFollowUpM102P4, upsertFollowUpQueueM102P4 } from "@/lib/health-intelligence/followup-queue-m102p4";

/** Explicit opt-in only; stores scheduling metadata, never symptoms or doses. */
export function BrainFollowUpM102({ alert, userId, personId, contextUserId, alerts=[], onNavigate }: {
  alert?: BrainV5Alert | null; userId: string; personId: string; contextUserId?: string | null; alerts?: readonly BrainV5Alert[]; onNavigate: (href: string) => void;
}) {
  const [plan, setPlan] = useState<BrainFollowUpPlanM102 | null>(null);
  const [ready, setReady] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const fingerprint = alert ? `${alert.key}:${alert.episode}:${alert.state}` : "";
  const storageKey = followUpKeyM102(userId, personId);
  const queueKey = followUpQueueKeyM102P4(userId, personId);
  const ownerMatches = Boolean(userId && contextUserId === userId);
  useEffect(() => {
    setReady(false);
    if (!alert || !storageKey || !ownerMatches || alert.person_id !== personId || alert.state === "resolved") { setPlan(null); setReady(true); return; }
    try {
      const clock = Date.now();
      const legacy = parseFollowUpM102(localStorage.getItem(storageKey), alert, clock);
      setPlan((queueKey ? selectedFollowUpM102P4(localStorage.getItem(queueKey), alert, clock) : null) ?? legacy);
    }
    catch { setPlan(null); }
    setNow(Date.now());
    setReady(true);
  }, [fingerprint, storageKey, queueKey, ownerMatches, personId]);
  // M102 P3: update the voluntary review only when the user returns to the app.
  // No interval, background task, Android notification or health-record mutation.
  useEffect(() => {
    if (!storageKey || !ownerMatches || !alert || alert.person_id !== personId || alert.state === "resolved") return;
    const refreshOnReturn = () => {
      if (document.visibilityState === "hidden") return;
      const clock = Date.now();
      setNow(clock);
      try {
        const legacy = parseFollowUpM102(localStorage.getItem(storageKey), alert, clock);
        setPlan((queueKey ? selectedFollowUpM102P4(localStorage.getItem(queueKey), alert, clock) : null) ?? legacy);
      }
      catch { setPlan(null); }
    };
    window.addEventListener("focus", refreshOnReturn);
    document.addEventListener("visibilitychange", refreshOnReturn);
    window.addEventListener("storage", refreshOnReturn);
    window.addEventListener("vault:m102-followup-changed", refreshOnReturn);
    return () => {
      window.removeEventListener("focus", refreshOnReturn);
      document.removeEventListener("visibilitychange", refreshOnReturn);
      window.removeEventListener("storage", refreshOnReturn);
      window.removeEventListener("vault:m102-followup-changed", refreshOnReturn);
    };
  }, [fingerprint, storageKey, queueKey, ownerMatches, personId]);
  if (!alert || !storageKey || !queueKey || !ownerMatches || alert.person_id !== personId || alert.state === "resolved") return null;
  function schedule(hours: BrainFollowUpDelayM102) {
    if (!alert || !storageKey || !queueKey || !ownerMatches) return;
    const created = createFollowUpM102(userId, personId, alert, hours, Date.now());
    if (!created) return;
    try {
      const clock = Date.now();
      const queuePayload = upsertFollowUpQueueM102P4({
        raw: localStorage.getItem(queueKey), legacyRaw: localStorage.getItem(storageKey),
        alerts: [...alerts, alert], userId, contextUserId, personId, plan: created, alert, now: clock,
      });
      if (!queuePayload) throw new Error("O vínculo de revisão mudou.");
      localStorage.setItem(queueKey, queuePayload);
      // Keep the v1 slot for older P1 clients. The v2 queue holds all episodes.
      try { localStorage.setItem(storageKey, JSON.stringify(created)); } catch { /* v2 already saved */ }
      setPlan(created); setNow(clock);
      window.dispatchEvent(new Event("vault:m102-followup-changed"));
    }
    catch { /* Storage unavailable: do not pretend this plan was saved. */ setPlan(null); }
  }
  function cancel() {
    if (!storageKey || !queueKey || !alert || !ownerMatches) return;
    try {
      const next = alert ? cancelFollowUpQueueM102P4(localStorage.getItem(queueKey), alert, Date.now()) : null;
      if (!next) throw new Error("Preferência inválida.");
      localStorage.setItem(queueKey, next);
      // V1 belongs to one episode; never wipe a different episode's slot.
      if (alert && parseFollowUpM102(localStorage.getItem(storageKey), alert, Date.now())) localStorage.removeItem(storageKey);
      setPlan(null);
      window.dispatchEvent(new Event("vault:m102-followup-changed"));
    } catch { /* preserve honest status */ }
  }
  const state = followUpStateM102(plan, now);
  return <section aria-label="Revisão opcional do Brain" className="rounded-2xl border border-violet-400/20 bg-violet-400/[.035] p-3.5">
    <div className="flex items-start gap-3">
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-violet-400/10 text-violet-300"><CalendarClock size={17}/></span>
      <div className="min-w-0 flex-1">
        <h3 className="text-xs font-semibold text-ink-primary">Revisar este contexto depois</h3>
        <p className="mt-1 text-[11px] leading-relaxed text-ink-muted">{alert.snapshot.titulo}. A revisão é voluntária, não altera o alerta nem marca doses.</p>
      </div>
    </div>
    {ready && state === "off" ? <div className="mt-3 flex flex-wrap gap-2">
      <button type="button" onClick={() => schedule(24)} className="min-h-11 rounded-xl border border-violet-400/20 bg-violet-400/10 px-3 text-xs font-semibold text-violet-200">Revisar em 24h</button>
      <button type="button" onClick={() => schedule(48)} className="min-h-11 rounded-xl border border-surface-border px-3 text-xs text-ink-secondary">Revisar em 48h</button>
    </div> : null}
    {ready && plan && state !== "off" ? <div className="mt-3 rounded-xl border border-surface-border/70 bg-surface/50 p-3">
      <p className="text-xs font-semibold text-ink-primary">{state === "due" ? "Já pode revisar" : "Revisão escolhida"}</p>
      <p className="mt-1 text-[11px] text-ink-muted">{new Date(plan.dueAt).toLocaleString("pt-BR", {dateStyle:"short",timeStyle:"short"})} · apenas neste aparelho e ao abrir o VAULT.</p>
      <button type="button" onClick={cancel} className="mt-2 inline-flex min-h-11 items-center gap-1.5 px-2 text-xs text-ink-muted"><BellOff size={14}/>Cancelar preferência</button>
    </div> : null}
    <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
      <button type="button" onClick={() => onNavigate("/saude/registros/novo?preset=humor")} className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-400/[.06] px-3 text-xs text-emerald-200"><ClipboardPlus size={15}/>Registrar como me sinto</button>
      <button type="button" onClick={() => onNavigate(`/inteligencia/alertas?insight=${encodeURIComponent(alert.insight_id)}`)} className="min-h-11 rounded-xl border border-surface-border px-3 text-xs text-ink-secondary">Ver evidências do Brain</button>
    </div>
    <p className="mt-3 flex items-start gap-1.5 text-[10px] leading-relaxed text-ink-muted"><ShieldCheck size={13} className="mt-0.5 shrink-0"/>Essa preferência salva apenas a data e um identificador técnico local, sem sintomas, lembrete do Android ou envio para familiares. Não substitui cuidado médico e não adia alertas importantes.</p>
  </section>;
}
