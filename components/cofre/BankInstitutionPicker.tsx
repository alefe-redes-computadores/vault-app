"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Building2, Check, ChevronDown, Landmark, Search, X } from "lucide-react";
import {
  BANK_INSTITUTIONS,
  normalizeBankName,
  resolveBankInstitution,
} from "@/lib/utils/card-helper";

type BankInstitutionPickerProps = {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  required?: boolean;
};

/**
 * Catálogo local: sem chamadas de rede, sem gravar instituições paralelas.
 * A escolha grava somente bank_name; valores antigos e bancos fora da lista são preservados.
 */
export function BankInstitutionPicker({
  value,
  onChange,
  error,
  required = false,
}: BankInstitutionPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const openerRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const known = useMemo(() => resolveBankInstitution(value), [value]);

  const results = useMemo(() => {
    const needle = normalizeBankName(query);
    const matches = BANK_INSTITUTIONS.filter((bank) =>
      !needle || [bank.code, bank.name, bank.shortName, ...bank.aliases].some((entry) =>
        normalizeBankName(entry).includes(needle)
      )
    );
    return matches.slice(0, 12);
  }, [query]);

  const dismiss = () => {
    setOpen(false);
    openerRef.current?.focus();
  };
  const select = (name: string) => {
    onChange(name.trim());
    dismiss();
  };
  useEffect(() => {
    if (!open) return;
    searchRef.current?.focus();
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        openerRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onEscape);
    return () => document.removeEventListener("keydown", onEscape);
  }, [open]);

  return (
    <div className="space-y-1.5">
      <span className="block text-xs font-semibold text-ink-muted">
        Banco ou instituição {required && <span className="text-coral">*</span>}
      </span>
      <button
        ref={openerRef}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`Selecionar banco, atual: ${value || "nenhum"}`}
        onClick={() => { setQuery(""); setOpen(true); }}
        className={`flex min-h-14 w-full items-center gap-3 rounded-2xl border bg-void/60 px-3.5 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400 ${error ? "border-coral/70" : "border-surface-border hover:border-emerald-300/40"}`}
      >
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-emerald-400/10 text-emerald-300"><Landmark size={18}/></span>
        <span className="min-w-0 flex-1">
          <span className={`block truncate text-sm font-semibold ${value ? "text-ink-primary" : "text-ink-muted"}`}>{value || "Escolher banco"}</span>
          <span className="block truncate text-[11px] text-ink-muted">{value ? known ? `Instituição reconhecida · ${known.code}` : "Banco informado manualmente" : "Pesquisar catálogo ou informar outro"}</span>
        </span>
        <ChevronDown size={18} className="shrink-0 text-ink-muted"/>
      </button>
      {error && <p role="alert" className="text-xs text-coral">{error}</p>}

      {open && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[160] flex items-end justify-center bg-black/75 p-2 pb-[max(12px,env(safe-area-inset-bottom,12px))] backdrop-blur-sm sm:items-center sm:p-5" onMouseDown={(event) => { if (event.target === event.currentTarget) dismiss(); }}>
          <div role="dialog" aria-modal="true" aria-label="Escolha do banco" className="flex max-h-[min(82dvh,760px)] w-full max-w-lg flex-col overflow-hidden rounded-[24px] border border-surface-border bg-surface shadow-2xl">
            <div className="flex items-center justify-between gap-3 border-b border-surface-border/70 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-ink-primary">Escolha seu banco</p>
                <p className="text-[11px] text-ink-muted">Catálogo local · aceita instituição fora da lista</p>
              </div>
              <button type="button" aria-label="Fechar seleção" onClick={dismiss} className="grid size-10 place-items-center rounded-xl border border-surface-border text-ink-muted"><X size={19}/></button>
            </div>
            <label className="mx-4 mt-3 flex min-h-12 items-center gap-2 rounded-xl border border-surface-border bg-void px-3 focus-within:border-emerald-300/50">
              <Search size={17} className="shrink-0 text-ink-muted"/>
              <input ref={searchRef} type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Nome, sigla ou código do banco" aria-label="Pesquisar instituições" className="min-w-0 flex-1 bg-transparent py-3 text-sm text-ink-primary outline-none placeholder:text-ink-muted"/>
            </label>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3">
              <p className="mb-2 px-1 text-[10px] uppercase tracking-widest text-ink-muted">{query ? "Resultados da busca" : "Instituições disponíveis"}</p>
              {results.map((bank) => (
                <button key={bank.code} type="button" onClick={() => select(bank.name)} className="mb-1 flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-emerald-300">
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-emerald-300/10 text-emerald-300"><Building2 size={16}/></span>
                  <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium text-ink-primary">{bank.name}</span><span className="text-[10px] text-ink-muted">{bank.code} · {bank.shortName}</span></span>
                  {normalizeBankName(value) === normalizeBankName(bank.name) && <Check size={17} className="text-emerald-300"/>}
                </button>
              ))}
              {results.length === 0 && <p className="px-3 py-5 text-center text-xs text-ink-muted">Nenhum banco encontrado. Você pode informar o nome manualmente abaixo.</p>}
            </div>
            <div className="border-t border-surface-border/70 bg-void/60 p-3">
              <p className="mb-2 text-[11px] text-ink-muted">Não encontrou? Use o nome que consta no seu cadastro.</p>
              <button type="button" disabled={!query.trim()} onClick={() => select(query)} className="min-h-12 w-full rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-3 text-sm font-semibold text-emerald-200 disabled:cursor-not-allowed disabled:opacity-40">
                {query.trim() ? `Usar “${query.trim().slice(0, 70)}”` : "Digite o nome para informar manualmente"}
              </button>
            </div>
          </div>
        </div>, document.body
      )}
    </div>
  );
}
