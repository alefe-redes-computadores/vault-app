"use client";
import { BrainCircuit, ChevronRight, FolderHeart, Network, Pill, Stethoscope } from "lucide-react";

export function CareRelationshipRoutes({onNavigate,compact=false}:{onNavigate:(href:string)=>void;compact?:boolean}) {
  const items=[
    {label:"Medicamentos",detail:"Rotina, estoque e receita",href:"/saude/medicamentos",icon:Pill,tone:"text-emerald-300"},
    {label:"Tratamentos",detail:"Condições e cuidado relacionado",href:"/saude/tratamentos",icon:Stethoscope,tone:"text-violet-300"},
    {label:"Fornecimento",detail:"SUS, compras, ciclos e documentos",href:"/saude/fornecimento",icon:FolderHeart,tone:"text-amber-300"},
    {label:"Vault Insight",detail:"Decisões, evidências e confiança",href:"/inteligencia",icon:BrainCircuit,tone:"text-ice"},
  ];
  return <section aria-label="Relações do cuidado" className="rounded-2xl border border-surface-border/60 bg-surface/60 p-3"><div className="mb-2 flex items-center gap-2"><Network size={15} className="text-violet-200"/><div><h2 className="text-xs font-bold text-ink-primary">Cuidado conectado</h2>{!compact?<p className="text-[9px] text-ink-muted">Navegue entre os dois lados de cada vínculo sem perder o contexto.</p>:null}</div></div><div className="grid grid-cols-1 gap-1.5 min-[520px]:grid-cols-2">{items.map(({label,detail,href,icon:Icon,tone})=><button key={href} type="button" onClick={()=>onNavigate(href)} className="flex min-h-12 items-center gap-2 rounded-xl border border-surface-border/50 bg-surface-raised px-3 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-300"><Icon size={16} className={`shrink-0 ${tone}`}/><span className="min-w-0 flex-1"><strong className="block text-[11px] text-ink-primary">{label}</strong><span className="block text-[9px] text-ink-muted">{detail}</span></span><ChevronRight size={14} className="text-ink-faint"/></button>)}</div></section>;
}
