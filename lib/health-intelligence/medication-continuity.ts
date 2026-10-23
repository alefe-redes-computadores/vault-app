import type { Medicamento, Renovacao } from "@/lib/types";
import { isFutureAcquisition, isPrescriptionOnly, renewalEventDate } from "@/lib/health-supply/renewal-event";

/** Read-only classification of prescription, completed acquisition and future planning.
 *  Never changes stock, clinical data or the persisted event chronology.
 */
export interface MedicationContinuity {
  prescriptions: number;
  acquisitions: number;
  plannedAcquisitions: number;
  latestRecorded: Renovacao | null;
  nextPlanned: Renovacao | null;
}

function sameOwner(event: Renovacao, medication: Medicamento): boolean {
  // Legacy events without person_id keep working only under the same user.
  return event.medicamento_id === medication.id && event.user_id === medication.user_id &&
    (!event.person_id || !medication.person_id || event.person_id === medication.person_id);
}

export function summarizeMedicationContinuity(
  medication: Medicamento,
  events: readonly Renovacao[],
  todayISO: string,
): MedicationContinuity {
  const result: MedicationContinuity = {
    prescriptions: 0,
    acquisitions: 0,
    plannedAcquisitions: 0,
    latestRecorded: null,
    nextPlanned: null,
  };
  if (!medication.id || !/^\d{4}-\d{2}-\d{2}$/.test(todayISO)) return result;
  for (const event of events) {
    if (!sameOwner(event, medication)) continue;
    const date = renewalEventDate(event);
    if (isPrescriptionOnly(event)) {
      // Future-dated prescription-only records are not evidence of issue today.
      if (date.slice(0, 10) > todayISO) continue;
      result.prescriptions++;
    } else if (isFutureAcquisition(event, todayISO)) {
      result.plannedAcquisitions++;
      if (!result.nextPlanned || date < renewalEventDate(result.nextPlanned)) {
        result.nextPlanned = event;
      }
      continue;
    } else {
      result.acquisitions++;
    }
    if (!result.latestRecorded || date > renewalEventDate(result.latestRecorded)) {
      result.latestRecorded = event;
    }
  }
  return result;
}

/** Patient-facing copy never reports a planned purchase as obtained stock. */
export function continuityEvidenceMessage(summary: MedicationContinuity): string | null {
  if (summary.plannedAcquisitions > 0) {
    return summary.acquisitions === 0
      ? "Há aquisição planejada, mas nenhuma aquisição realizada registrada neste histórico. O planejamento não confirma entrada no estoque."
      : "Há uma aquisição futura planejada. Ela ainda não representa reposição recebida nem gasto realizado.";
  }
  if (summary.prescriptions > 0 && summary.acquisitions === 0) {
    return "Há receita registrada, mas nenhuma aquisição realizada registrada neste histórico.";
  }
  return null;
}
