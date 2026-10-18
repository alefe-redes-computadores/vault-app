import type { Document, Medicamento, Renovacao } from '@/lib/types';

/** V155 — Multiple *explicit* medication relations for one physical document.
 * Never infer clinical ownership from matching names or dates.
 */
function metadataIds(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((id): id is string => typeof id === 'string' && id.trim().length > 0).slice(0, 100).map(id => id.trim());
  if (typeof value !== 'string' || value.length > 4096) return [];
  const text = value.trim();
  if (!text) return [];
  if (text.startsWith('[')) {
    try { return metadataIds(JSON.parse(text)); } catch { return []; }
  }
  return text.split(/[,;]+/).map(id => id.trim()).filter(Boolean).slice(0, 100);
}
export function buildDocumentMedicationIndex(
  documents: Document[], medications: Medicamento[], renewals: Renovacao[], personId: string, userId: string
): Map<string, Medicamento[]> {
  const result = new Map<string, Medicamento[]>();
  if (!personId || !userId) return result;
  const validDocs = documents.filter(d => d.id && d.user_id === userId && d.person_id === personId && d.category_id === 'saude');
  const byDoc = new Map(validDocs.map(d => [d.id!, new Set<string>()]));
  const meds = new Map(medications.filter(m => m.id && m.user_id === userId && m.person_id === personId).map(m => [m.id!, m]));
  const add = (docId: string | undefined | null, medId: string | undefined | null) => {
    if (docId && medId && byDoc.has(docId) && meds.has(medId)) byDoc.get(docId)!.add(medId);
  };
  for (const m of meds.values()) add(m.document_id, m.id);
  const ownedRenewals = renewals.filter(r => r.user_id === userId && r.person_id === personId);
  const renewalById = new Map(ownedRenewals.filter(r => r.id).map(r => [r.id!, r]));
  for (const renewal of ownedRenewals) add(renewal.document_id, renewal.medicamento_id);
  for (const d of validDocs) {
    if (d.entidade_tipo === 'medicamento') add(d.id, d.entidade_id);
    if (d.entidade_tipo === 'renovacao') {
      const r = renewalById.get(d.entidade_id || '');
      if (r) add(d.id, r.medicamento_id);
    }
    const meta = d.metadata || {};
    for (const field of ['medicamento_id','medication_id','medicamento_ids','medication_ids','linked_medicamento_ids'] as const) {
      for (const medId of metadataIds(meta[field])) add(d.id, medId);
    }
  }
  for (const [id, ids] of byDoc) result.set(id, [...ids].map(mid => meds.get(mid)!).sort((a,b) => a.nome.localeCompare(b.nome,'pt-BR')));
  return result;
}

/**
 * Builds every owner index in one pass.
 *
 * The health archive previously filtered the complete document list once for
 * every document. Apart from becoming quadratic, that made a large offline
 * archive noticeably expensive to open. Ownership remains explicit here: a
 * document is never allowed to borrow relations from another account/person.
 */
export function buildDocumentMedicationIndexesByOwner(
  documents: Document[],
  medications: Medicamento[],
  renewals: Renovacao[]
): Map<string, Map<string, Medicamento[]>> {
  const documentsByOwner = new Map<string, Document[]>();
  const medicationsByOwner = new Map<string, Medicamento[]>();
  const renewalsByOwner = new Map<string, Renovacao[]>();

  const ownerKey = (row: { user_id?: string; person_id?: string }) =>
    row.user_id && row.person_id ? `${row.user_id}:${row.person_id}` : null;
  const append = <T,>(target: Map<string, T[]>, key: string | null, row: T) => {
    if (!key) return;
    const bucket = target.get(key);
    if (bucket) bucket.push(row);
    else target.set(key, [row]);
  };

  for (const document of documents) append(documentsByOwner, ownerKey(document), document);
  for (const medication of medications) append(medicationsByOwner, ownerKey(medication), medication);
  for (const renewal of renewals) append(renewalsByOwner, ownerKey(renewal), renewal);

  const result = new Map<string, Map<string, Medicamento[]>>();
  for (const [key, ownedDocuments] of documentsByOwner) {
    const separator = key.indexOf(":");
    const userId = key.slice(0, separator);
    const personId = key.slice(separator + 1);
    result.set(
      key,
      buildDocumentMedicationIndex(
        ownedDocuments,
        medicationsByOwner.get(key) ?? [],
        renewalsByOwner.get(key) ?? [],
        personId,
        userId
      )
    );
  }
  return result;
}
/** Narrow helper for medication details; no duplicate document records are created. */
export function documentMedicationLinks(document: Document, medications: Medicamento[], renewals: Renovacao[], pid: string, uid: string): Medicamento[] {
  return buildDocumentMedicationIndex([document],medications,renewals,pid,uid).get(document.id || '') || [];
}
