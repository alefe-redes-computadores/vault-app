// hooks/useRegistrosSaude.ts
"use client";

import {
  useCallback,
} from "react";

import {
  useLiveQuery,
} from "dexie-react-hooks";

import {
  useActivePersonId,
} from "@/hooks/useActivePersonId";

import {
  registrosSaudeRepository,
} from "@/lib/repositories/registrosSaude";

import type {
  CreateRegistroSaudeInput,
  UpdateRegistroSaudeInput,
} from "@/lib/repositories/registrosSaude";

// ============================================================
// TIPOS
// ============================================================

type AddRegistroSaudeInput = Omit<
  CreateRegistroSaudeInput,
  "person_id"
>;

type EditRegistroSaudeInput =
  UpdateRegistroSaudeInput;

// ============================================================
// HOOK
// ============================================================

export function useRegistrosSaude() {
  const {
    activePersonId,
  } =
    useActivePersonId();

  // ==========================================================
  // LIST
  //
  // Sem pessoa ativa = nenhuma informação clínica.
  // ==========================================================

  const registros =
    useLiveQuery(
      async () => {
        if (
          !activePersonId
        ) {
          return [];
        }

        return registrosSaudeRepository.getAll(
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

  const getRegistro =
    useCallback(
      async (
        id: string
      ) => {
        if (
          !activePersonId
        ) {
          return undefined;
        }

        return registrosSaudeRepository.getById(
          id,
          activePersonId
        );
      },
      [
        activePersonId,
      ]
    );

  // ==========================================================
  // HISTÓRICO
  // ==========================================================

  const getHistoricoSimilar =
    useCallback(
      async (
        id: string,
        limit = 10
      ) => {
        if (
          !activePersonId
        ) {
          return [];
        }

        return registrosSaudeRepository.getHistoricoSimilar(
          id,
          activePersonId,
          limit
        );
      },
      [
        activePersonId,
      ]
    );

  // ==========================================================
  // CREATE
  // ==========================================================

  const createRegistro =
    useCallback(
      async (
        data:
          AddRegistroSaudeInput
      ) => {
        if (
          !activePersonId
        ) {
          throw new Error(
            "Pessoa ativa não identificada."
          );
        }

        return registrosSaudeRepository.create({
          ...data,

          person_id:
            activePersonId,
        });
      },
      [
        activePersonId,
      ]
    );

  // ==========================================================
  // UPDATE
  // ==========================================================

  const updateRegistro =
    useCallback(
      async (
        id: string,
        changes:
          EditRegistroSaudeInput
      ) => {
        if (
          !activePersonId
        ) {
          throw new Error(
            "Pessoa ativa não identificada."
          );
        }

        return registrosSaudeRepository.update(
          id,
          activePersonId,
          changes
        );
      },
      [
        activePersonId,
      ]
    );

  // ==========================================================
  // DELETE
  // ==========================================================

  const deleteRegistro =
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

        return registrosSaudeRepository.delete(
          id,
          activePersonId
        );
      },
      [
        activePersonId,
      ]
    );

  return {
    registros:
      registros ||
      [],

    isLoading:
      registros ===
      undefined,

    getRegistro,

    getHistoricoSimilar,

    createRegistro,

    updateRegistro,

    deleteRegistro,
  };
}