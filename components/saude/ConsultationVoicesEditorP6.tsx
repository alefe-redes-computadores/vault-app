"use client";
type Props={personal:string;professional:string;followUp:string;onPersonal:(v:string)=>void;onProfessional:(v:string)=>void;onFollowUp:(v:string)=>void};
const field="mt-1 w-full min-h-24 resize-y rounded-2xl border border-surface-border/50 bg-surface-raised/50 px-3 py-3 text-sm text-ink-primary outline-none focus-visible:ring-2 focus-visible:ring-sky-300";
export function ConsultationVoicesEditorP6({personal,professional,followUp,onPersonal,onProfessional,onFollowUp}:Props) {
 return <section className="space-y-3 rounded-[22px] border border-surface-border/50 bg-surface p-4" aria-label="Registro antes durante e depois da consulta">
  <div><h3 className="text-sm font-bold text-ink-primary">Antes, durante e depois</h3><p className="mt-1 text-xs text-ink-muted">Três origens diferentes. Preencha apenas o que você sabe; texto não altera automaticamente tratamentos.</p></div>
  <label className="block text-xs font-semibold text-ink-secondary">Minha percepção / dúvidas antes da consulta<textarea className={field} value={personal} maxLength={16000} onChange={e=>onPersonal(e.target.value)} placeholder="O que senti, minhas perguntas, meu relato pessoal…"/></label>
  <label className="block text-xs font-semibold text-ink-secondary">Orientação relatada do profissional<textarea className={field} value={professional} maxLength={16000} onChange={e=>onProfessional(e.target.value)} placeholder="Registre somente a orientação realmente recebida; não equivale a prescrição validada."/></label>
  <label className="block text-xs font-semibold text-ink-secondary">Próximos passos e retorno<textarea className={field} value={followUp} maxLength={16000} onChange={e=>onFollowUp(e.target.value)} placeholder="O que foi combinado para acompanhar ou conferir?"/></label>
 </section>;
}
