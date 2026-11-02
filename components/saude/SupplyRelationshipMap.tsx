"use client";
import Link from "next/link";
import { ChevronRight, FileHeart, Network, PackageCheck, Pill, Stethoscope, Truck } from "lucide-react";
import { MedicationFormatIcon } from "@/components/saude/MedicationFormatIcon";
import type { SupplyRelationshipMapProjection } from "@/lib/health-supply/relationship-map";

const node="flex min-h-12 min-w-0 items-center gap-2 rounded-xl border border-surface-border/60 bg-surface-raised px-3 py-2 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-300";
export function SupplyRelationshipMap({value}:{value:SupplyRelationshipMapProjection}) {
  const relationCount=value.treatments.length+value.medications.length+value.documents.length+value.withdrawals.length;
  return <section aria-label="Mapa relacional bidirecional do fornecimento" className="rounded-2xl border border-violet-300/15 bg-violet-300/[.025] p-3">
    <div className="flex items-start gap-2.5"><span className="grid size-9 shrink-0 place-items-center rounded-xl bg-violet-300/10 text-violet-200"><Network size={17}/></span><span className="min-w-0 flex-1"><strong className="block text-xs text-ink-primary">Mapa relacional</strong><span className="mt-0.5 block text-[10px] leading-snug text-ink-muted">Tratamentos, medicamentos, processo e evidências permanecem navegáveis nos dois sentidos.</span></span><span className="rounded-full border border-violet-300/20 px-2 py-1 font-mono text-[9px] text-violet-200">{relationCount}</span></div>
    <div className="mt-3 grid grid-cols-1 gap-2 min-[580px]:grid-cols-[1fr_auto_1fr]">
      <div className="space-y-2"><p className="text-[9px] font-bold uppercase tracking-wider text-ink-faint">Cuidado vinculado</p>
        {value.treatments.map(item=><Link key={item.id} href={`/saude/tratamentos/detalhes?id=${encodeURIComponent(item.id)}`} className={node}><Stethoscope size={16} className="shrink-0 text-violet-200"/><span className="min-w-0 flex-1"><strong className="block break-words text-xs text-ink-primary">{item.name}</strong><span className="text-[9px] text-ink-muted">{item.status==="ativo"?"Em andamento":"Histórico"}</span></span><ChevronRight size={14}/></Link>)}
        {value.medications.map(item=><Link key={item.id} href={`/saude/medicamentos/detalhes?id=${encodeURIComponent(item.id)}`} className={node}><MedicationFormatIcon formato={item.format} cores={item.colors} size={22}/><span className="min-w-0 flex-1"><strong className="block break-words text-xs text-ink-primary">{item.name}</strong><span className="text-[9px] text-ink-muted">{item.dosage}</span></span><ChevronRight size={14}/></Link>)}
        {!value.treatments.length&&!value.medications.length?<p className="rounded-xl border border-dashed border-surface-border p-3 text-[10px] text-ink-muted">Nenhum tratamento ou medicamento disponível neste vínculo.</p>:null}
      </div>
      <div className="hidden items-center text-violet-300 min-[580px]:flex" aria-hidden="true"><ChevronRight size={18}/></div>
      <div className="space-y-2"><p className="text-[9px] font-bold uppercase tracking-wider text-ink-faint">Processo e evidências</p>
        <div className="rounded-xl border border-emerald-300/20 bg-emerald-300/[.04] p-3"><div className="flex items-center gap-2"><PackageCheck size={16} className="text-emerald-200"/><strong className="min-w-0 flex-1 break-words text-xs text-ink-primary">{value.process.title}</strong></div><p className="mt-1 text-[9px] text-ink-muted">{value.process.origin} · {value.process.status==="ativo"?"em andamento":"histórico"}</p></div>
        <div className="grid grid-cols-3 gap-1.5 text-center"><span className="rounded-lg bg-surface-raised p-2 text-[9px] text-ink-muted"><Truck size={14} className="mx-auto mb-1 text-emerald-200"/>{value.cycles.total} ciclos</span><span className="rounded-lg bg-surface-raised p-2 text-[9px] text-ink-muted"><FileHeart size={14} className="mx-auto mb-1 text-violet-200"/>{value.documents.length} docs</span><span className="rounded-lg bg-surface-raised p-2 text-[9px] text-ink-muted"><Pill size={14} className="mx-auto mb-1 text-amber-200"/>{value.withdrawals.length} retiradas</span></div>
        <div className="flex flex-wrap gap-1.5">{value.documents.slice(0,3).map(item=><Link key={item.id} href={`/saude/documentos/detalhes?id=${encodeURIComponent(item.id)}`} className="rounded-lg border border-violet-300/15 bg-violet-300/[.04] px-2 py-1.5 text-[9px] text-violet-200">{item.title} ›</Link>)}{value.withdrawals.slice(0,2).map(item=><Link key={item.id} href={`/saude/retiradas/detalhes?id=${encodeURIComponent(item.id)}`} className="rounded-lg border border-amber-300/15 bg-amber-300/[.04] px-2 py-1.5 text-[9px] text-amber-200">{item.name} ›</Link>)}</div>
      </div>
    </div>
    <p className="mt-3 text-[9px] leading-relaxed text-ink-faint">Vínculo organiza navegação. Processo, documento, compra e retirada mantêm autoridades independentes e não comprovam realização uns dos outros.</p>
  </section>;
}
