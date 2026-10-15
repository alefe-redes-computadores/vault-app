"use client";
import { Building2, CalendarClock, ChevronRight, Link2 } from 'lucide-react';
import { SUPPLY_ORIGIN_LABELS } from '@/lib/health-supply/types';
import type {treatmentCareContext} from '@/lib/treatment-care-context';
type Context=ReturnType<typeof treatmentCareContext>;
const statusLabel:Record<string,string>={agendada:'Agendada',realizada:'Realizada',cancelada:'Cancelada',nao_realizada:'Não realizada'};
export function TreatmentCareLinks({context,color,onNavigate,loading=false}:{context:Context;color:string;onNavigate:(href:string)=>void;loading?:boolean}) {
  const {processes,withdrawals}=context;
  const medicationsById=new Map(context.medications.map(m=>[m.id,m]));
  return <section className="rounded-3xl border border-surface-border bg-surface p-4" aria-label="Fornecimento e retiradas do tratamento">
    <div className="flex items-center gap-2"><Link2 size={18} style={{color}}/><h3 className="text-sm font-semibold text-ink-primary">Cuidado conectado</h3></div>
    <p className="mt-2 text-xs leading-relaxed text-ink-muted">{processes.length} {processes.length===1?'processo de fornecimento':'processos de fornecimento'} · {withdrawals.length} {withdrawals.length===1?'retirada vinculada':'retiradas vinculadas'} aos medicamentos.</p>
    {loading?<p role="status" className="mt-3 text-xs text-ink-muted">Consultando os vínculos locais…</p>:null}
    {!loading&&!processes.length&&!withdrawals.length?<p className="mt-3 text-xs text-ink-muted">Os processos e as retiradas aparecem aqui quando vinculados aos medicamentos deste tratamento.</p>:null}
    {processes.length>0?<ul className="mt-3 divide-y divide-surface-border">{processes.map(p=><li key={p.id}><button type="button" onClick={()=>onNavigate(`/saude/fornecimento?id=${encodeURIComponent(p.id)}`)} className="flex min-h-16 w-full items-center gap-3 py-3 text-left"><Building2 size={18} className="shrink-0 text-ink-muted"/><span className="min-w-0 flex-1"><span className="block break-words text-sm font-medium text-ink-primary">{p.titulo}</span><span className="mt-1 block text-[11px] text-ink-muted">{SUPPLY_ORIGIN_LABELS[p.origem]} · {p.status==='ativo'?'Ativo':'Encerrado'}</span></span><ChevronRight size={16} className="shrink-0 text-ink-muted"/></button></li>)}</ul>:null}
    {withdrawals.length>0?<details className="mt-2 border-t border-surface-border"><summary className="min-h-11 cursor-pointer py-3 text-xs font-semibold text-ink-primary">Histórico de retiradas · {withdrawals.length}</summary><ul className="divide-y divide-surface-border">{withdrawals.map((w,i)=><li key={w.id||i}>{w.id?<button type="button" onClick={()=>onNavigate(`/saude/retiradas/detalhes?id=${encodeURIComponent(w.id!)}`)} className="flex min-h-16 w-full items-center gap-3 py-3 text-left"><CalendarClock size={17} className="shrink-0 text-ink-muted"/><span className="min-w-0 flex-1"><span className="block break-words text-xs font-semibold text-ink-primary">{medicationsById.get(w.medicamento_id)?.nome||w.medicamento_nome||'Medicamento'}</span><span className="mt-1 block text-[11px] text-ink-muted">{w.data.split('-').reverse().join('/')} · {statusLabel[w.status]||w.status}</span></span><ChevronRight size={16} className="shrink-0 text-ink-muted"/></button>:<p className="py-3 text-xs text-ink-muted">Retirada sem identificador disponível</p>}</li>)}</ul></details>:null}
  </section>;
}
