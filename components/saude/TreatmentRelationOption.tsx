"use client";

import { Check } from "lucide-react";
import { TreatmentIdentityIconR03 } from "@/components/saude/TreatmentIdentityR03";
import { treatmentColorR03 } from "@/lib/health-profile/treatment-preferences-r03";
import type { Tratamento } from "@/lib/types";

function treatmentColor(treatment: Tratamento): string {
  return treatmentColorR03(treatment.cor);
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

  return (
    <div className="flex min-w-0 w-full items-center gap-3">
      <span
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border bg-surface-raised"
        style={{ borderColor: `${color}55`, color }}
      >
        <TreatmentIdentityIconR03 entity={treatment} size={18}/>
      </span>
      <span className="min-w-0 flex-1">
        <span className="block break-words text-sm font-semibold leading-snug text-ink-primary">
          {treatment.nome}
        </span>
        <span className="mt-0.5 block break-words text-[11px] leading-snug text-ink-muted">
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
