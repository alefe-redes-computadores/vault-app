"use client";
import { AlertTriangle, CheckCircle2, ShieldCheck } from "lucide-react";
import type { TemporaryCourseRevisionPreviewP5 } from "@/lib/clinical/temporary-course-revision-p5";

/** Apresentação, sem autoridade sobre DoseLogs. O salvamento confirma as mesmas regras. */
export function TemporaryCourseRevisionPreviewP5({ preview, acknowledged, onAcknowledge }: {
  preview: TemporaryCourseRevisionPreviewP5 | null;
  acknowledged: boolean;
  onAcknowledge: (value: boolean) => void;
}) {
  if (!preview) return null;
  const risk = preview.cancelled > 0;
  return <section role="region" aria-label="Impacto da edição do planejamento" className="space-y-3 rounded-[18px] border border-sky-300/20 bg-sky-300/[.035] p-3.5">
    <div className="flex items-center gap-2"><ShieldCheck size={18} className="text-sky-300"/><h3 className="text-sm font-bold text-ink-primary">Antes de salvar sua edição</h3></div>
    <p className="text-xs leading-relaxed text-ink-secondary">Conferência dos agendamentos desta pessoa e deste medicamento. Não registra doses nem altera estoque.</p>
    <div className="grid grid-cols-2 gap-2 text-xs min-[390px]:grid-cols-3">
      {[{label:"Mantidos",value:preview.kept},{label:"Novos",value:preview.created},{label:"Retirados do plano",value:preview.cancelled},{label:"Histórico protegido",value:preview.settledPreserved}].map(item => <div key={item.label} className="rounded-xl border border-surface-border/50 bg-surface/70 p-2.5"><p className="text-[11px] text-ink-muted">{item.label}</p><strong className="mt-1 block font-mono text-lg font-bold text-ink-primary">{item.value}</strong></div>)}
    </div>
    {preview.removedSlots.length > 0 && <div className="rounded-xl border border-amber-300/25 bg-amber-300/[.035] p-3 text-xs text-ink-secondary">
      <p className="mb-2 font-semibold text-amber-200">Horários em aberto que sairão do plano</p>
      <ul className="flex max-h-40 flex-wrap gap-1.5 overflow-y-auto">{preview.removedSlots.map(item => <li key={item} className="rounded-lg bg-void/40 px-2.5 py-1.5 font-mono text-[11px]">{item.slice(8,10)}/{item.slice(5,7)} às {item.slice(11)}</li>)}</ul>
    </div>}
    {preview.addedSlots.length > 0 && <div className="text-[11px] text-ink-muted">Próximos horários novos: {preview.addedSlots.slice(0,3).map(item => `${item.slice(8,10)}/${item.slice(5,7)} ${item.slice(11)}`).join(" · ")}{preview.addedSlots.length>3 ? ` e mais ${preview.addedSlots.length-3}` : ""}.</div>}
    {preview.protectedSlots.length > 0 && <p className="text-[11px] leading-relaxed text-emerald-200">Eventos confirmados/ignorados não serão apagados nem terão a origem reescrita. Podem continuar agrupados sob a nota anterior no histórico D4.</p>}
    {preview.conflicts.length > 0 && <div role="alert" className="space-y-1 rounded-xl border border-coral/30 bg-coral/[.06] p-3 text-xs text-coral"><div className="flex items-center gap-2 font-semibold"><AlertTriangle size={15}/>Conflitos: a edição será bloqueada até conferir</div>{preview.conflicts.map((message,index) => <p key={`${index}-${message}`}>{message}</p>)}</div>}
    {risk && <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border border-amber-300/25 bg-amber-300/[.055] p-3 text-xs leading-relaxed text-ink-primary">
      <input type="checkbox" checked={acknowledged} onChange={event => onAcknowledge(event.target.checked)} className="size-5 shrink-0 accent-amber-300" aria-label="Conferi os agendamentos que serão removidos do plano"/>
      <span>Conferi os {preview.cancelled} horário(s) ainda em aberto que sairão do planejamento. Tomadas e doses ignoradas já registradas serão preservadas.</span>
    </label>}
    {!risk && preview.conflicts.length===0 && <p className="flex items-center gap-2 text-xs text-emerald-200"><CheckCircle2 size={15}/>Nenhum agendamento em aberto será removido.</p>}
    <p className="text-[11px] leading-relaxed text-ink-muted">A prévia não autoriza alterar a prescrição. Quantidade e vínculos de agendamentos mantidos também serão reconciliados pela autoridade canônica ao salvar.</p>
  </section>;
}
