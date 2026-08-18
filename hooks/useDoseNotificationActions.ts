// hooks/useDoseNotificationActions.ts
"use client";

import { useEffect } from "react";
import { LocalNotifications } from "@capacitor/local-notifications";
import { Capacitor } from "@capacitor/core";
import { db, safeSetDoseLog, safeUpdateMedicamento } from "@/lib/db";
import { useAuth } from "./useAuth";
import { getLocalTodayISO } from "@/lib/health-utils";

export function useDoseNotificationActions() {
  const { user } = useAuth();

  useEffect(() => {
    if (!Capacitor.isNativePlatform() || !user?.id) return;

    const listener = LocalNotifications.addListener(
      "localNotificationActionPerformed",
      async (event: any) => {
        const extra = event.notification?.extra;
        if (!extra || extra.type !== "dose_reminder") return;

        const actionId = event.actionId;
        const hoje = getLocalTodayISO();

        if (actionId === "TOMEI") {
          await safeSetDoseLog({
            user_id: user.id,
            medicamento_id: extra.medicamentoId,
            data: hoje,
            horario: extra.horario,
            tomado_em: new Date().toISOString(),
          });

          const med = await db.medicamentos.get(extra.medicamentoId);
          if (med && typeof med.estoque_quantidade === "number") {
            const unidadePorDose = med.estoque_unidade_por_dose || 1;
            const novoEstoque = Math.max(0, med.estoque_quantidade - unidadePorDose);

            await safeUpdateMedicamento(extra.medicamentoId, {
              estoque_quantidade: novoEstoque,
              estoque_data_referencia: hoje,
            });
          }
        } else if (actionId === "IGNORAR") {
          await safeSetDoseLog({
            user_id: user.id,
            medicamento_id: extra.medicamentoId,
            data: hoje,
            horario: extra.horario,
            ignorado_em: new Date().toISOString(),
          });
        }
      }
    );

    return () => {
      listener.then((l) => l.remove());
    };
  }, [user?.id]);
}