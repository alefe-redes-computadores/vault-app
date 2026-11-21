'use client';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLiveQuery } from 'dexie-react-hooks';
import { ArrowUpRight, Check, GitBranch, Link2, Loader2, ShieldCheck, Trash2 } from 'lucide-react';
import { db } from '@/lib/db';
import { useAuth } from '@/hooks/useAuth';
import { useActivePersonId } from '@/hooks/useActivePersonId';
import { HealthRelationPicker } from '@/components/saude/HealthRelationPicker';
import { linkSurgeryConsultationM4P2, unlinkSurgeryConsultationM4P2,
 SURGERY_CONSULTATION_ROLES_M4P2,type SurgeryConsultationRoleM4P2 } from '@/lib/clinical-journey-m4/surgery-links-p2';

type Props={surgeryId?:string;consultationId?:string};
const prettyDay=(s:string)=>/^\d{4}-\d{2}-\d{2}/.test(s)?`${s.slice(8,10)}/${s.slice(5,7)}/${s.slice(0,4)}`:s;
/** Link explícito entre entidades preexistentes. Não cria consulta, cirurgia ou hipótese clínica. */
export function SurgeryConsultationLinksM4P2({surgeryId,consultationId}:Props){
 const router=useRouter();const {user}=useAuth();const {activePersonId}=useActivePersonId();
 const uid=user?.id||'',pid=activePersonId||'';
 const [selected,setSelected]=useState('');const [role,setRole]=useState<SurgeryConsultationRoleM4P2>('preoperative');
 const [busy,setBusy]=useState(false);const [message,setMessage]=useState('');
 const [error,setError]=useState('');
 const data=useLiveQuery(async()=>{
  if(!uid||!pid||(!surgeryId&&!consultationId))return null;
  const [surgeries,consultations,links]=await Promise.all([
   db.cirurgias.where('person_id').equals(pid).toArray(),
   db.consultas.where('person_id').equals(pid).toArray(),
   db.surgery_consultation_links_m4.where('person_id').equals(pid).toArray()]);
  const ownS=surgeries.filter(x=>x.id&&x.user_id===uid&&x.person_id===pid);
  const ownC=consultations.filter(x=>x.id&&x.user_id===uid&&x.person_id===pid);
  const sids=new Set(ownS.map(x=>x.id));const cids=new Set(ownC.map(x=>x.id));
  if(surgeryId&&!sids.has(surgeryId))return null;
  if(consultationId&&!cids.has(consultationId))return null;
  return {surgeries:ownS,consultations:ownC,links:links.filter(x=>!x.deleted_at&&x.user_id===uid&&x.person_id===pid&&sids.has(x.cirurgia_id)&&cids.has(x.consulta_id)&&(!surgeryId||x.cirurgia_id===surgeryId)&&(!consultationId||x.consulta_id===consultationId))};
 },[uid,pid,surgeryId,consultationId]);
 const candidates=useMemo(()=>data?.consultations??[],[data?.consultations]);
 if(!surgeryId&&!consultationId)return null;
 if(!data)return null;
 const submit=async()=>{
  if(!surgeryId||!selected||busy||!pid)return;
  setBusy(true);setError('');setMessage('');
  try{await linkSurgeryConsultationM4P2({personId:pid,cirurgiaId:surgeryId,consultaId:selected,role});
   setSelected('');setMessage('Vínculo explícito salvo localmente. A sincronização seguirá a fila protegida.');}
  catch(e){setError(e instanceof Error?e.message:'Não foi possível vincular.');}
  finally{setBusy(false);}
 };
 const unlink=async(id:string)=>{
  if(busy||!pid)return;setBusy(true);setError('');setMessage('');
  try{await unlinkSurgeryConsultationM4P2({personId:pid,id});setMessage('Vínculo removido do planejamento, com histórico preservado.');}
  catch(e){setError(e instanceof Error?e.message:'Não foi possível desvincular.');}
  finally{setBusy(false);}
 };
 return <section aria-label="Vínculos explícitos entre cirurgia e consultas" className="min-w-0 rounded-[24px] border border-sky-300/20 bg-surface p-4 shadow-sm sm:p-5">
   <div className="flex items-start gap-2.5"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-sky-300/10 text-sky-300"><GitBranch size={19}/></span>
    <div className="min-w-0 flex-1"><h2 className="text-sm font-bold text-ink-primary">Consultas vinculadas à cirurgia</h2>
    <p className="mt-1 text-[11px] leading-relaxed text-ink-muted">A ligação é declarada por você. Uma consulta da mesma data ou especialidade não vira automaticamente um atendimento pré-operatório.</p></div></div>
   <div className="mt-3 space-y-2">
    {data.links.length===0?<p className="rounded-xl bg-surface-raised/70 px-3 py-3 text-xs text-ink-muted">Nenhum vínculo confirmado. O VAULT preserva os cadastros originais.</p>:data.links.map(link=>{
     const surgery=data.surgeries.find(x=>x.id===link.cirurgia_id);
     const consultation=data.consultations.find(x=>x.id===link.consulta_id);
     if(!surgery||!consultation)return null;
     const label=SURGERY_CONSULTATION_ROLES_M4P2.find(x=>x.id===link.role)?.label||'Consulta relacionada';
     return <div key={link.id} className="rounded-2xl border border-surface-border/60 bg-surface-raised/70 px-3 py-3">
       <div className="flex min-w-0 items-start gap-2"><Check size={16} className="mt-0.5 shrink-0 text-emerald-300"/>
        <div className="min-w-0 flex-1"><p className="text-xs font-bold text-ink-primary">{label}</p>
        <p className="mt-1 break-words text-[11px] text-ink-secondary">{prettyDay(consultation.data)} · {consultation.especialidade||consultation.medico||'Consulta'} · {surgery.procedimento}</p>
        <p className="mt-1 text-[10px] text-ink-muted">{link.synced?'Sincronizado':'Aguardando sincronização'} · Vínculo por IDs</p></div></div>
       <div className="mt-2 flex flex-wrap gap-2"><button type="button" onClick={()=>router.push(`/saude/consultas/detalhes?id=${encodeURIComponent(link.consulta_id)}`)} className="inline-flex min-h-10 items-center gap-1 rounded-xl border border-sky-300/25 px-3 text-[11px] font-semibold text-sky-300">Abrir consulta <ArrowUpRight size={13}/></button>
       <button type="button" onClick={()=>router.push(`/saude/cirurgias/detalhes?id=${encodeURIComponent(link.cirurgia_id)}`)} className="inline-flex min-h-10 items-center gap-1 rounded-xl border border-surface-border px-3 text-[11px] text-ink-secondary">Abrir cirurgia</button>
       {surgeryId&&<button type="button" disabled={busy} onClick={()=>void unlink(link.id)} className="ml-auto inline-flex min-h-10 items-center gap-1 rounded-xl border border-coral/25 px-3 text-[11px] text-coral disabled:opacity-50" aria-label={`Desvincular ${label}`}><Trash2 size={14}/>Desvincular</button>}</div>
     </div>;
    })}
   </div>
   {surgeryId&&<div className="mt-4 rounded-2xl border border-sky-300/15 bg-void/25 p-3">
    <p className="text-xs font-bold text-ink-primary">Vincular consulta existente</p>
    <div className="mt-2"><HealthRelationPicker value={selected} onValueChange={setSelected} title="Selecione a consulta cadastrada" className="w-full min-h-12 rounded-xl border border-surface-border bg-surface-raised px-3 text-xs text-ink-primary">
      <option value="">Escolher uma consulta da pessoa ativa…</option>
      {candidates.map(c=><option key={c.id} value={c.id}>{prettyDay(c.data)} · {c.especialidade||c.medico||'Consulta'} · {c.status}</option>)}
    </HealthRelationPicker></div>
    <div role="group" aria-label="Natureza declarada do vínculo" className="mt-2 grid grid-cols-2 gap-2">{SURGERY_CONSULTATION_ROLES_M4P2.map(x=><button key={x.id} type="button" aria-pressed={role===x.id} onClick={()=>setRole(x.id)} className={`min-h-11 rounded-xl border px-2 py-2 text-[11px] font-semibold ${role===x.id?'border-sky-300/50 bg-sky-300/10 text-sky-200':'border-surface-border bg-surface-raised text-ink-secondary'}`}>{x.label}</button>)}</div>
    <button type="button" disabled={!selected||busy} onClick={()=>void submit()} className="mt-3 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-sky-300 px-3 text-xs font-bold text-void disabled:opacity-40">{busy?<Loader2 size={16} className="animate-spin"/>:<Link2 size={16}/>} Confirmar vínculo</button>
   </div>}
   {error&&<p role="alert" className="mt-2 text-xs text-coral">{error}</p>}
   {message&&<p role="status" className="mt-2 text-xs text-emerald-300">{message}</p>}
   <p className="mt-3 flex items-start gap-2 text-[10px] leading-relaxed text-ink-muted"><ShieldCheck size={15} className="shrink-0"/>Desvincular não exclui consultas, cirurgias, exames, laudos ou doses. Nenhuma informação é enviada a profissionais automaticamente.</p>
 </section>;
}
