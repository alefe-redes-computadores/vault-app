// hooks/useCirurgias.ts
"use client";

import {
  useCallback,
} from "react";
import {
  useLiveQuery,
} from "dexie-react-hooks";

import { db } from "@/lib/db";
import {
  cirurgiasRepository,
} from "@/lib/repositories/cirurgias";
import {
  useActivePersonId,
} from "./useActivePersonId";

import type {
  Cirurgia,
} from "@/lib/types";

// ============================================================
// TIPOS
// ============================================================

type AddCirurgiaInput = Omit<
  Cirurgia,
  | "id"
  | "user_id"
  | "person_id"
  | "created_at"
  | "updated_at"
  | "synced"
>;

type UpdateCirurgiaInput = Partial<
  Omit<
    Cirurgia,
    | "id"
    | "user_id"
    | "person_id"
    | "created_at"
  >
>;

// ============================================================
// HOOK
// ============================================================

export function useCirurgias() {
  const {
    activePersonId,
  } =
    useActivePersonId();

  // ==========================================================
  // LISTA
  // ==========================================================

  const cirurgias =
    useLiveQuery(
      () => {
        if (
          !activePersonId
        ) {
          return [];
        }

        return db.cirurgias
          .where("person_id")
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

  const getCirurgia =
    useCallback(
      async (
        id: string
      ) => {
        if (
          !activePersonId
        ) {
          return undefined;
        }

        return cirurgiasRepository.getById(
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

  const addCirurgia =
    useCallback(
      async (
        data:
          AddCirurgiaInput
      ) => {
        if (
          !activePersonId
        ) {
          throw new Error(
            "Pessoa ativa não identificada."
          );
        }

        return cirurgiasRepository.create(
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

  const updateCirurgia =
    useCallback(
      async (
        id: string,
        data:
          UpdateCirurgiaInput
      ) => {
        if (
          !activePersonId
        ) {
          throw new Error(
            "Pessoa ativa não identificada."
          );
        }

        return cirurgiasRepository.update(
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

  const deleteCirurgia =
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

        return cirurgiasRepository.delete(
          id,
          activePersonId
        );
      },
      [
        activePersonId,
      ]
    );

  return {
    cirurgias,
    getCirurgia,
    addCirurgia,
    updateCirurgia,
    deleteCirurgia,
  };
}