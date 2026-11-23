'use client';
/** A10.1 — read-only local-first screen. Rendering is gated by authenticated account and verified person. */
import {Suspense,useEffect,useMemo,useRef,useState} from 'react';
import Link from 'next/link';
import {useSearchParams} from 'next/navigation';
import {useLiveQuery} from 'dexie-react-hooks';
import {Activity,ArrowLeft,Brain,CalendarDays,ChevronDown,ClipboardList,FileClock,FileText,HeartHandshake,History,Hospital,Info,Link2,Pill,Search,ShieldCheck,Stethoscope,Syringe} from 'lucide-react';
import {useAuth} from '@/hooks/useAuth';
import {useActivePersonId} from '@/hooks/useActivePersonId';
import {auditBrainLinksA10} from '@/lib/a10/brain-evidence';
import {useBrainV5Pulse} from '@/hooks/useBrainV5Pulse';
import {safeReturnTarget} from '@/lib/navigation/return-context';
import {loadScopedA10} from '@/lib/a10/client-data';
import {A10_DOMAIN_LABELS,civilDayA10,filterLongitudinalA10,projectLongitudinalA10,type A10Domain} from '@/lib/a10/longitudinal';

const field='min-h-11 w-full min-w-0 rounded-xl border border-surface-border bg-void/60 px-3 text-sm text-ink-primary outline-none focus-visible:border-emerald-300';
const button='inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold disabled:opacity-40';
const historyLabel:Record<'current'|'historical'|'void'|'deleted',string>={current:'Atual',historical:'Retificado',void:'Cancelamento documental',deleted:'Excluído'};
const domains:readonly (A10Domain|'all')[]=['all','consultations','surgery','treatment','hospitalization','rehabilitation','vaccination','procedure','sensitivity','exams','health','doses'];
function ptToIso(v:string):string|undefined {
 if(!v.trim())return undefined;
 const m=/^(\d{2})\/(\d{2})\/(\d{4})$/.exec(v.trim());if(!m)return 'invalid';
 const d=`${m[3]}-${m[2]}-${m[1]}`;return civilDayA10(d)?d:'invalid';
}
function domainIcon(domain:A10Domain){
 switch(domain){case 'consultations':return Stethoscope;case 'surgery':return ClipboardList;case 'treatment':return Pill;
 case 'hospitalization':return Hospital;case 'rehabilitation':return HeartHandshake;case 'vaccination':return Syringe;
 case 'procedure':return Activity;case 'sensitivity':return ShieldCheck;case 'exams':return FileText;
 case 'health':return FileClock;default:return CalendarDays;}
}
function domainColor(domain:A10Domain){
 if(domain==='consultations')return 'text-sky-300';
 if(domain==='surgery')return 'text-amber-300';
 if(domain==='hospitalization')return 'text-rose-300';
 if(domain==='sensitivity')return 'text-orange-300';
 return 'text-emerald-300';
}
function ClinicalLongitudinalA10View(){
 const params=useSearchParams();const backHref=safeReturnTarget(params.get('return_to'),'/saude/minha-saude');
 const brain=useBrainV5Pulse();
 const {user,loading}=useAuth();const {activePersonId}=useActivePersonId();
 const uid=user?.id||'',pid=activePersonId||'',scope=uid+':'+pid;
 const initialDomain=params.get('dominio')||'all';
 const [domain,setDomain]=useState<A10Domain|'all'>(()=>domains.includes(initialDomain as A10Domain|'all')?initialDomain as A10Domain|'all':'all');
 const [query,setQuery]=useState(()=>params.get('busca')?.slice(0,120)||'');
 const [from,setFrom]=useState(()=>params.get('inicio')?.slice(0,10)||''),[to,setTo]=useState(()=>params.get('fim')?.slice(0,10)||'');
 const [history,setHistory]=useState(()=>params.get('historico')==='sim'),[limit,setLimit]=useState(40),[brainLimit,setBrainLimit]=useState(4);
 const previousScope=useRef(scope);
 // Do not clear restored filters when returning from the exact fact; clear only on actual profile switch.
 useEffect(()=>{if(previousScope.current===scope)return;previousScope.current=scope;
   setDomain('all');setQuery('');setFrom('');setTo('');setHistory(false);setLimit(40);setBrainLimit(4);},[scope]);
 const sourceBack=useMemo(()=>{
   const p=new URLSearchParams();p.set('dominio',domain);
   if(query)p.set('busca',query.slice(0,120));if(from)p.set('inicio',from);if(to)p.set('fim',to);
   if(history)p.set('historico','sim');return '/saude/linha-clinica?'+p.toString();
 },[domain,query,from,to,history]);
 const snapshot=useLiveQuery(()=>loadScopedA10(uid,pid),[uid,pid]);
 const visible=Boolean(!loading&&uid&&pid&&snapshot?.scope===scope&&snapshot.verified);
 const projection=useMemo(()=>visible?projectLongitudinalA10(snapshot?.data||{},uid,pid,history,Intl.DateTimeFormat().resolvedOptions().timeZone||'UTC'):projectLongitudinalA10({},'','',false),[visible,snapshot,uid,pid,history]);
 const isoFrom=ptToIso(from),isoTo=ptToIso(to),validDates=isoFrom!=='invalid'&&isoTo!=='invalid'&&(!isoFrom||!isoTo||isoFrom<=isoTo);
 const filtered=useMemo(()=>validDates?filterLongitudinalA10(projection.facts,{domain,query,from:isoFrom,to:isoTo}):[],[projection,domain,query,isoFrom,isoTo,validDates]);
 const brainAudit=useMemo(()=>visible?auditBrainLinksA10(brain.records,projection.facts,uid,pid):null,[visible,brain.records,projection,uid,pid]);
 const counts=useMemo(()=>Object.fromEntries(domains.map(d=>[d,d==='all'?projection.totalVisible:projection.facts.filter(x=>x.domain===d).length])) as Record<A10Domain|'all',number>,[projection]);
 return <main className="min-h-screen bg-void px-4 pb-[calc(8rem+env(safe-area-inset-bottom,0px))] pt-5 header-safe-top text-ink-primary">
  <div className="mx-auto max-w-3xl space-y-4">
   <header className="flex items-start gap-3"><Link href={backHref} className={button+' size-11 shrink-0 border-surface-border'} aria-label="Voltar para Minha Saúde"><ArrowLeft size={18}/></Link><div className="min-w-0"><h1 className="flex items-center gap-2 text-xl font-bold"><History className="text-emerald-300" size={22}/>Linha clínica 360</h1><p className="mt-1 text-xs text-ink-muted">Uma visão dos registros já existentes. Planejamento, relato e realização permanecem diferentes.</p></div></header>
   {!uid||!pid?<section className="rounded-2xl border border-surface-border bg-surface p-4 text-sm">Entre na conta e selecione uma pessoa para consultar sua linha clínica.</section>:
    loading||snapshot===undefined||snapshot.scope!==scope?<p role="status" className="p-4 text-sm text-ink-muted">Carregando registros locais…</p>:
    !snapshot.verified?<p role="alert" className="rounded-2xl border border-rose-300/30 bg-surface p-4 text-sm text-rose-200">{snapshot.error||'Não foi possível confirmar esta pessoa na conta atual.'}</p>:
    <>
     <section className="rounded-2xl border border-emerald-300/20 bg-surface p-3 space-y-2"><div className="flex items-center gap-2 text-sm font-semibold"><ShieldCheck size={17} className="text-emerald-300"/> Somente fatos desta pessoa</div><p className="text-xs text-ink-muted">{projection.totalVisible} registros nesta visualização. Dados locais podem estar com sincronização pendente. Nenhuma ausência significa diagnóstico ou conclusão.</p>{projection.excludedWithoutIdentity>0&&<p className="text-xs text-amber-200">{projection.excludedWithoutIdentity} registros antigos sem ID foram omitidos para não criar vínculos incertos.</p>}</section>
     <section className="rounded-2xl border border-surface-border bg-surface p-3 space-y-3">
      <label className="block text-xs text-ink-muted">Pesquisar registro<div className="relative mt-1"><Search size={17} className="absolute left-3 top-3 text-ink-muted"/><input className={field+' pl-10'} value={query} onChange={e=>{setQuery(e.target.value);setLimit(40);}} placeholder="Especialidade, procedimento, evolução…" autoComplete="off"/></div></label>
      <div className="flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Filtrar por área clínica">{domains.map(d=><button type="button" key={d} aria-pressed={domain===d} onClick={()=>{setDomain(d);setLimit(40);}} className={button+' shrink-0 '+(domain===d?'border-emerald-300/50 bg-emerald-300/10 text-emerald-200':'border-surface-border text-ink-secondary')}>{d==='all'?'Todos':A10_DOMAIN_LABELS[d]} · {counts[d]}</button>)}</div>
      <div className="grid grid-cols-2 gap-2"><label className="text-xs text-ink-muted">Desde<input inputMode="numeric" placeholder="DD/MM/AAAA" value={from} onChange={e=>{setFrom(e.target.value.slice(0,10));setLimit(40);}} className={field+' mt-1'}/></label><label className="text-xs text-ink-muted">Até<input inputMode="numeric" placeholder="DD/MM/AAAA" value={to} onChange={e=>{setTo(e.target.value.slice(0,10));setLimit(40);}} className={field+' mt-1'}/></label></div>
      {!validDates&&<p role="alert" className="text-xs text-amber-200">Confira as datas no formato DD/MM/AAAA e a ordem do período.</p>}
      <button className={button+' w-full border-surface-border justify-between'} type="button" aria-pressed={history} onClick={()=>{setHistory(v=>!v);setLimit(40);}}><span className="inline-flex items-center gap-2"><History size={16}/> {history?'Ocultar retificações e exclusões':'Incluir histórico de retificações'}</span><ChevronDown size={16}/></button>
     </section>
     <section aria-live="polite" className="space-y-2"><h2 className="text-sm font-semibold">{filtered.length} {filtered.length===1?'registro encontrado':'registros encontrados'}</h2>{filtered.length===0?<p className="rounded-2xl border border-dashed border-surface-border p-4 text-xs text-ink-muted">Nenhum registro corresponde a estes filtros. Isso não significa ausência de condições clínicas.</p>:filtered.slice(0,limit).map(f=>{const Icon=domainIcon(f.domain);return <article key={f.key} className="rounded-2xl border border-surface-border bg-surface p-3 space-y-2"><div className="flex min-w-0 items-start gap-3"><div className={'grid size-10 shrink-0 place-items-center rounded-xl bg-void/60 '+domainColor(f.domain)}><Icon size={19}/></div><div className="min-w-0 flex-1"><p className="text-[11px] text-ink-muted">{A10_DOMAIN_LABELS[f.domain]} · {f.displayedDate} {f.dateKind==='registration'?'(cadastro)':f.dateKind==='planned'?'(planejada)':f.dateKind==='reported'?'(relatada)':''}</p><h3 className="mt-1 break-words text-sm font-bold">{f.title}</h3><p className="mt-1 text-xs text-emerald-200">{f.status}</p></div></div>{f.detail&&<p className="whitespace-pre-wrap break-words text-xs text-ink-secondary">{f.detail}</p>}<p className="text-[11px] text-ink-muted">Origem: {f.origin} · {f.source} · {f.sync==='pending'?'Sincronização pendente':f.sync==='synced'?'Marcado localmente como sincronizado':'Sincronização não confirmada'} {f.revision!=='current'?'· Histórico: '+historyLabel[f.revision]:''}</p><Link href={f.href+'&return_to='+encodeURIComponent(sourceBack)} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-surface-border px-3 text-xs font-semibold text-ink-primary"><Link2 size={15}/> Ver detalhe deste registro</Link></article>})}{filtered.length>limit&&<button type="button" className={button+' w-full border-surface-border'} onClick={()=>setLimit(v=>v+40)}>Mostrar mais {Math.min(40,filtered.length-limit)} de {filtered.length-limit} restantes</button>}</section>
     {brainAudit&&brainAudit.total>0?<section aria-label="Interpretações do Brain" className="space-y-2 rounded-2xl border border-violet-300/20 bg-surface p-3"><h2 className="flex items-center gap-2 text-sm font-bold"><Brain size={18} className="text-violet-300"/> Brain · interpretação observacional</h2><p className="text-[11px] text-ink-muted">{brainAudit.total} {brainAudit.total===1?'alerta registrado':'alertas registrados'}, {brainAudit.linked} com evidência identificável nesta linha. Isso não é laudo nem comprovação de causalidade.</p>{brainAudit.evidences.slice(0,brainLimit).map(item=><div key={item.alertKey} className="rounded-xl border border-surface-border p-3"><p className="text-xs text-ink-secondary">{item.explanation}</p>{item.facts.slice(0,4).map(f=><Link key={f.key} href={f.href+'&return_to='+encodeURIComponent(sourceBack)} className="mt-2 flex min-h-11 items-center gap-2 text-xs text-violet-200 underline decoration-violet-300/30"><Link2 size={15} className="shrink-0"/>{f.title} · {f.displayedDate}</Link>)}{item.facts.length>4?<p className="text-[11px] text-ink-muted">Outras {item.facts.length-4} evidências vinculadas disponíveis na linha completa.</p>:null}</div>)}{brainAudit.total>brainLimit?<button type="button" className={button+' w-full border-violet-300/20 text-violet-100'} onClick={()=>setBrainLimit(x=>x+8)}>Ver mais interpretações ({brainAudit.total-brainLimit} restantes)</button>:null}</section>:null}
     <p className="flex items-start gap-2 text-[11px] text-ink-muted"><Info size={15} className="shrink-0"/> Esta linha não substitui seu prontuário ou avaliação profissional. Fontes distintas não são unidas por semelhança de título ou data.</p>
    </>}
  </div>
 </main>;
}

export default function ClinicalLongitudinalA10Page(){return <Suspense fallback={<main className="min-h-screen bg-void p-5 text-xs text-ink-secondary">Preparando histórico…</main>}><ClinicalLongitudinalA10View/></Suspense>;}
