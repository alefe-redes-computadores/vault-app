// lib/health-intelligence/sos-patterns.ts

import type {
  Medicamento,
} from "@/lib/types";

type SosDoseLog = {
  id?: string;
  medicamento_id?: string;
  data?: string;
  horario?: string;
  tomado_em?: string;
  ignorado_em?: string;
  quantidade?: number;
};

export type SosAttentionLevel =
  | "observation"
  | "attention"
  | "strong";

export type SosPatternAnalysis = {
  level: SosAttentionLevel;
  title: string;
  message: string;
  recommendation: string;
  confidence: "baixa" | "media" | "alta";
  sample: number;
  currentCount: number;
  previousCount: number;
  currentDaysWithUse: number;
  previousDaysWithUse: number;
  longestConsecutiveDays: number;
  peakDayCount: number;
  shortIntervals: number;
  shortestIntervalMinutes: number | null;
  currentKnownQuantity: number;
  previousKnownQuantity: number;
  currentQuantityComplete: boolean;
  previousQuantityComplete: boolean;
  evidence: string[];
};

type WindowSummary = {
  count: number;
  daysWithUse: number;
  dates: string[];
  peakDayCount: number;
  knownQuantity: number;
  quantityComplete: boolean;
  logs: SosDoseLog[];
};

function isIsoDate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function parseLocalDate(value: string): Date | null {
  if (!isIsoDate(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day, 12);
  return Number.isNaN(date.getTime()) ? null : date;
}

function localIso(date: Date): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function shiftDate(value: string, days: number): string | null {
  const date = parseLocalDate(value);
  if (!date) return null;
  date.setDate(date.getDate() + days);
  return localIso(date);
}

function isTaken(log: SosDoseLog): boolean {
  return Boolean(log.tomado_em);
}

function summarizeWindow(
  logs: SosDoseLog[],
  start: string,
  end: string
): WindowSummary {
  const selected = logs.filter((log): log is SosDoseLog & { data: string } =>
    isTaken(log) && isIsoDate(log.data) && log.data >= start && log.data <= end
  );
  const perDay = new Map<string, number>();
  let knownQuantity = 0;
  let knownCount = 0;

  for (const log of selected) {
    perDay.set(log.data, (perDay.get(log.data) || 0) + 1);
    const quantity = Number(log.quantidade);
    if (Number.isFinite(quantity) && quantity > 0) {
      knownQuantity += quantity;
      knownCount += 1;
    }
  }

  const dates = Array.from(perDay.keys()).sort();

  return {
    count: selected.length,
    daysWithUse: dates.length,
    dates,
    peakDayCount: Math.max(0, ...Array.from(perDay.values())),
    knownQuantity,
    quantityComplete: selected.length > 0 && knownCount === selected.length,
    logs: selected,
  };
}

function longestConsecutiveRun(dates: string[]): number {
  if (dates.length === 0) return 0;
  const unique = Array.from(new Set(dates)).sort();
  let longest = 1;
  let current = 1;

  for (let index = 1; index < unique.length; index += 1) {
    if (shiftDate(unique[index - 1], 1) === unique[index]) {
      current += 1;
      longest = Math.max(longest, current);
    } else {
      current = 1;
    }
  }

  return longest;
}

function intervalSummary(logs: SosDoseLog[]): {
  shortIntervals: number;
  shortestIntervalMinutes: number | null;
} {
  const timestamps = logs
    .map((log) => log.tomado_em ? new Date(log.tomado_em).getTime() : Number.NaN)
    .filter((value) => Number.isFinite(value))
    .sort((a, b) => a - b);

  let shortIntervals = 0;
  let shortestIntervalMinutes: number | null = null;

  for (let index = 1; index < timestamps.length; index += 1) {
    const minutes = Math.round((timestamps[index] - timestamps[index - 1]) / 60000);
    if (minutes < 0) continue;
    shortestIntervalMinutes = shortestIntervalMinutes === null
      ? minutes
      : Math.min(shortestIntervalMinutes, minutes);
    if (minutes <= 120) shortIntervals += 1;
  }

  return { shortIntervals, shortestIntervalMinutes };
}

function confidence(sample: number, daysWithUse: number) {
  if (sample >= 20 && daysWithUse >= 4) return "alta" as const;
  if (sample >= 7 && daysWithUse >= 2) return "media" as const;
  return "baixa" as const;
}

export function analyzeSosPattern({
  medication,
  logs,
  today,
  periodDays = 7,
}: {
  medication: Medicamento;
  logs: SosDoseLog[];
  today: string;
  periodDays?: number;
}): SosPatternAnalysis | null {
  const isSos = medication.tipo_uso === "sos" || medication.tipo_uso === "esporadico";
  if (!isSos || !isIsoDate(today)) return null;

  const days = Math.max(3, Math.floor(periodDays));
  const currentStart = shiftDate(today, -(days - 1));
  const previousEnd = shiftDate(currentStart || today, -1);
  const previousStart = shiftDate(previousEnd || today, -(days - 1));
  if (!currentStart || !previousStart || !previousEnd) return null;

  const current = summarizeWindow(logs, currentStart, today);
  const previous = summarizeWindow(logs, previousStart, previousEnd);
  const consecutive = longestConsecutiveRun(current.dates);
  const intervals = intervalSummary(current.logs);
  const sample = current.count + previous.count;
  const difference = current.count - previous.count;
  const ratio = previous.count > 0 ? current.count / previous.count : null;

  const strongChange =
    current.count >= 21 ||
    (ratio !== null && ratio >= 3 && difference >= 10) ||
    intervals.shortIntervals >= 5 ||
    (consecutive >= 7 && current.count >= 14);

  const attentionChange =
    current.count >= 7 ||
    (ratio !== null && ratio >= 1.5 && difference >= 3) ||
    intervals.shortIntervals >= 2 ||
    (consecutive >= 4 && current.count >= 4);

  const observable =
    current.count >= 4 &&
    (current.daysWithUse >= 3 || difference >= 2);

  if (!strongChange && !attentionChange && !observable) return null;

  const level: SosAttentionLevel = strongChange
    ? "strong"
    : attentionChange
      ? "attention"
      : "observation";

  const evidence = [
    current.count + " tomada(s) registrada(s) nos últimos " + days + " dias",
    previous.count + " tomada(s) no período anterior equivalente",
    "Uso registrado em " + current.daysWithUse + " de " + days + " dias",
  ];

  if (consecutive >= 2) {
    evidence.push(consecutive + " dia(s) consecutivo(s) com uso registrado");
  }
  if (current.peakDayCount >= 2) {
    evidence.push("Maior concentração: " + current.peakDayCount + " tomada(s) em um dia");
  }
  if (intervals.shortIntervals > 0 && intervals.shortestIntervalMinutes !== null) {
    evidence.push(
      intervals.shortIntervals + " intervalo(s) de até 2 horas; menor intervalo registrado: " +
      intervals.shortestIntervalMinutes + " minuto(s)"
    );
  }
  if (current.knownQuantity > 0) {
    evidence.push(
      (current.quantityComplete ? "Quantidade total conhecida: " : "Quantidade parcial conhecida: ") +
      current.knownQuantity
    );
  }
  if (current.quantityComplete && previous.quantityComplete && previous.count > 0) {
    evidence.push(
      "Quantidade no período anterior: " + previous.knownQuantity
    );
  }

  const title = level === "strong"
    ? "Mudança forte no padrão de uso SOS"
    : level === "attention"
      ? "Uso SOS merece atenção"
      : "Uso SOS recorrente no período";

  const comparisonText = previous.count > 0
    ? " No período anterior equivalente foram " + previous.count + "."
    : " Não há uso registrado no período anterior equivalente para formar uma linha de base.";

  const message =
    "Os registros de \"" + medication.nome + "\" mostram " + current.count +
    " tomada(s) nos últimos " + days + " dias, distribuídas em " +
    current.daysWithUse + " dia(s)." + comparisonText +
    (level === "strong"
      ? " A mudança ficou muito acima do padrão recente disponível."
      : level === "attention"
        ? " Houve frequência ou concentração maior que o padrão recente disponível."
        : " Esse comportamento começou a se repetir no período.");

  return {
    level,
    title,
    message,
    recommendation:
      "Confira se os registros estão corretos e considere levar este histórico ao profissional responsável. O Vault descreve o padrão registrado e não determina risco clínico nem alteração de dose.",
    confidence: confidence(sample, current.daysWithUse),
    sample,
    currentCount: current.count,
    previousCount: previous.count,
    currentDaysWithUse: current.daysWithUse,
    previousDaysWithUse: previous.daysWithUse,
    longestConsecutiveDays: consecutive,
    peakDayCount: current.peakDayCount,
    shortIntervals: intervals.shortIntervals,
    shortestIntervalMinutes: intervals.shortestIntervalMinutes,
    currentKnownQuantity: current.knownQuantity,
    previousKnownQuantity: previous.knownQuantity,
    currentQuantityComplete: current.quantityComplete,
    previousQuantityComplete: previous.quantityComplete,
    evidence,
  };
}
