"use client";

import { useId, type ReactNode } from "react";
import { Palette } from "lucide-react";

export function MedicationAppearancePanel({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  const heading = useId();

  return (
    <section
      aria-labelledby={heading}
      className="rounded-[24px] border border-emerald-400/15 bg-gradient-to-br from-surface via-surface to-emerald-400/[0.04] p-4 shadow-sm sm:p-5"
    >
      <header className="mb-4 flex min-w-0 items-center gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-emerald-400/10 text-emerald-300">
          <Palette size={17} aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 id={heading} className="break-words text-sm font-semibold leading-snug text-ink-primary">{title}</h3>
          <p className="mt-0.5 text-xs text-ink-muted">Escolha o formato e as cores para reconhecer o medicamento.</p>
        </div>
      </header>
      {children}
    </section>
  );
}

export function MedicationAppearanceColors({ children }: { children: ReactNode }) {
  return (
    <fieldset className="min-w-0 rounded-2xl border border-surface-border/60 bg-void/30 px-3 pb-3">
      <legend className="px-1 text-xs font-semibold text-ink-primary">Cores</legend>
      <p className="mb-3 text-xs leading-relaxed text-ink-muted">
        Selecione até duas cores. Toque novamente para remover ou use o círculo multicolorido para escolher outro tom.
      </p>
      {children}
    </fieldset>
  );
}
