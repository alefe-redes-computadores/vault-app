'use client';
import { ClipboardList, Factory, Clock3, ShieldQuestion } from 'lucide-react';
import type { PharmaLensReportV7 } from '@/lib/health-intelligence/pharmalens-v7';
import type { PharmaLensObservationsV7 } from '@/lib/health-intelligence/pharmalens-observation-v7';
/** Mostra proveniência existente; nunca associa texto OCR a uma aquisição sem confirmação explícita. */
export function PharmaLensLotEvidenceCI360({report,observations}:{report:PharmaLensReportV7;observations:PharmaLensObservationsV7}) {
  return <section className="space-y-2 rounded-[22px] border border-sky-300/15 bg-sky-300/[.025] p-3.5" aria-label="Linha de evidências por aquisição e fabricante">
    <h3 className="flex items-center gap-2 text-sm font-bold text-ink-primary"><ClipboardList size={16} className="text-sky-300"/>Linha documental por aquisição</h3>
    <p className="text-[11px] leading-relaxed text-ink-muted">Aquisição, início declarado, fabricante e relato são fatos distintos. A foto selecionada na conferência não se vincula automaticamente aos registros abaixo.</p>
    {!report.cycles.length?<p className="text-xs text-ink-muted">Ainda não há aquisição documentada para esta apresentação.</p>:report.cycles.slice(0,6).map(cycle=>{
      const obs=observations.entries.find(row=>row.acquisitionId===cycle.acquisitionId);
      return <div key={cycle.acquisitionId} className="rounded-xl border border-surface-border/60 bg-surface/60 p-3">
        <div className="flex flex-wrap items-center gap-2 text-xs"><Factory size={14} className="text-violet-300"/><strong className="text-ink-primary">{cycle.manufacturer||'Fabricante não informado'}</strong><span className="text-[10px] text-ink-muted">{cycle.quality==='documentado'?'Documentação registrada':cycle.quality==='parcial'?'Dados parciais':'Dados insuficientes'}</span></div>
        <div className="mt-2 grid grid-cols-2 gap-2 text-[10px] text-ink-secondary"><p>Aquisição: <strong>{cycle.acquiredAt||'não confirmada'}</strong></p><p>Início informado: <strong>{cycle.startedAt||'não confirmado'}</strong></p><p>Relatos próprios: <strong>{cycle.checkIns.length}</strong></p><p>Janela observada: <strong>{obs?.observedDays??0} dias</strong></p></div>
        {cycle.issues.length>0?<p className="mt-2 flex items-start gap-1 text-[10px] text-amber-200"><ShieldQuestion size={12}/>Há {cycle.issues.length} ponto(s) documental(is) para revisar.</p>:null}
        {!cycle.startedAt?<p className="mt-1 flex items-start gap-1 text-[10px] text-ink-muted"><Clock3 size={12}/>Sem início confirmado, não há janela de uso atribuível a este fabricante.</p>:null}
      </div>;
    })}
    {report.cycles.length>6&&<p className="text-[10px] text-ink-muted">Mostrando 6 de {report.cycles.length} aquisições; o histórico completo permanece no PharmaLens.</p>}
    <p className="text-[10px] leading-relaxed text-ink-muted">Um relato temporal não demonstra causalidade, diferença de eficácia ou bioequivalência entre fabricantes.</p>
  </section>;
}
