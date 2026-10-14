"use client";
import dynamic from "next/dynamic";
import { Component, useCallback, useEffect, useState, type ReactNode } from "react";
import type { HealthDevice } from "@/lib/health-profile/types";
import { avatarLayout } from "@/lib/health-profile/avatar";
import { parseAvatarMode, type AvatarMode } from "@/lib/health-profile/avatar-preference";
import { HealthBody } from "./HealthBody";
const Avatar3D = dynamic(() => import("./HealthAvatar3D"), { ssr: false, loading: () => <p role="status" className="py-16 text-center text-sm text-slate-400">Preparando avatar 3D…</p> });
class Avatar3DBoundary extends Component<{onUnavailable:()=>void;children:ReactNode},{failed:boolean}> {
  state={failed:false};
  static getDerivedStateFromError(){return {failed:true};}
  componentDidCatch(){this.props.onUnavailable();}
  render(){return this.state.failed?null:this.props.children;}
}
export function HealthAvatar({skin,devices,expanded=false,attention=0,preferenceKey,onDeviceSelect,onBrainSelect}: {
  skin:string;devices:HealthDevice[];expanded?:boolean;attention?:number;preferenceKey?:string;
  onDeviceSelect?:(id:string)=>void;onBrainSelect?:()=>void;
}) {
  const [mode,setMode]=useState<AvatarMode>('3d');
  const [loadedKey,setLoadedKey]=useState<string|undefined>();
  const [controlsContainer,setControlsContainer]=useState<HTMLDivElement|null>(null);
  const [unavailable,setUnavailable]=useState(false);
  useEffect(()=>{
    let next:AvatarMode='3d';
    try{if(preferenceKey)next=parseAvatarMode(localStorage.getItem(preferenceKey));}catch{}
    setMode(next);setUnavailable(false);setLoadedKey(preferenceKey);
  },[preferenceKey]);
  const fallback=useCallback(()=>{setUnavailable(true);setMode('illustration');},[]);
  const chooseMode=(next:AvatarMode)=>{
    setUnavailable(false);setMode(next);
    try{if(preferenceKey)localStorage.setItem(preferenceKey,JSON.stringify({version:1,mode:next}));}catch{}
  };
  const ready=loadedKey===preferenceKey;
  return <div>
    {!ready&&expanded?<p role="status" className="py-16 text-center text-sm text-slate-400">Preparando avatar…</p>:
      expanded&&mode==='3d'?<Avatar3DBoundary onUnavailable={fallback}><Avatar3D skin={skin} devices={devices} onDeviceSelect={onDeviceSelect} onBrainSelect={onBrainSelect} controlsContainer={controlsContainer} attention={attention} onUnavailable={fallback}/></Avatar3DBoundary>:
      <HealthBody skin={skin} devices={devices} expanded={expanded} showControls={!expanded} controlsContainer={expanded?controlsContainer:undefined}/>}
    {expanded&&ready?<details className="mt-3 rounded-xl border border-slate-400/20 p-3">
      <summary className="min-h-11 cursor-pointer content-center text-xs text-slate-300">Controles do avatar</summary>
      <div className="mx-auto mb-3 flex max-w-[340px] gap-2" aria-label="Visualização do avatar">
        {([['illustration','Ilustração'],['3d','Ver em 3D']] as const).map(([id,label])=><button type="button" key={id} aria-pressed={mode===id} onClick={()=>chooseMode(id)} className={`min-h-11 flex-1 rounded-xl border text-xs ${mode===id?'border-violet-300/50 bg-violet-400/15 text-violet-200':'border-slate-400/20 text-slate-300'}`}>{label}</button>)}
      </div>
      <div ref={setControlsContainer}/>
      {mode==='illustration'&&onDeviceSelect?<ul className="mt-3 space-y-2" aria-label="Aparelhos representados">{avatarLayout(devices).slots.map(({device,kind,side})=><li key={`${side}-${kind}`}><button type="button" className="min-h-11 w-full rounded-xl border border-surface-border p-3 text-left text-xs text-ink-primary" aria-label={`Abrir aparelho ${device.name}`} onClick={()=>onDeviceSelect(device.id)}>{device.name} ›</button></li>)}</ul>:null}
      {onBrainSelect?<button type="button" onClick={onBrainSelect} className="mt-3 min-h-11 w-full rounded-xl border border-violet-400/25 bg-violet-400/5 p-3 text-xs text-violet-300">Abrir contexto do Brain ›</button>:null}
    </details>:null}
    {expanded&&unavailable?<p role="status" className="mt-3 text-center text-xs text-slate-400">O 3D ficou indisponível neste aparelho. A ilustração continua disponível.</p>:null}
  </div>;
}
