/** M102 P1 — evidence label for an Avatar, never an inferred emotional reading. */
import type { AvatarBodyContext } from "./avatar-body";

export type AvatarPresenceM102 = {
  expression: "happy" | "reflective" | "neutral";
  coverageDays: number;
  lastMoodDate: string | null;
  lastMoodAgeDays: number | null;
  recency: "today" | "yesterday" | "older" | "unreported";
  headline: string;
  detail: string;
};

function ordinalDay(raw: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
  const [y, m, d] = raw.split("-").map(Number);
  const ms = Date.UTC(y, m - 1, d);
  const check = new Date(ms);
  return check.getUTCFullYear() === y && check.getUTCMonth() + 1 === m && check.getUTCDate() === d
    ? Math.floor(ms / 86400000) : null;
}
export function projectAvatarPresenceM102(context: AvatarBodyContext): AvatarPresenceM102 {
  const today = ordinalDay(context.today);
  const dates = new Set<number>();
  let latest: number | null = null;
  let latestDate: string | null = null;
  if (today !== null) {
    for (const item of context.moods) {
      const day = ordinalDay(item.data);
      if (day === null || day > today || day < today - 6) continue;
      dates.add(day);
      if (latest === null || day > latest) { latest = day; latestDate = item.data; }
    }
  }
  const age = today !== null && latest !== null ? today - latest : null;
  const recency: AvatarPresenceM102["recency"] = age === 0 ? "today" : age === 1 ? "yesterday" : age === null ? "unreported" : "older";
  // The expression itself is calculated only by avatarBodyContext's explicit mood policy.
  const expression = context.expression;
  const headline = recency === "today" ? "Humor informado hoje" :
    recency === "yesterday" ? "Humor informado ontem" :
    recency === "older" ? `Último relato há ${age} dias` : "Sem relato recente de humor";
  const detail = `Expressão ilustrativa baseada em ${dates.size} dia(s) com relato nos últimos 7. Não mede emoção em tempo real.`;
  return { expression, coverageDays: dates.size, lastMoodDate: latestDate, lastMoodAgeDays: age, recency, headline, detail };
}
