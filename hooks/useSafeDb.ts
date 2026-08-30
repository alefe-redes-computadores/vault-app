// hooks/useSafeDb.ts
"use client";

import {
  useCallback,
} from "react";

import {
  documentsRepository,
} from "@/lib/repositories/documents";

import {
  useActivePersonId,
} from "./useActivePersonId";

// ============================================================
// TYPES
// ============================================================

type RepositoryCreateInput =
  Parameters<
    typeof documentsRepository.create
  >[0];

type AddDocumentInput =
  Omit<
    RepositoryCreateInput,
    "person_id"
  >;

type UpdateDocumentInput =
  Parameters<
    typeof documentsRepository.update
  >[2];

// ============================================================
// HOOK
// ============================================================

export function useSafeDb() {
  const {
    activePersonId,
  } =
    useActivePersonId();

  const requireActivePerson =
    useCallback(
      () => {
        if (
          !activePersonId
        ) {
          throw new Error(
            "Pessoa ativa não identificada."
          );
        }

        return activePersonId;
      },
      [
        activePersonId,
      ]
    );

  // ==========================================================
  // CREATE
  // ==========================================================

  const addDocument =
    useCallback(
      async (
        doc:
          AddDocumentInput
      ) => {
        const personId =
          requireActivePerson();

        return documentsRepository.create({
          ...doc,

          person_id:
            personId,
        });
      },
      [
        requireActivePerson,
      ]
    );

  // ==========================================================
  // UPDATE
  // ==========================================================

  const updateDocument =
    useCallback(
      async (
        id:
          string,
        changes:
          UpdateDocumentInput
      ) => {
        const personId =
          requireActivePerson();

        return documentsRepository.update(
          id,
          personId,
          changes
        );
      },
      [
        requireActivePerson,
      ]
    );

  // ==========================================================
  // DELETE
  // ==========================================================

  const deleteDocument =
    useCallback(
      async (
        id:
          string
      ) => {
        const personId =
          requireActivePerson();

        return documentsRepository.delete(
          id,
          personId
        );
      },
      [
        requireActivePerson,
      ]
    );

  // ==========================================================
  // FAVORITE
  // ==========================================================

  const favorite =
    useCallback(
      async (
        id:
          string
      ) => {
        const personId =
          requireActivePerson();

        return documentsRepository.favorite(
          id,
          personId
        );
      },
      [
        requireActivePerson,
      ]
    );

  return {
    addDocument,
    updateDocument,
    deleteDocument,
    favorite,
  };
}