type DocumentScope = {
  id?: string;
  user_id?: string;
  person_id?: string;
};

type Input = {
  documentId?: string | null;
  medicationUserId: string;
  medicationPersonId: string;
  localDocument: DocumentScope | null;
  remoteExists: boolean;
};

export type MedicationDocumentDependencyDecision =
  | "none"
  | "ready"
  | "enqueue_parent"
  | "unlink_orphan";

/**
 * Decide a reconciliação sem inventar documento nem relaxar a FK.
 *
 * - pai remoto presente: vínculo pronto;
 * - pai somente local e do mesmo titular: enviar pai primeiro;
 * - pai ausente nos dois lados: retirar apenas o ponteiro órfão;
 * - escopo divergente: bloquear, nunca atravessar pessoa/conta.
 */
export function resolveMedicationDocumentDependency(
  input: Input
): MedicationDocumentDependencyDecision {
  const documentId = input.documentId?.trim() || "";
  if (!documentId) return "none";

  if (input.remoteExists) return "ready";
  if (!input.localDocument) return "unlink_orphan";

  if (
    input.localDocument.id !== documentId ||
    input.localDocument.user_id !== input.medicationUserId ||
    input.localDocument.person_id !== input.medicationPersonId
  ) {
    throw new Error(
      "Documento vinculado ao medicamento não pertence à mesma conta e pessoa."
    );
  }

  return "enqueue_parent";
}
