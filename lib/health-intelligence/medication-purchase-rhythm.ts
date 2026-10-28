import type { Renovacao } from "@/lib/types";
import { isFutureAcquisition, isPrescriptionOnly, renewalEventDate } from "@/lib/health-supply/renewal-event";

export type MedicationPurchaseRhythm = {
  medicationId: string;
  realizedDates: string[];
  typicalIntervalDays: number | null;
  suggestedDate: string | null;
  nextPlannedDate: string | null;
  coveredByPlanning: boolean;
  confidence: "insuficiente" | "media" | "alta";
};

const DAY=86_400_000;
const isoDay=(value:string)=>value.slice(0,10);
const dayNumber=(value:string)=>Math.floor(Date.parse(`${isoDay(value)}T12:00:00Z`)/DAY);
const fromDayNumber=(value:number)=>new Date(value*DAY).toISOString().slice(0,10);

/**
 * Observes recorded acquisitions and offers a planning date. It never creates,
 * confirms or mutates an acquisition, expense or stock entry.
 */
export function analyzeMedicationPurchaseRhythm(events:readonly Renovacao[],medicationId:string,todayISO:string):MedicationPurchaseRhythm{
  const scoped=events.filter(item=>item.medicamento_id===medicationId&&!isPrescriptionOnly(item));
  const realizedDates=[...new Set(scoped.filter(item=>!isFutureAcquisition(item,todayISO)).map(item=>isoDay(renewalEventDate(item))).filter(value=>/^\d{4}-\d{2}-\d{2}$/.test(value)))].sort();
  const plannedDates=[...new Set(scoped.filter(item=>isFutureAcquisition(item,todayISO)).map(item=>isoDay(renewalEventDate(item))))].sort();
  const intervals=realizedDates.slice(1).map((date,index)=>dayNumber(date)-dayNumber(realizedDates[index])).filter(days=>days>=2&&days<=730).sort((a,b)=>a-b);
  const typicalIntervalDays=intervals.length?Math.round(intervals.length%2?intervals[(intervals.length-1)/2]:(intervals[intervals.length/2-1]+intervals[intervals.length/2])/2):null;
  const suggestedDate=typicalIntervalDays&&realizedDates.length?fromDayNumber(dayNumber(realizedDates.at(-1)!)+typicalIntervalDays):null;
  const tolerance=typicalIntervalDays?Math.max(3,Math.min(14,Math.round(typicalIntervalDays*.2))):0;
  const coveredByPlanning=Boolean(suggestedDate&&plannedDates.some(date=>Math.abs(dayNumber(date)-dayNumber(suggestedDate))<=tolerance));
  return {medicationId,realizedDates,typicalIntervalDays,suggestedDate,nextPlannedDate:plannedDates[0]??null,coveredByPlanning,confidence:intervals.length>=3?"alta":intervals.length>=1?"media":"insuficiente"};
}

export function analyzePurchaseRhythms(events:readonly Renovacao[],medicationIds:readonly string[],todayISO:string){
  return [...new Set(medicationIds)].map(id=>analyzeMedicationPurchaseRhythm(events,id,todayISO)).filter(item=>item.typicalIntervalDays!==null||item.nextPlannedDate!==null).sort((a,b)=>(a.nextPlannedDate??a.suggestedDate??"9999").localeCompare(b.nextPlannedDate??b.suggestedDate??"9999"));
}
