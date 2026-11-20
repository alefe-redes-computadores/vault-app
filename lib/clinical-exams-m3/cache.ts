/** M3 native app-private cache. NOT hardware encrypted. Never cache binary files in Dexie. */
import { Filesystem, Directory } from '@capacitor/filesystem';
import { isVaultNative } from '@/lib/native-runtime';
import { isUuidM3, fileExtensionM3 } from './policy';
const CACHE_ROOT='vault/clinical-m3';
export const hasNativeClinicalCacheM3=():boolean=>isVaultNative();
export function clinicalCachePathM3(uid:string,pid:string,id:string,mime:string):string {
 if(![uid,pid,id].every(isUuidM3))throw Error('Identificador inválido para o cache clínico.');
 return `${CACHE_ROOT}/${uid}/${pid}/${id}.${fileExtensionM3(mime)}`;
}
const base64FromBytes=(buffer:Uint8Array):string=>{
 let str='';for(let i=0;i<buffer.length;i+=8192)str+=String.fromCharCode(...buffer.subarray(i,i+8192));return btoa(str);
};
const bytesFromBase64=(text:string):Uint8Array=>{
 const raw=atob(text);const out=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)out[i]=raw.charCodeAt(i);return out;
};
export async function writeClinicalCacheM3(uid:string,pid:string,id:string,mime:string,blob:Blob):Promise<void>{
 if(!hasNativeClinicalCacheM3())return;
 const path=clinicalCachePathM3(uid,pid,id,mime);
 const data=base64FromBytes(new Uint8Array(await blob.arrayBuffer()));
 await Filesystem.writeFile({path,data,directory:Directory.Data,recursive:true});
}
export async function readClinicalCacheM3(uid:string,pid:string,id:string,mime:string):Promise<Blob|null>{
 if(!hasNativeClinicalCacheM3())return null;
 try{
  const row=await Filesystem.readFile({path:clinicalCachePathM3(uid,pid,id,mime),directory:Directory.Data});
  const data=row.data;
  if(typeof data==='string'){
   const bytes=bytesFromBase64(data);
   // TypeScript 5.8+ requires a BlobPart backed by a concrete ArrayBuffer,
   // not a Uint8Array<ArrayBufferLike> (which may refer to SharedArrayBuffer).
   // Copying also makes the Blob own exactly the decoded file bytes.
   const exact=new ArrayBuffer(bytes.byteLength);
   new Uint8Array(exact).set(bytes);
   return new Blob([exact],{type:mime});
  }
  return data instanceof Blob?data:null;
 }catch{return null;}
}
/** Logout/owner transition is intentionally destructive ONLY for app-private cache bytes. */
export async function clearClinicalCacheM3():Promise<void>{
 if(!hasNativeClinicalCacheM3())return;
 try{await Filesystem.rmdir({path:CACHE_ROOT,directory:Directory.Data,recursive:true});}catch{/* no cache */}
}
export async function cachedClinicalUriM3(uid:string,pid:string,id:string,mime:string):Promise<string|null>{
 if(!hasNativeClinicalCacheM3())return null;
 try{const row=await Filesystem.getUri({path:clinicalCachePathM3(uid,pid,id,mime),directory:Directory.Data});return row.uri;}catch{return null;}
}
