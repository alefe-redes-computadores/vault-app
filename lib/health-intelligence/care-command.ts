import type { HealthInsightContext } from "@/lib/health-insights";
import { buildCareForecast, type CareForecast, type CareForecastAction } from "./care-forecast";
import { buildCareReadiness, type CareReadinessPortfolio } from "./care-readiness";
import { buildBrainCarePlan, type BrainCarePlan } from "./care-plan";
import { buildCareDocumentReadiness, type CareDocumentReadinessPortfolio } from "./care-document-readiness";
import { buildMedicationPortfolio, type MedicationPortfolio } from "./medication-portfolio";
import { buildPersonalHealthPortfolio, type PersonalHealthPortfolio } from "./personal-health-portfolio";
import { buildAccessPortfolio, type AccessPortfolio } from "./access-portfolio";
import { buildDocumentArchivePortfolio, type DocumentArchivePortfolio } from "./document-archive-portfolio";

export type CareCommandSnapshot = {
  forecast: CareForecast;
  readiness: CareReadinessPortfolio;
  surfaceActions: CareForecastAction[];
  primary: CareForecastAction | null;
  counts: Record<CareForecastAction["lane"], number>;
  plan: BrainCarePlan;
  decision: BrainCarePlan["focus"][number] | null;
  documents: CareDocumentReadinessPortfolio;
  medications: MedicationPortfolio;
  health: PersonalHealthPortfolio;
  access: AccessPortfolio;
  archive: DocumentArchivePortfolio;
};

/**
 * Uma única leitura para Central, Home, Hoje e Avatar. A superfície mostra no
 * uma decisão principal por superfície, sem apagar fenômenos diferentes
 * do mesmo medicamento. O histórico e as ações seguem nos seus motores.
 */
export function buildCareCommandSnapshot(context: HealthInsightContext): CareCommandSnapshot {
  const forecast = buildCareForecast(context);
  const readiness = buildCareReadiness(context, forecast.generatedFor, forecast);
  const documents = buildCareDocumentReadiness(context);
  const seenEvents = new Set<string>();
  const surfaceActions = forecast.actions.filter(action => {
    // Unique event IDs retain separate withdrawals/acquisitions on different dates.
    const key = action.id || `${action.medicationId}:${action.kind}:${action.date || ""}`;
    if (seenEvents.has(key)) return false;
    seenEvents.add(key);
    return true;
  });
  const counts = forecast.actions.reduce<Record<CareForecastAction["lane"], number>>((acc, action) => {
    acc[action.lane] += 1;
    return acc;
  }, { now: 0, next: 0, follow_up: 0, review_data: 0 });
  const plan = buildBrainCarePlan(context, forecast, readiness, documents);
  const medications = buildMedicationPortfolio(context, plan, readiness);
  const health = buildPersonalHealthPortfolio(context);
  const access = buildAccessPortfolio(context, documents);
  const archive = buildDocumentArchivePortfolio(context);
  return { forecast, readiness, documents, medications, health, access, archive, surfaceActions, primary: surfaceActions[0] ?? null, counts, plan, decision: plan.decision };
}
