import type { Renovacao } from "@/lib/types";
import { isFutureAcquisition, isPrescriptionOnly, renewalEventDate } from "@/lib/health-supply/renewal-event";

export type RenewalEventState = "prescription" | "planned_acquisition" | "private_acquisition" | "sus_withdrawal" | "free_acquisition";

export interface RenewalEventPresentation {
  state: RenewalEventState;
  title: string;
  chip: string;
  eventDate: string;
  eventDateLabel: string;
  attachmentLabel: string;
  effect: string;
  realized: boolean;
  planned: boolean;
  tone: "prescription" | "planning" | "private" | "public";
}

/** One copy/status authority for list, details, Brain evidence and forms. */
export function presentRenewalEvent(event: Renovacao, todayISO: string): RenewalEventPresentation {
  if (isPrescriptionOnly(event)) return {
    state: "prescription", title: "Receita recebida", chip: "Receita", eventDate: event.data,
    eventDateLabel: "Data da receita", attachmentLabel: "Ver anexo da receita",
    effect: "Documento registrado. Não confirma compra, retirada, gasto ou entrada no estoque.",
    realized: true, planned: false, tone: "prescription",
  };
  if (isFutureAcquisition(event, todayISO)) return {
    state: "planned_acquisition", title: "Aquisição planejada", chip: "Planejada", eventDate: renewalEventDate(event),
    eventDateLabel: "Data planejada", attachmentLabel: "Ver anexo do planejamento",
    effect: "Ainda não realizada. Não entra no gasto nem no estoque até ser confirmada.",
    realized: false, planned: true, tone: "planning",
  };
  if (event.tipo_aquisicao === "sus") return {
    state: "sus_withdrawal", title: "Aquisição pelo SUS", chip: "SUS", eventDate: renewalEventDate(event),
    eventDateLabel: "Data do recebimento", attachmentLabel: "Ver comprovante da retirada",
    effect: "Recebimento realizado sem custo particular informado; a retirada vinculada preserva seu próprio histórico.",
    realized: true, planned: false, tone: "public",
  };
  if (event.tipo_aquisicao === "gratuito") return {
    state: "free_acquisition", title: "Aquisição sem custo", chip: "Sem custo", eventDate: renewalEventDate(event),
    eventDateLabel: "Data do recebimento", attachmentLabel: "Ver comprovante da aquisição",
    effect: "Recebimento realizado sem gasto particular informado.",
    realized: true, planned: false, tone: "public",
  };
  return {
    state: "private_acquisition", title: "Aquisição particular", chip: "Comprada", eventDate: renewalEventDate(event),
    eventDateLabel: "Data da compra", attachmentLabel: "Ver comprovante da compra",
    effect: "Compra realizada. Valor e quantidade só representam o que foi informado neste registro.",
    realized: true, planned: false, tone: "private",
  };
}

export function summarizeRenewalEvents(events: readonly Renovacao[], todayISO: string) {
  let prescriptions = 0, planned = 0, privateAcquisitions = 0, publicAcquisitions = 0;
  for (const event of events) {
    const item = presentRenewalEvent(event, todayISO);
    if (item.state === "prescription") prescriptions += 1;
    else if (item.state === "planned_acquisition") planned += 1;
    else if (item.state === "private_acquisition") privateAcquisitions += 1;
    else publicAcquisitions += 1;
  }
  return { prescriptions, planned, privateAcquisitions, publicAcquisitions, realizedAcquisitions: privateAcquisitions + publicAcquisitions };
}
