import {runMacro02ResidualWrite} from "@/lib/sync/macro02-residual-write";
import {prepareMacro02ClinicalWrite} from "@/lib/sync/macro02-authority";
import {capturePharmaceuticalSnapshot} from '@/lib/dose-premium/pharmaceutical-snapshot';
import { atomicQueueKey, nextAtomicPosition, parseAtomicIntent, type AtomicIntent } from "@/lib/dose-premium/atomic-envelope";
import { prepareClinicalWrite, confirmObservedWrite, type ClinicalWriteRequest } from "@/lib/dose-premium/writer-contract";
import { observedStockContext, observedStockConversion } from "@/lib/dose-premium/stock-context";
import { readDoseUnit, type DoseUnitFields } from "@/lib/dose-premium/historical-unit";
import { verifyDoseSnapshotAck, type DoseSnapshot } from "@/lib/dose-premium/compatibility";
import { resolveWritableSlot } from "@/lib/dose-premium/slot-write-guard";
import { hasKnownEmptyMedicationStock } from "@/lib/medication-availability";
import { getLocalFirstAuthUser } from "@/lib/supabase/local-auth";
// lib/repositories/doseLogs.ts

import {
  db,
} from "@/lib/db";

import {
  enfileirarOperacao,
  solicitarProcessamentoSync,
} from "@/lib/sync/enfileirarOperacao";

import {
  supabase,
} from "@/lib/supabase/client";

import {
  getLocalTodayISO,
} from "@/lib/health-utils";

import type {
  DoseLog,
  Medicamento,
} from "@/lib/types";
import { temporaryCourseSlots, temporaryCourseNote, TEMPORARY_COURSE_PREFIX, type TemporaryCourse } from "@/lib/health-supply/temporary-course";

// ============================================================
// TIPOS
// ============================================================

type DoseStatus =
  | "taken"
  | "ignored"
  | "clear";

interface SetDoseStatusInput {
  unit?: DoseUnitFields;
  expected?: DoseSnapshot | null;
  requireRegisteredStock?: boolean;
  requireKnownEmptyStock?: boolean;
  onlyIfPending?: boolean;
  personId: string;

  medicamentoId: string;

  data?: string;

  horario: string;

  status: DoseStatus;

  quantidade?: number;

  /**
   * Momento REAL informado para a tomada.
   *
   * Exemplo:
   *
   * slot programado: 10:00
   * registro feito: 16:00
   *
   * - se tomou às 10:00, enviar 10:00
   * - se tomou às 16:00, enviar 16:00
   *
   * Quando omitido, mantém o comportamento legado:
   * usa o momento atual.
   */
  tomadoEm?: string;

  /**
   * Controla se esta alteração deve movimentar o saldo atual
   * do medicamento.
   *
   * true / undefined:
   * comportamento normal do Vault.
   *
   * false:
   * revisão histórica. O DoseLog é persistido e sincronizado,
   * mas o estoque atual permanece intacto.
   */
  adjustStock?: boolean;
  motivo?: string;
}

interface RegistrarTomadaAvulsaInput {
  unit?: DoseUnitFields;
  tomadoEm?: string;
  adjustStock?: boolean;
  personId: string;

  medicamentoId: string;

  data?: string;

  horario: string;

  quantidade?: number;

  doseKind?: "sos" | "extra";

  motivo?: string;
}

interface AgendarDoseAvulsaInput {
  personId: string;
  medicamentoId: string;
  data: string;
  horario: string;
  quantidade?: number;
  motivo?: string;
}

interface RemoveDoseLogByIdInput {
  adjustStock?: boolean;
  expected?: DoseSnapshot;
  personId: string;

  id: string;
}

// ============================================================
// HELPERS DE VALIDAÇÃO
// ============================================================

function requirePersonId(
  personId: string
): string {
  const normalized =
    personId.trim();

  if (!normalized) {
    throw new Error(
      "Pessoa ativa não identificada."
    );
  }

  return normalized;
}

function requireMedicamentoId(
  medicamentoId: string
): string {
  const normalized =
    medicamentoId.trim();

  if (!normalized) {
    throw new Error(
      "Medicamento não identificado."
    );
  }

  return normalized;
}

function requireDoseLogId(
  id: string
): string {
  const normalized =
    id.trim();

  if (!normalized) {
    throw new Error(
      "Registro de dose não identificado."
    );
  }

  return normalized;
}

function requireHorario(
  horario: string
): string {
  const normalized =
    horario.trim();

  if (!normalized) {
    throw new Error(
      "Horário da dose não identificado."
    );
  }

  const match =
    /^(\d{1,2}):(\d{2})$/.exec(
      normalized
    );

  if (!match) {
    throw new Error(
      "Horário da dose inválido."
    );
  }

  const hours =
    Number(
      match[1]
    );

  const minutes =
    Number(
      match[2]
    );

  if (
    !Number.isInteger(
      hours
    ) ||
    !Number.isInteger(
      minutes
    ) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    throw new Error(
      "Horário da dose inválido."
    );
  }

  return `${String(
    hours
  ).padStart(
    2,
    "0"
  )}:${String(
    minutes
  ).padStart(
    2,
    "0"
  )}`;
}

function requireDate(
  data?: string
): string {
  const normalized =
    (
      data ||
      getLocalTodayISO()
    ).trim();

  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(
      normalized
    )
  ) {
    throw new Error(
      "Data da dose inválida."
    );
  }

  return normalized;
}

function normalizeTakenAt(
  value?: string
): string | undefined {
  if (
    value === undefined
  ) {
    return undefined;
  }

  const normalized =
    value.trim();

  if (
    !normalized
  ) {
    throw new Error(
      "Horário real da tomada inválido."
    );
  }

  const parsed =
    new Date(
      normalized
    );

  if (
    Number.isNaN(
      parsed.getTime()
    )
  ) {
    throw new Error(
      "Horário real da tomada inválido."
    );
  }

  return parsed.toISOString();
}

// ============================================================
// QUANTIDADE
// ============================================================

function normalizePositiveQuantity(
  value:
    | number
    | undefined
): number | undefined {
  if (
    value === undefined
  ) {
    return undefined;
  }

  if (
    !Number.isFinite(
      value
    ) ||
    value <= 0
  ) {
    throw new Error(
      "Quantidade da dose inválida."
    );
  }

  return value;
}

/**
 * Quantidade HISTÓRICA efetivamente salva em um DoseLog existente.
 *
 * Não usamos a configuração atual do medicamento como fallback.
 *
 * Isso é proposital:
 *
 * se estoque_unidade_por_dose mudou depois da tomada, usar o valor
 * atual para desfazer uma movimentação antiga poderia alterar o
 * estoque incorretamente.
 */
function getExistingDoseQuantity(
  existing?: DoseLog
): number | undefined {
  if (
    existing?.quantidade ===
      undefined ||
    existing?.quantidade ===
      null
  ) {
    return undefined;
  }

  const value =
    Number(
      existing.quantidade
    );

  if (
    !Number.isFinite(
      value
    ) ||
    value <= 0
  ) {
    return undefined;
  }

  return value;
}

/**
 * Resolve a quantidade de uma NOVA tomada ou de uma atualização.
 *
 * Ordem:
 *
 * 1. quantidade explicitamente informada;
 * 2. quantidade histórica já registrada no DoseLog;
 * 3. unidade por dose configurada no medicamento;
 * 4. undefined.
 *
 * IMPORTANTE:
 *
 * Não existe fallback para 1.
 *
 * Uma tomada pode ser registrada mesmo sem quantidade conhecida.
 * Nesse caso ela continua válida para adesão/histórico, porém o
 * estoque não será alterado se não for possível calcular o consumo.
 */
function resolveDoseQuantity(
  medicamento: Medicamento,
  requested?: number,
  existing?: DoseLog
): number | undefined {
  if (
    requested !== undefined
  ) {
    return normalizePositiveQuantity(
      requested
    );
  }

  const existingQuantity =
    getExistingDoseQuantity(
      existing
    );

  if (
    existingQuantity !==
    undefined
  ) {
    return existingQuantity;
  }

  const configuredQuantity =
    medicamento.estoque_unidade_por_dose;

  if (
    typeof configuredQuantity !==
      "number" ||
    !Number.isFinite(
      configuredQuantity
    ) ||
    configuredQuantity <= 0
  ) {
    return undefined;
  }

  return configuredQuantity;
}

// ============================================================
// AUTH
// ============================================================

async function requireAuthenticatedUser() {
  const {
    data: {
      user,
    },
    error,
  } =
    await getLocalFirstAuthUser();

  if (
    error ||
    !user
  ) {
    throw new Error(
      "Usuário não autenticado."
    );
  }

  return user;
}

// ============================================================
// MEDICAMENTO
// ============================================================

async function getMedicamentoForPerson(
  medicamentoId: string,
  personId: string,
  userId: string
): Promise<Medicamento> {
  const medicamento =
    await db.medicamentos.get(
      medicamentoId
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

  if (
    medicamento.user_id !==
      userId
  ) {
    throw new Error(
      "Medicamento não pertence ao usuário autenticado."
    );
  }

  return medicamento;
}

// ============================================================
// DOSE PROGRAMADA
//
// A identidade lógica deste registro é:
//
// medicamento + pessoa + data + horário
//
// Essa regra NÃO deve ser usada para dose SOS avulsa.
// ============================================================

async function getDoseLogForSlot(
  medicamentoId: string,
  personId: string,
  data: string,
  horario: string,
  userId: string
): Promise<DoseLog | undefined> {
  const rows = await db.doseLogs.where("medicamento_id").equals(medicamentoId)
    .filter(log => log.person_id === personId && log.data === data).toArray();
  return resolveWritableSlot<DoseLog>(rows, {user_id:userId,person_id:personId,medicamento_id:medicamentoId,data,horario});
}

/** Existing repository transaction owns dose, inventory and queue. The candidate remains
 * merge-locked until the server can consume the coupled envelope atomically. */
function premiumSnapshot(row:DoseLog|undefined):DoseSnapshot|null {
  if(!row)return null;
  if(!row.id||!row.person_id||!row.user_id)throw Error('Dose sem identidade histórica verificável.');
  return {...row,id:row.id,person_id:row.person_id};
}
function hasPremiumEvidence(row:DoseLog|undefined):boolean {
  return Boolean(row&&(row.unidade_dose!=null||row.unidade_dose_rotulo!=null||row.fonte_unidade!=null||row.estoque_movimento!=null||row.farmaco_snapshot!=null));
}
function isDropMedication(
  medicamento: Medicamento
): boolean {
  const forma =
    String(
      medicamento.forma_farmaceutica ||
        ""
    )
      .trim()
      .toLowerCase();

  const formato =
    String(
      medicamento.formato ||
        ""
    )
      .trim()
      .toLowerCase();

  return (
    forma.includes(
      "gota"
    ) ||
    formato.includes(
      "gota"
    )
  );
}

/**
 * Converte a quantidade da dose para a unidade utilizada pelo estoque.
 *
 * Retorna null quando não há dados suficientes para uma conversão
 * confiável.
 */
function legacyQuantityInStockUnit(
  medicamento: Medicamento,
  doseQuantity:
    | number
    | undefined
): number | null {
  if (
    doseQuantity ===
    undefined
  ) {
    return null;
  }

  if (
    !Number.isFinite(
      doseQuantity
    ) ||
    doseQuantity <= 0
  ) {
    return null;
  }

  const unidade =
    String(
      medicamento.estoque_unidade_medida ||
        ""
    )
      .trim()
      .toLowerCase();

  if (
    !isDropMedication(
      medicamento
    )
  ) {
    return doseQuantity;
  }

  // ==========================================================
  // ESTOQUE EM GOTAS
  // ==========================================================

  if (
    unidade.includes(
      "gota"
    )
  ) {
    return doseQuantity;
  }

  // ==========================================================
  // GOTAS → ML
  // ==========================================================

  if (
    unidade.includes(
      "ml"
    )
  ) {
    const gotasPorMl =
      medicamento.estoque_gotas_por_ml;

    if (
      typeof gotasPorMl !==
        "number" ||
      !Number.isFinite(
        gotasPorMl
      ) ||
      gotasPorMl <= 0
    ) {
      return null;
    }

    return (
      doseQuantity /
      gotasPorMl
    );
  }

  // ==========================================================
  // GOTAS → FRASCO
  // ==========================================================

  if (
    unidade.includes(
      "frasco"
    )
  ) {
    return null;
  }

  return null;
}
/** Legacy writer under the explicit dormant release contract. A protected fact or
 * stock cycle never enters this path. One local transaction owns the old
 * separate row outbox, never a Premium envelope or a fallback after RPC. */
async function commitDormantLegacyDose(request:Omit<ClinicalWriteRequest,'expected'> & {expected?:DoseSnapshot|null},existing:DoseLog|undefined,medication:Medicamento):Promise<string>{
 const id=request.identity;
 if(hasPremiumEvidence(existing)||(medication.estoque_ciclo_id!=null||('macro02_stock_managed' in medication&&medication.macro02_stock_managed===true)))throw Error('Evidência Premium presente; revisão necessária antes de escrever pelo legado.');
 const current=premiumSnapshot(existing);
 if(request.expected!==undefined&&(Boolean(current)!==Boolean(request.expected)||current&&request.expected&&!verifyDoseSnapshotAck(request.expected,current)))throw Error('Dose alterada desde a revisão.');
 if(request.status==='clear'&&!existing?.id)throw Error('Não existe registro de dose para desmarcar.');
 if(request.status==='taken'&&request.identity.data!==getLocalTodayISO()&&!request.actualAt)throw Error('Informe o instante real da tomada histórica.');
 if(request.status==='taken'&&(!request.actualAt||Date.parse(request.actualAt)>Date.parse(request.asOf)||!Number.isFinite(Date.parse(request.actualAt))))throw Error('Informe o instante real da tomada.');
 // Do not fabricate a historical quantity from today's medication configuration.
 const quantity=request.quantity===null?undefined:request.quantity===undefined?existing?getExistingDoseQuantity(existing):resolveDoseQuantity(medication):normalizePositiveQuantity(request.quantity);
 const wasTaken=Boolean(existing?.tomado_em),willBeTaken=request.status==='taken';
 const oldAmount=wasTaken?legacyQuantityInStockUnit(medication,getExistingDoseQuantity(existing)):0;
 const newAmount=willBeTaken?legacyQuantityInStockUnit(medication,quantity):0;
 // The dormant UI must not request Premium-only explicit unit declarations.
 // An explicitly supplied unit that differs from the legacy converter cannot be discarded.
 if(request.unit&&readDoseUnit(request.unit).state!=='unknown')throw Error('A unidade Premium exige a experiência ativada. Preserve a declaração e revise pelo fluxo legado.');
 const balance=medication.estoque_quantidade;
 if(request.requireRegisteredStock&&willBeTaken&&!wasTaken&&(hasKnownEmptyMedicationStock(medication)||(typeof balance==='number'&&Number.isFinite(balance)&&newAmount!==null&&newAmount>balance)))throw Error('Estoque registrado insuficiente. Confira a dose individualmente.');
 const timestamp=request.asOf;
 if(request.status==='clear'){
  await db.doseLogs.delete(id.id);
  await enfileirarOperacao('doseLogs','delete',{id:id.id,person_id:id.person_id,user_id:id.user_id},{dispatchSync:false});
 }else{
  const kind=existing?.dose_kind??request.origin??'scheduled';
  const row:DoseLog={...existing,...id,quantidade:quantity,dose_kind:kind,tomado_em:willBeTaken?request.actualAt:undefined,ignorado_em:request.status==='ignored'?existing?.ignorado_em??timestamp:undefined,motivo:request.status==='ignored'?request.ignoredReason?.trim()||'nao_realizada':request.note?.trim()||(kind==='planned'||kind==='sos'||kind==='extra'?existing?.motivo:undefined),created_at:existing?.created_at??timestamp,updated_at:timestamp,synced:false};
  if(existing)await db.doseLogs.put(row);else await db.doseLogs.add(row);
  const saved=await db.doseLogs.get(id.id);if(!saved||!verifyDoseSnapshotAck(premiumSnapshot(row)!,premiumSnapshot(saved)!))throw Error('Dose legada não confirmada localmente.');
  await enfileirarOperacao('doseLogs',existing?'update':'add',saved,{dispatchSync:false});
 }
 const doseQueue=await db.syncQueue.where('chave').equals(`doseLogs:${id.id}`).first();
 if(!doseQueue||doseQueue.payload.user_id!==id.user_id||doseQueue.payload.person_id!==id.person_id||doseQueue.payload.macro02_atomic!==undefined||(request.status==='clear'?doseQueue.operation!=='delete':doseQueue.operation==='delete'||doseQueue.payload.updated_at!==timestamp))throw Error('Fila legada não confirmou a dose.');
 const delta=oldAmount===null||newAmount===null?null:newAmount-oldAmount;
 if(request.adjustStock&&delta!==null&&delta!==0&&typeof balance==='number'&&Number.isFinite(balance)){
  const next=balance-delta;
  await db.medicamentos.update(id.medicamento_id,{estoque_quantidade:next,estoque_data_referencia:getLocalTodayISO(),updated_at:timestamp,synced:false});
  const saved=await db.medicamentos.get(id.medicamento_id);
  if(!saved||saved.user_id!==id.user_id||saved.person_id!==id.person_id||saved.estoque_quantidade!==next||(saved.estoque_ciclo_id!=null||('macro02_stock_managed' in saved&&saved.macro02_stock_managed===true)))throw Error('Saldo legado não confirmado.');
  await enfileirarOperacao('medicamentos','update',saved,{dispatchSync:false});
  const stockQueue=await db.syncQueue.where('chave').equals(`medicamentos:${id.medicamento_id}`).first();
  if(!stockQueue||stockQueue.operation==='delete'||stockQueue.payload.user_id!==id.user_id||stockQueue.payload.person_id!==id.person_id||stockQueue.payload.estoque_quantidade!==next||stockQueue.payload.updated_at!==timestamp||stockQueue.payload.macro02_atomic!==undefined)throw Error('Fila legada não confirmou o saldo.');
 }
 return id.id;
}

async function verifyPendingPremiumQueue(medicationId:string,scope:{user_id:string;person_id:string}){
  const rows=await db.syncQueue.toArray();
  if(rows.some(q=>q.payload.user_id===scope.user_id&&q.payload.person_id===scope.person_id&&(
    q.table==='medicamentos'&&q.payload.id===medicationId&&q.payload.macro02_atomic===undefined ||
    q.table==='doseLogs'&&q.payload.medicamento_id===medicationId&&q.payload.macro02_atomic===undefined
  )))throw Error('Há uma alteração antiga de dose ou estoque aguardando sincronização. Preserve a fila antes de alterar novamente.');
  return rows;
}
async function commitPremiumDose(request:Omit<ClinicalWriteRequest,'identity'|'expected'> & {identity:ClinicalWriteRequest['identity'];expected?:DoseSnapshot|null},existing:DoseLog|undefined,medication:Medicamento):Promise<string>{
  const id=request.identity;
  const previous=premiumSnapshot(existing);
  const stock=observedStockContext(medication,{user_id:id.user_id,person_id:id.person_id,medicationId:id.medicamento_id});
  const queuedBefore=await verifyPendingPremiumQueue(id.medicamento_id,id);
  const position=nextAtomicPosition(queuedBefore,stock,medication.updated_at??null);
  const pharmaceuticalSnapshot=request.status!=='clear'&&!previous?.tomado_em&&!previous?.ignorado_em?capturePharmaceuticalSnapshot(medication,id,request.asOf):null;
  const prepared=prepareClinicalWrite({...request,pharmaceuticalSnapshot,expected:request.expected===undefined?previous:request.expected},previous,stock,observedStockConversion(medication,stock));
  const timestamp=request.asOf;
  let saved:DoseLog|undefined;
  if(prepared.next){
    const n=prepared.next;
    const row:DoseLog={...existing,id:n.id,user_id:n.user_id,person_id:n.person_id,medicamento_id:n.medicamento_id,data:n.data,horario:n.horario,
      quantidade:n.quantidade??undefined,tomado_em:n.tomado_em??undefined,ignorado_em:n.ignorado_em??undefined,dose_kind:n.dose_kind??undefined,motivo:n.motivo??undefined,
      unidade_dose:n.unidade_dose,unidade_dose_rotulo:n.unidade_dose_rotulo,fonte_unidade:n.fonte_unidade,estoque_movimento:n.estoque_movimento,farmaco_snapshot:n.farmaco_snapshot,
      created_at:existing?.created_at??timestamp,updated_at:timestamp,synced:false};
    if(existing){await db.doseLogs.put(row);}else{await db.doseLogs.add(row);}
    saved=await db.doseLogs.get(id.id);
  }else{await db.doseLogs.delete(id.id);saved=await db.doseLogs.get(id.id);}
  // This is the original dose repository's inventory operation. Do not call the
  // generic cadastral stock writer, which correctly invalidates ordinary edits.
  if(prepared.delta!==0){
    if(prepared.stockAfter===null||!stock.basis)throw Error('Movimentação sem ciclo de estoque.');
    await db.medicamentos.update(id.medicamento_id,{estoque_quantidade:prepared.stockAfter,estoque_data_referencia:getLocalTodayISO(),updated_at:timestamp,synced:false});
  }
  const stockRow=await db.medicamentos.get(id.medicamento_id);
  if(!stockRow)throw Error('Estoque não recuperado após a transação.');
  const observed=observedStockContext(stockRow,{user_id:id.user_id,person_id:id.person_id,medicationId:id.medicamento_id});
  confirmObservedWrite(prepared,{dose:premiumSnapshot(saved),stock:observed});
  const after=premiumSnapshot(saved);
  // One canonical queue envelope, no parallel stock push and no UI-produced receipt.
  // Existing transport must refuse this until the atomic RPC/ACK contract is integrated.
  const atomic:AtomicIntent=parseAtomicIntent({version:1,operationId:crypto.randomUUID(),previous,after,stockBefore:stock,stockAfter:observed,
    stockRevisionBefore:medication.updated_at??null,stockRevisionAfter:stockRow.updated_at??null,stockReferenceAfter:stockRow.estoque_data_referencia??null,delta:prepared.delta,...position});
  const payload={...(saved??id),macro02_atomic:atomic};
  const operation='update'; // immutable intention, including a deletion; do not sort it as a legacy row DELETE
  await enfileirarOperacao('doseLogs',operation,payload,{dispatchSync:false});
  const queued=await db.syncQueue.where('chave').equals(atomicQueueKey(atomic)).first();
  if(!queued||queued.table!=='doseLogs'||queued.operation!==operation||queued.payload.user_id!==id.user_id||queued.payload.person_id!==id.person_id||JSON.stringify(queued.payload.macro02_atomic)!==JSON.stringify(atomic))throw Error('Fila não confirmou a intenção transacional; gravação cancelada.');
  if(after&&!verifyDoseSnapshotAck(after,queued.payload as unknown as DoseSnapshot))throw Error('Fila diverge da dose persistida; gravação cancelada.');
  return id.id;
}

// ============================================================
// REPOSITORY
// ============================================================

export const doseLogsRepository = {
  // ==========================================================
  // LEITURA
  // ==========================================================

  async getAll(
    personId: string,
    data?: string,
    // M20: opt-in account scope for indexed Today reads; legacy callers retain
    // the historical signature and full-history behavior.
    ownerUserId?: string
  ): Promise<DoseLog[]> {
    const safePersonId =
      requirePersonId(
        personId
      );

    // M20: account/person/day equality reaches only the requested day rows.
    // Explicit owner mode fails closed while auth is not ready; no legacy
    // person-only scan may be used as fallback for the Hoje consumer.
    if (ownerUserId !== undefined && !ownerUserId.trim()) return [];
    const safeDate = data ? requireDate(data) : undefined;
    const query = ownerUserId !== undefined
      ? safeDate
        ? db.doseLogs.where("[user_id+person_id+data]").equals([ownerUserId, safePersonId, safeDate])
        : db.doseLogs.where("[user_id+person_id]").equals([ownerUserId, safePersonId])
      : db.doseLogs.where("person_id").equals(safePersonId);
    const rows = ownerUserId === undefined && safeDate
      ? await query.and(log => log.data === safeDate).toArray()
      : await query.toArray();

    return rows.sort(
      (
        first,
        second
      ) => {
        const firstKey =
          `${first.data || ""} ${first.horario || ""}`;

        const secondKey =
          `${second.data || ""} ${second.horario || ""}`;

        return firstKey.localeCompare(
          secondKey
        );
      }
    );
  },

  /**
   * Quantidades recentes efetivamente registradas como tomadas.
   *
   * Usado exclusivamente para proteção de UX contra
   * possíveis erros de digitação.
   */
  async getRecentQuantities(
    personId: string,
    medicamentoId: string,
    limit: number = 20
  ): Promise<number[]> {
    const safePersonId =
      requirePersonId(
        personId
      );

    const safeMedicamentoId =
      requireMedicamentoId(
        medicamentoId
      );

    const safeLimit =
      Math.min(
        50,
        Math.max(
          1,
          Math.floor(
            limit
          )
        )
      );

    const rows =
      await db.doseLogs
        .where(
          "person_id"
        )
        .equals(
          safePersonId
        )
        .and(
          (
            log
          ) =>
            log.medicamento_id ===
              safeMedicamentoId &&
            Boolean(
              log.tomado_em
            ) &&
            typeof log.quantidade ===
              "number" &&
            Number.isFinite(
              log.quantidade
            ) &&
            log.quantidade >
              0
        )
        .toArray();

    return rows
      .sort(
        (
          first,
          second
        ) => {
          const firstTime =
            first.tomado_em ||
            first.updated_at ||
            first.created_at ||
            `${first.data || ""}T${first.horario || "00:00"}`;

          const secondTime =
            second.tomado_em ||
            second.updated_at ||
            second.created_at ||
            `${second.data || ""}T${second.horario || "00:00"}`;

          return secondTime.localeCompare(
            firstTime
          );
        }
      )
      .slice(
        0,
        safeLimit
      )
      .map(
        (
          log
        ) =>
          Number(
            log.quantidade
          )
      )
      .reverse();
  },

    async getById(
    id: string,
    personId: string
  ): Promise<DoseLog | undefined> {
    const safePersonId =
      requirePersonId(
        personId
      );

    const normalizedId =
      id.trim();

    if (
      !normalizedId
    ) {
      return undefined;
    }

    const user=await requireAuthenticatedUser();
    const log =
      await db.doseLogs.get(
        normalizedId
      );

    if (
      !log || log.user_id!==user.id ||
      log.person_id !==
        safePersonId
    ) {
      return undefined;
    }

    return log;
  },

  // ==========================================================
  // DOSE PROGRAMADA
  // ==========================================================

  async setStatus({
    personId,
    medicamentoId,
    data,
    horario,
    status,
    quantidade,
    tomadoEm,
    requireRegisteredStock = false,
    requireKnownEmptyStock = false,
    onlyIfPending = false,
    adjustStock = true,
    motivo,
    unit, expected,
  }: SetDoseStatusInput): Promise<string> {
    const safePersonId =
      requirePersonId(
        personId
      );

    const safeMedicamentoId =
      requireMedicamentoId(
        medicamentoId
      );

    const safeHorario =
      requireHorario(
        horario
      );

    const targetDate =
      requireDate(
        data
      );

    const safeTakenAt =
      status ===
      "taken"
        ? normalizeTakenAt(
            tomadoEm
          )
        : undefined;

    const user =
      await requireAuthenticatedUser();

    const authority=await prepareMacro02ClinicalWrite(user.id);
    const result = await db.transaction(
      "rw",
      [
        db.doseLogs,
        db.medicamentos,
        db.syncQueue,
      ],
      async () => {
        await authority.assertCurrent();
        const write=async()=>{
        const medicamento =
          await getMedicamentoForPerson(
            safeMedicamentoId,
            safePersonId,
            user.id
          );

        const existing =
          await getDoseLogForSlot(
            safeMedicamentoId,
            safePersonId,
            targetDate,
            safeHorario,
            user.id
          );

        if (
          existing?.user_id &&
          existing.user_id !==
            user.id
        ) {
          throw new Error(
            "Registro de dose não pertence ao usuário autenticado."
          );
        }

        if(onlyIfPending && existing?.tomado_em) throw new Error("Esta dose já foi tomada. Atualize as pendências antes de confirmar o motivo.");

        if (onlyIfPending && existing?.ignorado_em) {
          const requestedReason = motivo?.trim() || "nao_realizada";
          const existingReason = existing.motivo?.trim() || "nao_realizada";
          if (status === "ignored" && requestedReason === existingReason && existing.id) {
            return existing.id;
          }
          throw new Error("Esta dose já foi revisada. Atualize as pendências antes de alterar o motivo.");
        }

        // A batch declaration of non-take due to empty stock is explicit and
        // rechecked inside the same write transaction; unknown is not zero.
        if(requireKnownEmptyStock){
          if(status!=="ignored"||motivo!=="sem_estoque"||!onlyIfPending||expected===undefined)throw Error("Revisão de falta de estoque incompleta.");
          const scheduled=Date.parse(`${targetDate}T${safeHorario.slice(0,5)}:00`);
          if(!Number.isFinite(scheduled)||scheduled>Date.now())throw Error("A ocorrência ainda não venceu.");
          if(!hasKnownEmptyMedicationStock(medicamento))throw Error("O saldo mudou ou não está comprovado. Revise individualmente.");
        }

        if(status==='taken'&&!existing?.tomado_em&&targetDate!==getLocalTodayISO()&&!safeTakenAt)throw Error('Informe o instante real da tomada histórica.');
        if(authority.writer==='legacy')return commitDormantLegacyDose({identity:{id:existing?.id??crypto.randomUUID(),user_id:user.id,person_id:safePersonId,medicamento_id:safeMedicamentoId,data:targetDate,horario:existing?.horario??safeHorario},expected,status,actualAt:status==='taken'?(safeTakenAt??existing?.tomado_em??new Date().toISOString()):undefined,ignoredReason:motivo?.trim()||existing?.motivo||'nao_realizada',quantity:quantidade,unit,asOf:new Date().toISOString(),adjustStock,requireRegisteredStock,origin:existing?.dose_kind??'scheduled'},existing,medicamento);

        // Premium facts never use the legacy split stock writer. The old
        // quantity configured in the prescription is a suggestion, not evidence.
        if(status==='clear'&&!existing?.id)throw Error('Não existe registro de dose para desmarcar.');
        if(status==='taken'&&!existing?.tomado_em&&adjustStock&&readDoseUnit(unit??{}).state!=='known'&&readDoseUnit(existing??{}).state!=='known')throw Error('Confira a unidade administrada no registro individual antes de movimentar o estoque.');
        const timestamp=new Date().toISOString();
        if(status==='taken'&&!existing?.tomado_em&&targetDate!==getLocalTodayISO()&&!safeTakenAt)throw Error('Informe o instante real da tomada histórica.');
        const quantity=quantidade!==undefined?normalizePositiveQuantity(quantidade):existing?.tomado_em?getExistingDoseQuantity(existing):status==='taken'?null:existing?.quantidade??undefined;
        return commitPremiumDose({identity:{id:existing?.id??crypto.randomUUID(),user_id:user.id,person_id:safePersonId,medicamento_id:safeMedicamentoId,data:targetDate,horario:existing?.horario??safeHorario},
          expected,status,actualAt:status==='taken'?(safeTakenAt??existing?.tomado_em??timestamp):undefined,
          ignoredReason:motivo?.trim()||existing?.motivo||'nao_realizada',quantity,unit,asOf:timestamp,adjustStock,historicalReview:!adjustStock,requireRegisteredStock,origin:existing?.dose_kind??'scheduled'},existing,medicamento);
        };
        const saved=await write();await authority.assertCurrent();return saved;
      }
    );
    solicitarProcessamentoSync();
    return result;
  },

  // ==========================================================
  // TOMADA AVULSA / SOS
  //
  // Diferente de setStatus(), esta operação SEMPRE cria um
  // novo evento independente.
  // ==========================================================

  async replaceTemporaryCourse({ personId, medicamentoId, course }: {
    personId: string; medicamentoId: string; course: TemporaryCourse | null;
  }): Promise<{ scheduled: number; cancelled: number }> {
    const safePersonId = requirePersonId(personId);
    const safeMedicamentoId = requireMedicamentoId(medicamentoId);
    const user = await requireAuthenticatedUser();
    // M137: o curso contém inclusive horários já passados, sem assumir desfecho.
    // Alertas nativos continuam filtrando somente os horários futuros.
    const desired = course ? temporaryCourseSlots(course) : [];
    const reason = course ? temporaryCourseNote(course) : "";
    const authority=await prepareMacro02ClinicalWrite(user.id);
    const result=await runMacro02ResidualWrite(authority,user.id,[db.doseLogs, db.medicamentos, db.syncQueue], async () => {
      await authority.assertCurrent();
      const medication = await getMedicamentoForPerson(safeMedicamentoId, safePersonId, user.id);
      if (medication.tipo_uso === "continuo" && course) throw new Error("Selecione uso temporário para um tratamento de duração definida.");
      const rows = (await db.doseLogs.where("person_id").equals(safePersonId).toArray())
        .filter(row => row.medicamento_id === safeMedicamentoId && row.user_id === user.id && row.dose_kind !== "sos" && row.dose_kind !== "extra");
      const oldPending = rows.filter(row => row.id && row.dose_kind === "planned" && row.motivo?.startsWith(TEMPORARY_COURSE_PREFIX) &&
        !row.tomado_em && !row.ignorado_em);
      if((authority.writer==='legacy'&&(medication.estoque_ciclo_id!=null||('macro02_stock_managed' in medication&&medication.macro02_stock_managed===true)))||oldPending.some(row=>hasPremiumEvidence(row)))throw Error('Planejamento com evidência Premium exige revisão de autoridade.');
      const oldBySlot = new Map(oldPending.map(row => [`${row.data}T${row.horario}`, row]));
      if (oldBySlot.size !== oldPending.length) throw new Error("Há agendamentos duplicados no período. Revise-os antes de continuar.");
      // Não converter tomadas/ignoradas históricas em slots novos nem reaplicar consumo.
      const resolved = rows.filter(row => Boolean(row.tomado_em || row.ignorado_em));
      const settledBySlot = new Set(resolved.filter(row => row.dose_kind === "planned" && row.motivo?.startsWith(TEMPORARY_COURSE_PREFIX))
        .map(row => `${row.data}T${row.horario}`));
      const desiredKeys = new Set(desired.map(slot => `${slot.date}T${slot.time}`));
      for (const key of desiredKeys) {
        // Um evento real não associado ao curso não é reclassificado silenciosamente.
        if (rows.some(row => `${row.data}T${row.horario}` === key && !oldBySlot.has(key) && !settledBySlot.has(key)))
          throw new Error(`Já existe um registro neste horário (${key}). Confira o histórico antes de alterar o período.`);
      }
      let cancelled = 0, scheduled = 0;
      for (const row of oldPending) {
        const key = `${row.data}T${row.horario}`;
        if (desiredKeys.has(key)) {
          const targetQuantity = resolveDoseQuantity(medication, course?.quantityPerDose);
          if (row.motivo !== reason || row.quantidade !== targetQuantity) {
            await db.doseLogs.update(row.id!, { motivo: reason, quantidade: targetQuantity, updated_at: new Date().toISOString(), synced: false });
            const updated = await db.doseLogs.get(row.id!);
            if (updated) await enfileirarOperacao("doseLogs", "update", updated,{dispatchSync:false});
          }
          continue;
        }
        await db.doseLogs.delete(row.id!);
        await enfileirarOperacao("doseLogs", "delete", { id: row.id!, person_id: safePersonId, user_id: user.id },{dispatchSync:false});
        cancelled++;
      }
      for (const slot of desired) {
        if (oldBySlot.has(`${slot.date}T${slot.time}`) || settledBySlot.has(`${slot.date}T${slot.time}`)) continue;
        const timestamp = new Date().toISOString();
        const log: DoseLog = { id: crypto.randomUUID(), user_id: user.id, person_id: safePersonId,
          medicamento_id: safeMedicamentoId, data: slot.date, horario: slot.time,
          quantidade: resolveDoseQuantity(medication, course?.quantityPerDose), dose_kind: "planned", motivo: reason,
          tomado_em: undefined, ignorado_em: undefined, created_at: timestamp, updated_at: timestamp, synced: false };
        await db.doseLogs.add(log);
        await enfileirarOperacao("doseLogs", "add", log,{dispatchSync:false});
        scheduled++;
      }
      await authority.assertCurrent();return { scheduled, cancelled };
    },'planned-dose');
    solicitarProcessamentoSync();return result;
  },

  async agendarDoseAvulsa({
    personId,
    medicamentoId,
    data,
    horario,
    quantidade,
    motivo,
  }: AgendarDoseAvulsaInput): Promise<string> {
    const safePersonId = requirePersonId(personId);
    const safeMedicamentoId = requireMedicamentoId(medicamentoId);
    const safeHorario = requireHorario(horario);
    const targetDate = requireDate(data);
    const scheduledAt = new Date(`${targetDate}T${safeHorario}:00`);

    if (!Number.isFinite(scheduledAt.getTime()) || scheduledAt.getTime() <= Date.now()) {
      throw new Error("Escolha um horário futuro para agendar a dose.");
    }

    const user = await requireAuthenticatedUser();

    const authority=await prepareMacro02ClinicalWrite(user.id);
    const result=await runMacro02ResidualWrite(authority,user.id,[db.doseLogs, db.medicamentos, db.syncQueue], async () => {
      await authority.assertCurrent();
      const medicamento = await getMedicamentoForPerson(
        safeMedicamentoId,
        safePersonId,
        user.id
      );
      if((authority.writer==='legacy'&&(medicamento.estoque_ciclo_id!=null||('macro02_stock_managed' in medicamento&&medicamento.macro02_stock_managed===true))))throw Error('Planejamento com estoque Premium exige revisão de autoridade.');
      const existing = await getDoseLogForSlot(
        safeMedicamentoId,
        safePersonId,
        targetDate,
        safeHorario,
        user.id
      );

      if (existing) {
        throw new Error("Já existe uma dose registrada ou agendada nesse horário.");
      }

      const timestamp = new Date().toISOString();
      const id = crypto.randomUUID();
      const fullLog: DoseLog = {
        id,
        user_id: user.id,
        person_id: safePersonId,
        medicamento_id: safeMedicamentoId,
        data: targetDate,
        horario: safeHorario,
        quantidade: resolveDoseQuantity(medicamento, quantidade),
        dose_kind: "planned",
        motivo: motivo?.trim() || undefined,
        tomado_em: undefined,
        ignorado_em: undefined,
        created_at: timestamp,
        updated_at: timestamp,
        synced: false,
      };

      await db.doseLogs.add(fullLog);
      const saved = await db.doseLogs.get(id);
      if (!saved || saved.person_id !== safePersonId) {
        throw new Error("Não foi possível confirmar o agendamento da dose.");
      }
      await enfileirarOperacao("doseLogs", "add", saved,{dispatchSync:false});

      // Agendar nunca altera o estoque. O consumo acontece somente
      // quando a pessoa confirma a tomada.
      await authority.assertCurrent();return id;
    },'planned-dose');
    solicitarProcessamentoSync();return result;
  },

  async registrarTomadaAvulsa({
    personId,
    medicamentoId,
    data,
    horario,
    quantidade,
    doseKind = "sos",
    motivo, unit, tomadoEm, adjustStock=true,
  }: RegistrarTomadaAvulsaInput): Promise<string> {
    const safePersonId =
      requirePersonId(
        personId
      );

    const safeMedicamentoId =
      requireMedicamentoId(
        medicamentoId
      );

    const safeHorario =
      requireHorario(
        horario
      );

    const targetDate =
      requireDate(
        data
      );

    const user =
      await requireAuthenticatedUser();

    const authority=await prepareMacro02ClinicalWrite(user.id);
    const result = await db.transaction(
      "rw",
      [
        db.doseLogs,
        db.medicamentos,
        db.syncQueue,
      ],
      async () => {
        await authority.assertCurrent();
        const write=async()=>{
        const medicamento =
          await getMedicamentoForPerson(
            safeMedicamentoId,
            safePersonId,
            user.id
          );

        if(targetDate!==getLocalTodayISO()&&!tomadoEm)throw Error('Informe o instante real da tomada avulsa histórica.');
        if(authority.writer==='legacy')return commitDormantLegacyDose({identity:{id:crypto.randomUUID(),user_id:user.id,person_id:safePersonId,medicamento_id:safeMedicamentoId,data:targetDate,horario:safeHorario},expected:null,status:'taken',actualAt:normalizeTakenAt(tomadoEm)??new Date().toISOString(),quantity:quantidade,unit,note:motivo,asOf:new Date().toISOString(),adjustStock,origin:doseKind},undefined,medicamento);
        const doseQuantity=quantidade===undefined?undefined:normalizePositiveQuantity(quantidade);
        if(adjustStock&&readDoseUnit(unit??{}).state!=='known')throw Error('Confira a unidade administrada antes de movimentar o estoque.');
        const timestamp=new Date().toISOString();
        if(targetDate!==getLocalTodayISO()&&!tomadoEm)throw Error('Informe o instante real da tomada avulsa histórica.');
        return commitPremiumDose({identity:{id:crypto.randomUUID(),user_id:user.id,person_id:safePersonId,medicamento_id:safeMedicamentoId,data:targetDate,horario:safeHorario},expected:null,status:'taken',actualAt:normalizeTakenAt(tomadoEm)??timestamp,quantity:doseQuantity,unit,note:motivo,asOf:timestamp,adjustStock,historicalReview:!adjustStock,origin:doseKind},undefined,medicamento);
        };
        const saved=await write();await authority.assertCurrent();return saved;
      }
    );
    solicitarProcessamentoSync();
    return result;
  },

  // ==========================================================
  // REMOÇÃO POR ID
  //
  // Operação canônica para remover um evento já persistido.
  //
  // Foi criada especialmente para evitar que telas façam:
  //
  // db.doseLogs.delete(...)
  //
  // diretamente.
  //
  // Isso é essencial para doses avulsas/SOS, porque a exclusão
  // precisa:
  //
  // 1. validar ownership;
  // 2. recuperar a quantidade HISTÓRICA;
  // 3. restaurar o estoque quando calculável;
  // 4. remover o DoseLog;
  // 5. enfileirar DELETE para o remoto.
  //
  // Também é segura para um DoseLog programado caso algum fluxo
  // legítimo precise remover pelo id.
  // ==========================================================

  async removeById({
    personId,
    id, adjustStock=true, expected,
  }: RemoveDoseLogByIdInput): Promise<string> {
    const safePersonId =
      requirePersonId(
        personId
      );

    const safeId =
      requireDoseLogId(
        id
      );

    const user =
      await requireAuthenticatedUser();

    const authority=await prepareMacro02ClinicalWrite(user.id);
    const result = await db.transaction(
      "rw",
      [
        db.doseLogs,
        db.medicamentos,
        db.syncQueue,
      ],
      async () => {
        await authority.assertCurrent();
        const write=async()=>{
        const existing =
          await db.doseLogs.get(
            safeId
          );

        if (
          !existing ||
          existing.person_id !==
            safePersonId
        ) {
          throw new Error(
            "Registro de dose não encontrado para a pessoa ativa."
          );
        }

        if (
          existing.user_id &&
          existing.user_id !==
            user.id
        ) {
          throw new Error(
            "Registro de dose não pertence ao usuário autenticado."
          );
        }

        const safeMedicamentoId =
          requireMedicamentoId(
            existing.medicamento_id
          );

        const medicamento =
          await getMedicamentoForPerson(
            safeMedicamentoId,
            safePersonId,
            user.id
          );

        if(authority.writer==='legacy')return commitDormantLegacyDose({identity:{id:safeId,user_id:user.id,person_id:safePersonId,medicamento_id:safeMedicamentoId,data:existing.data,horario:existing.horario},expected,status:'clear',asOf:new Date().toISOString(),adjustStock,origin:existing.dose_kind},existing,medicamento);
        if(hasPremiumEvidence(existing)||Boolean(existing.tomado_em)||Boolean(existing.ignorado_em)||expected!==undefined){
          return commitPremiumDose({identity:{id:safeId,user_id:user.id,person_id:safePersonId,medicamento_id:safeMedicamentoId,data:existing.data,horario:existing.horario},expected,status:'clear',asOf:new Date().toISOString(),adjustStock,historicalReview:!adjustStock,origin:existing.dose_kind},existing,medicamento);
        }
        // Unresolved planning record only: no factual dose or stock movement.
        await db.doseLogs.delete(safeId);
        await enfileirarOperacao('doseLogs','delete',{id:safeId,person_id:safePersonId,user_id:user.id},{dispatchSync:false});
        return safeId;
        };
        const saved=await write();await authority.assertCurrent();return saved;
      }
    );
    solicitarProcessamentoSync();
    return result;
  },
};
