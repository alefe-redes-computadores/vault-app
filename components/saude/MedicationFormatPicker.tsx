"use client";

import { CheckCircle2, Package } from "lucide-react";
import {
  MEDICATION_ADDITIONAL_FORMATS,
  MEDICATION_PRIMARY_FORMATS,
} from "@/lib/medications/form-presentation";

/** M7: painel visual compartilhado entre Novo e Editar.
 * Sem estado, banco, side effects, alterações de dose ou de estoque.
 */
export function MedicationFormatPicker({
  selectedFormat,
  onSelect,
  onMore,
  columns = 4,
}: {
  selectedFormat: string;
  onSelect: (id: string) => void;
  onMore: () => void;
  columns?: 3 | 4;
}) {
  const other = MEDICATION_ADDITIONAL_FORMATS.find(item => item.id === selectedFormat);
  const base = "relative flex min-h-16 min-w-0 flex-col items-center justify-center gap-1.5 rounded-2xl border px-1.5 py-2.5 text-center transition-[color,background-color,border-color,transform] active:scale-[0.97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300 motion-reduce:transform-none motion-reduce:transition-none";
  const selected = "border-emerald-300/50 bg-emerald-300/[.10] text-emerald-100";
  const unselected = "border-surface-border/45 bg-surface-raised text-ink-muted hover:border-emerald-300/20";
  return (
    <div
      className={`mb-5 grid gap-2 ${columns === 3 ? "grid-cols-3" : "grid-cols-3 min-[380px]:grid-cols-4"}`}
      role="group"
      aria-label="Formato do medicamento"
    >
      {MEDICATION_PRIMARY_FORMATS.map(item => {
        const isActive = selectedFormat === item.id;
        const Icon = item.icon;
        return (
          <button
            type="button"
            key={item.id}
            onClick={() => onSelect(item.id)}
            aria-pressed={isActive}
            aria-label={`Formato: ${item.label}`}
            className={`${base} ${isActive ? selected : unselected}`}
          >
            <Icon size={20} aria-hidden="true" fill={isActive ? "currentColor" : "none"} stroke={isActive ? "none" : "currentColor"}/>
            {isActive && <CheckCircle2 size={12} className="absolute right-1.5 top-1.5" aria-hidden="true" />}
            <span className="max-w-full break-words text-[10px] font-semibold leading-tight">{item.label}</span>
          </button>
        );
      })}
      <button
        type="button"
        onClick={onMore}
        aria-pressed={Boolean(other)}
        aria-label={other ? `Mais formatos: ${other.label}` : "Selecionar outro formato"}
        className={`${base} ${other ? selected : unselected}`}
      >
        <Package size={20} aria-hidden="true"/>
        {other && <CheckCircle2 size={12} className="absolute right-1.5 top-1.5" aria-hidden="true" />}
        <span className="max-w-full break-words text-[10px] font-semibold leading-tight">{other?.label ?? "Mais formatos"}</span>
      </button>
    </div>
  );
}
