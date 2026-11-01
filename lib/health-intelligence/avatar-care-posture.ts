/** Small and pure. Fênix never reads a database or infers a diagnosis here. */
export function avatarCarePosture(counts: { overdue: number; prepare: number; unknown: number }): {
  tone: "urgent" | "planning" | "unknown" | "quiet";
  label: string;
} {
  const n = (value: number) => Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
  const overdue = n(counts.overdue);
  const prepare = n(counts.prepare);
  const unknown = n(counts.unknown);
  if (overdue > 0) return { tone: "urgent", label: `${overdue} retirada(s) vencida(s) registrada(s) para revisão` };
  if (prepare > 0) return { tone: "planning", label: `${prepare} etapa(s) para preparar, sem comprovar realização` };
  if (unknown > 0) return { tone: "unknown", label: `${unknown} etapa(s) sem confirmação suficiente` };
  return { tone: "quiet", label: "Sem nova pendência operacional comprovada por este resumo" };
}
