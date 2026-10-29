"use client";
import dynamic from "next/dynamic";
import { ChevronDown, SlidersHorizontal, Brain, Shirt, X } from "lucide-react";
import { Component, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import type { HealthDevice } from "@/lib/health-profile/types";
import { avatarLayout } from "@/lib/health-profile/avatar";
import { avatarDisplayName, avatarPreferencePayload, parseAvatarFraming, parseAvatarMode, parseAvatarName, parseAvatarSize, parseAvatarStyle, type AvatarSize, type AvatarMode } from "@/lib/health-profile/avatar-preference";
import { DEFAULT_AVATAR_STYLE, normalizeAvatarStyle, type AvatarStyle } from "@/lib/health-profile/avatar-style";
import type {AvatarFraming} from "@/lib/health-profile/avatar-framing";
import { AvatarStyleEditor } from "./AvatarStyleEditor";
import type {AvatarBodyContext,AvatarBodyPart} from "@/lib/health-profile/avatar-body";
import { avatarAttentionLabel } from "@/lib/health-profile/avatar-context";
import { SURGERY_MARKER_COLORS, SURGERY_MARKER_LABELS } from "@/lib/health-profile/avatar-surgery-markers";
import { HealthBody } from "./HealthBody";
const Avatar3D = dynamic(() => import("./HealthAvatar3D"), { ssr: false, loading: () => <p role="status" className="py-16 text-center text-sm text-ink-muted">Preparando avatar 3D…</p> });
function readyForPreview(preferenceKey:string|undefined,loadedKey:string|undefined){return preferenceKey===loadedKey;}
class Avatar3DBoundary extends Component<{onUnavailable:()=>void;children:ReactNode},{failed:boolean}> {
  state={failed:false};
  static getDerivedStateFromError(){return {failed:true};}
  componentDidCatch(){this.props.onUnavailable();}
  render(){return this.state.failed?null:this.props.children;}
}
export function HealthAvatar({skin,devices,expanded=false,attention=0,preferenceKey,personName="",onDeviceSelect,onBrainSelect,body,onBodySelect}: {
  body?:AvatarBodyContext;onBodySelect?:(part:AvatarBodyPart,markerKey?:string)=>void;
  skin:string;devices:HealthDevice[];expanded?:boolean;attention?:number;preferenceKey?:string;personName?:string;
  onDeviceSelect?:(id:string)=>void;onBrainSelect?:()=>void;
}) {
  const requestedMode=useRef<AvatarMode>('3d');
  const [size,setSize]=useState<AvatarSize>('compact');
  const [framing,setFraming]=useState<AvatarFraming>('body');
  const [mode,setMode]=useState<AvatarMode>('3d');
  const [appearance,setAppearance]=useState<AvatarStyle>(DEFAULT_AVATAR_STYLE);
  const [avatarName,setAvatarName]=useState(()=>avatarDisplayName(null,personName));
  const [loadedKey,setLoadedKey]=useState<string|undefined>();
  const [controlsContainer,setControlsContainer]=useState<HTMLDivElement|null>(null);
  const [unavailable,setUnavailable]=useState(false);
  // V330: the saved 3D preference may render in the profile preview. An
  // IntersectionObserver and document visibility bound the GPU lifetime.
  // User-selected illustration is always respected.
  const previewRef=useRef<HTMLDivElement>(null);
  const [previewVisible,setPreviewVisible]=useState(false);
  const [documentVisible,setDocumentVisible]=useState(true);
  useEffect(()=>{
    if(typeof document==='undefined')return;
    const sync=()=>setDocumentVisible(!document.hidden);
    sync(); document.addEventListener('visibilitychange',sync);
    return()=>document.removeEventListener('visibilitychange',sync);
  },[]);
  useEffect(()=>{
    if(!expanded||!readyForPreview(preferenceKey,loadedKey))return;
    const node=previewRef.current;
    if(!node)return;
    if(typeof IntersectionObserver==='undefined'){setPreviewVisible(true);return;}
    const observer=new IntersectionObserver(entries=>{
      setPreviewVisible(entries.some(entry=>entry.isIntersecting));
    },{rootMargin:'80px 0px 80px 0px',threshold:0});
    observer.observe(node);
    return()=>{observer.disconnect();setPreviewVisible(false);};
  },[expanded,preferenceKey,loadedKey]);
  useEffect(()=>{
    let next:AvatarMode='3d',nextSize:AvatarSize='compact',nextAppearance:AvatarStyle=DEFAULT_AVATAR_STYLE,nextName=avatarDisplayName(null,personName),nextFraming:AvatarFraming='body';
    try{if(preferenceKey){const stored=localStorage.getItem(preferenceKey);next=parseAvatarMode(stored);nextSize=parseAvatarSize(stored);nextAppearance=parseAvatarStyle(stored);nextName=parseAvatarName(stored,personName);nextFraming=parseAvatarFraming(stored);}}catch{}
    requestedMode.current=next;setFraming('body');setMode(next);setSize('compact');setAppearance(nextAppearance);setAvatarName(nextName);setUnavailable(false);setLoadedKey(preferenceKey);
  },[preferenceKey,personName]);
  const fallback=useCallback(()=>{setUnavailable(true);setMode('illustration');},[]);
  const chooseMode=(next:AvatarMode)=>{
    requestedMode.current=next;setUnavailable(false);setMode(next);
    try{if(preferenceKey)localStorage.setItem(preferenceKey,avatarPreferencePayload(next,size,appearance,avatarName,framing));}catch{}
  };
  const chooseSize=(next:AvatarSize)=>{
    // V202: editor framing never leaks into the personal-health card preview.
    const effectiveFrame:AvatarFraming=next==='expanded'?framing:'body';
    if(next!=='expanded')setFraming('body');
    setSize(next);
    try{if(preferenceKey)localStorage.setItem(preferenceKey,avatarPreferencePayload(requestedMode.current,next,appearance,avatarName,effectiveFrame));}catch{}
  };
  const chooseAppearance=(next:AvatarStyle)=>{
    const normalized=normalizeAvatarStyle(next);
    setAppearance(normalized);
    try{if(preferenceKey)localStorage.setItem(preferenceKey,avatarPreferencePayload(requestedMode.current,size,normalized,avatarName,framing));}catch{}
  };
  const chooseName=(next:string)=>{const editable=next.replace(/[\u0000-\u001f\u007f]/g,"").slice(0,32);const normalized=avatarDisplayName(editable,personName);setAvatarName(editable);try{if(preferenceKey)localStorage.setItem(preferenceKey,avatarPreferencePayload(requestedMode.current,size,appearance,normalized,framing));}catch{}};
  const chooseFraming=useCallback((next:AvatarFraming)=>{
    // Only the open inspection view may change framing.
    if(size!=='expanded')return;
    setFraming(next);
    try{if(preferenceKey)localStorage.setItem(preferenceKey,avatarPreferencePayload(requestedMode.current,size,appearance,avatarName,next));}catch{}
  },[preferenceKey,size,appearance,avatarName]);
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
  // V330: compact WebGL preview is opt-in via the person's 3D preference,
  // mounted only in viewport / foreground. Full-screen inspection works without
  // the compact observer. No continuous animation loop is introduced here.
  const shouldMount3D=ready&&expanded&&mode==='3d'&&documentVisible&&!unavailable&&
    (size==='expanded'||previewVisible);
  const toggleExpanded=useCallback(()=>chooseSize(size==='expanded'?'compact':'expanded'),[size,preferenceKey,appearance,avatarName,framing]);
  return <div ref={expandedRef} tabIndex={expanded&&size==='expanded'?-1:undefined} role={expanded&&size==='expanded'?'dialog':undefined} aria-modal={expanded&&size==='expanded'?true:undefined} aria-label={expanded&&size==='expanded'?`Avatar ${avatarDisplayName(avatarName,personName)}`:undefined} onKeyDown={event=>{
    if(size!=='expanded'||event.key!=='Tab')return;
    const items=Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), summary, input:not(:disabled), [tabindex="0"]')).filter(x=>x.getClientRects().length);
    const first=items[0],last=items[items.length-1];if(!first)return;
    if(event.shiftKey&&(document.activeElement===first||document.activeElement===event.currentTarget)){event.preventDefault();last.focus();}
    else if(!event.shiftKey&&(document.activeElement===last||document.activeElement===event.currentTarget)){event.preventDefault();first.focus();}
  }} className={expanded&&size==='expanded'?"fixed inset-0 z-[110] overflow-y-auto overscroll-contain border border-surface-border bg-void px-3 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(0.75rem,env(safe-area-inset-top))] shadow-2xl sm:inset-3 sm:rounded-2xl sm:p-4":"relative"}>{expanded&&size==='expanded'?<div className="sticky top-0 z-30 mx-auto mb-2 flex max-w-[520px] items-center gap-2 rounded-2xl border border-surface-border bg-void/90 p-1.5 shadow-xl backdrop-blur-xl"><button data-avatar-close type="button" onClick={toggleExpanded} className="flex min-h-11 items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-ink-primary"><X size={17}/> Voltar</button><div className="min-w-0 flex-1 border-l border-surface-border pl-3"><p className="truncate text-xs font-semibold text-ink-primary">{avatarDisplayName(avatarName,personName)}</p><p className="truncate text-[9px] text-ink-muted">Sua representação pessoal e de saúde</p></div></div>:null}

    <div ref={previewRef} className={expanded&&size==='expanded'?'mx-auto max-w-[520px] overflow-hidden rounded-2xl border border-emerald-300/10 bg-[radial-gradient(circle_at_50%_15%,rgba(110,231,183,.08),transparent_48%),linear-gradient(180deg,rgba(110,231,183,.025),transparent)] p-2':''}>{!ready&&expanded?<p role="status" className="py-16 text-center text-sm text-ink-muted">Preparando avatar…</p>:
      shouldMount3D?<Avatar3DBoundary onUnavailable={fallback}><Avatar3D framing={framing} onFramingChange={chooseFraming} skin={skin} appearance={appearance} devices={devices} onDeviceSelect={onDeviceSelect} onBrainSelect={onBrainSelect} body={body} onBodySelect={onBodySelect} controlsContainer={controlsContainer} onEmptyTap={toggleExpanded} attention={attention} compact={size!=='expanded'} onUnavailable={fallback}/></Avatar3DBoundary>:
      <div className="relative"><HealthBody appearance={appearance} surgeryMarkers={body?.surgeryMarkers} expression={body?.expression} onBodySelect={onBodySelect} onDeviceSelect={onDeviceSelect} skin={skin} devices={devices} expanded={expanded&&size==='expanded'} showControls={!expanded} controlsContainer={expanded&&size==='expanded'?controlsContainer:undefined}/>{expanded&&ready&&size!=='hidden'?<button type="button" aria-label={size==='expanded'?'Minimizar avatar':'Ampliar avatar'} onClick={toggleExpanded} className="absolute inset-0 h-full w-full rounded-2xl focus-visible:outline-2 focus-visible:outline-violet-300"/>:null}</div>}
    </div>
    {expanded&&ready&&attention>0&&onBrainSelect?<button type="button" onClick={onBrainSelect} className="mx-auto mt-2 flex min-h-11 w-full max-w-[520px] items-center gap-2 rounded-xl border border-violet-400/20 bg-violet-400/[0.04] px-3 text-left text-xs text-violet-200"><Brain size={16}/><span className="min-w-0 flex-1"><strong className="block">{avatarAttentionLabel(attention)}</strong><span className="mt-0.5 block text-[9px] font-normal text-ink-muted">Prioridade baseada nos registros · não é diagnóstico</span></span><span aria-hidden="true">›</span></button>:null}
    {/* V330_FENIX_VISIBLE_CONTROLS: compact controls are no longer hidden in the expanded editor. */}
    {expanded&&ready&&size==='compact'?<div className="mx-auto mt-2 grid w-full max-w-[520px] grid-cols-[1fr_1fr_auto] gap-1.5" aria-label="Modo de visualização da Fênix">
      <button type="button" aria-pressed={mode==='3d'} onClick={()=>chooseMode('3d')} className={`min-h-11 rounded-xl border px-1.5 text-[10px] font-semibold ${mode==='3d'?'border-emerald-300/40 bg-emerald-300/10 text-emerald-200':'border-surface-border text-ink-muted'}`}>Fênix 3D</button>
      <button type="button" aria-pressed={mode==='illustration'} onClick={()=>chooseMode('illustration')} className={`min-h-11 rounded-xl border px-1.5 text-[10px] font-semibold ${mode==='illustration'?'border-violet-300/40 bg-violet-300/10 text-violet-200':'border-surface-border text-ink-muted'}`}>Ilustração</button>
      <button type="button" onClick={()=>chooseSize('expanded')} aria-label={`Ampliar avatar de ${avatarDisplayName(avatarName,personName)}`} className="min-h-11 rounded-xl border border-emerald-300/25 bg-emerald-300/[.055] px-2.5 text-[10px] font-semibold text-emerald-200"><Shirt size={14} className="inline"/> Ampliar{mode==='3d'?" em 3D":""}</button>
    </div>:null}
    {expanded&&ready&&size==='compact'&&unavailable?<p role="status" className="mt-1 text-center text-[10px] text-amber-200">WebGL não iniciou neste aparelho. A ilustração continua disponível; toque em Fênix 3D para tentar novamente.</p>:null}
    {expanded&&ready&&size==='expanded'?<details className="group mx-auto mt-3 max-w-[520px] rounded-xl border border-violet-400/20 bg-violet-400/[0.035] p-2">
      <summary className="flex min-h-12 cursor-pointer list-none items-center gap-3 rounded-xl px-2 py-1 text-xs font-semibold text-violet-200"><SlidersHorizontal size={18}/><span className="flex-1"><span className="block text-sm">Ajustar visualização</span><span className="mt-1 block text-[10px] font-normal text-ink-muted">Vista, zoom e modo de apresentação</span></span><ChevronDown size={17} className="transition-transform group-open:rotate-180"/></summary>
      <div className="mx-auto mb-3 flex max-w-[340px] gap-2" aria-label="Visualização do avatar">
        {([['illustration','Ilustração'],['3d','Ver em 3D']] as const).map(([id,label])=><button type="button" key={id} aria-pressed={mode===id} onClick={()=>chooseMode(id)} className={`min-h-11 flex-1 rounded-xl border text-xs ${mode===id?'border-violet-300/50 bg-violet-400/15 text-violet-200':'border-surface-border text-ink-secondary'}`}>{label}</button>)}
      </div>
      <div ref={setControlsContainer}/>
      {mode==='illustration'&&onDeviceSelect?<ul className="mt-3 space-y-2" aria-label="Aparelhos representados">{avatarLayout(devices).slots.map(({device,kind,side})=><li key={`${side}-${kind}`}><button type="button" className="min-h-11 w-full rounded-xl border border-surface-border p-3 text-left text-xs text-ink-primary" aria-label={`Abrir aparelho ${device.name}`} onClick={()=>onDeviceSelect(device.id)}>{device.name} ›</button></li>)}</ul>:null}
    </details>:null}
    {expanded&&ready&&size==='expanded'?<AvatarStyleEditor value={appearance} onChange={chooseAppearance} onPreview={setFraming} name={avatarName} onNameChange={chooseName}/>:null}
    {expanded&&body?.surgeryMarkers.length&&onBodySelect?<details className="mt-2 rounded-xl border border-surface-border p-3"><summary className="min-h-11 cursor-pointer content-center text-xs text-rose-300">Regiões informadas · {body.surgeryMarkers.length}</summary><p className="mb-2 text-[11px] leading-relaxed text-ink-muted">Marcação esquemática das cirurgias registradas. Direita e esquerda são da pessoa representada. A coluna fica nas costas do 3D e também pode ser consultada nesta lista.</p><ul className="space-y-1">{body.surgeryMarkers.map(marker=><li key={marker.key}><button type="button" onClick={()=>onBodySelect('surgery',marker.key)} className="flex min-h-11 w-full items-center gap-2 rounded-xl border border-surface-border px-3 py-2 text-left text-xs"><span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full" style={{backgroundColor:SURGERY_MARKER_COLORS[marker.tone]}}/><span className="min-w-0 flex-1">{marker.label}<span className="mt-1 block text-[10px] text-ink-muted">{SURGERY_MARKER_LABELS[marker.tone]} · {marker.surgeryIds.length} registro(s)</span></span><span aria-hidden="true">›</span></button></li>)}</ul></details>:null}
    {expanded&&unavailable?<p role="status" className="mt-3 text-center text-xs text-ink-muted">O 3D ficou indisponível neste aparelho. A ilustração continua disponível.</p>:null}
  </div>;
}
