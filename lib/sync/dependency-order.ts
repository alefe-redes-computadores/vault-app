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
  exam_order_items: [["order_id", "exam_orders"]],
  exam_sessions: [["order_id", "exam_orders"]],
  exam_session_items: [["order_id", "exam_orders"], ["exam_order_item_id", "exam_order_items"], ["session_id", "exam_sessions"]],
  clinical_asset_links: [["asset_id", "clinical_assets"]],
  consultation_exam_order_links: [["order_id", "exam_orders"], ["consultation_id", "consultas"]],
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
  // Polymorphic asset links have an explicit, scoped target dependency.
  if(item.table==='clinical_asset_links'){
    const p=item.payload, type=p.entity_type, id=p.entity_id;
    const table=type==='exam_order'?'exam_orders':type==='exam_order_item'?'exam_order_items':
      type==='exam_session'?'exam_sessions':type==='consultation'?'consultas':null;
    if(table&&typeof id==='string'&&failedEntities.has(`${table}:${id}`))return `${table}:${id}`;
  }
  return null;
}
