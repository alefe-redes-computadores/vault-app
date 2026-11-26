import {validDay,validHour} from './center-view';
/** Same slot identity as dose-slot-authority; this is a write guard, not a projection or writer. */
export type ScheduledSlotScope={user_id:string;person_id:string;medicamento_id:string;data:string;horario:string};
export type SlotRecord=Omit<ScheduledSlotScope,'person_id'>&{id?:string;person_id?:string;dose_kind?:'scheduled'|'planned'|'sos'|'extra'|null;tomado_em?:string|null;ignorado_em?:string|null};
export function resolveWritableSlot<T extends SlotRecord>(rows:readonly T[],target:ScheduledSlotScope):T|undefined{
  if(!target.user_id||!target.person_id||!target.medicamento_id||!validDay(target.data)||!validHour(target.horario))throw Error('Escopo ou horário da dose inválido.');
  const sameSlot=rows.filter(r=>r.person_id===target.person_id&&r.medicamento_id===target.medicamento_id&&r.data===target.data&&r.horario.slice(0,5)===target.horario);
  // Legacy/foreign rows in the same logical identity must not be silently overwritten or shadowed.
  if(sameSlot.some(r=>r.user_id!==target.user_id))throw Error('Há registro de dose sem titularidade correspondente. Revise a sincronização.');
  const candidates=sameSlot.filter(r=>r.dose_kind!=='sos'&&r.dose_kind!=='extra');
  if(candidates.length>1)throw Error('Há registros programados duplicados neste horário. Revise antes de alterar.');
  const row=candidates[0];
  if(row&&(!row.id||row.tomado_em&&row.ignorado_em))throw Error('Registro de dose inconsistente; revisão necessária.');
  return row;
}
