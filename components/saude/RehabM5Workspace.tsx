'use client';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ListPageHeader } from '@/components/list/ListPageHeader';
import { useHapticFeedback } from '@/lib/haptics';
import { RehabM5PremiumSections } from '@/components/saude/RehabM5PremiumSections';
import { HospitalizationA5ReverseLinks } from '@/components/saude/HospitalizationA5ReverseLinks';
import { withReturnTarget } from '@/lib/navigation/return-context';
import { useLiveQuery } from 'dexie-react-hooks';
import { Activity, ArrowLeft, ArrowRight, CalendarClock, Check, ClipboardList,
 HeartHandshake, Link2, Plus, RefreshCw, ShieldCheck, UserRoundPlus, X, LayoutList, Rows3 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { CustomDatePicker } from '@/components/DatePicker';
import { HealthDateTimePicker } from '@/components/saude/HealthDateTimePicker';
import { HealthRelationPicker } from '@/components/saude/HealthRelationPicker';
import { useActivePersonId } from '@/hooks/useActivePersonId';
import { db } from '@/lib/db';
import { createRehabProgramM5, updateRehabProgramM5, assignRehabProfessionalM5,
 scheduleRehabSessionM5, changeRehabSessionM5, addRehabSessionProfessionalM5,
 addRehabOriginM5, unlinkRehabOriginM5 } from '@/lib/rehab-m5/repository';
import { REHAB_PROGRAM_STATES_M5, REHAB_SESSION_STATES_M5, type RehabOriginType,
 type RehabSessionMode, type RehabSessionStatus } from '@/lib/rehab-m5/types';

type View='list'|'new'|'details'|'edit';
const panel='rounded-2xl border border-teal-300/15 bg-surface-raised/85 p-4 shadow-sm';
const field='min-h-11 w-full rounded-xl border border-surface-border bg-surface px-3 py-2 text-sm text-ink-primary outline-none focus-visible:ring-2 focus-visible:ring-teal-400';
const primary='inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-teal-400 px-4 py-2 text-sm font-bold text-slate-950 disabled:opacity-50';
const secondary='inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-surface-border bg-surface px-3 py-2 text-sm text-ink-primary disabled:opacity-50';
const legend='mb-1 block text-xs font-semibold text-ink-muted';
const date=(d?:string|null)=>d?new Date(d).toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'}):'Não informado';
function Field({label,children}:{label:string;children:React.ReactNode}){return <fieldset className="min-w-0"><legend className={legend}>{label}</legend>{children}</fieldset>}
export function RehabM5Workspace({view,selectedId}:{view:View;selectedId?:string}){
 const router=useRouter();const searchParams=useSearchParams();const {trigger}=useHapticFeedback();const {user,loading}=useAuth();const {activePersonId}=useActivePersonId();
 const uid=user?.id||'',personId=activePersonId||'';
 const scope=`${uid}:${personId}`;
 const [title,setTitle]=useState(''),[specialty,setSpecialty]=useState(''),[goal,setGoal]=useState('');
 const [density,setDensity]=useState<'compact'|'comfort'>('compact');
 const [start,setStart]=useState(''),[expectedEnd,setExpectedEnd]=useState('');
 const [professional,setProfessional]=useState(''),[role,setRole]=useState('Fisioterapeuta');
 const [sessionAt,setSessionAt]=useState(''),[mode,setMode]=useState<RehabSessionMode>('clinic');
 const [location,setLocation]=useState(''),[placeNote,setPlaceNote]=useState('');
 const [originType,setOriginType]=useState<RehabOriginType>('consulta'),[originId,setOriginId]=useState('');
 const [eventSession,setEventSession]=useState('');
 const [rescheduleAt,setRescheduleAt]=useState(''),[sessionTeam,setSessionTeam]=useState(''),[sessionTeamId,setSessionTeamId]=useState('');
 const [editing,setEditing]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const go=(path:string)=>{trigger('vibrate');router.push(withReturnTarget(path,searchParams.get('return_to')||'/saude/reabilitacao'));};
 // Only render records for the active authenticated account and exact person.
 const info=useLiveQuery(async()=>{
  if(!uid||!personId)return {scope,programs:[],team:[],sessions:[],events:[],links:[],sessionTeam:[],professionals:[],clinics:[],hospitals:[],consultas:[],cirurgias:[],tratamentos:[]};
  const [person,programs,team,sessions,events,links,sessionTeam,professionals,clinics,hospitals,consultas,cirurgias,tratamentos]=await Promise.all([
   db.persons.get(personId),db.rehab_programs_m5.where('user_id').equals(uid).toArray(),
   db.rehab_program_team_m5.where('user_id').equals(uid).toArray(),
   db.rehab_sessions_m5.where('user_id').equals(uid).toArray(),
   db.rehab_session_events_m5.where('user_id').equals(uid).toArray(),
   db.rehab_origin_links_m5.where('user_id').equals(uid).toArray(),
   db.rehab_session_team_m5.where('user_id').equals(uid).toArray(),
   db.medicos.where('user_id').equals(uid).toArray(),db.locais.where('user_id').equals(uid).toArray(),
   db.hospitais.where('user_id').equals(uid).toArray(),db.consultas.where('user_id').equals(uid).toArray(),
   db.cirurgias.where('user_id').equals(uid).toArray(),db.tratamentos.where('user_id').equals(uid).toArray(),
  ]);
  if(person?.user_id!==uid)return {scope,programs:[],team:[],sessions:[],events:[],links:[],sessionTeam:[],professionals:[],clinics:[],hospitals:[],consultas:[],cirurgias:[],tratamentos:[]};
  const own=<T extends {person_id:string}>(rows:T[])=>rows.filter(r=>r.person_id===personId);
  return {scope,programs:own(programs).filter(x=>!x.deleted_at),team:own(team).filter(x=>!x.deleted_at),
   sessions:own(sessions).filter(x=>!x.deleted_at),events:own(events),links:own(links).filter(x=>!x.deleted_at),
   sessionTeam:own(sessionTeam).filter(x=>!x.deleted_at),professionals,clinics,hospitals,
   consultas:consultas.filter(x=>x.person_id===personId),cirurgias:cirurgias.filter(x=>x.person_id===personId),
   tratamentos:tratamentos.filter(x=>x.person_id===personId)};
 },[uid,personId]);
 const selected=info?.programs.find(p=>p.id===selectedId&&p.user_id===uid&&p.person_id===personId);
 useEffect(()=>{
  if(view==='edit'&&selected){setEditing(true);setTitle(selected.title);
    setSpecialty(selected.specialty||'');setGoal(selected.functional_goal||'');
    setExpectedEnd(selected.expected_end_date||'');}
 },[view,selected?.id,uid,personId]);
 const members=useMemo(()=>info?.team.filter(m=>m.program_id===selectedId)||[],[info?.team,selectedId]);
 const sessions=useMemo(()=>info?.sessions.filter(s=>s.program_id===selectedId).sort((a,b)=>a.scheduled_at.localeCompare(b.scheduled_at))||[],[info?.sessions,selectedId]);
 const links=useMemo(()=>info?.links.filter(l=>l.program_id===selectedId)||[],[info?.links,selectedId]);
 const choices=originType==='consulta'?info?.consultas:originType==='cirurgia'?info?.cirurgias:info?.tratamentos;
 const originDisplay=(type:RehabOriginType,id:string):string=>{
   if(type==='consulta'){
     const item=info?.consultas.find(x=>x.id===id);
     return item?`Consulta · ${item.especialidade||'Especialidade não informada'}`:'Consulta indisponível';
   }
   if(type==='cirurgia'){
     const item=info?.cirurgias.find(x=>x.id===id);
     return item?`Cirurgia · ${item.procedimento||'Procedimento não informado'}`:'Cirurgia indisponível';
   }
   const item=info?.tratamentos.find(x=>x.id===id);
   return item?`Tratamento · ${item.nome||'Sem título'}`:'Tratamento indisponível';
 };
 const action=async(run:()=>Promise<void>,success:string)=>{if(busy)return;setBusy(true);setMessage('');try{await run();setMessage(success);}catch(e){setMessage(e instanceof Error?e.message:'Não foi possível salvar.');}finally{setBusy(false);}};
 const create=(e:FormEvent)=>{e.preventDefault();void action(async()=>{
  const id=await createRehabProgramM5({personId,title,specialty,functionalGoal:goal,startDate:start||undefined,expectedEndDate:expectedEnd||undefined});
  const source=searchParams.get('origem_tipo'),sourceId=searchParams.get('origem_id');
  if((source==='cirurgia'||source==='consulta'||source==='tratamento')&&sourceId){
   await addRehabOriginM5({personId,programId:id,type:source,originId:sourceId});
  }
  go(`/saude/reabilitacao/detalhes?id=${encodeURIComponent(id)}`);
 },'Programa registrado localmente.');};
 if(loading||info===undefined||info.scope!==scope)return <main className="p-5 text-sm text-ink-muted" role="status">Carregando reabilitação…</main>;
 if(!uid||!personId)return <main className="p-5 text-sm text-ink-muted">Entre na sua conta e selecione uma pessoa para acessar Reabilitação 360.</main>;
 return <main className="mx-auto min-h-screen max-w-3xl space-y-4 bg-void px-4 pb-32 pt-5 text-ink-primary">
  <ListPageHeader title="Reabilitação 360" subtitle="Ciclos, sessões e evolução documentada" backUrl={view==='list'?'/saude/rede':'/saude/reabilitacao'}
    icon={<Activity size={18}/>} iconColor="text-teal-300" suppressCreate={view!=='list'} />
  {message&&<div role="status" className="rounded-xl border border-teal-300/20 bg-teal-400/10 p-3 text-xs text-ink-primary">{message}</div>}
  {view==='list'&&<>
   <section className={`${panel} flex items-center justify-between gap-3`}><div><p className="font-semibold">Programas de cuidado</p><p className="text-xs text-ink-muted">{info.programs.length===1?'1 ciclo registrado':`${info.programs.length} ciclos registrados`} desta pessoa</p></div>
   <button className={primary} onClick={()=>go('/saude/reabilitacao/novo')}><Plus size={17}/> Novo</button></section>
   {info.programs.length>0&&<div className="flex min-w-0 flex-wrap justify-end gap-2" role="group" aria-label="Densidade da lista">
    <button type="button" aria-pressed={density==='compact'} onClick={()=>{trigger('vibrate');setDensity('compact')}} className={`${secondary} ${density==='compact'?'border-teal-300/45 text-teal-200':''}`}><Rows3 size={16}/> Compacto</button>
    <button type="button" aria-pressed={density==='comfort'} onClick={()=>{trigger('vibrate');setDensity('comfort')}} className={`${secondary} ${density==='comfort'?'border-teal-300/45 text-teal-200':''}`}><LayoutList size={16}/> Conforto</button>
   </div>}
   {info.programs.length===0?<section className={panel}><Activity className="mb-2 text-teal-300"/><p className="font-semibold">Nenhum programa registrado</p><p className="mt-1 text-xs text-ink-muted">Crie um programa independente de cirurgia ou consulta. Somente dados informados por você serão registrados.</p></section>:
    info.programs.map(program=><button key={program.id} className={`flex w-full min-w-0 items-start gap-3 rounded-2xl border border-teal-300/15 bg-surface-raised/85 text-left shadow-sm ${density==='compact'?'p-3':'p-4'}`} onClick={()=>go(`/saude/reabilitacao/detalhes?id=${program.id}`)}>
     <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-teal-400/10 text-teal-300"><HeartHandshake size={20}/></span>
     <span className="min-w-0 flex-1"><strong className="block break-words text-sm">{program.title}</strong><span className="mt-1 block break-words text-xs text-ink-muted">{REHAB_PROGRAM_STATES_M5.find(x=>x.value===program.status)?.label} · {program.specialty||'Modalidade não informada'}</span>
       {density==='comfort'&&<span className="mt-2 block space-y-1 text-[11px] text-ink-muted"><span className="block break-words">{program.functional_goal||'Objetivo funcional ainda não informado'}</span><span className="block">{info.sessions.filter(s=>s.program_id===program.id&&s.status==='performed').length===1?'1 sessão realizada':`${info.sessions.filter(s=>s.program_id===program.id&&s.status==='performed').length} sessões realizadas`}</span></span>}</span><ArrowRight size={17} className="mt-1 shrink-0 text-ink-muted"/></button>)}
  </>}
  {view==='new'&&<form onSubmit={create} className={`${panel} space-y-3`}>
   <h2 className="font-semibold">Novo programa</h2>
   <Field label="Nome do programa *"><input required maxLength={120} className={field} value={title} onChange={e=>setTitle(e.target.value)} placeholder="Ex.: Fisioterapia funcional"/></Field>
   <Field label="Especialidade / modalidade declarada"><input className={field} maxLength={100} value={specialty} onChange={e=>setSpecialty(e.target.value)} placeholder="Ex.: Fisioterapia"/></Field>
   <Field label="Objetivo funcional informado"><textarea className={field} rows={3} maxLength={1000} value={goal} onChange={e=>setGoal(e.target.value)} placeholder="O que foi informado como objetivo"/></Field>
   <div className="grid gap-3 sm:grid-cols-2"><Field label="Início (se conhecido)"><CustomDatePicker value={start} onChange={setStart}/></Field>
   <Field label="Término previsto"><CustomDatePicker value={expectedEnd} onChange={setExpectedEnd}/></Field></div>
   <button disabled={busy} type="submit" className={`${primary} w-full`}><Check size={17}/> Criar programa</button>
  </form>}
  {(view==='details'||view==='edit')&&(!selected?<section className={panel}>Programa não encontrado nesta pessoa. <button className={secondary} onClick={()=>go('/saude/reabilitacao')}>Ver programas</button></section>:<>
   <section className={panel}><div className="flex items-start justify-between gap-2"><div><h2 className="text-lg font-bold break-words">{selected.title}</h2><p className="text-xs text-ink-muted">{selected.specialty||'Modalidade não informada'} · {REHAB_PROGRAM_STATES_M5.find(x=>x.value===selected.status)?.label}</p></div>
   <button className={secondary} onClick={()=>{setEditing(!editing);setTitle(selected.title);setSpecialty(selected.specialty||'');setGoal(selected.functional_goal||'');setExpectedEnd(selected.expected_end_date||'');}}>Editar</button></div>
   {selected.functional_goal&&<p className="mt-3 text-xs text-ink-muted"><span className="font-semibold text-ink-primary">Objetivo declarado:</span> {selected.functional_goal}</p>}
   {editing&&<form className="mt-4 space-y-2" onSubmit={e=>{e.preventDefault();void action(async()=>{await updateRehabProgramM5({personId,id:selected.id,title,specialty,functionalGoal:goal,expectedEndDate:expectedEnd||null});setEditing(false);},'Programa atualizado.');}}>
    <Field label="Nome"><input required className={field} value={title} onChange={e=>setTitle(e.target.value)}/></Field>
    <Field label="Especialidade"><input className={field} value={specialty} onChange={e=>setSpecialty(e.target.value)}/></Field>
    <Field label="Objetivo"><textarea className={field} value={goal} onChange={e=>setGoal(e.target.value)}/></Field>
    <Field label="Término previsto"><CustomDatePicker value={expectedEnd} onChange={setExpectedEnd}/></Field>
    <button className={primary} disabled={busy}>Salvar alterações</button></form>}
   <div className="mt-3 flex flex-wrap gap-2">{REHAB_PROGRAM_STATES_M5.filter(s=>s.value!=='completed'&&s.value!=='interrupted').map(s=><button key={s.value} disabled={busy||selected.status===s.value||selected.status==='completed'||selected.status==='interrupted'} className={secondary} onClick={()=>void action(()=>updateRehabProgramM5({personId,id:selected.id,status:s.value}),`Estado registrado: ${s.label}`)}>{s.label}</button>)}</div>
   </section>
   <section className={`${panel} space-y-3`}><h3 className="flex items-center gap-2 text-sm font-bold"><UserRoundPlus size={18} className="text-teal-300"/> Equipe multiprofissional</h3>
    {members.length===0&&<p className="text-xs text-ink-muted">Nenhum profissional vinculado.</p>}
    {members.map(t=>{const p=info.professionals.find(x=>x.id===t.professional_id);return <p key={t.id} className="text-xs"><strong>{p?.nome||'Profissional'}</strong> · {t.role} <span className="text-ink-muted">({p?.conselho_tipo||'Conselho não informado'})</span></p>})}
    <div className="grid gap-2 sm:grid-cols-2"><Field label="Profissional existente"><HealthRelationPicker title="Selecionar profissional da Rede de Saúde" kind="doctor" className={field} value={professional} onValueChange={setProfessional}><option value="">Selecione profissional</option>{info.professionals.map(p=><option key={p.id} value={p.id}>{p.nome} · {p.categoria_profissional||'Não classificado'}</option>)}</HealthRelationPicker></Field>
    <Field label="Papel na equipe"><input className={field} maxLength={80} value={role} onChange={e=>setRole(e.target.value)}/></Field></div>
    <button disabled={busy||!professional} className={secondary} onClick={()=>void action(async()=>{await assignRehabProfessionalM5({personId,programId:selected.id,professionalId:professional,role});setProfessional('');},'Profissional vinculado.')}>Vincular profissional</button>
   </section>
   <section className={`${panel} space-y-3`}><h3 className="flex items-center gap-2 text-sm font-bold"><CalendarClock size={18} className="text-teal-300"/> Sessões de atendimento</h3>
    {sessions.length===0&&<p className="text-xs text-ink-muted">Nenhuma sessão agendada. O app não cria compromissos automaticamente.</p>}
    {sessions.map(s=><div key={s.id} className="rounded-xl border border-surface-border p-3 text-xs"><div className="flex items-center justify-between gap-2"><strong>{date(s.scheduled_at)}</strong><span className="text-ink-muted">{REHAB_SESSION_STATES_M5.find(x=>x.value===s.status)?.label}</span></div>
     <p className="mt-1 text-ink-muted">{s.mode==='home'?'Domicílio':s.mode==='hospital'?'Hospital':s.mode==='clinic'?'Clínica':'Outro local'} · {s.timezone}</p>
     <div className="mt-2 flex flex-wrap gap-2">{REHAB_SESSION_STATES_M5.map(st=><button key={st.value} disabled={busy||s.status===st.value} className={secondary} onClick={()=>void action(()=>changeRehabSessionM5({personId,id:s.id,status:st.value}),`Sessão: ${st.label}`)}>{st.label}</button>)}</div>
     <div className="mt-2 flex flex-wrap gap-2 items-end"><Field label="Novo horário"><HealthDateTimePicker value={eventSession===s.id?rescheduleAt:''} onChange={value=>{setEventSession(s.id);setRescheduleAt(value)}}/></Field>
      <button disabled={busy||eventSession!==s.id||!rescheduleAt} className={secondary} onClick={()=>void action(async()=>{await changeRehabSessionM5({personId,id:s.id,scheduledAt:new Date(rescheduleAt).toISOString()});setRescheduleAt('');},'Remarcação registrada com histórico.')}><RefreshCw size={15}/> Remarcar</button></div>
     <p className="mt-2 text-ink-muted">Equipe da sessão: {info.sessionTeam.filter(t=>t.session_id===s.id).length===1?'1 vínculo':`${info.sessionTeam.filter(t=>t.session_id===s.id).length} vínculos`}</p>
     <div className="flex flex-wrap items-end gap-2"><Field label="Atribuir membro da equipe"><HealthRelationPicker title="Membro da equipe desta sessão" kind="doctor" value={sessionTeamId===s.id?sessionTeam:''} className={field} onValueChange={value=>{setSessionTeamId(s.id);setSessionTeam(value)}}><option value="">Selecione</option>{members.map(t=><option value={t.id} key={t.id}>{info.professionals.find(x=>x.id===t.professional_id)?.nome||'Profissional'} · {t.role}</option>)}</HealthRelationPicker></Field>
      <button className={secondary} disabled={busy||sessionTeamId!==s.id||!sessionTeam} onClick={()=>void action(async()=>{await addRehabSessionProfessionalM5({personId,sessionId:s.id,teamId:sessionTeam});setSessionTeam('');},'Profissional associado à sessão.')}>Adicionar</button></div>
     {info.events.filter(e=>e.session_id===s.id).sort((a,b)=>a.created_at.localeCompare(b.created_at)).map(e=><p className="mt-1 text-[11px] text-ink-muted" key={e.id}><ClipboardList className="mr-1 inline" size={12}/>{e.action==='rescheduled'?'Remarcado':e.action==='status_changed'?'Estado alterado':'Agendado'} · {date(e.created_at)} {e.action==='rescheduled'?`(${date(e.from_at)} → ${date(e.to_at)})`:''}</p>)}
    </div>)}
    <div className="space-y-2 border-t border-surface-border pt-3"><p className="text-xs font-semibold">Agendar nova sessão</p>
     <div className="grid gap-3 sm:grid-cols-2"><Field label="Data e horário"><HealthDateTimePicker value={sessionAt} onChange={setSessionAt}/></Field>
      <Field label="Tipo de atendimento"><HealthRelationPicker title="Tipo de atendimento" kind="status" className={field} value={mode} onValueChange={value=>{setMode(value as RehabSessionMode);setLocation('')}}>{[['clinic','Clínica'],['hospital','Hospital'],['home','Domicílio'],['other','Outro']] .map(([v,l])=><option value={v} key={v}>{l}</option>)}</HealthRelationPicker></Field></div>
     {mode==='clinic'&&<Field label="Local cadastrado (opcional)"><HealthRelationPicker title="Local cadastrado" kind="place" className={field} value={location} onValueChange={setLocation}><option value="">Não informado</option>{info.clinics.map(x=><option key={x.id} value={x.id}>{x.nome}</option>)}</HealthRelationPicker></Field>}
     {mode==='hospital'&&<Field label="Hospital cadastrado (opcional)"><HealthRelationPicker title="Hospital cadastrado" kind="hospital" className={field} value={location} onValueChange={setLocation}><option value="">Não informado</option>{info.hospitals.map(x=><option key={x.id} value={x.id}>{x.nome}</option>)}</HealthRelationPicker></Field>}
     <Field label="Referência de local (informada)"><input className={field} value={placeNote} maxLength={240} onChange={e=>setPlaceNote(e.target.value)} placeholder="Sem inventar endereço"/></Field>
     <button className={primary} disabled={busy||!sessionAt} onClick={()=>void action(async()=>{const zone=Intl.DateTimeFormat().resolvedOptions().timeZone||'UTC';await scheduleRehabSessionM5({personId,programId:selected.id,scheduledAt:new Date(sessionAt).toISOString(),timezone:zone,mode,localId:mode==='clinic'?location:undefined,hospitalId:mode==='hospital'?location:undefined,placeNote});setSessionAt('');setPlaceNote('');setLocation('');},'Sessão agendada e registrada na fila offline.')}><Plus size={16}/> Agendar sessão</button>
    </div>
   </section>
   <section className={`${panel} space-y-3`}><h3 className="flex items-center gap-2 text-sm font-bold"><Link2 size={18} className="text-teal-300"/> Origem e vínculos clínicos</h3>
    <p className="text-xs text-ink-muted">Vincule registros existentes explicitamente. Nenhuma relação é presumida por datas ou nomes.</p>
    {links.map(link=><div className="flex items-center gap-2 text-xs" key={link.id}><span className="min-w-0 flex-1 break-words">{originDisplay(link.origin_type,link.origin_id)}</span><button aria-label="Desvincular sem apagar a origem" disabled={busy} className={secondary} onClick={()=>void action(()=>unlinkRehabOriginM5(personId,link.id),'Vínculo removido; origem preservada.')}><X size={14}/></button></div>)}
    <div className="grid gap-3 sm:grid-cols-2"><Field label="Tipo de origem"><HealthRelationPicker title="Tipo de origem clínica" kind="status" className={field} value={originType} onValueChange={value=>{setOriginType(value as RehabOriginType);setOriginId('')}}>{[['consulta','Consulta'],['cirurgia','Cirurgia'],['tratamento','Tratamento']].map(([v,l])=><option key={v} value={v}>{l}</option>)}</HealthRelationPicker></Field>
     <Field label="Registro desta pessoa"><HealthRelationPicker title="Registro desta pessoa" className={field} value={originId} onValueChange={setOriginId}><option value="">Selecione</option>{choices?.filter(x=>x.id).map(x=><option key={x.id} value={x.id}>{'nome' in x?x.nome:'procedimento' in x?x.procedimento:x.especialidade}</option>)}</HealthRelationPicker></Field></div>
    <button disabled={busy||!originId} className={secondary} onClick={()=>void action(async()=>{await addRehabOriginM5({personId,programId:selected.id,type:originType,originId});setOriginId('');},'Origem vinculada por identidade real.')}><Link2 size={15}/> Vincular</button>
   </section>
   <RehabM5PremiumSections programId={selected.id} />
   <HospitalizationA5ReverseLinks kind="rehab_program" recordId={selected.id} returnTo={`/saude/reabilitacao/detalhes?id=${encodeURIComponent(selected.id)}`} />
   <div className="flex items-center gap-2 text-[11px] text-ink-muted"><ShieldCheck size={16}/> Dados escopados à pessoa e à conta. Histórico factual mantido.</div>
  </>)}
 </main>;
}
