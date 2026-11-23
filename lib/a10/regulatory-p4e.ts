/** A10.4 PharmaLens P4-E — source/version/candidate gate, NOT regulatory certification. */
export type A10CatalogVersion={id:string;source_key:string;source_name:string;source_url:string|null;version:string;published_at:string|null;imported_at:string;source_updated_at:string|null;content_hash:string|null;superseded_at:string|null;active:boolean};
export type A10CatalogCandidate={id:string;user_id:string;person_id:string;medication_id:string|null;official_source_version_id:string|null;status:string;source_kind:string;normalized_payload:unknown;event_date:string};
export type A10RegulatoryState='versioned_reference'|'review_needed'|'expired_reference'|'source_incomplete'|'scope_denied';
export interface A10RegulatoryAudit {
 state:A10RegulatoryState;sourceVersionId:string|null;sourceName:string|null;sourceVersion:string|null;
 hasSourceUrl:boolean;hashAvailable:boolean;candidateCount:number;approvedCandidates:number;
 caveats:string[];
}
const https=(s:string|null)=>typeof s==='string'&&/^https:\/\/[^\s/]+/.test(s);
const validDay=(s:string)=>{if(!/^\d{4}-\d{2}-\d{2}$/.test(s))return false;const day=new Date(s+'T12:00:00Z');return Number.isFinite(day.getTime())&&day.toISOString().slice(0,10)===s;};
export function auditRegulatoryP4E(input:{userId:string;personId:string;medicationId:string;versions:readonly A10CatalogVersion[];candidates:readonly A10CatalogCandidate[];today:string}):A10RegulatoryAudit {
 const caveats=['Catálogo versionado não confirma registro sanitário vigente de um produto individual.','OCR/transcrição permanecem candidatos até revisão humana.'];
 const none=(state:A10RegulatoryState):A10RegulatoryAudit=>({state,sourceVersionId:null,sourceName:null,sourceVersion:null,hasSourceUrl:false,hashAvailable:false,candidateCount:0,approvedCandidates:0,caveats});
 const {userId,personId,medicationId,today}=input;
 if(!userId||!personId||!medicationId||!validDay(today))return none('scope_denied');
 const scoped=input.candidates.filter(c=>c.user_id===userId&&c.person_id===personId&&c.medication_id===medicationId&&Boolean(c.id));
 const refs=new Set(scoped.map(c=>c.official_source_version_id).filter((id):id is string=>Boolean(id)));
 const candidates=input.versions.filter(v=>refs.has(v.id)).sort((a,b)=>b.imported_at.localeCompare(a.imported_at));
 const version=candidates[0];
 if(!version)return {...none('review_needed'),candidateCount:scoped.length};
 const expired=Boolean(version.superseded_at)||!version.active;
 const full=Boolean(version.source_key.trim()&&version.source_name.trim()&&version.version.trim()&&https(version.source_url)&&version.content_hash?.trim());
 const approved=scoped.filter(c=>c.status==='approved'&&c.official_source_version_id===version.id).length;
 return {state:expired?'expired_reference':full?'versioned_reference':'source_incomplete',
  sourceVersionId:version.id,sourceName:version.source_name,sourceVersion:version.version,
  hasSourceUrl:https(version.source_url),hashAvailable:Boolean(version.content_hash?.trim()),candidateCount:scoped.length,approvedCandidates:approved,
  caveats:expired?[...caveats,'Versão marcada como substituída ou inativa; revisão necessária.']:caveats};
}
/** For locally cached medication snapshots, never assert a remote catalogue identity. */
export function localPharmaProvenanceA10(snapshot:unknown):{state:'declared_only'|'referenced';detail:string} {
 if(!snapshot||typeof snapshot!=='object'||Array.isArray(snapshot))return {state:'declared_only',detail:'Sem referência regulatória local verificável.'};
 const raw=snapshot as Record<string,unknown>;
 const version=typeof raw.catalog_version==='string'?raw.catalog_version:typeof raw.catalogVersion==='string'?raw.catalogVersion:'';
 const source=typeof raw.source_key==='string'?raw.source_key:typeof raw.sourceKey==='string'?raw.sourceKey:'';
 if(!version||!source)return {state:'declared_only',detail:'Identidade declarada, sem par versão/fonte demonstrável neste registro.'};
 return {state:'referenced',detail:'Existe referência local a fonte/versionamento; confirmar produto, apresentação e vigência na autoridade original.'};
}
