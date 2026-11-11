"use client";

import type { HealthInsight } from "@/lib/health-insights";
import { evidenceReceiptM119 } from "@/lib/health-intelligence/trust-spine-m119";

export function EvidenceReceiptM119({ insight }: { insight: HealthInsight }) {
  const receipt = evidenceReceiptM119(insight);
  return (
    <section aria-label="Recibo de evidências do insight" className="rounded-2xl border border-sky-400/20 bg-sky-400/[0.035] p-3.5">
      <h4 className="text-xs font-semibold text-ink-primary">Recibo de evidências</h4>
      <dl className="mt-2 grid grid-cols-2 gap-2 text-[11px]">
        <div><dt className="text-ink-faint">Amostra declarada</dt><dd className="font-semibold text-ink-primary">{receipt.sample === null ? 'Não informada' : `${receipt.sample} registros`}</dd></div>
        <div><dt className="text-ink-faint">Período declarado</dt><dd className="font-semibold text-ink-primary">{receipt.days === null ? 'Não informado' : `${receipt.days} dias`}</dd></div>
        <div><dt className="text-ink-faint">Dias documentados</dt><dd className="font-semibold text-ink-primary">{receipt.coverage ? `${receipt.coverage.observed} de ${receipt.coverage.total}` : 'Não informado'}</dd></div>
        <div><dt className="text-ink-faint">Evidências descritas</dt><dd className="font-semibold text-ink-primary">{receipt.traceableEvidenceCount}</dd></div>
      </dl>
      <p className="mt-2 text-[11px] leading-relaxed text-ink-muted">
        {receipt.sourceStatus === 'named' ? `Categorias de fonte declaradas: ${receipt.declaredSourceNames.join(', ')}.` : 'Categorias de fonte não informadas individualmente neste insight.'}
      </p>
      <p className="mt-1 text-[11px] leading-relaxed text-ink-muted">{receipt.referencedEntityCount > 0 ? `${receipt.referencedEntityCount} referência(s) de entidade declarada(s) pelo motor; não equivale a uma trilha completa dos registros de origem.` : 'IDs exatos dos registros que contribuíram para este insight não estão disponíveis nesta apresentação.'}</p>
      <p className="mt-1 text-[11px] leading-relaxed text-ink-muted">Última atualização dos registros de origem: não informada pelo insight. A data de abertura desta tela não substitui esse dado.</p>
      <p className="mt-2 text-[10px] leading-relaxed text-sky-200">Recibo parcial e factual. Não comprova causalidade, diagnóstico ou integridade de toda a base.</p>
    </section>
  );
}
