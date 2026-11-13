import type { ProcessedMed } from '@/lib/health-insights';
import { medicationCareStageNeedsAttention, type MedicationCareStage } from '@/lib/health-intelligence/medication-care-decision';
export type DayDoseLogM143 = { medicamento_id:string; horario?:string; tomado_em?:string; ignorado_em?:string; dose_kind?:string };
const clock = (value: string) => /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);
/** A future scheduled dose is not late; a completed dose is never counted as pending. */
export function medicationListAttentionReasonsM143(
  item: ProcessedMed, stage: MedicationCareStage, lane: string | undefined,
  logs: readonly DayDoseLogM143[], now: string
): string[] {
  if (item.isSuspenso || item.isSOS) return [];
  const result:string[] = [];
  if (medicationCareStageNeedsAttention(stage)) {
    result.push(stage==='withdrawal_overdue'?'Retirada atrasada':
      stage==='prescription_needed'?'Receita a conferir':
      stage==='acquisition_needed'?'Reposição necessária':'Estoque a revisar');
  }
  if (lane==='now') result.push('Prioridade atual do Brain');
  if (item.dosesIgnoradasHoje>0) result.push('Dose ignorada para revisar');
  if (clock(now) && item.dosesPendentesHoje>0 && item.med.id) {
    const own=logs.filter(log=>log.medicamento_id===item.med.id);
    const hours=item.med.tipo_uso==='temporario'
      ? own.filter(log=>log.dose_kind==='planned').map(log=>log.horario||'')
      : (item.med.estoque_horarios||[]);
    const overdue=hours.some(hour=>clock(hour) && hour<now &&
      !own.some(log=>log.horario===hour && (log.tomado_em || log.ignorado_em)));
    if (overdue) result.push('Dose do horário já vencido');
  }
  return result;
}

/** Earliest unconfirmed future slot today; never logs a dose or changes stock. */
export function medicationNextPendingClockM143(
  med: { id?:string; tipo_uso?:string; estoque_horarios?:string[] },
  logs: readonly DayDoseLogM143[], now: string
): string | null {
  if (!med.id || !clock(now) || med.tipo_uso==='sos' || med.tipo_uso==='esporadico') return null;
  const own=logs.filter(log=>log.medicamento_id===med.id);
  const configured=med.tipo_uso==='temporario'
    ? own.filter(log=>log.dose_kind==='planned').map(log=>log.horario||'')
    : med.estoque_horarios || [];
  return [...new Set(configured)].filter(hour=>clock(hour) && hour>now &&
    !own.some(log=>log.horario===hour && (log.tomado_em || log.ignorado_em))).sort()[0]||null;
}
