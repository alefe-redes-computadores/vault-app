"use client";
import { ChevronRight, FileText, Network, ReceiptText } from "lucide-react";

type Props = {
  gastoMes: number;
  diferencaMes: number;
  totalRede: number;
  documentPath: string;
  purchasePath: string;
  networkPath: string;
  networkTone: string;
  onNavigate: (path: string) => void;
};

/** Pure organization shortcuts. No queries, writes or independent navigation. */
export function HomeCareOrganizationTiles({ gastoMes, diferencaMes, totalRede, documentPath, purchasePath, networkPath, networkTone, onNavigate }: Props) {
  const money = (value: number) => Number.isFinite(value) ? value.toFixed(2).replace(".", ",") : "—";
  const spending = money(gastoMes);
  const delta = Number.isFinite(diferencaMes) && diferencaMes !== 0
    ? ` · ${diferencaMes > 0 ? "+" : "-"} R$ ${money(Math.abs(diferencaMes))}`
    : "";
  const networkCount = Number.isFinite(totalRede) ? Math.max(0, Math.floor(totalRede)) : 0;
  const base = "flex min-h-14 w-full items-center gap-3 p-3 text-left transition-colors hover:bg-surface-raised/70 active:scale-[0.995] motion-reduce:transform-none motion-reduce:transition-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-ice";
  return <div className="overflow-hidden rounded-2xl border border-surface-border/60 bg-surface" aria-label="Acessos de organização do cuidado">
    <button type="button" onClick={() => onNavigate(documentPath)} className={`${base} border-b border-surface-border/50`}>
      <FileText size={18} className="shrink-0 text-amber-300" aria-hidden="true"/>
      <span className="min-w-0 flex-1"><strong className="block text-xs text-ink-primary">Documentos de saúde</strong><span className="block text-[10px] leading-snug text-ink-muted">Receitas, exames, laudos e acervo clínico</span></span>
      <ChevronRight size={16} className="shrink-0 text-ink-faint" aria-hidden="true"/>
    </button>
    <button type="button" onClick={() => onNavigate(purchasePath)} className={`${base} border-b border-surface-border/50`}>
      <ReceiptText size={18} className="shrink-0 text-emerald-400" aria-hidden="true"/>
      <span className="min-w-0 flex-1"><strong className="block text-xs text-ink-primary">Compras de medicamentos</strong><span className="block text-[10px] leading-snug text-ink-muted">R$ {spending} no mês{delta}</span></span>
      <ChevronRight size={16} className="shrink-0 text-ink-faint" aria-hidden="true"/>
    </button>
    <button type="button" onClick={() => onNavigate(networkPath)} className={base}>
      <Network size={18} className={`shrink-0 ${networkTone}`} aria-hidden="true"/>
      <span className="min-w-0 flex-1"><strong className="block text-xs text-ink-primary">Sua rede</strong><span className="block text-[10px] leading-snug text-ink-muted">{networkCount} profissionais e locais cadastrados</span></span>
      <ChevronRight size={16} className="shrink-0 text-ink-faint" aria-hidden="true"/>
    </button>
  </div>;
}
