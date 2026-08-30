// lib/notifications.ts

import {
  Capacitor,
} from "@capacitor/core";

import {
  LocalNotifications,
} from "@capacitor/local-notifications";

// ============================================================
// HELPERS
// ============================================================

function isNativePlatform(): boolean {
  return Capacitor.isNativePlatform();
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
      value.charCodeAt(
        index
      );

    hash |= 0;
  }

  const unsigned =
    hash >>> 0;

  return (
    unsigned %
      2147483646
  ) + 1;
}

function parseLocalDate(
  value: string
): Date | null {
  const match =
    /^(\d{4})-(\d{2})-(\d{2})$/.exec(
      value.trim()
    );

  if (
    !match
  ) {
    return null;
  }

  const year =
    Number(
      match[1]
    );

  const month =
    Number(
      match[2]
    );

  const day =
    Number(
      match[3]
    );

  const date =
    new Date(
      year,
      month - 1,
      day,
      9,
      0,
      0,
      0
    );

  if (
    date.getFullYear() !==
      year ||
    date.getMonth() !==
      month - 1 ||
    date.getDate() !==
      day
  ) {
    return null;
  }

  return date;
}

function normalizeDaysBefore(
  value: number
): number {
  if (
    !Number.isFinite(
      value
    ) ||
    value < 0
  ) {
    return 0;
  }

  return Math.floor(
    value
  );
}

function getDocumentExpiryNotificationId(
  documentId: string
): number | null {
  const safeDocumentId =
    documentId.trim();

  if (
    !safeDocumentId
  ) {
    return null;
  }

  return hashToId(
    `document-expiry:${safeDocumentId}`
  );
}

async function cancelNotificationById(
  notificationId: number
): Promise<void> {
  if (
    !isNativePlatform()
  ) {
    return;
  }

  if (
    !Number.isInteger(
      notificationId
    ) ||
    notificationId <= 0
  ) {
    return;
  }

  try {
    await LocalNotifications.cancel({
      notifications: [
        {
          id:
            notificationId,
        },
      ],
    });
  } catch (
    error
  ) {
    console.error(
      "[notifications] Erro ao cancelar notificação:",
      error
    );
  }
}

// ============================================================
// PERMISSÕES
// ============================================================

export async function checkNotificationPermissions(): Promise<boolean> {
  if (
    !isNativePlatform()
  ) {
    return false;
  }

  try {
    const result =
      await LocalNotifications.checkPermissions();

    return (
      result.display ===
      "granted"
    );
  } catch (
    error
  ) {
    console.error(
      "[notifications] Erro ao verificar permissões:",
      error
    );

    return false;
  }
}

export async function requestNotificationPermissions(): Promise<boolean> {
  if (
    !isNativePlatform()
  ) {
    return false;
  }

  try {
    const current =
      await LocalNotifications.checkPermissions();

    if (
      current.display ===
      "granted"
    ) {
      return true;
    }

    const result =
      await LocalNotifications.requestPermissions();

    return (
      result.display ===
      "granted"
    );
  } catch (
    error
  ) {
    console.error(
      "[notifications] Erro ao solicitar permissões:",
      error
    );

    return false;
  }
}

// ============================================================
// VENCIMENTO DE DOCUMENTOS
// ============================================================

export async function cancelDocumentExpiryNotification(
  documentId: string
): Promise<void> {
  if (
    !isNativePlatform()
  ) {
    return;
  }

  const notificationId =
    getDocumentExpiryNotificationId(
      documentId
    );

  if (
    notificationId ===
    null
  ) {
    return;
  }

  await cancelNotificationById(
    notificationId
  );
}

export async function scheduleDocumentExpiryNotification(
  documentId: string,
  title: string,
  expiryDate: string,
  categoryName: string,
  daysBefore: number = 30
): Promise<void> {
  if (
    !isNativePlatform()
  ) {
    return;
  }

  const safeDocumentId =
    documentId.trim();

  if (
    !safeDocumentId
  ) {
    return;
  }

  const notificationId =
    getDocumentExpiryNotificationId(
      safeDocumentId
    );

  if (
    notificationId ===
    null
  ) {
    return;
  }

  const expiry =
    parseLocalDate(
      expiryDate
    );

  if (
    !expiry
  ) {
    console.warn(
      "[notifications] Data de vencimento inválida:",
      expiryDate
    );

    return;
  }

  const notificationDate =
    new Date(
      expiry
    );

  notificationDate.setDate(
    notificationDate.getDate() -
      normalizeDaysBefore(
        daysBefore
      )
  );

  /*
   * O ID de validade do documento é determinístico.
   *
   * Cancelamos primeiro qualquer agendamento anterior.
   * Isso é importante inclusive quando a nova data já não
   * comporta um lembrete futuro.
   */
  await cancelNotificationById(
    notificationId
  );

  if (
    notificationDate <=
    new Date()
  ) {
    return;
  }

  try {
    await LocalNotifications.schedule({
      notifications: [
        {
          id:
            notificationId,

          title:
            "Documento vencendo em breve",

          body:
            `${title} (${categoryName}) vence em ${expiryDate}`,

          schedule: {
            at:
              notificationDate,
          },

          sound:
            "default",

          extra: {
            type:
              "document_expiry",

            docId:
              safeDocumentId,
          },
        },
      ],
    });
  } catch (
    error
  ) {
    console.error(
      "[notifications] Erro ao agendar vencimento de documento:",
      error
    );
  }
}

// ============================================================
// RENOVAÇÃO DE MEDICAMENTO
// ============================================================

export async function scheduleMedicationRenewalNotification(
  medicamentoId: string,
  nome: string,
  dataRenovacao: string,
  medico: string,
  daysBefore: number = 7
): Promise<void> {
  if (
    !isNativePlatform()
  ) {
    return;
  }

  const safeMedicamentoId =
    medicamentoId.trim();

  if (
    !safeMedicamentoId
  ) {
    return;
  }

  const renewal =
    parseLocalDate(
      dataRenovacao
    );

  if (
    !renewal
  ) {
    console.warn(
      "[notifications] Data de renovação inválida:",
      dataRenovacao
    );

    return;
  }

  const notificationDate =
    new Date(
      renewal
    );

  notificationDate.setDate(
    notificationDate.getDate() -
      normalizeDaysBefore(
        daysBefore
      )
  );

  if (
    notificationDate <=
    new Date()
  ) {
    return;
  }

  const id =
    hashToId(
      `medication-renewal:${safeMedicamentoId}:${dataRenovacao}`
    );

  try {
    await cancelNotificationById(
      id
    );

    await LocalNotifications.schedule({
      notifications: [
        {
          id,

          title:
            "Medicamento precisa ser renovado",

          body:
            medico.trim()
              ? `${nome} - Dr(a). ${medico.trim()}`
              : nome,

          schedule: {
            at:
              notificationDate,
          },

          sound:
            "default",

          extra: {
            type:
              "medication_renewal",

            medicamentoId:
              safeMedicamentoId,
          },
        },
      ],
    });
  } catch (
    error
  ) {
    console.error(
      "[notifications] Erro ao agendar renovação de medicamento:",
      error
    );
  }
}

// ============================================================
// CANCELAMENTO
// ============================================================

export async function cancelNotification(
  notificationId: number
): Promise<void> {
  await cancelNotificationById(
    notificationId
  );
}

export async function cancelAllNotifications(): Promise<void> {
  if (
    !isNativePlatform()
  ) {
    return;
  }

  try {
    const {
      notifications,
    } =
      await LocalNotifications.getPending();

    if (
      notifications.length ===
      0
    ) {
      return;
    }

    await LocalNotifications.cancel({
      notifications:
        notifications.map(
          (
            notification
          ) => ({
            id:
              notification.id,
          })
        ),
    });
  } catch (
    error
  ) {
    console.error(
      "[notifications] Erro ao cancelar notificações:",
      error
    );
  }
}