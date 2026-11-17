'use client';
import { useLiveQuery } from 'dexie-react-hooks';
import { useRouter } from 'next/navigation';
import { CalendarDays, ChevronRight } from 'lucide-react';
import { db } from '@/lib/db';
import { useAuth } from '@/hooks/useAuth';
import { useActivePersonId } from '@/hooks/useActivePersonId';
import type { Medicamento } from '@/lib/types';
import { consultationTimelineForMedicationP6P2 } from '@/lib/consultations/consultation-timeline-p6p2';

/** Consulta inversa pelo ID explícito da consulta. Sem heurísticas por nome/data. */
export function MedicationConsultationTimelineP6P2({medication}:{medication:Medicamento}) {
  const router = useRouter();
  const {user} = useAuth();
  const {activePersonId} = useActivePersonId();
  const userId = user?.id || '', personId = activePersonId || '';
  const scope = `${userId}:${personId}`;
  const allowed = Boolean(medication.id && medication.user_id === userId && medication.person_id === personId && userId && personId);
  const value = useLiveQuery(async () => {
    if (!allowed) return {scope,rows:[]};
    const consultations = await db.consultas.where('person_id').equals(personId).toArray();
    return {scope,rows:consultationTimelineForMedicationP6P2(medication,consultations)};
  },[allowed,scope,medication.id,medication.user_id,medication.person_id]);
  if (!allowed || !value || value.scope !== scope || !value.rows.length) return null;
  const from = `/saude/medicamentos/detalhes?id=${encodeURIComponent(medication.id!)}`;
  return <section aria-label="Consultas vinculadas a este medicamento" className="vault-deferred space-y-3 rounded-[22px] border border-sky-300/20 bg-sky-300/[.045] p-4">
    <div className="flex items-start gap-3"><CalendarDays size={18} className="mt-0.5 shrink-0 text-sky-300"/><div><h3 className="text-sm font-semibold text-ink-primary">Consultas relacionadas</h3><p className="mt-1 text-xs text-ink-muted">Somente vínculos confirmados na consulta. Eventos com a mesma data não são associados automaticamente.</p></div></div>
    <div className="space-y-2">{value.rows.map(c => <button key={c.id} type="button" onClick={()=>router.push(`/saude/consultas/detalhes?id=${encodeURIComponent(c.id)}&return_to=${encodeURIComponent(from)}`)} className="flex min-h-11 w-full items-center gap-2 rounded-xl border border-surface-border/40 bg-surface px-3 py-2 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-300">
      <span className="min-w-0 flex-1"><span className="block text-xs font-semibold text-ink-primary">{c.physician} · {c.date.split('-').reverse().join('/')}</span><span className="block text-[11px] text-ink-muted">{c.specialty} · {c.status === 'realizada'?'Realizada':c.status==='agendada'?'Agendada':'Cancelada'}</span></span><ChevronRight size={16} className="shrink-0 text-sky-300"/>
    </button>)}</div>
    <p className="text-[11px] text-ink-muted">Origem: vínculo de medicamento explícito, no titular atual. Não altera doses nem tratamentos.</p>
  </section>;
}
