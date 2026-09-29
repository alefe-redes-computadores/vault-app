"use client";

import { ReactNode, useState } from "react";
import {
  ChevronDown,
  Filter,
  X,
} from "lucide-react";

interface ListFiltersProps {
  children: ReactNode;
  showIcon?: boolean;
  onClear?: () => void;
  clearLabel?: string;
  className?: string;
}

export function ListFilters({
  children,
  showIcon = true,
  onClear,
  clearLabel = "Limpar",
  className = "",
}: ListFiltersProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className={`mt-2 ${className}`}>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          className="inline-flex h-9 items-center gap-2 rounded-xl border border-surface-border/50 bg-surface-raised/65 px-3 text-[11px] font-semibold text-ink-muted active:scale-95"
        >
          {showIcon && <Filter size={13} />}

          Filtros

          <ChevronDown
            size={13}
            className={`transition-transform ${
              open ? "rotate-180" : ""
            }`}
          />
        </button>

        {onClear && (
          <button
            type="button"
            onClick={onClear}
            className="inline-flex h-9 items-center gap-1 rounded-xl border border-coral/15 bg-coral/[0.06] px-2.5 text-[10px] font-medium text-coral active:scale-95"
          >
            <X size={12} />
            {clearLabel}
          </button>
        )}
      </div>

      {open && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5 rounded-2xl border border-surface-border/40 bg-surface/80 p-2.5">
          {children}
        </div>
      )}
    </div>
  );
}
