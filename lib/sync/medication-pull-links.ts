// lib/sync/medication-pull-links.ts
/** Preserve the local projection while the independent relation query runs. */
export function preserveMedicationTreatmentLinks(
  remote: Record<string, unknown>,
  local?: Record<string, unknown>,
): Record<string, unknown> {
  if (
    !local || typeof remote.user_id !== 'string' || !remote.user_id ||
    typeof remote.person_id !== 'string' || !remote.person_id ||
    remote.user_id !== local.user_id || remote.person_id !== local.person_id ||
    !Array.isArray(local.tratamento_ids)
  ) return { ...remote };

  return { ...remote, tratamento_ids: [...local.tratamento_ids] };
}
