/** M3: private, person-scoped clinical binary lifecycle. Legacy Document rows remain untouched.
 * Metadata uses M1's transactional Dexie/outbox; binary uses Storage and native Filesystem.
 * No physical Storage.delete, no public URL, no diagnostic interpretation.
 */
import { db } from '@/lib/db';
import { supabase } from '@/lib/supabase/client';
import { getLocalFirstAuthUser } from '@/lib/supabase/local-auth';
import { enfileirarOperacao, solicitarProcessamentoSync } from '@/lib/sync/enfileirarOperacao';
import type { ClinicalAssetM1, ClinicalAssetLinkM1 } from '@/lib/clinical-exams-m1/types';
import {
  PRIVATE_BUCKET_M3, MAX_CLINICAL_FILE_M3, inspectClinicalFileM3, storagePathM3,
  isAssetOwnedM3, canOpenAssetM3, normalizedFileNameM3, uniqueTargetsM3,
  deduplicateAssetsM3, type TargetM3, type RoleM3,
} from './policy';
import { writeClinicalCacheM3, readClinicalCacheM3, cachedClinicalUriM3, hasNativeClinicalCacheM3 } from './cache';

const uuid=()=>crypto.randomUUID();
const now=()=>new Date().toISOString();
const active=(l:ClinicalAssetLinkM1)=>!l.deleted_at;
const inFlight=new Map<string,Promise<boolean>>();

async function ownerM3(personId:string):Promise<string>{
  const {data,error}=await getLocalFirstAuthUser();const uid=data.user?.id||'';
  if(error||!uid||!personId)throw Error('Entre na conta e selecione uma pessoa para abrir laudos.');
  const person=await db.persons.get(personId);
  if(!person||person.user_id!==uid)throw Error('Pessoa não pertence à conta atual.');
  return uid;
}
async function validateTargetsM3(uid:string,pid:string,targets:readonly TargetM3[]):Promise<void>{
  for(const t of targets){
    const row=t.entity_type==='exam_order'?await db.exam_orders.get(t.entity_id)
      :t.entity_type==='exam_order_item'?await db.exam_order_items.get(t.entity_id)
      :t.entity_type==='exam_session'?await db.exam_sessions.get(t.entity_id)
      :t.entity_type==='rehab_program'?await db.rehab_programs_m5.get(t.entity_id)
      :t.entity_type==='rehab_session'?await db.rehab_sessions_m5.get(t.entity_id)
      :t.entity_type==='hospitalization'?await db.hospitalizations_a5.get(t.entity_id)
      :t.entity_type==='hospitalization_event'?await db.hospitalization_events_a5.get(t.entity_id)
      :t.entity_type==='hospitalization_discharge'?await db.hospitalization_discharge_a5.get(t.entity_id)
      :await db.consultas.get(t.entity_id);
    if(!row||row.user_id!==uid||row.person_id!==pid||('deleted_at' in row&&row.deleted_at))
      throw Error('Um dos vínculos não pertence à pessoa ativa ou foi removido.');
  }
}
async function sha256M3(blob:Blob):Promise<string>{
  if(!globalThis.crypto?.subtle)throw Error('Criptografia SHA-256 indisponível neste aparelho.');
  const sum=await crypto.subtle.digest('SHA-256',await blob.arrayBuffer());
  return Array.from(new Uint8Array(sum)).map(n=>n.toString(16).padStart(2,'0')).join('');
}
async function validateBlobM3(file:File):Promise<string>{
  if(file.size>MAX_CLINICAL_FILE_M3)throw Error('Arquivo acima de 12 MB; reduza antes de anexar.');
  inspectClinicalFileM3(file,new Uint8Array(await file.slice(0,16).arrayBuffer()));
  return sha256M3(file);
}
async function markAssetM3(uid:string,pid:string,id:string,status:ClinicalAssetM1['upload_status'],uploadedAt?:string):Promise<void>{
  await db.transaction('rw',[db.clinical_assets,db.syncQueue],async()=>{
    const old=await db.clinical_assets.get(id);
    if(!old||!isAssetOwnedM3(old,uid,pid))throw Error('Arquivo mudou de titular durante o envio.');
    const updated:ClinicalAssetM1={...old,upload_status:status,uploaded_at:uploadedAt??old.uploaded_at,updated_at:now(),synced:false};
    await db.clinical_assets.put(updated);
    await enfileirarOperacao('clinical_assets','update',updated,{dispatchSync:false});
  });solicitarProcessamentoSync();
}
function duplicateStorageResponseM3(error:{statusCode?:string|number;code?:string;message?:string}):boolean{
  return String(error.statusCode||'')==='409'||error.code==='AssetAlreadyExists'||/already exists|duplicate/i.test(error.message||'');
}
/** Verify content after a lost response. Never overwrite an unknown remote blob. */
async function verifyRemoteM3(asset:ClinicalAssetM1):Promise<boolean>{
  if(!asset.storage_path)return false;
  const response=await supabase.storage.from(PRIVATE_BUCKET_M3).download(asset.storage_path);
  if(response.error||!response.data||response.data.size!==asset.size_bytes)return false;
  return (await sha256M3(response.data))===asset.sha256;
}
async function uploadOnceM3(uid:string,pid:string,id:string,original?:File):Promise<boolean>{
  let asset:ClinicalAssetM1|undefined=await db.clinical_assets.get(id);
  if(!asset||!canOpenAssetM3(asset,uid,pid))throw Error('Arquivo não pertence à pessoa ou caminho remoto divergente.');
  if(asset.upload_status==='synced')return true;
  const blob=original||await readClinicalCacheM3(uid,pid,id,asset.mime_type);
  if(!blob)throw Error('Arquivo binário não está mais neste dispositivo. Selecione o mesmo PDF para retomar.');
  if(blob.size!==asset.size_bytes||(await sha256M3(blob))!==asset.sha256)throw Error('Arquivo local diferente do checksum registrado.');
  const remoteAuth=await supabase.auth.getUser();
  if(remoteAuth.error||remoteAuth.data.user?.id!==uid)throw Error('Sessão remota não validada. Envio ficará pendente.');
  await markAssetM3(uid,pid,id,'uploading');
  asset=await db.clinical_assets.get(id);
  if(!asset||!canOpenAssetM3(asset,uid,pid)||!asset.storage_path)throw Error('Caminho privado de upload indisponível.');
  const result=await supabase.storage.from(PRIVATE_BUCKET_M3).upload(asset.storage_path,blob,{
    contentType:asset.mime_type,upsert:false,cacheControl:'0',
  });
  if(result.error){
    if(!duplicateStorageResponseM3(result.error)||!(await verifyRemoteM3(asset)))
      throw Error('Upload privado não confirmado; o original local permanece preservado.');
  }
  await markAssetM3(uid,pid,id,'synced',now());
  return true;
}
/** Explicit retry is safe even if upload succeeded remotely but the response was lost. */
export async function retryClinicalAssetM3(personId:string,id:string,original?:File):Promise<boolean>{
  const uid=await ownerM3(personId);const key=`${uid}:${personId}:${id}`;
  const previous=inFlight.get(key);if(previous)return previous;
  const operation=(async()=>{
    try{return await uploadOnceM3(uid,personId,id,original);}
    catch(error){
      try{await markAssetM3(uid,personId,id,'failed');}catch{/* preserve original error */}
      throw error;
    }
  })();inFlight.set(key,operation);
  try{return await operation;}finally{inFlight.delete(key);}
}

export type RegisterClinicalAssetInputM3={personId:string;file:File;targets:readonly TargetM3[];
  role:RoleM3;note?:string|null;intentId?:string};
export type ClinicalRegistrationResultM3={assetId:string;links:number;uploaded:boolean;message:string};
/** A single upload + many links; every user/patient/target reference is verified before and inside the transaction. */
export async function registerClinicalAssetM3(input:RegisterClinicalAssetInputM3):Promise<ClinicalRegistrationResultM3>{
  const uid=await ownerM3(input.personId),pid=input.personId;
  const targets=uniqueTargetsM3(input.targets,input.role);
  if(input.note&&input.note.length>1000)throw Error('Observação ultrapassa o limite.');
  const sha=await validateBlobM3(input.file);
  await validateTargetsM3(uid,pid,targets);
  const candidates=await db.clinical_assets.where('person_id').equals(pid).toArray();
  const prior=deduplicateAssetsM3(candidates,uid,pid,sha);
  if(input.intentId&&(!/^[a-f0-9-]{36}$/i.test(input.intentId)))throw Error('Intenção estável de arquivo inválida.');
  const assetId=prior?.id||input.intentId||uuid();
  const storagePath=storagePathM3(uid,pid,assetId,input.file.type);
  // Native cache first, so a failed network request never discards the user's only copy.
  if(hasNativeClinicalCacheM3())await writeClinicalCacheM3(uid,pid,assetId,input.file.type,input.file);
  let linked=0;
  await db.transaction('rw',[db.persons,db.exam_orders,db.exam_order_items,db.exam_sessions,
    db.consultas,db.rehab_programs_m5,db.rehab_sessions_m5,db.hospitalizations_a5,db.hospitalization_events_a5,db.hospitalization_discharge_a5,db.clinical_assets,db.clinical_asset_links,db.syncQueue],async()=>{
    const person=await db.persons.get(pid);if(!person||person.user_id!==uid)throw Error('Pessoa mudou durante gravação.');
    await validateTargetsM3(uid,pid,targets);
    const latest=await db.clinical_assets.get(assetId);
    if(latest){
      if(!isAssetOwnedM3(latest,uid,pid)||latest.sha256!==sha||latest.mime_type!==input.file.type||
         latest.size_bytes!==input.file.size||latest.storage_path!==storagePath)
        throw Error('Arquivo com identidade incompatível. Cadastro interrompido.');
    }else{
      const duplicate=deduplicateAssetsM3(await db.clinical_assets.where('person_id').equals(pid).toArray(),uid,pid,sha);
      if(duplicate)throw Error('Arquivo duplicado em gravação concorrente. Reabra a tela para reutilizar.');
      const created=now();const asset:ClinicalAssetM1={id:assetId,user_id:uid,person_id:pid,
        sha256:sha,filename:normalizedFileNameM3(input.file.name),mime_type:input.file.type,size_bytes:input.file.size,
        storage_bucket:PRIVATE_BUCKET_M3,storage_path:storagePath,upload_status:'local_only',uploaded_at:null,
        created_at:created,updated_at:created,deleted_at:null,synced:false};
      await db.clinical_assets.add(asset);
      await enfileirarOperacao('clinical_assets','add',asset,{dispatchSync:false});
    }
    for(const target of targets){
      const rows=await db.clinical_asset_links.where('asset_id').equals(assetId).toArray();
      if(rows.some(l=>active(l)&&l.user_id===uid&&l.person_id===pid&&l.entity_type===target.entity_type&&
          l.entity_id===target.entity_id&&l.role===input.role))continue;
      const ts=now();const link:ClinicalAssetLinkM1={id:uuid(),user_id:uid,person_id:pid,asset_id:assetId,
        entity_type:target.entity_type,entity_id:target.entity_id,role:input.role,note:input.note?.trim()||null,
        created_at:ts,updated_at:ts,deleted_at:null,synced:false};
      await db.clinical_asset_links.add(link);await enfileirarOperacao('clinical_asset_links','add',link,{dispatchSync:false});linked++;
    }
  });
  solicitarProcessamentoSync();
  let uploaded=false,message='Registro salvo; envio privado pendente.';
  try{uploaded=await retryClinicalAssetM3(pid,assetId,input.file);message='Arquivo privado conferido e associado aos registros selecionados.';}
  catch(error){message=error instanceof Error?error.message:message;}
  return {assetId,links:linked,uploaded,message};
}

/** Removing one link never destroys the shared asset or its bytes. */
export async function unlinkClinicalAssetM3(personId:string,linkId:string):Promise<void>{
 const uid=await ownerM3(personId);
 await db.transaction('rw',[db.clinical_asset_links,db.syncQueue],async()=>{
   const row=await db.clinical_asset_links.get(linkId);
   if(!row||row.user_id!==uid||row.person_id!==personId)throw Error('Vínculo indisponível para esta pessoa.');
   if(row.deleted_at)return;
   const updated:ClinicalAssetLinkM1={...row,deleted_at:now(),updated_at:now(),synced:false};
   await db.clinical_asset_links.put(updated);
   await enfileirarOperacao('clinical_asset_links','update',updated,{dispatchSync:false});
 });solicitarProcessamentoSync();
}
/** Download uses an authenticated Storage request, NOT a public or expiring URL. */
export async function openClinicalAssetBlobM3(personId:string,id:string):Promise<Blob>{
 const uid=await ownerM3(personId);
 const asset:ClinicalAssetM1|undefined=await db.clinical_assets.get(id);
 if(!asset||!canOpenAssetM3(asset,uid,personId))throw Error('Arquivo clínico indisponível neste perfil.');
 const cached=await readClinicalCacheM3(uid,personId,id,asset.mime_type);
 if(cached&&cached.size===asset.size_bytes&&(await sha256M3(cached))===asset.sha256)return cached;
 if(asset.upload_status!=='synced'||!asset.storage_path)throw Error('Arquivo ainda não sincronizado; reabra no dispositivo de origem.');
 const remoteAuth=await supabase.auth.getUser();if(remoteAuth.error||remoteAuth.data.user?.id!==uid)
  throw Error('Não foi possível validar o acesso remoto ao documento.');
 const response=await supabase.storage.from(PRIVATE_BUCKET_M3).download(asset.storage_path);
 if(response.error||!response.data)throw Error('Não foi possível obter o documento privado.');
 if(response.data.size!==asset.size_bytes||(await sha256M3(response.data))!==asset.sha256)
  throw Error('Documento retornado não corresponde ao checksum salvo.');
 if(hasNativeClinicalCacheM3())await writeClinicalCacheM3(uid,personId,id,asset.mime_type,response.data);
 return response.data;
}
/** Explicit external disclosure only after a user taps the share control. */
export async function shareClinicalAssetM3(personId:string,id:string):Promise<void>{
 const uid=await ownerM3(personId);const asset=await db.clinical_assets.get(id);
 if(!asset||!canOpenAssetM3(asset,uid,personId))throw Error('Documento não autorizado.');
 if(!hasNativeClinicalCacheM3())throw Error('Use o botão Abrir/Salvar no navegador.');
 await openClinicalAssetBlobM3(personId,id);
 const uri=await cachedClinicalUriM3(uid,personId,id,asset.mime_type);
 if(!uri)throw Error('Não foi possível preparar o arquivo para compartilhamento.');
 const {Share}=await import('@capacitor/share');
 await Share.share({title:asset.filename,url:uri,dialogTitle:'Compartilhar documento clínico'});
}
