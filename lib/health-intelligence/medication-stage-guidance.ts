/** Human-readable, non-diagnostic companion to the medication's existing
 * canonical stage. This cannot authorize supply, dose, prescription or stock.
 */
export function medicationStageGuidance(stage: string | null | undefined): string | null {
  switch (stage) {
    case "withdrawal_overdue": return "Retirada registrada em atraso: confira o status; atraso não comprova recebimento.";
    case "withdrawal_planned": return "Retirada planejada não representa medicamento já recebido no estoque.";
    case "acquisition_planned": return "Aquisição planejada não representa compra concluída nem estoque disponível.";
    case "acquisition_needed": return "Necessidade de aquisição é um próximo passo, não uma compra realizada.";
    case "prescription_needed": return "Necessidade de receita requer conferência documental; não indica validade automaticamente.";
    case "stock_review": return "Dados de estoque ou receita precisam de revisão antes de qualquer conclusão.";
    default: return null;
  }
}
