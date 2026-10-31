"use client";

import { Info, PackageCheck } from "lucide-react";
import type { Medicamento } from "@/lib/types";
import { MedicationFormatIcon } from "@/components/saude/MedicationFormatIcon";

type Props = { medicamento?: Medicamento | null; quantity: string };

/** Read-only confirmation: a number of boxes is not a number of loose units. */
export function MedicationAcquisitionQuantityGuide({ medicamento, quantity }: Props) {
  const n = Number(quantity.trim().replace(",", "."));
  const informed = quantity.trim().length > 0 && Number.isFinite(n) && n > 0;
  const unit = medicamento?.estoque_unidade_medida?.trim() || "unidade(s) do estoque";
  return (
    <aside aria-label="Conferir quantidade adquirida antes de salvar" className="mt-2 rounded-xl border border-ice/20 bg-ice/[0.035] px-3 py-2.5">
      <div className="flex items-center gap-2">
        {medicamento ? (
          <span className="grid size-9 shrink-0 place-items-center rounded-lg border border-surface-border/50 bg-surface" aria-hidden="true">
            <MedicationFormatIcon formato={medicamento.formato} cores={medicamento.cores} size={20}/>
          </span>
        ) : <PackageCheck size={17} className="shrink-0 text-ice" aria-hidden="true"/>}
        <div className="min-w-0 flex-1">
          <strong className="block truncate text-xs text-ink-primary">{medicamento?.nome || "Quantidade recebida"}</strong>
          <p className="text-[11px] leading-snug text-ink-muted">
            {informed ? `${n.toLocaleString("pt-BR")} ${unit} informada(s) para o saldo` : "Informe a quantidade que realmente entrou no estoque"}
          </p>
        </div>
      </div>
      <div className="mt-2 flex items-start gap-1.5 border-t border-surface-border/30 pt-2">
        <Info size={13} className="mt-0.5 shrink-0 text-ice" aria-hidden="true" />
        <p className="text-[11px] leading-relaxed text-ink-muted">
          Se recebeu caixas, confira quantas {unit} elas representam. Não presuma que 1 caixa equivale a 1 unidade; o VAULT não faz essa conversão sem informação cadastrada.
        </p>
      </div>
    </aside>
  );
}
