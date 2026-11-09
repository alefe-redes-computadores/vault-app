"use client";
import { useEffect, useState } from "react";
import { BellOff, CalendarClock, ChevronRight, ShieldCheck } from "lucide-react";
import type { BrainV5Alert } from "@/lib/health-intelligence/brain-v5";
import { cancelFollowUpQueueM102P4, followUpQueueKeyM102P4, reviewQueueItemsM102P4, type ReviewQueueItemM102P4 } from "@/lib/health-intelligence/followup-queue-m102p4";
import { followUpKeyM102, parseFollowUpM102 } from "@/lib/health-intelligence/followup-m102";

/** Only local, explicit review preferences already chosen by the user. */
export function BrainReviewInboxM102P4({ userId, contextUserId, personId, alerts, onNavigate }: {
  userId: string;
  contextUserId?: string | null;
  personId: string;
  alerts: readonly BrainV5Alert[];
  onNavigate: (href: string) => void;
}) {
  const [items, setItems] = useState<ReviewQueueItemM102P4[]>([]);
  const [error, setError] = useState<string | null>(null);
  const queueKey = followUpQueueKeyM102P4(userId, personId);
  const legacyKey = followUpKeyM102(userId, personId);
  const valid = Boolean(userId && contextUserId === userId && personId && queueKey && legacyKey);

  useEffect(() => {
    let live = true;
    const refresh = () => {
      if (!live) return;
      if (!valid || !queueKey || !legacyKey) { setItems([]); return; }
      try {
        const next = reviewQueueItemsM102P4({
          raw: localStorage.getItem(queueKey), legacyRaw: localStorage.getItem(legacyKey),
          userId, contextUserId, personId, alerts, now: Date.now(),
        });
        setItems(next);
        setError(null);
      } catch { setItems([]); setError("Não foi possível acessar as revisões locais neste aparelho."); }
    };
    refresh();
    const onReturn = () => { if (document.visibilityState !== "hidden") refresh(); };
    window.addEventListener("focus", onReturn);
    document.addEventListener("visibilitychange", onReturn);
    window.addEventListener("storage", refresh);
    window.addEventListener("vault:m102-followup-changed", refresh);
    return () => {
      live = false;
      window.removeEventListener("focus", onReturn);
      document.removeEventListener("visibilitychange", onReturn);
      window.removeEventListener("storage", refresh);
      window.removeEventListener("vault:m102-followup-changed", refresh);
    };
  }, [valid, queueKey, legacyKey, userId, contextUserId, personId, alerts]);

  if (!valid || (!items.length && !error)) return null;

  const cancel = (item: ReviewQueueItemM102P4) => {
    if (!queueKey || !legacyKey) return;
    try {
      const next = cancelFollowUpQueueM102P4(localStorage.getItem(queueKey), item.alert, Date.now());
      if (!next) throw new Error("Preferência inválida");
      localStorage.setItem(queueKey, next);
      // Do not delete another episode's legacy preference.
      const legacy = parseFollowUpM102(localStorage.getItem(legacyKey), item.alert, Date.now());
      if (legacy) localStorage.removeItem(legacyKey);
      window.dispatchEvent(new Event("vault:m102-followup-changed"));
      setError(null);
    } catch { setError("Não foi possível cancelar. Confira o armazenamento local do aparelho."); }
  };

  return <section aria-label="Minhas revisões do Brain" className="rounded-2xl border border-violet-400/15 bg-surface/60 p-3">
    <div className="flex items-center gap-2 text-xs font-semibold text-ink-primary">
      <CalendarClock size={17} className="text-violet-300" aria-hidden="true"/>
      <span className="flex-1">Minhas revisões escolhidas</span>
      <span className="text-[10px] text-ink-muted">{items.length}</span>
    </div>
    <p className="mt-1 text-[11px] leading-relaxed text-ink-muted">Revisões opcionais deste perfil e deste celular. Não são alarmes do Android, diagnósticos ou novos alertas clínicos.</p>
    {error ? <p role="alert" className="mt-2 text-xs text-amber-300">{error}</p> : null}
    <div className="mt-3 space-y-2">
      {items.map(item => <div key={item.plan.episodeFingerprint} className="rounded-xl border border-surface-border/70 bg-surface-raised/40 p-3">
        <div className="flex items-start gap-2">
          <span className="min-w-0 flex-1">
            <span className={`block text-[10px] font-semibold ${item.due ? "text-amber-200" : "text-violet-200"}`}>
              {item.due ? "Revisão disponível" : "Revisão marcada"}
            </span>
            <span className="mt-1 block text-xs font-medium text-ink-primary">{item.alert.snapshot.titulo}</span>
            <span className="mt-1 block text-[10px] text-ink-muted">{new Date(item.plan.dueAt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</span>
          </span>
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          <button type="button" onClick={() => onNavigate(`/inteligencia/alertas?insight=${encodeURIComponent(item.alert.insight_id)}`)} className="inline-flex min-h-11 items-center gap-1 rounded-xl border border-violet-400/20 px-3 text-xs font-semibold text-violet-200">Ver evidências <ChevronRight size={13}/></button>
          <button type="button" onClick={() => cancel(item)} className="inline-flex min-h-11 items-center gap-1 rounded-xl border border-surface-border px-3 text-xs text-ink-secondary"><BellOff size={13}/>Cancelar revisão</button>
        </div>
      </div>)}
    </div>
    <p className="mt-3 flex items-start gap-1.5 text-[10px] leading-relaxed text-ink-muted"><ShieldCheck size={13} className="shrink-0"/>Preferências locais limitadas a oito episódios. Um alerta resolvido deixa de aparecer aqui; nenhum dado de sintoma é armazenado nesta lista.</p>
  </section>;
}
