"use client";

import { memo } from "react";
import { Factory } from "lucide-react";
import { AvatarMedicamento } from "@/components/ui/AvatarMedicamento";

/** M138: etiqueta visual declarada; fabricante de aquisição mantém sua autoridade histórica. */
export const MedicationIdentityPreview = memo(function MedicationIdentityPreview({
  name, format, colors, laboratorio,
}: {
  name: string;
  format: string;
  colors: string[];
  laboratorio?: string | null;
}) {
  const label = String(laboratorio || "").trim();
  return <div className="mb-5 flex min-w-0 items-center gap-3 rounded-[20px] border border-surface-border/65 bg-gradient-to-r from-surface-raised/55 to-surface/70 p-3.5 shadow-sm sm:p-4" aria-label="Prévia da identidade visual do medicamento">
    <AvatarMedicamento nome={name || "Medicamento"} formato={format} cores={colors} tamanho={14} />
    <div className="min-w-0 flex-1">
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-300">Prévia ao vivo</p>
      <p className="mt-1 break-words text-sm font-semibold leading-snug text-ink-primary">{name || "Medicamento"}</p>
      <p className="mt-1 text-[11px] leading-relaxed text-ink-muted">A identificação visual não modifica o histórico de aquisições.</p>
      {label && <p className="mt-1.5 flex min-w-0 items-center gap-1.5 text-[11px] text-violet-200" title={`Laboratório da etiqueta: ${label}`}><Factory size={13} className="shrink-0" aria-hidden="true"/><span className="min-w-0 truncate">Etiqueta · {label}</span></p>}
      <div className="mt-2 flex flex-wrap gap-1.5" aria-label="Cores selecionadas para este medicamento">
        {colors.filter(color => /^#[0-9a-fA-F]{6}$/.test(color)).slice(0, 2).map((color, index) => <span key={`${color}-${index}`} className="inline-flex min-h-7 items-center gap-1.5 rounded-full border border-surface-border/60 bg-surface px-2 text-[10px] font-medium text-ink-muted" aria-label={`Cor ${index + 1}: ${color}`}><span className="size-4 rounded-full border border-white/25 shadow-sm" style={{backgroundColor:color}} aria-hidden="true"/><span>Cor {index + 1}</span></span>)}
      </div>
    </div>
  </div>;
});
