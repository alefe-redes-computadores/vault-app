'use client';
/** User-confirmed links enrich the canonical A7 view without copying A9/M5 facts. */
import {useEffect,useMemo,useRef,useState} from 'react';
import Link from 'next/link';
import {useLiveQuery} from 'dexie-react-hooks';
import {ArrowUpRight,ClipboardCheck,FileText,GitBranch,Link2,Plus,Search,ShieldCheck,Unlink2} from 'lucide-react';
import {db} from '@/lib/db';
import {useAuth} from '@/hooks/useAuth';
import {useActivePersonId} from '@/hooks/useActivePersonId';
import {useToast} from '@/components/ToastProvider';
import {useHapticFeedback} from '@/lib/haptics';
import {withReturnTarget} from '@/lib/navigation/return-context';
import {ClinicalRecordFinderA7M5,type RecordChoiceA7M5} from './ClinicalRecordFinderA7M5';
import {activeEvidenceA7M5,STAGE_LABEL_A7M5,TARGET_LABEL_A7M5,type EvidenceTarget,type SurgicalStage,type ContinuitySource} from '@/lib/surgery-continuity-a7m5/types';
import {linkEvidenceToSurgeryA7M5,unlinkEvidenceA7M5} from '@/lib/surgery-continuity-a7m5/repository';
import {contextualActionsA7M5} from '@/lib/surgery-continuity-a7m5/context';
import {activeFactsA9,type A9Procedure} from '@/lib/clinical-a9/types';
const panel='min-w-0 rounded-[22px] border border-surface-border/70 bg-surface p-3.5 shadow-sm';
const TYPES:readonly EvidenceTarget[]=['procedure_event_a9','exam_order','medication','health_record'];
const STAGES:readonly SurgicalStage[]=['pre','procedure','post','return'];
const button='min-h-11 rounded-xl border border-surface-border px-3 py-2 text-xs font-semibold text-ink-secondary';
export function SurgeryEvidencePanelA7M5({surgeryId,operationDocumented=false,returnIds=[],rehabIds=[]}:
 {surgeryId:string;operationDocumented?:boolean;returnIds?:readonly string[];rehabIds?:readonly string[]}){
 const {user}=useAuth(),{activePersonId}=useActivePersonId(),toast=useToast(),{trigger}=useHapticFeedback();
 const uid=user?.id||'',pid=activePersonId||'',scope=`${uid}:${pid}:${surgeryId}`,returnTo='/saude/cirurgias/jornada?id='+encodeURIComponent(surgeryId);
 const [expanded,setExpanded]=useState(false),[form,setForm]=useState(false),[kind,setKind]=useState<EvidenceTarget>('procedure_event_a9');
 const [target,setTarget]=useState(''),[stage,setStage]=useState<SurgicalStage>('post'),[source,setSource]=useState<ContinuitySource>('self_report');
 const [note,setNote]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[unlinkId,setUnlinkId]=useState(''),[reason,setReason]=useState('');
 const inFlight=useRef(false);
 useEffect(()=>{setExpanded(false);setForm(false);setTarget('');setKind('procedure_event_a9');setStage('post');setNote('');setSource('self_report');setBusy(false);setError('');setUnlinkId('');setReason('');},[uid,pid,surgeryId]);
 const data=useLiveQuery(async()=>{
  if(!uid||!pid||!surgeryId)return null;
  const person=await db.persons.get(pid),surgery=await db.cirurgias.get(surgeryId);
  if(person?.user_id!==uid||surgery?.person_id!==pid||surgery?.user_id!==uid)return null;
  const [links,procedures,orders,medications,health]=await Promise.all([
   db.surgery_evidence_links_a7m5.where('[user_id+person_id+surgery_id]').equals([uid,pid,surgeryId]).toArray(),
   db.procedure_events_a9.where('[user_id+person_id]').equals([uid,pid]).toArray(),
   db.exam_orders.where('[user_id+person_id]').equals([uid,pid]).toArray(),
   db.medicamentos.where('[user_id+person_id]').equals([uid,pid]).toArray(),
   db.registros_saude.where('[user_id+person_id]').equals([uid,pid]).toArray()]);
  return {scope,links,procedures,orders,medications,health};
 },[uid,pid,surgeryId]);
 const choiceByType=useMemo(()=>{
  const procedures=activeFactsA9<A9Procedure>(data?.procedures||[],uid,pid).map(x=>({id:x.id,label:x.title,description:x.effective_status,
   href:'/saude/procedimentos?focus='+encodeURIComponent(x.id)}));
  const orders=(data?.orders||[]).filter(x=>!x.deleted_at).map(x=>({id:x.id,label:x.title||'Pedido de exame',description:x.order_kind==='medical_request'?'Solicitação médica':'Pedido independente',href:'/saude/exames/pedidos?id='+encodeURIComponent(x.id)}));
  const meds=(data?.medications||[]).flatMap(x=>{const id=x.id;return id?[{id,label:x.nome,description:x.status||'',href:'/saude/medicamentos/detalhes?id='+encodeURIComponent(id)}]:[];});
  const records=(data?.health||[]).map(x=>({id:x.id,label:x.tipo||x.categoria||'Registro clínico',description:x.data||'',href:'/saude/diario'}));
  return {procedure_event_a9:procedures,exam_order:orders,medication:meds,health_record:records} as Record<EvidenceTarget,RecordChoiceA7M5[]>;
 },[data,uid,pid]);
 const active=useMemo(()=>data?.scope===scope?activeEvidenceA7M5(data.links,uid,pid,surgeryId):[],[data,scope,uid,pid,surgeryId]);
 const facts=active.flatMap(link=>{
  const selected=choiceByType[link.target_type].find(x=>x.id===link.target_id);
  const archived=link.target_type==='procedure_event_a9'?data?.procedures.find(x=>x.id===link.target_id):null;
  const entry=selected||(archived?{id:archived.id,label:archived.title,description:'Fato histórico retificado ou cancelado',href:'/saude/procedimentos?focus='+encodeURIComponent(archived.id)}:null);
  return entry?[{link,label:entry.label,description:entry.description||'',href:entry.href||'',type:link.target_type}]:[];
 });
 const options=contextualActionsA7M5({situation:operationDocumented?'documented_surgery':'planned_surgery',
  hasExplicitSurgeryLink:Boolean(data?.scope===scope),hasDocumentedOperation:operationDocumented,
  hasLinkedReturn:returnIds.length>0,hasLinkedRehab:rehabIds.length>0,
  hasKnownPlan:false,hasScheduledReturn:returnIds.length>0});
 const submit=async()=>{if(inFlight.current||!pid||!target)return;inFlight.current=true;setBusy(true);setError('');
  try{await linkEvidenceToSurgeryA7M5({personId:pid,surgeryId,targetType:kind,targetId:target,stage,source,note});
   trigger('vibrate');toast.showSuccess('Vínculo por ID registrado. O documento original foi preservado.');setTarget('');setNote('');setForm(false);
  }catch(e){const m=e instanceof Error?e.message:'Falha no vínculo';setError(m);toast.showError(m);}finally{inFlight.current=false;setBusy(false);}
 };
 const doUnlink=async()=>{if(inFlight.current||!pid||!reason.trim())return;inFlight.current=true;setBusy(true);setError('');
  try{await unlinkEvidenceA7M5({personId:pid,linkId:unlinkId,reason});trigger('vibrate');toast.showSuccess('Vínculo encerrado; histórico preservado.');setUnlinkId('');setReason('');}
  catch(e){const m=e instanceof Error?e.message:'Falha no desvínculo';setError(m);toast.showError(m);}finally{setBusy(false);inFlight.current=false;}
 };
 if(!data||data.scope!==scope)return null;
 return <section className={`${panel} space-y-3`} aria-label="Continuidade cirúrgica e procedimentos associados">
  <div className="flex min-w-0 items-start gap-2"><GitBranch size={19} className="mt-0.5 shrink-0 text-emerald-300"/><div className="min-w-0 flex-1"><h2 className="text-sm font-bold text-ink-primary">Cuidados e procedimentos vinculados</h2><p className="mt-1 text-xs leading-5 text-ink-muted">Somente registros associados por você à cirurgia. Um curativo ou exame pode existir sem cirurgia; não é vinculado por data ou semelhança de nome.</p></div></div>
  {facts.length>0&&<div className="space-y-2">{facts.slice(0,expanded?facts.length:3).map(({link,label,description,href,type})=><article key={link.id} className="min-w-0 rounded-xl border border-surface-border/60 bg-surface-raised/60 p-3">
   <div className="flex gap-2"><FileText size={17} className="mt-0.5 shrink-0 text-sky-300"/><div className="min-w-0 flex-1"><p className="break-words text-xs font-semibold text-ink-primary">{label}</p><p className="mt-1 break-words text-[11px] text-ink-muted">{TARGET_LABEL_A7M5[type]} · {STAGE_LABEL_A7M5[link.stage]}{description?' · '+description:''}</p>{link.note&&<p className="mt-1 break-words text-xs text-ink-secondary">{link.note}</p>}</div></div>
   <div className="mt-2 flex flex-wrap gap-2">{href&&<Link href={withReturnTarget(href,returnTo)} className="inline-flex min-h-11 items-center gap-1 rounded-xl border border-surface-border px-3 text-xs text-emerald-200">Abrir origem <ArrowUpRight size={16}/></Link>}
    <button type="button" onClick={()=>{setUnlinkId(link.id);setReason('')}} className={button}><Unlink2 size={15} className="mr-1 inline"/>Desvincular</button></div>
   {unlinkId===link.id&&<div className="mt-2 space-y-2"><label className="block text-xs">Motivo do desvínculo<input className="mt-1 min-h-11 w-full rounded-xl border border-surface-border bg-surface px-3" value={reason} maxLength={1000} onChange={e=>setReason(e.target.value)}/></label><div className="flex gap-2"><button type="button" disabled={busy||!reason.trim()} onClick={()=>void doUnlink()} className="min-h-11 flex-1 rounded-xl bg-emerald-400 px-3 text-xs font-bold text-slate-950 disabled:opacity-40">Confirmar</button><button type="button" onClick={()=>setUnlinkId('')} className={button}>Cancelar</button></div></div>}
  </article>)}</div>}
  {facts.length>3&&<button type="button" onClick={()=>setExpanded(x=>!x)} className="min-h-11 w-full rounded-xl border border-surface-border text-xs text-emerald-200">{expanded?'Recolher registros':'Mostrar mais '+(facts.length-3)}</button>}
  {options.length>0&&<div className="space-y-1 rounded-xl border border-surface-border/50 p-2.5">{options.map(o=><p key={o.key} className="flex items-start gap-2 text-[11px] text-ink-muted"><ClipboardCheck size={15} className="mt-0.5 shrink-0 text-teal-300"/>{o.label} — {o.reason}</p>)}</div>}
  <button type="button" aria-expanded={form} onClick={()=>setForm(x=>!x)} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-emerald-300/30 px-3 text-xs font-semibold text-emerald-200"><Plus size={16}/>{form?'Fechar seleção':'Vincular um registro existente'}</button>
  {form&&<div className="space-y-3 rounded-xl border border-surface-border bg-surface-raised/50 p-3">
   <div><p className="mb-1 text-xs font-semibold">Que tipo de informação você quer vincular?</p><div className="grid gap-2 min-[360px]:grid-cols-2" role="group">{TYPES.map(t=><button type="button" aria-pressed={kind===t} key={t} onClick={()=>{setKind(t);setTarget('')}} className={'min-h-11 rounded-xl border px-2 py-2 text-left text-xs '+(kind===t?'border-emerald-300/45 text-emerald-200':'border-surface-border text-ink-muted')}>{TARGET_LABEL_A7M5[t]}</button>)}</div></div>
   <ClinicalRecordFinderA7M5 label="Registro original" items={choiceByType[kind]} value={target} onChange={setTarget} returnTo={returnTo} placeholder="Buscar pelo nome ou situação"/>
   <div><p className="mb-1 text-xs font-semibold">Em qual etapa esse registro foi relacionado?</p><div className="grid grid-cols-2 gap-2" role="group">{STAGES.map(s=><button type="button" aria-pressed={stage===s} key={s} onClick={()=>setStage(s)} className={'min-h-11 rounded-xl border px-2 text-xs '+(stage===s?'border-emerald-300/45 text-emerald-200':'border-surface-border text-ink-muted')}>{STAGE_LABEL_A7M5[s]}</button>)}</div></div>
   <div className="grid grid-cols-2 gap-2" role="group" aria-label="Origem da relação">{([{k:'self_report',l:'Relato próprio'},{k:'professional_document',l:'Documento profissional'}] as const).map(x=><button type="button" aria-pressed={source===x.k} onClick={()=>setSource(x.k)} key={x.k} className={'min-h-11 rounded-xl border px-2 text-xs '+(source===x.k?'border-emerald-300/45 text-emerald-200':'border-surface-border text-ink-muted')}>{x.l}</button>)}</div>
   <label className="block text-xs">Observação de vínculo (opcional)<textarea className="mt-1 min-h-20 w-full rounded-xl border border-surface-border bg-surface p-3 text-sm" rows={2} maxLength={1000} value={note} onChange={e=>setNote(e.target.value)} placeholder="Sem presumir causa, prescrição ou realização"/></label>
   {error&&<p role="alert" className="text-xs text-coral">{error}</p>}
   <button type="button" onClick={()=>void submit()} disabled={busy||!target} className="min-h-12 w-full rounded-xl bg-emerald-400 text-xs font-bold text-slate-950 disabled:opacity-40">{busy?'Salvando…':'Confirmar vínculo real'}</button>
  </div>}
  <p className="flex gap-2 text-[11px] text-ink-muted"><ShieldCheck size={15} className="shrink-0"/>Fatos ficam em A9, Exames, Medicamentos ou Diário. Aqui existe apenas a relação por ID, com histórico.</p>
 </section>;
}
