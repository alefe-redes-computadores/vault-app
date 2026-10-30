"use client";

import { memo } from "react";
import { AvatarMedicamento } from "@/components/ui/AvatarMedicamento";

export const MedicationIdentityPreview = memo(function MedicationIdentityPreview({
  name,
  format,
  colors,
}: {
  name: string;
  format: string;
  colors: string[];
}) {
  return <div className="mb-5 flex items-center gap-3 rounded-2xl border border-surface-border/45 bg-void/35 p-3" aria-label="Prévia da identidade visual do medicamento">
    <AvatarMedicamento nome={name || "Medicamento"} formato={format} cores={colors} tamanho={14} />
    <div className="min-w-0 flex-1">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ice/80">Prévia ao vivo</p>
      <p className="mt-1 break-words text-sm font-semibold leading-snug text-ink-primary">{name || "Medicamento"}</p>
      <p className="mt-0.5 text-[10px] text-ink-muted">Formato e cores exatamente como aparecerão no Vault.</p>
    </div>
  </div>;
});
