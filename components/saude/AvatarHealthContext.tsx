import Link from 'next/link';
import { Brain } from 'lucide-react';
import type { HealthInsight } from '@/lib/health-insights';
import { compareHealthPriority, healthPriorityPresentation } from '@/lib/health-intelligence/priority';
export function AvatarHealthContext({insights,weightChange}:{insights:HealthInsight[];weightChange:number|null}) {
 const current=[...insights].sort(compareHealthPriority)[0];
 return <div className="mt-3 space-y-2">
  {current?<Link href={current.link?.startsWith('/') && !current.link.startsWith('//') ? current.link : '/inteligencia/alertas'} className={`flex min-h-11 items-center gap-3 rounded-2xl border p-3 ${healthPriorityPresentation(current).tone}`}><Brain size={20} className="shrink-0"/><span className="min-w-0"><span className="block text-[10px] font-semibold">{healthPriorityPresentation(current).label} · Vault Insight</span><span className="mt-1 block text-xs">{current.titulo}</span><span className="mt-1 block text-[10px] opacity-80">Abrir contexto e evidências</span></span></Link>:null}
  {weightChange!==null&&Number.isFinite(weightChange)?<p className="rounded-xl border border-surface-border px-3 py-2 text-[11px] text-ink-muted">Peso registrado: {weightChange>0?'+':''}{weightChange.toLocaleString('pt-BR')} kg entre os dois últimos registros. A variação não determina composição corporal ou diagnóstico.</p>:null}
 </div>;
}
