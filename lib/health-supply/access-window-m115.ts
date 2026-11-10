/** M115: device-local administrative information; not medical or SUS policy. */
export type AccessWindowM115={cutoff:string;source:string;documents:string;confirmedAt:string};
const pattern=/^(?:[01]\d|2[0-3]):[0-5]\d$/;
const scope=(user:string,person:string,cycle:string)=>[user,person,cycle].every(v=>Boolean(v?.trim()&&v.length<=256));
export const accessWindowKeyM115=(user:string,person:string,cycle:string)=>`vault:supply:window:m115:v1:${encodeURIComponent(user)}:${encodeURIComponent(person)}:${encodeURIComponent(cycle)}`;
export function parseAccessWindowM115(input:unknown):AccessWindowM115|null{
  if(!input||typeof input!=="object"||Array.isArray(input))return null;
  const row=input as Record<string,unknown>;
  if(typeof row.cutoff!=="string"||!pattern.test(row.cutoff)||typeof row.source!=="string"||row.source.trim().length<3||row.source.length>140||
  typeof row.documents!=="string"||row.documents.length>800||typeof row.confirmedAt!=="string"||!Number.isFinite(Date.parse(row.confirmedAt)))return null;
  return {cutoff:row.cutoff,source:row.source.trim(),documents:row.documents.trim(),confirmedAt:row.confirmedAt};
}
export function readAccessWindowM115(user?:string|null,person?:string|null,cycle?:string|null):AccessWindowM115|null{
  if(typeof window==="undefined"||!user||!person||!cycle||!scope(user,person,cycle))return null;
  try{const raw=localStorage.getItem(accessWindowKeyM115(user,person,cycle));return raw&&raw.length<1400?parseAccessWindowM115(JSON.parse(raw)):null;}catch{return null;}
}
export function saveAccessWindowM115(user:string,person:string,cycle:string,input:Pick<AccessWindowM115,"cutoff"|"source"|"documents">):AccessWindowM115{
  if(typeof window==="undefined"||!scope(user,person,cycle))throw Error("Conta, pessoa ou ciclo inválidos.");
  const clean=parseAccessWindowM115({...input,confirmedAt:new Date().toISOString()});if(!clean)throw Error("Informe um horário, sua fonte e documentos de até 800 caracteres.");
  localStorage.setItem(accessWindowKeyM115(user,person,cycle),JSON.stringify(clean));return clean;
}
export function eraseAccessWindowM115(user:string,person:string,cycle:string):void{
  if(typeof window==="undefined"||!scope(user,person,cycle))throw Error("Escopo inválido.");
  localStorage.removeItem(accessWindowKeyM115(user,person,cycle));
}
