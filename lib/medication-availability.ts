import type { Medicamento } from "@/lib/types";

/** Unknown stock must never be treated as confirmed zero. */
export function hasKnownEmptyMedicationStock(med: Pick<Medicamento, "estoque_quantidade">): boolean {
  return typeof med.estoque_quantidade === "number" && Number.isFinite(med.estoque_quantidade) && med.estoque_quantidade <= 0;
}

export function medicationIgnoredStatus(input: { taken: number; ignored: number; pending: number; emptyStock: boolean }) {
  const { taken, ignored, pending, emptyStock } = input;
  const parts = [taken > 0 ? `${taken} tomada(s)` : "Não conta como tomada", pending > 0 ? `${pending} pendente(s)` : "Sem dose pendente"];
  if (emptyStock) parts.push("Estoque registrado zerado");
  return {
    label: taken > 0 ? `${taken} tomada(s) · ${ignored} ignorada(s)` : ignored === 1 ? "Dose ignorada" : `${ignored} doses ignoradas`,
    detail: parts.join(" · "),
    tone: "text-amber-400",
  };
}

/** Compute a local destination from owned records; never trust targetRoute. */
export async function resolveMedicationStockReview(input: { personId?: string; medicamentoIds?: string[] }, userId: string,
  lookup: { person: (id: string) => Promise<{ user_id: string } | undefined>; medication: (id: string) => Promise<Pick<Medicamento, "id" | "person_id" | "user_id"> | undefined> }) {
  if (!input.personId || !userId || !Array.isArray(input.medicamentoIds)) return null;
  const ids = Array.from(new Set(input.medicamentoIds.filter(id => typeof id === "string" && id.trim())));
  if (!ids.length) return null;
  const person = await lookup.person(input.personId);
  if (!person || person.user_id !== userId) return null;
  const meds = await Promise.all(ids.map(id => lookup.medication(id)));
  if (meds.some(med => !med || med.person_id !== input.personId || (med.user_id && med.user_id !== userId))) return null;
  return { personId: input.personId, destination: ids.length === 1 ? `/saude/medicamentos/detalhes?id=${encodeURIComponent(ids[0])}` : "/saude/medicamentos" };
}
