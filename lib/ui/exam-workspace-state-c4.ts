/** Macro C F4: presentation-only projection of two DIFFERENT exam authorities.
 * unifiedCount is the visible list (affected by filters), canonicalCount
 * is the owner/person-scoped Dexie count. undefined means still loading.
 * Does not merge, write, duplicate or assert an exam occurred.
 */
export type ExamSummaryStateC4 = {
  showSummary: boolean;
  showEmpty: boolean;
  showLoading: boolean;
  showCanonicalNotice: boolean;
  title: string;
  description: string;
};
export function projectExamSummaryStateC4(
  unifiedCount: number,
  canonicalCount: number | undefined,
  hasFilters: boolean,
): ExamSummaryStateC4 {
  const visible = Number.isInteger(unifiedCount) && unifiedCount > 0 ? unifiedCount : 0;
  const canonical = typeof canonicalCount === "number" && Number.isInteger(canonicalCount) && canonicalCount > 0 ? canonicalCount : 0;
  const awaitingCanonical = canonicalCount === undefined;
  const showCanonicalNotice = visible === 0 && canonical > 0;
  return {
    showSummary: visible > 0 || canonical > 0,
    showEmpty: visible === 0 && canonical === 0 && !awaitingCanonical,
    showLoading: visible === 0 && awaitingCanonical,
    showCanonicalNotice,
    title: showCanonicalNotice ? "Pedidos registrados no cadastro canônico" : "Exames e pedidos organizados",
    description: showCanonicalNotice
      ? hasFilters
        ? "Há pedidos canônicos desta pessoa; os filtros podem ocultar linhas da lista unificada. Consulte os pedidos acima."
        : "Há pedidos canônicos desta pessoa, mesmo sem linhas na lista unificada. Consulte os pedidos acima."
      : "Situação calculada somente pelas datas registradas",
  };
}
