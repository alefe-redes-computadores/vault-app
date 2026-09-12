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
  // MARCAR COMO TOMADA EM MOMENTO REAL INFORMADO
  //
  // Permite diferenciar:
  //
  // - tomou no horário e só registrou depois;
  // - tomou realmente atrasado.
  // ==========================================================

  const marcarComoTomadaEm =
    useCallback(
      async (
        medicamentoId:
          string,
        horario:
          string,
        tomadoEm:
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

          tomadoEm,
        });
      },
      [
        activePersonId,
        targetDate,
      ]
    );

  // ==========================================================
  // TOMADA HISTÓRICA
  //
  // Registra uma confirmação real em uma data passada sem
  // movimentar o saldo atual do medicamento.
  // ==========================================================

  const marcarComoTomadaHistoricaEm =
    useCallback(
      async (
        medicamentoId:
          string,
        horario:
          string,
        tomadoEm:
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

          tomadoEm,

          adjustStock:
            false,
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
  // IGNORADA HISTÓRICA
  // ==========================================================

  const marcarComoIgnoradaHistorica =
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

          adjustStock:
            false,
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
          number,
        doseKind?:
          "sos" | "extra",
        motivo?:
          string
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

          doseKind,

          motivo,
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

  // ==========================================================
  // DESMARCAR HISTÓRICO
  //
  // Remove a confirmação histórica sem devolver estoque.
  // ==========================================================

  const desmarcarDoseHistorica =
    useCallback(
      async (
        medicamentoId:
          string,
        horario:
          string
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
            "clear",

          adjustStock:
            false,
        });
      },
      [
        activePersonId,
        targetDate,
      ]
    );

  return {
    doseLogs,

    isLoading:
      doseLogsLive ===
      undefined,

    marcarComoTomada,

    marcarComoTomadaEm,
    marcarComoTomadaHistoricaEm,

    marcarComoIgnorada,
    marcarComoIgnoradaHistorica,

    desmarcarDose,
    desmarcarDoseHistorica,

    registrarTomadaAvulsa,

    removerDosePorId,
  };
}


// Histórico completo da pessoa ativa para o Prontuário.
export function useAllDoseLogs() {
  const { activePersonId } = useActivePersonId();
  const rows = useLiveQuery<DoseLog[]>(
    () => activePersonId ? doseLogsRepository.getAll(activePersonId) : [],
    [activePersonId]
  );
  return { allDoseLogs: rows ?? [], isLoading: rows === undefined };
}
