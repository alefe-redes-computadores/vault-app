'use client';
/** A5 Premium: one canonical workspace for list, create, details and edit; no native selectors. */
import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useLiveQuery } from 'dexie-react-hooks';
import { BedDouble,Building2,CalendarDays,ChevronRight,ClipboardList,FileText,HeartHandshake,History,Hospital,Link2,Plus,Save,Search,ShieldCheck,Stethoscope,UserPlus,CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useActivePersonId } from '@/hooks/useActivePersonId';
import { useToast } from '@/components/ToastProvider';
import { useHapticFeedback } from '@/lib/haptics';
import { ListPageHeader } from '@/components/list/ListPageHeader';
import { HealthRelationPicker } from '@/components/saude/HealthRelationPicker';
import { CustomDatePicker } from '@/components/DatePicker';
import { withReturnTarget } from '@/lib/navigation/return-context';
import { db } from '@/lib/db';
import { HospitalizationA5Documents } from './HospitalizationA5Documents';
import { createHospitalizationA5, updateHospitalizationA5, addHospitalizationStayA5,
 finishHospitalizationStayA5,assignHospitalizationTeamA5,recordHospitalizationEventA5,
 relateHospitalizationA5,unlinkHospitalizationA5,registerHospitalizationDischargeA5 } from '@/lib/hospitalizations-a5/repository';
import { hospitalizationSummaryA5,hospitalizationRelationsA5,hospitalizationTimelineA5 } from '@/lib/hospitalizations-a5/projection';
import { A5_STATUS_LABEL,A5_UNIT_LABEL,A5_EVENT_LABEL,A5_SOURCE_LABEL,A5_ENTITY_LABEL,
 A5_DISPOSITION_LABEL,A5_RECON_LABEL,displayDayA5,type A5Source,type A5Unit,type A5EventKind,
 type A5Entity,type A5RelationRole,type A5Disposition,type A5Reconciliation,
 type A5Episode } from '@/lib/hospitalizations-a5/types';
type View='list'|'new'|'details'|'edit';
const box='rounded-2xl border border-surface-border/70 bg-surface-raised/75 p-3.5 sm:p-4';
const field='min-h-11 w-full min-w-0 rounded-xl border border-surface-border bg-surface px-3 py-2 text-sm text-ink-primary placeholder:text-ink-muted focus:border-emerald-400 focus:outline-none';
const cta='inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-400 px-4 py-2 text-sm font-bold text-void disabled:opacity-50';
const soft='inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-surface-border bg-surface px-3 py-2 text-xs font-semibold text-ink-primary disabled:opacity-50';
function Field({label,children}:{label:string;children:ReactNode}){return <fieldset className="min-w-0 space-y-1.5"><legend className="text-xs font-semibold text-ink-muted">{label}</legend>{children}</fieldset>}
function Selector<T extends string>({title,value,onChange,options}:{title:string;value:T;onChange:(value:T)=>void;options:readonly {value:T;label:string}[]}){
 return <HealthRelationPicker title={title} kind="status" value={value} onValueChange={x=>onChange(x as T)} className={field}>
  {options.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
 </HealthRelationPicker>;
}
const sources=[{value:'self_report',label:'Relato pessoal'},{value:'professional_document',label:'Documento profissional'},{value:'verified_import',label:'Importação verificada'}] as const;
const units=(Object.entries(A5_UNIT_LABEL) as [A5Unit,string][]).map(([value,label])=>({value,label}));
const events=(Object.entries(A5_EVENT_LABEL) as [A5EventKind,string][]).map(([value,label])=>({value,label}));
const entities=(Object.entries(A5_ENTITY_LABEL) as [A5Entity,string][]).map(([value,label])=>({value,label}));
const destinations=(Object.entries(A5_DISPOSITION_LABEL) as [A5Disposition,string][]).map(([value,label])=>({value,label}));
const reconciliations=(Object.entries(A5_RECON_LABEL) as [A5Reconciliation,string][]).map(([value,label])=>({value,label}));
const roles:ReadonlyArray<{value:A5RelationRole;label:string}>=[{value:'related',label:'Relacionado'},{value:'origin',label:'Origem documentada'},
 {value:'during',label:'Durante a internação'},{value:'followup',label:'Seguimento'},{value:'discharge_plan',label:'Plano de alta informado'},
 {value:'rehab_referral',label:'Encaminhamento à reabilitação'},{value:'medication_history',label:'Histórico de medicamento'}];
const pathTo=(type:A5Entity,id:string)=>type==='cirurgia'?`/saude/cirurgias/detalhes?id=${encodeURIComponent(id)}`:
 type==='consulta'?`/saude/consultas/detalhes?id=${encodeURIComponent(id)}`:
 type==='exam_order'?`/saude/exames/pedidos?id=${encodeURIComponent(id)}`:
 type==='tratamento'?`/saude/tratamentos/detalhes?id=${encodeURIComponent(id)}`:
 type==='rehab_program'?`/saude/reabilitacao/detalhes?id=${encodeURIComponent(id)}`:
 `/saude/medicamentos/detalhes?id=${encodeURIComponent(id)}`;
function decodeError(e:unknown){return e instanceof Error?e.message:'Não foi possível concluir esta operação. Os registros foram preservados.';}
export function HospitalizationA5Workspace({view,selectedId}:{view:View;selectedId?:string}){
 const router=useRouter(),params=useSearchParams();const {user,loading}=useAuth(),{activePersonId}=useActivePersonId();
 const {showToast}=useToast(),{trigger}=useHapticFeedback();const uid=user?.id||'',pid=activePersonId||'',scope=`${uid}:${pid}`;
 const [busy,setBusy]=useState(false),busyLock=useRef(false),[message,setMessage]=useState('');
 const [query,setQuery]=useState(''),[statusFilter,setStatusFilter]=useState('all'),[density,setDensity]=useState<'compact'|'comfort'>('compact');
 const [status,setStatus]=useState<'planned'|'admitted'>('planned'),[reason,setReason]=useState(''),[note,setNote]=useState('');
 const [plannedOn,setPlannedOn]=useState(''),[admittedOn,setAdmittedOn]=useState(''),[source,setSource]=useState<A5Source>('self_report');
 const [hospitalId,setHospitalId]=useState(''),[localId,setLocalId]=useState('');
 const [unit,setUnit]=useState<A5Unit>('unspecified'),[stayOn,setStayOn]=useState(''),[ward,setWard]=useState(''),[bed,setBed]=useState('');
 const [closeStayId,setCloseStayId]=useState(''),[closeStayOn,setCloseStayOn]=useState('');
 const [professional,setProfessional]=useState(''),[role,setRole]=useState('');
 const [eventKind,setEventKind]=useState<A5EventKind>('care_note'),[eventSummary,setEventSummary]=useState(''),[eventOn,setEventOn]=useState(''),[correctionId,setCorrectionId]=useState('');
 const [relationType,setRelationType]=useState<A5Entity>('consulta'),[relationId,setRelationId]=useState(''),[relationRole,setRelationRole]=useState<A5RelationRole>('related');
 const [disposition,setDisposition]=useState<A5Disposition>('unknown'),[dischargedOn,setDischargedOn]=useState(''),[dischargeSummary,setDischargeSummary]=useState('');
 const [dischargeInstructions,setDischargeInstructions]=useState(''),[dischargeFollowup,setDischargeFollowup]=useState('');
 const [reconciliation,setReconciliation]=useState<A5Reconciliation>('not_reported'),[ackDischarge,setAckDischarge]=useState(false);
 const [confirmStatus,setConfirmStatus]=useState('');
 const detailPath=(id:string)=>`/saude/internacoes/detalhes?id=${encodeURIComponent(id)}`;
 const go=(target:string)=>{trigger('vibrate');router.push(withReturnTarget(target,params.get('return_to')||'/saude/internacoes'));};
 const data=useLiveQuery(async()=>{
  const empty={scope,episodes:[],stays:[],team:[],events:[],relations:[],discharges:[],hospitals:[],locations:[],professionals:[],consultas:[],cirurgias:[],examOrders:[],treatments:[],rehab:[],medications:[]};
  if(!uid||!pid)return empty;
  const person=await db.persons.get(pid);if(person?.user_id!==uid)return empty;
  const [episodes,stays,team,ev,relations,discharges,hospitals,locations,professionals,consultas,cirurgias,examOrders,treatments,rehab,medications]=await Promise.all([
   db.hospitalizations_a5.where('person_id').equals(pid).toArray(),db.hospitalization_stays_a5.where('person_id').equals(pid).toArray(),
   db.hospitalization_team_a5.where('person_id').equals(pid).toArray(),db.hospitalization_events_a5.where('person_id').equals(pid).toArray(),
   db.hospitalization_relations_a5.where('person_id').equals(pid).toArray(),db.hospitalization_discharge_a5.where('person_id').equals(pid).toArray(),
   db.hospitais.where('user_id').equals(uid).toArray(),db.locais.where('user_id').equals(uid).toArray(),db.medicos.where('user_id').equals(uid).toArray(),
   db.consultas.where('user_id').equals(uid).toArray(),db.cirurgias.where('user_id').equals(uid).toArray(),
   db.exam_orders.where('person_id').equals(pid).toArray(),db.tratamentos.where('user_id').equals(uid).toArray(),
   db.rehab_programs_m5.where('person_id').equals(pid).toArray(),db.medicamentos.where('user_id').equals(uid).toArray(),
  ]);
  const own=<T extends {user_id:string;person_id:string;deleted_at:string|null}>(arr:T[])=>arr.filter(x=>x.user_id===uid&&x.person_id===pid&&!x.deleted_at);
  return {scope,episodes:own(episodes),stays:own(stays),team:own(team),events:own(ev),relations:own(relations),discharges:own(discharges),
   hospitals,locations,professionals,consultas:consultas.filter(x=>x.person_id===pid),cirurgias:cirurgias.filter(x=>x.person_id===pid),
   examOrders:own(examOrders),treatments:treatments.filter(x=>x.person_id===pid),rehab:own(rehab),medications:medications.filter(x=>x.person_id===pid)};
 },[uid,pid]);
 const ready=Boolean(data?.scope===scope&&uid&&pid&&!loading);
 const selected=ready?data?.episodes.find(x=>x.id===selectedId):undefined;
 const all=ready?data?.episodes||[]:[];
 const totals=hospitalizationSummaryA5(all,uid,pid);
 const filtered=useMemo(()=>all.filter(x=>
   (statusFilter==='all'||x.status===statusFilter)&&
   [x.reason,x.note,A5_STATUS_LABEL[x.status],x.facility_name_snapshot].join(' ').toLocaleLowerCase('pt-BR').includes(query.trim().toLocaleLowerCase('pt-BR')))
  .sort((a,b)=>b.updated_at.localeCompare(a.updated_at)),[all,statusFilter,query]);
 const stays=ready?data?.stays.filter(x=>x.hospitalization_id===selectedId)||[]:[];
 const team=ready?data?.team.filter(x=>x.hospitalization_id===selectedId)||[]:[];
 const eventRows=ready?data?.events.filter(x=>x.hospitalization_id===selectedId)||[]:[];
 const discharge=ready?data?.discharges.find(x=>x.hospitalization_id===selectedId):undefined;
 const linked=selected&&data?hospitalizationRelationsA5(selected,data.relations):[];
 const timeline=selected&&data?hospitalizationTimelineA5(selected,data.stays,data.events,data.discharges):[];
 const facility=(episode:A5Episode)=>episode.hospital_id?data?.hospitals.find(x=>x.id===episode.hospital_id)?.nome||'Hospital vinculado':
  episode.local_id?data?.locations.find(x=>x.id===episode.local_id)?.nome||'Local vinculado':episode.facility_name_snapshot||'Instituição não informada';
 const relationOptions=relationType==='cirurgia'?data?.cirurgias:relationType==='consulta'?data?.consultas:
  relationType==='exam_order'?data?.examOrders:relationType==='tratamento'?data?.treatments:
  relationType==='rehab_program'?data?.rehab:data?.medications;
 const nameOfRelation=(type:A5Entity,id:string)=>{
  const item=(type==='cirurgia'?data?.cirurgias:type==='consulta'?data?.consultas:type==='exam_order'?data?.examOrders:
    type==='tratamento'?data?.treatments:type==='rehab_program'?data?.rehab:data?.medications)?.find(x=>x.id===id);
  if(!item)return A5_ENTITY_LABEL[type];
  if(type==='consulta')return `${A5_ENTITY_LABEL[type]} · ${displayDayA5('data' in item?String(item.data):'')}`;
  if(type==='rehab_program')return 'title' in item?String(item.title):A5_ENTITY_LABEL[type];
  if('nome' in item)return String(item.nome||A5_ENTITY_LABEL[type]);
  if('title' in item)return String(item.title||A5_ENTITY_LABEL[type]);
  return A5_ENTITY_LABEL[type];
 };
 useEffect(()=>{
  setQuery('');setStatusFilter('all');setMessage('');setConfirmStatus('');setRelationId('');setProfessional('');setCorrectionId('');
  setReason('');setNote('');setPlannedOn('');setAdmittedOn('');setStatus('planned');setHospitalId('');setLocalId('');setAckDischarge(false);setCloseStayId('');setCloseStayOn('');
 },[scope]);
 useEffect(()=>{if(view==='edit'&&selected){setReason(selected.reason||'');setNote(selected.note||'');setPlannedOn(selected.planned_admission_on||'');}},[view,selected?.id,scope]);
 const perform=async(task:()=>Promise<unknown>,success:string,after?:()=>void)=>{
  if(busyLock.current)return;busyLock.current=true;setBusy(true);setMessage('');
  try{await task();showToast(success,'success');setMessage(success);trigger('success');after?.();}
  catch(e){const msg=decodeError(e);showToast(msg,'error');setMessage(msg);trigger('error');}
  finally{busyLock.current=false;setBusy(false);}
 };
 const create=async(e:FormEvent<HTMLFormElement>)=>{
  e.preventDefault();let created='';await perform(async()=>{
   created=await createHospitalizationA5({personId:pid,status,reason,source,
    plannedOn:status==='planned'?plannedOn:undefined,admittedOn:status==='admitted'?admittedOn:undefined,
    hospitalId:hospitalId||undefined,localId:localId||undefined,note});
  },'Internação registrada neste aparelho; sincronização pode continuar pendente.',()=>{
   setReason('');setNote('');setPlannedOn('');setAdmittedOn('');setHospitalId('');setLocalId('');
   if(created)go(detailPath(created));
  });
 };
 const edit=async(e:FormEvent<HTMLFormElement>)=>{
  e.preventDefault();if(!selected)return;
  await perform(()=>updateHospitalizationA5({personId:pid,id:selected.id,reason,note,plannedOn:selected.status==='planned'?plannedOn:undefined}),
   'Dados da internação atualizados.',()=>go(detailPath(selected.id)));
 };
 const submitEvent=async(e:FormEvent<HTMLFormElement>)=>{
  e.preventDefault();if(!selected)return;const disclosure=e.currentTarget.closest('details');
  await perform(()=>recordHospitalizationEventA5({personId:pid,hospitalizationId:selected.id,kind:eventKind,
   summary:eventSummary,source,occurredOn:eventOn,correctsEventId:eventKind==='correction'?correctionId:undefined}),
   'Fato registrado no diário; os anteriores foram preservados.',()=>{setEventSummary('');setEventOn('');setCorrectionId('');disclosure?.removeAttribute('open');});
 };
 const submitStay=async(e:FormEvent<HTMLFormElement>)=>{
  e.preventDefault();if(!selected)return;const disclosure=e.currentTarget.closest('details');
  await perform(()=>addHospitalizationStayA5({personId:pid,hospitalizationId:selected.id,unitType:unit,source,enteredOn:stayOn,ward,bed}),
   'Setor registrado sem substituir permanências anteriores.',()=>{setStayOn('');setWard('');setBed('');disclosure?.removeAttribute('open');});
 };
 const submitTeam=async(e:FormEvent<HTMLFormElement>)=>{
  e.preventDefault();if(!selected)return;const disclosure=e.currentTarget.closest('details');
  await perform(()=>assignHospitalizationTeamA5({personId:pid,hospitalizationId:selected.id,professionalId:professional,role,source}),
   'Profissional vinculado à internação.',()=>{setProfessional('');setRole('');disclosure?.removeAttribute('open');});
 };
 const submitRelation=async(e:FormEvent<HTMLFormElement>)=>{
  e.preventDefault();if(!selected)return;const disclosure=e.currentTarget.closest('details');
  await perform(()=>relateHospitalizationA5({personId:pid,hospitalizationId:selected.id,entityType:relationType,entityId:relationId,role:relationRole,source}),
   'Vínculo clínico registrado por identidade real.',()=>{setRelationId('');disclosure?.removeAttribute('open');});
 };
 const submitDischarge=async(e:FormEvent<HTMLFormElement>)=>{
  e.preventDefault();if(!selected||!ackDischarge)return;const disclosure=e.currentTarget.closest('details');
  await perform(()=>registerHospitalizationDischargeA5({personId:pid,hospitalizationId:selected.id,disposition,source,
   dischargedOn,summary:dischargeSummary,instructions:dischargeInstructions,followupPlan:dischargeFollowup,reconciliation}),
   'Saída documentada. Medicamentos, estoque e doses não foram modificados.',()=>{
    setDischargedOn('');setDischargeSummary('');setDischargeInstructions('');setDischargeFollowup('');setAckDischarge(false);disclosure?.removeAttribute('open');
   });
 };
 const formHeader=<div className="mb-2 flex items-start gap-2"><ShieldCheck size={17} className="mt-0.5 shrink-0 text-emerald-300"/>
  <p className="text-xs leading-5 text-ink-muted">Somente fatos informados; datas e horários desconhecidos permanecem vazios. Nenhum registro altera doses, estoque ou prescrições.</p></div>;
 if(!ready)return <main className="min-h-screen bg-void p-4"><ListPageHeader title="Internações" backUrl="/saude/careflow"/>
  <p className="mt-5 text-xs text-ink-muted" role="status">{loading||data===undefined?'Carregando registros da pessoa selecionada…':'Selecione uma pessoa válida para continuar.'}</p></main>;
 return <main className="min-h-screen bg-void px-3 pb-[calc(env(safe-area-inset-bottom)+5rem)] pt-3 text-ink-primary sm:px-4">
  <div className="mx-auto w-full max-w-3xl space-y-3">
   <ListPageHeader title={view==='new'?'Nova internação':view==='edit'?'Editar internação':view==='details'?'Detalhes da internação':'Internações'}
    subtitle="Histórico factual da pessoa ativa" showBack backUrl={view==='list'?'/saude/careflow':'/saude/internacoes'}
    icon={<Hospital size={19}/>} iconColor="text-emerald-300" suppressCreate/>
   {view==='list'&&<>
    <section className={box} aria-label="Resumo das internações">
     <div className="grid grid-cols-3 gap-2 text-center text-xs"><div><strong className="block text-lg tabular-nums">{totals.planned}</strong>Planejadas</div>
      <div><strong className="block text-lg tabular-nums">{totals.current}</strong>Em andamento</div>
      <div><strong className="block text-lg tabular-nums">{totals.finished}</strong>Concluídas</div></div>
    </section>
    <button type="button" className={`${cta} w-full`} onClick={()=>go('/saude/internacoes/novo')}><Plus size={17}/>Nova internação</button>
    <div className="flex flex-wrap gap-2">
     <label className="relative min-w-0 flex-1"><span className="sr-only">Buscar internação</span><Search className="pointer-events-none absolute left-3 top-3.5" size={16}/>
      <input className={`${field} pl-9`} type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Buscar no histórico"/></label>
     <button type="button" className={soft} onClick={()=>setDensity(v=>v==='compact'?'comfort':'compact')} aria-label="Alternar densidade">{density==='compact'?'Conforto':'Compacto'}</button>
    </div>
    <HealthRelationPicker title="Filtrar por situação" kind="status" compact value={statusFilter} onValueChange={setStatusFilter} className={field}>
     <option value="all">Todas as situações</option>{Object.entries(A5_STATUS_LABEL).map(([value,label])=><option key={value} value={value}>{label}</option>)}
    </HealthRelationPicker>
    <section className="space-y-2" aria-label="Histórico de internações">
     {filtered.length===0?<p className="rounded-xl border border-surface-border p-3 text-xs text-ink-muted">Nenhuma internação encontrada neste filtro.</p>:filtered.map(x=><article key={x.id} className={`${box} ${density==='comfort'?'p-5':'p-3'}`}>
      <div className="flex items-start gap-3"><BedDouble size={18} className="mt-1 shrink-0 text-emerald-300"/><div className="min-w-0 flex-1">
       <button type="button" onClick={()=>go(detailPath(x.id))} className="inline-flex min-h-11 max-w-full items-center gap-1 text-left text-sm font-semibold underline-offset-2 hover:underline">
        <span className="min-w-0 break-words">{x.reason||'Internação sem motivo informado'}</span><ChevronRight size={16} className="shrink-0"/></button>
       <p className="text-[11px] leading-5 text-ink-muted">{facility(x)} · {A5_STATUS_LABEL[x.status]}</p>
       <p className="text-[11px] text-ink-muted">{x.status==='planned'?'Data prevista':'Admissão'}: {displayDayA5(x.status==='planned'?x.planned_admission_on:x.admitted_on)}</p>
      </div></div>
      {!x.synced&&<p className="mt-1 text-[11px] text-amber-200">Pendente de sincronização</p>}
     </article>)}
    </section>
   </>}
   {view==='new'&&<section className={box}>{formHeader}
    <form className="space-y-3" onSubmit={e=>void create(e)}>
     <Field label="Situação informada"><Selector title="Situação" value={status} onChange={setStatus}
      options={[{value:'planned',label:'Planejada'},{value:'admitted',label:'Admissão confirmada'}]}/></Field>
     <Field label="Origem da informação"><Selector title="Origem" value={source} onChange={setSource} options={sources}/></Field>
     <Field label="Motivo (se conhecido)"><input value={reason} onChange={e=>setReason(e.target.value)} maxLength={400} className={field} placeholder="Não inferir diagnóstico"/></Field>
     <div className="grid gap-3 min-[410px]:grid-cols-2">
      <Field label="Hospital (opcional)"><HealthRelationPicker title="Escolher hospital" kind="hospital" value={hospitalId} onValueChange={v=>{setHospitalId(v);if(v)setLocalId('');}} className={field}>
       <option value="">Não informado</option>{data?.hospitals.map(x=><option key={x.id} value={x.id}>{x.nome}</option>)}
      </HealthRelationPicker></Field>
      <Field label="Outro local (opcional)"><HealthRelationPicker title="Escolher local" kind="place" value={localId} onValueChange={v=>{setLocalId(v);if(v)setHospitalId('');}} className={field}>
       <option value="">Não informado</option>{data?.locations.map(x=><option key={x.id} value={x.id}>{x.nome}</option>)}
      </HealthRelationPicker></Field>
     </div>
     <Field label={status==='planned'?'Dia previsto (opcional, não confirma admissão)':'Dia real da admissão (se conhecido)'}>
      <CustomDatePicker value={status==='planned'?plannedOn:admittedOn} onChange={status==='planned'?setPlannedOn:setAdmittedOn}/></Field>
     <Field label="Observações (opcionais)"><textarea value={note} onChange={e=>setNote(e.target.value)} rows={3} maxLength={1500} className={field}/></Field>
     <button type="submit" className={`${cta} w-full`} disabled={busy}><Save size={17}/>{busy?'Registrando…':'Registrar internação'}</button>
    </form>
   </section>}
   {view==='edit'&&selected&&<section className={box}>{formHeader}<form className="space-y-3" onSubmit={e=>void edit(e)}>
    <Field label="Motivo informado"><input value={reason} onChange={e=>setReason(e.target.value)} maxLength={400} className={field}/></Field>
    {selected.status==='planned'&&<Field label="Data prevista"><CustomDatePicker value={plannedOn} onChange={setPlannedOn}/></Field>}
    <Field label="Observações"><textarea className={field} rows={3} value={note} onChange={e=>setNote(e.target.value)}/></Field>
    <button className={`${cta} w-full`} disabled={busy} type="submit"><Save size={17}/>Salvar alterações</button>
   </form></section>}
   {view==='details'&&selected&&<>
    <section className={box}>
     <div className="flex items-start gap-3"><Hospital className="mt-0.5 shrink-0 text-emerald-300" size={22}/><div className="min-w-0 flex-1">
      <h1 className="break-words text-base font-bold">{selected.reason||'Motivo não informado'}</h1>
      <p className="mt-1 text-xs text-ink-muted">{A5_STATUS_LABEL[selected.status]} · {facility(selected)}</p>
      <p className="mt-1 text-xs text-ink-muted">{A5_SOURCE_LABEL[selected.reason_source]}</p>
     </div></div>
     <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-ink-muted"><span>Prevista: {displayDayA5(selected.planned_admission_on)}</span>
      <span>Admissão: {displayDayA5(selected.admitted_on)}</span><span>Saída: {displayDayA5(selected.discharged_on)}</span>
      <span>Relações explícitas: {linked.length}</span></div>
     {selected.note&&<p className="mt-3 whitespace-pre-wrap break-words text-xs text-ink-muted">{selected.note}</p>}
     <button type="button" onClick={()=>go(`/saude/internacoes/editar?id=${encodeURIComponent(selected.id)}`)} className={`${soft} mt-3`}>Editar dados <ChevronRight size={15}/></button>
     {!selected.synced&&<p className="mt-2 text-[11px] text-amber-200">Registro local ainda pendente de sincronização.</p>}
    </section>
    {selected.status!=='discharged'&&selected.status!=='cancelled'&&<section className={box}>
     <h2 className="text-sm font-bold">Atualizar situação informada</h2>
     <p className="mt-1 text-[11px] text-ink-muted">As mudanças não são feitas pelo relógio. Confirme explicitamente o estado real.</p>
     <div className="mt-2 flex flex-wrap gap-2">
      {(selected.status==='planned'?[{key:'admitted',label:'Confirmar admissão'},{key:'cancelled',label:'Cancelar planejamento'}]:
       selected.status==='admitted'?[{key:'on_leave',label:'Ausência temporária'}]:[{key:'admitted',label:'Retorno informado'}]).map(item=><button type="button" className={soft} key={item.key} onClick={()=>setConfirmStatus(item.key)}>{item.label}</button>)}
     </div>
     {confirmStatus&&<div className="mt-3 rounded-xl border border-amber-300/30 p-3 text-xs">
      <p>Confirmar a situação <strong>{A5_STATUS_LABEL[confirmStatus as keyof typeof A5_STATUS_LABEL]}</strong>? Nenhuma admissão ou alta será inferida.</p>
      {confirmStatus==='admitted'&&selected.status==='planned'&&<div className="mt-2"><span className="block text-xs text-ink-muted">Data real da admissão, se conhecida</span><CustomDatePicker value={admittedOn} onChange={setAdmittedOn}/></div>}
      <div className="mt-2 flex flex-wrap gap-2"><button type="button" disabled={busy} className={cta} onClick={()=>void perform(
       ()=>updateHospitalizationA5({personId:pid,id:selected.id,status:confirmStatus as 'admitted'|'on_leave'|'cancelled',admittedOn:confirmStatus==='admitted'&&selected.status==='planned'?admittedOn:undefined}),
       'Situação declarada atualizada.',()=>{setConfirmStatus('');setAdmittedOn('');})}>Confirmar</button>
       <button type="button" className={soft} onClick={()=>setConfirmStatus('')}>Voltar</button></div>
     </div>}
    </section>}
    <section className={box}>
     <h2 className="flex items-center gap-2 text-sm font-bold"><History size={18} className="text-emerald-300"/>Linha do tempo factual</h2>
     <p className="mt-1 text-[11px] text-ink-muted">Eventos com data desconhecida mostram o dia de cadastro separadamente, sem inventar horário clínico.</p>
     {timeline.length===0?<p className="mt-2 text-xs text-ink-muted">Sem evolução ou movimentação informada.</p>:<ol className="mt-2 space-y-2">{timeline.map(x=><li key={x.key} className="rounded-xl border border-surface-border/70 p-2.5 text-xs">
      <strong className="block">{x.title}</strong><p className="mt-1 whitespace-pre-wrap break-words text-ink-muted">{x.subtitle}</p></li>)}</ol>}
    </section>
    <section className={box}>
     <h2 className="flex items-center gap-2 text-sm font-bold"><Building2 size={18} className="text-sky-300"/>Permanências e setores</h2>
     {stays.length===0?<p className="mt-2 text-xs text-ink-muted">Nenhum setor foi informado.</p>:stays.map(s=><div className="mt-2 rounded-xl border border-surface-border p-2.5 text-xs" key={s.id}>
      <strong>{A5_UNIT_LABEL[s.unit_type]}</strong><p className="mt-1 text-ink-muted">{displayDayA5(s.entered_on)} até {displayDayA5(s.left_on)}</p>
      {s.ward_label&&<p className="text-ink-muted">{s.ward_label}</p>}
      {!s.left_on&&<div className="mt-2">
       {closeStayId!==s.id?<button type="button" className={soft} onClick={()=>{setCloseStayId(s.id);setCloseStayOn('');}}>Informar saída deste setor <ChevronRight size={15}/></button>:
       <div className="space-y-2"><p className="text-[11px] text-ink-muted">Data de saída declarada, apenas deste setor</p>
        <CustomDatePicker value={closeStayOn} onChange={setCloseStayOn}/>
        <div className="flex flex-wrap gap-2"><button type="button" className={cta} disabled={!closeStayOn||busy} onClick={()=>void perform(
         ()=>finishHospitalizationStayA5({personId:pid,id:s.id,leftOn:closeStayOn}),'Setor encerrado; histórico preservado.',()=>{setCloseStayId('');setCloseStayOn('');})}>Salvar saída do setor</button>
        <button type="button" className={soft} onClick={()=>{setCloseStayId('');setCloseStayOn('');}}>Cancelar</button></div>
       </div>}
      </div>}
     </div>)}
     <details className="mt-3 rounded-xl border border-surface-border"><summary className="flex min-h-11 cursor-pointer items-center justify-between px-3 py-2 text-xs font-bold">Adicionar setor <Plus size={16}/></summary>
      <form className="space-y-3 border-t border-surface-border p-3" onSubmit={e=>void submitStay(e)}>
       <Field label="Setor"><Selector title="Tipo de setor" value={unit} onChange={setUnit} options={units}/></Field>
       <Field label="Dia de entrada, se conhecido"><CustomDatePicker value={stayOn} onChange={setStayOn}/></Field>
       <Field label="Ala informada"><input className={field} maxLength={160} value={ward} onChange={e=>setWard(e.target.value)}/></Field>
       <Field label="Leito informado"><input className={field} maxLength={80} value={bed} onChange={e=>setBed(e.target.value)}/></Field>
       <button type="submit" className={cta} disabled={busy}>Registrar setor</button>
      </form></details>
    </section>
    <section className={box}>
     <h2 className="flex items-center gap-2 text-sm font-bold"><Stethoscope size={18} className="text-sky-300"/>Equipe vinculada</h2>
     {team.length===0?<p className="mt-2 text-xs text-ink-muted">Nenhum profissional informado.</p>:team.map(t=><div key={t.id} className="mt-2 rounded-xl border border-surface-border p-2.5 text-xs">
      <strong>{data?.professionals.find(p=>p.id===t.professional_id)?.nome||'Profissional vinculado'}</strong><p className="text-ink-muted">{t.role} · {A5_SOURCE_LABEL[t.source]}</p></div>)}
     <details className="mt-3 rounded-xl border border-surface-border"><summary className="flex min-h-11 cursor-pointer items-center justify-between px-3 py-2 text-xs font-bold">Vincular profissional <UserPlus size={16}/></summary>
      <form className="space-y-3 border-t border-surface-border p-3" onSubmit={e=>void submitTeam(e)}>
       <Field label="Profissional cadastrado"><HealthRelationPicker title="Profissional" kind="doctor" value={professional} onValueChange={setProfessional} className={field}>
        <option value="">Selecionar</option>{data?.professionals.map(x=><option key={x.id} value={x.id}>{x.nome}</option>)}
       </HealthRelationPicker></Field>
       <Field label="Função declarada"><input className={field} maxLength={120} value={role} onChange={e=>setRole(e.target.value)} placeholder="Ex.: médico assistente"/></Field>
       <button type="submit" disabled={!professional||!role.trim()||busy} className={cta}>Vincular equipe</button>
      </form></details>
    </section>
    <section className={box}>
     <h2 className="flex items-center gap-2 text-sm font-bold"><ClipboardList size={18} className="text-amber-300"/>Diário e correções</h2>
     {eventRows.length===0?<p className="mt-2 text-xs text-ink-muted">Nenhum fato adicional foi declarado.</p>:eventRows.map(e=><article key={e.id} className="mt-2 rounded-xl border border-surface-border p-2.5 text-xs">
      <strong>{A5_EVENT_LABEL[e.kind]}</strong><p className="mt-1 whitespace-pre-wrap break-words">{e.summary}</p>
      <p className="mt-1 text-ink-muted">Data clínica: {displayDayA5(e.occurred_on)} · {A5_SOURCE_LABEL[e.source]}</p></article>)}
     <details className="mt-3 rounded-xl border border-surface-border"><summary className="flex min-h-11 cursor-pointer items-center justify-between px-3 py-2 text-xs font-bold">Registrar fato <Plus size={16}/></summary>
      <form className="space-y-3 border-t border-surface-border p-3" onSubmit={e=>void submitEvent(e)}>
       <Field label="Natureza do fato"><Selector title="Tipo de evento" value={eventKind} onChange={setEventKind} options={events}/></Field>
       {eventKind==='correction'&&<Field label="Qual evento está sendo corrigido?"><HealthRelationPicker title="Fato original" value={correctionId} onValueChange={setCorrectionId} className={field}>
        <option value="">Selecionar evento</option>{eventRows.map(e=><option value={e.id} key={e.id}>{A5_EVENT_LABEL[e.kind]} · {displayDayA5(e.occurred_on)}</option>)}
       </HealthRelationPicker></Field>}
       <Field label="Descrição factual"><textarea required className={field} rows={3} maxLength={1000} value={eventSummary} onChange={e=>setEventSummary(e.target.value)} placeholder="Descreva somente o que foi informado"/></Field>
       <Field label="Dia clínico, se informado"><CustomDatePicker value={eventOn} onChange={setEventOn}/></Field>
       <button type="submit" disabled={busy||!eventSummary.trim()||(eventKind==='correction'&&!correctionId)} className={cta}>Registrar no diário</button>
      </form></details>
    </section>
    <section className={box}>
     <h2 className="flex items-center gap-2 text-sm font-bold"><Link2 size={18} className="text-sky-300"/>Relações clínicas por ID</h2>
     <p className="mt-1 text-[11px] text-ink-muted">{linked.length} {linked.length===1?'relação explícita':'relações explícitas'} — nenhuma foi deduzida por nome ou data.</p>
      {selected && linked.some(l=>l.entity_type==='cirurgia'&&data?.cirurgias.some(c=>c.id===l.entity_id))&&<button type="button" className={`${soft} mt-2 w-full text-emerald-300`} onClick={()=>{trigger('vibrate');router.push(withReturnTarget(`/saude/cirurgias/jornada?internacao=${encodeURIComponent(selected.id)}`,detailPath(selected.id)));}}>Ver Jornada Cirúrgica vinculada</button>}
     {linked.map(l=><article key={l.id} className="mt-2 flex items-center gap-2 rounded-xl border border-surface-border p-2.5 text-xs">
      <div className="min-w-0 flex-1"><button type="button" className="inline-flex min-h-11 items-center gap-1 font-semibold" onClick={()=>go(pathTo(l.entity_type,l.entity_id))}>
       <span className="min-w-0 break-words">{nameOfRelation(l.entity_type,l.entity_id)}</span><ChevronRight size={15}/></button>
       <p className="text-ink-muted">{A5_ENTITY_LABEL[l.entity_type]} · {A5_SOURCE_LABEL[l.source]}</p></div>
      <button type="button" disabled={busy} className={`${soft} shrink-0`} aria-label="Desvincular deste episódio" onClick={()=>void perform(
       ()=>unlinkHospitalizationA5({personId:pid,id:l.id}),'Vínculo removido sem apagar o cadastro original.')}>Desvincular</button>
     </article>)}
     <details className="mt-3 rounded-xl border border-surface-border"><summary className="flex min-h-11 cursor-pointer items-center justify-between px-3 py-2 text-xs font-bold">Vincular registro existente <Plus size={16}/></summary>
      <form className="space-y-3 border-t border-surface-border p-3" onSubmit={e=>void submitRelation(e)}>
       <Field label="Área clínica"><Selector title="Área" value={relationType} onChange={x=>{setRelationType(x);setRelationId('');}} options={entities}/></Field>
       <Field label="Registro da pessoa"><HealthRelationPicker title="Selecionar cadastro" value={relationId} onValueChange={setRelationId} className={field}>
        <option value="">Nenhum registro escolhido</option>{(relationOptions||[]).map(x=>x.id ? <option key={x.id} value={x.id}>
         {nameOfRelation(relationType,x.id)}</option> : null)}
       </HealthRelationPicker></Field>
       <Field label="Finalidade"><Selector title="Papel do vínculo" value={relationRole} onChange={setRelationRole} options={roles}/></Field>
       <button type="submit" disabled={busy||!relationId} className={cta}>Vincular registro</button>
      </form></details>
    </section>
    <HospitalizationA5Documents hospitalizationId={selected.id}/>
    <section className={box}>
     <h2 className="flex items-center gap-2 text-sm font-bold"><HeartHandshake size={18} className="text-emerald-300"/>Alta e continuidade</h2>
     {discharge?<div className="mt-2 space-y-2 text-xs"><p>Destino: {A5_DISPOSITION_LABEL[discharge.disposition]}</p>
      <p>Revisão de medicamentos: {A5_RECON_LABEL[discharge.medication_reconciliation_status]}</p>
      {discharge.summary&&<p className="whitespace-pre-wrap break-words text-ink-muted">{discharge.summary}</p>}
      {discharge.instructions&&<p className="whitespace-pre-wrap break-words text-ink-muted">{discharge.instructions}</p>}
      {discharge.followup_plan&&<p className="whitespace-pre-wrap break-words text-ink-muted">Seguimento informado: {discharge.followup_plan}</p>}
      <p className="text-ink-muted">{A5_SOURCE_LABEL[discharge.source]}</p></div>:
      selected.status==='admitted'||selected.status==='on_leave'?<details className="mt-3 rounded-xl border border-surface-border">
       <summary className="flex min-h-11 cursor-pointer items-center justify-between px-3 py-2 text-xs font-bold">Registrar alta ou saída <ChevronRight size={16}/></summary>
       <form className="space-y-3 border-t border-surface-border p-3" onSubmit={e=>void submitDischarge(e)}>
        <p className="text-[11px] text-ink-muted">Este registro não é prescrição. Não altera estoque, doses, medicamentos nem transforma seguimento previsto em consulta realizada.</p>
        <Field label="Destino declarado"><Selector title="Destino" value={disposition} onChange={setDisposition} options={destinations}/></Field>
        <Field label="Dia real da saída, se conhecido"><CustomDatePicker value={dischargedOn} onChange={setDischargedOn}/></Field>
        <Field label="Resumo, se fornecido"><textarea rows={3} value={dischargeSummary} maxLength={2500} onChange={e=>setDischargeSummary(e.target.value)} className={field}/></Field>
        <Field label="Orientações documentadas, se houver"><textarea rows={2} value={dischargeInstructions} maxLength={2500} onChange={e=>setDischargeInstructions(e.target.value)} className={field}/></Field>
        <Field label="Seguimento planejado, não realizado"><textarea rows={2} value={dischargeFollowup} maxLength={1500} onChange={e=>setDischargeFollowup(e.target.value)} className={field}/></Field>
        <Field label="Reconciliação de medicamentos"><Selector title="Situação da revisão" value={reconciliation} onChange={setReconciliation} options={reconciliations}/></Field>
        <label className="flex min-h-11 items-center gap-2 text-xs"><input type="checkbox" checked={ackDischarge} onChange={e=>setAckDischarge(e.target.checked)} className="accent-emerald-400"/>
         Confirmo que estou registrando uma saída informada, sem deduzir fatos.</label>
        <button type="submit" disabled={!ackDischarge||busy} className={`${cta} w-full`}><CheckCircle2 size={17}/>Registrar saída</button>
       </form></details>:<p className="mt-2 text-xs text-ink-muted">Alta disponível após uma admissão registrada explicitamente.</p>}
    </section>
   </>}
   {(view==='details'||view==='edit')&&!selected&&<p role="alert" className={box}>Registro não encontrado na pessoa ativa.</p>}
   {message&&<p className="rounded-xl border border-surface-border p-3 text-xs text-ink-muted" role="status">{message}</p>}
   <p className="flex items-start gap-2 text-[11px] leading-5 text-ink-muted"><FileText size={15} className="mt-0.5 shrink-0"/>
    Dados restritos à pessoa ativa. A ausência de histórico não significa ausência de cuidado, diagnóstico ou internação.</p>
  </div>
 </main>;
}
