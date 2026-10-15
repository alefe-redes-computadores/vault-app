"use client";
import dynamic from "next/dynamic";
import { Component, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import type { HealthDevice } from "@/lib/health-profile/types";
import { avatarLayout } from "@/lib/health-profile/avatar";
import { avatarPreferencePayload, parseAvatarMode, parseAvatarSize, parseAvatarStyle, type AvatarSize, type AvatarMode } from "@/lib/health-profile/avatar-preference";
import { DEFAULT_AVATAR_STYLE, normalizeAvatarStyle, type AvatarStyle } from "@/lib/health-profile/avatar-style";
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
  const [mode,setMode]=useState<AvatarMode>('3d');
  const [appearance,setAppearance]=useState<AvatarStyle>(DEFAULT_AVATAR_STYLE);
  const [loadedKey,setLoadedKey]=useState<string|undefined>();
  const [controlsContainer,setControlsContainer]=useState<HTMLDivElement|null>(null);
  const [unavailable,setUnavailable]=useState(false);
  useEffect(()=>{
    let next:AvatarMode='3d',nextSize:AvatarSize='compact',nextAppearance:AvatarStyle=DEFAULT_AVATAR_STYLE;
    try{if(preferenceKey){const stored=localStorage.getItem(preferenceKey);next=parseAvatarMode(stored);nextSize=parseAvatarSize(stored);nextAppearance=parseAvatarStyle(stored);}}catch{}
    requestedMode.current=next;setMode(next);setSize(nextSize);setAppearance(nextAppearance);setUnavailable(false);setLoadedKey(preferenceKey);
  },[preferenceKey]);
  const fallback=useCallback(()=>{setUnavailable(true);setMode('illustration');},[]);
  const chooseMode=(next:AvatarMode)=>{
    requestedMode.current=next;setUnavailable(false);setMode(next);
    try{if(preferenceKey)localStorage.setItem(preferenceKey,avatarPreferencePayload(next,size,appearance));}catch{}
  };
  const chooseSize=(next:AvatarSize)=>{setSize(next);try{if(preferenceKey)localStorage.setItem(preferenceKey,avatarPreferencePayload(requestedMode.current,next,appearance));}catch{}};
  const chooseAppearance=(next:AvatarStyle)=>{
    const normalized=normalizeAvatarStyle(next);
    setAppearance(normalized);
    try{if(preferenceKey)localStorage.setItem(preferenceKey,avatarPreferencePayload(requestedMode.current,size,normalized));}catch{}
  };
  const ready=loadedKey===preferenceKey;
  const toggleExpanded=useCallback(()=>chooseSize(size==='expanded'?'compact':'expanded'),[size,preferenceKey,appearance,mode]);
  return <div className={expanded&&size==='expanded'?"fixed inset-3 z-[110] overflow-y-auto rounded-3xl border border-violet-400/30 bg-void p-4 shadow-2xl":"relative"}>{expanded&&size==='expanded'?<button type="button" onClick={toggleExpanded} className="mb-2 min-h-11 rounded-xl border border-surface-border px-3 py-2 text-xs text-violet-300">Voltar ao perfil</button>:null}

    {expanded&&size==='hidden'?<p className="rounded-xl border border-surface-border px-3 py-2 text-xs text-ink-muted">Avatar oculto. Os registros continuam disponíveis. <button type="button" className="ml-1 underline" onClick={()=>chooseSize('compact')}>Mostrar</button></p>:!ready&&expanded?<p role="status" className="py-16 text-center text-sm text-slate-400">Preparando avatar…</p>:
      expanded&&mode==='3d'?<Avatar3DBoundary onUnavailable={fallback}><Avatar3D skin={skin} appearance={appearance} devices={devices} onDeviceSelect={onDeviceSelect} onBrainSelect={onBrainSelect} body={body} onBodySelect={onBodySelect} compact={size!=='expanded'} controlsContainer={size==='expanded'?controlsContainer:null} onEmptyTap={toggleExpanded} attention={attention} onUnavailable={fallback}/></Avatar3DBoundary>:
      <div className="relative"><HealthBody appearance={appearance} surgeryMarkers={body?.surgeryMarkers} expression={body?.expression} onBodySelect={onBodySelect} onDeviceSelect={onDeviceSelect} skin={skin} devices={devices} expanded={expanded&&size==='expanded'} showControls={!expanded} controlsContainer={expanded&&size==='expanded'?controlsContainer:undefined}/>{expanded&&ready&&size!=='hidden'?<button type="button" aria-label={size==='expanded'?'Minimizar avatar':'Ampliar avatar'} onClick={toggleExpanded} className="absolute inset-0 h-full w-full rounded-2xl focus-visible:outline-2 focus-visible:outline-violet-300"/>:null}</div>}
    {expanded&&ready&&size==='expanded'?<details className="mt-3 rounded-xl border border-slate-400/20 p-3">
      <summary className="min-h-11 cursor-pointer content-center text-xs text-slate-300">Controles do avatar</summary>
      <div className="mx-auto mb-3 flex max-w-[340px] gap-2" aria-label="Visualização do avatar">
        {([['illustration','Ilustração'],['3d','Ver em 3D']] as const).map(([id,label])=><button type="button" key={id} aria-pressed={mode===id} onClick={()=>chooseMode(id)} className={`min-h-11 flex-1 rounded-xl border text-xs ${mode===id?'border-violet-300/50 bg-violet-400/15 text-violet-200':'border-slate-400/20 text-slate-300'}`}>{label}</button>)}
      </div>
      <div ref={setControlsContainer}/>
      <button type="button" onClick={()=>chooseSize('hidden')} className="mt-2 min-h-11 rounded-xl border border-surface-border px-3 py-2 text-xs text-ink-muted">Ocultar avatar nas preferências</button>
      {mode==='illustration'&&onDeviceSelect?<ul className="mt-3 space-y-2" aria-label="Aparelhos representados">{avatarLayout(devices).slots.map(({device,kind,side})=><li key={`${side}-${kind}`}><button type="button" className="min-h-11 w-full rounded-xl border border-surface-border p-3 text-left text-xs text-ink-primary" aria-label={`Abrir aparelho ${device.name}`} onClick={()=>onDeviceSelect(device.id)}>{device.name} ›</button></li>)}</ul>:null}
      {onBrainSelect?<button type="button" onClick={onBrainSelect} className="mt-3 min-h-11 w-full rounded-xl border border-violet-400/25 bg-violet-400/5 p-3 text-xs text-violet-300">Abrir contexto do Brain ›</button>:null}
    </details>:null}
    {expanded&&ready&&size==='expanded'?<AvatarStyleEditor value={appearance} onChange={chooseAppearance}/>:null}
    {expanded&&body?.surgeryMarkers.length&&onBodySelect?<details className="mt-2 rounded-xl border border-surface-border p-3"><summary className="min-h-11 cursor-pointer content-center text-xs text-sky-300">Regiões informadas · {body.surgeryMarkers.length}</summary><p className="mb-2 text-[11px] leading-relaxed text-ink-muted">Marcação esquemática das cirurgias registradas. Direita e esquerda são da pessoa representada. A coluna fica nas costas do 3D e também pode ser consultada nesta lista.</p><ul className="space-y-1">{body.surgeryMarkers.map(marker=><li key={marker.key}><button type="button" onClick={()=>onBodySelect('surgery',marker.key)} className="flex min-h-11 w-full items-center gap-2 rounded-xl border border-surface-border px-3 py-2 text-left text-xs"><span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full" style={{backgroundColor:SURGERY_MARKER_COLORS[marker.tone]}}/><span className="min-w-0 flex-1">{marker.label}<span className="mt-1 block text-[10px] text-ink-muted">{SURGERY_MARKER_LABELS[marker.tone]} · {marker.surgeryIds.length} registro(s)</span></span><span aria-hidden="true">›</span></button></li>)}</ul></details>:null}
    {expanded&&unavailable?<p role="status" className="mt-3 text-center text-xs text-slate-400">O 3D ficou indisponível neste aparelho. A ilustração continua disponível.</p>:null}
  </div>;
}
