// hooks/useFarmacias.ts
"use client";

import {
  useCallback,
} from "react";
import {
  useLiveQuery,
} from "dexie-react-hooks";

import { db } from "@/lib/db";
import {
  farmaciasRepository,
} from "@/lib/repositories/farmacias";

import type {
  Farmacia,
} from "@/lib/types";

// ============================================================
// TYPES
// ============================================================

type AddFarmaciaInput = Omit<
  Farmacia,
  | "id"
  | "user_id"
  | "person_id"
  | "created_at"
  | "updated_at"
  | "synced"
>;

type UpdateFarmaciaInput = Partial<
  Omit<
    Farmacia,
    | "id"
    | "user_id"
    | "person_id"
    | "created_at"
  >
>;

// ============================================================
// HOOK
// ============================================================

export function useFarmacias() {
  /*
   * Farmácia é GLOBAL por usuário.
   *
   * Não existe useActivePersonId aqui.
   * Também não precisamos de useAuth:
   * o repository injeta o usuário autenticado no create.
   */

  const farmacias =
    useLiveQuery(
      () =>
        db.farmacias.toArray(),
      [],
      []
    );

  // ==========================================================
  // GET
  // ==========================================================

  const getFarmacia =
    useCallback(
      (
        id: string
      ) =>
        farmaciasRepository.getById(
          id
        ),
      []
    );

  // ==========================================================
  // ADD
  // ==========================================================

  const addFarmacia =
    useCallback(
      async (
        data:
          AddFarmaciaInput
      ) => {
        return farmaciasRepository.create(
          data
        );
      },
      []
    );

  // ==========================================================
  // UPDATE
  // ==========================================================

  const updateFarmacia =
    useCallback(
      async (
        id: string,
        data:
          UpdateFarmaciaInput
      ) => {
        return farmaciasRepository.update(
          id,
          data
        );
      },
      []
    );

  // ==========================================================
  // DELETE
  // ==========================================================

  const deleteFarmacia =
    useCallback(
      async (
        id: string
      ) => {
        return farmaciasRepository.delete(
          id
        );
      },
      []
    );

  // ==========================================================
  // DELETE SAFE
  // ==========================================================

  const deleteFarmaciaSafe =
    useCallback(
      async (
        id: string
      ) => {
        return farmaciasRepository.deleteSafe(
          id
        );
      },
      []
    );

  return {
    farmacias,
    getFarmacia,
    addFarmacia,
    updateFarmacia,
    deleteFarmacia,
    deleteFarmaciaSafe,
  };
}