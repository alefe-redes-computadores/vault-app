import type { Renovacao } from "@/lib/types";

export type HomeFinancialSummary = { gastoMesAtual: number; gastoMesAnterior: number; diff: number };

export function buildHomeFinancialSummary(renewals: Renovacao[], now = new Date()): HomeFinancialSummary {
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const previousMonth = currentMonth === 0 ? 11 : currentMonth - 1;
  const previousYear = currentMonth === 0 ? currentYear - 1 : currentYear;
  let gastoMesAtual = 0;
  let gastoMesAnterior = 0;

  for (const renewal of renewals) {
    if (renewal.tipo_aquisicao === "sus" || renewal.tipo_aquisicao === "gratuito") continue;
    const price = Number(renewal.preco);
    const date = renewal.data_aquisicao?.trim() || renewal.data?.trim();
    if (!Number.isFinite(price) || price <= 0 || !date) continue;
    const match = /^(\d{4})-(\d{2})-\d{2}/.exec(date);
    if (!match) continue;
    const year = Number(match[1]);
    const month = Number(match[2]) - 1;
    if (year === currentYear && month === currentMonth) gastoMesAtual += price;
    else if (year === previousYear && month === previousMonth) gastoMesAnterior += price;
  }
  return { gastoMesAtual, gastoMesAnterior, diff: gastoMesAtual - gastoMesAnterior };
}
