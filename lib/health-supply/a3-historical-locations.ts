import type { Farmacia, LocalSaude } from "@/lib/types";

/** The snapshot is of what was recorded at the event time, not a live directory join. */
export type A3LocationSnapshot = {
  pharmacyId: string | null;
  pharmacyName: string | null;
  pharmacyAddress: string | null;
  placeId: string | null;
  placeName: string | null;
  placeAddress: string | null;
  recordedAt: string;
  source: "event" | "explicit_correction" | "planned_assignment";
};
export type A3LocationChange = {
  before: A3LocationSnapshot | null;
  after: A3LocationSnapshot | null;
  changedAt: string;
  reason: "reassignment" | "historical_correction";
};

/** No selected place means no assertion. A foreign owner's ID must reject, not fallback. */
export function captureHistoricalLocationA3(params: {
  userId:string; pharmacyId?:string|null;placeId?:string|null;
  pharmacy?:Farmacia|null;place?:LocalSaude|null;now:string;
  source?:A3LocationSnapshot["source"];
}):A3LocationSnapshot|null {
  const {userId,pharmacyId,placeId,pharmacy,place,now,source="event"}=params;
  if (!userId || !Number.isFinite(Date.parse(now))) throw new Error("Identidade ou instante de captura inválido.");
  const fid=pharmacyId?.trim()||null, lid=placeId?.trim()||null;
  if (!fid && !lid) return null;
  if (fid && (!pharmacy?.id || pharmacy.id!==fid || pharmacy.user_id!==userId)) throw new Error("Farmácia não pertence ao usuário ou não foi localizada.");
  if (lid && (!place?.id || place.id!==lid || place.user_id!==userId)) throw new Error("Local de saúde não pertence ao usuário ou não foi localizado.");
  return {
    pharmacyId:fid, pharmacyName:pharmacy?.nome?.trim()||null, pharmacyAddress:pharmacy?.endereco?.trim()||null,
    placeId:lid,placeName:place?.nome?.trim()||null,placeAddress:place?.endereco?.trim()||null,
    recordedAt:now,source,
  };
}

/** Existing event snapshots are immutable. Reassignments append their own audit entry. */
export function recordLocationChangeA3(params:{
  previous:A3LocationSnapshot|null|undefined;next:A3LocationSnapshot|null;
  history?:readonly A3LocationChange[]|null;now:string;reason:A3LocationChange["reason"];
}) {
  const {previous,next,history,now,reason}=params;
  const old=previous||null;
  const changes=Array.isArray(history)?[...history]:[];
  const same = old?.pharmacyId === next?.pharmacyId && old?.placeId === next?.placeId;
  if (same) return {snapshot:old,history:changes,changed:false};
  if (changes.length >= 200) throw new Error("Histórico de locais precisa ser revisado antes de nova alteração.");
  return {snapshot:next,history:[...changes,{before:old,after:next,changedAt:now,reason}],changed:true};
}

export function locationDisplayA3(snapshot:A3LocationSnapshot|null|undefined, currentName:string|null) {
  const recorded = snapshot?.pharmacyName || snapshot?.placeName;
  if(recorded) return {name:recorded, historical:true,address:snapshot?.pharmacyAddress||snapshot?.placeAddress||null};
  return {name:currentName, historical:false,address:null};
}
