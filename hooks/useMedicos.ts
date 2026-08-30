// hooks/useMedicos.ts
"use client";

import { useCallback } from "react";
import { useLiveQuery } from "dexie-react-hooks";

import { db } from "@/lib/db";
import { medicosRepository } from "@/lib/repositories/medicos";

import type { Medico } from "@/lib/types";

// ============================================================
// TYPES
// ============================================================

type AddMedicoInput = Omit<
  Medico,
  | "id"
  | "user_id"
  | "person_id"
  | "hospital_ids"
  | "local_ids"
  | "tratamento_ids"
  | "created_at"
  | "updated_at"
  | "synced"
>;

type UpdateMedicoInput = Partial<
  Omit<
    Medico,
    | "id"
    | "user_id"
    | "person_id"
    | "hospital_ids"
    | "local_ids"
    | "tratamento_ids"
    | "created_at"
  >
>;

// ============================================================
// HOOK
// ============================================================

export function useMedicos() {
  /*
   * Médico é entidade GLOBAL por usuário.
   *
   * Portanto:
   * - sem useActivePersonId;
   * - sem filtro por person_id;
   * - sem useAuth aqui.
   *
   * O repository resolve autenticação no create.
   *
   * Relações não são persistidas no próprio Médico:
   * - Hospital.medico_ids[]
   * - LocalSaude.medico_ids[]
   * - Tratamento.medico_ids[]
   */

  const medicos =
    useLiveQuery(
      () =>
        db.medicos.toArray(),
      [],
      []
    );

  // ==========================================================
  // GET
  // ==========================================================

  const getMedico =
    useCallback(
      (
        id: string
      ) =>
        medicosRepository.getById(
          id
        ),
      []
    );

  // ==========================================================
  // ADD
  // ==========================================================

  const addMedico =
    useCallback(
      async (
        data:
          AddMedicoInput
      ) => {
        return medicosRepository.create(
          data
        );
      },
      []
    );

  // ==========================================================
  // UPDATE
  // ==========================================================

  const updateMedico =
    useCallback(
      async (
        id: string,
        data:
          UpdateMedicoInput
      ) => {
        return medicosRepository.update(
          id,
          data
        );
      },
      []
    );

  // ==========================================================
  // DELETE
  // ==========================================================

  const deleteMedico =
    useCallback(
      async (
        id: string
      ) => {
        return medicosRepository.delete(
          id
        );
      },
      []
    );

  // ==========================================================
  // DELETE SAFE
  // ==========================================================

  const deleteMedicoSafe =
    useCallback(
      async (
        id: string
      ) => {
        return medicosRepository.deleteSafe(
          id
        );
      },
      []
    );

  return {
    medicos,
    getMedico,
    addMedico,
    updateMedico,
    deleteMedico,
    deleteMedicoSafe,
  };
}