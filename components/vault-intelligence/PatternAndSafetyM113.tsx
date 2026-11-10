"use client";
/** M113: leitura sem escrita clínica, sem interpretar texto privado ou risco individual. */
import { ArrowRight, BookHeart, CalendarDays, HeartHandshake, NotebookPen, ShieldCheck, TrendingUp } from "lucide-react";
import type { M113Timeline } from "@/lib/health-intelligence/pattern-timeline-m113";

export function PatternAndSafetyM113({timeline,onOpen}: {timeline:M113Timeline|null;onOpen:(href:string)=>void}) {
  return <section aria-label="Padrões registrados e proteção humana" className="mx-auto mt-3 max-w-2xl overflow-hidden rounded-[22px] border border-violet-300/20 bg-surface">
    <div className="flex items-start gap-3 p-4">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-violet-300/20 bg-violet-300/10 text-violet-300"><BookHeart size={20}/></span>
      <div className="min-w-0 flex-1"><p className="text-[9px] font-bold uppercase tracking-[.16em] text-violet-300">Brain V5.3 · Expressão e continuidade</p><h2 className="mt-1 text-sm font-bold text-ink-primary">Meus registros, minha história</h2><p className="mt-1 text-[11px] leading-relaxed text-ink-muted">Organização temporal para conversar com pessoas e profissionais de confiança, sem diagnóstico nem previsão de crises.</p></div>
    </div>
    <div className="grid grid-cols-2 gap-2 px-4 pb-3">
      <button type="button" onClick={()=>onOpen("/saude/diario")} className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-violet-300/25 bg-violet-300/[.07] px-2 text-xs font-bold text-violet-200"><NotebookPen size={16}/> Diário para terapia</button>
      <button type="button" onClick={()=>onOpen("/saude/plano-seguranca")} className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-rose-300/25 bg-rose-300/[.06] px-2 text-xs font-bold text-rose-200"><HeartHandshake size={16}/> Plano de segurança</button>
    </div>
    {timeline&&<details className="border-t border-surface-border/60 px-4 py-3">
      <summary className="flex min-h-10 cursor-pointer list-none items-center gap-2 text-xs font-semibold text-ink-secondary"><CalendarDays size={16} className="text-violet-200"/> Linha do tempo física e emocional <span className="ml-auto text-[10px] font-normal text-ink-muted">{timeline.recordedDays} dia(s) documentados <ArrowRight size={13} className="inline"/></span></summary>
      {timeline.trends.length>0&&<div className="mt-2 space-y-2">{timeline.trends.map(item=><p key={item.key} className="flex items-start gap-2 rounded-xl border border-amber-300/15 bg-amber-300/[.035] p-2.5 text-[11px] text-ink-muted"><TrendingUp size={15} className="mt-0.5 shrink-0 text-amber-200"/><span><strong className="text-ink-secondary">{item.label}:</strong> intensidade relatada {item.previous}/10 → {item.recent}/10, em {item.previousDays} e {item.recentDays} dias, respectivamente. Comparação descritiva; não determina risco.</span></p>)}</div>}
      {timeline.events.length? <ol className="mt-2 max-h-72 space-y-2 overflow-y-auto">{timeline.events.slice(0,20).map(event=><li key={event.key} className="flex gap-2 rounded-xl bg-surface-raised/50 p-2.5 text-[11px]"><span className="shrink-0 font-mono text-ink-faint">{event.date.split("-").reverse().slice(0,2).join("/")}</span><span className="min-w-0 text-ink-secondary"><span className="block">{event.label}</span><span className="mt-0.5 block text-[9px] text-ink-muted">{event.nature==="reported_state"?"Relatado pela pessoa":event.nature==="planned_not_completed"?"Compromisso planejado":"Ação registrada"}</span></span></li>)}</ol>:<p className="mt-2 text-xs text-ink-muted">Ainda não há eventos elegíveis nessa janela. Isso não indica ausência de sintomas.</p>}
      <p className="mt-3 text-[10px] leading-relaxed text-ink-faint">Datas dos próprios registros. Associação temporal não comprova causa ou efeito. Nada é gravado no Brain ao abrir este painel.</p>
    </details>}
    <div className="flex items-start gap-2 border-t border-surface-border/60 px-4 py-3 text-[10px] leading-relaxed text-ink-faint"><ShieldCheck size={15} className="shrink-0 text-violet-300"/><span>Seu plano pessoal não é lido por esta central. Para urgência médica ou perigo imediato, use o atendimento de emergência (SAMU 192).</span></div>
  </section>;
}
