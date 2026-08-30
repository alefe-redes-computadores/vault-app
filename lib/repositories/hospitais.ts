// lib/repositories/hospitais.ts

import { db } from "@/lib/db";
import { enfileirarOperacao } from "@/lib/sync/enfileirarOperacao";
import { supabase } from "@/lib/supabase/client";
import type { Hospital } from "@/lib/types";

// ============================================================
// TYPES
// ============================================================

type CreateHospitalInput = Omit<
  Hospital,
  | "id"
  | "user_id"
  | "person_id"
  | "tratamento_ids"
  | "created_at"
  | "updated_at"
  | "synced"
> & {
  id?: string;
};

type UpdateHospitalInput = Partial<
  Omit<
    Hospital,
    | "id"
    | "user_id"
    | "person_id"
    | "tratamento_ids"
    | "created_at"
  >
>;

// ============================================================
// HELPERS
// ============================================================

function normalizeIds(
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

export const hospitaisRepository = {
  // ==========================================================
  // LIST
  // ==========================================================

  async getAll() {
    return db.hospitais.toArray();
  },

  // ==========================================================
  // GET
  // ==========================================================

  async getById(
    id: string
  ) {
    return db.hospitais.get(
      id
    );
  },

  // ==========================================================
  // CREATE
  // ==========================================================

  async create(
    data: CreateHospitalInput
  ) {
    const {
      data: { user },
    } =
      await supabase.auth.getUser();

    if (!user) {
      throw new Error(
        "Usuário não autenticado."
      );
    }

    const now =
      new Date().toISOString();

    const hospitalId =
      data.id ||
      crypto.randomUUID();

    /*
     * Hospital é GLOBAL por usuário.
     *
     * Não recebe:
     * - person_id;
     * - tratamento_ids.
     *
     * Hospital.medico_ids é a relação canônica
     * Hospital -> Médico, pois ambos são globais.
     */
    const hospitalCompleto:
      Hospital = {
      ...data,

      id:
        hospitalId,

      user_id:
        user.id,

      medico_ids:
        normalizeIds(
          data.medico_ids
        ),

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
        db.hospitais,
        db.syncQueue,
      ],
      async () => {
        await db.hospitais.add(
          hospitalCompleto
        );

        await enfileirarOperacao(
          "hospitais",
          "add",
          hospitalCompleto
        );
      }
    );

    return hospitalId;
  },

  // ==========================================================
  // UPDATE
  // ==========================================================

  async update(
    id: string,
    data: UpdateHospitalInput
  ) {
    const current =
      await db.hospitais.get(
        id
      );

    if (!current) {
      throw new Error(
        "Hospital não encontrado."
      );
    }

    const now =
      new Date().toISOString();

    const normalizedData:
      UpdateHospitalInput = {
      ...data,
    };

    if (
      data.medico_ids !==
      undefined
    ) {
      normalizedData.medico_ids =
        normalizeIds(
          data.medico_ids
        );
    }

    /*
     * Reconstrói o registro completo.
     *
     * Além de tornar o UPSERT robusto, aproveitamos
     * para remover campos locais legados.
     */
    const updatedHospital:
      Hospital = {
      ...current,
      ...normalizedData,

      id:
        current.id,

      user_id:
        current.user_id,

      person_id:
        undefined,

      tratamento_ids:
        undefined,

      updated_at:
        now,

      synced:
        false,
    };

    await db.transaction(
      "rw",
      [
        db.hospitais,
        db.syncQueue,
      ],
      async () => {
        await db.hospitais.put(
          updatedHospital
        );

        await enfileirarOperacao(
          "hospitais",
          "update",
          updatedHospital
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
    const hospital =
      await db.hospitais.get(
        id
      );

    if (!hospital) {
      throw new Error(
        "Hospital não encontrado."
      );
    }

    const now =
      new Date().toISOString();

    /*
     * Hospital é global.
     *
     * O cleanup percorre registros de TODAS as pessoas.
     *
     * Relações diretas:
     * - Cid.hospital_id
     * - Document.hospital_id
     * - Consulta.hospital_id
     * - Cirurgia.hospital_id
     * - Medicamento.hospital_id
     * - Renovacao.hospital_id
     *
     * Relação N:N:
     * - Tratamento.hospital_ids[]
     *
     * Nenhum registro clínico é excluído.
     */
    await db.transaction(
      "rw",
      [
        db.hospitais,
        db.cids,
        db.documents,
        db.consultas,
        db.cirurgias,
        db.medicamentos,
        db.renovacoes,
        db.tratamentos,
        db.syncQueue,
      ],
      async () => {
        // ------------------------------------------------------
        // CIDS
        // ------------------------------------------------------

        const cids =
          await db.cids.toArray();

        const cidsAfetados =
          cids.filter(
            (cid) =>
              cid.hospital_id ===
              id
          );

        for (
          const cid of
          cidsAfetados
        ) {
          if (!cid.id) {
            continue;
          }

          const updatedCid = {
            ...cid,

            hospital_id:
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
        // DOCUMENTOS
        // ------------------------------------------------------

        const documentos =
          await db.documents
            .where(
              "hospital_id"
            )
            .equals(id)
            .toArray();

        for (
          const documento of
          documentos
        ) {
          if (!documento.id) {
            continue;
          }

          const updatedDocumento = {
            ...documento,

            hospital_id:
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
        // CONSULTAS
        // ------------------------------------------------------

        const consultas =
          await db.consultas
            .where(
              "hospital_id"
            )
            .equals(id)
            .toArray();

        for (
          const consulta of
          consultas
        ) {
          if (!consulta.id) {
            continue;
          }

          const updatedConsulta = {
            ...consulta,

            hospital_id:
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
        // CIRURGIAS
        // ------------------------------------------------------

        const cirurgias =
          await db.cirurgias
            .where(
              "hospital_id"
            )
            .equals(id)
            .toArray();

        for (
          const cirurgia of
          cirurgias
        ) {
          if (!cirurgia.id) {
            continue;
          }

          const updatedCirurgia = {
            ...cirurgia,

            hospital_id:
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
            .where(
              "hospital_id"
            )
            .equals(id)
            .toArray();

        for (
          const medicamento of
          medicamentos
        ) {
          if (!medicamento.id) {
            continue;
          }

          const updatedMedicamento = {
            ...medicamento,

            hospital_id:
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
            .where(
              "hospital_id"
            )
            .equals(id)
            .toArray();

        for (
          const renovacao of
          renovacoes
        ) {
          if (!renovacao.id) {
            continue;
          }

          const updatedRenovacao = {
            ...renovacao,

            hospital_id:
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
        // TRATAMENTOS
        // ------------------------------------------------------

        const tratamentos =
          await db.tratamentos.toArray();

        const tratamentosAfetados =
          tratamentos.filter(
            (tratamento) =>
              tratamento.hospital_ids?.includes(
                id
              )
          );

        for (
          const tratamento of
          tratamentosAfetados
        ) {
          if (!tratamento.id) {
            continue;
          }

          const updatedTratamento = {
            ...tratamento,

            hospital_ids:
              normalizeIds(
                (
                  tratamento.hospital_ids ||
                  []
                ).filter(
                  (
                    hospitalId
                  ) =>
                    hospitalId !==
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
        // HOSPITAL
        // ------------------------------------------------------

        await db.hospitais.delete(
          id
        );

        await enfileirarOperacao(
          "hospitais",
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