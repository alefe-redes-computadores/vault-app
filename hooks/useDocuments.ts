// hooks/useDocuments.ts
"use client";

import {
  useCallback,
} from "react";

import {
  useLiveQuery,
} from "dexie-react-hooks";

import {
  useActivePersonId,
} from "./useActivePersonId";

import {
  documentsRepository,
} from "@/lib/repositories/documents";

import type {
  Document,
} from "@/lib/types";

// ============================================================
// TIPOS
// ============================================================

type RepositoryCreateInput =
  Parameters<
    typeof documentsRepository.create
  >[0];

type CreateDocumentActionInput =
  Omit<
    RepositoryCreateInput,
    "person_id"
  >;

type UpdateDocumentActionInput =
  Parameters<
    typeof documentsRepository.update
  >[2];

// ============================================================
// DOCUMENT LIST
// ============================================================

export function useDocuments(
  personId?: string
): Document[] {
  const {
    activePersonId,
  } =
    useActivePersonId();

  const targetPersonId =
    personId ||
    activePersonId ||
    undefined;

  const documentos =
    useLiveQuery<Document[]>(
      async () => {
        if (
          !targetPersonId
        ) {
          return [];
        }

        return documentsRepository.getAll(
          targetPersonId
        );
      },
      [
        targetPersonId,
      ]
    );

  return documentos ?? [];
}

// ============================================================
// SINGLE DOCUMENT
//
// null      = consulta ainda não terminou
// undefined = consulta terminou e não encontrou
// Document  = encontrado para a pessoa ativa
//
// A versão instalada de dexie-react-hooks aceita apenas
// querier + dependencies. Portanto não usamos defaultResult.
// ============================================================

export function useDocument(
  id: string,
  personId?: string
): Document | undefined | null {
  const {
    activePersonId,
  } =
    useActivePersonId();

  const targetPersonId =
    personId ||
    activePersonId ||
    undefined;

  const result =
    useLiveQuery<
      Document | null
    >(
      async () => {
        if (
          !id ||
          !targetPersonId
        ) {
          return null;
        }

        const document =
          await documentsRepository.getById(
            id,
            targetPersonId
          );

        return document ?? null;
      },
      [
        id,
        targetPersonId,
      ]
    );

  /*
   * useLiveQuery retorna undefined enquanto a primeira consulta
   * ainda não resolveu.
   *
   * Mantemos o contrato histórico do hook:
   *
   * undefined interno -> null externo      = loading
   * null interno      -> undefined externo = não encontrado
   */
  if (
    result ===
    undefined
  ) {
    return null;
  }

  if (
    result ===
    null
  ) {
    return undefined;
  }

  return result;
}

// ============================================================
// DOCUMENT ACTIONS
// ============================================================

export function useDocumentActions() {
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
  // GET
  // ==========================================================

  const getDocument =
    useCallback(
      async (
        id: string
      ) => {
        const personId =
          requireActivePerson();

        return documentsRepository.getById(
          id,
          personId
        );
      },
      [
        requireActivePerson,
      ]
    );

  // ==========================================================
  // CREATE
  // ==========================================================

  const createDocument =
    useCallback(
      async (
        data:
          CreateDocumentActionInput
      ) => {
        const personId =
          requireActivePerson();

        return documentsRepository.create({
          ...data,

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
        id: string,
        data:
          UpdateDocumentActionInput
      ) => {
        const personId =
          requireActivePerson();

        return documentsRepository.update(
          id,
          personId,
          data
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
        id: string
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

  const favoriteDocument =
    useCallback(
      async (
        id: string
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
    activePersonId,

    getDocument,

    createDocument,

    updateDocument,

    deleteDocument,

    favoriteDocument,
  };
}