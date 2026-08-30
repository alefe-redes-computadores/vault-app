// lib/repositories/medicos.ts

import { db } from "@/lib/db";
import { enfileirarOperacao } from "@/lib/sync/enfileirarOperacao";
import { supabase } from "@/lib/supabase/client";
import type { Medico } from "@/lib/types";

// ============================================================
// TYPES
// ============================================================

type CreateMedicoInput = Omit<
  Medico,
  | "id"
  | "user_id"
  | "person_id"
  | "hospital_ids"
  | "local_ids"
  | "tratamento_ids"
  | "created_at"
  | "updated_at"
  | "synced"
> & {
  id?: string;
};

type UpdateMedicoInput = Partial<
  Omit<
    Medico,
    | "id"
    | "user_id"
    | "person_id"
    | "hospital_ids"
    | "local_ids"
    | "tratamento_ids"
    | "created_at"
  >
>;

// ============================================================
// HELPERS
// ============================================================

function uniqueIds(
  ids?: string[]
): string[] {
  if (!ids) {
    return [];
  }

  return Array.from(
    new Set(
      ids.filter(Boolean)
    )
  );
}

// ============================================================
// REPOSITORY
// ============================================================

export const medicosRepository = {
  // ==========================================================
  // LIST
  // ==========================================================

  async getAll() {
    return db.medicos.toArray();
  },

  // ==========================================================
  // GET
  // ==========================================================

  async getById(
    id: string
  ) {
    return db.medicos.get(id);
  },

  // ==========================================================
  // CREATE
  // ==========================================================

  async create(
    data: CreateMedicoInput
  ) {
    const {
      data: {
        user,
      },
    } =
      await supabase.auth.getUser();

    if (!user) {
      throw new Error(
        "Usuário não autenticado."
      );
    }

    const now =
      new Date().toISOString();

    const medicoId =
      data.id ||
      crypto.randomUUID();

    /*
     * Médico é entidade GLOBAL por usuário.
     *
     * Portanto:
     * - sem person_id;
     * - sem tratamento_ids;
     * - sem hospital_ids;
     * - sem local_ids.
     *
     * Relações canônicas:
     * - Hospital.medico_ids[]
     * - LocalSaude.medico_ids[]
     * - Tratamento.medico_ids[]
     */
    const medicoCompleto:
      Medico = {
      ...data,

      id:
        medicoId,

      user_id:
        user.id,

      created_at:
        now,

      updated_at:
        now,

      synced:
        false,
    };

    await db.transaction(
      "rw",
      [
        db.medicos,
        db.syncQueue,
      ],
      async () => {
        await db.medicos.add(
          medicoCompleto
        );

        await enfileirarOperacao(
          "medicos",
          "add",
          medicoCompleto
        );
      }
    );

    return medicoId;
  },

  // ==========================================================
  // UPDATE
  // ==========================================================

  async update(
    id: string,
    data: UpdateMedicoInput
  ) {
    const current =
      await db.medicos.get(
        id
      );

    if (!current) {
      throw new Error(
        "Médico não encontrado."
      );
    }

    const now =
      new Date().toISOString();

    const medicoAtualizado:
      Medico = {
      ...current,
      ...data,

      id:
        current.id,

      user_id:
        current.user_id,

      /*
       * Campos legados intencionalmente não são
       * recriados nem transferidos pelo update.
       */
      person_id:
        undefined,

      hospital_ids:
        undefined,

      local_ids:
        undefined,

      tratamento_ids:
        undefined,

      created_at:
        current.created_at,

      updated_at:
        now,

      synced:
        false,
    };

    await db.transaction(
      "rw",
      [
        db.medicos,
        db.syncQueue,
      ],
      async () => {
        await db.medicos.put(
          medicoAtualizado
        );

        /*
         * Enfileira o REGISTRO COMPLETO.
         *
         * Evita o problema de payload parcial em handlers
         * de sync baseados em upsert.
         */
        await enfileirarOperacao(
          "medicos",
          "update",
          medicoAtualizado
        );
      }
    );

    return id;
  },

  // ==========================================================
  // DELETE
  // ==========================================================

  async delete(
    id: string
  ) {
    return this.deleteSafe(
      id
    );
  },

  // ==========================================================
  // DELETE SAFE
  // ==========================================================

  async deleteSafe(
    id: string
  ) {
    const medico =
      await db.medicos.get(
        id
      );

    if (!medico) {
      throw new Error(
        "Médico não encontrado."
      );
    }

    const now =
      new Date().toISOString();

    /*
     * Médico é global.
     *
     * Portanto o cleanup NÃO é limitado à pessoa ativa.
     *
     * O médico pode estar relacionado a registros de várias
     * pessoas do mesmo usuário. Excluir o médico remove apenas
     * as referências, nunca os registros clínicos.
     *
     * IMPORTANTE:
     * Medicamento.medico_descontinuacao_id NÃO é limpo aqui.
     *
     * Esse campo pode representar histórico/auditoria sobre
     * quem descontinuou o medicamento. Sua semântica será
     * validada durante a auditoria de Medicamentos.
     */
    await db.transaction(
      "rw",
      [
        db.medicos,
        db.cids,
        db.consultas,
        db.exames,
        db.cirurgias,
        db.medicamentos,
        db.renovacoes,
        db.documents,
        db.tratamentos,
        db.hospitais,
        db.locais,
        db.syncQueue,
      ],
      async () => {
        // ------------------------------------------------------
        // CIDS
        // ------------------------------------------------------

        const cids =
          await db.cids
            .toArray();

        for (
          const cid of
          cids
        ) {
          if (
            !cid.id ||
            cid.medico_id !== id
          ) {
            continue;
          }

          const updatedCid = {
            ...cid,

            medico_id:
              undefined,

            updated_at:
              now,

            synced:
              false,
          };

          await db.cids.put(
            updatedCid
          );

          await enfileirarOperacao(
            "cids",
            "update",
            updatedCid
          );
        }

        // ------------------------------------------------------
        // CONSULTAS
        // ------------------------------------------------------

        const consultas =
          await db.consultas
            .toArray();

        for (
          const consulta of
          consultas
        ) {
          if (
            !consulta.id ||
            consulta.medico_id !==
              id
          ) {
            continue;
          }

          const updatedConsulta = {
            ...consulta,

            medico_id:
              undefined,

            updated_at:
              now,

            synced:
              false,
          };

          await db.consultas.put(
            updatedConsulta
          );

          await enfileirarOperacao(
            "consultas",
            "update",
            updatedConsulta
          );
        }

        // ------------------------------------------------------
        // EXAMES
        // ------------------------------------------------------

        const exames =
          await db.exames
            .toArray();

        for (
          const exame of
          exames
        ) {
          if (
            !exame.id ||
            exame.medico_id !== id
          ) {
            continue;
          }

          const updatedExame = {
            ...exame,

            medico_id:
              undefined,

            updated_at:
              now,

            synced:
              false,
          };

          await db.exames.put(
            updatedExame
          );

          await enfileirarOperacao(
            "exames",
            "update",
            updatedExame
          );
        }

        // ------------------------------------------------------
        // CIRURGIAS
        // ------------------------------------------------------

        const cirurgias =
          await db.cirurgias
            .toArray();

        for (
          const cirurgia of
          cirurgias
        ) {
          if (
            !cirurgia.id ||
            cirurgia.medico_id !==
              id
          ) {
            continue;
          }

          const updatedCirurgia = {
            ...cirurgia,

            medico_id:
              undefined,

            updated_at:
              now,

            synced:
              false,
          };

          await db.cirurgias.put(
            updatedCirurgia
          );

          await enfileirarOperacao(
            "cirurgias",
            "update",
            updatedCirurgia
          );
        }

        // ------------------------------------------------------
        // MEDICAMENTOS
        // ------------------------------------------------------

        const medicamentos =
          await db.medicamentos
            .toArray();

        for (
          const medicamento of
          medicamentos
        ) {
          if (
            !medicamento.id ||
            medicamento.medico_id !==
              id
          ) {
            continue;
          }

          const updatedMedicamento = {
            ...medicamento,

            medico_id:
              undefined,

            updated_at:
              now,

            synced:
              false,
          };

          await db.medicamentos.put(
            updatedMedicamento
          );

          await enfileirarOperacao(
            "medicamentos",
            "update",
            updatedMedicamento
          );
        }

        // ------------------------------------------------------
        // RENOVAÇÕES
        // ------------------------------------------------------

        const renovacoes =
          await db.renovacoes
            .toArray();

        for (
          const renovacao of
          renovacoes
        ) {
          if (
            !renovacao.id ||
            renovacao.medico_id !==
              id
          ) {
            continue;
          }

          const updatedRenovacao = {
            ...renovacao,

            medico_id:
              undefined,

            updated_at:
              now,

            synced:
              false,
          };

          await db.renovacoes.put(
            updatedRenovacao
          );

          await enfileirarOperacao(
            "renovacoes",
            "update",
            updatedRenovacao
          );
        }

        // ------------------------------------------------------
        // DOCUMENTOS
        // ------------------------------------------------------

        const documentos =
          await db.documents
            .toArray();

        for (
          const documento of
          documentos
        ) {
          if (
            !documento.id ||
            documento.medico_id !==
              id
          ) {
            continue;
          }

          const updatedDocumento = {
            ...documento,

            medico_id:
              undefined,

            updated_at:
              now,

            synced:
              false,
          };

          await db.documents.put(
            updatedDocumento
          );

          await enfileirarOperacao(
            "documents",
            "update",
            updatedDocumento
          );
        }

        // ------------------------------------------------------
        // TRATAMENTOS
        // ------------------------------------------------------

        const tratamentos =
          await db.tratamentos
            .toArray();

        for (
          const tratamento of
          tratamentos
        ) {
          if (
            !tratamento.id ||
            !tratamento.medico_ids?.includes(
              id
            )
          ) {
            continue;
          }

          const updatedTratamento = {
            ...tratamento,

            medico_ids:
              uniqueIds(
                tratamento.medico_ids.filter(
                  (
                    medicoId
                  ) =>
                    medicoId !==
                    id
                )
              ),

            updated_at:
              now,

            synced:
              false,
          };

          await db.tratamentos.put(
            updatedTratamento
          );

          await enfileirarOperacao(
            "tratamentos",
            "update",
            updatedTratamento
          );
        }

        // ------------------------------------------------------
        // HOSPITAIS
        // ------------------------------------------------------

        const hospitais =
          await db.hospitais
            .toArray();

        for (
          const hospital of
          hospitais
        ) {
          if (
            !hospital.id ||
            !hospital.medico_ids?.includes(
              id
            )
          ) {
            continue;
          }

          const updatedHospital = {
            ...hospital,

            medico_ids:
              uniqueIds(
                hospital.medico_ids.filter(
                  (
                    medicoId
                  ) =>
                    medicoId !==
                    id
                )
              ),

            updated_at:
              now,

            synced:
              false,
          };

          await db.hospitais.put(
            updatedHospital
          );

          await enfileirarOperacao(
            "hospitais",
            "update",
            updatedHospital
          );
        }

        // ------------------------------------------------------
        // LOCAIS
        // ------------------------------------------------------

        const locais =
          await db.locais
            .toArray();

        for (
          const local of
          locais
        ) {
          if (
            !local.id ||
            !local.medico_ids?.includes(
              id
            )
          ) {
            continue;
          }

          const updatedLocal = {
            ...local,

            medico_ids:
              uniqueIds(
                local.medico_ids.filter(
                  (
                    medicoId
                  ) =>
                    medicoId !==
                    id
                )
              ),

            updated_at:
              now,

            synced:
              false,
          };

          await db.locais.put(
            updatedLocal
          );

          await enfileirarOperacao(
            "locais",
            "update",
            updatedLocal
          );
        }

        // ------------------------------------------------------
        // MÉDICO
        // ------------------------------------------------------

        await db.medicos.delete(
          id
        );

        await enfileirarOperacao(
          "medicos",
          "delete",
          {
            id,
          }
        );
      }
    );

    return id;
  },
};