import {
  brainV5IsSnoozed,
  brainV5Journeys,
  brainV5Lane,
  brainV5PriorityReason,
  type BrainV5Alert,
  type BrainV5Journey,
} from "./brain-v5";
import type { BrainDecisionLane, BrainDomain, BrainEvidenceQuality } from "./brain-next";

export type BrainMomentum = "new" | "recurrent" | "updated" | "stable";

export type BrainPortfolioFocus = {
  journey: BrainV5Journey;
  momentum: BrainMomentum;
  reason: string;
};

export type BrainPortfolio = {
  focus: BrainPortfolioFocus[];
  visibleJourneys: number;
  hiddenByFocusLimit: number;
  scheduled: number;
  resolved: number;
  recurring: number;
  newCount: number;
  evidence: Record<BrainEvidenceQuality, number>;
  lanes: Record<BrainDecisionLane, number>;
  domains: Partial<Record<BrainDomain, number>>;
  confidenceScore: number | null;
  headline: string;
  summary: string;
};

const laneRank: Record<BrainDecisionLane, number> = { now: 4, next: 3, follow_up: 2, review_data: 1 };
const qualityWeight: Record<BrainEvidenceQuality, number> = { strong: 100, moderate: 65, limited: 25 };

export function brainV5Momentum(item: BrainV5Alert): BrainMomentum {
  if (!item.last_seen_at) return "new";
  if ((item.episode || 1) > 1) return "recurrent";
  if ((item.occurrences || 1) > 1) return "updated";
  return "stable";
}

function focusReason(item: BrainV5Alert, momentum: BrainMomentum): string {
  const prefix = momentum === "new" ? "Novo" : momentum === "recurrent" ? "Recorrente" : momentum === "updated" ? "Atualizado" : "Em acompanhamento";
  return `${prefix} · ${brainV5PriorityReason(item)}`;
}

/**
 * Converts the alert ledger into a small decision portfolio. The selector keeps
 * clinical priority first, then prefers a different domain before repeating one.
 * It never hides records from the full Central and never changes clinical data.
 */
export function buildBrainPortfolio(items: readonly BrainV5Alert[], focusLimit = 3): BrainPortfolio {
  const journeys = brainV5Journeys([...items]);
  const visible = journeys.filter(item => !brainV5IsSnoozed(item.primary));
  const scheduled = journeys.length - visible.length;
  const candidates = [...visible].sort((a, b) =>
    laneRank[b.lane] - laneRank[a.lane] ||
    (b.primary.priority_factors?.total ?? b.primary.severity_rank) - (a.primary.priority_factors?.total ?? a.primary.severity_rank) ||
    b.primary.last_detected_at.localeCompare(a.primary.last_detected_at) ||
    a.key.localeCompare(b.key)
  );

  const selected: BrainV5Journey[] = [];
  const usedDomains = new Set<BrainDomain>();
  while (selected.length < Math.max(0, focusLimit) && selected.length < candidates.length) {
    const differentDomain = candidates.find(item => !selected.includes(item) && item.primary.domain && !usedDomains.has(item.primary.domain));
    const next = differentDomain ?? candidates.find(item => !selected.includes(item));
    if (!next) break;
    selected.push(next);
    if (next.primary.domain) usedDomains.add(next.primary.domain);
  }

  const evidence: Record<BrainEvidenceQuality, number> = { strong: 0, moderate: 0, limited: 0 };
  const lanes: Record<BrainDecisionLane, number> = { now: 0, next: 0, follow_up: 0, review_data: 0 };
  const domains: Partial<Record<BrainDomain, number>> = {};
  for (const journey of visible) {
    const quality = journey.primary.evidence_quality ?? "limited";
    evidence[quality] += 1;
    lanes[journey.lane] += 1;
    const domain = journey.primary.domain;
    if (domain) domains[domain] = (domains[domain] ?? 0) + 1;
  }
  const evidenceTotal = evidence.strong + evidence.moderate + evidence.limited;
  const confidenceScore = evidenceTotal
    ? Math.round((evidence.strong * qualityWeight.strong + evidence.moderate * qualityWeight.moderate + evidence.limited * qualityWeight.limited) / evidenceTotal)
    : null;
  const recurring = visible.filter(item => (item.primary.episode || 1) > 1).length;
  const newCount = visible.filter(item => !item.primary.last_seen_at).length;
  const headline = lanes.now
    ? `${lanes.now} decisão(ões) para revisar agora`
    : lanes.next
      ? `${lanes.next} próxima(s) ação(ões) organizada(s)`
      : visible.length
        ? "Acompanhamento organizado sem urgência comprovada"
        : "Nenhuma ação aberta neste momento";
  const summary = [
    newCount ? `${newCount} nova(s)` : "",
    recurring ? `${recurring} recorrente(s)` : "",
    scheduled ? `${scheduled} programada(s)` : "",
    confidenceScore !== null ? `base de evidência ${confidenceScore}/100` : "",
  ].filter(Boolean).join(" · ") || "O histórico permanece acompanhado.";

  return {
    focus: selected.map(journey => {
      const momentum = brainV5Momentum(journey.primary);
      return { journey, momentum, reason: focusReason(journey.primary, momentum) };
    }),
    visibleJourneys: visible.length,
    hiddenByFocusLimit: Math.max(0, visible.length - selected.length),
    scheduled,
    resolved: items.filter(item => item.state === "resolved").length,
    recurring,
    newCount,
    evidence,
    lanes,
    domains,
    confidenceScore,
    headline,
    summary,
  };
}
