"use client";

import { AlertTriangle } from "lucide-react";

type Props = {
  canonicalName: string;
  formatCanBeChecked: boolean;
  formatMatches: boolean;
  mode: "create" | "edit";
};

/** M8: somente apresenta a evidência do catálogo. Não valida, persiste ou
 * altera o formato selecionado e não bloqueia cadastros manuais. */
export function MedicationCatalogFormatNotice({ canonicalName, formatCanBeChecked, formatMatches, mode }: Props) {
  if (!formatCanBeChecked) {
    return <p className="mb-4 text-[10px] leading-relaxed text-ink-faint">{mode === "create"
      ? "O catálogo ainda não possui informação suficiente para confirmar o formato deste produto."
      : "O catálogo ainda não possui evidência atual suficiente para confirmar este formato."}</p>;
  }
  if (formatMatches) return null;
  return <div className="mb-4 flex items-start gap-2 rounded-2xl border border-amber-400/25 bg-amber-400/10 px-3.5 py-3" role="status">
    <AlertTriangle size={15} className="mt-0.5 shrink-0 text-amber-400" aria-hidden="true"/>
    <div>
      <p className="text-xs font-semibold text-ink-primary">Formato não encontrado nas apresentações consultadas</p>
      <p className="mt-1 text-[11px] leading-relaxed text-ink-muted">
        {mode === "create" ? "O formato selecionado não apareceu entre as formas/apresentações encontradas para " : "O formato selecionado não apareceu entre as informações oficiais encontradas para "}
        <strong>{canonicalName}</strong>
        {mode === "create" ? ". Você pode manter o formato e cadastrar normalmente." : ". Você pode manter esse formato e salvar normalmente."}
      </p>
    </div>
  </div>;
}
