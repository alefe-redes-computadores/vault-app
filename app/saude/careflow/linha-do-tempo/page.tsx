'use client';
import Link from 'next/link';
import {Suspense,useEffect,useMemo,useState} from 'react';
import {useSearchParams} from 'next/navigation';
import {useLiveQuery} from 'dexie-react-hooks';
import {Activity,Brain,CalendarClock,ShieldCheck,ChevronRight,Pill,Stethoscope,Moon,HeartPulse,FlaskConical,MessageSquareHeart,ClipboardCheck,Footprints,Wind} from 'lucide-react';
import {PageTransition} from '@/components/PageTransition';
import {MedicationFormatIcon} from '@/components/saude/MedicationFormatIcon';
import {ClinicalBackLinkP0} from '@/components/saude/ClinicalBackLinkP0';
import {useAuth} from '@/hooks/useAuth';
import {useActivePersonId} from '@/hooks/useActivePersonId';
import {withReturnTarget} from '@/lib/navigation/return-context';
import {db} from '@/lib/db';
import {buildBrainFactsP2} from '@/lib/m3/brain-facts-p2';
import {projectA4ClinicalFacts} from '@/lib/treatment-a4/clinical-bridge';
import { RehabM5FactualDigest } from '@/components/saude/RehabM5FactualDigest';
import {SurgeryA7FactualDigest} from '@/components/saude/SurgeryA7FactualDigest';
import {recordKeyFromHashR3,revealCountR3} from '@/lib/m3/careflow-display-r3';
const factIcon=(kind:string,title:string)=>kind==='tratamento_fase'?CalendarClock:kind==='consulta'?Stethoscope:kind==='cirurgia'?ClipboardCheck:kind==='exame'?FlaskConical:kind.startsWith('dose_')?Pill:/press[aã]o|arterial/i.test(title)?HeartPulse:/caminha|passos/i.test(title)?Footprints:/satura|oxig|spo2/i.test(title)?Wind:/sono|dormi/i.test(title)?Moon:/sintoma|zumbido|n[aá]usea|tontura|dor|cansa/i.test(title)?MessageSquareHeart:kind==='medicao'?Activity:kind==='registro'?Activity:/exame|resultado/i.test(title)?FlaskConical:CalendarClock;
const dayText=(day:string)=>/^\d{4}-\d{2}-\d{2}$/.test(day)?day.split('-').reverse().join('/'):day;
function dateMinus(days:number){const now=new Date();now.setHours(12,0,0,0);now.setDate(now.getDate()-Math.max(0,days-1));return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;}
function BrainLongitudinalP2View(){
 const {user}=useAuth(),{activePersonId}=useActivePersonId();const uid=user?.id||'',pid=activePersonId||'';
 const params=useSearchParams();const [days,setDays]=useState<7|15|30|90>(30),[visible,setVisible]=useState(60);
 useEffect(()=>{const v=Number(params.get('dias'));if(v===7||v===15||v===30||v===90)setDays(v);},[params]);
 const result=useLiveQuery(async()=>{
  if(!uid||!pid)return {uid,pid,facts:[]};
  const [consultas,cirurgias,exames,doses,registros,careflow,medicamentos,treatmentPhases,treatments]=await Promise.all([
   db.consultas.where('user_id').equals(uid).toArray(),db.cirurgias.where('user_id').equals(uid).toArray(),
   db.exames.where('user_id').equals(uid).toArray(),db.doseLogs.where('user_id').equals(uid).toArray(),
   db.registros_saude.where('user_id').equals(uid).toArray(),db.careflow_events_m2.where('user_id').equals(uid).toArray(),
   db.medicamentos.where('user_id').equals(uid).toArray(),
   db.a1_treatment_phases.where('[user_id+person_id]').equals([uid,pid]).toArray(),
   db.tratamentos.where('user_id').equals(uid).toArray()]);
  return {uid,pid,facts:buildBrainFactsP2({userId:uid,personId:pid,consultas,cirurgias,exames,doses,registros,careflow,medicamentos,
    treatmentFacts:projectA4ClinicalFacts({userId:uid,personId:pid,phases:treatmentPhases,treatments,medications:medicamentos,max:10000})},10000)};
 },[uid,pid]);
 const facts=result?.uid===uid&&result?.pid===pid?result.facts:[];
 const filtered=useMemo(()=>facts.filter(f=>f.date>=dateMinus(days)),[facts,days]);
 const displayed=filtered.slice(0,visible);
 // R3: ao voltar de um fato antigo, a origem exata pode estar após o primeiro lote.
 useEffect(()=>{
  const key=recordKeyFromHashR3(window.location.hash,'#fato-');
  if(!key)return;
  const index=filtered.findIndex(f=>f.key===key);
  if(index<0)return;
  const next=revealCountR3(index,visible,60);
  if(next>visible){setVisible(next);return;}
  const frame=window.requestAnimationFrame(()=>document.getElementById(`fato-${key}`)?.scrollIntoView({block:'center',behavior:'auto'}));
  return()=>window.cancelAnimationFrame(frame);
 },[filtered,visible]);
 const color=(kind:string,intensity?:number)=>kind.startsWith('dose_')?'text-emerald-300 border-emerald-300/25 bg-emerald-300/[.06]':kind==='medicao'?'text-rose-300 border-rose-300/25 bg-rose-300/[.06]':kind==='registro'&&typeof intensity==='number'&&intensity>=7?'text-rose-300 border-rose-300/25 bg-rose-300/[.09]':kind==='consulta'?'text-sky-300 border-sky-300/25 bg-sky-300/[.06]':'text-violet-300 border-violet-300/25 bg-violet-300/[.06]';
 return <PageTransition><main className="min-h-screen bg-void px-4 pb-[calc(8rem+env(safe-area-inset-bottom,0px))] pt-5 header-safe-top text-ink-primary vault-adaptive-tail"><div className="mx-auto max-w-2xl space-y-4">
  <header className="flex items-start gap-3"><ClinicalBackLinkP0 fallback="/saude/careflow" aria-label="Voltar ao CareFlow" className="grid size-11 shrink-0 place-items-center rounded-xl border border-surface-border bg-surface"/><div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-widest text-violet-300">Inteligência · Histórico factual</p><h1 className="text-xl font-bold">Brain longitudinal</h1><p className="mt-1 text-xs text-ink-muted">Doses identificadas, medições reais e fatos por data. Sem inferir diagnóstico ou causalidade.</p></div></header>
  <RehabM5FactualDigest returnTo="/saude/careflow/linha-do-tempo" />
  <SurgeryA7FactualDigest returnTo="/saude/careflow/linha-do-tempo" />
  <section className="rounded-2xl border border-violet-300/20 bg-surface p-3" aria-label="Cobertura e fatos"><h2 className="flex items-center gap-2 text-xs font-semibold"><Brain size={18} className="text-violet-300"/>Sua história documentada</h2><div className="mt-3 grid grid-cols-3 gap-2">{[{label:'Consultas',value:filtered.filter(f=>f.kind==='consulta').length},{label:'Medições',value:filtered.filter(f=>f.kind==='medicao').length},{label:'Doses tomadas',value:filtered.filter(f=>f.kind==='dose_tomada').length}].map(x=><div key={x.label} className="min-w-0 rounded-xl bg-void/40 p-2.5"><strong className="block text-lg tabular-nums">{x.value}</strong><span className="block break-words text-[10px] text-ink-muted">{x.label}</span></div>)}</div><p className="mt-3 flex gap-2 text-[11px] text-ink-muted"><ShieldCheck size={14} className="shrink-0 text-violet-300"/>Dados da pessoa ativa disponíveis neste aparelho; ausência de fato não equivale a normalidade.</p></section>
  <section aria-label="Período da evolução" className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-sm font-bold">Eventos e evidências</h2><div className="flex flex-wrap gap-1 rounded-xl border border-surface-border bg-surface p-1">{([7,15,30,90] as const).map(n=><button key={n} type="button" onClick={()=>{setDays(n);setVisible(60);}} aria-pressed={days===n} className={`min-h-11 rounded-lg border px-2.5 text-xs font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-300 ${days===n?'border-violet-300/50 bg-violet-300/15 text-violet-100':'border-transparent text-ink-muted'}`}>{n} dias</button>)}</div></section>
  <p className="rounded-xl border border-surface-border bg-surface p-3 text-[11px] text-ink-muted"><Activity size={14} className="mr-1 inline text-violet-300"/>Últimos 7 dias: {facts.filter(f=>f.date>=dateMinus(7)).length} fatos. Últimos 30: {facts.filter(f=>f.date>=dateMinus(30)).length}. Exibindo {displayed.length} de {filtered.length} nesta janela.</p>
  <section aria-label="Linha do tempo por pessoa" className="space-y-2">{!uid||!pid?<p className="rounded-2xl border border-surface-border p-5 text-xs text-amber-200">Entre na sua conta e selecione uma pessoa.</p>:!filtered.length?<p className="rounded-2xl border border-dashed border-surface-border p-6 text-xs text-ink-muted">Nenhum fato registrado nesta janela. Experimente ampliar o período.</p>:displayed.map((item,i)=>{
   const FactIcon=factIcon(item.kind,item.title),tone=color(item.kind,item.intensity);
   const exact=/^\/saude\/(?:careflow\/fato\?|careflow\/sintomas#|careflow\/exames#|consultas\/detalhes\?|cirurgias\/detalhes\?|exames\/detalhes\?|tratamentos\/detalhes\?)/.test(item.href);
   const origin=`/saude/careflow/linha-do-tempo?dias=${days}#fato-${encodeURIComponent(item.key)}`;
   const content=<><span className={`grid size-10 shrink-0 place-items-center rounded-xl border ${tone}`}>{item.kind.startsWith('dose_')&&item.medicationVisual?<MedicationFormatIcon size={26} formato={item.medicationVisual.formato} cores={item.medicationVisual.cores} className="shrink-0"/>:<FactIcon size={16} aria-hidden="true"/>}</span><span className="min-w-0 flex-1"><strong className="block break-words text-sm font-semibold text-ink-primary">{item.title}</strong><span className="mt-1 block text-[11px] text-ink-muted">{dayText(item.date)} {item.time?`às ${item.time}`:'· horário não informado'} · {item.provenance}</span>{item.intensity!==undefined&&<span className={`mt-1 inline-block rounded-lg border px-2 py-0.5 text-[10px] font-semibold ${tone}`}>Intensidade declarada: {item.intensity}/10</span>}<span className="mt-1 block break-words text-[11px] leading-relaxed text-ink-secondary">{item.detail}</span>{!exact&&<span className="mt-1 block text-[10px] text-amber-200">Origem exata indisponível; não abriremos uma lista genérica.</span>}</span>{exact?<ChevronRight size={16} className="mt-2 shrink-0 text-ink-faint"/>:null}</>;
   return <div key={item.key}>{(i===0||displayed[i-1].date!==item.date)&&<h3 className="pt-3 text-xs font-bold text-violet-200">{dayText(item.date)}</h3>}{exact?<Link id={`fato-${item.key}`} href={withReturnTarget(item.href,origin)} className="flex min-h-[86px] scroll-mt-24 items-start gap-3 rounded-2xl border border-surface-border/70 bg-surface p-3 active:bg-surface-raised focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-300">{content}</Link>:<article id={`fato-${item.key}`} className="flex min-h-[86px] scroll-mt-24 items-start gap-3 rounded-2xl border border-surface-border/70 bg-surface p-3">{content}</article>}</div>;
  })}</section>
  {filtered.length>visible&&<button type="button" onClick={()=>setVisible(n=>n+60)} className="min-h-12 w-full rounded-2xl border border-violet-300/30 bg-violet-300/[.08] text-sm font-bold text-violet-200">Mostrar mais {Math.min(60,filtered.length-visible)} registros</button>}
  {facts.length===10000&&<p className="rounded-xl border border-amber-300/25 p-3 text-xs text-amber-200">Projeção limitada a 10.000 fatos por segurança. Consulte as origens para outros registros.</p>}
  <p className="flex gap-2 text-[11px] leading-relaxed text-ink-muted"><CalendarClock size={14} className="shrink-0"/>Links com origem comprovada abrem o fato específico. O Brain não cria doses, estoque ou diagnósticos.</p>
 </div></main></PageTransition>;
}

/** useSearchParams exige Suspense em rotas pré-renderizadas pelo Next 14. */
export default function BrainLongitudinalP2(){
 return <Suspense fallback={<main className="min-h-screen bg-void p-6 text-sm text-ink-muted vault-adaptive-tail">Carregando evolução clínica…</main>}><BrainLongitudinalP2View/></Suspense>;
}
