import type { HealthInsight } from "@/lib/health-insights";
import { compareHealthPriority, healthSeverityRank } from "./priority";

/** M45: only presentation state. Clinical rules, records and insight authority are unchanged. */
export type ContextualMemory = {
  version: 1;
  until: number;
  visits: number;
  hidden: string[];
};

const TTL = 24 * 60 * 60 * 1000;
const MAX_HIDDEN = 36;
const MAX_VISITS = 1000;

/** Deterministic, compact token; never store a clinical title, evidence or entity ID as plaintext. */
function token(value: string): string {
  let h = 2166136261;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}

export function contextualMemoryKey(ownerKey?: string | null, entityType?: string | null, entityId?: string | null): string | null {
  if (!ownerKey?.trim() || !entityType?.trim() || !entityId?.trim()) return null;
  return `vault:brain:context:v1:${token(JSON.stringify([ownerKey, entityType, entityId]))}`;
}

/** A new event/evidence state creates a new fingerprint and becomes visible again. */
export function contextualFingerprint(insight: HealthInsight): string {
  return token(JSON.stringify([
    insight.id, insight.kind, insight.categoria, insight.urgencia,
    insight.gravidadeSeguranca, insight.confianca, insight.amostra,
    insight.entidadeTipo, insight.entidadeId,
    insight.titulo, insight.mensagem, insight.evidencias || [],
  ]));
}

/** Important safety warnings are never suppressed by the decorative dismissal memory. */
export function isProtectedContextualInsight(insight: HealthInsight): boolean {
  return insight.gravidadeSeguranca === "critica" || insight.gravidadeSeguranca === "importante" ||
    (insight.kind === "alert" && insight.urgencia === "alta");
}

export function emptyContextualMemory(now: number): ContextualMemory {
  return { version: 1, until: now + TTL, visits: 0, hidden: [] };
}

export function parseContextualMemory(value: string | null, now: number): ContextualMemory {
  if (!value) return emptyContextualMemory(now);
  try {
    const data: unknown = JSON.parse(value);
    if (!data || typeof data !== "object") return emptyContextualMemory(now);
    const raw = data as Partial<ContextualMemory>;
    if (raw.version !== 1 || typeof raw.until !== "number" || raw.until <= now || raw.until > now + TTL ||
      !Number.isInteger(raw.visits) || (raw.visits ?? 0) < 0 || !Array.isArray(raw.hidden)) {
      return emptyContextualMemory(now);
    }
    return {
      version: 1,
      until: raw.until,
      visits: Math.min(raw.visits ?? 0, MAX_VISITS),
      hidden: raw.hidden.filter((item): item is string => typeof item === "string" && /^[0-9a-z]{1,12}$/.test(item)).slice(-MAX_HIDDEN),
    };
  } catch { return emptyContextualMemory(now); }
}

export function readContextualMemory(key: string | null, now = Date.now()): ContextualMemory {
  if (!key || typeof window === "undefined") return emptyContextualMemory(now);
  try { return parseContextualMemory(window.sessionStorage.getItem(key), now); }
  catch { return emptyContextualMemory(now); }
}

export function writeContextualMemory(key: string | null, memory: ContextualMemory): void {
  if (!key || typeof window === "undefined") return;
  try { window.sessionStorage.setItem(key, JSON.stringify(memory)); }
  catch { /* Storage unavailable: suggestions still work without persistence. */ }
}

export function dismissContextualInsight(memory: ContextualMemory, insight: HealthInsight): ContextualMemory {
  if (isProtectedContextualInsight(insight)) return memory;
  return { ...memory, hidden: [...new Set([...memory.hidden, contextualFingerprint(insight)])].slice(-MAX_HIDDEN) };
}

/** The rank engine remains the one in priority.ts; dismissals never alter its scores. */
export function visibleContextualInsights(insights: readonly HealthInsight[], memory: ContextualMemory, limit = 5): HealthInsight[] {
  const excluded = new Set(memory.hidden);
  return [...insights].sort(compareHealthPriority)
    .filter((insight) => isProtectedContextualInsight(insight) || !excluded.has(contextualFingerprint(insight)))
    .slice(0, Math.max(0, Math.min(10, limit)));
}

/** Rotate only equal-priority observations; never rotate a lower urgency above a critical warning. */
export function contextualStartIndex(insights: readonly HealthInsight[], visits: number): number {
  const first = insights[0];
  if (!first || isProtectedContextualInsight(first)) return 0;
  const ties = insights.filter(item =>
    !isProtectedContextualInsight(item) && healthSeverityRank(item) === healthSeverityRank(first) &&
    item.urgencia === first.urgencia && item.confianca === first.confianca,
  ).length;
  return ties > 1 ? Math.max(0, visits % ties) : 0;
}

export function recordContextualVisit(memory: ContextualMemory): ContextualMemory {
  return { ...memory, visits: Math.min(memory.visits + 1, MAX_VISITS) };
}

export function resetContextualDismissals(memory: ContextualMemory): ContextualMemory {
  return { ...memory, hidden: [] };
}
