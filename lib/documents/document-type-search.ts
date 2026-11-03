import { normalizeLocalSearch } from "@/lib/local-search";

/** Local presentation-only search. Does not alter the document type catalog or saved records. */
export function filterDocumentTypeOptions<T extends { label: string; description: string }>(
  options: readonly T[], search: string,
): T[] {
  const terms = normalizeLocalSearch(search.slice(0, 80)).split(/\s+/).filter(Boolean);
  if (!terms.length) return options.slice();
  return options.filter(option => {
    const key = normalizeLocalSearch(`${option.label} ${option.description}`);
    return terms.every(term => key.includes(term));
  });
}
