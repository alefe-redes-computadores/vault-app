/** M51: visibility only. The original relation counts and lifecycle states are untouched. */
export const CLINICAL_RELATION_KINDS = [
  "all", "process", "withdrawal", "prescription", "acquisition", "planned", "document",
] as const;

export type ClinicalRelationKind = typeof CLINICAL_RELATION_KINDS[number];
export type RecordedRelationKind = Exclude<ClinicalRelationKind, "all">;
export type ClinicalRelationCounts = Record<RecordedRelationKind, number>;

export function relationKindVisible(selected: ClinicalRelationKind, kind: RecordedRelationKind): boolean {
  return selected === "all" || selected === kind;
}

/** Only offer categories for records actually linked to this treatment. */
export function availableRelationKinds(counts: ClinicalRelationCounts): RecordedRelationKind[] {
  return CLINICAL_RELATION_KINDS.filter(
    (kind): kind is RecordedRelationKind => kind !== "all" && Number.isSafeInteger(counts[kind]) && counts[kind] > 0,
  );
}

/** Numeric source counts are not affected by temporary search, stage or category filters. */
export function totalRecordedRelations(counts: ClinicalRelationCounts): number {
  return Object.values(counts).reduce((sum, value) => sum + (Number.isSafeInteger(value) && value > 0 ? value : 0), 0);
}
