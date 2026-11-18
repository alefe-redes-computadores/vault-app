/** CI360 P6 P3-B — falta de resposta/falha nao e prova de lista remota vazia.
 * Read-only: nunca apaga um documento; protege a veracidade do diagnostico do pull.
 */
type FetchErrorP6P3B = {message?: string} | null | undefined;
export type DocumentPullResultP6P3B<T> = {data: T[] | null; error: {message: string} | null};
export function documentPullResultP6P3B<T>(input: {
  own: readonly T[] | null | undefined;
  shared: readonly T[] | null | undefined;
  ownError: FetchErrorP6P3B;
  sharedError: FetchErrorP6P3B;
  sharedRequired: boolean;
}): DocumentPullResultP6P3B<T> {
  if (input.ownError || (input.sharedRequired && input.sharedError))
    return {data: null, error: {message: 'Leitura remota de documentos incompleta; sem reconciliacao nesta rodada. Verificar rede, permissao e sessao.'}};
  if (!input.own || (input.sharedRequired && !input.shared))
    return {data: null, error: {message: 'Resposta remota de documentos ausente; nao interpretar como zero documentos.'}};
  // Limite conservador: a API pode truncar resultados acima do max_rows.
  if (input.own.length >= 900 || (input.sharedRequired && (input.shared?.length ?? 0) >= 900))
    return {data: null, error: {message: 'Muitos documentos para leitura unica; paginacao segura necessaria antes de certificar sincronizacao.'}};
  return {data: [...input.own, ...(input.sharedRequired ? input.shared ?? [] : [])], error: null};
}
