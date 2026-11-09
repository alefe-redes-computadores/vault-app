// VAULT_M105_MEDICATION_TREATMENT_RECONCILIATION
// Pure owner-scoped planning. No writes or external queries here.
export interface MedicationRelationLocalM105 {
  id?: string;
  user_id?: string;
  person_id?: string;
  synced?: boolean;
  tratamento_ids?: string[];
}
export interface MedicationTreatmentRelationM105 {
  medicamento_id?: unknown;
  tratamento_id?: unknown;
}
export interface MedicationTreatmentUpdateM105 {
  id: string;
  personId: string;
  tratamentoIds: string[];
}

export function planMedicationTreatmentReconciliationM105(input: {
  ownerId: string;
  medications: readonly MedicationRelationLocalM105[];
  remoteRelations: readonly MedicationTreatmentRelationM105[];
  pendingIds: ReadonlySet<string>;
  confirmedEmptyIds?: ReadonlySet<string>;
}): { updates: MedicationTreatmentUpdateM105[]; needConfirmation: string[] } {
  const owned = new Map<string, MedicationRelationLocalM105>();
  for (const medication of input.medications) {
    if (typeof medication.id === 'string' && medication.id.trim() && medication.user_id === input.ownerId &&
        typeof medication.person_id === 'string' && medication.person_id.trim()) {
      owned.set(medication.id, medication);
    }
  }
  const links = new Map<string, Set<string>>();
  for (const relation of input.remoteRelations) {
    if (typeof relation.medicamento_id !== 'string' ||
        typeof relation.tratamento_id !== 'string' || !relation.tratamento_id.trim() ||
        !owned.has(relation.medicamento_id)) continue;
    const selected = links.get(relation.medicamento_id) ?? new Set<string>();
    selected.add(relation.tratamento_id);
    links.set(relation.medicamento_id, selected);
  }
  const updates: MedicationTreatmentUpdateM105[] = [];
  const needConfirmation: string[] = [];
  for (const medication of owned.values()) {
    if (typeof medication.id !== "string" || !medication.id.trim()) continue;
    if (medication.synced === false || input.pendingIds.has(medication.id)) continue;
    const localIds = [...new Set((medication.tratamento_ids ?? []).filter(x => typeof x === 'string' && x.trim()))].sort();
    const remote = links.get(medication.id);
    if (!remote && !input.confirmedEmptyIds?.has(medication.id)) {
      if (localIds.length > 0) needConfirmation.push(medication.id);
      continue;
    }
    const nextIds = [...(remote ?? new Set<string>())].sort();
    if (JSON.stringify(localIds) !== JSON.stringify(nextIds)) {
      updates.push({ id: medication.id, personId: medication.person_id!, tratamentoIds: nextIds });
    }
  }
  return { updates, needConfirmation };
}
