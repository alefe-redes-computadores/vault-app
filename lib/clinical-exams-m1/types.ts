/** VAULT M1 — canonical examination storage, additive to legacy models.
 * No clinical data is inferred from date alone. No physical deletion. */
export const CLINICAL_EXAM_TABLES_M1 = [
  'exam_orders',
  'exam_order_items',
  'exam_sessions',
  'exam_session_items',
  'clinical_assets',
  'clinical_asset_links',
  'consultation_exam_order_links',
] as const;
export type ClinicalExamTableM1 = (typeof CLINICAL_EXAM_TABLES_M1)[number];
export type ExamItemStatusM1 =
  | 'pending' | 'scheduled' | 'collected' | 'result_pending'
  | 'result_received' | 'cancelled' | 'recollection_needed';
export type SessionItemStatusM1 = 'scheduled' | 'collected' | 'missed' | 'cancelled' | 'recollection_needed';
export type AssetUploadStatusM1 = 'local_only' | 'uploading' | 'synced' | 'failed';
export interface ClinicalRecordBaseM1 {
  id: string;
  user_id: string;
  person_id: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  synced?: boolean;
}
export interface ExamOrderM1 extends ClinicalRecordBaseM1 {
  order_kind: 'medical_request' | 'standalone';
  title: string;
  requested_on: string | null;
  valid_until: string | null;
  doctor_id: string | null;
  note: string | null;
  source: string;
}
export interface ExamOrderItemM1 extends ClinicalRecordBaseM1 {
  order_id: string;
  name: string;
  status: ExamItemStatusM1;
  collected_at: string | null;
  result_received_at: string | null;
  result_summary: string | null;
  result_flag: 'unreviewed' | 'reported_normal' | 'reported_altered' | 'bring_to_doctor';
  result_payload: Record<string, unknown>;
  note: string | null;
}
export interface ExamSessionM1 extends ClinicalRecordBaseM1 {
  order_id: string;
  location_id: string | null;
  laboratory_name: string | null;
  scheduled_at: string;
  timezone_name: string;
  status: 'scheduled' | 'completed' | 'cancelled' | 'missed';
  prep_minutes: number | null;
  prep_instructions: string | null;
  prep_confirmed_by_user: boolean;
  expected_result_at: string | null;
  lab_protocol_code: string | null;
  lab_portal_note: string | null;
  prep_reminder_opt_in: boolean;
  appointment_reminder_opt_in: boolean;
  result_reminder_opt_in: boolean;
  note: string | null;
}
export interface ExamSessionItemM1 extends ClinicalRecordBaseM1 {
  order_id: string;
  session_id: string;
  exam_order_item_id: string;
  status: SessionItemStatusM1;
  collected_at: string | null;
  note: string | null;
}
export interface ClinicalAssetM1 extends ClinicalRecordBaseM1 {
  sha256: string;
  filename: string;
  mime_type: string;
  size_bytes: number;
  storage_bucket: 'clinical-private';
  storage_path: string | null;
  upload_status: AssetUploadStatusM1;
  uploaded_at: string | null;
}
export interface ClinicalAssetLinkM1 extends ClinicalRecordBaseM1 {
  asset_id: string;
  entity_type: 'exam_order' | 'exam_order_item' | 'exam_session' | 'consultation';
  entity_id: string;
  role: 'request' | 'result' | 'protocol' | 'supporting';
  note: string | null;
}
export interface ConsultationExamOrderLinkM1 extends ClinicalRecordBaseM1 {
  order_id: string;
  consultation_id: string;
  role: 'origin' | 'review';
  note: string | null;
}
export type ClinicalExamRowM1 =
  | ExamOrderM1 | ExamOrderItemM1 | ExamSessionM1 | ExamSessionItemM1
  | ClinicalAssetM1 | ClinicalAssetLinkM1 | ConsultationExamOrderLinkM1;
export const isClinicalExamTableM1 = (table: string): table is ClinicalExamTableM1 =>
  (CLINICAL_EXAM_TABLES_M1 as readonly string[]).includes(table);
