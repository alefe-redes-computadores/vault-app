"use client";
import {useMemo} from 'react';
import Link from 'next/link';
import {Pill,FileText,CalendarDays,ChevronRight} from 'lucide-react';
import type {Document,Medicamento,Retirada} from '@/lib/types';
import type {SupplyCycle,SupplyData,SupplyProcess} from '@/lib/health-supply/types';
import {supplyCycleSummary,type SupplyCycleView} from '@/lib/health-supply/cycle-summary';
export function SupplyCycleSummary({process,cycle,data,documents,medications,withdrawals,personId,onOpen}:{
 process:SupplyProcess;cycle:SupplyCycle;data:SupplyData;documents:Document[];medications:Medicamento[];withdrawals:Retirada[];personId:string;onOpen:(view:SupplyCycleView)=>void;
}) {
 const summary=useMemo(()=>supplyCycleSummary(process,cycle,data,documents,medications,withdrawals,personId),[process,cycle,data,documents,medications,withdrawals,personId]);
 if(!summary)return null;
 const rows=[
  {view:'medications' as const,title:'Medicamentos',Icon:Pill,tone:'text-emerald-300',text:`${summary.medicationCount} vinculado(s)`,detail:summary.unavailableMedications?`${summary.unavailableMedications} cadastro(s) indisponível(is)`:summary.medicationCount?'Consultar doses e quantidades':'Selecionar medicamentos existentes'},
  {view:'documents' as const,title:'Documentos',Icon:FileText,tone:'text-violet-300',text:`${summary.documentCount} vínculo(s)`,detail:summary.unavailableDocuments?`${summary.unavailableDocuments} arquivo(s) indisponível(is)`:summary.documentCount?'Consultar arquivos e entrega':'Vincular arquivo existente, quando exigido'},
  {view:'withdrawals' as const,title:'Retiradas',Icon:CalendarDays,tone:'text-amber-300',text:`${summary.withdrawalCount} vinculada(s)`,detail:summary.scheduledCount?`${summary.scheduledCount} agendada(s)`:summary.withdrawalCount?'Consultar registros':'Selecione um registro em Vincular outra retirada'},
 ];
 return <section aria-label="Situação salva do ciclo" className="space-y-2">
  <p className="text-xs text-ink-muted">Resumo dos vínculos salvos, não uma confirmação de fornecimento. Abra somente o que deseja consultar ou atualizar.</p>
  {rows.map(({view,title,Icon,tone,text,detail})=><button key={view} type="button" onClick={()=>onOpen(view)} aria-label={`Abrir ${title.toLocaleLowerCase("pt-BR")}: ${text}. ${detail}`} className="flex min-h-11 w-full items-center gap-3 rounded-xl border border-surface-border bg-surface-raised px-3 py-2 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-300"><Icon size={18} className={`shrink-0 ${tone}`}/><span className="min-w-0 flex-1"><span className="flex flex-wrap items-baseline justify-between gap-1 text-xs font-semibold text-ink-primary"><span>{title}</span><span className="text-[11px] font-normal text-ink-muted">{text}</span></span><span className="mt-1 block text-[10px] leading-relaxed text-ink-muted">{detail}</span></span><ChevronRight size={14} className="shrink-0 text-ink-muted"/></button>)}
  {summary.next?.id?<Link href={`/saude/retiradas/detalhes?id=${encodeURIComponent(summary.next.id)}`} className="block min-h-11 rounded-xl border border-amber-400/20 bg-amber-400/5 px-3 py-2 text-xs text-amber-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-300"><span className="block font-semibold">Agendada: {summary.next.medicamento_nome||'Retirada'} · {summary.next.data.split('-').reverse().join('/')}</span><span className="mt-1 block text-[10px]">Abrir registro · a data não confirma retirada realizada nem altera o período do ciclo</span></Link>:null}
 </section>;
}
