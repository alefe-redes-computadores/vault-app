/** Safe, non-clinical provenance label. A count of descriptions is not
 * a degree of medical confidence and an origin is not proof of delivery.
 */
export function medicationEvidenceClarity(source: "brain" | "record", detailCount: number, routeRecorded: boolean): {
  label: string; explanation: string;
} {
  const count = Number.isSafeInteger(detailCount) && detailCount > 0 ? detailCount : 0;
  if (count === 0) return { label: "Dados a conferir", explanation: "Sem descrições detalhadas nesta etapa; a ausência de registro não demonstra falha clínica." };
  return {
    label: source === "brain" ? "Contexto do Brain" : "Etapa do registro",
    explanation: routeRecorded
      ? "Descrições disponíveis para revisão. Origem cadastrada é informação, não confirmação de fornecimento."
      : "Descrições disponíveis para revisão. A origem do fornecimento ainda precisa de confirmação.",
  };
}
