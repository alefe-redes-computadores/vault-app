"use client";
import { ChevronRight, FolderHeart, Store } from "lucide-react";

/** Pure secondary links; route authority, Haptics and client-side navigation stay in Home. */
export function HomeSupplyAccessTiles({ onNavigate, withdrawalPath, supplyPath }: {
  onNavigate: (path: string) => void;
  withdrawalPath: string;
  supplyPath: string;
}) {
  return <div className="space-y-2" aria-label="Acessos a retiradas e fornecimento">
    <button type="button" onClick={() => onNavigate(withdrawalPath)}
      className="flex min-h-12 w-full items-center gap-2.5 rounded-xl border border-amber-400/15 bg-amber-400/[0.045] px-3 py-2 text-left transition-colors active:scale-[0.99] motion-reduce:transform-none motion-reduce:transition-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-300">
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-amber-400/10 text-amber-300" aria-hidden="true"><Store size={17}/></span>
      <span className="min-w-0 flex-1"><strong className="block text-[11px] font-semibold text-ink-primary">Retiradas de medicamentos</strong><span className="block text-[10px] text-ink-muted">Programações, locais e histórico de retirada</span></span>
      <ChevronRight size={15} className="shrink-0 text-amber-300" aria-hidden="true"/>
    </button>
    <button type="button" onClick={() => onNavigate(supplyPath)}
      className="flex min-h-12 w-full items-center gap-2.5 rounded-xl border border-surface-border/50 bg-surface/70 px-3 py-2 text-left transition-colors active:scale-[0.99] motion-reduce:transform-none motion-reduce:transition-none focus-visible:outline focus-visible:outline-ice">
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-violet-300/10 text-violet-300" aria-hidden="true"><FolderHeart size={17}/></span>
      <span className="min-w-0 flex-1"><strong className="block text-[11px] font-semibold text-ink-primary">Fornecimento SUS e documentos</strong><span className="block text-[10px] text-ink-muted">Processos, autorizações e renovação</span></span>
      <ChevronRight size={15} className="shrink-0 text-ink-muted" aria-hidden="true"/>
    </button>
  </div>;
}
