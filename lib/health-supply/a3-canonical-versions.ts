import type { Renovacao } from "@/lib/types";
import type { A1PrescriptionLink } from "@/lib/clinical-a1/types";
import { isPrescriptionOnly } from "@/lib/health-supply/renewal-event";

/** Read-only A3 views of the A1 canonical prescription ledger. Never writes a second version graph. */
function ownPrescription(r:Renovacao,userId:string,personId:string,medicationId:string):boolean {
  return !!r.id && r.user_id===userId && r.person_id===personId && r.medicamento_id===medicationId && isPrescriptionOnly(r);
}
function ownLink(l:A1PrescriptionLink,userId:string,personId:string,medicationId:string):boolean {
  return !l.deleted_at && l.user_id===userId && l.person_id===personId && l.medicamento_id===medicationId;
}

/** Only receipts without a verified successor are offered as an explicit predecessor. */
export function prescriptionCandidatesA3(rows:readonly Renovacao[],links:readonly A1PrescriptionLink[],userId:string,personId:string,medicationId:string):Renovacao[]{
  if(!userId||!personId||!medicationId)return [];
  const superseded=new Set(links.filter(l=>ownLink(l,userId,personId,medicationId)).map(l=>l.renovacao_anterior_id));
  return rows.filter(r=>ownPrescription(r,userId,personId,medicationId)&&!superseded.has(r.id!))
    .sort((a,b)=>b.data.localeCompare(a.data)||(b.created_at||"").localeCompare(a.created_at||"")||(a.id||"").localeCompare(b.id||""));
}

/** A1 links remain the only authority for renewal/substitution; missing historic links are never invented. */
export function prescriptionHistoryA3(rows:readonly Renovacao[],links:readonly A1PrescriptionLink[],userId:string,personId:string,medicationId:string){
  const own=new Map(rows.filter(r=>ownPrescription(r,userId,personId,medicationId)).map(r=>[r.id!,r]));
  const valid=links.filter(l=>ownLink(l,userId,personId,medicationId)&&own.has(l.renovacao_anterior_id)&&own.has(l.renovacao_atual_id));
  const previousById=new Map(valid.map(l=>[l.renovacao_atual_id,l]));
  const successorIds=new Set(valid.map(l=>l.renovacao_anterior_id));
  function chainDepth(id:string){
    const seen=new Set<string>();let n=1,at=id;
    while(previousById.has(at)){
      if(seen.has(at))return null; // do not display a fictional version for corrupt history
      seen.add(at);at=previousById.get(at)!.renovacao_anterior_id;n++;
      if(n>200)return null;
    }
    return n;
  }
  return [...own.values()].sort((a,b)=>b.data.localeCompare(a.data)||(b.created_at||"").localeCompare(a.created_at||"")).map(r=>({
    id:r.id!,date:r.data,version:(previousById.has(r.id!)||successorIds.has(r.id!))?chainDepth(r.id!):null,
    previousId:previousById.get(r.id!)?.renovacao_anterior_id||null,
    linkKind:previousById.get(r.id!)?.tipo||null,
    superseded:successorIds.has(r.id!),documentId:r.document_id||null,
  }));
}
