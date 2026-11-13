export type SupplyVisualTreatment = { nome: string; cor?: string | null };
const normalize = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLocaleLowerCase('pt-BR');
/** Read-only process decoration: no persisted treatment association is changed. */
export function supplyVisualTreatmentM143<T extends SupplyVisualTreatment>(title: string, linked: readonly T[]): T | null {
  const label = normalize(title);
  const matching = linked.filter(t => {
    const name = normalize(t.nome);
    return !!name && (label === name || label.startsWith(name + ' ·') || label.startsWith(name + ' -') || label.startsWith(name + ' '));
  });
  return matching.length === 1 ? matching[0] : null;
}
