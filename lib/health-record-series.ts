// lib/health-record-series.ts

import { buildHealthRecordKey } from "@/lib/health-records";
import type { RegistroSaude } from "@/lib/types";

export type HealthRecordPeriod = 7 | 30 | 90;

export interface HealthRecordSeriesSummary {
  key: string;
  nome: string;
  categoria: RegistroSaude["categoria"];
  tipo: string;
  unidade?: string;
  total: number;
  diasComRegistro: number;
  primeiraData: string;
  ultimaData: string;
  mediaAtual: number | null;
  mediaAnterior: number | null;
  variacaoPercentual: number | null;
  tendencia: "subiu" | "caiu" | "estavel" | "sem_comparacao";
  registros: RegistroSaude[];
}

function dateKeyDaysAgo(today: Date, days: number): string {
  const date = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  date.setDate(date.getDate() - days);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function numericValue(record: RegistroSaude): number | null {
  if (typeof record.valor_numerico === "number" && Number.isFinite(record.valor_numerico)) {
    return record.valor_numerico;
  }
  if (typeof record.intensidade === "number" && Number.isFinite(record.intensidade)) {
    return record.intensidade;
  }
  return null;
}

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function buildHealthRecordSeries(
  records: RegistroSaude[],
  period: HealthRecordPeriod,
  today = new Date()
): HealthRecordSeriesSummary[] {
  const currentStart = dateKeyDaysAgo(today, period - 1);
  const previousStart = dateKeyDaysAgo(today, period * 2 - 1);
  const previousEnd = dateKeyDaysAgo(today, period);
  const todayKey = dateKeyDaysAgo(today, 0);
  const groups = new Map<string, RegistroSaude[]>();

  for (const record of records) {
    if (!record.data || record.data < previousStart || record.data > todayKey) continue;
    const key = record.registro_chave || buildHealthRecordKey(record);
    groups.set(key, [...(groups.get(key) || []), record]);
  }

  return Array.from(groups.entries()).map(([key, all]) => {
    const current = all.filter((item) => item.data >= currentStart && item.data <= todayKey)
      .sort((a, b) => (b.data + b.horario).localeCompare(a.data + a.horario));
    const previous = all.filter((item) => item.data >= previousStart && item.data <= previousEnd);
    const latest = current[0];
    const currentAverage = average(current.map(numericValue).filter((value): value is number => value !== null));
    const previousAverage = average(previous.map(numericValue).filter((value): value is number => value !== null));
    let variation: number | null = null;
    let trend: HealthRecordSeriesSummary["tendencia"] = "sem_comparacao";

    if (currentAverage !== null && previousAverage !== null) {
      if (previousAverage === 0) {
        variation = currentAverage === 0 ? 0 : null;
      } else {
        variation = ((currentAverage - previousAverage) / Math.abs(previousAverage)) * 100;
      }
      if (variation !== null) {
        trend = Math.abs(variation) < 5 ? "estavel" : variation > 0 ? "subiu" : "caiu";
      }
    }

    return {
      key,
      nome: latest?.nome || all[0]?.nome || "Registro",
      categoria: latest?.categoria || all[0].categoria,
      tipo: latest?.tipo || all[0].tipo,
      unidade: latest?.unidade_medida || all.find((item) => item.unidade_medida)?.unidade_medida,
      total: current.length,
      diasComRegistro: new Set(current.map((item) => item.data)).size,
      primeiraData: current[current.length - 1]?.data || "",
      ultimaData: latest?.data || "",
      mediaAtual: currentAverage,
      mediaAnterior: previousAverage,
      variacaoPercentual: variation,
      tendencia: trend,
      registros: current,
    };
  }).filter((series) => series.total > 0)
    .sort((a, b) => b.ultimaData.localeCompare(a.ultimaData) || b.total - a.total);
}
