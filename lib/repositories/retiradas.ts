import { withdrawalHistory } from "@/lib/withdrawal-reschedule";
import {loadSupplyWithdrawal} from "@/lib/health-supply/resolve-withdrawal";
import { getLocalFirstAuthUser } from "@/lib/supabase/local-auth";
// lib/repositories/retiradas.ts
import { db } from "@/lib/db";
import { supabase } from "@/lib/supabase/client";
import { enfileirarOperacao, solicitarProcessamentoSync } from "@/lib/sync/enfileirarOperacao";
import type { Medicamento, Renovacao, Retirada } from "@/lib/types";

export type RetiradaCreateInput=Omit<Retirada,"id"|"user_id"|"person_id"|"fornecimento_id"|"fornecimento_ciclo_id"|"created_at"|"updated_at"|"synced">&{person_id:string};
export type RetiradaUpdateInput=Partial<Omit<Retirada,"id"|"user_id"|"person_id"|"renovacao_origem_id"|"renovacao_realizada_id"|"fornecimento_id"|"fornecimento_ciclo_id"|"created_at"|"updated_at"|"synced">>;

const now=()=>new Date().toISOString();
const genId=()=>typeof crypto!=="undefined"&&crypto.randomUUID?crypto.randomUUID():Date.now()+"-"+Math.random().toString(36).slice(2);

function req(v:string|undefined,l:string){const x=v?.trim();if(!x)throw new Error(l+" não identificado.");return x}
function date(v:string,l:string){const x=req(v,l);if(!/^\d{4}-\d{2}-\d{2}$/.test(x))throw new Error(l+" inválida.");return x}

async function uid(){
  const {data,error}=await getLocalFirstAuthUser();
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

  if(ex&&(ex.person_id!==r.person_id||ex.user_id!==r.user_id)){
    throw new Error("Retirada automática não pertence à renovação informada.");
  }

  if (ex && (ex.status !== "agendada" || ex.reagendamentos?.length)) return;

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

  const supply=ex?.fornecimento_ciclo_id?{fornecimento_id:ex.fornecimento_id,fornecimento_ciclo_id:ex.fornecimento_ciclo_id}:await loadSupplyWithdrawal(m.id!,r.person_id,r.user_id,target);
  const rr:Retirada={
    ...supply,
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
    reagendamentos:ex?.reagendamentos || [],
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

  if(ex.person_id!==r.person_id||ex.user_id!==r.user_id){
    throw new Error("Retirada automática não pertence à renovação informada.");
  }

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
  async getAll(userId:string,personId:string){
    const owner=req(userId,"Usuário");
    const pid=req(personId,"Pessoa");
    return db.retiradas
      .where("[user_id+person_id]")
      .equals([owner,pid])
      .sortBy("data");
  },

  async getById(id:string,userId:string,personId:string){
    const r=await db.retiradas.get(req(id,"Retirada"));
    return r?.user_id===req(userId,"Usuário")&&r.person_id===req(personId,"Pessoa")?r:undefined;
  },

  async getByDate(userId:string,personId:string,data:string){
    const owner=req(userId,"Usuário");
    const pid=req(personId,"Pessoa");
    const d=date(data,"Data");
    return db.retiradas
      .where("[user_id+person_id]")
      .equals([owner,pid])
      .filter(r=>r.data===d)
      .toArray();
  },

  async getByMedicamento(userId:string,personId:string,medicamentoId:string){
    const owner=req(userId,"Usuário");
    const pid=req(personId,"Pessoa");
    const mid=req(medicamentoId,"Medicamento");

    return db.retiradas
      .where("[user_id+person_id]")
      .equals([owner,pid])
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

    const supply=await loadSupplyWithdrawal(medicamentoId,personId,userId,data.data);
    const retirada:Retirada={
      ...data,
      ...supply,
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

  async linkReceipt(personId:string,withdrawalId:string,receiptId:string){
    const userId=await uid();
    await db.transaction("rw",[db.retiradas,db.renovacoes,db.syncQueue],async()=>{
      const r=await db.retiradas.get(withdrawalId),receipt=await db.renovacoes.get(receiptId);
      if(!r || !receipt || r.person_id!==personId || receipt.person_id!==personId || r.user_id!==userId || receipt.user_id!==userId || r.medicamento_id!==receipt.medicamento_id) throw new Error("Recebimento e retirada devem pertencer ao mesmo medicamento e pessoa.");
      if(r.renovacao_realizada_id){if(r.renovacao_realizada_id===receiptId)return;throw new Error("Esta retirada já tem um recebimento vinculado.");}
      if(!["agendada","realizada"].includes(r.status) || !receipt.data_aquisicao || !receipt.quantidade || receipt.quantidade<=0) throw new Error("Selecione uma aquisição real com quantidade recebida.");
      if(r.tipo==="sus" && receipt.tipo_aquisicao!=="sus") throw new Error("Selecione uma aquisição SUS.");
      const used=await db.retiradas.where("renovacao_realizada_id").equals(receiptId).toArray();
      if(used.some(x=>x.id!==r.id&&x.person_id===personId&&x.user_id===userId))throw new Error("Esta aquisição já está vinculada a outra retirada.");
      const next={...r,status:"realizada" as const,renovacao_realizada_id:receiptId,quantidade_retirada:receipt.quantidade,realizada_em:r.realizada_em||now(),updated_at:now(),synced:false};
      await db.retiradas.put(next);await enfileirarOperacao("retiradas","update",next,{dispatchSync:false});
    });solicitarProcessamentoSync();
  },

  async update(id:string,personId:string,changes:RetiradaUpdateInput){
    const userId=await uid();
    const current=await this.getById(id,userId,personId);

    if(!current||current.user_id!==userId){
      throw new Error("Retirada não encontrada para a pessoa ativa.");
    }

    const nextMedicationId=changes.medicamento_id??current.medicamento_id;
    if(current.renovacao_realizada_id && ((changes.status && changes.status!=="realizada") || nextMedicationId!==current.medicamento_id))throw new Error("Esta retirada já tem recebimento registrado; confira a aquisição vinculada.");

    if(current.renovacao_origem_id&&nextMedicationId!==current.medicamento_id){
      throw new Error("A retirada criada por uma renovação deve manter o medicamento de origem.");
    }

    const medicamento=await med(nextMedicationId,current.person_id);

    if(medicamento.user_id&&medicamento.user_id!==userId){
      throw new Error("Medicamento não pertence ao usuário autenticado.");
    }

    const next:Retirada={
      ...current,
      ...changes,
      id:current.id,
      user_id:current.user_id,
      person_id:current.person_id,
      renovacao_origem_id:current.renovacao_origem_id,
      renovacao_realizada_id:current.renovacao_realizada_id,
      medicamento_id:nextMedicationId,
      medicamento_nome:medicamento.nome??current.medicamento_nome??null,
      medicamento_dosagem:medicamento.dosagem??current.medicamento_dosagem??null,
      data:changes.data!==undefined
        ? date(changes.data,"Data da retirada")
        : current.data,
      updated_at:now(),
      synced:false
    };

    const proposed = changes.reagendamentos?.[changes.reagendamentos.length - 1];
    const reason = proposed?.data_anterior === current.data && proposed?.nova_data === next.data ? proposed.motivo : null;
    next.reagendamentos = withdrawalHistory(current, next, next.updated_at!, reason);

    await db.transaction(
      "rw",
      [db.retiradas,db.medicamentos,db.syncQueue],
      async()=>{
        const latest = await db.retiradas.get(id);
        if (!latest || latest.updated_at !== current.updated_at || latest.data !== current.data || latest.status !== current.status) {
          throw new Error("A retirada foi atualizada. Reabra para revisar o reagendamento.");
        }
        await db.retiradas.put(next);
        if (current.tipo === "sus" && next.tipo === "sus" && current.medicamento_id === next.medicamento_id && next.status === "agendada" && next.data !== current.data) {
          const freshMedication = await db.medicamentos.get(next.medicamento_id);
          if (freshMedication?.person_id === personId && freshMedication.user_id === userId && freshMedication.data_retorno_sus === current.data) {
            const mirrored = {...freshMedication, data_retorno_sus: next.data, updated_at: next.updated_at, synced: false};
            await db.medicamentos.put(mirrored);
            await enfileirarOperacao("medicamentos", "update", mirrored, {dispatchSync:false});
          }
        }

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

  async rescheduleMany(personId: string, selected: Array<{id: string; data: string; updated_at?: string}>, targetDate: string, reason: string) {
    const userId = await uid();
    const target = date(targetDate, "Data da retirada");
    const parsed = new Date(`${target}T12:00:00Z`);
    if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== target) throw new Error("Data da retirada inválida.");
    if (!selected.length || new Set(selected.map(row => row.id)).size !== selected.length) throw new Error("Selecione retiradas distintas.");
    const timestamp = now();
    let changed = 0;
    await db.transaction("rw", [db.retiradas, db.medicamentos, db.syncQueue], async () => {
      const rows: Retirada[] = [];
      for (const expected of selected) {
        const row = await db.retiradas.get(expected.id);
        if (!row || row.user_id !== userId || row.person_id !== personId || row.status !== "agendada" || row.renovacao_realizada_id) throw new Error("Uma retirada não está mais disponível para reagendamento. Revise a seleção.");
        if (row.data !== expected.data || row.updated_at !== expected.updated_at) throw new Error("Uma retirada foi atualizada. Reabra o planejamento.");
        const medication = await db.medicamentos.get(row.medicamento_id);
        if (!medication || medication.user_id !== userId || medication.person_id !== personId) throw new Error("Medicamento não encontrado para a pessoa ativa.");
        rows.push(row);
      }
      for (const row of rows) {
        if (row.data === target) continue;
        const next = {...row, data: target, updated_at: timestamp, synced: false};
        next.reagendamentos = withdrawalHistory(row, next, timestamp, reason);
        await db.retiradas.put(next);
        await enfileirarOperacao("retiradas", "update", next, {dispatchSync:false});
        const medication = await db.medicamentos.get(row.medicamento_id);
        if (row.tipo === "sus" && medication?.data_retorno_sus === row.data) {
          const mirrored = {...medication, data_retorno_sus: target, updated_at: timestamp, synced: false};
          await db.medicamentos.put(mirrored);
          await enfileirarOperacao("medicamentos", "update", mirrored, {dispatchSync:false});
        }
        changed++;
      }
    });
    if (changed) solicitarProcessamentoSync();
    return changed;
  },

  async delete(id:string,personId:string){
    const userId=await uid();
    const current=await this.getById(id,userId,personId);

    if(!current?.id||current.user_id!==userId){
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
