// hooks/useRenovacoes.ts
"use client";

import {
  useCallback,
} from "react";

import {
  useLiveQuery,
} from "dexie-react-hooks";

import {
  renovacoesRepository,
} from "@/lib/repositories/renovacoes";

import {
  useActivePersonId,
} from "./useActivePersonId";

import type {
  Renovacao,
} from "@/lib/types";

import type {
  RenovacaoCreateOptions,
} from "@/lib/repositories/renovacoes";

// ============================================================
// TIPOS
// ============================================================

type AddRenovacaoInput =
  Omit<
    Renovacao,
    | "id"
    | "user_id"
    | "person_id"
    | "created_at"
    | "updated_at"
    | "synced"
  >;

type NullableRenovacaoFields = {
  document_id?:
    string | null;

  medico_id?:
    string | null;

  farmacia_id?:
    string | null;

  hospital_id?:
    string | null;

  local_id?:
    string | null;

  quantidade?:
    number | null;

  preco?:
    number | null;

  lote?:
    string | null;

  validade_produto?:
    string | null;

  anexo_url?:
    string | null;

  observacoes?:
    string | null;

  data_proxima_retirada?:
    string | null;

  data_retorno_sus?:
    string | null;
};

type UpdateRenovacaoBase =
  Partial<
    Omit<
      Renovacao,
      | "id"
      | "user_id"
      | "person_id"
      | "created_at"
      | "updated_at"
      | "synced"
    >
  >;

type UpdateRenovacaoInput =
  Omit<
    UpdateRenovacaoBase,
    keyof NullableRenovacaoFields
  > &
    NullableRenovacaoFields;

// ============================================================
// HOOK
// ============================================================

export function useRenovacoes(
  medicamentoId?: string
) {
  const {
    activePersonId,
  } =
    useActivePersonId();

  // ==========================================================
  // LIST
  // ==========================================================

  const renovacoes =
    useLiveQuery(
      async () => {
        if (
          !activePersonId
        ) {
          return [];
        }

        if (
          medicamentoId
        ) {
          return renovacoesRepository.getByMedicamento(
            activePersonId,
            medicamentoId
          );
        }

        return renovacoesRepository.getAll(
          activePersonId
        );
      },
      [
        activePersonId,
        medicamentoId,
      ],
      []
    );

  // ==========================================================
  // GET
  // ==========================================================

  const getRenovacao =
    useCallback(
      async (
        id: string
      ) => {
        if (
          !activePersonId
        ) {
          return undefined;
        }

        return renovacoesRepository.getById(
          id,
          activePersonId
        );
      },
      [
        activePersonId,
      ]
    );

  // ==========================================================
  // CREATE
  //
  // Já inclui os efeitos atômicos sobre o medicamento.
  // ==========================================================

  const addRenovacao =
    useCallback(
      async (
        data:
          AddRenovacaoInput,
        options:
          RenovacaoCreateOptions = {}
      ) => {
        if (
          !activePersonId
        ) {
          throw new Error(
            "Pessoa ativa não identificada."
          );
        }

        return renovacoesRepository.create(
          {
            ...data,

            person_id:
              activePersonId,
          },
          options
        );
      },
      [
        activePersonId,
      ]
    );

  // ==========================================================
  // UPDATE
  // ==========================================================

  const updateRenovacao =
    useCallback(
      async (
        id: string,
        data:
          UpdateRenovacaoInput
      ) => {
        if (
          !activePersonId
        ) {
          throw new Error(
            "Pessoa ativa não identificada."
          );
        }

        await renovacoesRepository.update(
          id,
          activePersonId,
          data
        );
      },
      [
        activePersonId,
      ]
    );

  // ==========================================================
  // DELETE
  // ==========================================================

  const deleteRenovacao =
    useCallback(
      async (
        id: string
      ) => {
        if (
          !activePersonId
        ) {
          throw new Error(
            "Pessoa ativa não identificada."
          );
        }

        await renovacoesRepository.delete(
          id,
          activePersonId
        );
      },
      [
        activePersonId,
      ]
    );

  return {
    renovacoes:
      renovacoes ||
      [],

    getRenovacao,

    addRenovacao,

    updateRenovacao,

    deleteRenovacao,
  };
}