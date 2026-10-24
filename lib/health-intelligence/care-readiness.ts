import type { HealthInsightContext } from "@/lib/health-insights";
import { buildCareForecast } from "@/lib/health-intelligence/care-forecast";
import { medicationSupplyRoute, type MedicationSupplyRoute } from "@/lib/health-supply/route-authority";
import { isFutureAcquisition, isPrescriptionOnly, renewalEventDate } from "@/lib/health-supply/renewal-event";

export type CareReadinessState = "ready" | "prepare" | "overdue" | "unknown";
export type CareReadinessItem = {
  medicationId: string;
  medicationName: string;
  route: MedicationSupplyRoute;
  state: CareReadinessState;
  nextDate: string | null;
  headline: string;
  evidence: string[];
  missing: string[];
  href: string;
};
export type CareReadinessPortfolio = {
  items: CareReadinessItem[];
  counts: Record<CareReadinessState, number>;
  generatedFor: string;
  note: string;
};

const validDay = (value?: string | null) => Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value.slice(0, 10)));

/**
 * Read-only care readiness. Public supply, private purchase and prescriptions
 * remain independent evidence lanes; a purchase never proves SUS coverage and a
 * planned event never becomes completed stock.
 */
export function buildCareReadiness(
  context: HealthInsightContext,
  today = context.hoje || new Date().toISOString().slice(0, 10),
): CareReadinessPortfolio {
  const supply = context.fornecimento ?? { processos: [], ciclos: [], itens: [], documentos: [] };
  const forecast = buildCareForecast(context, today);
  const withdrawalByMedication = new Map<string, (typeof forecast.withdrawals)[number]>();
  for (const withdrawal of forecast.withdrawals) {
    const current = withdrawalByMedication.get(withdrawal.medicationId);
    if (!current || withdrawal.date < current.date) withdrawalByMedication.set(withdrawal.medicationId, withdrawal);
  }
  const items = context.medicamentos
    .filter(med => med.id && med.person_id === context.personId && med.status !== "descontinuado")
    .map(med => {
      const id = med.id!;
      const route = medicationSupplyRoute(id, supply, context.renovacoes, context.personId, med.user_id);
      const events = context.renovacoes
        .filter(row => row.medicamento_id === id && row.user_id === med.user_id && (!row.person_id || row.person_id === context.personId))
        .sort((a, b) => renewalEventDate(b).localeCompare(renewalEventDate(a)));
      const withdrawal = withdrawalByMedication.get(id);
      const plannedPurchase = events.find(row => !isPrescriptionOnly(row) && isFutureAcquisition(row, today));
      const prescription = events.find(row => isPrescriptionOnly(row) && renewalEventDate(row).slice(0, 10) <= today);
      const missing = withdrawal?.missing ? [...withdrawal.missing] : [];
      const nextDate = withdrawal?.date || (plannedPurchase ? renewalEventDate(plannedPurchase).slice(0, 10) : null);
      let state: CareReadinessState = "unknown";
      let headline = "Próxima etapa ainda não definida";
      if (withdrawal?.overdue) {
        state = "overdue";
        headline = "Retirada pendente precisa de decisão";
      } else if (withdrawal) {
        state = missing.length ? "prepare" : "ready";
        headline = missing.length ? "Preparar retirada registrada" : "Retirada registrada com dados essenciais";
      } else if (plannedPurchase) {
        state = "prepare";
        headline = "Compra particular planejada";
      } else if (route.mode === "private" || route.mode === "hybrid") {
        state = prescription ? "ready" : "unknown";
        headline = prescription ? "Receita registrada; compra continua independente" : "Compra particular sem data planejada";
      } else if (route.mode === "public") {
        state = "prepare";
        headline = "Fornecimento público sem próxima retirada vinculada";
        missing.push("Próxima retirada ou etapa do ciclo");
      }
      const evidence = [
        `Rota: ${route.labels.join(" + ") || "não informada"}`,
        prescription ? `Receita registrada em ${renewalEventDate(prescription).slice(0, 10)}` : "Receita atual não comprovada pelo histórico",
        withdrawal ? `Retirada registrada em ${withdrawal.date}` : plannedPurchase ? `Compra planejada em ${renewalEventDate(plannedPurchase).slice(0, 10)}` : "Sem próximo evento registrado",
      ];
      return { medicationId: id, medicationName: med.nome, route, state, nextDate, headline, evidence, missing,
        href: `/saude/medicamentos/detalhes?id=${encodeURIComponent(id)}` };
    })
    .sort((a, b) => {
      const rank: Record<CareReadinessState, number> = { overdue: 0, prepare: 1, unknown: 2, ready: 3 };
      return rank[a.state] - rank[b.state] || (a.nextDate || "9999").localeCompare(b.nextDate || "9999") || a.medicationName.localeCompare(b.medicationName, "pt-BR");
    });
  const counts: Record<CareReadinessState, number> = { ready: 0, prepare: 0, overdue: 0, unknown: 0 };
  for (const item of items) counts[item.state] += 1;
  return { items, counts, generatedFor: today,
    note: "Ausência de evento não significa falha clínica. O resumo separa compra, receita e fornecimento público e não altera estoque ou status." };
}
