"use client";
import Link from "next/link";
import { BookOpenCheck, ChevronRight, ShieldQuestion } from "lucide-react";
import type { MedicationSafetyCoverage as Coverage } from "@/lib/health-intelligence/medication-safety-coverage";

export function MedicationSafetyCoverage({ coverage, compact = false }: { coverage: Coverage; compact?: boolean }) {
  if (!coverage.total) return null;
  return <section aria-label="Cobertura das regras de segurança" className="rounded-[20px] border border-cyan-300/15 bg-cyan-300/[.035] p-3.5">
    <div className="flex items-start gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cyan-300/10 text-cyan-300">{coverage.audited ? <BookOpenCheck size={17}/> : <ShieldQuestion size={17}/>}</span><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-2"><h2 className="text-xs font-bold text-ink-primary">Cobertura farmacológica auditada</h2>{coverage.coveragePercent!==null&&<span className="font-mono text-[9px] text-cyan-200">{coverage.coveragePercent}%</span>}</div><p className="mt-1 text-[9px] leading-relaxed text-ink-muted">{coverage.audited} com regra auditada · {coverage.identifiedOnly} apenas identificado(s) · {coverage.unmapped} sem mapeamento.</p></div></div>
    {!compact&&<><div className="mt-3 space-y-1.5">{coverage.items.slice(0,6).map(item=><Link key={item.medicationId} href={`/saude/medicamentos/detalhes?id=${encodeURIComponent(item.medicationId)}`} className="flex min-h-10 items-center gap-2 rounded-xl border border-surface-border/60 bg-surface/60 px-3 py-2"><span className={`h-2 w-2 rounded-full ${item.state==="audited_rule"?"bg-emerald-300":item.state==="identified_only"?"bg-amber-300":"bg-slate-400"}`}/><span className="min-w-0 flex-1 truncate text-[10px] text-ink-primary">{item.name}</span><span className="text-[8px] uppercase text-ink-faint">{item.state==="audited_rule"?`${item.ruleIds.length} regra(s)`:item.state==="identified_only"?"sem regra fechada":"revisar identidade"}</span><ChevronRight size={12} className="text-ink-faint"/></Link>)}</div><p className="mt-2 text-[8px] leading-relaxed text-ink-faint">{coverage.note}</p></>}
  </section>;
}
