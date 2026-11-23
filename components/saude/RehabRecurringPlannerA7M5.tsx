'use client';
/** Reuses M5 session authority; never creates completed sessions or automatic alerts. */
import {useEffect,useMemo,useRef,useState} from 'react';
import {CalendarRange,Check,Plus,ShieldCheck} from 'lucide-react';
import {useAuth} from '@/hooks/useAuth';
import {useActivePersonId} from '@/hooks/useActivePersonId';
import {useToast} from '@/components/ToastProvider';
import {useHapticFeedback} from '@/lib/haptics';
import {CustomDatePicker} from '@/components/DatePicker';
import {HealthTimePicker} from '@/components/saude/HealthTimePicker';
import {expandRehabSlotsA7M5,scheduleRehabSeriesA7M5} from '@/lib/rehab-m5/recurrence-a7m5';
import {pluralClinicalCountA7M5} from '@/lib/rehab-m5/format-count-a7m5';
import type {RehabSessionMode} from '@/lib/rehab-m5/types';
import {ClinicalRecordFinderA7M5} from './ClinicalRecordFinderA7M5';
import {useLiveQuery} from 'dexie-react-hooks';
import {db} from '@/lib/db';
const weekdays=[{n:1,l:'Seg'},{n:2,l:'Ter'},{n:3,l:'Qua'},{n:4,l:'Qui'},{n:5,l:'Sex'},{n:6,l:'Sáb'},{n:0,l:'Dom'}] as const;
const field='min-h-11 w-full rounded-xl border border-surface-border bg-surface px-3 py-2 text-sm text-ink-primary';
export function RehabRecurringPlannerA7M5({programId}:{programId:string}){
 const {user}=useAuth(),{activePersonId}=useActivePersonId(),toast=useToast(),{trigger}=useHapticFeedback();const uid=user?.id||'',pid=activePersonId||'',scope=`${uid}:${pid}:${programId}`;
 const [open,setOpen]=useState(false),[start,setStart]=useState(''),[end,setEnd]=useState(''),[clock,setClock]=useState('09:00');
 const [days,setDays]=useState<number[]>([]),[mode,setMode]=useState<RehabSessionMode>('clinic'),[place,setPlace]=useState(''),[busy,setBusy]=useState(false),[consent,setConsent]=useState(false);
 const inFlight=useRef(false);
 useEffect(()=>{setOpen(false);setStart('');setEnd('');setClock('09:00');setDays([]);setPlace('');setConsent(false)},[scope,programId]);
 const data=useLiveQuery(async()=>{
  if(!uid||!pid)return null;const person=await db.persons.get(pid),program=await db.rehab_programs_m5.get(programId);
  if(person?.user_id!==uid||program?.user_id!==uid||program.person_id!==pid||program.deleted_at)return null;
  const [locais,hospitais]=await Promise.all([db.locais.where('user_id').equals(uid).toArray(),db.hospitais.where('user_id').equals(uid).toArray()]);
  return {scope,locais,hospitais,program};
 },[uid,pid,programId]);
 const slots=useMemo(()=>{try{return expandRehabSlotsA7M5({startDay:start,endDay:end,weekdays:days,clock})}catch{return []}},[start,end,days,clock]);
 const act=async()=>{if(inFlight.current||!pid||!consent||!data)return;inFlight.current=true;setBusy(true);
  try{const timezone=Intl.DateTimeFormat().resolvedOptions().timeZone||'UTC';const result=await scheduleRehabSeriesA7M5({personId:pid,programId,startDay:start,endDay:end,weekdays:days,clock,
   timezone,mode,localId:mode==='clinic'?place:undefined,hospitalId:mode==='hospital'?place:undefined});
   trigger('vibrate');toast.showSuccess(`${pluralClinicalCountA7M5(result.created,'sessao')} ${result.created===1?'agendada':'agendadas'}; ${pluralClinicalCountA7M5(result.skipped,'data')} já ${result.skipped===1?'existente':'existentes'}. Nenhuma foi marcada como realizada.`);setOpen(false);setConsent(false);
  }catch(e){toast.showError(e instanceof Error?e.message:'Não foi possível registrar a rotina');}finally{inFlight.current=false;setBusy(false);}
 };
 if(!data||data.scope!==scope||data.program.status==='completed'||data.program.status==='interrupted')return null;
 return <section className="min-w-0 space-y-3 rounded-[20px] border border-teal-300/20 bg-surface-raised/70 p-3.5" aria-label="Planejamento de sessões recorrentes">
  <div className="flex items-start gap-2"><CalendarRange size={20} className="mt-0.5 text-teal-300"/><div className="min-w-0 flex-1"><h2 className="text-sm font-bold text-ink-primary">Rotina de sessões (opcional)</h2><p className="mt-1 text-xs leading-5 text-ink-muted">Selecione dias e horários declarados. Podem existir programas sem cirurgia, sem hospital ou com várias sessões no mesmo dia.</p></div></div>
  <button type="button" aria-expanded={open} onClick={()=>setOpen(v=>!v)} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-teal-300/35 px-3 text-xs font-semibold text-teal-200"><Plus size={16}/>{open?'Fechar rotina':'Planejar várias sessões'}</button>
  {open&&<div className="space-y-3 rounded-xl border border-surface-border p-3">
   <div className="grid grid-cols-1 gap-2 min-[380px]:grid-cols-2"><div><p className="mb-1 text-xs">Início</p><CustomDatePicker value={start} onChange={setStart}/></div><div><p className="mb-1 text-xs">Fim (até 91 dias)</p><CustomDatePicker value={end} onChange={setEnd}/></div></div>
   <p className="text-xs font-semibold">Dias informados</p><div className="grid grid-cols-4 gap-1.5 min-[400px]:grid-cols-7" role="group" aria-label="Dias da semana">{weekdays.map(x=><button type="button" key={x.n} aria-pressed={days.includes(x.n)} onClick={()=>setDays(v=>v.includes(x.n)?v.filter(d=>d!==x.n):[...v,x.n])} className={'min-h-11 rounded-xl border px-1 text-xs '+(days.includes(x.n)?'border-teal-300/50 bg-teal-300/10 text-teal-200':'border-surface-border text-ink-muted')}>{x.l}</button>)}</div>
   <div className="space-y-1"><p className="text-xs font-semibold">Horário local</p><HealthTimePicker value={clock} onChange={setClock} clearable={false}/></div>
   <p className="text-xs font-semibold">Local da atividade</p><div className="grid grid-cols-2 gap-2">{([{mode:'clinic',label:'Clínica'},{mode:'hospital',label:'Hospital'},{mode:'home',label:'Domicílio'},{mode:'other',label:'Outro'}] as const).map(x=><button type="button" key={x.mode} aria-pressed={mode===x.mode} onClick={()=>{setMode(x.mode);setPlace('')}} className={'min-h-11 rounded-xl border px-2 text-xs '+(mode===x.mode?'border-teal-300/50 text-teal-200':'border-surface-border text-ink-muted')}>{x.label}</button>)}</div>
   {mode==='clinic'&&<ClinicalRecordFinderA7M5 label="Clínica (se cadastrada)" items={data.locais.filter(x=>x.id).map(x=>({id:x.id!,label:x.nome,href:'/saude/locais/detalhes?id='+x.id}))} value={place} onChange={setPlace} returnTo="/saude/reabilitacao"/>}
   {mode==='hospital'&&<ClinicalRecordFinderA7M5 label="Hospital (se cadastrado)" items={data.hospitais.filter(x=>x.id).map(x=>({id:x.id!,label:x.nome,href:'/saude/hospitais/detalhes?id='+x.id}))} value={place} onChange={setPlace} returnTo="/saude/reabilitacao"/>}
   {slots.length>0&&<p className="rounded-xl border border-surface-border bg-surface px-3 py-2 text-xs text-ink-secondary">{pluralClinicalCountA7M5(slots.length,'horario')} {slots.length===1?'será cadastrado':'serão cadastrados'} como <strong>{slots.length===1?'agendado':'agendados'}</strong>, nunca como {slots.length===1?'realizado':'realizados'}. Lembretes continuam desligados até opt-in específico.</p>}
   <label className="flex min-h-11 items-start gap-3 text-xs text-ink-secondary"><input type="checkbox" className="mt-1 size-4 accent-emerald-400" checked={consent} onChange={e=>setConsent(e.target.checked)}/><span>Confirmo que os dias e horários informados correspondem ao planejamento desta pessoa.</span></label>
   <button type="button" disabled={busy||!consent||slots.length===0} onClick={()=>void act()} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-400 px-3 text-xs font-bold text-slate-950 disabled:opacity-40"><Check size={16}/>{busy?'Salvando…':`Registrar ${pluralClinicalCountA7M5(slots.length,'sessao')}`}</button>
  </div>}
  <p className="flex items-center gap-2 text-[11px] text-ink-muted"><ShieldCheck size={15}/>Recorrência é somente ferramenta de cadastro. Não cria evolução, presença, alta ou recomendação clínica.</p>
 </section>;
}
