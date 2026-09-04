// lib/notifications.ts

import {
  Capacitor,
} from "@capacitor/core";

import {
  LocalNotifications,
} from "@capacitor/local-notifications";

import {
  CATEGORIES,
} from "@/lib/types";

import type {
  Document,
  Medicamento,
} from "@/lib/types";

export const NOTIFICATION_PREFERENCE_STORAGE_KEY =
  "vault_notifications_enabled";

export function isNotificationPreferenceEnabled(): boolean {
  if (
    typeof window ===
    "undefined"
  ) {
    return false;
  }

  try {
    return (
      window.localStorage.getItem(
        NOTIFICATION_PREFERENCE_STORAGE_KEY
      ) === "true"
    );
  } catch {
    return false;
  }
}

export function setNotificationPreferenceEnabled(
  enabled: boolean
): void {
  if (
    typeof window ===
    "undefined"
  ) {
    return;
  }

  try {
    window.localStorage.setItem(
      NOTIFICATION_PREFERENCE_STORAGE_KEY,
      String(enabled)
    );
  } catch (
    error
  ) {
    console.error(
      "[notifications] Erro ao salvar preferência:",
      error
    );
  }
}

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

type NotificationExtra =
  Record<
    string,
    unknown
  >;

function asNotificationExtra(
  value: unknown
): NotificationExtra {
  if (
    !value ||
    typeof value !==
      "object"
  ) {
    return {};
  }

  return value as NotificationExtra;
}

async function cancelPendingNotificationsWhere(
  predicate: (
    extra: NotificationExtra
  ) => boolean
): Promise<void> {
  if (
    !isNativePlatform()
  ) {
    return;
  }

  try {
    const pending =
      await LocalNotifications.getPending();

    const notifications =
      pending.notifications
        .filter(
          (
            notification
          ) =>
            predicate(
              asNotificationExtra(
                notification.extra
              )
            )
        )
        .map(
          (
            notification
          ) => ({
            id:
              notification.id,
          })
        );

    if (
      notifications.length ===
      0
    ) {
      return;
    }

    await LocalNotifications.cancel({
      notifications,
    });
  } catch (
    error
  ) {
    console.error(
      "[notifications] Erro ao reconciliar agendamentos:",
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

  /*
   * Sempre removemos o agendamento anterior.
   * Se a preferência estiver desligada, paramos aqui.
   */
  await cancelNotificationById(
    notificationId
  );

  if (
    !isNotificationPreferenceEnabled()
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

export async function cancelMedicationRenewalNotification(
  medicamentoId: string
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

  /*
   * Cancela tanto o formato novo quanto IDs antigos,
   * porque a identificação principal vem do extra.
   */
  await cancelPendingNotificationsWhere(
    (
      extra
    ) =>
      extra.type ===
        "medication_renewal" &&
      extra.medicamentoId ===
        safeMedicamentoId
  );

  await cancelNotificationById(
    hashToId(
      `medication-renewal:${safeMedicamentoId}`
    )
  );
}

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

  await cancelMedicationRenewalNotification(
    safeMedicamentoId
  );

  if (
    !isNotificationPreferenceEnabled()
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
      `medication-renewal:${safeMedicamentoId}`
    );

  try {
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
// RECONCILIAÇÃO DOS DADOS PERSISTIDOS
// ============================================================

function readDocumentExpiryDate(
  document: Document
): string | null {
  const metadata =
    document.metadata || {};

  const candidates = [
    metadata.expiry_date,
    metadata.data_validade,
    metadata.validade,
  ];

  const value =
    candidates.find(
      (candidate) =>
        typeof candidate ===
          "string" &&
        candidate.trim().length >
          0
    );

  return typeof value ===
    "string"
    ? value.trim()
    : null;
}

export async function reconcilePersistentNotifications(
  documents: Document[],
  medicamentos: Medicamento[]
): Promise<{
  documents: number;
  renewals: number;
}> {
  if (
    !isNativePlatform() ||
    !isNotificationPreferenceEnabled()
  ) {
    return {
      documents: 0,
      renewals: 0,
    };
  }

  const documentTasks =
    documents.flatMap(
      (document) => {
        const id =
          document.id?.trim();

        const expiryDate =
          readDocumentExpiryDate(
            document
          );

        if (
          !id ||
          !expiryDate
        ) {
          return [];
        }

        return [
          scheduleDocumentExpiryNotification(
            id,
            document.title,
            expiryDate,
            CATEGORIES[
              document.category_id
            ]?.name ||
              "Documento"
          ),
        ];
      }
    );

  const renewalTasks =
    medicamentos.flatMap(
      (medicamento) => {
        const id =
          medicamento.id?.trim();

        const renewalDate =
          medicamento.proxima_renovacao?.trim();

        if (
          !id ||
          !renewalDate ||
          medicamento.status ===
            "descontinuado"
        ) {
          return [];
        }

        return [
          scheduleMedicationRenewalNotification(
            id,
            medicamento.nome,
            renewalDate,
            medicamento.medico || ""
          ),
        ];
      }
    );

  await Promise.all([
    ...documentTasks,
    ...renewalTasks,
  ]);

  return {
    documents:
      documentTasks.length,

    renewals:
      renewalTasks.length,
  };
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