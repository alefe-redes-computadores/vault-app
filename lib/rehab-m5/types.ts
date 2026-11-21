/** M5-REAB: factual rehabilitation records, no inferred clinical outcome. */
export type RehabProgramStatus = 'planned'|'active'|'suspended'|'completed';
export type RehabSessionStatus = 'scheduled'|'confirmed'|'performed'|'cancelled'|'missed';
export type RehabSessionMode = 'home'|'clinic'|'hospital'|'other';
export type RehabOriginType = 'consulta'|'cirurgia'|'tratamento';
export type RehabSessionAction = 'scheduled'|'rescheduled'|'status_changed';
export type RehabBase = {
  id: string; user_id: string; person_id: string;
  created_at: string; updated_at: string; deleted_at: string|null; synced?:boolean;
};
export type RehabProgramM5 = RehabBase & {
  title:string; specialty:string|null; functional_goal:string|null;
  body_region:string|null; laterality:'right'|'left'|'bilateral'|'not_reported'|null;
  status:RehabProgramStatus; start_date:string|null; expected_end_date:string|null;
};
export type RehabTeamM5 = RehabBase & {
  program_id:string; professional_id:string; role:string;
  start_date:string|null; end_date:string|null;
};
export type RehabSessionM5 = RehabBase & {
  program_id:string; scheduled_at:string; timezone:string;
  status:RehabSessionStatus; mode:RehabSessionMode;
  local_id:string|null; hospital_id:string|null; place_note:string|null;
  notes:string|null;
};
export type RehabSessionTeamM5 = RehabBase & {session_id:string; program_team_id:string;};
export type RehabOriginM5 = RehabBase & {
  program_id:string; origin_type:RehabOriginType; origin_id:string; note:string|null;
};
export type RehabSessionEventM5 = RehabBase & {
  session_id:string; action:RehabSessionAction;
  from_at:string|null; to_at:string|null;
  from_status:RehabSessionStatus|null; to_status:RehabSessionStatus|null;
  note:string|null;
};
export const REHAB_TABLES_M5 = [
 'rehab_programs_m5','rehab_program_team_m5','rehab_sessions_m5',
 'rehab_session_team_m5','rehab_origin_links_m5','rehab_session_events_m5',
] as const;
export type RehabTableM5 = typeof REHAB_TABLES_M5[number];
export const REHAB_PROGRAM_STATES_M5:ReadonlyArray<{value:RehabProgramStatus;label:string}>=[
 {value:'planned',label:'Planejado'},{value:'active',label:'Em andamento'},
 {value:'suspended',label:'Suspenso'},{value:'completed',label:'Concluído'},
];
export const REHAB_SESSION_STATES_M5:ReadonlyArray<{value:RehabSessionStatus;label:string}>=[
 {value:'scheduled',label:'Agendada'},{value:'confirmed',label:'Confirmada'},
 {value:'performed',label:'Realizada'},{value:'cancelled',label:'Cancelada'},
 {value:'missed',label:'Não compareceu'},
];
export const validUuidM5=(s:unknown):s is string=>typeof s==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
export const validLocalDateM5=(value:string):boolean=>{
 if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;
 const d=new Date(`${value}T12:00:00Z`);return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===value;
};
