import { db } from "@/lib/db";
import { supabase } from "@/lib/supabase/client";
import { enfileirarOperacao, solicitarProcessamentoSync } from "@/lib/sync/enfileirarOperacao";
import type { HealthGoal } from "@/lib/health-goals/types";
const requirePerson=(v?:string)=>{const x=v?.trim();if(!x)throw new Error("Pessoa ativa não identificada.");return x};
async function userId(){const {data,error}=await supabase.auth.getUser();if(error||!data.user)throw new Error("Usuário não autenticado.");return data.user.id}
export const healthGoalsRepository={
 async getHydration(personId:string){return db.health_goals.where("[person_id+goal_type]").equals([requirePerson(personId),"hydration_ml"]).first()},
 async setHydration(personId:string,value:number){const pid=requirePerson(personId);const uid=await userId();const target=Math.round(value);if(!Number.isFinite(target)||target<=0||target>20000)throw new Error("Informe uma meta entre 1 e 20.000 ml.");const current=await this.getHydration(pid);const now=new Date().toISOString();const row:HealthGoal={id:current?.id||crypto.randomUUID(),user_id:uid,person_id:pid,goal_type:"hydration_ml",target_value:target,unit:"ml",created_at:current?.created_at||now,updated_at:now,synced:false};if(current&&current.user_id!==uid)throw new Error("Meta não pertence ao usuário autenticado.");await db.transaction("rw",[db.health_goals,db.syncQueue],async()=>{await db.health_goals.put(row);await enfileirarOperacao("health_goals",current?"update":"add",row,{dispatchSync:false})});solicitarProcessamentoSync();return row;}
};
