'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import {
  Activity, Accessibility, BedDouble, ArrowLeft, Bell, BrainCircuit, CalendarDays, ChevronDown, ChevronRight,
  ClipboardList, Clock3, Compass, Droplets, Factory, FileHeart, FlaskConical,
  HeartPulse, Layers3, Pill, Search, Eye, ShieldCheck, Stethoscope,
  Syringe, Truck, Users, X, Star,
} from 'lucide-react';
import { useHapticFeedback } from '@/lib/haptics';
import {useAuth} from '@/hooks/useAuth';
import {useActivePersonId} from '@/hooks/useActivePersonId';
import {useConsultas} from '@/hooks/useConsultas';
import {useCareFlowM2} from '@/hooks/useCareFlowM2';
import {useBrainV5Pulse} from '@/hooks/useBrainV5Pulse';
import {buildHealthFocusR5,HEALTH_MODULES_R5,EMPTY_PREFERENCES_R5,parseHubPreferencesR5,toggleHubFavoriteR5,recordHubRecentR5,type HubPreferenceR5} from '@/lib/health-hub/r5';
import { PageTransition } from '@/components/PageTransition';
import { clinicalDirectoryM150, clinicalAdditionalSectionsM150, searchClinicalDirectoryM150, clinicalVisibleSectionsSTB, clinicalHiddenCountSTB } from '@/lib/navigation/clinical-directory-m150';
import { scrubLegacyClinicalQueryUX360, sanitizeClinicalBackHrefUX360 } from '@/lib/ui/clinical-a10-filter-session-ux360';
import { readMapSessionSTB, writeMapSessionSTB, clearMapSessionSTB } from '@/lib/ui/clinical-map-session-stb';
import { isTrailingGridItemSTB } from '@/lib/ui/stability-grid-stb';
import type { ClinicalMapIconM150, ClinicalMapEntryM150 } from '@/lib/navigation/clinical-directory-m150';
import { safeClinicalReturnM150 } from '@/lib/navigation/clinical-return-m150';
import { withReturnTarget } from '@/lib/navigation/return-context';
import { clinicalMapToneM150P3, clinicalMapSectionToneM150P5P3 } from '@/lib/navigation/clinical-map-tones-m150-p3';

const icons: Record<ClinicalMapIconM150, LucideIcon> = {
  clock: Clock3, pill: Pill, heart: HeartPulse, file: FileHeart,
  truck: Truck, calendar: CalendarDays, activity: Activity,
  stethoscope: Stethoscope, flask: FlaskConical, droplet: Droplets,
  bell: Bell, users: Users, shield: ShieldCheck, brain: BrainCircuit,
  eye: Eye, layers: Layers3, factory: Factory, clipboard: ClipboardList,
  syringe: Syringe, bed: BedDouble, rehab: Accessibility,
};

/** P5 P4: Inicio/Hoje/Documentos/Mais já têm BottomNav. Nenhum atalho
 * adicional na navegação inferior; Hoje permanece encontrável na busca e no
 * grupo secundário, mas não compete com os quatro cards principais. */
const bottomNavDestinations = new Set(['hoje','documentos']);
const featuredBySection: Readonly<Record<string,readonly string[]>> = {
  rotina: ['medicamentos','tratamentos','retiradas','fornecimento'],
  saude: ['minha-saude','rede','consultas','exames'],
  evidencias: [], documentos: [],
};

/** Um card para cada rota, sem contadores duplicados nem dados clínicos. */
/** One full-width destination plus a separate, non-nested Star action. */
function EntryCard({entry,large,onNavigate,favorite,onToggle,returnHref}: {entry:ClinicalMapEntryM150;large:boolean;onNavigate:()=>void;favorite:boolean;returnHref?:string;onToggle?:((entry:ClinicalMapEntryM150)=>void)}) {
  const Icon=icons[entry.icon];
  const fallbackHref=withReturnTarget(entry.href,'/saude/mapa');
  const href=returnHref?withReturnTarget(entry.href,returnHref):fallbackHref;
  return <article className={`relative min-w-0 rounded-[20px] border shadow-sm ${clinicalMapToneM150P3(entry.id)}`}>
    <Link href={href} onClick={onNavigate} aria-label={`${entry.label}. ${entry.description}`}
      className={`flex min-w-0 flex-col gap-2.5 p-3 pr-11 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-300 ${large?'min-h-[118px] justify-between':'min-h-[100px] justify-start'}`}>
      <span className="grid size-9 shrink-0 place-items-center rounded-xl border border-current/15 bg-black/10"><Icon size={19} aria-hidden="true"/></span>
      <span className="min-w-0"><strong className="block break-words text-[12px] font-semibold leading-snug text-ink-primary">{entry.label}</strong>
        <span className="mt-0.5 block break-words text-[10px] leading-snug text-ink-muted">{entry.description}</span></span>
    </Link>
    {onToggle&&<button type="button" onClick={()=>onToggle(entry)} aria-label={`${favorite?'Desafixar':'Fixar'} ${entry.label}`} aria-pressed={favorite}
      className="absolute right-1 top-1 grid size-10 place-items-center rounded-xl text-amber-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-300">
      <Star size={17} fill={favorite?'currentColor':'none'} aria-hidden="true"/>
    </button>}
  </article>;
}

/** M150 — one discoverable gateway to existing areas; creates no new clinical authority. */
export default function ClinicalMapM150Page() {
  const { trigger } = useHapticFeedback();
  const {user}=useAuth();const {activePersonId}=useActivePersonId();
  const {consultas=[]}=useConsultas();const {events=[]}=useCareFlowM2();const brain=useBrainV5Pulse();
  const uid=user?.id||'',pid=activePersonId||'';
  const scope=uid&&pid?`vault:health-hub:r5:${encodeURIComponent(uid)}:${encodeURIComponent(pid)}`:'';
  const [loadedScope,setLoadedScope]=useState('');
  const [prefs,setPrefs]=useState<HubPreferenceR5>(EMPTY_PREFERENCES_R5);
  const [clock,setClock]=useState(()=>new Date());
  useEffect(()=>{setClock(new Date());setLoadedScope('');if(!scope){setPrefs(EMPTY_PREFERENCES_R5);return;}
    const read=()=>{try{const raw=localStorage.getItem(scope);setPrefs(raw&&raw.length<=8192?parseHubPreferencesR5(JSON.parse(raw)):EMPTY_PREFERENCES_R5);}catch{setPrefs(EMPTY_PREFERENCES_R5);}};
    read();setLoadedScope(scope);
    const storage=(event:StorageEvent)=>{if(event.key===scope)read();};
    window.addEventListener('storage',storage);window.addEventListener('vault:health-hub:r5-updated',read);
    return()=>{window.removeEventListener('storage',storage);window.removeEventListener('vault:health-hub:r5-updated',read);};
  },[scope]);
  const ready=Boolean(scope&&loadedScope===scope),current=ready?prefs:EMPTY_PREFERENCES_R5;
  const pinned=new Set(current.favorites);
  const moduleFor=(entry:ClinicalMapEntryM150)=>HEALTH_MODULES_R5.find(m=>m.href===entry.href)||HEALTH_MODULES_R5.find(m=>m.id===entry.id);
  const save=(next:HubPreferenceR5)=>{if(!ready)return;const safe=parseHubPreferencesR5(next);setPrefs(safe);
    try{localStorage.setItem(scope,JSON.stringify(safe));window.dispatchEvent(new Event('vault:health-hub:r5-updated'));}catch{/* preferencias opcionais */}};
  const toggle=(entry:ClinicalMapEntryM150)=>{const module=moduleFor(entry);if(!module)return;trigger('vibrate');save({...current,favorites:toggleHubFavoriteR5(current.favorites,module.id)});};
  const record=(entry:ClinicalMapEntryM150)=>{rememberMapSTB();const module=moduleFor(entry);if(module)save({...current,recent:recordHubRecentR5(current.recent,module.id)});trigger('vibrate');};
  const favoriteEntries=current.favorites.map(id=>HEALTH_MODULES_R5.find(m=>m.id===id)).filter((m):m is (typeof HEALTH_MODULES_R5)[number]=>Boolean(m));
  const focus=useMemo(()=>buildHealthFocusR5({userId:ready?uid:'',personId:ready?pid:'',consultations:consultas,events,brain:brain.records,favorites:current.favorites,recent:current.recent,now:clock}),[ready,uid,pid,consultas,events,brain.records,current.favorites,current.recent,clock]);
  const [queryDraft,setQuery] = useState('');
  const [additionalDraft,setShowAdditional] = useState(false);
  const [loadedMapScope,setLoadedMapScope]=useState('');
  const priorMapScope=useRef<{uid:string;pid:string}|null>(null);
  const legacyMapState=useRef<{query:string|null;additional:boolean|null}|null>(null);
  const [returnTo,setReturnTo] = useState('/');
  const mapReady=Boolean(scope&&loadedMapScope===scope);
  const query=mapReady?queryDraft:'';
  const showAdditional=mapReady?additionalDraft:false;
  useEffect(() => {
    const params=new URLSearchParams(window.location.search);
    const requested=params.get('return_to');
    setReturnTo(sanitizeClinicalBackHrefUX360(safeClinicalReturnM150(requested,'/saude/mapa','/')));
    if(params.has('q')||params.has('mais'))legacyMapState.current={query:params.has('q')?(params.get('q')||'').slice(0,120):null,additional:params.has('mais')?params.get('mais')==='1':null};
    scrubLegacyClinicalQueryUX360();
  }, []);
  useEffect(()=>{
    const previous=priorMapScope.current;
    if(previous&&(previous.uid!==uid||previous.pid!==pid))clearMapSessionSTB(previous.uid,previous.pid);
    if(!scope){setLoadedMapScope('');setQuery('');setShowAdditional(false);return;}
    priorMapScope.current={uid,pid};
    const saved=readMapSessionSTB(uid,pid),legacy=legacyMapState.current;legacyMapState.current=null;
    setQuery(legacy?.query??saved?.query??'');setShowAdditional(legacy?.additional??saved?.additional??false);setLoadedMapScope(scope);
    if(saved?.scrollY&&!legacy){const frame=window.requestAnimationFrame(()=>window.scrollTo(0,saved.scrollY));return()=>window.cancelAnimationFrame(frame);}
  },[scope,uid,pid]);
  const rememberMapSTB=()=>{if(mapReady)writeMapSessionSTB(uid,pid,{query,additional:showAdditional,scrollY:window.scrollY});};
  useEffect(()=>{if(mapReady)writeMapSessionSTB(uid,pid,{query,additional:showAdditional,scrollY:window.scrollY});},[mapReady,uid,pid,query,showAdditional]);
  const groups = useMemo(() => query.trim()?searchClinicalDirectoryM150(query):clinicalVisibleSectionsSTB(showAdditional), [query,showAdditional]);
  const sourceHref='/saude/mapa';
  const entriesCount = groups.reduce((count,group)=>count+group.items.length,0);
  const searching=Boolean(query.trim());
  const total=clinicalDirectoryM150.reduce((n,g)=>n+g.items.length,0)+clinicalAdditionalSectionsM150.reduce((n,g)=>n+g.items.length,0);
  const onNavigate=()=>{rememberMapSTB();trigger('vibrate');};
  return <PageTransition><main className="min-h-[100dvh] bg-void pb-[calc(11rem+env(safe-area-inset-bottom))] pt-4 text-ink-primary">
    <div className="mx-auto max-w-2xl space-y-5 px-4">
      <header className="flex items-center gap-3">
        <Link href={returnTo} onClick={onNavigate} aria-label="Voltar à origem do mapa" className="grid size-11 shrink-0 place-items-center rounded-xl border border-surface-border/60 bg-surface-raised/50 text-ink-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-300"><ArrowLeft size={18}/></Link>
        <span className="grid size-11 shrink-0 place-items-center rounded-2xl border border-violet-400/25 bg-violet-400/10 text-violet-300" aria-hidden="true"><Compass size={22}/></span>
        <div className="min-w-0 flex-1"><p className="text-[10px] font-bold uppercase tracking-[.18em] text-violet-300">VAULT · Saúde</p><h1 className="font-display text-xl font-bold tracking-tight">Explorar o VAULT</h1><p className="text-xs text-ink-muted">Sua saúde, organizada em um só lugar</p></div>
      </header>

      <div className="relative">
        <Search size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint" aria-hidden="true"/>
        <input type="search" value={query} disabled={!mapReady} onChange={event=>setQuery(event.target.value.slice(0,120))}
          placeholder="Medicamento, internação, fisioterapia…" aria-label="Buscar áreas de saúde"
          className="min-h-12 w-full rounded-2xl border border-violet-400/20 bg-surface-raised/70 pl-11 pr-11 text-sm text-ink-primary outline-none placeholder:text-ink-faint focus:border-violet-300/55"/>
        {query && <button type="button" onClick={()=>setQuery('')} aria-label="Limpar busca de áreas" className="absolute right-1 top-1/2 grid size-10 -translate-y-1/2 place-items-center text-ink-muted"><X size={17}/></button>}
      </div>
      <p role="status" className="text-xs text-ink-muted" aria-live="polite">{searching ? `${entriesCount} resultado${entriesCount===1?'':'s'}` : `${total} acessos clínicos disponíveis · por área`}</p>

      {!searching&&<button type="button" aria-expanded={showAdditional} onClick={()=>setShowAdditional(v=>!v)} className="flex min-h-12 w-full items-center justify-between gap-3 rounded-2xl border border-violet-300/20 bg-surface-raised/65 px-4 py-3 text-left text-xs font-semibold text-ink-primary">{showAdditional?'Recolher outras áreas':`Ver mais ${clinicalHiddenCountSTB()} áreas de saúde`} <ChevronDown size={15} className="inline-block align-middle"/></button>}
      {!searching&&favoriteEntries.length>0&&<section aria-label="Favoritos" className="space-y-2">
        <h2 className="text-xs font-bold text-amber-200">Favoritos</h2>
        <div className="grid grid-cols-2 gap-2 max-[349px]:grid-cols-1">{favoriteEntries.map((module,i)=><Link key={module.id} href={withReturnTarget(module.href,sourceHref)} onClick={()=>{rememberMapSTB();trigger('vibrate');}} className={`flex min-h-11 items-center justify-between gap-2 rounded-xl border border-amber-300/20 bg-amber-300/[.05] px-3 py-2 text-xs font-semibold text-ink-primary ${favoriteEntries.length%2===1&&i===favoriteEntries.length-1?"col-span-2 max-[349px]:col-span-1":""}`}><span className="min-w-0 break-words">{module.title}</span><Star size={15} fill="currentColor" className="shrink-0 text-amber-300"/></Link>)}</div>
      </section>}
      {!searching&&focus.length>0&&<section aria-label="Em foco agora" className="space-y-2"><h2 className="text-xs font-bold text-sky-200">Em foco agora</h2>
        <p className="text-[11px] text-ink-muted">Registros e acessos recentes, sem criar tarefas.</p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">{focus.map((item,index)=>{const module=HEALTH_MODULES_R5.find(m=>m.id===item.id);if(!module)return null;const entry=clinicalDirectoryM150.flatMap(group=>group.items).find(candidate=>candidate.id===item.id);const FocusIcon=item.kind==="brain"?BrainCircuit:item.kind==="consultation"?Stethoscope:item.kind==="exam"?FlaskConical:item.kind==="protocol"?HeartPulse:(entry?icons[entry.icon]:Clock3);return <Link key={item.id} href={withReturnTarget(module.href,sourceHref)} onClick={rememberMapSTB} className={`flex min-h-14 items-center gap-2.5 rounded-xl border border-sky-300/20 bg-sky-300/[.04] p-3 ${isTrailingGridItemSTB(index,focus.length)?"sm:col-span-2":""}`} aria-label={`Abrir ${module.title}`}><span data-vault-focus-icon="r4" className="grid size-9 shrink-0 place-items-center rounded-xl bg-sky-300/[.09] text-sky-200"><FocusIcon size={18} aria-hidden="true"/></span><span className="min-w-0 flex-1"><strong className="block text-xs text-ink-primary">{module.title}</strong><span className="mt-1 block line-clamp-1 text-[11px] leading-snug text-ink-muted">{item.reason.replace(/^Brain:\s*/i,'')}</span></span><ChevronRight size={16} className="shrink-0 text-sky-200" aria-hidden="true"/></Link>;})}</div></section>}
      {groups.length===0&&<div className="rounded-2xl border border-surface-border/60 bg-surface/45 p-4 text-sm text-ink-secondary">Nenhuma área encontrada. Tente outro nome ou limpe a busca.</div>}
      {groups.map(group=>{
        const preferred=featuredBySection[group.id]||[];
        const defaultItems=searching?group.items:group.items.filter(item=>!bottomNavDestinations.has(item.id));
        const featured=searching?defaultItems:preferred.map(id=>defaultItems.find(item=>item.id===id)).filter((item):item is ClinicalMapEntryM150=>Boolean(item));
        const remaining=searching?[]:defaultItems.filter(item=>!preferred.includes(item.id));
        return <section key={group.id} aria-labelledby={`m150-${group.id}`} className="space-y-2.5">
          <div className="flex items-start gap-2 px-0.5"><span className={`mt-0.5 ${clinicalMapSectionToneM150P5P3(group.id)}`} aria-hidden="true"><Layers3 size={16}/></span><div><h2 id={`m150-${group.id}`} className={`text-sm font-bold ${clinicalMapSectionToneM150P5P3(group.id)}`}>{group.title}</h2><p className="mt-0.5 text-[11px] text-ink-muted">{group.description}</p></div></div>
          {featured.length>0&&<div className="grid min-w-0 grid-cols-2 gap-2.5 max-[349px]:grid-cols-1">{featured.map((entry,i)=>{const module=moduleFor(entry);return <div key={entry.id} className={featured.length%2===1&&i===featured.length-1?"col-span-2 max-[349px]:col-span-1":"min-w-0"}><EntryCard entry={entry} returnHref={sourceHref} large={group.id==='rotina'&&!searching} onNavigate={()=>record(entry)} favorite={Boolean(module&&pinned.has(module.id))} onToggle={module?toggle:undefined}/></div>;})}</div>}
          {remaining.length>0&&<div className="grid min-w-0 grid-cols-2 gap-2.5 max-[349px]:grid-cols-1">{remaining.map((entry,i)=>{const module=moduleFor(entry);return <div key={entry.id} className={remaining.length%2===1&&i===remaining.length-1?"col-span-2 max-[349px]:col-span-1":"min-w-0"}><EntryCard entry={entry} returnHref={sourceHref} large={false} onNavigate={()=>record(entry)} favorite={Boolean(module&&pinned.has(module.id))} onToggle={module?toggle:undefined}/></div>;})}</div>}
        </section>;
      })}
      <p className="pb-3 text-[11px] leading-relaxed text-ink-muted">Este mapa organiza acessos existentes. Análises de Brain, Fênix e PharmaLens não substituem seus registros nem confirmam diagnósticos, receitas, estoque ou aquisições.</p>
    </div>
  </main></PageTransition>;
}
