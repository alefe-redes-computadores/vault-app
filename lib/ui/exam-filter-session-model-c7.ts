/** Presentation-only session state; no clinical record is written or inferred. */
export type ExamFilterStatusC7 = "todos" | "vencido" | "valido" | "proximo";
export type ExamFilterStateC7 = { search: string; status: ExamFilterStatusC7 };
export const EXAM_FILTER_DEFAULT_C7: Readonly<ExamFilterStateC7> = {search: "", status: "todos"};
const STATUSES = new Set<ExamFilterStatusC7>(["todos","vencido","valido","proximo"]);
const TTL_MS = 3 * 60 * 60 * 1000;
export function examFilterKeyC7(userId: string | null | undefined, personId: string | null | undefined): string | null {
  if (!userId || !personId || userId.length > 256 || personId.length > 256) return null;
  return `vault:exam-filters:c7:${encodeURIComponent(userId)}:${encodeURIComponent(personId)}`;
}
export function parseExamFilterStateC7(raw: string | null, now: number): ExamFilterStateC7 | null {
  if (!raw || raw.length > 4096 || !Number.isFinite(now)) return null;
  try {
    const p: unknown = JSON.parse(raw);
    if (typeof p !== "object" || p === null || Array.isArray(p)) return null;
    const obj = p as Record<string, unknown>;
    if (obj.version !== 1 || typeof obj.at !== "number" || !Number.isFinite(obj.at) || obj.at > now || now - obj.at > TTL_MS) return null;
    if (typeof obj.search !== "string" || obj.search.length > 150 || typeof obj.status !== "string" || !STATUSES.has(obj.status as ExamFilterStatusC7)) return null;
    return {search: obj.search, status: obj.status as ExamFilterStatusC7};
  } catch { return null; }
}
export function serializeExamFilterStateC7(state: ExamFilterStateC7, now: number): string {
  return JSON.stringify({version:1, at:now, search:state.search.slice(0,150), status:state.status});
}
