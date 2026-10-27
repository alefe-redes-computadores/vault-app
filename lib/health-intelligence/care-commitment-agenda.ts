import type { CareForecast, CareForecastAction } from "./care-forecast";

export type CareCommitmentAgendaItem = CareForecastAction & {
  related: CareForecastAction[];
  relatedKinds: CareForecastAction["kind"][];
};

const authorityRank: Record<CareForecastAction["kind"], number> = {
  overdue_withdrawal: 0,
  upcoming_withdrawal: 1,
  planned_acquisition: 2,
  stock_projection: 3,
  review_schedule_data: 4,
  review_stock_data: 5,
};

/**
 * Presentation-only agenda. It chooses one operational lead per medication
 * while retaining every independent event as related evidence. It never
 * converts a projection into a purchase, withdrawal or completed action.
 */
export function buildCareCommitmentAgenda(forecast: CareForecast): CareCommitmentAgendaItem[] {
  const sourceOrder = new Map(forecast.actions.map((action,index)=>[action.id,index]));
  const groups = new Map<string, CareForecastAction[]>();
  for (const action of forecast.actions) {
    const key = action.medicationId || action.id;
    groups.set(key, [...(groups.get(key) || []), action]);
  }
  return [...groups.values()].map(group => {
    const ordered = [...group].sort((a, b) =>
      authorityRank[a.kind] - authorityRank[b.kind] ||
      (a.date || "9999-99-99").localeCompare(b.date || "9999-99-99") ||
      a.id.localeCompare(b.id)
    );
    const [lead, ...related] = ordered;
    return { ...lead, related, relatedKinds: related.map(item => item.kind) };
  }).sort((a, b) =>
    (sourceOrder.get(a.id) ?? Number.MAX_SAFE_INTEGER) - (sourceOrder.get(b.id) ?? Number.MAX_SAFE_INTEGER) ||
    (a.date || "9999-99-99").localeCompare(b.date || "9999-99-99")
  );
}
