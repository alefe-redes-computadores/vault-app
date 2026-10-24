"use client";
import { useMemo } from 'react';
import Link from 'next/link';
import { Brain, ChevronRight, MapPin, Scale } from 'lucide-react';
import type { HealthInsight } from '@/lib/health-insights';
import type { AvatarWeightComparison } from '@/lib/health-profile/avatar-readings';
import { healthPriorityPresentation } from '@/lib/health-intelligence/priority';
import { avatarInsightContext } from '@/lib/health-profile/avatar-context';
import { buildAvatarAttentionMap } from '@/lib/health-profile/avatar-attention-map';
export function AvatarHealthContext({insights,weightChange=null,weightComparison,loading=false,error=null,onViewWeight}:{
 insights:HealthInsight[];weightChange?:number|null;weightComparison?:AvatarWeightComparison|null;
 loading?:boolean;error?:string|null;onViewWeight?:()=>void;
}) {
 const context=useMemo(()=>avatarInsightContext(insights),[insights]),attentionMap=useMemo(()=>buildAvatarAttentionMap(insights),[insights]),current=context.primary;
 const render=(item:HealthInsight)=>{const presentation=healthPriorityPresentation(item);return <Link key={item.id} href={`/inteligencia/alertas?insight=${encodeURIComponent(item.id)}`} className={`flex min-h-11 items-center gap-3 rounded-2xl border p-3 ${presentation.tone}`}><Brain size={20} className="shrink-0"/><span className="min-w-0 flex-1"><span className="block text-[10px] font-semibold">{presentation.label} · Vault Insight</span><span className="mt-1 block text-xs font-semibold">{item.titulo}</span><span className="mt-1 block text-[10px] opacity-80">Amostra: {item.amostra} · abrir evidências</span></span><ChevronRight size={16} className="shrink-0"/></Link>};
 const delta=weightComparison?.delta??weightChange;
 const date=(value:string)=>value.split('-').reverse().join('/');
 const weightText=delta!==null&&Number.isFinite(delta)?<>
   <span className="block">Variação do peso: {delta>0?'+':''}{delta.toLocaleString('pt-BR')} kg{weightComparison?` · ${date(weightComparison.previous.data)} a ${date(weightComparison.current.data)}`:' entre os dois últimos registros'}</span>
   <span className="mt-1 block text-[10px]">A variação não determina composição corporal ou diagnóstico.</span>
 </>:null;
 return <div className="mt-3 space-y-2" aria-label="Contexto do Brain no avatar" aria-busy={loading}>
  {loading?<p role="status" className="rounded-2xl border border-surface-border p-3 text-xs text-ink-muted">Atualizando contexto do Brain…</p>:
    error?<p role="status" className="rounded-2xl border border-amber-400/25 p-3 text-xs text-amber-300">O contexto do Brain não carregou. Os registros continuam disponíveis; tente abrir a tela novamente.</p>:
    current?render(current):<p className="rounded-2xl border border-surface-border p-3 text-xs text-ink-muted">Nenhum insight disponível neste contexto. Isso não confirma ausência de problemas de saúde.</p>}
  {!loading&&!error&&context.items.length>1&&<details className="rounded-2xl border border-surface-border p-3"><summary className="min-h-11 cursor-pointer py-2 text-xs text-ink-muted">Outros contextos do Brain ({context.count-1})</summary><div className="space-y-2">{context.items.slice(1).map(render)}<Link href="/inteligencia/alertas" className="block min-h-11 py-3 text-xs text-violet-300">Abrir central completa ›</Link></div></details>}
  {!loading&&!error&&attentionMap.length>0&&<div className="rounded-2xl border border-emerald-300/15 bg-emerald-300/[.03] p-3" aria-label="Mapa discreto do contexto corporal"><p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-emerald-300"><MapPin size={13}/>Contexto por região</p><p className="mt-1 text-[9px] text-ink-muted">Atalhos dos registros, sem marcar diagnóstico no personagem.</p><div className="mt-2 flex flex-wrap gap-2">{attentionMap.map(item=><Link key={`${item.region}:${item.insight.id}`} href={`/inteligencia/alertas?insight=${encodeURIComponent(item.insight.id)}`} className="min-h-9 rounded-full border border-surface-border bg-surface-raised px-3 py-2 text-[10px] text-ink-primary">{item.label}</Link>)}</div></div>}
  {weightText?onViewWeight?<button type="button" onClick={onViewWeight} aria-label="Ver registros da variação de peso" className="flex min-h-11 w-full items-center gap-2 rounded-xl border border-surface-border px-3 py-2 text-left text-[11px] text-ink-muted"><Scale size={16} className="shrink-0"/><span className="flex-1">{weightText}</span><ChevronRight size={14}/></button>:<p className="flex gap-2 rounded-xl border border-surface-border px-3 py-2 text-[11px] text-ink-muted"><Scale size={16} className="shrink-0"/><span>{weightText}</span></p>:null}
 </div>;
}
