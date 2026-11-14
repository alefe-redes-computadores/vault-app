export type ActiveProbeEventType =
  | "manufacturer_lot_started"
  | "confirmed_sos_use"
  | "temporary_course_ended"
  | "axis_shift_eligible";

export type ActiveProbeStatus =
  | "scheduled"
  | "eligible"
  | "shown"
  | "answered"
  | "dismissed"
  | "snoozed"
  | "expired"
  | "cancelled";

export type ActiveProbeSyncState = "local_pending" | "synced" | "failed";

export interface ActiveProbeEvidenceRef {
  type: string;
  id: string;
}

export interface ActiveProbeEvent {
  schema_version: 1;
  event_id: string;
  event_type: ActiveProbeEventType;
  user_id: string;
  person_id: string;
  medication_id?: string;
  acquisition_id?: string;
  source_entity_type: string;
  source_entity_id: string;
  event_date: string;
  confirmed_at: string;
  evidence_refs: ActiveProbeEvidenceRef[];
  source: "user_confirmed" | "persisted_record" | "derived_eligible_window";
}

export interface ActiveProbeResponse {
  id: string;
  probe_id: string;
  user_id: string;
  person_id: string;
  option_key: string;
  note?: string;
  answered_at: string;
  source: "user";
  sync_state: ActiveProbeSyncState;
  created_at: string;
  updated_at: string;
}

export interface ActiveProbe {
  id: string;
  schema_version: 1;
  user_id: string;
  person_id: string;
  medication_id?: string;
  acquisition_id?: string;
  event_date: string;
  trigger_id: string;
  trigger_type: ActiveProbeEventType;
  question_key: string;
  question_version: number;
  due_at: string;
  expires_at: string;
  status: ActiveProbeStatus;
  idempotency_key: string;
  sync_state: ActiveProbeSyncState;
  sync_error_code?: string;
  consent_version: number;
  snoozed_until?: string;
  created_at: string;
  updated_at: string;
}

export interface ActiveProbeLotStart {
  acquisition_id: string;
  medication_id: string;
  manufacturer: string;
  started_at: string;
}

export interface ActiveProbePreferences {
  enabled: boolean;
  manufacturer: boolean;
  confirmedSos: boolean;
  temporaryCourse: boolean;
  fourAxes: boolean;
  consentVersion: number;
}

export interface ActiveProbeQuestion {
  key: string;
  version: number;
  prompt: string;
  options: Array<{ key: string; label: string }>;
  optionalNoteLabel: string;
  limitation: string;
}

