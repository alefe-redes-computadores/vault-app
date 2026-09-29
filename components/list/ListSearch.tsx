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
}

export function ListSearch({
  value,
  onChange,
  placeholder = "Buscar...",
  className = "",
  showClear = true,
}: ListSearchProps) {
  const [expanded, setExpanded] = useState(Boolean(value));
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (value) {
      setExpanded(true);
    }
  }, [value]);

  useEffect(() => {
    if (!expanded) return;

    const timer = window.setTimeout(() => {
      inputRef.current?.focus();
    }, 40);

    return () => {
      window.clearTimeout(timer);
    };
  }, [expanded]);

  if (!expanded && !value) {
    return (
      <div className={`flex justify-end ${className}`}>
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="inline-flex h-10 items-center gap-2 rounded-2xl border border-surface-border/50 bg-surface-raised/70 px-3 text-xs font-semibold text-ink-muted transition-all active:scale-95"
          aria-label="Abrir busca"
        >
          <Search size={15} />
          <span>Buscar</span>
        </button>
      </div>
    );
  }

  return (
    <div className={`relative min-w-0 flex-1 ${className}`}>
      <Search
        size={15}
        className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted"
      />

      <Input
        ref={inputRef}
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full rounded-2xl bg-surface-raised/60 pl-10 pr-10 text-sm"
      />

      <button
        type="button"
        onClick={() => {
          if (value && showClear) {
            onChange("");
            return;
          }

          setExpanded(false);
        }}
        className="absolute right-2.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-surface-raised active:scale-95"
        aria-label={
          value && showClear
            ? "Limpar busca"
            : "Fechar busca"
        }
      >
        <X size={14} />
      </button>
    </div>
  );
}
