import { Factory, Tag } from "lucide-react";
import { manufacturerIdentity } from "@/lib/medications/manufacturer-experience";
import { recognizedManufacturerM129 } from "@/lib/medications/manufacturer-catalog-m129";

type Source = "etiqueta" | "ultima_aquisicao";
/** Presentation only: declarative label != manufacturer actually recorded in latest acquisition. */
export function MedicationProvenanceBadge({name,source}:{name?:string|null;source:Source}) {
  const raw=(name||"").trim();
  if(!raw)return null;
  const known=recognizedManufacturerM129(raw);
  const identity=known?{label:known.label,color:known.color}:manufacturerIdentity(raw);
  const isAcquisition=source==="ultima_aquisicao";
  const text=isAcquisition?`Últ. aquisição · ${identity.label}`:`Etiqueta · ${identity.label}`;
  return <span className="inline-flex min-h-6 max-w-full items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold leading-snug"
    style={{color:identity.color,borderColor:`${identity.color}55`,backgroundColor:`${identity.color}13`}}
    title={isAcquisition?`Fabricante informado na última aquisição registrada: ${identity.label}. Não identifica automaticamente o estoque físico atual.`:`Laboratório declarado na etiqueta: ${identity.label}. Não comprova fabricação da última aquisição.`}
    aria-label={text}>
    {isAcquisition?<Factory size={12} className="shrink-0" aria-hidden="true"/>:<Tag size={12} className="shrink-0" aria-hidden="true"/>}
    <span className="min-w-0 truncate">{text}</span>
  </span>;
}
