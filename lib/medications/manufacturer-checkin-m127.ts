/**
 * M127 — relatos pessoais sobre um produto, guardados no evento histórico
 * de aquisição existente. Não há comparação clínica automática.
 */
const PREFIX = "[VAULT:RELATO-FABRICANTE]";
export type ManufacturerCheckInDayM127 = 1 | 3 | 7 | 30;
export type ManufacturerCheckInM127 = {
  acquisitionId: string;
  manufacturer: string;
  day: ManufacturerCheckInDayM127;
  recordedAt: string;
  notes: string;
};
const allowedDays = new Set<number>([1, 3, 7, 30]);
export function manufacturerCheckInLinesM127(source?: string | null): string[] {
  return String(source ?? "").split(/\r?\n/).filter(line => line.startsWith(PREFIX));
}
export function readManufacturerCheckInsM127(source?: string | null, acquisitionId?: string): ManufacturerCheckInM127[] {
  const results = new Map<number, ManufacturerCheckInM127>();
  for (const line of manufacturerCheckInLinesM127(source)) {
    try {
      const data: unknown = JSON.parse(line.slice(PREFIX.length));
      if (!data || typeof data !== "object") continue;
      const item = data as Partial<ManufacturerCheckInM127>;
      if (typeof item.acquisitionId !== "string" || !item.acquisitionId ||
        typeof item.manufacturer !== "string" || !item.manufacturer.trim() ||
        typeof item.day !== "number" || !allowedDays.has(item.day) ||
        typeof item.recordedAt !== "string" || !Number.isFinite(Date.parse(item.recordedAt)) ||
        typeof item.notes !== "string" || item.notes.length > 1200) continue;
      if (acquisitionId && item.acquisitionId !== acquisitionId) continue;
      results.set(item.day, item as ManufacturerCheckInM127);
    } catch { /* histórico malformado não deve impedir leitura de outras notas */ }
  }
  return [...results.values()].sort((a, b) => a.day - b.day);
}
export function upsertManufacturerCheckInM127(source: string | null | undefined, item: ManufacturerCheckInM127): string {
  if (!item.acquisitionId.trim() || !item.manufacturer.trim() || !allowedDays.has(item.day) ||
    !Number.isFinite(Date.parse(item.recordedAt))) throw new Error("Relato incompleto.");
  const existing = readManufacturerCheckInsM127(source, item.acquisitionId).filter(x => x.day !== item.day);
  const otherLines = String(source ?? "").split(/\r?\n/).filter(line => !line.startsWith(PREFIX));
  const preserved = manufacturerCheckInLinesM127(source).filter(line => {
    try {return JSON.parse(line.slice(PREFIX.length))?.acquisitionId !== item.acquisitionId;} catch {return true;}
  });
  const next = [...existing, { ...item, notes: item.notes.trim().slice(0,1000) }].sort((a,b)=>a.day-b.day);
  return [...otherLines, ...preserved, ...next.map(value => `${PREFIX}${JSON.stringify(value)}`)].filter(Boolean).join("\n");
}
