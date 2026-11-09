/** M99 P3 — adiar lembrete nativo sem alterar doses, prescrições ou estoque. */
import { LocalNotifications } from "@capacitor/local-notifications";
import { db } from "@/lib/db";
import { getLocalFirstAuthUser } from "@/lib/supabase/local-auth";
import { isVaultNative } from "@/lib/native-runtime";
import { ensureVaultNotificationChannel, isNotificationPreferenceEnabled, VAULT_NOTIFICATION_CHANNEL_ID } from "@/lib/notifications";
import { isVaultNotificationCategoryEnabled } from "@/lib/notification-preferences";
import { buildDoseSlotIndex, doseSlotIsResolved, resolveDoseSlot } from "@/lib/dose-slot-authority";
import {
  getVaultDoseSlotSnoozeUntilM99P3, setVaultDoseSlotSnoozeUntilM99P3,
} from "@/lib/dose-alert-pause-m99p2";
import {
  canSnoozeDoseSlotM99P3, doseSnoozeIdM99P3,
  DOSE_SNOOZE_MINUTES_M99P3, DOSE_SNOOZE_TYPE_M99P3,
  type DoseSnoozeSlotM99P3,
} from "@/lib/dose-snooze-policy-m99p3";
import type { DoseLog, Medicamento } from "@/lib/types";

export type DoseSnoozeRequestM99P3 = DoseSnoozeSlotM99P3 & {type?: string};

/** Ações agrupadas jamais adiam em massa: apenas dose individual identificada. */
export async function snoozeDoseReminderM99P3(input: DoseSnoozeRequestM99P3, now = new Date()): Promise<boolean> {
  if (!isVaultNative() || !canSnoozeDoseSlotM99P3(input, now) ||
      !["dose_reminder", "dose_planned", "dose_overdue"].includes(input.type || "") ||
      !isNotificationPreferenceEnabled() || !isVaultNotificationCategoryEnabled("doses")) return false;
  const session = await getLocalFirstAuthUser();
  const userId = session.data.user?.id;
  if (session.error || !userId) return false;
  const [person, medication] = await Promise.all([
    db.persons.get(input.personId), db.medicamentos.get(input.medicamentoId),
  ]);
  if (!person || person.user_id !== userId || !medication ||
      medication.user_id !== userId || medication.person_id !== input.personId) return false;
  if (medication.status === "descontinuado" && input.type !== "dose_planned") return false;
  if (medication.estoque_quantidade === 0 && input.type !== "dose_planned") return false;
  const logs = await db.doseLogs.where("[user_id+person_id]").equals([userId, input.personId]).toArray();
  if (doseSlotIsResolved(resolveDoseSlot(buildDoseSlotIndex(logs, {userId, personId: input.personId}),
    input.medicamentoId, input.data, input.horario))) return false;
  const permissions = await LocalNotifications.checkPermissions();
  if (permissions.display !== "granted") return false;
  await ensureVaultNotificationChannel();

  const id = doseSnoozeIdM99P3(input);
  const until = now.getTime() + DOSE_SNOOZE_MINUTES_M99P3 * 60_000;
  // ID fixo evita duplicações; confirma agendamento antes de persistir a pausa.
  const pending = await LocalNotifications.getPending();
  if (pending.notifications.some(item => item.id === id)) {
    await LocalNotifications.cancel({notifications: [{id}]});
  }
  await LocalNotifications.schedule({notifications: [{
    id, title: "Lembrete de dose adiado",
    body: "Revise a dose pendente no VAULT. Nada foi registrado automaticamente.",
    channelId: VAULT_NOTIFICATION_CHANNEL_ID,
    schedule: {at: new Date(until), allowWhileIdle: true},
    extra: {type: DOSE_SNOOZE_TYPE_M99P3, personId: input.personId,
      userId, medicamentoId: input.medicamentoId, data: input.data, horario: input.horario,
      snoozeUntil: until, targetRoute: "/hoje"},
  }]});
  if (!setVaultDoseSlotSnoozeUntilM99P3(input.personId, input.medicamentoId, input.data, input.horario, until, now.getTime())) {
    await LocalNotifications.cancel({notifications: [{id}]});
    return false;
  }
  // Cancela apenas reforços exclusivamente deste medicamento; grupos mistos são preservados.
  const sole = pending.notifications.filter(item => {
    const e = item.extra as Record<string, unknown> | undefined;
    return e?.type === "dose_overdue_group" && e.personId === input.personId &&
      e.data === input.data && e.horario === input.horario &&
      Array.isArray(e.medicamentoIds) && e.medicamentoIds.length === 1 && e.medicamentoIds[0] === input.medicamentoId;
  });
  if (sole.length) {
    try { await LocalNotifications.cancel({notifications: sole.map(({id}) => ({id}))}); }
    catch { /* o alerta novo já foi confirmado; rescan canônico eliminará sobras. */ }
  }
  return true;
}

type SnapshotM99P3 = {personId: string;userId?: string;medicamentos: Medicamento[];logs: DoseLog[]};
/** Revalidação dentro da fila V91: nenhum novo observador Dexie ou React. */
export async function reconcileSnoozedDoseNotificationsM99P3(snapshot: SnapshotM99P3, now = Date.now()): Promise<number> {
  if (!isVaultNative()) return 0;
  const pending = await LocalNotifications.getPending();
  const current = pending.notifications.filter(item =>
    (item.extra as Record<string, unknown> | undefined)?.type === DOSE_SNOOZE_TYPE_M99P3);
  if (!current.length) return 0;
  const meds = new Map(snapshot.medicamentos.map(item => [item.id, item]));
  const index = buildDoseSlotIndex(snapshot.logs, {userId: snapshot.userId, personId: snapshot.personId});
  const enabled = isNotificationPreferenceEnabled() && isVaultNotificationCategoryEnabled("doses");
  const cancel: number[] = [];
  for (const item of current) {
    const e = item.extra as Record<string, unknown>;
    const medId = typeof e.medicamentoId === "string" ? e.medicamentoId : "";
    const data = typeof e.data === "string" ? e.data : "";
    const horario = typeof e.horario === "string" ? e.horario : "";
    const med = meds.get(medId);
    const until = getVaultDoseSlotSnoozeUntilM99P3(snapshot.personId, medId, data, horario, now);
    const valid = enabled && !!snapshot.userId && e.userId === snapshot.userId &&
      e.personId === snapshot.personId && med?.person_id === snapshot.personId &&
      med?.user_id === snapshot.userId && typeof e.snoozeUntil === "number" &&
      e.snoozeUntil === until && until !== null &&
      !doseSlotIsResolved(resolveDoseSlot(index, medId, data, horario));
    if (!valid) {
      cancel.push(item.id);
      if (e.personId === snapshot.personId && until !== null)
        setVaultDoseSlotSnoozeUntilM99P3(snapshot.personId, medId, data, horario, 0, now, false);
    }
  }
  if (cancel.length) await LocalNotifications.cancel({notifications: [...new Set(cancel)].map(id => ({id}))});
  return cancel.length;
}
