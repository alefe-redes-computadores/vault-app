"use client";

import {
  Activity, CalendarDays, CheckCircle2, ChevronRight, ClipboardList,
  FileWarning, FlaskConical, Package, Pill, Stethoscope,
} from "lucide-react";

export type HomeContextKind360 = "consulta" | "exame" | "careflow" | "dose" |
  "receita" | "retirada" | "estoque" | "agenda" | "rotina" | "outro";

type Props = {
  title: string;
  description: string;
  eyebrow: string;
  onAction: () => void;
  urgent: boolean;
  kind?: HomeContextKind360;
};

/**
 * UI360 R4: superfície contextual única. A autoridade de prioridade/destino
 * continua em app/page.tsx; este componente só apresenta e navega.
 * Não existe CTA secundária, acordeão, inferência clínica ou ação de escrita.
 */
export function HomeActionNowCardP7R3({
  title, description, eyebrow, onAction, urgent, kind = "outro",
}: Props) {
  const styles = urgent || kind === "receita" ? {
    border: "border-rose-300/20", background: "from-rose-300/[.075] via-surface/30 to-transparent",
    ink: "text-rose-300", badge: "bg-rose-300/10 border-rose-300/15",
  } : kind === "consulta" || kind === "exame" || kind === "careflow" || kind === "agenda" ? {
    border: "border-sky-300/20", background: "from-sky-300/[.055] via-surface/25 to-transparent",
    ink: "text-sky-300", badge: "bg-sky-300/10 border-sky-300/15",
  } : kind === "estoque" || kind === "retirada" ? {
    border: "border-amber-300/20", background: "from-amber-300/[.055] via-surface/25 to-transparent",
    ink: "text-amber-300", badge: "bg-amber-300/10 border-amber-300/15",
  } : kind === "dose" || kind === "rotina" ? {
    border: "border-emerald-300/20", background: "from-emerald-300/[.055] via-surface/25 to-transparent",
    ink: "text-emerald-300", badge: "bg-emerald-300/10 border-emerald-300/15",
  } : {
    border: "border-surface-border/40", background: "from-slate-300/[.04] via-surface/25 to-transparent",
    ink: "text-ink-secondary", badge: "bg-surface/40 border-surface-border/45",
  };

  const Icon = kind === "consulta" ? Stethoscope
    : kind === "exame" ? FlaskConical
    : kind === "careflow" ? Activity
    : kind === "dose" ? Pill
    : kind === "receita" ? FileWarning
    : kind === "retirada" ? ClipboardList
    : kind === "estoque" ? Package
    : kind === "agenda" ? CalendarDays
    : kind === "rotina" ? CheckCircle2 : Activity;

  return (
    <button type="button" id="home-acao-contextual" data-vault-ui360-r2-action
      data-vault-ui360-r4-context-kind={kind}
      onClick={onAction}
      aria-label={`${eyebrow}. ${title}. ${description}. Abrir ação correspondente.`}
      className={`group flex min-h-[88px] w-full items-center gap-3 border-b bg-gradient-to-r px-3.5 py-3 text-left transition-colors active:bg-surface-raised/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ice ${styles.border} ${styles.background}`}>
      <div className="min-w-0 flex-1">
        <p className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[.11em] ${styles.ink}`}>
          <Icon size={13} aria-hidden="true"/>{eyebrow}
        </p>
        <h2 className="mt-1 break-words font-display text-[15px] font-bold leading-tight text-ink-primary">{title}</h2>
        {description.trim() && <p className="mt-1 line-clamp-2 break-words text-[11px] leading-snug text-ink-secondary">{description}</p>}
      </div>
      <span aria-hidden="true" className={`grid size-10 shrink-0 place-items-center rounded-[14px] border ${styles.badge} ${styles.ink}`}>
        <Icon size={20}/>
      </span>
      <ChevronRight size={15} className="shrink-0 text-ink-muted transition-transform group-active:translate-x-0.5" aria-hidden="true"/>
    </button>
  );
}
