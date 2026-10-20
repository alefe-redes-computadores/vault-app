"use client";

import { Check } from "lucide-react";
import { getClinicalTheme } from "@/lib/health-utils";
import { getVaultTreatmentIcon } from "@/lib/health-profile/treatment-icon";
import type { Tratamento } from "@/lib/types";

function treatmentColor(treatment: Tratamento): string {
  return /^#[0-9a-f]{6}$/i.test(treatment.cor || "")
    ? treatment.cor!
    : getClinicalTheme(treatment.nome).hex;
}

function statusLabel(status?: string): string {
  if (status === "ativo") return "Em acompanhamento";
  if (status === "concluido") return "Concluído";
  if (status === "suspenso") return "Suspenso";
  return status?.trim() || "Situação não informada";
}

/** Canonical relational presentation: real treatment identity, color and status. */
export function TreatmentRelationOption({
  treatment,
  selected,
}: {
  treatment: Tratamento;
  selected: boolean;
}) {
  const color = treatmentColor(treatment);
  const Icon = getVaultTreatmentIcon(treatment.nome);

  return (
    <div className="flex min-w-0 w-full items-center gap-3">
      <span
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border bg-surface-raised"
        style={{ borderColor: `${color}55`, color }}
      >
        <Icon size={18} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-ink-primary">
          {treatment.nome}
        </span>
        <span className="mt-0.5 block truncate text-[10px] text-ink-muted">
          {statusLabel(treatment.status)}
          {treatment.condicao ? ` · ${treatment.condicao}` : ""}
        </span>
      </span>
      {selected ? (
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border" style={{ borderColor: `${color}66`, color, backgroundColor: `${color}16` }}>
          <Check size={15} />
        </span>
      ) : null}
    </div>
  );
}
