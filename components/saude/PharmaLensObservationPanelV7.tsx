'use client';

import Link from 'next/link';
import { Activity, AlertTriangle, BookOpen, Clock3, Factory, HeartPulse, ShieldCheck } from 'lucide-react';
import { ManufacturerBadge } from '@/components/saude/ManufacturerBadge';
import type { PharmaLensReportV7 } from '@/lib/health-intelligence/pharmalens-v7';
import type { PharmaLensObservationsV7, PharmaLensObservationV7 } from '@/lib/health-intelligence/pharmalens-observation-v7';

export function PharmaLensObservationPanelV7({ report, observations, medicationId }: {
  report: PharmaLensReportV7;
  observations: PharmaLensObservationsV7;
  medicationId: string;
}) {
  const byId = new Map<string, PharmaLensObservationV7>(observations.entries.map(entry => [entry.acquisitionId, entry] as const));
  return <div className="space-y-3" aria-label="Contexto longitudinal PharmaLens">
    <section className="rounded-[24px] border border-emerald-400/15 bg-emerald-400/[.035] p-4">
      <div className="flex items-center gap-2 text-sm font-bold text-ink-primary"><ShieldCheck size={17} className="text-emerald-300"/>Escudo de contexto</div>
      <p className="mt-2 text-xs leading-relaxed text-ink-muted">Dias com doses <strong>explicitamente ignoradas</strong> de outros medicamentos contínuos são sinalizados como contexto. O VAULT não presume abstinência, eficácia por fabricante nem que dias sem registro são dias sem uso.</p>
    </section>
    <section className="rounded-[24px] border border-violet-400/15 bg-surface/60 p-4">
      <h3 className="flex items-center gap-2 text-sm font-bold text-ink-primary"><Factory size={17} className="text-violet-300"/>Comparativo observacional</h3>
      <p className="mt-1 text-[11px] leading-relaxed text-ink-muted">Contagem de aquisições, início de uso declarado e relatos. Não é um ranking de eficácia.</p>
      {report.manufacturers.length ? <div className="mt-3 space-y-2">{report.manufacturers.map(group => <div key={group.manufacturer} className="rounded-xl border border-surface-border bg-surface-raised/70 p-3">
        <ManufacturerBadge manufacturer={group.manufacturer}/>
        <div className="mt-2 grid grid-cols-3 gap-2 text-center">
          <div><strong className="block text-sm text-ink-primary">{group.acquisitionCount}</strong><span className="text-[10px] text-ink-muted">aquisições</span></div>
          <div><strong className="block text-sm text-ink-primary">{group.declaredStartCount}</strong><span className="text-[10px] text-ink-muted">inícios</span></div>
          <div><strong className="block text-sm text-ink-primary">{group.personalCheckInCount}</strong><span className="text-[10px] text-ink-muted">relatos</span></div>
        </div>
        <p className="mt-2 text-[11px] text-ink-muted">Trocas avaliadas: {group.personalAssessments.better} melhora(s) percebida(s), {group.personalAssessments.same} sem mudança, {group.personalAssessments.worse} piora(s) percebida(s).</p>
      </div>)}</div> : <p className="mt-3 text-xs text-ink-muted">Ainda não há fabricante documentado.</p>}
    </section>
    <section className="rounded-[24px] border border-sky-400/15 bg-surface/60 p-4">
      <h3 className="flex items-center gap-2 text-sm font-bold text-ink-primary"><Activity size={17} className="text-sky-300"/>Observações por ciclo</h3>
      <p className="mt-1 text-[11px] leading-relaxed text-ink-muted">Janela descritiva de {observations.rangeDays} dias. São contabilizados apenas eventos realmente registrados na mesma conta e pessoa.</p>
      {!report.cycles.length ? <p className="mt-3 text-xs text-ink-muted">Registre uma aquisição e o fabricante para começar.</p> : <div className="mt-3 space-y-3">{report.cycles.map(cycle => {
        const obs = byId.get(cycle.acquisitionId);
        return <article key={cycle.acquisitionId} className="rounded-2xl border border-surface-border/70 bg-surface-raised/60 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-semibold text-ink-primary">{cycle.manufacturer || 'Fabricante não informado'}</span>
            <Link href={`/saude/renovacao/detalhes?id=${encodeURIComponent(cycle.acquisitionId)}&return_to=${encodeURIComponent(`/saude/pharmalens?medicamento_id=${encodeURIComponent(medicationId)}`)}`} className="inline-flex min-h-10 items-center text-[11px] font-semibold text-sky-200 underline underline-offset-2">Abrir aquisição e relatos</Link>
          </div>
          {obs && obs.observedDays > 0 ? <>
            <p className="mt-1 flex items-center gap-1 text-[11px] text-ink-muted"><Clock3 size={13}/>{obs.from?.split('-').reverse().join('/')} a {obs.through?.split('-').reverse().join('/')} · {obs.observedDays} dia(s) na janela</p>
            <div className="mt-2 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg bg-black/10 px-2 py-2"><strong className="block text-base text-ink-primary">{obs.takenScheduled}</strong><span className="text-[10px] leading-tight text-ink-muted">doses programadas registradas</span></div>
              <div className="rounded-lg bg-black/10 px-2 py-2"><strong className="block text-base text-ink-primary">{obs.takenRescue}</strong><span className="text-[10px] leading-tight text-ink-muted">SOS / extra registradas</span></div>
              <div className="rounded-lg bg-black/10 px-2 py-2"><strong className="block text-base text-ink-primary">{obs.explicitlyIgnored}</strong><span className="text-[10px] leading-tight text-ink-muted">doses ignoradas</span></div>
            </div>
            <p className="mt-2 flex items-start gap-1 text-[11px] text-ink-muted"><HeartPulse size={13} className="mt-0.5 shrink-0"/>Saúde documentada: {obs.healthRecordDays} dia(s); {obs.healthConnectRecordDays} registro(s) Health Connect; sono {obs.sleepRecordDays} dia(s); FC {obs.heartRateRecordDays} dia(s).</p>
            {obs.concomitantIgnoredDays > 0 ? <p className="mt-2 flex items-start gap-1 text-[11px] text-amber-200"><AlertTriangle size={13} className="mt-0.5 shrink-0"/>Contexto concomitante: {obs.concomitantIgnoredDays} dia(s) com doses ignoradas de outro tratamento contínuo; falta de estoque declarada em {obs.confirmedOtherStockGapDays} dia(s).</p> : <p className="mt-2 text-[11px] text-ink-muted">Sem interrupção de outro tratamento contínuo <em>explicitamente registrada</em> nesta janela. Isso não comprova adesão.</p>}
          </> : <p className="mt-2 text-[11px] text-amber-200">Sem período exclusivo confirmado para este ciclo. Não correlacionamos registros a uma compra sem início de uso.</p>}
          {cycle.checkIns.length > 0 ? <details className="mt-2 rounded-xl border border-violet-400/15 bg-violet-400/[.025] px-3 py-1">
            <summary className="min-h-10 cursor-pointer py-2 text-[11px] font-semibold text-violet-200">Relatos pessoais D1, D3, D7 e D30 · {cycle.checkIns.length}</summary>
            <div className="space-y-2 pb-3">{cycle.checkIns.map((item,index) => <div key={`${item.day}-${item.manufacturer}-${index}`} className="rounded-lg border border-surface-border/50 bg-surface-raised/50 p-2">
              <strong className="text-[11px] text-ink-primary">D{item.day} · {item.manufacturer}</strong>
              <p className="mt-1 whitespace-pre-wrap break-words text-[11px] leading-relaxed text-ink-muted">{item.notes || 'Sem observação escrita'}</p>
            </div>)}</div>
          </details> : null}
          {obs?.limitations?.length ? <details className="mt-2 rounded-xl border border-surface-border/60 px-3 py-1"><summary className="min-h-10 cursor-pointer py-2 text-[11px] text-ink-muted">Limitações e cobertura</summary><ul className="list-disc space-y-1 pb-2 pl-4 text-[11px] text-ink-muted">{obs.limitations.map((limit,i) => <li key={`${i}-${limit}`}>{limit}</li>)}</ul></details> : null}
        </article>;
      })}</div>}
      <p className="mt-3 flex items-start gap-2 text-[11px] leading-relaxed text-ink-muted"><BookOpen size={14} className="mt-0.5 shrink-0"/>A janela se encerra no início declarado da aquisição seguinte. Se houver inícios na mesma data, o período é considerado ambíguo. Não há médias de eficácia nem cálculo de pico plasmático.</p>
    </section>
  </div>;
}
