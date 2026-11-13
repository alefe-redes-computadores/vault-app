import type { Document, Retirada } from "@/lib/types";
import type { SupplyCycle, SupplyData, SupplyProcess } from "./types";
import { validSupplyDate } from "./rules";

/**
 * M140: projeção estritamente de LEITURA, por pessoa, conta, medicamento e processo.
 * Um evento de retirada pode existir no Vault sem estar vinculado ao fornecimento.
 * Nunca interpretamos isto como autorização, elegibilidade clínica ou novo ciclo.
 */
export function supplyOperationalSnapshotM140({
  process, cycle, data, documents, withdrawals, personId,
}: {
  process: SupplyProcess;
  cycle: SupplyCycle | undefined;
  data: SupplyData;
  documents: Document[];
  withdrawals: Retirada[];
  personId: string;
}) {
  if (!personId || process.person_id !== personId ||
      !data.processos.some(p => p.id === process.id && p.person_id === personId && p.user_id === process.user_id)) return null;
  const uid = process.user_id;
  const owned = (row: { person_id: string; user_id: string }) => row.person_id === personId && row.user_id === uid;
  const items = data.itens.filter(i => owned(i) && i.processo_id === process.id);
  const medicationIds = new Set(items.map(i => i.medicamento_id));
  const cycles = data.ciclos.filter(c => owned(c) && c.processo_id === process.id)
    .sort((a, b) => b.created_at.localeCompare(a.created_at) || b.id.localeCompare(a.id));
  const actualCycle = cycle && owned(cycle) && cycle.processo_id === process.id && cycles.some(c => c.id === cycle.id)
    ? cycle : cycles[0];
  const pendingCycle = cycles.find(c => c.status === "preparando" || c.status === "protocolado") ?? null;
  const direct = withdrawals.filter(r => r.id && owned(r) && medicationIds.has(r.medicamento_id) && r.fornecimento_id === process.id);
  const realized = direct.filter(r => r.status === "realizada")
    .sort((a, b) => b.data.localeCompare(a.data) || (b.id ?? "").localeCompare(a.id ?? ""));
  const scheduled = direct.filter(r => r.status === "agendada" && validSupplyDate(r.data))
    .sort((a, b) => a.data.localeCompare(b.data) || (a.id ?? "").localeCompare(b.id ?? ""));
  // Sem IDs de processo/ciclo: apenas candidatos à REVISÃO, nunca auto-vincular.
  // Medicamentos de outros processos ou registros de compra nunca entram aqui.
  const unlinked = process.origem === "comprado" ? [] : withdrawals.filter(r =>
    r.id && owned(r) && medicationIds.has(r.medicamento_id) && r.tipo === "sus" &&
    !r.fornecimento_id && !r.fornecimento_ciclo_id &&
    (r.status === "realizada" || r.status === "agendada")
  ).sort((a, b) => b.data.localeCompare(a.data));
  const links = data.documentos.filter(l => owned(l) && l.processo_id === process.id &&
    cycles.some(c => c.id === l.ciclo_id));
  const cycleLinks = links.filter(l => l.ciclo_id === actualCycle?.id);
  const linkedIds = new Set(cycleLinks.map(l => l.document_id));
  const available = documents.filter(d => d.id && owned(d) && d.category_id === "saude");
  const relatedDocumentCount = available.filter(d =>
    (d.entidade_tipo === "medicamento" && medicationIds.has(d.entidade_id ?? "")) ||
    (typeof d.metadata?.medicamento_id === "string" && medicationIds.has(d.metadata.medicamento_id))
  ).length;
  const validLinkedDocuments = cycleLinks.filter(l => available.some(d => d.id === l.document_id));
  return {
    processId: process.id,
    processStatus: process.status,
    origin: process.origem,
    selectedCycle: actualCycle ?? null,
    totalCycles: cycles.length,
    pendingCycle,
    canPrepareCycle: process.status === "ativo" && process.origem !== "comprado" && !pendingCycle,
    lastRealized: realized[0] ?? null,
    nextScheduled: scheduled[0] ?? null,
    realizedCount: realized.length,
    unlinkedWithdrawals: unlinked,
    hasAmbiguousMedicationProcess: unlinked.some(r => data.processos.filter(p =>
      owned(p) && p.status === "ativo" && data.itens.some(i => owned(i) && i.processo_id === p.id && i.medicamento_id === r.medicamento_id)
    ).length !== 1),
    processDocuments: links.length,
    cycleDocuments: cycleLinks.length,
    linkedDocumentsAvailable: validLinkedDocuments.length,
    availableDocuments: available.length,
    relatedDocumentCount,
    hasUnlinkedDocuments: available.some(d => !linkedIds.has(d.id!)),
  };
}

export type SupplyOperationalSnapshotM140 = NonNullable<ReturnType<typeof supplyOperationalSnapshotM140>>;
