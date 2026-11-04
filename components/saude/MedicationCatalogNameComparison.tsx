"use client";

/** P15 R8: comparação apenas visual. Não considera alias/marca automaticamente incorreto. */
type Props = {
  currentName: string;
  referenceName: string;
  activeIngredients?: string | null;
  score: number;
};

export function MedicationCatalogNameComparison({currentName, referenceName, activeIngredients, score}: Props) {
  const percent = Number.isFinite(score) ? `${Math.round(Math.max(0, Math.min(1, score)) * 100)}%` : "Não calculada";
  return (
    <div aria-label="Comparação opcional com referência farmacêutica">
      <div className="mt-2 grid grid-cols-2 gap-2 max-[389px]:grid-cols-1">
        <div className="rounded-xl border border-surface-border/50 bg-void/30 p-2.5">
          <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-ink-muted">Cadastrado</p>
          <p className="mt-1 break-words text-sm font-semibold text-ink-primary">{currentName}</p>
        </div>
        <div className="rounded-xl border border-emerald-300/20 bg-emerald-300/[0.045] p-2.5">
          <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-emerald-300">Referência encontrada</p>
          <p className="mt-1 break-words text-sm font-semibold text-ink-primary">{referenceName}</p>
          {activeIngredients && <p className="mt-1 text-[10px] leading-relaxed text-ink-muted">{activeIngredients}</p>}
        </div>
      </div>
      <p className="mt-2 text-[10px] text-ink-faint">
        Correspondência aproximada dos nomes: <span className="font-semibold text-ink-muted">{percent}</span>. Não confirma equivalência do medicamento ou validade da receita.
      </p>
    </div>
  );
}
