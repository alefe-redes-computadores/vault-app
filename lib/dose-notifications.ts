import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';
import type { Medicamento } from '@/lib/types';

/**
 * Registra os tipos de ação para que o sistema nativo (Android/iOS)
 * mostre os botões "Tomei" e "Ignorar" embaixo da notificação push.
 * Chame isso uma vez, de preferência junto com a checagem de permissão.
 */
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
              foreground: false // Permite ação em background sem abrir o app
            },
            {
              id: 'IGNORAR',
              title: 'Ignorar',
              foreground: false,
              destructive: true // Geralmente fica vermelho no iOS
            }
          ]
        }
      ]
    });
  } catch (e) {
    console.error('Erro ao registrar botões da notificação:', e);
  }
}

/**
 * O plugin de notificação nativa exige IDs numéricos (int32), mas os
 * nossos IDs são UUID (string). Essa função gera um número estável a
 * partir de "medicamentoId-horario", então o mesmo medicamento+horário
 * sempre cai no mesmo ID — importante pra poder cancelar/recriar depois.
 */
function hashToId(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) % 2147483647;
}

/**
 * Pede permissão de notificação ao usuário. Chame isso uma vez, de
 * preferência quando o usuário ativa "Acompanhar estoque" pela primeira
 * vez (não precisa pedir toda hora — o plugin já lembra a resposta).
 */
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

/**
 * Agenda um lembrete diário e repetitivo pra cada horário de dose do
 * medicamento. Cancela e recria os agendamentos antigos desse
 * medicamento antes, então pode chamar de novo sempre que o usuário
 * editar os horários — não duplica notificação.
 */
export async function scheduleDoseNotifications(medicamento: Medicamento): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  if (!medicamento.id || !medicamento.estoque_horarios || medicamento.estoque_horarios.length === 0) {
    return;
  }

  // Registra as ações caso ainda não tenham sido (segurança extra)
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
        actionTypeId: 'DOSE_REMINDER_ACTIONS', // ✅ VINCULA OS BOTÕES CRIADOS ACIMA
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

/**
 * Cancela todos os lembretes agendados desse medicamento — chame antes
 * de excluir o medicamento, ou antes de desativar "Acompanhar estoque".
 */
export async function cancelDoseNotifications(medicamento: Medicamento): Promise<void> {
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

/**
 * Cancela as notificações de TODOS os medicamentos. Útil para quando
 * o usuário desativa a chave global de notificações em Configurações.
 */
export async function cancelAllDoseNotifications(medicamentos: Medicamento[]): Promise<void> {
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
