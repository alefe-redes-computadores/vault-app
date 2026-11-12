import type { SyncQueueItem } from "@/lib/types";

export type SyncEntityKey = `${SyncQueueItem["table"]}:${string}`;

const REFERENCES: Partial<Record<SyncQueueItem["table"], ReadonlyArray<[string, SyncQueueItem["table"]]>>> = {
  medicamentos: [
    ["farmacia_id", "farmacias"],
    ["medico_id", "medicos"],
    ["hospital_id", "hospitais"],
    ["local_id", "locais"],
    ["document_id", "documents"],
  ],
  renovacoes: [
    ["farmacia_id", "farmacias"],
    ["medico_id", "medicos"],
    ["hospital_id", "hospitais"],
    ["local_id", "locais"],
    ["document_id", "documents"],
    ["medicamento_id", "medicamentos"],
  ],
  retiradas: [
    ["farmacia_id", "farmacias"],
    ["medicamento_id", "medicamentos"],
  ],
  fornecimentos: [
    ["farmacia_id", "farmacias"],
    ["medico_id", "medicos"],
    ["local_id", "locais"],
  ],
  fornecimento_documentos: [
    ["document_id", "documents"],
    ["retirada_id", "retiradas"],
  ],
};

export function syncEntityKey(item: SyncQueueItem): SyncEntityKey | null {
  const id = typeof item.payload.id === "string" ? item.payload.id.trim() : "";
  return id ? `${item.table}:${id}` : null;
}

export function blockedSyncDependency(
  item: SyncQueueItem,
  failedEntities: ReadonlySet<SyncEntityKey>
): SyncEntityKey | null {
  if (item.operation === "delete") return null;
  for (const [field, table] of REFERENCES[item.table] ?? []) {
    const id = typeof item.payload[field] === "string" ? item.payload[field].trim() : "";
    if (id && failedEntities.has(`${table}:${id}`)) return `${table}:${id}`;
  }
  return null;
}
