/**
 * VAULT M102 P4 — local, opt-in queue of episode review preferences.
 * This is NOT a medical observation, alert, sensor reading or notification.
 * Only small timestamps and legacy noncryptographic episode fingerprints
 * are stored. It is never a permission or authentication boundary.
 */
import type { BrainV5Alert } from "./brain-v5";
import {
  followUpFingerprintM102,
  followUpKeyM102,
  parseFollowUpM102,
  type BrainFollowUpPlanM102,
} from "./followup-m102";

export type ReviewQueueItemM102P4 = Readonly<{
  alert: BrainV5Alert;
  plan: BrainFollowUpPlanM102;
  due: boolean;
}>;
const MAX_PLANS = 8;
const MAX_RAW_LENGTH = 8192;
const MAX_ALERTS = 256;
const DAY_MS = 86_400_000;
const MAX_AGE_MS = 14 * DAY_MS;

type QueueEnvelope = { version: 2; plans: BrainFollowUpPlanM102[] };

export function followUpQueueKeyM102P4(userId: string, personId: string): string | null {
  const legacy = followUpKeyM102(userId, personId);
  return legacy ? legacy.replace("followup_v1:", "followup_v2:") : null;
}

function asPlan(value: unknown, now: number): BrainFollowUpPlanM102 | null {
  if (!value || typeof value !== "object" || !Number.isFinite(now) || now <= 0) return null;
  const plan = value as Record<string, unknown>;
  if (plan.version !== 1 || (plan.delayHours !== 24 && plan.delayHours !== 48) ||
      typeof plan.episodeFingerprint !== "string" || !/^m102-[0-9a-f]{8}$/.test(plan.episodeFingerprint) ||
      typeof plan.createdAt !== "string" || typeof plan.dueAt !== "string" ||
      !/^\d{4}-\d{2}-\d{2}T/.test(plan.createdAt) || !/^\d{4}-\d{2}-\d{2}T/.test(plan.dueAt)) return null;
  const created = Date.parse(plan.createdAt);
  const due = Date.parse(plan.dueAt);
  if (!Number.isFinite(created) || !Number.isFinite(due) || created <= 0 ||
      created > now + 60_000 || now - created > MAX_AGE_MS ||
      due - created !== plan.delayHours * 3_600_000) return null;
  return {
    version: 1,
    episodeFingerprint: plan.episodeFingerprint,
    delayHours: plan.delayHours,
    createdAt: new Date(created).toISOString(),
    dueAt: new Date(due).toISOString(),
  };
}

/** Defensive parser. Never trusts a payload's owner; callers must scope its key. */
export function readFollowUpQueueM102P4(raw: string | null | undefined, now: number): BrainFollowUpPlanM102[] {
  if (!raw || raw.length > MAX_RAW_LENGTH || !Number.isFinite(now)) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return [];
    const envelope = parsed as Partial<QueueEnvelope>;
    if (envelope.version !== 2 || !Array.isArray(envelope.plans) || envelope.plans.length > 64) return [];
    const unique = new Map<string, BrainFollowUpPlanM102>();
    for (const untrusted of envelope.plans) {
      const plan = asPlan(untrusted, now);
      if (!plan) continue;
      const old = unique.get(plan.episodeFingerprint);
      if (!old || old.createdAt < plan.createdAt) unique.set(plan.episodeFingerprint, plan);
    }
    return [...unique.values()]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || a.episodeFingerprint.localeCompare(b.episodeFingerprint))
      .slice(0, MAX_PLANS);
  } catch { return []; }
}

function ownedAlerts(alerts: readonly BrainV5Alert[], personId: string): BrainV5Alert[] {
  if (!personId) return [];
  return alerts.filter(a => a && a.person_id === personId && a.state !== "resolved" &&
    typeof a.insight_id === "string" && a.insight_id.length > 0 && a.insight_id.length <= 200 &&
    typeof a.key === "string" && a.key.length > 0).slice(0, MAX_ALERTS);
}

/** No title, medication, symptom, clinical content or raw insight ID is persisted. */
export function reviewQueueItemsM102P4(input: {
  raw: string | null | undefined;
  legacyRaw: string | null | undefined;
  alerts: readonly BrainV5Alert[];
  userId: string;
  contextUserId: string | null | undefined;
  personId: string;
  now: number;
}): ReviewQueueItemM102P4[] {
  const { raw, legacyRaw, alerts, userId, contextUserId, personId, now } = input;
  if (!userId || userId !== contextUserId || !followUpQueueKeyM102P4(userId, personId) || !Number.isFinite(now)) return [];
  const owned = ownedAlerts(alerts, personId);
  const byFingerprint = new Map<string, BrainV5Alert | null>();
  for (const alert of owned) {
    const id = followUpFingerprintM102(alert);
    if (!id) continue;
    if (byFingerprint.has(id)) byFingerprint.set(id, null); // collision: do not attach to an arbitrary alert
    else byFingerprint.set(id, alert);
  }
  const plans = readFollowUpQueueM102P4(raw, now);
  if (legacyRaw && legacyRaw.length <= 1000) {
    for (const alert of owned) {
      const legacy = parseFollowUpM102(legacyRaw, alert, now);
      if (legacy && !plans.some(p => p.episodeFingerprint === legacy.episodeFingerprint)) {
        plans.push(legacy);
        break;
      }
    }
  }
  return plans.flatMap(plan => {
    const alert = byFingerprint.get(plan.episodeFingerprint);
    if (!alert || !parseFollowUpM102(JSON.stringify(plan), alert, now)) return [];
    return [{ alert, plan, due: Date.parse(plan.dueAt) <= now }];
  }).sort((a, b) => Number(b.due) - Number(a.due) || a.plan.dueAt.localeCompare(b.plan.dueAt)).slice(0, MAX_PLANS);
}

/** Always generate a complete scoped document; caller performs localStorage write. */
export function upsertFollowUpQueueM102P4(input: {
  raw: string | null | undefined;
  legacyRaw: string | null | undefined;
  alerts: readonly BrainV5Alert[];
  userId: string;
  contextUserId: string | null | undefined;
  personId: string;
  plan: BrainFollowUpPlanM102;
  alert: BrainV5Alert;
  now: number;
}): string | null {
  if (!followUpQueueKeyM102P4(input.userId, input.personId) || input.userId !== input.contextUserId ||
      input.alert.person_id !== input.personId || input.alert.state === "resolved" ||
      !parseFollowUpM102(JSON.stringify(input.plan), input.alert, input.now)) return null;
  const previous = reviewQueueItemsM102P4(input);
  const plans = [input.plan, ...previous.map(row => row.plan), ...readFollowUpQueueM102P4(input.raw, input.now)]
    .filter(p => asPlan(p, input.now));
  const unique = new Map<string, BrainFollowUpPlanM102>();
  for (const plan of plans) if (!unique.has(plan.episodeFingerprint)) unique.set(plan.episodeFingerprint, plan);
  return JSON.stringify({ version: 2, plans: [...unique.values()].slice(0, MAX_PLANS) });
}

export function cancelFollowUpQueueM102P4(raw: string | null | undefined, alert: BrainV5Alert, now: number): string | null {
  const fingerprint = followUpFingerprintM102(alert);
  if (!fingerprint || !Number.isFinite(now)) return null;
  return JSON.stringify({ version: 2, plans: readFollowUpQueueM102P4(raw, now).filter(p => p.episodeFingerprint !== fingerprint) });
}

/** Read just one selected plan; other episodes remain untouched. */
export function selectedFollowUpM102P4(raw: string | null | undefined, alert: BrainV5Alert, now: number): BrainFollowUpPlanM102 | null {
  const fingerprint = followUpFingerprintM102(alert);
  if (!fingerprint) return null;
  const plan = readFollowUpQueueM102P4(raw, now).find(p => p.episodeFingerprint === fingerprint);
  return plan && parseFollowUpM102(JSON.stringify(plan), alert, now) ? plan : null;
}
