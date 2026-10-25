import type { HealthInsightContext } from "@/lib/health-insights";
import { buildCareForecast, type CareForecast, type CareForecastAction } from "./care-forecast";
import { buildCareReadiness, type CareReadinessPortfolio } from "./care-readiness";

export type CareCommandSnapshot = {
  forecast: CareForecast;
  readiness: CareReadinessPortfolio;
  surfaceActions: CareForecastAction[];
  primary: CareForecastAction | null;
  counts: Record<CareForecastAction["lane"], number>;
};

/**
 * Uma única leitura para Central, Home, Hoje e Avatar. A superfície mostra no
 * máximo uma decisão por medicamento; o histórico completo continua no
 * forecast. Assim uma retirada vencida não disputa espaço com uma projeção de
 * estoque do mesmo medicamento.
 */
export function buildCareCommandSnapshot(context: HealthInsightContext): CareCommandSnapshot {
  const forecast = buildCareForecast(context);
  const readiness = buildCareReadiness(context, forecast.generatedFor, forecast);
  const seenMedication = new Set<string>();
  const surfaceActions = forecast.actions.filter(action => {
    const key = action.medicationId || action.id;
    if (seenMedication.has(key)) return false;
    seenMedication.add(key);
    return true;
  });
  const counts = forecast.actions.reduce<Record<CareForecastAction["lane"], number>>((acc, action) => {
    acc[action.lane] += 1;
    return acc;
  }, { now: 0, next: 0, follow_up: 0, review_data: 0 });
  return { forecast, readiness, surfaceActions, primary: surfaceActions[0] ?? null, counts };
}
