/** Canonical visual metadata; never infer clinical identity from name or ID. */
export const TREATMENT_ICON_KEYS_R03=['activity','heart','clipboard','shield','calendar','brain','stethoscope','target','leaf','waypoints','heartpulse','pill'] as const;
export const TREATMENT_EXPANDED_READ_KEYS_UX360=["brain-circuit","waves","moon","moon-star","bed-double","cloud-moon","bone","accessibility","hand","shield-plus","eye","ear","wind","droplet","person-standing","footprints","timer","book-heart","smile","focus","sparkles","folder-heart"] as const;
export type TreatmentExpandedIconKeyR04=typeof TREATMENT_EXPANDED_READ_KEYS_UX360[number];
export type TreatmentIconKeyR03=typeof TREATMENT_ICON_KEYS_R03[number]|typeof TREATMENT_EXPANDED_READ_KEYS_UX360[number];
export type TreatmentIdentityRecordR03={id?:unknown;user_id?:unknown;person_id?:unknown;icone?:unknown;icon?:unknown;icon_name?:unknown;cor?:unknown;visual_icon?:unknown;visual_icon_expanded?:unknown;visual_icon_updated_at?:unknown;visual_icon_revision?:unknown;visual_icon_operation_id?:unknown;visual_identity_pending?:unknown;visual_legacy_choice?:unknown};
export type TreatmentVisualChoiceR03=TreatmentIconKeyR03|'unassigned';
export type TreatmentScopeR03={userId:string;personId:string};
export function validTreatmentIconKeyR03(value:unknown):TreatmentIconKeyR03|null {
  if(typeof value!=='string')return null;
  const k=value.trim().toLowerCase();
  return ([...TREATMENT_ICON_KEYS_R03,...TREATMENT_EXPANDED_READ_KEYS_UX360] as readonly string[]).includes(k)?k as TreatmentIconKeyR03:null;
}
export function explicitTreatmentIconR03(record:TreatmentIdentityRecordR03|null|undefined):TreatmentIconKeyR03|null {
  const pending=readVisualIntentR03(record?.visual_identity_pending);
  if(pending?.state==='pending')return pending.choice==='unassigned'?null:pending.choice;
  if(record?.visual_icon_expanded!=null){
    // The server retains a legacy-compatible neutral key. Only a valid expanded
    // projection associated with that key is authoritative; never infer by name.
    const expanded=expandedTreatmentChoiceR04(record.visual_icon_expanded);
    return record.visual_icon==='unassigned'&&expanded?expanded:null;
  }
  if(record?.visual_icon==='unassigned'||(record?.visual_icon==null&&record?.visual_legacy_choice==='unassigned'))return null;
  // A confirmed value must not be replaced by an older legacy alias.
  if(record?.visual_icon!=null)return validTreatmentIconKeyR03(record.visual_icon);
  for(const value of [record?.visual_legacy_choice,record?.icone,record?.icon_name,record?.icon]){const k=validTreatmentIconKeyR03(value);if(k)return k;}
  return null;
}
export function normalizeTreatmentColorR03(value:unknown):string|null {
  const color=typeof value==='string'?value.trim():'';
  if(/^#[a-f0-9]{3}$/i.test(color))return ('#'+color.slice(1).split('').map(c=>c+c).join('')).toUpperCase();
  return /^#[a-f0-9]{6}$/i.test(color)?color.toUpperCase():null;
}
export function treatmentColorR03(value:unknown):string {
  return normalizeTreatmentColorR03(value)??'#8B5CF6';
}
export function ownedTreatmentR03(record:TreatmentIdentityRecordR03|null|undefined,scope:TreatmentScopeR03|null):boolean {
  return !!scope&&!!scope.userId&&!!scope.personId&&typeof record?.id==='string'&&!!record.id&&record.user_id===scope.userId&&record.person_id===scope.personId;
}
export function resolveTreatmentKeyR03(record:TreatmentIdentityRecordR03|null|undefined):TreatmentVisualChoiceR03 {
  return explicitTreatmentIconR03(record)??'unassigned';
}
export function validTreatmentChoiceR03(value:unknown):TreatmentVisualChoiceR03|null {
  return value==='unassigned'?'unassigned':validTreatmentIconKeyR03(value);
}
/** R04 requires the separately certified dual-projection server before release. */
export function expandedTreatmentChoiceR04(value:unknown):TreatmentExpandedIconKeyR04|null {
  return typeof value==='string'&&(TREATMENT_EXPANDED_READ_KEYS_UX360 as readonly string[]).includes(value)?value as TreatmentExpandedIconKeyR04:null;
}
export function canWriteTreatmentChoiceR03(value:unknown):boolean {
  return typeof value==='string'&&validTreatmentChoiceR03(value)===value;
}
export function legacyTreatmentChoiceR04(value:unknown):boolean {
  return value==='unassigned'||(typeof value==='string'&&(TREATMENT_ICON_KEYS_R03 as readonly string[]).includes(value));
}
/** Confirmed identity, independent of local pending intent and legacy aliases. */
export function confirmedVisualChoiceR04(row:TreatmentIdentityRecordR03):TreatmentVisualChoiceR03|null {
  if(row.visual_icon_expanded!=null)return row.visual_icon==='unassigned'?expandedTreatmentChoiceR04(row.visual_icon_expanded):null;
  const choice=validTreatmentChoiceR03(row.visual_icon);
  return choice===row.visual_icon&&legacyTreatmentChoiceR04(choice)?choice:null;
}
/** V2 responses must include the explicit expanded column, including null on reset. */
export function validVisualWireR04(row:TreatmentIdentityRecordR03):boolean {
  return Object.hasOwn(row,'visual_icon_expanded')&&row.visual_icon_expanded!==undefined&&
    Number.isInteger(row.visual_icon_revision)&&Object.hasOwn(row,'visual_icon_operation_id')&&Object.hasOwn(row,'visual_icon_updated_at')&&
    (row.visual_icon===null||legacyTreatmentChoiceR04(row.visual_icon))&&visualRevisionR03(row)!==null;
}
export type VisualIntentR03={base:number;choice:TreatmentVisualChoiceR03;operation:string;state:'pending'|'conflict'};
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const visualFields=['visual_icon','visual_icon_revision','visual_icon_operation_id','visual_icon_updated_at','visual_icon_expanded'] as const;
export function readVisualIntentR03(v:unknown):VisualIntentR03|null {
  if(!v||typeof v!=='object')return null;
  const x=v as Partial<VisualIntentR03>;
  return typeof x.base==='number'&&Number.isInteger(x.base)&&x.base>=0&&x.base<2147483647&&!!validTreatmentChoiceR03(x.choice)&&validTreatmentChoiceR03(x.choice)===x.choice&&typeof x.operation==='string'&&UUID.test(x.operation)&&(x.state==='pending'||x.state==='conflict')?x as VisualIntentR03:null;
}
export function visualRevisionR03(row:TreatmentIdentityRecordR03|null|undefined):number|null {
  if(!row)return null;
  if(row.visual_icon_expanded!=null&&(!expandedTreatmentChoiceR04(row.visual_icon_expanded)||row.visual_icon!=='unassigned'||!Number.isInteger(row.visual_icon_revision)||(row.visual_icon_revision as number)<=0))return null;
  // Pre-CAS metadata is an explicit local preference, never a server revision.
  if(row.visual_icon_revision==null)return row.visual_icon_operation_id==null?0:null;
  const n=row.visual_icon_revision;
  if(n===0)return row.visual_icon==null&&row.visual_icon_operation_id==null&&row.visual_icon_updated_at==null?0:null;
  return typeof n==='number'&&Number.isInteger(n)&&n>0&&n<=2147483647&&!!validTreatmentChoiceR03(row.visual_icon)&&validTreatmentChoiceR03(row.visual_icon)===row.visual_icon&&typeof row.visual_icon_operation_id==='string'&&UUID.test(row.visual_icon_operation_id)&&typeof row.visual_icon_updated_at==='string'&&Number.isFinite(Date.parse(row.visual_icon_updated_at))?n:null;
}
export function makeVisualIntentR03(row:TreatmentIdentityRecordR03,value:unknown,expected:number,operation:string):VisualIntentR03 {
  const revision=visualRevisionR03(row),choice=validTreatmentChoiceR03(value),prior=readVisualIntentR03(row.visual_identity_pending);
  if(revision===null||revision!==expected||revision>=2147483647||!choice||!canWriteTreatmentChoiceR03(choice)||!UUID.test(operation)||operation===row.visual_icon_operation_id||prior?.state==='pending')throw new Error('Identidade visual alterada ou aguardando sincronização; reabra o tratamento.');
  return {base:revision,choice,operation,state:'pending'};
}
export function sameVisualScopeR03(a:TreatmentIdentityRecordR03,b:TreatmentIdentityRecordR03):boolean {
  return typeof a.id==='string'&&!!a.id&&a.id===b.id&&typeof a.user_id==='string'&&!!a.user_id&&a.user_id===b.user_id&&typeof a.person_id==='string'&&!!a.person_id&&a.person_id===b.person_id;
}
export function visualAcknowledgedR03(intent:VisualIntentR03,row:TreatmentIdentityRecordR03):boolean {
  return visualRevisionR03(row)===intent.base+1&&confirmedVisualChoiceR04(row)===intent.choice&&row.visual_icon_operation_id===intent.operation&&
    (intent.choice!=='unassigned'||row.visual_icon_expanded===null);
}
/** Remote visual revision is independent from clinical timestamps and local pending intent. */
export function preserveTreatmentVisualR03<T extends Record<string,unknown>>(remote:T,local?:Record<string,unknown>):T {
  const next={...remote} as Record<string,unknown>;
  delete next.visual_identity_pending;delete next.visual_legacy_choice;
  const r=visualRevisionR03(remote);
  if(!local||!sameVisualScopeR03(remote,local)){
    if(r===null)throw new Error('Revisão visual remota inválida.');
    return next as T;
  }
  const l=visualRevisionR03(local);
  if(l===null||r===null)throw new Error('Revisão visual inválida; preservação local necessária.');
  if(r===l&&r>0&&(remote.visual_icon!==local.visual_icon||remote.visual_icon_operation_id!==local.visual_icon_operation_id||
    (remote.visual_icon_expanded!==undefined&&local.visual_icon_expanded!==undefined&&remote.visual_icon_expanded!==local.visual_icon_expanded)))throw new Error('Revisões visuais incompatíveis.');
  if(l>r||l===r&&l>0){for(const field of visualFields){if(Object.hasOwn(local,field))next[field]=local[field];else delete next[field];}}
  // A legacy projection may omit the new column; at the SAME revision enrich
  // from an explicit projection, but never carry an expanded key to a new revision.
  if(r===l&&r>0&&remote.visual_icon_expanded!==undefined)next.visual_icon_expanded=remote.visual_icon_expanded;
  if(r===0&&l===0){const legacy=validTreatmentChoiceR03(local.visual_legacy_choice??local.visual_icon);if(legacy)next.visual_legacy_choice=legacy;}
  if(readVisualIntentR03(local.visual_identity_pending))next.visual_identity_pending=local.visual_identity_pending;
  for(const field of ['icone','icon_name','icon'] as const){if(next[field]==null&&validTreatmentIconKeyR03(local[field]))next[field]=local[field];}
  return next as T;
}
/** Merge only the visual projection into a locally newer or unsynced clinical row. */
export function mergeVisualProjectionR03<T extends Record<string,unknown>>(remote:Record<string,unknown>,local:T):T {
  if(!sameVisualScopeR03(remote,local))return local;
  const merged=preserveTreatmentVisualR03(remote,local),next={...local} as Record<string,unknown>;
  for(const field of [...visualFields,'visual_identity_pending','visual_legacy_choice','icone','icon_name','icon']){if(Object.hasOwn(merged,field))next[field]=merged[field];else delete next[field];}
  return next as T;
}
export function resolveOwnedTreatmentR03(entity:TreatmentIdentityRecordR03|null|undefined,records:readonly TreatmentIdentityRecordR03[],scope:TreatmentScopeR03|null):TreatmentIdentityRecordR03|null {
  if(!scope||typeof entity?.id!=='string'||!entity.id)return null;
  if((entity.user_id!=null&&entity.user_id!==scope.userId)||(entity.person_id!=null&&entity.person_id!==scope.personId))return null;
  const matches=records.filter(r=>r.id===entity.id&&ownedTreatmentR03(r,scope));
  return matches.length===1?matches[0]:null;
}
