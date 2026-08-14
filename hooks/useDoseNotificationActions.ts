"use client";

import { useEffect } from "react";
import { LocalNotifications } from "@capacitor/local-notifications";
import { Capacitor } from "@capacitor/core";
import { db } from "@/lib/db";
import { useAuth } from "./useAuth";
import { safeSetDoseLog } from "@/lib/db";

export function useDoseNotificationActions() {
  const { user } = useAuth();

  useEffect(() => {
    if (!Capacitor.isNativePlatform() || !user?.id) return;

    const listener = LocalNotifications.addListener(
      "localNotificationActionPerformed",
      async (event: any) => {
        const extra = event.notification?.extra;
        if (!extra || extra.type !== "dose_reminder") return;

        const hoje = new Date().toISOString().slice(0, 10);
        const actionId = event.actionId;

        if (actionId === "TOMEI") {
          await safeSetDoseLog({
            user_id: user.id,
            medicamento_id: extra.medicamentoId,
            data: hoje,
            horario: extra.horario,
            tomado_em: new Date().toISOString(),
          });
        } else if (actionId === "IGNORAR") {
          await safeSetDoseLog({
            user_id: user.id,
            medicamento_id: extra.medicamentoId,
            data: hoje,
            horario: extra.horario,
            ignorado_em: new Date().toISOString(),
          } as any);
        }
      }
    );

    return () => {
      listener.then((l) => l.remove());
    };
  }, [user?.id]);
}