"use client";
import { ChevronRight, FolderHeart, Store } from "lucide-react";
/** Secondary destinations only; navigation authority and haptics remain in Home. */
export function HomeSupplyAccessTiles({ onNavigate, withdrawalPath, supplyPath }: {
  onNavigate: (path: string) => void;
  withdrawalPath: string;
  supplyPath: string;
}) {
  return <div className="grid min-w-0 grid-cols-1 gap-1.5 min-[420px]:grid-cols-2" aria-label="Acessos a retiradas e fornecimento">
    <button type="button" onClick={() => onNavigate(withdrawalPath)}
      className="flex min-h-[64px] min-w-0 items-center gap-2 rounded-xl border border-amber-300/15 bg-amber-300/[.035] px-2.5 py-2 text-left transition-colors motion-reduce:transition-none active:bg-amber-300/[.085] focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-300">
      <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-amber-300/10 text-amber-200"><Store size={14}/></span>
      <span className="min-w-0 flex-1"><strong className="block text-[11px] font-bold text-ink-primary">Retiradas de medicamentos</strong><span className="block text-[10px] leading-snug text-ink-muted">Datas e histórico</span></span>
      <ChevronRight size={13} className="shrink-0 text-amber-200"/>
    </button>
    <button type="button" onClick={() => onNavigate(supplyPath)}
      className="flex min-h-[64px] min-w-0 items-center gap-2 rounded-xl border border-violet-300/15 bg-violet-300/[.035] px-2.5 py-2 text-left transition-colors motion-reduce:transition-none active:bg-violet-300/[.085] focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-300">
      <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-violet-300/10 text-violet-200"><FolderHeart size={14}/></span>
      <span className="min-w-0 flex-1"><strong className="block text-[11px] font-bold text-ink-primary">Fornecimento SUS e documentos</strong><span className="block text-[10px] leading-snug text-ink-muted">Processos e receitas</span></span>
      <ChevronRight size={13} className="shrink-0 text-violet-200"/>
    </button>
  </div>;
}
