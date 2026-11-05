/**
 * M70: a non-prescriptive estimate for discussion, not a diagnosis or
 * individualized clinical fluid order. Does not incorporate contraindications.
 */
export type HydrationReference = { lowerMl: number; middleMl: number; upperMl: number; weightKg: number; heightCm: number | null };
const round50 = (value: number) => Math.round(value / 50) * 50;
export function estimateHydrationReference(weightKg: number | null | undefined, heightCm?: number | null): HydrationReference | null {
  if (typeof weightKg !== "number" || !Number.isFinite(weightKg) || weightKg < 25 || weightKg > 250) return null;
  const height = typeof heightCm === "number" && Number.isFinite(heightCm) && heightCm >= 110 && heightCm <= 230 ? heightCm : null;
  return {
    lowerMl: round50(weightKg * 25), middleMl: round50(weightKg * 30), upperMl: round50(weightKg * 35),
    weightKg, heightCm: height,
  };
}
export function hydrationRecordedPattern(
  records: readonly {tipo:string;data:string;valor_numerico?:number;unidade_medida?:string}[],
  today: string, referenceMl: number,
): {dayCount:number;averageMl:number;ratio:number;level:"low"|"very_low"|"high"|"very_high"|"within"|"insufficient"} {
  const days = new Map<string,number>();
  const todayTime=Date.parse(`${today}T12:00:00`);
  for (const item of records) {
    const timestamp=Date.parse(`${item.data}T12:00:00`);
    if (item.tipo!=="agua" || item.unidade_medida!=="ml" || typeof item.valor_numerico !== "number" || !Number.isFinite(item.valor_numerico) || item.valor_numerico<=0 || !Number.isFinite(timestamp) || timestamp>todayTime || todayTime-timestamp>6*86_400_000) continue;
    days.set(item.data,(days.get(item.data)||0)+item.valor_numerico);
  }
  const count=days.size, average=count?Math.round([...days.values()].reduce((a,b)=>a+b,0)/count):0;
  const ratio=referenceMl>0?average/referenceMl:0;
  const level=count<3||referenceMl<=0?"insufficient":ratio<.45?"very_low":ratio<.75?"low":ratio>2.5?"very_high":ratio>1.5?"high":"within";
  return {dayCount:count,averageMl:average,ratio,level};
}
