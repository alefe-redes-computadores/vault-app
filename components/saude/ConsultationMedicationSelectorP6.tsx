"use client";
import type { Medicamento } from "@/lib/types";
import { safeConsultationMedicationIdsP6 } from "@/lib/consultations/consultation-medication-evidence-p6";

type Props={owner:{user_id:string;person_id?:string};medications:readonly Medicamento[];selected:readonly string[];onChange:(value:string[])=>void};
export function ConsultationMedicationSelectorP6({owner,medications,selected,onChange}:Props) {
  const available=medications.filter(m=>m.id&&m.user_id===owner.user_id&&m.person_id===owner.person_id);
  const chosen=safeConsultationMedicationIdsP6(selected,owner,available);
  return <section aria-label="Medicamentos vinculados diretamente à consulta" className="rounded-[22px] border border-sky-400/20 bg-sky-400/[.045] p-4">
    <h3 className="text-sm font-bold text-sky-200">Medicamentos desta consulta</h3>
    <p className="mt-1 text-xs leading-relaxed text-ink-muted">Vínculo explícito, separado de tratamentos. Selecione apenas os medicamentos realmente discutidos. Nenhuma dose ou prescrição será alterada.</p>
    <div className="mt-3 max-h-52 space-y-1.5 overflow-y-auto overscroll-contain pr-1">
      {available.map(m=>{const id=m.id!;const checked=chosen.includes(id);return <label key={id} className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border px-3 py-2 ${checked?"border-sky-300/40 bg-sky-300/[.08]":"border-surface-border/40 bg-surface/60"}`}>
        <input type="checkbox" className="size-4 shrink-0 accent-sky-300" checked={checked} onChange={()=>onChange(checked?chosen.filter(x=>x!==id):safeConsultationMedicationIdsP6([...chosen,id],owner,available))}/>
        <span className="min-w-0 text-left"><span className="block break-words text-xs font-semibold text-ink-primary">{m.nome}</span><span className="text-[11px] text-ink-muted">{m.dosagem||"Dosagem não informada"}{m.status==="descontinuado"?" · Suspenso no cadastro (vínculo histórico)":""}</span></span>
      </label>})}
      {!available.length&&<p className="text-xs text-ink-muted">Nenhum medicamento cadastrado para esta pessoa.</p>}
    </div>
    <p role="status" className="mt-2 text-[11px] text-ink-muted">{chosen.length} vínculo{chosen.length===1?"":"s"} explícito{chosen.length===1?"":"s"}</p>
  </section>;
}
