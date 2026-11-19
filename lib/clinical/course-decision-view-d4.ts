/** D4 P2 — Leitura pura do histórico declarado. Não é motor clínico. */
import type { CourseDecisionD4, MedicationClinicalContextM1 } from "@/lib/clinical/episode-m1";
export function latestCourseDecisionD4(context: MedicationClinicalContextM1 | null | undefined, courseKey: string): CourseDecisionD4 | null {
  const entries = context?.decisoes_d4;
  if (!courseKey || !Array.isArray(entries)) return null;
  for (let i = entries.length - 1; i >= 0; i--) {
    const entry = entries[i];
    if (entry && entry.course_key === courseKey &&
        (entry.tipo === "conclusao_relatada" || entry.tipo === "interrupcao_relatada")) return entry;
  }
  return null;
}
export const courseDecisionLabelsD4: Record<CourseDecisionD4["tipo"], string> = {
  conclusao_relatada: "Conclusão informada por você",
  interrupcao_relatada: "Interrupção informada por você",
};
export function courseDecisionSummaryD4(value: CourseDecisionD4 | null): string {
  if (!value) return "Nenhuma conclusão ou interrupção foi declarada.";
  return `${courseDecisionLabelsD4[value.tipo]} em ${value.data_evento.split("-").reverse().join("/")}.`;
}
