"use client";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, ChevronRight, ClipboardList, HelpCircle } from "lucide-react";
import type { CareReadinessPortfolio, CareReadinessState } from "@/lib/health-intelligence/care-readiness";

const meta: Record<CareReadinessState, { label: string; tone: string; icon: typeof CheckCircle2 }> = {
  overdue: { label: "Decidir", tone: "text-rose-300 bg-rose-300/10", icon: AlertTriangle },
  prepare: { label: "Preparar", tone: "text-amber-300 bg-amber-300/10", icon: ClipboardList },
  unknown: { label: "Definir", tone: "text-cyan-300 bg-cyan-300/10", icon: HelpCircle },
  ready: { label: "Organizado", tone: "text-emerald-300 bg-emerald-300/10", icon: CheckCircle2 },
};

export function CareReadinessSummary({ portfolio, limit = 6 }: { portfolio: CareReadinessPortfolio; limit?: number }) {
  if (!portfolio.items.length) return null;
  return <section className="rounded-[24px] border border-emerald-300/15 bg-gradient-to-br from-emerald-300/[.045] to-surface p-4 print:border-gray-300 print:bg-white" aria-label="Prontidão da linha de cuidado">
    <div className="flex items-start justify-between gap-3"><div><h2 className="text-sm font-semibold text-ink-primary print:text-black">Próximas etapas por rota</h2><p className="mt-1 text-[10px] text-ink-muted">Receita, compra e SUS continuam eventos independentes.</p></div><span className="rounded-full border border-surface-border px-2 py-1 font-mono text-[8px] text-ink-muted">{portfolio.items.length} medicamento(s)</span></div>
    <div className="mt-3 grid grid-cols-4 gap-1.5">{(["overdue","prepare","unknown","ready"] as CareReadinessState[]).map(key=><div key={key} className="rounded-xl border border-surface-border/60 bg-surface-raised p-2 text-center"><strong className="block text-sm">{portfolio.counts[key]}</strong><span className="text-[7px] uppercase text-ink-faint">{meta[key].label}</span></div>)}</div>
    <div className="mt-3 divide-y divide-surface-border/50">{portfolio.items.slice(0, limit).map(item=>{const row=meta[item.state],Icon=row.icon;return <Link key={item.medicationId} href={item.href} className="flex min-h-14 items-center gap-3 py-2.5"><span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${row.tone}`}><Icon size={16}/></span><span className="min-w-0 flex-1"><strong className="block text-xs text-ink-primary">{item.medicationName}</strong><span className="mt-0.5 block text-[9px] text-ink-muted">{item.headline} · {item.route.labels.join(" + ") || "rota não informada"}</span>{item.missing.length>0&&<span className="mt-0.5 block text-[8px] text-amber-300">Falta: {item.missing.join("; ")}</span>}</span><ChevronRight size={14} className="shrink-0 text-ink-faint"/></Link>})}</div>
    <p className="mt-2 text-[9px] leading-relaxed text-ink-faint">{portfolio.note}</p>
  </section>;
}
