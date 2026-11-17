'use client';
import { useState } from 'react';
import { ClipboardList, ChevronDown, ChevronUp } from 'lucide-react';
import type { Consulta } from '@/lib/types';
import { consultationThreeVoicesP6 } from '@/lib/consultations/consultation-medication-evidence-p6';

/** Prepara a consulta usando dados existentes; editar registra via formulário canônico. */
export function ConsultationPreparationP6P2({consultation,linkedCount,onEdit}:{consultation:Consulta;linkedCount:number;onEdit:()=>void}){
  const [open,setOpen]=useState(false);const voices=consultationThreeVoicesP6(consultation);
  const steps=[{name:'Antes',done:Boolean(consultation.motivo||linkedCount||consultation.document_id),text:'Motivo, medicamentos selecionados e documento já cadastrado.'},
    {name:'Durante',done:Boolean(voices.personal||voices.professional),text:'Relato pessoal e orientação profissional em campos distintos.'},
    {name:'Depois',done:Boolean(voices.followUp),text:'Próximos passos declarados e providências a conferir.'}];
  return <section aria-label="Preparação e acompanhamento da consulta" className="rounded-[22px] border border-emerald-300/20 bg-emerald-300/[.035] p-3.5">
    <button type="button" onClick={()=>setOpen(!open)} aria-expanded={open} className="flex min-h-11 w-full items-center gap-3 text-left"><ClipboardList size={18} className="text-emerald-300"/><span className="min-w-0 flex-1"><strong className="block text-sm text-ink-primary">Preparar e acompanhar consulta</strong><span className="text-[11px] text-ink-muted">Antes, durante e depois · sem preencher nada automaticamente</span></span>{open?<ChevronUp size={16}/>:<ChevronDown size={16}/>}</button>
    {open&&<div className="space-y-2 pt-2">{steps.map(s=><div key={s.name} className="rounded-xl border border-surface-border/40 bg-surface p-3"><p className="text-xs font-semibold text-ink-primary">{s.name} <span className="font-normal text-ink-muted">· {s.done?'Informações cadastradas':'A conferir'}</span></p><p className="mt-1 text-[11px] text-ink-muted">{s.text}</p></div>)}<button type="button" onClick={onEdit} className="min-h-11 w-full rounded-xl border border-emerald-300/30 px-3 text-xs font-semibold text-emerald-200">Editar dados da consulta</button><p className="text-[11px] text-ink-muted">Uma informação ausente não é um problema clínico confirmado. Nenhuma orientação modifica tratamento por si só.</p></div>}
  </section>;
}
