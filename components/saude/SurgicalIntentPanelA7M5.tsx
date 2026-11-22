'use client';
/** An explicit referral may exist before there is a surgical appointment or a date. */
import {useEffect,useMemo,useRef,useState} from 'react';
import Link from 'next/link';
import {useLiveQuery} from 'dexie-react-hooks';
import {ClipboardList,FilePenLine,ExternalLink,Plus,ShieldCheck,Stethoscope} from 'lucide-react';
import {db} from '@/lib/db';
import {useAuth} from '@/hooks/useAuth';
import {useActivePersonId} from '@/hooks/useActivePersonId';
import {useToast} from '@/components/ToastProvider';
import {useHapticFeedback} from '@/lib/haptics';
import {ClinicalRecordFinderA7M5,type RecordChoiceA7M5} from './ClinicalRecordFinderA7M5';
import {ClinicalFactDocumentsA7M5} from './ClinicalFactDocumentsA7M5';
import {saveSurgicalIntentA7M5} from '@/lib/surgery-continuity-a7m5/repository';
import {currentIntentsA7M5,STATUS_LABEL_A7M5,type SurgicalIntentStatus,type ContinuitySource} from '@/lib/surgery-continuity-a7m5/types';
const field='min-h-11 w-full min-w-0 rounded-xl border border-surface-border bg-surface-raised px-3 py-2 text-sm text-ink-primary focus-visible:outline-2 focus-visible:outline-emerald-300';
const frame='rounded-[20px] border border-surface-border/70 bg-surface p-3.5 shadow-sm';
const STATUS:readonly SurgicalIntentStatus[]=['requested','under_review','scheduled','withdrawn'];
export function SurgicalIntentPanelA7M5({compact=false}:{compact?:boolean}){
 const {user}=useAuth(),{activePersonId}=useActivePersonId(),toast=useToast(),{trigger}=useHapticFeedback();
 const uid=user?.id||'',pid=activePersonId||'',scope=`${uid}:${pid}`;
 const [open,setOpen]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const [title,setTitle]=useState(''),[status,setStatus]=useState<SurgicalIntentStatus>('requested'),[note,setNote]=useState('');
 const [source,setSource]=useState<ContinuitySource>('self_report'),[consultation,setConsultation]=useState('');
 const [surgery,setSurgery]=useState(''),[professional,setProfessional]=useState(''),[corrects,setCorrects]=useState('');
 const inFlight=useRef(false);
 useEffect(()=>{setOpen(false);setTitle('');setStatus('requested');setNote('');setSource('self_report');setConsultation('');setSurgery('');setProfessional('');setCorrects('');setError('');},[scope]);
 const data=useLiveQuery(async()=>{
  if(!uid||!pid)return null;const person=await db.persons.get(pid);if(person?.user_id!==uid)return null;
  const [intents,consultations,surgeries,professionals]=await Promise.all([
   db.surgical_intents_a7m5.where('[user_id+person_id]').equals([uid,pid]).toArray(),
   db.consultas.where('[user_id+person_id]').equals([uid,pid]).toArray(),
   db.cirurgias.where('[user_id+person_id]').equals([uid,pid]).toArray(),
   db.medicos.where('user_id').equals(uid).toArray()]);
  return {scope,intents,consultations,surgeries,professionals};
 },[uid,pid]);
 const current=useMemo(()=>data?.scope===scope?currentIntentsA7M5(data.intents,uid,pid):[],[data,scope,uid,pid]);
 const choices=useMemo(()=>{
  const consultants:RecordChoiceA7M5[]=data?.consultations.filter(x=>x.id).map(x=>({id:x.id!,label:x.motivo||x.especialidade||'Consulta cadastrada',description:x.data||'',href:'/saude/consultas/detalhes?id='+encodeURIComponent(x.id!)}))||[];
  const operations:RecordChoiceA7M5[]=data?.surgeries.filter(x=>x.id).map(x=>({id:x.id!,label:x.procedimento,description:x.data||'',href:'/saude/cirurgias/jornada?id='+encodeURIComponent(x.id!)}))||[];
  const pros:RecordChoiceA7M5[]=data?.professionals.filter(x=>x.id).map(x=>({id:x.id!,label:x.nome,description:x.especialidade||'',href:'/saude/medicos/detalhes?id='+encodeURIComponent(x.id!)}))||[];
  return {consultants,operations,pros};
 },[data]);
 const reset=()=>{setTitle('');setNote('');setStatus('requested');setSource('self_report');setConsultation('');setSurgery('');setProfessional('');setCorrects('');};
 const submit=async()=>{if(inFlight.current||!pid||!title.trim())return;inFlight.current=true;setBusy(true);setError('');
  try{await saveSurgicalIntentA7M5({personId:pid,title,status,source,note,consultationId:consultation||null,
    professionalId:professional||null,linkedSurgeryId:surgery||null,correctsId:corrects||null});
   trigger('vibrate');toast.showSuccess('Encaminhamento registrado. Nenhuma cirurgia foi criada automaticamente.');reset();setOpen(false);
  }catch(e){const m=e instanceof Error?e.message:'Não foi possível salvar';setError(m);toast.showError(m);}finally{setBusy(false);inFlight.current=false;}
 };
 if(!uid||!pid||!data||data.scope!==scope)return null;
 return <section className={`${frame} min-w-0 space-y-3`} aria-label="Encaminhamentos e intenções documentadas">
  <div className="flex min-w-0 items-start gap-2"><ClipboardList size={20} className="mt-0.5 shrink-0 text-emerald-300"/><div className="min-w-0 flex-1"><h2 className="text-sm font-bold text-ink-primary">Encaminhamentos e procedimentos considerados</h2><p className="mt-1 text-xs leading-5 text-ink-muted">Somente o que foi informado por você ou consta de um documento. Não exige cirurgia marcada nem cria uma indicação médica.</p></div></div>
  {current.length>0&&<div className="space-y-2">{current.map(x=><article key={x.id} className="min-w-0 rounded-xl border border-surface-border/65 bg-surface-raised/60 p-3">
   <div className="flex min-w-0 gap-2"><Stethoscope size={17} className="mt-0.5 shrink-0 text-sky-300"/><div className="min-w-0 flex-1"><p className="break-words text-xs font-bold text-ink-primary">{x.title}</p><p className="mt-1 text-[11px] text-ink-muted">{STATUS_LABEL_A7M5[x.status]} · {x.source==='professional_document'?'Documento profissional':'Relato próprio'}</p>{x.note&&<p className="mt-1 break-words text-xs text-ink-secondary">{x.note}</p>}{x.linked_surgery_id&&<Link href={'/saude/cirurgias/jornada?id='+encodeURIComponent(x.linked_surgery_id)} className="mt-2 inline-flex min-h-11 items-center gap-2 text-xs font-semibold text-emerald-200">Abrir cirurgia vinculada <ExternalLink size={15}/></Link>}</div></div>
   <ClinicalFactDocumentsA7M5 type="surgical_intent" entityId={x.id}/><button type="button" onClick={()=>{setCorrects(x.id);setTitle(x.title);setStatus(x.status);setNote(x.note||'');setSource(x.source);setConsultation(x.source_consultation_id||'');setSurgery(x.linked_surgery_id||'');setProfessional(x.source_professional_id||'');setOpen(true);}} className="mt-2 inline-flex min-h-11 items-center gap-2 rounded-xl border border-surface-border px-3 text-xs text-emerald-200"><FilePenLine size={16}/> Registrar revisão</button>
  </article>)}</div>}
  {!compact&&current.length===0&&<p className="text-xs text-ink-muted">Nenhum encaminhamento cadastrado. Uma consulta comum não exige registrar cirurgia.</p>}
  <button type="button" aria-expanded={open} onClick={()=>{if(!open)reset();setOpen(x=>!x)}} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-emerald-300/30 px-3 text-xs font-bold text-emerald-200"><Plus size={17}/>{open?'Fechar formulário':'Registrar encaminhamento informado'}</button>
  {open&&<div className="space-y-3 rounded-xl border border-surface-border bg-surface-raised/50 p-3">
   <label className="block space-y-1 text-xs font-semibold">Procedimento ou indicação informada<input className={field} value={title} onChange={e=>setTitle(e.target.value)} maxLength={180} placeholder="Descrição fornecida por profissional ou usuário"/></label>
   <div><p className="mb-1 text-xs font-semibold">Situação declarada</p><div className="grid gap-2 min-[380px]:grid-cols-2" role="group">{STATUS.map(v=><button type="button" aria-pressed={status===v} key={v} onClick={()=>setStatus(v)} className={'min-h-11 rounded-xl border px-3 py-2 text-left text-xs '+(status===v?'border-emerald-300/50 text-emerald-200':'border-surface-border text-ink-muted')}>{STATUS_LABEL_A7M5[v]}</button>)}</div></div>
   <div><p className="mb-1 text-xs font-semibold">Origem</p><div className="grid grid-cols-2 gap-2" role="group">{([{value:'self_report',label:'Relato próprio'},{value:'professional_document',label:'Documento profissional'}] as const).map(x=><button type="button" aria-pressed={source===x.value} key={x.value} onClick={()=>setSource(x.value)} className={'min-h-11 rounded-xl border px-3 text-xs '+(source===x.value?'border-emerald-300/40 text-emerald-200':'border-surface-border text-ink-muted')}>{x.label}</button>)}</div></div>
   <ClinicalRecordFinderA7M5 label="Consulta de origem (opcional)" items={choices.consultants} value={consultation} onChange={setConsultation} returnTo="/saude/cirurgias/encaminhamentos"/>
   <ClinicalRecordFinderA7M5 label="Profissional relacionado (opcional)" items={choices.pros} value={professional} onChange={setProfessional} returnTo="/saude/cirurgias/encaminhamentos"/>
   {status==='scheduled'&&<ClinicalRecordFinderA7M5 label="Cirurgia agendada cadastrada (obrigatória neste estado)" items={choices.operations} value={surgery} onChange={setSurgery} returnTo="/saude/cirurgias/encaminhamentos"/>}
   <label className="block space-y-1 text-xs font-semibold">Descrição adicional informada (opcional)<textarea rows={3} value={note} onChange={e=>setNote(e.target.value)} maxLength={2500} className={field} placeholder="Sem diagnóstico, indicação ou data presumida"/></label>
   {error&&<p role="alert" className="text-xs text-coral">{error}</p>}
   <button type="button" onClick={()=>void submit()} disabled={busy||!title.trim()||(status==='scheduled'&&!surgery)} className="min-h-12 w-full rounded-xl bg-emerald-400 px-3 text-xs font-bold text-slate-950 disabled:opacity-40">{busy?'Salvando…':corrects?'Registrar revisão histórica':'Salvar encaminhamento'}</button>
  </div>}
  <p className="flex gap-2 text-[11px] leading-5 text-ink-muted"><ShieldCheck size={15} className="shrink-0"/>Nenhuma cirurgia, internação ou reabilitação é criada por inferência. Histórico de revisões preservado.</p>
 </section>;
}
