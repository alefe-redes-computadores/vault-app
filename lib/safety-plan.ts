/** Plano pessoal voluntário. Armazenamento local não é criptografado: não compartilhar o aparelho desbloqueado. */
export type TrustedContactChannel = "call" | "sms" | "none";
export interface TrustedContact {
  id: string;
  name: string;
  relationship: string;
  phone: string;
  preferredChannel: TrustedContactChannel;
}
export interface SafetyPlan {
  warningSigns: string;
  copingSteps: string;
  reasonsToStay: string;
  trustedPeople: string;
  professionalContacts: string;
  saferEnvironment: string;
  trustedContacts: TrustedContact[];
  updatedAt: string;
}
export const EMPTY_SAFETY_PLAN: SafetyPlan = {
  warningSigns: "", copingSteps: "", reasonsToStay: "", trustedPeople: "",
  professionalContacts: "", saferEnvironment: "", trustedContacts: [], updatedAt: "",
};
const FIELDS = ["warningSigns", "copingSteps", "reasonsToStay", "trustedPeople", "professionalContacts", "saferEnvironment"] as const;
// Apenas para migração CONSCIENTE; nunca carregar automaticamente a chave legada sem escopo de conta.
function storageKey(personId: string): string {
  return `vault:safety-plan:v1:${personId}`;
}
const validScope = (personId?: string | null, userId?: string | null) => Boolean(
  typeof personId === "string" && personId.trim() && personId.length <= 256 &&
  typeof userId === "string" && userId.trim() && userId.length <= 256
);
function ownerKey(personId: string, userId: string): string {
  return `vault:safety-plan:v2:${encodeURIComponent(userId)}:${encodeURIComponent(personId)}`;
}
function parsePlan(value: unknown): SafetyPlan | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const entry = value as Record<string, unknown>;
  if (FIELDS.some(field => entry[field] !== undefined && typeof entry[field] !== "string")) return null;
  if (entry.updatedAt !== undefined && typeof entry.updatedAt !== "string") return null;
  const trustedContacts = Array.isArray(entry.trustedContacts)
    ? entry.trustedContacts.map(normalizeTrustedContact).filter((item): item is TrustedContact => Boolean(item)).slice(0, 12)
    : [];
  return {
    warningSigns: entry.warningSigns as string || "",
    copingSteps: entry.copingSteps as string || "",
    reasonsToStay: entry.reasonsToStay as string || "",
    trustedPeople: entry.trustedPeople as string || "",
    professionalContacts: entry.professionalContacts as string || "",
    saferEnvironment: entry.saferEnvironment as string || "",
    trustedContacts,
    updatedAt: entry.updatedAt as string || "",
  };
}
export function normalizeTrustedContact(value: unknown): TrustedContact | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const row=value as Record<string,unknown>;
  const name=typeof row.name==="string"?row.name.trim().slice(0,80):"";
  const relationship=typeof row.relationship==="string"?row.relationship.trim().slice(0,80):"";
  const phone=typeof row.phone==="string"?row.phone.replace(/[^\d+]/g,"").slice(0,20):"";
  const preferredChannel:TrustedContactChannel=row.preferredChannel==="call"||row.preferredChannel==="sms"?row.preferredChannel:"none";
  if(!name)return null;
  return {id:typeof row.id==="string"&&row.id.trim()?row.id.slice(0,80):`contact-${Date.now()}`,name,relationship,phone,preferredChannel:phone?preferredChannel:"none"};
}
function freshEmpty(): SafetyPlan { return {...EMPTY_SAFETY_PLAN}; }
export function hasScopedSafetyPlan(personId?: string | null, userId?: string | null): boolean {
  if (typeof window === "undefined" || !validScope(personId,userId)) return false;
  try { return localStorage.getItem(ownerKey(personId!,userId!)) !== null; }
  catch { return false; }
}
export function hasLegacySafetyPlan(personId?: string | null): boolean {
  if (typeof window === "undefined" || !personId || personId.length > 256) return false;
  try { return localStorage.getItem(storageKey(personId)) !== null; }
  catch { return false; }
}
/** Nenhum dado v1 é exibido automaticamente: não havia identificação do usuário naquela chave. */
export function readSafetyPlan(personId?: string | null, userId?: string | null): SafetyPlan {
  if (typeof window === "undefined" || !validScope(personId,userId)) return freshEmpty();
  try {
    const raw = localStorage.getItem(ownerKey(personId!,userId!));
    return raw ? parsePlan(JSON.parse(raw)) ?? freshEmpty() : freshEmpty();
  } catch { return freshEmpty(); }
}
export function saveSafetyPlan(personId: string, plan: SafetyPlan, userId?: string | null): SafetyPlan {
  if (typeof window === "undefined" || !validScope(personId,userId)) throw Error("Conta e pessoa devem estar identificadas.");
  const next = parsePlan(plan);
  if (!next) throw Error("Plano inválido para salvar.");
  next.updatedAt = new Date().toISOString();
  localStorage.setItem(ownerKey(personId,userId!),JSON.stringify(next));
  return next;
}

const protectedKey=(personId:string,userId:string)=>`vault:safety-plan:m114:protected:${encodeURIComponent(userId)}:${encodeURIComponent(personId)}`;
export function hasProtectedSafetyPlan(personId?:string|null,userId?:string|null):boolean{
  if(typeof window==="undefined"||!validScope(personId,userId))return false;
  try{return localStorage.getItem(protectedKey(personId!,userId!))!==null;}catch{return false;}
}
export async function protectSafetyPlan(personId:string,userId:string,plan:SafetyPlan,passphrase:string):Promise<void>{
  if(typeof window==="undefined"||!validScope(personId,userId))throw Error("Escopo ausente.");
  const {sealPrivateJsonM114,openPrivateJsonM114}=await import("@/lib/private-local-vault-m114");
  const envelope=await sealPrivateJsonM114("safety-plan",userId,personId,plan,passphrase);
  const finalKey=protectedKey(personId,userId),temporaryKey=`${finalKey}:pending`;
  localStorage.setItem(temporaryKey,JSON.stringify(envelope));
  try{
    const pending=JSON.parse(localStorage.getItem(temporaryKey)??"");
    const verified=await openPrivateJsonM114<SafetyPlan>("safety-plan",userId,personId,pending,passphrase);
    if(!parsePlan(verified))throw Error("Falha ao verificar cópia protegida.");
    localStorage.setItem(finalKey,JSON.stringify(pending));
    localStorage.removeItem(ownerKey(personId,userId));
  }finally{localStorage.removeItem(temporaryKey);}
}
export async function unlockSafetyPlan(personId:string,userId:string,passphrase:string):Promise<SafetyPlan>{
  if(typeof window==="undefined"||!validScope(personId,userId))throw Error("Escopo ausente.");
  const raw=localStorage.getItem(protectedKey(personId,userId));if(!raw)throw Error("Plano protegido não encontrado.");
  const {openPrivateJsonM114}=await import("@/lib/private-local-vault-m114");
  const plan=await openPrivateJsonM114<SafetyPlan>("safety-plan",userId,personId,JSON.parse(raw),passphrase);
  const parsed=parsePlan(plan);if(!parsed)throw Error("Plano protegido inválido.");return parsed;
}
export async function saveProtectedSafetyPlan(personId:string,userId:string,plan:SafetyPlan,passphrase:string):Promise<SafetyPlan>{
  const next=parsePlan({...plan,updatedAt:new Date().toISOString()});if(!next)throw Error("Plano inválido.");
  await protectSafetyPlan(personId,userId,next,passphrase);return next;
}
/** Só deve ser chamada após confirmação explícita do usuário de que o arquivo v1 é seu. */
export function importLegacySafetyPlan(personId: string, userId?: string | null): SafetyPlan | null {
  if (typeof window === "undefined" || !validScope(personId,userId)) return null;
  if (hasScopedSafetyPlan(personId,userId)) return null; // nunca sobrescrever um plano atual
  try {
    const raw = localStorage.getItem(storageKey(personId));
    if (!raw || raw.length > 150000) return null;
    const plan = parsePlan(JSON.parse(raw));
    if (!plan) return null;
    const destination = ownerKey(personId,userId!);
    const encoded = JSON.stringify(plan);
    localStorage.setItem(destination, encoded);
    if (localStorage.getItem(destination) !== encoded) return null;
    // Remove a antiga chave sem conta apenas depois de confirmar a cópia nova.
    try { localStorage.removeItem(storageKey(personId)); } catch { /* cópia v2 foi gravada */ }
    return plan;
  } catch { return null; }
}
