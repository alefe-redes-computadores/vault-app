// lib/repositories/tratamentos.ts

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

import type {
  Medicamento,
  Tratamento,
} from "@/lib/types";

// ============================================================
// TIPOS
// ============================================================

type CreateTratamentoBase =
  Omit<
    Tratamento,
    | "id"
    | "user_id"
    | "person_id"
    | "created_at"
    | "updated_at"
    | "synced"
  >;

export type CreateTratamentoInput =
  Omit<
    CreateTratamentoBase,
    "medicamento_ids"
  > & {
    id?: string;

    person_id:
      string;

    /*
     * Campo de comando.
     *
     * NÃO é persistido em Tratamento.
     *
     * A relação canônica mora em:
     *
     * Medicamento.tratamento_ids
     */
    medicamento_ids?:
      string[];
  };

type UpdateTratamentoBase =
  Partial<
    Omit<
      Tratamento,
      | "id"
      | "user_id"
      | "person_id"
      | "created_at"
      | "updated_at"
      | "synced"
    >
  >;

export type UpdateTratamentoInput =
  Omit<
    UpdateTratamentoBase,
    "medicamento_ids"
  > & {
    /*
     * undefined:
     * não altera os medicamentos associados.
     *
     * []:
     * remove todos os vínculos.
     *
     * [ids]:
     * reconcilia exatamente para essa lista.
     */
    medicamento_ids?:
      string[];
  };

export type TratamentoUpdateResult = {
  id:
    string;

  medicamentosDescontinuados:
    Medicamento[];
};

export type TratamentoCreateResult =
  TratamentoUpdateResult;

// ============================================================
// HELPERS
// ============================================================

function requirePersonId(
  personId?: string
): string {
  const normalized =
    personId?.trim();

  if (!normalized) {
    throw new Error(
      "Pessoa ativa não identificada."
    );
  }

  return normalized;
}

function requireTratamentoId(
  id?: string
): string {
  const normalized =
    id?.trim();

  if (!normalized) {
    throw new Error(
      "Tratamento não identificado."
    );
  }

  return normalized;
}

function generateId(): string {
  if (
    typeof crypto !==
      "undefined" &&
    typeof crypto.randomUUID ===
      "function"
  ) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}`;
}

function nowIso(): string {
  return new Date()
    .toISOString();
}

function uniqueIds(
  ids?: string[]
): string[] | undefined {
  if (
    ids ===
    undefined
  ) {
    return undefined;
  }

  return Array.from(
    new Set(
      ids
        .map(
          (
            id
          ) =>
            id.trim()
        )
        .filter(
          Boolean
        )
    )
  );
}

function removeUndefined<
  T extends
    Record<
      string,
      unknown
    >,
>(
  value: T
): Partial<T> {
  return Object.fromEntries(
    Object.entries(
      value
    ).filter(
      (
        [, item]
      ) =>
        item !==
        undefined
    )
  ) as Partial<T>;
}

function sortTratamentos(
  tratamentos:
    Tratamento[]
): Tratamento[] {
  return [
    ...tratamentos,
  ].sort(
    (
      a,
      b
    ) =>
      String(
        a.nome ||
          ""
      ).localeCompare(
        String(
          b.nome ||
            ""
        ),
        "pt-BR",
        {
          sensitivity:
            "base",
        }
      )
  );
}

async function getAuthenticatedUserId(): Promise<string> {
  const {
    data,
    error,
  } =
    await supabase.auth.getUser();

  if (
    error
  ) {
    throw error;
  }

  if (
    !data.user
  ) {
    throw new Error(
      "Usuário não autenticado."
    );
  }

  return data.user.id;
}

async function getTratamentoForPerson(
  id: string,
  personId: string
): Promise<Tratamento | undefined> {
  const safeId =
    requireTratamentoId(
      id
    );

  const safePersonId =
    requirePersonId(
      personId
    );

  const tratamento =
    await db.tratamentos.get(
      safeId
    );

  if (
    !tratamento ||
    tratamento.person_id !==
      safePersonId
  ) {
    return undefined;
  }

  return tratamento;
}

async function getMedicamentosForPerson(
  ids: string[],
  personId: string
): Promise<Medicamento[]> {
  if (
    ids.length ===
    0
  ) {
    return [];
  }

  const medicamentos =
    await db.medicamentos
      .where(
        "id"
      )
      .anyOf(
        ids
      )
      .toArray();

  const byId =
    new Map(
      medicamentos.map(
        (
          medicamento
        ) => [
          medicamento.id,
          medicamento,
        ]
      )
    );

  const result:
    Medicamento[] = [];

  for (
    const id of
    ids
  ) {
    const medicamento =
      byId.get(
        id
      );

    if (
      !medicamento ||
      medicamento.person_id !==
        personId
    ) {
      throw new Error(
        "Um dos medicamentos selecionados não pertence à pessoa ativa."
      );
    }

    result.push(
      medicamento
    );
  }

  return result;
}

async function getMedicamentosLinkedToTratamento(
  tratamentoId:
    string,
  personId:
    string
): Promise<Medicamento[]> {
  const relacionados =
    await db.medicamentos
      .where(
        "tratamento_ids"
      )
      .equals(
        tratamentoId
      )
      .toArray();

  return relacionados.filter(
    (
      medicamento
    ) =>
      medicamento.person_id ===
      personId
  );
}

function isTratamentoEncerrado(
  status:
    Tratamento["status"] | undefined
): boolean {
  return (
    status ===
      "concluido" ||
    status ===
      "suspenso"
  );
}

function motivoStatusTratamento(
  status:
    Tratamento["status"]
): string {
  if (
    status ===
    "concluido"
  ) {
    return "Tratamento original marcado como concluído";
  }

  if (
    status ===
    "suspenso"
  ) {
    return "Tratamento original marcado como suspenso";
  }

  return "Tratamento original encerrado";
}

/*
 * Retorna true quando o medicamento ainda participa de pelo
 * menos outro Tratamento ATIVO da mesma pessoa.
 *
 * Essa proteção evita:
 *
 * Tratamento A -> concluído
 * Tratamento B -> continua ativo
 *
 * Medicamento ligado aos dois não deve ser descontinuado apenas
 * porque A terminou.
 */
async function medicamentoTemOutroTratamentoAtivo(
  medicamento:
    Medicamento,
  tratamentoAtualId:
    string,
  personId:
    string
): Promise<boolean> {
  const outrosIds =
    Array.from(
      new Set(
        (
          medicamento.tratamento_ids ||
          []
        ).filter(
          (
            tratamentoId
          ) =>
            tratamentoId !==
            tratamentoAtualId
        )
      )
    );

  if (
    outrosIds.length ===
    0
  ) {
    return false;
  }

  const tratamentos =
    await db.tratamentos
      .where(
        "id"
      )
      .anyOf(
        outrosIds
      )
      .toArray();

  return tratamentos.some(
    (
      tratamento
    ) =>
      tratamento.person_id ===
        personId &&
      tratamento.status ===
        "ativo"
  );
}

async function putMedicamentoAndQueue(
  medicamento:
    Medicamento
): Promise<Medicamento> {
  if (
    !medicamento.id
  ) {
    throw new Error(
      "Medicamento sem identificador."
    );
  }

  await db.medicamentos.put(
    medicamento
  );

  const registroCompleto =
    await db.medicamentos.get(
      medicamento.id
    );

  if (
    !registroCompleto
  ) {
    throw new Error(
      "Não foi possível validar o medicamento atualizado."
    );
  }

  await enfileirarOperacao(
    "medicamentos",
    "update",
    registroCompleto,
    {
      dispatchSync:
        false,
    }
  );

  return registroCompleto;
}

// ============================================================
// REPOSITORY
// ============================================================

export const tratamentosRepository = {
  // ==========================================================
  // LIST
  // ==========================================================

  async getAll(
    personId: string
  ): Promise<Tratamento[]> {
    const safePersonId =
      requirePersonId(
        personId
      );

    const tratamentos =
      await db.tratamentos
        .where(
          "person_id"
        )
        .equals(
          safePersonId
        )
        .toArray();

    return sortTratamentos(
      tratamentos
    );
  },

  // ==========================================================
  // GET
  // ==========================================================

  async getById(
    id: string,
    personId: string
  ): Promise<Tratamento | undefined> {
    return getTratamentoForPerson(
      id,
      personId
    );
  },

  // ==========================================================
  // MEDICAMENTOS VINCULADOS
  // ==========================================================

  async getMedicamentos(
    id: string,
    personId: string
  ): Promise<Medicamento[]> {
    const safeId =
      requireTratamentoId(
        id
      );

    const safePersonId =
      requirePersonId(
        personId
      );

    const tratamento =
      await getTratamentoForPerson(
        safeId,
        safePersonId
      );

    if (!tratamento) {
      return [];
    }

    return getMedicamentosLinkedToTratamento(
      safeId,
      safePersonId
    );
  },

  // ==========================================================
  // CREATE COM RESULTADO COMPLETO
  // ==========================================================

  async createWithResult(
    data:
      CreateTratamentoInput
  ): Promise<TratamentoCreateResult> {
    const personId =
      requirePersonId(
        data.person_id
      );

    const userId =
      await getAuthenticatedUserId();

    const now =
      nowIso();

    const tratamentoId =
      data.id ||
      generateId();

    const medicamentoIds =
      uniqueIds(
        data.medicamento_ids
      ) ||
      [];

    const medicamentosSelecionados =
      await getMedicamentosForPerson(
        medicamentoIds,
        personId
      );

    const {
      medicamento_ids:
        _medicamentoIds,
      id:
        _inputId,
      ...tratamentoData
    } =
      data;

    const tratamentoCompleto:
      Tratamento = {
      ...tratamentoData,

      id:
        tratamentoId,

      user_id:
        userId,

      person_id:
        personId,

      cid_ids:
        uniqueIds(
          data.cid_ids
        ),

      medico_ids:
        uniqueIds(
          data.medico_ids
        ),

      hospital_ids:
        uniqueIds(
          data.hospital_ids
        ),

      local_ids:
        uniqueIds(
          data.local_ids
        ),

      created_at:
        now,

      updated_at:
        now,

      synced:
        false,
    };

    const medicamentosDescontinuados:
      Medicamento[] = [];

    await db.transaction(
      "rw",
      [
        db.tratamentos,
        db.medicamentos,
        db.syncQueue,
      ],
      async () => {
        await db.tratamentos.add(
          tratamentoCompleto
        );

        await enfileirarOperacao(
          "tratamentos",
          "add",
          tratamentoCompleto,
          {
            dispatchSync:
              false,
          }
        );

        for (
          const medicamento of
          medicamentosSelecionados
        ) {
          if (
            !medicamento.id
          ) {
            continue;
          }

          const novosTratamentoIds =
            Array.from(
              new Set([
                ...(
                  medicamento.tratamento_ids ||
                  []
                ),

                tratamentoId,
              ])
            );

          let atualizado:
            Medicamento = {
            ...medicamento,

            tratamento_ids:
              novosTratamentoIds,

            updated_at:
              now,

            synced:
              false,
          };

          if (
            isTratamentoEncerrado(
              tratamentoCompleto.status
            )
          ) {
            const possuiOutroAtivo =
              await medicamentoTemOutroTratamentoAtivo(
                atualizado,
                tratamentoId,
                personId
              );

            if (
              !possuiOutroAtivo &&
              atualizado.status !==
                "descontinuado"
            ) {
              atualizado = {
                ...atualizado,

                status:
                  "descontinuado",

                motivo_descontinuacao:
                  motivoStatusTratamento(
                    tratamentoCompleto.status
                  ),
              };

              medicamentosDescontinuados.push(
                atualizado
              );
            }
          }

          await putMedicamentoAndQueue(
            atualizado
          );
        }
      }
    );

    solicitarProcessamentoSync();

    return {
      id:
        tratamentoId,

      medicamentosDescontinuados,
    };
  },

  /*
   * Mantém compatibilidade com consumidores que precisam
   * somente do ID do tratamento criado.
   */
  async create(
    data:
      CreateTratamentoInput
  ): Promise<string> {
    const result =
      await this.createWithResult(
        data
      );

    return result.id;
  },

  // ==========================================================
  // UPDATE
  // ==========================================================

  async update(
    id: string,
    personId: string,
    data:
      UpdateTratamentoInput
  ): Promise<TratamentoUpdateResult> {
    const safeId =
      requireTratamentoId(
        id
      );

    const safePersonId =
      requirePersonId(
        personId
      );

    const userId =
      await getAuthenticatedUserId();

    const current =
      await getTratamentoForPerson(
        safeId,
        safePersonId
      );

    if (!current) {
      throw new Error(
        "Tratamento não encontrado para a pessoa ativa."
      );
    }

    if (
      current.user_id &&
      current.user_id !==
        userId
    ) {
      throw new Error(
        "Tratamento não pertence ao usuário autenticado."
      );
    }

    const medicamentosDesejadosIds =
      uniqueIds(
        data.medicamento_ids
      );

    if (
      medicamentosDesejadosIds !==
      undefined
    ) {
      await getMedicamentosForPerson(
        medicamentosDesejadosIds,
        safePersonId
      );
    }

    const {
      medicamento_ids:
        _medicamentoIds,
      ...tratamentoChanges
    } =
      data;

    const now =
      nowIso();

    const payload =
      removeUndefined({
        ...tratamentoChanges,

        ...(data.cid_ids !==
        undefined
          ? {
              cid_ids:
                uniqueIds(
                  data.cid_ids
                ),
            }
          : {}),

        ...(data.medico_ids !==
        undefined
          ? {
              medico_ids:
                uniqueIds(
                  data.medico_ids
                ),
            }
          : {}),

        ...(data.hospital_ids !==
        undefined
          ? {
              hospital_ids:
                uniqueIds(
                  data.hospital_ids
                ),
            }
          : {}),

        ...(data.local_ids !==
        undefined
          ? {
              local_ids:
                uniqueIds(
                  data.local_ids
                ),
            }
          : {}),

        updated_at:
          now,

        synced:
          false,
      });

    const medicamentosDescontinuados:
      Medicamento[] = [];

    await db.transaction(
      "rw",
      [
        db.tratamentos,
        db.medicamentos,
        db.syncQueue,
      ],
      async () => {
        const updated =
          await db.tratamentos.update(
            safeId,
            payload
          );

        if (
          updated ===
          0
        ) {
          throw new Error(
            "Não foi possível atualizar o tratamento."
          );
        }

        const tratamentoAtualizado =
          await db.tratamentos.get(
            safeId
          );

        if (
          !tratamentoAtualizado ||
          tratamentoAtualizado.person_id !==
            safePersonId
        ) {
          throw new Error(
            "Falha ao validar o tratamento atualizado."
          );
        }

        await enfileirarOperacao(
          "tratamentos",
          "update",
          tratamentoAtualizado,
          {
            dispatchSync:
              false,
          }
        );

        if (
          medicamentosDesejadosIds !==
          undefined
        ) {
          const atualmenteVinculados =
            await getMedicamentosLinkedToTratamento(
              safeId,
              safePersonId
            );

          const atuaisIds =
            new Set(
              atualmenteVinculados
                .map(
                  (
                    medicamento
                  ) =>
                    medicamento.id
                )
                .filter(
                  (
                    medicamentoId
                  ): medicamentoId is string =>
                    Boolean(
                      medicamentoId
                    )
                )
            );

          const desejadosIds =
            new Set(
              medicamentosDesejadosIds
            );

          for (
            const medicamento of
            atualmenteVinculados
          ) {
            if (
              !medicamento.id ||
              desejadosIds.has(
                medicamento.id
              )
            ) {
              continue;
            }

            const atualizado:
              Medicamento = {
              ...medicamento,

              tratamento_ids:
                Array.from(
                  new Set(
                    (
                      medicamento.tratamento_ids ||
                      []
                    ).filter(
                      (
                        tratamentoId
                      ) =>
                        tratamentoId !==
                        safeId
                    )
                  )
                ),

              updated_at:
                now,

              synced:
                false,
            };

            await putMedicamentoAndQueue(
              atualizado
            );
          }

          const idsAdicionar =
            medicamentosDesejadosIds.filter(
              (
                medicamentoId
              ) =>
                !atuaisIds.has(
                  medicamentoId
                )
            );

          const medicamentosAdicionar =
            await getMedicamentosForPerson(
              idsAdicionar,
              safePersonId
            );

          for (
            const medicamento of
            medicamentosAdicionar
          ) {
            const atualizado:
              Medicamento = {
              ...medicamento,

              tratamento_ids:
                Array.from(
                  new Set([
                    ...(
                      medicamento.tratamento_ids ||
                      []
                    ),

                    safeId,
                  ])
                ),

              updated_at:
                now,

              synced:
                false,
            };

            await putMedicamentoAndQueue(
              atualizado
            );
          }
        }

        if (
          isTratamentoEncerrado(
            tratamentoAtualizado.status
          )
        ) {
          const vinculadosFinais =
            await getMedicamentosLinkedToTratamento(
              safeId,
              safePersonId
            );

          for (
            const medicamento of
            vinculadosFinais
          ) {
            if (
              !medicamento.id ||
              medicamento.status ===
                "descontinuado"
            ) {
              continue;
            }

            const possuiOutroAtivo =
              await medicamentoTemOutroTratamentoAtivo(
                medicamento,
                safeId,
                safePersonId
              );

            if (
              possuiOutroAtivo
            ) {
              continue;
            }

            const atualizado:
              Medicamento = {
              ...medicamento,

              status:
                "descontinuado",

              motivo_descontinuacao:
                motivoStatusTratamento(
                  tratamentoAtualizado.status
                ),

              updated_at:
                now,

              synced:
                false,
            };

            const persistido =
              await putMedicamentoAndQueue(
                atualizado
              );

            medicamentosDescontinuados.push(
              persistido
            );
          }
        }
      }
    );

    solicitarProcessamentoSync();

    return {
      id:
        safeId,

      medicamentosDescontinuados,
    };
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
  ): Promise<string> {
    const safeId =
      requireTratamentoId(
        id
      );

    const safePersonId =
      requirePersonId(
        personId
      );

    const userId =
      await getAuthenticatedUserId();

    const tratamento =
      await getTratamentoForPerson(
        safeId,
        safePersonId
      );

    if (!tratamento) {
      throw new Error(
        "Tratamento não encontrado para a pessoa ativa."
      );
    }

    if (
      tratamento.user_id &&
      tratamento.user_id !==
        userId
    ) {
      throw new Error(
        "Tratamento não pertence ao usuário autenticado."
      );
    }

    const now =
      nowIso();

    await db.transaction(
      "rw",
      [
        db.tratamentos,
        db.medicamentos,
        db.exames,
        db.consultas,
        db.cirurgias,
        db.registros_saude,
        db.documents,
        db.syncQueue,
      ],
      async () => {
        const medicamentosRelacionados =
          await db.medicamentos
            .where(
              "tratamento_ids"
            )
            .equals(
              safeId
            )
            .toArray();

        for (
          const medicamento of
          medicamentosRelacionados
        ) {
          if (
            !medicamento.id ||
            medicamento.person_id !==
              safePersonId
          ) {
            continue;
          }

          const atualizado:
            Medicamento = {
            ...medicamento,

            tratamento_ids:
              Array.from(
                new Set(
                  (
                    medicamento.tratamento_ids ||
                    []
                  ).filter(
                    (
                      tratamentoId
                    ) =>
                      tratamentoId !==
                      safeId
                  )
                )
              ),

            updated_at:
              now,

            synced:
              false,
          };

          await putMedicamentoAndQueue(
            atualizado
          );
        }

        const examesRelacionados =
          await db.exames
            .where(
              "tratamento_ids"
            )
            .equals(
              safeId
            )
            .toArray();

        for (
          const exame of
          examesRelacionados
        ) {
          if (
            !exame.id ||
            exame.person_id !==
              safePersonId
          ) {
            continue;
          }

          const novosIds =
            Array.from(
              new Set(
                (
                  exame.tratamento_ids ||
                  []
                ).filter(
                  (
                    tratamentoId
                  ) =>
                    tratamentoId !==
                    safeId
                )
              )
            );

          await db.exames.update(
            exame.id,
            {
              tratamento_ids:
                novosIds,

              updated_at:
                now,

              synced:
                false,
            }
          );

          const exameCompleto =
            await db.exames.get(
              exame.id
            );

          if (
            !exameCompleto ||
            exameCompleto.person_id !==
              safePersonId
          ) {
            throw new Error(
              "Não foi possível validar um exame após remover o vínculo com o tratamento."
            );
          }

          await enfileirarOperacao(
            "exames",
            "update",
            exameCompleto,
            {
              dispatchSync:
                false,
            }
          );
        }

        const consultasRelacionadas =
          await db.consultas
            .where("person_id")
            .equals(safePersonId)
            .filter((consulta) =>
              (
                consulta.tratamento_ids ||
                []
              ).includes(safeId)
            )
            .toArray();

        for (
          const consulta of
          consultasRelacionadas
        ) {
          if (!consulta.id) {
            continue;
          }

          const atualizada = {
            ...consulta,
            tratamento_ids:
              Array.from(
                new Set(
                  (
                    consulta.tratamento_ids ||
                    []
                  ).filter(
                    (tratamentoId) =>
                      tratamentoId !==
                      safeId
                  )
                )
              ),
            updated_at: now,
            synced: false,
          };

          await db.consultas.put(
            atualizada
          );

          await enfileirarOperacao(
            "consultas",
            "update",
            atualizada,
            { dispatchSync: false }
          );
        }

        const cirurgiasRelacionadas =
          await db.cirurgias
            .where("person_id")
            .equals(safePersonId)
            .filter((cirurgia) =>
              (
                cirurgia.tratamento_ids ||
                []
              ).includes(safeId)
            )
            .toArray();

        for (
          const cirurgia of
          cirurgiasRelacionadas
        ) {
          if (!cirurgia.id) {
            continue;
          }

          const atualizada = {
            ...cirurgia,
            tratamento_ids:
              Array.from(
                new Set(
                  (
                    cirurgia.tratamento_ids ||
                    []
                  ).filter(
                    (tratamentoId) =>
                      tratamentoId !==
                      safeId
                  )
                )
              ),
            updated_at: now,
            synced: false,
          };

          await db.cirurgias.put(
            atualizada
          );

          await enfileirarOperacao(
            "cirurgias",
            "update",
            atualizada,
            { dispatchSync: false }
          );
        }

        const registrosRelacionados =
          await db.registros_saude
            .where("person_id")
            .equals(safePersonId)
            .filter((registro) =>
              (
                registro.tratamento_ids ||
                []
              ).includes(safeId)
            )
            .toArray();

        for (
          const registro of
          registrosRelacionados
        ) {
          if (!registro.id) {
            continue;
          }

          const atualizado = {
            ...registro,
            tratamento_ids:
              Array.from(
                new Set(
                  (
                    registro.tratamento_ids ||
                    []
                  ).filter(
                    (tratamentoId) =>
                      tratamentoId !==
                      safeId
                  )
                )
              ),
            updated_at: now,
            synced: false,
          };

          await db.registros_saude.put(
            atualizado
          );

          await enfileirarOperacao(
            "registros_saude" as any,
            "update",
            atualizado,
            { dispatchSync: false }
          );
        }

        const documentosDaPessoa =
          await db.documents
            .where("person_id")
            .equals(safePersonId)
            .toArray();

        for (
          const documento of
          documentosDaPessoa
        ) {
          if (!documento.id) {
            continue;
          }

          const metadata =
            documento.metadata || {};

          const vinculoDireto =
            documento.entidade_tipo ===
              "tratamento" &&
            documento.entidade_id ===
              safeId;

          const vinculoLegado =
            metadata.tratamento_id ===
            safeId;

          if (
            !vinculoDireto &&
            !vinculoLegado
          ) {
            continue;
          }

          const metadataAtualizada = {
            ...metadata,
          };

          delete metadataAtualizada.tratamento_id;

          const atualizado = {
            ...documento,
            ...(vinculoDireto
              ? {
                  entidade_tipo: null,
                  entidade_id: null,
                }
              : {}),
            metadata:
              metadataAtualizada,
            updated_at:
              now,
            synced:
              false,
          };

          await db.documents.put(
            atualizado as any
          );

          await enfileirarOperacao(
            "documents",
            "update",
            atualizado,
            { dispatchSync: false }
          );
        }

        await db.tratamentos.delete(
          safeId
        );

        await enfileirarOperacao(
          "tratamentos",
          "delete",
          {
            id:
              safeId,

            person_id:
              safePersonId,

            user_id:
              userId,
          },
          {
            dispatchSync:
              false,
          }
        );
      }
    );

    solicitarProcessamentoSync();

    return safeId;
  },
};
