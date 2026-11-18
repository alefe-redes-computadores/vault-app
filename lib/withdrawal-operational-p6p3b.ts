/** CI360 P6 P3-B: leitura operacional de retiradas; NUNCA altera o evento ou estoque.
 * A autoridade de agendamento aberto e conflitos continua nos motores existentes.
 * Não associa eventos por nome, quantidade de estoque ou datas diferentes.
 */
import type { Retirada } from '@/lib/types';
import { isOpenWithdrawal } from '@/lib/withdrawal-agenda';
import { conflictingWithdrawalM2, withdrawalConflictsM2 } from '@/lib/careflow-m2/withdrawal-coherence';

export type WithdrawalReadStateP6P3B = 'agendada' | 'realizada' | 'realizada_vinculada' | 'revisar' | 'cancelada' | 'nao_realizada';
export type WithdrawalFilterP6P3B = 'todos' | 'hoje' | 'atrasada' | 'revisar' | 'agendada' | 'realizada' | 'cancelada' | 'nao_realizada';

/** Diferencia o status gravado da evidencia de conclusao e de divergencia do ciclo. */
export function withdrawalReadStateP6P3B(row: Retirada, all: readonly Retirada[], conflictIds?: ReadonlySet<string>): WithdrawalReadStateP6P3B {
  const completedEvidence = Boolean(row.realizada_em || row.renovacao_realizada_id);
  if (row.status === 'cancelada' || row.status === 'nao_realizada') {
    // Uma exclusao/desistencia e uma conclusao simultaneas exigem revisao humana.
    return completedEvidence ? 'revisar' : row.status;
  }
  if (row.status === 'realizada') return 'realizada';
  if (completedEvidence) return 'realizada_vinculada';
  if (conflictIds ? Boolean(row.id && conflictIds.has(row.id)) : Boolean(conflictingWithdrawalM2(row, all))) return 'revisar';
  return isOpenWithdrawal(row) ? 'agendada' : 'revisar';
}

/** Um unico passe de conflitos por snapshot; filtros, contagens e cards reutilizam o mapa. */
export function withdrawalReadMapP6P3B(rows: readonly Retirada[]): ReadonlyMap<Retirada, WithdrawalReadStateP6P3B> {
  const conflicted = new Set(withdrawalConflictsM2(rows).map(item => item.pendingId));
  return new Map(rows.map(row => [row, withdrawalReadStateP6P3B(row, rows, conflicted)] as const));
}

export function withdrawalMatchesFilterP6P3B(row: Retirada, rows: readonly Retirada[], today: string, filter: WithdrawalFilterP6P3B, index?: ReadonlyMap<Retirada, WithdrawalReadStateP6P3B>): boolean {
  if (filter === 'todos') return true;
  const state = index?.get(row) ?? withdrawalReadStateP6P3B(row, rows);
  if (filter === 'hoje') return state === 'agendada' && row.data === today;
  if (filter === 'atrasada') return state === 'agendada' && row.data < today;
  if (filter === 'realizada') return state === 'realizada' || state === 'realizada_vinculada';
  return state === filter;
}

export function withdrawalSummaryP6P3B(rows: readonly Retirada[], today: string, index?: ReadonlyMap<Retirada, WithdrawalReadStateP6P3B>) {
  const result = {total: rows.length, hoje: 0, agendadas: 0, atrasadas: 0, realizadas: 0, revisar: 0};
  for (const row of rows) {
    const state = index?.get(row) ?? withdrawalReadStateP6P3B(row, rows);
    if (state === 'revisar') result.revisar++;
    if (state === 'realizada' || state === 'realizada_vinculada') result.realizadas++;
    if (state !== 'agendada') continue;
    result.agendadas++;
    if (row.data === today) result.hoje++;
    else if (row.data < today) result.atrasadas++;
  }
  return result;
}
