
// hooks/useTratamentos.ts
"use client";

import {
  useCallback,
} from "react";

import {
  useLiveQuery,
} from "dexie-react-hooks";

import {
  tratamentosRepository,
} from "@/lib/repositories/tratamentos";

import {
  useActivePersonId,
} from "./useActivePersonId";

import {
  cancelDoseNotifications,
} from "@/lib/dose-notifications";

import type {
  Tratamento,
} from "@/lib/types";

import type {
  CreateTratamentoInput,
  UpdateTratamentoInput,
} from "@/lib/repositories/tratamentos";

// ============================================================
// TIPOS
// ============================================================

type AddTratamentoInput =
  Omit<
    CreateTratamentoInput,
    | "person_id"
    | "id"
  > & {
    id?: string;
  };

type EditTratamentoInput =
  UpdateTratamentoInput;

// ============================================================
// HELPERS
// ============================================================

async function cancelarNotificacoesDeMedicamentos(
  medicamentos:
    Awaited<
      ReturnType<
        typeof tratamentosRepository.createWithResult
      >
    >["medicamentosDescontinuados"]
): Promise<void> {
  for (
    const medicamento of
    medicamentos
  ) {
    if (
      !medicamento.id ||
      !medicamento.estoque_horarios ||
      medicamento.estoque_horarios.length ===
        0
    ) {
      continue;
    }

    try {
      await cancelDoseNotifications({
        id:
          medicamento.id,

        nome:
          medicamento.nome ||
          "",

        dosagem:
          medicamento.dosagem ||
          "",

        estoque_horarios:
          medicamento.estoque_horarios,
      });
    } catch (
      error
    ) {
      /*
       * Persistência já foi confirmada.
       *
       * Uma falha da camada nativa não deve desfazer ou fingir
       * que o tratamento não foi salvo.
       */
      console.warn(
        "[useTratamentos] Não foi possível cancelar notificações de um medicamento descontinuado:",
        medicamento.id,
        error
      );
    }
  }
}

// ============================================================
// HOOK
// ============================================================

export function useTratamentos() {
  const {
    activePersonId,
  } =
    useActivePersonId();

  // ==========================================================
  // LIST
  // ==========================================================

  const tratamentos =
    useLiveQuery(
      async () => {
        if (
          !activePersonId
        ) {
          return [];
        }

        return tratamentosRepository.getAll(
          activePersonId
        );
      },
      [
        activePersonId,
      ],
      []
    );

  // ==========================================================
  // GET
  // ==========================================================

  const getTratamento =
    useCallback(
      async (
        id: string
      ) => {
        if (
          !activePersonId
        ) {
          return undefined;
        }

        return tratamentosRepository.getById(
          id,
          activePersonId
        );
      },
      [
        activePersonId,
      ]
    );

  // ==========================================================
  // MEDICAMENTOS DO TRATAMENTO
  // ==========================================================

  const getMedicamentosDoTratamento =
    useCallback(
      async (
        id: string
      ) => {
        if (
          !activePersonId
        ) {
          return [];
        }

        return tratamentosRepository.getMedicamentos(
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
  // ==========================================================

  const addTratamento =
    useCallback(
      async (
        data:
          AddTratamentoInput
      ) => {
        if (
          !activePersonId
        ) {
          throw new Error(
            "Pessoa ativa não identificada."
          );
        }

        const result =
          await tratamentosRepository.createWithResult({
            ...data,

            person_id:
              activePersonId,
          });

        /*
         * Um tratamento pode nascer concluído ou suspenso.
         * Nesse cenário, o repository decide quais medicamentos
         * foram realmente descontinuados dentro da transaction.
         *
         * Somente após o commit local cancelamos ações nativas.
         */
        await cancelarNotificacoesDeMedicamentos(
          result.medicamentosDescontinuados
        );

        return result.id;
      },
      [
        activePersonId,
      ]
    );

  // ==========================================================
  // UPDATE
  // ==========================================================

  const updateTratamento =
    useCallback(
      async (
        id: string,
        data:
          EditTratamentoInput
      ) => {
        if (
          !activePersonId
        ) {
          throw new Error(
            "Pessoa ativa não identificada."
          );
        }

        const result =
          await tratamentosRepository.update(
            id,
            activePersonId,
            data
          );

        /*
         * O repository decide, com base no domínio, quais
         * medicamentos realmente foram descontinuados.
         *
         * Somente após o commit local cancelamos ações nativas.
         */
        await cancelarNotificacoesDeMedicamentos(
          result.medicamentosDescontinuados
        );

        return result.id;
      },
      [
        activePersonId,
      ]
    );

  // ==========================================================
  // DELETE
  // ==========================================================

  const deleteTratamento =
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

        return tratamentosRepository.delete(
          id,
          activePersonId
        );
      },
      [
        activePersonId,
      ]
    );

  const deleteTratamentoSafe =
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

        return tratamentosRepository.deleteSafe(
          id,
          activePersonId
        );
      },
      [
        activePersonId,
      ]
    );

  return {
    tratamentos:
      tratamentos ||
      [],

    getTratamento,

    getMedicamentosDoTratamento,

    addTratamento,

    updateTratamento,

    deleteTratamento,

    deleteTratamentoSafe,
  };
}