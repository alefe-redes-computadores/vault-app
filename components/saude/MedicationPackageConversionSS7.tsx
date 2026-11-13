'use client';

import { useState } from 'react';
import { Calculator, PackageCheck, ShieldCheck } from 'lucide-react';
import type { Medicamento } from '@/lib/types';
import { calculatePackageUnitsSS7, type PackageEvidenceSS7 } from '@/lib/health-supply/package-evidence-ss7';

export function MedicationPackageConversionSS7({ medication, onApply }: {
  medication: Medicamento | null | undefined;
  onApply: (evidence: PackageEvidenceSS7) => void;
}) {
  const [boxes, setBoxes] = useState('');
  const [unitsPerBox, setUnitsPerBox] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [feedback, setFeedback] = useState('');
  const unit = medication?.estoque_unidade_medida?.trim() || '';
  const result = calculatePackageUnitsSS7(Number(boxes), Number(unitsPerBox), unit);
  const eligible = Boolean(medication?.id && result);
  return (
    <details className="mt-3 rounded-2xl border border-emerald-400/20 bg-emerald-400/[.04] p-3">
      <summary className="flex min-h-11 cursor-pointer items-center gap-2 text-xs font-semibold text-emerald-200"><Calculator size={16}/> Informar por caixas fechadas (opcional)</summary>
      <p className="mt-2 text-xs leading-relaxed text-ink-muted">Informe o conteúdo real escrito na embalagem. O VAULT não presume 20, 30 ou outra quantidade por caixa. Esta operação não modifica estoque até você confirmar e salvar a aquisição.</p>
      {medication && !unit ? <p role="status" className="mt-2 text-xs text-amber-300">Defina a unidade do estoque no cadastro antes de converter caixas.</p> : null}
      {medication && unit && !eligible && (boxes || unitsPerBox) && !result ? <p role="status" className="mt-2 text-xs text-amber-300">Confira números inteiros positivos e unidade compatível (comprimidos/cápsulas). Gotas, ml, frascos e caixas como unidade de saldo não são convertidos automaticamente.</p> : null}
      <div className="mt-3 grid grid-cols-2 gap-2">
        <label className="text-[11px] font-medium text-ink-muted">Caixas recebidas
          <input type="number" min="1" max="500" step="1" inputMode="numeric" value={boxes} onChange={e => {setBoxes(e.target.value);setConfirmed(false);setFeedback('');}} placeholder="Ex.: 2" className="mt-1 min-h-11 w-full rounded-xl border border-surface-border bg-surface-raised px-3 text-sm text-ink-primary"/>
        </label>
        <label className="text-[11px] font-medium text-ink-muted">Unidades por caixa
          <input type="number" min="1" max="1000" step="1" inputMode="numeric" value={unitsPerBox} onChange={e => {setUnitsPerBox(e.target.value);setConfirmed(false);setFeedback('');}} placeholder="Ex.: 20 ou 30" className="mt-1 min-h-11 w-full rounded-xl border border-surface-border bg-surface-raised px-3 text-sm text-ink-primary"/>
        </label>
      </div>
      {result ? <div className="mt-3 rounded-xl border border-ice/20 bg-ice/[.05] p-3 text-xs leading-relaxed text-ink-primary">
        <span className="flex items-center gap-1.5 font-bold"><PackageCheck size={15}/> Conferência de embalagem</span>
        <p className="mt-1">{result.packages} caixa(s) × {result.unitsPerPackage} {result.stockUnit} por caixa = <strong>{result.totalUnits} {result.stockUnit}</strong> a adicionar.</p>
      </div> : null}
      <label className="mt-3 flex items-start gap-2 text-xs leading-relaxed text-ink-secondary"><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)} className="mt-0.5 size-4 accent-emerald-400"/><span>Conferi a embalagem física e a unidade do cadastro. Quero usar esse total neste recebimento.</span></label>
      <button type="button" disabled={!eligible || !confirmed} onClick={() => {
        if (!medication?.id || !result) return;
        onApply({medicationId:medication.id, packages:result.packages, unitsPerPackage:result.unitsPerPackage, totalUnits:result.totalUnits, stockUnit:result.stockUnit, confirmedAt:new Date().toISOString()});
        setFeedback('Conversão aplicada à quantidade. Confira os demais dados antes de salvar a aquisição.');
      }} className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-3 text-xs font-bold text-emerald-200 disabled:opacity-40"><ShieldCheck size={15}/> Aplicar total conferido</button>
      {feedback ? <p role="status" className="mt-2 text-xs text-emerald-200">{feedback}</p> : null}
    </details>
  );
}
