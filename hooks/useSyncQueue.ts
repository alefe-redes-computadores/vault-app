// hooks/useSyncQueue.ts

"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import type {
  Table,
  UpdateSpec,
} from "dexie";

import {
  db,
} from "@/lib/db";

import {
  supabase,
} from "@/lib/supabase/client";

import type {
  AppSettings,
  BankCard,
  Cid,
  Cirurgia,
  Consulta,
  Credential,
  Document,
  DoseLog,
  Exame,
  Farmacia,
  Hospital,
  InstituicaoEnsino,
  LocalSaude,
  Medicamento,
  Medico,
  Person,
  RegistroSaude,
  Renovacao,
  SyncQueueItem,
  Tratamento,
  Vault,
  VaultMember,
} from "@/lib/types";

// ============================================================
// CONSTANTES
// ============================================================

const MAX_RETRIES =
  5;

const MAX_BACKOFF_MS =
  60_000;

// ============================================================
// TRAVA GLOBAL
// ============================================================

let globalProcessingPromise:
  Promise<SyncProcessResult> | null =
  null;

// ============================================================
// TIPOS
// ============================================================

type SyncLogType =
  | "info"
  | "success"
  | "error";

interface SyncLog {
  time: string;
  message: string;
  type: SyncLogType;
}

export interface SyncProcessResult {
  processed: number;
  succeeded: number;
  failed: number;
  remaining: number;
  permanentlyFailed: number;
  offline: boolean;
}

interface AnexoClinico {
  id?: string;

  user_id?: string;
  person_id?: string;

  tratamento_id?: string;
  medicamento_id?: string;

  nome?: string;
  titulo?: string;

  tipo?: string;
  url?: string;

  thumbnail_url?: string;
  tags?: string[];

  created_at?: string;
  updated_at?: string;

  synced?: boolean;
}

type SyncableLocalRecord = {
  id?: string;
  updated_at?: string;
  synced?: boolean;
};

// ============================================================
// HELPERS
// ============================================================

function emptySyncResult(
  overrides:
    Partial<SyncProcessResult> = {}
): SyncProcessResult {
  return {
    processed:
      0,

    succeeded:
      0,

    failed:
      0,

    remaining:
      0,

    permanentlyFailed:
      0,

    offline:
      false,

    ...overrides,
  };
}

function requirePayloadId(
  item: SyncQueueItem
): string {
  const payload =
    item.payload as unknown as {
      id?: string;
    };

  const id =
    payload.id?.trim();

  if (!id) {
    throw new Error(
      `Item da fila "${item.table}" sem id válido.`
    );
  }

  return id;
}

function requirePersonId(
  value: string | undefined,
  entity: string,
  id?: string
): string {
  const normalized =
    value?.trim();

  if (!normalized) {
    throw new Error(
      `${entity}${id ? ` ${id}` : ""} sem person_id.`
    );
  }

  return normalized;
}

function requireUserId(
  value: string | undefined,
  entity: string,
  id?: string
): string {
  const normalized =
    value?.trim();

  if (!normalized) {
    throw new Error(
      `${entity}${id ? ` ${id}` : ""} sem user_id.`
    );
  }

  return normalized;
}

// ============================================================
// COMPONENTE / HOOK
// ============================================================

export function useSyncQueue() {
  const [
    isProcessing,
    setIsProcessing,
  ] =
    useState(false);

  const [
    isOnline,
    setIsOnline,
  ] =
    useState(
      () =>
        typeof navigator !==
        "undefined"
          ? navigator.onLine
          : false
    );

  const [
    syncLogs,
    setSyncLogs,
  ] =
    useState<SyncLog[]>(
      []
    );

  const timeoutRef =
    useRef<
      ReturnType<
        typeof setTimeout
      > | null
    >(null);

  // ============================================================
  // LOGS
  // ============================================================

  const addLog =
    useCallback(
      (
        message: string,
        type:
          SyncLogType =
          "info"
      ) => {
        const time =
          new Date()
            .toLocaleTimeString();

        setSyncLogs(
          (
            prev
          ) => {
            const next =
              [
                {
                  time,
                  message,
                  type,
                },
                ...prev,
              ];

            return next.slice(
              0,
              50
            );
          }
        );
      },
      []
    );

  const clearLogs =
    useCallback(
      () => {
        setSyncLogs(
          []
        );
      },
      []
    );

  // ============================================================
  // ESTADO GLOBAL DO SYNC
  // ============================================================

  useEffect(
    () => {
      const handleStart =
        () => {
          setIsProcessing(
            true
          );
        };

      const handleEnd =
        () => {
          setIsProcessing(
            false
          );
        };

      window.addEventListener(
        "sync:start",
        handleStart
      );

      window.addEventListener(
        "sync:end",
        handleEnd
      );

      return () => {
        window.removeEventListener(
          "sync:start",
          handleStart
        );

        window.removeEventListener(
          "sync:end",
          handleEnd
        );
      };
    },
    []
  );

  // ============================================================
  // ONLINE / OFFLINE
  // ============================================================

  useEffect(
    () => {
      const handleOnline =
        () => {
          setIsOnline(
            true
          );
        };

      const handleOffline =
        () => {
          setIsOnline(
            false
          );
        };

      window.addEventListener(
        "online",
        handleOnline
      );

      window.addEventListener(
        "offline",
        handleOffline
      );

      return () => {
        window.removeEventListener(
          "online",
          handleOnline
        );

        window.removeEventListener(
          "offline",
          handleOffline
        );

        if (
          timeoutRef.current
        ) {
          clearTimeout(
            timeoutRef.current
          );

          timeoutRef.current =
            null;
        }
      };
    },
    []
  );

  // ============================================================
  // SUPABASE
  // ============================================================

  const requireSupabase =
    () => {
      if (
        !supabase
      ) {
        throw new Error(
          "Cliente Supabase indisponível."
        );
      }

      return supabase;
    };

  // ============================================================
  // MARCAR REGISTRO LOCAL COMO SYNCED
  // ============================================================

  const markRecordSyncedIfCurrent =
    async <
      T extends
        SyncableLocalRecord
    >(
      table:
        Table<
          T,
          string
        >,
      id: string,
      expectedUpdatedAt?: string
    ) => {
      const current =
        await table.get(
          id
        );

      if (
        !current
      ) {
        return;
      }

      if (
        expectedUpdatedAt &&
        current.updated_at &&
        current.updated_at !==
          expectedUpdatedAt
      ) {
        return;
      }

      await table.update(
        id,
        {
          synced:
            true,
        } as unknown as UpdateSpec<T>
      );
    };

  // ============================================================
  // JUNÇÕES N:N
  // ============================================================

  const syncMedicamentoTratamentos =
    async (
      medicamentoId: string,
      tratamentoIds: string[]
    ) => {
      const client =
        requireSupabase();

      const {
        error:
          deleteError,
      } =
        await client
          .from(
            "medicamento_tratamentos"
          )
          .delete()
          .eq(
            "medicamento_id",
            medicamentoId
          );

      if (
        deleteError
      ) {
        throw new Error(
          `medicamento_tratamentos delete error: ${deleteError.message}`
        );
      }

      const uniqueIds =
        Array.from(
          new Set(
            tratamentoIds.filter(
              Boolean
            )
          )
        );

      if (
        uniqueIds.length ===
        0
      ) {
        return;
      }

      const rows =
        uniqueIds.map(
          (
            tratamentoId
          ) => ({
            medicamento_id:
              medicamentoId,

            tratamento_id:
              tratamentoId,
          })
        );

      const {
        error:
          insertError,
      } =
        await client
          .from(
            "medicamento_tratamentos"
          )
          .insert(
            rows
          );

      if (
        insertError
      ) {
        throw new Error(
          `medicamento_tratamentos insert error: ${insertError.message}`
        );
      }
    };

  const syncTratamentoCids =
    async (
      tratamentoId: string,
      cidIds: string[]
    ) => {
      const client =
        requireSupabase();

      const {
        error:
          deleteError,
      } =
        await client
          .from(
            "tratamento_cids"
          )
          .delete()
          .eq(
            "tratamento_id",
            tratamentoId
          );

      if (
        deleteError
      ) {
        throw new Error(
          `tratamento_cids delete error: ${deleteError.message}`
        );
      }

      const uniqueIds =
        Array.from(
          new Set(
            cidIds.filter(
              Boolean
            )
          )
        );

      if (
        uniqueIds.length ===
        0
      ) {
        return;
      }

      const rows =
        uniqueIds.map(
          (
            cidId
          ) => ({
            tratamento_id:
              tratamentoId,

            cid_id:
              cidId,
          })
        );

      const {
        error:
          insertError,
      } =
        await client
          .from(
            "tratamento_cids"
          )
          .insert(
            rows
          );

      if (
        insertError
      ) {
        throw new Error(
          `tratamento_cids insert error: ${insertError.message}`
        );
      }
    };

  const syncExameTratamentos =
    async (
      exameId: string,
      tratamentoIds: string[]
    ) => {
      const client =
        requireSupabase();

      const {
        error:
          deleteError,
      } =
        await client
          .from(
            "exame_tratamentos"
          )
          .delete()
          .eq(
            "exame_id",
            exameId
          );

      if (
        deleteError
      ) {
        throw new Error(
          `exame_tratamentos delete error: ${deleteError.message}`
        );
      }

      const uniqueIds =
        Array.from(
          new Set(
            tratamentoIds.filter(
              Boolean
            )
          )
        );

      if (
        uniqueIds.length ===
        0
      ) {
        return;
      }

      const rows =
        uniqueIds.map(
          (
            tratamentoId
          ) => ({
            exame_id:
              exameId,

            tratamento_id:
              tratamentoId,
          })
        );

      const {
        error:
          insertError,
      } =
        await client
          .from(
            "exame_tratamentos"
          )
          .insert(
            rows
          );

      if (
        insertError
      ) {
        throw new Error(
          `exame_tratamentos insert error: ${insertError.message}`
        );
      }
    };

  const syncExameCids =
    async (
      exameId: string,
      cidIds: string[]
    ) => {
      const client =
        requireSupabase();

      const {
        error:
          deleteError,
      } =
        await client
          .from(
            "exame_cids"
          )
          .delete()
          .eq(
            "exame_id",
            exameId
          );

      if (
        deleteError
      ) {
        throw new Error(
          `exame_cids delete error: ${deleteError.message}`
        );
      }

      const uniqueIds =
        Array.from(
          new Set(
            cidIds.filter(
              Boolean
            )
          )
        );

      if (
        uniqueIds.length ===
        0
      ) {
        return;
      }

      const rows =
        uniqueIds.map(
          (
            cidId
          ) => ({
            exame_id:
              exameId,

            cid_id:
              cidId,
          })
        );

      const {
        error:
          insertError,
      } =
        await client
          .from(
            "exame_cids"
          )
          .insert(
            rows
          );

      if (
        insertError
      ) {
        throw new Error(
          `exame_cids insert error: ${insertError.message}`
        );
      }
    };

  // ============================================================
  // PERSONS
  // ============================================================

  const syncPerson =
    async (
      item:
        SyncQueueItem
    ) => {
      const client =
        requireSupabase();

      const person =
        item.payload as unknown as Person;

      switch (
        item.operation
      ) {
        case "add":
        case "update": {
          const {
            error,
          } =
            await client
              .from(
                "persons"
              )
              .upsert(
                {
                  id:
                    person.id,

                  user_id:
                    person.user_id,

                  name:
                    person.name,

                  email:
                    person.email ||
                    null,

                  phone:
                    person.phone ||
                    null,

                  avatar_url:
                    person.avatar_url ||
                    null,

                  color:
                    person.color ||
                    "#60A5FA",

                  is_default:
                    person.isDefault ||
                    false,

                  created_at:
                    person.created_at,

                  updated_at:
                    person.updated_at,
                },
                {
                  onConflict:
                    "id",
                }
              );

          if (
            error
          ) {
            throw new Error(
              `Persons upsert error: ${error.message}`
            );
          }

          break;
        }

        case "delete": {
          const id =
            requirePayloadId(
              item
            );

          const {
            error,
          } =
            await client
              .from(
                "persons"
              )
              .delete()
              .eq(
                "id",
                id
              );

          if (
            error
          ) {
            throw new Error(
              `Persons delete error: ${error.message}`
            );
          }

          break;
        }

        default:
          throw new Error(
            `Operação não suportada em persons: ${item.operation}`
          );
      }
    };

  // ============================================================
  // MÉDICOS
  // ============================================================

  const syncMedico =
    async (
      item:
        SyncQueueItem
    ) => {
      const client =
        requireSupabase();

      const medico =
        item.payload as unknown as Medico;

      switch (
        item.operation
      ) {
        case "add":
        case "update": {
          const {
            error,
          } =
            await client
              .from(
                "medicos"
              )
              .upsert(
                {
                  id:
                    medico.id,

                  user_id:
                    medico.user_id,

                  nome:
                    medico.nome,

                  especialidade:
                    medico.especialidade ||
                    null,

                  crm:
                    medico.crm ||
                    null,

                  telefone:
                    medico.telefone ||
                    null,

                  email:
                    medico.email ||
                    null,

                  observacoes:
                    medico.observacoes ||
                    null,

                  created_at:
                    medico.created_at,

                  updated_at:
                    medico.updated_at,
                },
                {
                  onConflict:
                    "id",
                }
              );

          if (
            error
          ) {
            throw new Error(
              `Medicos upsert error: ${error.message}`
            );
          }

          break;
        }

        case "delete": {
          const id =
            requirePayloadId(
              item
            );

          const {
            error,
          } =
            await client
              .from(
                "medicos"
              )
              .delete()
              .eq(
                "id",
                id
              );

          if (
            error
          ) {
            throw new Error(
              `Medicos delete error: ${error.message}`
            );
          }

          break;
        }

        default:
          throw new Error(
            `Operação não suportada em medicos: ${item.operation}`
          );
      }
    };

  // ============================================================
  // FARMÁCIAS
  // ============================================================

  const syncFarmacia =
    async (
      item:
        SyncQueueItem
    ) => {
      const client =
        requireSupabase();

      const farmacia =
        item.payload as unknown as Farmacia;

      switch (
        item.operation
      ) {
        case "add":
        case "update": {
          const {
            error,
          } =
            await client
              .from(
                "farmacias"
              )
              .upsert(
                {
                  id:
                    farmacia.id,

                  user_id:
                    farmacia.user_id,

                  nome:
                    farmacia.nome,

                  endereco:
                    farmacia.endereco ||
                    null,

                  telefone:
                    farmacia.telefone ||
                    null,

                  observacoes:
                    farmacia.observacoes ||
                    null,

                  tipo:
                    farmacia.tipo ||
                    null,

                  is_sus:
                    farmacia.is_sus ??
                    false,

                  created_at:
                    farmacia.created_at,

                  updated_at:
                    farmacia.updated_at,
                },
                {
                  onConflict:
                    "id",
                }
              );

          if (
            error
          ) {
            throw new Error(
              `Farmacias upsert error: ${error.message}`
            );
          }

          break;
        }

        case "delete": {
          const id =
            requirePayloadId(
              item
            );

          const {
            error,
          } =
            await client
              .from(
                "farmacias"
              )
              .delete()
              .eq(
                "id",
                id
              );

          if (
            error
          ) {
            throw new Error(
              `Farmacias delete error: ${error.message}`
            );
          }

          break;
        }

        default:
          throw new Error(
            `Operação não suportada em farmacias: ${item.operation}`
          );
      }
    };

  // ============================================================
  // HOSPITAIS
  // ============================================================

  const syncHospital =
    async (
      item:
        SyncQueueItem
    ) => {
      const client =
        requireSupabase();

      const hospital =
        item.payload as unknown as Hospital;

      switch (
        item.operation
      ) {
        case "add":
        case "update": {
          const {
            error,
          } =
            await client
              .from(
                "hospitais"
              )
              .upsert(
                {
                  id:
                    hospital.id,

                  user_id:
                    hospital.user_id,

                  nome:
                    hospital.nome,

                  endereco:
                    hospital.endereco ||
                    null,

                  telefone:
                    hospital.telefone ||
                    null,

                  tipo:
                    hospital.tipo ||
                    null,

                  observacoes:
                    hospital.observacoes ||
                    null,

                  medico_ids:
                    hospital.medico_ids ||
                    [],

                  created_at:
                    hospital.created_at,

                  updated_at:
                    hospital.updated_at,
                },
                {
                  onConflict:
                    "id",
                }
              );

          if (
            error
          ) {
            throw new Error(
              `Hospitais upsert error: ${error.message}`
            );
          }

          break;
        }

        case "delete": {
          const id =
            requirePayloadId(
              item
            );

          const {
            error,
          } =
            await client
              .from(
                "hospitais"
              )
              .delete()
              .eq(
                "id",
                id
              );

          if (
            error
          ) {
            throw new Error(
              `Hospitais delete error: ${error.message}`
            );
          }

          break;
        }

        default:
          throw new Error(
            `Operação não suportada em hospitais: ${item.operation}`
          );
      }
    };

  // ============================================================
  // LOCAIS
  // ============================================================

  const syncLocal =
    async (
      item:
        SyncQueueItem
    ) => {
      const client =
        requireSupabase();

      const local =
        item.payload as unknown as LocalSaude;

      switch (
        item.operation
      ) {
        case "add":
        case "update": {
          const {
            error,
          } =
            await client
              .from(
                "locais"
              )
              .upsert(
                {
                  id:
                    local.id,

                  user_id:
                    local.user_id,

                  nome:
                    local.nome,

                  endereco:
                    local.endereco ||
                    null,

                  telefone:
                    local.telefone ||
                    null,

                  tipo:
                    local.tipo ||
                    null,

                  observacoes:
                    local.observacoes ||
                    null,

                  medico_ids:
                    local.medico_ids ||
                    [],

                  created_at:
                    local.created_at,

                  updated_at:
                    local.updated_at,
                },
                {
                  onConflict:
                    "id",
                }
              );

          if (
            error
          ) {
            throw new Error(
              `Locais upsert error: ${error.message}`
            );
          }

          break;
        }

        case "delete": {
          const id =
            requirePayloadId(
              item
            );

          const {
            error,
          } =
            await client
              .from(
                "locais"
              )
              .delete()
              .eq(
                "id",
                id
              );

          if (
            error
          ) {
            throw new Error(
              `Locais delete error: ${error.message}`
            );
          }

          break;
        }

        default:
          throw new Error(
            `Operação não suportada em locais: ${item.operation}`
          );
      }
    };

  // ============================================================
  // INSTITUIÇÕES
  // ============================================================

  const syncInstituicao =
    async (
      item:
        SyncQueueItem
    ) => {
      const client =
        requireSupabase();

      const instituicao =
        item.payload as unknown as InstituicaoEnsino;

      switch (
        item.operation
      ) {
        case "add":
        case "update": {
          const {
            error,
          } =
            await client
              .from(
                "instituicoes"
              )
              .upsert(
                {
                  id:
                    instituicao.id,

                  user_id:
                    instituicao.user_id,

                  nome:
                    instituicao.nome,

                  cnpj:
                    instituicao.cnpj ||
                    null,

                  created_at:
                    instituicao.created_at,

                  updated_at:
                    instituicao.updated_at,
                },
                {
                  onConflict:
                    "id",
                }
              );

          if (
            error
          ) {
            throw new Error(
              `Instituicoes upsert error: ${error.message}`
            );
          }

          break;
        }

        case "delete": {
          const id =
            requirePayloadId(
              item
            );

          const {
            error,
          } =
            await client
              .from(
                "instituicoes"
              )
              .delete()
              .eq(
                "id",
                id
              );

          if (
            error
          ) {
            throw new Error(
              `Instituicoes delete error: ${error.message}`
            );
          }

          break;
        }

        default:
          throw new Error(
            `Operação não suportada em instituicoes: ${item.operation}`
          );
      }
    };

  // ============================================================
  // CIDS
  // ============================================================

  const syncCid =
    async (
      item:
        SyncQueueItem
    ) => {
      const client =
        requireSupabase();

      const cid =
        item.payload as unknown as Cid;

      switch (
        item.operation
      ) {
        case "add":
        case "update": {
          requirePersonId(
            cid.person_id,
            "CID",
            cid.id
          );

          const {
            error,
          } =
            await client
              .from(
                "cids"
              )
              .upsert(
                {
                  id:
                    cid.id,

                  user_id:
                    cid.user_id,

                  person_id:
                    cid.person_id,

                  codigo:
                    cid.codigo,

                  descricao:
                    cid.descricao,

                  data_diagnostico:
                    cid.data_diagnostico ||
                    null,

                  medico_id:
                    cid.medico_id ||
                    null,

                  hospital_id:
                    cid.hospital_id ||
                    null,

                  local_id:
                    cid.local_id ||
                    null,

                  observacoes:
                    cid.observacoes ||
                    null,

                  anexo_url:
                    cid.anexo_url ||
                    null,

                  created_at:
                    cid.created_at,

                  updated_at:
                    cid.updated_at,
                },
                {
                  onConflict:
                    "id",
                }
              );

          if (
            error
          ) {
            throw new Error(
              `Cids upsert error: ${error.message}`
            );
          }

          break;
        }

        case "delete": {
          const id =
            requirePayloadId(
              item
            );

          const {
            error,
          } =
            await client
              .from(
                "cids"
              )
              .delete()
              .eq(
                "id",
                id
              );

          if (
            error
          ) {
            throw new Error(
              `Cids delete error: ${error.message}`
            );
          }

          break;
        }

        default:
          throw new Error(
            `Operação não suportada em cids: ${item.operation}`
          );
      }
    };

  // ============================================================
  // TRATAMENTOS
  // ============================================================

  const syncTratamento =
    async (
      item:
        SyncQueueItem
    ) => {
      const client =
        requireSupabase();

      const tratamento =
        item.payload as unknown as Tratamento;

      switch (
        item.operation
      ) {
        case "add":
        case "update": {
          requirePersonId(
            tratamento.person_id,
            "Tratamento",
            tratamento.id
          );

          const {
            error,
          } =
            await client
              .from(
                "tratamentos"
              )
              .upsert(
                {
                  id:
                    tratamento.id,

                  user_id:
                    tratamento.user_id,

                  person_id:
                    tratamento.person_id,

                  nome:
                    tratamento.nome,

                  status:
                    tratamento.status,

                  cor:
                    tratamento.cor ||
                    "#8B5CF6",

                  observacoes:
                    tratamento.observacoes ||
                    null,

                  medico_ids:
                    tratamento.medico_ids ||
                    [],

                  hospital_ids:
                    tratamento.hospital_ids ||
                    [],

                  local_ids:
                    tratamento.local_ids ||
                    [],

                  cid_ids:
                    tratamento.cid_ids ||
                    [],

                  created_at:
                    tratamento.created_at,

                  updated_at:
                    tratamento.updated_at,
                },
                {
                  onConflict:
                    "id",
                }
              );

          if (
            error
          ) {
            throw new Error(
              `Tratamentos upsert error: ${error.message}`
            );
          }

          break;
        }

        case "delete": {
          const id =
            requirePayloadId(
              item
            );

          const {
            error,
          } =
            await client
              .from(
                "tratamentos"
              )
              .delete()
              .eq(
                "id",
                id
              );

          if (
            error
          ) {
            throw new Error(
              `Tratamentos delete error: ${error.message}`
            );
          }

          break;
        }

        default:
          throw new Error(
            `Operação não suportada em tratamentos: ${item.operation}`
          );
      }

      if (
        item.operation !==
          "delete" &&
        tratamento.id
      ) {
        await syncTratamentoCids(
          tratamento.id,
          tratamento.cid_ids ||
            []
        );
      }
    };

  // ============================================================
  // MEDICAMENTOS
  // ============================================================

  const syncMedicamento =
    async (
      item:
        SyncQueueItem
    ) => {
      const client =
        requireSupabase();

      const med =
        item.payload as unknown as Medicamento;

      switch (
        item.operation
      ) {
        case "add":
        case "update": {
          const personId =
            requirePersonId(
              med.person_id,
              "Medicamento",
              med.id
            );

          requireUserId(
            med.user_id,
            "Medicamento",
            med.id
          );

          const {
            data:
              remoteRows,
            error,
          } =
            await client
              .from(
                "medicamentos"
              )
              .upsert(
                {
                  id:
                    med.id,

                  user_id:
                    med.user_id,

                  person_id:
                    personId,

                  document_id:
                    med.document_id ||
                    null,

                  medico_id:
                    med.medico_id ||
                    null,

                  farmacia_id:
                    med.farmacia_id ||
                    null,

                  hospital_id:
                    med.hospital_id ||
                    null,

                  local_id:
                    med.local_id ||
                    null,

                  nome:
                    med.nome,

                  dosagem:
                    med.dosagem,

                  medico:
                    med.medico ||
                    "",

                  farmacia:
                    med.farmacia ||
                    null,

                  data_receita:
                    med.data_receita ||
                    null,

                  proxima_renovacao:
                    med.proxima_renovacao ||
                    null,

                  observacoes:
                    med.observacoes ||
                    null,

                  tipo_receita:
                    med.tipo_receita ||
                    "comum",

                  lembrete_receita_modo:
                    med.lembrete_receita_modo ||
                    "automatico",

                  lembrete_receita_data:
                    med.lembrete_receita_data ||
                    null,

                  tipo_uso:
                    med.tipo_uso ||
                    "continuo",

                  forma_farmaceutica:
                    med.forma_farmaceutica ||
                    null,

                  cor_principal:
                    med.cor_principal ||
                    null,

                  cor_secundaria:
                    med.cor_secundaria ||
                    null,

                  status:
                    med.status ||
                    "ativo",

                  estoque_quantidade:
                    med.estoque_quantidade !==
                    undefined
                      ? med.estoque_quantidade
                      : null,

                  estoque_data_referencia:
                    med.estoque_data_referencia ||
                    null,

                  estoque_horarios:
                    med.estoque_horarios ||
                    [],

                  estoque_unidade_por_dose:
                    med.estoque_unidade_por_dose !==
                    undefined
                      ? med.estoque_unidade_por_dose
                      : null,

                  estoque_unidade_medida:
                    med.estoque_unidade_medida ||
                    null,

                  estoque_ml_total:
                    med.estoque_ml_total !==
                    undefined
                      ? med.estoque_ml_total
                      : null,

                  estoque_gotas_por_ml:
                    med.estoque_gotas_por_ml !==
                    undefined
                      ? med.estoque_gotas_por_ml
                      : null,

                  formato:
                    med.formato ||
                    null,

                  cores:
                    med.cores ||
                    [],

                  preco:
                    med.preco !==
                    undefined
                      ? med.preco
                      : null,

                  tipo_aquisicao:
                    med.tipo_aquisicao ||
                    null,

                  data_retorno_sus:
                    med.data_retorno_sus ||
                    null,

                  motivo_descontinuacao:
                    med.motivo_descontinuacao ||
                    null,

                  medico_descontinuacao_id:
                    med.medico_descontinuacao_id ||
                    null,

                  medico_descontinuacao_nome:
                    med.medico_descontinuacao_nome ||
                    null,

                  substituido_por_id:
                    med.substituido_por_id ||
                    null,

                  data_descontinuacao:
                    med.data_descontinuacao ||
                    null,

                  historico_dosagens:
                    med.historico_dosagens ||
                    [],

                  cid_ids:
                    med.cid_ids ||
                    [],

                  created_at:
                    med.created_at,

                  updated_at:
                    med.updated_at,
                },
                {
                  onConflict:
                    "id",
                }
              )
              .select(
                "id"
              );

          if (
            error
          ) {
            throw new Error(
              `Medicamentos upsert error: ${error.message}`
            );
          }

          if (
            !remoteRows ||
            remoteRows.length ===
              0
          ) {
            throw new Error(
              `Medicamento ${med.id} não foi confirmado pelo Supabase após upsert.`
            );
          }

          break;
        }

        case "delete": {
          const id =
            requirePayloadId(
              item
            );

          const {
            error:
              tratamentosError,
          } =
            await client
              .from(
                "medicamento_tratamentos"
              )
              .delete()
              .eq(
                "medicamento_id",
                id
              );

          if (
            tratamentosError
          ) {
            throw new Error(
              `medicamento_tratamentos delete error: ${tratamentosError.message}`
            );
          }

          /*
           * Renovações são histórico clínico/financeiro.
           *
           * Elas permanecem no Supabase mesmo quando o cadastro
           * atual do medicamento é removido. O medicamento_id
           * histórico pode continuar apontando para o UUID antigo;
           * medicamento_nome e medicamento_dosagem preservam a
           * identidade exibível da aquisição.
           */

          const {
            error:
              doseLogsError,
          } =
            await client
              .from(
                "dose_logs"
              )
              .delete()
              .eq(
                "medicamento_id",
                id
              );

          if (
            doseLogsError
          ) {
            throw new Error(
              `Dose_logs cascade delete error: ${doseLogsError.message}`
            );
          }

          const {
            error,
          } =
            await client
              .from(
                "medicamentos"
              )
              .delete()
              .eq(
                "id",
                id
              );

          if (
            error
          ) {
            throw new Error(
              `Medicamentos delete error: ${error.message}`
            );
          }

          break;
        }

        default:
          throw new Error(
            `Operação não suportada em medicamentos: ${item.operation}`
          );
      }

      if (
        item.operation !==
          "delete" &&
        med.id
      ) {
        await syncMedicamentoTratamentos(
          med.id,
          med.tratamento_ids ||
            []
        );
      }
    };

  // ============================================================
  // DOCUMENTOS
  // ============================================================

  const syncDocument =
    async (
      item:
        SyncQueueItem
    ) => {
      const client =
        requireSupabase();

      const doc =
        item.payload as unknown as Document;

      if (
        item.operation !==
        "delete"
      ) {
        requirePersonId(
          doc.person_id,
          "Documento",
          doc.id
        );
      }

      const documentPayload =
        {
          user_id:
            doc.user_id,

          person_id:
            doc.person_id,

          category_id:
            doc.category_id,

          type:
            doc.type,

          title:
            doc.title,

          description:
            doc.description ||
            null,

          metadata:
            doc.metadata ||
            {},

          attachments:
            doc.attachments ||
            [],

          is_favorite:
            doc.is_favorite,

          vault_id:
            doc.vault_id ||
            null,

          hospital_id:
            doc.hospital_id ||
            null,

          medico_id:
            doc.medico_id ||
            null,

          entidade_tipo:
            doc.entidade_tipo ||
            null,

          entidade_id:
            doc.entidade_id ||
            null,

          created_at:
            doc.created_at,

          updated_at:
            doc.updated_at,
        };

      switch (
        item.operation
      ) {
        case "add": {
          if (
            !doc.id
          ) {
            throw new Error(
              "Documento sem id."
            );
          }

          const {
            error,
          } =
            await client
              .from(
                "documents"
              )
              .upsert(
                {
                  id:
                    doc.id,

                  ...documentPayload,
                },
                {
                  onConflict:
                    "id",
                }
              );

          if (
            error
          ) {
            throw new Error(
              `Documents add error: ${error.message}`
            );
          }

          break;
        }

        case "update": {
          if (
            !doc.id
          ) {
            throw new Error(
              "Documento sem id."
            );
          }

          const {
            data:
              updatedRows,
            error,
          } =
            await client
              .from(
                "documents"
              )
              .update(
                documentPayload
              )
              .eq(
                "id",
                doc.id
              )
              .select(
                "id"
              );

          if (
            error
          ) {
            throw new Error(
              `Documents update error: ${error.message}`
            );
          }

          if (
            !updatedRows ||
            updatedRows.length ===
              0
          ) {
            throw new Error(
              `Documents update não alterou nenhuma linha: ${doc.id}`
            );
          }

          break;
        }

        case "delete": {
          const id =
            requirePayloadId(
              item
            );

          const {
            error,
          } =
            await client
              .from(
                "documents"
              )
              .delete()
              .eq(
                "id",
                id
              );

          if (
            error
          ) {
            throw new Error(
              `Documents delete error: ${error.message}`
            );
          }

          break;
        }

        default:
          throw new Error(
            `Operação não suportada em documents: ${item.operation}`
          );
      }
    };

  // ============================================================
  // EXAMES
  // ============================================================

  const syncExame =
    async (
      item:
        SyncQueueItem
    ) => {
      const client =
        requireSupabase();

      const exame =
        item.payload as unknown as Exame;

      switch (
        item.operation
      ) {
        case "add":
        case "update": {
          requirePersonId(
            exame.person_id,
            "Exame",
            exame.id
          );

          const {
            error,
          } =
            await client
              .from(
                "exames"
              )
              .upsert(
                {
                  id:
                    exame.id,

                  user_id:
                    exame.user_id,

                  person_id:
                    exame.person_id,

                  document_id:
                    exame.document_id ||
                    null,

                  medico_id:
                    exame.medico_id ||
                    null,

                  local_id:
                    exame.local_id ||
                    null,

                  laboratorio:
                    exame.laboratorio ||
                    null,

                  medico:
                    exame.medico ||
                    null,

                  nome:
                    exame.nome,

                  data:
                    exame.data,

                  horario:
                    exame.horario ||
                    null,

                  data_retorno:
                    exame.data_retorno ||
                    null,

                  motivo:
                    exame.motivo ||
                    null,

                  observacoes:
                    exame.observacoes ||
                    null,

                  anexo_url:
                    exame.anexo_url ||
                    null,

                  created_at:
                    exame.created_at,

                  updated_at:
                    exame.updated_at,
                },
                {
                  onConflict:
                    "id",
                }
              );

          if (
            error
          ) {
            throw new Error(
              `Exames upsert error: ${error.message}`
            );
          }

          break;
        }

        case "delete": {
          const id =
            requirePayloadId(
              item
            );

          const {
            error,
          } =
            await client
              .from(
                "exames"
              )
              .delete()
              .eq(
                "id",
                id
              );

          if (
            error
          ) {
            throw new Error(
              `Exames delete error: ${error.message}`
            );
          }

          break;
        }

        default:
          throw new Error(
            `Operação não suportada em exames: ${item.operation}`
          );
      }

      if (
        item.operation !==
          "delete" &&
        exame.id
      ) {
        await syncExameTratamentos(
          exame.id,
          exame.tratamento_ids ||
            []
        );

        await syncExameCids(
          exame.id,
          exame.cid_ids ||
            []
        );
      }
    };

  // ============================================================
  // CONSULTAS
  // ============================================================

  const syncConsulta =
    async (
      item:
        SyncQueueItem
    ) => {
      const client =
        requireSupabase();

      const consulta =
        item.payload as unknown as Consulta;

      switch (
        item.operation
      ) {
        case "add":
        case "update": {
          requirePersonId(
            consulta.person_id,
            "Consulta",
            consulta.id
          );

          const {
            error,
          } =
            await client
              .from(
                "consultas"
              )
              .upsert(
                {
                  id:
                    consulta.id,

                  user_id:
                    consulta.user_id,

                  person_id:
                    consulta.person_id,

                  medico_id:
                    consulta.medico_id ||
                    null,

                  hospital_id:
                    consulta.hospital_id ||
                    null,

                  local_id:
                    consulta.local_id ||
                    null,

                  document_id:
                    consulta.document_id ||
                    null,

                  especialidade:
                    consulta.especialidade,

                  medico:
                    consulta.medico ||
                    "",

                  data:
                    consulta.data,

                  horario:
                    consulta.horario ||
                    null,

                  status:
                    consulta.status,

                  motivo:
                    consulta.motivo ||
                    null,

                  observacoes:
                    consulta.observacoes ||
                    null,

                  created_at:
                    consulta.created_at,

                  updated_at:
                    consulta.updated_at,
                },
                {
                  onConflict:
                    "id",
                }
              );

          if (
            error
          ) {
            throw new Error(
              `Consultas upsert error: ${error.message}`
            );
          }

          break;
        }

        case "delete": {
          const id =
            requirePayloadId(
              item
            );

          const {
            error,
          } =
            await client
              .from(
                "consultas"
              )
              .delete()
              .eq(
                "id",
                id
              );

          if (
            error
          ) {
            throw new Error(
              `Consultas delete error: ${error.message}`
            );
          }

          break;
        }

        default:
          throw new Error(
            `Operação não suportada em consultas: ${item.operation}`
          );
      }
    };

  // ============================================================
  // CIRURGIAS
  // ============================================================

  const syncCirurgia =
    async (
      item:
        SyncQueueItem
    ) => {
      const client =
        requireSupabase();

      const cirurgia =
        item.payload as unknown as Cirurgia;

      switch (
        item.operation
      ) {
        case "add":
        case "update": {
          requirePersonId(
            cirurgia.person_id,
            "Cirurgia",
            cirurgia.id
          );

          const {
            error,
          } =
            await client
              .from(
                "cirurgias"
              )
              .upsert(
                {
                  id:
                    cirurgia.id,

                  user_id:
                    cirurgia.user_id,

                  person_id:
                    cirurgia.person_id,

                  procedimento:
                    cirurgia.procedimento,

                  data:
                    cirurgia.data,

                  horario:
                    cirurgia.horario ||
                    null,

                  local_id:
                    cirurgia.local_id ||
                    null,

                  medico_id:
                    cirurgia.medico_id ||
                    null,

                  hospital_id:
                    cirurgia.hospital_id ||
                    null,

                  document_id:
                    cirurgia.document_id ||
                    null,

                  status:
                    cirurgia.status,

                  observacoes:
                    cirurgia.observacoes ||
                    null,

                  created_at:
                    cirurgia.created_at,

                  updated_at:
                    cirurgia.updated_at,
                },
                {
                  onConflict:
                    "id",
                }
              );

          if (
            error
          ) {
            throw new Error(
              `Cirurgias upsert error: ${error.message}`
            );
          }

          break;
        }

        case "delete": {
          const id =
            requirePayloadId(
              item
            );

          const {
            error,
          } =
            await client
              .from(
                "cirurgias"
              )
              .delete()
              .eq(
                "id",
                id
              );

          if (
            error
          ) {
            throw new Error(
              `Cirurgias delete error: ${error.message}`
            );
          }

          break;
        }

        default:
          throw new Error(
            `Operação não suportada em cirurgias: ${item.operation}`
          );
      }
    };

  // ============================================================
  // RENOVAÇÕES
  //
  // A renovação é histórico financeiro e clínico.
  //
  // Por isso não consideramos o item sincronizado apenas porque
  // o Supabase respondeu sem exception. O registro retornado
  // precisa confirmar os campos que influenciam histórico,
  // vínculo por pessoa e cálculo financeiro.
  // ============================================================

  const syncRenovacao =
    async (
      item:
        SyncQueueItem
    ) => {
      const client =
        requireSupabase();

      const renovacao =
        item.payload as unknown as Renovacao;

      switch (
        item.operation
      ) {
        case "add":
        case "update": {
          if (
            !renovacao.id
          ) {
            throw new Error(
              "Renovação sem id."
            );
          }

          const personId =
            requirePersonId(
              renovacao.person_id,
              "Renovação",
              renovacao.id
            );

          const userId =
            requireUserId(
              renovacao.user_id,
              "Renovação",
              renovacao.id
            );

          const medicamentoId =
            renovacao.medicamento_id?.trim();

          if (
            !medicamentoId
          ) {
            throw new Error(
              `Renovação ${renovacao.id} sem medicamento_id.`
            );
          }

          const dataRenovacao =
            renovacao.data?.trim();

          if (
            !dataRenovacao
          ) {
            throw new Error(
              `Renovação ${renovacao.id} sem data.`
            );
          }

          if (
            renovacao.preco !==
              undefined &&
            renovacao.preco !==
              null &&
            (
              !Number.isFinite(
                renovacao.preco
              ) ||
              renovacao.preco <
                0
            )
          ) {
            throw new Error(
              `Renovação ${renovacao.id} com preço inválido.`
            );
          }

          if (
            renovacao.quantidade !==
              undefined &&
            renovacao.quantidade !==
              null &&
            (
              !Number.isFinite(
                renovacao.quantidade
              ) ||
              renovacao.quantidade <
                0
            )
          ) {
            throw new Error(
              `Renovação ${renovacao.id} com quantidade inválida.`
            );
          }

          const payloadRemoto =
            {
              id:
                renovacao.id,

              user_id:
                userId,

              person_id:
                personId,

              medicamento_id:
                medicamentoId,

              medicamento_nome:
                renovacao.medicamento_nome ??
                null,

              medicamento_dosagem:
                renovacao.medicamento_dosagem ??
                null,

              medico_id:
                renovacao.medico_id ??
                null,

              farmacia_id:
                renovacao.farmacia_id ??
                null,

              hospital_id:
                renovacao.hospital_id ??
                null,

              local_id:
                renovacao.local_id ??
                null,

              document_id:
                renovacao.document_id ??
                null,

              tipo_aquisicao:
                renovacao.tipo_aquisicao ??
                null,

              data_proxima_retirada:
                renovacao.data_proxima_retirada ??
                null,

              data_retorno_sus:
                renovacao.data_retorno_sus ??
                null,

              exige_nova_receita:
                renovacao.exige_nova_receita ??
                false,

              quantidade:
                renovacao.quantidade ??
                null,

              preco:
                renovacao.preco ??
                null,

              lote:
                renovacao.lote ??
                null,

              validade_produto:
                renovacao.validade_produto ??
                null,

              data:
                dataRenovacao,

              data_aquisicao:
                renovacao.data_aquisicao ??
                null,

              anexo_url:
                renovacao.anexo_url ??
                null,

              observacoes:
                renovacao.observacoes ??
                null,

              created_at:
                renovacao.created_at,

              updated_at:
                renovacao.updated_at,
            };

          const {
            data:
              confirmedRows,
            error,
          } =
            await client
              .from(
                "renovacoes"
              )
              .upsert(
                payloadRemoto,
                {
                  onConflict:
                    "id",
                }
              )
              .select(
"id,user_id,person_id,medicamento_id,medicamento_nome,medicamento_dosagem,tipo_aquisicao,quantidade,preco,data,data_aquisicao,updated_at"
            );

          if (
            error
          ) {
            throw new Error(
              `Renovacoes upsert error: ${error.message}`
            );
          }

          const remote =
            confirmedRows?.find(
              (
                row
              ) =>
                row.id ===
                renovacao.id
            );

          if (
            !remote
          ) {
            throw new Error(
              `Renovação ${renovacao.id} não foi confirmada pelo Supabase após upsert.`
            );
          }

          if (
            remote.user_id !==
            userId
          ) {
            throw new Error(
              `Renovação ${renovacao.id} foi salva com user_id divergente no Supabase.`
            );
          }

          if (
            remote.person_id !==
            personId
          ) {
            throw new Error(
              `Renovação ${renovacao.id} foi salva com person_id divergente no Supabase.`
            );
          }

          if (
            remote.medicamento_id !==
            medicamentoId
          ) {
            throw new Error(
              `Renovação ${renovacao.id} foi salva com medicamento_id divergente no Supabase.`
            );
          }

          const medicamentoNomeLocal =
            renovacao.medicamento_nome ??
            null;

          const medicamentoNomeRemoto =
            remote.medicamento_nome ??
            null;

          if (
            medicamentoNomeRemoto !==
            medicamentoNomeLocal
          ) {
            throw new Error(
              `Renovação ${renovacao.id} foi salva com nome do medicamento divergente no Supabase.`
            );
          }

          const medicamentoDosagemLocal =
            renovacao.medicamento_dosagem ??
            null;

          const medicamentoDosagemRemota =
            remote.medicamento_dosagem ??
            null;

          if (
            medicamentoDosagemRemota !==
            medicamentoDosagemLocal
          ) {
            throw new Error(
              `Renovação ${renovacao.id} foi salva com dosagem do medicamento divergente no Supabase.`
            );
          }

          if (
            remote.data !==
            dataRenovacao
          ) {
            throw new Error(
              `Renovação ${renovacao.id} foi salva com data divergente no Supabase.`
            );
          }

          const dataAquisicaoLocal =
            renovacao.data_aquisicao ??
            null;

          const dataAquisicaoRemota =
            remote.data_aquisicao ??
            null;

          if (
            dataAquisicaoRemota !==
            dataAquisicaoLocal
          ) {
            throw new Error(
              `Renovação ${renovacao.id} foi salva com data de aquisição divergente no Supabase.`
            );
          }

          const precoLocal =
            renovacao.preco ??
            null;

          const precoRemoto =
            remote.preco ===
              null ||
            remote.preco ===
              undefined
              ? null
              : Number(
                  remote.preco
                );

          if (
            precoLocal ===
              null
              ? precoRemoto !==
                null
              : (
                  precoRemoto ===
                    null ||
                  !Number.isFinite(
                    precoRemoto
                  ) ||
                  precoRemoto !==
                    precoLocal
                )
          ) {
            throw new Error(
              `Renovação ${renovacao.id} foi salva com preço divergente no Supabase. Local: ${String(
                precoLocal
              )}; remoto: ${String(
                remote.preco
              )}.`
            );
          }

          const quantidadeLocal =
            renovacao.quantidade ??
            null;

          const quantidadeRemota =
            remote.quantidade ===
              null ||
            remote.quantidade ===
              undefined
              ? null
              : Number(
                  remote.quantidade
                );

          if (
            quantidadeLocal ===
              null
              ? quantidadeRemota !==
                null
              : (
                  quantidadeRemota ===
                    null ||
                  !Number.isFinite(
                    quantidadeRemota
                  ) ||
                  quantidadeRemota !==
                    quantidadeLocal
                )
          ) {
            throw new Error(
              `Renovação ${renovacao.id} foi salva com quantidade divergente no Supabase. Local: ${String(
                quantidadeLocal
              )}; remoto: ${String(
                remote.quantidade
              )}.`
            );
          }

          const tipoLocal =
            renovacao.tipo_aquisicao ??
            null;

          const tipoRemoto =
            remote.tipo_aquisicao ??
            null;

          if (
            tipoRemoto !==
            tipoLocal
          ) {
            throw new Error(
              `Renovação ${renovacao.id} foi salva com tipo de aquisição divergente no Supabase.`
            );
          }

          if (
            renovacao.updated_at &&
            remote.updated_at
          ) {
            const updatedAtLocal =
              Date.parse(
                renovacao.updated_at
              );

            const updatedAtRemoto =
              Date.parse(
                remote.updated_at
              );

            if (
              !Number.isFinite(
                updatedAtLocal
              ) ||
              !Number.isFinite(
                updatedAtRemoto
              ) ||
              updatedAtRemoto !==
                updatedAtLocal
            ) {
              throw new Error(
                `Renovação ${renovacao.id} retornou versão remota diferente da versão enviada.`
              );
            }
          }

          break;
        }

        case "delete": {
          const id =
            requirePayloadId(
              item
            );

          const {
            error,
          } =
            await client
              .from(
                "renovacoes"
              )
              .delete()
              .eq(
                "id",
                id
              );

          if (
            error
          ) {
            throw new Error(
              `Renovacoes delete error: ${error.message}`
            );
          }

          break;
        }

        default:
          throw new Error(
            `Operação não suportada em renovacoes: ${item.operation}`
          );
      }
    };

  // ============================================================
  // DOSE LOGS
  // ============================================================

  const syncDoseLog =
    async (
      item:
        SyncQueueItem
    ) => {
      const client =
        requireSupabase();

      const log =
        item.payload as unknown as DoseLog;

      switch (
        item.operation
      ) {
        case "add":
        case "update": {
          if (
            !log.id
          ) {
            throw new Error(
              "DoseLog sem id."
            );
          }

          const personId =
            requirePersonId(
              log.person_id,
              "DoseLog",
              log.id
            );

          const userId =
            requireUserId(
              log.user_id,
              "DoseLog",
              log.id
            );

          if (
            !log.medicamento_id
          ) {
            throw new Error(
              `DoseLog ${log.id} sem medicamento_id.`
            );
          }

          if (
            !log.data
          ) {
            throw new Error(
              `DoseLog ${log.id} sem data.`
            );
          }

          if (
            !log.horario
          ) {
            throw new Error(
              `DoseLog ${log.id} sem horário.`
            );
          }

          const {
            data:
              confirmedRows,
            error,
          } =
            await client
              .from(
                "dose_logs"
              )
              .upsert(
                {
                  id:
                    log.id,

                  user_id:
                    userId,

                  person_id:
                    personId,

                  medicamento_id:
                    log.medicamento_id,

                  data:
                    log.data,

                  horario:
                    log.horario,

                  tomado_em:
                    log.tomado_em ||
                    null,

                  ignorado_em:
                    log.ignorado_em ||
                    null,

                  quantidade:
                    log.quantidade !==
                    undefined
                      ? log.quantidade
                      : null,

                  created_at:
                    log.created_at,

                  updated_at:
                    log.updated_at,
                },
                {
                  onConflict:
                    "id",
                }
              )
              .select(
                "id"
              );

          if (
            error
          ) {
            throw new Error(
              `Dose_logs upsert error: ${error.message}`
            );
          }

          if (
            !confirmedRows ||
            confirmedRows.length ===
              0 ||
            !confirmedRows.some(
              (
                row
              ) =>
                row.id ===
                log.id
            )
          ) {
            throw new Error(
              `DoseLog ${log.id} não foi confirmado pelo Supabase após upsert.`
            );
          }

          break;
        }

        case "delete": {
          const id =
            requirePayloadId(
              item
            );

          const {
            error,
          } =
            await client
              .from(
                "dose_logs"
              )
              .delete()
              .eq(
                "id",
                id
              );

          if (
            error
          ) {
            throw new Error(
              `Dose_logs delete error: ${error.message}`
            );
          }

          break;
        }

        default:
          throw new Error(
            `Operação não suportada em doseLogs: ${item.operation}`
          );
      }
    };

  // ============================================================
  // ANEXOS CLÍNICOS
  // ============================================================

  const syncAnexoClinico =
    async (
      item:
        SyncQueueItem
    ) => {
      const client =
        requireSupabase();

      const anexo =
        item.payload as unknown as AnexoClinico;

      switch (
        item.operation
      ) {
        case "add":
        case "update": {
          requirePersonId(
            anexo.person_id,
            "Anexo clínico",
            anexo.id
          );

          const titulo =
            anexo.titulo?.trim() ||
            anexo.nome?.trim();

          if (
            !titulo
          ) {
            throw new Error(
              "Anexo clínico sem título/nome."
            );
          }

          if (
            !anexo.tipo
          ) {
            throw new Error(
              "Anexo clínico sem tipo."
            );
          }

          if (
            !anexo.url
          ) {
            throw new Error(
              "Anexo clínico sem URL."
            );
          }

          const {
            error,
          } =
            await client
              .from(
                "anexos_clinicos"
              )
              .upsert(
                {
                  id:
                    anexo.id,

                  user_id:
                    anexo.user_id,

                  person_id:
                    anexo.person_id,

                  tratamento_id:
                    anexo.tratamento_id ||
                    null,

                  medicamento_id:
                    anexo.medicamento_id ||
                    null,

                  titulo,

                  tipo:
                    anexo.tipo,

                  url:
                    anexo.url,

                  thumbnail:
                    anexo.thumbnail_url ||
                    null,

                  tags:
                    anexo.tags ||
                    [],

                  created_at:
                    anexo.created_at,

                  updated_at:
                    anexo.updated_at,
                },
                {
                  onConflict:
                    "id",
                }
              );

          if (
            error
          ) {
            throw new Error(
              `Anexos_clinicos upsert error: ${error.message}`
            );
          }

          break;
        }

        case "delete": {
          const id =
            requirePayloadId(
              item
            );

          const {
            error,
          } =
            await client
              .from(
                "anexos_clinicos"
              )
              .delete()
              .eq(
                "id",
                id
              );

          if (
            error
          ) {
            throw new Error(
              `Anexos_clinicos delete error: ${error.message}`
            );
          }

          break;
        }

        default:
          throw new Error(
            `Operação não suportada em anexos_clinicos: ${item.operation}`
          );
      }
    };

  // ============================================================
  // REGISTROS DE SAÚDE
  // ============================================================

  const syncRegistroSaude =
    async (
      item:
        SyncQueueItem
    ) => {
      const client =
        requireSupabase();

      const reg =
        item.payload as unknown as RegistroSaude;

      switch (
        item.operation
      ) {
        case "add":
        case "update": {
          requirePersonId(
            reg.person_id,
            "Registro de saúde",
            reg.id
          );

          const {
            error,
          } =
            await client
              .from(
                "registros_saude"
              )
              .upsert(
                {
                  id:
                    reg.id,

                  user_id:
                    reg.user_id,

                  person_id:
                    reg.person_id,

                  categoria:
                    reg.categoria,

                  tipo:
                    reg.tipo ||
                    null,

                  nome:
                    reg.nome,

                  intensidade:
                    reg.intensidade !==
                    undefined
                      ? reg.intensidade
                      : null,

                  valor_medicao:
                    reg.valor_medicao ||
                    null,

                  data:
                    reg.data,

                  horario:
                    reg.horario ||
                    null,

                  observacoes:
                    reg.observacoes ||
                    null,

                  medicamento_id:
                    reg.medicamento_id ||
                    null,

                  tratamento_ids:
                    reg.tratamento_ids ||
                    [],

                  cid_ids:
                    reg.cid_ids ||
                    [],

                  created_at:
                    reg.created_at,

                  updated_at:
                    reg.updated_at,
                },
                {
                  onConflict:
                    "id",
                }
              );

          if (
            error
          ) {
            throw new Error(
              `Registros_saude upsert error: ${error.message}`
            );
          }

          break;
        }

        case "delete": {
          const id =
            requirePayloadId(
              item
            );

          const {
            error,
          } =
            await client
              .from(
                "registros_saude"
              )
              .delete()
              .eq(
                "id",
                id
              );

          if (
            error
          ) {
            throw new Error(
              `Registros_saude delete error: ${error.message}`
            );
          }

          break;
        }

        default:
          throw new Error(
            `Operação não suportada em registros_saude: ${item.operation}`
          );
      }
    };

  // ============================================================
  // VAULTS
  // ============================================================

  const syncVault =
    async (
      item:
        SyncQueueItem
    ) => {
      const client =
        requireSupabase();

      const vault =
        item.payload as unknown as Vault;

      switch (
        item.operation
      ) {
        case "add":
        case "update": {
          if (
            !vault.person_id
          ) {
            throw new Error(
              `Vault ${vault.id} sem person_id.`
            );
          }

          const {
            error,
          } =
            await client
              .from(
                "vaults"
              )
              .upsert(
                {
                  id:
                    vault.id,

                  user_id:
                    vault.user_id,

                  person_id:
                    vault.person_id,

                  name:
                    vault.name,

                  description:
                    vault.description ||
                    null,

                  icon:
                    vault.icon,

                  color:
                    vault.color,

                  created_at:
                    vault.created_at,

                  updated_at:
                    vault.updated_at,
                },
                {
                  onConflict:
                    "id",
                }
              );

          if (
            error
          ) {
            throw new Error(
              `Vaults upsert error: ${error.message}`
            );
          }

          break;
        }

        case "delete": {
          const id =
            requirePayloadId(
              item
            );

          const {
            error,
          } =
            await client
              .from(
                "vaults"
              )
              .delete()
              .eq(
                "id",
                id
              );

          if (
            error
          ) {
            throw new Error(
              `Vaults delete error: ${error.message}`
            );
          }

          break;
        }

        default:
          throw new Error(
            `Operação não suportada em vaults: ${item.operation}`
          );
      }
    };

  // ============================================================
  // VAULT MEMBERS
  // ============================================================

  const syncVaultMember =
    async (
      item:
        SyncQueueItem
    ) => {
      const client =
        requireSupabase();

      const member =
        item.payload as unknown as VaultMember;

      const rawStatus =
        String(
          member.status
        );

      const normalizedStatus =
        rawStatus ===
        "rejected"
          ? "declined"
          : rawStatus;

      if (
        normalizedStatus !==
          "pending" &&
        normalizedStatus !==
          "accepted" &&
        normalizedStatus !==
          "declined"
      ) {
        throw new Error(
          `Status inválido em VaultMember ${member.id}: ${normalizedStatus}`
        );
      }

      if (
        normalizedStatus ===
        "accepted"
      ) {
        if (
          !member.user_id
        ) {
          throw new Error(
            `VaultMember ${member.id} aceito sem user_id.`
          );
        }

        if (
          !member.person_id
        ) {
          throw new Error(
            `VaultMember ${member.id} aceito sem person_id.`
          );
        }
      }

      switch (
        item.operation
      ) {
        case "add": {
          if (
            !member.id
          ) {
            throw new Error(
              "VaultMember sem id."
            );
          }

          const {
            data:
              insertedRows,
            error,
          } =
            await client
              .from(
                "vault_members"
              )
              .upsert(
                {
                  id:
                    member.id,

                  vault_id:
                    member.vault_id,

                  user_id:
                    member.user_id ||
                    null,

                  person_id:
                    member.person_id ||
                    null,

                  email:
                    member.email,

                  name:
                    member.name ||
                    null,

                  permission:
                    member.permission,

                  invited_by:
                    member.invited_by,

                  status:
                    normalizedStatus,

                  invited_at:
                    member.invited_at,

                  updated_at:
                    member.updated_at,
                },
                {
                  onConflict:
                    "id",
                }
              )
              .select(
                "id"
              );

          if (
            error
          ) {
            throw new Error(
              `Vault_members insert error: ${error.message}`
            );
          }

          if (
            !insertedRows ||
            insertedRows.length ===
              0
          ) {
            throw new Error(
              `Vault_members add não retornou registro: ${member.id}`
            );
          }

          break;
        }

        case "update": {
          if (
            !member.id
          ) {
            throw new Error(
              "VaultMember sem id."
            );
          }

          const {
            data:
              updatedRows,
            error,
          } =
            await client
              .from(
                "vault_members"
              )
              .update({
                user_id:
                  member.user_id ||
                  null,

                person_id:
                  member.person_id ||
                  null,

                email:
                  member.email,

                name:
                  member.name ||
                  null,

                permission:
                  member.permission,

                status:
                  normalizedStatus,

                updated_at:
                  member.updated_at,
              })
              .eq(
                "id",
                member.id
              )
              .select(
                "id"
              );

          if (
            error
          ) {
            throw new Error(
              `Vault_members update error: ${error.message}`
            );
          }

          if (
            !updatedRows ||
            updatedRows.length ===
              0
          ) {
            throw new Error(
              `Vault_members update não alterou nenhuma linha: ${member.id}`
            );
          }

          break;
        }

        case "delete": {
          const id =
            requirePayloadId(
              item
            );

          const {
            error,
          } =
            await client
              .from(
                "vault_members"
              )
              .delete()
              .eq(
                "id",
                id
              );

          if (
            error
          ) {
            throw new Error(
              `Vault_members delete error: ${error.message}`
            );
          }

          break;
        }

        default:
          throw new Error(
            `Operação não suportada em vaultMembers: ${item.operation}`
          );
      }
    };

  // ============================================================
  // CREDENTIALS
  // ============================================================

  const syncCredential =
    async (
      item:
        SyncQueueItem
    ) => {
      const client =
        requireSupabase();

      const credential =
        item.payload as unknown as Credential;

      switch (
        item.operation
      ) {
        case "add":
        case "update": {
          if (
            !credential.person_id
          ) {
            throw new Error(
              `Credential ${credential.id} sem person_id.`
            );
          }

          const {
            error,
          } =
            await client
              .from(
                "credentials"
              )
              .upsert(
                {
                  id:
                    credential.id,

                  user_id:
                    credential.user_id,

                  person_id:
                    credential.person_id,

                  vault_id:
                    credential.vault_id ||
                    null,

                  title:
                    credential.title,

                  username:
                    credential.username ||
                    null,

                  password_encrypted:
                    credential.password_encrypted,

                  url:
                    credential.url ||
                    null,

                  notes:
                    credential.notes ||
                    null,

                  category:
                    credential.category,

                  history:
                    credential.password_history ||
                    [],

                  created_at:
                    credential.created_at,

                  updated_at:
                    credential.updated_at,
                },
                {
                  onConflict:
                    "id",
                }
              );

          if (
            error
          ) {
            throw new Error(
              `Credentials upsert error: ${error.message}`
            );
          }

          break;
        }

        case "delete": {
          const id =
            requirePayloadId(
              item
            );

          const {
            error,
          } =
            await client
              .from(
                "credentials"
              )
              .delete()
              .eq(
                "id",
                id
              );

          if (
            error
          ) {
            throw new Error(
              `Credentials delete error: ${error.message}`
            );
          }

          break;
        }

        default:
          throw new Error(
            `Operação não suportada em credentials: ${item.operation}`
          );
      }
    };

  // ============================================================
  // SETTINGS
  // ============================================================

  const syncSettings =
    async (
      item:
        SyncQueueItem
    ) => {
      const client =
        requireSupabase();

      const settings =
        item.payload as unknown as AppSettings;

      switch (
        item.operation
      ) {
        case "add":
        case "update": {
          const {
            error,
          } =
            await client
              .from(
                "settings"
              )
              .upsert(
                {
                  id:
                    settings.id,

                  user_id:
                    settings.user_id,

                  default_person_id:
                    settings.default_person_id ||
                    null,

                  updated_at:
                    settings.updated_at ||
                    new Date()
                      .toISOString(),
                },
                {
                  onConflict:
                    "id",
                }
              );

          if (
            error
          ) {
            throw new Error(
              `Settings sync error: ${error.message}`
            );
          }

          break;
        }

        case "delete": {
          const id =
            requirePayloadId(
              item
            );

          const {
            error,
          } =
            await client
              .from(
                "settings"
              )
              .delete()
              .eq(
                "id",
                id
              );

          if (
            error
          ) {
            throw new Error(
              `Settings delete error: ${error.message}`
            );
          }

          break;
        }

        default:
          throw new Error(
            `Operação não suportada em settings: ${item.operation}`
          );
      }
    };

  // ============================================================
  // CARTÕES
  // ============================================================

  const syncCard =
    async (
      item:
        SyncQueueItem
    ) => {
      const client =
        requireSupabase();

      const card =
        item.payload as unknown as BankCard;

      switch (
        item.operation
      ) {
        case "add":
        case "update": {
          if (
            !card.person_id
          ) {
            throw new Error(
              `Card ${card.id} sem person_id.`
            );
          }

          const {
            error,
          } =
            await client
              .from(
                "cards"
              )
              .upsert(
                {
                  id:
                    card.id,

                  user_id:
                    card.user_id,

                  person_id:
                    card.person_id,

                  title:
                    card.title,

                  bank_name:
                    card.bank_name,

                  type:
                    card.type,

                  card_number_encrypted:
                    card.card_number_encrypted ||
                    null,

                  card_holder:
                    card.card_holder ||
                    null,

                  brand:
                    card.brand ||
                    null,

                  expiry_date:
                    card.expiry_date ||
                    null,

                  cvv_encrypted:
                    card.cvv_encrypted ||
                    null,

                  agency:
                    card.agency ||
                    null,

                  account:
                    card.account ||
                    null,

                  notes:
                    card.notes ||
                    null,

                  created_at:
                    card.created_at,

                  updated_at:
                    card.updated_at,
                },
                {
                  onConflict:
                    "id",
                }
              );

          if (
            error
          ) {
            throw new Error(
              `Cards upsert error: ${error.message}`
            );
          }

          break;
        }

        case "delete": {
          const id =
            requirePayloadId(
              item
            );

          const {
            error,
          } =
            await client
              .from(
                "cards"
              )
              .delete()
              .eq(
                "id",
                id
              );

          if (
            error
          ) {
            throw new Error(
              `Cards delete error: ${error.message}`
            );
          }

          break;
        }

        default:
          throw new Error(
            `Operação não suportada em cards: ${item.operation}`
          );
      }
    };

  // ============================================================
  // MARCAR LOCAL COMO SINCRONIZADO
  // ============================================================

  const markLocalAsSynced =
    async (
      item:
        SyncQueueItem
    ) => {
      if (
        item.operation ===
        "delete"
      ) {
        return;
      }

      const payload =
        item.payload as unknown as {
          id?: string;
          updated_at?: string;
        };

      if (
        !payload.id
      ) {
        return;
      }

      const expectedUpdatedAt =
        payload.updated_at;

      switch (
        item.table
      ) {
        case "persons":
          await markRecordSyncedIfCurrent(
            db.persons,
            payload.id,
            expectedUpdatedAt
          );
          break;

        case "medicos":
          await markRecordSyncedIfCurrent(
            db.medicos,
            payload.id,
            expectedUpdatedAt
          );
          break;

        case "farmacias":
          await markRecordSyncedIfCurrent(
            db.farmacias,
            payload.id,
            expectedUpdatedAt
          );
          break;

        case "hospitais":
          await markRecordSyncedIfCurrent(
            db.hospitais,
            payload.id,
            expectedUpdatedAt
          );
          break;

        case "locais":
          await markRecordSyncedIfCurrent(
            db.locais,
            payload.id,
            expectedUpdatedAt
          );
          break;

        case "instituicoes":
          await markRecordSyncedIfCurrent(
            db.instituicoes,
            payload.id,
            expectedUpdatedAt
          );
          break;

        case "cids":
          await markRecordSyncedIfCurrent(
            db.cids,
            payload.id,
            expectedUpdatedAt
          );
          break;

        case "documents":
          await markRecordSyncedIfCurrent(
            db.documents,
            payload.id,
            expectedUpdatedAt
          );
          break;

        case "tratamentos":
          await markRecordSyncedIfCurrent(
            db.tratamentos,
            payload.id,
            expectedUpdatedAt
          );
          break;

        case "medicamentos":
          await markRecordSyncedIfCurrent(
            db.medicamentos,
            payload.id,
            expectedUpdatedAt
          );
          break;

        case "exames":
          await markRecordSyncedIfCurrent(
            db.exames,
            payload.id,
            expectedUpdatedAt
          );
          break;

        case "consultas":
          await markRecordSyncedIfCurrent(
            db.consultas,
            payload.id,
            expectedUpdatedAt
          );
          break;

        case "cirurgias":
          await markRecordSyncedIfCurrent(
            db.cirurgias,
            payload.id,
            expectedUpdatedAt
          );
          break;

        case "renovacoes":
          await markRecordSyncedIfCurrent(
            db.renovacoes,
            payload.id,
            expectedUpdatedAt
          );
          break;

        case "doseLogs":
          await markRecordSyncedIfCurrent(
            db.doseLogs,
            payload.id,
            expectedUpdatedAt
          );
          break;

        case "anexos_clinicos":
          await markRecordSyncedIfCurrent(
            db.anexos_clinicos,
            payload.id,
            expectedUpdatedAt
          );
          break;

        case "registros_saude":
          await markRecordSyncedIfCurrent(
            db.registros_saude,
            payload.id,
            expectedUpdatedAt
          );
          break;

        case "vaults":
          await markRecordSyncedIfCurrent(
            db.vaults,
            payload.id,
            expectedUpdatedAt
          );
          break;

        case "vaultMembers":
          await markRecordSyncedIfCurrent(
            db.vaultMembers,
            payload.id,
            expectedUpdatedAt
          );
          break;

        case "credentials":
          await markRecordSyncedIfCurrent(
            db.credentials,
            payload.id,
            expectedUpdatedAt
          );
          break;

        case "cards":
          await markRecordSyncedIfCurrent(
            db.bankCards,
            payload.id,
            expectedUpdatedAt
          );
          break;

        case "settings":
          await markRecordSyncedIfCurrent(
            db.settings,
            payload.id,
            expectedUpdatedAt
          );
          break;

        default:
          break;
      }
    };

  // ============================================================
  // FINALIZAÇÃO SEGURA
  // ============================================================

  const finalizeQueueItem =
    async (
      item:
        SyncQueueItem
    ): Promise<boolean> => {
      if (
        !item.id
      ) {
        return false;
      }

      const atual =
        await db.syncQueue.get(
          item.id
        );

      if (
        !atual
      ) {
        return false;
      }

      if (
        atual.updated_at !==
        item.updated_at
      ) {
        return false;
      }

      if (
        atual.operation !==
        item.operation
      ) {
        return false;
      }

      await db.syncQueue.delete(
        item.id
      );

      const novaOperacao =
        await db.syncQueue
          .where(
            "chave"
          )
          .equals(
            item.chave
          )
          .first();

      if (
        novaOperacao
      ) {
        return false;
      }

      await markLocalAsSynced(
        item
      );

      return true;
    };

  // ============================================================
  // PROCESSAMENTO DE UM ITEM
  // ============================================================

  const syncItem =
    async (
      item:
        SyncQueueItem
    ) => {
      switch (
        item.table
      ) {
        case "persons":
          await syncPerson(
            item
          );
          return;

        case "settings":
          await syncSettings(
            item
          );
          return;

        case "medicos":
          await syncMedico(
            item
          );
          return;

        case "farmacias":
          await syncFarmacia(
            item
          );
          return;

        case "hospitais":
          await syncHospital(
            item
          );
          return;

        case "locais":
          await syncLocal(
            item
          );
          return;

        case "instituicoes":
          await syncInstituicao(
            item
          );
          return;

        case "cids":
          await syncCid(
            item
          );
          return;

        case "vaults":
          await syncVault(
            item
          );
          return;

        case "vaultMembers":
          await syncVaultMember(
            item
          );
          return;

        case "documents":
          await syncDocument(
            item
          );
          return;

        case "tratamentos":
          await syncTratamento(
            item
          );
          return;

        case "medicamentos":
          await syncMedicamento(
            item
          );
          return;

        case "exames":
          await syncExame(
            item
          );
          return;

        case "consultas":
          await syncConsulta(
            item
          );
          return;

        case "cirurgias":
          await syncCirurgia(
            item
          );
          return;

        case "renovacoes":
          await syncRenovacao(
            item
          );
          return;

        case "doseLogs":
          await syncDoseLog(
            item
          );
          return;

        case "anexos_clinicos":
          await syncAnexoClinico(
            item
          );
          return;

        case "registros_saude":
          await syncRegistroSaude(
            item
          );
          return;

        case "credentials":
          await syncCredential(
            item
          );
          return;

        case "cards":
          await syncCard(
            item
          );
          return;

        default:
          throw new Error(
            `Tabela não suportada no sync: ${item.table}`
          );
      }
    };

  // ============================================================
  // PROCESSAMENTO DA FILA
  // ============================================================

  const processQueue =
    useCallback(
      async (): Promise<SyncProcessResult> => {
        if (
          !isOnline ||
          (
            typeof navigator !==
              "undefined" &&
            !navigator.onLine
          )
        ) {
          return emptySyncResult({
            offline:
              true,
          });
        }

        if (
          globalProcessingPromise
        ) {
          return globalProcessingPromise;
        }

        const execution =
          async (): Promise<SyncProcessResult> => {
            const result =
              emptySyncResult();

            if (
              typeof window !==
              "undefined"
            ) {
              window.dispatchEvent(
                new Event(
                  "sync:start"
                )
              );
            }

            setIsProcessing(
              true
            );

            try {
              const client =
                requireSupabase();

              const {
                data: {
                  user:
                    authenticatedUser,
                },
                error:
                  authError,
              } =
                await client.auth.getUser();

              if (
                authError
              ) {
                throw new Error(
                  `Falha ao validar sessão antes do sync: ${authError.message}`
                );
              }

              if (
                !authenticatedUser
              ) {
                addLog(
                  "Sincronização aguardando autenticação.",
                  "info"
                );

                return result;
              }

              const queue =
                await db.syncQueue
                  .toCollection()
                  .filter(
                    (
                      item
                    ) =>
                      item.failed !==
                        true &&
                      (
                        item.retry_count ||
                        0
                      ) <
                        MAX_RETRIES
                  )
                  .toArray();

              if (
                queue.length ===
                0
              ) {
                result.permanentlyFailed =
                  await db.syncQueue
                    .toCollection()
                    .filter(
                      (
                        item
                      ) =>
                        item.failed ===
                        true
                    )
                    .count();

                return result;
              }

              addLog(
                `Iniciando sincronização: ${queue.length} item${queue.length === 1 ? "" : "s"} na fila.`,
                "info"
              );

              const priorityOrder:
                SyncQueueItem["table"][] =
                [
                  "persons",
                  "settings",

                  "medicos",
                  "farmacias",
                  "hospitais",
                  "locais",
                  "instituicoes",

                  "cids",

                  "vaults",
                  "vaultMembers",

                  "documents",

                  "tratamentos",
                  "medicamentos",

                  "exames",
                  "consultas",
                  "cirurgias",

                  "renovacoes",
                  "doseLogs",

                  "anexos_clinicos",
                  "registros_saude",

                  "credentials",
                  "cards",
                ];

              queue.sort(
                (
                  a,
                  b
                ) => {
                  const aIndex =
                    priorityOrder.indexOf(
                      a.table
                    );

                  const bIndex =
                    priorityOrder.indexOf(
                      b.table
                    );

                  return (
                    (
                      aIndex ===
                      -1
                        ? 999
                        : aIndex
                    ) -
                    (
                      bIndex ===
                      -1
                        ? 999
                        : bIndex
                    )
                  );
                }
              );

              let highestRetry =
                0;

              for (
                const item of queue
              ) {
                if (
                  typeof navigator !==
                    "undefined" &&
                  !navigator.onLine
                ) {
                  result.offline =
                    true;

                  addLog(
                    "Conexão perdida durante a sincronização. A fila foi preservada.",
                    "info"
                  );

                  break;
                }

                result.processed++;

                const retryCount =
                  item.retry_count ||
                  0;

                highestRetry =
                  Math.max(
                    highestRetry,
                    retryCount
                  );

                try {
                  if (
                    item.operation !==
                      "delete" &&
                    item.table !==
                      "vaultMembers"
                  ) {
                    const payload =
                      item.payload as {
                        user_id?: unknown;
                      };

                    if (
                      typeof payload.user_id ===
                        "string" &&
                      payload.user_id &&
                      payload.user_id !==
                        authenticatedUser.id
                    ) {
                      throw new Error(
                        `Item ${item.table} pertence a outro usuário autenticado.`
                      );
                    }
                  }

                  await syncItem(
                    item
                  );

                  const finalized =
                    await finalizeQueueItem(
                      item
                    );

                  if (
                    finalized
                  ) {
                    result.succeeded++;

                    addLog(
                      `${item.table} sincronizado.`,
                      "success"
                    );
                  } else {
                    addLog(
                      `${item.table} mudou durante o envio; a versão mais recente foi preservada na fila.`,
                      "info"
                    );
                  }
                } catch (
                  error:
                    unknown
                ) {
                  result.failed++;

                  const atual =
                    item.id
                      ? await db.syncQueue.get(
                          item.id
                        )
                      : undefined;

                  if (
                    atual &&
                    atual.updated_at !==
                      item.updated_at
                  ) {
                    addLog(
                      `${item.table} mudou durante uma tentativa com erro; a versão antiga foi ignorada.`,
                      "info"
                    );

                    continue;
                  }

                  const nextRetryCount =
                    retryCount +
                    1;

                  const failed =
                    nextRetryCount >=
                    MAX_RETRIES;

                  const errorMessage =
                    error instanceof
                    Error
                      ? error.message
                      : String(
                          error
                        );

                  if (
                    item.id
                  ) {
                    await db.syncQueue.update(
                      item.id,
                      {
                        retry_count:
                          nextRetryCount,

                        failed,

                        error:
                          errorMessage,
                      }
                    );
                  }

                  if (
                    failed
                  ) {
                    addLog(
                      `Falha permanente em ${item.table}: ${errorMessage}`,
                      "error"
                    );
                  } else {
                    addLog(
                      `Erro em ${item.table} — tentativa ${nextRetryCount}/${MAX_RETRIES}: ${errorMessage}`,
                      "error"
                    );
                  }
                }
              }

              if (
                result.succeeded >
                0
              ) {
                addLog(
                  `${result.succeeded} item${result.succeeded === 1 ? "" : "s"} sincronizado${result.succeeded === 1 ? "" : "s"} com sucesso.`,
                  "success"
                );
              }

              result.remaining =
                await db.syncQueue
                  .toCollection()
                  .filter(
                    (
                      item
                    ) =>
                      item.failed !==
                        true &&
                      (
                        item.retry_count ||
                        0
                      ) <
                        MAX_RETRIES
                  )
                  .count();

              result.permanentlyFailed =
                await db.syncQueue
                  .toCollection()
                  .filter(
                    (
                      item
                    ) =>
                      item.failed ===
                      true
                  )
                  .count();

              if (
                result.remaining >
                  0 &&
                !result.offline &&
                typeof navigator !==
                  "undefined" &&
                navigator.onLine
              ) {
                if (
                  timeoutRef.current
                ) {
                  clearTimeout(
                    timeoutRef.current
                  );
                }

                const delay =
                  Math.min(
                    5000 *
                      Math.pow(
                        2,
                        highestRetry
                      ),
                    MAX_BACKOFF_MS
                  );

                timeoutRef.current =
                  setTimeout(
                    () => {
                      timeoutRef.current =
                        null;

                      if (
                        typeof window !==
                        "undefined"
                      ) {
                        window.dispatchEvent(
                          new Event(
                            "sync:process"
                          )
                        );
                      }
                    },
                    delay
                  );
              }

              return result;
            } catch (
              error:
                unknown
            ) {
              const errorMessage =
                error instanceof
                Error
                  ? error.message
                  : String(
                      error
                    );

              addLog(
                `Erro ao processar fila: ${errorMessage}`,
                "error"
              );

              result.failed++;

              result.remaining =
                await db.syncQueue.count();

              result.permanentlyFailed =
                await db.syncQueue
                  .toCollection()
                  .filter(
                    (
                      item
                    ) =>
                      item.failed ===
                      true
                  )
                  .count();

              return result;
            } finally {
              setIsProcessing(
                false
              );

              if (
                typeof window !==
                "undefined"
              ) {
                window.dispatchEvent(
                  new Event(
                    "sync:end"
                  )
                );
              }
            }
          };

        globalProcessingPromise =
          execution();

        try {
          return await globalProcessingPromise;
        } finally {
          globalProcessingPromise =
            null;
        }
      },
      [
        isOnline,
        addLog,
      ]
    );

  // ============================================================
  // RESET DE FALHAS
  // ============================================================

  const resetFailedItems =
    useCallback(
      async () => {
        const failedItems =
          await db.syncQueue
            .toCollection()
            .filter(
              (
                item
              ) =>
                item.failed ===
                true
            )
            .toArray();

        if (
          failedItems.length ===
          0
        ) {
          return;
        }

        for (
          const item of failedItems
        ) {
          if (
            !item.id
          ) {
            continue;
          }

          await db.syncQueue.update(
            item.id,
            {
              failed:
                false,

              retry_count:
                0,

              error:
                undefined,
            }
          );
        }

        addLog(
          `${failedItems.length} item${failedItems.length === 1 ? "" : "s"} redefinido${failedItems.length === 1 ? "" : "s"} para reenvio.`,
          "success"
        );

        await processQueue();
      },
      [
        processQueue,
        addLog,
      ]
    );

  // ============================================================
  // EVENTO GLOBAL
  // ============================================================

  useEffect(
    () => {
      const handleProcess =
        () => {
          if (
            isOnline
          ) {
            void processQueue();
          }
        };

      window.addEventListener(
        "sync:process",
        handleProcess
      );

      return () => {
        window.removeEventListener(
          "sync:process",
          handleProcess
        );
      };
    },
    [
      isOnline,
      processQueue,
    ]
  );

  // ============================================================
  // PROCESSA AO VOLTAR ONLINE / MONTAR
  // ============================================================

  useEffect(
    () => {
      if (
        isOnline
      ) {
        void processQueue();
      }
    },
    [
      isOnline,
      processQueue,
    ]
  );

  // ============================================================
  // API
  // ============================================================

  return {
    processQueue,

    isProcessing,

    isOnline,

    resetFailedItems,

    syncLogs,

    clearLogs,
  };
}
