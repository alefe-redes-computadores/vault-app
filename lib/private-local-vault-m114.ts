/**
 * M114 A — proteção local opt-in para texto íntimo.
 * Modelo: AES-GCM 256; chave derivada de frase secreta via PBKDF2-SHA256.
 * A frase não é persistida. O escopo conta+pessoa integra o AAD.
 * Limite: protege o conteúdo em repouso; não protege um app já desbloqueado nem XSS.
 */
export type PrivateEnvelopeM114={v:1;kdf:"PBKDF2-SHA256";iterations:310000;salt:string;iv:string;ciphertext:string;createdAt:string};
const encoder=new TextEncoder(),decoder=new TextDecoder();
const source=(bytes:Uint8Array):ArrayBuffer=>bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength) as ArrayBuffer;
const b64=(bytes:Uint8Array)=>{let s="";for(const byte of bytes)s+=String.fromCharCode(byte);return btoa(s);};
const unb64=(value:string)=>{const s=atob(value);return Uint8Array.from(s,c=>c.charCodeAt(0));};
const scope=(namespace:string,user:string,person:string)=>`${namespace}\u0000${user}\u0000${person}`;
function validIdentity(value:string){return Boolean(value.trim()&&value.length<=256);}
async function keyFor(passphrase:string,salt:Uint8Array,iterations:number){
  if(passphrase.length<10||passphrase.length>256)throw Error("A frase de proteção deve ter entre 10 e 256 caracteres.");
  const material=await crypto.subtle.importKey("raw",encoder.encode(passphrase),"PBKDF2",false,["deriveKey"]);
  return crypto.subtle.deriveKey({name:"PBKDF2",hash:"SHA-256",salt:source(salt),iterations},material,{name:"AES-GCM",length:256},false,["encrypt","decrypt"]);
}
export async function sealPrivateJsonM114(namespace:string,user:string,person:string,value:unknown,passphrase:string):Promise<PrivateEnvelopeM114>{
  if(!validIdentity(namespace)||!validIdentity(user)||!validIdentity(person))throw Error("Escopo privado inválido.");
  const salt=crypto.getRandomValues(new Uint8Array(16)),iv=crypto.getRandomValues(new Uint8Array(12));
  const key=await keyFor(passphrase,salt,310000);
  const data=encoder.encode(JSON.stringify(value));
  if(data.byteLength>900000)throw Error("Conteúdo privado excede o limite local.");
  const ciphertext=await crypto.subtle.encrypt({name:"AES-GCM",iv:source(iv),additionalData:source(encoder.encode(scope(namespace,user,person)))},key,source(data));
  return {v:1,kdf:"PBKDF2-SHA256",iterations:310000,salt:b64(salt),iv:b64(iv),ciphertext:b64(new Uint8Array(ciphertext)),createdAt:new Date().toISOString()};
}
export async function openPrivateJsonM114<T>(namespace:string,user:string,person:string,envelope:PrivateEnvelopeM114,passphrase:string):Promise<T>{
  if(!isPrivateEnvelopeM114(envelope)||!validIdentity(namespace)||!validIdentity(user)||!validIdentity(person))throw Error("Arquivo protegido inválido.");
  const key=await keyFor(passphrase,unb64(envelope.salt),envelope.iterations);
  const plain=await crypto.subtle.decrypt({name:"AES-GCM",iv:source(unb64(envelope.iv)),additionalData:source(encoder.encode(scope(namespace,user,person)))},key,source(unb64(envelope.ciphertext)));
  return JSON.parse(decoder.decode(plain)) as T;
}
export function isPrivateEnvelopeM114(value:unknown):value is PrivateEnvelopeM114{
  if(!value||typeof value!=="object"||Array.isArray(value))return false;const x=value as Record<string,unknown>;
  return x.v===1&&x.kdf==="PBKDF2-SHA256"&&x.iterations===310000&&typeof x.salt==="string"&&typeof x.iv==="string"&&typeof x.ciphertext==="string"&&typeof x.createdAt==="string";
}
