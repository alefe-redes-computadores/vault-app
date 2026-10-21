import type { SupplyData } from "./types";
import type { Document, Farmacia, LocalSaude, Medicamento, Retirada } from "@/lib/types";

type BuildSupplyRelationshipIndexInput = {
  personId: string;
  userId: string;
  data: SupplyData;
  medications: Medicamento[];
  documents: Document[];
  withdrawals: Retirada[];
  pharmacies: Farmacia[];
  places: LocalSaude[];
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
  const activeMedicationIds = new Set<string>();

  for (const process of processes) {
    const ids = new Set((itemsByProcess.get(process.id) || []).map((row) => row.medicamento_id));
    medicationIdsByProcess.set(process.id, ids);
    if (process.status === "ativo") for (const id of ids) activeMedicationIds.add(id);
  }

  return {
    processes,
    items,
    cycles,
    documentLinks,
    itemsByProcess,
    cyclesByProcess,
    documentsByProcess,
    withdrawalsByProcess,
    medicationIdsByProcess,
    activeMedicationIds,
    medicationById,
    documentById,
    pharmacyById,
    placeById,
  };
}
