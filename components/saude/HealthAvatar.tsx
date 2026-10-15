"use client";
import dynamic from "next/dynamic";
import { ChevronDown, SlidersHorizontal, Brain, EyeOff, Shirt, X } from "lucide-react";
import { Component, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import type { HealthDevice } from "@/lib/health-profile/types";
import { avatarLayout } from "@/lib/health-profile/avatar";
import { avatarPreferencePayload, parseAvatarMode, parseAvatarSize, parseAvatarStyle, type AvatarSize, type AvatarMode } from "@/lib/health-profile/avatar-preference";
import { DEFAULT_AVATAR_STYLE, normalizeAvatarStyle, type AvatarStyle } from "@/lib/health-profile/avatar-style";
import type {AvatarFraming} from "@/lib/health-profile/avatar-framing";
import { AvatarStyleEditor } from "./AvatarStyleEditor";
import type {AvatarBodyContext,AvatarBodyPart} from "@/lib/health-profile/avatar-body";
import { SURGERY_MARKER_COLORS, SURGERY_MARKER_LABELS } from "@/lib/health-profile/avatar-surgery-markers";
import { HealthBody } from "./HealthBody";
const Avatar3D = dynamic(() => import("./HealthAvatar3D"), { ssr: false, loading: () => <p role="status" className="py-16 text-center text-sm text-slate-400">Preparando avatar 3D…</p> });
class Avatar3DBoundary extends Component<{onUnavailable:()=>void;children:ReactNode},{failed:boolean}> {
  state={failed:false};
  static getDerivedStateFromError(){return {failed:true};}
  componentDidCatch(){this.props.onUnavailable();}
  render(){return this.state.failed?null:this.props.children;}
}
export function HealthAvatar({skin,devices,expanded=false,attention=0,preferenceKey,onDeviceSelect,onBrainSelect,body,onBodySelect}: {
  body?:AvatarBodyContext;onBodySelect?:(part:AvatarBodyPart,markerKey?:string)=>void;
  skin:string;devices:HealthDevice[];expanded?:boolean;attention?:number;preferenceKey?:string;
  onDeviceSelect?:(id:string)=>void;onBrainSelect?:()=>void;
}) {
  const requestedMode=useRef<AvatarMode>('3d');
  const [size,setSize]=useState<AvatarSize>('compact');
  const [framing,setFraming]=useState<AvatarFraming>('body');
  const [mode,setMode]=useState<AvatarMode>('3d');
  const [appearance,setAppearance]=useState<AvatarStyle>(DEFAULT_AVATAR_STYLE);
  const [loadedKey,setLoadedKey]=useState<string|undefined>();
  const [controlsContainer,setControlsContainer]=useState<HTMLDivElement|null>(null);
  const [unavailable,setUnavailable]=useState(false);
  useEffect(()=>{
    let next:AvatarMode='3d',nextSize:AvatarSize='compact',nextAppearance:AvatarStyle=DEFAULT_AVATAR_STYLE;
    try{if(preferenceKey){const stored=localStorage.getItem(preferenceKey);next=parseAvatarMode(stored);nextSize=parseAvatarSize(stored);nextAppearance=parseAvatarStyle(stored);}}catch{}
    requestedMode.current=next;setFraming('body');setMode(next);setSize(nextSize);setAppearance(nextAppearance);setUnavailable(false);setLoadedKey(preferenceKey);
  },[preferenceKey]);
  const fallback=useCallback(()=>{setUnavailable(true);setMode('illustration');},[]);
  const chooseMode=(next:AvatarMode)=>{
    requestedMode.current=next;setUnavailable(false);setMode(next);
    try{if(preferenceKey)localStorage.setItem(preferenceKey,avatarPreferencePayload(next,size,appearance));}catch{}
  };
  const chooseSize=(next:AvatarSize)=>{setFraming('body');setSize(next);try{if(preferenceKey)localStorage.setItem(preferenceKey,avatarPreferencePayload(requestedMode.current,next,appearance));}catch{}};
  const chooseAppearance=(next:AvatarStyle)=>{
    const normalized=normalizeAvatarStyle(next);
    setAppearance(normalized);
    try{if(preferenceKey)localStorage.setItem(preferenceKey,avatarPreferencePayload(requestedMode.current,size,normalized));}catch{}
  };
  const expandedRef=useRef<HTMLDivElement>(null);
  useEffect(()=>{
    if(!expanded || size!=='expanded') return;
    const previous=document.activeElement as HTMLElement|null;
    const overflow=document.body.style.overflow;
    document.body.style.overflow='hidden'; expandedRef.current?.focus();
    const escape=(event:KeyboardEvent)=>{if(event.key==='Escape'&&!event.defaultPrevented&&(!(event.target instanceof Element)||!event.target.closest('[role="dialog"]')||event.target.closest('[role="dialog"]')===expandedRef.current)){event.stopPropagation();expandedRef.current?.querySelector<HTMLButtonElement>('[data-avatar-close]')?.click();}};
    document.addEventListener('keydown',escape);
    return()=>{document.body.style.overflow=overflow;document.removeEventListener('keydown',escape);if(previous?.isConnected)previous.focus();};
  },[size,expanded,preferenceKey]);
  const ready=loadedKey===preferenceKey;
  const toggleExpanded=useCallback(()=>chooseSize(size==='expanded'?'compact':'expanded'),[size,preferenceKey,appearance,mode]);
  return <div ref={expandedRef} tabIndex={expanded&&size==='expanded'?-1:undefined} role={expanded&&size==='expanded'?'dialog':undefined} aria-modal={expanded&&size==='expanded'?true:undefined} aria-label={expanded&&size==='expanded'?'Meu avatar':undefined} onKeyDown={event=>{
    if(size!=='expanded'||event.key!=='Tab')return;
    const items=Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), summary, input:not(:disabled), [tabindex="0"]')).filter(x=>x.getClientRects().length);
    const first=items[0],last=items[items.length-1];if(!first)return;
    if(event.shiftKey&&(document.activeElement===first||document.activeElement===event.currentTarget)){event.preventDefault();last.focus();}
    else if(!event.shiftKey&&(document.activeElement===last||document.activeElement===event.currentTarget)){event.preventDefault();first.focus();}
  }} className={expanded&&size==='expanded'?"fixed inset-0 z-[110] sm:inset-3 overflow-y-auto rounded-3xl border border-surface-border bg-void p-4 shadow-2xl":"relative"}>{expanded&&size==='expanded'?<button data-avatar-close type="button" onClick={toggleExpanded} className="mb-3 flex min-h-11 items-center gap-2 rounded-xl border border-violet-400/25 bg-violet-400/10 px-3 py-2 text-xs font-semibold text-violet-200"><X size={16}/> Voltar ao perfil</button>:null}

    <div className={expanded&&size==='expanded'?'sticky top-0 z-10 rounded-2xl bg-void pb-2':''}>{expanded&&size==='hidden'?<p className="rounded-xl border border-surface-border px-3 py-2 text-xs text-ink-muted">Avatar oculto. Os registros continuam disponíveis. <button type="button" className="ml-1 underline" onClick={()=>chooseSize('compact')}>Mostrar</button></p>:!ready&&expanded?<p role="status" className="py-16 text-center text-sm text-slate-400">Preparando avatar…</p>:
      expanded&&mode==='3d'?<Avatar3DBoundary onUnavailable={fallback}><Avatar3D framing={framing} onFramingChange={setFraming} skin={skin} appearance={appearance} devices={devices} onDeviceSelect={onDeviceSelect} onBrainSelect={onBrainSelect} body={body} onBodySelect={onBodySelect} compact={size!=='expanded'} controlsContainer={size==='expanded'?controlsContainer:null} onEmptyTap={toggleExpanded} attention={attention} onUnavailable={fallback}/></Avatar3DBoundary>:
      <div className="relative"><HealthBody appearance={appearance} surgeryMarkers={body?.surgeryMarkers} expression={body?.expression} onBodySelect={onBodySelect} onDeviceSelect={onDeviceSelect} skin={skin} devices={devices} expanded={expanded&&size==='expanded'} showControls={!expanded} controlsContainer={expanded&&size==='expanded'?controlsContainer:undefined}/>{expanded&&ready&&size!=='hidden'?<button type="button" aria-label={size==='expanded'?'Minimizar avatar':'Ampliar avatar'} onClick={toggleExpanded} className="absolute inset-0 h-full w-full rounded-2xl focus-visible:outline-2 focus-visible:outline-violet-300"/>:null}</div>}
    </div>
    {expanded&&ready&&size==='compact'?<button type="button" onClick={()=>chooseSize('expanded')} className="mx-auto flex min-h-11 items-center justify-center gap-1.5 px-2 text-[11px] font-semibold text-emerald-200"><Shirt size={14}/> Meu avatar · personalizar</button>:null}
    {expanded&&ready&&size==='expanded'?<details className="group mt-3 rounded-2xl border border-violet-400/25 bg-violet-400/[0.045] p-3">
      <summary className="flex min-h-12 cursor-pointer list-none items-center gap-3 rounded-xl px-2 py-1 text-xs font-semibold text-violet-200"><SlidersHorizontal size={18}/><span className="flex-1"><span className="block text-sm">Visualização e controles</span><span className="mt-1 block text-[10px] font-normal text-ink-muted">Girar, aproximar e escolher a apresentação</span></span><ChevronDown size={17} className="transition-transform group-open:rotate-180"/></summary>
      <div className="mx-auto mb-3 flex max-w-[340px] gap-2" aria-label="Visualização do avatar">
        {([['illustration','Ilustração'],['3d','Ver em 3D']] as const).map(([id,label])=><button type="button" key={id} aria-pressed={mode===id} onClick={()=>chooseMode(id)} className={`min-h-11 flex-1 rounded-xl border text-xs ${mode===id?'border-violet-300/50 bg-violet-400/15 text-violet-200':'border-slate-400/20 text-slate-300'}`}>{label}</button>)}
      </div>
      <div ref={setControlsContainer}/>
      <button type="button" onClick={()=>chooseSize('hidden')} className="mt-3 flex min-h-11 items-center gap-2 rounded-xl border border-surface-border px-3 py-2 text-xs text-ink-muted"><EyeOff size={15}/> Ocultar no perfil</button>
      {mode==='illustration'&&onDeviceSelect?<ul className="mt-3 space-y-2" aria-label="Aparelhos representados">{avatarLayout(devices).slots.map(({device,kind,side})=><li key={`${side}-${kind}`}><button type="button" className="min-h-11 w-full rounded-xl border border-surface-border p-3 text-left text-xs text-ink-primary" aria-label={`Abrir aparelho ${device.name}`} onClick={()=>onDeviceSelect(device.id)}>{device.name} ›</button></li>)}</ul>:null}
      {onBrainSelect?<button type="button" onClick={onBrainSelect} className="mt-3 flex min-h-11 w-full items-center gap-2 rounded-xl border border-violet-400/25 bg-violet-400/5 p-3 text-xs text-violet-200"><Brain size={17}/> Consultar inteligência relacionada <span className="ml-auto">›</span></button>:null}
    </details>:null}
    {expanded&&ready&&size==='expanded'?<AvatarStyleEditor value={appearance} onChange={chooseAppearance} onPreview={setFraming}/>:null}
    {expanded&&body?.surgeryMarkers.length&&onBodySelect?<details className="mt-2 rounded-xl border border-surface-border p-3"><summary className="min-h-11 cursor-pointer content-center text-xs text-sky-300">Regiões informadas · {body.surgeryMarkers.length}</summary><p className="mb-2 text-[11px] leading-relaxed text-ink-muted">Marcação esquemática das cirurgias registradas. Direita e esquerda são da pessoa representada. A coluna fica nas costas do 3D e também pode ser consultada nesta lista.</p><ul className="space-y-1">{body.surgeryMarkers.map(marker=><li key={marker.key}><button type="button" onClick={()=>onBodySelect('surgery',marker.key)} className="flex min-h-11 w-full items-center gap-2 rounded-xl border border-surface-border px-3 py-2 text-left text-xs"><span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full" style={{backgroundColor:SURGERY_MARKER_COLORS[marker.tone]}}/><span className="min-w-0 flex-1">{marker.label}<span className="mt-1 block text-[10px] text-ink-muted">{SURGERY_MARKER_LABELS[marker.tone]} · {marker.surgeryIds.length} registro(s)</span></span><span aria-hidden="true">›</span></button></li>)}</ul></details>:null}
    {expanded&&unavailable?<p role="status" className="mt-3 text-center text-xs text-slate-400">O 3D ficou indisponível neste aparelho. A ilustração continua disponível.</p>:null}
  </div>;
}
