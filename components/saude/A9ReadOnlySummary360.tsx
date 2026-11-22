'use client';
import Link from 'next/link';
import {useLiveQuery} from 'dexie-react-hooks';
import {Activity,CalendarDays,ClipboardCheck} from 'lucide-react';
import {useAuth} from '@/hooks/useAuth';
import {useActivePersonId} from '@/hooks/useActivePersonId';
import {db} from '@/lib/db';
import {activeFactsA9,datePtA9,A9_PROCEDURE_LABEL} from '@/lib/clinical-a9/types';
import {withReturnTarget} from '@/lib/navigation/return-context';
/** Read-only A9 projection: displays facts only. No inferred reactions or diagnoses. */
export function A9ReadOnlySummary360({context}:{context:'home'|'today'|'careflow'}){
 const {user}=useAuth(),{activePersonId}=useActivePersonId(),uid=user?.id||'',pid=activePersonId||'';
 const facts=useLiveQuery(async()=>{if(!uid||!pid)return{procedures:[],sensitivities:[]};
  const [p,s]=await Promise.all([db.procedure_events_a9.where('[user_id+person_id]').equals([uid,pid]).toArray(),db.sensitivity_events_a9.where('[user_id+person_id]').equals([uid,pid]).toArray()]);return{procedures:activeFactsA9(p,uid,pid),sensitivities:activeFactsA9(s,uid,pid)};
 },[uid,pid]);
 if(!facts||(!facts.procedures.length&&!facts.sensitivities.length))return null;
 const origin=context==='careflow'?'/saude/careflow':context==='today'?'/hoje':'/';
 const planned=facts.procedures.filter(e=>e.effective_status==='planned').slice(0,2);
 return <section className="min-w-0 space-y-2 rounded-2xl border border-teal-300/20 bg-surface p-3" aria-label="Procedimentos e relatos declarados">
  <div className="flex min-w-0 items-center gap-2"><ClipboardCheck size={18} className="shrink-0 text-teal-300"/><h2 className="min-w-0 flex-1 text-sm font-semibold text-ink-primary">Procedimentos e relatos</h2><span className="text-[10px] text-ink-muted">A9 · leitura</span></div>
  {planned.map(e=><Link key={e.id} className="flex min-h-11 items-center gap-2 rounded-xl border border-surface-border px-3 text-xs text-ink-secondary" href={withReturnTarget('/saude/procedimentos?id='+encodeURIComponent(e.id),origin)}><CalendarDays size={16} className="shrink-0 text-teal-300"/><span className="min-w-0 flex-1 break-words">{e.title} · {datePtA9(e.planned_on)} · {A9_PROCEDURE_LABEL[e.effective_status]}</span></Link>)}
  <div className="grid grid-cols-2 gap-2"><Link className="flex min-h-11 items-center gap-2 rounded-xl border border-surface-border p-2 text-xs text-emerald-200" href={withReturnTarget('/saude/procedimentos',origin)}><ClipboardCheck size={16}/>{facts.procedures.length} procedimento(s)</Link><Link className="flex min-h-11 items-center gap-2 rounded-xl border border-surface-border p-2 text-xs text-emerald-200" href={withReturnTarget('/saude/reacoes',origin)}><Activity size={16}/>{facts.sensitivities.length} relato(s)</Link></div>
  <p className="text-[11px] leading-relaxed text-ink-muted">Registros declarados; nenhuma causalidade ou conclusão clínica automática.</p>
 </section>;
}
