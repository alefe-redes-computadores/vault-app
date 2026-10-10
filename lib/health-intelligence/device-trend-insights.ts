import type { HealthInsight, HealthInsightContext } from "@/lib/health-insights";
import type { RegistroSaude } from "@/lib/types";

const DAY = 86_400_000;

type MetricKey = "peso" | "pressao_arterial" | "frequencia_cardiaca" | "oxigenacao" | "caminhada";
type Reading = { date: string; primary: number; secondary?: number; record: RegistroSaude };
type Daily = { date: string; primary: number; secondary?: number; sources: Set<string> };

const DEFINITIONS: Record<MetricKey, { label: string; unit: string; change: (before: Daily, after: Daily) => boolean }> = {
  peso: { label: "Peso", unit: "kg", change: (a, b) => Math.abs(b.primary - a.primary) >= Math.max(0.8, a.primary * 0.015) },
  pressao_arterial: { label: "Pressão arterial", unit: "mmHg", change: (a, b) => Math.abs(b.primary - a.primary) >= 10 || Math.abs((b.secondary || 0) - (a.secondary || 0)) >= 6 },
  frequencia_cardiaca: { label: "Batimentos", unit: "bpm", change: (a, b) => Math.abs(b.primary - a.primary) >= 8 },
  oxigenacao: { label: "Oxigenação", unit: "%", change: (a, b) => Math.abs(b.primary - a.primary) >= 2 },
  caminhada: { label: "Caminhada", unit: "min", change: (a, b) => Math.abs(b.primary - a.primary) >= Math.max(15, a.primary * 0.2) },
};

function civilDay(value: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, date] = value.split("-").map(Number);
  const result = Date.UTC(year, month - 1, date);
  const check = new Date(result);
  return check.getUTCFullYear() === year && check.getUTCMonth() === month - 1 && check.getUTCDate() === date ? result : null;
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function numeric(record: RegistroSaude, metric: MetricKey): Reading | null {
  const units: Record<MetricKey, string> = { peso: "kg", pressao_arterial: "mmhg", frequencia_cardiaca: "bpm", oxigenacao: "%", caminhada: "min" };
  if (String(record.unidade_medida || "").trim().toLowerCase() !== units[metric]) return null;
  if (metric === "pressao_arterial") {
    const match = String(record.valor_medicao || "").match(/^\s*(\d{2,3})\s*\/\s*(\d{2,3})(?:\s*mmhg)?\s*$/i);
    if (!match) return null;
    const systolic = Number(match[1]), diastolic = Number(match[2]);
    return systolic >= 30 && systolic <= 300 && diastolic >= 20 && diastolic <= 200 && diastolic < systolic
      ? { date: record.data, primary: systolic, secondary: diastolic, record }
      : null;
  }
  const value = record.tipo === "caminhada" ? record.duracao_minutos ?? record.valor_numerico : record.valor_numerico;
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  const ranges: Record<Exclude<MetricKey, "pressao_arterial">, [number, number]> = {
    peso: [1, 500], frequencia_cardiaca: [20, 300], oxigenacao: [1, 100], caminhada: [1, 1440],
  };
  const [min, max] = ranges[metric];
  return value >= min && value <= max ? { date: record.data, primary: value, record } : null;
}

function dailyMedian(readings: Reading[]): Daily[] {
  const grouped = new Map<string, Reading[]>();
  for (const item of readings) grouped.set(item.date, [...(grouped.get(item.date) || []), item]);
  return [...grouped].map(([date, items]) => ({
    date,
    primary: median(items.map((item) => item.primary)),
    ...(items.some((item) => item.secondary !== undefined) ? { secondary: median(items.flatMap((item) => item.secondary === undefined ? [] : [item.secondary])) } : {}),
    sources: new Set(items.map((item) => item.record.source === "health_connect" ? "Health Connect" : "Vault/manual")),
  }));
}

function average(values: Daily[], key: "primary" | "secondary"): number | null {
  const selected = values.map((value) => value[key]).filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  return selected.length ? selected.reduce((sum, value) => sum + value, 0) / selected.length : null;
}

function display(value: number, metric: MetricKey): string {
  return metric === "peso" ? `${value.toFixed(1)} kg` : metric === "oxigenacao" ? `${value.toFixed(1)}%` : `${Math.round(value)} ${DEFINITIONS[metric].unit}`;
}

/** Neutral trend comparisons for connected/manual measurements. Thresholds only suppress small fluctuations; they are not clinical ranges. */
export function buildDeviceTrendInsights(context: HealthInsightContext): HealthInsight[] {
  if (!context.personId) return [];
  const today = civilDay(context.hoje || "");
  if (today === null) return [];
  const own = context.registrosSaude.filter((record) => record.person_id === context.personId && civilDay(record.data) !== null && civilDay(record.data)! < today && civilDay(record.data)! >= today - 14 * DAY);
  const results: HealthInsight[] = [];

  for (const metric of Object.keys(DEFINITIONS) as MetricKey[]) {
    const seen = new Set<string>();
    const readings = own.filter((record) => record.tipo === metric).flatMap((record) => {
      const identity = record.source_record_id || record.id || `${record.tipo}:${record.data}:${record.horario}:${record.valor_medicao}:${record.valor_numerico}`;
      if (seen.has(identity)) return [];
      seen.add(identity);
      const parsed = numeric(record, metric);
      return parsed ? [parsed] : [];
    });
    const daily = dailyMedian(readings);
    const recent = daily.filter((item) => { const date = civilDay(item.date)!; return date >= today - 7 * DAY && date < today; });
    const previous = daily.filter((item) => { const date = civilDay(item.date)!; return date >= today - 14 * DAY && date < today - 7 * DAY; });
    if (recent.length < 3 || previous.length < 3) continue;
    const before = average(previous, "primary"), after = average(recent, "primary");
    if (before === null || after === null || !DEFINITIONS[metric].change({ date: "", primary: before, secondary: average(previous, "secondary") ?? undefined, sources: new Set() }, { date: "", primary: after, secondary: average(recent, "secondary") ?? undefined, sources: new Set() })) continue;
    const beforeSecondary = average(previous, "secondary"), afterSecondary = average(recent, "secondary");
    const observed = recent.length + previous.length;
    const metricLabel = DEFINITIONS[metric].label;
    const sources = new Set([...recent, ...previous].flatMap((item) => [...item.sources]));
    const message = metric === "pressao_arterial"
      ? `A média dos registros diários passou de ${Math.round(before)}/${Math.round(beforeSecondary || 0)} para ${Math.round(after)}/${Math.round(afterSecondary || 0)} mmHg entre as duas semanas completas.`
      : `A mediana diária média passou de ${display(before, metric)} para ${display(after, metric)} entre as duas semanas completas.`;
    results.push({
      id: `device-trend-${metric}-14d`, kind: "pattern", categoria: "historico",
      titulo: `${metricLabel}: houve uma variação nos registros`, mensagem: `${message} O Vault compara somente dias com medidas; isso descreve o histórico salvo e não define se o valor é clinicamente normal.`,
      urgencia: "baixa", confianca: recent.length >= 5 && previous.length >= 5 ? "media" : "baixa", amostra: observed,
      periodoDias: 14, entidadeTipo: "linha_cuidado", link: "/saude/minha-saude",
      evidencias: [
        `Semana recente: ${recent.length} dias com medição`, `Semana anterior: ${previous.length} dias com medição`,
        metric === "pressao_arterial" ? `Médias diárias, sistólica/diastólica: ${Math.round(before)}/${Math.round(beforeSecondary || 0)} → ${Math.round(after)}/${Math.round(afterSecondary || 0)} mmHg` : `Média das medianas diárias: ${display(before, metric)} → ${display(after, metric)}`,
        `Fontes registradas: ${[...sources].sort().join(", ") || "não informadas"}`,
        "Amostras do mesmo dia são resumidas pela mediana para reduzir duplicidade entre aparelhos.",
        "O limite de variação serve apenas para filtrar oscilações pequenas; não é uma faixa ou orientação clínica.",
      ],
      fontesInternas: [`Registros de ${metricLabel.toLocaleLowerCase("pt-BR")}`],
      coberturaDias: { observados: observed, total: 14 },
      comparacao: { janelaAtual: "Últimos 7 dias completos", janelaAnterior: "7 dias completos anteriores", valorAtual: after, valorAnterior: before, variacaoPercentual: before === 0 ? null : Math.round((after - before) / Math.abs(before) * 100), tendencia: after > before ? "aumento" : after < before ? "queda" : "estavel" },
      acaoSegura: metric === "caminhada" ? "Confira se os períodos comparados representam uma rotina parecida e continue registrando." : "Se essa mudança preocupar você, confira os registros e converse com o profissional que acompanha seu cuidado; não altere tratamento com base apenas nesta comparação.",
      gravidadeSeguranca: "informativa",
      limitacaoSeguranca: "Compara medidas registradas em duas semanas completas. Não avalia normalidade clínica, não confirma causa e pode refletir diferenças de aparelho, horário ou contexto.",
    });
  }
  return results;
}
