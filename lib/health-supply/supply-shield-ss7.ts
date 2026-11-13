import type { Medicamento, Renovacao } from '@/lib/types';
import { isPrescriptionOnly, isFutureAcquisition, realizedAcquisitionExpense } from '@/lib/health-supply/renewal-event';
import { medicationStockUnitReview } from '@/lib/health-intelligence/medication-presentation-review';
import type { MedicationSupplyRoute } from '@/lib/health-supply/route-authority';

export type SupplyShieldStockState = 'unknown' | 'empty' | 'positive' | 'negative' | 'discontinued';
export type SupplyShieldPriority = 'review' | 'd5' | 'd10' | 'ok' | 'unknown';
export type SupplyShieldMedication = {
  medicationId: string;
  name: string;
  stockState: SupplyShieldStockState;
  quantity: number | null;
  unit: string | null;
  projectedDays: number | null;
  priority: SupplyShieldPriority;
  unitWarning: string | null;
  documentLinked: boolean;
  requiresNewPrescriptionReported: boolean;
  routeMode: MedicationSupplyRoute['mode'];
  routeLabels: string[];
  paid90Days: number;
  paidEvents90Days: number;
  publicEvents90Days: number;
  lastAcquisitionDate: string | null;
};

const calendarDay = (day: string) => /^\d{4}-\d{2}-\d{2}$/.test(day) &&
  Number.isFinite(Date.parse(`${day}T12:00:00Z`)) && new Date(`${day}T12:00:00Z`).toISOString().slice(0, 10) === day;
export function ninetyDayFloorSS7(todayISO: string): string | null {
  if (!calendarDay(todayISO)) return null;
  const d = new Date(`${todayISO}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 90);
  return d.toISOString().slice(0, 10);
}

export function projectStockDaysSS7(med: Medicamento): number | null {
  const qty = med.estoque_quantidade;
  if (med.status === 'descontinuado' || med.tipo_uso !== 'continuo' || typeof qty !== 'number' || !Number.isFinite(qty) || qty < 0) return null;
  const count = new Set(med.estoque_horarios?.filter(x => typeof x === 'string' && /^\d{2}:\d{2}$/.test(x)) || []).size;
  const perDose = med.estoque_unidade_por_dose;
  if (!count || !perDose || !Number.isFinite(perDose) || perDose <= 0 || !med.estoque_unidade_medida?.trim()) return null;
  if (medicationStockUnitReview(med)) return null;
  return Math.floor(qty / (count * perDose));
}

export function buildSupplyShieldMedicationSS7(args: {
  medication: Medicamento;
  renewals: readonly Renovacao[];
  route?: MedicationSupplyRoute;
  userId: string;
  personId: string;
  todayISO: string;
}): SupplyShieldMedication | null {
  const { medication: med, renewals, route, userId, personId, todayISO } = args;
  if (!med.id || !userId || !personId || med.person_id !== personId || med.user_id !== userId || !calendarDay(todayISO)) return null;
  const raw = med.estoque_quantidade;
  const stockState: SupplyShieldStockState = med.status === 'descontinuado' ? 'discontinued' :
    (typeof raw !== 'number' || !Number.isFinite(raw)) ? 'unknown' : raw < 0 ? 'negative' : raw === 0 ? 'empty' : 'positive';
  const warning = medicationStockUnitReview(med);
  const projectedDays = projectStockDaysSS7(med);
  const isActive = med.status !== 'descontinuado';
  const priority: SupplyShieldPriority = !isActive ? 'ok' :
    stockState === 'negative' || Boolean(warning) ? 'review' :
    stockState === 'empty' || (projectedDays !== null && projectedDays <= 5) ? 'd5' :
    projectedDays !== null && projectedDays <= 10 ? 'd10' :
    stockState === 'unknown' || projectedDays === null ? 'unknown' : 'ok';
  const floor = ninetyDayFloorSS7(todayISO);
  let paid90Days = 0;
  let paidEvents90Days = 0;
  let publicEvents90Days = 0;
  let lastAcquisitionDate: string | null = null;
  let requiresNewPrescriptionReported = false;
  for (const r of renewals) {
    if (r.user_id !== userId || r.person_id !== personId || r.medicamento_id !== med.id ||
        isPrescriptionOnly(r) || isFutureAcquisition(r, todayISO)) continue;
    // Historical reception date must be explicit for temporal aggregation.
    const day = r.data_aquisicao || '';
    if (!calendarDay(day) || day > todayISO) continue;
    if (!lastAcquisitionDate || day > lastAcquisitionDate) {
      lastAcquisitionDate = day;
      requiresNewPrescriptionReported = r.exige_nova_receita === true;
    }
    if (!floor || day < floor) continue;
    if (r.tipo_aquisicao === 'comprado') {
      paidEvents90Days++;
      paid90Days += realizedAcquisitionExpense(r, todayISO);
    } else if (r.tipo_aquisicao === 'sus' || r.tipo_aquisicao === 'gratuito') publicEvents90Days++;
  }
  return {
    medicationId: med.id, name: med.nome, stockState,
    quantity: typeof raw === 'number' && Number.isFinite(raw) ? raw : null,
    unit: med.estoque_unidade_medida?.trim() || null,
    projectedDays, priority, unitWarning: warning,
    documentLinked: Boolean(med.document_id?.trim()), requiresNewPrescriptionReported,
    routeMode: route?.mode || 'none', routeLabels: route?.labels || [],
    paid90Days: Math.round(paid90Days * 100) / 100, paidEvents90Days, publicEvents90Days,
    lastAcquisitionDate,
  };
}
export function sortSupplyShieldSS7(rows: SupplyShieldMedication[]): SupplyShieldMedication[] {
  const score: Record<SupplyShieldPriority, number> = { review: 0, d5: 1, d10: 2, unknown: 3, ok: 4 };
  return [...rows].sort((a, b) => score[a.priority] - score[b.priority] || a.name.localeCompare(b.name, 'pt-BR'));
}
