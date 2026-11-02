/** Earliest *recorded* acquisition per medication. A record is evidence of an
 * acquisition date, never evidence that a prescription or dose was fulfilled.
 * Same canonical rules as the previous filter/map/sort projection: the primary
 * date wins over the alternative, only its first 10 chars are considered, and
 * only YYYY-MM-DD shapes enter the lexicographic minimum. */
export type AcquisitionDateRecord = {
  medicamento_id?: string | null;
  data_aquisicao?: string | null;
  data?: string | null;
};

export function earliestAcquisitionByMedication(
  rows: readonly AcquisitionDateRecord[],
): Map<string, string> {
  const earliest = new Map<string, string>();
  for (const row of rows) {
    const id = row.medicamento_id;
    if (!id) continue;
    const date = String(row.data_aquisicao || row.data || "").slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
    const previous = earliest.get(id);
    if (previous === undefined || date < previous) earliest.set(id, date);
  }
  return earliest;
}
