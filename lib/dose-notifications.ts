// lib/dose-notifications.ts

import { hasKnownEmptyMedicationStock } from "@/lib/medication-availability";
import { isVaultNotificationCategoryEnabled } from "@/lib/notification-preferences";
import {
  isVaultNative,
} from "@/lib/native-runtime";

import {
  LocalNotifications,
} from "@capacitor/local-notifications";

import type { DoseLog, Medicamento } from "@/lib/types";

import {
  ensureVaultNotificationChannel,
  isNotificationPreferenceEnabled,
  requestNotificationPermissions,
  VAULT_NOTIFICATION_CHANNEL_ID,
} from "@/lib/notifications";

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
  return isVaultNative();
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
  if (
    !isNativePlatform()
  ) {
    return false;
  }

  const granted =
    await requestNotificationPermissions();

  if (
    !granted
  ) {
    return false;
  }

  await ensureVaultNotificationChannel();
  await registerNotificationActions();

  return true;
}

// ============================================================
// AGENDAR
// ============================================================

export async function scheduleDoseNotifications(medicamento: DoseNotificationPayload): Promise<void> {
  if (!isNativePlatform()) return;
  const medicamentoId = medicamento.id.trim();
  const personId = medicamento.person_id?.trim();
  if (!medicamentoId || !personId) return;
  // V121: every persisted medication uses the same exact-slot policy.
  // This prevents legacy recurring alarms from restoring a "take" reminder at zero stock.
  const { db } = await import("@/lib/db");
  const stored = await db.medicamentos.get(medicamentoId);
  if (!stored || stored.person_id !== personId) return;
  const [medicamentos, logs] = await Promise.all([
    db.medicamentos.where("person_id").equals(personId).toArray(),
    db.doseLogs.where("person_id").equals(personId).toArray(),
  ]);
  await reconcileScheduledDoseNotifications({ personId, medicamentos, logs });
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
  /*
   * Cancelamento independe dos horários atuais.
   *
   * Um medicamento pode ter sido agendado com horários antigos
   * e depois ter os horários removidos ou ser descontinuado.
   *
   * Mesmo com [] precisamos consultar as notificações pendentes
   * e localizar as antigas pelo extra.medicamentoId.
   */
  const horarios =
    getUniqueValidHorarios(
      medicamento
    );

  const fallbackIds =
    horarios.map(
      (
        horario
      ) =>
        getDoseNotificationId(
          medicamentoId,
          horario
        )
    );

  try {
    const pending =
      await LocalNotifications.getPending();

    const ids =
      new Set<number>(
        fallbackIds
      );

    pending.notifications.forEach(
      (
        notification
      ) => {
        const extra =
          notification.extra;

        if (
          extra &&
          typeof extra ===
            "object" &&
          (
            extra as Record<
              string,
              unknown
            >
          ).type ===
            "dose_reminder" &&
          (
            extra as Record<
              string,
              unknown
            >
          ).medicamentoId ===
            medicamentoId
        ) {
          ids.add(
            notification.id
          );
        }
        const stockExtra = extra as Record<string, unknown> | undefined;
        if (stockExtra?.type === "dose_stock_review" && Array.isArray(stockExtra.medicamentoIds) && stockExtra.medicamentoIds.includes(medicamentoId)) ids.add(notification.id);
      }
    );

    if (
      ids.size ===
      0
    ) {
      return;
    }

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

  try {
    const pending =
      await LocalNotifications.getPending();

    pending.notifications.forEach(
      (
        notification
      ) => {
        const extra =
          notification.extra;

        if (
          extra &&
          typeof extra ===
            "object" &&
          (
            extra as Record<
              string,
              unknown
            >
          ).type ===
            "dose_reminder"
        ) {
          ids.add(
            notification.id
          );
        }
        if ((extra as Record<string, unknown> | undefined)?.type === "dose_stock_review") ids.add(notification.id);
      }
    );

    if (
      ids.size ===
      0
    ) {
      return;
    }

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

// ============================================================
// VAULT_SCHEDULED_DOSE_RECONCILER_V51
// Notificações programadas por SLOT (data + horário), não recorrência cega.
// Assim uma dose tomada/ignorada antes do horário cancela somente aquele slot,
// preservando os próximos dias.
// ============================================================

const SCHEDULED_DOSE_HORIZON_DAYS_V51 = 7;
const MAX_SCHEDULED_DOSE_PENDING_V51 = 80;

function localDateKeyV51(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
}

function addLocalDaysV51(base: Date, days: number): Date {
  const result = new Date(base);
  result.setHours(12,0,0,0);
  result.setDate(result.getDate()+days);
  return result;
}

function scheduledDateAtV51(data: string, horario: string): Date | null {
  const d=/^(\d{4})-(\d{2})-(\d{2})$/.exec(data);
  const h=/^(\d{2}):(\d{2})$/.exec(horario);
  if(!d || !h) return null;
  const result=new Date(+d[1],+d[2]-1,+d[3],+h[1],+h[2],0,0);
  return Number.isNaN(result.getTime()) ? null : result;
}

function scheduledDoseResolvedV51(logs: DoseLog[], personId: string, medicamentoId: string, data: string, horario: string): boolean {
  return logs.some((log) =>
    log.person_id===personId &&
    log.medicamento_id===medicamentoId &&
    log.data===data &&
    log.horario===horario &&
    Boolean(log.tomado_em || log.ignorado_em)
  );
}

type ScheduledDoseInput = { personId: string; medicamentos: Medicamento[]; logs: DoseLog[]; now?: Date };
let scheduledDoseTail: Promise<number> = Promise.resolve(0);
export async function reconcileScheduledDoseNotifications(input: ScheduledDoseInput): Promise<number> {
  const next = scheduledDoseTail.catch(() => 0).then(() => performScheduledDoseReconciliation(input));
  scheduledDoseTail = next;
  return next;
}
async function performScheduledDoseReconciliation(input: ScheduledDoseInput): Promise<number> {
  if(!isNativePlatform()) return 0;
  const personId=input.personId.trim();
  if(!personId) return 0;

  const pending=await LocalNotifications.getPending();
  const oldDoseIds=pending.notifications
    .filter((notification) => {
      const extra=notification.extra as Record<string,unknown>|undefined;
      return extra?.type==="dose_reminder" || extra?.type==="dose_reminder_group" || extra?.type==="dose_stock_review";
    })
    .map((notification)=>({id:notification.id}));

  // Remove tanto a agenda recorrente legada quanto os slots V51 e reconstrói
  // a janela a partir do estado clínico atual do DoseLog.
  if(oldDoseIds.length>0) await LocalNotifications.cancel({notifications:oldDoseIds});

  if(!isNotificationPreferenceEnabled() || !isVaultNotificationCategoryEnabled("doses")) return 0;
  const permission=await LocalNotifications.checkPermissions();
  if(permission.display!=="granted") return 0;
  await ensureVaultNotificationChannel();
  await registerNotificationActions();

  const now=input.now ?? new Date();
  const notifications: Array<Record<string,unknown>>=[];
  const meds=input.medicamentos.filter((med) =>
    Boolean(med.id) && med.person_id===personId && med.status!=="descontinuado" &&
    med.tipo_uso!=="sos" && med.tipo_uso!=="esporadico"
  );

  // VAULT_GROUPED_DOSE_REMINDERS_PRE_APK
  // Primeiro montamos os slots clínicos individuais. Só depois agrupamos os
  // que compartilham pessoa + data + horário. Assim a resolução continua
  // individual no DoseLog e o agrupamento é apenas uma decisão de UX.
  type PendingDoseSlot = {
    medicamentoId: string;
    nome: string;
    dosagem: string;
    data: string;
    horario: string;
    at: Date;
  };

  const slots: PendingDoseSlot[]=[];
  const stockSlots: PendingDoseSlot[]=[];
  const stockDays = new Set<string>();

  for(let offset=0; offset<SCHEDULED_DOSE_HORIZON_DAYS_V51; offset+=1){
    const data=localDateKeyV51(addLocalDaysV51(now,offset));
    for(const med of meds){
      const medicamentoId=med.id!;
      const horarios=Array.from(new Set((med.estoque_horarios||[]).map(normalizeHorario).filter((v):v is string=>Boolean(v)))).sort();
      for(const horario of horarios){
        if (hasKnownEmptyMedicationStock(med) && horario !== horarios[0]) continue;
        if(scheduledDoseResolvedV51(input.logs,personId,medicamentoId,data,horario)) continue;
        const at=scheduledDateAtV51(data,horario);
        if(!at || at.getTime()<=now.getTime()) continue;
        if (hasKnownEmptyMedicationStock(med)) {
          const key = `${medicamentoId}:${data}`;
          if (!stockDays.has(key)) {
            stockDays.add(key);
            stockSlots.push({ medicamentoId, nome: med.nome?.trim() || "Medicamento", dosagem: "", data, horario, at });
          }
          continue;
        }
        slots.push({
          medicamentoId,
          nome: med.nome?.trim() || "Medicamento",
          dosagem: med.dosagem?.trim() || "",
          data,
          horario,
          at,
        });
      }
    }
  }

  const grouped=new Map<string,PendingDoseSlot[]>();
  for(const slot of slots){
    const key=`${slot.data}|${slot.horario}`;
    const current=grouped.get(key) ?? [];
    current.push(slot);
    grouped.set(key,current);
  }

  const orderedGroups=Array.from(grouped.values()).sort(
    (a,b)=>a[0].at.getTime()-b[0].at.getTime()
  );

  for(const group of orderedGroups){
    if(notifications.length>=MAX_SCHEDULED_DOSE_PENDING_V51) break;

    const first=group[0];

    if(group.length===1){
      notifications.push({
        id: hashToId(`dose:v51:${personId}:${first.medicamentoId}:${first.data}:${first.horario}`),
        title:`Hora do ${first.nome}`,
        body:first.dosagem ? `${first.dosagem} — registre a dose no Vault` : "Registre a dose no Vault",
        actionTypeId:ACTION_TYPE_ID,
        channelId:VAULT_NOTIFICATION_CHANNEL_ID,
        schedule:{at:first.at,allowWhileIdle:true},
        extra:{
          type:"dose_reminder",
          medicamentoId:first.medicamentoId,
          personId,
          horario:first.horario,
          data:first.data,
          targetRoute:`/saude/medicamentos/detalhes?id=${encodeURIComponent(first.medicamentoId)}`,
        },
      });
      continue;
    }

    const summary=group
      .map((slot)=>slot.dosagem ? `${slot.nome} ${slot.dosagem}` : slot.nome)
      .join(" · ");

    notifications.push({
      id:hashToId(`dose:group:v1:${personId}:${first.data}:${first.horario}`),
      title:`${group.length} medicamentos para tomar agora`,
      body:summary,
      channelId:VAULT_NOTIFICATION_CHANNEL_ID,
      schedule:{at:first.at,allowWhileIdle:true},
      extra:{
        type:"dose_reminder_group",
        personId,
        horario:first.horario,
        data:first.data,
        medicamentoIds:group.map((slot)=>slot.medicamentoId),
        targetRoute:"/hoje",
      },
    });
  }
  // At most one stock review per medication/day, without clinical action buttons.
  const stockGroups = new Map<string, PendingDoseSlot[]>();
  for (const slot of stockSlots) {
    const key = `${slot.data}:${slot.horario}`;
    const group = stockGroups.get(key) || [];
    group.push(slot); stockGroups.set(key, group);
  }
  for (const group of stockGroups.values()) {
    const first = group[0];
    const medicamentoIds = group.map(slot => slot.medicamentoId).sort();
    notifications.push({
      id: hashToId(`dose:stock:v121:${personId}:${first.data}:${first.horario}:${medicamentoIds.join(",")}`),
      title: group.length === 1 ? `Confira o estoque de ${first.nome}` : `${group.length} medicamentos com estoque zerado`,
      body: `${group.map(slot => slot.nome).join(" · ")} — confira o estoque cadastrado e revise a rotina no Vault.`,
      channelId: VAULT_NOTIFICATION_CHANNEL_ID,
      schedule: { at: first.at, allowWhileIdle: true },
      extra: { type: "dose_stock_review", personId, medicamentoIds, data: first.data, horario: first.horario,
        targetRoute: group.length === 1 ? `/saude/medicamentos/detalhes?id=${encodeURIComponent(first.medicamentoId)}` : "/saude/medicamentos" },
    });
  }
  notifications.sort((a, b) => (a.schedule as { at: Date }).at.getTime() - (b.schedule as { at: Date }).at.getTime());
  notifications.splice(MAX_SCHEDULED_DOSE_PENDING_V51);
  if(notifications.length>0){
    await LocalNotifications.schedule({notifications: notifications as unknown as Parameters<typeof LocalNotifications.schedule>[0]["notifications"]});
  }
  return notifications.length;
}
