'use client';
import Link from 'next/link';
import { AlertTriangle, ClipboardList } from 'lucide-react';
import { useRetiradas } from '@/hooks/useRetiradas';
import { useAuth } from '@/hooks/useAuth';
import { useActivePersonId } from '@/hooks/useActivePersonId';
import { withdrawalConflictsM2 } from '@/lib/careflow-m2/withdrawal-coherence';
/** Evidence panel: never deletes/marks a withdrawal or changes inventory. */
export function WithdrawalConflictReviewM2({medicationId}:{medicationId?:string|null}){
  const {retiradas=[]}=useRetiradas(),{user}=useAuth(),{activePersonId}=useActivePersonId();
  const conflicts=withdrawalConflictsM2(retiradas).filter(c=>retiradas.some(row=>
    row.id===c.pendingId&&row.user_id===user?.id&&row.person_id===activePersonId&&(!medicationId||row.medicamento_id===medicationId)));
  if(!conflicts.length)return null;
  return <section aria-label="Conflito de retiradas para conferência" className="space-y-2 rounded-[22px] border border-amber-300/30 bg-amber-300/[.055] p-3.5"><div className="flex items-center gap-2"><AlertTriangle size={17} className="shrink-0 text-amber-300"/><h2 className="text-sm font-bold text-amber-200">Revisar vínculo de retirada</h2></div><p className="text-xs leading-relaxed text-ink-muted">Há agendamento e registro concluído na mesma data e no mesmo ciclo. Não assumimos que sejam dois recebimentos. Confira os documentos antes de registrar uma nova ação.</p>{conflicts.map(c=><div key={c.pendingId} className="rounded-xl border border-amber-300/15 bg-surface p-3"><p className="text-xs font-semibold">{c.date.split('-').reverse().join('/')} · Ciclo {c.cycleId.slice(0,8)}</p><p className="mt-1 text-[11px] text-ink-muted">Agendamento: {c.pendingId.slice(0,8)} · {c.completedIds.length} evento(s) de conclusão associado(s)</p><Link href={`/saude/retiradas/detalhes?id=${encodeURIComponent(c.pendingId)}`} className="mt-2 flex min-h-11 items-center gap-2 rounded-xl border border-amber-300/20 px-3 text-xs font-bold text-amber-200"><ClipboardList size={15}/>Conferir este evento e seus vínculos</Link></div>)}<p className="text-[10px] text-ink-muted">Os eventos continuam no histórico. Nem estoque, nem receitas, nem ciclos foram alterados.</p></section>;
}
