/**
 * M150 P3 — compact presentation, NEVER a reconciliation or stock inference.
 * Latest acquisition metadata and declared label remain separate evidence.
 */
export type ListProvenanceInputM150P3 = {
  latestManufacturer?: string | null;
  declaredManufacturer?: string | null;
  acquisitionType?: string | null;
  routeMode?: string | null;
  routeLabels?: readonly string[] | null;
  doseText?: string | null;
};

export function medicationListProvenanceM150P3(input: ListProvenanceInputM150P3) {
  const latest = (input.latestManufacturer || '').trim();
  const declared = (input.declaredManufacturer || '').trim();
  const dose = (input.doseText || '').trim();
  const manufacturer = latest || declared;
  const recordedOrigin = input.acquisitionType === 'comprado' ? 'Comprado' :
    input.acquisitionType === 'sus' ? 'SUS' : '';
  // Hybrid records never prove current supply: a declared source is a cadastro fact.
  const origin = input.routeMode === 'hybrid'
    ? (recordedOrigin ? `${recordedOrigin} · cadastro` : 'Origens históricas')
    : recordedOrigin || (input.routeMode === 'private' ? 'Compra no histórico' :
      input.routeMode === 'public' ? 'SUS no histórico' : '');
  const text = [manufacturer, origin, dose ? `Dose ${dose}` : ''].filter(Boolean).join(' · ');
  const evidence = [
    latest ? `Fabricante informado na última aquisição registrada: ${latest}. Não identifica automaticamente a embalagem física em uso.` : '',
    declared ? `Laboratório declarado na etiqueta do cadastro: ${declared}.` : '',
    recordedOrigin ? `Origem cadastrada: ${recordedOrigin}. Não comprova fornecimento atual.` : '',
    input.routeMode === 'hybrid' ? 'Há origens pública e particular no histórico; nenhuma comprova o fornecedor atual.' : '',
    input.routeLabels?.length ? `Histórico/processo: ${input.routeLabels.join(' + ')}.` : '',
    dose ? `Posologia cadastrada: ${dose}.` : '',
  ].filter(Boolean).join(' ');
  return { text, evidence: evidence || 'Fabricante e origem não informados; confira os detalhes.', hasDistinctManufacturers: Boolean(latest && declared && latest.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase() !== declared.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()) };
}

/** Presentation-only spelling correction, without changing the stored identity. */
export function medicationListDisplayNameM150P3(name: string): string {
  return name.replace(/\bprystiq\b/gi, 'Pristiq');
}
