"use client";

import { Building2, CalendarCheck2, ChevronRight, MapPin, PackageCheck, Stethoscope, type LucideIcon } from "lucide-react";

type NetworkItemR5={title:string;hint:string;href:string;icon:LucideIcon;tone:string;shortcuts:readonly {name:string;href:string}[]};
const ITEMS:readonly NetworkItemR5[]=[
  {title:"Médicos e especialistas",hint:"Profissionais e históricos por vínculo",href:"/saude/medicos",icon:Stethoscope,tone:"border-sky-400/20 bg-sky-400/[.045] text-sky-300",shortcuts:[{name:"Abrir profissionais",href:"/saude/medicos"}]},
  {title:"Hospitais e unidades",hint:"Clínicas, laboratórios e locais",href:"/saude/hospitais",icon:Building2,tone:"border-violet-400/20 bg-violet-400/[.045] text-violet-300",shortcuts:[{name:"Locais",href:"/saude/locais"}]},
  {title:"Retiradas e SUS",hint:"Farmácias, ciclos e fornecimento",href:"/saude/retiradas",icon:PackageCheck,tone:"border-amber-400/20 bg-amber-400/[.045] text-amber-300",shortcuts:[{name:"Farmácias",href:"/saude/farmacias"},{name:"Fornecimento",href:"/saude/fornecimento"}]},
  {title:"Consultas e retornos",hint:"Agenda e atendimentos externos",href:"/saude/consultas",icon:CalendarCheck2,tone:"border-emerald-400/20 bg-emerald-400/[.045] text-emerald-300",shortcuts:[{name:"Abrir agenda",href:"/saude/consultas"}]},
];
export function NetworkHubNavigatorR5({onNavigate}:{onNavigate:(href:string)=>void}){
  return <div data-vault-ui360-r5-network className="grid grid-cols-2 gap-2 max-[349px]:grid-cols-1">
    {ITEMS.map(item=>{const Icon=item.icon;return <article key={item.href} className={`min-w-0 rounded-[20px] border p-3 shadow-[0_12px_28px_rgba(0,0,0,.1)] ${item.tone}`}>
      <div className="flex items-start justify-between gap-2"><span className="grid size-11 shrink-0 place-items-center rounded-[14px] border border-current/10 bg-black/10"><Icon size={21} aria-hidden="true"/></span><MapPin size={13} aria-hidden="true" className="opacity-40"/></div>
      <button type="button" onClick={()=>onNavigate(item.href)} className="mt-2 flex min-h-[62px] w-full flex-col justify-between gap-1 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-300">
        <strong className="block break-words text-[12px] font-semibold leading-snug text-ink-primary">{item.title}</strong>
        <span className="block text-[10px] leading-relaxed text-ink-muted">{item.hint}</span>
        <span className="mt-1 flex items-center gap-1 text-[10px] font-bold">Explorar <ChevronRight size={13}/></span>
      </button>
      <div className="mt-2 flex flex-wrap gap-1.5 border-t border-current/10 pt-2">{item.shortcuts.map(link=><button type="button" key={link.href} onClick={()=>onNavigate(link.href)} className="min-h-9 rounded-xl border border-current/20 bg-black/10 px-2.5 py-1 text-[10px] font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-300">{link.name}</button>)}</div>
    </article>;})}
  </div>;
}
