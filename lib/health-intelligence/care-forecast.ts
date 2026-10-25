import type { HealthInsightContext } from "@/lib/health-insights";
import { getClinicalStockSnapshot } from "./clinical-stock";
import { isFutureAcquisition, isPrescriptionOnly, realizedAcquisitionExpense, renewalEventDate } from "@/lib/health-supply/renewal-event";
import { getLocalTodayISO } from "@/lib/health-utils";

export type CareForecastHorizon = 30 | 60 | 90;
export type CareForecastWindow = {
  days: CareForecastHorizon;
  stockRisk: number;
  unknownStock: number;
  plannedAcquisitions: number;
  plannedKnownCost: number;
  expectedRefillCost: number;
  expectedRefillCostCoverage: number;
};
export type WithdrawalReadiness = {
  id: string;
  medicationId: string;
  medicationName: string;
  date: string;
  overdue: boolean;
  prescriptionRequired: boolean;
  prescriptionLinked: boolean;
  missing: string[];
  validDate: boolean;
  href: string;
};
export type CareForecastActionKind = "overdue_withdrawal" | "upcoming_withdrawal" | "planned_acquisition" | "stock_projection" | "review_stock_data" | "review_schedule_data";
export type CareForecastAction = {
  id: string;
  kind: CareForecastActionKind;
  lane: "now" | "next" | "follow_up" | "review_data";
  medicationId: string;
  medicationName: string;
  date: string | null;
  title: string;
  reason: string;
  href: string;
  evidence: string[];
};
export type CareForecast = { windows: CareForecastWindow[]; withdrawals: WithdrawalReadiness[]; actions: CareForecastAction[]; generatedFor: string };

const validDay = (value?: string) => Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));
const dayDistance = (from: string, to: string) => Math.ceil((Date.parse(`${to}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`)) / 86400000);
const safeRenewalDate = (value: Parameters<typeof renewalEventDate>[0]) => String(renewalEventDate(value) || "");

/** Read-only projection. Missing stock/price remains unknown and never becomes zero. */
export function buildCareForecast(context: HealthInsightContext, today = context.hoje || getLocalTodayISO()): CareForecast {
  const ownedMedications = context.medicamentos.filter(item => item.person_id === context.personId && item.status !== "descontinuado");
  const medicationById = new Map(ownedMedications.filter(item => item.id).map(item => [item.id!, item]));
  const events = context.renovacoes.filter(item => item.person_id === context.personId || (!item.person_id && item.user_id === context.userId));
  const stockByMedication = new Map(ownedMedications.filter(item => item.id).map(item => [item.id!, getClinicalStockSnapshot(item)]));
  const lastPaidByMedication = new Map<string, number>();
  for (const event of [...events].sort((a, b) => safeRenewalDate(b).localeCompare(safeRenewalDate(a)))) {
    if (!lastPaidByMedication.has(event.medicamento_id) && realizedAcquisitionExpense(event, today) > 0) lastPaidByMedication.set(event.medicamento_id, event.preco!);
  }
  const windows = ([30, 60, 90] as const).map(days => {
    const future = events.filter(item => !isPrescriptionOnly(item) && isFutureAcquisition(item, today) && dayDistance(today, safeRenewalDate(item).slice(0, 10)) <= days);
    const stockRiskItems = ownedMedications.filter(item => {
      if (item.tipo_uso === "sos" || item.tipo_uso === "esporadico") return false;
      const stock = stockByMedication.get(item.id || "");
      return Boolean(stock && stock.daysRemaining !== null && stock.daysRemaining <= days);
    });
    const unknownStock = ownedMedications.filter(item => item.tipo_uso !== "sos" && item.tipo_uso !== "esporadico" && stockByMedication.get(item.id || "")?.state === "unknown").length;
    const costs = stockRiskItems.flatMap(item => {
      const value = lastPaidByMedication.get(item.id || "") ?? (typeof item.preco === "number" && item.preco > 0 ? item.preco : null);
      return value === null ? [] : [value];
    });
    return { days, stockRisk: stockRiskItems.length, unknownStock, plannedAcquisitions: future.length,
      plannedKnownCost: future.reduce((sum, item) => sum + (typeof item.preco === "number" && item.preco > 0 ? item.preco : 0), 0),
      expectedRefillCost: costs.reduce((sum, value) => sum + value, 0),
      expectedRefillCostCoverage: stockRiskItems.length ? Math.round(costs.length / stockRiskItems.length * 100) : 100 };
  });
  const withdrawalEvents = new Map(events.filter(item => item.id).map(item => [item.id!, item]));
  const withdrawals = context.retiradas.filter(item => item.person_id === context.personId && item.status !== "realizada" && item.status !== "cancelada").map(item => {
    const med = medicationById.get(item.medicamento_id);
    const source = item.renovacao_origem_id ? withdrawalEvents.get(item.renovacao_origem_id) : undefined;
    const prescriptionRequired = item.exige_nova_receita === true;
    const prescriptionLinked = Boolean(source && (source.document_id || source.anexo_url) && isPrescriptionOnly(source));
    const missing = [prescriptionRequired && !prescriptionLinked ? "Receita ou documento vinculado" : "", !item.local_id && !item.hospital_id && !item.farmacia_id ? "Local da retirada" : ""].filter(Boolean);
    const date = typeof item.data === "string" ? item.data : "";
    const validDate = validDay(date);
    return { id: item.id || `${item.medicamento_id}:${date || "sem-data"}`, medicationId: item.medicamento_id,
      medicationName: med?.nome || item.medicamento_nome || "Medicamento", date,
      overdue: validDate ? date < today : false, prescriptionRequired, prescriptionLinked, missing, validDate,
      href: item.id ? `/saude/retiradas/detalhes?id=${encodeURIComponent(item.id)}` : `/saude/retiradas?medicamento_id=${encodeURIComponent(item.medicamento_id)}` };
  }).sort((a, b) => a.date.localeCompare(b.date) || a.medicationName.localeCompare(b.medicationName, "pt-BR"));
  const actions: CareForecastAction[] = withdrawals.map(item => ({
    // V257 preservado para datas válidas: kind: item.overdue ? "overdue_withdrawal" : "upcoming_withdrawal"
    id: `withdrawal:${item.id}`,
    kind: !item.validDate ? "review_schedule_data" : item.overdue ? "overdue_withdrawal" : "upcoming_withdrawal",
    lane: !item.validDate ? "review_data" : item.overdue ? "now" : dayDistance(today, item.date) <= 7 ? "next" : "follow_up",
    medicationId: item.medicationId,
    medicationName: item.medicationName,
    date: item.date,
    title: !item.validDate ? `${item.medicationName}: revisar data da retirada` : item.overdue ? `${item.medicationName}: retirada continua pendente` : `${item.medicationName}: preparar retirada`,
    reason: !item.validDate ? "O compromisso existe, mas a data não é válida; ele não foi tratado como vencido nem concluído." : item.overdue ? "O compromisso passou da data e ainda não foi concluído, cancelado ou reagendado." : item.missing.length ? `Falta organizar: ${item.missing.join(" e ")}.` : "Compromisso registrado com os dados essenciais disponíveis.",
    href: item.href,
    evidence: [item.validDate ? `Data registrada: ${item.date}` : "Data ausente ou inválida", item.prescriptionRequired ? item.prescriptionLinked ? "Receita/documento vinculado" : "Receita/documento ainda não vinculado" : "Sem exigência explícita de nova receita"],
  }));
  const nextPlannedByMedication = new Map<string, (typeof events)[number]>();
  for (const event of events.filter(item => !isPrescriptionOnly(item) && isFutureAcquisition(item, today)).sort((a, b) => safeRenewalDate(a).localeCompare(safeRenewalDate(b)))) {
    if (!nextPlannedByMedication.has(event.medicamento_id)) nextPlannedByMedication.set(event.medicamento_id, event);
  }
  for (const [medicationId, event] of nextPlannedByMedication) {
    const date = safeRenewalDate(event).slice(0, 10), medication = medicationById.get(medicationId);
    actions.push({ id: `planned:${event.id || `${medicationId}:${date}`}`, kind: "planned_acquisition", lane: dayDistance(today, date) <= 30 ? "next" : "follow_up", medicationId, medicationName: medication?.nome || event.medicamento_nome || "Medicamento", date,
      title: `${medication?.nome || event.medicamento_nome || "Medicamento"}: aquisição planejada`, reason: "Planejamento futuro; ainda não representa compra, gasto ou entrada no estoque.", href: event.id ? `/saude/renovacao/detalhes?id=${encodeURIComponent(event.id)}` : `/saude/renovacao?medicamento_id=${encodeURIComponent(medicationId)}`, evidence: [`Data planejada: ${date}`, typeof event.preco === "number" && event.preco > 0 ? "Valor planejado informado" : "Valor planejado desconhecido"] });
  }
  for (const medication of ownedMedications) {
    if (!medication.id || medication.tipo_uso === "sos" || medication.tipo_uso === "esporadico") continue;
    const stock = stockByMedication.get(medication.id);
    const medicationName = medication.nome || "Medicamento";
    if (!stock || stock.state === "unknown") {
      actions.push({ id: `stock-data:${medication.id}`, kind: "review_stock_data", lane: "review_data", medicationId: medication.id, medicationName, date: null, title: `${medicationName}: estoque sem projeção`, reason: "Sem quantidade ou ritmo suficiente para antecipar reposição com segurança.", href: `/saude/medicamentos/detalhes?id=${encodeURIComponent(medication.id)}`, evidence: ["Estoque desconhecido não foi convertido em zero"] });
    } else if (stock.daysRemaining !== null && stock.daysRemaining <= 30) {
      actions.push({ id: `stock:${medication.id}`, kind: "stock_projection", lane: stock.daysRemaining <= 7 ? "next" : "follow_up", medicationId: medication.id, medicationName, date: null, title: `${medicationName}: revisar continuidade`, reason: `O estoque registrado projeta cerca de ${Math.max(0, stock.daysRemaining)} dia(s), sem presumir que o consumo futuro será igual.`, href: `/saude/medicamentos/detalhes?id=${encodeURIComponent(medication.id)}`, evidence: ["Projeção baseada no estoque e na rotina cadastrados"] });
    }
  }
  const laneRank = { now: 0, next: 1, follow_up: 2, review_data: 3 } as const;
  actions.sort((a, b) => laneRank[a.lane] - laneRank[b.lane] || (a.date || "9999").localeCompare(b.date || "9999") || String(a.medicationName || "").localeCompare(String(b.medicationName || ""), "pt-BR"));
  return { windows, withdrawals, actions, generatedFor: today };
}

export function daysSinceLastCompletedConsultation(context: HealthInsightContext, today = context.hoje || getLocalTodayISO()): number | null {
  const last = context.consultas.filter(item => item.person_id === context.personId && item.status === "realizada" && validDay(item.data) && item.data <= today).sort((a, b) => b.data.localeCompare(a.data))[0];
  return last ? Math.max(1, Math.min(365, dayDistance(last.data, today) + 1)) : null;
}
