import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';

export type DoseNotificationPayload = {
  id: string;
  nome: string;
  dosagem: string;
  estoque_horarios: string[];
};

async function registerNotificationActions() {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await LocalNotifications.registerActionTypes({
      types: [
        {
          id: 'DOSE_REMINDER_ACTIONS',
          actions: [
            {
              id: 'TOMEI',
              title: 'Tomei',
              foreground: false
            },
            {
              id: 'IGNORAR',
              title: 'Ignorar',
              foreground: false,
              destructive: true
            }
          ]
        }
      ]
    });
  } catch (e) {
    console.error('Erro ao registrar botões da notificação:', e);
  }
}

function hashToId(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) % 2147483647;
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  try {
    const result = await LocalNotifications.requestPermissions();
    if (result.display === 'granted') {
      await registerNotificationActions();
      return true;
    }
    return false;
  } catch (e) {
    console.error('Erro ao pedir permissão de notificação:', e);
    return false;
  }
}

export async function scheduleDoseNotifications(medicamento: DoseNotificationPayload): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  if (!medicamento.id || !medicamento.estoque_horarios || medicamento.estoque_horarios.length === 0) {
    return;
  }

  await registerNotificationActions();
  await cancelDoseNotifications(medicamento);

  const notifications = medicamento.estoque_horarios
    .filter((h) => !!h)
    .map((horario) => {
      const [hourStr, minuteStr] = horario.split(':');
      const hour = parseInt(hourStr, 10);
      const minute = parseInt(minuteStr, 10);
      const id = hashToId(`${medicamento.id}-${horario}`);

      return {
        id,
        title: `Hora do ${medicamento.nome}`,
        body: `${medicamento.dosagem} — toque pra marcar como tomado`,
        actionTypeId: 'DOSE_REMINDER_ACTIONS',
        schedule: {
          on: { hour, minute },
          repeats: true,
          allowWhileIdle: true,
        },
        extra: {
          type: 'dose_reminder',
          medicamentoId: medicamento.id,
          horario,
        },
      };
    });

  if (notifications.length === 0) return;

  try {
    await LocalNotifications.schedule({ notifications });
  } catch (e) {
    console.error('Erro ao agendar notificações de dose:', e);
  }
}

export async function cancelDoseNotifications(medicamento: DoseNotificationPayload): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  if (!medicamento.id || !medicamento.estoque_horarios) return;

  const ids = medicamento.estoque_horarios
    .filter((h) => !!h)
    .map((horario) => ({ id: hashToId(`${medicamento.id}-${horario}`) }));

  if (ids.length === 0) return;

  try {
    await LocalNotifications.cancel({ notifications: ids });
  } catch (e) {
    console.error('Erro ao cancelar notificações de dose:', e);
  }
}

export async function cancelAllDoseNotifications(medicamentos: DoseNotificationPayload[]): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  
  const allIds: { id: number }[] = [];

  for (const med of medicamentos) {
    if (med.id && med.estoque_horarios) {
      med.estoque_horarios.forEach((horario) => {
        if (horario) {
          allIds.push({ id: hashToId(`${med.id}-${horario}`) });
        }
      });
    }
  }

  if (allIds.length === 0) return;

  try {
    await LocalNotifications.cancel({ notifications: allIds });
  } catch (e) {
    console.error('Erro ao cancelar todas as notificações de dose:', e);
  }
}