import type { HealthInsight } from "@/lib/health-insights";

const STORAGE_PREFIX =
  "vault_health_insight_memory_v61:";

export type InsightMemoryEntry = {
  semanticKey: string;
  stateSignature: string;
  lastDeliveredAt: number;
  lastSeverity: string;
  lastUrgency: string;
};

export type InsightDeliveryDecision = {
  deliver: boolean;
  reason:
    | "first_seen"
    | "state_escalated"
    | "cooldown_elapsed"
    | "cooldown_active";
  semanticKey: string;
  stateSignature: string;
  cooldownMs: number;
};

const severityRank: Record<string, number> = {
  critica: 0,
  importante: 1,
  atencao: 2,
  informativa: 3,
};

const urgencyRank: Record<string, number> = {
  alta: 0,
  media: 1,
  baixa: 2,
  nenhuma: 3,
};

function normalize(value: unknown): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function hash(value: string): string {
  let h = 2166136261;

  for (
    let index = 0;
    index < value.length;
    index += 1
  ) {
    h ^= value.charCodeAt(index);
    h = Math.imul(h, 16777619);
  }

  return (h >>> 0).toString(36);
}

// VAULT_INSIGHT_MEMORY_V61
export function getHealthInsightSemanticKey(
  insight: HealthInsight
): string {
  const entity =
    `${insight.entidadeTipo ?? "global"}:${insight.entidadeId ?? "global"}`;

  const subject = normalize(
    insight.titulo || insight.id
  );

  return hash(
    [
      insight.categoria,
      insight.kind,
      entity,
      subject,
    ].join("|")
  );
}

export function getHealthInsightStateSignature(
  insight: HealthInsight
): string {
  return [
    insight.gravidadeSeguranca ??
      "informativa",
    insight.urgencia ?? "nenhuma",
    insight.confianca ?? "baixa",
    insight.kind,
  ].join("|");
}

export function getHealthInsightCooldownMs(
  insight: HealthInsight,
  minimumCooldownMs =
    12 * 60 * 60 * 1000
): number {
  const severity =
    insight.gravidadeSeguranca ??
    "informativa";

  if (severity === "critica") {
    return Math.max(
      minimumCooldownMs,
      12 * 60 * 60 * 1000
    );
  }

  if (severity === "importante") {
    return Math.max(
      minimumCooldownMs,
      36 * 60 * 60 * 1000
    );
  }

  return Math.max(
    minimumCooldownMs,
    72 * 60 * 60 * 1000
  );
}

function storageKey(
  personId: string,
  semanticKey: string
): string {
  return `${STORAGE_PREFIX}${personId}:${semanticKey}`;
}

export function readHealthInsightMemory(
  personId: string,
  insight: HealthInsight
): InsightMemoryEntry | null {
  if (
    typeof window === "undefined"
  ) {
    return null;
  }

  const semanticKey =
    getHealthInsightSemanticKey(
      insight
    );

  try {
    const raw =
      window.localStorage.getItem(
        storageKey(
          personId,
          semanticKey
        )
      );

    if (!raw) {
      return null;
    }

    const parsed =
      JSON.parse(raw) as InsightMemoryEntry;

    if (
      !parsed ||
      parsed.semanticKey !==
        semanticKey ||
      !Number.isFinite(
        parsed.lastDeliveredAt
      )
    ) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

function didEscalate(
  previous: InsightMemoryEntry,
  insight: HealthInsight
): boolean {
  const currentSeverity =
    severityRank[
      insight.gravidadeSeguranca ??
        "informativa"
    ] ?? 99;

  const previousSeverity =
    severityRank[
      previous.lastSeverity
    ] ?? 99;

  const currentUrgency =
    urgencyRank[
      insight.urgencia ??
        "nenhuma"
    ] ?? 99;

  const previousUrgency =
    urgencyRank[
      previous.lastUrgency
    ] ?? 99;

  return (
    currentSeverity <
      previousSeverity ||
    currentUrgency <
      previousUrgency
  );
}

export function shouldDeliverHealthInsight(
  personId: string,
  insight: HealthInsight,
  now = Date.now(),
  minimumCooldownMs =
    12 * 60 * 60 * 1000
): InsightDeliveryDecision {
  const semanticKey =
    getHealthInsightSemanticKey(
      insight
    );

  const stateSignature =
    getHealthInsightStateSignature(
      insight
    );

  const cooldownMs =
    getHealthInsightCooldownMs(
      insight,
      minimumCooldownMs
    );

  const previous =
    readHealthInsightMemory(
      personId,
      insight
    );

  if (!previous) {
    return {
      deliver: true,
      reason: "first_seen",
      semanticKey,
      stateSignature,
      cooldownMs,
    };
  }

  if (
    previous.stateSignature !==
      stateSignature &&
    didEscalate(
      previous,
      insight
    )
  ) {
    return {
      deliver: true,
      reason:
        "state_escalated",
      semanticKey,
      stateSignature,
      cooldownMs,
    };
  }

  if (
    now -
      previous.lastDeliveredAt >=
    cooldownMs
  ) {
    return {
      deliver: true,
      reason:
        "cooldown_elapsed",
      semanticKey,
      stateSignature,
      cooldownMs,
    };
  }

  return {
    deliver: false,
    reason: "cooldown_active",
    semanticKey,
    stateSignature,
    cooldownMs,
  };
}

export function recordHealthInsightDelivery(
  personId: string,
  insight: HealthInsight,
  deliveredAt = Date.now()
): void {
  if (
    typeof window === "undefined"
  ) {
    return;
  }

  const semanticKey =
    getHealthInsightSemanticKey(
      insight
    );

  const entry: InsightMemoryEntry = {
    semanticKey,
    stateSignature:
      getHealthInsightStateSignature(
        insight
      ),
    lastDeliveredAt:
      deliveredAt,
    lastSeverity:
      insight.gravidadeSeguranca ??
      "informativa",
    lastUrgency:
      insight.urgencia ??
      "nenhuma",
  };

  try {
    window.localStorage.setItem(
      storageKey(
        personId,
        semanticKey
      ),
      JSON.stringify(entry)
    );
  } catch {
    // Anti-spam é auxiliar:
    // falha de storage não pode quebrar o app.
  }
}
