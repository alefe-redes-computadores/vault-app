/**
 * CI360 P6 A1 — Reconciliação de evidências de retirada. SOMENTE LEITURA.
 *
 * Identidade: conta + pessoa + medicamento + ID de evento; ciclo só quando
 * explicitamente persistido. Nunca deduzir conclusão a partir de estoque,
 * quantidade, fabricante, nome, data próxima ou aquisição sem ligação.
 * O motor não escreve em banco, não altera medicamento nem cria aquisição.
 */
import type { Medicamento, Retirada } from "@/lib/types";

export type WithdrawalEvidenceStatusP6 = "active" | "completed" | "cancelled" | "review";
export type WithdrawalEvidenceEntryP6 = Readonly<{
  id: string;
  cycleId: string | null;
  status: WithdrawalEvidenceStatusP6;
  scheduledDate: string;
  explicitReceiptId: string | null;
  inconsistentStatus: boolean;
  reasons: readonly string[];
}>;
export type WithdrawalEvidenceSnapshotP6 = Readonly<{
  scoped: boolean;
  events: readonly WithdrawalEvidenceEntryP6[];
  active: readonly WithdrawalEvidenceEntryP6[];
  completed: readonly WithdrawalEvidenceEntryP6[];
  review: readonly WithdrawalEvidenceEntryP6[];
}>;
export type WithdrawalNavigationDecisionP6 = Readonly<{
  kind: "other" | "active" | "completed" | "review" | "new-plan";
  eventId: string | null;
  cycleId: string | null;
  explanation: string;
}>;

type OwnerP6 = Pick<Medicamento, "id" | "user_id" | "person_id">;
type RowP6 = Pick<Retirada,
  "id" | "user_id" | "person_id" | "medicamento_id" | "status" | "data" |
  "renovacao_realizada_id" | "realizada_em" | "fornecimento_ciclo_id"
>;
const hasText = (value: unknown): value is string => typeof value === "string" && value.trim().length > 0;
const dateKey = (row: RowP6): string => /^\d{4}-\d{2}-\d{2}$/.test(row.data || "") ? row.data : "9999-99-99";

function rowStatusP6(row: RowP6): {status: WithdrawalEvidenceStatusP6; inconsistent: boolean; reasons: string[]} {
  const receipt = hasText(row.renovacao_realizada_id);
  const completedAt = hasText(row.realizada_em);
  const done = row.status === "realizada" || receipt || completedAt;
  if (row.status === "cancelada" || row.status === "nao_realizada") {
    if (done) return {status: "review", inconsistent: true, reasons: ["status_cancelled_with_completion_evidence"]};
    return {status: "cancelled", inconsistent: false, reasons: []};
  }
  if (done) return {status: "completed", inconsistent: row.status !== "realizada", reasons: row.status !== "realizada" ? ["old_status_with_explicit_completion"] : []};
  if (row.status === "agendada") return {status: "active", inconsistent: false, reasons: []};
  return {status: "review", inconsistent: false, reasons: ["unknown_withdrawal_state"]};
}

/** Não mistura pessoas, não inclui legado sem titular e não presume ciclo por data. */
export function withdrawalEvidenceForMedicationP6(med: OwnerP6, rows: readonly RowP6[]): WithdrawalEvidenceSnapshotP6 {
  if (!hasText(med.id) || !hasText(med.user_id) || !hasText(med.person_id))
    return {scoped: false, events: [], active: [], completed: [], review: []};
  const filtered = rows.filter(row => hasText(row.id) && row.user_id === med.user_id &&
    row.person_id === med.person_id && row.medicamento_id === med.id);
  const ids = new Map<string, number>();
  for (const row of filtered) ids.set(row.id!, (ids.get(row.id!) ?? 0) + 1);
  const base = filtered.map(row => {
    const assessment = rowStatusP6(row);
    const duplicate = (ids.get(row.id!) ?? 0) > 1;
    return {
      id: row.id!, cycleId: hasText(row.fornecimento_ciclo_id) ? row.fornecimento_ciclo_id : null,
      status: duplicate ? "review" as const : assessment.status,
      scheduledDate: dateKey(row),
      explicitReceiptId: hasText(row.renovacao_realizada_id) ? row.renovacao_realizada_id : null,
      inconsistentStatus: assessment.inconsistent || duplicate,
      reasons: duplicate ? [...assessment.reasons, "duplicate_event_id"] : assessment.reasons,
    };
  });
  // Somente o ciclo explicitamente identificado pode sinalizar conflito entre
  // compromisso ativo e conclusão. Ciclos ausentes NÃO devem ser unidos.
  const byCycle = new Map<string, Set<WithdrawalEvidenceStatusP6>>();
  for (const event of base) {
    if (!event.cycleId) continue;
    if (!byCycle.has(event.cycleId)) byCycle.set(event.cycleId, new Set());
    byCycle.get(event.cycleId)!.add(event.status);
  }
  const events: WithdrawalEvidenceEntryP6[] = base.map((event): WithdrawalEvidenceEntryP6 => {
    const statuses = event.cycleId ? byCycle.get(event.cycleId) : null;
    if (statuses?.has("active") && statuses.has("completed"))
      return {...event, status: "review", inconsistentStatus: true,
        reasons: [...event.reasons, "same_cycle_active_and_completed"]};
    return event;
  }).sort((a,b) => a.scheduledDate.localeCompare(b.scheduledDate) || a.id.localeCompare(b.id));
  return {
    scoped: true,
    events,
    active: events.filter(item => item.status === "active"),
    completed: events.filter(item => item.status === "completed"),
    review: events.filter(item => item.status === "review"),
  };
}

/**
 * Classifica UM destino existente. Não fornece permissão de escrita. Receitas,
 * reposições e retiradas novas continuam operações diferentes.
 */
export function withdrawalNavigationEvidenceP6(
  href: string | null | undefined,
  snapshot: WithdrawalEvidenceSnapshotP6,
): WithdrawalNavigationDecisionP6 {
  const other = (explanation: string): WithdrawalNavigationDecisionP6 =>
    ({kind: "other", eventId: null, cycleId: null, explanation});
  if (!href || !href.startsWith("/") || href.startsWith("//") || href.includes("\\") || /[\x00-\x1f]/.test(href))
    return other("Destino ausente ou não interno");
  const query = href.split("?")[1]?.split("#")[0] ?? "";
  if (/%(?![0-9a-f]{2})/i.test(query)) return {kind: "review", eventId: null, cycleId: null, explanation: "Parâmetros inválidos"};
  let url: URL;
  try { url = new URL(href, "https://vault.local.invalid"); }
  catch { return {kind: "review", eventId: null, cycleId: null, explanation: "Rota inválida"}; }
  if (url.origin !== "https://vault.local.invalid") return other("Destino externo bloqueado");
  const isDetail = url.pathname === "/saude/retiradas/detalhes";
  const isNew = url.pathname === "/saude/retiradas/nova";
  if (!isDetail && !isNew) return other("Outra ação do cuidado, mantida");
  const eventId = url.searchParams.get("id") || null;
  const cycleId = url.searchParams.get("fornecimento_ciclo_id") || null;
  if (!snapshot.scoped) return {kind: "review", eventId: null, cycleId: null, explanation: "Pessoa não identificada"};
  if (isNew) {
    // Uma nova intenção SEM referência a evento/ciclo não se confunde com ciclo passado.
    if (cycleId && snapshot.completed.some(row => row.cycleId === cycleId) &&
        !snapshot.active.some(row => row.cycleId === cycleId) && !snapshot.review.some(row => row.cycleId === cycleId))
      return {kind: "completed", eventId: null, cycleId, explanation: "Ciclo explicitamente identificado já concluído"};
    return {kind: "new-plan", eventId: null, cycleId, explanation: "Planejamento distinto; sem conclusão presumida"};
  }
  if (!eventId) return {kind: "review", eventId: null, cycleId, explanation: "ID de retirada ausente"};
  const match = snapshot.events.find(row => row.id === eventId);
  if (!match || match.status === "review" || match.status === "cancelled" ||
      (cycleId && match.cycleId !== cycleId))
    return {kind: "review", eventId, cycleId, explanation: "Retirada não comprovada para esta pessoa/ciclo"};
  return {kind: match.status, eventId, cycleId: match.cycleId,
    explanation: match.status === "completed" ? "Retirada concluída por evidência explícita" : "Retirada verdadeiramente em aberto"};
}
