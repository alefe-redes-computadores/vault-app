/** M102 P1 — local-only preference to revisit a Brain episode, NOT a clinical note. */
import type { BrainV5Alert } from "./brain-v5";
export type BrainFollowUpDelayM102 = 24 | 48;
export type BrainFollowUpPlanM102 = Readonly<{
  version: 1;
  episodeFingerprint: string;
  createdAt: string;
  dueAt: string;
  delayHours: BrainFollowUpDelayM102;
}>;
const MAX_AGE_MS = 14 * 86400000;

/** Non-cryptographic identifier. This is not encryption, authorization or a clinical ID. */
export function followUpFingerprintM102(alert: Pick<BrainV5Alert, "key" | "episode">): string | null {
  if (!alert.key || alert.key.length > 512 || !Number.isSafeInteger(alert.episode) || alert.episode < 0) return null;
  const raw = `${alert.key}:${alert.episode}`;
  let h = 2166136261;
  for (let i = 0; i < raw.length; i++) {
    h ^= raw.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return `m102-${(h >>> 0).toString(16).padStart(8, "0")}`;
}
export function followUpKeyM102(userId: string, personId: string): string | null {
  if (!userId.trim() || !personId.trim() || userId.length > 256 || personId.length > 256) return null;
  return `vault_m102_followup_v1:${encodeURIComponent(userId)}:${encodeURIComponent(personId)}`;
}
export function createFollowUpM102(
  userId: string, personId: string, alert: Pick<BrainV5Alert, "key" | "episode" | "person_id" | "state">,
  delayHours: BrainFollowUpDelayM102, now: number
): BrainFollowUpPlanM102 | null {
  const fingerprint = followUpFingerprintM102(alert);
  if (!followUpKeyM102(userId, personId) || alert.person_id !== personId || alert.state === "resolved" || !fingerprint ||
      (delayHours !== 24 && delayHours !== 48) || !Number.isFinite(now) || now <= 0) return null;
  return { version: 1, episodeFingerprint: fingerprint, createdAt: new Date(now).toISOString(),
    dueAt: new Date(now + delayHours * 3600000).toISOString(), delayHours };
}
export function parseFollowUpM102(
  raw: string | null | undefined, alert: Pick<BrainV5Alert, "key" | "episode" | "state">, now: number
): BrainFollowUpPlanM102 | null {
  if (!raw || raw.length > 1000 || !Number.isFinite(now)) return null;
  try {
    const data: unknown = JSON.parse(raw);
    if (!data || typeof data !== "object") return null;
    const value = data as Record<string, unknown>;
    const expected = followUpFingerprintM102(alert);
    if (alert.state === "resolved" || value.version !== 1 || !expected || value.episodeFingerprint !== expected ||
        (value.delayHours !== 24 && value.delayHours !== 48) ||
        typeof value.createdAt !== "string" || typeof value.dueAt !== "string" ||
        !/^\d{4}-\d\d-\d\dT/.test(value.createdAt) || !/^\d{4}-\d\d-\d\dT/.test(value.dueAt)) return null;
    const created = Date.parse(value.createdAt), due = Date.parse(value.dueAt);
    if (!Number.isFinite(created) || !Number.isFinite(due) || created > now + 60000 || now - created > MAX_AGE_MS ||
        due - created !== value.delayHours * 3600000) return null;
    return {version: 1, episodeFingerprint: expected, createdAt: new Date(created).toISOString(),
      dueAt: new Date(due).toISOString(), delayHours: value.delayHours};
  } catch { return null; }
}
export function followUpStateM102(plan: BrainFollowUpPlanM102 | null, now: number): "off" | "planned" | "due" {
  if (!plan || !Number.isFinite(now)) return "off";
  return Date.parse(plan.dueAt) <= now ? "due" : "planned";
}
