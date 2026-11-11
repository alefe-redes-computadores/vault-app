/** VAULT M118: private, explicit diary text only. No Brain input, prediction or clinical assertion. */
export type PrivateActivityReviewM118 = {
  id: string;
  activity: string;
  before: string;
  after: string;
};
type PrivateEntry = { id: string; text: string };

function readField(text: string, key: string): string {
  const found = text.split(/\r?\n/).find(line => line.toLowerCase().startsWith(`${key.toLowerCase()}:`));
  if (!found) return "";
  return found.slice(key.length + 1).trim().slice(0, 300);
}

/** Only notes intentionally tagged by the writer are considered; locked journal never supplies entries. */
export function privateActivityReviewsM118(entries: readonly PrivateEntry[]): PrivateActivityReviewM118[] {
  const out: PrivateActivityReviewM118[] = [];
  for (const entry of entries) {
    if (!entry || typeof entry.text !== "string" || !entry.text.includes("O que me ajudou (se eu quiser contar):")) continue;
    const activity = readField(entry.text, "Situação ou atividade");
    const before = readField(entry.text, "Como me senti antes");
    const after = readField(entry.text, "Como me senti depois");
    if (!activity || !before || !after) continue;
    out.push({id:entry.id,activity,before,after});
  }
  return out;
}
