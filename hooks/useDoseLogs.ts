// hooks/useDoseLogs.ts
"use client";

import {
  useCallback,
} from "react";

import {
  useLiveQuery,
} from "dexie-react-hooks";

import {
  doseLogsRepository,
} from "@/lib/repositories/doseLogs";

import {
  useActivePersonId,
} from "./useActivePersonId";

import {
  getLocalTodayISO,
} from "@/lib/health-utils";

import type {
  DoseLog,
} from "@/lib/types";

// ============================================================
// HOOK
// ============================================================

export function useDoseLogs(
  dataEspecifica?: string
) {
  const {
    activePersonId,
  } =
    useActivePersonId();

  const targetDate =
    dataEspecifica ||
    getLocalTodayISO();

  // ==========================================================
  // LISTA
  // ==========================================================

  const doseLogsLive =
    useLiveQuery<DoseLog[]>(
      () => {
        if (
          !activePersonId
        ) {
          return [];
        }

        return doseLogsRepository.getAll(
          activePersonId,
          targetDate
        );
      },
      [
        activePersonId,
        targetDate,
      ]
    );

  const doseLogs =
    doseLogsLive ??
    [];

  // ==========================================================
  // MARCAR COMO TOMADA
  // ==========================================================

  const marcarComoTomada =
    useCallback(
      async (
        medicamentoId:
          string,
        horario:
          string,
        quantidade?:
          number
      ) => {
        if (
          !activePersonId
        ) {
          throw new Error(
            "Pessoa ativa não identificada."
          );
        }

        return doseLogsRepository.setStatus({
          personId:
            activePersonId,

          medicamentoId,

          data:
            targetDate,

          horario,

          status:
            "taken",

          quantidade,
        });
      },
      [
        activePersonId,
        targetDate,
      ]
    );

  // ==========================================================
  // MARCAR COMO IGNORADA
  // ==========================================================

  const marcarComoIgnorada =
    useCallback(
      async (
        medicamentoId:
          string,
        horario:
          string,
        quantidade?:
          number
      ) => {
        if (
          !activePersonId
        ) {
          throw new Error(
            "Pessoa ativa não identificada."
          );
        }

        return doseLogsRepository.setStatus({
          personId:
            activePersonId,

          medicamentoId,

          data:
            targetDate,

          horario,

          status:
            "ignored",

          quantidade,
        });
      },
      [
        activePersonId,
        targetDate,
      ]
    );

  // ==========================================================
  // DESMARCAR SLOT PROGRAMADO
  // ==========================================================

  const desmarcarDose =
    useCallback(
      async (
        medicamentoId:
          string,
        horario:
          string,
        quantidadeLegada?:
          number
      ) => {
        /**
         * Compatibilidade temporária com consumidores antigos.
         *
         * O terceiro argumento NÃO participa da reversão.
         *
         * O repository usa somente a quantidade histórica salva
         * no DoseLog para não reconstruir estoque com dados atuais.
         */
        void quantidadeLegada;

        if (
          !activePersonId
        ) {
          throw new Error(
            "Pessoa ativa não identificada."
          );
        }

        return doseLogsRepository.setStatus({
          personId:
            activePersonId,

          medicamentoId,

          data:
            targetDate,

          horario,

          status:
            "clear",
        });
      },
      [
        activePersonId,
        targetDate,
      ]
    );

  // ==========================================================
  // REGISTRAR TOMADA AVULSA / SOS
  // ==========================================================

  const registrarTomadaAvulsa =
    useCallback(
      async (
        medicamentoId:
          string,
        horario:
          string,
        quantidade?:
          number
      ) => {
        if (
          !activePersonId
        ) {
          throw new Error(
            "Pessoa ativa não identificada."
          );
        }

        return doseLogsRepository.registrarTomadaAvulsa({
          personId:
            activePersonId,

          medicamentoId,

          data:
            targetDate,

          horario,

          quantidade,
        });
      },
      [
        activePersonId,
        targetDate,
      ]
    );

  // ==========================================================
  // REMOVER DOSE POR ID
  //
  // Principal uso:
  //
  // exclusão de tomada avulsa/SOS.
  //
  // Não expomos Dexie para a tela. O repository restaura estoque,
  // remove localmente e enfileira DELETE.
  // ==========================================================

  const removerDosePorId =
    useCallback(
      async (
        doseLogId:
          string
      ) => {
        if (
          !activePersonId
        ) {
          throw new Error(
            "Pessoa ativa não identificada."
          );
        }

        return doseLogsRepository.removeById({
          personId:
            activePersonId,

          id:
            doseLogId,
        });
      },
      [
        activePersonId,
      ]
    );

  return {
    doseLogs,

    isLoading:
      doseLogsLive ===
      undefined,

    marcarComoTomada,

    marcarComoIgnorada,

    desmarcarDose,

    registrarTomadaAvulsa,

    removerDosePorId,
  };
}