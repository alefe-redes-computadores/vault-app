/** M3 immutable policy: one physical asset, many explicitly approved links. */
import type { ClinicalAssetM1, ClinicalAssetLinkM1 } from '@/lib/clinical-exams-m1/types';
export type TargetM3 = Pick<ClinicalAssetLinkM1,'entity_type'|'entity_id'>;
export type RoleM3 = ClinicalAssetLinkM1['role'];
export const PRIVATE_BUCKET_M3='clinical-private' as const;
export const MAX_CLINICAL_FILE_M3=12*1024*1024;
const MIME_EXT_M3:Record<string,string>={
  'application/pdf':'pdf','image/jpeg':'jpg','image/png':'png','image/webp':'webp'
};
export const isUuidM3=(value:string):boolean=>/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
export function fileExtensionM3(mime:string):string {
  const ext=MIME_EXT_M3[mime];if(!ext)throw Error('Somente PDF, JPEG, PNG e WebP são permitidos.');return ext;
}
export function inspectClinicalFileM3(file:{name:string;type:string;size:number},header:Uint8Array):void {
  if(!file.name?.trim()||file.name.length>255)throw Error('Nome de arquivo inválido.');
  fileExtensionM3(file.type);
  if(!Number.isSafeInteger(file.size)||file.size<8||file.size>MAX_CLINICAL_FILE_M3)
    throw Error('Arquivo inválido ou acima de 12 MB.');
  const at=(...xs:number[])=>xs.every((v,i)=>header[i]===v);
  const pdf=at(0x25,0x50,0x44,0x46,0x2d);
  const jpg=at(0xff,0xd8,0xff);
  const png=at(0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a);
  const webp=String.fromCharCode(...header.slice(0,4))==='RIFF'&&String.fromCharCode(...header.slice(8,12))==='WEBP';
  if(!({ 'application/pdf':pdf,'image/jpeg':jpg,'image/png':png,'image/webp':webp } as Record<string,boolean>)[file.type])
    throw Error('O conteúdo do arquivo não corresponde ao formato declarado.');
}
export function normalizedFileNameM3(value:string):string {
 const v=value.replace(/[\u0000-\u001f\u007f/\\<>:"|?*]/g,'_').trim();
 return v.slice(0,180)||'documento-clinico';
}
export function storagePathM3(uid:string,pid:string,assetId:string,mime:string):string {
 if(![uid,pid,assetId].every(isUuidM3))throw Error('Identidade privada inválida.');
 return `${uid}/${pid}/${assetId}.${fileExtensionM3(mime)}`;
}
export function isAssetOwnedM3(asset:ClinicalAssetM1,uid:string,pid:string):boolean{
 return Boolean(uid&&pid&&asset.user_id===uid&&asset.person_id===pid&&!asset.deleted_at&&asset.storage_bucket===PRIVATE_BUCKET_M3);
}
export function uniqueTargetsM3(input:readonly TargetM3[],role:RoleM3):TargetM3[]{
 if(!input.length||input.length>120)throw Error('Selecione entre 1 e 120 vínculos explícitos.');
 if(!['request','result','protocol','supporting'].includes(role))throw Error('Natureza do arquivo inválida.');
 const keys=new Set<string>();
 const out:TargetM3[]=[];
 for(const row of input){
   if(!['exam_order','exam_order_item','exam_session','consultation'].includes(row.entity_type)||!isUuidM3(row.entity_id))
     throw Error('Vínculo clínico inválido.');
   if(role==='result'&&row.entity_type!=='exam_order_item')throw Error('Laudo por item exige exames selecionados.');
   const key=`${row.entity_type}:${row.entity_id}`;
   if(keys.has(key))throw Error('Itens duplicados na seleção de anexos.');
   keys.add(key);out.push({entity_type:row.entity_type,entity_id:row.entity_id});
 }
 return out;
}
export function canOpenAssetM3(asset:ClinicalAssetM1,uid:string,pid:string):boolean {
 return isAssetOwnedM3(asset,uid,pid)&&Boolean(asset.sha256.match(/^[a-f0-9]{64}$/))&&
   (!asset.storage_path||asset.storage_path===storagePathM3(uid,pid,asset.id,asset.mime_type));
}
export function deduplicateAssetsM3(rows:readonly ClinicalAssetM1[],uid:string,pid:string,sha:string):ClinicalAssetM1|null {
 return rows.find(row=>isAssetOwnedM3(row,uid,pid)&&row.sha256===sha)||null;
}
export type AssetSummaryM3={assets:number;links:number;items:number;pending:number};
export function projectAssetSummaryM3(assets:readonly ClinicalAssetM1[], links:readonly ClinicalAssetLinkM1[],uid:string,pid:string):AssetSummaryM3 {
 const filtered=assets.filter(a=>isAssetOwnedM3(a,uid,pid));const ids=new Set(filtered.map(a=>a.id));
 const linked=links.filter(l=>l.user_id===uid&&l.person_id===pid&&!l.deleted_at&&ids.has(l.asset_id));
 return {assets:filtered.length,links:linked.length,items:new Set(linked.filter(l=>l.entity_type==='exam_order_item').map(l=>l.entity_id)).size,
  pending:filtered.filter(a=>a.upload_status!=='synced').length};
}
