/** Presentation-only copy helpers. Never infer or mutate clinical facts. */
export function countLabel(value: number, singular: string, plural: string) {
  return `${value} ${value === 1 ? singular : plural}`;
}

export function humanizeCareLocationKind(value?: string | null) {
  const normalized = value?.trim().toLowerCase();
  const labels: Record<string, string> = {
    posto_saude: "Posto de saúde",
    unidade_basica: "Unidade básica de saúde",
    ubs: "UBS",
    usf: "Unidade de Saúde da Família",
    caps: "CAPS",
    hospital: "Hospital",
    clinica: "Clínica",
    laboratorio: "Laboratório",
  };
  return normalized
    ? labels[normalized] ||
        normalized
          .replace(/_/g, " ")
          .replace(/^./, (letter) => letter.toUpperCase())
    : "Local de saúde";
}

export function humanizeStockUnit(
  value?: string | null,
  quantity?: number | null
) {
  const raw = value?.trim().toLowerCase();
  if (!raw || raw === "unidade(s)")
    return quantity === 1 ? "unidade" : "unidades";
  const clean = raw.replace(/\(s\)/g, "");
  if (quantity === 1) return clean;
  const plurals: Record<string, string> = {
    comprimido: "comprimidos",
    capsula: "cápsulas",
    cápsula: "cápsulas",
    gota: "gotas",
    frasco: "frascos",
    dose: "doses",
    unidade: "unidades",
  };
  return plurals[clean] || clean;
}

export function shortPrescriptionKnowledgeLabel(value?: string | null) {
  const text = value?.toLowerCase() || "";
  if (text.includes("notificação a") || text.includes("amarela"))
    return "NOTIF. A";
  if (text.includes("notificação b") || text.includes("azul"))
    return "NOTIF. B";
  if (text.includes("controle especial")) return "ESPECIAL";
  if (text.includes("comum")) return "RECEITA COMUM";
  return null;
}

export function humanizeOfficialPresentation(value: string) {
  return value
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\bCOM REV\b/gi, "comprimido revestido")
    .replace(/\bCT\b/gi, "cartucho")
    .replace(/\bBL\b/gi, "blíster")
    .replace(/\bAL\b/gi, "alumínio")
    .replace(/\bPLAS\b/gi, "plástico")
    .replace(/\bTRANS\b/gi, "transparente")
    // X expresses multiplication/packaging, not necessarily discrete units.
    // Keep decimal, explicit volume and nested package counts verbatim.
    .replace(/\s+X\s+(?=\d)/gi, " × ");
}

/** Display-only projection of the already scoped catalogue identity. A divergent
 * reference never becomes a confirmed ingredient. Preserve the hook's verified
 * offline ingredients; inferred/unknown facts remain in the evidence panel. */
export function medicationIngredientDisplayResidual(
  identity: { authorityState?: string; activeIngredients?: readonly string[]; activeIngredient?: string | null } | null | undefined,
  facts: readonly { kind: string; authority: string; value: string }[] = []
): string[] {
  if (!identity || identity.authorityState === "possible_divergence") return [];
  const known = identity.activeIngredients?.filter(value => value.trim().length > 0) || [];
  if (known.length) return known;
  if (identity.activeIngredient?.trim()) return [identity.activeIngredient];
  if (identity.authorityState !== "confirmed" && identity.authorityState !== "compatible") return [];
  const exact = facts.find(fact => fact.kind === "active_ingredient" && fact.authority === "official_exact" && fact.value.trim());
  return exact ? [exact.value] : [];
}
