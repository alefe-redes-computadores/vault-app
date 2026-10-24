import type { Renovacao } from "@/lib/types";
import { isFutureAcquisition, isPrescriptionOnly, realizedAcquisitionExpense, renewalEventDate } from "@/lib/health-supply/renewal-event";

export interface MedicationCostSummary {
  realized: Renovacao[];
  planned: Renovacao[];
  realizedTotal: number;
  realizedAverage: number | null;
  plannedKnownTotal: number;
  plannedWithPrice: number;
  pricedCoverage: number;
}

/**
 * Canonical financial reading for medication surfaces.
 * Prescription, SUS/gratuito and future acquisition never become realized cost.
 */
export function summarizeMedicationCosts(events: readonly Renovacao[], todayISO: string): MedicationCostSummary {
  const acquisitions=events.filter(item=>!isPrescriptionOnly(item));
  const planned=acquisitions.filter(item=>isFutureAcquisition(item,todayISO));
  const realized=acquisitions.filter(item=>realizedAcquisitionExpense(item,todayISO)>0);
  const realizedTotal=realized.reduce((sum,item)=>sum+realizedAcquisitionExpense(item,todayISO),0);
  const plannedPrices=planned.flatMap(item=>typeof item.preco==="number"&&Number.isFinite(item.preco)&&item.preco>0?[item.preco]:[]);
  const completedPrivate=acquisitions.filter(item=>!isFutureAcquisition(item,todayISO)&&item.tipo_aquisicao!=="sus"&&item.tipo_aquisicao!=="gratuito");
  return {
    realized,planned,realizedTotal,
    realizedAverage:realized.length?realizedTotal/realized.length:null,
    plannedKnownTotal:plannedPrices.reduce((sum,value)=>sum+value,0),
    plannedWithPrice:plannedPrices.length,
    pricedCoverage:completedPrivate.length?Math.round(realized.length/completedPrivate.length*100):100,
  };
}

export function nextPlannedMedicationCost(summary:MedicationCostSummary):Renovacao|null {
  return [...summary.planned].sort((a,b)=>renewalEventDate(a).localeCompare(renewalEventDate(b)))[0]??null;
}
