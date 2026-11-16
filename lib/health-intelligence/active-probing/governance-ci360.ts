/** CI360 P3 — transparência do mesmo ledger de perguntas do Brain.
 * Somente leitura, sem abrir resposta pessoal, adicionar candidato ou alterar TTL/consentimento.
 */
import type { ActiveProbe, ActiveProbePreferences } from "./types";
import { preferenceAllows, withinFrequencyLimit } from "./core";
import { probeDisplayAllowedP6 } from "./quiet-p6";
export type ProbeGovernanceCI360 = {
 state:"ready"|"consent_required"|"unavailable";
 total:number;sevenDayCreated:number;eligible:number;shown:number;answered:number;
 dismissed:number;snoozed:number;scheduled:number;pendingSync:number;
 displayable:number;weeklyAllowance:number;nextWeeklySlotISO:string|null;
 quietHours:boolean;reason:string;
};
export function buildProbeGovernanceCI360(userId:string,personId:string,prefs:ActiveProbePreferences,ledger:readonly ActiveProbe[],nowISO:string):ProbeGovernanceCI360 {
 const now=new Date(nowISO),ok=Number.isFinite(now.getTime());
 const base:ProbeGovernanceCI360={state:"unavailable",total:0,sevenDayCreated:0,eligible:0,shown:0,answered:0,dismissed:0,snoozed:0,scheduled:0,pendingSync:0,
  displayable:0,weeklyAllowance:0,nextWeeklySlotISO:null,quietHours:false,reason:"Contexto indisponivel."};
 if(!userId||!personId||!ok)return base;
 if(!prefs.enabled||prefs.consentVersion<1)return {...base,state:"consent_required",reason:"Perguntas desligadas para esta pessoa."};
 const recentStart=now.getTime()-7*86_400_000;
 const unique=new Set<string>();
 const owned=ledger.filter(p=>p.user_id===userId&&p.person_id===personId&&p.id&&p.idempotency_key).filter(p=>{
  if(unique.has(p.idempotency_key))return false;unique.add(p.idempotency_key);return true;
 });
 const scoped=owned.filter(p=>preferenceAllows(p.trigger_type,prefs));
 // A cota é global por pessoa, inclusive para categorias antes habilitadas.
 // O ledger canônico não reinicia a janela quando as preferências mudam.
 const created=owned.filter(p=>{const t=Date.parse(p.created_at);return Number.isFinite(t)&&t>=recentStart&&t<=now.getTime()&&p.status!=="cancelled";})
  .sort((a,b)=>a.created_at.localeCompare(b.created_at));
 const canAdd=withinFrequencyLimit(owned,userId,personId,nowISO,2);
 const nextSlot=!canAdd&&created[0]?new Date(Date.parse(created[0].created_at)+7*86_400_000+1).toISOString():null;
 const h=now.getHours(),quiet=h>=22||h<8;
 const count=(state:ActiveProbe["status"])=>scoped.filter(p=>p.status===state).length;
 return {state:"ready",total:scoped.length,sevenDayCreated:created.length,eligible:count("eligible"),shown:count("shown"),
  answered:count("answered"),dismissed:count("dismissed"),snoozed:count("snoozed"),scheduled:count("scheduled"),
  pendingSync:scoped.filter(p=>p.sync_state!=="synced").length,
  displayable:scoped.filter(p=>probeDisplayAllowedP6(p,scoped,now)).length,
  weeklyAllowance:canAdd?Math.max(0,2-created.length):0,nextWeeklySlotISO:nextSlot,quietHours:quiet,
  reason:"Ate duas novas perguntas por sete dias. Respostas e lembretes dependem de consentimento e do ledger existente."};
}
