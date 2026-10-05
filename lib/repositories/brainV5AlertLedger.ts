import { db,safeAddSettings,safeUpdateSettings } from "@/lib/db";
import { enfileirarOperacao } from "@/lib/sync/enfileirarOperacao";
import type { AppSettings } from "@/lib/types";
import type { BrainV5Alert,BrainV5Feedback,BrainV5State } from "@/lib/health-intelligence/brain-v5";
type S=AppSettings&{brain_v5_alert_ledger?:BrainV5Alert[]};
const get=async(userId:string)=>(await db.settings.where("user_id").equals(userId).first() as S|undefined)??null;
async function save(userId:string,ledger:BrainV5Alert[]){
  const old=await get(userId),now=new Date().toISOString();
  if(old){const next:S={...old,brain_v5_alert_ledger:ledger,updated_at:now,synced:false};await safeUpdateSettings(old.id,next);await enfileirarOperacao("settings","update",next);return;}
  const next:S={id:crypto.randomUUID(),user_id:userId,brain_v5_alert_ledger:ledger,created_at:now,updated_at:now,synced:false};
  await safeAddSettings(next);await enfileirarOperacao("settings","add",next);
}
export const brainV5AlertLedgerRepository={
  async getAll(userId:string){const s=await get(userId);return Array.isArray(s?.brain_v5_alert_ledger)?s!.brain_v5_alert_ledger!:[];},
  replace:save,
  async mutate(userId:string,personId:string,key:string,patch:Partial<Pick<BrainV5Alert,"state"|"feedback"|"last_seen_at"|"resolved_at">>){
    const all=await this.getAll(userId),now=new Date().toISOString();
    const next=all.map(x=>x.person_id===personId&&x.key===key?{...x,...patch,last_seen_at:patch.last_seen_at??x.last_seen_at??now}:x);
    await save(userId,next);return next;
  },
  markSeen(userId:string,p:string,k:string){return this.mutate(userId,p,k,{last_seen_at:new Date().toISOString()});},
  feedback(userId:string,p:string,k:string,f:BrainV5Feedback){const state:BrainV5State=f==="review_later"?"monitoring":"acknowledged";return this.mutate(userId,p,k,{feedback:f,state});},
  state(userId:string,p:string,k:string,state:BrainV5State){return this.mutate(userId,p,k,{state,resolved_at:state==="resolved"?new Date().toISOString():undefined});}
};
