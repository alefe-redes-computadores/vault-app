"use client";
import Link from "next/link";
import { useState } from "react";
import { BookOpenCheck, ChevronRight, ShieldQuestion } from "lucide-react";
import type { MedicationSafetyCoverage as Coverage } from "@/lib/health-intelligence/medication-safety-coverage";
import { matchesCareSearch } from "@/lib/health-intelligence/operational-triage";

export function MedicationSafetyCoverage({ coverage, compact = false }: { coverage: Coverage; compact?: boolean }) {
  const [showAll, setShowAll] = useState(false);
  const [scope,setScope]=useState<"all"|"audited_rule"|"identified_only"|"unmapped">("all");
  const [query,setQuery]=useState("");
  const matching=coverage.items.filter(item=>(scope==="all"||item.state===scope)&&matchesCareSearch(query,item.name));
  if (!coverage.total) return null;
  return <section aria-label="Cobertura das regras de segurança" className="rounded-[20px] border border-cyan-300/15 bg-cyan-300/[.035] p-3.5">
    <div className="flex items-start gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cyan-300/10 text-cyan-300">{coverage.audited ? <BookOpenCheck size={17}/> : <ShieldQuestion size={17}/>}</span><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-2"><h2 className="text-xs font-bold text-ink-primary">Cobertura farmacológica auditada</h2>{coverage.coveragePercent!==null&&<span className="font-mono text-[9px] text-cyan-200">{coverage.coveragePercent}%</span>}</div><p className="mt-1 text-[9px] leading-relaxed text-ink-muted">{coverage.audited} com regra auditada · {coverage.identifiedOnly} apenas identificado(s) · {coverage.unmapped} sem mapeamento.</p></div></div>
    {!compact&&<><div className="mt-3 flex flex-wrap gap-1.5" role="group" aria-label="Filtrar cobertura farmacológica">{(["all","audited_rule","identified_only","unmapped"] as const).map(key=><button key={key} type="button" aria-pressed={scope===key} onClick={()=>{setScope(key);setShowAll(false);}} className={`min-h-10 rounded-lg border px-2 text-[10px] ${scope===key?"border-cyan-300/50 text-cyan-200":"border-surface-border text-ink-muted"}`}>{key==="all"?"Todos":key==="audited_rule"?"Regras auditadas":key==="identified_only"?"Só identificados":"Sem mapeamento"}</button>)}</div>
    <label htmlFor="vault-safety-coverage-search" className="sr-only">Buscar medicamento na cobertura de segurança</label><input id="vault-safety-coverage-search" type="search" value={query} onChange={event=>{setQuery(event.target.value);setShowAll(false);}} placeholder="Buscar medicamento" className="mt-2 min-h-11 w-full rounded-xl border border-surface-border bg-surface-raised px-3 text-xs text-ink-primary"/>
    <p role="status" className="mt-2 text-[9px] text-ink-faint">{matching.length} de {coverage.items.length} medicamento(s). Cobertura não equivale à ausência de riscos.</p>
    {!matching.length?<p className="mt-2 text-xs text-ink-muted">Nenhum medicamento nesta seleção.</p>:null}
    <div className="mt-3 space-y-1.5">{matching.slice(0,showAll ? undefined : 6).map(item=><Link key={item.medicationId} href={`/saude/medicamentos/detalhes?id=${encodeURIComponent(item.medicationId)}`} className="flex min-h-10 items-center gap-2 rounded-xl border border-surface-border/60 bg-surface/60 px-3 py-2"><span className={`h-2 w-2 rounded-full ${item.state==="audited_rule"?"bg-emerald-300":item.state==="identified_only"?"bg-amber-300":"bg-slate-400"}`}/><span className="min-w-0 flex-1 truncate text-[10px] text-ink-primary">{item.name}</span><span className="text-[8px] uppercase text-ink-faint">{item.state==="audited_rule"?`${item.ruleIds.length} regra(s)`:item.state==="identified_only"?"sem regra fechada":"revisar identidade"}</span><ChevronRight size={12} className="text-ink-faint"/></Link>)}</div>{matching.length > 6 && <button type="button" aria-expanded={showAll} onClick={() => setShowAll(value => !value)} className="mt-2 min-h-11 w-full rounded-xl border border-cyan-300/20 px-3 text-xs font-semibold text-cyan-200">{showAll ? "Mostrar menos medicamentos" : `Ver todos os ${matching.length} medicamentos nesta seleção`}</button>}<p className="mt-2 text-[8px] leading-relaxed text-ink-faint">{coverage.note}</p></>}
  </section>;
}
