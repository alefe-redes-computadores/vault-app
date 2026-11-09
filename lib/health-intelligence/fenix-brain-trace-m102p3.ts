/**
 * M102 P3 — rastreabilidade entre duas projeções INDEPENDENTES.
 * Fênix (planejamento operacional) não certifica nem substitui alertas do Brain V5.
 * Não consulta banco, não gera insight, não escolhe urgência ou tratamento.
 */
import type { BrainV5Alert } from "./brain-v5";
import type { BrainCarePlanItem } from "./care-plan";

export type FenixBrainEntryM102P3 = Readonly<{
  kind: "brain" | "fenix";
  label: string;
  title: string;
  authority: string;
  explanation: string;
  evidenceCount: number;
  href: string | null;
}>;
export type FenixBrainTraceM102P3 = Readonly<{
  entries: FenixBrainEntryM102P3[];
  distinctAuthorities: boolean;
  note: string;
}>;
export type FenixBrainTraceInputM102P3 = {
  userId: string;
  contextUserId?: string | null;
  personId: string;
  alert?: BrainV5Alert | null;
  decision?: BrainCarePlanItem | null;
};

const clean = (value: unknown, max = 118): string =>
  typeof value === "string"
    ? value.normalize("NFC").replace(/[\u0000-\u001f\u007f\u200b-\u200f\u202a-\u202e\u2060\u2066-\u206f]/g, " ").trim().replace(/\s+/g, " ").slice(0, max)
    : "";
function evidenceCount(value: unknown): number {
  if (!Array.isArray(value)) return 0;
  return new Set(value.filter(item => typeof item === "string").map(item => clean(item, 200)).filter(Boolean)).size;
}
/** Routes are local-only; reject schemes, protocol-relative, traversal control chars. */
export function localFenixRouteM102P3(value: unknown): string | null {
  if (typeof value !== "string" || value.length < 2 || value.length > 300 || !value.startsWith("/") || value.startsWith("//") || value.includes("\\") || /[\u0000-\u001f\u007f]/.test(value)) return null;
  return value;
}

const EVIDENCE = {
  recorded: {label: "Registro operacional", explanation: "Registro documentado não comprova, por si só, realização de uma etapa clínica."},
  projected: {label: "Projeção para planejar", explanation: "Previsão não confirma retirada, aquisição, tomada ou estoque real."},
  association: {label: "Associação temporal", explanation: "Observação não estabelece causalidade ou diagnóstico."},
  missing_data: {label: "Informação a conferir", explanation: "Faltam registros suficientes; não se presume falha de tratamento."},
} as const;

export function projectFenixBrainTraceM102P3(input: FenixBrainTraceInputM102P3): FenixBrainTraceM102P3 | null {
  // The Brain alert carries a person ID, while the Fênix snapshot inherits the
  // authenticated owner's context. Do not cross-account or cross-person project.
  if (!input.userId || !input.personId || !input.contextUserId || input.userId !== input.contextUserId) return null;
  const entries: FenixBrainEntryM102P3[] = [];
  const alert = input.alert;
  if (alert && alert.person_id === input.personId && alert.state !== "resolved" && alert.insight_id) {
    const safeId = clean(alert.insight_id, 200);
    const href = safeId ? `/inteligencia/alertas?insight=${encodeURIComponent(safeId)}` : null;
    entries.push({
      kind: "brain",
      label: alert.state === "active" ? "Alerta do Brain em acompanhamento" : "Registro do Brain em acompanhamento",
      title: clean(alert.snapshot?.titulo) || "Contexto registrado pelo Brain",
      authority: "Alerta independente · não é diagnóstico",
      explanation: "Este alerta mantém a própria prioridade, mesmo quando o plano operacional da Fênix apresenta outra próxima ação.",
      evidenceCount: evidenceCount(alert.snapshot?.evidencias),
      href,
    });
  }
  const decision = input.decision;
  if (decision) {
    const descriptor = EVIDENCE[decision.evidenceKind] ?? EVIDENCE.missing_data;
    entries.push({
      kind: "fenix",
      label: "Próxima ação planejada pela Fênix",
      title: clean(decision.title) || "Revisar próxima etapa",
      authority: descriptor.label,
      explanation: descriptor.explanation,
      evidenceCount: evidenceCount(decision.evidence),
      href: localFenixRouteM102P3(decision.href),
    });
  }
  if (!entries.length) return null;
  return {
    entries,
    distinctAuthorities: entries.length === 2,
    note: entries.length === 2
      ? "São duas visões independentes. Aparecerem juntas não comprova que descrevam o mesmo episódio, medicamento ou causa."
      : "O resumo exibe apenas a evidência disponível; ausência de outro item não comprova ausência de problemas.",
  };
}
