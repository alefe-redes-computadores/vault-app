'use client';
import Link from 'next/link';
import {useState} from 'react';
import {useLiveQuery} from 'dexie-react-hooks';
import {Activity,ClipboardCheck,Syringe} from 'lucide-react';
import {useAuth} from '@/hooks/useAuth';
import {useActivePersonId} from '@/hooks/useActivePersonId';
import {db} from '@/lib/db';
import {datePtA8} from '@/lib/vaccination-a8/types';
import {activeFactsA9,datePtA9} from '@/lib/clinical-a9/types';
import {withReturnTarget} from '@/lib/navigation/return-context';
/** Reverse navigation uses scoped real IDs, never names or inferred matches. */
export function ClinicalReverseA8A9({kind,recordId,returnTo}:{kind:'professional'|'location';recordId:string;returnTo:string}){
 const [expanded,setExpanded]=useState(false);
 const {user}=useAuth(),{activePersonId}=useActivePersonId(),uid=user?.id||'',pid=activePersonId||'';
 const data=useLiveQuery(async()=>{if(!uid||!pid||!recordId)return [];
  const [v,p,s]=await Promise.all([
   db.vaccination_events_a8.where('[user_id+person_id]').equals([uid,pid]).toArray(),
   db.procedure_events_a9.where('[user_id+person_id]').equals([uid,pid]).toArray(),
   kind==='professional'?db.sensitivity_events_a9.where('[user_id+person_id]').equals([uid,pid]).toArray():Promise.resolve([])]);
  const result:{id:string;label:string;href:string;type:'vaccine'|'procedure'|'sensitivity'}[]=[];
  const currentVaccines=v.filter(row=>!v.some(e=>e.corrects_event_id===row.id)&&!row.deleted_at&&row.effective_kind!=='void');
  for(const e of currentVaccines.filter(e=>e[kind==='professional'?'source_professional_id':'source_location_id']===recordId)){
   result.push({id:e.id,label:'Vacinação · '+datePtA8(e.administered_on||e.planned_on),href:'/saude/vacinas?registro='+encodeURIComponent(e.id),type:'vaccine'});
  }
  for(const e of activeFactsA9(p,uid,pid).filter(e=>e[kind==='professional'?'professional_id':'location_id']===recordId)){
   result.push({id:e.id,label:e.title+' · '+datePtA9(e.performed_on||e.planned_on),href:'/saude/procedimentos?id='+encodeURIComponent(e.id),type:'procedure'});
  }
  if(kind==='professional')for(const e of activeFactsA9(s,uid,pid).filter(e=>e.professional_id===recordId)){
   result.push({id:e.id,label:'Relato: '+e.agent_label+' · '+datePtA9(e.reported_on),href:'/saude/reacoes?id='+encodeURIComponent(e.id),type:'sensitivity'});
  }
  return result;
 },[kind,recordId,uid,pid],[]);
 if(!data?.length)return null;
 return <section className="mt-3 space-y-2 rounded-2xl border border-emerald-300/20 bg-surface/70 p-3"><h3 className="text-sm font-semibold text-ink-primary">Registros clínicos relacionados</h3><p className="text-[11px] text-ink-muted">Vínculos declarados por ID para a pessoa ativa; não são associação presumida.</p><div className="space-y-1">{data.slice(0,expanded?data.length:40).map(row=>{const Icon=row.type==='vaccine'?Syringe:row.type==='procedure'?ClipboardCheck:Activity;return <Link key={row.type+row.id} className="flex min-h-11 min-w-0 items-center gap-2 rounded-xl border border-surface-border px-3 py-2 text-xs text-emerald-200" href={withReturnTarget(row.href,returnTo)}><Icon size={17} className="shrink-0"/><span className="min-w-0 flex-1 break-words">{row.label}</span></Link>;})}</div>{data.length>40&&<button type="button" className="min-h-11 w-full rounded-xl border border-surface-border text-xs text-emerald-200" aria-expanded={expanded} onClick={()=>setExpanded(v=>!v)}>{expanded?'Mostrar menos':'Mostrar todos os '+data.length+' vínculos'}</button>}</section>;
}
