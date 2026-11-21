'use client';
/** M5 MACRO2: explicit rehab facts on the ONE canonical M5 authority. */
import { useEffect, useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Activity, CalendarCheck2, CircleAlert, ClipboardCheck, Flag, HeartHandshake, ShieldCheck, UserRoundCheck, Stethoscope } from 'lucide-react';
import { db } from '@/lib/db';
import { useAuth } from '@/hooks/useAuth';
import { useActivePersonId } from '@/hooks/useActivePersonId';
import { HealthRelationPicker } from '@/components/saude/HealthRelationPicker';
import { HealthDateTimePicker } from '@/components/saude/HealthDateTimePicker';
import { CustomDatePicker } from '@/components/DatePicker';
import { createRehabMilestoneM5, closeRehabProgramM5, recordRehabSessionEvolutionM5,
  setRehabProgramContextM5, setRehabReminderOptInM5 } from '@/lib/rehab-m5/macro2';
import { REHAB_M5_MODALITIES, REHAB_M5_MILESTONE_LABELS } from '@/lib/rehab-m5/projection';
import type { RehabMilestoneKindM5, RehabMilestoneSourceM5, RehabModalityM5, RehabSessionM5 } from '@/lib/rehab-m5/types';
import { RehabM5ClinicalDocuments } from './RehabM5ClinicalDocuments';
const frame='rounded-[20px] border border-teal-300/20 bg-surface-raised/80 p-4 shadow-sm';
const inputStyle='min-h-11 w-full min-w-0 rounded-xl border border-surface-border bg-surface px-3 py-2 text-sm text-ink-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-300';
const soft='inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-teal-300/30 bg-teal-300/[.07] px-3 py-2 text-xs font-semibold text-teal-200 disabled:opacity-50';
const nameKind:Record<RehabMilestoneKindM5,string>=REHAB_M5_MILESTONE_LABELS;
const dateBR=(v:string)=>{const d=new Date(v);return Number.isFinite(d.getTime())?d.toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'}):'Data não informada';};
const Field=({label,children}:{label:string;children:React.ReactNode})=><div className="block min-w-0 space-y-1 text-xs font-semibold text-ink-muted"><span className="block">{label}</span>{children}</div>;
export function RehabM5PremiumSections({programId}:{programId:string}){
 const {user}=useAuth();const {activePersonId}=useActivePersonId();const uid=user?.id||'',pid=activePersonId||'',scope=`${uid}:${pid}`;
 const [busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const [modal,setModal]=useState<RehabModalityM5|null>(null),[pro,setPro]=useState(''),[facility,setFacility]=useState('');
 const [laterality,setLaterality]=useState<'right'|'left'|'bilateral'|'not_reported'|'none'>('none');
 const [site,setSite]=useState('');
 const [closeKind,setCloseKind]=useState<'discharge'|'interruption'>('discharge'),[closeDate,setCloseDate]=useState(''),[closeText,setCloseText]=useState('');
 const [editingSession,setEditingSession]=useState(''),[procedure,setProcedure]=useState(''),[functional,setFunctional]=useState('');
 const [painBefore,setPainBefore]=useState(''),[painAfter,setPainAfter]=useState(''),[sessionPro,setSessionPro]=useState('');
 const [milestoneKind,setMilestoneKind]=useState<RehabMilestoneKindM5>('reassessment');
 const [milestoneSource,setMilestoneSource]=useState<RehabMilestoneSourceM5>('self_reported'),[milestoneAt,setMilestoneAt]=useState('');
 const [milestoneTimeConfirmed,setMilestoneTimeConfirmed]=useState(false);
 const [milestoneNotes,setMilestoneNotes]=useState(''),[milestonePro,setMilestonePro]=useState(''),[milestoneSession,setMilestoneSession]=useState('');
 const [milestoneConsulta,setMilestoneConsulta]=useState(''),[milestoneExam,setMilestoneExam]=useState('');
 const data=useLiveQuery(async()=>{
  if(!uid||!pid)return {scope,valid:false,program:null,sessions:[],milestones:[],professionals:[],facilities:[],consultas:[],exams:[]};
  const [person,program,sessions,milestones,professionals,facilities,consultas,exams]=await Promise.all([
   db.persons.get(pid),db.rehab_programs_m5.get(programId),db.rehab_sessions_m5.where('person_id').equals(pid).toArray(),
   db.rehab_milestones_m5.where('person_id').equals(pid).toArray(),db.medicos.where('user_id').equals(uid).toArray(),
   db.locais.where('user_id').equals(uid).toArray(),db.consultas.where('user_id').equals(uid).toArray(),
   db.exam_orders.where('person_id').equals(pid).toArray()]);
  const valid=Boolean(person?.user_id===uid&&program?.user_id===uid&&program.person_id===pid&&!program.deleted_at);
  return {scope,valid,program:valid?program:null,
   sessions:sessions.filter(s=>s.user_id===uid&&s.person_id===pid&&s.program_id===programId&&!s.deleted_at),
   milestones:milestones.filter(m=>m.user_id===uid&&m.person_id===pid&&m.program_id===programId&&!m.deleted_at),
   professionals:professionals.filter(p=>p.user_id===uid),facilities:facilities.filter(l=>l.user_id===uid),
   consultas:consultas.filter(c=>c.person_id===pid),exams:exams.filter(e=>e.person_id===pid)};
 },[uid,pid,programId]);
 // Never carry sensitive form state from one person to another.
 useEffect(()=>{setMessage('');setEditingSession('');setMilestoneNotes('');setMilestoneAt('');setMilestoneTimeConfirmed(false);setCloseDate('');setCloseText('');setMilestonePro('');},[uid,pid,programId]);
 const program=data?.program;
 useEffect(()=>{if(program){setModal(program.modality);setPro(program.primary_professional_id||'');setFacility(program.primary_facility_id||'');
  setLaterality(program.laterality||'none');setSite(program.body_region||'');}},[program?.id,scope]);
 const sessions=useMemo(()=>data?.sessions.slice().sort((a,b)=>a.scheduled_at.localeCompare(b.scheduled_at))||[],[data?.sessions]);
 const act=async(fn:()=>Promise<unknown>,success:string)=>{if(busy)return;setBusy(true);setMessage('');try{await fn();setMessage(success);}catch(e){setMessage(e instanceof Error?e.message:'Não foi possível registrar. Nenhum fato foi presumido.');}finally{setBusy(false);}};
 const chooseEvolution=(s:RehabSessionM5)=>{setEditingSession(s.id);setProcedure(s.procedures_notes||'');setFunctional(s.functional_notes||'');
  setPainBefore(s.pain_before===null?'':String(s.pain_before));setPainAfter(s.pain_after===null?'':String(s.pain_after));setSessionPro(s.professional_id||'');};
 if(!data||data.scope!==scope||!data.valid||!program)return null;
 const isClosed=program.status==='completed'||program.status==='interrupted';
 return <>
  {message&&<p role="status" className="rounded-xl border border-teal-300/30 bg-teal-300/[.07] p-3 text-xs text-ink-primary">{message}</p>}
  <section className={`${frame} space-y-3`} aria-label="Plano e modalidade">
   <h2 className="flex items-center gap-2 text-sm font-bold"><Activity size={18} className="text-teal-300"/> Plano e modalidade</h2>
   <div className="grid min-w-0 gap-3 min-[390px]:grid-cols-2">
    <Field label="Modalidade declarada"><HealthRelationPicker title="Modalidade declarada" kind="status" className={inputStyle} value={modal||''} onValueChange={value=>setModal((value||null) as RehabModalityM5|null)}><option value="">Não informada</option>{Object.entries(REHAB_M5_MODALITIES).map(([v,l])=><option key={v} value={v}>{l}</option>)}</HealthRelationPicker></Field>
    <Field label="Região ou membro"><input className={inputStyle} value={site} maxLength={100} onChange={e=>setSite(e.target.value)}/></Field>
    <Field label="Lateralidade"><HealthRelationPicker title="Lateralidade" kind="status" className={inputStyle} value={laterality} onValueChange={value=>setLaterality(value as typeof laterality)}><option value="none">Não informada</option><option value="right">Direito</option><option value="left">Esquerdo</option><option value="bilateral">Bilateral</option><option value="not_reported">Não se aplica</option></HealthRelationPicker></Field>
    <Field label="Profissional principal"><HealthRelationPicker title="Profissional principal" kind="doctor" className={inputStyle} value={pro} onValueChange={setPro}><option value="">Não informado</option>{data.professionals.map(p=><option key={p.id} value={p.id}>{p.nome||'Profissional cadastrado'}</option>)}</HealthRelationPicker></Field>
    <Field label="Clínica principal"><HealthRelationPicker title="Clínica principal" kind="place" className={inputStyle} value={facility} onValueChange={setFacility}><option value="">Não informada</option>{data.facilities.map(l=><option key={l.id} value={l.id}>{l.nome||'Local cadastrado'}</option>)}</HealthRelationPicker></Field>
   </div>
   <button type="button" disabled={busy||isClosed} className={soft} onClick={()=>void act(()=>setRehabProgramContextM5({personId:pid,programId,modality:modal,
    primaryProfessionalId:pro||null,primaryFacilityId:facility||null,bodyRegion:site||null,laterality:laterality==='none'?null:laterality}), 'Contexto atualizado sem alterar o histórico.')}>Salvar contexto clínico</button>
  </section>

  <section className={`${frame} space-y-3`} aria-label="Evolução das sessões">
   <h2 className="flex items-center gap-2 text-sm font-bold"><HeartHandshake size={18} className="text-teal-300"/> Evolução das sessões</h2>
   <p className="text-[11px] text-ink-muted">Apenas sessões marcadas explicitamente como realizadas aceitam evolução. A ausência de informação não significa zero nem melhora.</p>
   {sessions.length===0&&<p className="text-xs text-ink-muted">Nenhuma sessão registrada neste ciclo.</p>}
   {sessions.map(s=><div key={s.id} className="space-y-2 rounded-xl border border-surface-border/70 p-3">
    <div className="flex flex-wrap items-center justify-between gap-2"><strong className="text-xs text-ink-primary">{dateBR(s.scheduled_at)}</strong><span className="text-[11px] text-ink-muted">{s.status==='performed'?'Realizada':s.status==='scheduled'?'Agendada':s.status==='confirmed'?'Confirmada':s.status==='missed'?'Não compareceu':'Cancelada'}</span></div>
    {(s.functional_notes||s.procedures_notes||s.pain_before!==null||s.pain_after!==null)&&<div className="space-y-1 text-xs text-ink-muted">{s.procedures_notes&&<p>Condutas registradas: {s.procedures_notes}</p>}{s.functional_notes&&<p>Evolução registrada: {s.functional_notes}</p>}{s.pain_before!==null&&<p>Dor antes: {s.pain_before}/10</p>}{s.pain_after!==null&&<p>Dor depois: {s.pain_after}/10</p>}</div>}
    {(s.status==='scheduled'||s.status==='confirmed')&&<label className="flex min-h-11 items-center gap-2 text-xs text-ink-primary"><input type="checkbox" checked={s.reminder_opt_in} disabled={busy} onChange={e=>void act(()=>setRehabReminderOptInM5(pid,s.id,e.target.checked),e.target.checked?'Lembrete autorizado.':'Lembrete desativado.')}/> Lembrar no Android (opcional)</label>}
    {s.status==='performed'&&<button className={soft} disabled={busy} onClick={()=>chooseEvolution(s)}>Registrar ou revisar evolução factual</button>}
    <details className="rounded-xl border border-surface-border/50 p-2.5"><summary className="min-h-11 cursor-pointer text-xs font-semibold text-teal-200">Documentos desta sessão</summary><RehabM5ClinicalDocuments programId={programId} sessionId={s.id}/></details>
    {editingSession===s.id&&s.status==='performed'&&<div className="space-y-3 rounded-xl border border-teal-300/20 bg-surface/60 p-3">
     <Field label="Exercícios e condutas declarados"><textarea rows={3} className={inputStyle} value={procedure} onChange={e=>setProcedure(e.target.value)}/></Field>
     <Field label="Mobilidade, função, tolerância ou intercorrência"><textarea rows={3} className={inputStyle} value={functional} onChange={e=>setFunctional(e.target.value)}/></Field>
     <div className="grid min-w-0 grid-cols-2 gap-2"><Field label="Dor antes (0–10)"><input type="number" min="0" max="10" step="1" className={inputStyle} value={painBefore} onChange={e=>setPainBefore(e.target.value)}/></Field><Field label="Dor depois (0–10)"><input type="number" min="0" max="10" step="1" className={inputStyle} value={painAfter} onChange={e=>setPainAfter(e.target.value)}/></Field></div>
     <Field label="Profissional da sessão"><HealthRelationPicker title="Profissional da sessão" kind="doctor" className={inputStyle} value={sessionPro} onValueChange={setSessionPro}><option value="">Não informado</option>{data.professionals.map(p=><option key={p.id} value={p.id}>{p.nome}</option>)}</HealthRelationPicker></Field>
     <div className="flex flex-wrap gap-2"><button disabled={busy} className={soft} onClick={()=>void act(async()=>{
      await recordRehabSessionEvolutionM5({personId:pid,sessionId:s.id,proceduresNotes:procedure,functionalNotes:functional,
       painBefore:painBefore.trim()===''?null:Number(painBefore),painAfter:painAfter.trim()===''?null:Number(painAfter),professionalId:sessionPro||null});setEditingSession('');},'Evolução registrada como relato factual.')}>Salvar evolução</button><button className={soft} onClick={()=>setEditingSession('')}>Cancelar</button></div>
    </div>}
   </div>)}
  </section>
  <section className={`${frame} space-y-3`} aria-label="Marcos e reavaliações">
   <h2 className="flex items-center gap-2 text-sm font-bold"><Flag size={18} className="text-teal-300"/> Marcos e reavaliações</h2>
   {data.milestones.length===0?<p className="text-xs text-ink-muted">Nenhum marco documentado.</p>:data.milestones.slice().sort((a,b)=>b.recorded_at.localeCompare(a.recorded_at)).map(m=><div className="rounded-xl border border-surface-border p-3 text-xs" key={m.id}>
    <strong>{nameKind[m.kind]}</strong><span className="ml-2 text-ink-muted">{dateBR(m.recorded_at)}</span><p className="mt-1 text-ink-muted">{m.notes}</p><p className="mt-1 text-[11px] text-teal-200">{m.source==='professional_reported'?'Informação atribuída a profissional':'Relato próprio'}</p></div>)}
   <div className="grid min-w-0 gap-2 min-[390px]:grid-cols-2">
    <Field label="Tipo de marco"><HealthRelationPicker title="Tipo de marco" kind="status" className={inputStyle} value={milestoneKind} onValueChange={value=>setMilestoneKind(value as RehabMilestoneKindM5)}>{Object.entries(nameKind).map(([v,l])=><option key={v} value={v}>{l}</option>)}</HealthRelationPicker></Field>
    <Field label="Fonte da informação"><HealthRelationPicker title="Fonte da informação" kind="status" className={inputStyle} value={milestoneSource} onValueChange={value=>{setMilestoneSource(value as RehabMilestoneSourceM5);setMilestonePro('')}}><option value="self_reported">Relato próprio</option><option value="professional_reported">Informação de profissional</option></HealthRelationPicker></Field>
    <Field label="Data e hora do fato"><HealthDateTimePicker value={milestoneAt} onChange={value=>{setMilestoneAt(value);setMilestoneTimeConfirmed(false)}}/></Field>
    <label className="col-span-full flex min-h-11 items-start gap-2 text-xs text-ink-secondary"><input type="checkbox" className="mt-0.5 accent-emerald-400" checked={milestoneTimeConfirmed} onChange={e=>setMilestoneTimeConfirmed(e.target.checked)} disabled={!milestoneAt}/> Confirmo que a data e o horário acima foram informados como parte do registro.</label>
    {milestoneSource==='professional_reported'&&<Field label="Profissional (se conhecido)"><HealthRelationPicker title="Profissional do marco" kind="doctor" className={inputStyle} value={milestonePro} onValueChange={setMilestonePro}><option value="">Profissional não identificado</option>{data.professionals.map(p=><option key={p.id} value={p.id}>{p.nome}</option>)}</HealthRelationPicker></Field>}
    <Field label="Sessão relacionada (opcional)"><HealthRelationPicker title="Sessão relacionada" kind="status" className={inputStyle} value={milestoneSession} onValueChange={setMilestoneSession}><option value="">Sem sessão</option>{sessions.map(s=><option key={s.id} value={s.id}>{dateBR(s.scheduled_at)}</option>)}</HealthRelationPicker></Field>
    <Field label="Consulta relacionada (opcional)"><HealthRelationPicker title="Consulta relacionada" kind="consultation" className={inputStyle} value={milestoneConsulta} onValueChange={setMilestoneConsulta}><option value="">Sem consulta</option>{data.consultas.filter(c=>c.id).map(c=><option key={c.id} value={c.id}>{c.motivo||'Consulta'} · {/\d{4}-\d{2}-\d{2}/.test(c.data||'')?(c.data||'').slice(0,10).split('-').reverse().join('/'):'Data não informada'}</option>)}</HealthRelationPicker></Field>
    <Field label="Pedido de exames relacionado (opcional)"><HealthRelationPicker title="Pedido de exames relacionado" kind="status" className={inputStyle} value={milestoneExam} onValueChange={setMilestoneExam}><option value="">Sem pedido</option>{data.exams.map(e=><option key={e.id} value={e.id}>{e.title}</option>)}</HealthRelationPicker></Field>
   </div>
   <Field label="Descrição factual do marco"><textarea rows={3} maxLength={2000} className={inputStyle} value={milestoneNotes} onChange={e=>setMilestoneNotes(e.target.value)} placeholder="Descreva o que foi informado ou observado, sem conclusão automática"/></Field>
   <button disabled={busy||!milestoneNotes.trim()||!milestoneAt||!milestoneTimeConfirmed} className={soft} onClick={()=>void act(async()=>{
    await createRehabMilestoneM5({personId:pid,programId,kind:milestoneKind,source:milestoneSource,
      recordedAt:new Date(milestoneAt).toISOString(),notes:milestoneNotes,professionalId:milestoneSource==='professional_reported'?milestonePro||null:null,
      sessionId:milestoneSession||null,consultationId:milestoneConsulta||null,examOrderId:milestoneExam||null});setMilestoneNotes('');setMilestoneAt('');setMilestoneTimeConfirmed(false);setMilestonePro('');setMilestoneSession('');setMilestoneConsulta('');setMilestoneExam('');},'Marco registrado com origem e data explícitas.')}>Registrar marco</button>
  </section>
  <RehabM5ClinicalDocuments programId={programId}/>
  <section className={`${frame} space-y-3`} aria-label="Encerramento do ciclo">
   <h2 className="flex items-center gap-2 text-sm font-bold"><ClipboardCheck size={18} className="text-teal-300"/> Encerramento declarado</h2>
   {isClosed?<p className="text-xs text-ink-muted">{program.status==='completed'?'Alta documentada':'Interrupção registrada'}{program.discharged_at?` · ${program.discharged_at.split('-').reverse().join('/')}`:''}. {program.discharge_summary||program.interruption_reason||''}</p>:<>
    <p className="flex gap-2 text-[11px] text-ink-muted"><CircleAlert size={15} className="shrink-0 text-amber-300"/> A data prevista ou a quantidade de sessões nunca concluem automaticamente este ciclo.</p>
    <div className="grid gap-2 min-[390px]:grid-cols-2"><Field label="Natureza do encerramento"><HealthRelationPicker title="Natureza do encerramento" kind="status" className={inputStyle} value={closeKind} onValueChange={value=>setCloseKind(value as typeof closeKind)}><option value="discharge">Alta declarada</option><option value="interruption">Interrupção declarada</option></HealthRelationPicker></Field>
     <Field label="Data civil do encerramento"><CustomDatePicker value={closeDate} onChange={setCloseDate}/></Field></div>
    <Field label="Resumo / motivo informado"><textarea rows={3} className={inputStyle} maxLength={2000} value={closeText} onChange={e=>setCloseText(e.target.value)}/></Field>
    <button className={soft} disabled={busy||!closeDate||!closeText.trim()} onClick={()=>void act(()=>closeRehabProgramM5({personId:pid,programId,kind:closeKind,date:closeDate,summary:closeText}),'Encerramento registrado como fato declarado.')}><UserRoundCheck size={16}/> Registrar encerramento</button>
   </>}
  </section>
  <p className="flex gap-2 px-1 text-[11px] text-ink-muted"><ShieldCheck size={16} className="shrink-0 text-teal-300"/> Os dados pertencem à pessoa selecionada. As informações clínicas são relatos registrados; não substituem avaliação profissional.</p>
 </>;
}
