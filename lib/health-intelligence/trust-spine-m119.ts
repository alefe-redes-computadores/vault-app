/**
 * VAULT M119 — Espinha de Confiança.
 * Projeções puras e limitadas. Não abrem IndexedDB, não leem rede,
 * não alteram referências e não presumem que ausência = erro clínico.
 */
import type { HealthInsight, HealthInsightContext } from '@/lib/health-insights';

export type TrustFindingM119 = {
  key: string;
  kind: 'reference_unavailable' | 'legacy_reverse' | 'candidate_unconfirmed' | 'no_recorded_link';
  level: 'review' | 'information';
  title: string;
  detail: string;
  route: string;
};
export type TrustAuditM119 = {
  state: 'ready' | 'unavailable';
  observed: { medications: number; treatments: number; documents: number };
  total: number;
  truncated: boolean;
  findings: TrustFindingM119[];
};

const LIMIT = 18;
const route = (kind: 'medicamento' | 'tratamento', id: string) =>
  kind === 'medicamento'
    ? `/saude/medicamentos/detalhes?id=${encodeURIComponent(id)}`
    : `/saude/tratamentos/detalhes?id=${encodeURIComponent(id)}`;
const isId = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;
const distinctIds = (values: unknown): string[] =>
  Array.isArray(values) ? [...new Set(values.filter(isId))] : [];

/** Use exclusively a context already validated for the authenticated owner. */
export function auditCareLinksM119(
  context: HealthInsightContext | null | undefined,
  userId: string,
  personId: string,
): TrustAuditM119 {
  const blank: TrustAuditM119 = {
    state: 'unavailable',
    observed: { medications: 0, treatments: 0, documents: 0 },
    total: 0, truncated: false, findings: [],
  };
  if (!context || !userId || !personId || context.userId !== userId || context.personId !== personId) return blank;
  const owned = <T extends { user_id: string; person_id?: string }>(values: readonly T[]): T[] =>
    values.filter(item => item.user_id === userId && item.person_id === personId);
  const meds = owned(context.medicamentos);
  const treatments = owned(context.tratamentos);
  const documents = owned(context.documentos);
  const medsById = new Map(meds.filter(m => isId(m.id)).map(m => [m.id!, m]));
  const treatmentsById = new Map(treatments.filter(t => isId(t.id)).map(t => [t.id!, t]));
  const docsById = new Set(documents.filter(d => isId(d.id)).map(d => d.id!));
  const findings: TrustFindingM119[] = [];
  const seen = new Set<string>();
  const add = (item: TrustFindingM119) => {
    if (seen.has(item.key)) return;
    seen.add(item.key);
    findings.push(item);
  };

  // Authoritative medication -> treatment explicit links.
  for (const medication of meds) {
    if (!isId(medication.id)) continue;
    for (const treatmentId of distinctIds(medication.tratamento_ids)) {
      if (!treatmentsById.has(treatmentId)) add({
        key: `med:missing:${medication.id}:${treatmentId}`,
        kind: 'reference_unavailable', level: 'review',
        title: `Conferir vínculo de ${medication.nome}`,
        detail: 'Um tratamento referenciado não aparece no acervo disponível desta pessoa. Pode estar pendente de sincronização; nenhum vínculo foi removido.',
        route: route('medicamento', medication.id),
      });
    }
    if (isId(medication.document_id) && !docsById.has(medication.document_id)) add({
      key: `med:doc:${medication.id}:${medication.document_id}`,
      kind: 'reference_unavailable', level: 'review',
      title: `Conferir documento de ${medication.nome}`,
      detail: 'O documento vinculado não está no recorte disponível. Verifique a sincronização antes de qualquer alteração.',
      route: route('medicamento', medication.id),
    });
  }

  for (const treatment of treatments) {
    if (!isId(treatment.id)) continue;
    const explicit = meds.filter(m => m.tratamento_ids?.includes(treatment.id!));
    const explicitIds = new Set(explicit.map(m => m.id).filter(isId));
    for (const medicationId of distinctIds(treatment.medicamento_ids)) {
      const medication = medsById.get(medicationId);
      if (!medication || !explicitIds.has(medicationId)) add({
        key: `treat:reverse:${treatment.id}:${medicationId}`,
        kind: 'legacy_reverse', level: 'review',
        title: `Revisar relação em ${treatment.nome}`,
        detail: 'Há uma referência no tratamento não confirmada pelo vínculo principal do medicamento. Pode ser legado; não foi criada associação automática.',
        route: route('tratamento', treatment.id),
      });
    }
    if (treatment.status !== 'ativo') continue;
    const treatmentCids = new Set(distinctIds(treatment.cid_ids));
    if (!explicit.length && !distinctIds(treatment.medicamento_ids).length) add({
      key: `treat:empty:${treatment.id}`,
      kind: 'no_recorded_link', level: 'information',
      title: `${treatment.nome} sem medicamento vinculado`,
      detail: 'Não há vínculo registrado neste recorte. Isso não significa que exista medicação obrigatória ou que algum tratamento esteja incorreto.',
      route: route('tratamento', treatment.id),
    });
    if (treatmentCids.size) for (const medication of meds) {
      if (!isId(medication.id) || medication.status === 'descontinuado' ||
          medication.tratamento_ids?.includes(treatment.id)) continue;
      const medCids = [...distinctIds(medication.cid_ids), ...(isId(medication.cid_id) ? [medication.cid_id] : [])];
      if (medCids.some(cid => treatmentCids.has(cid))) add({
        key: `candidate:${treatment.id}:${medication.id}`,
        kind: 'candidate_unconfirmed', level: 'information',
        title: `Possível relação para revisar: ${medication.nome}`,
        detail: `O registro compartilha um CID com ${treatment.nome}, mas isso NÃO confirma vínculo. Somente uma escolha explícita pode associá-los.`,
        route: route('medicamento', medication.id),
      });
    }
  }

  // Documents may also declare a generic explicit relationship. A missing
  // target in this snapshot is a review hint, never deletion authority.
  for (const document of documents) {
    if (!isId(document.id) || !isId(document.entidade_id)) continue;
    const type = (document.entidade_tipo || '').trim().toLocaleLowerCase('pt-BR');
    const targetKnown = type === 'tratamento'
      ? treatmentsById.has(document.entidade_id)
      : type === 'medicamento' ? medsById.has(document.entidade_id) : true;
    if (!targetKnown) add({
      key: `doc:related:${document.id}:${type}:${document.entidade_id}`,
      kind: 'reference_unavailable', level: 'review',
      title: `Conferir vínculo do documento ${document.title}`,
      detail: 'A entidade explicitamente relacionada não consta no acervo disponível desta pessoa. Pode ser dado pendente; o documento não será alterado.',
      route: `/saude/documentos/detalhes?id=${encodeURIComponent(document.id)}`,
    });
  }

  // We do not scan other people's records to "resolve" a missing identity.
  // Show a bounded local projection; a count outside the bound is retained.
  findings.sort((a, b) => Number(b.level === 'review') - Number(a.level === 'review') || a.key.localeCompare(b.key));
  return {
    state: 'ready',
    observed: { medications: meds.length, treatments: treatments.length, documents: documents.length },
    total: findings.length,
    truncated: findings.length > LIMIT,
    findings: findings.slice(0, LIMIT),
  };
}

export type EvidenceReceiptM119 = {
  sourceStatus: 'named' | 'not_individualized';
  declaredSourceNames: string[];
  referencedEntityCount: number;
  sample: number | null;
  days: number | null;
  coverage: { observed: number; total: number } | null;
  traceableEvidenceCount: number;
  dateStatus: 'not_supplied';
};
/**
 * The Brain does not yet attach exact source-row IDs/timestamps to every
 * insight. Never fabricate an update time or confuse category with provenance.
 */
export function evidenceReceiptM119(insight: HealthInsight): EvidenceReceiptM119 {
  const names = [...new Set((insight.fontesInternas || []).filter(isId))].slice(0, 12);
  const refs = [...new Set([...(insight.entidadeIds || []), ...(isId(insight.entidadeId) ? [insight.entidadeId] : [])].filter(isId))];
  const observed = insight.coberturaDias?.observados;
  const total = insight.coberturaDias?.total;
  return {
    sourceStatus: names.length ? 'named' : 'not_individualized',
    declaredSourceNames: names,
    referencedEntityCount: refs.length,
    sample: Number.isSafeInteger(insight.amostra) && insight.amostra >= 0 ? insight.amostra : null,
    days: typeof insight.periodoDias === 'number' && Number.isSafeInteger(insight.periodoDias) && insight.periodoDias > 0 ? insight.periodoDias : null,
    coverage: Number.isSafeInteger(observed) && Number.isSafeInteger(total) && observed! >= 0 && total! > 0 && observed! <= total! ? { observed: observed!, total: total! } : null,
    traceableEvidenceCount: (insight.evidencias || []).filter(isId).length,
    dateStatus: 'not_supplied',
  };
}
