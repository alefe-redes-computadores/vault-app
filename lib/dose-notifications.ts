import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';
import type { Medicamento } from '@/lib/types';

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
    return result.display === 'granted';
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
