"use client";
import { Activity, AlertTriangle, Calendar, CalendarDays, CheckCircle2, Clock, DollarSign, EyeOff, FileText, Package, Stethoscope, Zap } from "lucide-react";
import { ClinicalSectionNav } from "@/components/saude/ClinicalSectionNav";

export function MedicationDetailNavigation({hasRoutine,hasFinancial,historyCount}:{hasRoutine:boolean;hasFinancial:boolean;historyCount:number}) {
  return <ClinicalSectionNav label="Áreas do medicamento" layout="grid" density="compact" priorityCount={4} items={[
    {id:"medicamento-agora",label:"Agora",icon:<Activity size={14}/>},
    ...(hasRoutine?[{id:"medicamento-rotina",label:"Rotina",icon:<Clock size={14}/>}]:[]),
    {id:"medicamento-receita",label:"Receita",icon:<FileText size={14}/>},
    {id:"medicamento-fornecimento",label:"Fornecimento",icon:<Package size={14}/>},
    {id:"medicamento-rede",label:"Rede",icon:<Stethoscope size={14}/>},
    ...(hasFinancial?[{id:"medicamento-financeiro",label:"Financeiro",icon:<DollarSign size={14}/>}]:[]),
    ...(historyCount?[{id:"historico-aquisicoes",label:"Histórico",icon:<CalendarDays size={14}/>,badge:historyCount}]:[]),
  ]}/>;
}

export function MedicationListGroupNavigation({attention,stable,planned,sos,suspended}:{attention:number;stable:number;planned:number;sos:number;suspended:number}) {
  return <ClinicalSectionNav label="Grupos de medicamentos" items={[
    ...(attention?[{id:"medicamentos-atencao",label:"Atenção",icon:<AlertTriangle size={14}/>,badge:attention}]:[]),
    ...(stable?[{id:"medicamentos-em-dia",label:"Em dia",icon:<CheckCircle2 size={14}/>,badge:stable}]:[]),
    ...(planned?[{id:"medicamentos-planejados",label:"Próximas",icon:<Calendar size={14}/>,badge:planned}]:[]),
    ...(sos?[{id:"medicamentos-sos",label:"SOS",icon:<Zap size={14}/>,badge:sos}]:[]),
    ...(suspended?[{id:"medicamentos-suspensos",label:"Suspensos",icon:<EyeOff size={14}/>,badge:suspended}]:[]),
  ]}/>;
}
