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

export async function cancelNotification(notificationId: number): Promise<void> {
  try {
    await LocalNotifications.cancel({ notifications: [{ id: notificationId }] });
    console.log(`Notificação cancelada: ${notificationId}`);
  } catch (error) {
    console.error('Erro ao cancelar notificação:', error);
  }
}

export async function cancelAllNotifications(): Promise<void> {
  try {
    await LocalNotifications.cancelAll();
    console.log('Todas as notificações canceladas');
  } catch (error) {
    console.error('Erro ao cancelar notificações:', error);
  }
}

export async function requestNotificationPermissions(): Promise<boolean> {
  try {
    const { display } = await LocalNotifications.requestPermissions();
    return display === 'granted';
  } catch (error) {
    console.error('Erro ao solicitar permissões:', error);
    return false;
  }
}

export function generateNotificationId(type: string, docId: number): number {
  const base = type === 'document' ? 10000 : 20000;
  return base + docId;
}

/**
 * Agenda notificação de vencimento de documento (30 dias antes)
 */
export async function scheduleDocumentExpiryNotification(
  docId: number,
  title: string,
  expiryDate: string,
  category: string,
  daysBefore: number = 30
): Promise<void> {
  const expiry = new Date(expiryDate);
  const notifyDate = new Date(expiry);
  notifyDate.setDate(notifyDate.getDate() - daysBefore);

  if (notifyDate < new Date()) {
    console.log('Data de notificação já passou, não agendando');
    return;
  }

  await scheduleNotification({
    id: generateNotificationId('document', docId),
    title: `📄 Documento vence em ${daysBefore} dias: ${title}`,
    body: `Vence em ${format(expiry, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })} (Categoria: ${category})`,
    scheduleDate: notifyDate,
    extra: {
      type: 'document_expiry',
      docId,
    },
  });
}

/**
 * Agenda notificação de renovação de receita (25 dias após emissão)
 */
export async function scheduleMedicationRenewalNotification(
  medicamentoId: number,
  nome: string,
  notificationDate: string,
  medico: string
): Promise<void> {
  const notify = new Date(notificationDate);

  if (notify < new Date()) {
    console.log('Data de notificação já passou, não agendando');
    return;
  }

  await scheduleNotification({
    id: generateNotificationId('medicamento', medicamentoId),
    title: `💊 Medicamento vence em breve: ${nome}`,
    body: `Renovação com Dr(a). ${medico} em breve. Verifique a data da receita.`,
    scheduleDate: notify,
    extra: {
      type: 'medication_renewal',
      medicamentoId,
    },
  });
}
