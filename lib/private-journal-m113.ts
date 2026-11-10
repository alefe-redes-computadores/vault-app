/**
 * VAULT M113 · Diário opcional e exclusivamente local, sem backend.
 * O formato legado permanece aberto localmente. A proteção M114 usa envelope
 * cifrado opt-in e só remove a cópia aberta depois de verificá-lo.
 */
import type { M113Timeline } from "@/lib/health-intelligence/pattern-timeline-m113";
export type M113DiaryEntry={id:string;createdAt:string;text:string};
const PREFIX="vault:private-journal:m113:v1:";
export const MAX_JOURNAL_ENTRIES=80;
const validScope=(user?:string|null,person?:string|null)=>Boolean(user?.trim()&&person?.trim()&&user!.length<=256&&person!.length<=256);
export const journalKeyM113=(user:string,person:string)=>PREFIX+encodeURIComponent(user)+":"+encodeURIComponent(person);
const validEntry=(v:unknown):v is M113DiaryEntry=>{
  if(!v||typeof v!=="object"||Array.isArray(v))return false;
  const e=v as Record<string,unknown>;
  return typeof e.id==="string"&&/^[a-zA-Z0-9:_-]{1,128}$/.test(e.id)&&
    typeof e.createdAt==="string"&&Number.isFinite(Date.parse(e.createdAt))&&
    typeof e.text==="string"&&e.text.trim().length>0&&e.text.length<=6000;
};
const fresh=(value:unknown):M113DiaryEntry[]=>Array.isArray(value)?value.filter(validEntry).slice(0,MAX_JOURNAL_ENTRIES).map(e=>({...e})):[];
export function readJournalM113(user?:string|null,person?:string|null):M113DiaryEntry[]{
  if(typeof window==="undefined"||!validScope(user,person))return [];
  try{const raw=localStorage.getItem(journalKeyM113(user!,person!));return raw&&raw.length<=700000?fresh(JSON.parse(raw)):[];}catch{return [];}
}
/** Explicit save only. Passing consent=false cannot persist a draft. */
export function saveJournalM113(user:string,person:string,entries:readonly M113DiaryEntry[],consent:boolean):M113DiaryEntry[]{
  if(typeof window==="undefined"||!validScope(user,person)||consent!==true)throw Error("Confirme o armazenamento local e identifique a pessoa.");
  if(entries.length>MAX_JOURNAL_ENTRIES||entries.some(e=>!validEntry(e)))throw Error("Registros inválidos ou limite excedido.");
  const ids=entries.map(e=>e.id);if(new Set(ids).size!==ids.length)throw Error("Entradas repetidas.");
  const next=entries.map(e=>({...e})).sort((a,b)=>b.createdAt.localeCompare(a.createdAt)||a.id.localeCompare(b.id));
  localStorage.setItem(journalKeyM113(user,person),JSON.stringify(next));
  return next;
}
export function eraseJournalM113(user:string,person:string):void{
  if(typeof window==="undefined"||!validScope(user,person))throw Error("Identificação ausente.");
  localStorage.removeItem(journalKeyM113(user,person));
}
const protectedJournalKey=(user:string,person:string)=>`vault:private-journal:m114:protected:${encodeURIComponent(user)}:${encodeURIComponent(person)}`;
export function hasProtectedJournalM114(user?:string|null,person?:string|null):boolean{
  if(typeof window==="undefined"||!validScope(user,person))return false;try{return localStorage.getItem(protectedJournalKey(user!,person!))!==null;}catch{return false;}
}
export async function protectJournalM114(user:string,person:string,entries:readonly M113DiaryEntry[],passphrase:string):Promise<void>{
  if(typeof window==="undefined"||!validScope(user,person)||entries.some(e=>!validEntry(e)))throw Error("Diário inválido.");
  const {sealPrivateJsonM114,openPrivateJsonM114}=await import("@/lib/private-local-vault-m114");
  const envelope=await sealPrivateJsonM114("private-journal",user,person,entries,passphrase);
  const finalKey=protectedJournalKey(user,person),temporaryKey=`${finalKey}:pending`;
  localStorage.setItem(temporaryKey,JSON.stringify(envelope));
  try{
    const pending=JSON.parse(localStorage.getItem(temporaryKey)??"");
    const verified=fresh(await openPrivateJsonM114<unknown>("private-journal",user,person,pending,passphrase));
    if(verified.length!==entries.length)throw Error("Falha ao verificar cópia protegida.");
    localStorage.setItem(finalKey,JSON.stringify(pending));
    localStorage.removeItem(journalKeyM113(user,person));
  }finally{localStorage.removeItem(temporaryKey);}
}
export async function unlockJournalM114(user:string,person:string,passphrase:string):Promise<M113DiaryEntry[]>{
  if(typeof window==="undefined"||!validScope(user,person))throw Error("Escopo ausente.");
  const raw=localStorage.getItem(protectedJournalKey(user,person));if(!raw)throw Error("Diário protegido não encontrado.");
  const {openPrivateJsonM114}=await import("@/lib/private-local-vault-m114");
  return fresh(await openPrivateJsonM114<unknown>("private-journal",user,person,JSON.parse(raw),passphrase));
}
export async function saveProtectedJournalM114(user:string,person:string,entries:readonly M113DiaryEntry[],passphrase:string):Promise<M113DiaryEntry[]>{
  const next=entries.map(e=>({...e})).sort((a,b)=>b.createdAt.localeCompare(a.createdAt)||a.id.localeCompare(b.id));await protectJournalM114(user,person,next,passphrase);return next;
}
export function eraseProtectedJournalM114(user:string,person:string):void{
  if(typeof window==="undefined"||!validScope(user,person))throw Error("Identificação ausente.");localStorage.removeItem(protectedJournalKey(user,person));
}
/** Explicit selection, no names, no diagnostics, no automatic upload or sharing. */
export function therapySummaryM113(entries:readonly M113DiaryEntry[],selectedIds:readonly string[],timeline?:M113Timeline|null):string{
  const selected=new Set(selectedIds);
  const rows=entries.filter(e=>validEntry(e)&&selected.has(e.id)).sort((a,b)=>a.createdAt.localeCompare(b.createdAt));
  if(!rows.length&&!timeline)return "";
  const result=["VAULT · RESUMO PESSOAL PARA CONVERSA COM PROFISSIONAL", "Texto selecionado pela própria pessoa; não é avaliação médica nem diagnóstico."];
  if(rows.length){result.push("", "RELATOS ESCRITOS (selecionados)");for(const e of rows)result.push(`${e.createdAt.slice(0,10)} — ${e.text.trim()}`);}
  if(timeline){
    result.push("","CRONOLOGIA DE REGISTROS DO VAULT",`Dias documentados na janela: ${timeline.recordedDays}`);
    for(const e of timeline.events.slice().reverse().slice(-25))result.push(`${e.date} · ${e.label} [${e.nature}]`);
    for(const t of timeline.trends)result.push(`Intensidade relatada (${t.label}): ${t.previous}/10 em ${t.previousDays} dia(s) vs ${t.recent}/10 em ${t.recentDays} dia(s) — comparação descritiva.`);
    result.push("A ordem e a proximidade temporal não comprovam causalidade. Dias sem registro não indicam ausência de sintomas ou tomada.");
  }
  result.push("","Gerado localmente e apenas mediante escolha explícita. Revisar antes de compartilhar.");
  return result.join("\n").slice(0,40000);
}
