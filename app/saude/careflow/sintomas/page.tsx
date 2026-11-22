'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { preserveReturnTarget } from '@/lib/navigation/return-context';
import { ArrowLeft, MessageSquareHeart, Plus, ShieldCheck, Ear, RefreshCw, Frown, Flame, BatteryLow, MoonStar, Activity, CalendarClock, Pill, Stethoscope, ChevronRight } from 'lucide-react';
import { PageTransition } from '@/components/PageTransition';
import { ClinicalBackLinkP0 } from '@/components/saude/ClinicalBackLinkP0';
import { CustomDatePicker } from '@/components/DatePicker';
import { HealthTimePicker } from '@/components/saude/HealthTimePicker';
import { HealthRelationPicker } from '@/components/saude/HealthRelationPicker';
import { useAuth } from '@/hooks/useAuth';
import { useActivePersonId } from '@/hooks/useActivePersonId';
import { useConsultas } from '@/hooks/useConsultas';
import { useMedicamentos } from '@/hooks/useMedicamentos';
import { useRegistrosSaude } from '@/hooks/useRegistrosSaude';
import { useCareFlowM2 } from '@/hooks/useCareFlowM2';
import { getLocalTodayISO } from '@/lib/health-utils';
import { useHapticFeedback } from '@/lib/haptics';
import { useToast } from '@/components/ToastProvider';
import { isClockM2, isIsoDateM2 } from '@/lib/careflow-m2/domain';
import {recordKeyFromHashR3,revealCountR3} from '@/lib/m3/careflow-display-r3';
const pick='min-h-11 w-full rounded-xl border border-surface-border bg-surface-raised px-3 text-sm text-ink-primary outline-none';
const types=['Zumbido','Tontura','Náusea','Dor','Cansaço','Sono','Outro'];
const iconOf=(t:string)=>/zumbido/i.test(t)?Ear:/tontura/i.test(t)?RefreshCw:/nausea|náusea/i.test(t)?Frown:/dor/i.test(t)?Flame:/cansa/i.test(t)?BatteryLow:/sono/i.test(t)?MoonStar:MessageSquareHeart;
const intensityTone=(n:number|null|undefined)=>typeof n==='number'&&n>=7?'border-rose-400/35 bg-rose-400/[.10] text-rose-300':typeof n==='number'&&n>=4?'border-amber-400/35 bg-amber-400/[.08] text-amber-300':'border-emerald-300/25 bg-emerald-300/[.055] text-emerald-300';
export default function SymptomsCareFlowPage(){
  const router=useRouter();
  const {showSuccess,showError}=useToast();
  // R6: sintomas são consultados na Linha de cuidado; esta rota mantém editor e links antigos.
  useEffect(()=>{
    const params=new URLSearchParams(window.location.search);
    if(params.has('novo')||params.has('consulta')||window.location.hash.startsWith('#careflow-sintoma-'))return;
    router.replace(preserveReturnTarget('/saude/registros?foco=sintomas',params));
  },[router]);
  const {user}=useAuth(),{activePersonId}=useActivePersonId();const {trigger}=useHapticFeedback();const {consultas=[]}=useConsultas();
  const {medicamentos=[]}=useMedicamentos();const {registros=[],createRegistro}=useRegistrosSaude();const {events=[],append}=useCareFlowM2();
  const [type,setType]=useState(types[0]),[other,setOther]=useState(''),[intensity,setIntensity]=useState(5),[date,setDate]=useState(getLocalTodayISO()),[time,setTime]=useState(new Date().toTimeString().slice(0,5));
  const [note,setNote]=useState(''),[medication,setMedication]=useState(''),[consultation,setConsultation]=useState(''),[busy,setBusy]=useState(false),[status,setStatus]=useState('');
  const submitLock=useRef(false);
  const appliedConsultation=useRef('');
  const dateEdited=useRef(false),timeEdited=useRef(false);
  useEffect(()=>{const refresh=()=>{if(document.visibilityState==='hidden')return;
    if(!dateEdited.current)setDate(getLocalTodayISO());
    if(!timeEdited.current)setTime(new Date().toTimeString().slice(0,5));};
    window.addEventListener('focus',refresh);document.addEventListener('visibilitychange',refresh);
    return()=>{window.removeEventListener('focus',refresh);document.removeEventListener('visibilitychange',refresh);};
  },[]);
  const [composeOpen,setComposeOpen]=useState(false);
  useEffect(()=>{const query=new URLSearchParams(window.location.search);if(query.get('novo')==='1'||query.has('consulta'))setComposeOpen(true);},[]);
  const [pendingLink,setPendingLink]=useState<{recordId:string;consultationId:string;date:string;time:string;userId:string;personId:string}|null>(null);
  const [historyLimit,setHistoryLimit]=useState(100);
  useEffect(()=>{
    if(!user?.id||!activePersonId)return;
    const id=new URLSearchParams(window.location.search).get('consulta')||'';
    const match=consultas.find(c=>c.id===id&&c.user_id===user.id&&c.person_id===activePersonId);
    const key=`${user.id}:${activePersonId}:${id}`;
    if(!match||appliedConsultation.current===key)return;
    appliedConsultation.current=key;
    setConsultation(current=>current||id);
  },[consultas,user?.id,activePersonId]);
  const own=useMemo(()=>registros.filter(r=>r.user_id===user?.id&&r.person_id===activePersonId&&r.categoria==='sintoma').sort((a,b)=>`${b.data}T${b.horario||'00:00'}`.localeCompare(`${a.data}T${a.horario||'00:00'}`)),[registros,user?.id,activePersonId]);
  const add=async()=>{
    if(!activePersonId||!user?.id||busy||submitLock.current||pendingLink)return;submitLock.current=true;setBusy(true);setStatus('');
    try{
      const name=(type==='Outro'?other:type).trim();if(!name||!isIsoDateM2(date)||!isClockM2(time))throw new Error('Informe sintoma, data e horário válidos.');
      if(consultation&&!consultas.some(c=>c.id===consultation&&c.user_id===user?.id&&c.person_id===activePersonId))throw new Error('Consulta vinculada não pertence à pessoa ativa.');
      if(medication&&!medicamentos.some(m=>m.id===medication&&m.user_id===user?.id&&m.person_id===activePersonId))throw new Error('Medicamento mencionado não pertence à pessoa ativa.');
      const recordId=await createRegistro({categoria:'sintoma',tipo:name.toLocaleLowerCase('pt-BR'),nome:name,data:date,horario:time,intensidade:intensity,observacoes:note.trim().slice(0,500),medicamento_id:medication||null});
      showSuccess('Sintoma salvo neste aparelho.');
      // Registro canônico já criado: limpar somente depois da resposta da criação.
      setType(types[0]);setOther('');setIntensity(5);setDate(getLocalTodayISO());setTime(new Date().toTimeString().slice(0,5));setNote('');dateEdited.current=false;timeEdited.current=false;trigger('vibrate');
      if(consultation){try{await append({kind:'monitor_note',related_id:recordId,parent_id:consultation,payload:{date,time,link:'consultation_to_existing_symptom',origin:'patient_confirmed'}});setPendingLink(null);setStatus('Sintoma registrado e vinculado à consulta.');setComposeOpen(false);}
        catch{setPendingLink({recordId,consultationId:consultation,date,time,userId:user!.id,personId:activePersonId});setStatus('Sintoma registrado. Falta confirmar o vínculo à consulta. Use Reparar vínculo; não registre o mesmo sintoma novamente.');}}
      else {setStatus('Sintoma registrado na Linha de Saúde.');setComposeOpen(false);}
    }catch(e){const explanation=e instanceof Error?e.message:'Não foi possível registrar o sintoma.';setStatus(explanation);showError(explanation);}finally{submitLock.current=false;setBusy(false);}
  };
  const repair=async()=>{if(!pendingLink||busy||pendingLink.userId!==user?.id||pendingLink.personId!==activePersonId)return;setBusy(true);try{const {recordId,consultationId,date,time}=pendingLink;
    await append({kind:'monitor_note',related_id:recordId,parent_id:consultationId,payload:{date,time,link:'consultation_to_existing_symptom',origin:'patient_confirmed'}});
    setPendingLink(null);setStatus('Vínculo recuperado sem duplicar o sintoma.');trigger('vibrate');
    }catch{setStatus('O registro continua salvo. Não foi possível recuperar o vínculo; tente novamente mais tarde.');}finally{setBusy(false);}};
  const links=useMemo(()=>new Set(events.filter(x=>x.kind==='monitor_note'&&x.payload.link==='consultation_to_existing_symptom'&&x.user_id===user?.id&&x.person_id===activePersonId).map(x=>x.related_id)),[events,user?.id,activePersonId]);
  const consultBySymptom=useMemo(()=>new Map(events.filter(x=>x.kind==='monitor_note'&&x.payload.link==='consultation_to_existing_symptom'&&x.user_id===user?.id&&x.person_id===activePersonId&&x.related_id&&x.parent_id).map(x=>[x.related_id!,x.parent_id!] as const)),[events,user?.id,activePersonId]);
  useEffect(()=>{
    const id=recordKeyFromHashR3(window.location.hash,'#careflow-sintoma-');
    if(!id)return;
    const index=own.findIndex(r=>r.id===id);if(index<0)return;
    const next=revealCountR3(index,historyLimit,100);
    if(next>historyLimit){setHistoryLimit(next);return;}
    const frame=requestAnimationFrame(()=>document.getElementById(`careflow-sintoma-${id}`)?.scrollIntoView({block:'center',behavior:'auto'}));
    return()=>cancelAnimationFrame(frame);
  },[own,historyLimit]);
  const [trendName,setTrendName]=useState('');
  const selectedTrend=trendName||own[0]?.nome||'';
  const trend=useMemo(()=>own.filter(r=>r.nome===selectedTrend).slice(0,50).reverse().filter(r=>typeof r.intensidade==='number'),[own,selectedTrend]);
  const points=useMemo(()=>trend.map((r,i)=>`${15+i*290/Math.max(1,trend.length-1)},${115-(r.intensidade||0)*10}`).join(' '),[trend]);
  return <PageTransition><main className="min-h-screen bg-void px-4 pb-32 pt-5 header-safe-top text-ink-primary vault-adaptive-tail"><div className="mx-auto max-w-3xl space-y-4"><header className="flex gap-3"><ClinicalBackLinkP0 fallback="/saude/careflow" className="grid size-11 shrink-0 place-items-center rounded-xl border border-surface-border" /><div><p className="text-[10px] font-bold uppercase tracking-widest text-rose-300">Saúde · Sintomas</p><h1 className="text-xl font-bold">Sintomas e evolução</h1><p className="text-xs text-ink-muted">Relatos com hora real, intensidade e vínculos confirmados.</p></div></header>
    <div className="flex flex-wrap gap-2"><Link href="/saude/registros" className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl border border-surface-border bg-surface px-3 text-xs font-semibold text-ink-secondary">Ver Linha de cuidado</Link><button type="button" aria-expanded={composeOpen} onClick={()=>setComposeOpen(v=>!v)} className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-300 px-3 text-xs font-bold text-void"><Plus size={16}/>{composeOpen?'Recolher formulário':'Registrar sintoma'}</button></div>
    {composeOpen&&<section className="space-y-3 rounded-3xl border border-rose-300/20 bg-surface p-4"><h2 className="flex items-center gap-2 text-sm font-bold"><MessageSquareHeart size={17} className="text-rose-300"/>Novo sintoma observado</h2><div role="group" aria-label="Tipo de sintoma" className="grid grid-cols-2 gap-2 min-[390px]:grid-cols-3">{types.map(name=>{const Icon=iconOf(name);return <button type="button" key={name} aria-pressed={type===name} onClick={()=>setType(name)} className={`flex min-h-11 min-w-0 items-center gap-2 rounded-xl border px-2 text-xs font-semibold ${type===name?'border-rose-300/50 bg-rose-300/[.10] text-rose-200':'border-surface-border text-ink-muted'}`}><Icon size={16} className="shrink-0"/>{name}</button>})}</div><div className="mt-3 grid grid-cols-2 gap-2"><div className="min-w-0 text-xs text-ink-muted"><span>Sintoma</span><HealthRelationPicker title="Selecionar sintoma" kind="symptom" value={type} onValueChange={setType} className={`${pick} mt-1`}>{types.map(t=><option key={t} value={t}>{t}</option>)}</HealthRelationPicker></div><label className="text-xs text-ink-muted">Intensidade relatada: {intensity}/10<input type="range" min={0} max={10} step={1} value={intensity} onChange={e=>setIntensity(Number(e.target.value))} className="mt-3 w-full"/></label>{type==='Outro'&&<label className="col-span-2 text-xs text-ink-muted">Nome do sintoma<input className={`${pick} mt-1`} value={other} onChange={e=>setOther(e.target.value)} maxLength={100}/></label>}<CustomDatePicker className="min-w-0 [&>label]:mb-1 [&>label]:text-xs [&>label]:font-normal [&>label]:text-ink-muted [&_input]:h-12 [&_input]:py-0" label="Dia real" value={date} onChange={value=>{dateEdited.current=true;setDate(value);}} maxDate={getLocalTodayISO()}/><div className="min-w-0 text-xs text-ink-muted"><span className="mb-1.5 block">Horário real</span><HealthTimePicker className="h-12" value={time} onChange={value=>{timeEdited.current=true;setTime(value);}} clearable={false}/></div></div><label className="block text-xs text-ink-muted">Contexto relatado<textarea rows={3} className={`${pick} mt-1 p-3`} value={note} onChange={e=>setNote(e.target.value)} maxLength={500} placeholder="O que você percebeu, sem presumir a causa."/></label><div className="text-xs text-ink-muted"><span>Medicamento mencionado (opcional; não indica causalidade)</span><HealthRelationPicker title="Selecionar medicamento" value={medication} onValueChange={setMedication} className={`${pick} mt-1`} medications={medicamentos}><option value="">Nenhum vínculo</option>{medicamentos.filter(m=>m.id&&m.user_id===user?.id&&m.person_id===activePersonId).map(m=><option value={m.id} key={m.id}>{m.nome}</option>)}</HealthRelationPicker></div><div className="text-xs text-ink-muted"><span>Consulta relacionada (opcional)</span><HealthRelationPicker title="Selecionar consulta" kind="consultation" value={consultation} onValueChange={setConsultation} className={`${pick} mt-1`}><option value="">Nenhuma</option>{consultas.filter(c=>c.id&&c.user_id===user?.id&&c.person_id===activePersonId).map(c=><option key={c.id} value={c.id}>{c.data?.split('-').reverse().join('/')} · {c.especialidade||c.medico||'Consulta'}</option>)}</HealthRelationPicker></div><button type="button" disabled={busy||!activePersonId||Boolean(pendingLink)} onClick={()=>void add()} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-300 text-sm font-bold text-void disabled:opacity-40"><ShieldCheck size={17}/>Guardar relato real</button>{status&&<p role="status" aria-live="polite" className="rounded-xl border border-amber-300/25 bg-amber-300/[.06] p-3 text-xs text-amber-100">{status}</p>}{pendingLink&&pendingLink.userId===user?.id&&pendingLink.personId===activePersonId&&<button type="button" disabled={busy} onClick={()=>void repair()} className="min-h-11 w-full rounded-xl border border-amber-300/40 bg-amber-300/[.07] px-3 text-xs font-semibold text-amber-200">Reparar vínculo salvo — sem criar outro sintoma</button>}</section>}
    {!composeOpen && status && <p role="status" aria-live="polite" className="rounded-xl border border-emerald-300/25 bg-emerald-300/[.06] p-3 text-xs text-emerald-200">{status}</p>}
    {!composeOpen && pendingLink && pendingLink.userId===user?.id && pendingLink.personId===activePersonId && <button type="button" disabled={busy} onClick={()=>void repair()} className="min-h-11 w-full rounded-xl border border-amber-300/40 bg-amber-300/[.07] px-3 text-xs font-semibold text-amber-200">Reparar vínculo da consulta sem duplicar sintoma</button>}
    {(trend.length>0||own.length>0)&&<section className="rounded-2xl border border-surface-border bg-surface p-3"><h2 className="text-sm font-bold">Evolução por tipo de sintoma</h2><div className="mt-2 text-xs text-ink-muted"><span>Comparar registros de</span><HealthRelationPicker title="Escolher sintoma para evolução" kind="symptom" value={selectedTrend} onValueChange={setTrendName} className={`${pick} mt-1`}>{[...new Set(own.map(r=>r.nome))].filter(Boolean).map(name=><option key={name} value={name}>{name}</option>)}</HealthRelationPicker></div><p className="mt-1 text-[10px] text-ink-muted">Intensidades declaradas apenas para o sintoma escolhido. Uma única medida não representa tendência.</p>{trend.length>1?<svg viewBox="0 0 320 130" role="img" aria-label="Intensidade relatada dos últimos sintomas em ordem cronológica" className="mt-2 w-full"><line x1="15" y1="115" x2="305" y2="115" stroke="currentColor" strokeOpacity="0.2"/><polyline fill="none" stroke="#34d399" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" points={points}/></svg>:<p className="mt-3 text-xs text-ink-muted">Ainda não há duas observações desse sintoma para desenhar uma evolução.</p>}</section>}
    <section className="space-y-2"><h2 className="flex items-center gap-2 text-sm font-bold"><Plus size={16} className="text-emerald-300"/>Histórico por data ({own.length})</h2>{!own.length&&<p className="text-xs text-ink-muted">Nenhum sintoma documentado para esta pessoa.</p>}{own.slice(0,historyLimit).map((r,i,history)=><div key={r.id}>{(i===0||history[i-1].data!==r.data)&&<h3 className="pt-3 text-xs font-bold text-rose-200">{r.data?.split('-').reverse().join('/')}</h3>}<article id={r.id?`careflow-sintoma-${r.id}`:undefined} className="scroll-mt-28 rounded-2xl border border-surface-border bg-surface p-3" key={r.id}><p className="text-[10px] text-ink-muted">{r.data?.split('-').reverse().join('/')} · {r.horario||'sem horário'}{links.has(r.id||'')?' · Vinculado à consulta':''}</p><div className="mt-1 flex items-center justify-between"><strong className="flex items-center gap-2 text-sm">{(()=>{const Icon=iconOf(r.nome||r.tipo);return <Icon size={17} className="shrink-0 text-rose-300"/>})()}{r.nome}</strong><span className={`rounded-lg border px-2 py-1 text-xs font-bold ${intensityTone(r.intensidade)}`}>{r.intensidade??'?'} / 10</span></div>{r.observacoes&&<p className="mt-1 text-xs text-ink-muted">{r.observacoes}</p>}
    {(medicamentos.some(m=>m.id===r.medicamento_id&&m.user_id===user?.id&&m.person_id===activePersonId) || consultas.some(c=>c.id===consultBySymptom.get(r.id||'')&&c.user_id===user?.id&&c.person_id===activePersonId)) &&
    <div className="mt-2 flex flex-wrap gap-2 border-t border-surface-border/50 pt-2">
      {medicamentos.filter(m=>m.id===r.medicamento_id&&m.user_id===user?.id&&m.person_id===activePersonId).map(m=><Link key={m.id} href={`/saude/medicamentos/detalhes?id=${encodeURIComponent(m.id!)}`} className="inline-flex min-h-11 max-w-full items-center gap-1.5 rounded-xl border border-emerald-300/25 px-2.5 text-xs text-emerald-200"><Pill size={15}/><span className="min-w-0 break-words">{m.nome}</span><ChevronRight size={13}/></Link>)}
      {consultas.filter(c=>c.id===consultBySymptom.get(r.id||'')&&c.user_id===user?.id&&c.person_id===activePersonId).map(c=><Link key={c.id} href={`/saude/consultas/detalhes?id=${encodeURIComponent(c.id!)}`} className="inline-flex min-h-11 max-w-full items-center gap-1.5 rounded-xl border border-sky-300/25 px-2.5 text-xs text-sky-200"><Stethoscope size={15}/><span className="min-w-0 break-words">Consulta vinculada</span><ChevronRight size={13}/></Link>)}
    </div>}</article></div>)}{own.length>historyLimit&&<button type="button" onClick={()=>setHistoryLimit(x=>x+100)} className="min-h-11 w-full rounded-xl border border-rose-300/30 px-3 text-xs font-semibold text-rose-200">Mostrar mais {Math.min(100,own.length-historyLimit)} sintomas</button>}</section>
  </div></main></PageTransition>;
}
