'use client';
import {useEffect,useId,useMemo,useState} from 'react';
import Link from 'next/link';
import {ChevronDown, ExternalLink, Search, UserRoundCheck, MapPin, CalendarDays, Activity, Pill, Syringe, ClipboardCheck, type LucideIcon} from 'lucide-react';
import {withReturnTarget} from '@/lib/navigation/return-context';

type Item={id?:string;nome:string;detailHref?:string};
export type ClinicalRelationKind360='professional'|'location'|'consultation'|'rehab_session'|'medication'|'vaccination_event'|'procedure_event';
type Props={kind:ClinicalRelationKind360;label:string;items:readonly Item[];selectedId:string;
 onSelect:(id:string)=>void;returnTo:string;detailsRoot?:string;detailsParam?:string;disabled?:boolean};
/** Search all account-scoped records; display is paged, never silently truncated. */
export function ClinicalEntitySearch360({kind,label,items,selectedId,onSelect,returnTo,detailsRoot,detailsParam='id',disabled=false}:Props){
 const id=useId(),[query,setQuery]=useState(''),[count,setCount]=useState(24),[expanded,setExpanded]=useState(false);
 const term=query.trim().toLocaleLowerCase('pt-BR');
 const results=useMemo(()=>items.filter(row=>row.id&&row.nome.toLocaleLowerCase('pt-BR').includes(term))
  .sort((a,b)=>a.nome.localeCompare(b.nome,'pt-BR')),[items,term]);
 const chosen=items.find(row=>row.id===selectedId);
 useEffect(()=>{setCount(24);},[query,kind]);
 const kinds:Record<ClinicalRelationKind360,{icon:LucideIcon,color:string,noun:string,href:string}>={
  professional:{icon:UserRoundCheck,color:'text-sky-300',noun:'profissionais',href:'/saude/medicos/detalhes?id='},
  location:{icon:MapPin,color:'text-emerald-300',noun:'locais',href:'/saude/locais/detalhes?id='},
  consultation:{icon:CalendarDays,color:'text-sky-300',noun:'consultas',href:'/saude/consultas/detalhes?id='},
  rehab_session:{icon:Activity,color:'text-teal-300',noun:'sessões de reabilitação',href:'/saude/reabilitacao'},
  medication:{icon:Pill,color:'text-amber-300',noun:'medicamentos',href:'/saude/medicamentos/detalhes?id='},
  vaccination_event:{icon:Syringe,color:'text-teal-300',noun:'vacinações',href:'/saude/vacinas?registro='},
  procedure_event:{icon:ClipboardCheck,color:'text-teal-300',noun:'procedimentos',href:'/saude/procedimentos?id='},
 };
 const ui=kinds[kind],base=detailsRoot?detailsRoot+'?'+encodeURIComponent(detailsParam)+'=':ui.href;
 const ItemIcon=ui.icon;
 return <fieldset disabled={disabled} className="min-w-0 space-y-2 rounded-xl border border-surface-border/70 bg-surface/50 p-3">
  <legend className="px-1 text-xs font-semibold text-ink-secondary">{label}</legend>
  <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
   <button type="button" aria-expanded={expanded} onClick={()=>setExpanded(v=>!v)} className="inline-flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-xl border border-surface-border px-3 text-left text-xs text-ink-primary focus-visible:outline-2 focus-visible:outline-emerald-300">
    <ItemIcon size={18} className={"shrink-0 "+ui.color}/><span className="min-w-0 flex-1 break-words">{chosen?.nome||'Não informado · selecionar'}</span><ChevronDown size={16}/>
   </button>
   {selectedId&&chosen&&<Link aria-label={'Abrir '+chosen.nome} href={withReturnTarget(chosen.detailHref||base+encodeURIComponent(selectedId),returnTo)} className={"grid size-11 place-items-center rounded-xl border border-surface-border "+ui.color}><ExternalLink size={18}/></Link>}
  </div>
  {expanded&&<div className="space-y-2"><label htmlFor={id} className="relative block"><Search size={17} className="pointer-events-none absolute left-3 top-3.5 text-ink-muted"/><input id={id} autoComplete="off" value={query} onChange={event=>setQuery(event.target.value)} placeholder={'Pesquisar '+ui.noun} className="min-h-11 w-full rounded-xl border border-surface-border bg-void/60 py-2 pl-10 pr-3 text-sm text-ink-primary"/></label>
   <div role="group" aria-label={label} className="max-h-60 space-y-1 overflow-y-auto overscroll-contain">
    <button type="button" className="min-h-11 w-full rounded-xl px-3 text-left text-xs text-ink-secondary hover:bg-surface-raised" onClick={()=>{onSelect('');setExpanded(false);}}>Não informar</button>
    {results.slice(0,count).map(item=><button key={item.id} type="button" aria-pressed={selectedId===item.id} onClick={()=>{onSelect(item.id||'');setExpanded(false);}} className={'min-h-11 w-full rounded-xl px-3 py-2 text-left text-sm break-words '+(selectedId===item.id?'border border-emerald-300/40 bg-emerald-300/10 text-emerald-200':'text-ink-secondary hover:bg-surface-raised')}>{item.nome}</button>)}
   </div>
   {results.length>count&&<button type="button" className="min-h-11 w-full rounded-xl border border-surface-border text-xs text-ink-secondary" onClick={()=>setCount(c=>c+24)}>Mostrar mais ({results.length-count} restantes)</button>}
   {!results.length&&<p className="text-xs text-ink-muted">Nenhum cadastro encontrado. Consulte a Rede Clínica para adicionar um registro real.</p>}
   <p className="text-[11px] text-ink-muted">{results.length} registros disponíveis · sem criar duplicatas</p>
  </div>}
 </fieldset>;
}
