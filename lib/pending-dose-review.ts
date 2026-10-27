/** Keep slot identity independent from the time at which the person confirms taking it. */
export function pendingDoseCustomTime(dose: {data:string;horario:string}): string {
  return `${dose.data}T${dose.horario}`;
}

export type PendingDoseIdentity = { data: string; medicamentoId: string; horario: string };

/** Stable identity for a scheduled slot, independent from reactive list position. */
export function pendingDoseKey(dose: PendingDoseIdentity): string {
  return `${dose.data}:${dose.medicamentoId}:${dose.horario}`;
}

/**
 * A pending item may disappear from Dexie while its confirmation is still resolving.
 * Keep the selected snapshot until the command completes instead of changing UI branches
 * in the middle of the same interaction.
 */
export function pendingDoseStillOpen<T extends PendingDoseIdentity>(
  selected: T | null,
  pending: T[]
): boolean {
  return Boolean(selected && pending.some(item => pendingDoseKey(item) === pendingDoseKey(selected)));
}

export function nextPendingDose<T extends PendingDoseIdentity>(
  resolved: T,
  pending: T[]
): T | null {
  const resolvedKey = pendingDoseKey(resolved);
  return pending.find(item => pendingDoseKey(item) !== resolvedKey) ?? null;
}
