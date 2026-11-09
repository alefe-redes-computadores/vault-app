// lib/sync/pull.ts

import {
  beginPullDiagnostics,
  finishPullDiagnostics,
  recordPullTable,
} from "@/lib/sync/diagnostics";

import { supabase } from "@/lib/supabase/client";
import { db } from "@/lib/db";
import { preserveMedicationTreatmentLinks } from "@/lib/sync/medication-pull-links";
import { planMedicationTreatmentReconciliationM105 } from "@/lib/sync/medication-treatment-reconciliation-m105";

import type { Table } from "dexie";
import type { SyncQueueItem } from "@/lib/types";

// ============================================================
// TRAVA GLOBAL DE MÓDULO
// ============================================================

let pullInFlight: Promise<void> | null = null;
let pullInFlightUser: string | null = null;

// ============================================================
// TIPOS INTERNOS
// ============================================================

type RemoteRow =
  Record<string, unknown> & {
    id?: string;
  };

interface QueryResult {
  data: RemoteRow[] | null;

  error: {
    message?: string;
  } | null;
}

interface ProcessTableOptions<T extends object> {
  remoteTable: string;

  queueTable:
    SyncQueueItem["table"];

  localTable:
    Table<T, string>;

  query:
    () => Promise<QueryResult>;

  mapRemote?: (
    row: RemoteRow,
    local?: Record<string, unknown>
  ) => Record<string, unknown>;
}

// ============================================================
// HELPERS
// ============================================================

function getPayloadId(
  item: SyncQueueItem
): string | null {
  if (
    !item.payload ||
    typeof item.payload !==
      "object"
  ) {
    return null;
  }

  const payload =
    item.payload as {
      id?: unknown;
    };

  return typeof payload.id ===
    "string"
    ? payload.id
    : null;
}

function uniqueById(
  rows: RemoteRow[]
): RemoteRow[] {
  const map =
    new Map<
      string,
      RemoteRow
    >();

  for (
    const row of rows
  ) {
    if (!row.id) {
      continue;
    }

    map.set(
      row.id,
      row
    );
  }

  return Array.from(
    map.values()
  );
}

function normalizeEmail(
  email: string
): string {
  return email
    .trim()
    .toLowerCase();
}

// VAULT_SYNC_PIPELINE_V91
type PullTask = () => Promise<void>;

async function runPullTasks(
  tasks: PullTask[],
  concurrency = 4
): Promise<void> {
  if (tasks.length === 0) return;

  let cursor = 0;
  const workerCount = Math.min(concurrency, tasks.length);

  const worker = async (): Promise<void> => {
    while (cursor < tasks.length) {
      const taskIndex = cursor;
      cursor += 1;
      const task = tasks[taskIndex];
      if (!task) return;
      await task();
    }
  };

  await Promise.all(
    Array.from({ length: workerCount }, () => worker())
  );
}

// ============================================================
// PULL
// ============================================================

export function pullAllData(userId: string): Promise<void> {
  if (pullInFlight) {
    if (pullInFlightUser !== userId) {
      return Promise.reject(new Error("Outra conta possui um pull em andamento."));
    }
    return pullInFlight;
  }
  pullInFlightUser = userId;
  pullInFlight = performPullAllData(userId).finally(() => {
    pullInFlight = null;
    pullInFlightUser = null;
  });
  return pullInFlight;
}

async function performPullAllData(userId: string): Promise<void> {

  try {
    console.log(
      "🔄 [Pull] Iniciando sincronização da nuvem para o dispositivo..."
    );
    beginPullDiagnostics();
    // V234: falha no pull de doses não deve virar falso sucesso global.
    const criticalPullErrors: string[] = [];

    const {
      data:
        authData,
      error:
        authError,
    } =
      await supabase.auth.getUser();

    if (authError) {
      throw new Error(
        `Não foi possível obter usuário autenticado: ${authError.message}`
      );
    }

    const authenticatedUser =
      authData.user;

    if (
      !authenticatedUser
    ) {
      throw new Error(
        "Usuário autenticado não encontrado durante o pull"
      );
    }

    if (
      authenticatedUser.id !==
      userId
    ) {
      throw new Error(
        "O userId solicitado para o pull não corresponde ao usuário autenticado"
      );
    }

    const authenticatedEmail =
      authenticatedUser.email
        ? normalizeEmail(
            authenticatedUser.email
          )
        : null;

    // ==========================================================
    // OPERAÇÕES LOCAIS PENDENTES
    // ==========================================================

    const pendingItems =
      await db.syncQueue
        .toCollection()
        .toArray();

    const pendingTables =
      new Map<
        SyncQueueItem["table"],
        Set<string>
      >();

    for (
      const item of pendingItems
    ) {
      const id =
        getPayloadId(item);

      if (!id) {
        continue;
      }

      let tableIds =
        pendingTables.get(
          item.table
        );

      if (!tableIds) {
        tableIds =
          new Set<string>();

        pendingTables.set(
          item.table,
          tableIds
        );
      }

      tableIds.add(id);
    }

    console.log(
      `📌 [Pull] ${pendingItems.length} operações locais serão protegidas contra sobrescrita`
    );

    const hasPendingOperation = (
      table:
        SyncQueueItem["table"],
      id: string
    ): boolean => {
      return (
        pendingTables
          .get(table)
          ?.has(id) ??
        false
      );
    };

    // ==========================================================
    // PROCESSADOR GENÉRICO
    // ==========================================================

    const processTable =
      async <
        T extends object
      >({
        remoteTable,
        queueTable,
        localTable,
        query,
        mapRemote,
      }: ProcessTableOptions<T>): Promise<void> => {
        const tableStartedAt = performance.now();
        let tableOk = true;
        try {
          const {
            data,
            error,
          } =
            await query();

          if (error) {
            // VAULT_FINAL_RELEASE_V69_QUERY_ERROR
            // Erro retornado pela consulta também é falha da tabela,
            // mesmo quando não lança exception.
            tableOk = false;
            if (remoteTable === "dose_logs") criticalPullErrors.push(error.message || "Consulta de doses falhou");
            console.error(
              `❌ [Pull] Erro ao buscar ${remoteTable}:`,
              error
            );

            return;
          }

          if (
            !data ||
            data.length === 0
          ) {
            console.log(
              `ℹ️ [Pull] ${remoteTable}: nenhum registro remoto`
            );

            return;
          }

          const rows =
            uniqueById(data);

          const rowIds = rows.map(
            (row) => row.id as string
          );
          const localItems =
            await localTable.bulkGet(rowIds);
          const pendingWrites: T[] = [];

          let ignoredPending = 0;
          let ignoredUnsynced = 0;
          let ignoredNewerLocal = 0;
          let ignoredUnchanged = 0;
          let imported = 0;

          for (let index = 0; index < rows.length; index += 1) {
            const remoteItem = rows[index];
            const remoteId = remoteItem.id as string;

            if (hasPendingOperation(queueTable, remoteId)) {
              ignoredPending += 1;
              continue;
            }

            const localItem = localItems[index];

            if (localItem) {
              const localRecord = localItem as Record<string, unknown>;

              if (localRecord.synced === false) {
                ignoredUnsynced += 1;
                continue;
              }

              const localUpdatedAt =
                typeof localRecord.updated_at === "string"
                  ? Date.parse(localRecord.updated_at)
                  : Number.NaN;
              const remoteUpdatedAt =
                typeof remoteItem.updated_at === "string"
                  ? Date.parse(remoteItem.updated_at)
                  : Number.NaN;

              if (
                Number.isFinite(localUpdatedAt) &&
                Number.isFinite(remoteUpdatedAt) &&
                localUpdatedAt > remoteUpdatedAt
              ) {
                ignoredNewerLocal += 1;
                continue;
              }

              // V247: a leitura remota pode ser completa, mas não precisa
              // invalidar dezenas de consultas Dexie quando a versão é igual.
              // Mantemos o pull restaurável e reduzimos somente escrita/render.
              if (
                Number.isFinite(localUpdatedAt) &&
                Number.isFinite(remoteUpdatedAt) &&
                localUpdatedAt === remoteUpdatedAt
              ) {
                ignoredUnchanged += 1;
                continue;
              }
            }

            const mapped = mapRemote
              ? mapRemote(remoteItem, localItem as Record<string, unknown> | undefined)
              : { ...remoteItem };

            pendingWrites.push({
              ...mapped,
              synced: true,
            } as unknown as T);
            imported += 1;
          }

          if (pendingWrites.length > 0) {
            await localTable.bulkPut(pendingWrites);
          }

          const ignored =
            ignoredPending + ignoredUnsynced + ignoredNewerLocal + ignoredUnchanged;

          console.log(
            `✅ [Pull] ${remoteTable}: ${imported} importados/atualizados em lote, ${ignored} preservados (${ignoredPending} com fila pendente, ${ignoredUnsynced} não sincronizados, ${ignoredNewerLocal} locais mais recentes, ${ignoredUnchanged} sem alteração)`
          );
        } catch (
          error: unknown
        ) {
          const message =
            error instanceof
            Error
              ? error.message
              : String(
                  error
                );

          tableOk = false;
          if (remoteTable === "dose_logs") criticalPullErrors.push(message);
          console.error(
            `❌ [Pull] Erro ao processar ${remoteTable}: ${message}`
          );
        } finally {
          recordPullTable(remoteTable, performance.now() - tableStartedAt, tableOk);
        }
      };

    // ==========================================================
    // HEALTH GOALS (person-scoped, sincronizados)
    // ==========================================================

    await runPullTasks([
      () => processTable({remoteTable:"health_profiles",queueTable:"health_profiles",localTable:db.health_profiles,query:async()=>await supabase.from("health_profiles").select("*").eq("user_id",userId)}),
      () => processTable({remoteTable:"health_devices",queueTable:"health_devices",localTable:db.health_devices,query:async()=>await supabase.from("health_devices").select("*").eq("user_id",userId)}),
      () => processTable({remoteTable:"fornecimentos",queueTable:"fornecimentos",localTable:db.fornecimentos,query:async()=>await supabase.from("fornecimentos").select("*").eq("user_id",userId)}),
      () => processTable({remoteTable:"fornecimento_ciclos",queueTable:"fornecimento_ciclos",localTable:db.fornecimento_ciclos,query:async()=>await supabase.from("fornecimento_ciclos").select("*").eq("user_id",userId)}),
      () => processTable({remoteTable:"fornecimento_itens",queueTable:"fornecimento_itens",localTable:db.fornecimento_itens,query:async()=>await supabase.from("fornecimento_itens").select("*").eq("user_id",userId)}),
      () => processTable({remoteTable:"fornecimento_documentos",queueTable:"fornecimento_documentos",localTable:db.fornecimento_documentos,query:async()=>await supabase.from("fornecimento_documentos").select("*").eq("user_id",userId)}),
      () => processTable({ remoteTable: "health_goals", queueTable: "health_goals", localTable: db.health_goals, query: async () => await supabase.from("health_goals").select("*").eq("user_id", userId)  }),

    // ==========================================================
    // HEALTH REMINDERS (person-scoped, sincronizados)
    // ==========================================================

      () => processTable({
      remoteTable: "health_reminders",
      queueTable: "health_reminders",
      localTable: db.health_reminders,
      query: async () => await supabase.from("health_reminders").select("*").eq("user_id", userId),
      mapRemote: (row) => ({ ...row, time: typeof row.time === "string" ? row.time.slice(0, 5) : row.time, weekdays: Array.isArray(row.weekdays) ? row.weekdays : [] }),
      }),

    // ==========================================================
    // PERSONS
    // ==========================================================

      () => processTable({
      remoteTable:
        "persons",

      queueTable:
        "persons",

      localTable:
        db.persons,

      query:
        async () => {
          return await supabase
            .from(
              "persons"
            )
            .select("*")
            .eq(
              "user_id",
              userId
            );
        },

      mapRemote:
        (row) => {
          const {
            is_default,
            ...rest
          } = row;

          return {
            ...rest,

            isDefault:
              is_default ===
              true,
          };
        },
      }),

    // ==========================================================
    // SETTINGS
    // ==========================================================

      () => processTable({
      remoteTable:
        "settings",

      queueTable:
        "settings",

      localTable:
        db.settings,

      query:
        async () => {
          return await supabase
            .from(
              "settings"
            )
            .select("*")
            .eq(
              "user_id",
              userId
            );
        },
      }),

    // ==========================================================
    // ENTIDADES GLOBAIS
    // ==========================================================

      () => processTable({
      remoteTable:
        "medicos",
      queueTable:
        "medicos",
      localTable:
        db.medicos,
      query:
        async () =>
          await supabase
            .from("medicos")
            .select("*")
            .eq(
              "user_id",
              userId
            ),
      }),

      () => processTable({
      remoteTable:
        "farmacias",
      queueTable:
        "farmacias",
      localTable:
        db.farmacias,
      query:
        async () =>
          await supabase
            .from("farmacias")
            .select("*")
            .eq(
              "user_id",
              userId
            ),
      }),

      () => processTable({
      remoteTable:
        "hospitais",
      queueTable:
        "hospitais",
      localTable:
        db.hospitais,
      query:
        async () =>
          await supabase
            .from("hospitais")
            .select("*")
            .eq(
              "user_id",
              userId
            ),
      }),

      () => processTable({
      remoteTable:
        "locais",
      queueTable:
        "locais",
      localTable:
        db.locais,
      query:
        async () =>
          await supabase
            .from("locais")
            .select("*")
            .eq(
              "user_id",
              userId
            ),
      }),

      () => processTable({
      remoteTable:
        "instituicoes",
      queueTable:
        "instituicoes",
      localTable:
        db.instituicoes,
      query:
        async () =>
          await supabase
            .from("instituicoes")
            .select("*")
            .eq(
              "user_id",
              userId
            ),
      }),

    // ==========================================================
    // CIDS
    // ==========================================================

      () => processTable({
      remoteTable:
        "cids",

      queueTable:
        "cids",

      localTable:
        db.cids,

      query:
        async () =>
          await supabase
            .from("cids")
            .select("*")
            .eq(
              "user_id",
              userId
            ),
      }),

    ]);

    // ==========================================================
    // VAULT MEMBERS VISÍVEIS
    // ==========================================================

    const {
      data:
        membershipsByUser,

      error:
        membershipsByUserError,
    } =
      await supabase
        .from(
          "vault_members"
        )
        .select("*")
        .eq(
          "user_id",
          userId
        );

    if (
      membershipsByUserError
    ) {
      console.error(
        "❌ [Pull] Erro ao buscar memberships do usuário:",
        membershipsByUserError
      );
    }

    let pendingInvitations:
      | RemoteRow[]
      | null = [];

    if (
      authenticatedEmail
    ) {
      const {
        data,
        error,
      } =
        await supabase
          .from(
            "vault_members"
          )
          .select("*")
          .eq(
            "status",
            "pending"
          )
          .ilike(
            "email",
            authenticatedEmail
          );

      if (error) {
        console.error(
          "❌ [Pull] Erro ao buscar convites pendentes:",
          error
        );
      } else {
        pendingInvitations =
          data as
            | RemoteRow[]
            | null;
      }
    }

    const visibleMemberships =
      uniqueById([
        ...(
          (
            membershipsByUser ??
            []
          ) as RemoteRow[]
        ),

        ...(
          (
            pendingInvitations ??
            []
          ) as RemoteRow[]
        ),
      ]);

    // ==========================================================
    // VAULTS
    // ==========================================================

    const {
      data:
        ownedVaults,

      error:
        ownedVaultsError,
    } =
      await supabase
        .from("vaults")
        .select("*")
        .eq(
          "user_id",
          userId
        );

    if (
      ownedVaultsError
    ) {
      console.error(
        "❌ [Pull] Erro ao buscar Vaults próprios:",
        ownedVaultsError
      );
    }

    const sharedVaultIds =
      Array.from(
        new Set(
          visibleMemberships
            .map(
              (member) =>
                typeof member.vault_id ===
                "string"
                  ? member.vault_id
                  : null
            )
            .filter(
              (
                id
              ): id is string =>
                Boolean(id)
            )
        )
      );

    let sharedVaults:
      RemoteRow[] = [];

    if (
      sharedVaultIds.length >
      0
    ) {
      const {
        data,
        error,
      } =
        await supabase
          .from("vaults")
          .select("*")
          .in(
            "id",
            sharedVaultIds
          );

      if (error) {
        console.error(
          "❌ [Pull] Erro ao buscar Vaults compartilhados:",
          error
        );
      } else {
        sharedVaults =
          (
            data ?? []
          ) as RemoteRow[];
      }
    }

    const visibleVaults =
      uniqueById([
        ...(
          (
            ownedVaults ??
            []
          ) as RemoteRow[]
        ),

        ...sharedVaults,
      ]);

    await processTable({
      remoteTable:
        "vaults",

      queueTable:
        "vaults",

      localTable:
        db.vaults,

      query:
        async () => ({
          data:
            visibleVaults,

          error:
            null,
        }),
    });

    const visibleVaultIds =
      visibleVaults
        .map(
          (vault) =>
            typeof vault.id ===
            "string"
              ? vault.id
              : null
        )
        .filter(
          (
            id
          ): id is string =>
            Boolean(id)
        );

    let managedVaultMembers:
      RemoteRow[] = [];

    if (
      visibleVaultIds.length >
      0
    ) {
      const {
        data,
        error,
      } =
        await supabase
          .from(
            "vault_members"
          )
          .select("*")
          .in(
            "vault_id",
            visibleVaultIds
          );

      if (error) {
        console.error(
          "❌ [Pull] Não foi possível listar todos os membros dos Vaults visíveis:",
          error
        );
      } else {
        managedVaultMembers =
          (
            data ?? []
          ) as RemoteRow[];
      }
    }

    const allVisibleMemberships =
      uniqueById([
        ...visibleMemberships,
        ...managedVaultMembers,
      ]);

    await processTable({
      remoteTable:
        "vault_members",

      queueTable:
        "vaultMembers",

      localTable:
        db.vaultMembers,

      query:
        async () => ({
          data:
            allVisibleMemberships,

          error:
            null,
        }),
    });

    // ==========================================================
    // DOCUMENTOS
    // ==========================================================

    const {
      data:
        ownDocuments,

      error:
        ownDocumentsError,
    } =
      await supabase
        .from(
          "documents"
        )
        .select("*")
        .eq(
          "user_id",
          userId
        );

    if (
      ownDocumentsError
    ) {
      console.error(
        "❌ [Pull] Erro ao buscar documentos próprios:",
        ownDocumentsError
      );
    }

    let sharedDocuments:
      RemoteRow[] = [];

    if (
      visibleVaultIds.length >
      0
    ) {
      const {
        data,
        error,
      } =
        await supabase
          .from(
            "documents"
          )
          .select("*")
          .in(
            "vault_id",
            visibleVaultIds
          );

      if (error) {
        console.error(
          "❌ [Pull] Erro ao buscar documentos compartilhados:",
          error
        );
      } else {
        sharedDocuments =
          (
            data ?? []
          ) as RemoteRow[];
      }
    }

    const visibleDocuments =
      uniqueById([
        ...(
          (
            ownDocuments ??
            []
          ) as RemoteRow[]
        ),

        ...sharedDocuments,
      ]);

    await processTable({
      remoteTable:
        "documents",

      queueTable:
        "documents",

      localTable:
        db.documents,

      query:
        async () => ({
          data:
            visibleDocuments,

          error:
            null,
        }),
    });

    // ==========================================================
    // SAÚDE
    // ==========================================================

    await runPullTasks([
      () => processTable({
      remoteTable:
        "tratamentos",
      queueTable:
        "tratamentos",
      localTable:
        db.tratamentos,
      query:
        async () =>
          await supabase
            .from("tratamentos")
            .select("*")
            .eq(
              "user_id",
              userId
            ),
      }),

      () => processTable({
      remoteTable:
        "medicamentos",
      queueTable:
        "medicamentos",
      localTable:
        db.medicamentos,
      // Links are hydrated by the separate medicamento_tratamentos query.
      mapRemote: preserveMedicationTreatmentLinks,
      query:
        async () =>
          await supabase
            .from("medicamentos")
            .select("*")
            .eq(
              "user_id",
              userId
            ),
      }),

      () => processTable({
      remoteTable:
        "exames",
      queueTable:
        "exames",
      localTable:
        db.exames,
      query:
        async () =>
          await supabase
            .from("exames")
            .select("*")
            .eq(
              "user_id",
              userId
            ),
      }),

      () => processTable({
      remoteTable:
        "consultas",
      queueTable:
        "consultas",
      localTable:
        db.consultas,
      query:
        async () =>
          await supabase
            .from("consultas")
            .select("*")
            .eq(
              "user_id",
              userId
            ),
      }),

      () => processTable({
      remoteTable:
        "cirurgias",
      queueTable:
        "cirurgias",
      localTable:
        db.cirurgias,
      query:
        async () =>
          await supabase
            .from("cirurgias")
            .select("*")
            .eq(
              "user_id",
              userId
            ),
      }),

      () => processTable({
      remoteTable:
        "renovacoes",
      queueTable:
        "renovacoes",
      localTable:
        db.renovacoes,
      query:
        async () =>
          await supabase
            .from("renovacoes")
            .select("*")
            .eq(
              "user_id",
              userId
            ),
      }),

      () => processTable({
      remoteTable:
        "retiradas",
      queueTable:
        "retiradas",
      localTable:
        db.retiradas,
      query:
        async () =>
          await supabase
            .from("retiradas")
            .select("*")
            .eq(
              "user_id",
              userId
            ),
      }),

      () => processTable({
      remoteTable:
        "dose_logs",
      queueTable:
        "doseLogs",
      localTable:
        db.doseLogs,
      // V234: completa todas as páginas; nenhuma dose pode sumir no limite REST.
      query: async () => {
        const rows: RemoteRow[] = [];
        const size = 400;
        for (let offset = 0; offset < 100000; offset += size) {
          const result = await supabase.from("dose_logs").select("*")
            .eq("user_id", userId).order("id", { ascending: true })
            .range(offset, offset + size - 1);
          if (result.error) return { data: null, error: result.error };
          const batch = (result.data || []) as RemoteRow[];
          rows.push(...batch);
          if (batch.length < size) return { data: rows, error: null };
        }
        return { data: null, error: { message: "Histórico de doses excedeu o limite seguro de leitura." } };
      },
      }),

      () => processTable({
      remoteTable:
        "registros_saude",
      queueTable:
        "registros_saude",
      localTable:
        db.registros_saude,
      query:
        async () =>
          await supabase
            .from(
              "registros_saude"
            )
            .select("*")
            .eq(
              "user_id",
              userId
            ),
      }),

      () => processTable({
      remoteTable:
        "anexos_clinicos",

      queueTable:
        "anexos_clinicos",

      localTable:
        db.anexos_clinicos,

      query:
        async () =>
          await supabase
            .from(
              "anexos_clinicos"
            )
            .select("*")
            .eq(
              "user_id",
              userId
            ),

      mapRemote:
        (row) => {
          const {
            titulo,
            thumbnail,
            ...rest
          } = row;

          return {
            ...rest,

            nome:
              typeof titulo ===
              "string"
                ? titulo
                : undefined,

            thumbnail_url:
              typeof thumbnail ===
              "string"
                ? thumbnail
                : undefined,
          };
        },
      }),

    // ==========================================================
    // CREDENTIALS
    // ==========================================================

      () => processTable({
      remoteTable:
        "credentials",

      queueTable:
        "credentials",

      localTable:
        db.credentials,

      query:
        async () =>
          await supabase
            .from("credentials")
            .select("*")
            .eq(
              "user_id",
              userId
            ),

      mapRemote:
        (row) => {
          const {
            history,
            ...rest
          } = row;

          return {
            ...rest,

            password_history:
              Array.isArray(
                history
              )
                ? history
                : [],
          };
        },
      }),

    // ==========================================================
    // CARDS
    // ==========================================================

      () => processTable({
      remoteTable:
        "cards",
      queueTable:
        "cards",
      localTable:
        db.bankCards,
      query:
        async () =>
          await supabase
            .from("cards")
            .select("*")
            .eq(
              "user_id",
              userId
            ),
      }),

    ]);

    // ==========================================================
    // RELAÇÕES N:N
    // ==========================================================

    // ----------------------------------------------------------
    // MEDICAMENTO <-> TRATAMENTO
    // ----------------------------------------------------------

    // M105: duas observacoes para zero vinculos; resposta vazia isolada nao
    // e autoridade suficiente durante um delete+insert de outro aparelho.
    const relationStartedAt = performance.now();
    try {
      const { data, error } = await supabase
        .from("medicamento_tratamentos")
        .select("medicamento_id, tratamento_id");
      if (error) throw new Error(error.message || "Falha ao consultar relacoes");

      const ownedMedications = await db.medicamentos.where("user_id").equals(userId).toArray();
      const pendingIds = new Set<string>();
      for (const medication of ownedMedications) {
        if (medication.id && hasPendingOperation("medicamentos", medication.id)) pendingIds.add(medication.id);
      }
      const firstRows = data ?? [];
      // A PostgREST query truncated by server cap is NOT authoritative.
      if (firstRows.length >= 900) throw new Error("Relacoes extensas: paginacao segura necessaria antes de reconciliar");
      const initial = planMedicationTreatmentReconciliationM105({
        ownerId: userId,
        medications: ownedMedications,
        remoteRelations: firstRows,
        pendingIds,
      });
      const confirmedEmptyIds = new Set<string>();
      const confirmedRows = [...firstRows];
      // Consultas grandes podem sofrer limite/paginacao na API; nesse caso
      // nunca inferimos uma remocao pela ausencia de uma linha.
      if (initial.needConfirmation.length && firstRows.length < 900) {
        await new Promise<void>(resolve => setTimeout(resolve, 800));
        for (let index = 0; index < initial.needConfirmation.length; index += 75) {
          const batch = initial.needConfirmation.slice(index, index + 75);
          const followUp = await supabase.from("medicamento_tratamentos")
            .select("medicamento_id, tratamento_id")
            .in("medicamento_id", batch);
          if (followUp.error) {
            throw new Error(followUp.error.message || "Falha na segunda leitura de relacoes");
          }
          const seen = new Set<string>();
          for (const row of followUp.data ?? []) {
            if (typeof row.medicamento_id !== "string" ||
                typeof row.tratamento_id !== "string" || !row.tratamento_id) continue;
            seen.add(row.medicamento_id);
            confirmedRows.push(row);
          }
          for (const id of batch) if (!seen.has(id)) confirmedEmptyIds.add(id);
        }
      }
      const plan = planMedicationTreatmentReconciliationM105({
        ownerId: userId,
        medications: ownedMedications,
        remoteRelations: confirmedRows,
        pendingIds,
        confirmedEmptyIds,
      });
      // A fila e o registro sao revistos na mesma transacao: uma alteracao
      // local feita enquanto o pull aguardava rede nunca sera sobrescrita.
      await db.transaction("rw", [db.medicamentos, db.syncQueue], async () => {
        const queued = await db.syncQueue.toArray();
        const latestPendingIds = new Set(queued.filter(item => item.table === "medicamentos")
          .map(getPayloadId).filter((id): id is string => Boolean(id)));
        for (const update of plan.updates) {
          const current = await db.medicamentos.get(update.id);
          if (!current || current.user_id !== userId || current.person_id !== update.personId ||
              current.synced === false || pendingIds.has(update.id) || latestPendingIds.has(update.id)) continue;
          const oldIds = [...new Set(current.tratamento_ids ?? [])].sort();
          if (JSON.stringify(oldIds) === JSON.stringify(update.tratamentoIds)) continue;
          await db.medicamentos.update(update.id, { tratamento_ids: update.tratamentoIds });
        }
      });
      recordPullTable("medicamento_tratamentos", performance.now() - relationStartedAt, true);
    } catch (error) {
      recordPullTable("medicamento_tratamentos", performance.now() - relationStartedAt, false);
      console.error("[Pull M105] Relacoes de tratamentos nao reconciliadas:", error);
    }

    // ----------------------------------------------------------
    // EXAME <-> TRATAMENTO
    // ----------------------------------------------------------

    try {
      const {
        data,
        error,
      } =
        await supabase
          .from(
            "exame_tratamentos"
          )
          .select(
            "exame_id, tratamento_id"
          );

      if (error) {
        console.error(
          "❌ [Pull] Erro em exame_tratamentos:",
          error
        );
      } else {
        const relations =
          new Map<
            string,
            string[]
          >();

        for (
          const row of
            data ?? []
        ) {
          if (
            typeof row.exame_id !==
              "string" ||
            typeof row.tratamento_id !==
              "string"
          ) {
            continue;
          }

          const ids =
            relations.get(
              row.exame_id
            ) ?? [];

          ids.push(
            row.tratamento_id
          );

          relations.set(
            row.exame_id,
            ids
          );
        }

        for (
          const [
            exameId,
            tratamentoIds,
          ] of relations
        ) {
          if (
            hasPendingOperation(
              "exames",
              exameId
            )
          ) {
            continue;
          }

          await db.exames.update(
            exameId,
            {
              tratamento_ids:
                Array.from(
                  new Set(
                    tratamentoIds
                  )
                ),
            }
          );
        }
      }
    } catch (error) {
      console.error(
        "❌ [Pull] Falha ao reconstruir exame_tratamentos:",
        error
      );
    }

    // ----------------------------------------------------------
    // EXAME <-> CID
    // ----------------------------------------------------------

    try {
      const {
        data,
        error,
      } =
        await supabase
          .from(
            "exame_cids"
          )
          .select(
            "exame_id, cid_id"
          );

      if (error) {
        console.error(
          "❌ [Pull] Erro em exame_cids:",
          error
        );
      } else {
        const relations =
          new Map<
            string,
            string[]
          >();

        for (
          const row of
            data ?? []
        ) {
          if (
            typeof row.exame_id !==
              "string" ||
            typeof row.cid_id !==
              "string"
          ) {
            continue;
          }

          const ids =
            relations.get(
              row.exame_id
            ) ?? [];

          ids.push(
            row.cid_id
          );

          relations.set(
            row.exame_id,
            ids
          );
        }

        for (
          const [
            exameId,
            cidIds,
          ] of relations
        ) {
          if (
            hasPendingOperation(
              "exames",
              exameId
            )
          ) {
            continue;
          }

          await db.exames.update(
            exameId,
            {
              cid_ids:
                Array.from(
                  new Set(
                    cidIds
                  )
                ),
            }
          );
        }

        console.log(
          `✅ [Pull] exame_cids: relações reconstruídas para ${relations.size} exames`
        );
      }
    } catch (error) {
      console.error(
        "❌ [Pull] Falha ao reconstruir exame_cids:",
        error
      );
    }

    // ----------------------------------------------------------
    // TRATAMENTO <-> CID
    // ----------------------------------------------------------

    try {
      const {
        data,
        error,
      } =
        await supabase
          .from(
            "tratamento_cids"
          )
          .select(
            "tratamento_id, cid_id"
          );

      if (error) {
        console.error(
          "❌ [Pull] Erro em tratamento_cids:",
          error
        );
      } else {
        const relations =
          new Map<
            string,
            string[]
          >();

        for (
          const row of
            data ?? []
        ) {
          if (
            typeof row.tratamento_id !==
              "string" ||
            typeof row.cid_id !==
              "string"
          ) {
            continue;
          }

          const ids =
            relations.get(
              row.tratamento_id
            ) ?? [];

          ids.push(
            row.cid_id
          );

          relations.set(
            row.tratamento_id,
            ids
          );
        }

        for (
          const [
            tratamentoId,
            cidIds,
          ] of relations
        ) {
          if (
            hasPendingOperation(
              "tratamentos",
              tratamentoId
            )
          ) {
            continue;
          }

          await db.tratamentos.update(
            tratamentoId,
            {
              cid_ids:
                Array.from(
                  new Set(
                    cidIds
                  )
                ),
            }
          );
        }
      }
    } catch (error) {
      console.error(
        "❌ [Pull] Falha ao reconstruir tratamento_cids:",
        error
      );
    }

    // ==========================================================
    // VERSÍCULOS
    // ==========================================================

    await processTable({
      remoteTable:
        "versiculos",

      queueTable:
        "versiculos",

      localTable:
        db.versiculos,

      query:
        async () =>
          await supabase
            .from("versiculos")
            .select("*")
            .eq(
              "user_id",
              userId
            ),
    });

    // ==========================================================
    // FINALIZAÇÃO
    // ==========================================================
    if (criticalPullErrors.length > 0) {
      throw new Error(`Falha na importação das doses: ${criticalPullErrors.join(" · ")}`);
    }

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

    console.log(
      "✅ [Pull] Sincronização concluída!"
    );
  } catch (error) {
    console.error(
      "❌ [Pull] Erro fatal:",
      error
    );

    throw error;
  } finally {
    finishPullDiagnostics();
  }
}
