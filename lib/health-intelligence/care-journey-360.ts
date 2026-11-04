import type { CareCommandSnapshot } from "@/lib/health-intelligence/care-command";

export type CareJourney360Item = {
  id: "medications" | "withdrawals" | "supply" | "documents" | "health" | "acquisitions" | "brain";
  title: string;
  count: number;
  detail: string;
  href: string;
  evidence: "registered" | "planned" | "interpretation";
};

/**
 * M65: owner-scoped presentation of an ALREADY computed care snapshot.
 * No second DB read, no clinical write, no inferred completion or obligation.
 * The owning surface is responsible for selecting the active account/person.
 */
export function projectCareJourney360(command: CareCommandSnapshot | null | undefined): readonly CareJourney360Item[] {
  if (!command) return [];
  const number = (value: unknown): number => typeof value === "number" && Number.isFinite(value) && value > 0
    ? Math.floor(value) : 0;
  const meds = command.medications;
  const access = command.access;
  const archive = command.archive;
  const health = command.health;
  const plan = command.plan;
  const active = number(meds.active);
  const waiting = number(access.withdrawals.scheduled);
  const overdue = Math.min(waiting, number(access.withdrawals.overdue));
  const planned = number(access.acquisitions.planned);
  const present = number(archive.total);
  const entries = number(health.records30d);
  const attention = number(plan.items.length);
  return [
    { id: "medications", title: "Medicamentos", count: active, detail: `${number(meds.needsAction)} com etapa do plano para revisar · ${number(meds.temporary)} por período`, href: "/saude/medicamentos", evidence: "registered" },
    { id: "withdrawals", title: "Retiradas", count: waiting, detail: overdue ? `${overdue} agendada(s) com data anterior a hoje · confirmar o desfecho` : "Agendamentos não confirmam recebimento", href: "/saude/retiradas", evidence: "registered" },
    { id: "supply", title: "Fornecimento", count: number(access.processes.active), detail: `${number(access.documents.explicitMissing)} lacuna(s) documentais explícitas no panorama de processos`, href: "/saude/fornecimento", evidence: "registered" },
    { id: "documents", title: "Documentos de saúde", count: present, detail: `${number(archive.withAttachments)} com anexo · ${number(archive.unlinked)} sem vínculo explícito`, href: "/saude/documentos", evidence: "registered" },
    { id: "health", title: "Registros de saúde", count: entries, detail: `${number(health.activeDays30d)} dia(s) com registros nos últimos 30 dias`, href: "/saude/registros", evidence: "registered" },
    { id: "acquisitions", title: "Aquisições planejadas", count: planned, detail: "Previsões ainda não são compra, gasto ou entrada no estoque", href: "/saude/renovacao", evidence: "planned" },
    { id: "brain", title: "Plano do Brain", count: attention, detail: `${number(plan.counts.now)} etapa(s) classificadas para revisão atual · sugestões, não ações realizadas`, href: "/inteligencia/alertas", evidence: "interpretation" },
  ];
}
