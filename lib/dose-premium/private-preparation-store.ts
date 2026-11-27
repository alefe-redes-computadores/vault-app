import Dexie,{type Table} from 'dexie';
import type {PreparationScope,PreparationStore,SavedPreparation} from './auto-preparation';
/** Dedicated, origin-private DB, never part of clinical sync/export. AES-GCM
 * with a nonextractable key held by IndexedDB; Android app-private WebView.
 * Browser durability is checked by the adapter before capture. No deletion. */
type Sealed=PreparationScope & {format:'macro02-auto-private-v1';key:CryptoKey;iv:ArrayBuffer;cipher:ArrayBuffer};
class PrivatePreparationDB extends Dexie{
 copies!:Table<Sealed,string>;
 constructor(){super('vault-macro02-private-preparation-v1');this.version(1).stores({copies:'account_id'});}
}
const aad=(v:PreparationScope)=>new TextEncoder().encode(JSON.stringify([v.account_id,v.operation_id,v.sha256,'macro02-auto-private-v1']));
const fail=():never=>{throw Error('M02_RECOVERY_AUTO_STORAGE_SCOPE');};
export function createPrivatePreparationStore():PreparationStore & {close():void}{
 const db=new PrivatePreparationDB();
 return {
  async read(uid){const r=await db.copies.get(uid);if(!r)return null;if(r.format!=='macro02-auto-private-v1'||r.account_id!==uid)return fail();
   const bytes=new TextDecoder('utf-8',{fatal:true}).decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:r.iv,additionalData:aad(r)},r.key,r.cipher));
   return {account_id:r.account_id,operation_id:r.operation_id,sha256:r.sha256,epoch:r.epoch,completed:r.completed,bytes};},
  async add(v){if(v.epoch!==null||v.completed)return fail();const key=await crypto.subtle.generateKey({name:'AES-GCM',length:256},false,['encrypt','decrypt']);const iv=crypto.getRandomValues(new Uint8Array(12)).buffer;
   const cipher=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:aad(v)},key,new TextEncoder().encode(v.bytes));
   await db.copies.add({format:'macro02-auto-private-v1',account_id:v.account_id,operation_id:v.operation_id,sha256:v.sha256,epoch:null,completed:false,key,iv,cipher});},
  async bind(uid,operation,sha256,epoch){await db.transaction('rw',db.copies,async()=>{const r=await db.copies.get(uid);if(!r||r.operation_id!==operation||r.sha256!==sha256||r.epoch!==null&&r.epoch!==epoch)return fail();if(r.epoch===null)await db.copies.put({...r,epoch});});},
  async complete(uid,operation,sha256,epoch){await db.transaction('rw',db.copies,async()=>{const r=await db.copies.get(uid);if(!r||r.operation_id!==operation||r.sha256!==sha256||r.epoch!==epoch)return fail();if(!r.completed)await db.copies.put({...r,completed:true});});},
  close(){db.close();}
 };
}
