import type { RegistroSaude } from "@/lib/types";
import type { HealthInsight } from "@/lib/health-insights";
import { hydrationRecordedPattern, type HydrationReference } from "@/lib/health-intelligence/hydration-reference";

function dayDistance(from: string, to: string): number {
  const a = Date.parse(`${from}T00:00:00Z`);
  const b = Date.parse(`${to}T00:00:00Z`);
  return Number.isFinite(a) && Number.isFinite(b) ? Math.round((b - a) / 86_400_000) : Number.NaN;
}

function average(values: number[]): number {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

export function buildHydrationInsights(records: RegistroSaude[], today: string, context?: {goalMl:number|null;reference:HydrationReference|null}): HealthInsight[] {
  const water = records.filter((record) => record.tipo === "agua");
  if (!water.length) return [];

  const invalid = water.filter((record) => record.unidade_medida !== "ml" || typeof record.valor_numerico !== "number" || !Number.isFinite(record.valor_numerico) || record.valor_numerico <= 0);
  const valid = water.filter((record) => record.unidade_medida === "ml" && typeof record.valor_numerico === "number" && Number.isFinite(record.valor_numerico) && record.valor_numerico > 0 && dayDistance(record.data, today) >= 1 && dayDistance(record.data, today) <= 14);
  const insights: HealthInsight[] = [];

  if (invalid.length) {
    insights.push({
      id: "hidratacao-dados-incompletos", kind: "data_quality", categoria: "dados",
      titulo: "Alguns registros de água precisam de revisão",
      mensagem: `${invalid.length} registro(s) de água não possuem um valor estruturado positivo em ml e ficaram fora da análise de hidratação.`,
      urgencia: "baixa", confianca: "alta", amostra: invalid.length,
      link: "/saude/hidratacao", entidadeTipo: "registro_saude",
      fontesInternas: ["Registros de Saúde · Água"],
      evidencias: ["Somente valores positivos com unidade explícita ml entram nos totais", "Registros ausentes nunca são convertidos em consumo zero"],
    });
  }

  const totals = new Map<string, number>();
  for (const record of valid) totals.set(record.data, (totals.get(record.data) || 0) + (record.valor_numerico || 0));
  const observed = [...totals.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  // M70: a user-selected target is authoritative; weight-derived range is only a discussion aid.
  const target = context?.goalMl && context.goalMl > 0 ? context.goalMl : context?.reference?.middleMl ?? null;
  if (target) {
    const pattern = hydrationRecordedPattern(records, today, target);
    if (pattern.level !== "insufficient" && pattern.level !== "within") {
      const below = pattern.level === "low" || pattern.level === "very_low";
      const pronounced = pattern.level === "very_low" || pattern.level === "very_high";
      insights.push({
        id: `hidratacao-referencia-${today}-${pattern.level}`,
        kind: "observation", categoria: "historico",
        titulo: below ? "Água registrada abaixo da referência" : "Água registrada acima da referência",
        mensagem: `A média dos ${pattern.dayCount} dias com registro nos 7 dias completos anteriores foi ${pattern.averageMl} ml, ${below ? "abaixo" : "acima"} da referência de ${target} ml. Isso não comprova quanto foi realmente ingerido nem identifica desidratação ou excesso de água.`,
        urgencia: pronounced ? "media" : "baixa", confianca: "baixa", amostra: pattern.dayCount, periodoDias: 7,
        link: "/saude/hidratacao", entidadeTipo: "registro_saude",
        fontesInternas: ["Registros de Saúde · Água", context?.goalMl ? "Meta informada pela pessoa" : "Referência ilustrativa pelo peso"],
        evidencias: [`${pattern.dayCount}/7 dias possuíam registros`, `Média nos dias observados: ${pattern.averageMl} ml`, "O dia atual ainda incompleto não entra na média; dias sem registro não representam consumo zero"],
      });
    }
  }
  if (observed.length < 6) return insights;

  const recent = observed.slice(-3);
  const previous = observed.slice(0, -3).slice(-7);
  if (previous.length < 3) return insights;
  const recentAverage = average(recent.map(([, value]) => value));
  const previousAverage = average(previous.map(([, value]) => value));
  if (previousAverage <= 0) return insights;
  const change = Math.round(((recentAverage - previousAverage) / previousAverage) * 100);
  const absolute = Math.round(Math.abs(recentAverage - previousAverage));
  if (Math.abs(change) < 25 || absolute < 250) return insights;

  const direction = change > 0 ? "acima" : "abaixo";
  insights.push({
    id: `hidratacao-mudanca-${recent[0][0]}`, kind: "pattern", categoria: "historico",
    titulo: "Mudança nos registros de hidratação",
    mensagem: `Nos 3 dias com registros mais recentes, a média registrada ficou ${Math.abs(change)}% ${direction} da média dos ${previous.length} dias registrados anteriores. Isso descreve somente o que foi salvo no Vault.`,
    urgencia: "nenhuma", confianca: observed.length >= 10 ? "media" : "baixa", amostra: observed.length, periodoDias: 14,
    link: "/saude/hidratacao", entidadeTipo: "registro_saude",
    fontesInternas: ["Registros de Saúde · Água"],
    evidencias: [`Média recente: ${Math.round(recentAverage)} ml em 3 dias com registro`, `Média anterior: ${Math.round(previousAverage)} ml em ${previous.length} dias com registro`, `${observed.length} dias com dados foram considerados; dias ausentes não viraram zero`],
  });
  return insights;
}
