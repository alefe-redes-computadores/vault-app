// components/list/ListFilters.tsx
"use client";

import { ReactNode, useEffect, useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";

interface ListFiltersProps {
  children: ReactNode;
  showIcon?: boolean;
  onClear?: () => void;
  clearLabel?: string;
  className?: string;
  activeCount?: number;
  title?: string;
}

export function ListFilters({ children, showIcon = true, onClear, clearLabel = "Limpar", className = "", activeCount = 0, title = "Filtros" }: ListFiltersProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [open]);

  return (
    <div className={`shrink-0 ${className}`}>
      <button type="button" onClick={() => setOpen(true)} aria-expanded={open} className={`relative flex h-10 w-10 items-center justify-center rounded-full border transition-all active:scale-95 ${activeCount > 0 ? "border-ice/40 bg-ice/12 text-ice" : "border-surface-border/50 bg-surface-raised text-ink-muted hover:border-ice/30 hover:text-ice"}`} aria-label="Abrir filtros">
        {showIcon && <SlidersHorizontal size={17} />}
        {activeCount > 0 && <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-ice px-1 font-mono text-[9px] font-bold text-void">{activeCount}</span>}
      </button>

      {open && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center" role="dialog" aria-modal="true" aria-label={title}>
          <button type="button" className="absolute inset-0 bg-black/65 backdrop-blur-sm" onClick={() => setOpen(false)} aria-label="Fechar filtros" />
          <div className="relative z-10 w-full max-w-lg rounded-t-[28px] border border-b-0 border-surface-border/60 bg-surface px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 shadow-2xl">
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-surface-border" />
            <div className="flex items-center justify-between gap-3">
              <div><p className="text-sm font-semibold text-ink-primary">{title}</p><p className="text-[10px] text-ink-muted">Escolha os critérios e aplique</p></div>
              <button type="button" onClick={() => setOpen(false)} className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-raised text-ink-muted active:scale-95" aria-label="Fechar"><X size={16} /></button>
            </div>
            <div className="mt-4 flex max-h-[55vh] flex-wrap items-center gap-2 overflow-y-auto rounded-2xl border border-surface-border/40 bg-void/25 p-3">{children}</div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button type="button" onClick={() => onClear?.()} disabled={!onClear} className="min-h-11 rounded-2xl border border-surface-border bg-surface-raised text-xs font-semibold text-ink-muted disabled:opacity-40">{clearLabel}</button>
              <button type="button" onClick={() => setOpen(false)} className="min-h-11 rounded-2xl bg-ice text-xs font-bold text-void">Aplicar filtros</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
