// hooks/useMedicamentos.ts
"use client";

import {
  useCallback,
} from "react";

import {
  useLiveQuery,
} from "dexie-react-hooks";

import {
  db,
} from "@/lib/db";

import {
  medicamentosRepository,
} from "@/lib/repositories/medicamentos";

import {
  useActivePersonId,
} from "./useActivePersonId";

import type {
  CreateMedicamentoInput,
  UpdateMedicamentoInput,
} from "@/lib/types";

// ============================================================
// TYPES
// ============================================================

type AddMedicamentoInput = Omit<
  CreateMedicamentoInput,
  "person_id"
>;

// ============================================================
// HOOK
// ============================================================

export function useMedicamentos() {
  const {
    activePersonId,
  } =
    useActivePersonId();

  // ==========================================================
  // LIST
  // ==========================================================

  const medicamentos =
    useLiveQuery(
      () => {
        if (
          !activePersonId
        ) {
          return [];
        }

        return db.medicamentos
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
    ) || [];

  // ==========================================================
  // GET
  // ==========================================================

  const getMedicamento =
    useCallback(
      async (
        id: string
      ) => {
        if (
          !activePersonId
        ) {
          return undefined;
        }

        return medicamentosRepository.getById(
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

  const addMedicamento =
    useCallback(
      async (
        data: AddMedicamentoInput
      ) => {
        if (
          !activePersonId
        ) {
          throw new Error(
            "Pessoa ativa não identificada."
          );
        }

        return medicamentosRepository.create(
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

  const updateMedicamento =
    useCallback(
      async (
        id: string,
        data: UpdateMedicamentoInput
      ) => {
        if (
          !activePersonId
        ) {
          throw new Error(
            "Pessoa ativa não identificada."
          );
        }

        return medicamentosRepository.update(
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

  const deleteMedicamento =
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

        return medicamentosRepository.delete(
          id,
          activePersonId
        );
      },
      [
        activePersonId,
      ]
    );

  return {
    medicamentos,
    getMedicamento,
    addMedicamento,
    updateMedicamento,
    deleteMedicamento,
  };
}