// hooks/useCids.ts
"use client";

import {
  useCallback,
} from "react";
import {
  useLiveQuery,
} from "dexie-react-hooks";

import { db } from "@/lib/db";
import {
  cidsRepository,
} from "@/lib/repositories/cids";
import {
  useActivePersonId,
} from "./useActivePersonId";

import type {
  Cid,
} from "@/lib/types";

// ============================================================
// TIPOS
// ============================================================

type AddCidInput = Omit<
  Cid,
  | "id"
  | "user_id"
  | "person_id"
  | "created_at"
  | "updated_at"
  | "synced"
>;

type UpdateCidInput = Partial<
  Omit<
    Cid,
    | "id"
    | "user_id"
    | "person_id"
    | "created_at"
  >
>;

// ============================================================
// HOOK
// ============================================================

export function useCids() {
  const {
    activePersonId,
  } =
    useActivePersonId();

  // ==========================================================
  // LISTA DA PESSOA ATIVA
  // ==========================================================

  const cids =
    useLiveQuery(
      () => {
        if (
          !activePersonId
        ) {
          return [];
        }

        return db.cids
          .where(
            "person_id"
          )
          .equals(
            activePersonId
          )
          .toArray();
      },
      [
        activePersonId,
      ],
      []
    );

  // ==========================================================
  // GET
  // ==========================================================

  const getCid =
    useCallback(
      async (
        id: string
      ) => {
        if (
          !activePersonId
        ) {
          return undefined;
        }

        return cidsRepository.getById(
          id,
          activePersonId
        );
      },
      [
        activePersonId,
      ]
    );

  // ==========================================================
  // ADD
  // ==========================================================

  const addCid =
    useCallback(
      async (
        data:
          AddCidInput
      ) => {
        if (
          !activePersonId
        ) {
          throw new Error(
            "Pessoa ativa não identificada."
          );
        }

        return cidsRepository.create(
          {
            ...data,

            person_id:
              activePersonId,
          }
        );
      },
      [
        activePersonId,
      ]
    );

  // ==========================================================
  // UPDATE
  // ==========================================================

  const updateCid =
    useCallback(
      async (
        id: string,
        data:
          UpdateCidInput
      ) => {
        if (
          !activePersonId
        ) {
          throw new Error(
            "Pessoa ativa não identificada."
          );
        }

        return cidsRepository.update(
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

  const deleteCid =
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

        return cidsRepository.delete(
          id,
          activePersonId
        );
      },
      [
        activePersonId,
      ]
    );

  const deleteCidSafe =
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

        return cidsRepository.deleteSafe(
          id,
          activePersonId
        );
      },
      [
        activePersonId,
      ]
    );

  return {
    cids,
    getCid,
    addCid,
    updateCid,
    deleteCid,
    deleteCidSafe,
  };
}