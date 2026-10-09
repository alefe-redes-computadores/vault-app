"use client";
import Link from "next/link";
import { FolderHeart, ChevronRight } from "lucide-react";
import { useHealthSupply } from "@/hooks/useHealthSupply";
import { SUPPLY_ORIGIN_LABELS } from "@/lib/health-supply/types";
export function HealthSupplyEntry({
  medicamentoId,
  retiradaId,
}: {
  medicamentoId: string;
  retiradaId?: string;
}) {
  const { data } = useHealthSupply();
  const processes = data.processos.filter(
    (p) =>
      p.status === "ativo" &&
      data.itens.some(
        (i) => i.processo_id === p.id && i.medicamento_id === medicamentoId,
      ),
  );
  return (
    <div className="rounded-[24px] border border-surface-border bg-surface p-4">
      <div className="flex items-center gap-2 text-ink-primary">
        <FolderHeart size={17} />
        <h2 className="text-sm font-bold">Fornecimento e documentos</h2>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-ink-muted">
        {processes.length
          ? processes.map((p) => SUPPLY_ORIGIN_LABELS[p.origem]).join(" · ")
          : "Organize a origem, as autorizações e os documentos deste medicamento."}
      </p>
      <Link
        href={`/saude/fornecimento?medicamento_id=${encodeURIComponent(medicamentoId)}${retiradaId ? `&retirada_id=${encodeURIComponent(retiradaId)}` : ""}`}
        className="mt-3 flex items-center justify-between rounded-2xl bg-surface-raised p-3 text-xs font-bold text-ink-primary"
      >
        {retiradaId
          ? "Preparar documentos da retirada"
          : "Organizar fornecimento"}
        <ChevronRight size={16} />
      </Link>
    </div>
  );
}
