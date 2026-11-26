import {atomicQueueKey,nextAtomicPosition,parseStockAtomicIntent,medicationPending} from '@/lib/dose-premium/atomic-envelope';
import {observedStockContext} from '@/lib/dose-premium/stock-context';
import {captureStockCount,stockFieldsChanged,type StockCountSnapshot} from "@/lib/dose-premium/stock-cycle";
import {getLocalTodayISO} from "@/lib/health-utils";
import { getLocalFirstAuthUser } from "@/lib/supabase/local-auth";
import { normalizeMedicationClinicalContextM1 } from "@/lib/clinical/episode-m1";
import { getMedicationAlertPrefs } from "@/lib/health-intelligence/medication-alert-policy";
// lib/repositories/medicamentos.ts

import {
  db,
  safeAddMedicamento,
  safeDeleteMedicamento,
  safeUpdateMedicamento,
} from "@/lib/db";

import { supabase } from "@/lib/supabase/client";

import {
  enfileirarOperacao, solicitarProcessamentoSync,
} from "@/lib/sync/enfileirarOperacao";

import {
  cancelDoseNotifications,
  scheduleDoseNotifications,
} from "@/lib/dose-notifications";

import {
  cancelMedicationRenewalNotification,
  scheduleMedicationRenewalNotification,
} from "@/lib/notifications";

import type {
  CreateMedicamentoInput,
  Medicamento,
  UpdateMedicamentoInput,
} from "@/lib/types";

// ============================================================
// HELPERS
// ============================================================

function uniqueIds(
  ids?: string[]
): string[] | undefined {
  if (!ids) {
    return undefined;
  }

  return Array.from(
    new Set(
      ids.filter(Boolean)
    )
  );
}

function normalizeCreateText(
  value?: string
): string {
  return value?.trim() || "";
}

/**
 * Compatibilidade somente de leitura para cadastros anteriores
 * à identidade visual canônica. Não reescreve o banco e não
 * inventa valores quando o usuário nunca escolheu uma aparência.
 */
function withCanonicalVisualIdentity(
  medicamento: Medicamento
): Medicamento {
  const formato =
    medicamento.formato?.trim() ||
    medicamento.forma_farmaceutica?.trim();

  const modernColors =
    medicamento.cores
      ?.filter((color): color is string =>
        typeof color === "string" && color.trim().length > 0
      )
      .map((color) => color.trim()) || [];

  const legacyColors = [
    medicamento.cor_principal,
    medicamento.cor_secundaria,
  ].filter((color): color is string =>
    typeof color === "string" && color.trim().length > 0
  );

  const cores = Array.from(
    new Set(modernColors.length > 0 ? modernColors : legacyColors)
  ).slice(0, 2);

  return {
    ...medicamento,
    ...(formato ? { formato } : {}),
    ...(cores.length > 0 ? { cores } : {}),
  };
}

async function reconcileMedicationNotifications(
  previous:
    Medicamento |
    undefined,

  current:
    Medicamento |
    undefined
): Promise<void> {
  const reference =
    current ||
    previous;

  if (
    !reference?.id
  ) {
    return;
  }

  try {
    /*
     * Cancela os horários antigos primeiro.
     * Assim horários removidos não ficam vivos no Android.
     */
    if (
      previous
        ?.estoque_horarios &&
      previous
        .estoque_horarios
        .length >
        0
    ) {
      await cancelDoseNotifications({
        id:
          reference.id,

        person_id:
          previous.person_id,

        nome:
          previous.nome,

        dosagem:
          previous.dosagem,

        estoque_horarios:
          previous.estoque_horarios,
      });
    }

    /*
     * A renovação usa ID determinístico por medicamento.
     * Cancelamos antes de decidir se existe uma nova.
     */
    await cancelMedicationRenewalNotification(
      reference.id
    );

    /*
     * Exclusão ou descontinuação encerra aqui:
     * nada deve ser reagendado.
     */
    if (
      !current ||
      current.status ===
        "descontinuado"
    ) {
      return;
    }

    if (
      current.tipo_uso ===
        "continuo" &&
      current
        .estoque_horarios &&
      current
        .estoque_horarios
        .length >
        0
    ) {
      await scheduleDoseNotifications({
        id:
          current.id!,

        person_id:
          current.person_id,

        nome:
          current.nome,

        dosagem:
          current.dosagem,

        estoque_horarios:
          current.estoque_horarios,
      });
    }

    const renewalDate =
      (current.lembrete_receita_modo === "data_personalizada" && current.lembrete_receita_data
        ? current.lembrete_receita_data : current.proxima_renovacao)?.trim();

    if (
      renewalDate && getMedicationAlertPrefs(current).prescription
    ) {
      await scheduleMedicationRenewalNotification(
        current.id!,
        current.nome,
        renewalDate,
        current.medico || "",
        current.lembrete_receita_modo === "data_personalizada" ? 0 : 7
      );
    }
  } catch (
    error
  ) {
    /*
     * Falha no Android não desfaz um cadastro já salvo.
     */
    console.error(
      "[medicamentosRepository] Dados salvos, mas houve falha ao reconciliar notificações:",
      error
    );
  }
}

// ============================================================
// REPOSITORY
// ============================================================

export const medicamentosRepository = {
  // ==========================================================
  // LIST
  // ==========================================================

  // VAULT_SOS_AFTER_DISCONTINUATION_V94
  // Lista operacional: ativos + SOS mantidos após encerramento clínico.
  async getAll(
    personId: string
  ) {
    if (!personId) {
      return [];
    }

    const medicamentos =
      await db.medicamentos
        .where("person_id")
        .equals(personId)
        .filter(
          (medicamento) =>
            medicamento.status !== "descontinuado" ||
            medicamento.tipo_uso === "sos" ||
            medicamento.tipo_uso === "esporadico"
        )
        .toArray();

    return medicamentos.map(withCanonicalVisualIdentity);
  },

  // Coleção completa para gestão e histórico visual.
  async getAllIncludingDiscontinued(
    personId: string
  ) {
    if (!personId) {
      return [];
    }

    const medicamentos =
      await db.medicamentos
        .where("person_id")
        .equals(personId)
        .toArray();

    return medicamentos.map(withCanonicalVisualIdentity);
  },

  // ==========================================================
  // GET
  // ==========================================================

  async getById(
    id: string,
    personId: string
  ) {
    if (
      !id ||
      !personId
    ) {
      return undefined;
    }

    const medicamento =
      await db.medicamentos.get(
        id
      );

    if (
      !medicamento ||
      medicamento.person_id !==
        personId
    ) {
      return undefined;
    }

    return withCanonicalVisualIdentity(
      medicamento
    );
  },

  // ==========================================================
  // CREATE
  // ==========================================================

  async create(
    data: CreateMedicamentoInput
  ) {
    if (!data.person_id) {
      throw new Error(
        "Pessoa do medicamento não identificada."
      );
    }

    const {
      data: {
        user,
      },
    } =
      await getLocalFirstAuthUser();

    if (!user) {
      throw new Error(
        "Usuário não autenticado."
      );
    }

    const tratamentoIds =
      uniqueIds(
        data.tratamento_ids
      );

    const cidIds =
      uniqueIds(
        data.cid_ids
      );

    // ========================================================
    // ANTI-DUPLICAÇÃO
    // ========================================================

    if (data.nome) {
      const nomeNormalizado =
        data.nome
          .trim()
          .toLowerCase();

      const duplicadoRecente =
        await db.medicamentos
          .where(
            "person_id"
          )
          .equals(
            data.person_id
          )
          .filter(
            (
              medicamento
            ) =>
              medicamento.nome
                .trim()
                .toLowerCase() ===
              nomeNormalizado
          )
          .first();

      if (
        duplicadoRecente?.created_at
      ) {
        const criadoEm =
          new Date(
            duplicadoRecente.created_at
          ).getTime();

        const diffEmSegundos =
          (
            Date.now() -
            criadoEm
          ) /
          1000;

        if (
          Number.isFinite(
            diffEmSegundos
          ) &&
          diffEmSegundos <
            5
        ) {
          console.warn(
            "⚠️ Tentativa de duplicação bloqueada pelo repositório:",
            data.nome
          );

          return duplicadoRecente.id!;
        }
      }
    }

    // ========================================================
    // PAYLOAD
    // ========================================================

    const now =
      new Date().toISOString();

    const payload:
      Medicamento = {
      ...data,

      id:
        data.id ||
        crypto.randomUUID(),

      user_id:
        user.id,

      person_id:
        data.person_id,

      data_receita:
        normalizeCreateText(
          data.data_receita
        ),

      proxima_renovacao:
        normalizeCreateText(
          data.proxima_renovacao
        ),

      tratamento_ids:
        tratamentoIds,

      cid_ids:
        cidIds,

      created_at:
        now,

      updated_at:
        now,

      synced:
        false,
    };

    // ========================================================
    // LOCAL
    // ========================================================

    const id =
      await safeAddMedicamento(
        payload
      );

    const registroCriado =
      await db.medicamentos.get(
        id
      );

    if (!registroCriado) {
      throw new Error(
        "Medicamento criado, mas não foi possível recuperar o registro local."
      );
    }

    if (
      registroCriado.person_id !==
        data.person_id
    ) {
      throw new Error(
        "Medicamento criado com vínculo de pessoa inconsistente."
      );
    }

    // ========================================================
    // SYNC
    // ========================================================

    await enfileirarOperacao(
      "medicamentos",
      "add",
      registroCriado
    );

    await reconcileMedicationNotifications(
      undefined,
      registroCriado
    );

    return id;
  },

  // ==========================================================
  // UPDATE
  // ==========================================================

  async confirmStockCount(id:string,personId:string,count:number,expected:StockCountSnapshot){
    const auth=await getLocalFirstAuthUser();const userId=auth.data.user?.id;
    if(!userId||!personId||!Number.isFinite(count)||count<0)throw Error('Contagem ou pessoa inválida.');
    await db.transaction('rw',[db.medicamentos,db.syncQueue],async()=>{
      const previous=await db.medicamentos.get(id);if(!previous||previous.user_id!==userId||previous.person_id!==personId)throw Error('Estoque fora da pessoa ativa.');
      const scope={user_id:userId,person_id:personId,medicationId:id},before=observedStockContext(previous,scope),queue=await db.syncQueue.toArray();
      if(queue.some(q=>q.payload.user_id===userId&&q.payload.person_id===personId&&q.payload.macro02_atomic===undefined&&(q.table==='medicamentos'&&q.payload.id===id||q.table==='doseLogs'&&q.payload.medicamento_id===id)))throw Error('Alteração anterior de estoque aguarda sincronização.');
      const position=nextAtomicPosition(queue,before,previous.updated_at??null);
      await safeUpdateMedicamento(id,{estoque_quantidade:count,estoque_data_referencia:getLocalTodayISO(),updated_at:new Date().toISOString()},{expected,userId,personId});
      const saved=await db.medicamentos.get(id);
      if(!saved||saved.user_id!==userId||saved.person_id!==personId||saved.estoque_quantidade!==count)throw Error('Contagem não confirmada.');
      const atomic=parseStockAtomicIntent({version:2,mode:'count',operationId:crypto.randomUUID(),previous:null,after:null,stockBefore:before,stockAfter:observedStockContext(saved,scope),stockRevisionBefore:previous.updated_at??null,stockRevisionAfter:saved.updated_at??null,stockReferenceAfter:saved.estoque_data_referencia??null,beforeCount:captureStockCount(previous),afterCount:captureStockCount(saved),acquisition:null,countedCurrentStock:count,initialStockQuantity:null,...position});
      await enfileirarOperacao('medicamentos','update',{...saved,macro02_atomic:atomic},{dispatchSync:false});
      const pending=await db.syncQueue.where('chave').equals(atomicQueueKey(atomic)).first();
      if(!pending||pending.table!=='medicamentos'||pending.operation!=='update'||pending.payload.id!==id||pending.payload.user_id!==userId||pending.payload.person_id!==personId||pending.payload.estoque_quantidade!==count||pending.payload.estoque_ciclo_id!==saved.estoque_ciclo_id||pending.payload.updated_at!==saved.updated_at||JSON.stringify(pending.payload.macro02_atomic)!==JSON.stringify(atomic))throw Error('Contagem sem confirmação na fila local; operação cancelada.');
    });
    solicitarProcessamentoSync();
    return id;
  },

  async update(
    id: string,
    personId: string,
    data: UpdateMedicamentoInput
  ) {
    const current =
      await db.medicamentos.get(
        id
      );

    if (
      !current ||
      current.person_id !==
        personId
    ) {
      throw new Error(
        "Medicamento não encontrado para a pessoa ativa."
      );
    }

    // CI360 M1: writes of clinical regimen/history MUST match both account and person.
    if (data.contexto_clinico_m1 !== undefined) {
      const auth = await getLocalFirstAuthUser();
      if (!auth.data.user || auth.data.user.id !== current.user_id)
        throw new Error("Conta autenticada não corresponde ao medicamento.");
      normalizeMedicationClinicalContextM1(data.contexto_clinico_m1);
    }

    const tratamentoIds =
      data.tratamento_ids !==
      undefined
        ? uniqueIds(
            data.tratamento_ids
          )
        : undefined;

    const cidIds =
      data.cid_ids !==
      undefined
        ? uniqueIds(
            data.cid_ids
          )
        : undefined;

    const now =
      new Date().toISOString();

    const payload:
      UpdateMedicamentoInput & {
        updated_at: string;
        synced: false;
      } = {
      ...data,

      ...(data.tratamento_ids !==
      undefined
        ? {
            tratamento_ids:
              tratamentoIds,
          }
        : {}),

      ...(data.cid_ids !==
      undefined
        ? {
            cid_ids:
              cidIds,
          }
        : {}),

      updated_at:
        now,

      synced:
        false,
    };

    // ========================================================
    // LOCAL
    // ========================================================

    const auth=await getLocalFirstAuthUser();if(!auth.data.user||auth.data.user.id!==current.user_id)throw Error('Conta autenticada não corresponde ao medicamento.');
    const registroCompleto=await db.transaction('rw',[db.medicamentos,db.syncQueue],async()=>{
      const latest=await db.medicamentos.get(id);if(!latest||latest.user_id!==current.user_id||latest.person_id!==personId||latest.updated_at!==current.updated_at)throw Error('Cadastro mudou desde a abertura. Revise antes de salvar.');
      const scope={user_id:current.user_id,person_id:personId,medicationId:id},queue=await db.syncQueue.toArray();
      if(medicationPending(queue,scope).length)throw Error('Medicamento possui operação acoplada pendente. Preserve a fila antes de alterar o cadastro.');
      const ordinary=queue.filter(q=>q.payload.user_id===scope.user_id&&q.payload.person_id===scope.person_id&&q.payload.macro02_atomic===undefined&&(q.table==='medicamentos'?q.payload.id===id:q.payload.medicamento_id===id));
      const newLocal=ordinary.some(q=>q.table==='medicamentos'&&q.operation==='add')&&!latest.estoque_ciclo_id;
      const before=observedStockContext(latest,scope);
      await safeUpdateMedicamento(id,payload);
      const saved=await db.medicamentos.get(id);if(!saved||saved.user_id!==current.user_id||saved.person_id!==personId)throw Error('Medicamento não confirmado localmente.');
      if(stockFieldsChanged(latest,saved)&&!newLocal){
        if(ordinary.length)throw Error('Aguarde a sincronização da alteração anterior antes de ajustar estoque.');
        const atomic=parseStockAtomicIntent({version:2,mode:'adjustment',operationId:crypto.randomUUID(),previous:null,after:null,stockBefore:before,stockAfter:observedStockContext(saved,scope),stockRevisionBefore:latest.updated_at??null,stockRevisionAfter:saved.updated_at??null,stockReferenceAfter:saved.estoque_data_referencia??null,beforeCount:captureStockCount(latest),afterCount:captureStockCount(saved),acquisition:null,countedCurrentStock:null,initialStockQuantity:null,...nextAtomicPosition(queue,before,latest.updated_at??null)});
        await enfileirarOperacao('medicamentos','update',{...saved,macro02_atomic:atomic},{dispatchSync:false});
        const pending=await db.syncQueue.where('chave').equals(atomicQueueKey(atomic)).first();
        if(!pending||JSON.stringify(pending.payload.macro02_atomic)!==JSON.stringify(atomic))throw Error('Ajuste sem confirmação na fila local.');
        // Mixed cadastral edits retain the existing metadata/junction synchronization, after the stock receipt.
      }
      await enfileirarOperacao('medicamentos','update',saved,{dispatchSync:false});
      const metadata=await db.syncQueue.where('chave').equals(`medicamentos:${id}`).first();
      if(!metadata||metadata.payload.user_id!==scope.user_id||metadata.payload.person_id!==scope.person_id||metadata.payload.updated_at!==saved.updated_at)throw Error('Cadastro sem confirmação na fila local.');
      return saved;
    });solicitarProcessamentoSync();

    await reconcileMedicationNotifications(
      current,
      registroCompleto
    );

    return id;
  },

  // ==========================================================
  // DELETE
  // ==========================================================

  async delete(
    id: string,
    personId: string
  ) {
    return this.deleteSafe(
      id,
      personId
    );
  },

  // ==========================================================
  // DELETE SAFE
  // ==========================================================

  async deleteSafe(
    id: string,
    personId: string
  ) {
    const medicamento =
      await db.medicamentos.get(
        id
      );

    if (
      !medicamento ||
      medicamento.person_id !==
        personId
    ) {
      throw new Error(
        "Medicamento não encontrado para a pessoa ativa."
      );
    }

    /*
     * Um medicamento participa do prontuário longitudinal.
     * Removê-lo fisicamente apagava DoseLogs e quebrava a
     * identidade de eventos históricos. A operação pública de
     * remoção agora é uma descontinuação segura e reversível.
     */
    const now =
      new Date().toISOString();

    const descontinuado: Medicamento = {
      ...medicamento,
      status:
        "descontinuado",
      data_descontinuacao:
        medicamento.data_descontinuacao ||
        now.slice(0, 10),
      motivo_descontinuacao:
        medicamento.motivo_descontinuacao ||
        "Removido da rotina pelo usuário",
      updated_at:
        now,
      synced:
        false,
    };

    const auth=await getLocalFirstAuthUser();if(!auth.data.user||auth.data.user.id!==medicamento.user_id)throw Error('Conta autenticada não corresponde ao medicamento.');
    const registroCompleto=await db.transaction('rw',[db.medicamentos,db.syncQueue],async()=>{
      const latest=await db.medicamentos.get(id);if(!latest||latest.user_id!==medicamento.user_id||latest.person_id!==personId||latest.updated_at!==medicamento.updated_at)throw Error('Cadastro mudou. Revise antes de descontinuar.');
      if(medicationPending(await db.syncQueue.toArray(),{user_id:medicamento.user_id,person_id:personId,medicationId:id}).length)throw Error('Medicamento possui operação acoplada pendente. Preserve a fila antes de descontinuar.');
      await safeUpdateMedicamento(id,descontinuado);const saved=await db.medicamentos.get(id);if(!saved||saved.user_id!==medicamento.user_id||saved.person_id!==personId)throw Error('Histórico não confirmado localmente.');
      await enfileirarOperacao('medicamentos','update',saved,{dispatchSync:false});return saved;
    });solicitarProcessamentoSync();

    await reconcileMedicationNotifications(
      medicamento,
      registroCompleto
    );

    return id;
  },
};