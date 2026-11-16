"use client";

import { memo, useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Undo2, X } from "lucide-react";

type Props = {
  label: string; date: string; isHoje: boolean; isPassado: boolean; isFuturo: boolean;
  description: string; onPrevious: () => void; onNext: () => void;
  onSelectDate: (date: string) => void; onToday: () => void;
};

const pad = (n:number) => String(n).padStart(2,"0");
const iso = (d:Date) => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const parse = (str:string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(str)) return null;
  const [year,month,day]=str.split("-").map(Number);
  const d=new Date(year,month-1,day,12);
  return d.getFullYear()===year&&d.getMonth()===month-1&&d.getDate()===day?d:null;
};
const shift = (str:string,days:number) => {
  const d=parse(str);if(!d)return str;
  d.setDate(d.getDate()+days);return iso(d);
};
const displayMonth = (d:Date) => new Intl.DateTimeFormat("pt-BR",{month:"long",year:"numeric"}).format(d);
const weekLabels = ["Seg","Ter","Qua","Qui","Sex","Sáb","Dom"];

/** R4: calendário próprio, datas locais sem UTC e sem controle nativo do Android. */
export const TodayDateNavigation = memo(function TodayDateNavigation({
  label,date,isHoje,isPassado,isFuturo,description,onPrevious,onNext,onSelectDate,onToday,
}:Props){
  const [open,setOpen]=useState(false);
  const [viewMonth,setViewMonth]=useState(()=>{const d=parse(date)||new Date();return new Date(d.getFullYear(),d.getMonth(),1,12);});
  const triggerRef=useRef<HTMLButtonElement>(null);
  const closeRef=useRef<HTMLButtonElement>(null);
  const chosen=parse(date);
  const temporalLabel=isHoje?"Hoje":isPassado?"Histórico":isFuturo?"Planejado":"Data";
  useEffect(()=>{if(!open)return;
    const d=parse(date);if(d)setViewMonth(new Date(d.getFullYear(),d.getMonth(),1,12));
    const focus=window.requestAnimationFrame(()=>closeRef.current?.focus());
    const close=(event:KeyboardEvent)=>{if(event.key==="Escape"){event.preventDefault();setOpen(false);triggerRef.current?.focus();}};
    document.addEventListener("keydown",close);
    return()=>{window.cancelAnimationFrame(focus);document.removeEventListener("keydown",close);};
  },[open,date]);
  const days=useMemo(()=>{
    const offset=(viewMonth.getDay()+6)%7;
    const first=new Date(viewMonth.getFullYear(),viewMonth.getMonth(),1-offset,12);
    return Array.from({length:42},(_,i)=>{const d=new Date(first.getFullYear(),first.getMonth(),first.getDate()+i,12);return {iso:iso(d),day:d.getDate(),inMonth:d.getMonth()===viewMonth.getMonth()};});
  },[viewMonth]);
  const go=(value:string)=>{setOpen(false);onSelectDate(value);triggerRef.current?.focus();};
  const goToday=()=>{setOpen(false);onToday();triggerRef.current?.focus();};
  return <>
    <nav className="mt-2 flex min-w-0 items-center gap-2" aria-label="Navegar pela linha do tempo">
      <button type="button" onClick={onPrevious} aria-label="Dia anterior" className="grid size-11 shrink-0 place-items-center rounded-xl border border-surface-border/50 bg-surface-raised/60 text-ink-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-ice"><ChevronLeft size={18}/></button>
      <button ref={triggerRef} type="button" onClick={()=>setOpen(true)} aria-label={label} aria-haspopup="dialog" aria-expanded={open} className="flex min-h-11 min-w-0 flex-1 items-center justify-center gap-2 rounded-xl border border-surface-border/50 bg-surface-raised/55 px-2 text-ink-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-ice">
        <CalendarDays size={16} className="shrink-0 text-ice" aria-hidden="true"/><span className="min-w-0 truncate text-xs font-semibold" aria-current={isHoje?"date":undefined} title={description}>{temporalLabel} · {description}</span>
      </button>
      <button type="button" onClick={onNext} aria-label="Próximo dia" className="grid size-11 shrink-0 place-items-center rounded-xl border border-surface-border/50 bg-surface-raised/60 text-ink-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-ice"><ChevronRight size={18}/></button>
      {!isHoje&&<button type="button" onClick={onToday} aria-label="Voltar para hoje" title="Voltar para hoje" className="grid size-11 shrink-0 place-items-center rounded-xl border border-ice/35 bg-ice/10 text-ice"><Undo2 size={17}/></button>}
    </nav>
    <div className="mt-2 grid grid-cols-7 gap-1" aria-label="Semana da data selecionada">
      {Array.from({length:7},(_,i)=>{const value=shift(date,i-3),d=parse(value),selected=i===3;return <button type="button" key={value} onClick={()=>go(value)} aria-pressed={selected} aria-label={d?new Intl.DateTimeFormat("pt-BR",{dateStyle:"full"}).format(d):value} className={`flex min-h-11 min-w-0 flex-col items-center justify-center gap-0.5 rounded-xl border px-0.5 text-center ${selected?"border-emerald-300/50 bg-emerald-300/[.12] text-emerald-200":"border-surface-border/40 bg-surface/45 text-ink-muted"}`}><span className="text-[9px] font-semibold">{d?weekLabels[(d.getDay()+6)%7]:"—"}</span><span className="text-xs font-bold tabular-nums">{d?.getDate()??"—"}</span></button>})}
    </div>
    {open&&<div className="fixed inset-0 z-[95] flex items-end justify-center bg-black/75 px-3 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 backdrop-blur-sm min-[520px]:items-center" role="presentation" onMouseDown={event=>{if(event.target===event.currentTarget){setOpen(false);triggerRef.current?.focus();}}}>
      <section role="dialog" aria-modal="true" aria-label="Calendário da linha do tempo" className="max-h-[min(85dvh,690px)] w-full max-w-sm overflow-y-auto overscroll-contain rounded-[24px] border border-ice/25 bg-surface-raised p-4 shadow-2xl">
        <header className="flex items-center gap-2"><span className="min-w-0 flex-1 text-sm font-bold capitalize text-ink-primary">{displayMonth(viewMonth)}</span><button type="button" aria-label="Mês anterior" onClick={()=>setViewMonth(d=>new Date(d.getFullYear(),d.getMonth()-1,1,12))} className="grid size-11 place-items-center rounded-xl border border-surface-border"><ChevronLeft size={17}/></button><button type="button" aria-label="Próximo mês" onClick={()=>setViewMonth(d=>new Date(d.getFullYear(),d.getMonth()+1,1,12))} className="grid size-11 place-items-center rounded-xl border border-surface-border"><ChevronRight size={17}/></button><button ref={closeRef} type="button" aria-label="Fechar calendário" onClick={()=>{setOpen(false);triggerRef.current?.focus();}} className="grid size-11 place-items-center rounded-xl border border-surface-border"><X size={17}/></button></header>
        <div className="mt-3 grid grid-cols-7 gap-1" aria-label="Dias da semana">{weekLabels.map(w=><span className="py-2 text-center text-[10px] font-bold text-ink-muted" key={w}>{w}</span>)}</div>
        <div className="grid grid-cols-7 gap-1">{days.map(item=><button key={item.iso} type="button" onClick={()=>go(item.iso)} aria-pressed={item.iso===date} className={`grid min-h-11 place-items-center rounded-xl text-xs font-semibold ${item.iso===date?"border border-emerald-300/50 bg-emerald-300/[.13] text-emerald-100":item.inMonth?"text-ink-primary hover:bg-surface":"text-ink-faint"}`}>{item.day}</button>)}</div>
        <button type="button" onClick={goToday} className="mt-3 min-h-12 w-full rounded-xl border border-ice/30 bg-ice/[.07] text-xs font-semibold text-ice">Voltar para Hoje</button>
        <p className="mt-2 text-[11px] leading-relaxed text-ink-muted">A seleção altera somente a data consultada. Nenhuma dose é confirmada automaticamente.</p>
      </section>
    </div>}
  </>;
});
