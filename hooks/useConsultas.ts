// hooks/useConsultas.ts
"use client";

import {
  useCallback,
} from "react";
import {
  useLiveQuery,
} from "dexie-react-hooks";

import { db } from "@/lib/db";
import {
  consultasRepository,
} from "@/lib/repositories/consultas";
import {
  useActivePersonId,
} from "./useActivePersonId";

import type {
  Consulta,
} from "@/lib/types";

// ============================================================
// TYPES
// ============================================================

type AddConsultaInput = Omit<
  Consulta,
  | "id"
  | "user_id"
  | "person_id"
  | "created_at"
  | "updated_at"
  | "synced"
>;

type UpdateConsultaInput = Partial<
  Omit<
    Consulta,
    | "id"
    | "user_id"
    | "person_id"
    | "created_at"
  >
>;

// ============================================================
// HOOK
// ============================================================

export function useConsultas() {
  const {
    activePersonId,
  } =
    useActivePersonId();

  // ==========================================================
  // LIST
  // ==========================================================

  const consultas =
    useLiveQuery(
      () => {
        if (
          !activePersonId
        ) {
          return [];
        }

        return db.consultas
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

  const getConsulta =
    useCallback(
      async (
        id: string
      ) => {
        if (
          !activePersonId
        ) {
          return undefined;
        }

        return consultasRepository.getById(
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

  const addConsulta =
    useCallback(
      async (
        data:
          AddConsultaInput
      ) => {
        if (
          !activePersonId
        ) {
          throw new Error(
            "Pessoa ativa não identificada."
          );
        }

        return consultasRepository.create(
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

  const updateConsulta =
    useCallback(
      async (
        id: string,
        data:
          UpdateConsultaInput
      ) => {
        if (
          !activePersonId
        ) {
          throw new Error(
            "Pessoa ativa não identificada."
          );
        }

        return consultasRepository.update(
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

  const deleteConsulta =
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

        return consultasRepository.delete(
          id,
          activePersonId
        );
      },
      [
        activePersonId,
      ]
    );

  return {
    consultas,
    getConsulta,
    addConsulta,
    updateConsulta,
    deleteConsulta,
  };
}