import type { HealthInsightContext } from "@/lib/health-insights";
import type { BrainCarePlan } from "./care-plan";
import type { CareReadinessPortfolio } from "./care-readiness";
import { temporaryCourseSummaries } from "./temporary-course-insights";

export type MedicationPortfolio = {
  active: number;
  continuous: number;
  temporary: number;
  asNeeded: number;
  needsAction: number;
  planned: number;
  temporaryCoursesOpen: number;
  temporaryDosesOpen: number;
  routes: { public: number; private: number; hybrid: number; unknown: number };
  nextTemporaryCourse: { medicationId: string; name: string; through: string; open: number } | null;
  note: string;
};

/**
 * Read-only medication portfolio shared by list, Brain and Avatar. It only
 * summarizes facts already loaded in HealthInsightContext and never turns a
 * plan into an acquisition, a public route or a completed dose.
 */
export function buildMedicationPortfolio(
  context: HealthInsightContext,
  plan: BrainCarePlan,
  readiness: CareReadinessPortfolio,
): MedicationPortfolio {
  const active = context.medicamentos.filter(med => med.id && med.person_id === context.personId && med.status !== "descontinuado");
  const courses = temporaryCourseSummaries(context);
  // P9: o Brain pode ter planos históricos; o card dos ativos só conta
  // medicamentos ativos da pessoa atual, nunca ações de outra pessoa/suspensos.
  const activeMedicationIds = new Set(active.map(med => med.id!));
  const actionMedicationIds = new Set(plan.items
    .filter(item => item.medicationId && activeMedicationIds.has(item.medicationId) && (item.lane === "now" || item.lane === "prepare"))
    .map(item => item.medicationId!));
  const plannedMedicationIds = new Set(plan.items
    .filter(item => item.medicationId && activeMedicationIds.has(item.medicationId) && item.lane === "discuss")
    .map(item => item.medicationId!));
  const routes = { public: 0, private: 0, hybrid: 0, unknown: 0 };
  for (const item of readiness.items) {
    if (item.route.mode === "public") routes.public += 1;
    else if (item.route.mode === "private") routes.private += 1;
    else if (item.route.mode === "hybrid") routes.hybrid += 1;
    else routes.unknown += 1;
  }
  const nextCourse = [...courses].sort((a, b) => a.through.localeCompare(b.through))[0];
  return {
    active: active.length,
    continuous: active.filter(med => med.tipo_uso === "continuo").length,
    temporary: active.filter(med => med.tipo_uso === "temporario").length,
    asNeeded: active.filter(med => med.tipo_uso === "sos" || med.tipo_uso === "esporadico").length,
    needsAction: actionMedicationIds.size,
    planned: plannedMedicationIds.size,
    temporaryCoursesOpen: courses.length,
    temporaryDosesOpen: courses.reduce((sum, course) => sum + course.pending + course.overdue, 0),
    routes,
    nextTemporaryCourse: nextCourse ? {
      medicationId: nextCourse.medicamentoId,
      name: nextCourse.nome,
      through: nextCourse.through,
      open: nextCourse.pending + nextCourse.overdue,
    } : null,
    note: "Dose, receita, aquisição e retirada permanecem autoridades independentes; ausência de registro não é falha clínica.",
  };
}
