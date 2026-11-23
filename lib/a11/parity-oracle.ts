/** A11: oracle puro, sem leitor/escritor remoto. Detecta divergências; nunca resolve conflito clínico. */
export type A11Fact = {
  id:string;user_id:string;person_id:string;kind:string;
  fingerprint:string;updated_at:string|null;deleted_at:string|null;
  pending?:boolean;
};
export type A11DeviceSet = {scope:{userId:string;personId:string};complete:boolean;facts:readonly A11Fact[]};
export type A11Parity = {coverage:'complete'|'incomplete';left:number;right:number;cloud:number;
  exact:number;pending:number;onlyLeft:number;onlyRight:number;onlyCloud:number;
  mismatch:number;tombstoneConflict:number;needsReview:boolean};
const safeKey=(row:A11Fact)=>`${row.kind}\u0000${row.id}`;
function checked(set:A11DeviceSet){
  const {userId,personId}=set.scope;
  if(!userId||!personId)throw Error('Escopo obrigatório');
  const map=new Map<string,A11Fact>();
  for(const row of set.facts){
    if(!row.id||!row.kind||!row.fingerprint||row.user_id!==userId||row.person_id!==personId)
      throw Error('Fato ausente ou fora do escopo autorizado');
    const key=safeKey(row);if(map.has(key))throw Error('Identificador clínico duplicado no mesmo snapshot');
    map.set(key,row);
  }
  return map;
}
/** Duas instalações e uma foto da nuvem, todas da mesma pessoa e conta. */
export function compareA11Parity(left:A11DeviceSet,right:A11DeviceSet,cloud:A11DeviceSet):A11Parity{
  const scope=left.scope;
  if([right,cloud].some(s=>s.scope.userId!==scope.userId||s.scope.personId!==scope.personId))
    throw Error('Snapshots de pessoas ou contas diferentes');
  const a=checked(left),b=checked(right),c=checked(cloud);
  let exact=0,pending=0,onlyLeft=0,onlyRight=0,onlyCloud=0,mismatch=0,tombstoneConflict=0;
  for(const key of new Set([...a.keys(),...b.keys(),...c.keys()])){
    const rows=[a.get(key),b.get(key),c.get(key)];
    if(rows.some(r=>r?.pending)){pending++;continue;}
    const [x,y,z]=rows;
    if(!x&&!y){onlyCloud++;continue;}
    if(x&&!y){onlyLeft++;continue;}
    if(!x&&y){onlyRight++;continue;}
    if(!z){mismatch++;continue;}
    if(rows.some(r=>Boolean(r?.deleted_at)!==Boolean(z.deleted_at))){tombstoneConflict++;continue;}
    if(x!.fingerprint===y!.fingerprint&&x!.fingerprint===z.fingerprint){exact++;continue;}
    mismatch++;
  }
  const complete=left.complete&&right.complete&&cloud.complete;
  return {coverage:complete?'complete':'incomplete',left:a.size,right:b.size,cloud:c.size,
    exact,pending,onlyLeft,onlyRight,onlyCloud,mismatch,tombstoneConflict,
    needsReview:!complete||pending>0||onlyLeft>0||onlyRight>0||onlyCloud>0||mismatch>0||tombstoneConflict>0};
}
/** Independência dos caches não prova idempotência de writer no servidor. */
export function checkTwoDeviceScheduling(a:readonly string[],b:readonly string[]):{overlap:number;safeToClaimGlobalIdempotency:false}{
  const left=new Set(a),right=new Set(b);
  if(left.size!==a.length||right.size!==b.length)throw Error('Duplicação detectada no próprio aparelho');
  return {overlap:[...left].filter(x=>right.has(x)).length,safeToClaimGlobalIdempotency:false};
}
