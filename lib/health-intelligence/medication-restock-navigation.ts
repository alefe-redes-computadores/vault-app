/** Navigation only: an acquisition is not a stock movement until confirmed. */
export function medicationRestockHref(medicationId: string, returnTo: string): string {
  const params = new URLSearchParams({ medicamento_id: medicationId, mode: "acquisition", return_to: returnTo });
  return `/saude/renovacao/nova?${params.toString()}`;
}

/** Only an existing acquisition for this medication replaces the shortcut. */
export function isRestockDestination(href: string | undefined, medicationId: string): boolean {
  if (!href) return false;
  const [path, query = ""] = href.split("?");
  return path === "/saude/renovacao/nova" && new URLSearchParams(query).get("medicamento_id") === medicationId;
}

/** A contagem explícita corrige o saldo sem inventar compra, receita ou retirada. */
export function medicationStockCountHref(medicationId: string, returnTo: string): string {
  const params = new URLSearchParams({ id: medicationId, return_to: returnTo });
  return `/saude/medicamentos/saldo?${params.toString()}`;
}

/** Planejamento é um compromisso, nunca uma aquisição realizada. */
export function medicationScheduleSupplyHref(medicationId: string, kind: "sus" | "farmacia", returnTo: string): string {
  const params = new URLSearchParams({ medicamento_id: medicationId, tipo: kind, return_to: returnTo });
  return `/saude/retiradas/nova?${params.toString()}`;
}
