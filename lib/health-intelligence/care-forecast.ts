import type { HealthInsightContext } from "@/lib/health-insights";
import { getClinicalStockSnapshot } from "./clinical-stock";
import { isFutureAcquisition, isPrescriptionOnly, realizedAcquisitionExpense, renewalEventDate } from "@/lib/health-supply/renewal-event";

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
};
export type CareForecast = { windows: CareForecastWindow[]; withdrawals: WithdrawalReadiness[]; generatedFor: string };

const validDay = (value?: string) => Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));
const dayDistance = (from: string, to: string) => Math.ceil((Date.parse(`${to}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`)) / 86400000);

/** Read-only projection. Missing stock/price remains unknown and never becomes zero. */
export function buildCareForecast(context: HealthInsightContext, today = context.hoje || new Date().toISOString().slice(0, 10)): CareForecast {
  const ownedMedications = context.medicamentos.filter(item => item.person_id === context.personId && item.status !== "descontinuado");
  const medicationById = new Map(ownedMedications.filter(item => item.id).map(item => [item.id!, item]));
  const events = context.renovacoes.filter(item => item.person_id === context.personId || (!item.person_id && item.user_id === context.userId));
  const lastPaidByMedication = new Map<string, number>();
  for (const event of [...events].sort((a, b) => renewalEventDate(b).localeCompare(renewalEventDate(a)))) {
    if (!lastPaidByMedication.has(event.medicamento_id) && realizedAcquisitionExpense(event, today) > 0) lastPaidByMedication.set(event.medicamento_id, event.preco!);
  }
  const windows = ([30, 60, 90] as const).map(days => {
    const future = events.filter(item => !isPrescriptionOnly(item) && isFutureAcquisition(item, today) && dayDistance(today, renewalEventDate(item).slice(0, 10)) <= days);
    const stockRiskItems = ownedMedications.filter(item => {
      if (item.tipo_uso === "sos" || item.tipo_uso === "esporadico") return false;
      const stock = getClinicalStockSnapshot(item);
      return stock.daysRemaining !== null && stock.daysRemaining <= days;
    });
    const unknownStock = ownedMedications.filter(item => item.tipo_uso !== "sos" && item.tipo_uso !== "esporadico" && getClinicalStockSnapshot(item).state === "unknown").length;
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
    return { id: item.id || `${item.medicamento_id}:${item.data}`, medicationId: item.medicamento_id,
      medicationName: med?.nome || item.medicamento_nome || "Medicamento", date: item.data,
      overdue: validDay(item.data) ? item.data < today : false, prescriptionRequired, prescriptionLinked, missing };
  }).sort((a, b) => a.date.localeCompare(b.date) || a.medicationName.localeCompare(b.medicationName, "pt-BR"));
  return { windows, withdrawals, generatedFor: today };
}

export function daysSinceLastCompletedConsultation(context: HealthInsightContext, today = context.hoje || new Date().toISOString().slice(0, 10)): number | null {
  const last = context.consultas.filter(item => item.person_id === context.personId && item.status === "realizada" && validDay(item.data) && item.data <= today).sort((a, b) => b.data.localeCompare(a.data))[0];
  return last ? Math.max(1, Math.min(365, dayDistance(last.data, today) + 1)) : null;
}
