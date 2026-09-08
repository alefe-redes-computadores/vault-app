// lib/health-intelligence/medication-care-opportunities.ts

import type {
  Medicamento,
  Renovacao,
  Tratamento,
} from "@/lib/types";

import {
  computeEstoqueInfo,
} from "@/lib/health-utils";

import {
  sugerirRenovacao,
} from "@/lib/health-insights";

export type MedicationCareOpportunityLevel =
  | "urgent"
  | "attention"
  | "planning";

export interface MedicationCareOpportunity {
  id: string;

  level:
    MedicationCareOpportunityLevel;

  medicamentoId:
    string;

  medicamentoNome:
    string;

  title:
    string;

  message:
    string;

  treatmentId:
    string | null;

  treatmentName:
    string | null;

  latestRenewalDate:
    string | null;

  renewalCount:
    number;

  stockDays:
    number | null;

  dosesRemaining:
    number | null;

  medicationHref:
    string;

  renewalHref:
    string;

  treatmentHref:
    string | null;

  score:
    number;
}

interface MedicationCareInput {
  medicamentos:
    Medicamento[];

  tratamentos:
    Tratamento[];

  renovacoes:
    Renovacao[];

  limit?:
    number;
}

function getEffectiveRenewalDate(
  renovacao:
    Renovacao
): string {
  return (
    renovacao.data_aquisicao?.trim() ||
    renovacao.data?.trim() ||
    renovacao.created_at?.trim() ||
    ""
  );
}

function getMedicationRenewals(
  medicamentoId:
    string,
  renovacoes:
    Renovacao[]
): Renovacao[] {
  return renovacoes
    .filter(
      (
        renovacao
      ) =>
        renovacao.medicamento_id ===
        medicamentoId
    )
    .sort(
      (
        first,
        second
      ) =>
        getEffectiveRenewalDate(
          second
        ).localeCompare(
          getEffectiveRenewalDate(
            first
          )
        )
    );
}

function isTreatmentLinked(
  tratamento:
    Tratamento,
  ids:
    string[]
): boolean {
  const tratamentoId =
    tratamento.id;

  return (
    typeof tratamentoId ===
      "string" &&
    tratamentoId.length >
      0 &&
    ids.includes(
      tratamentoId
    )
  );
}

function getActiveTreatment(
  medicamento:
    Medicamento,
  tratamentos:
    Tratamento[]
): Tratamento | null {
  const ids =
    medicamento.tratamento_ids ||
    [];

  if (
    ids.length ===
    0
  ) {
    return null;
  }

  return (
    tratamentos.find(
      (
        tratamento
      ) =>
        isTreatmentLinked(
          tratamento,
          ids
        ) &&
        tratamento.status ===
          "ativo"
    ) ??
    tratamentos.find(
      (
        tratamento
      ) =>
        isTreatmentLinked(
          tratamento,
          ids
        )
    ) ??
    null
  );
}

function scoreOpportunity({
  stockDays,
  estoqueZerado,
  urgency,
  hasTreatment,
  renewalCount,
}: {
  stockDays:
    number | null;

  estoqueZerado:
    boolean;

  urgency:
    "alta" |
    "media" |
    "baixa" |
    "nenhuma";

  hasTreatment:
    boolean;

  renewalCount:
    number;
}): number {
  let score = 0;

  if (
    estoqueZerado
  ) {
    score += 100;
  } else if (
    stockDays !== null &&
    stockDays <= 3
  ) {
    score += 80;
  } else if (
    stockDays !== null &&
    stockDays <= 7
  ) {
    score += 55;
  }

  if (
    urgency === "alta"
  ) {
    score += 50;
  } else if (
    urgency === "media"
  ) {
    score += 30;
  } else if (
    urgency === "baixa"
  ) {
    score += 10;
  }

  if (hasTreatment) {
    score += 8;
  }

  if (
    renewalCount === 0
  ) {
    score += 5;
  }

  return score;
}

function resolveLevel(
  score:
    number
): MedicationCareOpportunityLevel {
  if (
    score >= 100
  ) {
    return "urgent";
  }

  if (
    score >= 55
  ) {
    return "attention";
  }

  return "planning";
}

function buildMessage({
  medicamento,
  treatment,
  stockDays,
  dosesRemaining,
  estoqueZerado,
  renewalCount,
  insightMessage,
}: {
  medicamento:
    Medicamento;

  treatment:
    Tratamento | null;

  stockDays:
    number | null;

  dosesRemaining:
    number | null;

  estoqueZerado:
    boolean;

  renewalCount:
    number;

  insightMessage:
    string;
}): string {
  const parts:
    string[] = [];

  if (
    estoqueZerado
  ) {
    parts.push(
      `O estoque registrado de ${medicamento.nome} chegou a zero.`
    );
  } else if (
    stockDays !== null &&
    stockDays <= 7
  ) {
    parts.push(
      `O estoque estimado de ${medicamento.nome} pode cobrir cerca de ${stockDays} dia(s).`
    );
  } else if (
    dosesRemaining !== null &&
    dosesRemaining <= 5
  ) {
    parts.push(
      `Restam aproximadamente ${dosesRemaining} dose(s) registradas para ${medicamento.nome}.`
    );
  } else if (
    insightMessage
  ) {
    parts.push(
      insightMessage
    );
  }

  if (
    treatment?.nome
  ) {
    parts.push(
      `Este medicamento está vinculado ao tratamento "${treatment.nome}".`
    );
  }

  if (
    renewalCount === 0
  ) {
    parts.push(
      "Não encontrei renovação registrada para este medicamento."
    );
  } else {
    parts.push(
      "Existe histórico de renovação registrado. Confira se o registro mais recente já representa sua situação atual."
    );
  }

  return parts.join(" ");
}

export function buildMedicationCareOpportunities({
  medicamentos,
  tratamentos,
  renovacoes,
  limit = 3,
}: MedicationCareInput): MedicationCareOpportunity[] {
  const opportunities:
    MedicationCareOpportunity[] =
    [];

  for (
    const medicamento of
      medicamentos
  ) {
    if (
      !medicamento.id ||
      medicamento.status ===
        "descontinuado"
    ) {
      continue;
    }

    const insight =
      sugerirRenovacao(
        medicamento
      );

    const estoque =
      computeEstoqueInfo(
        medicamento
      );

    const estoqueZerado =
      Boolean(
        estoque &&
        estoque.quantidadeRestante <= 0
      );

    const stockDays =
      estoque
        ?.diasRestantes ??
      null;

    const dosesRemaining =
      estoque &&
      estoque
        .estimativaDosesDisponivel
        ? estoque.dosesRestantes
        : null;

    const hasStockSignal =
      estoqueZerado ||
      (
        stockDays !== null &&
        stockDays <= 10
      ) ||
      (
        dosesRemaining !== null &&
        dosesRemaining <= 5
      );

    if (
      !insight.deveRenovar &&
      !hasStockSignal
    ) {
      continue;
    }

    const treatment =
      getActiveTreatment(
        medicamento,
        tratamentos
      );

    const medRenewals =
      getMedicationRenewals(
        medicamento.id,
        renovacoes
      );

    const latestRenewal =
      medRenewals[0];

    const latestRenewalDate =
      latestRenewal
        ? getEffectiveRenewalDate(
            latestRenewal
          ) || null
        : null;

    const score =
      scoreOpportunity({
        stockDays,

        estoqueZerado,

        urgency:
          insight.urgencia,

        hasTreatment:
          Boolean(
            treatment
          ),

        renewalCount:
          medRenewals.length,
      });

    const level =
      resolveLevel(
        score
      );

    const title =
      estoqueZerado
        ? `${medicamento.nome} está sem estoque registrado`
        : level === "urgent"
          ? `${medicamento.nome} precisa de revisão`
          : `Planeje ${medicamento.nome}`;

    const treatmentId =
      typeof treatment?.id ===
        "string"
        ? treatment.id
        : null;

    opportunities.push({
      id:
        `medication-care:${medicamento.id}`,

      level,

      medicamentoId:
        medicamento.id,

      medicamentoNome:
        medicamento.nome,

      title,

      message:
        buildMessage({
          medicamento,

          treatment,

          stockDays,

          dosesRemaining,

          estoqueZerado,

          renewalCount:
            medRenewals.length,

          insightMessage:
            insight.mensagem,
        }),

      treatmentId,

      treatmentName:
        treatment?.nome ??
        null,

      latestRenewalDate,

      renewalCount:
        medRenewals.length,

      stockDays,

      dosesRemaining,

      medicationHref:
        `/saude/medicamentos/detalhes?id=${encodeURIComponent(
          medicamento.id
        )}`,

      renewalHref:
        `/saude/renovacao/nova?medicamento_id=${encodeURIComponent(
          medicamento.id
        )}`,

      treatmentHref:
        treatmentId
          ? `/saude/tratamentos/detalhes?id=${encodeURIComponent(
              treatmentId
            )}`
          : null,

      score,
    });
  }

  return opportunities
    .sort(
      (
        first,
        second
      ) =>
        second.score -
        first.score
    )
    .slice(
      0,
      Math.max(
        1,
        limit
      )
    );
}
