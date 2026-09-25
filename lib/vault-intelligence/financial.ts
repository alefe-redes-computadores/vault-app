import type { Renovacao } from "@/lib/types";
import type { VaultGeneralInsight } from "./types";

// VAULT_FINANCIAL_BRAIN_V54
// Escopo deliberado: o Vault atual não possui ledger bancário, saldo,
// faturas ou transações gerais. Só tratamos como gasto o que o modelo
// realmente conhece: aquisições pagas de medicamentos.

const DAY_MS = 86_400_000;

type PaidAcquisition = {
  medicationId: string;
  medicationName: string;
  amount: number;
  at: Date;
};

function parseDate(value?: string | null): Date | null {
  if (!value?.trim()) return null;
  const raw = value.trim();
  const ymd = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  const date = ymd
    ? new Date(Number(ymd[1]), Number(ymd[2]) - 1, Number(ymd[3]), 12)
    : new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

function acquisitionDate(item: Renovacao): Date | null {
  return parseDate(item.data_aquisicao ?? item.data);
}

function amountOf(item: Renovacao): number | null {
  return typeof item.preco === "number" &&
    Number.isFinite(item.preco) &&
    item.preco >= 0
    ? item.preco
    : null;
}

function money(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function ageDays(date: Date, now: Date): number {
  return (now.getTime() - date.getTime()) / DAY_MS;
}

function total(items: PaidAcquisition[]): number {
  return items.reduce((sum, item) => sum + item.amount, 0);
}

export interface VaultFinancialAnalysis {
  insights: VaultGeneralInsight[];
  paidAcquisitions: number;
  spend90d: number;
  pricedCoverage: number;
}

export function buildVaultFinancialIntelligence(
  renovacoes: Renovacao[],
  personId: string,
  userId: string,
  now = new Date(),
): VaultFinancialAnalysis {
  const owned = renovacoes.filter(
    (item) => item.user_id === userId && item.person_id === personId,
  );
  const purchased = owned.filter(
    (item) => item.tipo_aquisicao === "comprado",
  );

  const missingPrice = purchased.filter((item) => amountOf(item) === null);
  const invalidDate = purchased.filter((item) => acquisitionDate(item) === null);

  const paid: PaidAcquisition[] = purchased.flatMap((item) => {
    const amount = amountOf(item);
    const at = acquisitionDate(item);
    if (amount === null || !at) return [];
    return [{
      medicationId: item.medicamento_id,
      medicationName: item.medicamento_nome?.trim() || "Medicamento",
      amount,
      at,
    }];
  });

  const last30 = paid.filter((item) => {
    const age = ageDays(item.at, now);
    return age >= 0 && age < 30;
  });
  const previous30 = paid.filter((item) => {
    const age = ageDays(item.at, now);
    return age >= 30 && age < 60;
  });
  const last90 = paid.filter((item) => {
    const age = ageDays(item.at, now);
    return age >= 0 && age < 90;
  });

  const spend30 = total(last30);
  const previousSpend30 = total(previous30);
  const spend90d = total(last90);
  const pricedCoverage = purchased.length
    ? Math.round((paid.length / purchased.length) * 100)
    : 100;

  const insights: VaultGeneralInsight[] = [];

  if (purchased.length && (missingPrice.length || invalidDate.length)) {
    insights.push({
      id: "financial-acquisition-coverage-v54",
      kind: "data_quality",
      title: "Histórico financeiro incompleto",
      message: `${missingPrice.length} compra(s) não têm valor total utilizável e ${invalidDate.length} não têm data financeira interpretável. O Vault exclui esses registros dos totais em vez de estimar valores.`,
      confidence: "alta",
      sample: purchased.length,
      sources: ["Aquisições de medicamentos da pessoa ativa"],
      evidence: [
        `${paid.length} de ${purchased.length} compra(s) entram nos cálculos`,
        `Cobertura utilizável: ${pricedCoverage}%`,
      ],
      actionLabel: "Revisar aquisições",
      href: "/saude/renovacao",
      priority: 16,
    });
  }

  if (last30.length >= 2 && previous30.length >= 2 && previousSpend30 > 0) {
    const delta = ((spend30 - previousSpend30) / previousSpend30) * 100;
    if (Math.abs(delta) >= 25) {
      insights.push({
        id: "financial-medication-spend-change-v54",
        kind: "financial",
        title: "Mudança nos gastos com medicamentos",
        message: `Nos últimos 30 dias, as compras registradas somaram ${money(spend30)}, valor ${Math.abs(delta).toFixed(0)}% ${delta > 0 ? "maior" : "menor"} que nos 30 dias anteriores. Isso descreve apenas o histórico cadastrado no Vault.`,
        confidence: "media",
        sample: last30.length + previous30.length,
        sources: ["Aquisições pagas de medicamentos dos últimos 60 dias"],
        evidence: [
          `Últimos 30 dias: ${money(spend30)} em ${last30.length} compra(s)`,
          `30 dias anteriores: ${money(previousSpend30)} em ${previous30.length} compra(s)`,
        ],
        actionLabel: "Ver aquisições",
        href: "/saude/renovacao",
        priority: 28,
      });
    }
  }

  if (last90.length >= 3 && spend90d > 0) {
    const grouped = new Map<string, { name: string; amount: number; count: number }>();
    for (const item of last90) {
      const current = grouped.get(item.medicationId) ?? {
        name: item.medicationName,
        amount: 0,
        count: 0,
      };
      current.amount += item.amount;
      current.count += 1;
      grouped.set(item.medicationId, current);
    }
    const top = [...grouped.values()].sort((a, b) => b.amount - a.amount)[0];
    const share = top ? (top.amount / spend90d) * 100 : 0;
    if (top && share >= 60 && top.count >= 2) {
      insights.push({
        id: "financial-medication-concentration-v54",
        kind: "financial",
        title: "Gasto concentrado em um medicamento",
        message: `${top.name} representa ${share.toFixed(0)}% do valor registrado em compras de medicamentos nos últimos 90 dias. Isso é concentração histórica, não uma conclusão de que o gasto seja inadequado.`,
        confidence: "media",
        sample: last90.length,
        sources: ["Aquisições pagas de medicamentos dos últimos 90 dias"],
        evidence: [
          `${money(top.amount)} de ${money(spend90d)} no período`,
          `${top.count} aquisição(ões) do medicamento`,
        ],
        actionLabel: "Ver histórico",
        href: "/saude/renovacao",
        priority: 34,
      });
    }
  }

  if (paid.length >= 3 && !insights.some((item) => item.kind === "financial")) {
    insights.push({
      id: "financial-medication-baseline-v54",
      kind: "financial",
      title: "Base financeira de medicamentos disponível",
      message: `O Vault consegue analisar ${paid.length} aquisição(ões) pagas com valor e data utilizáveis. A análise atual é limitada a medicamentos e não presume saldo, renda, faturas ou outras despesas.`,
      confidence: "alta",
      sample: paid.length,
      sources: ["Histórico de aquisições pagas de medicamentos"],
      evidence: [
        `${money(spend90d)} registrado nos últimos 90 dias`,
        `${pricedCoverage}% de cobertura utilizável`,
      ],
      actionLabel: "Ver aquisições",
      href: "/saude/renovacao",
      priority: 55,
    });
  }

  return { insights, paidAcquisitions: paid.length, spend90d, pricedCoverage };
}
