import { Factory, Tag } from "lucide-react";
import { manufacturerIdentity } from "@/lib/medications/manufacturer-experience";
import { recognizedManufacturerM129 } from "@/lib/medications/manufacturer-catalog-m129";

type Source = "etiqueta" | "ultima_aquisicao";
/**
 * M149 — visual comum, nome curto como na etiqueta compacta já existente.
 * Origem fica no ícone, tooltip e aria-label, nunca é inferida.
 * Nenhuma marca aqui prova a fabricante das embalagens físicas em uso.
 */
export function MedicationProvenanceBadge({ name, source }: { name?: string | null; source: Source }) {
  const raw = (name || "").trim();
  if (!raw) return null;
  const recognized = recognizedManufacturerM129(raw);
  const identity = recognized
    ? { label: recognized.label, color: recognized.color }
    : manufacturerIdentity(raw);
  const latest = source==="ultima_aquisicao";
  const detail = latest
    ? `Fabricante informado na última aquisição registrada: ${identity.label}. Não identifica automaticamente o estoque físico atual.`
    : `Laboratório declarado na etiqueta cadastrada: ${identity.label}. Não comprova fabricação da última aquisição.`;
  const Icon = latest ? Factory : Tag;

  return (
    <span
      data-provenance={source}
      title={detail}
      aria-label={detail}
      className="inline-flex min-h-6 max-w-full items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold leading-snug"
      style={{ color: identity.color, borderColor: `${identity.color}55`, backgroundColor: `${identity.color}13` }}
    >
      <Icon size={12} className="shrink-0" style={{ color: identity.color }} aria-hidden="true" />
      <span className="min-w-0 truncate">{identity.label}</span>
    </span>
  );
}
