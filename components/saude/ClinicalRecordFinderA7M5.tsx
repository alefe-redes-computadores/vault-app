'use client';
import {useEffect,useId,useMemo,useState} from 'react';
import Link from 'next/link';
import {ChevronDown,ExternalLink,Search} from 'lucide-react';
import {withReturnTarget} from '@/lib/navigation/return-context';
export type RecordChoiceA7M5={id:string;label:string;description?:string;href?:string};
/** Search before linking. Never truncate the underlying record set. */
export function ClinicalRecordFinderA7M5({label,items,value,onChange,returnTo,placeholder='Buscar registro'}:
 {label:string;items:readonly RecordChoiceA7M5[];value:string;onChange:(id:string)=>void;returnTo:string;placeholder?:string}){
 const id=useId(),[open,setOpen]=useState(false),[q,setQ]=useState(''),[n,setN]=useState(24);
 const selected=items.find(x=>x.id===value),term=q.trim().toLocaleLowerCase('pt-BR');
 const found=useMemo(()=>items.filter(x=>(x.label+' '+(x.description||'')).toLocaleLowerCase('pt-BR').includes(term))
  .sort((a,b)=>a.label.localeCompare(b.label,'pt-BR')),[items,term]);
 useEffect(()=>setN(24),[term]);
 return <div className="min-w-0 space-y-2 rounded-xl border border-surface-border/70 p-3">
  <p className="text-xs font-semibold text-ink-secondary">{label}</p>
  <div className="flex min-w-0 items-center gap-2"><button type="button" aria-expanded={open} onClick={()=>setOpen(v=>!v)} className="flex min-h-11 min-w-0 flex-1 items-center justify-between gap-2 rounded-xl border border-surface-border bg-surface-raised px-3 text-left text-xs text-ink-primary"><span className="min-w-0 flex-1 break-words">{selected?.label||'Selecionar registro existente'}</span><ChevronDown size={17}/></button>
   {selected?.href&&<Link aria-label={'Abrir '+selected.label} href={withReturnTarget(selected.href,returnTo)} className="grid size-11 shrink-0 place-items-center rounded-xl border border-surface-border text-emerald-300"><ExternalLink size={17}/></Link>}
  </div>
  {open&&<div className="space-y-2"><label htmlFor={id} className="relative block"><Search size={17} className="pointer-events-none absolute left-3 top-3.5 text-ink-muted"/><input id={id} type="search" value={q} onChange={e=>setQ(e.target.value)} placeholder={placeholder} className="min-h-11 w-full rounded-xl border border-surface-border bg-void/40 py-2 pl-10 pr-3 text-sm text-ink-primary"/></label>
   <div role="group" aria-label={label} className="max-h-60 space-y-1 overflow-y-auto overscroll-contain">
    <button type="button" className="min-h-11 w-full rounded-lg px-3 text-left text-xs text-ink-muted" onClick={()=>{onChange('');setOpen(false)}}>Não vincular</button>
    {found.slice(0,n).map(x=><button type="button" key={x.id} aria-pressed={x.id===value} onClick={()=>{onChange(x.id);setOpen(false)}} className={'min-h-11 w-full rounded-xl border px-3 py-2 text-left text-xs '+(x.id===value?'border-emerald-300/40 bg-emerald-300/10 text-emerald-200':'border-transparent text-ink-secondary hover:bg-surface-raised')}><span className="block break-words font-semibold">{x.label}</span>{x.description&&<span className="mt-1 block break-words text-[11px] text-ink-muted">{x.description}</span>}</button>)}
   </div>
   {!found.length&&<p className="text-xs text-ink-muted">Nenhum registro encontrado. Não foi criado vínculo implícito.</p>}
   {found.length>n&&<button type="button" onClick={()=>setN(x=>x+24)} className="min-h-11 w-full rounded-xl border border-surface-border px-3 text-xs text-emerald-300">Mostrar mais ({found.length-n})</button>}
   <p className="text-[11px] text-ink-muted">{found.length} registro(s) encontrados. Vínculos somente por ID explícito.</p>
  </div>}
 </div>;
}
