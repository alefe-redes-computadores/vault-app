"use client";

import { useEffect } from "react";
import { LocalNotifications } from "@capacitor/local-notifications";

import { useActivePersonId } from "@/hooks/useActivePersonId";
import { useHealthIntelligence } from "@/hooks/useHealthIntelligence";
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
  shouldDeliverHealthInsight,
} from "@/lib/health-intelligence/insight-memory";

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
  const { insights } = useHealthIntelligence();

  useEffect(() => {
    if (!isVaultNative() || !activePersonId) return;
    if (!isNotificationPreferenceEnabled()) return;
    if (!isVaultNotificationCategoryEnabled("insights")) return;

    const eligible = rankHealthInsightNotificationCandidates(insights).map(
      (candidate) => ({
        candidate,
        decision: shouldDeliverHealthInsight(activePersonId, candidate),
      })
    );

    const selected = eligible.find((item) => item.decision.deliver);

    if (!selected) return;

    const { candidate, decision } = selected;

    void (async () => {
      const permission =
        await LocalNotifications.checkPermissions();

      if (permission.display !== "granted") return;

      await ensureVaultNotificationChannel();

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
    })().catch((error) =>
      console.error(
        "[Insight notifications V61]",
        error
      )
    );
  }, [activePersonId, insights]);

  return null;
}
