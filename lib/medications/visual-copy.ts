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
    .replace(/\s+X\s+(\d+)\b/gi, " · $1 unidades");
}
