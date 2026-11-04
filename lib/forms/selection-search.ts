/** Pure presentation search. Matches all query words without changing the source order. */
export function normalizeSelectionText(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").trim();
}

export function filterSelectionItems<T>(items: readonly T[], query: string, textOf: (item: T) => string): T[] {
  const words = normalizeSelectionText(query).split(/\s+/).filter(Boolean);
  if (!words.length) return Array.from(items);
  return items.filter(item => {
    const text = normalizeSelectionText(textOf(item));
    return words.every(word => text.includes(word));
  });
}
