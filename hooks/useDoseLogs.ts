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
  dataEspecifica?: string,
  // Explicit null means an owner-scoped request before auth is ready.
  ownerUserId?: string | null
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

  // M20: query results carry owner, person and date identity. Dexie can
  // briefly retain a previous snapshot during account/date transitions;
  // never expose those rows to the new patient or account.
  const ownerScoped = ownerUserId !== undefined;
  const doseLogsLive = useLiveQuery<{
    ownerId: string | null | undefined;
    personId: string | null | undefined;
    date: string;
    rows: DoseLog[];
  }>(async () => {
    const ownerId = ownerUserId;
    const personId = activePersonId;
    const date = targetDate;
    if (!personId || (ownerScoped && !ownerId)) {
      return {ownerId, personId, date, rows: []};
    }
    const rows = await doseLogsRepository.getAll(
      personId, date, ownerScoped ? ownerId! : undefined
    );
    return {ownerId, personId, date, rows};
  }, [activePersonId, targetDate, ownerUserId]);

  const queryMatchesOwner = Boolean(doseLogsLive &&
    doseLogsLive.personId === activePersonId &&
    doseLogsLive.date === targetDate &&
    (!ownerScoped || doseLogsLive.ownerId === ownerUserId));
  const doseLogs = queryMatchesOwner ? doseLogsLive!.rows : [];

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
          number,
        requireRegisteredStock = false
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
          requireRegisteredStock,
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
          number,
        motivo?:
          string,
        onlyIfPending = false
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
          motivo,
          onlyIfPending,
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
      !queryMatchesOwner,

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
