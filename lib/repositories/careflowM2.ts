import { db } from '@/lib/db';
import { getLocalFirstAuthUser } from '@/lib/supabase/local-auth';
import { enfileirarOperacao, solicitarProcessamentoSync } from '@/lib/sync/enfileirarOperacao';
import { requireCareFlowInputM2, type CareFlowEventInputM2, type CareFlowEventM2 } from '@/lib/careflow-m2/domain';

const uuid=()=>crypto.randomUUID();
async function owner(personId:string):Promise<string>{
  const {data,error}=await getLocalFirstAuthUser();
  const uid=data.user?.id;
  if(error||!uid||!personId)throw new Error('Conta/pessoa não identificadas.');
  const person=await db.persons.get(personId);
  if(!person||person.user_id!==uid)throw new Error('Pessoa não pertence à conta autenticada.');
  return uid;
}
/** New immutable event per fact. Never rewrite a prior clinical event or stock. */
export const careflowM2Repository={
  async list(personId:string):Promise<CareFlowEventM2[]>{
    const userId=await owner(personId);
    const rows=await db.careflow_events_m2.where('person_id').equals(personId).toArray();
    return rows.filter(e=>e.user_id===userId).sort((a,b)=>b.created_at.localeCompare(a.created_at));
  },
  async append(personId:string,input:CareFlowEventInputM2){
    const [id]=await this.appendMany(personId,[input]);return id;
  },
  async appendMany(personId:string,inputs:readonly CareFlowEventInputM2[]):Promise<string[]>{
    if(!inputs.length||inputs.length>120)throw new Error('Selecione entre 1 e 120 eventos.');
    const userId=await owner(personId);
    inputs.forEach(requireCareFlowInputM2);
    // Related clinical entities are always checked against the CURRENT person.
    for(const item of inputs){
      if(item.kind==='exam_order'){
        if(item.related_id){
          const c=await db.consultas.get(item.related_id);
          if(!c||c.user_id!==userId||c.person_id!==personId)throw new Error('Consulta vinculada não pertence à pessoa ativa.');
        }
        const doctorId=String(item.payload.doctor_id||'');
        if(doctorId){const doctor=await db.medicos.get(doctorId);
          if(!doctor||doctor.user_id!==userId)throw new Error('Médico não pertence à conta atual.');}
        const locationId=String(item.payload.location_id||'');
        if(locationId){const loc=await db.locais.get(locationId);
          if(!loc||loc.user_id!==userId)throw new Error('Local não pertence à conta atual.');}
      }
      if(item.kind==='monitor_note'||item.kind==='monitor_reading'){
        const record=await db.registros_saude.get(item.related_id||'');
        if(!record||record.user_id!==userId||record.person_id!==personId)throw new Error('Registro de saúde vinculado não pertence à pessoa ativa.');
      }
    }
    const inBatch=new Map(inputs.filter(x=>x.id).map(x=>[x.id!,x.kind] as const));
    for(const item of inputs){
      if(!item.parent_id)continue;
      if(inBatch.has(item.parent_id)){
        if(item.kind==='exam_item'&&inBatch.get(item.parent_id)!=='exam_order')throw new Error('Item exige pedido de exames.');
        continue;
      }
      if(item.kind==='monitor_note'){
        const c=await db.consultas.get(item.parent_id);
        if(!c||c.user_id!==userId||c.person_id!==personId)throw new Error('Consulta do sintoma não pertence à pessoa ativa.');
      }else{
        const parent=await db.careflow_events_m2.get(item.parent_id);
        const expected=item.kind==='exam_item'?'exam_order':item.kind==='monitor_reading'?'monitor_plan':'exam_item';
        if(!parent||parent.user_id!==userId||parent.person_id!==personId||parent.kind!==expected)throw new Error('Evento pai ausente ou de outra pessoa.');
      }
    }
    const now=new Date().toISOString();
    const rows:CareFlowEventM2[]=inputs.map((e,i)=>({
      id:e.id||uuid(),user_id:userId,person_id:personId,kind:e.kind,
      parent_id:e.parent_id||null,related_id:e.related_id||null,payload:e.payload,
      created_at:new Date(Date.parse(now)+i).toISOString(),updated_at:now,synced:false,
    }));
    if(new Set(rows.map(r=>r.id)).size!==rows.length)throw new Error('IDs repetidos no lote.');
    await db.transaction('rw',[db.persons,db.careflow_events_m2,db.syncQueue],async()=>{
      const fresh=await db.persons.get(personId);
      if(!fresh||fresh.user_id!==userId)throw new Error('Pessoa alterada durante a gravação.');
      await db.careflow_events_m2.bulkAdd(rows);
      for(const row of rows)await enfileirarOperacao('careflow_events_m2','add',row,{dispatchSync:false});
    });
    solicitarProcessamentoSync();
    return rows.map(r=>r.id);
  },
};
