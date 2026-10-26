"use client";

import { useEffect, useRef } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { LocalNotifications } from "@capacitor/local-notifications";

import { useActivePersonId } from "@/hooks/useActivePersonId";
import { useAuth } from "@/hooks/useAuth";
import { db } from "@/lib/db";
import { brainV5IsSnoozed, brainV5Journeys, type BrainV5Alert } from "@/lib/health-intelligence/brain-v5";
import { useSharedHealthIntelligence as useHealthIntelligence } from "@/contexts/HealthIntelligenceContext";
import { isVaultNative } from "@/lib/native-runtime";
import {
  ensureVaultNotificationChannel,
  isNotificationPreferenceEnabled,
  VAULT_NOTIFICATION_CHANNEL_ID,
} from "@/lib/notifications";
import { isVaultNotificationCategoryEnabled } from "@/lib/notification-preferences";
import {
  getHealthInsightNotificationRoute,
  rankHealthInsightNotificationCandidates,
} from "@/lib/health-intelligence/notification-policy";
import {
  recordHealthInsightDelivery,
  pruneHealthInsightMemory,
  shouldDeliverHealthInsight,
} from "@/lib/health-intelligence/insight-memory";
import {
  carePlanNotificationBody,
  carePlanNotificationId,
  clearCarePlanNotificationMemory,
  decideCarePlanNotification,
  readCarePlanNotificationMemory,
  recordCarePlanNotification,
} from "@/lib/health-intelligence/care-plan-notification";

function stableId(value: string) {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return 1_500_000_000 + ((hash >>> 0) % 400_000_000);
}

// VAULT_INSIGHT_RECONCILER_V61
export function InsightNotificationReconciler() {
  const { activePersonId } = useActivePersonId();
  const { user } = useAuth();
  const { insights, careCommand } = useHealthIntelligence();
  const settings = useLiveQuery(() => user?.id ? db.settings.where("user_id").equals(user.id).first().then(row=>row??null) : null,[user?.id]) as ({brain_v5_alert_ledger?:BrainV5Alert[]}|null|undefined);
  const schedulingRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isVaultNative() || !activePersonId || !user?.id || settings===undefined) return;
    if (!isNotificationPreferenceEnabled()) return;
    if (!isVaultNotificationCategoryEnabled("insights")) return;
    pruneHealthInsightMemory(activePersonId);

    const plan = careCommand?.plan ?? null;
    const planMemory = plan ? readCarePlanNotificationMemory(plan.ownerKey) : null;
    const planDecision = plan ? decideCarePlanNotification(plan, planMemory) : null;
    if (plan && planDecision?.reason === "ineligible" && planMemory) {
      clearCarePlanNotificationMemory(plan.ownerKey);
      void LocalNotifications.cancel({ notifications: [{ id: planMemory.notificationId }] }).catch(() => undefined);
    }

    const ledger=(settings?.brain_v5_alert_ledger||[]).filter(item=>item.person_id===activePersonId);
    const snoozedIds=new Set(ledger.filter(item=>brainV5IsSnoozed(item)).map(item=>item.insight_id));
    // One notification candidate per care journey. Related signals stay inside
    // the detail sheet instead of becoming repeated pushes about the same item.
    const journeyPrimaryIds=new Set(brainV5Journeys(ledger).filter(item=>!brainV5IsSnoozed(item.primary)).map(item=>item.primary.insight_id));
    const candidates=rankHealthInsightNotificationCandidates(insights).filter(candidate=>!snoozedIds.has(candidate.id)&&(!ledger.length||journeyPrimaryIds.has(candidate.id)));
    if(snoozedIds.size)void LocalNotifications.cancel({notifications:[...snoozedIds].map(id=>({id:stableId(`${activePersonId}:${id}`)}))}).catch(()=>undefined);
    const eligible = candidates.map(
      (candidate) => ({
        candidate,
        decision: shouldDeliverHealthInsight(activePersonId, candidate),
      })
    );

    const selected = eligible.find((item) => item.decision.deliver);

    // Uma pendência operacional registrada vence um insight comportamental.
    // Assim apenas um push novo disputa atenção por reconciliação.
    if (plan && planDecision?.deliver && planDecision.item) {
      const item = planDecision.item;
      const signature = `${user.id}:${activePersonId}:care:${planDecision.signature}`;
      if (schedulingRef.current === signature) return;
      schedulingRef.current = signature;
      let cancelled = false;
      void (async () => {
        const permission = await LocalNotifications.checkPermissions();
        if (permission.display !== "granted" || cancelled) return;
        await ensureVaultNotificationChannel();
        if (cancelled) return;
        const scheduledAt = Date.now() + 2500;
        const nextId = carePlanNotificationId(plan.ownerKey, item);
        if (planMemory && planMemory.notificationId !== nextId) {
          await LocalNotifications.cancel({ notifications: [{ id: planMemory.notificationId }] }).catch(() => undefined);
        }
        await LocalNotifications.schedule({ notifications: [{
          id: nextId, title: item.title || "Ação de cuidado pendente",
          body: carePlanNotificationBody(item), schedule: { at: new Date(scheduledAt), allowWhileIdle: true },
          channelId: VAULT_NOTIFICATION_CHANNEL_ID,
          extra: { type: "care_plan", vaultCarePlan: true, personId: activePersonId, carePlanItemId: item.id, targetRoute: item.href, memoryReason: planDecision.reason },
        }] });
        recordCarePlanNotification(plan, item, scheduledAt);
      })().catch(error => console.error("[Care plan notifications V270]", error)).finally(() => {
        if (schedulingRef.current === signature) schedulingRef.current = null;
      });
      return () => { cancelled = true; };
    }

    if (!selected) return;

    const { candidate, decision } = selected;
    const signature = `${user.id}:${activePersonId}:${candidate.id}`;
    if (schedulingRef.current === signature) return;
    schedulingRef.current = signature;
    let cancelled = false;

    void (async () => {
      const permission =
        await LocalNotifications.checkPermissions();

      if (permission.display !== "granted" || cancelled) return;

      await ensureVaultNotificationChannel();
      if (cancelled) return;

      const scheduledAt = Date.now() + 2500;

      await LocalNotifications.schedule({
        notifications: [
          {
            id: stableId(
              `${activePersonId}:${candidate.id}`
            ),
            title:
              candidate.titulo ||
              "Insight importante do Vault",
            body:
              candidate.mensagem ||
              "Há um sinal de saúde que merece sua atenção.",
            schedule: {
              at: new Date(scheduledAt),
              allowWhileIdle: true,
            },
            channelId:
              VAULT_NOTIFICATION_CHANNEL_ID,
            extra: {
              type: "health_insight",
              vaultHealthInsight: true,
              personId: activePersonId,
              insightId: candidate.id,
              targetRoute:
                getHealthInsightNotificationRoute(
                  candidate
                ),
              memoryReason: decision.reason,
            },
          },
        ],
      });

      // Só grava memória depois que o SO aceitou o agendamento.
      recordHealthInsightDelivery(
        activePersonId,
        candidate,
        scheduledAt
      );
    })().catch((error) => console.error("[Insight notifications V61]", error)).finally(() => {
      if (schedulingRef.current === signature) schedulingRef.current = null;
    });
    return () => { cancelled = true; };
  }, [activePersonId, careCommand, insights, settings, user?.id]);

  return null;
}
