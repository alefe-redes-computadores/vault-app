// components/list/ListSearch.tsx
"use client";

import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/Input";

interface ListSearchProps {
  /** Valor da busca */
  value: string;
  /** Callback ao alterar o valor */
  onChange: (value: string) => void;
  /** Placeholder do campo */
  placeholder?: string;
  /** Classes adicionais */
  className?: string;
  /** Se deve mostrar botão de limpar (padrão: true) */
  showClear?: boolean;
}

export function ListSearch({
  value,
  onChange,
  placeholder = "Buscar...",
  className = "",
  showClear = true,
}: ListSearchProps) {
  return (
    <div className={`relative min-w-0 flex-1 ${className}`}>
      <Search
        size={16}
        className="
          pointer-events-none
          absolute left-3.5 top-1/2
          -translate-y-1/2
          text-ink-muted
        "
      />
      <Input
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="
          h-11 w-full
          rounded-2xl
          bg-surface-raised/60
          pl-10
          pr-9
          text-sm
        "
      />
      {showClear && value && (
        <button
          type="button"
          onClick={() => onChange("")}
          className="
            absolute right-3 top-1/2
            -translate-y-1/2
            rounded-full p-1
            text-ink-muted
            transition-colors
            hover:bg-surface-raised
            active:scale-95
          "
          aria-label="Limpar busca"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}