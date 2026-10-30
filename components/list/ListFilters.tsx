// components/list/ListFilters.tsx
"use client";

import { ReactNode, useEffect, useRef, useState } from "react";
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
  const triggerRef = useRef<HTMLButtonElement>(null);
  const clearRef = useRef<HTMLButtonElement>(null);
  const applyRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const frame = window.requestAnimationFrame(() => {
      if (onClear) clearRef.current?.focus({ preventScroll: true });
      else applyRef.current?.focus({ preventScroll: true });
    });
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); setOpen(false); return; }
      if (event.key !== "Tab") return;
      const focusable = Array.from(panelRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])') ?? []);
      if (!focusable.length) return;
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("keydown", onEscape);
      window.cancelAnimationFrame(frame);
      document.body.style.overflow = previous;
      // Devolver o foco após fechar o bottom sheet, inclusive por Escape.
      if (triggerRef.current?.isConnected) triggerRef.current.focus({ preventScroll: true });
    };
  }, [open]);

  return (
    <div className={`shrink-0 ${className}`}>
      {/* V334_VISIBLE_FILTER_TRIGGER: text never disappears on narrow phones. */}
      <button ref={triggerRef} type="button" onClick={() => setOpen(true)} aria-expanded={open} aria-haspopup="dialog" className={`relative inline-flex min-h-10 shrink-0 items-center justify-center gap-1.5 rounded-xl border px-3 text-[11px] font-semibold transition-colors active:scale-[0.98] ${activeCount > 0 ? "border-ice/40 bg-ice/12 text-ice" : "border-surface-border/50 bg-surface-raised text-ink-secondary hover:border-ice/30 hover:text-ice"}`} aria-label={`Abrir filtros${activeCount > 0 ? ` · ${activeCount} ativo${activeCount === 1 ? "" : "s"}` : ""}`}>
        {showIcon && <SlidersHorizontal size={15} className="shrink-0" />}
        <span>Filtros</span>
        {activeCount > 0 && <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-ice px-1 font-mono text-[9px] font-bold text-void" aria-hidden="true">{activeCount}</span>}
      </button>

      {open && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center" role="dialog" aria-modal="true" aria-label={title}>
          <button type="button" className="absolute inset-0 bg-black/65 backdrop-blur-sm" onClick={() => setOpen(false)} aria-label="Fechar filtros" />
          <div ref={panelRef} className="relative z-10 w-full max-w-lg max-h-[min(88dvh,calc(100dvh-env(safe-area-inset-top,0px)))] overflow-y-auto overscroll-contain rounded-t-[28px] border border-b-0 border-surface-border/60 bg-surface px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 shadow-2xl">
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-surface-border" />
            <div className="flex items-center justify-between gap-3">
              <div><p className="text-sm font-semibold text-ink-primary">{title}</p><p className="text-[10px] text-ink-muted">{activeCount > 0 ? `${activeCount} critério${activeCount === 1 ? "" : "s"} ativo${activeCount === 1 ? "" : "s"}` : "Escolha os critérios e aplique"}</p></div>
              <button type="button" onClick={() => setOpen(false)} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-surface-raised text-ink-muted active:scale-95" aria-label="Fechar"><X size={16} /></button>
            </div>
            <div className="mt-4 flex max-h-[55dvh] min-w-0 flex-wrap items-center gap-2 overflow-y-auto rounded-2xl border border-surface-border/40 bg-void/25 p-3">{children}</div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {onClear ? <button ref={clearRef} type="button" onClick={onClear} className="min-h-11 rounded-xl border border-surface-border bg-surface-raised text-xs font-semibold text-ink-muted">{clearLabel}</button> : null}
              <button ref={applyRef} type="button" onClick={() => setOpen(false)} className={`min-h-11 rounded-xl bg-ice text-xs font-bold text-void ${onClear ? "" : "col-span-2"}`}>Aplicar filtros</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
