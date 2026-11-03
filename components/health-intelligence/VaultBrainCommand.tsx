"use client";

import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { ArrowUpRight, BrainCircuit, ChevronRight, Search, X } from "lucide-react";
import { VaultBrainVoiceInput } from "@/components/health-intelligence/VaultBrainVoiceInput";
import { searchVaultBrainCommands, type VaultBrainCommandData } from "@/lib/health-intelligence/vault-brain-commands";

/** M44: one discreet entry in the Home header; no second floating assistant. */
export function VaultBrainCommand({ data }: { data: VaultBrainCommandData }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const deferredQuery = useDeferredValue(query);
  const queryBusy = deferredQuery !== query;
  const triggerRef = useRef<HTMLButtonElement>(null);
  const results = useMemo(() => open ? searchVaultBrainCommands(deferredQuery, data) : [], [
    open, deferredQuery, data.userId, data.personId, data.medications, data.documents,
    data.treatments, data.appointments, data.exams, data.renewals,
  ]);

  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [open]);
  useEffect(() => setSelected(0), [query]);
  // Identity change closes the dialog and discards even a partially dictated command.
  useEffect(() => {
    setOpen(false); setQuery(""); setSelected(0);
  }, [data.userId, data.personId]);

  function close() {
    setOpen(false);
    setQuery("");
    setSelected(0);
    requestAnimationFrame(() => triggerRef.current?.focus());
  }
  function navigate(href: string) {
    // Hrefs come exclusively from a fixed local route catalog or encoded record IDs.
    if (!href.startsWith("/") || href.startsWith("//") || href.includes("\\")) return;
    setOpen(false);
    setQuery("");
    setSelected(0);
    router.push(href);
  }

  return <>
    <button ref={triggerRef} type="button" onClick={() => setOpen(true)}
      aria-label="Pesquisar com VAULT Brain" aria-haspopup="dialog" aria-expanded={open}
      className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-surface-border/50 bg-surface text-ink-secondary transition-colors motion-reduce:transition-none hover:border-violet-300/40 hover:text-violet-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-300">
      <Search size={17} aria-hidden="true" />
    </button>
    {open && typeof document !== "undefined" && createPortal(<div className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-black/75 px-3 pb-[max(env(safe-area-inset-bottom),1.5rem)] pt-[max(env(safe-area-inset-top),1rem)] backdrop-blur-sm"
      role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) close(); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="vault-brain-command-title"
        onKeyDown={e => {
          if (e.key === "Escape") { e.preventDefault(); close(); }
          if (e.key !== "Tab") return;
          const focusables = Array.from(e.currentTarget.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled])'));
          const first = focusables[0]; const last = focusables[focusables.length - 1];
          if (e.shiftKey && document.activeElement === first && last) { e.preventDefault(); last.focus(); }
          else if (!e.shiftKey && document.activeElement === last && first) { e.preventDefault(); first.focus(); }
        }}
        className="w-full max-w-lg overflow-hidden rounded-[26px] border border-violet-300/25 bg-void shadow-2xl shadow-black/60">
        <div className="flex items-center justify-between border-b border-surface-border/50 px-4 py-3">
          <div className="flex min-w-0 items-center gap-2 text-violet-200">
            <BrainCircuit size={17} aria-hidden="true" />
            <h2 id="vault-brain-command-title" className="text-xs font-bold tracking-wide">VAULT Brain <span className="font-normal text-ink-muted">· Comandos</span></h2>
          </div>
          <button type="button" onClick={close} aria-label="Fechar Comandos" className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-ink-muted hover:bg-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-300"><X size={18}/></button>
        </div>
        <div className="flex flex-wrap items-center gap-2 px-4 py-3">
          <div className="relative min-w-0 flex-1">
            <Search size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-violet-200" aria-hidden="true" />
            <input ref={inputRef} type="search" autoComplete="off" autoCorrect="off" spellCheck={false}
              aria-label="Pesquisar ou escrever um comando"
              placeholder="Buscar medicamentos, receitas ou navegar…"
              className="h-12 w-full rounded-2xl border border-surface-border/70 bg-surface pl-10 pr-3 text-sm text-ink-primary outline-none placeholder:text-ink-muted focus:border-violet-300/60 focus:ring-2 focus:ring-violet-300/15"
              value={query} maxLength={160} onChange={e => setQuery(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Escape") { e.preventDefault(); close(); }
                else if (e.key === "ArrowDown") { e.preventDefault(); setSelected(i => Math.max(0, Math.min(i + 1, results.length - 1))); }
                else if (e.key === "ArrowUp") { e.preventDefault(); setSelected(i => Math.max(0, i - 1)); }
                else if (e.key === "Enter" && !queryBusy && results[selected]) { e.preventDefault(); navigate(results[selected].href); }
              }}/>
          </div>
          <VaultBrainVoiceInput key={`${data.userId ?? ""}:${data.personId ?? ""}`} onTranscript={text => {
            setQuery(text);
            setSelected(0);
            requestAnimationFrame(() => inputRef.current?.focus());
          }} />
        </div>
        <div className="max-h-[min(52dvh,420px)] overflow-y-auto overscroll-contain px-3 pb-3" aria-live="polite" aria-busy={queryBusy}>
          <p className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-[.14em] text-ink-muted">{queryBusy ? "Atualizando resultados…" : query.trim() ? `${results.length} resultado(s) local(is)` : "Acessos rápidos"}</p>
          {queryBusy ? <p role="status" className="rounded-xl bg-surface/50 px-3 py-4 text-xs text-ink-muted">Buscando no dispositivo…</p> : results.length ? <ul className="space-y-1.5" aria-label="Resultados dos Comandos">{results.map((item, index) => <li key={item.id}>
            <button type="button" onMouseEnter={() => setSelected(index)} onClick={() => { if (!queryBusy) navigate(item.href); }}
              className={`flex min-h-14 w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors motion-reduce:transition-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-300 ${selected === index ? "border-violet-300/30 bg-violet-300/[.08]" : "border-transparent bg-surface/50 hover:bg-surface-raised"}`}>
              <span className="min-w-0 flex-1"><span className="block break-words text-xs font-semibold text-ink-primary">{item.title}</span><span className="mt-0.5 block text-[10px] leading-relaxed text-ink-muted">{item.detail}</span></span>
              {item.kind === "prepare" ? <ArrowUpRight size={15} className="shrink-0 text-violet-200" aria-hidden="true" /> : <ChevronRight size={15} className="shrink-0 text-ink-muted" aria-hidden="true" />}
            </button>
          </li>)}</ul> : <p className="rounded-xl bg-surface/50 px-3 py-5 text-xs text-ink-muted">Não encontrei um destino confiável. Tente o nome do medicamento ou abra a área pela lista.</p>}
        </div>
        <p className="border-t border-surface-border/45 px-5 py-3 text-[10px] leading-relaxed text-ink-muted">Busca local da pessoa selecionada. Nenhum dado é alterado; registros e movimentações exigem confirmação no formulário original.</p>
      </section>
    </div>, document.body)}
  </>;
}
