"use client";
import Link from "next/link";
import { useState } from "react";
import { CheckCircle2, ChevronRight, CircleHelp, FileCheck2, FileWarning } from "lucide-react";
import type { CareDocumentReadinessPortfolio, CareDocumentStatus } from "@/lib/health-intelligence/care-document-readiness";
import { matchesCareSearch } from "@/lib/health-intelligence/operational-triage";

const meta: Record<CareDocumentStatus, { label: string; tone: string; icon: typeof CheckCircle2 }> = {
  available: { label: "Disponível", tone: "text-emerald-300 bg-emerald-300/10", icon: CheckCircle2 },
  missing: { label: "Falta explícita", tone: "text-amber-300 bg-amber-300/10", icon: FileWarning },
  not_informed: { label: "Não informado", tone: "text-cyan-300 bg-cyan-300/10", icon: CircleHelp },
  not_required: { label: "Não se aplica", tone: "text-ink-muted bg-white/[.04]", icon: FileCheck2 },
};

export function CareDocumentReadiness({ portfolio, limit = 5 }: { portfolio: CareDocumentReadinessPortfolio; limit?: number }) {
  const [showAll, setShowAll] = useState(false);
  const [scope,setScope] = useState<CareDocumentStatus|"all">("all");
  const [query,setQuery] = useState("");
  if (!portfolio.items.length) return null;
  const ordered = [...portfolio.items].sort((a, b) => Number(b.requirements.some(row => row.status === "missing")) - Number(a.requirements.some(row => row.status === "missing")) || a.medicationName.localeCompare(b.medicationName, "pt-BR"));
  const initialLimit = Math.max(1, limit);
  const matching=ordered.filter(item=>(scope==="all"||item.requirements.some(row=>row.status===scope))&&matchesCareSearch(query,item.medicationName,item.routeLabel,...item.requirements.map(row=>row.label+" "+row.detail)));
  const hidden = Math.max(0, matching.length - initialLimit);
  return <section className="rounded-[24px] border border-cyan-300/15 bg-gradient-to-br from-cyan-300/[.04] to-surface p-4 print:border-gray-300 print:bg-white" aria-label="Documentos por finalidade">
    <h2 className="text-sm font-semibold text-ink-primary print:text-black">Documentos por finalidade</h2>
    <p className="mt-1 text-[10px] leading-relaxed text-ink-muted">Receita, documento SUS e comprovante de compra têm papéis diferentes.</p>
    <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">{(["available","missing","not_informed","not_required"] as CareDocumentStatus[]).map(status => <div key={status} className="rounded-xl border border-surface-border/60 bg-surface-raised p-2"><strong className="text-sm">{portfolio.counts[status]}</strong><p className="text-[8px] text-ink-muted">{meta[status].label}</p></div>)}</div>
    <div className="mt-3 flex flex-wrap gap-1.5" role="group" aria-label="Situação documental">{(["all","missing","not_informed","available","not_required"] as const).map(key=><button key={key} type="button" aria-pressed={scope===key} onClick={()=>{setScope(key);setShowAll(false);}} className={`min-h-10 rounded-xl border px-2.5 text-[10px] font-semibold ${scope===key?"border-cyan-300/40 bg-cyan-300/10 text-cyan-200":"border-surface-border text-ink-muted"}`}>{key==="all"?"Todos":meta[key].label}</button>)}</div>
    <label htmlFor="vault-care-documents-search" className="sr-only">Buscar documentos e medicamentos</label><input id="vault-care-documents-search" type="search" value={query} onChange={event=>{setQuery(event.target.value);setShowAll(false);}} placeholder="Buscar medicamento ou documento" className="mt-2 min-h-11 w-full rounded-xl border border-surface-border bg-surface-raised px-3 text-xs text-ink-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300"/>
    <p role="status" className="mt-2 text-[9px] text-ink-faint">{matching.length} de {ordered.length} medicamento(s) · contagens gerais acima</p>
    {!matching.length?<p className="mt-2 rounded-xl bg-surface-raised p-3 text-xs text-ink-muted">Nenhum documento corresponde à seleção.</p>:null}
    <div className="mt-3 space-y-2">{matching.slice(0, showAll ? undefined : initialLimit).map(item => <Link key={item.medicationId} href={item.href} className="block rounded-2xl border border-surface-border/70 bg-surface-raised p-3">
      <div className="flex items-center gap-2"><strong className="min-w-0 flex-1 truncate text-xs text-ink-primary">{item.medicationName}</strong><span className="text-[8px] text-ink-faint">{item.routeLabel}</span><ChevronRight size={14} className="text-ink-faint"/></div>
      <div className="mt-2 flex flex-wrap gap-1.5">{item.requirements.map(row => { const view=meta[row.status], Icon=view.icon; return <span key={row.lane} title={row.detail} className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[8px] ${view.tone}`}><Icon size={10}/>{row.label}: {view.label}</span>; })}</div>
    </Link>)}</div>
    {hidden > 0 && <button type="button" aria-expanded={showAll} onClick={() => setShowAll(value => !value)} className="mt-3 min-h-11 w-full rounded-xl border border-cyan-300/20 bg-cyan-300/[.06] px-3 text-xs font-semibold text-cyan-200">{showAll ? "Mostrar menos medicamentos" : `Ver todos os documentos de ${matching.length} medicamentos (+${hidden})`}</button>}
    <p className="mt-2 text-[9px] leading-relaxed text-ink-faint">{portfolio.note}</p>
  </section>;
}
