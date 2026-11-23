/** A11: inventário de compatibilidade. Não acessa nem altera bytes de documentos. */
export type A11StorageRisk = 'public_legacy_clinical'|'public_avatar'|'private_candidate'|'unrecognized';
const PUBLIC_CLINICAL=new Set(['vault-attachments','saude','documents']);
const PRIV=['clinical-private'];
export function classifyVaultStorageUrl(raw:unknown,expectedSupabaseOrigin:string):A11StorageRisk {
  if(typeof raw!=='string'||!raw.trim()||typeof expectedSupabaseOrigin!=='string')return 'unrecognized';
  let uri:URL,origin:URL;
  try{uri=new URL(raw);origin=new URL(expectedSupabaseOrigin);}catch{return 'unrecognized';}
  if(uri.origin!==origin.origin||uri.protocol!=='https:'||uri.username||uri.password||uri.hash)return 'unrecognized';
  const prefix='/storage/v1/object/';
  if(!uri.pathname.startsWith(prefix))return 'unrecognized';
  const rest=uri.pathname.slice(prefix.length);
  const parts=rest.split('/');
  if(parts.length<3||!parts[2]||parts.some(p=>p==='..'||p==='.'||/%2f|%5c/i.test(p)))return 'unrecognized';
  const [visibility,bucket]=parts;
  if(visibility==='public'&&PUBLIC_CLINICAL.has(bucket))return 'public_legacy_clinical';
  if(visibility==='public'&&bucket==='avatars')return 'public_avatar';
  if((visibility==='sign'||visibility==='authenticated')&&PRIV.includes(bucket))return 'private_candidate';
  return 'unrecognized';
}
export function summarizeA11StorageReferences(values:readonly unknown[],origin:string){
  const summary:Record<A11StorageRisk,number>={public_legacy_clinical:0,public_avatar:0,private_candidate:0,unrecognized:0};
  for(const v of values)summary[classifyVaultStorageUrl(v,origin)]++;
  return summary;
}
/** Não confundir URL assinada com prova de autorização; expiração requer renovação. */
export const A11_STORAGE_POLICY = Object.freeze({
  legacyMustStayReadableUntilMigrated:true,publicDownloadDoesNotRequireRlsSelect:true,
  noAutomaticBucketChange:true,privateMigrationRequiresLive2x2:true,
});
