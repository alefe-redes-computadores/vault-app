import type { HealthInsightContext } from "@/lib/health-insights";
import { isPrescriptionOnly, renewalEventDate } from "@/lib/health-supply/renewal-event";
import { medicationSupplyRoute } from "@/lib/health-supply/route-authority";

export type CareDocumentLane = "regulatory_prescription" | "sus_process" | "purchase_receipt";
export type CareDocumentStatus = "available" | "missing" | "not_required" | "not_informed";
export type CareDocumentRequirement = {
  lane: CareDocumentLane;
  label: string;
  status: CareDocumentStatus;
  detail: string;
  evidence: string[];
};
export type MedicationDocumentReadiness = {
  medicationId: string;
  medicationName: string;
  routeLabel: string;
  requirements: CareDocumentRequirement[];
  href: string;
};
export type CareDocumentReadinessPortfolio = {
  items: MedicationDocumentReadiness[];
  counts: Record<CareDocumentStatus, number>;
  laneCounts: Record<CareDocumentLane, Record<CareDocumentStatus, number>>;
  attentionItems: number;
  note: string;
};

/**
 * Classifica documentos pela finalidade real. Receita regulatória, documento
 * de processo SUS e comprovante de compra nunca se substituem silenciosamente.
 * O resultado é somente leitura e preserva registros legados incompletos.
 */
export function buildCareDocumentReadiness(context: HealthInsightContext): CareDocumentReadinessPortfolio {
  const supply = context.fornecimento ?? { processos: [], ciclos: [], itens: [], documentos: [] };
  const documentById = new Map(context.documentos.filter(row => row.id).map(row => [row.id!, row]));
  const items = context.medicamentos
    .filter(med => med.id && med.person_id === context.personId && med.status !== "descontinuado")
    .map(med => {
      const medicationId = med.id!;
      const route = medicationSupplyRoute(medicationId, supply, context.renovacoes, context.personId, med.user_id);
      const supplyItems = supply.itens.filter(row => row.medicamento_id === medicationId);
      const processIds = new Set(supplyItems.map(row => row.processo_id));
      const cycleIds = new Set(supplyItems.map(row => row.ciclo_id));
      const links = supply.documentos.filter(row => processIds.has(row.processo_id) || cycleIds.has(row.ciclo_id));
      const linked = links.map(row => documentById.get(row.document_id)).filter(Boolean);
      const prescriptions = context.renovacoes
        .filter(row => row.medicamento_id === medicationId && isPrescriptionOnly(row))
        .sort((a, b) => renewalEventDate(b).localeCompare(renewalEventDate(a)));
      const prescription = prescriptions.find(row => Boolean(row.document_id || row.anexo_url));
      const regulatoryLinked = linked.some(row => row?.type === "receita") || Boolean(prescription);
      const susLinked = links.some(row => ["lme", "formulario", "decisao"].includes(row.tipo)) || linked.some(row => row?.type === "lme" || row?.type === "documento_sus");
      const purchaseEvents = context.renovacoes.filter(row => row.medicamento_id === medicationId && !isPrescriptionOnly(row));
      const receiptLinked = linked.some(row => row?.type === "outro" && /comprovante|cupom|nota/i.test(row.title || ""));
      const publicRoute = route.mode === "public" || route.mode === "hybrid";
      const privateRoute = route.mode === "private" || route.mode === "hybrid";
      const activeProcess = supply.processos.find(row => processIds.has(row.id) && row.status === "ativo");
      const activeCycle = supply.ciclos.filter(row => cycleIds.has(row.id) && row.status !== "encerrado").sort((a,b)=>String(b.created_at||"").localeCompare(String(a.created_at||"")))[0];
      const requirements: CareDocumentRequirement[] = [
        {
          lane: "regulatory_prescription",
          label: "Receita regulatória",
          status: regulatoryLinked ? "available" : prescriptions.length ? "not_informed" : "not_informed",
          detail: regulatoryLinked ? "Receita registrada com vínculo ou anexo." : "Necessidade e validade dependem da prescrição e da regra aplicável; não foi presumida pendência.",
          evidence: prescription ? [`Registro de receita: ${renewalEventDate(prescription).slice(0, 10)}`] : ["Nenhuma receita anexada foi vinculada a este medicamento"],
        },
        {
          lane: "sus_process",
          label: "Documento SUS / processo",
          status: !publicRoute ? "not_required" : susLinked ? "available" : supplyItems.length ? "missing" : "not_informed",
          detail: !publicRoute ? "Não se aplica à rota exclusivamente particular." : susLinked ? "Há documento de processo público vinculado." : supplyItems.length ? "O processo público existe, mas não possui documento SUS/LME vinculado." : "A exigência local ainda não foi estruturada.",
          evidence: [`Rota cadastrada: ${route.labels.join(" + ") || "não informada"}`, `${links.length} vínculo(s) documental(is) no processo`],
        },
        {
          lane: "purchase_receipt",
          label: "Comprovante de aquisição",
          status: !privateRoute ? "not_required" : receiptLinked ? "available" : purchaseEvents.length ? "not_informed" : "not_informed",
          detail: !privateRoute ? "Não é requisito da retirada pública." : receiptLinked ? "Comprovante identificado no histórico." : "É evidência financeira opcional; sua ausência não bloqueia receita, tratamento ou estoque.",
          evidence: [`${purchaseEvents.length} aquisição(ões) registrada(s)`, receiptLinked ? "Comprovante vinculado" : "Sem comprovante identificado"],
        },
      ];
      const href=activeProcess?`/saude/fornecimento?id=${encodeURIComponent(activeProcess.id)}${activeCycle?`&ciclo_id=${encodeURIComponent(activeCycle.id)}`:""}`:`/saude/medicamentos/detalhes?id=${encodeURIComponent(medicationId)}`;
      return { medicationId, medicationName: med.nome, routeLabel: route.labels.join(" + ") || "Rota não informada", requirements, href };
    });
  const counts: Record<CareDocumentStatus, number> = { available: 0, missing: 0, not_required: 0, not_informed: 0 };
  const emptyLane=():Record<CareDocumentStatus,number>=>({available:0,missing:0,not_required:0,not_informed:0});
  const laneCounts:Record<CareDocumentLane,Record<CareDocumentStatus,number>>={regulatory_prescription:emptyLane(),sus_process:emptyLane(),purchase_receipt:emptyLane()};
  for (const item of items) for (const requirement of item.requirements) {counts[requirement.status] += 1;laneCounts[requirement.lane][requirement.status]+=1;}
  const attentionItems=items.filter(item=>item.requirements.some(row=>row.status==="missing")).length;
  return { items, counts, laneCounts, attentionItems, note: "Somente uma exigência explícita de processo aparece como pendência. Documento não informado e documento não aplicável permanecem separados; comprovante de compra continua opcional." };
}
