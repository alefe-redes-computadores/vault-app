'use client';
import Link from 'next/link';
import {useLiveQuery} from 'dexie-react-hooks';
import {Activity,ChevronRight} from 'lucide-react';
import {useAuth} from '@/hooks/useAuth';
import {useActivePersonId} from '@/hooks/useActivePersonId';
import {db} from '@/lib/db';
import {activeFactsA9,datePtA9,A9_SENSITIVITY_LABEL} from '@/lib/clinical-a9/types';
import {withReturnTarget} from '@/lib/navigation/return-context';
/** Factual reverse links only: no inferred adverse reaction or diagnosis. */
export function ClinicalReverseSensitivityA9({recordType,recordId,returnTo}:{recordType:'medication'|'vaccination_event'|'procedure_event';recordId:string;returnTo:string}){
 const {user}=useAuth(),{activePersonId}=useActivePersonId(),uid=user?.id||'',pid=activePersonId||'';
 const rows=useLiveQuery(async()=>{if(!uid||!pid||!recordId)return [];
  const scoped=await db.sensitivity_events_a9.where('[user_id+person_id]').equals([uid,pid]).toArray();
  return activeFactsA9(scoped,uid,pid).filter(e=>e.related_type===recordType&&e.related_id===recordId);
 },[uid,pid,recordType,recordId],[]);
 if(!rows?.length)return null;
 return <aside className="mt-3 min-w-0 space-y-2 rounded-xl border border-teal-300/20 bg-surface/70 p-3" aria-label="Relatos relacionados explicitamente">
  <h4 className="flex items-center gap-2 text-xs font-semibold text-ink-primary"><Activity size={17} className="text-teal-300"/>Relatos relacionados por ID</h4>
  <p className="text-[11px] text-ink-muted">Vínculo informado, não comprova reação adversa ou causalidade.</p>
  {rows.map(e=><Link key={e.id} className="flex min-h-11 min-w-0 items-center gap-2 rounded-lg border border-surface-border px-3 py-2 text-xs text-emerald-200" href={withReturnTarget('/saude/reacoes?id='+encodeURIComponent(e.id),returnTo)}><span className="min-w-0 flex-1 break-words">{A9_SENSITIVITY_LABEL[e.sensitivity_type]} · {e.agent_label} · {datePtA9(e.reported_on)}</span><ChevronRight size={15} className="shrink-0"/></Link>)}
 </aside>;
}
