// hooks/useHospitais.ts
"use client";

import {
  useCallback,
} from "react";
import {
  useLiveQuery,
} from "dexie-react-hooks";

import { db } from "@/lib/db";
import {
  hospitaisRepository,
} from "@/lib/repositories/hospitais";

import type {
  Hospital,
} from "@/lib/types";

// ============================================================
// TYPES
// ============================================================

type AddHospitalInput = Omit<
  Hospital,
  | "id"
  | "user_id"
  | "person_id"
  | "tratamento_ids"
  | "created_at"
  | "updated_at"
  | "synced"
>;

type UpdateHospitalInput = Partial<
  Omit<
    Hospital,
    | "id"
    | "user_id"
    | "person_id"
    | "tratamento_ids"
    | "created_at"
  >
>;

// ============================================================
// HOOK
// ============================================================

export function useHospitais() {
  /*
   * Hospital é GLOBAL por usuário.
   *
   * Portanto:
   * - sem useActivePersonId;
   * - sem filtro por person_id;
   * - sem useAuth aqui.
   *
   * O repository resolve autenticação no create.
   */

  const hospitais =
    useLiveQuery(
      () =>
        db.hospitais.toArray(),
      [],
      []
    );

  // ==========================================================
  // GET
  // ==========================================================

  const getHospital =
    useCallback(
      (
        id: string
      ) =>
        hospitaisRepository.getById(
          id
        ),
      []
    );

  // ==========================================================
  // ADD
  // ==========================================================

  const addHospital =
    useCallback(
      async (
        data:
          AddHospitalInput
      ) => {
        return hospitaisRepository.create(
          data
        );
      },
      []
    );

  // ==========================================================
  // UPDATE
  // ==========================================================

  const updateHospital =
    useCallback(
      async (
        id: string,
        data:
          UpdateHospitalInput
      ) => {
        return hospitaisRepository.update(
          id,
          data
        );
      },
      []
    );

  // ==========================================================
  // DELETE
  // ==========================================================

  const deleteHospital =
    useCallback(
      async (
        id: string
      ) => {
        return hospitaisRepository.delete(
          id
        );
      },
      []
    );

  // ==========================================================
  // DELETE SAFE
  // ==========================================================

  const deleteHospitalSafe =
    useCallback(
      async (
        id: string
      ) => {
        return hospitaisRepository.deleteSafe(
          id
        );
      },
      []
    );

  return {
    hospitais,
    getHospital,
    addHospital,
    updateHospital,
    deleteHospital,
    deleteHospitalSafe,
  };
}