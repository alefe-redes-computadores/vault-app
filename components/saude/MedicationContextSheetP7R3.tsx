"use client";
import { useEffect, useRef } from "react";
import { Info, X } from "lucide-react";
export type MedicationContextP7R3 = { title: string; description: string; details: readonly string[] };
/** Read-only context; no I/O, clinical inference or navigation. */
export function MedicationContextSheetP7R3({value,onClose}:{value:MedicationContextP7R3|null;onClose:()=>void}){
  const closeRef=useRef<HTMLButtonElement>(null);
  useEffect(()=>{
    if(!value)return;
    closeRef.current?.focus();
    const handler=(event:KeyboardEvent)=>{if(event.key==="Escape"){event.preventDefault();onClose();}};
    document.addEventListener("keydown",handler);
    return()=>document.removeEventListener("keydown",handler);
  },[value,onClose]);
  if(!value)return null;
  return <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/70 px-3 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 backdrop-blur-sm min-[500px]:items-center"
    onMouseDown={e=>{if(e.target===e.currentTarget)onClose();}} role="presentation">
    <section role="dialog" aria-modal="true" aria-labelledby="vault-med-context-title" className="max-h-[min(82dvh,680px)] w-full max-w-[410px] overflow-y-auto overscroll-contain rounded-[24px] border border-surface-border/70 bg-surface-raised p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl">
      <header className="flex items-start gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-ice/10 text-ice"><Info size={20}/></span>
        <div className="min-w-0 flex-1"><h2 id="vault-med-context-title" className="font-display text-lg font-semibold text-ink-primary">{value.title}</h2><p className="mt-1 text-xs leading-relaxed text-ink-muted">{value.description}</p></div>
        <button ref={closeRef} onClick={onClose} type="button" aria-label="Fechar informações relacionadas" className="grid size-11 shrink-0 place-items-center rounded-xl border border-surface-border text-ink-secondary"><X size={17}/></button>
      </header>
      <ul className="mt-4 space-y-2">{value.details.map((line,i)=><li key={`${i}-${line}`} className="rounded-xl border border-surface-border/50 bg-surface/45 px-3 py-2.5 text-xs leading-relaxed text-ink-secondary">{line}</li>)}</ul>
      <p className="mt-3 text-[11px] leading-relaxed text-ink-muted">Informação do cadastro ou dos registros vinculados. Não confirma recebimento, tomada nem prescrição.</p>
    </section>
  </div>;
}
