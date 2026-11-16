"use client";
import { useEffect, useRef, type ReactNode } from "react";
import { X, Layers3 } from "lucide-react";

export type MedicationActionsR4 = { title: string; controls: readonly ReactNode[] };
/** Reuses existing action buttons and handlers. Never mutates dose/stock on opening. */
export function MedicationActionsSheetR4({value,onClose}:{value:MedicationActionsR4|null;onClose:()=>void}){
  const closeRef=useRef<HTMLButtonElement>(null);
  useEffect(()=>{if(!value)return;
    const frame=requestAnimationFrame(()=>closeRef.current?.focus());
    const escape=(event:KeyboardEvent)=>{if(event.key==="Escape"){event.preventDefault();onClose();}};
    document.addEventListener("keydown",escape);
    return()=>{cancelAnimationFrame(frame);document.removeEventListener("keydown",escape);};
  },[value,onClose]);
  if(!value)return null;
  return <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/70 px-3 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-sm min-[520px]:items-center" role="presentation" onMouseDown={event=>{if(event.target===event.currentTarget)onClose();}}>
    <section role="dialog" aria-modal="true" aria-label={`Ações disponíveis de ${value.title}`} className="max-h-[min(72dvh,520px)] w-full max-w-md overflow-y-auto overscroll-contain rounded-[22px] border border-surface-border/65 bg-surface-raised p-4 shadow-2xl">
      <header className="mb-3 flex items-center gap-2"><span className="grid size-10 place-items-center rounded-xl bg-ice/10 text-ice"><Layers3 size={19}/></span><div className="min-w-0 flex-1"><strong className="block truncate text-sm text-ink-primary">{value.title}</strong><span className="text-[11px] text-ink-muted">Ações disponíveis · escolha explicitamente</span></div><button ref={closeRef} type="button" onClick={onClose} aria-label="Fechar ações" className="grid size-11 place-items-center rounded-xl border border-surface-border"><X size={17}/></button></header>
      <div onClickCapture={()=>{window.setTimeout(onClose,0);}} className="grid grid-cols-2 gap-2 [&_button]:min-h-12 [&_button]:w-full [&_button]:max-w-none [&_button]:whitespace-normal [&_button]:text-xs">{value.controls.map((control,index)=><div key={index} className="min-w-0">{control}</div>)}</div>
      <p className="mt-3 text-[11px] leading-relaxed text-ink-muted">Abrir esta lista não confirma tomadas, recebimentos nem alterações clínicas.</p>
    </section>
  </div>;
}
