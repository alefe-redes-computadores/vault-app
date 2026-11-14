/**
 * M150 P4 R3 — one visible action for a proven duplicate, never by medicine
 * name alone. Presentation-only: no dose, stock, prescription or cloud writes.
 */
export type HomeAttentionCandidateP4R3 = {
  id: string;
  kind: string;
  level: string;
  href: string;
  title: string;
  subtitle: string;
};

export function selectHomeAttentionP4R3<T extends HomeAttentionCandidateP4R3>(
  alerts: readonly T[],
  hero: { href: string; title: string; description: string },
  exactWithdrawalAliases: ReadonlySet<string>,
): T[] {
  const visible: T[] = [];
  const seen = new Set<string>();
  for (const alert of alerts) {
    // Clinical and overdue alerts always remain, even if the same URL is in
    // the hero, agenda or another card. URL identity is NOT issue identity.
    const protectedAlert = alert.level === "urgente" || alert.level === "vencido";
    const exactWithdrawalId = /^\/saude\/retiradas\/detalhes\?id=([^&#]+)/.exec(alert.href)?.[1];
    const matchingWithdrawal = exactWithdrawalId ?
      alert.id === `sus-retirada-${exactWithdrawalId}` : false;
    if (!protectedAlert && alert.kind === "sus" &&
      exactWithdrawalAliases.has(alert.id) && matchingWithdrawal) continue;

    // Only fully identical, non-critical presentation records are redundant.
    // A distinct title, meaning, urgency or destination is never collapsed.
    const exact = [alert.kind, alert.level, alert.href, alert.title, alert.subtitle].join("\u001f");
    if (!protectedAlert && seen.has(exact)) continue;
    seen.add(exact);
    if (!protectedAlert && alert.level === "ok" && alert.href === hero.href &&
      alert.title.trim().toLocaleLowerCase("pt-BR") === hero.title.trim().toLocaleLowerCase("pt-BR") &&
      alert.subtitle.trim().toLocaleLowerCase("pt-BR") === hero.description.trim().toLocaleLowerCase("pt-BR")) continue;
    visible.push(alert);
  }
  return visible;
}
