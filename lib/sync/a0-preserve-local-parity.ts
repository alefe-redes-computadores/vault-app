/**
 * VAULT A0 — Preservação de vínculos locais históricos durante cutover aditivo.
 * Escopo: somente campos que não existiam no Postgres anterior à Macro1.
 *
 * NULL remoto = falta de dado legado, NÃO evidência de exclusão clínica.
 * [] remoto = remoção explícita de vínculos (não reintroduzir cache antigo).
 * Não escreve em DB; não transforma fatos; não mistura contas/pessoas.
 */
type Row = Record<string, unknown>;
function sameOwner(row: Row, local?: Row, personRequired = false): local is Row {
  return Boolean(local && typeof row.user_id === 'string'
    && row.user_id === local.user_id
    && (!personRequired || (typeof row.person_id === 'string' && row.person_id === local.person_id)));
}
function mergeMissing(row: Row, local: Row | undefined, fields: readonly string[], personRequired: boolean): Row {
  if (!sameOwner(row, local, personRequired)) return {...row};
  const next: Row = {...row};
  for (const key of fields) {
    if (next[key] !== undefined && next[key] !== null) continue;
    const value = local[key];
    if (Array.isArray(value)) next[key] = [...value];
    else if (typeof value === 'string' && value.trim()) next[key] = value;
  }
  return next;
}
export const preserveA0Cirurgia = (row: Row, local?: Row): Row =>
  mergeMissing(row, local, ['tratamento_ids','cid_ids'], true);
export const preserveA0Tratamento = (row: Row, local?: Row): Row =>
  mergeMissing(row, local, ['data_inicio','condicao'], true);
export const preserveA0Hospital = (row: Row, local?: Row): Row =>
  mergeMissing(row, local, ['medico_ids'], false);
