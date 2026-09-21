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

const PREFIX = "vault_insight_notified_v36:";
const COOLDOWN_MS = 12 * 60 * 60 * 1000;

function stableId(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return 1_500_000_000 + ((hash >>> 0) % 400_000_000);
}

export function InsightNotificationReconciler() {
  const { activePersonId } = useActivePersonId();
  const { insights } = useHealthIntelligence();

  useEffect(() => {
    if (!isVaultNative() || !activePersonId) return;
    if (!isNotificationPreferenceEnabled()) return;
    if (!isVaultNotificationCategoryEnabled("insights")) return;

    const eligible = insights
      .filter(
        (item) =>
          (item.kind === "alert" || item.kind === "pattern") &&
          (item.gravidadeSeguranca === "importante" ||
            item.gravidadeSeguranca === "critica")
      )
      .slice(0, 1);

    if (eligible.length === 0) return;

    void (async () => {
      const permission = await LocalNotifications.checkPermissions();
      if (permission.display !== "granted") return;

      await ensureVaultNotificationChannel();

      const now = Date.now();
      const notifications = eligible.flatMap((insight) => {
        const storageKey = `${PREFIX}${activePersonId}:${insight.id}`;
        const last = Number(window.localStorage.getItem(storageKey) || 0);

        if (Number.isFinite(last) && now - last < COOLDOWN_MS) return [];

        window.localStorage.setItem(storageKey, String(now));

        return [
          {
            id: stableId(`${activePersonId}:${insight.id}`),
            title: insight.titulo || "Insight importante do Vault",
            body:
              insight.mensagem ||
              "Há um sinal de saúde que merece sua atenção.",
            schedule: {
              at: new Date(now + 2500),
              allowWhileIdle: true,
            },
            channelId: VAULT_NOTIFICATION_CHANNEL_ID,
            extra: {
              type: "health_insight",
              vaultHealthInsight: true,
              personId: activePersonId,
              insightId: insight.id,
              targetRoute: insight.link || "/saude",
            },
          },
        ];
      });

      if (notifications.length > 0) {
        await LocalNotifications.schedule({ notifications });
      }
    })().catch((error) =>
      console.error("[Insight notifications]", error)
    );
  }, [activePersonId, insights]);

  return null;
}
