"use client";
import { useRef, useState } from "react";
import { CalendarClock, Check, ChevronRight, ClipboardCopy, FileHeart, HeartPulse, Link2, Pill, Stethoscope } from "lucide-react";
import type { buildTreatmentCareDossier } from "@/lib/health-network/care-continuity";

type Dossier = NonNullable<ReturnType<typeof buildTreatmentCareDossier>>;
export function TreatmentVisitBrief({dossier,color,onNavigate}:{dossier:Dossier|null;color:string;onNavigate:(path:string)=>void}) {
  const [copied,setCopied]=useState<"copied"|"unavailable"|null>(null);
  const area=useRef<HTMLTextAreaElement>(null);
  if(!dossier)return null;
  async function copySummary(){
    if(!dossier)return;
    try {
      if(!navigator.clipboard?.writeText)throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(dossier.synopsis);
      setCopied("copied");
    } catch {
      setCopied("unavailable");
      area.current?.focus();area.current?.select();
    }
  }
  const stats=[{label:"Medicamentos",value:dossier.medications.length,Icon:Pill},{label:"Sintomas · 30d",value:dossier.symptoms.length,Icon:HeartPulse},{label:"Consultas",value:dossier.consultations.length,Icon:Stethoscope},{label:"Documentos",value:dossier.documents.length,Icon:FileHeart}];
  return <section aria-label="Preparação clínica do tratamento" className="overflow-hidden rounded-[22px] border border-surface-border bg-surface">
    <div className="flex items-start gap-3 px-4 py-3">
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white/[0.035]" style={{color}}><Link2 size={17}/></span>
      <div className="min-w-0 flex-1"><h3 className="text-sm font-semibold text-ink-primary">Preparar consulta</h3><p className="mt-1 text-[11px] leading-relaxed text-ink-muted">Resumo dos vínculos explícitos deste tratamento. Nada é compartilhado sem sua ação.</p></div>
    </div>
    <div className="grid grid-cols-4 border-y border-surface-border/60 bg-black/10">{stats.map(({label,value,Icon})=><div key={label} className="min-w-0 border-r border-surface-border/60 px-1 py-2 text-center last:border-r-0"><Icon size={14} className="mx-auto text-ink-muted"/><strong className="mt-1 block text-sm text-ink-primary">{value}</strong><span className="block truncate text-[9px] text-ink-muted">{label}</span></div>)}</div>
    <div className="space-y-3 p-3">
      {dossier.upcoming.length>0 && <button type="button" onClick={()=>dossier.upcoming[0].id&&onNavigate(`/saude/consultas/detalhes?id=${encodeURIComponent(dossier.upcoming[0].id)}`)} className="flex min-h-12 w-full items-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-400/[0.045] px-3 text-left text-xs"><CalendarClock size={15} className="text-emerald-300"/><span className="min-w-0 flex-1"><strong className="block text-ink-primary">Próxima consulta vinculada</strong><span className="text-[10px] text-ink-muted">{dossier.upcoming[0].data.split("-").reverse().join("/")} · {dossier.upcoming[0].especialidade}</span></span><ChevronRight size={15} className="text-emerald-300"/></button>}
      <details className="rounded-xl border border-surface-border/70"><summary className="min-h-11 cursor-pointer px-3 py-3 text-xs font-semibold text-ink-primary">Ver resumo do cuidado e evidências</summary><textarea ref={area} readOnly aria-label="Resumo clínico selecionável" value={dossier.synopsis} rows={Math.min(13,Math.max(7,dossier.synopsis.split("\n").length+2))} className="w-full resize-none border-t border-surface-border/60 bg-transparent px-3 py-2 font-mono text-[10px] leading-relaxed text-ink-muted outline-none"/><p className="px-3 pb-2 text-[10px] leading-relaxed text-ink-faint">Vínculo não significa causalidade. Dias sem registro não contam como dias sem sintomas.</p></details>
      <button type="button" onClick={()=>void copySummary()} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-surface-border bg-surface-raised px-3 text-xs font-semibold text-ink-primary focus-visible:outline focus-visible:outline-2" aria-label="Copiar resumo do tratamento para consulta">{copied==="copied"?<Check size={15}/>:<ClipboardCopy size={15}/>} {copied==="copied"?"Resumo copiado":"Copiar resumo para consulta"}</button>
      {copied==="unavailable"&&<p role="status" className="text-[10px] text-amber-300">A cópia automática não foi autorizada. Abra o resumo acima e selecione o texto manualmente.</p>}
      {dossier.pendingLocal>0 && <p className="text-[10px] text-amber-300">{dossier.pendingLocal} registro(s) ainda não marcados como sincronizados. Este resumo usa dados locais.</p>}
    </div>
  </section>;
}
