import type { HealthInsightContext } from "@/lib/health-insights";

export type HealthWeekDay = {
  date: string;
  symptoms: number;
  moods: number;
  sleep: number;
  walks: number;
  records: number;
};

/** Cobertura documental, NÃO ausência de sintomas nem meta de saúde.
 * Só fatos explícitos da pessoa+conta, com data válida e chave repetida deduplicada.
 */
function parseDay(value: unknown): Date | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [y, m, d] = value.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d));
  return t.getUTCFullYear() === y && t.getUTCMonth() === m - 1 && t.getUTCDate() === d ? t : null;
}
function key(day: Date): string { return day.toISOString().slice(0, 10); }

export function buildHealthWeekCoverage(context: HealthInsightContext | null | undefined) {
  const today = parseDay(context?.hoje);
  if (!today || !context?.personId?.trim() || !context.userId?.trim()) return null;
  const byDate = new Map<string, HealthWeekDay>();
  const first = today.getTime() - 6 * 86400000;
  for (let offset = 6; offset >= 0; offset--) {
    const date = key(new Date(today.getTime() - offset * 86400000));
    byDate.set(date, { date, symptoms: 0, moods: 0, sleep: 0, walks: 0, records: 0 });
  }
  const seen = new Set<string>();
  for (const r of context.registrosSaude) {
    if (r.person_id !== context.personId || r.user_id !== context.userId) continue;
    const day = parseDay(r.data);
    if (!day || day.getTime() < first || day.getTime() > today.getTime()) continue;
    const item = byDate.get(r.data);
    if (!item) continue;
    const identity = r.source_record_id
      ? `source:${r.source || ""}:${r.device_id || ""}:${r.source_record_id}`
      : r.id ? `id:${r.id}`
      : `legacy:${r.data}:${r.horario}:${r.categoria}:${r.tipo}:${r.nome}:${r.intensidade ?? ""}:${r.valor_numerico ?? ""}`;
    if (seen.has(identity)) continue;
    seen.add(identity);
    item.records++;
    if (r.categoria === "sintoma") item.symptoms++;
    if (r.categoria === "humor") item.moods++;
    if (r.tipo === "sono" && typeof r.duracao_minutos === "number" && r.duracao_minutos > 0 && r.duracao_minutos <= 1440) item.sleep++;
    if (r.tipo === "caminhada" && typeof r.duracao_minutos === "number" && r.duracao_minutos > 0 && r.duracao_minutos <= 1440) item.walks++;
  }
  const days = [...byDate.values()];
  return {
    days,
    recordedDays: days.filter(d => d.records > 0).length,
    symptoms: days.reduce((a, d) => a + d.symptoms, 0),
    moods: days.reduce((a, d) => a + d.moods, 0),
    sleep: days.reduce((a, d) => a + d.sleep, 0),
    walks: days.reduce((a, d) => a + d.walks, 0),
  };
}
