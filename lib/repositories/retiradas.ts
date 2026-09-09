// lib/repositories/retiradas.ts
import { db } from "@/lib/db";
import { supabase } from "@/lib/supabase/client";
import { enfileirarOperacao, solicitarProcessamentoSync } from "@/lib/sync/enfileirarOperacao";
import type { Medicamento, Renovacao, Retirada } from "@/lib/types";

export type RetiradaCreateInput=Omit<Retirada,"id"|"user_id"|"person_id"|"created_at"|"updated_at"|"synced">&{person_id:string};
export type RetiradaUpdateInput=Partial<Omit<Retirada,"id"|"user_id"|"person_id"|"created_at"|"updated_at"|"synced">>;

const now=()=>new Date().toISOString();
const genId=()=>typeof crypto!=="undefined"&&crypto.randomUUID?crypto.randomUUID():Date.now()+"-"+Math.random().toString(36).slice(2);

function req(v:string|undefined,l:string){const x=v?.trim();if(!x)throw new Error(l+" não identificado.");return x}
function date(v:string,l:string){const x=req(v,l);if(!/^\d{4}-\d{2}-\d{2}$/.test(x))throw new Error(l+" inválida.");return x}

async function uid(){
  const {data,error}=await supabase.auth.getUser();
  if(error)throw error;
  if(!data.user)throw new Error("Usuário não autenticado.");
  return data.user.id;
}

async function med(mid:string,pid:string){
  const m=await db.medicamentos.get(mid);
  if(!m||m.person_id!==pid)throw new Error("Medicamento não encontrado para a pessoa ativa.");
  return m;
}

export async function reconcileScheduledRetiradaFromRenovacao(r:Renovacao,m:Medicamento){
  if(!r.id||!r.person_id||!r.user_id)throw new Error("Renovação incompleta para retirada.");

  const ex=await db.retiradas
    .where("renovacao_origem_id")
    .equals(r.id)
    .first();

  const target=r.tipo_aquisicao==="sus"
    ? (r.data_proxima_retirada?.trim()||r.data_retorno_sus?.trim()||"")
    : "";

  const t=now();

  if(!target){
    if(ex?.id&&ex.status==="agendada"){
      await db.retiradas.delete(ex.id);

      await enfileirarOperacao(
        "retiradas",
        "delete",
        {
          id:ex.id,
          user_id:ex.user_id,
          person_id:ex.person_id
        },
        {dispatchSync:false}
      );
    }

    const mm={
      ...m,
      data_retorno_sus:undefined,
      updated_at:t,
      synced:false
    };

    await db.medicamentos.put(mm);

    await enfileirarOperacao(
      "medicamentos",
      "update",
      mm,
      {dispatchSync:false}
    );

    return;
  }

  date(target,"Data da próxima retirada");

  const rr:Retirada={
    id:ex?.id||genId(),
    user_id:r.user_id,
    person_id:r.person_id,
    medicamento_id:r.medicamento_id,
    renovacao_origem_id:r.id,
    renovacao_realizada_id:ex?.renovacao_realizada_id??null,
    medico_id:r.medico_id??m.medico_id??null,
    farmacia_id:r.farmacia_id??m.farmacia_id??null,
    hospital_id:r.hospital_id??m.hospital_id??null,
    local_id:r.local_id??m.local_id??null,
    medicamento_nome:r.medicamento_nome??m.nome??null,
    medicamento_dosagem:r.medicamento_dosagem??m.dosagem??null,
    data:target,
    horario:ex?.horario??null,
    tipo:"sus",
    status:ex?.status==="realizada"?"realizada":"agendada",
    quantidade_prevista:ex?.quantidade_prevista??null,
    quantidade_retirada:ex?.quantidade_retirada??null,
    exige_nova_receita:r.exige_nova_receita??false,
    observacoes:ex?.observacoes??null,
    realizada_em:ex?.realizada_em??null,
    created_at:ex?.created_at||t,
    updated_at:t,
    synced:false
  };

  await db.retiradas.put(rr);

  await enfileirarOperacao(
    "retiradas",
    ex?"update":"add",
    rr,
    {dispatchSync:false}
  );

  const mm={
    ...m,
    data_retorno_sus:target,
    updated_at:t,
    synced:false
  };

  await db.medicamentos.put(mm);

  await enfileirarOperacao(
    "medicamentos",
    "update",
    mm,
    {dispatchSync:false}
  );
}

export async function detachOrDeleteRetiradaFromRenovacao(r:Renovacao){
  if(!r.id)return;

  const ex=await db.retiradas
    .where("renovacao_origem_id")
    .equals(r.id)
    .first();

  if(!ex?.id)return;

  if(ex.status==="agendada"){
    await db.retiradas.delete(ex.id);

    await enfileirarOperacao(
      "retiradas",
      "delete",
      {
        id:ex.id,
        user_id:ex.user_id,
        person_id:ex.person_id
      },
      {dispatchSync:false}
    );

    return;
  }

  const next={
    ...ex,
    renovacao_origem_id:null,
    updated_at:now(),
    synced:false
  };

  await db.retiradas.put(next);

  await enfileirarOperacao(
    "retiradas",
    "update",
    next,
    {dispatchSync:false}
  );
}

export const retiradasRepository={
  async getAll(personId:string){
    const pid=req(personId,"Pessoa");
    return db.retiradas
      .where("person_id")
      .equals(pid)
      .sortBy("data");
  },

  async getById(id:string,personId:string){
    const r=await db.retiradas.get(req(id,"Retirada"));
    return r?.person_id===req(personId,"Pessoa")?r:undefined;
  },

  async getByDate(personId:string,data:string){
    const pid=req(personId,"Pessoa");
    const d=date(data,"Data");
    return db.retiradas
      .where("person_id")
      .equals(pid)
      .filter(r=>r.data===d)
      .toArray();
  },

  async getByMedicamento(personId:string,medicamentoId:string){
    const pid=req(personId,"Pessoa");
    const mid=req(medicamentoId,"Medicamento");

    return db.retiradas
      .where("person_id")
      .equals(pid)
      .filter(r=>r.medicamento_id===mid)
      .toArray();
  },

  async create(data:RetiradaCreateInput){
    const personId=req(data.person_id,"Pessoa");
    const userId=await uid();
    const medicamentoId=req(data.medicamento_id,"Medicamento");
    const medicamento=await med(medicamentoId,personId);

    if(medicamento.user_id!==userId){
      throw new Error("Medicamento não pertence ao usuário autenticado.");
    }

    const t=now();

    const retirada:Retirada={
      ...data,
      id:genId(),
      user_id:userId,
      person_id:personId,
      medicamento_id:medicamentoId,
      medicamento_nome:data.medicamento_nome??medicamento.nome??null,
      medicamento_dosagem:data.medicamento_dosagem??medicamento.dosagem??null,
      data:date(data.data,"Data da retirada"),
      created_at:t,
      updated_at:t,
      synced:false
    };

    await db.transaction(
      "rw",
      [db.retiradas,db.syncQueue],
      async()=>{
        await db.retiradas.add(retirada);

        await enfileirarOperacao(
          "retiradas",
          "add",
          retirada,
          {dispatchSync:false}
        );
      }
    );

    solicitarProcessamentoSync();

    return retirada.id!;
  },

  async update(id:string,personId:string,changes:RetiradaUpdateInput){
    const current=await this.getById(id,personId);

    if(!current){
      throw new Error("Retirada não encontrada para a pessoa ativa.");
    }

    const next:Retirada={
      ...current,
      ...changes,
      id:current.id,
      user_id:current.user_id,
      person_id:current.person_id,
      data:changes.data!==undefined
        ? date(changes.data,"Data da retirada")
        : current.data,
      updated_at:now(),
      synced:false
    };

    await db.transaction(
      "rw",
      [db.retiradas,db.syncQueue],
      async()=>{
        await db.retiradas.put(next);

        await enfileirarOperacao(
          "retiradas",
          "update",
          next,
          {dispatchSync:false}
        );
      }
    );

    solicitarProcessamentoSync();
  },

  async delete(id:string,personId:string){
    const current=await this.getById(id,personId);

    if(!current?.id){
      throw new Error("Retirada não encontrada para a pessoa ativa.");
    }

    await db.transaction(
      "rw",
      [db.retiradas,db.syncQueue],
      async()=>{
        await db.retiradas.delete(current.id!);

        await enfileirarOperacao(
          "retiradas",
          "delete",
          {
            id:current.id,
            user_id:current.user_id,
            person_id:current.person_id
          },
          {dispatchSync:false}
        );
      }
    );

    solicitarProcessamentoSync();
  }
};
