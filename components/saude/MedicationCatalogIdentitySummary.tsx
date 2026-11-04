"use client";

import { memo } from "react";

type Props = {
  canonicalName: string;
  activeIngredients?: readonly string[] | null;
  activeIngredient?: string | null;
  authorityLabel: string;
  divergent: boolean;
};

/** Mostra a origem da referência sem concluir validade da receita ou identificação clínica. */
export const MedicationCatalogIdentitySummary = memo(function MedicationCatalogIdentitySummary({canonicalName,activeIngredients,activeIngredient,authorityLabel,divergent}:Props) {
  const ingredient = activeIngredients?.join(" + ") || activeIngredient;
  return <div className="min-w-0" aria-label="Identidade da referência selecionada">
    <div className="flex flex-wrap items-center gap-2">
      <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-violet-300">Referência selecionada</p>
      <span className={`rounded-full border px-2 py-0.5 text-[9px] font-semibold ${divergent ? "border-amber-400/25 bg-amber-400/10 text-amber-300" : "border-emerald-400/20 bg-emerald-400/[0.07] text-emerald-300"}`}>{authorityLabel}</span>
    </div>
    <p className="mt-1.5 break-words text-sm font-semibold text-ink-primary">{canonicalName}</p>
    {ingredient ? <p className="mt-1 break-words text-[11px] leading-relaxed text-ink-muted"><span className="text-ink-faint">Princípio ativo · </span>{ingredient}</p> : null}
    {divergent && <p className="mt-2 rounded-lg border border-amber-400/20 bg-amber-400/[0.045] px-2 py-1.5 text-[11px] leading-relaxed text-amber-300">Confira a referência selecionada antes de salvar. Este aviso não avalia a prescrição nem altera o medicamento.</p>}
  </div>;
});
