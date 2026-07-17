import { LocalNotifications } from '@capacitor/local-notifications';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export interface NotificationData {
  id: number;
  title: string;
  body: string;
  scheduleDate: Date;
  extra?: Record<string, any>;
}

/**
 * Agenda uma notificação local
 */
export async function scheduleNotification(data: NotificationData): Promise<void> {
  try {
    const { id, title, body, scheduleDate, extra } = data;

    await LocalNotifications.schedule({
      notifications: [
        {
          id,
          title,
          body,
          schedule: {
            at: scheduleDate,
            allowWhileIdle: true,
          },
          extra,
          sound: 'default',
          vibrate: true,
          smallIcon: 'ic_notification',
          largeIcon: 'ic_notification_large',
        },
      ],
    });

    console.log(`Notificação agendada: ${title} (ID: ${id})`);
  } catch (error) {
    console.error('Erro ao agendar notificação:', error);
  }
}

/**
 * Cancela uma notificação agendada
 */
export async function cancelNotification(notificationId: number): Promise<void> {
  try {
    await LocalNotifications.cancel({ notifications: [{ id: notificationId }] });
    console.log(`Notificação cancelada: ${notificationId}`);
  } catch (error) {
    console.error('Erro ao cancelar notificação:', error);
  }
}

/**
 * Cancela todas as notificações agendadas
 */
export async function cancelAllNotifications(): Promise<void> {
  try {
    await LocalNotifications.cancelAll();
    console.log('Todas as notificações canceladas');
  } catch (error) {
    console.error('Erro ao cancelar notificações:', error);
  }
}

/**
 * Verifica se as permissões estão concedidas e solicita se necessário
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  try {
    const { display } = await LocalNotifications.requestPermissions();
    return display === 'granted';
  } catch (error) {
    console.error('Erro ao solicitar permissões:', error);
    return false;
  }
}

/**
 * Gera um ID único para notificação baseado no tipo e ID do documento
 */
export function generateNotificationId(type: string, docId: number): number {
  // Usa um número base + hash para evitar conflitos
  const base = type === 'document' ? 10000 : 20000;
  return base + docId;
}

/**
 * Agenda notificação de vencimento de documento
 */
export async function scheduleDocumentExpiryNotification(
  docId: number,
  title: string,
  expiryDate: string,
  category: string
): Promise<void> {
  const expiry = new Date(expiryDate);
  // Agenda 3 dias antes do vencimento
  const notifyDate = new Date(expiry);
  notifyDate.setDate(notifyDate.getDate() - 3);

  // Se a data de notificação já passou, não agenda
  if (notifyDate < new Date()) {
    console.log('Data de notificação já passou, não agendando');
    return;
  }

  await scheduleNotification({
    id: generateNotificationId('document', docId),
    title: `📄 Documento vence em breve: ${title}`,
    body: `Vence em ${format(expiry, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })} (Categoria: ${category})`,
    scheduleDate: notifyDate,
    extra: {
      type: 'document_expiry',
      docId,
    },
  });
}

/**
 * Agenda notificação de renovação de receita
 */
export async function scheduleMedicationRenewalNotification(
  medicamentoId: number,
  nome: string,
  renewalDate: string,
  medico: string
): Promise<void> {
  const renewal = new Date(renewalDate);
  // Agenda 3 dias antes da renovação
  const notifyDate = new Date(renewal);
  notifyDate.setDate(notifyDate.getDate() - 3);

  if (notifyDate < new Date()) {
    console.log('Data de notificação já passou, não agendando');
    return;
  }

  await scheduleNotification({
    id: generateNotificationId('medicamento', medicamentoId),
    title: `💊 Medicamento vence em breve: ${nome}`,
    body: `Renovação com Dr(a). ${medico} em ${format(renewal, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}`,
    scheduleDate: notifyDate,
    extra: {
      type: 'medication_renewal',
      medicamentoId,
    },
  });
}