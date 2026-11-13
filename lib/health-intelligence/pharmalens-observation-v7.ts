/**
 * PL7-P2 — janela observacional por aquisição, sem inferir efeito do fabricante.
 * Sem horários de ingestão/repouso confiáveis, NÃO relaciona biometria a picos.
 * Não faz diagnóstico, não classifica risco e não altera conduta clínica.
 */
import type { DoseLog, Medicamento, RegistroSaude } from '@/lib/types';
import type { PharmaLensReportV7, PharmaLensCycleV7 } from './pharmalens-v7';

export type PharmaLensObservationV7 = {
  acquisitionId: string;
  manufacturer: string | null;
  from: string | null;
  through: string | null;
  observedDays: number;
  takenScheduled: number;
  takenRescue: number;
  explicitlyIgnored: number;
  /** De outras medicações contínuas; NÃO é diagnóstico de abstinência. */
  concomitantIgnoredDays: number;
  confirmedOtherStockGapDays: number;
  healthRecordDays: number;
  healthConnectRecordDays: number;
  sleepRecordDays: number;
  heartRateRecordDays: number;
  missingStart: boolean;
  limitations: readonly string[];
};

export type PharmaLensObservationsV7 = {
  entries: readonly PharmaLensObservationV7[];
  rangeDays: 7 | 30;
  referenceDay: string;
};

export type PharmaLensObservationInputV7 = {
  report: PharmaLensReportV7;
  userId: string;
  personId: string;
  medicationId: string;
  medications: readonly Medicamento[];
  doseLogs: readonly DoseLog[];
  healthRecords: readonly RegistroSaude[];
  rangeDays: 7 | 30;
  todayISO: string;
};

const isoDay = (s: unknown): s is string => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) &&
  !Number.isNaN(new Date(`${s}T12:00:00Z`).getTime()) && new Date(`${s}T12:00:00Z`).toISOString().slice(0,10) === s;

function offsetDay(s: string, delta: number) {
  const time = new Date(`${s}T12:00:00Z`);
  time.setUTCDate(time.getUTCDate() + delta);
  return time.toISOString().slice(0, 10);
}
function dateInRange(day: string, start: string, end: string) { return day >= start && day <= end; }
function dedupe<T extends { id?: string }>(rows: readonly T[]): T[] {
  const seen = new Set<string>();
  return rows.filter((row, index) => {
    const k = row.id || `no-id-${index}`;
    if (seen.has(k)) return false;
    seen.add(k); return true;
  });
}

export function buildPharmaLensObservationsV7(input: PharmaLensObservationInputV7): PharmaLensObservationsV7 {
  const { report, userId, personId, medicationId, rangeDays, todayISO } = input;
  const empty = { entries: [] as PharmaLensObservationV7[], rangeDays, referenceDay: todayISO };
  if (!userId || !personId || !medicationId || report.medicationId !== medicationId ||
    !isoDay(todayISO) || (rangeDays !== 7 && rangeDays !== 30)) return empty;
  const medicines = new Map<string, Medicamento>(input.medications.filter(m => m.id && m.user_id === userId && m.person_id === personId).map(m => [m.id!, m] as const));
  const logs = dedupe(input.doseLogs.filter(l => l.user_id === userId && l.person_id === personId && isoDay(l.data)));
  const records = dedupe(input.healthRecords.filter(r => r.user_id === userId && r.person_id === personId && isoDay(r.data)));
  const starts = report.cycles.filter(c => isoDay(c.startedAt)).map(c => ({ id: c.acquisitionId, day: c.startedAt! }));
  const periodFloor = offsetDay(todayISO, -(rangeDays - 1));

  function forCycle(cycle: PharmaLensCycleV7): PharmaLensObservationV7 {
    const from = isoDay(cycle.startedAt) && cycle.startedAt <= todayISO ? cycle.startedAt : null;
    const next = from ? starts.filter(s => s.id !== cycle.acquisitionId && s.day > from).sort((a,b) => a.day.localeCompare(b.day))[0] : undefined;
    const naturalEnd = next ? offsetDay(next.day, -1) : todayISO;
    const through = from ? (naturalEnd < todayISO ? naturalEnd : todayISO) : null;
    const first = from && from > periodFloor ? from : periodFloor;
    const validInterval = Boolean(from && through && first <= through);
    const inThisPeriod = (day: string) => validInterval && dateInRange(day, first, through!);
    // User may record overlapping product starts. Ambiguous same-day manufacturer
    // switches should be identified as a coverage limitation, not assigned to both.
    const sharedStart = from && starts.some(s => s.id !== cycle.acquisitionId && s.day === from);
    const realInterval = validInterval && !sharedStart;
    const relevant = realInterval ? logs.filter(l => inThisPeriod(l.data)) : [];
    const own = relevant.filter(l => l.medicamento_id === medicationId);
    const otherContinuous = relevant.filter(l => l.medicamento_id !== medicationId &&
      medicines.get(l.medicamento_id)?.tipo_uso === 'continuo' && l.ignorado_em && !l.tomado_em);
    const otherGap = otherContinuous.filter(l => l.motivo === 'sem_estoque');
    const health = realInterval ? records.filter(r => inThisPeriod(r.data)) : [];
    const limitations: string[] = [];
    if (!from) limitations.push('Início do produto não confirmado; sem vínculo temporal dos registros.');
    if (sharedStart) limitations.push('Duas aquisições têm a mesma data declarada de início; período ambíguo.');
    if (from && !validInterval) limitations.push('Produto fora da janela selecionada.');
    if (otherContinuous.length) limitations.push('Há doses explicitamente ignoradas de outro tratamento contínuo no período.');
    if (!health.length) limitations.push('Sem registros biométricos ou de rotina documentados nesta janela.');
    limitations.push('Não são conhecidas a relação farmacocinética, a aderência completa nem a causa de mudanças percebidas.');
    const healthDays = new Set(health.map(r => r.data));
    return {
      acquisitionId: cycle.acquisitionId, manufacturer: cycle.manufacturer,
      from: realInterval ? first : null, through: realInterval ? through : null,
      observedDays: realInterval ? Math.round((Date.parse(through!+'T12:00:00Z') - Date.parse(first+'T12:00:00Z')) / 86400000) + 1 : 0,
      takenScheduled: own.filter(l => Boolean(l.tomado_em) && l.dose_kind !== 'sos' && l.dose_kind !== 'extra').length,
      takenRescue: own.filter(l => Boolean(l.tomado_em) && (l.dose_kind === 'sos' || l.dose_kind === 'extra')).length,
      explicitlyIgnored: own.filter(l => Boolean(l.ignorado_em) && !l.tomado_em).length,
      concomitantIgnoredDays: new Set(otherContinuous.map(l => l.data)).size,
      confirmedOtherStockGapDays: new Set(otherGap.map(l => l.data)).size,
      healthRecordDays: healthDays.size,
      healthConnectRecordDays: health.filter(r => r.source === 'health_connect').length,
      sleepRecordDays: new Set(health.filter(r => r.tipo === 'sono' || r.registro_chave === 'sono').map(r => r.data)).size,
      heartRateRecordDays: new Set(health.filter(r => r.tipo === 'frequencia_cardiaca' || r.registro_chave === 'frequencia_cardiaca').map(r => r.data)).size,
      missingStart: !from,
      limitations,
    };
  }
  return { entries: report.cycles.map(forCycle), rangeDays, referenceDay: todayISO };
}
