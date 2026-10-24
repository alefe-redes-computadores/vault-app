import type { Medicamento, Renovacao, Retirada } from "@/lib/types";
import { isFutureAcquisition, isPrescriptionOnly, renewalEventDate } from "@/lib/health-supply/renewal-event";

export interface MedicationJourneySnapshot {
  prescriptions: number;
  completedAcquisitions: number;
  plannedAcquisitions: number;
  pendingWithdrawals: number;
  overdueWithdrawals: number;
  latestPrescriptionDate: string | null;
  latestAcquisitionDate: string | null;
  nextPlannedAcquisitionDate: string | null;
  nextWithdrawalDate: string | null;
}

const day = (value?: string | null) => value?.slice(0, 10) || "";

function sameOwner(medication: Medicamento, event: Renovacao | Retirada) {
  return event.user_id === medication.user_id &&
    (!event.person_id || !medication.person_id || event.person_id === medication.person_id);
}

/** A receita nunca vira aquisição; futuro nunca vira estoque; retirada aberta continua pendente. */
export function buildMedicationJourneySnapshot(input: {
  medication: Medicamento;
  renewals: readonly Renovacao[];
  withdrawals?: readonly Retirada[];
  today: string;
}): MedicationJourneySnapshot {
  const id = input.medication.id || "";
  const renewals = input.renewals
    .filter(event => event.medicamento_id === id && sameOwner(input.medication, event))
    .sort((a, b) => renewalEventDate(b).localeCompare(renewalEventDate(a)));
  const prescriptions = renewals.filter(event => isPrescriptionOnly(event) && day(renewalEventDate(event)) <= input.today);
  const completed = renewals.filter(event => !isPrescriptionOnly(event) && !isFutureAcquisition(event, input.today));
  const planned = renewals.filter(event => isFutureAcquisition(event, input.today))
    .sort((a, b) => renewalEventDate(a).localeCompare(renewalEventDate(b)));
  const pending = (input.withdrawals || [])
    .filter(event => event.medicamento_id === id && sameOwner(input.medication, event) && event.status === "agendada")
    .sort((a, b) => a.data.localeCompare(b.data));
  return {
    prescriptions: prescriptions.length,
    completedAcquisitions: completed.length,
    plannedAcquisitions: planned.length,
    pendingWithdrawals: pending.length,
    overdueWithdrawals: pending.filter(event => day(event.data) < input.today).length,
    latestPrescriptionDate: prescriptions[0] ? day(renewalEventDate(prescriptions[0])) : null,
    latestAcquisitionDate: completed[0] ? day(renewalEventDate(completed[0])) : null,
    nextPlannedAcquisitionDate: planned[0] ? day(renewalEventDate(planned[0])) : null,
    nextWithdrawalDate: pending[0] ? day(pending[0].data) : null,
  };
}

export function indexMedicationRenewals(renewals: readonly Renovacao[]) {
  const index = new Map<string, Renovacao[]>();
  for (const renewal of renewals) {
    const rows = index.get(renewal.medicamento_id);
    if (rows) rows.push(renewal);
    else index.set(renewal.medicamento_id, [renewal]);
  }
  return index;
}

export function medicationJourneyEvidence(snapshot: MedicationJourneySnapshot) {
  return [
    `${snapshot.prescriptions} receita(s)`,
    `${snapshot.completedAcquisitions} aquisição(ões) realizada(s)`,
    `${snapshot.plannedAcquisitions} aquisição(ões) futura(s)`,
    `${snapshot.pendingWithdrawals} retirada(s) pendente(s)`,
  ];
}

export interface MedicationContinuityPortfolio {
  active: number;
  withHistory: number;
  plannedAcquisitions: number;
  pendingWithdrawals: number;
  overdueWithdrawals: number;
}

export function buildMedicationContinuityPortfolio(input: {
  medications: readonly Medicamento[];
  renewals: readonly Renovacao[];
  withdrawals: readonly Retirada[];
  today: string;
}): MedicationContinuityPortfolio {
  const renewals = indexMedicationRenewals(input.renewals);
  const withdrawals = new Map<string, Retirada[]>();
  for (const withdrawal of input.withdrawals) {
    const rows = withdrawals.get(withdrawal.medicamento_id);
    if (rows) rows.push(withdrawal);
    else withdrawals.set(withdrawal.medicamento_id, [withdrawal]);
  }
  const active = input.medications.filter(medication => medication.id && medication.status !== "descontinuado");
  let withHistory = 0, plannedAcquisitions = 0, pendingWithdrawals = 0, overdueWithdrawals = 0;
  for (const medication of active) {
    const snapshot = buildMedicationJourneySnapshot({
      medication,
      renewals: renewals.get(medication.id!) || [],
      withdrawals: withdrawals.get(medication.id!) || [],
      today: input.today,
    });
    if (snapshot.prescriptions + snapshot.completedAcquisitions + snapshot.pendingWithdrawals > 0) withHistory += 1;
    plannedAcquisitions += snapshot.plannedAcquisitions;
    pendingWithdrawals += snapshot.pendingWithdrawals;
    overdueWithdrawals += snapshot.overdueWithdrawals;
  }
  return { active: active.length, withHistory, plannedAcquisitions, pendingWithdrawals, overdueWithdrawals };
}
