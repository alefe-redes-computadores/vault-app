import type { DoseLog } from "@/lib/types";

/** M66 — apenas evita a regravação de um registro remoto idêntico.
 * A igualdade é conservadora: campos extras, mudanças clínicas ou valores
 * indefinidos provocam a gravação normal; nunca prevalece sobre a fila local.
 */
export function isSameRecentCloudDose(local: DoseLog | undefined, remote: DoseLog): boolean {
  if (!local || local.synced !== true || !remote.id || local.id !== remote.id) return false;
  if (local.user_id !== remote.user_id || local.person_id !== remote.person_id) return false;
  const next = { ...remote, synced: true } as unknown as Record<string, unknown>;
  const current = local as unknown as Record<string, unknown>;
  const keys = Object.keys(next);
  if (keys.length !== Object.keys(current).length) return false;
  for (const key of keys) {
    const left = current[key], right = next[key];
    if (Object.is(left, right)) continue;
    if (left !== null && right !== null && typeof left === "object" && typeof right === "object") {
      // Only positive equality skips writes: object key/order variations cause a safe write.
      if (JSON.stringify(left) === JSON.stringify(right)) continue;
    }
    return false;
  }
  return true;
}
