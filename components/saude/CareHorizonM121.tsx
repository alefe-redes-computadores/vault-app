"use client";
import { useMemo, useState } from "react";
import { CalendarClock, ChevronRight, ClipboardCheck, ShieldCheck, TriangleAlert } from "lucide-react";
import type { HealthInsightContext } from "@/lib/health-insights";
import type { CareCommandSnapshot } from "@/lib/health-intelligence/care-command";
import { buildCareHorizonM121, type HorizonDaysM121, type HorizonItemM121 } from "@/lib/health-intelligence/care-horizon-m121";

type Props = {context: HealthInsightContext | null; command: CareCommandSnapshot | null | undefined;
  userId: string; personId: string; today: string; onNavigate: (href:string)=>void};
function HorizonLink({ item, onNavigate }: {item:HorizonItemM121;onNavigate:(href:string)=>void}) {
  return <li className="rounded-xl border border-surface-border/60 bg-surface/70 p-3">
    <div className="flex items-start gap-2"><span className="min-w-0 flex-1"><strong className="block text-xs text-ink-primary">{item.title}</strong>
      <span className="mt-1 block text-[11px] leading-relaxed text-ink-muted">{item.description}</span>
      {item.date && <span className="mt-1 block font-mono text-[10px] text-emerald-300">{item.date.split("-").reverse().join("/")}</span>}
      <span className="mt-1 block text-[10px] text-ink-faint">{item.caution}</span></span>
      <button type="button" onClick={()=>onNavigate(item.href)} aria-label={`Conferir origem: ${item.title}`} className="grid size-11 shrink-0 place-items-center rounded-xl border border-emerald-300/25 text-emerald-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-300"><ChevronRight size={17}/></button></div>
    {item.evidence.length>0 && <details className="mt-2"><summary className="min-h-10 cursor-pointer text-[10px] font-semibold text-ink-muted">Ver evidências registradas</summary><ul className="list-disc space-y-1 pl-5 text-[10px] leading-relaxed text-ink-faint">{item.evidence.slice(0,5).map((note,i)=><li key={`${item.key}:${i}`}>{note}</li>)}</ul></details>}
  </li>;
}
/** Usa o mesmo snapshot do Brain, sem consulta própria ou movimentação clínica. */
export function CareHorizonM121({context,command,userId,personId,today,onNavigate}:Props) {
  const [days,setDays]=useState<HorizonDaysM121>(14);
  const result=useMemo(()=>buildCareHorizonM121(context,command,userId,personId,today),[context,command,userId,personId,today]);
  const due=result.upcoming.filter(item=>item.date && (new Date(`${item.date}T12:00:00Z`).getTime()-new Date(`${today}T12:00:00Z`).getTime())/86400000<=days);
  const items=[...result.overdue,...due].slice(0,8);
  return <details className="group rounded-[20px] border border-cyan-300/20 bg-cyan-300/[0.03] p-3" aria-label="Horizonte da continuidade do cuidado">
    <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300">
      <CalendarClock size={18} className="shrink-0 text-cyan-300"/><span className="min-w-0 flex-1"><strong className="block text-sm text-ink-primary">Horizonte de continuidade</strong><span className="mt-0.5 block text-[10px] text-ink-muted">Estoque, receitas, retiradas e documentos · sem confirmar eventos</span></span><ChevronRight size={16} className="shrink-0 text-cyan-300 transition group-open:rotate-90"/>
    </summary>
    <div className="mt-3 space-y-3 border-t border-surface-border/50 pt-3">
      {result.state==="unavailable"?<p role="status" className="text-xs text-ink-muted">Aguardando identidade e dados da pessoa selecionada.</p>:<>
        <div className="grid grid-cols-3 gap-2" aria-label="Escolher horizonte em dias">{([7,14,30] as const).map(n=><button type="button" key={n} onClick={()=>setDays(n)} aria-pressed={days===n} className={`min-h-12 rounded-xl border px-1 text-xs font-semibold ${days===n?"border-cyan-300/60 bg-cyan-300/10 text-cyan-200":"border-surface-border text-ink-muted"}`}>{n} dias <span className="block text-[10px] font-normal">{result.windows[n].count} eventos</span></button>)}</div>
        <p className="text-[11px] text-ink-muted"><strong className="text-ink-primary">{result.windows[days].scheduled} próximos</strong> · {result.windows[days].overdue} anteriores pendentes · {result.unknownStock} estoques sem quantidade informada</p>
        {items.length?<ul className="space-y-2">{items.map(item=><HorizonLink key={item.key} item={item} onNavigate={onNavigate}/>)}</ul>:<p className="rounded-xl border border-surface-border/50 p-3 text-xs text-ink-muted">Nenhum compromisso datado identificado neste horizonte. Isso não confirma que não existam necessidades de cuidado.</p>}
        {(result.undated.length>0 || result.documents.length>0) && <details className="rounded-xl border border-amber-300/20 p-2.5"><summary className="flex min-h-11 cursor-pointer items-center gap-2 text-xs text-amber-200"><TriangleAlert size={15}/>Conferir dados sem prazo e documentos · {result.undated.length+result.documents.length}</summary><ul className="space-y-2 pt-2">{[...result.undated,...result.documents].slice(0,9).map(item=><HorizonLink key={item.key} item={item} onNavigate={onNavigate}/>)}</ul></details>}
        <p className="flex gap-2 text-[10px] leading-relaxed text-ink-faint"><ShieldCheck size={14} className="shrink-0"/>{result.note}</p>
        <button type="button" onClick={()=>onNavigate("/saude/relatorios")} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-cyan-300/25 text-xs font-semibold text-cyan-200"><ClipboardCheck size={16}/>Preparar consulta com os registros</button>
      </>}
    </div>
  </details>;
}
