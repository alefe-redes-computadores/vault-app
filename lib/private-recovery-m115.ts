/** VAULT M115: explicit export/import of an already-encrypted M114 envelope.
 * Neither a phrase nor plain text is written into the backup. No automatic sync.
 */
import { isPrivateEnvelopeM114, openPrivateJsonM114, type PrivateEnvelopeM114 } from "@/lib/private-local-vault-m114";
export type PrivateRecoveryKindM115="journal"|"safety-plan";
export type PrivateBackupM115={format:"vault-private-backup-m115";version:1;kind:PrivateRecoveryKindM115;envelope:PrivateEnvelopeM114};
const namespace=(kind:PrivateRecoveryKindM115)=>kind==="journal"?"private-journal":"safety-plan";
const scoped=(user:string,person:string)=>Boolean(user?.trim()&&person?.trim()&&user.length<=256&&person.length<=256);
const key=(kind:PrivateRecoveryKindM115,user:string,person:string)=>kind==="journal"
  ?`vault:private-journal:m114:protected:${encodeURIComponent(user)}:${encodeURIComponent(person)}`
  :`vault:safety-plan:m114:protected:${encodeURIComponent(user)}:${encodeURIComponent(person)}`;
const plaintextKey=(kind:PrivateRecoveryKindM115,user:string,person:string)=>kind==="journal"
  ?`vault:private-journal:m113:v1:${encodeURIComponent(user)}:${encodeURIComponent(person)}`
  :`vault:safety-plan:v2:${encodeURIComponent(user)}:${encodeURIComponent(person)}`;
function requireScope(user:string,person:string){if(!scoped(user,person)||typeof window==="undefined")throw Error("Conta e pessoa não identificadas neste dispositivo.");}
function parseBackup(input:unknown,kind:PrivateRecoveryKindM115):PrivateBackupM115{
  if(!input||typeof input!=="object"||Array.isArray(input))throw Error("Formato de backup inválido.");
  const value=input as Record<string,unknown>;
  if(value.format!=="vault-private-backup-m115"||value.version!==1||value.kind!==kind||!isPrivateEnvelopeM114(value.envelope))throw Error("O arquivo não corresponde ao cofre selecionado.");
  return value as PrivateBackupM115;
}
function validPlain(kind:PrivateRecoveryKindM115,value:unknown):boolean{
  if(kind==="journal")return Array.isArray(value)&&value.length<=80&&value.every(row=>row&&typeof row==="object"&&
    typeof row.id==="string"&&/^[a-zA-Z0-9:_-]{1,128}$/.test(row.id)&&
    typeof row.createdAt==="string"&&Number.isFinite(Date.parse(row.createdAt))&&
    typeof row.text==="string"&&row.text.trim().length>0&&row.text.length<=6000)&&
    new Set(value.map(row=>row.id)).size===value.length;
  if(!value||typeof value!=="object"||Array.isArray(value))return false;
  const plan=value as Record<string,unknown>;
  const fields=["warningSigns","copingSteps","reasonsToStay","trustedPeople","professionalContacts","saferEnvironment"];
  return fields.every(field=>typeof plan[field]==="string"&&String(plan[field]).length<50000)&&
    (plan.updatedAt===undefined||typeof plan.updatedAt==="string")&&
    (plan.trustedContacts===undefined||(Array.isArray(plan.trustedContacts)&&plan.trustedContacts.length<=12&&
      plan.trustedContacts.every(c=>c&&typeof c==="object"&&typeof c.id==="string"&&typeof c.name==="string"&&typeof c.phone==="string")));
}
export function exportEncryptedM115(kind:PrivateRecoveryKindM115,user:string,person:string):string{
  requireScope(user,person);
  const raw=localStorage.getItem(key(kind,user,person));if(!raw||raw.length>1100000)throw Error("Nenhum cofre protegido exportável neste perfil.");
  let envelope:unknown;try{envelope=JSON.parse(raw);}catch{throw Error("Envelope cifrado inválido.");}
  if(!isPrivateEnvelopeM114(envelope))throw Error("Envelope cifrado inválido.");
  return JSON.stringify({format:"vault-private-backup-m115",version:1,kind,envelope},null,2);
}
/** Dry-run inspection: only decrypts in memory; never writes or replaces local data. */
export type PrivateRecoveryInspectionM123 = Readonly<{
  kind:PrivateRecoveryKindM115;
  validated:true;
  count:number;
  details:string;
  requiresEmptyDestination:true;
}>;
export async function inspectEncryptedM123(kind:PrivateRecoveryKindM115,user:string,person:string,raw:string,passphrase:string):Promise<PrivateRecoveryInspectionM123>{
  requireScope(user,person);
  if(raw.length>1500000||raw.length<40)throw Error("Arquivo de recuperação vazio ou acima do limite de 1,5 MB.");
  let parsed:unknown;try{parsed=JSON.parse(raw);}catch{throw Error("Arquivo JSON inválido.");}
  const backup=parseBackup(parsed,kind);
  const value=await openPrivateJsonM114<unknown>(namespace(kind),user,person,backup.envelope,passphrase);
  if(!validPlain(kind,value))throw Error("Conteúdo recuperado não corresponde ao formato de dados esperado.");
  if(kind==="journal")return {kind,validated:true,count:(value as unknown[]).length,
    details:"Entradas do diário cifrado validadas; nenhum texto foi exibido.",requiresEmptyDestination:true};
  const plan=value as Record<string,unknown>;
  const fields=["warningSigns","copingSteps","reasonsToStay","trustedPeople","professionalContacts","saferEnvironment"];
  return {kind,validated:true,count:fields.filter(field=>String(plan[field]||"").trim().length>0).length,
    details:"Campos preenchidos do plano cifrado validados; nenhum conteúdo foi exibido.",requiresEmptyDestination:true};
}

/** Fail closed: never overwrite an existing encrypted or plaintext local dataset. */
export async function importEncryptedM115(kind:PrivateRecoveryKindM115,user:string,person:string,raw:string,passphrase:string):Promise<void>{
  requireScope(user,person);
  if(raw.length>1500000||raw.length<40)throw Error("Arquivo de recuperação vazio ou acima do limite de 1,5 MB.");
  if(localStorage.getItem(key(kind,user,person))!==null||localStorage.getItem(plaintextKey(kind,user,person))!==null)throw Error("Já existem dados neste cofre. A importação não pode sobrescrevê-los.");
  let parsed:unknown;try{parsed=JSON.parse(raw);}catch{throw Error("Arquivo JSON inválido.");}
  const backup=parseBackup(parsed,kind),seal=JSON.stringify(backup.envelope);
  const value=await openPrivateJsonM114<unknown>(namespace(kind),user,person,backup.envelope,passphrase);
  if(!validPlain(kind,value))throw Error("Conteúdo recuperado não corresponde ao formato de dados esperado.");
  const destination=key(kind,user,person),temporary=`${destination}:m115-importing`;
  localStorage.setItem(temporary,seal);
  try{
    const test=JSON.parse(localStorage.getItem(temporary)??"");
    const verified=await openPrivateJsonM114<unknown>(namespace(kind),user,person,test,passphrase);
    if(!validPlain(kind,verified)||JSON.stringify(verified)!==JSON.stringify(value))throw Error("Falha na verificação da cópia protegida.");
    if(localStorage.getItem(destination)!==null||localStorage.getItem(plaintextKey(kind,user,person))!==null)throw Error("Dados locais surgiram durante a importação.");
    localStorage.setItem(destination,seal);
  }finally{localStorage.removeItem(temporary);}
}
