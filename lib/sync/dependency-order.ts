import type { SyncQueueItem } from "@/lib/types";

export type SyncEntityKey = `${SyncQueueItem["table"]}:${string}`;

const REFERENCES: Partial<Record<SyncQueueItem["table"], ReadonlyArray<[string, SyncQueueItem["table"]]>>> = {
  tratamento_visual_identity: [["id","tratamentos"]],
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
  surgery_consultation_links_m4: [["cirurgia_id", "cirurgias"], ["consulta_id", "consultas"]],
  rehab_program_team_m5: [["program_id", "rehab_programs_m5"], ["professional_id", "medicos"]],
  rehab_sessions_m5: [["program_id", "rehab_programs_m5"]],
  rehab_session_team_m5: [["session_id", "rehab_sessions_m5"], ["program_team_id", "rehab_program_team_m5"]],
  rehab_origin_links_m5: [["program_id", "rehab_programs_m5"]],
  rehab_session_events_m5: [["session_id", "rehab_sessions_m5"]],
  rehab_milestones_m5: [["program_id", "rehab_programs_m5"], ["session_id", "rehab_sessions_m5"],
    ["professional_id", "medicos"], ["consultation_id", "consultas"], ["exam_order_id", "exam_orders"]],
  hospitalizations_a5: [["hospital_id","hospitais"],["local_id","locais"],["previous_hospitalization_id","hospitalizations_a5"]],
  hospitalization_stays_a5: [["hospitalization_id","hospitalizations_a5"],["hospital_id","hospitais"],["local_id","locais"]],
  hospitalization_team_a5: [["hospitalization_id","hospitalizations_a5"],["professional_id","medicos"],["stay_id","hospitalization_stays_a5"]],
  hospitalization_events_a5: [["hospitalization_id","hospitalizations_a5"],["stay_id","hospitalization_stays_a5"],["source_professional_id","medicos"],["corrects_event_id","hospitalization_events_a5"]],
  hospitalization_relations_a5: [["hospitalization_id","hospitalizations_a5"]],
  hospitalization_discharge_a5: [["hospitalization_id","hospitalizations_a5"]],
  surgery_journey_events_a7: [["cirurgia_id","cirurgias"],["source_professional_id","medicos"],["corrects_event_id","surgery_journey_events_a7"]],
  surgery_team_a7: [["cirurgia_id","cirurgias"],["professional_id","medicos"]],
  vaccination_courses_a8: [],
  vaccination_events_a8: [["course_id","vaccination_courses_a8"],["source_professional_id","medicos"],["source_location_id","locais"],["corrects_event_id","vaccination_events_a8"]],
  procedure_events_a9: [["professional_id","medicos"],["location_id","locais"],["consultation_id","consultas"],["rehab_session_id","rehab_sessions_m5"],["corrects_event_id","procedure_events_a9"]],
  sensitivity_events_a9: [["professional_id","medicos"],["corrects_event_id","sensitivity_events_a9"]],
  surgical_intents_a7m5: [["source_consultation_id","consultas"],["source_professional_id","medicos"],["linked_surgery_id","cirurgias"],["corrects_intent_id","surgical_intents_a7m5"]],
  surgery_evidence_links_a7m5: [["surgery_id","cirurgias"],["corrects_link_id","surgery_evidence_links_a7m5"]],
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
  if(item.table==='rehab_origin_links_m5'){
    const type=item.payload.origin_type, id=item.payload.origin_id;
    const table=type==='consulta'?'consultas':type==='cirurgia'?'cirurgias':type==='tratamento'?'tratamentos':null;
    if(table&&typeof id==='string'&&failedEntities.has(`${table}:${id}`))return `${table}:${id}`;
  }
  if(item.table==='hospitalization_relations_a5'){
    const p=item.payload, id=p.entity_id, type=p.entity_type;
    const table=type==='cirurgia'?'cirurgias':type==='consulta'?'consultas':type==='exam_order'?'exam_orders':
      type==='tratamento'?'tratamentos':type==='rehab_program'?'rehab_programs_m5':type==='medicamento'?'medicamentos':null;
    if(table&&typeof id==='string'&&failedEntities.has(`${table}:${id}`))return `${table}:${id}`;
  }
  if(item.table==='surgery_evidence_links_a7m5'){
    const p=item.payload;
    const t=p.target_type==='procedure_event_a9'?'procedure_events_a9':p.target_type==='exam_order'?'exam_orders':
      p.target_type==='medication'?'medicamentos':p.target_type==='health_record'?'registros_saude':null;
    if(t&&typeof p.target_id==='string'&&failedEntities.has(`${t}:${p.target_id}`))return `${t}:${p.target_id}`;
  }
  if(item.table==='sensitivity_events_a9'){const p=item.payload;const t=p.related_type==='medication'?'medicamentos':p.related_type==='vaccination_event'?'vaccination_events_a8':p.related_type==='procedure_event'?'procedure_events_a9':null;
    if(t&&typeof p.related_id==='string'&&failedEntities.has(`${t}:${p.related_id}`))return `${t}:${p.related_id}`;
  }
  if(item.table==='clinical_asset_links'){
    const p=item.payload, type=p.entity_type, id=p.entity_id;
    const table=type==='exam_order'?'exam_orders':type==='exam_order_item'?'exam_order_items':
      type==='exam_session'?'exam_sessions':type==='consultation'?'consultas':
      type==='rehab_program'?'rehab_programs_m5':type==='rehab_session'?'rehab_sessions_m5':
      type==='hospitalization'?'hospitalizations_a5':type==='hospitalization_event'?'hospitalization_events_a5':
      type==='hospitalization_discharge'?'hospitalization_discharge_a5':
      type==='vaccination_event'?'vaccination_events_a8':
      type==='procedure_event'?'procedure_events_a9':type==='sensitivity_event'?'sensitivity_events_a9':
      type==='surgery_event'?'surgery_journey_events_a7':type==='surgical_intent'?'surgical_intents_a7m5':
      type==='rehab_milestone'?'rehab_milestones_m5':null;
    if(table&&typeof id==='string'&&failedEntities.has(`${table}:${id}`))return `${table}:${id}`;
  }
  return null;
}
