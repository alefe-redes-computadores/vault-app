"use client";
import Link from "next/link";
import { useState } from "react";
import { AlertTriangle, CheckCircle2, ChevronRight, ClipboardList, HelpCircle } from "lucide-react";
import type { CareReadinessPortfolio, CareReadinessState } from "@/lib/health-intelligence/care-readiness";
import { matchesCareSearch } from "@/lib/health-intelligence/operational-triage";

const meta: Record<CareReadinessState, { label: string; tone: string; icon: typeof CheckCircle2 }> = {
  overdue: { label: "Decidir", tone: "text-rose-300 bg-rose-300/10", icon: AlertTriangle },
  prepare: { label: "Preparar", tone: "text-amber-300 bg-amber-300/10", icon: ClipboardList },
  unknown: { label: "Definir", tone: "text-cyan-300 bg-cyan-300/10", icon: HelpCircle },
  ready: { label: "Organizado", tone: "text-emerald-300 bg-emerald-300/10", icon: CheckCircle2 },
};

export function CareReadinessSummary({ portfolio, limit = 6 }: { portfolio: CareReadinessPortfolio; limit?: number }) {
  const [showAll, setShowAll] = useState(false);
  const [scope, setScope] = useState<CareReadinessState | "all">("all");
  const [query, setQuery] = useState("");
  if (!portfolio.items.length) return null;
  const visibleLimit = Math.max(1, limit);
  const matching = portfolio.items.filter(item => (scope === "all" || item.state === scope) && matchesCareSearch(query,item.medicationName,item.headline,item.route.labels.join(" "),...item.missing));
  const remaining = Math.max(0, matching.length - visibleLimit);
  const visible = showAll ? matching : matching.slice(0, visibleLimit);
  return <section className="rounded-[24px] border border-emerald-300/15 bg-gradient-to-br from-emerald-300/[.045] to-surface p-4 print:border-gray-300 print:bg-white" aria-label="Prontidão da linha de cuidado">
    <div className="flex items-start justify-between gap-3"><div><h2 className="text-sm font-semibold text-ink-primary print:text-black">Próximas etapas por rota</h2><p className="mt-1 text-[10px] text-ink-muted">Receita, compra e SUS continuam eventos independentes.</p></div><span className="rounded-full border border-surface-border px-2 py-1 font-mono text-[8px] text-ink-muted">{portfolio.items.length} medicamento(s)</span></div>
    <div className="mt-3 grid grid-cols-4 gap-1.5">{(["overdue","prepare","unknown","ready"] as CareReadinessState[]).map(key=><div key={key} className="rounded-xl border border-surface-border/60 bg-surface-raised p-2 text-center"><strong className="block text-sm">{portfolio.counts[key]}</strong><span className="text-[7px] uppercase text-ink-faint">{meta[key].label}</span></div>)}</div>
    <div className="mt-3 flex flex-wrap gap-1.5" role="group" aria-label="Filtrar prontidão">
      {(["all","overdue","prepare","unknown","ready"] as const).map(key=><button key={key} type="button" aria-pressed={scope===key} onClick={()=>{setScope(key);setShowAll(false);}} className={`min-h-10 rounded-xl border px-2.5 text-[10px] font-semibold ${scope===key?"border-emerald-300/50 bg-emerald-300/10 text-emerald-200":"border-surface-border/70 text-ink-muted"}`}>{key==="all"?`Todos · ${portfolio.items.length}`:`${meta[key].label} · ${portfolio.counts[key]}`}</button>)}
    </div>
    <label htmlFor="vault-care-readiness-search" className="sr-only">Buscar medicamento ou etapa de cuidado</label>
    <input id="vault-care-readiness-search" type="search" value={query} onChange={event=>{setQuery(event.target.value);setShowAll(false);}} placeholder="Buscar medicamento, rota ou pendência" className="mt-2 min-h-11 w-full rounded-xl border border-surface-border/70 bg-surface-raised px-3 text-xs text-ink-primary outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"/>
    <p role="status" className="mt-2 text-[9px] text-ink-faint">{matching.length} de {portfolio.items.length} medicamento(s) na seleção. Totais acima são gerais.</p>
    {matching.length===0?<p className="mt-2 rounded-xl bg-surface-raised p-3 text-xs text-ink-muted">Sem resultados nesta seleção. Altere o filtro ou a busca.</p>:null}
    <div className="mt-3 divide-y divide-surface-border/50">{visible.map(item=>{const row=meta[item.state],Icon=row.icon;return <Link key={item.medicationId} href={item.href} className="flex min-h-14 items-center gap-3 rounded-lg py-2.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-300"><span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${row.tone}`}><Icon size={16}/></span><span className="min-w-0 flex-1"><strong className="block text-xs text-ink-primary">{item.medicationName}</strong><span className="mt-0.5 block text-[9px] text-ink-muted">{item.headline} · {item.route.labels.join(" + ") || "rota não informada"}</span>{item.missing.length>0&&<span className="mt-0.5 block text-[8px] text-amber-300">Falta: {item.missing.join("; ")}</span>}</span><ChevronRight size={14} className="shrink-0 text-ink-faint"/></Link>})}</div>
    {remaining > 0 && <button type="button" aria-expanded={showAll} onClick={() => setShowAll(value => !value)} className="mt-3 min-h-11 w-full rounded-xl border border-emerald-300/20 bg-emerald-300/[.035] px-3 text-xs font-semibold text-emerald-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-300">{showAll ? "Mostrar menos etapas" : `Ver todos os ${matching.length} medicamentos nesta seleção (+${remaining})`}</button>}
    <p className="mt-2 text-[9px] leading-relaxed text-ink-faint">{portfolio.note}</p>
  </section>;
}
