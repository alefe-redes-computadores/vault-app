// lib/health-intelligence/medication-care-opportunities.ts

import type {
  Medicamento,
  Renovacao,
  Retirada,
  Tratamento,
} from "@/lib/types";

import {
  getClinicalStockSnapshot,
} from "@/lib/health-intelligence/clinical-stock";

import {
  sugerirRenovacao,
} from "@/lib/health-insights";

import { getLocalTodayISO } from "@/lib/health-utils";
import { decideMedicationAlerts } from "@/lib/health-intelligence/medication-alert-policy";
import { indexScheduledWithdrawals, medicationAccessAction, withdrawalDueState } from "@/lib/medication-access-action";
import { isPrescriptionOnly, renewalEventDate } from "@/lib/health-supply/renewal-event";
import { summarizeMedicationContinuity, continuityEvidenceMessage } from "@/lib/health-intelligence/medication-continuity";

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

  formato?: string;

  cores?: string[];

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

  latestRenewalKind:
    "receita" | "aquisicao" | null;

  renewalCount:
    number;

  /** Planejamento separado do histórico já registrado, sem movimentar estoque. */
  plannedAcquisitionCount?: number;
  plannedAcquisitionDate?: string | null;

  stockDays:
    number | null;

  dosesRemaining:
    number | null;

  medicationHref:
    string;

  renewalHref:
    string;

  actionHref:
    string;

  actionLabel:
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

  retiradas?:
    Retirada[];

  limit?:
    number;
}

function getEffectiveRenewalDate(
  renovacao:
    Renovacao
): string {
  return renewalEventDate(renovacao);
}

function indexMedicationRenewals(renovacoes: Renovacao[]): Map<string, Renovacao[]> {
  const byMedication = new Map<string, Renovacao[]>();
  for (const renewal of renovacoes) {
    if (!renewal.medicamento_id) continue;
    const bucket = byMedication.get(renewal.medicamento_id);
    if (bucket) bucket.push(renewal);
    else byMedication.set(renewal.medicamento_id, [renewal]);
  }
  for (const bucket of byMedication.values()) {
    bucket.sort((first, second) => getEffectiveRenewalDate(second).localeCompare(getEffectiveRenewalDate(first)));
  }
  return byMedication;
}

function indexTreatments(tratamentos: Tratamento[]) {
  const indexed = new Map<string, { treatment: Tratamento; order: number }>();
  tratamentos.forEach((treatment, order) => {
    if (treatment.id && !indexed.has(treatment.id)) indexed.set(treatment.id, { treatment, order });
  });
  return indexed;
}

function getActiveTreatment(
  medicamento: Medicamento,
  indexed: Map<string, { treatment: Tratamento; order: number }>
): Tratamento | null {
  let active: { treatment: Tratamento; order: number } | undefined;
  let fallback: { treatment: Tratamento; order: number } | undefined;
  for (const id of medicamento.tratamento_ids || []) {
    const entry = indexed.get(id);
    if (!entry) continue;
    if (!fallback || entry.order < fallback.order) fallback = entry;
    if (entry.treatment.status === "ativo" && (!active || entry.order < active.order)) active = entry;
  }
  return active?.treatment ?? fallback?.treatment ?? null;
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
  prescriptionCount,
  continuityMessage,
  insightMessage,
  scheduledWithdrawal,
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

  prescriptionCount:
    number;

  continuityMessage:
    string | null;

  insightMessage:
    string;

  scheduledWithdrawal:
    Retirada | null;
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

  if (continuityMessage) parts.push(continuityMessage);

  if (
    scheduledWithdrawal
  ) {
    const when =
      scheduledWithdrawal.data;
    const today = getLocalTodayISO();

    parts.push(
      when < today
        ? `A retirada de ${when} continua pendente. Abra o compromisso existente para concluir, reagendar ou encerrar; uma receita nova não confirma recebimento.`
        : `Existe uma retirada agendada para ${when}. O Vault considera esse compromisso no contexto de continuidade.`
    );
  } else if (
    renewalCount === 0
  ) {
    parts.push(
      "Não encontrei renovação nem retirada futura registrada para este medicamento."
    );
  } else if (continuityMessage) {
    // V222: mensagem canônica já descreve receita isolada / compra planejada.
  } else if (prescriptionCount > 0) {
    parts.push("O histórico contém receitas e aquisições. Uma receita nova não confirma reposição do estoque.");
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
  retiradas = [],
  limit = 3,
}: MedicationCareInput): MedicationCareOpportunity[] {
  const opportunities:
    MedicationCareOpportunity[] =
    [];
  const scheduledWithdrawals = indexScheduledWithdrawals(retiradas);
  const renewalsByMedication = indexMedicationRenewals(renovacoes);
  const treatmentsById = indexTreatments(tratamentos);
  const today = getLocalTodayISO();

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

    // VAULT_CLINICAL_STOCK_V47
    const stockSnapshot =
      getClinicalStockSnapshot(
        medicamento
      );

    const estoque =
      stockSnapshot.info;

    const estoqueZerado =
      stockSnapshot.state ===
        "empty" ||
      stockSnapshot.state ===
        "negative";

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

    const candidateWithdrawal = scheduledWithdrawals.get(medicamento.id) ?? null;
    const decision = decideMedicationAlerts({medication:medicamento,withdrawals:candidateWithdrawal?[candidateWithdrawal]:[],today});
    const scheduledWithdrawal = decision.withdrawal;
    const overdueWithdrawal = decision.withdrawalOverdue;
    const dueWithdrawal = Boolean(scheduledWithdrawal && scheduledWithdrawal.data === today);
    const visibleStockSignal = hasStockSignal && decision.showStock;
    const visibleRenewalSignal = insight.deveRenovar && decision.showPrescription && !decision.withdrawal;

    if (!visibleRenewalSignal && !visibleStockSignal && !overdueWithdrawal && !dueWithdrawal) continue;

    const treatment =
      getActiveTreatment(
        medicamento,
        treatmentsById
      );

    const actionInsight = overdueWithdrawal
      ? { ...insight, deveRenovar: true, motivo: "sus" as const, urgencia: "alta" as const }
      : visibleRenewalSignal
      ? insight
      : {
          ...insight,
          deveRenovar: true,
          motivo: "estoque" as const,
          urgencia: estoqueZerado ? "alta" as const : "media" as const,
        };

    const accessAction = medicationAccessAction(
      actionInsight,
      medicamento.id,
      "/",
      {
        tipoUso: medicamento.tipo_uso,
        tipoAquisicao: medicamento.tipo_aquisicao,
        scheduledWithdrawalId: scheduledWithdrawal?.id,
      }
    );

    if (!accessAction) continue;

    const medRenewals = (renewalsByMedication.get(medicamento.id) ?? []).filter(event =>
      event.user_id === medicamento.user_id &&
      (!event.person_id || !medicamento.person_id || event.person_id === medicamento.person_id) &&
      (!isPrescriptionOnly(event) || renewalEventDate(event).slice(0, 10) <= today)
    );

    // V222: um agendamento futuro não vira última compra nem estoque confirmado.
    // Escopo por usuário/pessoa também é aplicado ao resumo de continuidade.
    const continuity = summarizeMedicationContinuity(medicamento, medRenewals, today);
    const latestRenewal = continuity.latestRecorded;
    const latestRenewalDate = latestRenewal ? getEffectiveRenewalDate(latestRenewal) || null : null;
    const latestRenewalKind = latestRenewal
      ? isPrescriptionOnly(latestRenewal) ? "receita" as const : "aquisicao" as const
      : null;
    const prescriptionCount = medRenewals.filter(isPrescriptionOnly).length;

    const score =
      scoreOpportunity({
        stockDays: decision.showStock ? stockDays : null,

        estoqueZerado: decision.showStock && estoqueZerado,

        urgency:
          overdueWithdrawal ? "alta" : insight.urgencia,

        hasTreatment:
          Boolean(
            treatment
          ),

        renewalCount:
          medRenewals.length,
      });

    // Retirada atrasada com estoque SOS positivo é pendência logística, não urgência clínica.
    const level = overdueWithdrawal && decision.isAsNeeded && (decision.count ?? 0) > 0
      ? "attention"
      : overdueWithdrawal ? "urgent" : resolveLevel(score);

    const title =
      overdueWithdrawal
        ? `${medicamento.nome}: retirada atrasada`
        : dueWithdrawal
        ? `${medicamento.nome}: retirada hoje`
        : decision.showStock && estoqueZerado
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

      message: overdueWithdrawal && decision.isAsNeeded ? decision.explanation :
        buildMessage({
          medicamento,

          treatment,

          stockDays,

          dosesRemaining,

          estoqueZerado,

          renewalCount:
            medRenewals.length,

          prescriptionCount,
          continuityMessage: continuityEvidenceMessage(continuity),

          insightMessage:
            insight.mensagem,

          scheduledWithdrawal,
        }),

      treatmentId,

      treatmentName:
        treatment?.nome ??
        null,

      formato:
        medicamento.formato,

      cores:
        medicamento.cores,

      latestRenewalDate,
      latestRenewalKind,

      renewalCount:
        medRenewals.length,
      plannedAcquisitionCount: continuity.plannedAcquisitions,
      plannedAcquisitionDate: continuity.nextPlanned ? renewalEventDate(continuity.nextPlanned).slice(0, 10) : null,

      stockDays,

      dosesRemaining,

      medicationHref:
        `/saude/medicamentos/detalhes?id=${encodeURIComponent(
          medicamento.id
        )}`,

      renewalHref:
        accessAction.href,

      actionHref:
        accessAction.href,

      actionLabel:
        accessAction.cta,

      treatmentHref:
        treatmentId
          ? `/saude/tratamentos/detalhes?id=${encodeURIComponent(
              treatmentId
            )}`
          : null,

      score: overdueWithdrawal ? Math.max(score, 90) : score,
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
