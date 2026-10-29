/** V328: turn no-op self-targets into a relevant section of the current detail.
 * Pure route decision; never change medical status or inferred care requirements.
 */
export type MedicationCareNavigation =
  | { kind: "route"; href: string }
  | { kind: "section"; sectionId: "medicamento-rotina" | "medicamento-fornecimento" | "medicamento-jornada" };

export function resolveMedicationCareNavigation({ href, currentMedicationId, title, reason }: {
  href: string;
  currentMedicationId: string;
  title?: string;
  reason?: string;
}): MedicationCareNavigation {
  const target = href.trim();
  if (!target.startsWith("/") || target.startsWith("//")) return { kind: "route", href: target };
  const parsed = new URL(target, "https://vault.local");
  if (parsed.pathname !== "/saude/medicamentos/detalhes" ||
      parsed.searchParams.get("id") !== currentMedicationId) {
    return { kind: "route", href: target };
  }
  const clue = `${title || ""} ${reason || ""}`.toLocaleLowerCase("pt-BR");
  if (/sus|fornec|document|processo|vínculo|vinculo/.test(clue)) {
    return { kind: "section", sectionId: "medicamento-fornecimento" };
  }
  if (/receita|renova|aquisi|compra|retirada|histórico/.test(clue)) {
    return { kind: "section", sectionId: "medicamento-jornada" };
  }
  return { kind: "section", sectionId: "medicamento-rotina" };
}
