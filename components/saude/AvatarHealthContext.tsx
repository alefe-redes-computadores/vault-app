import Link from 'next/link';
import { Brain, ChevronRight, Scale } from 'lucide-react';
import type { HealthInsight } from '@/lib/health-insights';
import { healthPriorityPresentation } from '@/lib/health-intelligence/priority';
import { avatarInsightContext } from '@/lib/health-profile/avatar-context';
export function AvatarHealthContext({insights,weightChange}:{insights:HealthInsight[];weightChange:number|null}) {
 const context=avatarInsightContext(insights),current=context.primary;
 const render=(item:HealthInsight)=><Link key={item.id} href={`/inteligencia/alertas?insight=${encodeURIComponent(item.id)}`} className={`flex min-h-11 items-center gap-3 rounded-2xl border p-3 ${healthPriorityPresentation(item).tone}`}><Brain size={20} className="shrink-0"/><span className="min-w-0 flex-1"><span className="block text-[10px] font-semibold">{healthPriorityPresentation(item).label} · Vault Insight</span><span className="mt-1 block text-xs font-semibold">{item.titulo}</span><span className="mt-1 block text-[10px] opacity-80">{item.amostra} registro(s) · abrir evidências</span></span><ChevronRight size={16} className="shrink-0"/></Link>;
 return <div className="mt-3 space-y-2" aria-label="Contexto do Brain no avatar">
  {current?render(current):<p className="rounded-2xl border border-surface-border p-3 text-xs text-ink-muted">Nenhum insight disponível neste contexto. Isso não confirma ausência de problemas de saúde.</p>}
  {context.items.length>1&&<details className="rounded-2xl border border-surface-border p-3"><summary className="min-h-11 cursor-pointer py-3 text-xs text-ink-primary">Outros contextos do Brain ({context.count-1})</summary><div className="space-y-2">{context.items.slice(1).map(render)}<Link href="/inteligencia/alertas" className="block min-h-11 py-3 text-xs text-violet-300">Abrir central completa ›</Link></div></details>}
  {weightChange!==null&&Number.isFinite(weightChange)?<p className="flex gap-2 rounded-xl border border-surface-border px-3 py-2 text-[11px] text-ink-muted"><Scale size={16} className="shrink-0"/><span>Peso registrado: {weightChange>0?'+':''}{weightChange.toLocaleString('pt-BR')} kg entre os dois últimos registros. A variação não determina composição corporal ou diagnóstico.</span></p>:null}
 </div>;
}
