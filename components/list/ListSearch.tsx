// components/list/ListSearch.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/Input";

interface ListSearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  showClear?: boolean;
  initiallyExpanded?: boolean;
}

export function ListSearch({ value, onChange, placeholder = "Buscar...", className = "", showClear = true, initiallyExpanded = false }: ListSearchProps) {
  const [expanded, setExpanded] = useState(initiallyExpanded || Boolean(value));
  const focusOnExpand=useRef(!initiallyExpanded);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => { if (value) setExpanded(true); }, [value]);
  useEffect(() => {
    if (!expanded || !focusOnExpand.current) return;
    const timer = window.setTimeout(() => inputRef.current?.focus(), 40);
    return () => window.clearTimeout(timer);
  }, [expanded]);

  if (!expanded && !value) {
    return (
      <div className={`flex shrink-0 justify-end ${className}`}>
        {/* V334_VISIBLE_SEARCH_TRIGGER: discovery without guessing the magnifier. */}
        <button type="button" onClick={() => { focusOnExpand.current=true; setExpanded(true); }} className="inline-flex min-h-10 shrink-0 items-center justify-center gap-1.5 rounded-xl border border-surface-border/50 bg-surface-raised px-3 text-ink-secondary transition-colors hover:border-ice/30 hover:text-ice active:scale-[0.98]" aria-label="Abrir busca">
          <Search size={15} className="shrink-0" />
          <span className="text-[11px] font-semibold">Buscar</span>
        </button>
      </div>
    );
  }

  return (
    <div role="search" className={`relative min-w-0 flex-1 ${className}`}>
      <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted" />
      <Input ref={inputRef} aria-label={placeholder} enterKeyHint="search" placeholder={placeholder} value={value} onChange={(event) => onChange(event.target.value)} className="h-10 w-full rounded-2xl bg-surface-raised/70 pl-10 pr-10 text-sm" />
      <button type="button" onClick={() => { if (value && showClear) { onChange(""); return; } setExpanded(false); }} className="absolute right-2.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-ink-muted hover:bg-surface-raised active:scale-95" aria-label={value && showClear ? "Limpar busca" : "Fechar busca"}>
        <X size={14} />
      </button>
    </div>
  );
}
