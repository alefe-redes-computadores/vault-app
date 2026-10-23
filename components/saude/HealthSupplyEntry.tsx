"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ChevronRight, ClipboardList, FolderHeart } from "lucide-react";
import { useHealthSupply } from "@/hooks/useHealthSupply";
import { SUPPLY_ORIGIN_LABELS } from "@/lib/health-supply/types";

/** V222 — cartão relacional compacto: uma consulta local, sem gravação ou inferência clínica. */
export function HealthSupplyEntry({
  medicamentoId,
  retiradaId,
}: {
  medicamentoId: string;
  retiradaId?: string;
}) {
  const { data, loading } = useHealthSupply();
  const summary = useMemo(() => {
    const relatedItems = data.itens.filter(item => item.medicamento_id === medicamentoId);
    const processIds = new Set(relatedItems.map(item => item.processo_id));
    const cycleIds = new Set(relatedItems.map(item => item.ciclo_id));
    const processes = data.processos.filter(process =>
      process.status === "ativo" && processIds.has(process.id)
    );
    const activeProcessIds = new Set(processes.map(process => process.id));
    const cycles = data.ciclos.filter(cycle =>
      activeProcessIds.has(cycle.processo_id) && cycleIds.has(cycle.id) && cycle.status !== "encerrado"
    );
    const origins = [...new Set(processes.map(process => SUPPLY_ORIGIN_LABELS[process.origem]))];
    return {
      processes: processes.length,
      preparing: cycles.filter(cycle => cycle.status === "preparando").length,
      protocolled: cycles.filter(cycle => cycle.status === "protocolado").length,
      authorized: cycles.filter(cycle => cycle.status === "autorizado").length,
      origins,
    };
  }, [data.itens, data.processos, data.ciclos, medicamentoId]);

  const href = `/saude/fornecimento?medicamento_id=${encodeURIComponent(medicamentoId)}${
    retiradaId ? `&retirada_id=${encodeURIComponent(retiradaId)}` : ""
  }`;
  const needsPreparation = summary.preparing > 0;

  return (
    <section aria-label="Fornecimento e documentos do medicamento" className="rounded-2xl border border-surface-border bg-surface p-3.5">
      <div className="flex items-start gap-2.5">
        <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-300">
          <FolderHeart size={17} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
            <h2 className="text-sm font-semibold text-ink-primary">Fornecimento e documentos</h2>
            {!loading && summary.processes > 0 && (
              <span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-2 py-0.5 text-[10px] font-medium text-emerald-200">
                {summary.processes} {summary.processes === 1 ? "processo" : "processos"}
              </span>
            )}
          </div>
          <p className="mt-1 text-xs leading-relaxed text-ink-muted">
            {loading
              ? "Conferindo vínculos locais…"
              : summary.processes
                ? summary.origins.join(" · ")
                : "Nenhum processo ativo vinculado. Organize a origem e os documentos deste medicamento."}
          </p>
          {!loading && summary.processes > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5" aria-label="Situação dos ciclos vinculados">
              {needsPreparation && (
                <span className="rounded-md bg-amber-400/10 px-2 py-1 text-[10px] font-medium text-amber-200">
                  {summary.preparing} {summary.preparing === 1 ? "ciclo em preparação" : "ciclos em preparação"}
                </span>
              )}
              {summary.protocolled > 0 && (
                <span className="rounded-md bg-violet-400/10 px-2 py-1 text-[10px] font-medium text-violet-200">
                  {summary.protocolled} {summary.protocolled === 1 ? "protocolado" : "protocolados"}
                </span>
              )}
              {summary.authorized > 0 && (
                <span className="rounded-md bg-emerald-400/10 px-2 py-1 text-[10px] font-medium text-emerald-200">
                  {summary.authorized} {summary.authorized === 1 ? "autorizado" : "autorizados"}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
      <Link
        href={href}
        aria-label={retiradaId ? "Preparar documentos da retirada" : "Organizar fornecimento do medicamento"}
        className="mt-3 flex min-h-11 items-center gap-2 rounded-xl border border-surface-border bg-surface-raised px-3 text-xs font-semibold text-ink-primary transition-colors hover:border-emerald-300/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-300"
      >
        <ClipboardList size={15} className="shrink-0 text-emerald-300" />
        <span className="min-w-0 flex-1">{retiradaId ? "Preparar documentos da retirada" : "Organizar fornecimento"}</span>
        <ChevronRight size={15} className="shrink-0 text-ink-muted" />
      </Link>
    </section>
  );
}
