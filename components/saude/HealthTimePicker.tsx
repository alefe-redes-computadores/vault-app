"use client";
import {useEffect, useRef, useState} from "react";
import {Clock, X} from "lucide-react";
import {useHapticFeedback} from "@/lib/haptics";

/** P0 — HH:mm próprio, sem modal de vínculos, busca ou lista de 84 alternativas. */
const VALID = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
const pair = (value:string) => VALID.test(value) ? value.split(":") : ["", ""];
export function HealthTimePicker({value,onChange,className="",disabled=false,clearable=true}:{value:string;onChange:(value:string)=>void;className?:string;disabled?:boolean;clearable?:boolean}){
  const {trigger}=useHapticFeedback();
  const [initialH,initialM]=pair(value);
  const [hour,setHour]=useState(initialH),[minute,setMinute]=useState(initialM);
  const minuteRef=useRef<HTMLInputElement>(null);
  useEffect(()=>{const [h,m]=pair(value);setHour(h);setMinute(m);},[value]);
  const commit=(h:string,m:string)=>{
    if(!/^\d{2}$/.test(h)||!/^\d{2}$/.test(m))return;
    const candidate=`${h}:${m}`;
    if(VALID.test(candidate)&&candidate!==value){onChange(candidate);trigger("vibrate");}
  };
  const edit=(field:"h"|"m",raw:string)=>{
    const digits=raw.replace(/\D/g,"").slice(0,2);
    if(field==="h"){
      setHour(digits);
      if(digits.length===2){commit(digits,minute);minuteRef.current?.focus();}
    }else{setMinute(digits);if(digits.length===2)commit(hour,digits);}
  };
  const finish=(field:"h"|"m")=>{
    const h=(field==="h"?hour.trim():hour).padStart(2,"0");
    const m=(field==="m"?minute.trim():minute).padStart(2,"0");
    if(!hour&&!minute)return;
    if(field==="h")setHour(h);else setMinute(m);
    commit(h,m);
  };
  const cls="w-[2.45rem] min-w-0 bg-transparent text-center text-sm font-semibold tabular-nums text-ink-primary outline-none placeholder:text-ink-faint focus-visible:rounded-md focus-visible:ring-2 focus-visible:ring-ice/50";
  return <fieldset disabled={disabled} aria-label="Selecionar horário em 24 horas" className={`${className} flex min-h-12 min-w-0 items-center justify-center gap-1 rounded-2xl border border-surface-border/70 bg-surface-raised px-2 py-1.5 focus-within:border-ice/50 disabled:opacity-50`}>
    <Clock size={15} className="shrink-0 text-ink-muted" aria-hidden="true"/>
    <input type="text" inputMode="numeric" pattern="[0-9]*" autoComplete="off" aria-label="Hora, de 00 a 23" placeholder="HH" maxLength={2} className={cls} value={hour} onFocus={e=>e.currentTarget.select()} onChange={e=>edit("h",e.target.value)} onBlur={()=>finish("h")}/>
    <span aria-hidden="true" className="text-sm font-semibold text-ink-muted">:</span>
    <input ref={minuteRef} type="text" inputMode="numeric" pattern="[0-9]*" autoComplete="off" aria-label="Minutos, de 00 a 59" placeholder="mm" maxLength={2} className={cls} value={minute} onFocus={e=>e.currentTarget.select()} onChange={e=>edit("m",e.target.value)} onBlur={()=>finish("m")}/>
    {clearable && value && <button type="button" aria-label="Limpar horário" onClick={()=>{setHour("");setMinute("");onChange("");trigger("vibrate");}} className="grid size-10 shrink-0 place-items-center rounded-xl text-ink-muted focus-visible:ring-2 focus-visible:ring-ice"><X size={15}/></button>}
  </fieldset>;
}
