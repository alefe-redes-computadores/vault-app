// hooks/useLocais.ts
"use client";

import {
  useCallback,
} from "react";

import {
  useLiveQuery,
} from "dexie-react-hooks";

import {
  locaisRepository,
} from "@/lib/repositories/locais";

// ============================================================
// TYPES
// ============================================================

type AddLocalInput =
  Parameters<
    typeof locaisRepository.create
  >[0];

type UpdateLocalInput =
  Parameters<
    typeof locaisRepository.update
  >[1];

// ============================================================
// HOOK
// ============================================================

export function useLocais() {
  /*
   * Local é entidade GLOBAL por usuário.
   *
   * Portanto:
   * - não usa useActivePersonId;
   * - não recebe person_id;
   * - o repository resolve autenticação no create;
   * - a leitura Dexie também fica atrás do repository.
   *
   * O contexto da pessoa ativa aparece somente quando
   * cruzamos o Local global com entidades clínicas
   * person-owned.
   */

  const locais =
    useLiveQuery(
      () =>
        locaisRepository.getAll(),
      [],
      []
    );

  // ==========================================================
  // GET
  // ==========================================================

  const getLocal =
    useCallback(
      (
        id: string
      ) =>
        locaisRepository.getById(
          id
        ),
      []
    );

  // ==========================================================
  // ADD
  // ==========================================================

  const addLocal =
    useCallback(
      async (
        data:
          AddLocalInput
      ) => {
        return locaisRepository.create(
          data
        );
      },
      []
    );

  // ==========================================================
  // UPDATE
  // ==========================================================

  const updateLocal =
    useCallback(
      async (
        id: string,
        data:
          UpdateLocalInput
      ) => {
        return locaisRepository.update(
          id,
          data
        );
      },
      []
    );

  // ==========================================================
  // DELETE
  // ==========================================================

  const deleteLocal =
    useCallback(
      async (
        id: string
      ) => {
        return locaisRepository.delete(
          id
        );
      },
      []
    );

  // ==========================================================
  // DELETE SAFE
  // ==========================================================

  const deleteLocalSafe =
    useCallback(
      async (
        id: string
      ) => {
        return locaisRepository.deleteSafe(
          id
        );
      },
      []
    );

  return {
    locais,
    getLocal,
    addLocal,
    updateLocal,
    deleteLocal,
    deleteLocalSafe,
  };
}