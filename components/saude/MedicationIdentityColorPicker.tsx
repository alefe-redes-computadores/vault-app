"use client";

import { MEDICATION_IDENTITY_COLORS } from "@/lib/medications/form-presentation";

/** M7: paleta acessível única para edição e criação.
 * A regra canônica de até duas cores permanece em toggleMedicationIdentityColor
 * nas páginas; este componente nunca persiste nem limita cores por conta própria.
 */
export function MedicationIdentityColorPicker({
  colors,
  onToggleColor,
  density = "regular",
}: {
  colors: readonly string[];
  onToggleColor: (color: string) => void;
  density?: "regular" | "compact";
}) {
  return (
    <div className={`flex flex-wrap ${density === "compact" ? "gap-2.5" : "gap-3"}`} aria-label="Cores do medicamento">
      {MEDICATION_IDENTITY_COLORS.map(hex => {
        const active = colors.includes(hex);
        return (
          <button
            type="button"
            key={hex}
            onClick={() => onToggleColor(hex)}
            aria-label={`Selecionar cor ${hex}`}
            aria-pressed={active}
            className={`h-9 w-9 shrink-0 rounded-full border-[3px] transition-[transform,border-color,box-shadow] active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300 motion-reduce:transform-none ${active ? "scale-105 border-emerald-300 shadow-[0_0_0_1px_rgba(0,0,0,.25)]" : "border-surface-border/25"}`}
            style={{ backgroundColor: hex }}
          />
        );
      })}
      <label
        className="relative flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-full border-[3px] border-surface-border/70 focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-emerald-300"
        style={{ background: "conic-gradient(#ef4444,#f97316,#facc15,#22c55e,#22d3ee,#3b82f6,#8b5cf6,#ec4899,#ef4444)" }}
        aria-label="Escolher cor personalizada"
        title="Cor personalizada"
      >
        <span aria-hidden="true" className="flex h-4 w-4 items-center justify-center rounded-full bg-void/85 text-[11px] font-bold text-white">+</span>
        <input type="color" className="absolute inset-0 h-full w-full cursor-pointer opacity-0" aria-label="Cor personalizada do medicamento" onChange={event => onToggleColor(event.target.value.toUpperCase())}/>
      </label>
    </div>
  );
}
