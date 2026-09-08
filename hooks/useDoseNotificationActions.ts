// hooks/useDoseNotificationActions.ts
"use client";

import {
  useEffect,
} from "react";

import {
  Capacitor,
} from "@capacitor/core";

import {
  LocalNotifications,
} from "@capacitor/local-notifications";

import {
  doseLogsRepository,
} from "@/lib/repositories/doseLogs";

import {
  addDaysToLocalDate,
  getLocalTodayISO,
} from "@/lib/health-utils";

type DoseReminderExtra = {
  type?: string;
  medicamentoId?: string;
  personId?: string;
  horario?: string;
};

function isValidHorario(
  value: unknown
): value is string {
  if (
    typeof value !==
    "string" ||
    !/^\d{2}:\d{2}$/.test(
      value
    )
  ) {
    return false;
  }

  const [
    hour,
    minute,
  ] =
    value
      .split(":")
      .map(Number);

  return (
    Number.isInteger(hour) &&
    Number.isInteger(minute) &&
    hour >= 0 &&
    hour <= 23 &&
    minute >= 0 &&
    minute <= 59
  );
}

function resolveDoseNotificationSlotDate(
  horario:
    string,
  now:
    Date = new Date()
): string {
  const today =
    getLocalTodayISO();

  const [
    scheduledHour,
    scheduledMinute,
  ] =
    horario
      .split(
        ":"
      )
      .map(
        Number
      );

  const currentMinutes =
    now.getHours() *
      60 +
    now.getMinutes();

  const scheduledMinutes =
    scheduledHour *
      60 +
    scheduledMinute;

  /*
   * A notificação é recorrente e não carrega uma data de slot
   * diferente a cada repetição.
   *
   * Portanto associamos a ação ao slot MAIS RECENTE daquele
   * horário no relógio local:
   *
   * - 23:00 clicado às 00:20 -> ontem;
   * - 08:00 clicado às 08:30 -> hoje;
   * - 08:00 clicado às 07:30 -> ontem.
   *
   * Isso impede que uma notificação pendente atravessando
   * meia-noite crie uma dose no dia errado.
   */
  if (
    currentMinutes <
    scheduledMinutes
  ) {
    const yesterday =
      addDaysToLocalDate(
        today,
        -1
      );

    return (
      yesterday ||
      today
    );
  }

  return today;
}

function getDoseReminderExtra(
  value: unknown
): DoseReminderExtra | null {
  if (
    !value ||
    typeof value !==
      "object"
  ) {
    return null;
  }

  return value as DoseReminderExtra;
}

export function useDoseNotificationActions() {
  useEffect(
    () => {
      if (
        !Capacitor.isNativePlatform()
      ) {
        return;
      }

      let cancelled =
        false;

      const listenerPromise =
        LocalNotifications.addListener(
          "localNotificationActionPerformed",
          async (
            event
          ) => {
            try {
              if (
                cancelled
              ) {
                return;
              }

              const extra =
                getDoseReminderExtra(
                  event.notification
                    ?.extra
                );

              if (
                !extra ||
                extra.type !==
                  "dose_reminder"
              ) {
                return;
              }

              const medicamentoId =
                extra.medicamentoId
                  ?.trim();

              const personId =
                extra.personId
                  ?.trim();

              const horario =
                extra.horario;

              /*
               * Nunca tentamos inferir a pessoa a partir da
               * pessoa ativa do aplicativo.
               *
               * A própria notificação precisa carregar o dono
               * do registro clínico.
               */
              if (
                !medicamentoId ||
                !personId ||
                !isValidHorario(
                  horario
                )
              ) {
                console.warn(
                  "[useDoseNotificationActions] Notificação de dose sem dados suficientes.",
                  {
                    medicamentoId,
                    personId,
                    horario,
                  }
                );

                return;
              }

              const slotDate =
                resolveDoseNotificationSlotDate(
                  horario
                );

              if (
                event.actionId ===
                "TOMEI"
              ) {
                await doseLogsRepository.setStatus({
                  personId,
                  medicamentoId,
                  data:
                    slotDate,
                  horario,
                  status:
                    "taken",
                });

                return;
              }

              if (
                event.actionId ===
                "IGNORAR"
              ) {
                await doseLogsRepository.setStatus({
                  personId,
                  medicamentoId,
                  data:
                    slotDate,
                  horario,
                  status:
                    "ignored",
                });
              }
            } catch (
              error
            ) {
              console.error(
                "[useDoseNotificationActions] Erro ao processar ação da notificação:",
                error
              );
            }
          }
        );

      return () => {
        cancelled =
          true;

        void listenerPromise
          .then(
            (
              listener
            ) =>
              listener.remove()
          )
          .catch(
            (
              error
            ) => {
              console.error(
                "[useDoseNotificationActions] Erro ao remover listener:",
                error
              );
            }
          );
      };
    },
    []
  );
}