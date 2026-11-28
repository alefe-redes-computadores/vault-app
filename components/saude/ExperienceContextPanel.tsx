"use client";

import Link from "next/link";
import { Activity, CalendarDays, ChevronDown, ChevronRight, ClipboardList, HeartPulse, Pill, Wallet } from "lucide-react";
import { useExperienceContext } from "@/contexts/HealthIntelligenceContext";
import { withReturnTarget } from "@/lib/navigation/return-context";
import { TreatmentIdentityIconR03 } from "./TreatmentIdentityR03";

const appearance = {
  rotina: [Pill,"text-teal-300"],
  agenda: [CalendarDays,"text-sky-300"],
  tratamento: [HeartPulse,"text-emerald-300"],
  reabilitação: [Activity,"text-teal-300"],
  monitoramento: [HeartPulse,"text-rose-300"],
  registros: [ClipboardList,"text-amber-200"],
  acesso: [Wallet,"text-violet-300"],
} as const;

export function ExperienceContextPanel({day, origin, onNavigate}: {
  day?: string;
  origin: string;
  onNavigate?: (href: string) => void;
}) {
  const entries = useExperienceContext(day);
  if (!entries) return null;
  const current = entries.filter(item => item.state !== "histórico");
  const historical = entries.filter(item => item.state === "histórico");

  const render = (item: typeof entries[number]) => {
    const [Icon, tone] = appearance[item.category];
    return <li key={item.key}>
      <Link href={withReturnTarget(item.href, origin)}
        onClick={event => {
          if (!onNavigate || event.defaultPrevented || event.button !== 0 ||
              event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
          event.preventDefault();
          onNavigate(item.href);
        }}
        className="flex min-h-12 min-w-0 items-center gap-2 rounded-xl border border-surface-border/60 px-2.5 py-2 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-ice">
        {item.entityId ? <TreatmentIdentityIconR03 entity={{id:item.entityId}} size={17} className="shrink-0"/> :
          <Icon size={17} className={`shrink-0 ${tone}`} aria-hidden="true"/>}
        <span className="min-w-0 flex-1 break-words">
          <span className={`block text-[11px] font-semibold ${tone}`}>{item.category} · {item.state}</span>
          <strong className="block text-xs text-ink-primary">{item.label}</strong>
          <span className="block text-[11px] text-ink-muted">{item.provenance}</span>
        </span>
        <ChevronRight size={16} className="shrink-0 text-ink-muted" aria-hidden="true"/>
      </Link>
    </li>;
  };

  const categories = [...new Set(current.map(item => item.category))];
  return <details className="group/context rounded-[20px] border border-surface-border/65 bg-surface/55 p-2.5">
    <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-lg px-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ice">
      <ClipboardList size={19} className="shrink-0 text-sky-300" aria-hidden="true"/>
      <span className="min-w-0 flex-1">
        <strong className="block text-sm text-ink-primary">Contexto do cuidado</strong>
        <span className="block break-words text-xs text-ink-muted">
          {categories.length ? categories.join(" · ") : "Nenhum contexto atual no recorte"}
        </span>
      </span>
      <ChevronDown size={17} className="shrink-0 text-ink-muted group-open/context:rotate-180" aria-hidden="true"/>
    </summary>
    {current.length > 0 && <ul aria-label="Contextos atuais e previstos" className="mt-2 grid gap-1.5">{current.slice(0,3).map(render)}</ul>}
    {current.length > 3 && <details className="mt-2">
      <summary className="min-h-11 cursor-pointer py-2 text-xs font-semibold text-ink-secondary">Mais contextos ({current.length - 3})</summary>
      <ul className="grid gap-1.5">{current.slice(3).map(render)}</ul>
    </details>}
    {historical.length > 0 && <details className="mt-2">
      <summary className="min-h-11 cursor-pointer py-2 text-xs font-semibold text-ink-secondary">Histórico do recorte ({historical.length})</summary>
      <ul className="grid gap-1.5">{historical.map(render)}</ul>
    </details>}
    {!entries.length && <p className="p-2 text-xs text-ink-muted">Os dados disponíveis são insuficientes para destacar algo neste dia.</p>}
  </details>;
}
