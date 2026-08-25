// components/list/ListFilters.tsx
"use client";

import { ReactNode } from "react";
import { Filter, X } from "lucide-react";

interface ListFiltersProps {
  /** Botões de filtro (children) */
  children: ReactNode;
  /** Se deve mostrar ícone de filtro (padrão: true) */
  showIcon?: boolean;
  /** Callback para limpar todos os filtros (opcional) */
  onClear?: () => void;
  /** Label do botão de limpar (padrão: "Limpar") */
  clearLabel?: string;
  /** Classes adicionais */
  className?: string;
}

export function ListFilters({
  children,
  showIcon = true,
  onClear,
  clearLabel = "Limpar",
  className = "",
}: ListFiltersProps) {
  return (
    <div className={`mt-3 flex flex-wrap items-center gap-1.5 ${className}`}>
      {showIcon && <Filter size={14} className="text-ink-muted shrink-0" />}
      {children}
      {onClear && (
        <button
          type="button"
          onClick={onClear}
          className="
            text-[10px] font-medium
            text-coral bg-coral/10
            px-2.5 py-1 rounded-full
            flex items-center gap-1
            transition-colors hover:bg-coral/15
            active:scale-95
          "
        >
          <X size={12} /> {clearLabel}
        </button>
      )}
    </div>
  );
}