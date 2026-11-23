import {BookOpenCheck,ShieldAlert} from 'lucide-react';
import type {Medicamento} from '@/lib/types';
import {localPharmaProvenanceA10} from '@/lib/a10/regulatory-p4e';
/** P4-E audit surface: local snapshot ONLY. Never attests that Anvisa approved a product. */
export function PharmaLensProvenanceA10({medication,scopeKey}:{medication:Medicamento;scopeKey:string}){
 if(!medication.id||!medication.user_id||!medication.person_id||scopeKey!==`${medication.user_id}:${medication.person_id}`)return null;
 const current=localPharmaProvenanceA10(medication.catalog_snapshot);
 return <section aria-label="Rastreabilidade do catálogo" className="rounded-2xl border border-emerald-300/20 bg-surface p-3 space-y-2">
   <h3 className="flex items-center gap-2 text-xs font-bold"><BookOpenCheck size={17} className="text-emerald-300"/> Proveniência farmacêutica</h3>
   <p className="text-xs text-ink-secondary">{current.detail}</p>
   <p className="flex items-start gap-2 text-[11px] leading-relaxed text-ink-muted"><ShieldAlert size={16} className="mt-0.5 shrink-0 text-amber-300"/> Informações de nome, fabricante, apresentação, lote, bula e registro regulatório exigem verificação da fonte e revisão humana. Esta leitura não confirma a situação vigente na Anvisa, não altera estoque, dose ou prescrição e não aprova OCR.</p>
 </section>;
}
