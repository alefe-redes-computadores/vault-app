'use client';
import Link from 'next/link';
import {useLiveQuery} from 'dexie-react-hooks';
import {ClipboardCheck,ChevronRight} from 'lucide-react';
import {useAuth} from '@/hooks/useAuth';
import {useActivePersonId} from '@/hooks/useActivePersonId';
import {db} from '@/lib/db';
import {activeFactsA9,datePtA9,A9_PROCEDURE_LABEL} from '@/lib/clinical-a9/types';
import {withReturnTarget} from '@/lib/navigation/return-context';
export function ClinicalReverseProcedureA9({kind,recordId,returnTo}:{kind:'consultation'|'rehab_session';recordId:string;returnTo:string}){
 const {user}=useAuth(),{activePersonId}=useActivePersonId(),uid=user?.id||'',pid=activePersonId||'';
 const rows=useLiveQuery(async()=>{if(!uid||!pid||!recordId)return [];
  const scoped=await db.procedure_events_a9.where('[user_id+person_id]').equals([uid,pid]).toArray();
  return activeFactsA9(scoped,uid,pid).filter(e=>e[kind==='consultation'?'consultation_id':'rehab_session_id']===recordId);
 },[uid,pid,kind,recordId],[]);
 if(!rows?.length)return null;
 return <aside className="mt-3 space-y-2 rounded-xl border border-teal-300/20 bg-surface/70 p-3" aria-label="Procedimentos vinculados por ID">
  <h4 className="flex items-center gap-2 text-xs font-semibold"><ClipboardCheck size={17} className="text-teal-300"/>Procedimentos não cirúrgicos vinculados</h4>
  {rows.map(e=><Link key={e.id} className="flex min-h-11 min-w-0 items-center gap-2 rounded-xl border border-surface-border px-3 py-2 text-xs text-emerald-200" href={withReturnTarget('/saude/procedimentos?id='+encodeURIComponent(e.id),returnTo)}><span className="min-w-0 flex-1 break-words">{e.title} · {A9_PROCEDURE_LABEL[e.effective_status]} · {datePtA9(e.performed_on||e.planned_on)}</span><ChevronRight size={15}/></Link>)}
  <p className="text-[11px] text-ink-muted">Vínculos declarados com esta pessoa, sem inferência de comparecimento.</p>
 </aside>;
}
