import type { Medicamento } from "@/lib/types";
import type { MedicationSupplyRoute } from "@/lib/health-supply/route-authority";

export type MedicationDeclaredOrigin = "private" | "public" | "free" | "unknown";
export interface MedicationSupplyEvidence {
  declared: MedicationDeclaredOrigin;
  declaredLabel: string;
  historicalMixed: boolean;
  hasActivePublicLink: boolean;
  hasRecordedPrivatePurchase: boolean;
  detail: string;
}

/**
 * R9 R4 — Separate the medication's declared route from evidence in the
 * supply/process and purchase ledgers. Neither proves an actual dispensation.
 * Caller must supply an owner-scoped route (person + account + medication).
 */
export function describeMedicationSupplyEvidence(
  medication: Pick<Medicamento, "tipo_aquisicao">,
  route: MedicationSupplyRoute | null | undefined,
): MedicationSupplyEvidence {
  const declared: MedicationDeclaredOrigin = medication.tipo_aquisicao === "comprado"
    ? "private" : medication.tipo_aquisicao === "sus"
      ? "public" : medication.tipo_aquisicao === "gratuito" ? "free" : "unknown";
  const declaredLabel = declared === "private" ? "Comprado · cadastro"
    : declared === "public" ? "SUS · cadastro"
    : declared === "free" ? "Gratuito · cadastro" : "Origem não definida no cadastro";
  const hasActivePublicLink = Boolean(route?.origins.some(origin =>
    origin === "municipal" || origin === "estadual_ceaf" || origin === "farmacia_popular"));
  const hasRecordedPrivatePurchase = Boolean(route?.hasPrivatePurchase);
  const historicalMixed = Boolean(route?.mode === "hybrid");
  const detail = historicalMixed
    ? `${declaredLabel}. Há processo público ativo vinculado e histórico de compra particular. Esses registros não comprovam fornecimento simultâneo nem aquisição recente.`
    : `${declaredLabel}. ${hasActivePublicLink ? "Há processo público ativo vinculado; isso não confirma retirada realizada." : "Sem vínculo público ativo comprovado nesta rota."} ${hasRecordedPrivatePurchase ? "Há compra particular registrada no histórico." : "Nenhuma compra particular confirmada por este índice."}`;
  return { declared, declaredLabel, historicalMixed, hasActivePublicLink, hasRecordedPrivatePurchase, detail };
}
