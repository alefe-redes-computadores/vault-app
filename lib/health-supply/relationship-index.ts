import type { SupplyData } from "./types";
import type { Document, Farmacia, LocalSaude, Medicamento, Renovacao, Retirada, Tratamento } from "@/lib/types";

type BuildSupplyRelationshipIndexInput = {
  personId: string;
  userId: string;
  data: SupplyData;
  medications: Medicamento[];
  documents: Document[];
  withdrawals: Retirada[];
  pharmacies: Farmacia[];
  places: LocalSaude[];
  treatments?: Tratamento[];
  renewals?: Renovacao[];
};

function groupByProcess<T extends { processo_id: string }>(rows: T[]): Map<string, T[]> {
  const grouped = new Map<string, T[]>();
  for (const row of rows) {
    const bucket = grouped.get(row.processo_id);
    if (bucket) bucket.push(row);
    else grouped.set(row.processo_id, [row]);
  }
  return grouped;
}

/**
 * One owner-scoped relational projection for the supply command.
 * Process → item and item → medication are indexed together; dependent rows
 * cannot enter the graph unless their parent process belongs to the same account/person.
 */
export function buildSupplyRelationshipIndex(input: BuildSupplyRelationshipIndexInput) {
  const { personId, userId, data } = input;
  const processes = data.processos.filter((row) => row.person_id === personId && row.user_id === userId);
  const processIds = new Set(processes.map((row) => row.id));
  const processById = new Map(processes.map((row) => [row.id, row]));
  const owned = <T extends { person_id?: string | null; user_id: string }>(row: T) =>
    row.person_id === personId && row.user_id === userId;
  const items = data.itens.filter((row) => owned(row) && processIds.has(row.processo_id));
  const cycles = data.ciclos.filter((row) => owned(row) && processIds.has(row.processo_id));
  const documentLinks = data.documentos.filter((row) => owned(row) && processIds.has(row.processo_id));
  const withdrawals = input.withdrawals.filter((row) => owned(row) && !!row.fornecimento_id && processIds.has(row.fornecimento_id));

  const itemsByProcess = groupByProcess(items);
  const cyclesByProcess = groupByProcess(cycles);
  const documentsByProcess = groupByProcess(documentLinks);
  const withdrawalsByProcess = groupByProcess(withdrawals.map((row) => ({ ...row, processo_id: row.fornecimento_id! })));
  const medicationById = new Map(input.medications.filter(owned).flatMap((row) => row.id ? [[row.id, row] as const] : []));
  const documentById = new Map(input.documents.filter(owned).flatMap((row) => row.id ? [[row.id, row] as const] : []));
  const pharmacyById = new Map(input.pharmacies.filter((row) => row.user_id === userId).flatMap((row) => row.id ? [[row.id, row] as const] : []));
  const placeById = new Map(input.places.filter((row) => row.user_id === userId).flatMap((row) => row.id ? [[row.id, row] as const] : []));
  const medicationIdsByProcess = new Map<string, Set<string>>();
  const processIdsByMedication = new Map<string, Set<string>>();
  const activeMedicationIds = new Set<string>();

  for (const process of processes) {
    const ids = new Set((itemsByProcess.get(process.id) || []).map((row) => row.medicamento_id));
    medicationIdsByProcess.set(process.id, ids);
    for (const id of ids) {
      const reverse = processIdsByMedication.get(id);
      if (reverse) reverse.add(process.id);
      else processIdsByMedication.set(id, new Set([process.id]));
      if (process.status === "ativo") activeMedicationIds.add(id);
    }
  }

  const treatments = (input.treatments ?? []).filter((row) => !!row.id && owned(row));
  const treatmentById = new Map(treatments.map((row) => [row.id!, row]));
  const medicationIdsByTreatment = new Map<string, Set<string>>();
  const treatmentIdsByMedication = new Map<string, Set<string>>();
  for (const treatment of treatments) {
    const ids = new Set((treatment.medicamento_ids ?? []).filter((id) => medicationById.has(id)));
    medicationIdsByTreatment.set(treatment.id!, ids);
  }
  for (const medication of medicationById.values()) {
    for (const treatmentId of medication.tratamento_ids ?? []) {
      if (!treatmentById.has(treatmentId)) continue;
      medicationIdsByTreatment.get(treatmentId)?.add(medication.id!);
    }
  }
  for (const [treatmentId, medicationIds] of medicationIdsByTreatment) {
    for (const medicationId of medicationIds) {
      const reverse = treatmentIdsByMedication.get(medicationId);
      if (reverse) reverse.add(treatmentId);
      else treatmentIdsByMedication.set(medicationId, new Set([treatmentId]));
    }
  }

  const processesByTreatment = new Map<string, typeof processes>();
  const treatmentsByProcess = new Map<string, Tratamento[]>();
  for (const treatment of treatments) {
    const relatedProcessIds = new Set<string>();
    for (const medicationId of medicationIdsByTreatment.get(treatment.id!) ?? []) {
      for (const processId of processIdsByMedication.get(medicationId) ?? []) relatedProcessIds.add(processId);
    }
    const relatedProcesses = [...relatedProcessIds].flatMap((id) => processById.get(id) ? [processById.get(id)!] : []);
    processesByTreatment.set(treatment.id!, relatedProcesses);
    for (const process of relatedProcesses) {
      const reverse = treatmentsByProcess.get(process.id);
      if (reverse) reverse.push(treatment);
      else treatmentsByProcess.set(process.id, [treatment]);
    }
  }

  const purchasedMedicationIds = new Set(
    [...medicationById.values()].filter((row) => row.tipo_aquisicao === "comprado").map((row) => row.id!)
  );
  for (const renewal of input.renewals ?? []) {
    if (owned(renewal) && renewal.tipo_aquisicao === "comprado" && medicationById.has(renewal.medicamento_id)) {
      purchasedMedicationIds.add(renewal.medicamento_id);
    }
  }
  const purchasedMedicationsByTreatment = new Map<string, Medicamento[]>();
  for (const treatment of treatments) {
    const purchased = [...(medicationIdsByTreatment.get(treatment.id!) ?? [])]
      .filter((id) => purchasedMedicationIds.has(id))
      .flatMap((id) => medicationById.get(id) ? [medicationById.get(id)!] : []);
    purchasedMedicationsByTreatment.set(treatment.id!, purchased);
  }

  return {
    processes,
    processById,
    items,
    cycles,
    documentLinks,
    itemsByProcess,
    cyclesByProcess,
    documentsByProcess,
    withdrawalsByProcess,
    medicationIdsByProcess,
    processIdsByMedication,
    activeMedicationIds,
    medicationById,
    documentById,
    pharmacyById,
    placeById,
    treatments,
    treatmentById,
    medicationIdsByTreatment,
    treatmentIdsByMedication,
    processesByTreatment,
    treatmentsByProcess,
    purchasedMedicationsByTreatment,
  };
}

export function buildSupplyProcessView(
  index: ReturnType<typeof buildSupplyRelationshipIndex>,
  visibleProcesses: typeof index.processes
) {
  const visibleIds = new Set<string>();
  const activeProcesses: typeof visibleProcesses = [];
  const archivedProcesses: typeof visibleProcesses = [];
  let cycles = 0;
  let documents = 0;
  let cyclesInProgress = 0;
  for (const process of visibleProcesses) {
    visibleIds.add(process.id);
    (process.status === "ativo" ? activeProcesses : archivedProcesses).push(process);
    const processCycles = index.cyclesByProcess.get(process.id) ?? [];
    cycles += processCycles.length;
    documents += (index.documentsByProcess.get(process.id) ?? []).length;
    for (const cycle of processCycles) {
      if (cycle.status === "preparando" || cycle.status === "protocolado") cyclesInProgress += 1;
    }
  }
  const treatmentGroups = index.treatments.flatMap((treatment) => {
    const linked = (index.processesByTreatment.get(treatment.id!) ?? []).filter((process) => visibleIds.has(process.id));
    const purchased = index.purchasedMedicationsByTreatment.get(treatment.id!) ?? [];
    return linked.length > 1 || purchased.length > 0 ? [{ treatment, linked, purchased }] : [];
  });
  return { activeProcesses, archivedProcesses, cycles, documents, cyclesInProgress, treatmentGroups };
}
