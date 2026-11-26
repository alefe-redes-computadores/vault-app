/** Evidence of the medication cadastro at registration, NOT a reconstruction of the product taken.
 * Catalog evidence is copied from the existing canonical persisted snapshot; no lookup or inference. */
export type PharmaceuticalSnapshot = {
  schema:1; source:'cadastro_no_registro'; captured_at:string;
  user_id:string; person_id:string; medicamento_id:string;
  nome:string; dosagem:string|null; formato:string|null; forma_farmaceutica:string|null;
  cores:string[]; catalog_snapshot:Record<string,unknown>|null;
};
type Identity={user_id:string;person_id?:string;medicamento_id:string};
type Medication={id?:string;user_id:string;person_id?:string;nome:string;dosagem?:string;formato?:string;forma_farmaceutica?:string;cores?:string[];catalog_snapshot?:unknown};
const record=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const text=(v:unknown,max:number):v is string=>typeof v==='string'&&v.trim().length>0&&v.length<=max;
const nullable=(v:unknown,max:number)=>v===null||text(v,max);
const instant=(v:unknown):v is string=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})$/.test(v)&&Number.isFinite(Date.parse(v));
const keys=['schema','source','captured_at','user_id','person_id','medicamento_id','nome','dosagem','formato','forma_farmaceutica','cores','catalog_snapshot'];
function catalog(v:unknown):Record<string,unknown>|null{
  if(!record(v)||v.schema!==1||!text(v.lookup_key,500)||!instant(v.resolved_at)||!record(v.reference)||!['exact','pharmaceutical_equivalence'].includes(String(v.match_kind)))return null;
  try{const raw=JSON.stringify(v);return raw.length<=65536?JSON.parse(raw):null;}catch{return null;}
}
export function readPharmaceuticalSnapshot(value:unknown,id:Identity):PharmaceuticalSnapshot|null{
  if(value==null)return null;
  if(!record(value)||Object.keys(value).length!==keys.length||!keys.every(k=>Object.hasOwn(value,k))||value.schema!==1||value.source!=='cadastro_no_registro'||!instant(value.captured_at)||!text(id.user_id,128)||!text(id.person_id,128)||!text(id.medicamento_id,128)||value.user_id!==id.user_id||value.person_id!==id.person_id||value.medicamento_id!==id.medicamento_id||!text(value.nome,500)||!nullable(value.dosagem,500)||!nullable(value.formato,100)||!nullable(value.forma_farmaceutica,100)||!Array.isArray(value.cores)||value.cores.length>8||!value.cores.every(c=>text(c,50))||value.catalog_snapshot!==null&&!catalog(value.catalog_snapshot))throw Error('Snapshot farmacêutico inválido ou fora do escopo.');
  return value as PharmaceuticalSnapshot;
}
export function capturePharmaceuticalSnapshot(m:Medication,id:Identity,at:string):PharmaceuticalSnapshot|null{
  if(m.id!==id.medicamento_id||m.user_id!==id.user_id||m.person_id!==id.person_id)throw Error('Medicamento fora do escopo do snapshot.');
  if(!text(m.nome,500))return null;
  const optional=(v:unknown,n:number)=>text(v,n)?v:null;
  const value={schema:1,source:'cadastro_no_registro',captured_at:at,user_id:id.user_id,person_id:id.person_id,medicamento_id:id.medicamento_id,nome:m.nome,dosagem:optional(m.dosagem,500),formato:optional(m.formato,100),forma_farmaceutica:optional(m.forma_farmaceutica,100),cores:Array.isArray(m.cores)?m.cores.filter(c=>text(c,50)).slice(0,8):[],catalog_snapshot:catalog(m.catalog_snapshot)};
  return readPharmaceuticalSnapshot(value,id);
}
function stable(v:unknown):unknown{if(Array.isArray(v))return v.map(stable);if(record(v))return Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])]));return v;}
export function samePharmaceuticalSnapshot(a:unknown,b:unknown,id:Identity):boolean{
  try{return JSON.stringify(stable(readPharmaceuticalSnapshot(a,id)))===JSON.stringify(stable(readPharmaceuticalSnapshot(b,id)));}catch{return false;}
}
/** Historical consumers may safely fall back to a labeled current cadastro, not a guessed snapshot. */
export function historicalPharmaceuticalIdentity(row:Identity&{farmaco_snapshot?:unknown}){
  try{return readPharmaceuticalSnapshot(row.farmaco_snapshot,row);}catch{return null;}
}
