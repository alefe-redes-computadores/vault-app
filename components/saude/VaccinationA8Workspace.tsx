'use client';
import {useEffect,useMemo,useRef,useState} from 'react';
import Link from 'next/link';
import {useLiveQuery} from 'dexie-react-hooks';
import {ArrowLeft,CalendarDays,CheckCircle2,FileText,History,Plus,ShieldCheck,Syringe,Trash2,Undo2} from 'lucide-react';
import {useAuth} from '@/hooks/useAuth';
import {useToast} from '@/components/ToastProvider';
import {useHapticFeedback} from '@/lib/haptics';
import {getLocalTodayISO} from '@/lib/health-utils';
import {useActivePersonId} from '@/hooks/useActivePersonId';
import {db} from '@/lib/db';
import {safeReturnTarget,withReturnTarget} from '@/lib/navigation/return-context';
import {createVaccinationCourseA8,recordVaccinationA8,voidVaccinationEventA8,retireVaccinationCourseA8} from '@/lib/vaccination-a8/repository';
import {datePtA8,validCivilDayA8,currentVaccinationEventsA8,legacyDiaryVaccinationA8,A8_SOURCE_LABEL,type A8Source,type A8Event} from '@/lib/vaccination-a8/types';
import {registerClinicalAssetM3} from '@/lib/clinical-exams-m3/repository';
import {ClinicalEntitySearch360} from '@/components/saude/ClinicalEntitySearch360';
import {ClinicalReverseSensitivityA9} from '@/components/saude/ClinicalReverseSensitivityA9';
const field='mt-1 min-h-11 w-full min-w-0 rounded-xl border border-surface-border bg-void/50 px-3 py-2 text-sm text-ink-primary outline-none focus-visible:border-emerald-300';
const action='inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition-colors disabled:opacity-40';
const primary=action+' border-emerald-300/40 bg-emerald-400/15 text-emerald-200';
const secondary=action+' border-surface-border bg-surface text-ink-secondary';
function dayFromPt(value:string):string|null {
 const raw=value.trim();const digits=raw.replace(/\D/g,'');
 if(validCivilDayA8(raw))return raw;
 if(digits.length!==8)return null;
 const out=`${digits.slice(4,8)}-${digits.slice(2,4)}-${digits.slice(0,2)}`;
 return validCivilDayA8(out)?out:null;
}
function ptInput(value:string){return value?datePtA8(value):'';}
export function VaccinationA8Workspace({returnTo='/saude/minha-saude'}:{returnTo?:string}) {
 const {user}=useAuth();const {activePersonId}=useActivePersonId();
 const {showToast}=useToast();const {trigger}=useHapticFeedback();
 const uid=user?.id||'',pid=activePersonId||'';
 const courses=useLiveQuery(async()=>{
  if(!uid||!pid)return [];
  const rows=await db.vaccination_courses_a8.where('[user_id+person_id]').equals([uid,pid]).toArray();
  return rows.filter(x=>x.user_id===uid).sort((a,b)=>b.created_at.localeCompare(a.created_at));
 },[uid,pid],[]);
 const events=useLiveQuery(async()=>{
  if(!uid||!pid)return [];
  const rows=await db.vaccination_events_a8.where('[user_id+person_id]').equals([uid,pid]).toArray();
  return rows.filter(x=>x.user_id===uid);
 },[uid,pid],[]);
 const legacy=useLiveQuery(async()=>{
  if(!uid||!pid)return [];
  const rows=await db.registros_saude.where('[user_id+person_id]').equals([uid,pid]).toArray();
  return rows.filter(x=>x.user_id===uid).map(x=>({id:x.id||'',record:legacyDiaryVaccinationA8(x.contexto)}))
   .filter((x):x is {id:string;record:NonNullable<typeof x.record>}=>Boolean(x.record));
 },[uid,pid],[]);
 const places=useLiveQuery(async()=>{
  if(!uid)return [];
  const rows=await db.locais.where('user_id').equals(uid).toArray();
  return rows.filter(x=>x.user_id===uid&&Boolean(x.id));
 },[uid],[]);
 const professionals=useLiveQuery(async()=>{
  if(!uid)return [];
  const rows=await db.medicos.where('user_id').equals(uid).toArray();
  return rows.filter(x=>x.user_id===uid&&Boolean(x.id));
 },[uid],[]);
 const [selected,setSelected]=useState('');const [filter,setFilter]=useState('');const [deepEventId,setDeepEventId]=useState('');
 const [creating,setCreating]=useState(false),[courseName,setCourseName]=useState(''),[courseNote,setCourseNote]=useState('');
 const [editing,setEditing]=useState(false),[corrects,setCorrects]=useState(''),[mode,setMode]=useState<'plan'|'dose'>('dose');
 const [day,setDay]=useState(''),[dose,setDose]=useState(''),[maker,setMaker]=useState(''),[lot,setLot]=useState('');
 const [source,setSource]=useState<A8Source>('self_report'),[professionalId,setProfessionalId]=useState(''),[locationId,setLocationId]=useState(''),[note,setNote]=useState('');
 const [retracting,setRetracting]=useState(''),[retractNote,setRetractNote]=useState('');
 const [retiring,setRetiring]=useState(false);
 const [busy,setBusy]=useState(false),[notice,setNotice]=useState('');
 const [attachmentId,setAttachmentId]=useState('');const fileRef=useRef<HTMLInputElement|null>(null);const inFlight=useRef(false);
 useEffect(()=>{const params=new URLSearchParams(window.location.search);setDeepEventId(params.get('registro')||'');setSelected(params.get('curso')||'');setEditing(false);setCorrects('');setCreating(false);setRetracting('');setRetiring(false);setNotice('');setAttachmentId('');},[uid,pid]);
 const ownedCourses=(courses||[]).filter(c=>c.user_id===uid&&c.person_id===pid);
 const deepEvent=(events||[]).find(e=>e.id===deepEventId&&e.user_id===uid&&e.person_id===pid);
 const selectedCourse=ownedCourses.find(c=>c.id===selected)||ownedCourses.find(c=>c.id===deepEvent?.course_id)||ownedCourses.find(c=>!c.deleted_at)||ownedCourses[0];
 const current=useMemo(()=>currentVaccinationEventsA8(events||[],uid,pid),[events,uid,pid]);
 const courseEvents=selectedCourse?current.filter(e=>e.course_id===selectedCourse.id):[];
 useEffect(()=>{if(!deepEventId||!courseEvents.some(e=>e.id===deepEventId))return;const node=document.getElementById('vacina-'+deepEventId);node?.scrollIntoView({block:'center',behavior:'smooth'});},[deepEventId,selectedCourse?.id,events]);
 const visible=ownedCourses.filter(c=>c.vaccine_name.toLocaleLowerCase('pt-BR').includes(filter.toLocaleLowerCase('pt-BR')));
 const applied=current.filter(e=>e.effective_kind==='dose').length;
 const planned=current.filter(e=>e.effective_kind==='plan').length;
 const valid=Boolean(uid&&pid&&!busy&&!inFlight.current);
 const fail=(e:unknown,fallback:string)=>{const msg=e instanceof Error?e.message:fallback;setNotice(msg);showToast(msg,'error');trigger('error');};
 const reset=()=>{setDay('');setDose('');setMaker('');setLot('');setSource('self_report');setProfessionalId('');setLocationId('');setNote('');setCorrects('');setEditing(false);};
 async function saveCourse(){if(!valid||inFlight.current)return;inFlight.current=true;setBusy(true);setNotice('');try{
  const id=await createVaccinationCourseA8({personId:pid,name:courseName,schemeNote:courseNote});
  setSelected(id);setCourseName('');setCourseNote('');setCreating(false);setNotice('Vacina salva neste aparelho; a sincronização pode continuar pendente.');showToast('Vacina cadastrada neste aparelho.','success');trigger('success');
 }catch(e){fail(e,'Não foi possível salvar.');}finally{inFlight.current=false;setBusy(false);}}
 async function saveEvent(){if(!valid||inFlight.current||!selectedCourse||selectedCourse.deleted_at)return;
  const normalized=dayFromPt(day);if(!normalized){setNotice('Confira a data no formato DD/MM/AAAA.');return;}
  if(mode==='dose'&&normalized>getLocalTodayISO()){const message='Aplicação futura deve ser registrada como planejamento.';setNotice(message);showToast(message,'error');return;}
  if(inFlight.current)return;inFlight.current=true;setBusy(true);setNotice('');try{
   const id=await recordVaccinationA8({personId:pid,courseId:selectedCourse.id,kind:mode,day:normalized,
    doseNumber:dose.trim()?Number(dose):null,manufacturer:maker,lot,source,sourceProfessionalId:professionalId||null,sourceLocationId:locationId||null,note,correctsEventId:corrects||null});
   reset();setAttachmentId(id);setNotice('Registro salvo neste aparelho; não é comprovação de sincronização ou validação clínica.');showToast('Registro de vacinação salvo.','success');trigger('success');
  }catch(e){fail(e,'Não foi possível registrar.');}finally{inFlight.current=false;setBusy(false);}}
 function editEvent(event:A8Event){setSelected(event.course_id);setCorrects(event.id);setMode(event.effective_kind==='plan'?'plan':'dose');
  setDay(ptInput(event.planned_on||event.administered_on||''));setDose(event.dose_number?.toString()||'');setMaker(event.manufacturer||'');setLot(event.lot||'');
  setSource(event.source);setProfessionalId(event.source_professional_id||'');setLocationId(event.source_location_id||'');setNote(event.note||'');setEditing(true);setRetracting('');setNotice('Retificação: o registro anterior continuará preservado no histórico.');}
 async function retract(){if(!valid||inFlight.current||!retracting)return;inFlight.current=true;setBusy(true);try{
  await voidVaccinationEventA8({personId:pid,eventId:retracting,note:retractNote});
  setRetracting('');setRetractNote('');setNotice('Cancelamento documental registrado, sem apagar o histórico.');showToast('Retificação registrada, sem apagar o histórico.','success');trigger('success');
 }catch(e){fail(e,'Não foi possível cancelar.');}finally{inFlight.current=false;setBusy(false);}}
 async function retire(){if(!valid||inFlight.current||!selectedCourse)return;inFlight.current=true;setBusy(true);setNotice('');try{await retireVaccinationCourseA8({personId:pid,courseId:selectedCourse.id});setRetiring(false);setEditing(false);setNotice('Vacina arquivada. O histórico permanece preservado.');showToast('Vacina arquivada; histórico preservado.','success');trigger('success');}catch(e){fail(e,'Não foi possível arquivar.');}finally{inFlight.current=false;setBusy(false);}}
 async function attach(file:File|null){if(!file||!attachmentId||!valid||inFlight.current)return;inFlight.current=true;setBusy(true);try{
  const result=await registerClinicalAssetM3({personId:pid,file,targets:[{entity_type:'vaccination_event',entity_id:attachmentId}],role:'supporting'});
  setNotice(result.uploaded?'Documento privado vinculado à dose.':'Documento salvo localmente; envio privado pendente.');showToast('Comprovante registrado em Documentos privados.','success');trigger('success');setAttachmentId('');
 }catch(e){fail(e,'Anexo mantido para revisão.');}finally{inFlight.current=false;setBusy(false);}}
 return <main className="min-h-screen bg-void px-4 pb-[calc(8rem+env(safe-area-inset-bottom,0px))] pt-5 header-safe-top text-ink-primary">
  <div className="mx-auto max-w-3xl space-y-4">
   <header className="flex items-start gap-3"><Link href={safeReturnTarget(returnTo,'/saude/minha-saude')} className={secondary+' size-11 shrink-0'} aria-label="Voltar à origem"><ArrowLeft size={19}/></Link><div className="min-w-0 flex-1"><h1 className="flex items-center gap-2 text-xl font-bold"><Syringe size={22} className="text-teal-300"/>Vacinação</h1><p className="mt-1 text-xs text-ink-muted">Carteira, datas declaradas e documentos vinculados por pessoa. Planejar não confirma aplicação.</p></div></header>
   <section className="grid grid-cols-2 gap-2"><div className="rounded-2xl border border-surface-border bg-surface p-3"><span className="text-[11px] text-ink-muted">Aplicações registradas</span><strong className="mt-1 block text-xl text-ink-primary">{applied}</strong><span className="text-[11px] text-ink-muted">Relatos/documentos, não certificado oficial</span></div><div className="rounded-2xl border border-surface-border bg-surface p-3"><span className="text-[11px] text-ink-muted">Datas planejadas</span><strong className="mt-1 block text-xl text-ink-primary">{planned}</strong><span className="text-[11px] text-ink-muted">Sem aplicação presumida</span></div></section>
   <div className="flex flex-wrap gap-2"><button type="button" className={primary} disabled={!valid} onClick={()=>{setCreating(v=>!v);setEditing(false);}}><Plus size={17}/>Cadastrar vacina</button><Link className={secondary} href={withReturnTarget('/saude/registros','/saude/vacinas')}><History size={17}/>Diário anterior</Link><Link className={secondary} href={withReturnTarget('/saude/lembretes','/saude/vacinas')}><CalendarDays size={17}/>Configurar lembrete voluntário</Link></div>
   {creating&&<section className="space-y-3 rounded-2xl border border-teal-300/30 bg-surface p-4"><h2 className="font-semibold">Nova vacina na carteira</h2><label className="block text-xs text-ink-muted">Nome declarado da vacina<input className={field} maxLength={160} value={courseName} onChange={e=>setCourseName(e.target.value)} placeholder="Ex.: vacina informada no comprovante"/></label><label className="block text-xs text-ink-muted">Observação sobre o esquema (opcional)<textarea className={field} maxLength={1600} rows={3} value={courseNote} onChange={e=>setCourseNote(e.target.value)}/></label><button type="button" className={primary} disabled={!valid||!courseName.trim()} onClick={()=>void saveCourse()}><CheckCircle2 size={16}/>Salvar vacina</button></section>}
   <section className="rounded-2xl border border-surface-border bg-surface p-3"><label className="block text-xs text-ink-muted">Buscar na carteira<input className={field} value={filter} onChange={e=>setFilter(e.target.value)} placeholder="Nome da vacina"/></label><div className="mt-3 flex flex-wrap gap-2">{visible.map(c=><button key={c.id} type="button" onClick={()=>{setSelected(c.id);reset();setRetracting('');}} aria-pressed={selectedCourse?.id===c.id} className={(selectedCourse?.id===c.id?primary:secondary)+' max-w-full text-left'}><Syringe size={16}/><span className="min-w-0 break-words">{c.vaccine_name}{c.deleted_at?' · arquivada':''}</span></button>)}{!visible.length&&<p className="text-xs text-ink-muted">Nenhuma vacina encontrada nesta carteira. O histórico antigo do Diário permanece disponível abaixo.</p>}</div></section>
   {selectedCourse&&<section className="space-y-3 rounded-[22px] border border-teal-300/20 bg-surface p-4"><div className="flex flex-wrap items-start justify-between gap-2"><div><h2 className="text-base font-semibold">{selectedCourse.vaccine_name}</h2>{selectedCourse.scheme_note&&<p className="mt-1 text-xs text-ink-muted">{selectedCourse.scheme_note}</p>}</div>{!selectedCourse.deleted_at&&<button type="button" className={secondary} onClick={()=>{setEditing(v=>!v);setCorrects('');}}><Plus size={16}/>Registrar data</button>}</div>
     {!selectedCourse.deleted_at&&<div className="flex justify-end"><button type="button" className={secondary} onClick={()=>setRetiring(v=>!v)}>Arquivar esta vacina</button></div>}
     {retiring&&!selectedCourse.deleted_at&&<section className="rounded-xl border border-amber-300/25 p-3"><p className="text-xs text-ink-muted">Arquivar impede novos registros, mas preserva todos os fatos históricos. Deseja continuar?</p><div className="mt-2 flex gap-2"><button type="button" disabled={busy} className={primary} onClick={()=>void retire()}>Confirmar arquivamento</button><button type="button" className={secondary} onClick={()=>setRetiring(false)}>Cancelar</button></div></section>}
     {editing&&!selectedCourse.deleted_at&&<div className="space-y-3 rounded-2xl border border-surface-border bg-void/30 p-3"><h3 className="text-sm font-bold">{corrects?'Retificar registro':'Nova data registrada'}</h3><div className="grid grid-cols-2 gap-2"><button type="button" className={mode==='dose'?primary:secondary} aria-pressed={mode==='dose'} onClick={()=>setMode('dose')}><CheckCircle2 size={16}/>Aplicação declarada</button><button type="button" className={mode==='plan'?primary:secondary} aria-pressed={mode==='plan'} onClick={()=>setMode('plan')}><CalendarDays size={16}/>Planejamento</button></div><label className="block text-xs text-ink-muted">{mode==='dose'?'Data informada da aplicação':'Data planejada'}<input className={field} inputMode="numeric" placeholder="DD/MM/AAAA" value={day} onChange={e=>setDay(e.target.value.slice(0,14))}/></label><div className="grid grid-cols-1 gap-2 min-[390px]:grid-cols-2"><label className="block text-xs text-ink-muted">Número da dose (opcional)<input className={field} inputMode="numeric" value={dose} onChange={e=>setDose(e.target.value.replace(/\D/g,'').slice(0,2))}/></label><label className="block text-xs text-ink-muted">Lote (opcional)<input className={field} maxLength={100} value={lot} onChange={e=>setLot(e.target.value)}/></label></div><label className="block text-xs text-ink-muted">Fabricante declarado (opcional)<input className={field} maxLength={160} value={maker} onChange={e=>setMaker(e.target.value)}/></label><div className="flex flex-wrap gap-2" role="group" aria-label="Fonte do registro"><button type="button" className={source==='self_report'?primary:secondary} onClick={()=>setSource('self_report')}>Relato pessoal</button><button type="button" className={source==='professional_document'?primary:secondary} onClick={()=>setSource('professional_document')}>Documento apresentado</button></div><ClinicalEntitySearch360 kind="professional" label="Profissional cadastrado (opcional)" items={professionals||[]} selectedId={professionalId} onSelect={setProfessionalId} returnTo="/saude/vacinas" disabled={busy}/>
       <ClinicalEntitySearch360 kind="location" label="Local cadastrado (opcional)" items={places||[]} selectedId={locationId} onSelect={setLocationId} returnTo="/saude/vacinas" disabled={busy}/>
              <label className="block text-xs text-ink-muted">Observação e fonte (opcional)<textarea className={field} rows={3} maxLength={2500} value={note} onChange={e=>setNote(e.target.value)}/></label><p className="text-xs leading-relaxed text-ink-muted">Datas e relatos não comprovam esquema completo ou proteção imunológica. Retificar preserva o evento original.</p><div className="flex flex-wrap gap-2"><button type="button" className={primary} disabled={!valid||!dayFromPt(day)} onClick={()=>void saveEvent()}><CheckCircle2 size={16}/>Salvar registro</button><button type="button" className={secondary} onClick={reset}>Cancelar edição</button></div></div>}
     <div className="space-y-2"><h3 className="text-sm font-semibold">Histórico desta vacina</h3>{courseEvents.length?courseEvents.map(e=><article key={e.id} id={"vacina-"+e.id} className="scroll-mt-24 rounded-xl border border-surface-border bg-void/35 p-3"><div className="flex items-start gap-2"><span className="mt-0.5 text-teal-300">{e.effective_kind==='plan'?<CalendarDays size={17}/>:e.effective_kind==='dose'?<Syringe size={17}/>:<Undo2 size={17}/>}</span><div className="min-w-0 flex-1"><strong className="text-sm">{e.effective_kind==='plan'?'Data planejada':e.effective_kind==='dose'?'Aplicação informada':'Registro cancelado'}</strong><p className="text-xs text-ink-muted">{datePtA8(e.planned_on||e.administered_on)}{e.dose_number?` · Dose ${e.dose_number}`:''} · {A8_SOURCE_LABEL[e.source]}</p>{e.lot&&<p className="text-xs text-ink-muted">Lote: {e.lot}</p>}{e.manufacturer&&<p className="text-xs text-ink-muted">Fabricante: {e.manufacturer}</p>}{e.note&&<p className="mt-1 break-words text-xs text-ink-secondary">{e.note}</p>}{e.kind==='amendment'&&<p className="text-[11px] text-ink-muted">Retificação documentada, histórico anterior preservado</p>}{e.source_professional_id&&professionals?.find(p=>p.id===e.source_professional_id)&&<Link className="mt-1 inline-flex min-h-11 items-center text-xs text-emerald-200 underline underline-offset-2" href={withReturnTarget('/saude/medicos/detalhes?id='+encodeURIComponent(e.source_professional_id),'/saude/vacinas?curso='+encodeURIComponent(e.course_id))}>Profissional: {professionals.find(p=>p.id===e.source_professional_id)?.nome}</Link>}{e.source_location_id&&places?.find(p=>p.id===e.source_location_id)&&<Link className="mt-1 inline-flex min-h-11 items-center text-xs text-emerald-200 underline underline-offset-2" href={withReturnTarget('/saude/locais/detalhes?id='+encodeURIComponent(e.source_location_id),'/saude/vacinas?curso='+encodeURIComponent(e.course_id))}>Local: {places.find(p=>p.id===e.source_location_id)?.nome}</Link>}</div></div><ClinicalReverseSensitivityA9 recordType="vaccination_event" recordId={e.id} returnTo={'/saude/vacinas?registro='+encodeURIComponent(e.id)}/>{e.effective_kind!=='void'&&!selectedCourse.deleted_at&&<div className="mt-3 flex flex-wrap gap-2"><button className={secondary} type="button" onClick={()=>editEvent(e)}>Editar por retificação</button><button className={secondary} type="button" onClick={()=>setAttachmentId(e.id)}><FileText size={16}/>Vincular comprovante</button><button className={secondary} type="button" onClick={()=>{setRetracting(e.id);setRetractNote('');}}><Trash2 size={15}/>Cancelar registro</button></div>}</article>):<p className="text-xs text-ink-muted">Sem aplicações ou planejamentos nesta vacina.</p>}</div>
     {retracting&&<div className="space-y-2 rounded-xl border border-amber-300/25 bg-amber-300/5 p-3"><h3 className="text-sm font-semibold">Confirmar cancelamento documental</h3><p className="text-xs text-ink-muted">O evento original continuará no histórico. Nenhum registro será apagado fisicamente.</p><textarea className={field} rows={2} value={retractNote} onChange={e=>setRetractNote(e.target.value)} placeholder="Motivo obrigatório"/><div className="flex flex-wrap gap-2"><button type="button" className={primary} disabled={!valid||!retractNote.trim()} onClick={()=>void retract()}>Confirmar cancelamento</button><button type="button" className={secondary} onClick={()=>setRetracting('')}>Voltar</button></div></div>}
     {attachmentId&&<div className="space-y-2 rounded-xl border border-surface-border bg-void/30 p-3"><p className="text-xs text-ink-muted">Anexar comprovante ao registro recém-salvo? O arquivo usa somente Documentos clínicos privados (M3).</p><input ref={fileRef} type="file" accept="application/pdf,image/png,image/jpeg,image/webp" className="sr-only" onChange={e=>void attach(e.target.files?.[0]||null)}/><button type="button" className={secondary} onClick={()=>fileRef.current?.click()} disabled={!valid}><FileText size={16}/>Selecionar comprovante</button><button type="button" className={secondary} onClick={()=>setAttachmentId('')}>Agora não</button></div>}
    </section>}
   {legacy&&legacy.length>0&&<section className="rounded-2xl border border-amber-300/20 bg-surface p-3"><h2 className="flex items-center gap-2 text-sm font-semibold"><History size={16}/>Relatos anteriores do Diário</h2><p className="mt-1 text-xs text-ink-muted">Preservados como registros históricos M144, sem conversão automática em doses da carteira.</p><div className="mt-2 space-y-1">{legacy.slice(0,20).map(e=><p key={e.id} className="text-xs text-ink-muted">{e.record.title} · {datePtA8(e.record.day)}</p>)}</div></section>}
   {notice&&<p role="status" className="rounded-xl border border-emerald-300/30 bg-emerald-300/5 p-3 text-xs text-ink-secondary">{notice}</p>}
   <p className="flex gap-2 text-[11px] leading-relaxed text-ink-muted"><ShieldCheck size={16} className="shrink-0 text-teal-300"/>O VAULT armazena informações declaradas e documentos; não substitui carteira oficial, avaliação clínica ou orientação profissional. Ausência de registros não significa ausência de vacinação.</p>
  </div>
 </main>;
}
