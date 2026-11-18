"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Reorder, useDragControls, useReducedMotion } from "framer-motion";
import {
  Activity, ArrowDown, ArrowUp, BellRing, BookHeart, BrainCircuit, Building2,
  CalendarCheck, ChevronRight, Droplets, FileSearch, FlaskConical, FolderHeart,
  GripVertical, HeartPulse, LayoutGrid, Moon, PackageCheck, Pill, Pin, PinOff,
  ScanLine, Search, ShieldCheck, ShieldPlus, SlidersHorizontal, Sparkles, Stethoscope,
  Thermometer, UserCheck, Users, X, type LucideIcon,
} from "lucide-react";
import { useConsultas } from "@/hooks/useConsultas";
import { useCareFlowM2 } from "@/hooks/useCareFlowM2";
import { useBrainV5Pulse } from "@/hooks/useBrainV5Pulse";
import { useHapticFeedback } from "@/lib/haptics";
import { HealthHubSwitchR5 } from "@/components/saude/HealthHubSwitchR5";
import { withReturnTarget } from "@/lib/navigation/return-context";
import {
  buildHealthFocusR5, EMPTY_PREFERENCES_R5, HEALTH_GROUPS_R5, HEALTH_MODULES_R5,
  matchHubModuleR5, moveHubFavoriteR5, NETWORK_SEARCH_R5, parseHubPreferencesR5,
  recordHubRecentR5, toggleHubFavoriteR5,
  type HealthGroupR5, type HealthIconR5, type HubModuleR5, type HubPreferenceR5,
} from "@/lib/health-hub/r5";

const ICONS:Record<HealthIconR5,LucideIcon>={
  activity:Activity,flask:FlaskConical,folder:FolderHeart,heart:HeartPulse,
  thermometer:Thermometer,moon:Moon,droplets:Droplets,scan:ScanLine,files:FileSearch,
  shield:ShieldPlus,user:UserCheck,sparkles:Sparkles,pill:Pill,book:BookHeart,
  chart:Activity,lock:ShieldCheck,stethoscope:Stethoscope,building:Building2,
  package:PackageCheck,calendar:CalendarCheck,users:Users,
};
const TONES:Record<HealthGroupR5,{icon:string;surface:string;heading:string;line:string}>={
  intelligence:{icon:"text-sky-200 bg-sky-400/10 border-sky-400/20",surface:"border-sky-400/20 bg-sky-400/[0.045]",heading:"text-sky-300",line:"border-sky-300/40"},
  body:{icon:"text-rose-200 bg-rose-400/10 border-rose-400/20",surface:"border-rose-400/20 bg-rose-400/[0.045]",heading:"text-rose-300",line:"border-rose-300/40"},
  capture:{icon:"text-amber-200 bg-amber-400/10 border-amber-400/20",surface:"border-amber-400/20 bg-amber-400/[0.045]",heading:"text-amber-300",line:"border-amber-300/40"},
  foundation:{icon:"text-emerald-200 bg-emerald-400/10 border-emerald-400/20",surface:"border-emerald-400/20 bg-emerald-400/[0.045]",heading:"text-emerald-300",line:"border-emerald-300/40"},
};
const BY_ID=new Map(HEALTH_MODULES_R5.map(module=>[module.id,module]));
const MAX_STORE=8192;


function HubModuleTileR5({module,pinned,onOpen,onPin,compact=false,reason}:{module:HubModuleR5;pinned:boolean;onOpen:(m:HubModuleR5)=>void;onPin:(id:string)=>void;compact?:boolean;reason?:string}){
  const Icon=ICONS[module.icon],tone=TONES[module.group];
  return <article data-vault-r5-module={module.id} className={`group relative flex h-full min-w-0 flex-col overflow-hidden rounded-[20px] border p-3 shadow-[0_10px_30px_rgba(0,0,0,.09)] ${tone.surface}`}>
    <div className="mb-2 flex items-start justify-between gap-2">
      <span aria-hidden="true" className={`grid size-10 shrink-0 place-items-center rounded-[14px] border ${tone.icon}`}><Icon size={19}/></span>
      <button type="button" onClick={()=>onPin(module.id)} aria-label={pinned?`Desafixar ${module.title}`:`Fixar ${module.title}`} aria-pressed={pinned}
        className={`grid size-10 shrink-0 place-items-center rounded-xl border border-surface-border/40 transition active:scale-95 motion-reduce:transition-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-300 ${pinned?"bg-emerald-300/10 text-emerald-200":"text-ink-muted hover:bg-surface-raised"}`}>
        {pinned?<PinOff size={15}/>:<Pin size={15}/>}</button>
    </div>
    <button type="button" onClick={()=>onOpen(module)} className="flex min-h-[62px] w-full min-w-0 flex-1 flex-col items-start justify-between gap-1 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-300">
      <strong className="block w-full break-words text-[12px] font-semibold leading-snug text-ink-primary">{module.title}</strong>
      {!compact?<span className="block w-full text-[10px] leading-snug text-ink-muted">{module.description}</span>:null}
      {reason?<span className="mt-1 block w-full text-[10px] leading-snug text-ink-secondary">{reason}</span>:null}
      <span className={`mt-1 inline-flex items-center gap-1 text-[10px] font-semibold ${tone.heading}`}>Abrir <ChevronRight size={13}/></span>
    </button>
  </article>;
}
function SortableFavoriteR5({module,index,count,onOpen,onMove,onUnpin}:{module:HubModuleR5;index:number;count:number;onOpen:(m:HubModuleR5)=>void;onMove:(id:string,delta:number)=>void;onUnpin:(id:string)=>void}){
  const controls=useDragControls(),Icon=ICONS[module.icon],tone=TONES[module.group],{trigger}=useHapticFeedback();
  return <Reorder.Item value={module.id} dragListener={false} dragControls={controls} onDragEnd={()=>trigger("light")} className={`flex min-h-14 min-w-0 items-center gap-1.5 rounded-2xl border p-2.5 ${tone.surface}`}>
    <button type="button" onPointerDown={e=>controls.start(e)} aria-label={`Arrastar ${module.title}`} className="grid size-11 shrink-0 place-items-center rounded-xl text-ink-muted" style={{touchAction:"none"}}><GripVertical size={19}/></button>
    <button type="button" onClick={()=>onOpen(module)} className="flex min-w-0 flex-1 items-center gap-2 text-left"><Icon className={tone.heading} size={18}/><span className="min-w-0 break-words text-xs font-semibold">{module.title}</span></button>
    <button type="button" disabled={index===0} onClick={()=>onMove(module.id,-1)} aria-label={`Subir ${module.title}`} className="grid size-9 place-items-center rounded-lg disabled:opacity-30"><ArrowUp size={16}/></button>
    <button type="button" disabled={index===count-1} onClick={()=>onMove(module.id,1)} aria-label={`Descer ${module.title}`} className="grid size-9 place-items-center rounded-lg disabled:opacity-30"><ArrowDown size={16}/></button>
    <button type="button" onClick={()=>onUnpin(module.id)} aria-label={`Desafixar ${module.title}`} className="grid size-9 place-items-center rounded-lg text-rose-200"><X size={16}/></button>
  </Reorder.Item>;
}

export function HealthHubLauncherR5({userId,personId,onOpenPersonalSection}:{userId:string;personId:string;onOpenPersonalSection:(sectionId:string)=>void}){
  const router=useRouter(),{trigger}=useHapticFeedback(),reducedMotion=useReducedMotion();
  const {consultas=[]}=useConsultas(),{events=[]}=useCareFlowM2(),brain=useBrainV5Pulse();
  const scope=userId&&personId?`vault:health-hub:r5:${encodeURIComponent(userId)}:${encodeURIComponent(personId)}`:"";
  const [loadedScope,setLoadedScope]=useState("");
  const [prefs,setPrefs]=useState<HubPreferenceR5>(EMPTY_PREFERENCES_R5);
  const [search,setSearch]=useState("");
  const [organizing,setOrganizing]=useState(false);
  const [now,setNow]=useState(()=>new Date());
  useEffect(()=>setNow(new Date()),[scope]);
  useEffect(()=>{
    setLoadedScope("");setOrganizing(false);
    if(!scope){setPrefs(EMPTY_PREFERENCES_R5);return;}
    const read=()=>{try{const raw=localStorage.getItem(scope);setPrefs(raw&&raw.length<=MAX_STORE?parseHubPreferencesR5(JSON.parse(raw)):EMPTY_PREFERENCES_R5);}catch{setPrefs(EMPTY_PREFERENCES_R5);}};
    read();setLoadedScope(scope);
    const onStorage=(event:StorageEvent)=>{if(event.key===scope)read();};
    window.addEventListener("storage",onStorage);window.addEventListener("vault:health-hub:r5-updated",read);return()=>{window.removeEventListener("storage",onStorage);window.removeEventListener("vault:health-hub:r5-updated",read);};
  },[scope]);
  const ready=Boolean(scope&&loadedScope===scope);
  const current=ready?prefs:EMPTY_PREFERENCES_R5;
  const save=useCallback((next:HubPreferenceR5)=>{
    if(!ready)return;
    const safe=parseHubPreferencesR5(next);setPrefs(safe);
    try{localStorage.setItem(scope,JSON.stringify(safe));window.dispatchEvent(new Event("vault:health-hub:r5-updated"));}catch{/* optional, session remains usable */}
  },[scope,ready]);
  const pinned=useMemo(()=>new Set(current.favorites),[current.favorites]);
  const markRecent=(id:string)=>{if(!ready)return;save({...current,recent:recordHubRecentR5(current.recent,id)});};
  const open=(module:HubModuleR5)=>{
    trigger("light");markRecent(module.id);
    if(module.href.startsWith("/saude/minha-saude#")){
      onOpenPersonalSection(module.href.split("#")[1]);return;
    }
    router.push(withReturnTarget(module.href,"/saude/minha-saude"));
  };
  const navigateToOther=(href:string)=>{trigger("light");router.push(withReturnTarget(href,"/saude/minha-saude"));};
  const togglePin=(id:string)=>{if(!ready)return;trigger("light");save({...current,favorites:toggleHubFavoriteR5(current.favorites,id)});};
  const reorder=(newOrder:string[])=>{if(!ready)return;const known=new Set(current.favorites);const next=newOrder.filter(x=>known.has(x));if(next.length!==current.favorites.length||new Set(next).size!==known.size)return;save({...current,favorites:next});};
  const favorites=current.favorites.map(id=>BY_ID.get(id)).filter((item):item is HubModuleR5=>Boolean(item));
  const focus=useMemo(()=>buildHealthFocusR5({userId:ready?userId:"",personId:ready?personId:"",consultations:consultas,events,brain:brain.records,favorites:current.favorites,recent:current.recent,now}),[ready,userId,personId,consultas,events,current.favorites,current.recent,brain.records,now]);
  const query=search.trim(),searchHits=useMemo(()=>query?[...HEALTH_MODULES_R5.filter(m=>matchHubModuleR5(m,query)),...NETWORK_SEARCH_R5.filter(m=>matchHubModuleR5(m,query))]:[],[query]);
  return <section data-vault-ui360-r5-launcher className="space-y-4" aria-label="Hub inteligente de Minha Saúde">
    <HealthHubSwitchR5 active="saude" onNavigate={navigateToOther}/>
    <div className="overflow-hidden rounded-[24px] border border-sky-300/20 bg-[radial-gradient(circle_at_100%_0%,rgba(56,189,248,.12),transparent_55%),linear-gradient(140deg,rgba(12,21,34,.98),rgba(9,16,25,.94))] p-4 shadow-[0_16px_44px_rgba(0,0,0,.17)]">
      <div className="flex items-center gap-2 text-sky-200"><BrainCircuit size={17}/><span className="text-[10px] font-bold uppercase tracking-[.16em]">VAULT · Saúde 360</span></div>
      <h2 className="mt-2 font-display text-xl font-semibold tracking-tight text-ink-primary">Seu cuidado, sem labirintos.</h2>
      <p className="mt-1 text-[11px] leading-relaxed text-ink-muted">Fixe o que você mais usa, acompanhe contextos reais e explore suas ferramentas clínicas.</p>
      <div className="relative mt-3"><Search size={17} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted"/>
        <input type="search" value={search} onChange={e=>setSearch(e.target.value.slice(0,80))} aria-label="Buscar módulos de saúde e rede" placeholder="Buscar exame, pressão, receita, médico…" className="min-h-12 w-full rounded-[15px] border border-surface-border/70 bg-void/65 pl-10 pr-10 text-sm text-ink-primary outline-none placeholder:text-ink-muted focus:border-sky-300/50"/>
        {search?<button type="button" onClick={()=>setSearch("")} aria-label="Limpar busca" className="absolute right-1 top-1/2 grid size-10 -translate-y-1/2 place-items-center text-ink-muted"><X size={17}/></button>:null}
      </div>
    </div>
    {query?<section aria-label="Resultados da busca" className="space-y-2 rounded-[22px] border border-surface-border/60 bg-surface/50 p-3"><div className="flex items-center justify-between"><h3 className="text-xs font-semibold">Resultados · {searchHits.length}</h3><span className="text-[10px] text-ink-muted">Saúde e Rede</span></div>
      {searchHits.length?<div className="grid grid-cols-2 gap-2 max-[349px]:grid-cols-1">{searchHits.map(item=>{
        const module=BY_ID.get(item.id);if(module)return <HubModuleTileR5 key={module.id} module={module} pinned={pinned.has(module.id)} onOpen={open} onPin={togglePin} compact/>;
        const Icon=ICONS[item.icon];return <button key={item.id} type="button" onClick={()=>navigateToOther(item.href)} className="flex min-h-[70px] items-center gap-2 rounded-2xl border border-violet-300/20 bg-violet-300/[.045] p-3 text-left"><Icon size={18} className="shrink-0 text-violet-300"/><span className="min-w-0"><strong className="block text-xs">{item.title}</strong><span className="block text-[10px] text-ink-muted">{item.description}</span></span><ChevronRight size={14} className="shrink-0 text-violet-300"/></button>;})}</div>:<p className="py-3 text-xs text-ink-muted">Nenhum módulo corresponde à busca. Confira o termo.</p>}
    </section>:<>
      {favorites.length>0?<section aria-label="Módulos fixados" className="space-y-2">
        <div className="flex items-center justify-between gap-2"><div><h3 className="flex items-center gap-1.5 text-[13px] font-semibold"><Pin size={15} className="text-sky-300"/>Fixados</h3><p className="mt-0.5 text-[10px] text-ink-muted">Seus acessos, na ordem que você escolher</p></div>
          <button type="button" aria-pressed={organizing} onClick={()=>setOrganizing(x=>!x)} className="flex min-h-11 items-center gap-1 rounded-xl border border-surface-border px-3 text-[11px] font-semibold text-ink-secondary"><SlidersHorizontal size={14}/>{organizing?"Concluir":"Organizar"}</button></div>
        {organizing?<Reorder.Group axis="y" values={current.favorites} onReorder={reorder} className="space-y-2" style={{touchAction:"pan-y"}}>{favorites.map((m,i)=><SortableFavoriteR5 key={m.id} module={m} index={i} count={favorites.length} onOpen={open} onMove={(id,d)=>save({...current,favorites:moveHubFavoriteR5(current.favorites,id,d)})} onUnpin={togglePin}/>)}</Reorder.Group>:<div className="grid grid-cols-2 gap-2 max-[349px]:grid-cols-1">{favorites.map(m=><HubModuleTileR5 key={m.id} module={m} pinned onOpen={open} onPin={togglePin} compact/>)}</div>}
        <span className="sr-only">{reducedMotion?"Movimento reduzido ativado.":"Você também pode reorganizar pelos botões subir e descer."}</span>
      </section>:null}
      {focus.length>0?<section aria-label="Em foco agora" className="space-y-2"><div className="flex items-center gap-2"><BellRing size={16} className="text-amber-300"/><h3 className="text-[13px] font-semibold">Em foco agora</h3></div><p className="text-[10px] text-ink-muted">Fatos da sua rotina e acessos recentes neste Hub — sem criar tarefas.</p>
        <div className="-mx-1 flex snap-x snap-mandatory gap-2 overflow-x-auto px-1 pb-2 [scrollbar-width:none]">{focus.map(f=>{const module=BY_ID.get(f.id);return module?<div key={f.id} className="w-[min(75vw,240px)] shrink-0 snap-start"><HubModuleTileR5 module={module} pinned={false} onOpen={open} onPin={togglePin} reason={f.reason}/></div>:null;})}</div>
      </section>:null}
      <section aria-label="Explorar módulos de saúde" className="space-y-3"><div className="flex items-center gap-2"><LayoutGrid size={16} className="text-emerald-300"/><h3 className="text-[13px] font-semibold">Explorar Minha Saúde</h3></div>
        {HEALTH_GROUPS_R5.map(group=>{const tone=TONES[group.id],items=HEALTH_MODULES_R5.filter(m=>m.group===group.id);return <div key={group.id} className="space-y-2"><div className={`flex items-center gap-2 border-l-2 pl-2 ${tone.line}`}><div className="min-w-0"><h4 className={`text-[12px] font-semibold ${tone.heading}`}>{group.title}</h4><p className="text-[10px] text-ink-muted">{group.subtitle}</p></div></div><div className="grid grid-cols-2 gap-2 max-[349px]:grid-cols-1">{items.map(m=><HubModuleTileR5 key={m.id} module={m} pinned={pinned.has(m.id)} onOpen={open} onPin={togglePin}/>)}</div></div>;})}
      </section>
    </>}
  </section>;
}
