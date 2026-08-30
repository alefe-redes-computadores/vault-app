// lib/sync/pull.ts

import { supabase } from "@/lib/supabase/client";
import { db } from "@/lib/db";

import type { Table } from "dexie";
import type { SyncQueueItem } from "@/lib/types";

// ============================================================
// TRAVA GLOBAL DE MÓDULO
// ============================================================

let isPullingGlobal = false;

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
    row: RemoteRow
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

// ============================================================
// PULL
// ============================================================

export async function pullAllData(
  userId: string
): Promise<void> {
  if (isPullingGlobal) {
    console.warn(
      "⚠️ [Pull] Tentativa de execução simultânea bloqueada pela trava global."
    );

    return;
  }

  isPullingGlobal = true;

  try {
    console.log(
      "🔄 [Pull] Iniciando sincronização da nuvem para o dispositivo..."
    );

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
        try {
          const {
            data,
            error,
          } =
            await query();

          if (error) {
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

          let ignored = 0;
          let imported = 0;

          for (
            const remoteItem of rows
          ) {
            if (
              !remoteItem.id
            ) {
              continue;
            }

            if (
              hasPendingOperation(
                queueTable,
                remoteItem.id
              )
            ) {
              ignored++;

              console.log(
                `🛡️ [Pull] ${queueTable}:${remoteItem.id} possui alteração local pendente. Versão remota ignorada.`
              );

              continue;
            }

            const mapped =
              mapRemote
                ? mapRemote(
                    remoteItem
                  )
                : {
                    ...remoteItem,
                  };

            const localValue = {
              ...mapped,
              synced: true,
            } as unknown as T;

            await localTable.put(
              localValue
            );

            imported++;
          }

          console.log(
            `✅ [Pull] ${remoteTable}: ${imported} importados/atualizados, ${ignored} preservados por alterações locais`
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

          console.error(
            `❌ [Pull] Erro ao processar ${remoteTable}: ${message}`
          );
        }
      };

    // ==========================================================
    // PERSONS
    // ==========================================================

    await processTable({
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
    });

    // ==========================================================
    // SETTINGS
    // ==========================================================

    await processTable({
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
    });

    // ==========================================================
    // ENTIDADES GLOBAIS
    // ==========================================================

    await processTable({
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
    });

    await processTable({
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
    });

    await processTable({
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
    });

    await processTable({
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
    });

    await processTable({
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
    });

    // ==========================================================
    // CIDS
    // ==========================================================

    await processTable({
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
    });

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

    await processTable({
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
    });

    await processTable({
      remoteTable:
        "medicamentos",
      queueTable:
        "medicamentos",
      localTable:
        db.medicamentos,
      query:
        async () =>
          await supabase
            .from("medicamentos")
            .select("*")
            .eq(
              "user_id",
              userId
            ),
    });

    await processTable({
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
    });

    await processTable({
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
    });

    await processTable({
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
    });

    await processTable({
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
    });

    await processTable({
      remoteTable:
        "dose_logs",
      queueTable:
        "doseLogs",
      localTable:
        db.doseLogs,
      query:
        async () =>
          await supabase
            .from("dose_logs")
            .select("*")
            .eq(
              "user_id",
              userId
            ),
    });

    await processTable({
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
    });

    await processTable({
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
    });

    // ==========================================================
    // CREDENTIALS
    // ==========================================================

    await processTable({
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
    });

    // ==========================================================
    // CARDS
    // ==========================================================

    await processTable({
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
    });

    // ==========================================================
    // RELAÇÕES N:N
    // ==========================================================

    // ----------------------------------------------------------
    // MEDICAMENTO <-> TRATAMENTO
    // ----------------------------------------------------------

    try {
      const {
        data,
        error,
      } =
        await supabase
          .from(
            "medicamento_tratamentos"
          )
          .select(
            "medicamento_id, tratamento_id"
          );

      if (error) {
        console.error(
          "❌ [Pull] Erro em medicamento_tratamentos:",
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
            typeof row.medicamento_id !==
              "string" ||
            typeof row.tratamento_id !==
              "string"
          ) {
            continue;
          }

          const ids =
            relations.get(
              row.medicamento_id
            ) ?? [];

          ids.push(
            row.tratamento_id
          );

          relations.set(
            row.medicamento_id,
            ids
          );
        }

        for (
          const [
            medicamentoId,
            tratamentoIds,
          ] of relations
        ) {
          if (
            hasPendingOperation(
              "medicamentos",
              medicamentoId
            )
          ) {
            continue;
          }

          await db.medicamentos.update(
            medicamentoId,
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
        "❌ [Pull] Falha ao reconstruir medicamento_tratamentos:",
        error
      );
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
    isPullingGlobal =
      false;
  }
}