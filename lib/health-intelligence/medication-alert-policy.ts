import type { Medicamento, Retirada } from '@/lib/types';

/** Per-owner, per-medication quiet controls. Only non-clinical reminder surfaces obey these preferences. */
export type MedicationAlertPrefs = { stock: boolean; prescription: boolean };
export const MEDICATION_ALERT_PREF_EVENT = 'vault:medication-alert-prefs-v228';
const PREFIX = 'vault:medication-alert-prefs-v228:';
export const isAsNeededMedication = (med: Pick<Medicamento,'tipo_uso'>) => med.tipo_uso === 'sos' || med.tipo_uso === 'esporadico';
const defaultPreferences = (med: Pick<Medicamento,'tipo_uso'>): MedicationAlertPrefs => ({ stock: !isAsNeededMedication(med), prescription: !isAsNeededMedication(med) });
function scopedKey(med: Pick<Medicamento,'id'|'user_id'|'person_id'>): string | null {
  const uid = med.user_id?.trim(), pid = med.person_id?.trim(), id = med.id?.trim();
  return uid && pid && id ? PREFIX + [uid,pid,id].map(encodeURIComponent).join(':') : null;
}
export function getMedicationAlertPrefs(med: Pick<Medicamento,'id'|'user_id'|'person_id'|'tipo_uso'>): MedicationAlertPrefs {
  const defaults = defaultPreferences(med), key = scopedKey(med);
  if (!key || typeof window === 'undefined') return defaults;
  try {
    const value = JSON.parse(window.localStorage.getItem(key) || 'null') as Partial<MedicationAlertPrefs> | null;
    return { stock: typeof value?.stock === 'boolean' ? value.stock : defaults.stock,
      prescription: typeof value?.prescription === 'boolean' ? value.prescription : defaults.prescription };
  } catch { return defaults; }
}
export function setMedicationAlertPrefs(med: Pick<Medicamento,'id'|'user_id'|'person_id'|'tipo_uso'>, prefs: MedicationAlertPrefs): boolean {
  const key = scopedKey(med);
  if (!key || typeof window === 'undefined') return false;
  try {
    window.localStorage.setItem(key, JSON.stringify({stock: prefs.stock === true, prescription: prefs.prescription === true}));
    window.dispatchEvent(new Event(MEDICATION_ALERT_PREF_EVENT));
    window.dispatchEvent(new Event('vault:notification-preferences-changed'));
    return true;
  } catch { return false; }
}
export type MedicationAlertDecision = {
  showStock: boolean;
  showPrescription: boolean;
  isAsNeeded: boolean;
  withdrawal: Retirada | null;
  withdrawalOverdue: boolean;
  count: number | null;
  focus: 'withdrawal'|'stock'|'prescription'|'none';
  explanation: string;
};
function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y,m,d] = value.split('-').map(Number), t = new Date(Date.UTC(y,m-1,d));
  return t.getUTCFullYear()===y && t.getUTCMonth()===m-1 && t.getUTCDate()===d;
}
/** This is reminder triage, not clinical advice or a change to prescription/stock. */
export function decideMedicationAlerts(input: {
  medication: Medicamento; withdrawals?: Retirada[]; today: string; prefs?: MedicationAlertPrefs;
}): MedicationAlertDecision {
  const {medication: med, today} = input;
  const isAsNeeded = isAsNeededMedication(med);
  const prefs = input.prefs ?? getMedicationAlertPrefs(med);
  const quantity = med.estoque_quantidade;
  const count = typeof quantity === 'number' && Number.isFinite(quantity) ? quantity : null;
  const withdrawal = (input.withdrawals || [])
    .filter(row=>row.id && row.status === 'agendada' && row.medicamento_id === med.id && row.person_id === med.person_id && row.user_id === med.user_id && validDate(row.data))
    .sort((a,b)=>a.data.localeCompare(b.data) || (a.horario || '').localeCompare(b.horario || ''))[0] ?? null;
  const withdrawalOverdue = Boolean(withdrawal && validDate(today) && withdrawal.data < today);
  const noStock = count !== null && count <= 0;
  // An already overdue withdrawal is the primary operational decision.  Never hide
  // a genuinely empty stock for a scheduled medication behind an overdue appointment.
  const manualDue = med.lembrete_receita_modo === 'data_personalizada' &&
    Boolean(med.lembrete_receita_data && validDate(med.lembrete_receita_data) && validDate(today) && med.lembrete_receita_data <= today);
  // Saldo negativo denuncia inconsistência cadastral mesmo com lembrete SOS desligado.
  const showStock = (prefs.stock || (count !== null && count < 0)) && (!withdrawalOverdue || (!isAsNeeded && noStock) || (count !== null && count < 0));
  const showPrescription = prefs.prescription && !withdrawal && !(isAsNeeded && count !== null && count > 0 && !manualDue);
  const focus = withdrawalOverdue ? 'withdrawal' as const : showStock && noStock ? 'stock' as const : showPrescription ? 'prescription' as const : 'none' as const;
  const units = count === null ? 'Estoque não informado.' : `Estoque registrado: ${count} unidade(s).`;
  const explanation = withdrawalOverdue
    ? `Retirada agendada em ${withdrawal!.data} ainda não concluída. Abra esse compromisso para reagendar ou encerrar. ${units} Nenhuma aquisição ou receita foi criada.`
    : withdrawal
      ? `Retirada agendada para ${withdrawal.data}. ${units} A retirada só aumenta estoque depois de confirmada.`
      : isAsNeeded && count !== null && count > 0
        ? `Medicamento de uso conforme necessidade, com ${count} unidade(s) registradas. Não é possível prever autonomia em dias para SOS.`
        : units;
  return {showStock,showPrescription,isAsNeeded,withdrawal,withdrawalOverdue,count,focus,explanation};
}
