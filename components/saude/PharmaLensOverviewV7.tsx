'use client';

import { Factory, CalendarDays, ShieldCheck, AlertCircle, BookOpen } from 'lucide-react';
import type { PharmaLensReportV7, PharmaLensCycleV7 } from '@/lib/health-intelligence/pharmalens-v7';
import { ManufacturerBadge } from '@/components/saude/ManufacturerBadge';

const assessment: Record<'better'|'same'|'worse', string> = {
  better: 'Melhora percebida', same: 'Sem mudança percebida', worse: 'Piora percebida',
};
function brazilianDate(value: string | null) {
  return value ? value.split('-').reverse().join('/') : 'Não informada';
}
function coverageLabel(cycle: PharmaLensCycleV7): string {
  if (cycle.quality === 'documentado') return 'Início documentado';
  if (cycle.quality === 'parcial') return 'Dados parciais';
  return 'Dados insuficientes';
}

/** UI de leitura pura. Conexão à tela será uma cirurgia separada, após liberação da outra frente. */
export function PharmaLensOverviewV7({ report }: { report: PharmaLensReportV7 }) {
  return <section aria-label="PharmaLens — experiência por fabricante" className="rounded-[26px] border border-violet-400/25 bg-violet-400/[.04] p-4">
    <div className="flex items-center gap-2"><Factory size={18} className="text-violet-300"/><h2 className="text-base font-bold text-ink-primary">PharmaLens</h2></div>
    <p className="mt-1 text-xs font-semibold text-violet-200">Experiência pessoal por fabricante</p>
    <p className="mt-2 text-xs leading-relaxed text-ink-muted">Linha do tempo baseada em aquisições e relatos registrados. Compra não comprova uso; percepção não comprova causa ou superioridade clínica.</p>
    {report.cycles.length === 0 ? <p className="mt-3 rounded-xl border border-surface-border bg-surface/70 p-3 text-xs text-ink-muted">Ainda não há aquisições identificáveis deste medicamento para comparação descritiva.</p> : <>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl border border-surface-border bg-surface p-2"><p className="text-base font-bold text-ink-primary">{report.totalAcquisitions}</p><p className="text-[10px] text-ink-muted">Aquisições</p></div>
        <div className="rounded-xl border border-surface-border bg-surface p-2"><p className="text-base font-bold text-ink-primary">{report.manufacturers.length}</p><p className="text-[10px] text-ink-muted">Fabricantes</p></div>
        <div className="rounded-xl border border-surface-border bg-surface p-2"><p className="text-base font-bold text-ink-primary">{report.documentedTransitions}</p><p className="text-[10px] text-ink-muted">Trocas com início registrado</p></div>
      </div>
      {report.futureAcquisitionsExcluded > 0 && <p className="mt-2 text-[11px] text-amber-200">{report.futureAcquisitionsExcluded} registro(s) com data de aquisição futura fora da comparação.</p>}
      <h3 className="mt-4 flex items-center gap-2 text-xs font-bold text-ink-primary"><CalendarDays size={15} className="text-violet-300"/>Linha do tempo de aquisições</h3>
      <div className="mt-2 space-y-2">
        {report.cycles.map(cycle => <div key={cycle.acquisitionId} className="rounded-2xl border border-surface-border/80 bg-surface p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            {cycle.manufacturer ? <ManufacturerBadge manufacturer={cycle.manufacturer}/> : <span className="text-xs text-amber-200">Fabricante não informado</span>}
            <span className="text-[11px] text-ink-muted">{coverageLabel(cycle)}</span>
          </div>
          <p className="mt-2 text-xs text-ink-muted">Aquisição: {brazilianDate(cycle.acquiredAt)} · Início de uso: {brazilianDate(cycle.startedAt)}</p>
          {cycle.confirmedManufacturerTransition && cycle.previousManufacturer && <p className="mt-2 text-xs text-ink-secondary">Mudança registrada: {cycle.previousManufacturer} → {cycle.manufacturer}</p>}
          {cycle.perceivedChange && cycle.perceivedChange !== 'unknown' && <p className="mt-2 text-xs text-violet-200">Seu relato: {assessment[cycle.perceivedChange]}</p>}
          <p className="mt-2 flex items-center gap-1 text-[11px] text-ink-muted"><BookOpen size={13}/>{cycle.checkIns.length} relato(s) D1/D3/D7/D30 deste fabricante</p>
          {!!cycle.otherManufacturerCheckIns.length && <p className="mt-2 flex items-start gap-1 text-[11px] text-amber-200"><AlertCircle size={13} className="mt-0.5 shrink-0"/>Há relatos históricos vinculados a outro fabricante; eles não foram reatribuídos.</p>}
        </div>)}
      </div>
    </>}
    <p className="mt-3 flex items-start gap-2 text-[11px] leading-relaxed text-ink-muted"><ShieldCheck size={14} className="mt-0.5 shrink-0"/>Não são calculadas notas de eficácia, médias de biometria ou conclusões causais. Dados de saúde e fatores concomitantes entrarão numa etapa própria, com cobertura e fontes verificadas.</p>
  </section>;
}
