// lib/dose-notifications.ts

import {
  Capacitor,
} from "@capacitor/core";

import {
  LocalNotifications,
} from "@capacitor/local-notifications";

// ============================================================
// TIPOS
// ============================================================

export type DoseNotificationPayload = {
  id: string;

  /**
   * Não é necessário para CANCELAR uma notificação antiga.
   *
   * Porém é obrigatório para que uma nova notificação permita
   * executar TOMEI / IGNORAR com ownership correto.
   */
  person_id?: string;

  nome: string;

  dosagem: string;

  estoque_horarios: string[];
};

// ============================================================
// CONSTANTES
// ============================================================

const ACTION_TYPE_ID =
  "DOSE_REMINDER_ACTIONS";

const ACTION_TAKEN =
  "TOMEI";

const ACTION_IGNORED =
  "IGNORAR";

// ============================================================
// HELPERS
// ============================================================

function isNativePlatform(): boolean {
  return Capacitor.isNativePlatform();
}

function normalizeHorario(
  horario: string
): string | null {
  const normalized =
    horario.trim();

  const match =
    /^(\d{1,2}):(\d{2})$/.exec(
      normalized
    );

  if (!match) {
    return null;
  }

  const hour =
    Number(
      match[1]
    );

  const minute =
    Number(
      match[2]
    );

  if (
    !Number.isInteger(hour) ||
    !Number.isInteger(minute) ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    return null;
  }

  return `${String(
    hour
  ).padStart(
    2,
    "0"
  )}:${String(
    minute
  ).padStart(
    2,
    "0"
  )}`;
}

function getUniqueValidHorarios(
  medicamento:
    DoseNotificationPayload
): string[] {
  return Array.from(
    new Set(
      (
        medicamento.estoque_horarios ||
        []
      )
        .map(
          normalizeHorario
        )
        .filter(
          (
            horario
          ): horario is string =>
            Boolean(
              horario
            )
        )
    )
  );
}

function hashToId(
  value: string
): number {
  let hash = 0;

  for (
    let index = 0;
    index < value.length;
    index += 1
  ) {
    hash =
      (hash << 5) -
      hash +
      value.charCodeAt(index);

    hash |= 0;
  }

  const unsigned =
    hash >>> 0;

  return (
    unsigned %
      2147483646
  ) + 1;
}

function getDoseNotificationId(
  medicamentoId: string,
  horario: string
): number {
  return hashToId(
    `dose:${medicamentoId}:${horario}`
  );
}

// ============================================================
// ACTION TYPES
// ============================================================

async function registerNotificationActions(): Promise<void> {
  if (!isNativePlatform()) {
    return;
  }

  try {
    await LocalNotifications.registerActionTypes({
      types: [
        {
          id:
            ACTION_TYPE_ID,

          actions: [
            {
              id:
                ACTION_TAKEN,

              title:
                "Tomei",

              foreground:
                false,
            },

            {
              id:
                ACTION_IGNORED,

              title:
                "Ignorar",

              foreground:
                false,

              destructive:
                true,
            },
          ],
        },
      ],
    });
  } catch (error) {
    console.error(
      "[dose-notifications] Erro ao registrar ações:",
      error
    );
  }
}

// ============================================================
// PERMISSÃO
// ============================================================

export async function requestNotificationPermission(): Promise<boolean> {
  if (!isNativePlatform()) {
    return false;
  }

  try {
    const current =
      await LocalNotifications.checkPermissions();

    if (
      current.display ===
      "granted"
    ) {
      await registerNotificationActions();

      return true;
    }

    const result =
      await LocalNotifications.requestPermissions();

    if (
      result.display !==
      "granted"
    ) {
      return false;
    }

    await registerNotificationActions();

    return true;
  } catch (error) {
    console.error(
      "[dose-notifications] Erro ao pedir permissão:",
      error
    );

    return false;
  }
}

// ============================================================
// AGENDAR
// ============================================================

export async function scheduleDoseNotifications(
  medicamento:
    DoseNotificationPayload
): Promise<void> {
  if (!isNativePlatform()) {
    return;
  }

  const medicamentoId =
    medicamento.id.trim();

  const personId =
    medicamento.person_id
      ?.trim();

  if (!medicamentoId) {
    return;
  }

  /*
   * Uma notificação que oferece ações clínicas precisa conhecer
   * exatamente a pessoa proprietária do medicamento.
   *
   * Nunca usamos "pessoa ativa" no momento do clique.
   */
  if (!personId) {
    console.warn(
      "[dose-notifications] Dose não agendada: person_id ausente.",
      {
        medicamentoId,
      }
    );

    return;
  }

  const horarios =
    getUniqueValidHorarios(
      medicamento
    );

  if (
    horarios.length ===
    0
  ) {
    return;
  }

  await registerNotificationActions();

  await cancelDoseNotifications({
    ...medicamento,

    estoque_horarios:
      horarios,
  });

  const notifications =
    horarios.map(
      (
        horario
      ) => {
        const [
          hourStr,
          minuteStr,
        ] =
          horario.split(
            ":"
          );

        const hour =
          Number(
            hourStr
          );

        const minute =
          Number(
            minuteStr
          );

        return {
          id:
            getDoseNotificationId(
              medicamentoId,
              horario
            ),

          title:
            `Hora do ${medicamento.nome}`,

          body:
            medicamento.dosagem.trim()
              ? `${medicamento.dosagem.trim()} — registre a dose no Vault`
              : "Registre a dose no Vault",

          actionTypeId:
            ACTION_TYPE_ID,

          schedule: {
            on: {
              hour,
              minute,
            },

            repeats:
              true,

            allowWhileIdle:
              true,
          },

          extra: {
            type:
              "dose_reminder",

            medicamentoId,

            personId,

            horario,
          },
        };
      }
    );

  try {
    await LocalNotifications.schedule({
      notifications,
    });
  } catch (error) {
    console.error(
      "[dose-notifications] Erro ao agendar notificações:",
      error
    );
  }
}

// ============================================================
// CANCELAR MEDICAMENTO
// ============================================================

export async function cancelDoseNotifications(
  medicamento:
    DoseNotificationPayload
): Promise<void> {
  if (!isNativePlatform()) {
    return;
  }

  const medicamentoId =
    medicamento.id.trim();

  if (!medicamentoId) {
    return;
  }

  /*
   * Cancelar não depende de person_id.
   *
   * Isso mantém compatibilidade com fluxos antigos e com
   * Tratamentos, que precisam apenas remover os IDs conhecidos.
   */
  const horarios =
    getUniqueValidHorarios(
      medicamento
    );

  if (
    horarios.length ===
    0
  ) {
    return;
  }

  const notifications =
    horarios.map(
      (
        horario
      ) => ({
        id:
          getDoseNotificationId(
            medicamentoId,
            horario
          ),
      })
    );

  try {
    await LocalNotifications.cancel({
      notifications,
    });
  } catch (error) {
    console.error(
      "[dose-notifications] Erro ao cancelar notificações:",
      error
    );
  }
}

// ============================================================
// CANCELAR TODAS AS DOSES CONHECIDAS
// ============================================================

export async function cancelAllDoseNotifications(
  medicamentos:
    DoseNotificationPayload[]
): Promise<void> {
  if (!isNativePlatform()) {
    return;
  }

  const ids =
    new Set<number>();

  medicamentos.forEach(
    (
      medicamento
    ) => {
      const medicamentoId =
        medicamento.id.trim();

      if (!medicamentoId) {
        return;
      }

      getUniqueValidHorarios(
        medicamento
      ).forEach(
        (
          horario
        ) => {
          ids.add(
            getDoseNotificationId(
              medicamentoId,
              horario
            )
          );
        }
      );
    }
  );

  if (
    ids.size ===
    0
  ) {
    return;
  }

  try {
    await LocalNotifications.cancel({
      notifications:
        Array.from(
          ids
        ).map(
          (
            id
          ) => ({
            id,
          })
        ),
    });
  } catch (error) {
    console.error(
      "[dose-notifications] Erro ao cancelar notificações de dose:",
      error
    );
  }
}