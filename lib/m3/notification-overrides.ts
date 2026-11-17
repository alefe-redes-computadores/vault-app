/** M3 P1 — lembretes locais por categoria de compromisso e por titular.
 * Não cria evento, não confirma execução, não sincroniza com a nuvem.
 * P2 deverá oferecer preferências por ID de evento e sincronização real.
 */
export type CommitmentKindM3 = 'consulta' | 'exame' | 'retirada' | 'compra';
export const COMMITMENT_KINDS_M3: readonly CommitmentKindM3[] = ['consulta','exame','retirada','compra'];
export const COMMITMENT_PRESETS_M3 = [10080,2880,1440,180,60,30,15,0] as const;
export const COMMITMENT_LOCAL_EVENT_M3 = 'vault:m3:commitment-offsets-changed';
const prefix='vault:m3:commitment-offsets:v1:';
const isKind=(value:string):value is CommitmentKindM3 => COMMITMENT_KINDS_M3.includes(value as CommitmentKindM3);
const scopedKey=(userId:string,personId:string):string|null=>
  userId.trim()&&personId.trim() ? `${prefix}${encodeURIComponent(userId)}:${encodeURIComponent(personId)}` : null;
function validOffsets(raw:unknown):number[]|null {
  if (!Array.isArray(raw)||raw.length>12||raw.some(x=>typeof x!=='number'||!Number.isSafeInteger(x)||!COMMITMENT_PRESETS_M3.some(p=>p===x))) return null;
  return [...new Set(raw)].sort((a,b)=>b-a);
}
function stored(userId:string,personId:string):Partial<Record<CommitmentKindM3,number[]>> {
  const key=scopedKey(userId,personId);
  if (!key||typeof window==='undefined') return {};
  try {
    const parsed:unknown=JSON.parse(window.localStorage.getItem(key)||'{}');
    if (!parsed||typeof parsed!=='object'||Array.isArray(parsed)) return {};
    const result:Partial<Record<CommitmentKindM3,number[]>>={};
    for(const [kind,value] of Object.entries(parsed)) {
      if(!isKind(kind))continue;
      const offsets=validOffsets(value);
      if(offsets) result[kind]=offsets;
    }
    return result;
  } catch {return {};}
}
export function getCommitmentOverrideM3(userId:string,personId:string,kind:CommitmentKindM3):number[]|null {
  return stored(userId,personId)[kind]??null;
}
export function getEventOffsetsM3(args:{userId:string;personId:string;kind:CommitmentKindM3;fallback:readonly number[]}):number[] {
  return getCommitmentOverrideM3(args.userId,args.personId,args.kind) ?? [...args.fallback];
}
/** set null = voltar às regras canônicas (sem sobrescrever preferências globais). */
export function setCommitmentOverrideM3(userId:string,personId:string,kind:CommitmentKindM3,offsets:readonly number[]|null):void {
  const key=scopedKey(userId,personId);
  if(!key||typeof window==='undefined')throw new Error('Selecione a pessoa ativa para configurar avisos.');
  const next=stored(userId,personId);
  if(offsets===null)delete next[kind];
  else {
    const safe=validOffsets([...offsets]);
    if(safe===null)throw new Error('Antecedências inválidas.');
    next[kind]=safe;
  }
  window.localStorage.setItem(key,JSON.stringify(next));
  window.dispatchEvent(new CustomEvent(COMMITMENT_LOCAL_EVENT_M3));
  window.dispatchEvent(new CustomEvent('vault:health-reminders-reconcile'));
}
