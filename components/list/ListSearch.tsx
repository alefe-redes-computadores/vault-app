// components/list/ListSearch.tsx
"use client";

import { useEffect, useRef, useState, useId } from "react";
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
  const inputId = useId();

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
        <button type="button" onClick={() => { focusOnExpand.current=true; setExpanded(true); }} className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-2xl border border-surface-border/60 bg-surface-raised/80 px-3.5 text-ink-secondary shadow-sm transition-all hover:border-ice/40 hover:bg-surface-raised hover:text-ice active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-ice/70" aria-label="Abrir busca" aria-expanded={false}>
          <Search size={15} className="shrink-0" />
          <span className="text-xs font-semibold">Buscar</span>
        </button>
      </div>
    );
  }

  return (
    <div role="search" className={`relative min-w-0 flex-1 ${className}`}>
      <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted" />
      <Input id={inputId} ref={inputRef} aria-label={placeholder} enterKeyHint="search" placeholder={placeholder} value={value} onChange={(event) => onChange(event.target.value)} onKeyDown={(event) => { if (event.key === "Escape") { event.stopPropagation(); if (value && showClear) onChange(""); else setExpanded(false); } }} className="h-11 w-full rounded-2xl border-surface-border/65 bg-surface-raised/80 pl-10 pr-12 text-[13px] shadow-sm focus-visible:ring-2 focus-visible:ring-ice/60" />
      <button type="button" onClick={() => { if (value && showClear) { onChange(""); return; } setExpanded(false); }} className="absolute right-0.5 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-xl text-ink-muted transition-colors hover:bg-surface-raised hover:text-ink-primary active:scale-95 focus-visible:ring-2 focus-visible:ring-ice/70" aria-label={value && showClear ? "Limpar busca" : "Fechar busca"} title={value && showClear ? "Limpar busca" : "Fechar busca"}>
        <X size={14} />
      </button>
    </div>
  );
}
