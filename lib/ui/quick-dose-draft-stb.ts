/** STB-01: editing-session policy only. No clinical authority or persistence. */
export type QuickDoseDraftSessionSTB = {
  personId: string;
  preselected: string;
  medicationId: string;
  quantityEdited: boolean;
};
export type QuickDoseDraftTransitionSTB = {
  session: QuickDoseDraftSessionSTB | null;
  reset: 'none' | 'session' | 'medication';
};
export function reconcileQuickDoseDraftSTB(previous: QuickDoseDraftSessionSTB | null, open: boolean, personId: string | null | undefined, preselected?: string): QuickDoseDraftTransitionSTB {
  if (!open) return {session:null,reset:'none'};
  // Hydration can briefly suspend a person. Do not erase a same-person draft.
  if (!personId) return {session:previous,reset:'none'};
  const selected=preselected || '';
  if (previous?.personId===personId && previous.preselected===selected) return {session:previous,reset:'none'};
  return {session:{personId,preselected:selected,medicationId:selected,quantityEdited:false},reset:previous?.personId===personId?'medication':'session'};
}
export function selectQuickDoseMedicationSTB(session: QuickDoseDraftSessionSTB | null, medicationId:string): QuickDoseDraftSessionSTB | null {
  if (!session || session.medicationId===medicationId) return session;
  return {...session,medicationId,quantityEdited:false};
}
export function editQuickDoseQuantitySTB(session:QuickDoseDraftSessionSTB|null):QuickDoseDraftSessionSTB|null {
  return session && !session.quantityEdited ? {...session,quantityEdited:true} : session;
}
export function isQuickDoseContextSTB(session:QuickDoseDraftSessionSTB|null,personId:string|null|undefined,medicationId:string|null|undefined):boolean {
  return Boolean(session && personId && medicationId && session.personId===personId && session.medicationId===medicationId);
}
export function maySuggestQuickDoseQuantitySTB(session:QuickDoseDraftSessionSTB|null,personId:string|null|undefined,medicationId:string|null|undefined):boolean {
  return isQuickDoseContextSTB(session,personId,medicationId) && !session?.quantityEdited;
}
export function isValidQuickDoseDateSTB(date:string):boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const [y,m,d]=date.split('-').map(Number);
  const value=new Date(0); value.setUTCFullYear(y,m-1,d);
  return y>=1 && value.getUTCFullYear()===y && value.getUTCMonth()===m-1 && value.getUTCDate()===d;
}
