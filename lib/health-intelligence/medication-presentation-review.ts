import type { Medicamento } from "@/lib/types";

type StockFields = Pick<Medicamento,
  "estoque_quantidade" | "estoque_unidade_medida" | "forma_farmaceutica" | "formato"
>;

const normalized = (value?: string) => (typeof value === "string" ? value : "").normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();

/**
 * M71 — visual audit only: never changes counts, units, dose schedules or prescriptions.
 * A medication's presentation is NOT sufficient evidence for an automatic conversion.
 */
export function medicationStockUnitReview(med: StockFields): string | null {
  if (typeof med.estoque_quantidade !== "number" || !Number.isFinite(med.estoque_quantidade)) return null;
  const unit = normalized(med.estoque_unidade_medida);
  const presentation = normalized(med.forma_farmaceutica || med.formato);
  if (!unit) {
    return "Há quantidade registrada, mas falta a unidade. Confira se o saldo está em comprimidos, cápsulas, gotas ou ml.";
  }
  const capsules = presentation.includes("capsul");
  const tablets = presentation.includes("comprimid");
  const drops = presentation.includes("gota");
  const unitCapsules = unit.includes("capsul");
  const unitTablets = unit.includes("comprimid");
  const unitDrops = unit.includes("gota");
  const mismatch = (capsules && unitTablets) || (tablets && unitCapsules) ||
    (drops && (unitCapsules || unitTablets)) || ((capsules || tablets) && unitDrops);
  if (!mismatch) return null;
  return `Apresentação ${med.forma_farmaceutica || med.formato || "não informada"} e unidade de estoque ${med.estoque_unidade_medida} divergem. Confira o cadastro antes de interpretar o saldo.`;
}
