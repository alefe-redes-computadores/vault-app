import type { DoseLog, Medicamento } from "@/lib/types";
import { TEMPORARY_COURSE_PREFIX } from "@/lib/health-supply/temporary-course";

export type DosePlanOrigin = "continuous" | "temporary_course" | "ad_hoc" | "sos" | "extra" | "unknown";

/** Planned is a storage kind, not proof of a temporary prescription. */
export function isTemporaryCoursePlannedDose(log: Pick<DoseLog, "dose_kind" | "motivo"> | null | undefined): boolean {
  return log?.dose_kind === "planned" && typeof log.motivo === "string" && log.motivo.startsWith(TEMPORARY_COURSE_PREFIX);
}
export function classifyPlannedDose(log: Pick<DoseLog, "dose_kind" | "motivo"> | null | undefined): DosePlanOrigin {
  if (!log) return "unknown";
  if (log.dose_kind === "sos") return "sos";
  if (log.dose_kind === "extra") return "extra";
  if (log.dose_kind === "planned") return isTemporaryCoursePlannedDose(log) ? "temporary_course" : log.motivo?.trim() ? "ad_hoc" : "unknown";
  return log.dose_kind === "scheduled" ? "continuous" : "unknown";
}

/** Quantity is attached to the selected slot. No default of one tablet/drop. */
export function contextualDoseQuantity(
  medication: Pick<Medicamento, "estoque_unidade_por_dose"> | null | undefined,
  log?: Pick<DoseLog, "quantidade"> | null,
): number | null {
  const values = [log?.quantidade, medication?.estoque_unidade_por_dose];
  for (const value of values) if (typeof value === "number" && Number.isFinite(value) && value > 0) return value;
  return null;
}

export function plannedDosePresentation(log: Pick<DoseLog, "dose_kind" | "motivo"> | undefined) {
  const origin = classifyPlannedDose(log);
  return origin === "temporary_course" ? "Por período" : origin === "ad_hoc" ? "Avulsa agendada" : "Agendamento a conferir";
}
