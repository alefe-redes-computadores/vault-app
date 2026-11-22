'use client';
import Link from 'next/link';
import {useEffect,useMemo,useRef,useState} from 'react';
import {useLiveQuery} from 'dexie-react-hooks';
import {Activity,ArrowLeft,CalendarDays,CheckCircle2,ChevronDown,ClipboardCheck,FileText,History,Plus,Search,ShieldCheck,Stethoscope,Undo2} from 'lucide-react';
import {useAuth} from '@/hooks/useAuth';
import {useActivePersonId} from '@/hooks/useActivePersonId';
import {useToast} from '@/components/ToastProvider';
import {useHapticFeedback} from '@/lib/haptics';
import {db} from '@/lib/db';
import {safeReturnTarget,withReturnTarget} from '@/lib/navigation/return-context';
import {registerClinicalAssetM3} from '@/lib/clinical-exams-m3/repository';
import {ClinicalEntitySearch360} from '@/components/saude/ClinicalEntitySearch360';
import {ClinicalReverseSensitivityA9} from '@/components/saude/ClinicalReverseSensitivityA9';
import {saveProcedureA9,saveSensitivityA9,voidA9} from '@/lib/clinical-a9/repository';
import {activeFactsA9,datePtA9,ptToDayA9,A9_PROCEDURE_LABEL,A9_SENSITIVITY_LABEL,A9_SEVERITY_LABEL,A9_SOURCE_LABEL,type A9Procedure,type A9Sensitivity,type A9Source,type A9SensitivityType,type A9Certainty,type A9Severity,type A9RelatedType,type A9ProcedureState} from '@/lib/clinical-a9/types';
const input='mt-1 min-h-11 w-full min-w-0 rounded-xl border border-surface-border bg-void/60 px-3 py-2 text-sm text-ink-primary outline-none focus-visible:border-emerald-300';
const btn='inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition-colors disabled:opacity-40';
const mainBtn=btn+' border-emerald-300/40 bg-emerald-400/15 text-emerald-200';
const secondBtn=btn+' border-surface-border bg-surface text-ink-secondary';
const page='/saude/procedimentos';
type Tab='procedure'|'sensitivity';
type RelationItem={id:string;nome:string};
function Choice<T extends string>({label,choices,value,onChange,disabled=false}:{label:string;choices:readonly {key:T;text:string}[];value:T;onChange:(v:T)=>void;disabled?:boolean}){
 return <fieldset disabled={disabled} className="min-w-0 space-y-1"><legend className="mb-1 text-xs text-ink-muted">{label}</legend><div className="flex flex-wrap gap-2" role="group">{choices.map(o=><button type="button" key={o.key} aria-pressed={value===o.key} onClick={()=>onChange(o.key)} className={value===o.key?mainBtn:secondBtn}>{o.text}</button>)}</div></fieldset>;
}
export function A9ClinicalWorkspace({initial='procedure',returnTo='/saude/minha-saude'}:{initial?:Tab;returnTo?:string}){
 const {user}=useAuth(),{activePersonId}=useActivePersonId(),{showToast}=useToast(),{trigger}=useHapticFeedback();
 const uid=user?.id||'',pid=activePersonId||'';
 const [tab,setTab]=useState<Tab>(initial),[search,setSearch]=useState(''),[dense,setDense]=useState(false),[editing,setEditing]=useState(false),[corrects,setCorrects]=useState('');
 const [title,setTitle]=useState(''),[category,setCategory]=useState<A9Procedure['category']>('ambulatory'),[state,setState]=useState<Exclude<A9ProcedureState,'void'>>('planned');
 const [sensType,setSensType]=useState<A9SensitivityType>('reaction'),[agent,setAgent]=useState(''),[certainty,setCertainty]=useState<A9Certainty>('suspected'),[severity,setSeverity]=useState<A9Severity>('unknown');
 const [day,setDay]=useState(''),[note,setNote]=useState(''),[source,setSource]=useState<A9Source>('self_report');
 const [professionalId,setProfessionalId]=useState(''),[locationId,setLocationId]=useState(''),[consultationId,setConsultationId]=useState(''),[rehabId,setRehabId]=useState('');
 const [relatedType,setRelatedType]=useState<A9RelatedType|null>(null),[relatedId,setRelatedId]=useState('');
 const [showHistory,setShowHistory]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[lastId,setLastId]=useState(''),[lastTab,setLastTab]=useState<Tab>('procedure'),[voidId,setVoidId]=useState(''),[voidReason,setVoidReason]=useState('');
 const inFlight=useRef(false),fileRef=useRef<HTMLInputElement|null>(null);
 const procedures=useLiveQuery(async()=>uid&&pid?db.procedure_events_a9.where('[user_id+person_id]').equals([uid,pid]).toArray():[],[uid,pid],[]);
 const sensitivities=useLiveQuery(async()=>uid&&pid?db.sensitivity_events_a9.where('[user_id+person_id]').equals([uid,pid]).toArray():[],[uid,pid],[]);
 const professionals=useLiveQuery(async()=>uid?db.medicos.where('user_id').equals(uid).toArray():[],[uid],[]);
 const places=useLiveQuery(async()=>uid?db.locais.where('user_id').equals(uid).toArray():[],[uid],[]);
 const consultations=useLiveQuery(async()=>uid&&pid?db.consultas.where('[user_id+person_id]').equals([uid,pid]).toArray():[],[uid,pid],[]);
 const rehab=useLiveQuery(async()=>uid&&pid?db.rehab_sessions_m5.where('[user_id+person_id]').equals([uid,pid]).toArray():[],[uid,pid],[]);
 const meds=useLiveQuery(async()=>uid&&pid?db.medicamentos.where('[user_id+person_id]').equals([uid,pid]).toArray():[],[uid,pid],[]);
 const vaccines=useLiveQuery(async()=>uid&&pid?db.vaccination_events_a8.where('[user_id+person_id]').equals([uid,pid]).toArray():[],[uid,pid],[]);
 const currentProcedures=useMemo(()=>activeFactsA9(procedures||[],uid,pid),[procedures,uid,pid]);
 const currentSensitivities=useMemo(()=>activeFactsA9(sensitivities||[],uid,pid),[sensitivities,uid,pid]);
 const referenceItems=useMemo(()=>{
  if(relatedType==='medication')return (meds||[]).map(x=>({id:x.id||'',nome:x.nome})).filter(x=>x.id);
  if(relatedType==='vaccination_event')return (vaccines||[]).filter(x=>x.effective_kind!=='void'&&!x.deleted_at&&!(vaccines||[]).some(other=>other.corrects_event_id===x.id)).map(x=>({id:x.id,nome:`Aplicação ou planejamento · ${datePtA9(x.administered_on||x.planned_on)}`}));
  if(relatedType==='procedure_event')return currentProcedures.map(x=>({id:x.id,nome:x.title+' · '+datePtA9(x.planned_on||x.performed_on)}));
  return [] as RelationItem[];
 },[relatedType,meds,vaccines,currentProcedures]);
 const history=tab==='procedure'?(procedures||[]).filter(e=>e.user_id===uid&&e.person_id===pid):(sensitivities||[]).filter(e=>e.user_id===uid&&e.person_id===pid);
 const results=tab==='procedure'?currentProcedures.filter(e=>(e.title+' '+e.note).toLocaleLowerCase('pt-BR').includes(search.toLocaleLowerCase('pt-BR'))):currentSensitivities.filter(e=>(e.agent_label+' '+e.note).toLocaleLowerCase('pt-BR').includes(search.toLocaleLowerCase('pt-BR')));
 const reset=()=>{setEditing(false);setCorrects('');setTitle('');setAgent('');setCategory('ambulatory');setState('planned');setSensType('reaction');setSeverity('unknown');setCertainty('suspected');setDay('');setNote('');setSource('self_report');setProfessionalId('');setLocationId('');setConsultationId('');setRehabId('');setRelatedType(null);setRelatedId('');setError('');};
 useEffect(()=>{reset();setLastId('');setVoidId('');setVoidReason('');setShowHistory(false);},[uid,pid]);
 useEffect(()=>{if(typeof window==='undefined')return;const id=new URLSearchParams(window.location.search).get('id');if(!id)return;const node=document.getElementById('a9-'+id);node?.scrollIntoView({block:'center',behavior:'smooth'});},[procedures,sensitivities,tab]);
 function editProcedure(e:A9Procedure){reset();setTab('procedure');setEditing(true);setCorrects(e.id);setTitle(e.title);setCategory(e.category);setState(e.effective_status==='void'?'planned':e.effective_status);setDay(datePtA9(e.planned_on||e.performed_on));setSource(e.source);setNote(e.note||'');setProfessionalId(e.professional_id||'');setLocationId(e.location_id||'');setConsultationId(e.consultation_id||'');setRehabId(e.rehab_session_id||'');}
 function editSensitivity(e:A9Sensitivity){reset();setTab('sensitivity');setEditing(true);setCorrects(e.id);setSensType(e.sensitivity_type);setAgent(e.agent_label);setCertainty(e.certainty);setSeverity(e.severity);setDay(datePtA9(e.reported_on));setSource(e.source);setNote(e.note||'');setProfessionalId(e.professional_id||'');setRelatedType(e.related_type);setRelatedId(e.related_id||'');}
 const notify=(message:string)=>{showToast(message,'success');trigger('success');};
 async function save(){if(inFlight.current||!uid||!pid)return;const date=ptToDayA9(day);if(!date){setError('Confira a data no formato DD/MM/AAAA');return;}
  inFlight.current=true;setBusy(true);setError('');try{
   const id=tab==='procedure'?await saveProcedureA9({personId:pid,title,category,state,day:date,source,note,professionalId,locationId,consultationId,rehabSessionId:rehabId,correctsId:corrects}):
    await saveSensitivityA9({personId:pid,type:sensType,agent,certainty,severity,day:date,source,note,professionalId,relatedType,relatedId,correctsId:corrects});
   reset();setLastId(id);setLastTab(tab);notify('Registro salvo neste aparelho; sincronização pode estar pendente.');
  }catch(e){setError(e instanceof Error?e.message:'Não foi possível salvar');showToast('Confira os campos do registro','error');}
  finally{inFlight.current=false;setBusy(false);}}
 async function retract(){if(inFlight.current||!voidId||!voidReason.trim())return;inFlight.current=true;setBusy(true);setError('');try{
  await voidA9({personId:pid,table:tab==='procedure'?'procedure_events_a9':'sensitivity_events_a9',eventId:voidId,reason:voidReason});setVoidId('');setVoidReason('');notify('Cancelamento documental registrado, histórico preservado.');
 }catch(e){setError(e instanceof Error?e.message:'Não foi possível retificar');}finally{inFlight.current=false;setBusy(false);}}
 async function attach(file:File|null){if(!file||!lastId||!pid||inFlight.current)return;inFlight.current=true;setBusy(true);try{
  const r=await registerClinicalAssetM3({personId:pid,file,targets:[{entity_type:lastTab==='procedure'?'procedure_event':'sensitivity_event',entity_id:lastId}],role:'supporting'});
  setLastId('');notify(r.uploaded?'Documento privado vinculado.':'Documento local salvo; envio privado pendente.');
 }catch(e){setError(e instanceof Error?e.message:'Não foi possível vincular documento');}finally{if(fileRef.current)fileRef.current.value='';inFlight.current=false;setBusy(false);}}
 function relatedUrl(e:A9Sensitivity){if(!e.related_id)return null;if(e.related_type==='medication')return '/saude/medicamentos/detalhes?id='+encodeURIComponent(e.related_id);
  if(e.related_type==='vaccination_event')return '/saude/vacinas?registro='+encodeURIComponent(e.related_id);if(e.related_type==='procedure_event')return '/saude/procedimentos?id='+encodeURIComponent(e.related_id);return null;}
 return <main className="min-h-[100dvh] bg-void px-4 pb-[calc(8rem+env(safe-area-inset-bottom,0px))] pt-5 header-safe-top text-ink-primary"><div className="mx-auto max-w-3xl space-y-4">
  <header className="flex items-start gap-3"><Link href={safeReturnTarget(returnTo,'/saude/minha-saude')} aria-label="Voltar" className={secondBtn+' size-11 shrink-0'}><ArrowLeft size={19}/></Link><div className="min-w-0 flex-1"><h1 className="text-xl font-bold">A9 · Experiências clínicas</h1><p className="mt-1 text-xs leading-relaxed text-ink-muted">Procedimentos não cirúrgicos, alergias, intolerâncias e reações relatadas. Não substitui avaliação profissional.</p></div></header>
  <div className="grid grid-cols-2 gap-2"><Link href={withReturnTarget('/saude/procedimentos',returnTo)} aria-current={tab==='procedure'?'page':undefined} onClick={()=>{setTab('procedure');reset();setLastId('');setSearch('');}} className={tab==='procedure'?mainBtn:secondBtn}><Stethoscope size={18}/>Procedimentos</Link><Link href={withReturnTarget('/saude/reacoes',returnTo)} aria-current={tab==='sensitivity'?'page':undefined} onClick={()=>{setTab('sensitivity');reset();setLastId('');setSearch('');}} className={tab==='sensitivity'?mainBtn:secondBtn}><Activity size={18}/>Alergias e reações</Link></div>
  <div className="grid grid-cols-3 gap-2">{[['Procedimentos',currentProcedures.length],['Relatos',currentSensitivities.length],['Planejados',currentProcedures.filter(x=>x.effective_status==='planned').length]].map(([label,n])=><div key={label} className="min-w-0 rounded-xl border border-surface-border bg-surface px-2 py-3 text-center"><strong className="block text-xl tabular-nums text-emerald-200">{n}</strong><span className="break-words text-[10px] text-ink-muted">{label}</span></div>)}</div>
  <section className="rounded-2xl border border-surface-border bg-surface/80 p-3"><div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-sm font-semibold">{tab==='procedure'?'Registros de procedimentos':'Relatos de sensibilidade'}</h2><button type="button" className={mainBtn} disabled={!uid||!pid} onClick={()=>{reset();setEditing(true);}}><Plus size={16}/>Novo registro</button></div>
   <label className="relative mt-3 block"><Search size={17} className="pointer-events-none absolute left-3 top-3.5 text-ink-muted"/><input className={input+' pl-10'} value={search} onChange={e=>setSearch(e.target.value)} placeholder="Pesquisar registros"/></label><button type="button" onClick={()=>setDense(v=>!v)} className={secondBtn+' mt-2'} aria-pressed={dense}><ChevronDown size={16}/>{dense?'Modo confortável':'Modo compacto'}</button>
   <div className="mt-3 space-y-2">{!results.length?<p className="rounded-xl border border-dashed border-surface-border p-4 text-xs text-ink-muted">Nenhum registro encontrado. Você pode cadastrar um fato declarado ou manter a área vazia.</p>:results.map(e=><article key={e.id} id={'a9-'+e.id} className={'rounded-xl border border-surface-border bg-void/40 '+(dense?'p-2':'p-3')}>
    <div className="flex min-w-0 items-start gap-2"><span className="mt-1 text-teal-300">{tab==='procedure'?<ClipboardCheck size={19}/>:<Activity size={19}/>}</span><div className="min-w-0 flex-1"><h3 className="break-words text-sm font-semibold">{'title' in e?e.title:e.agent_label}</h3><p className="mt-1 text-xs text-ink-muted">{'effective_status' in e?A9_PROCEDURE_LABEL[e.effective_status]:A9_SENSITIVITY_LABEL[e.sensitivity_type]} · {datePtA9('performed_on' in e?(e.performed_on||e.planned_on):e.reported_on)}</p>{!dense&&<><p className="mt-1 text-xs text-ink-muted">{A9_SOURCE_LABEL[e.source]}{'certainty' in e?' · '+(e.certainty==='suspected'?'Suspeita relatada':'Documento profissional informado'):''}</p>{e.note&&<p className="mt-2 break-words text-xs text-ink-secondary">{e.note}</p>}</>}{e.kind==='amendment'&&<span className="text-[11px] text-ink-muted">Retificação com histórico preservado</span>}</div></div>
    <div className="mt-2 flex flex-wrap gap-2"><button type="button" className={secondBtn} onClick={()=>'title' in e?editProcedure(e):editSensitivity(e)}><History size={16}/>Retificar</button><button type="button" className={secondBtn} onClick={()=>{setVoidId(e.id);setVoidReason('');setEditing(false);}}><Undo2 size={16}/>Cancelar relato</button><button type="button" className={secondBtn} onClick={()=>{setLastId(e.id);setLastTab(tab);}}><FileText size={16}/>Vincular comprovante</button>{'related_type' in e&&relatedUrl(e)&&<Link className={secondBtn} href={withReturnTarget(relatedUrl(e)!,tab==='procedure'?page:'/saude/reacoes')}>Ver vínculo declarado</Link>}</div>
   {tab==='procedure'&&<ClinicalReverseSensitivityA9 recordType="procedure_event" recordId={e.id} returnTo={'/saude/procedimentos?id='+encodeURIComponent(e.id)}/>}
   </article>)}</div>
   <button type="button" className={secondBtn+' mt-3'} aria-expanded={showHistory} onClick={()=>setShowHistory(v=>!v)}><History size={16}/>{showHistory?'Recolher histórico':'Histórico integral e retificações ('+history.length+')'}</button>
   {showHistory&&<div className="mt-2 space-y-2">{history.slice().sort((a,b)=>b.created_at.localeCompare(a.created_at)).map(e=><div key={e.id} className="rounded-xl border border-surface-border px-3 py-2 text-xs text-ink-secondary"><div className="flex min-w-0 items-center gap-2"><History size={15} className="shrink-0 text-teal-300"/><span className="min-w-0 flex-1 break-words">{'title' in e?e.title:e.agent_label} · {e.kind==='void'?'Cancelamento documental':e.kind==='amendment'?'Retificação preservada':'Registro original'}</span></div><p className="mt-1 text-[11px] text-ink-muted">{new Date(e.created_at).toLocaleDateString('pt-BR')} · {'performed_on' in e?datePtA9(e.performed_on||e.planned_on):datePtA9(e.reported_on)} · {A9_SOURCE_LABEL[e.source]}</p>{e.note&&<p className="mt-1 break-words">{e.note}</p>}</div>)}</div>}
  </section>
  {voidId&&<section className="space-y-2 rounded-2xl border border-amber-300/30 bg-surface p-3"><h2 className="font-semibold text-sm">Cancelar sem apagar o histórico</h2><p className="text-xs text-ink-muted">A retificação preserva o registro anterior e não altera automaticamente outros prontuários.</p><textarea className={input} rows={2} value={voidReason} onChange={e=>setVoidReason(e.target.value)} placeholder="Motivo obrigatório"/><div className="flex flex-wrap gap-2"><button type="button" className={mainBtn} disabled={busy||!voidReason.trim()} onClick={()=>void retract()}>Confirmar retificação</button><button type="button" className={secondBtn} onClick={()=>setVoidId('')}>Voltar</button></div></section>}
  {editing&&<section className="space-y-3 rounded-2xl border border-emerald-300/20 bg-surface p-3"><h2 className="flex items-center gap-2 text-sm font-semibold"><CheckCircle2 size={17} className="text-emerald-300"/>{corrects?'Retificar preservando a versão anterior':'Registrar informação'}</h2>
   {tab==='procedure'?<><label className="block text-xs text-ink-muted">Nome do procedimento<input className={input} value={title} onChange={e=>setTitle(e.target.value)} maxLength={180} placeholder="Ex.: curativo ambulatorial"/></label>
    <Choice label="Tipo de procedimento" value={category} onChange={setCategory} choices={[{key:'ambulatory',text:'Ambulatorial'},{key:'dressing',text:'Curativo'},{key:'other',text:'Outro não cirúrgico'}]}/>
    <Choice label="Estado real" value={state} onChange={setState} choices={[{key:'planned',text:'Planejado'},{key:'performed',text:'Realizado (informado)'},{key:'not_performed',text:'Não realizado'}]}/>
   </>:<><label className="block text-xs text-ink-muted">Substância ou evento relatado<input className={input} value={agent} onChange={e=>setAgent(e.target.value)} maxLength={180} placeholder="Ex.: medicamento, alimento ou reação"/></label>
    <Choice label="Natureza declarada" value={sensType} onChange={setSensType} choices={[{key:'allergy',text:'Alergia informada'},{key:'intolerance',text:'Intolerância'},{key:'reaction',text:'Reação relatada'}]}/>
    <Choice label="Grau de documentação" value={certainty} onChange={v=>{setCertainty(v);if(v==='documented_by_professional')setSource('professional_document');}} choices={[{key:'suspected',text:'Suspeita / relato'},{key:'documented_by_professional',text:'Documento profissional informado'}]}/>
    <Choice label="Intensidade informada (não é classificação clínica)" value={severity} onChange={setSeverity} choices={[{key:'unknown',text:'Não informada'},{key:'mild',text:'Leve'},{key:'moderate',text:'Moderada'},{key:'severe',text:'Intensa'}]}/>
   </>}
   <label className="block text-xs text-ink-muted">{tab==='procedure'?(state==='planned'?'Data prevista':'Data informada'):'Data do relato'}<input className={input} inputMode="numeric" placeholder="DD/MM/AAAA" value={day} onChange={e=>setDay(e.target.value.slice(0,14))} onBlur={()=>{const v=ptToDayA9(day);if(v)setDay(datePtA9(v));}}/></label>
   <Choice label="Origem (sem validação clínica automática)" value={source} onChange={v=>{setSource(v);if(tab==='sensitivity'&&v==='self_report')setCertainty('suspected');}} choices={[{key:'self_report',text:'Relato pessoal'},{key:'professional_document',text:'Documento informado'}]}/>
   <ClinicalEntitySearch360 kind="professional" label="Profissional existente (opcional)" items={professionals||[]} selectedId={professionalId} onSelect={setProfessionalId} returnTo={tab==='procedure'?'/saude/procedimentos':'/saude/reacoes'} disabled={busy}/>
   {tab==='procedure'?<><ClinicalEntitySearch360 kind="location" label="Local existente (opcional)" items={places||[]} selectedId={locationId} onSelect={setLocationId} returnTo="/saude/procedimentos" disabled={busy}/>
    <ClinicalEntitySearch360 kind="consultation" label="Consulta relacionada por ID (opcional)" detailsRoot="/saude/consultas/detalhes" items={(consultations||[]).map(x=>({id:x.id||'',nome:'Consulta · '+datePtA9(x.data)}))} selectedId={consultationId} onSelect={setConsultationId} returnTo="/saude/procedimentos" disabled={busy}/>
    <ClinicalEntitySearch360 kind="rehab_session" label="Sessão de reabilitação existente (opcional)" detailsRoot="/saude/reabilitacao/detalhes" items={(rehab||[]).map(x=>({id:x.id,nome:'Sessão · '+(x.scheduled_at?x.scheduled_at.slice(0,10):'sem data'),detailHref:'/saude/reabilitacao/detalhes?id='+encodeURIComponent(x.program_id)}))} selectedId={rehabId} onSelect={setRehabId} returnTo="/saude/procedimentos" disabled={busy}/>
   </>:<><Choice label="Relação temporal declarada (não prova causa)" value={relatedType||'none'} onChange={v=>{setRelatedType(v==='none'?null:v);setRelatedId('');}} choices={[{key:'none',text:'Sem vínculo'},{key:'medication',text:'Medicamento'},{key:'vaccination_event',text:'Vacinação'},{key:'procedure_event',text:'Procedimento'}] as readonly {key:A9RelatedType|'none';text:string}[]}/>
    {relatedType&&<ClinicalEntitySearch360 kind={relatedType} label="Selecionar registro existente por ID" detailsRoot={relatedType==='medication'?'/saude/medicamentos/detalhes':relatedType==='vaccination_event'?'/saude/vacinas':'/saude/procedimentos'} detailsParam={relatedType==='vaccination_event'?'registro':'id'} items={referenceItems} selectedId={relatedId} onSelect={setRelatedId} returnTo="/saude/reacoes" disabled={busy}/>}
    <p className="text-xs leading-relaxed text-ink-muted">Uma sequência temporal não demonstra causalidade. O VAULT não conclui alergia, diagnóstico ou reação adversa.</p>
   </>}
   <label className="block text-xs text-ink-muted">Descrição e evidências informadas (opcional)<textarea className={input} value={note} onChange={e=>setNote(e.target.value)} rows={3} maxLength={3000}/></label>
   <div className="flex flex-wrap gap-2"><button type="button" className={mainBtn} onClick={()=>void save()} disabled={busy||!ptToDayA9(day)||(tab==='procedure'?!title.trim():!agent.trim())}><CheckCircle2 size={16}/>Salvar registro</button><button type="button" className={secondBtn} onClick={reset}>Cancelar edição</button></div>
  </section>}
  {lastId&&<section className="space-y-2 rounded-2xl border border-emerald-300/20 bg-surface p-3"><h2 className="flex items-center gap-2 text-sm font-semibold"><FileText size={18}/>Comprovante privado M3</h2><p className="text-xs text-ink-muted">Vincule um PDF ou imagem ao fato recém-salvo. O arquivo não vira diagnóstico nem confirmação de sincronização.</p><input className="sr-only" ref={fileRef} type="file" accept="application/pdf,image/jpeg,image/png,image/webp" onChange={e=>void attach(e.target.files?.[0]||null)}/><div className="flex flex-wrap gap-2"><button type="button" disabled={busy} className={mainBtn} onClick={()=>fileRef.current?.click()}><FileText size={16}/>Selecionar comprovante</button><button type="button" className={secondBtn} onClick={()=>setLastId('')}>Agora não</button></div></section>}
  {error&&<p role="alert" className="rounded-xl border border-rose-300/30 bg-rose-300/5 p-3 text-xs text-rose-200">{error}</p>}
  <p className="flex gap-2 text-xs leading-relaxed text-ink-muted"><ShieldCheck size={19} className="shrink-0 text-teal-300"/>Informações declaradas e documentos permanecem privados e específicos da pessoa ativa. Não substituem avaliação profissional ou prontuário oficial.</p>
 </div></main>;
}
