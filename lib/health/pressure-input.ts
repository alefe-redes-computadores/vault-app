import { validateMetric } from '../health-profile/metrics';

export type ParsedPressure = { systolic: number; diastolic: number; display: string; abbreviated: boolean };

/** Manual draft only. Never use this to reinterpret a persisted measurement. */
export function parsePressureDraft(raw: string): ParsedPressure | null {
  const compact = raw.trim();
  if (!compact || compact.length > 32) return null;
  let left = "";
  let right = "";
  if (compact.includes("/")) {
    const match = /^(\d{2,3})\s*\/\s*(\d{1,3})$/.exec(compact);
    if (!match) return null;
    [, left, right] = match;
  } else {
    if (!/^\d{4,6}$/.test(compact)) return null;
    const digits = compact;
    if (digits.length === 4) [left, right] = [digits.slice(0, 2), digits.slice(2)];
    else if (digits.length === 5) [left, right] = [digits.slice(0, 3), digits.slice(3)];
    else if (digits.length === 6) [left, right] = [digits.slice(0, 3), digits.slice(3)];
    else return null;
  }
  if (left.startsWith('0')) return null;
  const abbreviated = left.length === 2 && Number(left) < 30;
  // An abbreviated pair must use the same scale on both sides (14/9, 14/10).
  // Do not guess mixed scales, truncate extra input or strip arbitrary characters.
  if (abbreviated ? right.length > 2 || Number(right) > 20 : right.length < 2 || right.startsWith('0')) return null;
  const systolic = abbreviated ? Number(left) * 10 : Number(left);
  const diastolic = abbreviated ? Number(right) * 10 : Number(right);
  try { validateMetric('pressao_arterial', systolic, diastolic); }
  catch { return null; }
  return { systolic, diastolic, display: `${systolic}/${diastolic}`, abbreviated };
}
