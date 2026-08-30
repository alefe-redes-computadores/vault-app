// hooks/useExames.ts
"use client";

import {
  useCallback,
} from "react";

import {
  useLiveQuery,
} from "dexie-react-hooks";

import {
  examesRepository,
} from "@/lib/repositories/exames";

import {
  useActivePersonId,
} from "./useActivePersonId";

// ============================================================
// TYPES
// ============================================================

type CreateExameInput =
  Omit<
    Parameters<
      typeof examesRepository.create
    >[0],
    "person_id"
  >;

type UpdateExameInput =
  Parameters<
    typeof examesRepository.update
  >[2];

// ============================================================
// HOOK
// ============================================================

export function useExames() {
  const {
    activePersonId,
  } =
    useActivePersonId();

  // ==========================================================
  // LIVE LIST
  // ==========================================================

  const exames =
    useLiveQuery(
      async () => {
        if (
          !activePersonId
        ) {
          return [];
        }

        return examesRepository.getAll(
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

  const getExame =
    useCallback(
      async (
        id:
          string
      ) => {
        if (
          !activePersonId
        ) {
          return undefined;
        }

        return examesRepository.getById(
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

  const addExame =
    useCallback(
      async (
        data:
          CreateExameInput
      ) => {
        if (
          !activePersonId
        ) {
          throw new Error(
            "Pessoa ativa não identificada."
          );
        }

        return examesRepository.create({
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

  const updateExame =
    useCallback(
      async (
        id:
          string,
        data:
          UpdateExameInput
      ) => {
        if (
          !activePersonId
        ) {
          throw new Error(
            "Pessoa ativa não identificada."
          );
        }

        return examesRepository.update(
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

  const deleteExame =
    useCallback(
      async (
        id:
          string
      ) => {
        if (
          !activePersonId
        ) {
          throw new Error(
            "Pessoa ativa não identificada."
          );
        }

        return examesRepository.delete(
          id,
          activePersonId
        );
      },
      [
        activePersonId,
      ]
    );

  return {
    exames,
    getExame,
    addExame,
    updateExame,
    deleteExame,
  };
}