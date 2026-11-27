"use client";
import { getIa20ShortcutTone } from "@/lib/navigation/bottom-nav-compose";
import { isTrailingGridItemSTB } from "@/lib/ui/stability-grid-stb";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Reorder, useDragControls, useReducedMotion } from "framer-motion";
import {
  Activity, Accessibility, BedDouble, ArrowDown, ArrowUp, BellRing, BookHeart, BrainCircuit, Building2, Dumbbell, Utensils, Target, ChartNoAxesCombined,
  CalendarCheck, ChevronRight, Droplets, FileSearch, FlaskConical, FolderHeart,
  GripVertical, HeartPulse, LayoutGrid, Moon, PackageCheck, Pill, Star,
  ScanLine, Search, ShieldCheck, ShieldPlus, SlidersHorizontal, Sparkles, Stethoscope,
  Thermometer, UserRoundCheck, Users, X, type LucideIcon,
} from "lucide-react";
import { useConsultas } from "@/hooks/useConsultas";
import { useCareFlowM2 } from "@/hooks/useCareFlowM2";
import { useBrainV5Pulse } from "@/hooks/useBrainV5Pulse";
import { useHapticFeedback } from "@/lib/haptics";
import { HealthHubSwitchR5 } from "@/components/saude/HealthHubSwitchR5";
import { withReturnTarget } from "@/lib/navigation/return-context";
import {
  buildHealthFocusR5, EMPTY_PREFERENCES_R5, HEALTH_MODULES_R5,
  matchHubModuleR5, moveHubFavoriteR5, NETWORK_SEARCH_R5, parseHubPreferencesR5,
  recordHubRecentR5, toggleHubFavoriteR5,
  type HealthGroupR5, type HealthIconR5, type HubModuleR5, type HubPreferenceR5,
} from "@/lib/health-hub/r5";

const ICONS:Record<HealthIconR5,LucideIcon>={
  activity:Activity,flask:FlaskConical,folder:FolderHeart,heart:HeartPulse,
  thermometer:Thermometer,moon:Moon,droplets:Droplets,scan:ScanLine,files:FileSearch,
  shield:ShieldPlus,user:UserRoundCheck,sparkles:Sparkles,pill:Pill,book:BookHeart,
  chart:Activity,lock:ShieldCheck,stethoscope:Stethoscope,building:Building2,
  package:PackageCheck,calendar:CalendarCheck,users:Users,bed:BedDouble,rehab:Accessibility, dumbbell:Dumbbell,utensils:Utensils,target:Target,trend:ChartNoAxesCombined,
};
const TONES:Record<HealthGroupR5,{icon:string;surface:string;heading:string;line:string}>={
  intelligence:{icon:"text-sky-200 bg-sky-400/10 border-sky-400/20",surface:"border-sky-400/20 bg-sky-400/[0.045]",heading:"text-sky-300",line:"border-sky-300/40"},
  body:{icon:"text-rose-200 bg-rose-400/10 border-rose-400/20",surface:"border-rose-400/20 bg-rose-400/[0.045]",heading:"text-rose-300",line:"border-rose-300/40"},
  capture:{icon:"text-amber-200 bg-amber-400/10 border-amber-400/20",surface:"border-amber-400/20 bg-amber-400/[0.045]",heading:"text-amber-300",line:"border-amber-300/40"},
  foundation:{icon:"text-emerald-200 bg-emerald-400/10 border-emerald-400/20",surface:"border-emerald-400/20 bg-emerald-400/[0.045]",heading:"text-emerald-300",line:"border-emerald-300/40"},
};
const BY_ID=new Map(HEALTH_MODULES_R5.map(module=>[module.id,module]));
const RECOVERY_MODULES_STB=HEALTH_MODULES_R5.filter(m=>m.id==="internacoes"||m.id==="reabilitacao");
const VITAL_ROOT_STB=HEALTH_MODULES_R5.filter(m=>m.id==="vital");
const VITAL_TONES:Record<string,{icon:string;surface:string;heading:string;line:string}>={
 vital:{icon:"text-teal-200 bg-teal-400/10 border-teal-400/20",surface:"border-teal-400/20 bg-teal-400/[0.045]",heading:"text-teal-300",line:"border-teal-300/40"},
 'vital-treinos':TONES.intelligence,'vital-nutricao':TONES.foundation,'vital-planos':TONES.capture,
 'vital-evolucao':{icon:"text-cyan-200 bg-cyan-400/10 border-cyan-400/20",surface:"border-cyan-400/20 bg-cyan-400/[0.045]",heading:"text-cyan-300",line:"border-cyan-300/40"},
};
const toneForModuleSTB=(module:HubModuleR5)=>VITAL_TONES[module.id]??(module.id==="reabilitacao"?{icon:"text-teal-200 bg-teal-400/10 border-teal-400/20",surface:"border-teal-400/20 bg-teal-400/[0.045]",heading:"text-teal-300",line:"border-teal-300/40"}:TONES[module.group]);
const MAX_STORE=8192;
/** Fixed, compact patient-facing tasks; no duplicate catalog or new clinical source. */
const IA20_ESSENTIAL_LINKS: ReadonlyArray<{label:string;href:string;icon:LucideIcon}> = [
  {label:"Medicamentos",href:"/saude/medicamentos",icon:Pill},
  {label:"Consultas",href:"/saude/consultas",icon:CalendarCheck},
  {label:"Sintomas",href:"/saude/careflow/sintomas",icon:Thermometer},
  {label:"Exames",href:"/saude/exames",icon:FlaskConical},
  {label:"Pressão",href:"/saude/careflow/pressao",icon:HeartPulse},
  {label:"Profissionais",href:"/saude/rede",icon:Users},
];


/** Compact family shared semantically with Explorar: one open target and one separate favorite action. */
function HubModuleTileR5({module,pinned,onOpen,onPin,compact=false,reason,spanFull=false}:{module:HubModuleR5;pinned:boolean;onOpen:(m:HubModuleR5)=>void;onPin:(id:string)=>void;compact?:boolean;reason?:string;spanFull?:boolean}){
  const Icon=ICONS[module.icon],tone=toneForModuleSTB(module);
  return <article data-vault-r5-module={module.id} className={`relative flex min-h-[72px] min-w-0 items-stretch overflow-hidden rounded-2xl border shadow-sm ${tone.surface} ${spanFull?"col-span-2 max-[349px]:col-span-1":""}`}>
    <button type="button" onClick={()=>onOpen(module)} aria-label={`Abrir ${module.title}`}
      className="flex min-w-0 flex-1 items-center gap-2 p-2.5 pr-0 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-300 motion-reduce:transition-none">
      <span className={`grid size-9 shrink-0 place-items-center rounded-xl border ${tone.icon}`} aria-hidden="true"><Icon size={17}/></span>
      <span className="min-w-0 flex-1"><strong className="block break-words text-xs font-semibold leading-snug text-ink-primary">{module.title}</strong>
        {reason?<span className="mt-0.5 block break-words text-[10px] leading-snug text-ink-muted">{reason}</span>:!compact?<span className="mt-0.5 block break-words text-[10px] leading-snug text-ink-muted">{module.description}</span>:null}</span>
    </button>
    <button type="button" aria-label={pinned?`Remover ${module.title} dos favoritos`:`Adicionar ${module.title} aos favoritos`}
      aria-pressed={pinned} onClick={()=>onPin(module.id)} className="grid min-h-11 w-11 shrink-0 place-items-center text-amber-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-300">
      <Star size={17} fill={pinned?"currentColor":"none"} aria-hidden="true"/>
    </button>
  </article>;
}
function SortableFavoriteR5({module,index,count,onOpen,onMove,onUnpin}:{module:HubModuleR5;index:number;count:number;onOpen:(m:HubModuleR5)=>void;onMove:(id:string,delta:number)=>void;onUnpin:(id:string)=>void}){
  const controls=useDragControls(),Icon=ICONS[module.icon],tone=toneForModuleSTB(module),{trigger}=useHapticFeedback();
  return <Reorder.Item value={module.id} dragListener={false} dragControls={controls} onDragEnd={()=>trigger("light")} className={`flex min-h-14 min-w-0 items-center gap-1.5 rounded-2xl border p-2.5 ${tone.surface}`}>
    <button type="button" onPointerDown={e=>controls.start(e)} aria-label={`Arrastar ${module.title}`} className="grid size-11 shrink-0 place-items-center rounded-xl text-ink-muted" style={{touchAction:"none"}}><GripVertical size={19}/></button>
    <button type="button" onClick={()=>onOpen(module)} className="flex min-w-0 flex-1 items-center gap-2 text-left"><Icon className={tone.heading} size={18}/><span className="min-w-0 break-words text-xs font-semibold">{module.title}</span></button>
    <button type="button" disabled={index===0} onClick={()=>onMove(module.id,-1)} aria-label={`Subir ${module.title}`} className="grid size-9 place-items-center rounded-lg disabled:opacity-30"><ArrowUp size={16}/></button>
    <button type="button" disabled={index===count-1} onClick={()=>onMove(module.id,1)} aria-label={`Descer ${module.title}`} className="grid size-9 place-items-center rounded-lg disabled:opacity-30"><ArrowDown size={16}/></button>
    <button type="button" onClick={()=>onUnpin(module.id)} aria-label={`Desafixar ${module.title}`} className="grid size-9 place-items-center rounded-lg text-rose-200"><Star size={16}/></button>
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
    if(module.href.startsWith("/saude/fenix#")||module.href.startsWith("/saude/minha-saude#")){
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
  return <section data-vault-ui360-r5-launcher className="space-y-3 pb-5" aria-label="Hub inteligente de Minha Saúde">
    <HealthHubSwitchR5 active="saude" onNavigate={navigateToOther}/>
    <section data-vault-zhf-vital aria-label="Acesso permanente ao Vital" className="grid grid-cols-2 gap-2">{VITAL_ROOT_STB.map(m=><HubModuleTileR5 key={m.id} module={m} pinned={pinned.has(m.id)} onOpen={open} onPin={togglePin} spanFull/>)}</section>
    <div className="rounded-[18px] border border-sky-300/15 bg-surface/65 p-3 shadow-sm">
      <div className="flex items-center gap-2 text-sky-200"><BrainCircuit size={16} aria-hidden="true"/><h2 className="text-xs font-semibold">Painel de saúde</h2><span className="ml-auto text-[10px] text-ink-muted">Buscar ou escolher</span></div>
      <div className="relative mt-2"><Search size={17} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted"/>
        <input type="search" value={search} onChange={e=>setSearch(e.target.value.slice(0,80))} aria-label="Buscar módulos de saúde e rede" placeholder="Exame, internação, fisioterapia…" className="min-h-11 w-full rounded-xl border border-surface-border/70 bg-void/65 pl-10 pr-10 text-sm text-ink-primary outline-none placeholder:text-ink-muted focus:border-sky-300/50"/>
        {search?<button type="button" onClick={()=>setSearch("")} aria-label="Limpar busca" className="absolute right-1 top-1/2 grid size-10 -translate-y-1/2 place-items-center text-ink-muted"><X size={17}/></button>:null}
      </div>
    </div>
    {!query && <section aria-label="Acessos essenciais" className="space-y-3">
      <div className="flex items-center gap-2"><HeartPulse size={16} className="text-emerald-300"/><h3 className="text-[13px] font-semibold">Acessos rápidos</h3></div>
      <div className="grid grid-cols-2 gap-1.5 min-[430px]:grid-cols-3">
        {IA20_ESSENTIAL_LINKS.map(({label,href,icon:Icon})=><button key={href} type="button" onClick={()=>navigateToOther(href)} className={`flex min-h-[52px] min-w-0 items-center gap-2 rounded-xl border px-2.5 py-2 text-left text-xs font-semibold text-ink-primary transition-colors active:bg-surface-raised focus-visible:outline focus-visible:outline-2 ${getIa20ShortcutTone(href).surface}`}><Icon size={18} className={`shrink-0 ${getIa20ShortcutTone(href).icon}`} aria-hidden="true"/><span className="min-w-0 break-words">{label}</span></button>)}
      </div>
    </section>}
    {query?<section aria-label="Resultados da busca" className="space-y-2 rounded-[22px] border border-surface-border/60 bg-surface/50 p-3"><div className="flex items-center justify-between"><h3 className="text-xs font-semibold">Resultados · {searchHits.length}</h3><span className="text-[10px] text-ink-muted">Saúde e Rede</span></div>
      {searchHits.length?<div className="grid grid-cols-2 gap-2 max-[349px]:grid-cols-1">{searchHits.map((item,index)=>{
        const module=BY_ID.get(item.id);if(module)return <HubModuleTileR5 key={module.id} module={module} pinned={pinned.has(module.id)} onOpen={open} onPin={togglePin} compact spanFull={isTrailingGridItemSTB(index,searchHits.length)}/>;
        const Icon=ICONS[item.icon];return <button key={item.id} type="button" onClick={()=>navigateToOther(item.href)} className={`flex min-h-[70px] min-w-0 items-center gap-2 rounded-2xl border border-violet-300/20 bg-violet-300/[.045] p-3 text-left ${isTrailingGridItemSTB(index,searchHits.length)?"col-span-2 max-[349px]:col-span-1":""}`}><Icon size={18} className="shrink-0 text-violet-300"/><span className="min-w-0"><strong className="block text-xs">{item.title}</strong><span className="block text-[10px] text-ink-muted">{item.description}</span></span><ChevronRight size={14} className="shrink-0 text-violet-300"/></button>;})}</div>:<p className="py-3 text-xs text-ink-muted">Nenhum módulo corresponde à busca. Confira o termo.</p>}
    </section>:<>
      {favorites.length>0?<section aria-label="Módulos fixados" className="space-y-2">
        <div className="flex items-center justify-between gap-2"><div><h3 className="flex items-center gap-1.5 text-[13px] font-semibold"><Star size={15} className="text-amber-300"/>Favoritos</h3><p className="mt-0.5 text-[10px] text-ink-muted">Mesmos favoritos do Explorar</p></div>
          <button type="button" aria-pressed={organizing} onClick={()=>setOrganizing(x=>!x)} className="flex min-h-11 items-center gap-1 rounded-xl border border-surface-border px-3 text-[11px] font-semibold text-ink-secondary"><SlidersHorizontal size={14}/>{organizing?"Concluir":"Organizar"}</button></div>
        {organizing?<Reorder.Group axis="y" values={current.favorites} onReorder={reorder} className="space-y-2" style={{touchAction:"pan-y"}}>{favorites.map((m,i)=><SortableFavoriteR5 key={m.id} module={m} index={i} count={favorites.length} onOpen={open} onMove={(id,d)=>save({...current,favorites:moveHubFavoriteR5(current.favorites,id,d)})} onUnpin={togglePin}/>)}</Reorder.Group>:<div className="grid grid-cols-2 gap-2 max-[349px]:grid-cols-1">{favorites.map((m,i)=><HubModuleTileR5 key={m.id} module={m} pinned onOpen={open} onPin={togglePin} compact spanFull={favorites.length%2===1&&i===favorites.length-1}/>)}</div>}
        <span className="sr-only">{reducedMotion?"Movimento reduzido ativado.":"Você também pode reorganizar pelos botões subir e descer."}</span>
      </section>:null}
      {focus.length>0?<section aria-label="Em foco agora" className="space-y-2"><div className="flex items-center gap-2"><BellRing size={16} className="text-sky-300"/><h3 className="text-[13px] font-semibold">Em foco agora</h3></div>
        <p className="text-[10px] text-ink-muted">Registros e acessos recentes, sem criar novas tarefas.</p>
        <div className="grid grid-cols-1 gap-2 pb-1">{focus.map(f=>{const module=BY_ID.get(f.id);if(!module)return null;const Icon=ICONS[module.icon];return <button key={f.id} type="button" onClick={()=>open(module)} aria-label={`Conferir ${module.title}`}
          className="flex min-h-[66px] min-w-0 items-center gap-2.5 rounded-xl border border-sky-300/20 bg-sky-300/[.04] p-3 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-300">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-sky-300/10 text-sky-200"><Icon size={17} aria-hidden="true"/></span>
          <span className="min-w-0 flex-1"><strong className="block break-words text-xs text-ink-primary">{module.title}</strong><span className="mt-0.5 block break-words text-[11px] leading-snug text-ink-muted">{f.reason}</span></span><ChevronRight size={15} className="shrink-0 text-sky-300" aria-hidden="true"/>
        </button>;})}</div>
      </section>:null}
      <section aria-label="Cuidados e recuperação" className="space-y-2"><div className="flex items-center gap-2"><BedDouble size={16} className="text-sky-300" aria-hidden="true"/><h3 className="text-[13px] font-semibold">Cuidados e recuperação</h3></div><p className="text-[10px] text-ink-muted">Internações e reabilitação clínica, sem confundir com cadastro de profissionais.</p><div className="grid grid-cols-2 gap-2 max-[349px]:grid-cols-1">{RECOVERY_MODULES_STB.map((m,i)=><HubModuleTileR5 key={m.id} module={m} pinned={pinned.has(m.id)} onOpen={open} onPin={togglePin} spanFull={isTrailingGridItemSTB(i,RECOVERY_MODULES_STB.length)}/>)}</div></section>
      <section aria-label="Explorar todas as áreas" className="space-y-2">
        <button type="button" onClick={()=>navigateToOther("/saude/mapa")} className="flex min-h-12 w-full items-center justify-between gap-2 rounded-2xl border border-violet-300/20 bg-violet-300/[.045] px-3 text-left text-xs font-semibold text-violet-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-300"><span className="flex items-center gap-2"><LayoutGrid size={17} aria-hidden="true"/>Ver todas as áreas de saúde</span><ChevronRight size={17} aria-hidden="true"/></button>
      </section>
    </>}
  </section>;
}
