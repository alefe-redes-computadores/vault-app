'use client';
/** Clinical authoring for a selected canonical surgery. No duplicate surgery/admission authority. */
import {useEffect,useMemo,useState} from 'react';
import Link from 'next/link';
import {useLiveQuery} from 'dexie-react-hooks';
import {ArrowUpRight,Check,ClipboardList,FilePenLine,Plus,ShieldCheck,Stethoscope,Trash2,Users} from 'lucide-react';
import {db} from '@/lib/db';
import {useAuth} from '@/hooks/useAuth';
import {useActivePersonId} from '@/hooks/useActivePersonId';
import {useToast} from '@/components/ToastProvider';
import {CustomDatePicker} from '@/components/DatePicker';
import {HealthRelationPicker} from '@/components/saude/HealthRelationPicker';
import {addSurgeryJourneyEventA7,linkSurgeryTeamA7,unlinkSurgeryTeamA7} from '@/lib/surgery-a7/repository';
import {A7_EVENT_LABEL,A7_SOURCE_LABEL,displayDayA7,type A7EventKind,type A7Source} from '@/lib/surgery-a7/types';
const card='rounded-[22px] border border-surface-border/70 bg-surface p-4 sm:p-5';
const field='min-h-12 w-full rounded-xl border border-surface-border bg-surface-raised px-3 py-3 text-sm text-ink-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-300';
const SOURCE_VALUES:readonly A7Source[]=['self_report','professional_document'];
const KINDS:readonly A7EventKind[]=['preparation_note','procedure_note','recovery_note','return_note','correction'];
export function SurgeryA7RecordsPanel({surgeryId}:{surgeryId:string}){
 const {user}=useAuth();const {activePersonId}=useActivePersonId();const toast=useToast();const uid=user?.id||'',pid=activePersonId||'',scope=`${uid}:${pid}`;
 const [open,setOpen]=useState(false),[kind,setKind]=useState<A7EventKind>('preparation_note'),[source,setSource]=useState<A7Source>('self_report');
 const [title,setTitle]=useState(''),[detail,setDetail]=useState(''),[day,setDay]=useState(''),[professional,setProfessional]=useState(''),[corrects,setCorrects]=useState('');
 const [teamOpen,setTeamOpen]=useState(false),[teamProfessional,setTeamProfessional]=useState(''),[teamRole,setTeamRole]=useState(''),[teamSource,setTeamSource]=useState<A7Source>('self_report'),[teamNote,setTeamNote]=useState('');
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 const [focusEvent,setFocusEvent]=useState(''),[confirmUnlink,setConfirmUnlink]=useState('');
 useEffect(()=>{setOpen(false);setKind('preparation_note');setSource('self_report');setTitle('');setDetail('');setDay('');setProfessional('');setCorrects('');setTeamOpen(false);setTeamProfessional('');setTeamRole('');setTeamSource('self_report');setTeamNote('');setError('');setFocusEvent('');setConfirmUnlink('');},[scope,surgeryId]);
 const data=useLiveQuery(async()=>{
  if(!uid||!pid||!surgeryId)return null;
  const [person,surgery,events,team,professionals]=await Promise.all([
   db.persons.get(pid),db.cirurgias.get(surgeryId),db.surgery_journey_events_a7.where('cirurgia_id').equals(surgeryId).toArray(),
   db.surgery_team_a7.where('cirurgia_id').equals(surgeryId).toArray(),db.medicos.where('user_id').equals(uid).toArray()]);
  if(person?.user_id!==uid||surgery?.user_id!==uid||surgery?.person_id!==pid)return null;
  return {scope,events:events.filter(x=>x.user_id===uid&&x.person_id===pid&&!x.deleted_at),
   team:team.filter(x=>x.user_id===uid&&x.person_id===pid&&!x.deleted_at),
   professionals:professionals.filter(x=>x.user_id===uid&&x.id)};
 },[uid,pid,surgeryId]);
 const events=useMemo(()=>data?.scope===scope?data.events:[],[data,scope]);
 const team=useMemo(()=>data?.scope===scope?data.team:[],[data,scope]);
 useEffect(()=>{if(!focusEvent||!events.some(e=>e.id===focusEvent))return;document.getElementById(`a7-event-${focusEvent}`)?.scrollIntoView({block:'nearest',behavior:'auto'});setFocusEvent('');},[events,focusEvent]);
 const professionals=useMemo(()=>data?.scope===scope?data.professionals:[],[data,scope]);
 const byId=useMemo(()=>new Map(professionals.map(x=>[x.id!,x.nome])),[professionals]);
 const saveEvent=async()=>{
  if(busy||!pid||!surgeryId)return;setBusy(true);setError('');
  try{
   const id=await addSurgeryJourneyEventA7({personId:pid,surgeryId,kind,source,title,description:detail,occurredOn:day||null,
    professionalId:professional||null,correctsEventId:kind==='correction'?corrects:null});
   setTitle('');setDetail('');setDay('');setProfessional('');setCorrects('');setKind('preparation_note');setSource('self_report');setOpen(false);
   toast.showSuccess('Registro salvo localmente. Sincronização pela fila protegida.');
   setFocusEvent(id);
  }catch(e){const msg=e instanceof Error?e.message:'Não foi possível registrar o fato.';setError(msg);toast.showError(msg);}finally{setBusy(false);}
 };
 const saveTeam=async()=>{
  if(busy||!pid||!teamProfessional||!teamRole.trim())return;setBusy(true);setError('');
  try{await linkSurgeryTeamA7({personId:pid,surgeryId,professionalId:teamProfessional,role:teamRole,source:teamSource,note:teamNote});
   setTeamOpen(false);setTeamProfessional('');setTeamRole('');setTeamNote('');setTeamSource('self_report');toast.showSuccess('Participação registrada para esta cirurgia.');}
  catch(e){const msg=e instanceof Error?e.message:'Não foi possível registrar a equipe.';setError(msg);toast.showError(msg);}finally{setBusy(false);}
 };
 const unlink=async(id:string)=>{
  if(busy||!pid)return;setBusy(true);setError('');
  try{await unlinkSurgeryTeamA7({personId:pid,teamId:id});setConfirmUnlink('');toast.showSuccess('Vínculo encerrado, com histórico preservado.');}
  catch(e){const msg=e instanceof Error?e.message:'Não foi possível desvincular.';setError(msg);toast.showError(msg);}finally{setBusy(false);}
 };
 if(!uid||!pid||!data||data.scope!==scope)return null;
 return <div className="space-y-4">
  <section className={`${card} space-y-3`} aria-label="Registros da jornada cirúrgica">
   <div className="flex min-w-0 items-start gap-2"><ClipboardList className="mt-0.5 shrink-0 text-emerald-300" size={20}/><div className="min-w-0 flex-1"><h2 className="text-sm font-bold text-ink-primary">Acompanhamento da cirurgia</h2><p className="mt-1 text-xs leading-5 text-ink-muted">Registre fatos documentados ou relatos. Datas e etapas não comprovam liberação, alta, melhora ou realização da cirurgia.</p></div></div>
   {events.length===0?<p className="text-xs text-ink-muted">Nenhum fato adicional registrado nesta jornada.</p>:<div className="space-y-2">{[...events].sort((a,b)=>(b.occurred_on||b.created_at).localeCompare(a.occurred_on||a.created_at)).map(x=><article id={`a7-event-${x.id}`} key={x.id} className="rounded-xl border border-surface-border/70 bg-surface-raised/60 p-3">
    <div className="flex min-w-0 items-start gap-2"><Check size={16} className="mt-0.5 shrink-0 text-emerald-300"/><div className="min-w-0 flex-1"><p className="text-[11px] font-semibold text-emerald-200">{A7_EVENT_LABEL[x.kind]} · {A7_SOURCE_LABEL[x.source]}</p><h3 className="mt-1 break-words text-sm font-bold text-ink-primary">{x.title}</h3><p className="mt-1 whitespace-pre-wrap break-words text-xs leading-5 text-ink-secondary">{x.description}</p><p className="mt-2 text-[11px] text-ink-muted">{displayDayA7(x.occurred_on)}{x.source_professional_id&&byId.has(x.source_professional_id)?` · ${byId.get(x.source_professional_id)}`:''}{x.corrects_event_id?' · Retificação referenciada':''}</p></div></div>
   </article>)}</div>}
   <button type="button" onClick={()=>{setOpen(v=>!v);setError('');}} aria-expanded={open} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-400 px-3 text-xs font-bold text-slate-950"><Plus size={17}/>{open?'Fechar novo registro':'Registrar fato da jornada'}</button>
   {open&&<div className="space-y-3 rounded-xl border border-surface-border bg-void/25 p-3" aria-label="Novo fato cirúrgico">
    <div><p className="mb-2 text-xs font-bold text-ink-primary">Qual fato você deseja documentar?</p><div className="grid grid-cols-2 gap-2">{KINDS.map(value=><button key={value} type="button" aria-pressed={kind===value} onClick={()=>{setKind(value);setCorrects('');}} className={`min-h-11 rounded-xl border px-2 py-2 text-[11px] font-semibold ${kind===value?'border-emerald-300/60 bg-emerald-300/10 text-emerald-200':'border-surface-border text-ink-secondary'}`}>{A7_EVENT_LABEL[value]}</button>)}</div></div>
    {kind==='correction'&&<HealthRelationPicker title="Selecione o fato original a retificar" value={corrects} onValueChange={setCorrects} className={field}><option value="">Escolha um registro original…</option>{events.filter(x=>x.kind!=='correction').map(x=><option key={x.id} value={x.id}>{x.title} · {displayDayA7(x.occurred_on)}</option>)}</HealthRelationPicker>}
    <label className="block text-xs font-semibold text-ink-primary">Título do fato<input value={title} onChange={e=>setTitle(e.target.value)} maxLength={170} placeholder="O que foi registrado?" className={`mt-1 ${field}`}/></label>
    <label className="block text-xs font-semibold text-ink-primary">Descrição documentada<textarea value={detail} onChange={e=>setDetail(e.target.value)} maxLength={4000} rows={4} placeholder="Descreva somente o que consta no documento ou o que foi informado…" className={`mt-1 ${field}`}/></label>
    <CustomDatePicker label="Data do fato (opcional)" value={day} onChange={setDay} placeholder="Selecionar data documentada"/>
    <div><p className="mb-1 text-xs font-semibold text-ink-primary">Origem da informação</p><div className="grid gap-2 sm:grid-cols-3">{SOURCE_VALUES.map(value=><button key={value} type="button" aria-pressed={source===value} onClick={()=>setSource(value)} className={`min-h-11 rounded-xl border px-2 text-[11px] ${source===value?'border-emerald-300/60 bg-emerald-300/10 text-emerald-200':'border-surface-border text-ink-secondary'}`}>{A7_SOURCE_LABEL[value]}</button>)}</div></div>
    <div><p className="mb-1 text-xs font-semibold text-ink-primary">Profissional associado (opcional)</p><HealthRelationPicker title="Selecionar profissional" kind="doctor" value={professional} onValueChange={setProfessional} className={field}><option value="">Não vincular profissional</option>{professionals.map(x=><option key={x.id} value={x.id}>{x.nome}</option>)}</HealthRelationPicker></div>
    <p className="text-[11px] leading-5 text-ink-muted">Após salvar, o fato histórico não é sobrescrito. Para corrigir uma informação, registre uma retificação vinculada.</p>
    <button type="button" disabled={busy||!title.trim()||!detail.trim()||(kind==='correction'&&!corrects)} onClick={()=>void saveEvent()} className="min-h-12 w-full rounded-xl bg-emerald-400 px-4 text-xs font-bold text-slate-950 disabled:opacity-40">{busy?'Salvando…':'Salvar fato da jornada'}</button>
   </div>}
  </section>
  <section className={`${card} space-y-3`} aria-label="Equipe do procedimento">
   <div className="flex items-start gap-2"><Users size={20} className="mt-0.5 text-sky-300"/><div><h2 className="text-sm font-bold">Profissionais do procedimento</h2><p className="mt-1 text-xs leading-5 text-ink-muted">Esta equipe é específica da cirurgia e não é deduzida da equipe hospitalar da internação.</p></div></div>
   {team.length===0?<p className="text-xs text-ink-muted">Nenhum profissional associado à equipe desta cirurgia.</p>:team.map(row=><div key={row.id} className="flex min-w-0 items-start gap-2 rounded-xl border border-surface-border bg-surface-raised/65 p-3"><Stethoscope size={16} className="mt-0.5 shrink-0 text-sky-300"/><div className="min-w-0 flex-1"><p className="break-words text-xs font-bold">{byId.get(row.professional_id)||'Profissional cadastrado'}</p><p className="mt-1 text-[11px] text-ink-secondary">{row.role} · {A7_SOURCE_LABEL[row.source]}</p>{row.note&&<p className="mt-1 whitespace-pre-wrap break-words text-xs text-ink-muted">{row.note}</p>}<Link href={`/saude/medicos/detalhes?id=${encodeURIComponent(row.professional_id)}`} className="mt-2 inline-flex min-h-10 items-center gap-1 text-xs text-sky-300">Abrir cadastro <ArrowUpRight size={13}/></Link></div><div className="flex shrink-0 flex-col items-end gap-2">{confirmUnlink===row.id?<><p className="max-w-32 text-right text-[11px] text-amber-200">Desvincular esta participação?</p><button type="button" disabled={busy} onClick={()=>void unlink(row.id)} className="min-h-11 rounded-xl border border-amber-300/40 px-3 text-xs text-amber-200 disabled:opacity-40">Confirmar</button><button type="button" onClick={()=>setConfirmUnlink('')} className="min-h-11 rounded-xl border border-surface-border px-3 text-xs text-ink-secondary">Cancelar</button></>:<button type="button" disabled={busy} aria-label={`Desvincular ${row.role}`} onClick={()=>setConfirmUnlink(row.id)} className="grid size-11 place-items-center rounded-xl border border-surface-border text-coral disabled:opacity-40"><Trash2 size={16}/></button>}</div></div>)}
   <button type="button" aria-expanded={teamOpen} onClick={()=>setTeamOpen(x=>!x)} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-emerald-300/30 text-xs font-semibold text-emerald-300"><Plus size={16}/>{teamOpen?'Fechar vínculo':'Vincular profissional existente'}</button>
   {teamOpen&&<div className="space-y-3 rounded-xl border border-surface-border bg-void/25 p-3"><HealthRelationPicker title="Selecionar profissional" kind="doctor" value={teamProfessional} onValueChange={setTeamProfessional} className={field}><option value="">Escolha um profissional…</option>{professionals.map(x=><option key={x.id} value={x.id}>{x.nome}</option>)}</HealthRelationPicker>
    <label className="block text-xs font-semibold">Função documentada<input value={teamRole} onChange={e=>setTeamRole(e.target.value)} maxLength={120} placeholder="Cirurgião, anestesista, instrumentação…" className={`mt-1 ${field}`}/></label>
    <label className="block text-xs font-semibold">Observação (opcional)<textarea value={teamNote} onChange={e=>setTeamNote(e.target.value)} maxLength={1200} rows={2} className={`mt-1 ${field}`}/></label>
    <p className="text-xs font-semibold">Origem da informação</p><div className="grid gap-2 sm:grid-cols-3">{SOURCE_VALUES.map(value=><button type="button" key={value} onClick={()=>setTeamSource(value)} aria-pressed={teamSource===value} className={`min-h-11 rounded-xl border px-2 text-[11px] ${teamSource===value?'border-emerald-300 bg-emerald-300/10 text-emerald-200':'border-surface-border text-ink-muted'}`}>{A7_SOURCE_LABEL[value]}</button>)}</div>
    <button type="button" disabled={busy||!teamProfessional||!teamRole.trim()} onClick={()=>void saveTeam()} className="min-h-12 w-full rounded-xl bg-emerald-400 text-xs font-bold text-slate-950 disabled:opacity-40">Salvar participação</button>
   </div>}
   <p className="flex gap-2 text-[11px] text-ink-muted"><ShieldCheck size={14} className="shrink-0"/>Desvincular não exclui o profissional cadastrado e preserva o histórico de desvinculação na sincronização.</p>
  </section>
  {error&&<p role="alert" className="rounded-xl border border-coral/30 bg-coral/5 p-3 text-xs text-coral">{error}</p>}
 </div>;
}
