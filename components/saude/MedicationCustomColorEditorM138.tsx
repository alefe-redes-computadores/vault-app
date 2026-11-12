"use client";

import { useState } from "react";
import { Palette } from "lucide-react";
import { normalizeMedicationIdentityHex } from "@/lib/medications/identity-custom-color";

/**
 * Alternativa textual sempre utilizável ao seletor de cor Android já existente.
 * Novo e Editar delegam a mesma autoridade toggleMedicationIdentityColor.
 */
export function MedicationCustomColorEditorM138({colors,onChoose}: {
  colors: readonly string[];
  onChoose: (hex: string) => void;
}) {
  const [draft,setDraft]=useState("");
  const normalized=normalizeMedicationIdentityHex(draft);
  const selected=Boolean(normalized && colors.includes(normalized));
  const apply=()=>{
    if (!normalized || selected) return;
    onChoose(normalized);
    setDraft("");
  };
  return <div className="mt-3 rounded-xl border border-surface-border/60 bg-surface-raised/35 p-3" aria-label="Cor personalizada em hexadecimal">
    <label htmlFor="vault-medication-custom-hex-m138" className="mb-2 flex items-center gap-2 text-xs font-semibold text-ink-primary"><Palette size={14} className="text-emerald-300"/>Cor personalizada por código HEX</label>
    <div className="flex min-w-0 items-center gap-2">
      <input id="vault-medication-custom-hex-m138" type="text" inputMode="text" autoComplete="off" spellCheck={false} maxLength={7}
        value={draft} onChange={event=>setDraft(event.target.value.toUpperCase())}
        onKeyDown={event=>{if(event.key==="Enter"){event.preventDefault();apply();}}}
        placeholder="#000000" aria-invalid={Boolean(draft)&&!normalized}
        className="min-h-11 min-w-0 flex-1 rounded-xl border border-surface-border bg-surface px-3 font-mono text-sm text-ink-primary outline-none placeholder:text-ink-faint focus:border-emerald-300/60"/>
      <span aria-hidden="true" className="size-9 shrink-0 rounded-full border-2 border-white/35" style={{backgroundColor:normalized||"#000000"}}/>
      <button type="button" disabled={!normalized||selected} onClick={apply}
        className="min-h-11 shrink-0 rounded-xl border border-emerald-300/30 bg-emerald-300/10 px-3 text-xs font-bold text-emerald-200 disabled:opacity-45 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-300">Aplicar</button>
    </div>
    {Boolean(draft)&&!normalized&&<p role="alert" className="mt-1.5 text-xs text-amber-200">Digite uma cor válida: #000000, #FACC15 ou #FFF.</p>}
    {selected&&<p role="status" className="mt-1.5 text-xs text-ink-muted">Cor já selecionada. Toque na cor da paleta para removê-la.</p>}
    <p className="mt-2 text-[11px] leading-relaxed text-ink-muted">Se o círculo multicolorido não abrir no Android, digite a cor aqui. Preto é #000000. Você pode combinar duas cores.</p>
  </div>;
}
